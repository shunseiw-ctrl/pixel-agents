import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import {
  getProjectDirPath,
  persistAgents,
  removeAgent,
  restoreAgents,
  sendExistingAgents,
  sendLayout,
} from './agentManager.js';
import {
  loadCharacterSprites,
  loadDefaultLayout,
  loadFloorTiles,
  loadFurnitureAssets,
  loadWallTiles,
  sendAssetsToWebview,
  sendCharacterSpritesToWebview,
  sendFloorTilesToWebview,
  sendWallTilesToWebview,
} from './assetLoader.js';
import {
  GLOBAL_KEY_NOTIFY_COMPLETE,
  GLOBAL_KEY_NOTIFY_ERROR,
  GLOBAL_KEY_NOTIFY_INPUT_WAIT,
  GLOBAL_KEY_NOTIFY_LOOP,
  GLOBAL_KEY_SOUND_ENABLED,
  GLOBAL_KEY_THOUGHT_ENABLED,
  WORKSPACE_KEY_AGENT_SEATS,
} from './constants.js';
import { ensureProjectScan, scanExistingSessions } from './fileWatcher.js';
import type { LayoutWatcher } from './layoutPersistence.js';
import { readLayoutFromFile, watchLayoutFile, writeLayoutToFile } from './layoutPersistence.js';
import { clearAgentCooldowns, sendNotification } from './notificationManager.js';
import type { AgentState } from './types.js';

export class PixelAgentsViewProvider implements vscode.WebviewViewProvider {
  nextAgentId = { current: 1 };
  nextTerminalIndex = { current: 1 };
  agents = new Map<number, AgentState>();
  webviewView: vscode.WebviewView | undefined;

  // Per-agent timers
  fileWatchers = new Map<number, fs.FSWatcher>();
  pollingTimers = new Map<number, ReturnType<typeof setInterval>>();
  waitingTimers = new Map<number, ReturnType<typeof setTimeout>>();
  jsonlPollTimers = new Map<number, ReturnType<typeof setInterval>>();
  permissionTimers = new Map<number, ReturnType<typeof setTimeout>>();

  // /clear detection: project-level scan for new JSONL files
  activeAgentId = { current: null as number | null };
  knownJsonlFiles = new Set<string>();
  projectScanTimer = { current: null as ReturnType<typeof setInterval> | null };

  // Bundled default layout (loaded from assets/default-layout.json)
  defaultLayout: Record<string, unknown> | null = null;

  // Cached loaded assets for re-sending when webview becomes visible
  private cachedCharSprites: import('./assetLoader.js').LoadedCharacterSprites | null = null;
  private cachedFloorTiles: import('./assetLoader.js').LoadedFloorTiles | null = null;
  private cachedWallTiles: import('./assetLoader.js').LoadedWallTiles | null = null;
  private cachedFurnitureAssets: import('./assetLoader.js').LoadedAssets | null = null;
  private assetsLoaded = false;

  // Cross-window layout sync
  layoutWatcher: LayoutWatcher | null = null;

  constructor(private readonly context: vscode.ExtensionContext) {}

  private get extensionUri(): vscode.Uri {
    return this.context.extensionUri;
  }

  private get webview(): vscode.Webview | undefined {
    return this.webviewView?.webview;
  }

  getWebview(): vscode.Webview | undefined {
    return this.webview;
  }

  private persistAgents = (): void => {
    persistAgents(this.agents, this.context);
  };

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this.webviewView = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = getWebviewContent(webviewView.webview, this.extensionUri);

    // Re-send cached assets when webview becomes visible (messages may have been dropped while hidden)
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible && this.assetsLoaded && this.webview) {
        console.log('[Extension] Webview became visible — re-sending cached assets');
        this.sendCachedAssets();
      }
    });

    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message.type === 'focusAgent') {
        const agent = this.agents.get(message.id);
        if (agent?.terminalRef) {
          agent.terminalRef.show();
        }
      } else if (message.type === 'closeAgent') {
        const agent = this.agents.get(message.id);
        if (agent?.terminalRef) {
          agent.terminalRef.dispose();
        }
      } else if (message.type === 'saveAgentSeats') {
        // Store seat assignments in a separate key (never touched by persistAgents)
        console.log(`[Pixel Agents] saveAgentSeats:`, JSON.stringify(message.seats));
        this.context.workspaceState.update(WORKSPACE_KEY_AGENT_SEATS, message.seats);
      } else if (message.type === 'saveLayout') {
        this.layoutWatcher?.markOwnWrite();
        writeLayoutToFile(message.layout as Record<string, unknown>);
      } else if (message.type === 'setSoundEnabled') {
        this.context.globalState.update(GLOBAL_KEY_SOUND_ENABLED, message.enabled);
      } else if (message.type === 'setThoughtEnabled') {
        this.context.globalState.update(GLOBAL_KEY_THOUGHT_ENABLED, message.enabled);
      } else if (message.type === 'setNotifySetting') {
        const key = message.key as string;
        const enabled = message.enabled as boolean;
        const validKeys = [
          GLOBAL_KEY_NOTIFY_ERROR,
          GLOBAL_KEY_NOTIFY_LOOP,
          GLOBAL_KEY_NOTIFY_COMPLETE,
          GLOBAL_KEY_NOTIFY_INPUT_WAIT,
        ];
        if (validKeys.includes(key)) {
          this.context.globalState.update(key, enabled);
        }
      } else if (message.type === 'webviewReady') {
        restoreAgents(
          this.context,
          this.nextAgentId,
          this.nextTerminalIndex,
          this.agents,
          this.knownJsonlFiles,
          this.fileWatchers,
          this.pollingTimers,
          this.waitingTimers,
          this.permissionTimers,
          this.jsonlPollTimers,
          this.projectScanTimer,
          this.activeAgentId,
          this.webview,
          this.persistAgents,
        );
        // Send persisted settings to webview
        const soundEnabled = this.context.globalState.get<boolean>(GLOBAL_KEY_SOUND_ENABLED, true);
        const thoughtEnabled = this.context.globalState.get<boolean>(
          GLOBAL_KEY_THOUGHT_ENABLED,
          true,
        );
        const notifyError = this.context.globalState.get<boolean>(GLOBAL_KEY_NOTIFY_ERROR, true);
        const notifyLoop = this.context.globalState.get<boolean>(GLOBAL_KEY_NOTIFY_LOOP, true);
        const notifyComplete = this.context.globalState.get<boolean>(
          GLOBAL_KEY_NOTIFY_COMPLETE,
          true,
        );
        const notifyInputWait = this.context.globalState.get<boolean>(
          GLOBAL_KEY_NOTIFY_INPUT_WAIT,
          true,
        );
        this.webview?.postMessage({
          type: 'settingsLoaded',
          soundEnabled,
          thoughtEnabled,
          notifyError,
          notifyLoop,
          notifyComplete,
          notifyInputWait,
        });

        // Ensure project scan runs even with no restored agents (to adopt external terminals)
        const projectDir = getProjectDirPath();
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        console.log('[Extension] workspaceRoot:', workspaceRoot);
        console.log('[Extension] projectDir:', projectDir);
        if (projectDir) {
          // Scan for existing JSONL sessions (external terminals, recent sessions)
          const scannedIds = scanExistingSessions(
            projectDir,
            this.knownJsonlFiles,
            this.nextAgentId,
            this.agents,
            this.fileWatchers,
            this.pollingTimers,
            this.waitingTimers,
            this.permissionTimers,
            this.webview,
            this.persistAgents,
          );
          if (scannedIds.length > 0) {
            console.log(`[Extension] Detected ${scannedIds.length} existing session(s)`);
          }
          ensureProjectScan(
            projectDir,
            this.knownJsonlFiles,
            this.projectScanTimer,
            this.activeAgentId,
            this.nextAgentId,
            this.agents,
            this.fileWatchers,
            this.pollingTimers,
            this.waitingTimers,
            this.permissionTimers,
            this.webview,
            this.persistAgents,
          );

          // Load furniture assets BEFORE sending layout
          (async () => {
            try {
              console.log('[Extension] Loading furniture assets...');
              const extensionPath = this.extensionUri.fsPath;
              console.log('[Extension] extensionPath:', extensionPath);

              // Check bundled location first: extensionPath/dist/assets/
              const bundledAssetsDir = path.join(extensionPath, 'dist', 'assets');
              let assetsRoot: string | null = null;
              if (fs.existsSync(bundledAssetsDir)) {
                console.log('[Extension] Found bundled assets at dist/');
                assetsRoot = path.join(extensionPath, 'dist');
              } else if (workspaceRoot) {
                // Fall back to workspace root (development or external assets)
                console.log('[Extension] Trying workspace for assets...');
                assetsRoot = workspaceRoot;
              }

              if (!assetsRoot) {
                console.log('[Extension] ⚠️  No assets directory found');
                if (this.webview) {
                  sendLayout(this.context, this.webview, this.defaultLayout);
                  this.startLayoutWatcher();
                }
                return;
              }

              console.log('[Extension] Using assetsRoot:', assetsRoot);

              // Load bundled default layout
              this.defaultLayout = loadDefaultLayout(assetsRoot);

              // Load and cache all assets
              this.cachedCharSprites = await loadCharacterSprites(assetsRoot);
              this.cachedFloorTiles = await loadFloorTiles(assetsRoot);
              this.cachedWallTiles = await loadWallTiles(assetsRoot);
              this.cachedFurnitureAssets = await loadFurnitureAssets(assetsRoot);
              this.assetsLoaded = true;

              // Send all cached assets to webview
              if (this.webview) {
                await this.sendCachedAssets();
              }
            } catch (err) {
              console.error('[Extension] ❌ Error loading assets:', err);
              // If loading failed, still send layout
              if (this.webview) {
                sendLayout(this.context, this.webview, this.defaultLayout);
              }
            }
            this.startLayoutWatcher();
          })();
        } else {
          // No project dir — still try to load floor/wall tiles, then send saved layout
          (async () => {
            try {
              const ep = this.extensionUri.fsPath;
              const bundled = path.join(ep, 'dist', 'assets');
              if (fs.existsSync(bundled)) {
                const distRoot = path.join(ep, 'dist');
                this.defaultLayout = loadDefaultLayout(distRoot);
                const cs = await loadCharacterSprites(distRoot);
                if (cs && this.webview) {
                  sendCharacterSpritesToWebview(this.webview, cs);
                }
                const ft = await loadFloorTiles(distRoot);
                if (ft && this.webview) {
                  sendFloorTilesToWebview(this.webview, ft);
                }
                const wt = await loadWallTiles(distRoot);
                if (wt && this.webview) {
                  sendWallTilesToWebview(this.webview, wt);
                }
              }
            } catch {
              /* ignore */
            }
            if (this.webview) {
              sendLayout(this.context, this.webview, this.defaultLayout);
              this.startLayoutWatcher();
            }
          })();
        }
        sendExistingAgents(this.agents, this.context, this.webview);
      } else if (message.type === 'openSessionsFolder') {
        const projectDir = getProjectDirPath();
        if (projectDir && fs.existsSync(projectDir)) {
          vscode.env.openExternal(vscode.Uri.file(projectDir));
        }
      } else if (message.type === 'exportLayout') {
        const layout = readLayoutFromFile();
        if (!layout) {
          vscode.window.showWarningMessage(
            'Pixel Agents: エクスポートするレイアウトがありません。',
          );
          return;
        }
        const uri = await vscode.window.showSaveDialog({
          filters: { 'JSON Files': ['json'] },
          defaultUri: vscode.Uri.file(path.join(os.homedir(), 'pixel-agents-layout.json')),
        });
        if (uri) {
          fs.writeFileSync(uri.fsPath, JSON.stringify(layout, null, 2), 'utf-8');
          vscode.window.showInformationMessage('Pixel Agents: レイアウトをエクスポートしました。');
        }
      } else if (message.type === 'importLayout') {
        const uris = await vscode.window.showOpenDialog({
          filters: { 'JSON Files': ['json'] },
          canSelectMany: false,
        });
        if (!uris || uris.length === 0) return;
        try {
          const raw = fs.readFileSync(uris[0].fsPath, 'utf-8');
          const imported = JSON.parse(raw) as Record<string, unknown>;
          if (imported.version !== 1 || !Array.isArray(imported.tiles)) {
            vscode.window.showErrorMessage('Pixel Agents: 無効なレイアウトファイルです。');
            return;
          }
          this.layoutWatcher?.markOwnWrite();
          writeLayoutToFile(imported);
          this.webview?.postMessage({ type: 'layoutLoaded', layout: imported });
          vscode.window.showInformationMessage('Pixel Agents: レイアウトをインポートしました。');
        } catch {
          vscode.window.showErrorMessage(
            'Pixel Agents: レイアウトファイルの読み込みに失敗しました。',
          );
        }
      }
    });

    vscode.window.onDidChangeActiveTerminal((terminal) => {
      this.activeAgentId.current = null;
      if (!terminal) return;
      for (const [id, agent] of this.agents) {
        if (agent.terminalRef === terminal) {
          this.activeAgentId.current = id;
          webviewView.webview.postMessage({ type: 'agentSelected', id });
          break;
        }
      }
    });

    vscode.window.onDidCloseTerminal((closed) => {
      for (const [id, agent] of this.agents) {
        if (agent.terminalRef === closed) {
          if (this.activeAgentId.current === id) {
            this.activeAgentId.current = null;
          }
          // Don't remove the agent — mark as idle instead
          // Character will move to rest zone and remain visible
          agent.terminalRef = null;
          clearAgentCooldowns(id);
          this.persistAgents();
          // Notify webview to mark agent as idle (not closed)
          webviewView.webview.postMessage({ type: 'agentIdle', id });
        }
      }
    });
  }

  /** Export current saved layout to webview-ui/public/assets/default-layout.json (dev utility) */
  exportDefaultLayout(): void {
    const layout = readLayoutFromFile();
    if (!layout) {
      vscode.window.showWarningMessage('Pixel Agents: 保存されたレイアウトが見つかりません。');
      return;
    }
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('Pixel Agents: ワークスペースフォルダが見つかりません。');
      return;
    }
    const targetPath = path.join(
      workspaceRoot,
      'webview-ui',
      'public',
      'assets',
      'default-layout.json',
    );
    const json = JSON.stringify(layout, null, 2);
    fs.writeFileSync(targetPath, json, 'utf-8');
    vscode.window.showInformationMessage(
      `Pixel Agents: デフォルトレイアウトを ${targetPath} にエクスポートしました`,
    );
  }

  /** Send all cached assets + layout to webview. Called on initial load and when webview becomes visible. */
  private async sendCachedAssets(): Promise<void> {
    if (!this.webview) return;
    if (this.cachedCharSprites) {
      console.log('[Extension] Sending cached character sprites');
      sendCharacterSpritesToWebview(this.webview, this.cachedCharSprites);
    }
    if (this.cachedFloorTiles) {
      console.log('[Extension] Sending cached floor tiles');
      sendFloorTilesToWebview(this.webview, this.cachedFloorTiles);
    }
    if (this.cachedWallTiles) {
      console.log('[Extension] Sending cached wall tiles');
      sendWallTilesToWebview(this.webview, this.cachedWallTiles);
    }
    if (this.cachedFurnitureAssets) {
      console.log('[Extension] Sending cached furniture assets');
      await sendAssetsToWebview(this.webview, this.cachedFurnitureAssets);
    }
    // Re-send layout after assets so dynamic catalog is built first
    console.log('[Extension] Sending layout');
    sendLayout(this.context, this.webview, this.defaultLayout);
  }

  private startLayoutWatcher(): void {
    if (this.layoutWatcher) return;
    this.layoutWatcher = watchLayoutFile((layout) => {
      console.log('[Pixel Agents] External layout change — pushing to webview');
      this.webview?.postMessage({ type: 'layoutLoaded', layout });
    });
  }

  dispose() {
    this.layoutWatcher?.dispose();
    this.layoutWatcher = null;
    for (const id of [...this.agents.keys()]) {
      removeAgent(
        id,
        this.agents,
        this.fileWatchers,
        this.pollingTimers,
        this.waitingTimers,
        this.permissionTimers,
        this.jsonlPollTimers,
        this.persistAgents,
      );
    }
    if (this.projectScanTimer.current) {
      clearInterval(this.projectScanTimer.current);
      this.projectScanTimer.current = null;
    }
  }
}

export function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const distPath = vscode.Uri.joinPath(extensionUri, 'dist', 'webview');
  const indexPath = vscode.Uri.joinPath(distPath, 'index.html').fsPath;

  let html = fs.readFileSync(indexPath, 'utf-8');

  html = html.replace(/(href|src)="\.\/([^"]+)"/g, (_match, attr, filePath) => {
    const fileUri = vscode.Uri.joinPath(distPath, filePath);
    const webviewUri = webview.asWebviewUri(fileUri);
    return `${attr}="${webviewUri}"`;
  });

  return html;
}

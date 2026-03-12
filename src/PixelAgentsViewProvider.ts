import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import {
  createAgentForFile,
  createAgentForTerminal,
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
  loadLayoutPresets,
  loadWallTiles,
  sendAssetsToWebview,
  sendCharacterSpritesToWebview,
  sendFloorTilesToWebview,
  sendWallTilesToWebview,
} from './assetLoader.js';
import {
  CONFIGURED_AGENT_ID_OFFSET,
  EXTERNAL_SCAN_INTERVAL_MS,
  EXTERNAL_SESSION_ACTIVE_THRESHOLD_MS,
  GLOBAL_KEY_MASTER_VOLUME,
  GLOBAL_KEY_NOTIFICATION_SOUND_ENABLED,
  GLOBAL_KEY_NOTIFY_COMPLETE,
  GLOBAL_KEY_NOTIFY_ERROR,
  GLOBAL_KEY_NOTIFY_INPUT_WAIT,
  GLOBAL_KEY_NOTIFY_LOOP,
  GLOBAL_KEY_ONBOARDING_DONE,
  GLOBAL_KEY_SOUND_ENABLED,
  GLOBAL_KEY_THOUGHT_ENABLED,
  GLOBAL_KEY_TYPING_SOUND_ENABLED,
  WORKSPACE_KEY_AGENT_SEATS,
} from './constants.js';
import { startProjectDirWatch } from './fileWatcher.js';
import type { LayoutWatcher } from './layoutPersistence.js';
import { readLayoutFromFile, watchLayoutFile, writeLayoutToFile } from './layoutPersistence.js';
import { clearAgentCooldowns, sendNotification } from './notificationManager.js';
import { setupTerminalDetection, startJsonlDiscovery } from './terminalDetector.js';
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

  // Active agent tracking (for terminal focus)
  activeAgentId = { current: null as number | null };

  // Terminal detection (Shell Integration)
  private terminalDetectionDisposables: vscode.Disposable[] = [];
  // Per-agent /clear detection cleanup functions
  private projectDirWatchCleanups = new Map<number, () => void>();
  // JSONL discovery abort controllers (for auto-detected terminals)
  private discoveryAbortControllers = new Map<vscode.Terminal, AbortController>();

  // Bundled default layout (loaded from assets/default-layout.json)
  defaultLayout: Record<string, unknown> | null = null;

  // Cached loaded assets for re-sending when webview becomes visible
  private cachedCharSprites: import('./assetLoader.js').LoadedCharacterSprites | null = null;
  private cachedFloorTiles: import('./assetLoader.js').LoadedFloorTiles | null = null;
  private cachedWallTiles: import('./assetLoader.js').LoadedWallTiles | null = null;
  private cachedFurnitureAssets: import('./assetLoader.js').LoadedAssets | null = null;
  private cachedPresets: import('./assetLoader.js').LayoutPreset[] = [];
  private assetsLoaded = false;
  private assetsRoot: string | null = null;

  // External session scanning
  private externalScanTimer: ReturnType<typeof setInterval> | null = null;

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

  /** Start /clear detection (project dir watch) for an agent */
  private startClearDetection(agentId: number, projectDir: string): void {
    // Stop existing watch if any
    this.stopClearDetection(agentId);

    const cleanup = startProjectDirWatch(
      agentId,
      projectDir,
      this.agents,
      this.fileWatchers,
      this.pollingTimers,
      this.waitingTimers,
      this.permissionTimers,
      this.webview,
      this.persistAgents,
    );
    this.projectDirWatchCleanups.set(agentId, cleanup);
  }

  /** Stop /clear detection for an agent */
  private stopClearDetection(agentId: number): void {
    const cleanup = this.projectDirWatchCleanups.get(agentId);
    if (cleanup) {
      cleanup();
      this.projectDirWatchCleanups.delete(agentId);
    }
  }

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this.webviewView = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = getWebviewContent(webviewView.webview, this.extensionUri);

    // Re-send cached assets when webview becomes visible (messages may have been dropped while hidden)
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible && this.assetsLoaded && this.webview) {
        this.sendCachedAssets();
      }
    });

    // Setup terminal detection via Shell Integration
    this.terminalDetectionDisposables = setupTerminalDetection(
      this.agents,
      (terminal, sessionId, cwd) => {
        this.handleClaudeDetected(terminal, sessionId, cwd);
      },
      (terminal) => {
        // Cancel any pending JSONL discovery for this terminal
        const controller = this.discoveryAbortControllers.get(terminal);
        if (controller) {
          controller.abort();
          this.discoveryAbortControllers.delete(terminal);
        }
      },
    );

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
          // onDidCloseTerminal will handle removal
        } else if (agent) {
          // No terminal — remove directly
          clearAgentCooldowns(message.id);
          this.stopClearDetection(message.id);
          removeAgent(
            message.id,
            this.agents,
            this.fileWatchers,
            this.pollingTimers,
            this.waitingTimers,
            this.permissionTimers,
            this.jsonlPollTimers,
            this.persistAgents,
          );
          webviewView.webview.postMessage({ type: 'agentClosed', id: message.id });
        }
      } else if (message.type === 'saveAgentSeats') {
        // Store seat assignments in a separate key (never touched by persistAgents)
        this.context.workspaceState.update(WORKSPACE_KEY_AGENT_SEATS, message.seats);
      } else if (message.type === 'saveLayout') {
        this.layoutWatcher?.markOwnWrite();
        writeLayoutToFile(message.layout as Record<string, unknown>);
      } else if (message.type === 'setSoundEnabled') {
        this.context.globalState.update(GLOBAL_KEY_SOUND_ENABLED, message.enabled);
      } else if (message.type === 'setSoundSetting') {
        const key = message.key as string;
        if (key === 'typingSound') {
          this.context.globalState.update(GLOBAL_KEY_TYPING_SOUND_ENABLED, message.enabled);
        } else if (key === 'notificationSound') {
          this.context.globalState.update(GLOBAL_KEY_NOTIFICATION_SOUND_ENABLED, message.enabled);
        } else if (key === 'masterVolume') {
          this.context.globalState.update(GLOBAL_KEY_MASTER_VOLUME, message.value);
        }
      } else if (message.type === 'setThoughtEnabled') {
        this.context.globalState.update(GLOBAL_KEY_THOUGHT_ENABLED, message.enabled);
      } else if (message.type === 'setOnboardingDone') {
        this.context.globalState.update(GLOBAL_KEY_ONBOARDING_DONE, true);
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
          this.fileWatchers,
          this.pollingTimers,
          this.waitingTimers,
          this.permissionTimers,
          this.jsonlPollTimers,
          this.activeAgentId,
          this.webview,
          this.persistAgents,
        );

        // Start /clear detection for all restored agents
        for (const agent of this.agents.values()) {
          this.startClearDetection(agent.id, agent.projectDir);
        }

        // Send persisted settings to webview
        const soundEnabled = this.context.globalState.get<boolean>(GLOBAL_KEY_SOUND_ENABLED, true);
        const typingSoundEnabled = this.context.globalState.get<boolean>(
          GLOBAL_KEY_TYPING_SOUND_ENABLED,
          true,
        );
        const notificationSoundEnabled = this.context.globalState.get<boolean>(
          GLOBAL_KEY_NOTIFICATION_SOUND_ENABLED,
          true,
        );
        const masterVolumeVal = this.context.globalState.get<number>(GLOBAL_KEY_MASTER_VOLUME, 1.0);
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
        const onboardingDone = this.context.globalState.get<boolean>(
          GLOBAL_KEY_ONBOARDING_DONE,
          false,
        );
        this.webview?.postMessage({
          type: 'settingsLoaded',
          soundEnabled,
          typingSoundEnabled,
          notificationSoundEnabled,
          masterVolume: masterVolumeVal,
          thoughtEnabled,
          notifyError,
          notifyLoop,
          notifyComplete,
          notifyInputWait,
          onboardingDone,
        });

        // Load assets
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

        (async () => {
          try {
            const extensionPath = this.extensionUri.fsPath;

            // Check bundled location first: extensionPath/dist/assets/
            const bundledAssetsDir = path.join(extensionPath, 'dist', 'assets');
            let assetsRoot: string | null = null;
            if (fs.existsSync(bundledAssetsDir)) {
              assetsRoot = path.join(extensionPath, 'dist');
            } else if (workspaceRoot) {
              assetsRoot = workspaceRoot;
            }

            if (!assetsRoot) {
              if (this.webview) {
                sendLayout(this.context, this.webview, this.defaultLayout);
                this.startLayoutWatcher();
              }
              return;
            }

            this.assetsRoot = assetsRoot;

            // Load bundled default layout
            this.defaultLayout = loadDefaultLayout(assetsRoot);

            // Load layout presets
            this.cachedPresets = loadLayoutPresets(assetsRoot);

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
            console.error('[Extension] Error loading assets:', err);
            if (this.webview) {
              sendLayout(this.context, this.webview, this.defaultLayout);
            }
          }
          this.startLayoutWatcher();
        })();

        sendExistingAgents(this.agents, this.context, this.webview);

        // Send configured agents from ~/.claude/agents/
        this.scanConfiguredAgents();

        // Start scanning for external JSONL sessions (macOS Terminal, etc.)
        this.startExternalSessionScanning();
      } else if (message.type === 'saveAgentAppearance') {
        // Save custom palette/hueShift for an agent
        const agentId = message.agentId as number;
        const palette = message.palette as number;
        const hueShift = message.hueShift as number;
        const existing = this.context.workspaceState.get<
          Record<string, { palette?: number; hueShift?: number; seatId?: string }>
        >(WORKSPACE_KEY_AGENT_SEATS, {});
        existing[String(agentId)] = { ...existing[String(agentId)], palette, hueShift };
        this.context.workspaceState.update(WORKSPACE_KEY_AGENT_SEATS, existing);
      } else if (message.type === 'getLayoutPresets') {
        // Send cached presets to webview
        const presetInfo = this.cachedPresets.map((p) => ({
          name: p.name,
          description: p.description,
          cols: p.cols,
          rows: p.rows,
          seats: p.seats,
        }));
        this.webview?.postMessage({ type: 'layoutPresetsLoaded', presets: presetInfo });
      } else if (message.type === 'loadLayoutPreset') {
        const presetName = message.name as string;
        const preset = this.cachedPresets.find((p) => p.name === presetName);
        if (preset) {
          this.layoutWatcher?.markOwnWrite();
          writeLayoutToFile(preset.layout);
          this.webview?.postMessage({ type: 'layoutLoaded', layout: preset.layout });
          vscode.window.showInformationMessage(
            `Pixel Agents: テンプレート「${presetName}」を読み込みました。`,
          );
        }
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
      // Cancel any pending JSONL discovery for this terminal
      const controller = this.discoveryAbortControllers.get(closed);
      if (controller) {
        controller.abort();
        this.discoveryAbortControllers.delete(closed);
      }

      for (const [id, agent] of this.agents) {
        if (agent.terminalRef === closed) {
          if (this.activeAgentId.current === id) {
            this.activeAgentId.current = null;
          }
          clearAgentCooldowns(id);
          this.stopClearDetection(id);
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
          webviewView.webview.postMessage({ type: 'agentClosed', id });
        }
      }
    });
  }

  /** Handle a claude command detected via Shell Integration */
  private handleClaudeDetected(
    terminal: vscode.Terminal,
    sessionId: string | null,
    cwd: string | undefined,
  ): void {
    const projectDir = getProjectDirPath(cwd);
    if (!projectDir) {
      return;
    }

    // Cancel any previous discovery for this terminal
    const existing = this.discoveryAbortControllers.get(terminal);
    if (existing) {
      existing.abort();
    }

    const controller = startJsonlDiscovery(projectDir, sessionId, (jsonlFile) => {
      this.discoveryAbortControllers.delete(terminal);

      // Double-check terminal isn't already tracked (race condition guard)
      for (const agent of this.agents.values()) {
        if (agent.terminalRef === terminal) {
          return;
        }
      }

      // Double-check JSONL file not already used by another agent
      for (const agent of this.agents.values()) {
        if (agent.jsonlFile === jsonlFile) {
          return;
        }
      }

      // Determine folderName for multi-root workspaces
      const folders = vscode.workspace.workspaceFolders;
      const isMultiRoot = !!(folders && folders.length > 1);
      const folderName = isMultiRoot && cwd ? path.basename(cwd) : undefined;

      const agentId = createAgentForTerminal(
        terminal,
        jsonlFile,
        projectDir,
        this.nextAgentId,
        this.agents,
        this.activeAgentId,
        this.fileWatchers,
        this.pollingTimers,
        this.waitingTimers,
        this.permissionTimers,
        this.webview,
        this.persistAgents,
        folderName,
      );

      // Start /clear detection for this agent
      this.startClearDetection(agentId, projectDir);
    });

    this.discoveryAbortControllers.set(terminal, controller);
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
      sendCharacterSpritesToWebview(this.webview, this.cachedCharSprites);
    }
    if (this.cachedFloorTiles) {
      sendFloorTilesToWebview(this.webview, this.cachedFloorTiles);
    }
    if (this.cachedWallTiles) {
      sendWallTilesToWebview(this.webview, this.cachedWallTiles);
    }
    if (this.cachedFurnitureAssets) {
      await sendAssetsToWebview(this.webview, this.cachedFurnitureAssets);
    }
    // Re-send layout after assets so dynamic catalog is built first
    sendLayout(this.context, this.webview, this.defaultLayout);
  }

  /** Scan project directories for active JSONL sessions not already tracked (external terminals) */
  private scanExternalSessions(): void {
    const home = os.homedir();
    const projectsBase = path.join(home, '.claude', 'projects');

    // Collect all project directories to scan:
    // 1. The workspace-specific project dir
    // 2. The home directory project dir (Claude Code often resolves to this)
    const dirsToScan = new Set<string>();

    const workspaceDir = getProjectDirPath();
    if (workspaceDir && fs.existsSync(workspaceDir)) {
      dirsToScan.add(workspaceDir);
    }

    // Also scan the home directory project (Claude Code sessions started from ~)
    const homeDirName = home.replace(/[^a-zA-Z0-9-]/g, '-');
    const homeProjectDir = path.join(projectsBase, homeDirName);
    if (fs.existsSync(homeProjectDir)) {
      dirsToScan.add(homeProjectDir);
    }

    if (dirsToScan.size === 0) return;

    const now = Date.now();

    // Collect JSONL files already tracked by agents
    const trackedFiles = new Set<string>();
    for (const agent of this.agents.values()) {
      trackedFiles.add(agent.jsonlFile);
    }

    for (const projectDir of dirsToScan) {
      let jsonlFiles: string[];
      try {
        jsonlFiles = fs
          .readdirSync(projectDir)
          .filter((f) => f.endsWith('.jsonl'))
          .map((f) => path.join(projectDir, f));
      } catch {
        continue;
      }

      for (const file of jsonlFiles) {
        if (trackedFiles.has(file)) continue;

        // Check if file was recently modified (active session)
        try {
          const stat = fs.statSync(file);
          const age = now - stat.mtimeMs;
          if (age > EXTERNAL_SESSION_ACTIVE_THRESHOLD_MS) continue;

          // Active JSONL not tracked — create an agent for it
          const agentId = createAgentForFile(
            file,
            projectDir,
            this.nextAgentId,
            this.agents,
            this.activeAgentId,
            this.fileWatchers,
            this.pollingTimers,
            this.waitingTimers,
            this.permissionTimers,
            this.webview,
            this.persistAgents,
          );
          this.startClearDetection(agentId, projectDir);
          trackedFiles.add(file);
        } catch {
          /* ignore stat errors */
        }
      }
    }
  }

  /** Scan ~/.claude/agents/ for configured agent definitions and send to webview */
  private scanConfiguredAgents(): void {
    const home = os.homedir();
    const agentsDir = path.join(home, '.claude', 'agents');

    try {
      if (!fs.existsSync(agentsDir)) return;

      const files = fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md'));
      const agents = files.map((file, index) => {
        const name = file.replace('.md', '');
        // Convert "engineering-mobile-app-builder" → "Mobile App Builder"
        const displayName = name
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        return {
          id: CONFIGURED_AGENT_ID_OFFSET + index,
          name,
          displayName,
        };
      });

      this.webview?.postMessage({ type: 'configuredAgents', agents });
    } catch {
      /* ignore errors reading agents directory */
    }
  }

  /** Start periodic scanning for external JSONL sessions */
  private startExternalSessionScanning(): void {
    // Initial scan
    this.scanExternalSessions();
    // Periodic scan
    this.externalScanTimer = setInterval(() => {
      this.scanExternalSessions();
    }, EXTERNAL_SCAN_INTERVAL_MS);
  }

  private startLayoutWatcher(): void {
    if (this.layoutWatcher) return;
    this.layoutWatcher = watchLayoutFile((layout) => {
      this.webview?.postMessage({ type: 'layoutLoaded', layout });
    });
  }

  dispose() {
    // Stop external session scanning
    if (this.externalScanTimer) {
      clearInterval(this.externalScanTimer);
      this.externalScanTimer = null;
    }

    this.layoutWatcher?.dispose();
    this.layoutWatcher = null;

    // Stop terminal detection
    for (const d of this.terminalDetectionDisposables) {
      d.dispose();
    }
    this.terminalDetectionDisposables = [];

    // Cancel pending JSONL discoveries
    for (const controller of this.discoveryAbortControllers.values()) {
      controller.abort();
    }
    this.discoveryAbortControllers.clear();

    // Stop all /clear detection watches
    for (const cleanup of this.projectDirWatchCleanups.values()) {
      cleanup();
    }
    this.projectDirWatchCleanups.clear();

    // Remove all agents
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

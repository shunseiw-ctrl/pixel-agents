import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { FILE_WATCHER_DEBOUNCE_MS, FILE_WATCHER_POLL_INTERVAL_MS } from './constants.js';
import { cancelPermissionTimer, cancelWaitingTimer, clearAgentActivity } from './timerManager.js';
import { processTranscriptLine } from './transcriptParser.js';
import type { AgentState } from './types.js';

/** Per-agent debounce timestamps to prevent redundant reads from triple watchers */
const lastReadTime = new Map<number, number>();

/** Clean up debounce state when an agent is removed */
export function clearDebounce(agentId: number): void {
  lastReadTime.delete(agentId);
}

export function startFileWatching(
  agentId: number,
  filePath: string,
  agents: Map<number, AgentState>,
  fileWatchers: Map<number, fs.FSWatcher>,
  pollingTimers: Map<number, ReturnType<typeof setInterval>>,
  waitingTimers: Map<number, ReturnType<typeof setTimeout>>,
  permissionTimers: Map<number, ReturnType<typeof setTimeout>>,
  webview: vscode.Webview | undefined,
): void {
  // Primary: fs.watch (unreliable on macOS — may miss events)
  try {
    const watcher = fs.watch(filePath, () => {
      readNewLines(agentId, agents, waitingTimers, permissionTimers, webview);
    });
    fileWatchers.set(agentId, watcher);
  } catch (e) {
    console.log(`[Pixel Agents] fs.watch failed for agent ${agentId}: ${e}`);
  }

  // Secondary: fs.watchFile (stat-based polling, reliable on macOS)
  try {
    fs.watchFile(filePath, { interval: FILE_WATCHER_POLL_INTERVAL_MS }, () => {
      readNewLines(agentId, agents, waitingTimers, permissionTimers, webview);
    });
  } catch (e) {
    console.log(`[Pixel Agents] fs.watchFile failed for agent ${agentId}: ${e}`);
  }

  // Tertiary: manual poll as last resort
  const interval = setInterval(() => {
    if (!agents.has(agentId)) {
      clearInterval(interval);
      try {
        fs.unwatchFile(filePath);
      } catch {
        /* expected: unwatchFile may throw if not previously watched */
      }
      return;
    }
    readNewLines(agentId, agents, waitingTimers, permissionTimers, webview);
  }, FILE_WATCHER_POLL_INTERVAL_MS);
  pollingTimers.set(agentId, interval);
}

export function readNewLines(
  agentId: number,
  agents: Map<number, AgentState>,
  waitingTimers: Map<number, ReturnType<typeof setTimeout>>,
  permissionTimers: Map<number, ReturnType<typeof setTimeout>>,
  webview: vscode.Webview | undefined,
): void {
  const agent = agents.get(agentId);
  if (!agent) return;

  // Debounce: skip if called within 50ms of last read for this agent
  const now = Date.now();
  const lastTime = lastReadTime.get(agentId) || 0;
  if (now - lastTime < FILE_WATCHER_DEBOUNCE_MS) return;
  lastReadTime.set(agentId, now);

  try {
    const stat = fs.statSync(agent.jsonlFile);
    if (stat.size <= agent.fileOffset) return;

    const buf = Buffer.alloc(stat.size - agent.fileOffset);
    const fd = fs.openSync(agent.jsonlFile, 'r');
    try {
      fs.readSync(fd, buf, 0, buf.length, agent.fileOffset);
    } finally {
      fs.closeSync(fd);
    }
    agent.fileOffset = stat.size;

    const text = agent.lineBuffer + buf.toString('utf-8');
    const lines = text.split('\n');
    agent.lineBuffer = lines.pop() || '';

    const hasLines = lines.some((l) => l.trim());
    if (hasLines) {
      // New data arriving — cancel timers (data flowing means agent is still active)
      cancelWaitingTimer(agentId, waitingTimers);
      cancelPermissionTimer(agentId, permissionTimers);
      if (agent.permissionSent) {
        agent.permissionSent = false;
        webview?.postMessage({ type: 'agentToolPermissionClear', id: agentId });
      }
    }

    for (const line of lines) {
      if (!line.trim()) continue;
      processTranscriptLine(agentId, line, agents, waitingTimers, permissionTimers, webview);
    }
  } catch (e) {
    console.log(`[Pixel Agents] Read error for agent ${agentId}: ${e}`);
  }
}

export function reassignAgentToFile(
  agentId: number,
  newFilePath: string,
  agents: Map<number, AgentState>,
  fileWatchers: Map<number, fs.FSWatcher>,
  pollingTimers: Map<number, ReturnType<typeof setInterval>>,
  waitingTimers: Map<number, ReturnType<typeof setTimeout>>,
  permissionTimers: Map<number, ReturnType<typeof setTimeout>>,
  webview: vscode.Webview | undefined,
  persistAgents: () => void,
): void {
  const agent = agents.get(agentId);
  if (!agent) return;

  // Stop old file watching
  fileWatchers.get(agentId)?.close();
  fileWatchers.delete(agentId);
  const pt = pollingTimers.get(agentId);
  if (pt) {
    clearInterval(pt);
  }
  pollingTimers.delete(agentId);
  try {
    fs.unwatchFile(agent.jsonlFile);
  } catch {
    /* expected: unwatchFile may throw if not previously watched */
  }

  // Clear activity
  cancelWaitingTimer(agentId, waitingTimers);
  cancelPermissionTimer(agentId, permissionTimers);
  clearAgentActivity(agent, agentId, permissionTimers, webview);

  // Swap to new file
  agent.jsonlFile = newFilePath;
  agent.fileOffset = 0;
  agent.lineBuffer = '';
  persistAgents();

  // Start watching new file
  startFileWatching(
    agentId,
    newFilePath,
    agents,
    fileWatchers,
    pollingTimers,
    waitingTimers,
    permissionTimers,
    webview,
  );
  readNewLines(agentId, agents, waitingTimers, permissionTimers, webview);
}

/**
 * Per-agent project directory watcher for /clear detection.
 * Watches for new .jsonl files appearing in the agent's projectDir.
 * When a new file is detected, reassigns the agent to it.
 *
 * Returns a cleanup function to stop watching.
 */
export function startProjectDirWatch(
  agentId: number,
  projectDir: string,
  agents: Map<number, AgentState>,
  fileWatchers: Map<number, fs.FSWatcher>,
  pollingTimers: Map<number, ReturnType<typeof setInterval>>,
  waitingTimers: Map<number, ReturnType<typeof setTimeout>>,
  permissionTimers: Map<number, ReturnType<typeof setTimeout>>,
  webview: vscode.Webview | undefined,
  persistAgents: () => void,
): () => void {
  // Snapshot current JSONL files in projectDir
  let knownFiles: Set<string>;
  try {
    knownFiles = new Set(
      fs
        .readdirSync(projectDir)
        .filter((f) => f.endsWith('.jsonl'))
        .map((f) => path.join(projectDir, f)),
    );
  } catch (e) {
    console.warn(`[Pixel Agents] Failed to read projectDir ${projectDir}: ${e}`);
    knownFiles = new Set();
  }

  // Also include any JSONL files currently tracked by agents
  for (const agent of agents.values()) {
    knownFiles.add(agent.jsonlFile);
  }

  let dirWatcher: fs.FSWatcher | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const checkForNew = (): string | null => {
    const agent = agents.get(agentId);
    if (!agent) return null;

    try {
      const files = fs
        .readdirSync(projectDir)
        .filter((f) => f.endsWith('.jsonl'))
        .map((f) => path.join(projectDir, f));
      for (const file of files) {
        if (!knownFiles.has(file)) {
          return file;
        }
      }
    } catch {
      /* expected: projectDir may not exist yet */
    }
    return null;
  };

  const handleNewFile = (file: string) => {
    const agent = agents.get(agentId);
    if (!agent) return;

    // Skip if another agent is already using this JSONL file
    for (const other of agents.values()) {
      if (other.id !== agentId && other.jsonlFile === file) {
        knownFiles.add(file);
        return;
      }
    }

    knownFiles.add(file);
    console.log(
      `[Pixel Agents] /clear detected: new JSONL ${path.basename(file)}, reassigning agent ${agentId}`,
    );
    reassignAgentToFile(
      agentId,
      file,
      agents,
      fileWatchers,
      pollingTimers,
      waitingTimers,
      permissionTimers,
      webview,
      persistAgents,
    );
  };

  // Primary: fs.watch on directory
  try {
    dirWatcher = fs.watch(projectDir, (_eventType, filename) => {
      if (!filename || !filename.endsWith('.jsonl')) return;
      const fullPath = path.join(projectDir, filename);
      if (!knownFiles.has(fullPath)) {
        handleNewFile(fullPath);
      }
    });
  } catch {
    /* dir may not exist */
  }

  // Backup: polling (macOS fs.watch unreliable)
  pollTimer = setInterval(() => {
    if (!agents.has(agentId)) {
      cleanup();
      return;
    }
    const newFile = checkForNew();
    if (newFile) {
      handleNewFile(newFile);
    }
  }, 2000);

  const cleanup = () => {
    if (dirWatcher) {
      dirWatcher.close();
      dirWatcher = null;
    }
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  return cleanup;
}

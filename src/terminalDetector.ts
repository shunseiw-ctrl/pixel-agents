import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { JSONL_DISCOVERY_TIMEOUT_MS } from './constants.js';
import type { AgentState } from './types.js';

/**
 * Shell Integration based terminal detection.
 * Detects `claude` commands started in any terminal and triggers agent creation.
 */

const CLAUDE_COMMAND_RE = /^claude(\s|$)/;
const CLAUDE_NPX_RE = /npx\s+@anthropic-ai\/claude-code/;
const SESSION_ID_RE = /--session-id\s+([0-9a-f-]{36})/;

export function isClaudeCommand(cmd: string): boolean {
  const trimmed = cmd.trim();
  return CLAUDE_COMMAND_RE.test(trimmed) || CLAUDE_NPX_RE.test(trimmed);
}

export function extractSessionId(cmd: string): string | null {
  const match = cmd.match(SESSION_ID_RE);
  return match ? match[1] : null;
}

/** Check if a terminal is already tracked by any agent */
export function isTerminalTracked(
  terminal: vscode.Terminal,
  agents: Map<number, AgentState>,
): boolean {
  for (const agent of agents.values()) {
    if (agent.terminalRef === terminal) return true;
  }
  return false;
}

/**
 * Discover the JSONL file for a detected claude session.
 *
 * If sessionId is known, waits for the specific file.
 * If sessionId is unknown, watches projectDir for any new .jsonl file.
 *
 * Returns the JSONL file path, or null on timeout.
 */
export function discoverJsonlFile(
  projectDir: string,
  sessionId: string | null,
  signal: AbortSignal,
): Promise<string | null> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve(null);
      return;
    }

    let resolved = false;
    const safeResolve = (value: string | null) => {
      if (resolved) return;
      resolved = true;
      resolve(value);
    };

    // If sessionId is known, poll for the specific file
    if (sessionId) {
      const expectedFile = path.join(projectDir, `${sessionId}.jsonl`);
      const pollInterval = setInterval(() => {
        try {
          if (fs.existsSync(expectedFile)) {
            clearInterval(pollInterval);
            safeResolve(expectedFile);
          }
        } catch {
          /* file may not exist yet */
        }
      }, 500);

      const onAbort = () => {
        clearInterval(pollInterval);
        safeResolve(null);
      };
      signal.addEventListener('abort', onAbort, { once: true });
      return;
    }

    // sessionId unknown — snapshot existing files, then watch for new ones
    let existingFiles: Set<string>;
    try {
      existingFiles = new Set(
        fs
          .readdirSync(projectDir)
          .filter((f) => f.endsWith('.jsonl'))
          .map((f) => path.join(projectDir, f)),
      );
    } catch {
      existingFiles = new Set();
    }

    // Ensure directory exists for fs.watch
    try {
      fs.mkdirSync(projectDir, { recursive: true });
    } catch {
      /* may already exist */
    }

    let watcher: fs.FSWatcher | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const cleanup = () => {
      if (watcher) {
        watcher.close();
        watcher = null;
      }
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const checkForNew = (): string | null => {
      try {
        const files = fs
          .readdirSync(projectDir)
          .filter((f) => f.endsWith('.jsonl'))
          .map((f) => path.join(projectDir, f));
        for (const file of files) {
          if (!existingFiles.has(file)) {
            return file;
          }
        }
      } catch {
        /* ignore */
      }
      return null;
    };

    try {
      watcher = fs.watch(projectDir, () => {
        const newFile = checkForNew();
        if (newFile) {
          cleanup();
          safeResolve(newFile);
        }
      });
    } catch {
      /* fs.watch may fail */
    }

    // Polling backup (fs.watch is unreliable on macOS)
    pollInterval = setInterval(() => {
      const newFile = checkForNew();
      if (newFile) {
        cleanup();
        safeResolve(newFile);
      }
    }, 500);

    const onAbort = () => {
      cleanup();
      safeResolve(null);
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Setup terminal detection using VS Code Shell Integration API.
 *
 * Returns disposables to be cleaned up on extension dispose.
 */
export function setupTerminalDetection(
  agents: Map<number, AgentState>,
  onClaudeDetected: (
    terminal: vscode.Terminal,
    sessionId: string | null,
    cwd: string | undefined,
  ) => void,
  onClaudeEnded: (terminal: vscode.Terminal) => void,
): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];

  // Track shell execution start
  const startDisposable = vscode.window.onDidStartTerminalShellExecution((e) => {
    const terminal = e.terminal;
    const execution = e.execution;

    // commandLine may be undefined if Shell Integration is limited
    const commandLine = execution.commandLine;
    if (!commandLine) return;

    const cmd = commandLine.value;
    if (!isClaudeCommand(cmd)) return;

    // Already tracked? Skip.
    if (isTerminalTracked(terminal, agents)) return;

    console.log(`[Pixel Agents] Shell Integration: detected claude command in "${terminal.name}"`);

    const sessionId = extractSessionId(cmd);
    const cwd = execution.cwd?.fsPath;

    onClaudeDetected(terminal, sessionId, cwd);
  });
  disposables.push(startDisposable);

  // Track shell execution end — cancel pending discovery, notify caller
  const endDisposable = vscode.window.onDidEndTerminalShellExecution((e) => {
    const terminal = e.terminal;
    const execution = e.execution;

    // Only care about claude commands
    const commandLine = execution.commandLine;
    if (!commandLine) return;

    const cmd = commandLine.value;
    if (!isClaudeCommand(cmd)) return;

    onClaudeEnded(terminal);
  });
  disposables.push(endDisposable);

  return disposables;
}

/**
 * Start JSONL discovery for a detected claude terminal.
 * Returns the abort controller so the caller can cancel if needed.
 */
export function startJsonlDiscovery(
  projectDir: string,
  sessionId: string | null,
  onFound: (jsonlFile: string) => void,
): AbortController {
  const controller = new AbortController();

  // Set timeout
  const timeout = setTimeout(() => {
    console.log(`[Pixel Agents] JSONL discovery timed out for projectDir: ${projectDir}`);
    controller.abort();
  }, JSONL_DISCOVERY_TIMEOUT_MS);

  controller.signal.addEventListener(
    'abort',
    () => {
      clearTimeout(timeout);
    },
    { once: true },
  );

  discoverJsonlFile(projectDir, sessionId, controller.signal).then((file) => {
    clearTimeout(timeout);
    if (file) {
      onFound(file);
    }
  });

  return controller;
}

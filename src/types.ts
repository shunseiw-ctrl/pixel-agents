import type * as vscode from 'vscode';

export interface AgentState {
  id: number;
  terminalRef: vscode.Terminal;
  projectDir: string;
  jsonlFile: string;
  fileOffset: number;
  lineBuffer: string;
  activeToolIds: Set<string>;
  activeToolStatuses: Map<string, string>;
  activeToolNames: Map<string, string>;
  activeSubagentToolIds: Map<string, Set<string>>; // parentToolId → active sub-tool IDs
  activeSubagentToolNames: Map<string, Map<string, string>>; // parentToolId → (subToolId → toolName)
  isWaiting: boolean;
  permissionSent: boolean;
  hadToolsInTurn: boolean;
  /** Workspace folder name (only set for multi-root workspaces) */
  folderName?: string;
  /** Last thought text for loop detection */
  lastThoughtText: string;
  /** Consecutive count of same thought text */
  thoughtRepeatCount: number;
  /** Whether agent meta (issue/task name) has been sent */
  metaSent: boolean;
  /** Agent creation timestamp (ms) */
  createdAt: number;
  /** Whether the last turn had errors (for completion animation) */
  lastTurnHadError: boolean;
  /** Accumulated token usage */
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    cacheWriteTokens: number;
    cacheReadTokens: number;
  };
}

export interface PersistedAgent {
  id: number;
  terminalName: string;
  jsonlFile: string;
  projectDir: string;
  /** Workspace folder name (only set for multi-root workspaces) */
  folderName?: string;
}

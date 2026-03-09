import * as vscode from 'vscode';

import { MOCK_EVENT_INTERVAL_MS, MOCK_TOOL_DURATION_MS } from './constants.js';

type MockPattern = 'normal' | 'error' | 'loop' | 'mixed';

interface MockAgent {
  id: number;
  pattern: MockPattern;
  step: number;
  toolId: string | null;
}

const MOCK_TOOLS = ['Write', 'Read', 'Bash', 'Edit', 'Grep', 'Glob'];
const MOCK_STATUSES = [
  'app.tsx を編集中...',
  'utils.ts を確認中...',
  'npm test を実行中...',
  'components/ を検索中...',
  'main.dart を読取中...',
  'flutter analyze を実行中...',
];
const MOCK_TASK_NAMES = [
  'ログイン画面を修正',
  'APIエンドポイント追加',
  'テストを追加',
  'リファクタリング',
  'バグ修正',
];

let mockAgents: MockAgent[] = [];
let mockTimer: ReturnType<typeof setInterval> | null = null;
let mockNextId = 100;
let webviewRef: vscode.Webview | undefined;

export function startMockMode(
  webview: vscode.Webview | undefined,
  agentCount: number,
  pattern: MockPattern,
): void {
  if (mockTimer) {
    stopMockMode();
  }
  webviewRef = webview;
  mockAgents = [];

  // Assign patterns
  const patterns: MockPattern[] = [];
  if (pattern === 'mixed') {
    const available: MockPattern[] = ['normal', 'error', 'loop'];
    for (let i = 0; i < agentCount; i++) {
      patterns.push(available[i % available.length]);
    }
  } else {
    for (let i = 0; i < agentCount; i++) {
      patterns.push(pattern);
    }
  }

  // Create mock agents
  for (let i = 0; i < agentCount; i++) {
    const id = mockNextId++;
    mockAgents.push({ id, pattern: patterns[i], step: 0, toolId: null });
    const taskName = MOCK_TASK_NAMES[i % MOCK_TASK_NAMES.length];
    const issueNumber = 100 + i;

    webviewRef?.postMessage({ type: 'agentCreated', id });
    webviewRef?.postMessage({
      type: 'agentMeta',
      id,
      issueNumber,
      taskName,
      createdAt: Date.now(),
    });
  }

  // Start event loop
  mockTimer = setInterval(() => {
    tickMock();
  }, MOCK_EVENT_INTERVAL_MS);

  vscode.window.showInformationMessage(`モックモード開始: ${agentCount}エージェント (${pattern})`);
}

export function stopMockMode(): void {
  if (mockTimer) {
    clearInterval(mockTimer);
    mockTimer = null;
  }
  // Close all mock agents
  for (const agent of mockAgents) {
    if (agent.toolId) {
      webviewRef?.postMessage({
        type: 'agentToolDone',
        id: agent.id,
        toolId: agent.toolId,
      });
    }
    webviewRef?.postMessage({ type: 'agentClosed', id: agent.id, success: true });
  }
  mockAgents = [];
  vscode.window.showInformationMessage('モックモード終了');
}

export function isMockRunning(): boolean {
  return mockTimer !== null;
}

function tickMock(): void {
  for (const agent of mockAgents) {
    switch (agent.pattern) {
      case 'normal':
        tickNormal(agent);
        break;
      case 'error':
        tickError(agent);
        break;
      case 'loop':
        tickLoop(agent);
        break;
      case 'mixed':
        tickNormal(agent);
        break;
    }
    agent.step++;
  }
}

function randomTool(): string {
  return MOCK_TOOLS[Math.floor(Math.random() * MOCK_TOOLS.length)];
}

function randomStatus(): string {
  return MOCK_STATUSES[Math.floor(Math.random() * MOCK_STATUSES.length)];
}

function tickNormal(agent: MockAgent): void {
  const phase = agent.step % 6;
  if (phase === 0) {
    // Start a tool
    const toolId = `mock_tool_${agent.id}_${agent.step}`;
    const tool = randomTool();
    agent.toolId = toolId;
    webviewRef?.postMessage({
      type: 'agentToolStart',
      id: agent.id,
      toolId,
      toolName: tool,
      status: randomStatus(),
    });
    webviewRef?.postMessage({
      type: 'agentThought',
      id: agent.id,
      text: randomStatus(),
      isAnomalous: false,
    });
  } else if (phase === 2) {
    // Tool done
    if (agent.toolId) {
      webviewRef?.postMessage({
        type: 'agentToolDone',
        id: agent.id,
        toolId: agent.toolId,
      });
      agent.toolId = null;
    }
  } else if (phase === 3) {
    // Start another tool
    const toolId = `mock_tool_${agent.id}_${agent.step}`;
    const tool = randomTool();
    agent.toolId = toolId;
    webviewRef?.postMessage({
      type: 'agentToolStart',
      id: agent.id,
      toolId,
      toolName: tool,
      status: randomStatus(),
    });
    webviewRef?.postMessage({
      type: 'agentThought',
      id: agent.id,
      text: randomStatus(),
      isAnomalous: false,
    });
    // Mock token usage
    webviewRef?.postMessage({
      type: 'agentTokenUsage',
      id: agent.id,
      inputTokens: 500 + Math.floor(Math.random() * 2000),
      outputTokens: 100 + Math.floor(Math.random() * 500),
      costUsd: 0.01 + Math.random() * 0.05,
    });
  } else if (phase === 5) {
    // Tool done + waiting
    if (agent.toolId) {
      webviewRef?.postMessage({
        type: 'agentToolDone',
        id: agent.id,
        toolId: agent.toolId,
      });
      agent.toolId = null;
    }
    webviewRef?.postMessage({
      type: 'agentStatus',
      id: agent.id,
      status: 'waiting',
    });
    webviewRef?.postMessage({
      type: 'agentThought',
      id: agent.id,
      text: '指示を待っています',
      isAnomalous: false,
    });
    // Then resume after next tick
    setTimeout(() => {
      webviewRef?.postMessage({
        type: 'agentStatus',
        id: agent.id,
        status: 'active',
      });
    }, MOCK_TOOL_DURATION_MS);
  }
}

function tickError(agent: MockAgent): void {
  const phase = agent.step % 8;
  if (phase < 4) {
    // Normal work for first half
    tickNormal(agent);
  } else if (phase === 4) {
    // Start a tool that will "fail"
    const toolId = `mock_tool_${agent.id}_${agent.step}`;
    agent.toolId = toolId;
    webviewRef?.postMessage({
      type: 'agentToolStart',
      id: agent.id,
      toolId,
      toolName: 'Bash',
      status: 'flutter test を実行中...',
    });
    webviewRef?.postMessage({
      type: 'agentThought',
      id: agent.id,
      text: 'flutter test を実行中...',
      isAnomalous: false,
    });
  } else if (phase === 5) {
    // Error detected
    if (agent.toolId) {
      webviewRef?.postMessage({
        type: 'agentToolDone',
        id: agent.id,
        toolId: agent.toolId,
      });
      agent.toolId = null;
    }
    webviewRef?.postMessage({
      type: 'agentThought',
      id: agent.id,
      text: 'エラーを検出...',
      isAnomalous: true,
    });
    webviewRef?.postMessage({
      type: 'agentError',
      id: agent.id,
      hasError: true,
    });
  } else if (phase === 7) {
    // Recover
    webviewRef?.postMessage({
      type: 'agentError',
      id: agent.id,
      hasError: false,
    });
    webviewRef?.postMessage({
      type: 'agentThought',
      id: agent.id,
      text: 'エラーを修正中...',
      isAnomalous: false,
    });
  }
}

function tickLoop(agent: MockAgent): void {
  const phase = agent.step % 10;
  if (phase < 4) {
    tickNormal(agent);
  } else {
    // Keep sending the same thought to trigger loop detection
    const toolId = `mock_tool_${agent.id}_${agent.step}`;
    if (!agent.toolId) {
      agent.toolId = toolId;
      webviewRef?.postMessage({
        type: 'agentToolStart',
        id: agent.id,
        toolId,
        toolName: 'Edit',
        status: 'app.tsx を編集中...',
      });
    }
    webviewRef?.postMessage({
      type: 'agentThought',
      id: agent.id,
      text: 'app.tsx を編集中...',
      isAnomalous: phase >= 7, // Mark as anomalous after 3 repeats
    });
  }
}

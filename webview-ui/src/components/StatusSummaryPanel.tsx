import { useEffect, useState } from 'react';

import type { AgentCost, AgentPipeline } from '../hooks/useExtensionMessages.js';
import type { ToolActivity } from '../office/types.js';

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export interface AgentMeta {
  issueNumber?: number;
  taskName?: string;
  createdAt: number;
}

export interface AgentHistoryEntry {
  id: number;
  issueNumber?: number;
  taskName?: string;
  completedAt: number;
  elapsedMs: number;
  success: boolean;
  costUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheWriteTokens?: number;
  cacheReadTokens?: number;
}

interface StatusSummaryPanelProps {
  agents: number[];
  agentStatuses: Record<number, string>;
  agentTools: Record<number, ToolActivity[]>;
  agentMetas: Record<number, AgentMeta>;
  agentCosts: Record<number, AgentCost>;
  agentPipelines: Record<number, AgentPipeline>;
  agentHistory: AgentHistoryEntry[];
  onSelectAgent: (id: number) => void;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getAgentDisplayName(id: number, meta?: AgentMeta): string {
  if (!meta) return `Agent #${id}`;
  const issue = meta.issueNumber ? `#${meta.issueNumber}` : '';
  const name = meta.taskName || '';
  if (issue && name) return `${issue} ${name}`;
  if (issue) return issue;
  if (name) return name;
  return `Agent #${id}`;
}

type AgentStatusType = 'active' | 'waiting' | 'error';

function getAgentStatus(
  id: number,
  agentStatuses: Record<number, string>,
  agentTools: Record<number, ToolActivity[]>,
): { status: AgentStatusType; text: string } {
  const tools = agentTools[id];
  const statusStr = agentStatuses[id];

  if (statusStr === 'waiting') {
    return { status: 'waiting', text: '待機中' };
  }

  if (tools && tools.length > 0) {
    const activeTool = [...tools].reverse().find((t) => !t.done);
    if (activeTool) {
      if (activeTool.permissionWait) return { status: 'error', text: '許可待ち' };
      return { status: 'active', text: activeTool.status };
    }
  }

  return { status: 'active', text: '処理中' };
}

const statusIcons: Record<AgentStatusType, string> = {
  active: '●',
  waiting: '●',
  error: '●',
};

const statusColors: Record<AgentStatusType, string> = {
  active: 'var(--pixel-summary-active)',
  waiting: 'var(--pixel-summary-waiting)',
  error: 'var(--pixel-summary-error)',
};

const PIPELINE_LABELS: Record<string, string> = {
  analyze: 'analyze',
  test: 'test',
  push: 'push',
  pr: 'PR作成',
};

export function StatusSummaryPanel({
  agents,
  agentStatuses,
  agentTools,
  agentMetas,
  agentCosts,
  agentPipelines,
  agentHistory,
  onSelectAgent,
}: StatusSummaryPanelProps) {
  const [now, setNow] = useState(Date.now());
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  // Update elapsed times every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeCount = agents.filter((id) => {
    const s = agentStatuses[id];
    return s !== 'waiting';
  }).length;
  const waitingCount = agents.filter((id) => agentStatuses[id] === 'waiting').length;
  const errorCount = agents.filter((id) => {
    const tools = agentTools[id];
    return tools?.some((t) => t.permissionWait && !t.done);
  }).length;

  // Total cost across active agents + history
  const activeTotalCost = agents.reduce((sum, id) => sum + (agentCosts[id]?.costUsd ?? 0), 0);
  const historyTotalCost = agentHistory.reduce((sum, e) => sum + (e.costUsd ?? 0), 0);
  const totalCost = activeTotalCost + historyTotalCost;

  const timeStr = new Date(now).toLocaleTimeString('ja-JP', { hour12: false });

  if (agents.length === 0 && agentHistory.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 46,
        right: 10,
        zIndex: 'var(--pixel-controls-z)',
        background: 'var(--pixel-bg)',
        border: '2px solid var(--pixel-border)',
        borderRadius: 0,
        boxShadow: 'var(--pixel-shadow)',
        minWidth: 320,
        maxWidth: 440,
        maxHeight: 200,
        overflow: 'auto',
        fontSize: '18px',
      }}
    >
      {/* Summary bar */}
      <div
        onClick={() => setCollapsed((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 8px',
          borderBottom: collapsed ? 'none' : '1px solid var(--pixel-border)',
          color: 'var(--pixel-text-dim)',
          fontSize: '16px',
          flexWrap: 'wrap',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: '12px' }}>{collapsed ? '▶' : '▼'}</span>
        <span style={{ fontWeight: 'bold', color: 'var(--vscode-foreground)' }}>ステータス</span>
        <span style={{ color: 'var(--pixel-summary-active)' }}>稼働: {activeCount}</span>
        <span style={{ color: 'var(--pixel-summary-waiting)' }}>待機: {waitingCount}</span>
        <span
          style={{ color: errorCount > 0 ? 'var(--pixel-summary-error)' : 'var(--pixel-text-dim)' }}
        >
          警告: {errorCount}
        </span>
        {totalCost > 0 && (
          <span style={{ color: 'var(--pixel-summary-cost)', fontWeight: 'bold' }}>
            合計: ${totalCost.toFixed(2)}
          </span>
        )}
        <span style={{ marginLeft: 'auto' }}>{timeStr}</span>
      </div>

      {/* Agent rows + History — hidden when collapsed */}
      {!collapsed &&
        agents.map((id) => {
          const meta = agentMetas[id];
          const cost = agentCosts[id];
          const pipeline = agentPipelines[id];
          const { status, text } = getAgentStatus(id, agentStatuses, agentTools);
          const elapsed = meta ? now - meta.createdAt : 0;

          return (
            <div key={id}>
              <div
                onClick={() => onSelectAgent(id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 8px',
                  cursor: 'pointer',
                  borderBottom: pipeline ? 'none' : '1px solid var(--pixel-row-border)',
                  background: status === 'error' ? 'var(--pixel-summary-error-bg)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    status === 'error'
                      ? 'var(--pixel-summary-error-bg-hover)'
                      : 'rgba(255,255,255,0.05)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    status === 'error' ? 'var(--pixel-summary-error-bg)' : 'transparent';
                }}
              >
                <span style={{ color: statusColors[status], fontSize: '10px' }}>
                  {statusIcons[status]}
                </span>
                <span
                  style={{
                    fontWeight: 'bold',
                    color: 'var(--vscode-foreground)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 120,
                  }}
                >
                  {getAgentDisplayName(id, meta)}
                </span>
                <span
                  style={{
                    color: 'var(--pixel-text-dim)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  {text}
                </span>
                {cost && cost.costUsd > 0 && (
                  <span
                    style={{
                      color: 'var(--pixel-text-dim)',
                      whiteSpace: 'nowrap',
                      fontSize: '14px',
                    }}
                  >
                    ${cost.costUsd.toFixed(2)}
                  </span>
                )}
                <span
                  style={{
                    color: 'var(--pixel-text-dim)',
                    whiteSpace: 'nowrap',
                    fontSize: '16px',
                  }}
                >
                  {formatElapsed(elapsed)}
                </span>
              </div>
              {/* Token details row */}
              {cost && cost.inputTokens > 0 && (
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    padding: '1px 8px 2px 24px',
                    borderBottom: pipeline ? 'none' : '1px solid var(--pixel-row-border)',
                    fontSize: '13px',
                    color: 'var(--pixel-text-dim)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span>IN:{formatTokenCount(cost.inputTokens)}</span>
                  <span>OUT:{formatTokenCount(cost.outputTokens)}</span>
                  {cost.cacheReadTokens > 0 &&
                    (() => {
                      const rate = Math.round(
                        (cost.cacheReadTokens / (cost.inputTokens + cost.cacheReadTokens)) * 100,
                      );
                      return (
                        <span
                          style={{
                            color:
                              rate > 50 ? 'var(--pixel-summary-cost)' : 'var(--pixel-text-dim)',
                          }}
                        >
                          Cache:{rate}%
                        </span>
                      );
                    })()}
                </div>
              )}
              {/* Pipeline steps */}
              {pipeline && Object.keys(pipeline.steps).length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    gap: 4,
                    padding: '1px 8px 3px 24px',
                    borderBottom: '1px solid var(--pixel-row-border)',
                    fontSize: '14px',
                    color: 'var(--pixel-text-dim)',
                    flexWrap: 'wrap',
                  }}
                >
                  {Object.entries(pipeline.steps).map(([step, stepStatus]) => (
                    <span key={step}>
                      {stepStatus === 'done' ? '✅' : '🔄'} {PIPELINE_LABELS[step] || step}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

      {/* History section */}
      {!collapsed && agentHistory.length > 0 && (
        <>
          <div
            onClick={() => setHistoryExpanded((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderTop: '1px solid var(--pixel-border)',
              cursor: 'pointer',
              color: 'var(--pixel-text-dim)',
              fontSize: '16px',
            }}
          >
            <span>{historyExpanded ? '▼' : '▶'}</span>
            <span>履歴</span>
          </div>
          {historyExpanded &&
            agentHistory
              .slice(-5)
              .reverse()
              .map((entry, i) => (
                <div
                  key={`${entry.id}-${i}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '2px 8px 2px 16px',
                    color: 'var(--pixel-text-dim)',
                    fontSize: '16px',
                  }}
                >
                  <span>{formatTime(entry.completedAt)}</span>
                  <span>{entry.success ? '✅' : '❌'}</span>
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {getAgentDisplayName(entry.id, {
                      issueNumber: entry.issueNumber,
                      taskName: entry.taskName,
                      createdAt: 0,
                    })}
                  </span>
                  {entry.costUsd != null && entry.costUsd > 0 && (
                    <span style={{ fontSize: '14px' }}>${entry.costUsd.toFixed(2)}</span>
                  )}
                  <span>{formatElapsed(entry.elapsedMs)}</span>
                </div>
              ))}
        </>
      )}
    </div>
  );
}

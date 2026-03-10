import { useEffect, useState } from 'react';

import { CHARACTER_SITTING_OFFSET_PX, TOOL_OVERLAY_VERTICAL_OFFSET } from '../../constants.js';
import type { AgentThought, SubagentCharacter } from '../../hooks/useExtensionMessages.js';
import type { OfficeState } from '../engine/officeState.js';
import type { ToolActivity } from '../types.js';
import { CharacterState, TILE_SIZE } from '../types.js';

interface ToolOverlayProps {
  officeState: OfficeState;
  agents: number[];
  agentTools: Record<number, ToolActivity[]>;
  agentThoughts: Record<number, AgentThought>;
  showThoughts: boolean;
  subagentCharacters: SubagentCharacter[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  panRef: React.RefObject<{ x: number; y: number }>;
  onCloseAgent: (id: number) => void;
}

/** Derive a short human-readable activity string from tools/status */
function getActivityText(
  agentId: number,
  agentTools: Record<number, ToolActivity[]>,
  isActive: boolean,
): string {
  const tools = agentTools[agentId];
  if (tools && tools.length > 0) {
    // Find the latest non-done tool
    const activeTool = [...tools].reverse().find((t) => !t.done);
    if (activeTool) {
      if (activeTool.permissionWait) return '許可が必要です';
      return activeTool.status;
    }
    // All tools done but agent still active (mid-turn) — keep showing last tool status
    if (isActive) {
      const lastTool = tools[tools.length - 1];
      if (lastTool) return lastTool.status;
    }
  }

  return '待機中';
}

export function ToolOverlay({
  officeState,
  agents,
  agentTools,
  agentThoughts,
  showThoughts,
  subagentCharacters,
  containerRef,
  zoom,
  panRef,
  onCloseAgent,
}: ToolOverlayProps) {
  const [, setTick] = useState(0);
  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      setTick((n) => n + 1);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const el = containerRef.current;
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const canvasW = Math.round(rect.width * dpr);
  const canvasH = Math.round(rect.height * dpr);
  const layout = officeState.getLayout();
  const mapW = layout.cols * TILE_SIZE * zoom;
  const mapH = layout.rows * TILE_SIZE * zoom;
  const deviceOffsetX = Math.floor((canvasW - mapW) / 2) + Math.round(panRef.current.x);
  const deviceOffsetY = Math.floor((canvasH - mapH) / 2) + Math.round(panRef.current.y);

  const selectedId = officeState.selectedAgentId;
  const hoveredId = officeState.hoveredAgentId;

  // All character IDs
  const allIds = [...agents, ...subagentCharacters.map((s) => s.id)];

  return (
    <>
      {allIds.map((id) => {
        const ch = officeState.characters.get(id);
        if (!ch) return null;

        const isSelected = selectedId === id;
        const isHovered = hoveredId === id;
        const isSub = ch.isSubagent;
        const thought = agentThoughts[id];

        // Position above character
        const sittingOffset = ch.state === CharacterState.TYPE ? CHARACTER_SITTING_OFFSET_PX : 0;
        const screenX = (deviceOffsetX + ch.x * zoom) / dpr;
        const screenY =
          (deviceOffsetY + (ch.y + sittingOffset - TOOL_OVERLAY_VERTICAL_OFFSET) * zoom) / dpr;

        // Thought bubble: always visible for all agents (if enabled)
        const showThoughtBubble = showThoughts && thought && !isSelected && !isHovered;

        // Detail overlay: only for hovered/selected
        const showDetail = isSelected || isHovered;

        if (!showThoughtBubble && !showDetail) return null;

        // Get activity text for detail overlay
        let activityText = '';
        if (showDetail) {
          const subHasPermission = isSub && ch.bubbleType === 'permission';
          if (isSub) {
            if (subHasPermission) {
              activityText = '許可が必要です';
            } else {
              const sub = subagentCharacters.find((s) => s.id === id);
              activityText = sub ? sub.label : 'サブタスク';
            }
          } else {
            activityText = getActivityText(id, agentTools, ch.isActive);
          }
        }

        // Determine dot color for detail overlay
        const tools = agentTools[id];
        const subHasPermission = isSub && ch.bubbleType === 'permission';
        const hasPermission = subHasPermission || tools?.some((t) => t.permissionWait && !t.done);
        const hasActiveTools = tools?.some((t) => !t.done);
        const isActive = ch.isActive;

        let dotColor: string | null = null;
        if (hasPermission) {
          dotColor = 'var(--pixel-status-permission)';
        } else if (isActive && hasActiveTools) {
          dotColor = 'var(--pixel-status-active)';
        }

        return (
          <div
            key={id}
            style={{
              position: 'absolute',
              left: screenX,
              top: screenY - 24,
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              pointerEvents: isSelected ? 'auto' : 'none',
              zIndex: isSelected
                ? 'var(--pixel-overlay-selected-z)'
                : isHovered
                  ? 'var(--pixel-overlay-z)'
                  : 1,
            }}
          >
            {/* Detail overlay (hover/selected) */}
            {showDetail && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  background: 'var(--pixel-bg)',
                  border: isSelected
                    ? '2px solid var(--pixel-border-light)'
                    : '2px solid var(--pixel-border)',
                  borderRadius: 0,
                  padding: isSelected ? '3px 6px 3px 8px' : '3px 8px',
                  boxShadow: 'var(--pixel-shadow)',
                  whiteSpace: 'nowrap',
                  maxWidth: 220,
                }}
              >
                {dotColor && (
                  <span
                    className={isActive && !hasPermission ? 'pixel-agents-pulse' : undefined}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: dotColor,
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ overflow: 'hidden' }}>
                  {ch.displayName && (
                    <span
                      style={{
                        fontSize: '18px',
                        color: 'var(--pixel-accent)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'block',
                        fontWeight: 'bold',
                      }}
                    >
                      {ch.displayName}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: isSub ? '20px' : '22px',
                      fontStyle: isSub ? 'italic' : undefined,
                      color: 'var(--vscode-foreground)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'block',
                    }}
                  >
                    {activityText}
                  </span>
                  {ch.folderName && (
                    <span
                      style={{
                        fontSize: '16px',
                        color: 'var(--pixel-text-dim)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'block',
                      }}
                    >
                      {ch.folderName}
                    </span>
                  )}
                </div>
                {isSelected && !isSub && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseAgent(id);
                    }}
                    title="エージェントを閉じる"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--pixel-close-text)',
                      cursor: 'pointer',
                      padding: '0 2px',
                      fontSize: '26px',
                      lineHeight: 1,
                      marginLeft: 2,
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--pixel-close-hover)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--pixel-close-text)';
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            )}

            {/* Thought bubble (always visible when enabled, hidden when detail is shown) */}
            {showThoughtBubble && (
              <div
                style={{
                  background: thought.isAnomalous ? '#FFF0F0' : '#ffffff',
                  border: thought.isAnomalous ? '2px solid #D9534F' : '2px solid #999',
                  borderRadius: 0,
                  padding: '2px 6px',
                  boxShadow: '1px 1px 0px rgba(0,0,0,0.2)',
                  whiteSpace: 'nowrap',
                  maxWidth: 200,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                <span
                  style={{
                    fontSize: '18px',
                    color: thought.isAnomalous ? '#D9534F' : '#333',
                  }}
                >
                  {thought.text}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

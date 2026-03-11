import { useEffect, useRef } from 'react';

import { CHARACTER_SITTING_OFFSET_PX, TOOL_OVERLAY_VERTICAL_OFFSET } from '../constants.js';
import type { SubagentCharacter } from '../hooks/useExtensionMessages.js';
import type { OfficeState } from '../office/engine/officeState.js';
import { CharacterState, TILE_SIZE } from '../office/types.js';

interface AgentLabelsProps {
  officeState: OfficeState;
  agentStatuses: Record<number, string>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  panRef: React.RefObject<{ x: number; y: number }>;
  subagentCharacters: SubagentCharacter[];
}

export function AgentLabels({
  officeState,
  agentStatuses,
  containerRef,
  zoom,
  panRef,
  subagentCharacters,
}: AgentLabelsProps) {
  const labelRefs = useRef(new Map<number, HTMLDivElement>());

  // rAF loop: update positions and visibility via direct DOM manipulation (no React re-render)
  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      const el = containerRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const canvasW = Math.round(rect.width * dpr);
        const canvasH = Math.round(rect.height * dpr);
        const layout = officeState.getLayout();
        const mapW = layout.cols * TILE_SIZE * zoom;
        const mapH = layout.rows * TILE_SIZE * zoom;
        const deviceOffsetX = Math.floor((canvasW - mapW) / 2) + Math.round(panRef.current.x);
        const deviceOffsetY = Math.floor((canvasH - mapH) / 2) + Math.round(panRef.current.y);

        for (const [id, div] of labelRefs.current) {
          const ch = officeState.characters.get(id);
          if (
            !ch ||
            ch.matrixEffect === 'despawn' ||
            officeState.hoveredAgentId === id ||
            officeState.selectedAgentId === id
          ) {
            div.style.display = 'none';
            continue;
          }
          div.style.display = 'flex';
          const sittingOffset = ch.state === CharacterState.TYPE ? CHARACTER_SITTING_OFFSET_PX : 0;
          const screenX = (deviceOffsetX + ch.x * zoom) / dpr;
          const screenY =
            (deviceOffsetY + (ch.y + sittingOffset - TOOL_OVERLAY_VERTICAL_OFFSET) * zoom) / dpr;
          div.style.left = `${screenX}px`;
          div.style.top = `${screenY - 16}px`;
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [officeState, containerRef, zoom, panRef]);

  const el = containerRef.current;
  if (!el) return null;

  // Build sub-agent label lookup
  const subLabelMap = new Map<number, string>();
  for (const sub of subagentCharacters) {
    subLabelMap.set(sub.id, sub.label);
  }

  // All character IDs to render labels for (all characters in office)
  const allIds = Array.from(officeState.characters.keys());

  return (
    <>
      {allIds.map((id) => {
        const ch = officeState.characters.get(id);
        if (!ch) return null;

        const status = agentStatuses[id];
        const isWaiting = status === 'waiting';
        const isActive = ch.isActive;
        const isSub = ch.isSubagent;

        let dotColor = 'transparent';
        if (isWaiting) {
          dotColor = 'var(--vscode-charts-yellow, #cca700)';
        } else if (isActive) {
          dotColor = 'var(--vscode-charts-blue, #3794ff)';
        }

        // Use displayName from character, with fallback
        const labelText = subLabelMap.get(id) || ch.displayName || `Agent #${id}`;

        return (
          <div
            key={id}
            ref={(el) => {
              if (el) labelRefs.current.set(id, el);
              else labelRefs.current.delete(id);
            }}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              transform: 'translateX(-50%)',
              display: 'none',
              flexDirection: 'column',
              alignItems: 'center',
              pointerEvents: 'none',
              zIndex: 45,
            }}
          >
            {dotColor !== 'transparent' && (
              <span
                className={isActive && !isWaiting ? 'pixel-agents-pulse' : undefined}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: dotColor,
                  marginBottom: 2,
                }}
              />
            )}
            <span
              style={{
                fontSize: isSub ? '16px' : '18px',
                fontStyle: isSub ? 'italic' : undefined,
                color: 'var(--vscode-foreground)',
                background: 'var(--pixel-label-bg)',
                padding: '1px 4px',
                borderRadius: 2,
                whiteSpace: 'nowrap',
                maxWidth: isSub ? 120 : undefined,
                overflow: isSub ? 'hidden' : undefined,
                textOverflow: isSub ? 'ellipsis' : undefined,
              }}
            >
              {labelText}
            </span>
          </div>
        );
      })}
    </>
  );
}

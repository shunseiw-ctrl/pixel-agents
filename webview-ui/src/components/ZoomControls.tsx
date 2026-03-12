import { useState } from 'react';

import { ZOOM_MAX, ZOOM_MIN } from '../constants.js';

interface ZoomControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

const btnBase: React.CSSProperties = {
  width: 40,
  height: 40,
  padding: 0,
  background: 'var(--pixel-bg)',
  color: 'var(--pixel-text)',
  border: '2px solid var(--pixel-border)',
  borderRadius: 0,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: 'var(--pixel-shadow)',
};

export function ZoomControls({ zoom, onZoomChange }: ZoomControlsProps) {
  const [hovered, setHovered] = useState<'minus' | 'plus' | null>(null);
  const minDisabled = zoom <= ZOOM_MIN;
  const maxDisabled = zoom >= ZOOM_MAX;

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        left: 8,
        zIndex: 'var(--pixel-controls-z)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <button
        onClick={() => onZoomChange(zoom + 1)}
        disabled={maxDisabled}
        onMouseEnter={() => setHovered('plus')}
        onMouseLeave={() => setHovered(null)}
        style={{
          ...btnBase,
          background:
            hovered === 'plus' && !maxDisabled ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
          cursor: maxDisabled ? 'default' : 'pointer',
          opacity: maxDisabled ? 'var(--pixel-btn-disabled-opacity)' : 1,
        }}
        title="ズームイン (Ctrl+Scroll)"
        aria-label="ズームイン"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <line
            x1="9"
            y1="3"
            x2="9"
            y2="15"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="3"
            y1="9"
            x2="15"
            y2="9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Zoom level — always visible */}
      <div
        style={{
          width: 40,
          height: 24,
          background: 'var(--pixel-bg)',
          border: '2px solid var(--pixel-border)',
          borderRadius: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          color: 'var(--pixel-text)',
          userSelect: 'none',
        }}
      >
        {zoom}x
      </div>

      <button
        onClick={() => onZoomChange(zoom - 1)}
        disabled={minDisabled}
        onMouseEnter={() => setHovered('minus')}
        onMouseLeave={() => setHovered(null)}
        style={{
          ...btnBase,
          background:
            hovered === 'minus' && !minDisabled ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
          cursor: minDisabled ? 'default' : 'pointer',
          opacity: minDisabled ? 'var(--pixel-btn-disabled-opacity)' : 1,
        }}
        title="ズームアウト (Ctrl+Scroll)"
        aria-label="ズームアウト"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <line
            x1="3"
            y1="9"
            x2="15"
            y2="9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

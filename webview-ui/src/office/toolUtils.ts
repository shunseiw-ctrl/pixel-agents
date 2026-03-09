/** Map status prefixes back to tool names for animation selection */
export const STATUS_TO_TOOL: Record<string, string> = {
  // Japanese status prefixes (from transcriptParser.ts)
  を読取中: 'Read',
  を編集中: 'Edit',
  を書込中: 'Write',
  実行中: 'Bash',
  ファイル検索中: 'Glob',
  コード検索中: 'Grep',
  Web取得中: 'WebFetch',
  Web検索中: 'WebSearch',
  サブタスク: 'Task',
  ノートブック編集中: 'Edit',
  計画中: 'Read',
  入力待ち: 'Read',
  を使用中: 'Bash',
  // Legacy English prefixes (for compatibility)
  Reading: 'Read',
  Searching: 'Grep',
  Globbing: 'Glob',
  Fetching: 'WebFetch',
  'Searching web': 'WebSearch',
  Writing: 'Write',
  Editing: 'Edit',
  Running: 'Bash',
  Task: 'Task',
};

export function extractToolName(status: string): string | null {
  for (const [prefix, tool] of Object.entries(STATUS_TO_TOOL)) {
    if (status.includes(prefix)) return tool;
  }
  const first = status.split(/[\s:]/)[0];
  return first || null;
}

import { ZOOM_DEFAULT_DPR_FACTOR, ZOOM_MIN } from '../constants.js';

/** Compute a default integer zoom level (device pixels per sprite pixel) */
export function defaultZoom(): number {
  const dpr = window.devicePixelRatio || 1;
  return Math.max(ZOOM_MIN, Math.round(ZOOM_DEFAULT_DPR_FACTOR * dpr));
}

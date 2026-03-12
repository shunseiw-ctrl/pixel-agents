// ── Timing (ms) ──────────────────────────────────────────────
export const JSONL_POLL_INTERVAL_MS = 1000;
export const FILE_WATCHER_POLL_INTERVAL_MS = 1000;
export const FILE_WATCHER_DEBOUNCE_MS = 50;
export const JSONL_DISCOVERY_TIMEOUT_MS = 30000;
export const TOOL_DONE_DELAY_MS = 300;
export const PERMISSION_TIMER_DELAY_MS = 7000;
export const TEXT_IDLE_DELAY_MS = 5000;

// ── Display Truncation ──────────────────────────────────────
export const BASH_COMMAND_DISPLAY_MAX_LENGTH = 30;
export const TASK_DESCRIPTION_DISPLAY_MAX_LENGTH = 40;

// ── PNG / Asset Parsing ─────────────────────────────────────
export const PNG_ALPHA_THRESHOLD = 128;
export const WALL_PIECE_WIDTH = 16;
export const WALL_PIECE_HEIGHT = 32;
export const WALL_GRID_COLS = 4;
export const WALL_BITMASK_COUNT = 16;
export const FLOOR_PATTERN_COUNT = 7;
export const FLOOR_TILE_SIZE = 16;
export const CHARACTER_DIRECTIONS = ['down', 'up', 'right'] as const;
export const CHAR_FRAME_W = 16;
export const CHAR_FRAME_H = 32;
export const CHAR_FRAMES_PER_ROW = 7;
export const CHAR_COUNT = 6;

// ── User-Level Layout Persistence ─────────────────────────────
export const LAYOUT_FILE_DIR = '.pixel-agents';
export const LAYOUT_FILE_NAME = 'layout.json';
export const LAYOUT_FILE_POLL_INTERVAL_MS = 2000;

// ── Configured Agents (from ~/.claude/agents/) ──────────────
/** ID offset for configured agent characters (avoids collision with session agents) */
export const CONFIGURED_AGENT_ID_OFFSET = 10000;

// ── External Session Scanning ────────────────────────────────
/** How often to scan for external JSONL sessions (ms) */
export const EXTERNAL_SCAN_INTERVAL_MS = 5000;
/** JSONL files modified within this window are considered active (ms) */
export const EXTERNAL_SESSION_ACTIVE_THRESHOLD_MS = 60_000;

// ── Thought Bubbles ─────────────────────────────────────────
export const THOUGHT_MAX_LENGTH = 30;
export const LOOP_DETECTION_THRESHOLD = 3;

// ── Notification Cooldowns (ms) ─────────────────────────────
export const NOTIFY_COOLDOWN_ERROR_MS = 30_000;
export const NOTIFY_COOLDOWN_LOOP_MS = 60_000;
export const NOTIFY_COOLDOWN_INPUT_MS = 15_000;

// ── Cost Calculation ($/1K tokens, Claude Sonnet 4) ────────
export const COST_INPUT_PER_1K = 0.003;
export const COST_OUTPUT_PER_1K = 0.015;
export const COST_CACHE_WRITE_PER_1K = 0.00375;
export const COST_CACHE_READ_PER_1K = 0.0003;

// ── Settings Persistence ────────────────────────────────────
export const GLOBAL_KEY_SOUND_ENABLED = 'pixel-agents.soundEnabled';
export const GLOBAL_KEY_TYPING_SOUND_ENABLED = 'pixel-agents.typingSoundEnabled';
export const GLOBAL_KEY_NOTIFICATION_SOUND_ENABLED = 'pixel-agents.notificationSoundEnabled';
export const GLOBAL_KEY_MASTER_VOLUME = 'pixel-agents.masterVolume';
export const GLOBAL_KEY_THOUGHT_ENABLED = 'pixel-agents.thoughtBubblesEnabled';
export const GLOBAL_KEY_NOTIFY_ERROR = 'pixel-agents.notifyError';
export const GLOBAL_KEY_NOTIFY_LOOP = 'pixel-agents.notifyLoop';
export const GLOBAL_KEY_NOTIFY_COMPLETE = 'pixel-agents.notifyComplete';
export const GLOBAL_KEY_NOTIFY_INPUT_WAIT = 'pixel-agents.notifyInputWait';

// ── Onboarding ─────────────────────────────────────────────
export const GLOBAL_KEY_ONBOARDING_DONE = 'pixel-agents.onboardingDone';

// ── Agent Limits ────────────────────────────────────────────
export const MAX_AGENTS = 20;

// ── Mock Mode ────────────────────────────────────────────────
export const MOCK_EVENT_INTERVAL_MS = 2000;
export const MOCK_TOOL_DURATION_MS = 4000;

// ── VS Code Identifiers ─────────────────────────────────────
export const VIEW_ID = 'pixel-agents.panelView';
export const COMMAND_SHOW_PANEL = 'pixel-agents.showPanel';
export const COMMAND_EXPORT_DEFAULT_LAYOUT = 'pixel-agents.exportDefaultLayout';
export const COMMAND_START_MOCK = 'pixel-agents.startMockMode';
export const COMMAND_STOP_MOCK = 'pixel-agents.stopMockMode';
export const WORKSPACE_KEY_AGENTS = 'pixel-agents.agents';
export const WORKSPACE_KEY_AGENT_SEATS = 'pixel-agents.agentSeats';
export const WORKSPACE_KEY_LAYOUT = 'pixel-agents.layout';
export const TERMINAL_NAME_PREFIX = 'Claude Code';

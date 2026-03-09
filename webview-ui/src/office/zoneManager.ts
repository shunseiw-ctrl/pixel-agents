import {
  IDLE_TO_REST_DELAY_MS,
  ZONE_ALERT_COLOR,
  ZONE_MOVE_DEBOUNCE_MS,
  ZONE_REST_COLOR,
  ZONE_WORK_COLOR,
} from '../constants.js';
import type { OfficeLayout, Zone, ZoneConfig, ZoneType as ZoneTypeVal } from './types.js';
import { TileType, ZoneType } from './types.js';

/** Create default zone configuration for a layout */
export function createDefaultZones(layout: OfficeLayout): ZoneConfig {
  const { cols, rows } = layout;
  const workCols = Math.floor(cols * 0.6); // Left 60%
  const restRows = Math.floor(rows * 0.45); // Top 45% of right side

  const workTiles: Array<{ col: number; row: number }> = [];
  const restTiles: Array<{ col: number; row: number }> = [];
  const alertTiles: Array<{ col: number; row: number }> = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const tile = layout.tiles[idx];
      if (tile === TileType.WALL || tile === TileType.VOID) continue;

      if (c < workCols) {
        workTiles.push({ col: c, row: r });
      } else if (r < restRows) {
        restTiles.push({ col: c, row: r });
      } else {
        alertTiles.push({ col: c, row: r });
      }
    }
  }

  return {
    zones: [
      {
        type: ZoneType.WORK,
        label: '作業エリア',
        color: ZONE_WORK_COLOR,
        tiles: workTiles,
        seats: [],
      },
      {
        type: ZoneType.REST,
        label: '休憩エリア',
        color: ZONE_REST_COLOR,
        tiles: restTiles,
        seats: [],
      },
      {
        type: ZoneType.ALERT,
        label: '警告エリア',
        color: ZONE_ALERT_COLOR,
        tiles: alertTiles,
        seats: [],
      },
    ],
  };
}

/** Get zone type at a given tile position */
export function getZoneAtTile(
  col: number,
  row: number,
  zones: ZoneConfig | undefined,
): ZoneTypeVal | null {
  if (!zones) return null;
  for (const zone of zones.zones) {
    if (zone.tiles.some((t) => t.col === col && t.row === row)) {
      return zone.type;
    }
  }
  return null;
}

/** Get zone by type */
export function getZone(zoneType: ZoneTypeVal, zones: ZoneConfig | undefined): Zone | null {
  if (!zones) return null;
  return zones.zones.find((z) => z.type === zoneType) ?? null;
}

/** Get all walkable tiles in a zone */
export function getZoneTiles(
  zoneType: ZoneTypeVal,
  zones: ZoneConfig | undefined,
): Array<{ col: number; row: number }> {
  const zone = getZone(zoneType, zones);
  return zone ? zone.tiles : [];
}

/** Get zone color for overlay rendering */
export function getZoneColor(zoneType: ZoneTypeVal): string {
  switch (zoneType) {
    case ZoneType.WORK:
      return ZONE_WORK_COLOR;
    case ZoneType.REST:
      return ZONE_REST_COLOR;
    case ZoneType.ALERT:
      return ZONE_ALERT_COLOR;
    default:
      return 'transparent';
  }
}

/** Agent zone movement state tracking */
export interface AgentZoneState {
  targetZone: ZoneTypeVal | null;
  debounceTimer: number | null;
  idleTimer: number | null;
  currentZone: ZoneTypeVal | null;
}

/** Create initial zone state for an agent */
export function createAgentZoneState(): AgentZoneState {
  return {
    targetZone: null,
    debounceTimer: null,
    idleTimer: null,
    currentZone: null,
  };
}

/**
 * Determine which zone an agent should be in based on their status.
 * Returns the target zone type, or null if no movement is needed.
 */
export function determineTargetZone(
  isActive: boolean,
  hasError: boolean,
  isWaiting: boolean,
  _idleMs: number,
): ZoneTypeVal | null {
  if (hasError) return ZoneType.ALERT;
  if (isActive) return ZoneType.WORK;
  if (isWaiting) return ZoneType.REST;
  return null;
}

/**
 * Update agent zone state and determine if a move should start.
 * Returns the zone to move to, or null if no movement should happen.
 */
export function updateAgentZoneState(
  state: AgentZoneState,
  isActive: boolean,
  hasError: boolean,
  isWaiting: boolean,
  idleMs: number,
  now: number,
): ZoneTypeVal | null {
  const target = determineTargetZone(isActive, hasError, isWaiting, idleMs);

  // If waiting/idle, check if enough time has passed
  if (!isActive && !hasError && isWaiting) {
    if (idleMs < IDLE_TO_REST_DELAY_MS) return null;
  }

  if (target === state.currentZone) {
    // Already in the right zone
    state.debounceTimer = null;
    state.targetZone = null;
    return null;
  }

  if (target !== state.targetZone) {
    // Target changed — start debounce
    state.targetZone = target;
    state.debounceTimer = now;
    return null;
  }

  // Same target — check debounce
  if (state.debounceTimer !== null && now - state.debounceTimer >= ZONE_MOVE_DEBOUNCE_MS) {
    state.currentZone = target;
    state.debounceTimer = null;
    return target;
  }

  return null;
}

/** Set zone for a tile (used by editor) */
export function setTileZone(
  zones: ZoneConfig,
  col: number,
  row: number,
  zoneType: ZoneTypeVal,
): ZoneConfig {
  // Remove tile from all zones first
  const newZones = zones.zones.map((zone) => ({
    ...zone,
    tiles: zone.tiles.filter((t) => !(t.col === col && t.row === row)),
  }));

  // Add tile to the target zone
  const targetZone = newZones.find((z) => z.type === zoneType);
  if (targetZone) {
    targetZone.tiles.push({ col, row });
  }

  return { zones: newZones };
}

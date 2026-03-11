#!/usr/bin/env node
/**
 * Generate a rich 30×18 office layout with 20 seats.
 * Uses built-in furniture types (desk, chair, pc, bookshelf, whiteboard, plant, cooler, lamp).
 *
 * Room layout:
 *   Work A:  col 1-9,  row 1-9   (FLOOR_2, wood)  — 10 seats
 *   Corridor: col 10-14, row 1-10 (FLOOR_4, beige) — 0 seats
 *   Work B:  col 15-28, row 1-9   (FLOOR_2, wood)  — 5 seats
 *   Rest:    col 1-14,  row 11-16 (FLOOR_3, carpet) — 3 seats
 *   Alert:   col 16-28, row 11-16 (FLOOR_1, tile)   — 2 seats
 *   Row 10:  horizontal corridor connecting all areas
 *   Row 0, 17: outer walls
 *   Col 0, 29: outer walls
 *   Col 15 row 11-16: wall divider between rest and alert
 */

const COLS = 30;
const ROWS = 18;

// TileType values from types.ts
const WALL = 0;
const FLOOR_1 = 1;
const FLOOR_2 = 2;
const FLOOR_3 = 3;
const FLOOR_4 = 4;
const VOID = 8;

// Floor colors per zone
const WORK_COLOR = { h: 35, s: 30, b: 15, c: 0 }; // wood
const REST_COLOR = { h: 200, s: 20, b: 10, c: 0 }; // blue-grey carpet
const ALERT_COLOR = { h: 0, s: 15, b: 10, c: 0 }; // light red
const CORRIDOR_COLOR = { h: 45, s: 10, b: 20, c: 0 }; // light beige

// Initialize tiles and colors
const tiles = new Array(COLS * ROWS).fill(WALL);
const tileColors = new Array(COLS * ROWS).fill(null);

function setTile(col, row, type, color) {
  const idx = row * COLS + col;
  tiles[idx] = type;
  tileColors[idx] = color;
}

// ── Build tile grid ──

for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    // Outer walls: row 0, row 17, col 0, col 29
    if (row === 0 || row === ROWS - 1 || col === 0 || col === COLS - 1) {
      // Already WALL (0)
      continue;
    }

    // Row 1-9: upper half
    if (row >= 1 && row <= 9) {
      if (col >= 1 && col <= 9) {
        setTile(col, row, FLOOR_2, WORK_COLOR); // Work A
      } else if (col >= 10 && col <= 14) {
        setTile(col, row, FLOOR_4, CORRIDOR_COLOR); // Vertical corridor
      } else if (col >= 15 && col <= 28) {
        setTile(col, row, FLOOR_2, WORK_COLOR); // Work B
      }
      continue;
    }

    // Row 10: horizontal corridor
    if (row === 10) {
      if (col >= 1 && col <= 28) {
        setTile(col, row, FLOOR_4, CORRIDOR_COLOR); // Full-width corridor
      }
      continue;
    }

    // Row 11-16: lower half
    if (row >= 11 && row <= 16) {
      if (col >= 1 && col <= 14) {
        setTile(col, row, FLOOR_3, REST_COLOR); // Rest area
      } else if (col === 15) {
        // Wall divider between rest and alert
        // Keep as WALL (0)
      } else if (col >= 16 && col <= 28) {
        setTile(col, row, FLOOR_1, ALERT_COLOR); // Alert area
      }
      continue;
    }
  }
}

// ── Furniture placement ──

const furniture = [];
let uidCounter = 0;

function addFurniture(type, col, row, prefix) {
  uidCounter++;
  furniture.push({
    uid: `${prefix || type}-${uidCounter}`,
    type,
    col,
    row,
  });
}

// Work Area A — 10 workstations (5 per row × 2 rows)
// Row 2-3: desks at row 2, chairs at row 4
for (let i = 0; i < 5; i++) {
  const col = 1 + i * 2; // col 1, 3, 5, 7, 9
  addFurniture('desk', col, 2, 'ws-a');
  addFurniture('pc', col, 2, 'ws-a');
  addFurniture('chair', col, 4, 'ws-a');
}

// Row 6-7: desks at row 6, chairs at row 8
for (let i = 0; i < 5; i++) {
  const col = 1 + i * 2; // col 1, 3, 5, 7, 9
  addFurniture('desk', col, 6, 'ws-a');
  addFurniture('pc', col, 6, 'ws-a');
  addFurniture('chair', col, 8, 'ws-a');
}

// Work Area B — 5 workstations
// Row 2-3: 3 workstations at col 17, 20, 23
for (const col of [17, 20, 23]) {
  addFurniture('desk', col, 2, 'ws-b');
  addFurniture('pc', col, 2, 'ws-b');
  addFurniture('chair', col, 4, 'ws-b');
}

// Row 6-7: 2 workstations at col 17, 20
for (const col of [17, 20]) {
  addFurniture('desk', col, 6, 'ws-b');
  addFurniture('pc', col, 6, 'ws-b');
  addFurniture('chair', col, 8, 'ws-b');
}

// Decorations — Work Area A
addFurniture('whiteboard', 1, 1, 'decor'); // Top wall of work A
addFurniture('whiteboard', 5, 1, 'decor'); // Top wall of work A
addFurniture('plant', 9, 1, 'decor'); // Corner of work A

// Decorations — Corridor
addFurniture('plant', 12, 1, 'decor'); // Top of corridor

// Decorations — Work Area B
addFurniture('whiteboard', 15, 1, 'decor'); // Top wall of work B
addFurniture('whiteboard', 19, 1, 'decor'); // Top wall of work B
addFurniture('bookshelf', 27, 1, 'decor'); // Work B wall
addFurniture('bookshelf', 28, 1, 'decor'); // Work B wall
addFurniture('plant', 25, 1, 'decor'); // Work B corner

// Rest Area — 3 seats + decorations
addFurniture('chair', 3, 13, 'rest');
addFurniture('chair', 6, 13, 'rest');
addFurniture('chair', 9, 13, 'rest');
addFurniture('plant', 1, 11, 'decor'); // Rest area decoration
addFurniture('plant', 14, 11, 'decor'); // Rest area decoration
addFurniture('cooler', 8, 11, 'decor'); // Water cooler
addFurniture('bookshelf', 12, 11, 'decor'); // Bookshelf
addFurniture('bookshelf', 13, 11, 'decor'); // Bookshelf

// Alert Area — 2 seats + decorations
addFurniture('chair', 19, 13, 'alert');
addFurniture('chair', 22, 13, 'alert');
addFurniture('lamp', 27, 12, 'decor'); // Alert area lamp
addFurniture('plant', 16, 11, 'decor'); // Alert area decoration

// ── Zones ──

function generateZoneTiles(colStart, colEnd, rowStart, rowEnd) {
  const zoneTiles = [];
  for (let row = rowStart; row <= rowEnd; row++) {
    for (let col = colStart; col <= colEnd; col++) {
      const idx = row * COLS + col;
      if (tiles[idx] !== WALL && tiles[idx] !== VOID) {
        zoneTiles.push({ col, row });
      }
    }
  }
  return zoneTiles;
}

// Work zone: Work A + Work B (combined into one zone)
const workTiles = [
  ...generateZoneTiles(1, 9, 1, 9), // Work A
  ...generateZoneTiles(15, 28, 1, 9), // Work B
];

// Work seats: all chairs in work areas
const workSeats = [];
// Work A chairs (rows 4 and 8)
for (let i = 0; i < 5; i++) {
  const col = 1 + i * 2;
  workSeats.push({ col, row: 4 });
  workSeats.push({ col, row: 8 });
}
// Work B chairs (row 4: col 17,20,23; row 8: col 17,20)
for (const col of [17, 20, 23]) {
  workSeats.push({ col, row: 4 });
}
for (const col of [17, 20]) {
  workSeats.push({ col, row: 8 });
}

// Rest zone
const restTiles = generateZoneTiles(1, 14, 11, 16);
const restSeats = [
  { col: 3, row: 13 },
  { col: 6, row: 13 },
  { col: 9, row: 13 },
];

// Alert zone
const alertTiles = generateZoneTiles(16, 28, 11, 16);
const alertSeats = [
  { col: 19, row: 13 },
  { col: 22, row: 13 },
];

const zones = {
  zones: [
    {
      type: 'work',
      label: '作業エリア',
      color: 'rgba(74, 144, 217, 0.15)',
      tiles: workTiles,
      seats: workSeats,
    },
    {
      type: 'rest',
      label: '休憩エリア',
      color: 'rgba(80, 200, 120, 0.15)',
      tiles: restTiles,
      seats: restSeats,
    },
    {
      type: 'alert',
      label: '警告エリア',
      color: 'rgba(217, 83, 79, 0.15)',
      tiles: alertTiles,
      seats: alertSeats,
    },
  ],
};

// ── Output ──

const layout = {
  version: 1,
  cols: COLS,
  rows: ROWS,
  tiles,
  furniture,
  tileColors,
  zones,
};

// Verify seat count
const totalSeats = workSeats.length + restSeats.length + alertSeats.length;
console.error(
  `Generated layout: ${COLS}×${ROWS} grid, ${furniture.length} furniture items, ${totalSeats} seats`,
);

// Output JSON
console.log(JSON.stringify(layout, null, 2));

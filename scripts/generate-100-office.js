#!/usr/bin/env node
/**
 * Generate a stylish 100-person office layout for Pixel Agents.
 *
 * Design: 50 cols × 35 rows
 * ┌──────────────────────────────────────────────────────┐
 * │  Work Area Left (beige)  │ C │  Work Area Right (gray) │  rows 1-14
 * │  3 desk bands × 7 desks  │ o │  3 desk bands × 7 desks │
 * │  42 seats                │ r │  42 seats                │
 * │  + plants, monitors      │ r │  + plants, monitors      │
 * ├──────────┬───────────────┴─┬─┴──────────────┬─────────┤  row 15
 * │          │                 │                │         │
 * │  Break   │   Break Room    │  Conference    │  Boss   │  rows 16-33
 * │  Room    │   (purple)      │  (cool gray)   │  Office │
 * │  Left    │   armchairs,    │  table+chairs  │  (dark) │
 * │          │   sofas, plants │                │         │
 * └──────────┴─────────────────┴────────────────┴─────────┘  row 34
 */

const fs = require('fs');
const path = require('path');

const COLS = 50;
const ROWS = 35;

// Tile types
const WALL = 0;
const FLOOR_1 = 1; // Work left (beige warm)
const FLOOR_2 = 2; // Work right (cool gray)
const FLOOR_3 = 3; // Break room (purple carpet)
const FLOOR_4 = 4; // Corridors (dark wood)
const FLOOR_5 = 5; // Conference (neutral)
const FLOOR_6 = 6; // Boss office (dark elegant)
const FLOOR_7 = 7; // Accent areas

// UID counter
let uidCounter = 0;
function uid() {
  return `f${++uidCounter}`;
}

// ─── TILES ─────────────────────────────────────────────
const tiles = new Array(COLS * ROWS).fill(FLOOR_1);

function setTile(col, row, type) {
  if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
    tiles[row * COLS + col] = type;
  }
}

function getTile(col, row) {
  return tiles[row * COLS + col];
}

// Perimeter walls
for (let c = 0; c < COLS; c++) {
  setTile(c, 0, WALL);
  setTile(c, ROWS - 1, WALL);
}
for (let r = 0; r < ROWS; r++) {
  setTile(0, r, WALL);
  setTile(COLS - 1, r, WALL);
}

// Upper work area floors
for (let r = 1; r <= 14; r++) {
  for (let c = 1; c <= 48; c++) {
    if (c <= 23) setTile(c, r, FLOOR_1);
    else if (c === 24) setTile(c, r, FLOOR_4);
    else setTile(c, r, FLOOR_2);
  }
}

// Interior wall (row 15) with doorways
for (let c = 0; c < COLS; c++) {
  setTile(c, 15, WALL);
}
// Doorways in row 15
for (const dc of [8, 9, 24, 25, 40, 41]) {
  setTile(dc, 15, FLOOR_4);
}

// Lower area
for (let r = 16; r <= 33; r++) {
  for (let c = 1; c <= 48; c++) {
    if (c <= 30) {
      setTile(c, r, FLOOR_3); // Break room
    } else if (c === 31) {
      // Vertical wall between break room and right rooms
      if (r >= 24 && r <= 25)
        setTile(c, r, FLOOR_4); // Door
      else setTile(c, r, WALL);
    } else {
      // Right side rooms
      if (r <= 23) {
        setTile(c, r, FLOOR_5); // Conference
      } else if (r === 24) {
        // Horizontal wall between conference and boss
        if (c >= 39 && c <= 40)
          setTile(c, r, FLOOR_4); // Door
        else setTile(c, r, WALL);
      } else {
        setTile(c, r, FLOOR_6); // Boss office
      }
    }
  }
}

// ─── TILE COLORS ───────────────────────────────────────
const tileColors = new Array(COLS * ROWS).fill(null);

function setColor(col, row, h, s, b, c, colorize = true) {
  if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
    tileColors[row * COLS + col] = { h, s, b, c, colorize };
  }
}

// Work area left (warm beige)
for (let r = 1; r <= 14; r++) {
  for (let c = 1; c <= 23; c++) {
    setColor(c, r, 32, 30, 15, 0);
  }
}

// Work area right (cool blue-gray)
for (let r = 1; r <= 14; r++) {
  for (let c = 25; c <= 48; c++) {
    setColor(c, r, 215, 15, 10, 0);
  }
}

// Corridor (dark wood)
for (let r = 1; r <= 14; r++) {
  setColor(24, r, 25, 40, -15, 5);
}
for (const dc of [8, 9, 24, 25, 40, 41]) {
  setColor(dc, 15, 25, 40, -15, 5);
}

// Break room (rich purple carpet)
for (let r = 16; r <= 33; r++) {
  for (let c = 1; c <= 30; c++) {
    setColor(c, r, 280, 25, -5, 0);
  }
}

// Conference (cool neutral)
for (let r = 16; r <= 23; r++) {
  for (let c = 32; c <= 48; c++) {
    setColor(c, r, 200, 10, 5, 0);
  }
}

// Boss office (dark elegant)
for (let r = 25; r <= 33; r++) {
  for (let c = 32; c <= 48; c++) {
    setColor(c, r, 210, 20, -10, 5);
  }
}

// Wall colors
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    if (getTile(c, r) === WALL) {
      setColor(c, r, 220, 15, -5, 0);
    }
  }
}

// ─── FURNITURE ─────────────────────────────────────────
const furniture = [];

function place(type, col, row, color) {
  const item = { uid: uid(), type, col, row };
  if (color) item.color = color;
  furniture.push(item);
  return item;
}

// Desk styles for variety
const leftDeskStyles = ['DESK_WOOD_FRONT', 'DESK_WALNUT_FRONT', 'DESK_BROWN_FRONT'];
const rightDeskStyles = ['DESK_GRAY_FRONT', 'DESK_CREAM_FRONT', 'DESK_BEIGE_FRONT'];
const leftChairStyles = ['CHAIR_OFFICE_DARK_FRONT', 'CHAIR_OFFICE_ORANGE_FRONT'];
const rightChairStyles = ['CHAIR_OFFICE_DARK_FRONT', 'CHAIR_OFFICE_GRAY_FRONT'];
const monitorStyles = [
  'MONITOR_FRONT_OFF',
  'MONITOR_DARK',
  'MONITOR_BLUE',
  'LAPTOP_OPEN',
  'MONITOR_FLAT',
];

// ─── WORK AREA DESKS ──────────────────────────────────
// Left wing: 3 desk bands at rows 2, 6, 10
// Desks at cols: 2, 5, 8, 11, 14, 17, 20 (stride 3, desk width 2)
const leftDeskCols = [2, 5, 8, 11, 14, 17, 20];
const leftDeskBands = [2, 6, 10]; // Chair row (desk at row+1)

for (const bandRow of leftDeskBands) {
  for (let i = 0; i < leftDeskCols.length; i++) {
    const col = leftDeskCols[i];
    const deskStyle = leftDeskStyles[i % leftDeskStyles.length];
    const chairStyle = leftChairStyles[i % leftChairStyles.length];

    // Chair at bandRow (facing DOWN toward desk below)
    place(chairStyle, col, bandRow);
    place(chairStyle, col + 1, bandRow);

    // Desk at bandRow+1 (2x2, front facing down)
    place(deskStyle, col, bandRow + 1);

    // Monitor on desk (surface)
    const monStyle = monitorStyles[i % monitorStyles.length];
    place(monStyle, col, bandRow + 1);
    // Second monitor or laptop sometimes
    if (i % 3 === 0) place('LAPTOP_OPEN', col + 1, bandRow + 1);
  }
}

// Right wing: 3 desk bands
const rightDeskCols = [26, 29, 32, 35, 38, 41, 44];
const rightDeskBands = [2, 6, 10];

for (const bandRow of rightDeskBands) {
  for (let i = 0; i < rightDeskCols.length; i++) {
    const col = rightDeskCols[i];
    const deskStyle = rightDeskStyles[i % rightDeskStyles.length];
    const chairStyle = rightChairStyles[i % rightChairStyles.length];

    place(chairStyle, col, bandRow);
    place(chairStyle, col + 1, bandRow);
    place(deskStyle, col, bandRow + 1);

    const monStyle = monitorStyles[(i + 2) % monitorStyles.length];
    place(monStyle, col, bandRow + 1);
    if (i % 3 === 1) place('LAPTOP_SM', col + 1, bandRow + 1);
  }
}

// Work area total: 3 bands × 14 desks × 2 chairs = 84 seats

// ─── WORK AREA DECORATIONS ────────────────────────────

// Plants along walls (row 1, against top wall)
for (const c of [1, 5, 12, 19, 23]) {
  place('PLANT_TALL_A', c, 1);
}
for (const c of [26, 30, 37, 44, 48]) {
  place('PLANT_TALL_B', c, 1);
}

// Plants at end of desk rows
place('PLANT_POT_SM', 22, 4);
place('PLANT_POT_SM', 22, 8);
place('PLANT_SM', 25, 4);
place('PLANT_SM', 25, 8);

// Bookshelves along walls
place('BOOKSHELF_WOOD', 1, 4);
place('BOOKSHELF_BROWN', 1, 8);
place('BOOKSHELF_ALT_A', 48, 4);
place('BOOKSHELF_ALT_B', 48, 8);

// Storage near corridor
place('FILING_CABINET_DARK', 23, 4);
place('FILING_CABINET_GRAY', 23, 8);
place('FILING_CABINET_BLUE', 25, 4);

// Wall decorations (work area walls - row 0)
place('WHITEBOARD_LG', 4, 0, { h: 0, s: 0, b: 0, c: 0 });
place('WHITEBOARD_CHARTS_A', 10, 0);
place('BOARD_DARK', 16, 0);
place('WHITEBOARD_CHARTS_B', 28, 0);
place('BOARD_LIGHT', 34, 0);
place('WHITEBOARD_CHARTS_C', 40, 0);
place('WHITEBOARD_SM', 46, 0);

// Open collaboration area (rows 13-14)
// Tables for standing meetings
place('TABLE_WOOD', 4, 13);
place('TABLE_DARK', 10, 13);
place('TABLE_BROWN', 16, 13);
place('TABLE_BEIGE', 28, 13);
place('TABLE_DARKWOOD', 34, 13);
place('TABLE_ORANGE', 42, 13);

// Chairs around collaboration tables
for (const c of [4, 5, 10, 11, 16, 17]) {
  place('CHAIR_OFFICE_ORANGE_BACK', c, 14);
}
for (const c of [28, 29, 34, 35, 42, 43]) {
  place('CHAIR_OFFICE_RED_BACK', c, 14);
}

// Floor lamps in work area
place('FLOOR_LAMP', 1, 12);
place('FLOOR_LAMP', 48, 12);

// ─── BREAK ROOM (large, cols 1-30, rows 16-33) ───────

// Sofa groupings (scattered for social vibe)
// Group 1: Corner sofas (top-left)
place('SOFA_GRAY_FRONT', 2, 17);
place('SOFA_GRAY_FRONT', 5, 17);
place('TABLE_DARK', 2, 18);

// Group 2: Armchair circle (center-left)
place('ARMCHAIR_BLUE_FRONT', 3, 21);
place('ARMCHAIR_BLUE_FRONT', 6, 21);
place('ARMCHAIR_BLUE_LEFT', 8, 20);
place('ARMCHAIR_GRAY_LEFT', 8, 22);
place('TABLE_BROWN', 5, 20);

// Group 3: Sofas (center)
place('SOFA_GRAY_FRONT', 13, 17);
place('SOFA_L_SECTION', 13, 19);
place('TABLE_WOOD', 13, 18);
place('ARMCHAIR_GOLD_FRONT', 15, 20);

// Group 4: Armchairs (top-right area of break room)
place('ARMCHAIR_BLUE_FRONT', 20, 17);
place('ARMCHAIR_GRAY_RIGHT', 22, 17);
place('ARMCHAIR_BLUE_FRONT', 24, 17);
place('TABLE_BEIGE', 21, 18);

// Group 5: Large seating area (center-bottom)
place('SOFA_GRAY_FRONT', 3, 25);
place('SOFA_GRAY_FRONT', 6, 25);
place('SOFA_GRAY_FRONT', 9, 25);
place('TABLE_DARKWOOD', 4, 26);
place('TABLE_DARKWOOD', 8, 26);
place('ARMCHAIR_BLUE_FRONT', 3, 27);
place('ARMCHAIR_BLUE_FRONT', 6, 27);
place('ARMCHAIR_GRAY_LEFT', 10, 26);

// Group 6: Quiet corner (bottom-left)
place('ARMCHAIR_TALL', 2, 30);
place('ARMCHAIR_GRAY_RIGHT', 4, 30);
place('TABLE_ORANGE', 2, 31);
place('FLOOR_LAMP', 1, 29);

// Group 7: More seating (right side of break room)
place('SOFA_GRAY_FRONT', 18, 24);
place('SOFA_L_SECTION', 18, 26);
place('TABLE_WOOD', 18, 25);
place('ARMCHAIR_BLUE_FRONT', 21, 24);
place('ARMCHAIR_BLUE_FRONT', 24, 24);
place('ARMCHAIR_GRAY_LEFT', 26, 24);

// Group 8: Bottom-right break area
place('ARMCHAIR_BLUE_FRONT', 20, 29);
place('ARMCHAIR_GOLD_FRONT', 22, 29);
place('ARMCHAIR_BLUE_FRONT', 24, 29);
place('ARMCHAIR_GRAY_RIGHT', 26, 29);
place('TABLE_BROWN', 21, 30);
place('TABLE_BEIGE', 25, 30);

// Vending machines along right wall of break room
place('VENDING_MACHINE_A', 29, 17);
place('VENDING_MACHINE_B', 30, 17);
place('VENDING_MACHINE_C', 29, 20);
place('WATER_COOLER', 30, 22);
place('REFRIGERATOR_A', 29, 23);

// Plants in break room
place('PLANT_BUSH', 10, 17);
place('PLANT_TALL_C', 16, 17);
place('PLANT_TALL_D', 27, 17);
place('PLANT_TALL_A', 1, 22);
place('PLANT_TALL_B', 14, 22);
place('PLANT_SM', 28, 25);
place('PLANT_POT_SM', 12, 28);
place('PLANT_TALL_C', 1, 32);
place('PLANT_TALL_D', 16, 30);
place('PLANT_BUSH', 27, 31);
place('PLANT_SM', 11, 31);

// Bookshelves in break room (against walls)
place('BOOKSHELF_LG_A', 1, 16);
place('BOOKSHELF_RED', 1, 26);
place('SHELF_210', 30, 28);

// Desk lamps on tables for ambiance
place('DESK_LAMP', 3, 18);
place('DESK_LAMP_ALT_A', 14, 18);
place('DESK_LAMP_RED', 22, 18);

// Floor lamps scattered
place('FLOOR_LAMP', 11, 22);
place('FLOOR_LAMP', 28, 28);
place('FLOOR_LAMP', 17, 27);

// Wall art in break room (row 15 wall)
place('WALL_ART_COLOR', 5, 15);
place('WALL_ART_ALT', 12, 15);
place('WALL_POSTER', 19, 15);
place('WALL_ART_SM', 26, 15);

// ─── CONFERENCE ROOM (cols 32-48, rows 16-23) ─────────

// Large meeting table (center)
place('TABLE_DARK', 37, 18);
place('TABLE_DARK', 39, 18);
place('TABLE_DARK', 41, 18);
place('TABLE_DARK', 37, 20);
place('TABLE_DARK', 39, 20);
place('TABLE_DARK', 41, 20);

// Chairs around conference table
// Top row (facing down)
for (const c of [37, 38, 39, 40, 41, 42]) {
  place('CHAIR_OFFICE_RED_FRONT', c, 17);
}
// Bottom row (facing up)
for (const c of [37, 38, 39, 40, 41, 42]) {
  place('CHAIR_OFFICE_RED_BACK', c, 21);
}
// Side chairs
place('CHAIR_OFFICE_RED_RIGHT', 36, 19);
place('CHAIR_OFFICE_RED_LEFT', 43, 19);

// Conference decorations
place('PLANT_TALL_A', 33, 16);
place('PLANT_TALL_B', 47, 16);
place('WHITEBOARD_LG', 35, 15);
place('BOARD_DARK', 43, 15);
place('DISPLAY_STAND_A', 48, 17);

// ─── BOSS OFFICE (cols 32-48, rows 25-33) ─────────────

// Executive desk (center)
place('DESK_WALNUT_FRONT', 38, 28);
place('CHAIR_OFFICE_DARK_FRONT', 38, 27);
place('CHAIR_OFFICE_DARK_FRONT', 39, 27);

// Monitors on boss desk
place('MONITOR_FRONT_OFF', 38, 28);
place('MONITOR_DARK', 39, 28);

// Guest chairs
place('ARMCHAIR_GOLD_FRONT', 37, 31);
place('ARMCHAIR_GOLD_FRONT', 40, 31);
place('TABLE_DARKWOOD', 38, 32);

// Boss office decorations
place('BOOKSHELF_LG_B', 33, 25);
place('BOOKSHELF_LG_C', 46, 25);
place('PLANT_BUSH', 44, 25);
place('PLANT_TALL_D', 33, 30);
place('PLANT_TALL_C', 47, 30);
place('FLOOR_LAMP', 35, 25);
place('FLOOR_LAMP', 47, 28);
place('CABINET_SM_A', 33, 28);

// Wall art in boss office (row 24 wall)
place('WALL_ART_COLOR', 36, 24);
place('BOARD_LIGHT', 42, 24);

// ─── ZONES ─────────────────────────────────────────────

function makeTiles(colStart, colEnd, rowStart, rowEnd) {
  const result = [];
  for (let r = rowStart; r <= rowEnd; r++) {
    for (let c = colStart; c <= colEnd; c++) {
      const t = getTile(c, r);
      if (t !== WALL) result.push({ col: c, row: r });
    }
  }
  return result;
}

const zones = {
  zones: [
    {
      type: 'work',
      label: '作業エリア',
      color: 'rgba(74, 144, 217, 0.15)',
      tiles: [...makeTiles(1, 23, 1, 14), ...makeTiles(25, 48, 1, 14)],
    },
    {
      type: 'rest',
      label: '休憩エリア',
      color: 'rgba(80, 200, 120, 0.15)',
      tiles: makeTiles(1, 30, 16, 33),
    },
    {
      type: 'alert',
      label: '会議室',
      color: 'rgba(217, 83, 79, 0.15)',
      tiles: makeTiles(32, 48, 16, 23),
    },
    {
      type: 'boss',
      label: '社長室',
      color: 'rgba(255, 215, 0, 0.15)',
      tiles: makeTiles(32, 48, 25, 33),
    },
  ],
};

// ─── BUILD LAYOUT ──────────────────────────────────────

const layout = {
  version: 1,
  cols: COLS,
  rows: ROWS,
  tiles,
  furniture,
  tileColors,
  zones,
};

// Count seats
let seatCount = 0;
for (const f of furniture) {
  if (f.type.startsWith('CHAIR_') || f.type.startsWith('ARMCHAIR_') || f.type.startsWith('SOFA_')) {
    // Chairs: 1 seat per 1x1, sofas: 2 seats per 2x1
    if (f.type.startsWith('SOFA_')) seatCount += 2;
    else seatCount += 1;
  }
}

console.log(`Layout: ${COLS}×${ROWS} (${COLS * ROWS} tiles)`);
console.log(`Furniture: ${furniture.length} items`);
console.log(`Estimated seats: ${seatCount}`);
console.log(
  `Zone tiles: work=${zones.zones[0].tiles.length}, rest=${zones.zones[1].tiles.length}, alert=${zones.zones[2].tiles.length}, boss=${zones.zones[3].tiles.length}`,
);

// Save
const outPath = path.join(__dirname, '..', 'webview-ui', 'public', 'assets', 'default-layout.json');
fs.writeFileSync(outPath, JSON.stringify(layout, null, 2), 'utf-8');
console.log(`\nSaved to ${outPath}`);

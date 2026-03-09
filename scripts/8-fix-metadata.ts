/**
 * Stage 8: Fix auto-generated metadata with correct names, categories, and properties.
 *
 * Corrects misclassifications from Stage 7 (auto-metadata) based on visual inspection:
 * - Chairs: category='chairs', footprintH=1, orientation, groupId
 * - Desks: proper names, isDesk=true
 * - Monitors/PCs: canPlaceOnSurfaces, state, groupId
 * - Plants: category='decor'
 * - Lamps: proper names, canPlaceOnSurfaces
 * - Whiteboards: canPlaceOnWalls
 * - Small desk items: canPlaceOnSurfaces
 *
 * Usage:
 *   npx tsx scripts/8-fix-metadata.ts
 */

import { readFileSync, writeFileSync } from 'fs';

const metadataPath = './scripts/.tileset-working/tileset-metadata-draft.json';

console.log(`\n🔧 Stage 8: Fix Metadata\n`);
console.log(`📖 Loading ${metadataPath}...`);
const data = JSON.parse(readFileSync(metadataPath, 'utf-8'));

interface Asset {
  id: string;
  name: string;
  label: string;
  category: string;
  footprintW: number;
  footprintH: number;
  isDesk: boolean;
  canPlaceOnWalls: boolean;
  canPlaceOnSurfaces: boolean;
  orientation: string | null;
  state: string | null;
  groupId: string | null;
  discard: boolean;
  [key: string]: unknown;
}

const assets: Asset[] = data.assets;

// Helper to find asset by sprite number
function getAsset(num: number): Asset | undefined {
  return assets.find((a) => a.id === `ASSET_Modern_Office_Singles_${num}`);
}

function setAsset(num: number, props: Partial<Asset>) {
  const asset = getAsset(num);
  if (!asset) {
    console.warn(`  ⚠️  Sprite ${num} not found`);
    return;
  }
  Object.assign(asset, props);
}

// ─────────────────────────────────────────────────────────────────────
// CHAIRS — Office chairs (category: 'chairs', footprintH: 1)
// ─────────────────────────────────────────────────────────────────────

console.log(`🪑 Fixing chairs...`);

// Sprites 101-104: Dark office chair (4 orientations)
setAsset(101, {
  name: 'CHAIR_OFFICE_DARK_FRONT',
  label: 'Office Chair Dark - Front',
  category: 'chairs',
  footprintW: 1,
  footprintH: 1,
  orientation: 'front',
  groupId: 'CHAIR_OFFICE_DARK',
});
setAsset(102, {
  name: 'CHAIR_OFFICE_DARK_BACK',
  label: 'Office Chair Dark - Back',
  category: 'chairs',
  footprintW: 1,
  footprintH: 1,
  orientation: 'back',
  groupId: 'CHAIR_OFFICE_DARK',
});
setAsset(103, {
  name: 'CHAIR_OFFICE_DARK_LEFT',
  label: 'Office Chair Dark - Left',
  category: 'chairs',
  footprintW: 1,
  footprintH: 1,
  orientation: 'left',
  groupId: 'CHAIR_OFFICE_DARK',
});
setAsset(104, {
  name: 'CHAIR_OFFICE_DARK_RIGHT',
  label: 'Office Chair Dark - Right',
  category: 'chairs',
  footprintW: 1,
  footprintH: 1,
  orientation: 'right',
  groupId: 'CHAIR_OFFICE_DARK',
});

// Sprites 105-106: Gray office chair (2 orientations)
setAsset(105, {
  name: 'CHAIR_OFFICE_GRAY_FRONT',
  label: 'Office Chair Gray - Front',
  category: 'chairs',
  footprintW: 1,
  footprintH: 1,
  orientation: 'front',
  groupId: 'CHAIR_OFFICE_GRAY',
});
setAsset(106, {
  name: 'CHAIR_OFFICE_GRAY_BACK',
  label: 'Office Chair Gray - Back',
  category: 'chairs',
  footprintW: 1,
  footprintH: 1,
  orientation: 'back',
  groupId: 'CHAIR_OFFICE_GRAY',
});

// Sprites 107-110: Orange office chair (4 orientations)
setAsset(107, {
  name: 'CHAIR_OFFICE_ORANGE_FRONT',
  label: 'Office Chair Orange - Front',
  category: 'chairs',
  footprintW: 1,
  footprintH: 1,
  orientation: 'front',
  groupId: 'CHAIR_OFFICE_ORANGE',
});
setAsset(108, {
  name: 'CHAIR_OFFICE_ORANGE_BACK',
  label: 'Office Chair Orange - Back',
  category: 'chairs',
  footprintW: 1,
  footprintH: 1,
  orientation: 'back',
  groupId: 'CHAIR_OFFICE_ORANGE',
});
setAsset(109, {
  name: 'CHAIR_OFFICE_ORANGE_LEFT',
  label: 'Office Chair Orange - Left',
  category: 'chairs',
  footprintW: 1,
  footprintH: 1,
  orientation: 'left',
  groupId: 'CHAIR_OFFICE_ORANGE',
});
setAsset(110, {
  name: 'CHAIR_OFFICE_ORANGE_RIGHT',
  label: 'Office Chair Orange - Right',
  category: 'chairs',
  footprintW: 1,
  footprintH: 1,
  orientation: 'right',
  groupId: 'CHAIR_OFFICE_ORANGE',
});

// Sprites 111-112: Red office chair (2 orientations)
setAsset(111, {
  name: 'CHAIR_OFFICE_RED_FRONT',
  label: 'Office Chair Red - Front',
  category: 'chairs',
  footprintW: 1,
  footprintH: 1,
  orientation: 'front',
  groupId: 'CHAIR_OFFICE_RED',
});
setAsset(112, {
  name: 'CHAIR_OFFICE_RED_BACK',
  label: 'Office Chair Red - Back',
  category: 'chairs',
  footprintW: 1,
  footprintH: 1,
  orientation: 'back',
  groupId: 'CHAIR_OFFICE_RED',
});

// Sprites 196-198: Blue armchair (3 orientations)
setAsset(196, {
  name: 'ARMCHAIR_BLUE_FRONT',
  label: 'Armchair Blue - Front',
  category: 'chairs',
  footprintW: 1,
  footprintH: 1,
  orientation: 'front',
  groupId: 'ARMCHAIR_BLUE',
});
setAsset(197, {
  name: 'ARMCHAIR_BLUE_BACK',
  label: 'Armchair Blue - Back',
  category: 'chairs',
  footprintW: 1,
  footprintH: 1,
  orientation: 'back',
  groupId: 'ARMCHAIR_BLUE',
});
setAsset(198, {
  name: 'ARMCHAIR_BLUE_LEFT',
  label: 'Armchair Blue - Left',
  category: 'chairs',
  footprintW: 1,
  footprintH: 1,
  orientation: 'left',
  groupId: 'ARMCHAIR_BLUE',
});

// Sprite 199: Gold armchair
setAsset(199, {
  name: 'ARMCHAIR_GOLD_FRONT',
  label: 'Armchair Gold',
  category: 'chairs',
  footprintW: 1,
  footprintH: 1,
});

// Sprites 200-201: Gray sofa (2-wide, front/back)
setAsset(200, {
  name: 'SOFA_GRAY_FRONT',
  label: 'Sofa Gray - Front',
  category: 'chairs',
  footprintW: 2,
  footprintH: 1,
  orientation: 'front',
  groupId: 'SOFA_GRAY',
});
setAsset(201, {
  name: 'SOFA_GRAY_BACK',
  label: 'Sofa Gray - Back',
  category: 'chairs',
  footprintW: 2,
  footprintH: 1,
  orientation: 'back',
  groupId: 'SOFA_GRAY',
});

// Sprites 202-206: Various armchairs/sofas
setAsset(202, {
  name: 'ARMCHAIR_TALL',
  label: 'Tall Armchair',
  category: 'chairs',
  footprintW: 1,
  footprintH: 1,
});
setAsset(203, {
  name: 'SOFA_L_SECTION',
  label: 'L-Shaped Sofa Section',
  category: 'chairs',
  footprintW: 2,
  footprintH: 1,
});
setAsset(204, {
  name: 'ARMCHAIR_GRAY_LEFT',
  label: 'Armchair Gray - Left',
  category: 'chairs',
  footprintW: 1,
  footprintH: 1,
});
setAsset(205, {
  name: 'SOFA_GRAY_SM',
  label: 'Small Gray Sofa',
  category: 'chairs',
  footprintW: 2,
  footprintH: 1,
});
setAsset(206, {
  name: 'ARMCHAIR_GRAY_RIGHT',
  label: 'Armchair Gray - Right',
  category: 'chairs',
  footprintW: 1,
  footprintH: 1,
});

// ─────────────────────────────────────────────────────────────────────
// DESKS — Named desks for TYPE_MIGRATION_MAP
// ─────────────────────────────────────────────────────────────────────

console.log(`🪑 Fixing desks...`);

// Key desks - sprite 248/249 are common wood desks (beige/tan, 2x2)
setAsset(248, {
  name: 'DESK_WOOD_FRONT',
  label: 'Wood Desk - Front',
  category: 'desks',
  isDesk: true,
  orientation: 'front',
  groupId: 'DESK_WOOD',
});
setAsset(249, {
  name: 'DESK_WOOD_BACK',
  label: 'Wood Desk - Back',
  category: 'desks',
  isDesk: true,
  orientation: 'back',
  groupId: 'DESK_WOOD',
});

// Tables (188-193: wide conference tables)
setAsset(188, {
  name: 'TABLE_BEIGE',
  label: 'Conference Table Beige',
  category: 'desks',
  isDesk: true,
});
setAsset(189, {
  name: 'TABLE_DARK',
  label: 'Conference Table Dark',
  category: 'desks',
  isDesk: true,
});
setAsset(190, {
  name: 'TABLE_WOOD',
  label: 'Conference Table Wood',
  category: 'desks',
  isDesk: true,
});
setAsset(191, {
  name: 'TABLE_ORANGE',
  label: 'Conference Table Orange',
  category: 'desks',
  isDesk: true,
});
setAsset(192, {
  name: 'TABLE_DARKWOOD',
  label: 'Conference Table Dark Wood',
  category: 'desks',
  isDesk: true,
});
setAsset(193, {
  name: 'TABLE_BROWN',
  label: 'Conference Table Brown',
  category: 'desks',
  isDesk: true,
});

// L-shaped desks (194-195)
setAsset(194, {
  name: 'DESK_L_GRAY',
  label: 'L-Shaped Desk Gray',
  category: 'desks',
  isDesk: true,
});
setAsset(195, {
  name: 'DESK_L_GRAY_LG',
  label: 'L-Shaped Desk Gray Large',
  category: 'desks',
  isDesk: true,
});

// Workstation desks (253-254: brown desks with drawers)
setAsset(253, {
  name: 'DESK_BROWN_FRONT',
  label: 'Brown Desk - Front',
  category: 'desks',
  isDesk: true,
  orientation: 'front',
  groupId: 'DESK_BROWN',
});
setAsset(254, {
  name: 'DESK_BROWN_BACK',
  label: 'Brown Desk - Back',
  category: 'desks',
  isDesk: true,
  orientation: 'back',
  groupId: 'DESK_BROWN',
});

// More desks (258-259, 284-285, 289-290, 294-295, 299-300, 324-328)
setAsset(258, {
  name: 'DESK_BEIGE_FRONT',
  label: 'Beige Desk - Front',
  category: 'desks',
  isDesk: true,
  orientation: 'front',
  groupId: 'DESK_BEIGE',
});
setAsset(259, {
  name: 'DESK_BEIGE_BACK',
  label: 'Beige Desk - Back',
  category: 'desks',
  isDesk: true,
  orientation: 'back',
  groupId: 'DESK_BEIGE',
});
setAsset(284, {
  name: 'DESK_TAN_FRONT',
  label: 'Tan Desk - Front',
  category: 'desks',
  isDesk: true,
  orientation: 'front',
  groupId: 'DESK_TAN',
});
setAsset(285, {
  name: 'DESK_TAN_BACK',
  label: 'Tan Desk - Back',
  category: 'desks',
  isDesk: true,
  orientation: 'back',
  groupId: 'DESK_TAN',
});
setAsset(289, {
  name: 'DESK_WALNUT_FRONT',
  label: 'Walnut Desk - Front',
  category: 'desks',
  isDesk: true,
  orientation: 'front',
  groupId: 'DESK_WALNUT',
});
setAsset(290, {
  name: 'DESK_WALNUT_BACK',
  label: 'Walnut Desk - Back',
  category: 'desks',
  isDesk: true,
  orientation: 'back',
  groupId: 'DESK_WALNUT',
});
setAsset(294, {
  name: 'DESK_GRAY_FRONT',
  label: 'Gray Desk - Front',
  category: 'desks',
  isDesk: true,
  orientation: 'front',
  groupId: 'DESK_GRAY',
});
setAsset(295, {
  name: 'DESK_GRAY_BACK',
  label: 'Gray Desk - Back',
  category: 'desks',
  isDesk: true,
  orientation: 'back',
  groupId: 'DESK_GRAY',
});
setAsset(299, {
  name: 'DESK_CREAM_FRONT',
  label: 'Cream Desk - Front',
  category: 'desks',
  isDesk: true,
  orientation: 'front',
  groupId: 'DESK_CREAM',
});
setAsset(300, {
  name: 'DESK_CREAM_BACK',
  label: 'Cream Desk - Back',
  category: 'desks',
  isDesk: true,
  orientation: 'back',
  groupId: 'DESK_CREAM',
});

// Workstation combos (desk + equipment pre-rendered)
setAsset(320, { name: 'WORKSTATION_A', label: 'Workstation A', category: 'desks', isDesk: true });
setAsset(321, { name: 'WORKSTATION_B', label: 'Workstation B', category: 'desks', isDesk: true });
setAsset(322, { name: 'WORKSTATION_C', label: 'Workstation C', category: 'desks', isDesk: true });
setAsset(324, { name: 'DESK_WOODEN_A', label: 'Wooden Desk A', category: 'desks', isDesk: true });
setAsset(325, { name: 'DESK_WOODEN_B', label: 'Wooden Desk B', category: 'desks', isDesk: true });
setAsset(327, { name: 'DESK_WOODEN_C', label: 'Wooden Desk C', category: 'desks', isDesk: true });
setAsset(328, { name: 'DESK_WOODEN_D', label: 'Wooden Desk D', category: 'desks', isDesk: true });

// ─────────────────────────────────────────────────────────────────────
// MONITORS / PCs — canPlaceOnSurfaces
// ─────────────────────────────────────────────────────────────────────

console.log(`🖥️  Fixing monitors/PCs...`);

// Monitor front (sprite 118)
setAsset(118, {
  name: 'MONITOR_FRONT_OFF',
  label: 'Monitor - Front - Off',
  category: 'electronics',
  canPlaceOnSurfaces: true,
  state: 'off',
  groupId: 'MONITOR',
});

// If there's an ON variant nearby
setAsset(129, {
  name: 'MONITOR_FRONT_ON',
  label: 'Monitor - Front - On',
  category: 'electronics',
  canPlaceOnSurfaces: true,
  state: 'on',
  groupId: 'MONITOR',
  orientation: 'front',
});
// Update 118 to also have orientation
setAsset(118, { orientation: 'front' });

setAsset(130, {
  name: 'MONITOR_SCREEN_A',
  label: 'Monitor Screen A',
  category: 'electronics',
  canPlaceOnSurfaces: true,
});
setAsset(131, {
  name: 'MONITOR_SCREEN_B',
  label: 'Monitor Screen B',
  category: 'electronics',
  canPlaceOnSurfaces: true,
});

// Laptops (surface items)
setAsset(119, {
  name: 'LAPTOP_OPEN',
  label: 'Laptop Open',
  category: 'electronics',
  canPlaceOnSurfaces: true,
});
setAsset(242, {
  name: 'LAPTOP_SM',
  label: 'Small Laptop',
  category: 'electronics',
  canPlaceOnSurfaces: true,
});
setAsset(273, {
  name: 'LAPTOP_TABLET',
  label: 'Laptop/Tablet',
  category: 'electronics',
  canPlaceOnSurfaces: true,
});

// Desktop monitors (more variants)
setAsset(124, {
  name: 'MONITOR_SM',
  label: 'Small Monitor',
  category: 'electronics',
  canPlaceOnSurfaces: true,
});
setAsset(128, {
  name: 'MONITOR_SIDE',
  label: 'Monitor Side',
  category: 'electronics',
  canPlaceOnSurfaces: true,
});
setAsset(241, {
  name: 'MONITOR_FLAT',
  label: 'Flat Monitor',
  category: 'electronics',
  canPlaceOnSurfaces: true,
});

// Monitor on stands (taller)
setAsset(126, {
  name: 'MONITOR_STAND_FRONT',
  label: 'Monitor on Stand - Front',
  category: 'electronics',
  orientation: 'front',
  groupId: 'MONITOR_STAND',
});
setAsset(127, {
  name: 'MONITOR_STAND_BACK',
  label: 'Monitor on Stand - Back',
  category: 'electronics',
  orientation: 'back',
  groupId: 'MONITOR_STAND',
});

// Desktop tower
setAsset(136, { name: 'PC_TOWER', label: 'PC Tower', category: 'electronics' });
setAsset(274, { name: 'PC_TOWER_SM', label: 'Small PC Tower', category: 'electronics' });

// Printer
setAsset(167, { name: 'PRINTER', label: 'Printer', category: 'electronics' });

// More monitors
setAsset(265, {
  name: 'MONITOR_BLUE',
  label: 'Blue Monitor',
  category: 'electronics',
  canPlaceOnSurfaces: true,
});
setAsset(266, {
  name: 'MONITOR_DARK',
  label: 'Dark Monitor',
  category: 'electronics',
  canPlaceOnSurfaces: true,
});
setAsset(267, {
  name: 'MONITOR_ALT',
  label: 'Monitor Alt',
  category: 'electronics',
  canPlaceOnSurfaces: true,
});
setAsset(301, {
  name: 'SCREEN_A',
  label: 'Screen A',
  category: 'electronics',
  canPlaceOnSurfaces: true,
});
setAsset(302, {
  name: 'SCREEN_B',
  label: 'Screen B',
  category: 'electronics',
  canPlaceOnSurfaces: true,
});
setAsset(303, {
  name: 'SCREEN_C',
  label: 'Screen C',
  category: 'electronics',
  canPlaceOnSurfaces: true,
});
setAsset(308, {
  name: 'DEVICE_SM_A',
  label: 'Small Device A',
  category: 'electronics',
  canPlaceOnSurfaces: true,
});
setAsset(309, {
  name: 'DEVICE_SM_B',
  label: 'Small Device B',
  category: 'electronics',
  canPlaceOnSurfaces: true,
});

// Standing displays/kiosks
setAsset(275, { name: 'DISPLAY_STAND_A', label: 'Standing Display A', category: 'electronics' });
setAsset(276, { name: 'DISPLAY_STAND_B', label: 'Standing Display B', category: 'electronics' });

// ─────────────────────────────────────────────────────────────────────
// LAMPS
// ─────────────────────────────────────────────────────────────────────

console.log(`💡 Fixing lamps...`);

setAsset(139, {
  name: 'DESK_LAMP',
  label: 'Desk Lamp',
  category: 'decor',
  canPlaceOnSurfaces: true,
});
setAsset(160, {
  name: 'DESK_LAMP_RED',
  label: 'Red Desk Lamp',
  category: 'decor',
  canPlaceOnSurfaces: true,
});
setAsset(161, {
  name: 'DESK_LAMP_ALT_A',
  label: 'Desk Lamp Alt A',
  category: 'decor',
  canPlaceOnSurfaces: true,
});
setAsset(162, {
  name: 'DESK_LAMP_ALT_B',
  label: 'Desk Lamp Alt B',
  category: 'decor',
  canPlaceOnSurfaces: true,
});
setAsset(173, { name: 'FLOOR_LAMP', label: 'Floor Lamp', category: 'decor' });

// ─────────────────────────────────────────────────────────────────────
// WHITEBOARDS
// ─────────────────────────────────────────────────────────────────────

console.log(`📋 Fixing whiteboards...`);

setAsset(116, {
  name: 'WHITEBOARD_LG',
  label: 'Large Whiteboard',
  category: 'wall',
  canPlaceOnWalls: true,
});
setAsset(165, {
  name: 'BOARD_LIGHT',
  label: 'Light Board',
  category: 'wall',
  canPlaceOnWalls: true,
});
setAsset(166, { name: 'BOARD_DARK', label: 'Dark Board', category: 'wall', canPlaceOnWalls: true });
setAsset(170, {
  name: 'WHITEBOARD_CHARTS_A',
  label: 'Whiteboard with Charts A',
  category: 'wall',
  canPlaceOnWalls: true,
});
setAsset(171, {
  name: 'WHITEBOARD_CHARTS_B',
  label: 'Whiteboard with Charts B',
  category: 'wall',
  canPlaceOnWalls: true,
});
setAsset(172, {
  name: 'WHITEBOARD_CHARTS_C',
  label: 'Whiteboard with Charts C',
  category: 'wall',
  canPlaceOnWalls: true,
});
setAsset(240, {
  name: 'WHITEBOARD_SM',
  label: 'Small Whiteboard',
  category: 'wall',
  canPlaceOnWalls: true,
});

// Wall art / pictures
setAsset(93, {
  name: 'WALL_ART_SM',
  label: 'Small Wall Art',
  category: 'wall',
  canPlaceOnWalls: true,
});
setAsset(94, {
  name: 'WALL_ART_COLOR',
  label: 'Colorful Wall Art',
  category: 'wall',
  canPlaceOnWalls: true,
});
setAsset(95, {
  name: 'WALL_ART_ALT',
  label: 'Wall Art Alt',
  category: 'wall',
  canPlaceOnWalls: true,
});
setAsset(96, {
  name: 'WALL_POSTER',
  label: 'Wall Poster',
  category: 'wall',
  canPlaceOnWalls: true,
});

// ─────────────────────────────────────────────────────────────────────
// PLANTS
// ─────────────────────────────────────────────────────────────────────

console.log(`🌿 Fixing plants...`);

setAsset(97, { name: 'PLANT_POT_SM', label: 'Small Potted Plant', category: 'decor' });
setAsset(98, { name: 'PLANT_TALL_A', label: 'Tall Plant A', category: 'decor' });
setAsset(99, { name: 'PLANT_TALL_B', label: 'Tall Plant B', category: 'decor' });
setAsset(100, { name: 'PLANT_TALL_C', label: 'Tall Plant C', category: 'decor' });
setAsset(337, { name: 'PLANT_SM', label: 'Small Plant', category: 'decor' });
setAsset(338, { name: 'PLANT_TALL_D', label: 'Tall Plant D', category: 'decor' });
setAsset(339, { name: 'PLANT_BUSH', label: 'Large Bush', category: 'decor' });

// ─────────────────────────────────────────────────────────────────────
// BOOKSHELVES — Key ones for TYPE_MIGRATION_MAP
// ─────────────────────────────────────────────────────────────────────

console.log(`📚 Fixing bookshelves...`);

setAsset(179, { name: 'BOOKSHELF_WOOD', label: 'Wood Bookshelf', category: 'storage' });
setAsset(180, { name: 'BOOKSHELF_WOOD_B', label: 'Wood Bookshelf B', category: 'storage' });
setAsset(181, { name: 'BOOKSHELF_BROWN', label: 'Brown Bookshelf', category: 'storage' });
setAsset(182, { name: 'BOOKSHELF_ORANGE', label: 'Orange Bookshelf', category: 'storage' });
setAsset(183, { name: 'BOOKSHELF_RED', label: 'Red Bookshelf', category: 'storage' });
setAsset(184, { name: 'BOOKSHELF_ALT_A', label: 'Bookshelf Alt A', category: 'storage' });
setAsset(185, { name: 'BOOKSHELF_ALT_B', label: 'Bookshelf Alt B', category: 'storage' });
setAsset(186, { name: 'BOOKSHELF_ALT_C', label: 'Bookshelf Alt C', category: 'storage' });
setAsset(187, { name: 'BOOKSHELF_ALT_D', label: 'Bookshelf Alt D', category: 'storage' });

// Large bookshelves
setAsset(174, { name: 'BOOKSHELF_LG_A', label: 'Large Bookshelf A', category: 'storage' });
setAsset(175, { name: 'BOOKSHELF_LG_B', label: 'Large Bookshelf B', category: 'storage' });
setAsset(176, { name: 'BOOKSHELF_LG_C', label: 'Large Bookshelf C', category: 'storage' });

// ─────────────────────────────────────────────────────────────────────
// COOLERS / WATER DISPENSERS
// ─────────────────────────────────────────────────────────────────────

console.log(`🧊 Fixing coolers...`);

setAsset(122, { name: 'WATER_COOLER', label: 'Water Cooler', category: 'misc' });
setAsset(123, { name: 'WATER_COOLER_ALT', label: 'Water Cooler Alt', category: 'misc' });

// Vending machines
setAsset(138, { name: 'VENDING_MACHINE_A', label: 'Vending Machine A', category: 'misc' });
setAsset(140, { name: 'VENDING_MACHINE_B', label: 'Vending Machine B', category: 'misc' });
setAsset(142, { name: 'REFRIGERATOR_A', label: 'Refrigerator A', category: 'misc' });
setAsset(143, { name: 'REFRIGERATOR_B', label: 'Refrigerator B', category: 'misc' });
setAsset(145, { name: 'VENDING_MACHINE_C', label: 'Vending Machine C', category: 'misc' });
setAsset(146, { name: 'VENDING_MACHINE_D', label: 'Vending Machine D', category: 'misc' });

// ─────────────────────────────────────────────────────────────────────
// CABINETS / FILING CABINETS — Fix names
// ─────────────────────────────────────────────────────────────────────

console.log(`🗄️  Fixing cabinets...`);

setAsset(135, { name: 'FILING_CABINET_DARK', label: 'Dark Filing Cabinet', category: 'storage' });
setAsset(137, { name: 'FILING_CABINET_GRAY', label: 'Gray Filing Cabinet', category: 'storage' });
setAsset(141, { name: 'FILING_CABINET_BLUE', label: 'Blue Filing Cabinet', category: 'storage' });
setAsset(144, { name: 'FILING_CABINET_ALT', label: 'Filing Cabinet Alt', category: 'storage' });
setAsset(168, { name: 'CABINET_SM_A', label: 'Small Cabinet A', category: 'storage' });
setAsset(169, { name: 'CABINET_SM_B', label: 'Small Cabinet B', category: 'storage' });

// ─────────────────────────────────────────────────────────────────────
// SMALL DESK ITEMS — canPlaceOnSurfaces
// ─────────────────────────────────────────────────────────────────────

console.log(`📎 Fixing small desk items...`);

// Sprites 35-92 are mostly small desk items (keyboards, mice, coffee cups, etc.)
for (let i = 35; i <= 92; i++) {
  const asset = getAsset(i);
  if (asset && asset.footprintW === 1 && asset.footprintH === 1) {
    asset.canPlaceOnSurfaces = true;
    asset.category = 'misc';
  }
}

// Phone/small devices
for (const num of [113, 114, 115, 117, 120, 121, 147, 153, 154, 155, 156, 157, 158, 159]) {
  const asset = getAsset(num);
  if (asset) {
    asset.canPlaceOnSurfaces = true;
    asset.category = 'electronics';
  }
}

// ─────────────────────────────────────────────────────────────────────
// DESK SURFACE TILES (1-34) — Small desk components, canPlaceOnSurfaces
// ─────────────────────────────────────────────────────────────────────

for (let i = 1; i <= 34; i++) {
  const asset = getAsset(i);
  if (asset && asset.footprintW === 1 && asset.footprintH === 1) {
    asset.canPlaceOnSurfaces = true;
  }
}

// ─────────────────────────────────────────────────────────────────────
// Write output
// ─────────────────────────────────────────────────────────────────────

writeFileSync(metadataPath, JSON.stringify(data, null, 2));
console.log(`\n✅ Metadata fixed and saved to ${metadataPath}`);

// Count categories
const categoryCounts = new Map<string, number>();
for (const asset of assets) {
  categoryCounts.set(asset.category, (categoryCounts.get(asset.category) || 0) + 1);
}

console.log(`\n📊 Updated category distribution:`);
for (const [cat, count] of Array.from(categoryCounts.entries()).sort()) {
  console.log(`   ${cat.padEnd(15)} ${count} assets`);
}

// Count chairs
const chairCount = assets.filter((a) => a.category === 'chairs').length;
console.log(`\n🪑 Chairs: ${chairCount} (was 0)`);

// List key assets for TYPE_MIGRATION_MAP
console.log(`\n📋 Key assets for TYPE_MIGRATION_MAP:`);
const keyAssets = [
  ['desk', 'DESK_WOOD_FRONT', 248],
  ['chair', 'CHAIR_OFFICE_DARK_FRONT', 101],
  ['bookshelf', 'BOOKSHELF_WOOD', 179],
  ['plant', 'PLANT_POT_SM', 97],
  ['cooler', 'WATER_COOLER', 122],
  ['whiteboard', 'WHITEBOARD_LG', 116],
  ['pc', 'MONITOR_FRONT_OFF', 118],
  ['lamp', 'DESK_LAMP', 139],
];
for (const [legacy, newName, num] of keyAssets) {
  const asset = getAsset(num as number);
  console.log(
    `   ${String(legacy).padEnd(12)} → ${newName} (sprite ${num})${asset ? ' ✓' : ' ⚠️ NOT FOUND'}`,
  );
}

console.log(`\n📋 Next: Re-run export script`);
console.log(`   npx tsx scripts/5-export-assets.ts\n`);

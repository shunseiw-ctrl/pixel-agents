/**
 * Stage 7: Auto-generate metadata without Vision API
 *
 * Analyzes sprite pixel data (dimensions, dominant colors, density) to
 * auto-categorize and name sprites. Generates tileset-metadata-draft.json
 * compatible with Stage 4 (review) and Stage 5 (export).
 *
 * Usage:
 *   npx tsx scripts/7-auto-metadata.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PNG } from 'pngjs';

const inputJsonPath = './scripts/.tileset-working/asset-editor-output.json';
const outputJsonPath = './scripts/.tileset-working/tileset-metadata-draft.json';

console.log(`\n🔍 Stage 7: Auto-Metadata Generation (no Vision API)\n`);

// Load asset-editor-output.json
console.log(`📖 Loading ${inputJsonPath}...`);
const inputData = JSON.parse(readFileSync(inputJsonPath, 'utf-8'));

interface AssetInput {
  id: string;
  paddedX: number;
  paddedY: number;
  paddedWidth: number;
  paddedHeight: number;
  sourceFile?: string;
  sourceWidth?: number;
  sourceHeight?: number;
}

const assets: AssetInput[] = inputData.assets;
console.log(`   Found ${assets.length} assets\n`);

// ─────────────────────────────────────────────────────────────────────
// Pixel analysis helpers
// ─────────────────────────────────────────────────────────────────────

interface SpriteAnalysis {
  trimmedWidth: number;
  trimmedHeight: number;
  footprintW: number;
  footprintH: number;
  opaquePixels: number;
  dominantColors: Array<{ r: number; g: number; b: number; count: number }>;
  hasGreenPixels: boolean;
  hasBrownPixels: boolean;
  hasGrayPixels: boolean;
  hasBluePixels: boolean;
  density: number; // opaque pixels / bounding area
}

function analyzeSprite(filePath: string): SpriteAnalysis {
  const buffer = readFileSync(filePath);
  const png = PNG.sync.read(buffer);
  const { width, height, data } = png;

  let minX = width,
    maxX = -1,
    minY = height,
    maxY = -1;
  let opaquePixels = 0;
  const colorCounts = new Map<string, { r: number; g: number; b: number; count: number }>();
  let greenPixels = 0;
  let brownPixels = 0;
  let grayPixels = 0;
  let bluePixels = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx],
        g = data[idx + 1],
        b = data[idx + 2],
        a = data[idx + 3];
      if (a < 128) continue;

      opaquePixels++;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      // Quantize colors (reduce to 4-bit)
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;
      const key = `${qr},${qg},${qb}`;
      const existing = colorCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        colorCounts.set(key, { r: qr, g: qg, b: qb, count: 1 });
      }

      // Color classification
      if (g > r * 1.3 && g > b * 1.3) greenPixels++;
      if (r > 100 && g > 60 && g < r && b < g) brownPixels++;
      if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && r > 40 && r < 200) grayPixels++;
      if (b > r * 1.3 && b > g * 1.2) bluePixels++;
    }
  }

  if (maxX < 0) {
    return {
      trimmedWidth: 0,
      trimmedHeight: 0,
      footprintW: 1,
      footprintH: 1,
      opaquePixels: 0,
      dominantColors: [],
      hasGreenPixels: false,
      hasBrownPixels: false,
      hasGrayPixels: false,
      hasBluePixels: false,
      density: 0,
    };
  }

  const tw = maxX - minX + 1;
  const th = maxY - minY + 1;
  const area = tw * th;

  const sortedColors = Array.from(colorCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    trimmedWidth: tw,
    trimmedHeight: th,
    footprintW: Math.max(1, Math.ceil(tw / 16)),
    footprintH: Math.max(1, Math.ceil(th / 16)),
    opaquePixels,
    dominantColors: sortedColors,
    hasGreenPixels: greenPixels / opaquePixels > 0.15,
    hasBrownPixels: brownPixels / opaquePixels > 0.2,
    hasGrayPixels: grayPixels / opaquePixels > 0.3,
    hasBluePixels: bluePixels / opaquePixels > 0.15,
    density: area > 0 ? opaquePixels / area : 0,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Auto-categorization
// ─────────────────────────────────────────────────────────────────────

function autoCategory(
  analysis: SpriteAnalysis,
  index: number,
): {
  name: string;
  label: string;
  category: string;
  isDesk: boolean;
  canPlaceOnWalls: boolean;
  canPlaceOnSurfaces: boolean;
} {
  const { footprintW, footprintH, trimmedWidth, trimmedHeight } = analysis;
  const isSmall = footprintW === 1 && footprintH === 1;
  const isTall = footprintH >= 2;
  const isWide = footprintW >= 2;

  // Use sequential naming with size hints
  const num = String(index + 1).padStart(3, '0');
  const sizeTag = `${footprintW}x${footprintH}`;

  // Default values
  let category = 'misc';
  let isDesk = false;
  let canPlaceOnWalls = false;
  let canPlaceOnSurfaces = false;
  let typeHint = 'ITEM';

  // Heuristic categorization based on size and color
  if (analysis.hasGreenPixels && isSmall) {
    category = 'decor';
    typeHint = 'PLANT';
  } else if (analysis.hasGreenPixels && isTall) {
    category = 'decor';
    typeHint = 'PLANT_TALL';
  } else if (isWide && isTall && analysis.hasBrownPixels) {
    category = 'desks';
    isDesk = true;
    typeHint = 'DESK';
  } else if (isWide && !isTall && analysis.hasBrownPixels) {
    category = 'desks';
    isDesk = true;
    typeHint = 'TABLE';
  } else if (isSmall && trimmedHeight <= 10 && trimmedWidth <= 10) {
    category = 'electronics';
    canPlaceOnSurfaces = true;
    typeHint = 'SMALL_ITEM';
  } else if (isSmall && analysis.hasGrayPixels && analysis.density > 0.5) {
    category = 'electronics';
    typeHint = 'DEVICE';
  } else if (isTall && analysis.hasGrayPixels) {
    category = 'storage';
    typeHint = 'CABINET';
  } else if (isTall && analysis.hasBrownPixels) {
    category = 'storage';
    typeHint = 'SHELF';
  } else if (isSmall && analysis.density < 0.3) {
    // Low density small items are often wall-mounted
    category = 'wall';
    canPlaceOnWalls = true;
    typeHint = 'WALL_ITEM';
  } else if (isWide && footprintH === 1) {
    category = 'decor';
    typeHint = 'WIDE_ITEM';
  } else if (isSmall) {
    category = 'misc';
    typeHint = 'ITEM';
  }

  const name = `${typeHint}_${num}`;
  const label = `${typeHint.replace(/_/g, ' ')} ${num}`;

  return { name, label, category, isDesk, canPlaceOnWalls, canPlaceOnSurfaces };
}

// ─────────────────────────────────────────────────────────────────────
// Process all sprites
// ─────────────────────────────────────────────────────────────────────

console.log(`🔍 Analyzing sprites...\n`);

interface OutputAsset {
  id: string;
  paddedX: number;
  paddedY: number;
  paddedWidth: number;
  paddedHeight: number;
  sourceFile?: string;
  sourceWidth?: number;
  sourceHeight?: number;
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
}

const outputAssets: OutputAsset[] = [];
const categoryCounts = new Map<string, number>();

for (let i = 0; i < assets.length; i++) {
  const asset = assets[i];

  if (!asset.sourceFile) {
    console.warn(`   ⚠️  ${asset.id} has no sourceFile, skipping`);
    continue;
  }

  const analysis = analyzeSprite(asset.sourceFile);
  const meta = autoCategory(analysis, i);

  categoryCounts.set(meta.category, (categoryCounts.get(meta.category) || 0) + 1);

  outputAssets.push({
    id: asset.id,
    paddedX: asset.paddedX,
    paddedY: asset.paddedY,
    paddedWidth: asset.paddedWidth,
    paddedHeight: asset.paddedHeight,
    sourceFile: asset.sourceFile,
    sourceWidth: asset.sourceWidth,
    sourceHeight: asset.sourceHeight,
    name: meta.name,
    label: meta.label,
    category: meta.category,
    footprintW: analysis.footprintW,
    footprintH: analysis.footprintH,
    isDesk: meta.isDesk,
    canPlaceOnWalls: meta.canPlaceOnWalls,
    canPlaceOnSurfaces: meta.canPlaceOnSurfaces,
    orientation: null,
    state: null,
    groupId: null,
    discard: false,
  });

  if (i < 10 || i % 50 === 0) {
    console.log(
      `   [${i + 1}/${assets.length}] ${meta.name} | ${meta.category} | ${analysis.footprintW}x${analysis.footprintH}`,
    );
  }
}

console.log(`   ... (${assets.length} total)\n`);

// ─────────────────────────────────────────────────────────────────────
// Write output
// ─────────────────────────────────────────────────────────────────────

const output = {
  version: 1,
  timestamp: new Date().toISOString(),
  sourceFile: inputData.sourceFile,
  tileset: inputData.tileset,
  backgroundColor: inputData.backgroundColor,
  assets: outputAssets,
};

writeFileSync(outputJsonPath, JSON.stringify(output, null, 2));
console.log(`📝 Metadata saved to: ${outputJsonPath}`);
console.log(`   Assets: ${outputAssets.length}`);

console.log(`\n📊 Category distribution:`);
for (const [cat, count] of Array.from(categoryCounts.entries()).sort()) {
  console.log(`   ${cat.padEnd(15)} ${count} assets`);
}

console.log(`\n⚠️  Names are auto-generated placeholders.`);
console.log(`   Review and rename in asset-manager.html before export.`);
console.log(`\n📋 Next step: Review metadata in browser`);
console.log(`   open scripts/asset-manager.html\n`);

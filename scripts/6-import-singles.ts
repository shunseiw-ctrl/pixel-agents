/**
 * Stage 6: Import Individual PNG Sprites
 *
 * Reads a directory of individual PNG files (e.g., LimeZu Modern Office singles)
 * and generates asset-editor-output.json compatible with Stage 3 (vision-inspect).
 *
 * Unlike Stages 1-2 which detect assets from a tileset via flood-fill, this script
 * directly imports pre-separated sprite PNGs.
 *
 * Usage:
 *   npx tsx scripts/6-import-singles.ts <directory-path>
 *
 * Example:
 *   npx tsx scripts/6-import-singles.ts "/Users/albalize/Downloads/Modern_Office_Revamped_v1.2/4_Modern_Office_singles/16x16"
 *
 * Output:
 *   scripts/.tileset-working/asset-editor-output.json (Stage 3 compatible)
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve, basename, extname } from 'path';
import { PNG } from 'pngjs';

// ─────────────────────────────────────────────────────────────────────
// Parse arguments
// ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: npx tsx scripts/6-import-singles.ts <directory-path>');
  console.error(
    'Example: npx tsx scripts/6-import-singles.ts "/path/to/4_Modern_Office_singles/16x16"',
  );
  process.exit(1);
}

const inputDir = resolve(args[0]);

if (!existsSync(inputDir)) {
  console.error(`❌ Directory not found: ${inputDir}`);
  process.exit(1);
}

console.log(`\n📂 Stage 6: Import Individual PNG Sprites\n`);
console.log(`   Source: ${inputDir}`);

// ─────────────────────────────────────────────────────────────────────
// Collect PNG files
// ─────────────────────────────────────────────────────────────────────

const files = readdirSync(inputDir)
  .filter((f) => extname(f).toLowerCase() === '.png')
  .sort((a, b) => {
    // Sort numerically by extracting trailing number from filename
    const numA = parseInt(a.match(/(\d+)\.png$/i)?.[1] || '0', 10);
    const numB = parseInt(b.match(/(\d+)\.png$/i)?.[1] || '0', 10);
    return numA - numB;
  });

console.log(`   Found ${files.length} PNG files\n`);

if (files.length === 0) {
  console.error('❌ No PNG files found in directory');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────
// Helper: Calculate trim bounds (non-transparent content area)
// ─────────────────────────────────────────────────────────────────────

interface TrimBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  trimmedWidth: number;
  trimmedHeight: number;
}

function getTrimBounds(png: PNG): TrimBounds | null {
  const { width, height, data } = png;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 0) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < 0) return null; // Fully transparent

  return {
    minX,
    minY,
    maxX,
    maxY,
    trimmedWidth: maxX - minX + 1,
    trimmedHeight: maxY - minY + 1,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Process each PNG
// ─────────────────────────────────────────────────────────────────────

interface AssetEntry {
  id: string;
  paddedX: number;
  paddedY: number;
  paddedWidth: number;
  paddedHeight: number;
  sourceFile: string;
  sourceWidth: number;
  sourceHeight: number;
}

console.log(`🔍 Processing sprites...\n`);

const assets: AssetEntry[] = [];
let skipped = 0;

for (const file of files) {
  const filePath = join(inputDir, file);
  const pngBuffer = readFileSync(filePath);
  const png = PNG.sync.read(pngBuffer);

  const bounds = getTrimBounds(png);
  if (!bounds) {
    console.log(`   ⚠️  ${file} — fully transparent, skipping`);
    skipped++;
    continue;
  }

  // Calculate padded dimensions (round up to 16px multiples)
  const paddedWidth = Math.ceil(bounds.trimmedWidth / 16) * 16;
  const paddedHeight = Math.ceil(bounds.trimmedHeight / 16) * 16;

  // Calculate padded position relative to the original PNG
  // Center horizontally, bottom-align vertically
  const paddedX = bounds.minX - Math.floor((paddedWidth - bounds.trimmedWidth) / 2);
  const paddedY = bounds.minY - (paddedHeight - bounds.trimmedHeight);

  // Generate ID from filename
  const nameBase = basename(file, extname(file));
  const id = `ASSET_${nameBase.replace(/[^a-zA-Z0-9_]/g, '_')}`;

  assets.push({
    id,
    paddedX,
    paddedY,
    paddedWidth,
    paddedHeight,
    sourceFile: resolve(filePath),
    sourceWidth: png.width,
    sourceHeight: png.height,
  });

  const footprintW = Math.max(1, Math.ceil(bounds.trimmedWidth / 16));
  const footprintH = Math.max(1, Math.ceil(bounds.trimmedHeight / 16));

  if (assets.length <= 10 || assets.length % 50 === 0) {
    console.log(
      `   ✓ ${file.padEnd(40)} ${png.width}×${png.height}px → trimmed ${bounds.trimmedWidth}×${bounds.trimmedHeight}px (${footprintW}×${footprintH} tiles)`,
    );
  }
}

if (assets.length > 10) {
  console.log(`   ... (${assets.length} total)`);
}

console.log(`\n✅ Processed ${assets.length} sprites (${skipped} skipped)\n`);

// ─────────────────────────────────────────────────────────────────────
// Generate output JSON (Stage 3 compatible)
// ─────────────────────────────────────────────────────────────────────

const outputDir = join(__dirname, '.tileset-working');
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

const outputPath = join(outputDir, 'asset-editor-output.json');

const output = {
  version: 1,
  timestamp: new Date().toISOString(),
  sourceFile: inputDir,
  tileset: null, // No tileset — individual PNGs
  backgroundColor: '#00000000',
  totalPixels: 0,
  backgroundPixels: 0,
  assets,
};

writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`📝 Output: ${outputPath}`);
console.log(`   Assets: ${assets.length}`);

// Summary by footprint size
const sizeMap = new Map<string, number>();
for (const a of assets) {
  const key = `${a.paddedWidth}×${a.paddedHeight}`;
  sizeMap.set(key, (sizeMap.get(key) || 0) + 1);
}

console.log(`\n📊 Size distribution:`);
for (const [size, count] of Array.from(sizeMap.entries()).sort()) {
  console.log(`   ${size.padEnd(12)} ${count} sprites`);
}

console.log(`\n📋 Next step: Run Stage 3 (Vision Inspect)`);
console.log(`   npx tsx scripts/3-vision-inspect.ts\n`);

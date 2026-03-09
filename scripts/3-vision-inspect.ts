/**
 * Stage 3: Vision Inspection & Auto-Metadata Generation
 *
 * Uses Claude's vision API to analyze each asset and suggest:
 * - Name, Label, Category
 * - isDesk flag, canPlaceOnWalls flag
 *
 * Usage:
 *   npx ts-node scripts/inspect-assets.ts
 *
 * Requires:
 *   - asset-editor-output.json (approved assets)
 *   - assets/office_tileset_16x16.png (source tileset)
 *   - ANTHROPIC_API_KEY environment variable
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PNG } from 'pngjs';
import Anthropic from '@anthropic-ai/sdk';

// Load .env file
function loadEnv() {
  try {
    const envPath = join(__dirname, '..', '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();
      if (key && value) {
        process.env[key.trim()] = value;
      }
    }
  } catch (err) {
    // .env file not found, will rely on environment variable
  }
}

interface AssetWithMetadata {
  id: string;
  paddedX: number;
  paddedY: number;
  paddedWidth: number;
  paddedHeight: number;
  erasedPixels?: Array<{ x: number; y: number }>;
  /** Absolute path to individual PNG file (for singles import mode) */
  sourceFile?: string;
  sourceWidth?: number;
  sourceHeight?: number;
  // Suggestions from vision
  suggestedName?: string;
  suggestedLabel?: string;
  suggestedCategory?: string;
  suggestedIsDesk?: boolean;
  suggestedCanPlaceOnWalls?: boolean;
  suggestedOrientation?: string;
  suggestedState?: string;
  suggestedGroupId?: string;
  suggestedCanPlaceOnSurfaces?: boolean;
}

const pngPath = './webview-ui/public/assets/office_tileset_16x16.png';
const inputJsonPath = './scripts/.tileset-working/asset-editor-output.json';
const outputJsonPath = './scripts/.tileset-working/tileset-metadata-draft.json';

console.log(`\n🔍 Stage 3: Vision Inspection & Auto-Metadata\n`);

// ─────────────────────────────────────────────────────────────────────
// Load input data
// ─────────────────────────────────────────────────────────────────────

console.log(`📖 Loading ${inputJsonPath}...`);
const inputData = JSON.parse(readFileSync(inputJsonPath, 'utf-8'));
const assets: AssetWithMetadata[] = inputData.assets;

// Detect singles mode: assets have sourceFile field
const isSinglesMode = assets.length > 0 && !!assets[0].sourceFile;

let pngWidth = 0;
let pngHeight = 0;
let pngData: Buffer = Buffer.alloc(0);

if (!isSinglesMode) {
  console.log(`📷 Loading ${pngPath}...`);
  const pngBuffer = readFileSync(pngPath);
  const png = PNG.sync.read(pngBuffer);
  pngWidth = png.width;
  pngHeight = png.height;
  pngData = png.data as unknown as Buffer;
} else {
  console.log(`📂 Singles mode: ${assets.length} individual PNGs`);
}

console.log(`   Found ${assets.length} assets to inspect\n`);

// ─────────────────────────────────────────────────────────────────────
// Helper: Extract asset region as PNG buffer
// ─────────────────────────────────────────────────────────────────────

function extractAssetPng(asset: AssetWithMetadata): Buffer {
  // Singles mode: read directly from individual PNG file
  if (asset.sourceFile) {
    return readFileSync(asset.sourceFile);
  }

  // Tileset mode: extract region from loaded tileset
  const w = asset.paddedWidth;
  const h = asset.paddedHeight;

  // Create new PNG for this asset
  const assetPng = new PNG({ width: w, height: h });

  // Copy pixels from tileset, handling out-of-bounds and erased pixels
  const erasedSet = new Set((asset.erasedPixels || []).map((p) => `${p.x},${p.y}`));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sourceX = asset.paddedX + x;
      const sourceY = asset.paddedY + y;
      const isErased = erasedSet.has(`${x},${y}`);

      // Destination pixel index
      const dstIdx = (y * w + x) << 2;

      // Check if pixel is out of bounds or erased
      if (sourceX < 0 || sourceX >= pngWidth || sourceY < 0 || sourceY >= pngHeight || isErased) {
        // Transparent (RGBA = 0,0,0,0)
        assetPng.data[dstIdx] = 0;
        assetPng.data[dstIdx + 1] = 0;
        assetPng.data[dstIdx + 2] = 0;
        assetPng.data[dstIdx + 3] = 0;
      } else {
        // Copy from source
        const srcIdx = (sourceY * pngWidth + sourceX) << 2;
        assetPng.data[dstIdx] = pngData[srcIdx];
        assetPng.data[dstIdx + 1] = pngData[srcIdx + 1];
        assetPng.data[dstIdx + 2] = pngData[srcIdx + 2];
        assetPng.data[dstIdx + 3] = pngData[srcIdx + 3];
      }
    }
  }

  return PNG.sync.write(assetPng);
}

// ─────────────────────────────────────────────────────────────────────
// Vision analysis with Claude
// ─────────────────────────────────────────────────────────────────────

async function analyzeAsset(
  client: Anthropic,
  asset: AssetWithMetadata,
  pngBuffer: Buffer,
  index: number,
  total: number,
): Promise<void> {
  const base64 = pngBuffer.toString('base64');

  console.log(`[${index + 1}/${total}] Analyzing ${asset.id}...`);

  const prompt = `You are an expert at identifying pixel art furniture and objects. Analyze this pixel art image and provide metadata.

Return ONLY valid JSON on a single line (no markdown, no explanation):
{
  "name": "UPPERCASE_SNAKE_CASE name (e.g., DESK_WOOD_SM, CHAIR_SPINNING_FRONT, MONITOR_FRONT_OFF)",
  "label": "Human readable label (e.g., Wood Table Small, Spinning Chair - Front)",
  "category": "one of: desks, chairs, storage, decor, electronics, wall, misc",
  "isDesk": true/false,
  "canPlaceOnWalls": true/false,
  "canPlaceOnSurfaces": true/false,
  "orientation": "front/back/left/right or null",
  "state": "on/off or null",
  "groupId": "base name without orientation/state suffix, or null"
}

Guidelines:
- name: SCREAMING_SNAKE_CASE, descriptive, include orientation and state suffixes when applicable
  - For directional variants: append _FRONT, _BACK, _LEFT, _RIGHT
  - For on/off variants: append _ON, _OFF (e.g., MONITOR_FRONT_ON, MONITOR_FRONT_OFF)
- label: Title Case, human friendly, include orientation/state (e.g., "Monitor - Front - Off")
- category: desks (tables/desks), chairs (seats/couches), storage (shelves/cabinets/drawers),
  electronics (monitors/phones/printers), decor (plants/frames/clocks), wall (wall-mounted items), misc
- isDesk: true only if it's a desk/table surface where agents sit and work
- canPlaceOnWalls: true if item is wall-mounted (paintings, clocks, shelves, windows)
- canPlaceOnSurfaces: true if item is a small object that sits ON a desk/table (monitors, laptops, mugs, lamps, phones)
- orientation: detect viewing angle — "front" (facing viewer), "back" (facing away), "left", "right". null if not directional
- state: "on" if electronics are glowing/active, "off" if electronics are dark/inactive. null if not applicable
- groupId: for items that are the same object in different orientations or states, provide a shared base name
  (e.g., "CHAIR_SPINNING" for CHAIR_SPINNING_FRONT/BACK/LEFT/RIGHT). null if standalone`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: base64,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    // Extract JSON from response
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(`   ⚠️  No JSON found in response, skipping`);
      return;
    }

    const data = JSON.parse(jsonMatch[0]);
    asset.suggestedName = data.name;
    asset.suggestedLabel = data.label;
    asset.suggestedCategory = data.category;
    asset.suggestedIsDesk = data.isDesk;
    asset.suggestedCanPlaceOnWalls = data.canPlaceOnWalls;
    asset.suggestedOrientation = data.orientation || null;
    asset.suggestedState = data.state || null;
    asset.suggestedGroupId = data.groupId || null;
    asset.suggestedCanPlaceOnSurfaces = data.canPlaceOnSurfaces || false;

    console.log(
      `   ✓ ${asset.suggestedName} | ${asset.suggestedCategory}${asset.suggestedOrientation ? ` | ${asset.suggestedOrientation}` : ''}${asset.suggestedState ? ` | ${asset.suggestedState}` : ''}`,
    );
  } catch (err) {
    console.warn(`   ⚠️  Error: ${err instanceof Error ? err.message : err}`);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────

async function main() {
  // Load .env file first
  loadEnv();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: ANTHROPIC_API_KEY not set');
    console.error('   Add your key to .env file:');
    console.error('   ANTHROPIC_API_KEY=sk-ant-...');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  console.log(`🤖 Using Claude Haiku 4.5 for vision analysis\n`);

  // Analyze each asset
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    const pngBuffer = extractAssetPng(asset);
    await analyzeAsset(client, asset, pngBuffer, i, assets.length);
  }

  console.log(`\n✅ Vision analysis complete!\n`);

  // Prepare output
  const output = {
    version: 1,
    timestamp: new Date().toISOString(),
    sourceFile: inputData.sourceFile,
    tileset: inputData.tileset,
    backgroundColor: inputData.backgroundColor,
    assets: assets.map((a) => ({
      id: a.id,
      paddedX: a.paddedX,
      paddedY: a.paddedY,
      paddedWidth: a.paddedWidth,
      paddedHeight: a.paddedHeight,
      erasedPixels: a.erasedPixels,
      // Preserve sourceFile for singles mode (used by Stage 5 export)
      ...(a.sourceFile ? { sourceFile: a.sourceFile } : {}),
      ...(a.sourceWidth ? { sourceWidth: a.sourceWidth } : {}),
      ...(a.sourceHeight ? { sourceHeight: a.sourceHeight } : {}),
      // Metadata suggestions (ready for user review)
      name: a.suggestedName || a.id,
      label: a.suggestedLabel || a.id,
      category: a.suggestedCategory || 'misc',
      footprintW: Math.max(1, Math.round(a.paddedWidth / 16)),
      footprintH: Math.max(1, Math.round(a.paddedHeight / 16)),
      isDesk: a.suggestedIsDesk || false,
      canPlaceOnWalls: a.suggestedCanPlaceOnWalls || false,
      canPlaceOnSurfaces: a.suggestedCanPlaceOnSurfaces || false,
      orientation: a.suggestedOrientation || null,
      state: a.suggestedState || null,
      groupId: a.suggestedGroupId || null,
      discard: false,
    })),
  };

  // Write output
  writeFileSync(outputJsonPath, JSON.stringify(output, null, 2));
  console.log(`📝 Metadata suggestions saved to: ${outputJsonPath}`);

  // Summary
  const withSuggestions = assets.filter((a) => a.suggestedName).length;
  console.log(`\n📊 Summary:`);
  console.log(`   Total assets: ${assets.length}`);
  console.log(`   With metadata: ${withSuggestions}`);
  console.log(`   Success rate: ${((withSuggestions / assets.length) * 100).toFixed(1)}%`);

  console.log(`\n📋 Next step: Review metadata in Stage 4`);
  console.log(`   open scripts/metadata-editor.html\n`);
}

main().catch(console.error);

/**
 * Generate Leaflet-compatible map tiles with multi-resolution support.
 *
 * Zoom 0-5:  Global map (ui_global_map.dds) at 1:1 pixel scale
 * Zoom 6-8:  Per-level high-res overlays from individual DDS textures,
 *            positioned at their global_rect coordinates
 *
 * Usage: node scripts/generate-map-tiles.mjs [--tile-size 256] [--format jpg] [--quality 85]
 *
 * Output: site/public/tiles/{z}/{x}/{y}.{jpg|png}
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { createRequire } from "module";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const parseDDS = require("parse-dds");
const decodeDXT = require("decode-dxt");

const ROOT = join(import.meta.dirname, "..");
const GLOBAL_DDS = join(ROOT, "High_Resolution_PDA_Maps", "ui", "ui_global_map.dds");
const LEVEL_DDS_DIR = join(ROOT, "High_Resolution_PDA_Maps", "map");
const LEVELS_JSON = join(ROOT, "site", "public", "data", "map-levels.json");
const OUT_DIR = join(ROOT, "site", "public", "tiles");

function parseArg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : fallback;
}

const TILE_SIZE = Number(parseArg("tile-size", 256));
const BASE_MAX_ZOOM = 5; // global map zoom levels 0-5
const LEVEL_MAX_ZOOM = 8; // per-level detail up to zoom 8 where textures support it
const FORMAT = parseArg("format", "jpg");
const JPG_QUALITY = Number(parseArg("quality", 85));

// --- DDS decode helper ---
function decodeDDSFile(path) {
  console.log(`  Decoding: ${path.split(/[/\\]/).pop()}`);
  const buf = readFileSync(path);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const info = parseDDS(ab);
  const img = info.images[0];
  const w = img.shape[0], h = img.shape[1];
  const view = new DataView(ab, img.offset, img.length);
  const rgba = decodeDXT(view, w, h, info.format);
  return {
    width: w,
    height: h,
    data: Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength),
  };
}

// --- Tile output helper ---
async function writeTile(pipeline, z, x, y) {
  const dir = join(OUT_DIR, String(z), String(x));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (FORMAT === "jpg") {
    pipeline = pipeline.jpeg({ quality: JPG_QUALITY });
  } else {
    pipeline = pipeline.png({ compressionLevel: 9 });
  }
  await pipeline.toFile(join(dir, `${y}.${FORMAT}`));
}

// --- Level ID to DDS filename mapping ---
// Prefer prefixed versions (map_l05_bar) over vanilla (map_bar)
const LEVEL_TEXTURE_MAP = {
  l03_agroprom: "map_agroprom",
  l07_military: "map_l07_military",
  // l05_bar + l06_rostok merged — see MERGED_REGIONS
  l01_escape: "map_escape",
  l02_garbage: "map_garbage",
  l04_darkvalley: "map_l04_darkvalley",
  l08_yantar: "map_l08_yantar",
  l09_deadcity: "map_l09_deadcity",
  l10_limansk: "map_limansk",
  l10_radar: "map_l10_radar",
  l10_red_forest: "map_red_forest",
  l11_hospital: "map_hospital",
  l11_pripyat: "map_l11_pripyat",
  l12_stancia: "map_l12_stancia",
  l12_stancia_2: "map_stancia_2",
  l13_generators: "map_l13_generators",
  jupiter: "map_jupiter",
  k00_marsh: "map_marsh",
  k01_darkscape: "map_k01_darkscape",
  k02_trucks_cemetery: "map_k02_trucks_cemetery",
  pripyat: "map_pripyat",
  zaton: "map_zaton",
  y04_pole: "map_y04_pole",
};

// Manually stitched textures that cover multiple levels.
// rawRect is the combined region in LTX coordinate space (1024x2634).
const MERGED_REGIONS = [
  {
    name: "Bar + Rostok",
    dds: "map_l06_rostok_merged",
    rawRect: { x1: 258, y1: 1414, x2: 556, y2: 1712 },
  },
];

// ============================================================
// PASS 1: Global map tiles (zoom 0 to BASE_MAX_ZOOM)
// ============================================================
console.log("=== Pass 1: Global map tiles ===");
const globalDDS = decodeDDSFile(GLOBAL_DDS);
const { width: gw, height: gh } = globalDDS;
console.log(`  Global map: ${gw}x${gh}`);

const canvasSize = TILE_SIZE * Math.pow(2, BASE_MAX_ZOOM); // 8192
const scaleX = canvasSize / gw;
const scaleY = canvasSize / gh;
const scale = Math.min(scaleX, scaleY);
const scaledW = Math.round(gw * scale);
const scaledH = Math.round(gh * scale);

console.log(`  Canvas: ${canvasSize}x${canvasSize}, scaled image: ${scaledW}x${scaledH}`);

const scaledGlobal = await sharp(globalDDS.data, {
  raw: { width: gw, height: gh, channels: 4 },
})
  .resize(scaledW, scaledH, { fit: "fill" })
  .toBuffer();

const globalCanvas = await sharp({
  create: { width: canvasSize, height: canvasSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
})
  .composite([{
    input: scaledGlobal,
    raw: { width: scaledW, height: scaledH, channels: 4 },
    left: 0, top: 0,
  }])
  .raw()
  .toBuffer();

// Free global DDS memory
globalDDS.data = null;

let tileCount = 0;

for (let z = 0; z <= BASE_MAX_ZOOM; z++) {
  const tilesPerSide = Math.pow(2, z);
  const srcTileSize = Math.round(canvasSize / tilesPerSide);

  for (let x = 0; x < tilesPerSide; x++) {
    for (let y = 0; y < tilesPerSide; y++) {
      const srcX = x * srcTileSize;
      const srcY = y * srcTileSize;
      if (srcX >= scaledW || srcY >= scaledH) continue;

      const pipeline = sharp(globalCanvas, {
        raw: { width: canvasSize, height: canvasSize, channels: 4 },
      })
        .extract({
          left: srcX,
          top: srcY,
          width: Math.min(srcTileSize, canvasSize - srcX),
          height: Math.min(srcTileSize, canvasSize - srcY),
        })
        .resize(TILE_SIZE, TILE_SIZE, { fit: "fill" });

      await writeTile(pipeline, z, x, y);
      tileCount++;
    }
  }
  console.log(`  Zoom ${z}: ${tilesPerSide}x${tilesPerSide} grid`);
}

console.log(`  Global tiles: ${tileCount}`);

// ============================================================
// PASS 2: Per-level high-res tiles (zoom BASE_MAX_ZOOM+1 to LEVEL_MAX_ZOOM)
// ============================================================
console.log("\n=== Pass 2: Per-level high-res tiles ===");

const levelsData = JSON.parse(readFileSync(LEVELS_JSON, "utf-8"));
const surfaceLevels = levelsData.levels.filter((l) => !l.underground);

// The global map image dimensions at base zoom
// Image pixel coords: x = bounds.x1 * scaledW, y = bounds.y1 * scaledH
// These map to canvas pixels 1:1 at BASE_MAX_ZOOM

let levelTileCount = 0;

// Generate high-res tiles for a region covered by a single DDS texture.
// rawRect is in LTX coordinate space (1024x2634).
async function generateLevelTiles(label, ddsPath, rawRect) {
  const cx1 = rawRect.x1 / 1024 * scaledW;
  const cy1 = rawRect.y1 / 2634 * scaledH;
  const cx2 = rawRect.x2 / 1024 * scaledW;
  const cy2 = rawRect.y2 / 2634 * scaledH;
  const regionW = cx2 - cx1;
  const regionH = cy2 - cy1;
  if (regionW < 1 || regionH < 1) return 0;

  const levelDDS = decodeDDSFile(ddsPath);
  const { width: lw, height: lh } = levelDDS;

  const zoomFactorX = lw / regionW;
  const zoomFactorY = lh / regionH;
  const extraZoom = Math.ceil(Math.log2(Math.max(zoomFactorX, zoomFactorY)));
  const levelMaxZoom = Math.min(BASE_MAX_ZOOM + extraZoom, LEVEL_MAX_ZOOM);

  console.log(`  ${label}: ${lw}x${lh}, region ${Math.round(regionW)}x${Math.round(regionH)}px, extra zoom: +${extraZoom} (max z${levelMaxZoom})`);

  let tiles = 0;

  for (let z = BASE_MAX_ZOOM + 1; z <= levelMaxZoom; z++) {
    const zoomFactor = Math.pow(2, z - BASE_MAX_ZOOM);
    const lx1 = cx1 * zoomFactor;
    const ly1 = cy1 * zoomFactor;
    const lx2 = cx2 * zoomFactor;
    const ly2 = cy2 * zoomFactor;

    const txMin = Math.max(0, Math.floor(lx1 / TILE_SIZE));
    const txMax = Math.ceil(lx2 / TILE_SIZE) - 1;
    const tyMin = Math.max(0, Math.floor(ly1 / TILE_SIZE));
    const tyMax = Math.ceil(ly2 / TILE_SIZE) - 1;

    for (let tx = txMin; tx <= txMax; tx++) {
      for (let ty = tyMin; ty <= tyMax; ty++) {
        const tilePxLeft = tx * TILE_SIZE;
        const tilePxTop = ty * TILE_SIZE;
        const tilePxRight = tilePxLeft + TILE_SIZE;
        const tilePxBottom = tilePxTop + TILE_SIZE;

        const normLeft = (tilePxLeft - lx1) / (lx2 - lx1);
        const normTop = (tilePxTop - ly1) / (ly2 - ly1);
        const normRight = (tilePxRight - lx1) / (lx2 - lx1);
        const normBottom = (tilePxBottom - ly1) / (ly2 - ly1);

        const srcLeft = Math.max(0, Math.round(normLeft * lw));
        const srcTop = Math.max(0, Math.round(normTop * lh));
        const srcRight = Math.min(lw, Math.round(normRight * lw));
        const srcBottom = Math.min(lh, Math.round(normBottom * lh));

        const srcW = srcRight - srcLeft;
        const srcH = srcBottom - srcTop;
        if (srcW < 1 || srcH < 1) continue;

        // Extract and resize the level region to tile size (keep RGBA for alpha)
        const overlay = await sharp(levelDDS.data, {
          raw: { width: lw, height: lh, channels: 4 },
        })
          .extract({ left: srcLeft, top: srcTop, width: srcW, height: srcH })
          .resize(TILE_SIZE, TILE_SIZE, { fit: "fill" })
          .png()
          .toBuffer();

        const tilePath = join(OUT_DIR, String(z), String(tx), `${ty}.${FORMAT}`);

        // If tile already exists, composite this level on top (alpha blend)
        if (existsSync(tilePath)) {
          const existing = readFileSync(tilePath);
          const pipeline = sharp(existing)
            .composite([{ input: overlay }]);
          await writeTile(pipeline, z, tx, ty);
        } else {
          // No existing tile — write with black background
          const pipeline = sharp({
            create: { width: TILE_SIZE, height: TILE_SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
          }).composite([{ input: overlay }]);
          await writeTile(pipeline, z, tx, ty);
        }
        tiles++;
      }
    }
  }

  levelDDS.data = null;
  if (tiles > 0) console.log(`    → ${tiles} tiles`);
  return tiles;
}

// Process individual levels
for (const level of surfaceLevels) {
  const ddsName = LEVEL_TEXTURE_MAP[level.id];
  if (!ddsName) continue;

  const ddsPath = join(LEVEL_DDS_DIR, ddsName + ".dds");
  if (!existsSync(ddsPath)) {
    console.log(`  Skipping ${level.id}: ${ddsName}.dds not found`);
    continue;
  }

  levelTileCount += await generateLevelTiles(
    `${level.name} (${level.id})`,
    ddsPath,
    level.rawRect,
  );
}

// Process merged regions
for (const merged of MERGED_REGIONS) {
  const ddsPath = join(LEVEL_DDS_DIR, merged.dds + ".dds");
  if (!existsSync(ddsPath)) {
    console.log(`  Skipping merged ${merged.name}: ${merged.dds}.dds not found`);
    continue;
  }

  levelTileCount += await generateLevelTiles(
    merged.name,
    ddsPath,
    merged.rawRect,
  );
}

tileCount += levelTileCount;
console.log(`\n  Level tiles: ${levelTileCount}`);
console.log(`  Total tiles: ${tileCount}`);

// ============================================================
// Metadata
// ============================================================
const metadata = {
  tileSize: TILE_SIZE,
  maxZoom: LEVEL_MAX_ZOOM,
  format: FORMAT,
  imageWidth: gw,
  imageHeight: gh,
  scaledWidth: scaledW,
  scaledHeight: scaledH,
  canvasSize,
  baseMaxZoom: BASE_MAX_ZOOM,
};
const metaPath = join(OUT_DIR, "metadata.json");
writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
console.log(`\nMetadata written to ${metaPath}`);
console.log("Done!");

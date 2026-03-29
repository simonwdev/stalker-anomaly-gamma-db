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

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from "fs";
import { join } from "path";
import { createRequire } from "module";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const parseDDS = require("parse-dds");
const decodeDXT = require("decode-dxt");

const ROOT = join(import.meta.dirname, "..");
const GLOBAL_DDS = join(ROOT, "map_images", "ui_global_map.dds");
const LEVEL_DDS_DIR = join(ROOT, "map_images");
const LEVELS_JSON = join(ROOT, "site", "public", "data", "map-levels.json");
const OUT_DIR = join(ROOT, "site", "public", "tiles");

function parseArg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : fallback;
}

const TILE_SIZE = Number(parseArg("tile-size", 256));
const MIN_ZOOM = 2; // skip Z0-1 (too zoomed out to be useful)
const GLOBAL_MAX_ZOOM = 4; // global map tiles Z2-4 (sharp background at all zooms)
const BASE_MAX_ZOOM = 3; // detail tiles start at Z4 (BASE_MAX_ZOOM + 1)
const LEVEL_MAX_ZOOM = 8; // per-level detail up to zoom 8
const FORMAT = parseArg("format", "jpg");
const JPG_QUALITY = Number(parseArg("quality", 95));

// --- Image decode helper (DDS or PNG) ---
async function decodeImageFile(path) {
  const name = path.split(/[/\\]/).pop();
  console.log(`  Decoding: ${name}`);
  if (path.endsWith(".png")) {
    const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return { width: info.width, height: info.height, data };
  }
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

// --- Concurrency pool for parallel tile writes ---
const CONCURRENCY = 16;
async function runPool(tasks) {
  const results = [];
  let i = 0;
  async function next() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, () => next()));
  return results;
}

// --- Tile output helper ---
async function writeTile(pipeline, z, x, y, fmt) {
  fmt = fmt || FORMAT;
  const dir = join(OUT_DIR, String(z), String(x));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (fmt === "jpg") {
    pipeline = pipeline.jpeg({ quality: JPG_QUALITY });
  } else {
    pipeline = pipeline.png({ compressionLevel: 6 });
  }
  await pipeline.toFile(join(dir, `${y}.${fmt}`));
}

// --- Level ID to DDS filename mapping ---
// Prefer prefixed versions (map_l05_bar) over vanilla (map_bar)
const LEVEL_TEXTURE_MAP = {
  l03_agroprom: "map_agroprom",
  l07_military: "map_l07_military",
  // l05_bar + l06_rostok merged — see MERGED_REGIONS
  l01_escape: "map_escape_upscale",
  l02_garbage: "map_garbage_upscale",
  l04_darkvalley: "map_l04_darkvalley_upscale",
  l08_yantar: "map_l08_yantar",
  l09_deadcity: "map_l09_deadcity_upscale",
  l10_limansk: "map_limansk_upscale",
  l10_radar: "map_l10_radar_upscale",
  l10_red_forest: "map_red_forest",
  l11_hospital: "map_hospital_upscale",
  l11_pripyat: "map_l11_pripyat",
  l12_stancia: "map_aes_1_upscale",
  l12_stancia_2: "map_aes_2_upscale",
  l13_generators: "map_l13_generators_upscale",
  jupiter: "map_jupiter",
  k00_marsh: "map_marsh",
  k01_darkscape: "map_k01_darkscape_upscale",
  k02_trucks_cemetery: "map_k02_trucks_cemetery",
  pripyat: "map_pripyat",
  zaton: "map_zaton",
  y04_pole: "map_y04_pole_upscale",
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
const globalDDS = await decodeImageFile(GLOBAL_DDS);
const { width: gw, height: gh } = globalDDS;
console.log(`  Global map: ${gw}x${gh}`);

const canvasSize = TILE_SIZE * Math.pow(2, GLOBAL_MAX_ZOOM);
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

for (let z = MIN_ZOOM; z <= GLOBAL_MAX_ZOOM; z++) {
  const tilesPerSide = Math.pow(2, z);
  const srcTileSize = Math.round(canvasSize / tilesPerSide);
  const tasks = [];

  for (let x = 0; x < tilesPerSide; x++) {
    for (let y = 0; y < tilesPerSide; y++) {
      const srcX = x * srcTileSize;
      const srcY = y * srcTileSize;
      if (srcX >= scaledW || srcY >= scaledH) continue;

      const tx = x, ty = y, tz = z;
      tasks.push(() => {
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
        return writeTile(pipeline, tz, tx, ty);
      });
    }
  }
  await runPool(tasks);
  tileCount += tasks.length;
  console.log(`  Zoom ${z}: ${tilesPerSide}x${tilesPerSide} grid`);
}

console.log(`  Global tiles: ${tileCount}`);

// ============================================================
// PASS 2: Per-level high-res tiles (zoom BASE_MAX_ZOOM+1 to LEVEL_MAX_ZOOM)
// ============================================================
// Purge old detail tiles to avoid stale leftovers
// Purge detail-only zoom levels (keep global tiles at Z4)
for (let z = GLOBAL_MAX_ZOOM + 1; z <= LEVEL_MAX_ZOOM; z++) {
  const zDir = join(OUT_DIR, String(z));
  if (existsSync(zDir)) rmSync(zDir, { recursive: true });
}

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

  const levelDDS = await decodeImageFile(ddsPath);
  const { width: lw, height: lh } = levelDDS;

  const zoomFactorX = lw / regionW;
  const zoomFactorY = lh / regionH;
  const extraZoom = Math.ceil(Math.log2(Math.max(zoomFactorX, zoomFactorY)));
  const levelMaxZoom = Math.min(GLOBAL_MAX_ZOOM + extraZoom, LEVEL_MAX_ZOOM);

  console.log(`  ${label}: ${lw}x${lh}, region ${Math.round(regionW)}x${Math.round(regionH)}px, extra zoom: +${extraZoom} (max z${levelMaxZoom})`);

  let tiles = 0;

  for (let z = BASE_MAX_ZOOM + 1; z <= levelMaxZoom; z++) {
    const zoomFactor = Math.pow(2, z - GLOBAL_MAX_ZOOM);
    const lx1 = cx1 * zoomFactor;
    const ly1 = cy1 * zoomFactor;
    const lx2 = cx2 * zoomFactor;
    const ly2 = cy2 * zoomFactor;

    const txMin = Math.max(0, Math.floor(lx1 / TILE_SIZE));
    const txMax = Math.ceil(lx2 / TILE_SIZE) - 1;
    const tyMin = Math.max(0, Math.floor(ly1 / TILE_SIZE));
    const tyMax = Math.ceil(ly2 / TILE_SIZE) - 1;

    const tasks = [];
    for (let tx = txMin; tx <= txMax; tx++) {
      for (let ty = tyMin; ty <= tyMax; ty++) {
        const tilePxLeft = tx * TILE_SIZE;
        const tilePxTop = ty * TILE_SIZE;
        const tilePxRight = tilePxLeft + TILE_SIZE;
        const tilePxBottom = tilePxTop + TILE_SIZE;

        // Clip tile to level bounds — edge tiles only partially overlap
        const overlapLeft = Math.max(tilePxLeft, lx1);
        const overlapTop = Math.max(tilePxTop, ly1);
        const overlapRight = Math.min(tilePxRight, lx2);
        const overlapBottom = Math.min(tilePxBottom, ly2);
        if (overlapRight <= overlapLeft || overlapBottom <= overlapTop) continue;

        // Destination position and size within the 256×256 tile
        const destX = Math.round(overlapLeft - tilePxLeft);
        const destY = Math.round(overlapTop - tilePxTop);
        const destW = Math.round(overlapRight - overlapLeft);
        const destH = Math.round(overlapBottom - overlapTop);
        if (destW < 1 || destH < 1) continue;

        // Source coords in DDS (norms are always 0–1 thanks to overlap clipping)
        const normLeft = (overlapLeft - lx1) / (lx2 - lx1);
        const normTop = (overlapTop - ly1) / (ly2 - ly1);
        const normRight = (overlapRight - lx1) / (lx2 - lx1);
        const normBottom = (overlapBottom - ly1) / (ly2 - ly1);

        const srcLeft = Math.round(normLeft * lw);
        const srcTop = Math.round(normTop * lh);
        const srcRight = Math.round(normRight * lw);
        const srcBottom = Math.round(normBottom * lh);

        const srcW = srcRight - srcLeft;
        const srcH = srcBottom - srcTop;
        if (srcW < 1 || srcH < 1) continue;

        const _tx = tx, _ty = ty, _z = z;
        tasks.push(async () => {
          const overlay = await sharp(levelDDS.data, {
            raw: { width: lw, height: lh, channels: 4 },
          })
            .extract({ left: srcLeft, top: srcTop, width: srcW, height: srcH })
            .resize(destW, destH, { fit: "fill" })
            .png()
            .toBuffer();

          const tilePath = join(OUT_DIR, String(_z), String(_tx), `${_ty}.png`);

          if (existsSync(tilePath)) {
            const existing = readFileSync(tilePath);
            const pipeline = sharp(existing)
              .composite([{ input: overlay, left: destX, top: destY }]);
            await writeTile(pipeline, _z, _tx, _ty, "png");
          } else {
            const pipeline = sharp({
              create: { width: TILE_SIZE, height: TILE_SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
            }).composite([{ input: overlay, left: destX, top: destY }]);
            await writeTile(pipeline, _z, _tx, _ty, "png");
          }
        });
      }
    }
    await runPool(tasks);
    tiles += tasks.length;
  }

  levelDDS.data = null;
  if (tiles > 0) console.log(`    → ${tiles} tiles`);
  return tiles;
}

// Process individual levels
for (const level of surfaceLevels) {
  const ddsName = LEVEL_TEXTURE_MAP[level.id];
  if (!ddsName) continue;

  const pngPath = join(LEVEL_DDS_DIR, ddsName + ".png");
  const ddsPath = existsSync(pngPath) ? pngPath : join(LEVEL_DDS_DIR, ddsName + ".dds");
  if (!existsSync(ddsPath)) {
    console.log(`  Skipping ${level.id}: ${ddsName} not found`);
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
  const mergedPng = join(LEVEL_DDS_DIR, merged.dds + ".png");
  const ddsPath = existsSync(mergedPng) ? mergedPng : join(LEVEL_DDS_DIR, merged.dds + ".dds");
  if (!existsSync(ddsPath)) {
    console.log(`  Skipping merged ${merged.name}: ${merged.dds} not found`);
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
  minZoom: MIN_ZOOM,
  maxZoom: LEVEL_MAX_ZOOM,
  format: FORMAT,
  detailFormat: "png",
  imageWidth: gw,
  imageHeight: gh,
  scaledWidth: scaledW,
  scaledHeight: scaledH,
  canvasSize,
  baseMaxZoom: BASE_MAX_ZOOM,
  globalMaxZoom: GLOBAL_MAX_ZOOM,
};
const metaPath = join(OUT_DIR, "metadata.json");
writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
console.log(`\nMetadata written to ${metaPath}`);
console.log("Done!");

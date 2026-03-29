/**
 * Upscale per-level map DDS files using Real-ESRGAN.
 *
 * Decodes each DDS to PNG, runs Real-ESRGAN 4× upscale, then converts
 * back to DDS (via sharp → raw RGBA for the tile generator to consume).
 * The upscaled PNGs are kept as the output — the tile generator can
 * decode DDS directly, but this script also produces PNG for inspection.
 *
 * Usage: node scripts/upscale-map-dds.mjs [--scale 4] [--model realesrgan-x4plus]
 *
 * Requires: realesrgan-ncnn-vulkan in the project root.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { createRequire } from "module";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const parseDDS = require("parse-dds");
const decodeDXT = require("decode-dxt");

const ROOT = join(import.meta.dirname, "..");
const LEVEL_DDS_DIR = join(ROOT, "map_images");
const ESRGAN_EXE = join(ROOT, "realesrgan", "realesrgan-ncnn-vulkan.exe");
const MODELS_DIR = join(ROOT, "realesrgan", "models");
const TEMP_DIR = join(ROOT, ".upscale-temp");

function parseArg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : fallback;
}

const SCALE = Number(parseArg("scale", 4));
const MODEL = parseArg("model", "realesrgan-x4plus");

// DDS files to upscale — add entries here as needed
const FILES_TO_UPSCALE = [
  "map_aes_1",
  "map_aes_2",
  "map_k01_darkscape",
  "map_l04_darkvalley",
  "map_l09_deadcity",
  "map_y04_pole",
  "map_l10_radar",
  "map_l13_generators",
  "map_limansk",
  "map_escape",
  "map_garbage",
  "map_hospital",
];

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

if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });

for (const name of FILES_TO_UPSCALE) {
  const ddsPath = join(LEVEL_DDS_DIR, name + ".dds");
  if (!existsSync(ddsPath)) {
    console.log(`Skipping ${name}: ${name}.dds not found`);
    continue;
  }

  console.log(`\n=== ${name} ===`);

  // Decode DDS to PNG
  const dds = decodeDDSFile(ddsPath);
  const inputPng = join(TEMP_DIR, `${name}.png`);
  const outputPng = join(TEMP_DIR, `${name}_up.png`);

  await sharp(dds.data, { raw: { width: dds.width, height: dds.height, channels: 4 } })
    .png()
    .toFile(inputPng);
  console.log(`  Saved temp PNG: ${dds.width}x${dds.height}`);

  // Run Real-ESRGAN
  const cmd = `"${ESRGAN_EXE}" -i "${inputPng}" -o "${outputPng}" -s ${SCALE} -n ${MODEL} -m "${MODELS_DIR}" -f png`;
  console.log(`  Upscaling ${SCALE}x with ${MODEL}...`);
  try {
    execSync(cmd, { stdio: "inherit" });
  } catch (e) {
    console.error(`  FAILED: ${e.message}`);
    continue;
  }

  // Copy upscaled PNG to the map directory for the tile generator
  const finalPath = join(LEVEL_DDS_DIR, `${name}_upscale.png`);
  const upscaled = readFileSync(outputPng);
  writeFileSync(finalPath, upscaled);

  const meta = await sharp(outputPng).metadata();
  console.log(`  Output: ${meta.width}x${meta.height} → ${finalPath}`);

  // Clean up temp files
  unlinkSync(inputPng);
  unlinkSync(outputPng);
}

console.log("\nDone! Update LEVEL_TEXTURE_MAP to use the _upscale files.");

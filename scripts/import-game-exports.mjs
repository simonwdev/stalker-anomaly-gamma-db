/**
 * Import exported CSV files from the GAMMA game directory into a pack's data folder.
 *
 * All CSVs are copied from --src to data/<pack>/.
 * Translation CSVs (en_us.csv, ru_ru.csv, fr_fr.csv) are replaced by default.
 * Pass --merge-translations to merge new keys into existing translation files instead.
 *
 * Usage:
 *   node scripts/import-game-exports.mjs --pack gamma-0.9.4 --src "C:\Stalker_GAMMA\overwrite\bin"
 *   node scripts/import-game-exports.mjs --pack gamma-0.9.4 --src "C:\Stalker_GAMMA\overwrite\bin" --merge-translations
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, copyFileSync } from "fs";
import { join } from "path";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
        args[key] = argv[i + 1];
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

const args = parseArgs(process.argv);
const pack = args.pack;
const srcDir = args.src;
const mergeTranslations = !!args["merge-translations"];

if (!pack || !srcDir) {
  console.error('Usage: node scripts/import-game-exports.mjs --pack <pack-id> --src "<game-bin-path>" [--merge-translations]');
  process.exit(1);
}

const destDir = join(import.meta.dirname, "..", "data", pack);

if (!existsSync(srcDir)) {
  console.error(`Source directory not found: ${srcDir}`);
  process.exit(1);
}
if (!existsSync(destDir)) {
  console.error(`Destination directory not found: ${destDir}`);
  process.exit(1);
}

const TRANSLATION_FILES = new Set(["en_us.csv", "ru_ru.csv", "fr_fr.csv"]);

const srcFiles = readdirSync(srcDir).filter((f) => f.endsWith(".csv"));
if (srcFiles.length === 0) {
  console.log("No CSV files found in source directory.");
  process.exit(0);
}

let copied = 0;
let merged = 0;

for (const file of srcFiles) {
  const srcPath = join(srcDir, file);
  const destPath = join(destDir, file);

  if (mergeTranslations && TRANSLATION_FILES.has(file)) {
    const existing = new Map();
    if (existsSync(destPath)) {
      const text = readFileSync(destPath, "utf-8");
      for (const line of text.split(/\r?\n/)) {
        if (!line.trim()) continue;
        const sep = line.indexOf(",");
        if (sep > 0) {
          existing.set(line.slice(0, sep), line);
        }
      }
    }

    const existingCount = existing.size;
    const srcText = readFileSync(srcPath, "utf-8");
    let added = 0;
    for (const line of srcText.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const sep = line.indexOf(",");
      if (sep <= 0) continue;
      const key = line.slice(0, sep);
      if (key === "Translation Key") continue;
      if (!existing.has(key)) {
        existing.set(key, line);
        added++;
      }
    }

    const lines = [];
    for (const [, line] of existing) {
      if (line.startsWith("Translation Key,")) continue;
      lines.push(line);
    }
    writeFileSync(destPath, lines.join("\n") + "\n");
    console.log(`${file}: merged ${added} new keys (${existingCount} → ${existing.size} total)`);
    merged++;
  } else {
    copyFileSync(srcPath, destPath);
    console.log(`${file}: copied`);
    copied++;
  }
}

console.log(`\nDone. ${copied} files copied${merged ? `, ${merged} translation files merged` : ""}.`);

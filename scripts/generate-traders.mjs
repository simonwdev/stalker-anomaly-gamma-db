#!/usr/bin/env node
/**
 * Converts trader CSV files from data/<pack>/traders/ into JSON
 * and writes them to site/public/data/<pack>/traders/.
 *
 * Usage: node scripts/generate-traders.mjs [--pack gamma-0.9.5]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function coerce(val) {
  if (val === '') return '';
  if (!isNaN(val)) return Number(val);
  return val;
}

/**
 * Parse a trader CSV into a compact JSON-friendly structure.
 *
 * - The header row (with names like st_data_export_*, ~) is discarded.
 * - "data.csv" (key-value pairs) → plain object { key: value }
 * - All other files → array of arrays [[id, v1, v2, ...], ...]
 *   Rows where every value column is empty are omitted.
 */
function parseCSV(text, fileName) {
  const lines = text.replace(/\r\n/g, '\n').trimEnd().split('\n');
  if (lines.length < 2) return [];

  const headerCount = lines[0].split(',').length;
  const isKeyValue = headerCount === 2 && fileName === 'data';

  if (isKeyValue) {
    const obj = {};
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const idx = line.indexOf(',');
      const key = line.slice(0, idx).trim();
      const val = coerce(line.slice(idx + 1).trim());
      if (key && val !== '') obj[key] = val;
    }
    return obj;
  }

  // Array-style: supplies, conditions, discounts, buy_supplies, etc.
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const parts = line.split(',');
    const id = parts[0].trim();
    if (!id) continue;
    const values = parts.slice(1).map(v => coerce(v.trim()));
    // Skip rows where all value columns are empty
    if (values.every(v => v === '')) continue;
    if (values.length === 1) {
      rows.push([id, values[0]]);
    } else {
      rows.push([id, ...values]);
    }
  }
  return rows;
}

function processTraderDir(traderPath) {
  const files = fs.readdirSync(traderPath).filter(f => f.endsWith('.csv'));
  const traderData = {};

  for (const file of files) {
    const key = path.basename(file, '.csv');
    const content = fs.readFileSync(path.join(traderPath, file), 'utf-8');
    traderData[key] = parseCSV(content, key);
  }

  return traderData;
}

export function generateTraders(pack) {
  const srcDir = path.join(ROOT, 'data', pack, 'traders');
  const outDir = path.join(ROOT, 'site', 'public', 'data', pack, 'traders');

  if (!fs.existsSync(srcDir)) {
    console.error(`Source directory not found: ${srcDir}`);
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  const traderDirs = fs.readdirSync(srcDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  let totalFiles = 0;
  for (const traderName of traderDirs) {
    const traderPath = path.join(srcDir, traderName);
    const traderData = processTraderDir(traderPath);
    const outFile = path.join(outDir, `${traderName}.json`);
    fs.writeFileSync(outFile, JSON.stringify(traderData, null, 2));
    const csvCount = Object.keys(traderData).length;
    totalFiles += csvCount;
    console.log(`  ${traderName}: ${csvCount} CSV files → ${traderName}.json`);
  }

  console.log(`\nDone! Processed ${totalFiles} CSV files from ${traderDirs.length} traders → ${outDir}`);

  // Generate traders-meta.json alongside other pack-level JSON files
  const metaOutFile = path.join(outDir, '..', 'traders-meta.json');

  // Preserve any colors the user has already set manually
  let colorMap = {};
  try {
    const existing = JSON.parse(fs.readFileSync(metaOutFile, 'utf-8'));
    for (const entry of existing) {
      if (entry.id && entry.color) colorMap[entry.id] = entry.color;
    }
  } catch { /* file doesn't exist yet or is malformed — start fresh */ }

  const tradersMeta = traderDirs.map(id => {
    const dataFile = path.join(srcDir, id, 'data.csv');
    let label = '';
    try {
      const data = parseCSV(fs.readFileSync(dataFile, 'utf-8'), 'data');
      label = data.name ?? '';
    } catch { /* no data.csv — leave label empty */ }
    return { id, labelKey: `app_${id}`, label, color: colorMap[id] ?? '' };
  });

  fs.writeFileSync(metaOutFile, JSON.stringify(tradersMeta, null, 2));
  console.log(`Wrote traders-meta.json (${tradersMeta.length} entries) → ${metaOutFile}`);
}

// Run as a script when invoked directly: `node scripts/generate-traders.mjs --pack <id>`
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  let pack = 'gamma-0.9.5';
  const packIdx = args.indexOf('--pack');
  if (packIdx !== -1 && args[packIdx + 1]) {
    pack = args[packIdx + 1];
  }
  generateTraders(pack);
}

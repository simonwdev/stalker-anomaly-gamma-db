#!/usr/bin/env node
/**
 * Converts trader CSV files from data/gamma-0.9.4/traders/ into JSON
 * and writes them to site/public/data/gamma-0.9.4/traders/.
 *
 * Usage: node scripts/generate-traders.mjs [--pack gamma-0.9.4]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
let pack = 'gamma-0.9.4';
const packIdx = args.indexOf('--pack');
if (packIdx !== -1 && args[packIdx + 1]) {
  pack = args[packIdx + 1];
}

const srcDir = path.join(ROOT, 'data', pack, 'traders');
const outDir = path.join(ROOT, 'site', 'public', 'data', pack, 'traders');

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').trimEnd().split('\n');
  if (lines.length === 0) return [];
  const headers = lines[0].split(',');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const values = line.split(',');
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j].trim();
      const val = (values[j] ?? '').trim();
      // Try to convert numeric values
      if (val !== '' && !isNaN(val)) {
        row[key] = Number(val);
      } else {
        row[key] = val;
      }
    }
    rows.push(row);
  }
  return rows;
}

function processTraderDir(traderPath, traderName) {
  const files = fs.readdirSync(traderPath).filter(f => f.endsWith('.csv'));
  const traderData = {};

  for (const file of files) {
    const key = path.basename(file, '.csv');
    const content = fs.readFileSync(path.join(traderPath, file), 'utf-8');
    traderData[key] = parseCSV(content);
  }

  return traderData;
}

// Main
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
  const traderData = processTraderDir(traderPath, traderName);
  const outFile = path.join(outDir, `${traderName}.json`);
  fs.writeFileSync(outFile, JSON.stringify(traderData, null, 2));
  const csvCount = Object.keys(traderData).length;
  totalFiles += csvCount;
  console.log(`  ${traderName}: ${csvCount} CSV files → ${traderName}.json`);
}

console.log(`\nDone! Processed ${totalFiles} CSV files from ${traderDirs.length} traders → ${outDir}`);


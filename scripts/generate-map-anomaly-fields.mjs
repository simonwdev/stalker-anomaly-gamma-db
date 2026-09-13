#!/usr/bin/env node
/**
 * Merges named artefact anomaly fields ("High Hopes", "Crispy Train", …) into the
 * generated map-entities.json as an `anomaly_field` layer.
 *
 * Reads data/<pack>/export_anomaly_fields.csv (from the Universal Anomaly Data
 * Export "Export anomaly fields" command) plus data/<pack>/en_us.csv for display
 * names, projects the fixed world positions to map pixels, and patches the
 * committed site/public/data/<pack>/map-entities.json in place.
 *
 * Standalone so anomaly fields can be refreshed from a CSV alone, without a full
 * in-game map_entities.json re-dump. A full run of generate-map-entities.mjs also
 * includes these fields (both share buildAnomalyFields in map-projection.mjs).
 *
 * Usage: node scripts/generate-map-anomaly-fields.mjs --pack gamma-0.9.5
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildAnomalyFields } from './map-projection.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const args = process.argv.slice(2);
let pack = 'gamma-0.9.5';
const packIdx = args.indexOf('--pack');
if (packIdx !== -1 && args[packIdx + 1]) pack = args[packIdx + 1];

const fields = buildAnomalyFields(root, pack);
if (fields.length === 0) {
  console.error(`No anomaly fields for pack ${pack} (missing/empty export_anomaly_fields.csv?)`);
  process.exit(1);
}

const outPath = resolve(root, 'site', 'public', 'data', pack, 'map-entities.json');
if (!existsSync(outPath)) {
  console.error(`map-entities.json not found: ${outPath} — run generate-map-entities.mjs first`);
  process.exit(1);
}

const data = JSON.parse(readFileSync(outPath, 'utf-8'));
data.entities = data.entities || {};
data.counts = data.counts || {};
data.entities.anomaly_field = fields;
data.counts.anomaly_field = fields.length;

writeFileSync(outPath, JSON.stringify(data, null, 2));
console.log(`Merged ${fields.length} anomaly fields into ${outPath}`);

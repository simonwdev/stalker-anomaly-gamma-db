#!/usr/bin/env node
/**
 * Enriches export_anomaly_fields.csv with each field's anomaly type(s), artefact
 * drop chances, and real map-spot id (`spot`) by reading the [anomal_zone] config
 * files from the GAMMA mods tree.
 *
 * Why offline (not in the in-game exporter): the exporter can read positions and
 * names, but reading a field's bound config via se:spawn_ini() returns nothing for
 * offline server objects, so type/artefact data can't be gathered in-game. Reading
 * the config .ltx files directly is reliable. Limitation: fields whose config is
 * base-packed (in configs.db0, not shipped loose by a mod) can't be read here —
 * they keep their name/position but get no type/artefacts (e.g. Crispy Train).
 *
 * Drop chance: bind_anomaly_zone.spawn_artefact_randomly picks one entry from the
 * artefacts line uniformly (repetition = weight), then one bucket member uniformly,
 * so each artefact's share = sum over its buckets of (1/entry_count)/bucket_size.
 *
 * Run after a fresh export, before generate-map-anomaly-fields.mjs. Idempotent.
 *
 * Usage: node scripts/enrich-anomaly-fields.mjs --pack gamma-0.9.5 [--mods <path>]
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const args = process.argv.slice(2);
const argVal = (flag, def) => { const i = args.indexOf(flag); return i !== -1 && args[i + 1] ? args[i + 1] : def; };
const pack = argVal('--pack', 'gamma-0.9.5');
const modsRoot = argVal('--mods', 'D:/gamma0.9.5/GAMMA/mods');

// Artefacts Reinvention ships the anomaly-field configs + artefact class buckets.
const CFG_ROOT = join(modsRoot, 'G.A.M.M.A. Artefacts Reinvention/gamedata/configs');
const CSV = resolve(root, 'data', pack, 'export_anomaly_fields.csv');

if (!existsSync(CFG_ROOT) || !existsSync(CSV)) {
  console.error(`Missing inputs. configs: ${existsSync(CFG_ROOT)}, csv: ${existsSync(CSV)}. Pass --mods <GAMMA mods path>.`);
  process.exit(1);
}

// Parse an LTX file into { section: { order:[keys in order], kv:{key:value} } }.
function parseLtx(text) {
  const out = {};
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/;.*$/, '').trim();
    if (!line) continue;
    const sec = line.match(/^\[([^\]]+)\]/);
    if (sec) { cur = sec[1]; out[cur] = out[cur] || { order: [], kv: {} }; continue; }
    if (!cur) continue;
    const eq = line.indexOf('=');
    if (eq >= 0) { const k = line.slice(0, eq).trim(); out[cur].kv[k] = line.slice(eq + 1).trim(); out[cur].order.push(k); }
    else out[cur].order.push(line.trim());
  }
  return out;
}

// All *_anomal_zone.ltx keyed by basename (== restrictor object name).
const cfgByBase = {};
(function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (e.endsWith('_anomal_zone.ltx')) cfgByBase[e.replace(/\.ltx$/, '')] = p;
  }
})(join(CFG_ROOT, 'scripts'));

// Artefact class buckets (sections whose lines are bare af_* members).
const artefactsLtx = parseLtx(readFileSync(join(CFG_ROOT, 'items/settings/artefacts.ltx'), 'utf-8'));
const bucketMembers = {};
for (const [sec, data] of Object.entries(artefactsLtx)) {
  const members = data.order.filter((k) => /^af_\w+$/.test(k) && !(k in data.kv));
  if (members.length) bucketMembers[sec] = members;
}

// Anomaly-type keyword (underscore segment of a field/mine name) → display label.
const typeSeg = {
  acidic: 'Chemical', acid: 'Chemical', chemical: 'Chemical',
  thermal: 'Thermal', burning: 'Thermal', fire: 'Thermal',
  gravitational: 'Gravitational',
  electric: 'Electro', electra: 'Electro', electr: 'Electro', tesla: 'Electro',
  radioactive: 'Radioactive', radiation: 'Radioactive',
  psychic: 'Psi', psi: 'Psi',
};
// Artefact class-bucket segment (af_class_gravi_musor, af_class_psio-gravi_mid) → label.
const artefactClassSeg = {
  gravi: 'Gravitational', electro: 'Electro', thermo: 'Thermal',
  chem: 'Chemical', psio: 'Psi', rad: 'Radioactive',
};
function collectTypes(str, set, seen, segMap = typeSeg) {
  if (!str) return;
  for (const seg of str.toLowerCase().match(/[a-z]+/g) || []) {
    const lbl = segMap[seg];
    if (lbl && !seen.has(lbl)) { seen.add(lbl); set.push(lbl); }
  }
}

function enrich(id, fieldName) {
  const path = cfgByBase[id];
  if (!path) return { types: '', arts: '', spot: '', found: false };
  const cfg = parseLtx(readFileSync(path, 'utf-8'));
  const az = cfg['anomal_zone'];
  if (!az) return { types: '', arts: '', spot: '', found: false };

  // Artefact drop shares.
  const toks = (az.kv['artefacts'] || '').split(/[\s,]+/).filter(Boolean);
  const prob = {};
  for (const tok of toks) {
    const members = bucketMembers[tok] || [tok]; // non-bucket token = its own single pool
    const w = (1 / toks.length) / members.length;
    for (const m of members) prob[m] = (prob[m] || 0) + w;
  }
  const arts = Object.entries(prob)
    .map(([sec, p]) => ({ sec, pct: p * 100 }))
    .sort((a, b) => (Math.abs(a.pct - b.pct) > 0.001 ? b.pct - a.pct : a.sec.localeCompare(b.sec)))
    .map((a) => `${a.sec}:${a.pct.toFixed(1)}`);

  // Types: field_name segments (covers generic radioactive fields) + mine names.
  const types = [], seen = new Set();
  collectTypes(fieldName, types, seen);
  collectTypes(az.kv['field_name'], types, seen);
  const layers = parseInt(az.kv['layers_count'] || '1', 10) || 1;
  for (let li = 1; li <= layers; li++) {
    const lsec = cfg['layer_' + li];
    const msec = lsec && cfg[lsec.kv['mines_section']];
    if (msec) for (const mine of msec.order) collectTypes(mine, types, seen);
  }
  // Fallback for fields whose config names no typed field/mines (common on CoP
  // levels): infer from the artefact classes the field spawns.
  if (!types.length) {
    for (const tok of toks) if (tok.startsWith('af_class_')) collectTypes(tok, types, seen, artefactClassSeg);
  }

  const spot = (az.kv['field_name'] || '').split(',')[0].trim(); // first of any comma list
  return { types: types.join('; '), arts: arts.join(';'), spot, found: true };
}

// Quote-safe CSV line splitter.
function splitCsv(line) {
  const o = []; let c = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"') { if (line[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { o.push(c); c = ''; }
    else c += ch;
  }
  o.push(c);
  return o;
}
const q = (s) => (/[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);

const lines = readFileSync(CSV, 'utf-8').split(/\r?\n/).filter(Boolean);
const inHdr = lines[0].split(',');
const ix = (name) => inHdr.indexOf(name);
const OUT_COLS = ['id', 'name_key', 'field_name', 'spot', 'level', 'x', 'y', 'z', 'anomaly_types', 'artefacts'];
const out = [OUT_COLS.join(',')];
let enriched = 0;
for (let i = 1; i < lines.length; i++) {
  const c = splitCsv(lines[i]);
  const id = c[ix('id')];
  const fieldName = c[ix('field_name')] || '';
  const { types, arts, spot, found } = enrich(id, fieldName);
  if (found && (types || arts)) enriched++;
  const row = {
    id, name_key: c[ix('name_key')] || '', field_name: fieldName,
    spot: (found && spot) ? spot : fieldName,
    level: c[ix('level')] || '', x: c[ix('x')] || '', y: c[ix('y')] || '', z: c[ix('z')] || '',
    anomaly_types: types, artefacts: arts,
  };
  out.push(OUT_COLS.map((k) => q(row[k])).join(','));
}
writeFileSync(CSV, out.join('\n') + '\n');
console.log(`Enriched ${enriched}/${lines.length - 1} fields (${Object.keys(cfgByBase).length} configs, ${Object.keys(bucketMembers).length} buckets) → ${CSV}`);

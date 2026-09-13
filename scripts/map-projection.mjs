#!/usr/bin/env node
/**
 * Shared map-projection tables + helpers.
 *
 * Single source of truth for turning world-space (x, z) coordinates into global
 * map pixel coordinates (1024×2634 image space). Imported by
 * generate-map-entities.mjs and generate-map-anomaly-fields.mjs so the two never
 * drift apart.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ── Global rects: where each level sits on the 1024×2634 global map ─────
// From game_maps_single.ltx global_rect values (left, top, right, bottom)
export const globalRects = {
  jupiter:              { left: 277, top: 783, right: 459, bottom: 965 },
  k00_marsh:            { left: 22, top: 2113, right: 352, bottom: 2443 },
  k01_darkscape:        { left: 701, top: 2071, right: 1020, bottom: 2392.345 },
  k02_trucks_cemetery:  { left: 706, top: 1382, right: 1025, bottom: 1703.345 },
  l01_escape:           { left: 358, top: 2022, right: 564, bottom: 2434 },
  l02_garbage:          { left: 369, top: 1776, right: 573, bottom: 1980 },
  l03_agroprom:         { left: 164, top: 1848, right: 332, bottom: 2016 },
  l04_darkvalley:       { left: 728, top: 1705, right: 852, bottom: 1953 },
  l05_bar:              { left: 407, top: 1414, right: 556, bottom: 1712 },
  l06_rostok:           { left: 258, top: 1414, right: 407, bottom: 1712 },
  l07_military:         { left: 425, top: 1231, right: 590, bottom: 1396 },
  l08_yantar:           { left: 101, top: 1572, right: 249, bottom: 1720 },
  l09_deadcity:         { left: -6, top: 1220, right: 248, bottom: 1481 },
  l10_limansk:          { left: 66, top: 874, right: 182, bottom: 1105 },
  l10_radar:            { left: 527, top: 975, right: 769, bottom: 1218.705 },
  l10_red_forest:       { left: 198, top: 1028, right: 380, bottom: 1210 },
  l11_hospital:         { left: 194, top: 694, right: 246, bottom: 798 },
  l11_pripyat:          { left: 607, top: 762, right: 740, bottom: 909 },
  l12_stancia:          { left: 322, top: 298, right: 728, bottom: 495 },
  l12_stancia_2:        { left: 322, top: 101, right: 728, bottom: 298 },
  l13_generators:       { left: 195, top: -40, right: 414, bottom: 179 },
  pripyat:              { left: 679, top: 718, right: 888, bottom: 927 },
  zaton:                { left: 291, top: 574, right: 473, bottom: 756 },
  y04_pole:             { left: 457, top: 1965, right: 698.98, bottom: 2205 },
};

// ── Real level bounds from level.ltx bound_rect (minX, minZ, maxX, maxZ) ─
// Extracted from db/levels/level_*.db0 → levels/*/level.ltx
export const levelBounds = {
  jupiter:              { minX: -600, maxX: 600, minZ: -600, maxZ: 600 },
  jupiter_underground:  { minX: -390.808, maxX: 349.192, minZ: -265.132, maxZ: 474.868 },
  k00_marsh:            { minX: -445, maxX: 755, minZ: -445, maxZ: 755 },
  k01_darkscape:        { minX: -702, maxX: 708.5, minZ: -704.09, maxZ: 716.778 },
  k02_trucks_cemetery:  { minX: -543.948, maxX: 387.099, minZ: -472.689, maxZ: 467.012 },
  l01_escape:           { minX: -335, maxX: 415, minZ: -630, maxZ: 870 },
  l02_garbage:          { minX: -370, maxX: 370, minZ: -422, maxZ: 327.867 },
  l03_agroprom:         { minX: -275, maxX: 335, minZ: -370, maxZ: 240 },
  l03u_agr_underground: { minX: -21.868, maxX: 161.91, minZ: -208.824, maxZ: 195.815 },
  l04_darkvalley:       { minX: -215, maxX: 235, minZ: -665, maxZ: 235 },
  l04u_labx18:          { minX: -52.316, maxX: 49.368, minZ: -39.219, maxZ: 82.368 },
  l05_bar:              { minX: 0, maxX: 512, minZ: -512.03, maxZ: 512.001 },
  l06_rostok:           { minX: -512, maxX: 0, minZ: -512.03, maxZ: 512.001 },
  l07_military:         { minX: -420, maxX: 180, minZ: -105, maxZ: 495 },
  l08_yantar:           { minX: -270, maxX: 270, minZ: -405, maxZ: 135 },
  l08u_brainlab:        { minX: -149.45, maxX: 157.072, minZ: -45.408, maxZ: 25.718 },
  l09_deadcity:         { minX: -481.497, maxX: 379.976, minZ: -412.284, maxZ: 474.479 },
  l10_limansk:          { minX: -210, maxX: 210, minZ: -415, maxZ: 425 },
  l10_radar:            { minX: -320.405, maxX: 890.625, minZ: -658.741, maxZ: 557.681 },
  l10_red_forest:       { minX: -285, maxX: 375, minZ: -485, maxZ: 175 },
  l10u_bunker:          { minX: -75.655, maxX: 30.716, minZ: -112.497, maxZ: 85.01 },
  l11_hospital:         { minX: -180, maxX: 10, minZ: 537, maxZ: 917 },
  l11_pripyat:          { minX: -628.133, maxX: 671.867, minZ: -520.743, maxZ: 779.257 },
  // CNPP: Anomaly's half-height split of one shared world space at Z=52.879.
  // South is level.ltx [level_map] bound_rect; North is inferred from map_aes_2's
  // framing (same X span and 800-unit height, abutting South).
  l12_stancia:          { minX: -254.776, maxX: 1398.44, minZ: -747.782, maxZ: 52.879 },
  l12_stancia_2:        { minX: -254.776, maxX: 1398.44, minZ: 52.879, maxZ: 852.879 },
  l12u_control_monolith:{ minX: -43.996, maxX: 43.947, minZ: -44.348, maxZ: 40.702 },
  l12u_sarcofag:        { minX: -34.982, maxX: 102.851, minZ: -43.51, maxZ: 55.244 },
  l13_generators:       { minX: -525.205, maxX: 540.927, minZ: -853.156, maxZ: 209.524 },
  l13u_warlab:          { minX: -51.513, maxX: 51.513, minZ: -80.721, maxZ: 43.721 },
  labx8:                { minX: -122.441, maxX: -40.441, minZ: 44.614, maxZ: 126.614 },
  pripyat:              { minX: -550, maxX: 550, minZ: -550, maxZ: 550 },
  y04_pole:             { minX: -544.541, maxX: 555.461, minZ: -615.296, maxZ: 484.704 },
  zaton:                { minX: -600, maxX: 600, minZ: -615, maxZ: 585 },
};

// ── Underground / tiny levels excluded from the surface map ─────────────
export const excludedLevels = new Set([
  'fake_start',
  'jupiter_underground', 'labx8',
  'l03u_agr_underground', 'l04u_labx18', 'l08u_brainlab',
  'l10u_bunker', 'l12u_control_monolith', 'l12u_sarcofag', 'l13u_warlab',
]);

// Project world (x, z) on `level` to global image pixels (1024 × 2634).
// X maps left→right; Z maps bottom→top (higher Z = north = lower Y on image).
// Returns null when the level has no rect/bounds (caller decides to skip).
export function worldToPixels(level, x, z) {
  const bounds = levelBounds[level];
  const rect = globalRects[level];
  if (!bounds || !rect) return null;

  const rangeX = bounds.maxX - bounds.minX;
  const rangeZ = bounds.maxZ - bounds.minZ;
  const normX = rangeX > 0 ? (x - bounds.minX) / rangeX : 0.5;
  const normZ = rangeZ > 0 ? (z - bounds.minZ) / rangeZ : 0.5;

  return {
    mapX: Math.round((rect.left + normX * (rect.right - rect.left)) * 100) / 100,
    mapY: Math.round((rect.bottom - normZ * (rect.bottom - rect.top)) * 100) / 100,
  };
}

// Minimal CSV line splitter: handles double-quoted fields with embedded commas
// and escaped quotes (""). Sufficient for the exporter's output.
function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

// Load an exporter translation CSV ("key,value" rows) into a Map.
function loadTranslations(path) {
  const map = new Map();
  if (!existsSync(path)) return map;
  const text = readFileSync(path, 'utf-8');
  const lines = text.split(/\r?\n/);
  for (let i = 1; i < lines.length; i++) { // skip header row
    const line = lines[i];
    if (!line) continue;
    const cols = splitCsvLine(line);
    if (cols.length >= 2 && cols[0]) map.set(cols[0], cols[1]);
  }
  return map;
}

// Map artefact section → display name using export_artefacts.csv (col 0 = section,
// col 1 = name key) resolved through the translation map. Falls back to the key.
function loadArtefactNames(rootDir, pack, translations) {
  const map = new Map();
  const path = resolve(rootDir, 'data', pack, 'export_artefacts.csv');
  if (!existsSync(path)) return map;
  const lines = readFileSync(path, 'utf-8').split(/\r?\n/);
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const c = splitCsvLine(lines[i]);
    if (c.length >= 2 && c[0]) map.set(c[0], translations.get(c[1]) || c[1]);
  }
  return map;
}

// Fallback artefact name from its section: af_night_star → "Night Star".
function prettifyArtefact(section) {
  return section.replace(/^af_/, '').replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

// Build projected `anomaly_field` entities from export_anomaly_fields.csv.
// Only NAMED fields (those with a resolvable "High Hopes"-style display name) are
// emitted; unnamed generic zones (Jupiter/Zaton CoP fields) are skipped. When the
// exporter includes them, each field also carries anomalyTypes (e.g. ["Chemical"])
// and artefacts (resolved display names). Returns [] when the CSV is absent.
export function buildAnomalyFields(rootDir, pack) {
  const csvPath = resolve(rootDir, 'data', pack, 'export_anomaly_fields.csv');
  if (!existsSync(csvPath)) return [];

  const translations = loadTranslations(resolve(rootDir, 'data', pack, 'en_us.csv'));
  const artefactNames = loadArtefactNames(rootDir, pack, translations);

  // Authoritative PDA map-spot names (spot id → display text), keyed by the
  // config field_name. Generated by generate-anomaly-spot-names.mjs.
  let spotNames = {};
  const spotPath = resolve(rootDir, 'data', pack, 'anomaly_spot_names.json');
  if (existsSync(spotPath)) {
    try { spotNames = JSON.parse(readFileSync(spotPath, 'utf-8')); } catch { /* ignore */ }
  }
  const stripAnomaly = (s) => (s || '').replace(/\s+Anomaly$/i, '').trim();

  const text = readFileSync(csvPath, 'utf-8');
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = splitCsvLine(lines[0]);
  const col = Object.fromEntries(header.map((h, i) => [h.trim(), i]));

  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const c = splitCsvLine(lines[i]);
    const nameKey = (c[col.name_key] || '').trim();
    const spot = (c[col.spot] || '').trim();

    // Display name: PDA registry (authoritative, by config field_name) first,
    // then the object-derived translation key. Skip fields with neither.
    const label = stripAnomaly(spotNames[spot]) || stripAnomaly(translations.get(nameKey));
    if (!label) continue;

    const level = (c[col.level] || '').trim();
    if (excludedLevels.has(level)) continue;

    const x = parseFloat(c[col.x]);
    const z = parseFloat(c[col.z]);
    if (!Number.isFinite(x) || !Number.isFinite(z)) continue;

    const px = worldToPixels(level, x, z);
    if (!px) continue;

    // Optional enrichment (present once the exporter emits these columns).
    const anomalyTypes = (c[col.anomaly_types] || '')
      .split(';').map((s) => s.trim()).filter(Boolean);
    // Each artefact entry is "section:percent" (percent = drop share); older
    // exports without the colon degrade to name-only.
    const artefacts = (c[col.artefacts] || '')
      .split(';').map((s) => s.trim()).filter(Boolean)
      .map((entry) => {
        const idx = entry.lastIndexOf(':');
        const sec = idx >= 0 ? entry.slice(0, idx) : entry;
        const pct = idx >= 0 ? parseFloat(entry.slice(idx + 1)) : NaN;
        const name = artefactNames.get(sec) || prettifyArtefact(sec);
        return Number.isFinite(pct) ? { name, chance: pct } : { name };
      });

    out.push({
      id: (c[col.id] || '').trim(),
      name: (c[col.field_name] || '').trim(),
      label,
      label_key: nameKey,
      section: (c[col.field_name] || '').trim(),
      type: 'anomaly_field',
      level,
      mapX: px.mapX,
      mapY: px.mapY,
      ...(anomalyTypes.length ? { anomalyTypes } : {}),
      ...(artefacts.length ? { artefacts } : {}),
    });
  }

  out.sort((a, b) => (a.level === b.level ? a.label.localeCompare(b.label) : a.level.localeCompare(b.level)));
  return out;
}

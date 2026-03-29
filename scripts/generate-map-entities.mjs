#!/usr/bin/env node
/**
 * Transforms map_entities.json world-space coordinates into global map pixel
 * coordinates (1024×2634 image space) using global_rect from game_maps_single.ltx
 * and level_bounds from the dump.
 *
 * Usage: node scripts/generate-map-entities.mjs --pack gamma-0.9.4
 * Output: site/public/data/<pack>/map_entities.json
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ── Args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let pack = 'gamma-0.9.4';
const packIdx = args.indexOf('--pack');
if (packIdx !== -1 && args[packIdx + 1]) pack = args[packIdx + 1];

// ── Global rects: where each level sits on the 1024×2634 global map ─────
// From game_maps_single.ltx global_rect values (left, top, right, bottom)
const globalRects = {
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

// ── Load map_entities.json ──────────────────────────────────────────────────
const dumpPath = resolve(root, 'data', pack, 'map_entities.json');
const dump = JSON.parse(readFileSync(dumpPath, 'utf-8'));
const { entities } = dump;

// ── Real level bounds from level.ltx bound_rect (minX, minZ, maxX, maxZ) ─
// Extracted from db/levels/level_*.db0 → levels/*/level.ltx
const level_bounds = {
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
  l12_stancia:          { minX: -600.105, maxX: 1729.65, minZ: -747.782, maxZ: 850.523 },
  l12_stancia_2:        { minX: -603.302, maxX: 1729.65, minZ: -930.571, maxZ: 966.97 },
  l12u_control_monolith:{ minX: -43.996, maxX: 43.947, minZ: -44.348, maxZ: 40.702 },
  l12u_sarcofag:        { minX: -34.982, maxX: 102.851, minZ: -43.51, maxZ: 55.244 },
  l13_generators:       { minX: -525.205, maxX: 540.927, minZ: -853.156, maxZ: 209.524 },
  l13u_warlab:          { minX: -51.513, maxX: 51.513, minZ: -80.721, maxZ: 43.721 },
  labx8:                { minX: -122.441, maxX: -40.441, minZ: 44.614, maxZ: 126.614 },
  pripyat:              { minX: -550, maxX: 550, minZ: -550, maxZ: 550 },
  y04_pole:             { minX: -544.541, maxX: 555.461, minZ: -615.296, maxZ: 484.704 },
  zaton:                { minX: -600, maxX: 600, minZ: -615, maxZ: 585 },
};

// ── Underground / tiny levels to exclude from the surface map ───────────
const excludedLevels = new Set([
  'fake_start',
  'jupiter_underground', 'labx8',
  'l03u_agr_underground', 'l04u_labx18', 'l08u_brainlab',
  'l10u_bunker', 'l12u_control_monolith', 'l12u_sarcofag', 'l13u_warlab',
]);

// ── Types to exclude from output (too many, dynamic in GAMMA, or unused) ─
// Anomalies are dynamic (re-randomize per level load) — only available via save import
const excludedTypes = new Set(['anomaly']);

// ── Transform ───────────────────────────────────────────────────────────
let mapped = 0;
let skipped = 0;
let noRect = new Set();

const output = [];

for (const ent of entities) {
  const { level, x, y, z } = ent;

  if (excludedLevels.has(level)) { skipped++; continue; }
  if (excludedTypes.has(ent.type)) { skipped++; continue; }

  const bounds = level_bounds[level];
  const rect = globalRects[level];

  if (!bounds || !rect) {
    noRect.add(level);
    skipped++;
    continue;
  }

  const rangeX = bounds.maxX - bounds.minX;
  const rangeZ = bounds.maxZ - bounds.minZ;

  // Normalize to 0..1 within level world bounds
  const normX = rangeX > 0 ? (x - bounds.minX) / rangeX : 0.5;
  const normZ = rangeZ > 0 ? (z - bounds.minZ) / rangeZ : 0.5;

  // Map to global image pixels (1024 × 2634)
  // X maps left→right, Z maps bottom→top (higher Z = north = lower Y on image)
  const mapX = rect.left + normX * (rect.right - rect.left);
  const mapY = rect.bottom - normZ * (rect.bottom - rect.top);

  output.push({
    id:    ent.id,
    name:  ent.name,
    ...(ent.label ? { label: ent.label } : {}),
    ...(ent.label_key ? { label_key: ent.label_key } : {}),
    ...(ent.char_name ? { char_name: ent.char_name } : {}),
    ...(ent.role ? { role: ent.role } : {}),
    ...(ent.faction ? { faction: ent.faction } : {}),
    section: ent.section,
    type:  ent.type,
    level: ent.level,
    mapX:  Math.round(mapX * 100) / 100,
    mapY:  Math.round(mapY * 100) / 100,
  });
  mapped++;
}

// ── Resolve NPC locations from nearest smart terrain ────────────────────
const trPath = resolve(root, 'data', pack, 'map_entities_translations_en.json');
let translations = {};
try { translations = JSON.parse(readFileSync(trPath, 'utf-8')); } catch {}

// ── Parse smart terrain configs for faction/mutant data ──────────────────
const smartConfigDir = 'C:\\Stalker_Anomaly\\tools\\_unpacked\\configs\\scripts';
const stFactionData = {};
const knownFactions = new Set(['stalker','duty','freedom','bandit','army','monolith','killer','ecolog','csky','renegade','greh','isg','zombied','merc']);
try {
  for (const level of readdirSync(smartConfigDir)) {
    const smartDir = join(smartConfigDir, level, 'smart');
    if (!existsSync(smartDir)) continue;
    for (const file of readdirSync(smartDir)) {
      if (!file.endsWith('.ltx')) continue;
      const name = file.replace('.ltx', '');
      const content = readFileSync(join(smartDir, file), 'utf-8');

      const factions = new Set();
      const mutants = new Set();
      const spawnMatches = content.matchAll(/spawn_squads\s*=\s*(.+)/g);
      for (const sm of spawnMatches) {
        for (let sq of sm[1].split(',')) {
          sq = sq.trim().split(';')[0].trim(); // strip comments
          if (!sq) continue;
          if (sq.startsWith('simulation_')) {
            const mut = sq.replace('simulation_', '').replace(/_\d.*$/, '');
            mutants.add(mut);
          } else {
            const fac = sq.split('_sim_')[0];
            if (knownFactions.has(fac)) factions.add(fac);
          }
        }
      }

      if (factions.size || mutants.size) {
        stFactionData[name] = {
          factions: [...factions],
          mutants: [...mutants],
          isMutant: mutants.size > 0 && factions.size === 0,
        };
      }
    }
  }
  console.log(`Parsed ${Object.keys(stFactionData).length} smart terrain configs for faction data`);
} catch (e) {
  console.warn('Warning: could not parse smart terrain configs:', e.message);
}

// Resolve smart terrain display names and attach faction data
const smartTerrains = entities.filter(e => e.type === 'smart_terrain');
for (const ent of output) {
  if (ent.type === 'smart_terrain') {
    const stKey = `st_${ent.name}_name`;
    const locName = translations[stKey] || '';
    if (locName) ent.location = locName;
    const stData = stFactionData[ent.name];
    if (stData) {
      if (stData.factions.length) ent.factions = stData.factions;
      if (stData.mutants.length) ent.mutants = stData.mutants;
      if (stData.isMutant) ent.isMutant = true;
    }
  }
  if (ent.type !== 'named_npc') continue;
  // Find nearest smart terrain on same level (using world coords from raw dump)
  const raw = entities.find(e => e.id === ent.id);
  if (!raw) continue;
  const sameLvl = smartTerrains.filter(s => s.level === raw.level);
  let best = null, bestDist = Infinity;
  for (const st of sameLvl) {
    const dx = st.x - raw.x, dz = st.z - raw.z;
    const dist = dx * dx + dz * dz;
    if (dist < bestDist) { bestDist = dist; best = st; }
  }
  if (best) {
    const stKey = `st_${best.name}_name`;
    const locName = translations[stKey] || '';
    if (locName) ent.location = locName;
  }
}

// ── Resolve land names (PDA map landmarks) from st_land_names.xml ────────
const landNamesPath = 'C:\\Stalker_Anomaly\\tools\\_unpacked\\configs\\text\\eng\\st_land_names.xml';
const landNames = {};
try {
  const xml = readFileSync(landNamesPath, 'utf-8');
  const re = /<string id="st_(.+?)_name_land">\s*<text>(.+?)<\/text>/gs;
  let m;
  while ((m = re.exec(xml)) !== null) {
    landNames[m[1]] = m[2];
  }
  console.log(`Loaded ${Object.keys(landNames).length} land names from st_land_names.xml`);
} catch {
  console.warn('Warning: could not load st_land_names.xml');
}

// Match land names to entities, skip if a location with the same short name exists on that level
const existingLocations = new Set();
for (const ent of output) {
  if (ent.type === 'smart_terrain' && ent.location) {
    const short = ent.location.replace(/^[^-]+ - /, '').toLowerCase();
    existingLocations.add(`${ent.level}:${short}`);
  }
}

for (const [landId, landName] of Object.entries(landNames)) {
  const match = output.find(e => e.name === landId)
    || output.find(e => e.type === 'smart_terrain' && e.name.startsWith(landId + '_'))
    || output.find(e => e.name.startsWith(landId + '_'));
  if (!match) continue;

  const shortName = landName.toLowerCase();
  const key = `${match.level}:${shortName}`;
  if (existingLocations.has(key)) continue;
  existingLocations.add(key);

  output.push({
    id: 0,
    name: landId,
    location: landName,
    type: 'smart_terrain',
    level: match.level,
    mapX: match.mapX,
    mapY: match.mapY,
  });
}

// ── Group by type for easier consumption ────────────────────────────────
const byType = {};
for (const ent of output) {
  if (!byType[ent.type]) byType[ent.type] = [];
  byType[ent.type].push(ent);
}

const result = {
  _info: `Map entities with pixel coordinates in 1024×2634 image space. Generated ${new Date().toISOString().slice(0, 10)}.`,
  image: { width: 1024, height: 2634 },
  counts: {},
  entities: byType,
};
for (const [type, arr] of Object.entries(byType)) {
  result.counts[type] = arr.length;
}

// ── Write output ────────────────────────────────────────────────────────
const outDir = resolve(root, 'site', 'public', 'data', pack);
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, 'map-entities.json');
writeFileSync(outPath, JSON.stringify(result, null, 2));

console.log(`Mapped ${mapped} entities, skipped ${skipped} (underground/excluded)`);
for (const [type, arr] of Object.entries(byType)) {
  console.log(`  ${type}: ${arr.length}`);
}
if (noRect.size) {
  console.log(`Warning: no global_rect for levels: ${[...noRect].join(', ')}`);
}
console.log(`Output: ${outPath}`);

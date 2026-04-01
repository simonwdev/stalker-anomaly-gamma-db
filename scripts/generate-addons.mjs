/**
 * generate-addons.mjs — Extract weapon addon data (scopes, silencers, grenade launchers)
 * from game CSV exports into searchable JSON for the gamma-tools UI.
 *
 * Usage:
 *   node scripts/generate-addons.mjs --pack gamma-0.9.4
 *   node scripts/generate-addons.mjs --pack gamma-0.9.4 --only scopes,silencers
 *   node scripts/generate-addons.mjs --pack gamma-0.9.4 --no-compat-map
 *   node scripts/generate-addons.mjs --pack gamma-0.9.4 --numeric st_upgr_cost,st_prop_weight
 *
 * Options:
 *   --pack <id>         Pack directory under data/ (required)
 *   --only <types>      Comma-separated subset of addon types to process.
 *                       Available: scopes, silencers, grenade-launchers
 *                       Default: all three
 *   --no-compat-map     Skip cross-referencing export_addon_weapon_map.csv
 *                       (skip attaching compatible weapon IDs to each addon)
 *   --numeric <cols>    Comma-separated column names to force-parse as numbers.
 *                       By default columns whose every non-empty value looks
 *                       numeric are auto-promoted to numbers.
 *   --exclude <cols>    Comma-separated column names to drop from output.
 *
 * Outputs written to site/public/data/<pack>/:
 *   scopes.json            — scope addon items with stats + compat weapons
 *   silencers.json         — silencer addon items with stats + compat weapons
 *   grenade-launchers.json — grenade launcher addon items with stats + compat weapons
 *   addons-index.json      — flat merged index (id, name, addonType) across all types
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------
function parseArg(name, fallback = undefined) {
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.split("=").slice(1).join("=");
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith("--"))
    return process.argv[idx + 1];
  return fallback;
}
const hasFlag = (name) => process.argv.includes(`--${name}`);

const pack = parseArg("pack");
if (!pack) {
  console.error("Usage: node scripts/generate-addons.mjs --pack <pack-id> [options]");
  console.error("  --only scopes,silencers,grenade-launchers  (subset of types)");
  console.error("  --no-compat-map                            (skip weapon compat map)");
  console.error("  --numeric col1,col2                        (force numeric columns)");
  console.error("  --exclude col1,col2                        (drop columns)");
  process.exit(1);
}

const CSV_DIR = join(import.meta.dirname, "..", "data", pack);
const OUT_DIR = join(import.meta.dirname, "..", "site", "public", "data", pack);

if (!existsSync(CSV_DIR)) {
  console.error(`Pack directory not found: ${CSV_DIR}`);
  process.exit(1);
}

const onlyArg = parseArg("only");
const selectedTypes = onlyArg ? new Set(onlyArg.split(",").map((s) => s.trim())) : null;
const skipCompatMap = hasFlag("no-compat-map");
const forceNumeric = new Set((parseArg("numeric", "") || "").split(",").map((s) => s.trim()).filter(Boolean));
const excludeCols = new Set((parseArg("exclude", "") || "").split(",").map((s) => s.trim()).filter(Boolean));

// ---------------------------------------------------------------------------
// Addon type definitions
// Each entry describes one CSV file and its output.
// ---------------------------------------------------------------------------
const ADDON_TYPES = [
  {
    key: "scopes",
    file: "export_scopes.csv",
    category: "Scopes",
    outFile: "scopes.json",
    // Columns that should always be treated as numbers (in addition to auto-detection)
    numericCols: new Set(["st_prop_weight", "st_upgr_cost", "st_data_export_zoom_factor"]),
  },
  {
    key: "silencers",
    file: "export_silencers.csv",
    category: "Silencers",
    outFile: "silencers.json",
    numericCols: new Set(["st_prop_weight", "st_upgr_cost"]),
  },
  {
    key: "grenade-launchers",
    file: "export_grenade_launchers.csv",
    category: "Grenade Launchers",
    outFile: "grenade-launchers.json",
    numericCols: new Set(["st_prop_weight", "st_upgr_cost"]),
  },
];

// ---------------------------------------------------------------------------
// CSV parser (handles the legacy semicolon-quoted format used by game exports)
// ---------------------------------------------------------------------------
function parseCsvLine(line) {
  const fields = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let val = "";
      while (i < line.length && line[i] !== ",") {
        if (line[i] === '"') {
          i++; // opening/closing quote
          while (i < line.length) {
            if (line[i] === '"' && line[i + 1] === '"') { val += '"'; i += 2; }
            else if (line[i] === '"') { i++; break; }
            else val += line[i++];
          }
        } else {
          val += line[i++];
        }
      }
      fields.push(val);
      if (line[i] === ",") i++;
    } else {
      const next = line.indexOf(",", i);
      if (next === -1) { fields.push(line.slice(i)); break; }
      fields.push(line.slice(i, next));
      i = next + 1;
    }
  }
  return fields;
}

// ---------------------------------------------------------------------------
// Auto-detect whether a column looks numeric (all non-empty values are numbers)
// ---------------------------------------------------------------------------
function isNumericColumn(colName, values) {
  if (forceNumeric.has(colName)) return true;
  const nonEmpty = values.filter((v) => v !== "");
  if (nonEmpty.length === 0) return false;
  return nonEmpty.every((v) => /^-?\d+(\.\d+)?$/.test(v));
}

// ---------------------------------------------------------------------------
// Parse one addon CSV → { headers, items }
// ---------------------------------------------------------------------------
function parseAddonCsv(csvPath, addonType) {
  const text = readFileSync(csvPath, "utf-8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { headers: [], items: [] };

  // Header row: rename "~" → "id", lowercase, exclude user-excluded columns
  const rawHeaders = parseCsvLine(lines[0]).map((h) => (h.trim() === "~" ? "id" : h.trim().toLowerCase()));
  const keepIdx = rawHeaders
    .map((h, i) => (!excludeCols.has(h) && h !== "" ? i : -1))
    .filter((i) => i >= 0);
  const headers = keepIdx.map((i) => rawHeaders[i]);

  // Collect raw string values first (for type detection)
  const rawRows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const id = cols[0]?.trim();
    if (!id) continue;
    const row = {};
    for (const j of keepIdx) {
      row[rawHeaders[j]] = cols[j]?.trim() ?? "";
    }
    rawRows.push(row);
  }

  // Determine which non-id columns are numeric
  const numericSet = new Set(addonType.numericCols);
  for (const h of headers) {
    if (h === "id") continue;
    if (isNumericColumn(h, rawRows.map((r) => r[h]))) {
      numericSet.add(h);
    }
  }

  // Cast numeric columns
  const items = rawRows.map((row) => {
    const out = {};
    for (const h of headers) {
      const val = row[h];
      if (h !== "id" && numericSet.has(h)) {
        out[h] = val === "" ? null : parseFloat(val);
      } else {
        out[h] = val;
      }
    }
    return out;
  });

  // Filter out items with no name (translation-key is empty → internal/dummy entries)
  const filtered = items.filter((item) => item.pda_encyclopedia_name && item.pda_encyclopedia_name !== "");

  return {
    headers,
    numericCols: [...numericSet],
    items: filtered,
  };
}

// ---------------------------------------------------------------------------
// Load addon→weapons compat map: export_addon_weapon_map.csv
// Format: addon_id, wpn_id1, wpn_id2, ...  (no header row)
// ---------------------------------------------------------------------------
function loadCompatMap(csvDir) {
  const mapFile = join(csvDir, "export_addon_weapon_map.csv");
  if (!existsSync(mapFile)) {
    console.warn("  export_addon_weapon_map.csv not found — skipping compat map");
    return new Map();
  }
  const text = readFileSync(mapFile, "utf-8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const map = new Map();
  for (const line of lines) {
    const cols = line.split(",").map((s) => s.trim()).filter(Boolean);
    if (cols.length < 2) continue;
    const addonId = cols[0];
    map.set(addonId, cols.slice(1));
  }
  console.log(`  Loaded compat map: ${map.size} addon entries`);
  return map;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
mkdirSync(OUT_DIR, { recursive: true });

const compatMap = skipCompatMap ? new Map() : loadCompatMap(CSV_DIR);
const addonIndex = []; // flat index across all types

for (const addonType of ADDON_TYPES) {
  if (selectedTypes && !selectedTypes.has(addonType.key)) {
    console.log(`Skipping ${addonType.key} (not in --only list)`);
    continue;
  }

  const csvPath = join(CSV_DIR, addonType.file);
  if (!existsSync(csvPath)) {
    console.warn(`CSV not found, skipping: ${csvPath}`);
    continue;
  }

  console.log(`\nProcessing ${addonType.file} → ${addonType.outFile}`);
  const { headers, numericCols, items } = parseAddonCsv(csvPath, addonType);

  // Attach compatible weapon IDs from compat map
  if (!skipCompatMap) {
    let compatHits = 0;
    for (const item of items) {
      const weapons = compatMap.get(item.id);
      if (weapons && weapons.length > 0) {
        item.compatWeapons = weapons;
        compatHits++;
      }
    }
    console.log(`  ${compatHits}/${items.length} items have compat weapon data`);
  }

  // Print detected columns summary
  const strCols = headers.filter((h) => h !== "id" && !numericCols.includes(h));
  console.log(`  Columns (${headers.length}): ${headers.join(", ")}`);
  console.log(`  Numeric: [${numericCols.join(", ")}]`);
  console.log(`  String:  [${strCols.join(", ")}]`);
  console.log(`  Items:   ${items.length}`);

  // Write per-type JSON
  const output = {
    category: addonType.category,
    headers,
    numericCols,
    items,
  };
  const outPath = join(OUT_DIR, addonType.outFile);
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`  → Wrote ${outPath}`);

  // Contribute to flat index
  for (const item of items) {
    addonIndex.push({
      id: item.id,
      name: item.pda_encyclopedia_name,
      addonType: addonType.key,
      category: addonType.category,
    });
  }
}

// Write merged addons index
const indexPath = join(OUT_DIR, "addons-index.json");
writeFileSync(indexPath, JSON.stringify(addonIndex, null, 2));
console.log(`\nWrote addons-index.json (${addonIndex.length} total items) → ${indexPath}`);


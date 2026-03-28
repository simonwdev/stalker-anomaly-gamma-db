import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, cpSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

// Parse --pack argument (supports both --pack=value and --pack value)
function parsePackArg(argv) {
  const equalsArg = argv.find((a) => a.startsWith("--pack="));
  if (equalsArg) return equalsArg.split("=")[1];
  const idx = argv.indexOf("--pack");
  if (idx >= 0) return argv[idx + 1];
  return undefined;
}
const pack = parsePackArg(process.argv);
if (!pack) {
  console.error("Usage: node generate-index.mjs --pack <pack-id>");
  process.exit(1);
}

const CSV_DIR = join(import.meta.dirname, "..", "data", pack);
const OUT_DIR = join(import.meta.dirname, "..", "site", "public", "data", pack);
const OUT_FILE = join(OUT_DIR, "index.json");

if (!existsSync(CSV_DIR)) {
  console.error(`CSV directory not found: ${CSV_DIR}`);
  process.exit(1);
}

// Files to skip (lookup/relationship tables, not searchable items)
const SKIP_COLUMNS = new Set(["br1", "br2", "br3", "br4", "br5", "br6", "br7"]);

const SKIP_FILES = new Set([
  "export_disassemble_table.csv",
  "export_disassembles_materials.csv",
  "export_outfit_exchange.csv",
  "export_weapon_drop_sources.csv",
  "export_items_list.csv",
  "export_item_drop_locations.csv",
  "export_artefact_recipes.csv",
  "export_stash_drop_rates.csv",
  "export_toolkit_map_rates.csv",
  "item_chance_in_stash.csv",
  "en_us.csv",
  "ru_ru.csv",
  "fr_fr.csv",
]);

// Category and name-column overrides per filename pattern
const FILE_CONFIG = [
  { match: /^export_weapons_pistol/, category: "Pistols", group: "Weapons" },
  { match: /^export_weapons_smg/, category: "SMGs", group: "Weapons" },
  { match: /^export_weapons_shotgun/, category: "Shotguns", group: "Weapons" },
  { match: /^export_weapons_rifle/, category: "Rifles", group: "Weapons" },
  { match: /^export_weapons_sniper/, category: "Snipers", group: "Weapons" },
  { match: /^export_weapons_melee/, category: "Melee", group: "Weapons" },
  { match: /^export_weapons_explosive/, category: "Launchers", group: "Weapons" },
  { match: /^export_ammo/, category: "Ammo", group: "Ammo & Explosives" },
  { match: /^export_explosives/, category: "Explosives", group: "Ammo & Explosives" },
  { match: /^export_outfits_outfit_helmet/, category: "Helmets", group: "Equipment", nameCol: 1 },
  { match: /^export_outfits_/, category: "Outfits", group: "Equipment", nameCol: 2 },
  { match: /^export_belt_attachments/, category: "Belt Attachments", group: "Equipment" },
  { match: /^export_artefacts/, category: "Artefacts", group: "Items" },
  { match: /^export_artefact_recipes/, category: "Recipes", group: "Items" },
  { match: /^export_eatable/, category: "Food", group: "Consumables" },
  { match: /^export_medicine/, category: "Medicine", group: "Consumables" },
  { match: /^export_mutant_parts_prices/, category: "Mutant Parts", group: "Items" },
];

// Ordered group list for sidebar display
const GROUP_ORDER = ["Weapons", "Ammo & Explosives", "Equipment", "Consumables", "Items"];

function getConfig(filename) {
  return FILE_CONFIG.find((c) => c.match.test(filename));
}

// Legacy CSV line parser that handles quoted fields with semicolon-separated sub-values
function parseCsvLineLegacy(line) {
  const fields = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      // Quoted field — also handles "val";"val" (semicolon-separated quoted values)
      let val = "";
      while (i < line.length && line[i] !== ",") {
        if (line[i] === '"') {
          i++; // opening quote
          while (i < line.length) {
            if (line[i] === '"' && line[i + 1] === '"') {
              val += '"';
              i += 2;
            } else if (line[i] === '"') {
              i++; // closing quote
              break;
            } else {
              val += line[i++];
            }
          }
        } else {
          val += line[i++]; // semicolons between quoted values
        }
      }
      fields.push(val);
      if (line[i] === ",") i++; // skip delimiter
    } else {
      const next = line.indexOf(",", i);
      if (next === -1) {
        fields.push(line.slice(i));
        break;
      }
      fields.push(line.slice(i, next));
      i = next + 1;
    }
  }
  return fields;
}

// RFC 4180 CSV parser — standard comma-delimited with quoted field escaping
function parseCsvLineRfc4180(line) {
  const fields = [];
  let i = 0;
  while (i <= line.length) {
    if (i === line.length) {
      fields.push("");
      break;
    }
    if (line[i] === '"') {
      let val = "";
      i++; // opening quote
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          val += '"';
          i += 2;
        } else if (line[i] === '"') {
          i++; // closing quote
          break;
        } else {
          val += line[i++];
        }
      }
      fields.push(val);
      if (i < line.length && line[i] === ",") i++; // skip delimiter
    } else {
      const next = line.indexOf(",", i);
      if (next === -1) {
        fields.push(line.slice(i));
        break;
      }
      fields.push(line.slice(i, next));
      i = next + 1;
    }
  }
  return fields;
}

function loadPackConfig(packDir) {
  const configPath = join(packDir, "pack.json");
  if (existsSync(configPath)) return JSON.parse(readFileSync(configPath, "utf-8"));
  return {};
}

const packConfig = loadPackConfig(CSV_DIR);
const parseCsvLine = packConfig.csvStyle === "rfc4180" ? parseCsvLineRfc4180 : parseCsvLineLegacy;

function loadTranslations(packDir) {
  const encodingOverrides = packConfig.encoding || {};
  const translations = { locales: ["en", "ru", "fr"], en: {}, ru: {}, fr: {} };
  for (const [file, locale] of [["en_us.csv", "en"], ["ru_ru.csv", "ru"], ["fr_fr.csv", "fr"]]) {
    const filepath = join(packDir, file);
    if (!existsSync(filepath)) {
      console.warn(`Translation file not found: ${filepath}`);
      continue;
    }
    const encoding = encodingOverrides[file] || "windows-1251";
    const buf = readFileSync(filepath);
    const text = new TextDecoder(encoding).decode(buf);
    const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
    for (let i = 1; i < lines.length; i++) {
      // Strip color codes before CSV parsing — they contain commas that break column splitting
      const cleanLine = lines[i].replace(/%c\[[^\]]*\]/gi, "");
      const cols = parseCsvLine(cleanLine);
      const key = cols[0]?.trim().toLowerCase();
      // Rejoin all columns after the key — commas in values are not column separators
      let value = cols.slice(1).join(",").trim();
      if (!key) continue;
      // Strip trailing : and whitespace
      value = value.replace(/:\s*$/, "").trim();
      // Handle %s word %s pattern → extract middle word, capitalize
      const pctMatch = value.match(/^%s\s+(\S+)\s+%s$/i);
      if (pctMatch) {
        value = pctMatch[1].charAt(0).toUpperCase() + pctMatch[1].slice(1);
      }
      translations[locale][key] = value;
    }
    console.log(`Loaded ${Object.keys(translations[locale]).length} translations for ${locale}`);
  }
  return translations;
}

function processFile(filepath, config) {
  const text = readFileSync(filepath, "utf-8");
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], items: [] };

  // Parse headers, rename "~" to "id", lowercase all, drop skipped columns
  const rawHeaders = parseCsvLine(lines[0]).map((h) =>
    h.trim() === "~" ? "id" : h.trim().toLowerCase()
  );
  const keepIdx = rawHeaders.map((h, i) => (!SKIP_COLUMNS.has(h) ? i : -1)).filter((i) => i >= 0);
  const headers = keepIdx.map((i) => rawHeaders[i]);

  const nameCol = config.nameCol ?? 1;
  const items = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const id = cols[0]?.trim();
    const name = cols[nameCol]?.trim();
    if (!id || !name) continue;

    const item = {};
    for (const j of keepIdx) {
      item[rawHeaders[j]] = cols[j]?.trim() ?? "";
    }
    items.push(item);
  }

  return { headers, items };
}

function categorySlug(category) {
  return category.toLowerCase().replace(/ /g, "-");
}

// Ensure output directory exists
mkdirSync(OUT_DIR, { recursive: true });

// Main
const files = readdirSync(CSV_DIR).filter((f) => f.endsWith(".csv"));
const index = [];
const seen = new Set();
const categoryData = new Map(); // slug -> { category, headers, items }

for (const file of files) {
  if (SKIP_FILES.has(file)) continue;

  const config = getConfig(file);
  if (!config) {
    console.warn(`No config for ${file}, skipping`);
    continue;
  }

  const { headers, items } = processFile(join(CSV_DIR, file), config);
  const slug = categorySlug(config.category);

  // Initialize or merge into category data
  if (!categoryData.has(slug)) {
    categoryData.set(slug, {
      category: config.category,
      headers,
      items: [],
    });
  }

  const catEntry = categoryData.get(slug);

  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      index.push({ id: item.id, name: item.pda_encyclopedia_name || item[headers[config.nameCol ?? 1]], category: config.category });
      catEntry.items.push(item);
    }
  }

  console.log(`${file}: ${items.length} items (${config.category})`);
}

// Find longest common prefix of an array of strings
function commonPrefix(strs) {
  if (strs.length === 0) return "";
  let prefix = strs[0];
  for (let i = 1; i < strs.length; i++) {
    while (strs[i].indexOf(prefix) !== 0) {
      prefix = prefix.slice(0, -1);
    }
  }
  return prefix;
}

// Compute displayName showing only the unique ID suffix for duplicates
function addDisplayNames(items, idKey, nameKey) {
  // Group items by name
  const groups = new Map();
  for (const item of items) {
    const name = item[nameKey] || "";
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(item);
  }
  for (const [name, group] of groups) {
    if (group.length === 1) {
      group[0].displayName = name;
      continue;
    }
    const ids = group.map((it) => it[idKey]);
    const prefix = commonPrefix(ids);
    for (const item of group) {
      const suffix = item[idKey].slice(prefix.length).replace(/^[_-]+/, "");
      item.displayName = suffix ? `${name} [${suffix}]` : `${name} [default]`;
    }
  }
}

// Process artefact recipes CSV (column-index-based due to duplicate headers)
const RECIPES_FILE = join(CSV_DIR, "export_artefact_recipes.csv");
try {
  const recText = readFileSync(RECIPES_FILE, "utf-8");
  const recLines = recText.split(/\r?\n/).filter((l) => l.length > 0);
  if (recLines.length > 1) {
    const recipeItems = [];

    for (let i = 1; i < recLines.length; i++) {
      const cols = parseCsvLine(recLines[i]);
      const id = cols[0]?.trim();
      const name = cols[1]?.trim();
      if (!id || !name) continue;

      const ingredients = [];
      // Columns: 0=id, 1=Name, then repeating pairs: 2=#1, 3=Amount, 4=#2, 5=Amount, ...
      for (let j = 2; j < cols.length; j += 2) {
        const ingName = cols[j]?.trim();
        const ingAmount = cols[j + 1]?.trim();
        if (!ingName || ingName === "nil") continue;
        ingredients.push({ name: ingName, amount: ingAmount || "x1" });
      }

      recipeItems.push({ id, pda_encyclopedia_name: name, ingredients });
    }

    const slug = "recipes";
    if (!categoryData.has(slug)) {
      categoryData.set(slug, {
        category: "Recipes",
        headers: ["id", "pda_encyclopedia_name"],
        items: [],
      });
    }
    const catEntry = categoryData.get(slug);

    for (const item of recipeItems) {
      catEntry.items.push(item);
      // Add to index only if not already present (recipes share IDs with artefacts)
      if (!seen.has(item.id)) {
        seen.add(item.id);
        index.push({ id: item.id, name: item.pda_encyclopedia_name, category: "Recipes" });
      }
    }

    console.log(`export_artefact_recipes.csv: ${recipeItems.length} items (Recipes)`);
  }
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  console.log("No artefact recipes CSV found, skipping");
}

// Add displayName to each category's items
for (const [slug, data] of categoryData) {
  const nameKey = data.headers.includes("pda_encyclopedia_name") ? "pda_encyclopedia_name" : "name";
  addDisplayNames(data.items, "id", nameKey);
}

// Add displayName to index entries
addDisplayNames(index, "id", "name");

// Generate drops.json from weapon drop sources CSV and mark hasNpcWeaponDrop
const DROPS_FILE = join(CSV_DIR, "export_weapon_drop_sources.csv");
try {
  const dropsText = readFileSync(DROPS_FILE, "utf-8");
  const dropsLines = dropsText.split(/\r?\n/).filter((l) => l.length > 0);
  if (dropsLines.length > 1) {
    const dropsHeaders = parseCsvLine(dropsLines[0]).map((h) =>
      h.trim() === "~" ? "id" : h.trim()
    );
    const drops = {};

    for (let i = 1; i < dropsLines.length; i++) {
      const cols = parseCsvLine(dropsLines[i]);
      const id = cols[0]?.trim();
      if (!id) continue;

      const factions = {};
      for (let j = 3; j < dropsHeaders.length; j++) {
        const val = cols[j]?.trim();
        if (val) {
          factions[dropsHeaders[j]] = val.split(",").map((s) => s.trim()).filter(Boolean);
        }
      }
      if (Object.keys(factions).length > 0) {
        drops[id] = factions;
      }
    }

    // Mark weapons/explosives with hasNpcWeaponDrop based on NPC drops presence
    const npcDropCategories = new Set(["pistols", "smgs", "shotguns", "rifles", "snipers", "launchers", "explosives"]);
    for (const [slug, data] of categoryData) {
      if (!npcDropCategories.has(slug)) continue;
      for (const item of data.items) {
        item.hasNpcWeaponDrop = item.id in drops;
      }
    }

    const dropsOut = join(OUT_DIR, "drops.json");
    writeFileSync(dropsOut, JSON.stringify(drops, null, 2));
    console.log(`Wrote ${Object.keys(drops).length} drop entries to ${dropsOut}`);
  }
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  console.log("No weapon drop sources CSV found, skipping drops.json");
}

// Propagate hasNpcWeaponDrop from category items into index entries
const dropLookup = new Map();
for (const [, data] of categoryData) {
  for (const item of data.items) {
    if (item.hasNpcWeaponDrop !== undefined) dropLookup.set(item.id, item.hasNpcWeaponDrop);
  }
}
for (const entry of index) {
  if (dropLookup.has(entry.id)) entry.hasNpcWeaponDrop = dropLookup.get(entry.id);
}

// Write index.json
index.sort((a, b) => a.displayName.localeCompare(b.displayName));
writeFileSync(OUT_FILE, JSON.stringify(index, null, 2));
console.log(`\nWrote ${index.length} items to ${OUT_FILE}`);

// Generate item-drops.json from export_item_drop_locations.csv
const ITEM_DROPS_FILE = join(CSV_DIR, "export_item_drop_locations.csv");
try {
  const idlText = readFileSync(ITEM_DROPS_FILE, "utf-8");
  const idlLines = idlText.split(/\r?\n/).filter((l) => l.length > 0);
  if (idlLines.length > 2) {
    const itemDrops = {};

    // Skip row 0 (junk) and row 1 (headers), data starts at row 2
    for (let i = 2; i < idlLines.length; i++) {
      const cols = parseCsvLine(idlLines[i]);
      const id = cols[0]?.trim();
      const stashType = cols[2]?.trim();
      if (!id || !stashType) continue;

      const locations = [];
      // Repeating triplets start at column 3: map, chance%, ecos
      for (let j = 3; j < cols.length; j += 3) {
        const map = cols[j]?.trim();
        if (!map) break;
        const chanceStr = cols[j + 1]?.trim().replace("%", "") || "0";
        const ecosStr = cols[j + 2]?.trim() || "";
        const ecos = ecosStr
          .split("/")
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n));
        locations.push({
          map,
          chance: parseFloat(chanceStr),
          ecos,
        });
      }

      // Sort by chance descending
      locations.sort((a, b) => b.chance - a.chance);

      if (locations.length > 0) {
        if (!itemDrops[id]) itemDrops[id] = {};
        itemDrops[id][stashType] = locations;
      }
    }

    // Mark items with hasStashDrop based on stash drop presence
    for (const [slug, data] of categoryData) {
      for (const item of data.items) {
        item.hasStashDrop = item.id in itemDrops;
      }
    }

    const itemDropsOut = join(OUT_DIR, "item-drops.json");
    writeFileSync(itemDropsOut, JSON.stringify(itemDrops, null, 2));
    console.log(`Wrote ${Object.keys(itemDrops).length} item drop entries to ${itemDropsOut}`);
  }
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  console.log("No item drop locations CSV found, skipping item-drops.json");
}

// Generate disassemble.json from export_disassemble_table.csv
const DISASSEMBLE_FILE = join(CSV_DIR, "export_disassemble_table.csv");
try {
  const disText = readFileSync(DISASSEMBLE_FILE, "utf-8");
  const disLines = disText.split(/\r?\n/).filter((l) => l.length > 0);
  if (disLines.length > 1) {
    const disassemble = {};

    for (let i = 1; i < disLines.length; i++) {
      const cols = parseCsvLine(disLines[i]);
      const id = cols[0]?.trim();
      if (!id) continue;

      const materials = [];
      for (let j = 2; j < cols.length; j += 2) {
        const matName = cols[j]?.trim();
        const matAmount = cols[j + 1]?.trim();
        if (!matName) break;
        materials.push({ name: matName, amount: matAmount || "x1" });
      }

      if (materials.length > 0) {
        disassemble[id] = materials;
      }
    }

    // Mark items with hasDisassemble
    for (const [slug, data] of categoryData) {
      for (const item of data.items) {
        item.hasDisassemble = item.id in disassemble;
      }
    }

    const disOut = join(OUT_DIR, "disassemble.json");
    writeFileSync(disOut, JSON.stringify(disassemble, null, 2));
    console.log(`Wrote ${Object.keys(disassemble).length} disassemble entries to ${disOut}`);
  }
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  console.log("No disassemble table CSV found, skipping disassemble.json");
}

// Generate materials.json from export_disassembles_materials.csv
const MATERIALS_FILE = join(CSV_DIR, "export_disassembles_materials.csv");
try {
  const matText = readFileSync(MATERIALS_FILE, "utf-8");
  const matLines = matText.split(/\r?\n/).filter((l) => l.length > 0);
  if (matLines.length > 1) {
    const materialItems = [];

    for (let i = 1; i < matLines.length; i++) {
      const cols = parseCsvLine(matLines[i]);
      const id = cols[0]?.trim();
      const name = cols[1]?.trim();
      if (!id || !name) continue;

      const sources = [];
      for (let j = 2; j < cols.length; j += 2) {
        const amountStr = cols[j]?.trim();
        const srcName = cols[j + 1]?.trim();
        if (!amountStr) break;
        const amount = amountStr.replace(/\s*(?:from|st_data_export_from)$/i, "");
        sources.push({ name: srcName, amount });
      }

      if (sources.length > 0) {
        sources.sort((a, b) => parseInt(b.amount) - parseInt(a.amount) || a.name.localeCompare(b.name));
        materialItems.push({ id, pda_encyclopedia_name: name, sources });
      }
    }

    const matSlug = "materials";
    categoryData.set(matSlug, {
      category: "Materials",
      headers: ["id", "pda_encyclopedia_name"],
      items: materialItems,
    });

    for (const item of materialItems) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        index.push({ id: item.id, name: item.pda_encyclopedia_name, category: "Materials" });
      }
    }

    console.log(`export_disassembles_materials.csv: ${materialItems.length} items (Materials)`);
  }
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  console.log("No disassembles materials CSV found, skipping materials.json");
}

// Generate outfit-exchange.json from export_outfit_exchange.csv
const OUTFIT_EXCHANGE_FILE = join(CSV_DIR, "export_outfit_exchange.csv");
try {
  const oeText = readFileSync(OUTFIT_EXCHANGE_FILE, "utf-8");
  const oeLines = oeText.split(/\r?\n/).filter((l) => l.length > 0);
  if (oeLines.length > 2) {
    const headerCols = parseCsvLine(oeLines[0]);
    const factions = [];
    for (let j = 3; j < headerCols.length; j++) {
      const f = headerCols[j]?.trim();
      if (f) factions.push(f);
    }

    const exchanges = [];
    for (let i = 1; i < oeLines.length; i++) {
      const cols = parseCsvLine(oeLines[i]);
      const sourceFaction = cols[0]?.trim() || "";
      const name = cols[1]?.trim();
      if (!name) continue;

      const results = {};
      for (let j = 0; j < factions.length; j++) {
        const val = cols[j + 3]?.trim();
        if (val) results[factions[j]] = val;
      }
      exchanges.push({ name, sourceFaction, results });
    }

    const oeOut = join(OUT_DIR, "outfit-exchange.json");
    writeFileSync(oeOut, JSON.stringify({ factions, exchanges }, null, 2));
    console.log(`Wrote ${exchanges.length} outfit exchange entries to ${oeOut}`);
  }
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  console.log("No outfit exchange CSV found, skipping outfit-exchange.json");
}

// Generate toolkit-rates.json from export_toolkit_map_rates.csv
const TOOLKIT_RATES_FILE = join(CSV_DIR, "export_toolkit_map_rates.csv");
try {
  const trText = readFileSync(TOOLKIT_RATES_FILE, "utf-8");
  const trLines = trText.split(/\r?\n/).filter((l) => l.length > 0);
  if (trLines.length > 1) {
    const headerCols = parseCsvLine(trLines[0]);
    const toolTypes = headerCols.slice(2).map((h) => h.trim()).filter(Boolean);

    const maps = [];
    for (let i = 1; i < trLines.length; i++) {
      const cols = parseCsvLine(trLines[i]);
      const id = cols[0]?.trim();
      const name = cols[1]?.trim();
      if (!id || !name) continue;

      const rates = {};
      for (let j = 0; j < toolTypes.length; j++) {
        const val = cols[j + 2]?.trim().replace("%", "") || "0";
        rates[toolTypes[j]] = parseFloat(val);
      }
      maps.push({ id, name, rates });
    }

    const trOut = join(OUT_DIR, "toolkit-rates.json");
    writeFileSync(trOut, JSON.stringify({ toolTypes, maps }, null, 2));
    console.log(`Wrote ${maps.length} toolkit rate entries to ${trOut}`);
  }
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  console.log("No toolkit map rates CSV found, skipping toolkit-rates.json");
}

// Inject AP value into ammo items before writing category files
const ammoDataPre = categoryData.get("ammo");
if (ammoDataPre) {
  const ammoBRPre = new Map();
  const BR_COLS_PRE = ["BR1", "BR2", "BR3", "BR4", "BR5", "BR6", "BR7"];
  try {
    const ammoFile = readdirSync(CSV_DIR).find(f => /^export_ammo/.test(f));
    if (ammoFile) {
      const rawText = readFileSync(join(CSV_DIR, ammoFile), "utf-8");
      const rawLines = rawText.split(/\r?\n/).filter(l => l.length > 0);
      const rawHeaders = parseCsvLine(rawLines[0]).map(h => h.trim() === "~" ? "id" : h.trim());
      const brIndices = BR_COLS_PRE.map(b => rawHeaders.indexOf(b));
      for (let i = 1; i < rawLines.length; i++) {
        const cols = parseCsvLine(rawLines[i]);
        const id = cols[0]?.trim();
        if (!id) continue;
        for (let b = 0; b < BR_COLS_PRE.length; b++) {
          const idx = brIndices[b];
          const val = idx >= 0 ? cols[idx]?.trim() : "";
          if (val) {
            ammoBRPre.set(id, { class: b + 1, value: parseInt(val, 10) });
            break;
          }
        }
      }
    }
  } catch (e) {
    console.warn("Could not read ammo BR data for AP injection:", e.message);
  }
  if (ammoBRPre.size > 0) {
    if (!ammoDataPre.headers.includes("st_data_export_ap")) {
      ammoDataPre.headers.push("st_data_export_ap");
    }
    for (const item of ammoDataPre.items) {
      const br = ammoBRPre.get(item.id);
      if (br) item.st_data_export_ap = br.value;
    }
  }
}

// Write per-category JSON files and build categories manifest
const categoriesList = [];
for (const [slug, data] of categoryData) {
  const catFile = join(OUT_DIR, `${slug}.json`);
  writeFileSync(catFile, JSON.stringify(data, null, 2));
  console.log(`Wrote ${data.items.length} items to ${catFile}`);
  categoriesList.push(data.category);
}
// Add Outfit Exchange to categories if the JSON was generated
if (existsSync(join(OUT_DIR, "outfit-exchange.json"))) {
  categoriesList.push("Outfit Exchange");
}
const categoriesOut = join(OUT_DIR, "categories.json");
writeFileSync(categoriesOut, JSON.stringify(categoriesList, null, 2));
console.log(`Wrote ${categoriesList.length} categories to ${categoriesOut}`);

// Generate calibers.json from processed ammo data (enriched with stats)
const AMMO_STAT_KEYS = ["ui_inv_damage", "ui_inv_accuracy", "ui_inv_wrange", "st_data_export_falloff", "ui_inv_bspeed", "st_data_export_projectiles", "st_upgr_cost", "st_data_export_weapon_degradation"];

const ammoData = categoryData.get("ammo");
if (ammoData) {
  // Read raw ammo CSV for BR data (stripped during normal processing)
  const ammoBR = new Map();
  const BR_COLS = ["BR1", "BR2", "BR3", "BR4", "BR5", "BR6", "BR7"];
  try {
    const ammoFile = readdirSync(CSV_DIR).find(f => /^export_ammo/.test(f));
    if (ammoFile) {
      const rawText = readFileSync(join(CSV_DIR, ammoFile), "utf-8");
      const rawLines = rawText.split(/\r?\n/).filter(l => l.length > 0);
      const rawHeaders = parseCsvLine(rawLines[0]).map(h => h.trim() === "~" ? "id" : h.trim());
      const brIndices = BR_COLS.map(b => rawHeaders.indexOf(b));
      for (let i = 1; i < rawLines.length; i++) {
        const cols = parseCsvLine(rawLines[i]);
        const id = cols[0]?.trim();
        if (!id) continue;
        for (let b = 0; b < BR_COLS.length; b++) {
          const idx = brIndices[b];
          const val = idx >= 0 ? cols[idx]?.trim() : "";
          if (val) {
            ammoBR.set(id, { class: b + 1, value: parseInt(val, 10) });
            break; // each ammo has only one BR column populated
          }
        }
      }
    }
  } catch (e) {
    console.warn("Could not read ammo BR data:", e.message);
  }

  // Build caliber groups with full item data
  const caliberGroups = new Map();
  const ammoByName = new Map();
  for (const item of ammoData.items) {
    ammoByName.set(item.displayName || item.pda_encyclopedia_name, item);
    const m = item.id.match(/(\d+\.?\d*x\d+)/);
    if (!m) continue;
    const cal = m[1];
    if (!caliberGroups.has(cal)) caliberGroups.set(cal, []);
    caliberGroups.get(cal).push(item);
  }

  // Scan weapon categories for all unique Ammo/Alt. ammo values
  const WEAPON_SLUGS = ["pistols", "smgs", "shotguns", "rifles", "snipers", "launchers"];
  const weaponsByAmmoVal = new Map(); // ammo field value -> weapon refs

  for (const slug of WEAPON_SLUGS) {
    const catData = categoryData.get(slug);
    if (!catData) continue;
    for (const wpn of catData.items) {
      for (const field of ["ui_ammo_types", "st_data_export_ammo_types_alt"]) {
        const raw = wpn[field];
        if (!raw) continue;
        for (const val of raw.split(";").map(s => s.trim()).filter(Boolean)) {
          if (!weaponsByAmmoVal.has(val)) weaponsByAmmoVal.set(val, []);
          const ref = {
            id: wpn.id,
            name: wpn.pda_encyclopedia_name,
            displayName: wpn.displayName,
            category: catData.category,
            isAlt: field === "st_data_export_ammo_types_alt",
          };
          if (wpn.hasNpcWeaponDrop === false) ref.noDrop = true;
          weaponsByAmmoVal.get(val).push(ref);
        }
      }
    }
  }

  // Add caliber entries for non-metric ammo references found in weapons
  for (const val of weaponsByAmmoVal.keys()) {
    if (caliberGroups.has(val)) continue;
    // Match ammo items whose name starts with this value
    const matches = [];
    for (const item of ammoData.items) {
      const name = item.displayName || item.pda_encyclopedia_name;
      if (name === val || name.startsWith(val + " ") || name.startsWith(val + ",")) {
        matches.push(item);
      }
    }
    if (matches.length > 0) {
      caliberGroups.set(val, matches);
    }
  }

  function variantObj(item) {
    const obj = { id: item.id, name: item.pda_encyclopedia_name, displayName: item.displayName };
    for (const key of AMMO_STAT_KEYS) {
      if (item[key]) obj[key] = item[key];
    }
    const br = ammoBR.get(item.id);
    if (br) {
      obj.apClass = br.class;
      obj.apValue = br.value;
    }
    return obj;
  }

  const calibers = {};
  for (const [cal, items] of caliberGroups) {
    calibers[cal] = { name: cal, variants: items.map(variantObj) };
  }

  const calibersOut = join(OUT_DIR, "calibers.json");
  writeFileSync(calibersOut, JSON.stringify(calibers, null, 2));
  console.log(`Wrote ${Object.keys(calibers).length} caliber entries to ${calibersOut}`);

  // Generate ammo-weapons.json — reverse lookup: ammo item ID -> weapons that use it
  // For each ammo item, find its caliber key(s), then collect weapons referencing those keys
  const ammoItemCalibers = new Map(); // ammo item id -> set of caliber keys
  for (const [cal, items] of caliberGroups) {
    for (const item of items) {
      if (!ammoItemCalibers.has(item.id)) ammoItemCalibers.set(item.id, new Set());
      ammoItemCalibers.get(item.id).add(cal);
    }
  }

  const ammoWeapons = {};
  for (const [ammoId, calKeys] of ammoItemCalibers) {
    const wpnSet = new Map(); // dedupe by weapon id
    for (const cal of calKeys) {
      const wpns = weaponsByAmmoVal.get(cal) || [];
      for (const w of wpns) {
        if (!wpnSet.has(w.id)) wpnSet.set(w.id, w);
      }
    }
    if (wpnSet.size > 0) {
      ammoWeapons[ammoId] = [...wpnSet.values()];
    }
  }

  const ammoWeaponsOut = join(OUT_DIR, "ammo-weapons.json");
  writeFileSync(ammoWeaponsOut, JSON.stringify(ammoWeapons, null, 2));
  console.log(`Wrote ${Object.keys(ammoWeapons).length} ammo-weapon mappings to ${ammoWeaponsOut}`);
} else {
  console.log("No ammo data found, skipping calibers.json");
}

// Generate translations.json from translation CSVs + supplementary
const translations = loadTranslations(CSV_DIR);
const suppPath = join(CSV_DIR, "..", "supplementary_translations.json");
if (existsSync(suppPath)) {
  const supp = JSON.parse(readFileSync(suppPath, "utf-8"));
  for (const locale of translations.locales) {
    if (supp[locale]) {
      Object.assign(translations[locale], supp[locale]);
    }
  }
  const count = Object.keys(supp.en || {}).length;
  console.log(`Merged ${count} supplementary translations from ${suppPath}`);
}
// Copy app translations to site/data/ (loaded separately by frontend)
const appPath = join(CSV_DIR, "..", "app_translations.json");
if (existsSync(appPath)) {
  const appOut = join(OUT_DIR, "..", "app_translations.json");
  cpSync(appPath, appOut);
  console.log(`Copied app translations to ${appOut}`);
}
const translationsOut = join(OUT_DIR, "translations.json");
writeFileSync(translationsOut, JSON.stringify(translations, null, 2));
console.log(`Wrote translations (${Object.keys(translations.en).length} en, ${Object.keys(translations.ru).length} ru, ${Object.keys(translations.fr).length} fr) to ${translationsOut}`);

// Generate manifest.json with content hashes for cache busting
const manifest = {};
for (const file of readdirSync(OUT_DIR).filter(f => f.endsWith(".json") && f !== "manifest.json")) {
  const content = readFileSync(join(OUT_DIR, file));
  manifest[file] = createHash("md5").update(content).digest("hex").slice(0, 8);
}
const manifestOut = join(OUT_DIR, "manifest.json");
writeFileSync(manifestOut, JSON.stringify(manifest, null, 2));
console.log(`Wrote manifest (${Object.keys(manifest).length} entries) to ${manifestOut}`);


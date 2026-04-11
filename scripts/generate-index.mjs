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
  "export_item_chance_in_stash.csv",
  "export_mutant_profiles.csv",
  "export_npc_armor_profiles.csv",
  "export_addon_weapon_map.csv",
  "export_weapon_addon_map.csv",
  "export_upgrades_items.csv",
  "export_upgrade_sections.csv",
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
  { match: /^export_scopes/, category: "Scopes", group: "Equipment" },
  { match: /^export_silencers/, category: "Silencers", group: "Equipment" },
  { match: /^export_grenade_launchers/, category: "Grenade Launchers", group: "Equipment" },
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
      // Strip color codes, replacement characters, and misencoded BOM (пїЅ) before CSV parsing
      const cleanLine = lines[i].replace(/%c\[[^\]]*\]/gi, "").replace(/\uFFFD/g, "").replace(/\u043F\u0457\u0405/g, "");
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

// ── Split tactical/conversion kits out of the Scopes category ────────────────
// The game exporter lumps all weapon addons (optics + body kits) into the scopes
// CSV. These IDs are weapon conversion / body-kit items, not optical sights.
const TACTICAL_KIT_IDS = new Set([
  "226sig_kit", "23_up", "5c_tik", "apsabigo", "archangel",
  "gurza_up", "infiltrator_tactical_kit", "kab_up", "kashtan_rmr",
  "kit_aus_tri", "kit_fal_leup", "kit_sa5x_spec", "kp_sr2", "lapua700",
  "lazup_pl15", "magpul_pro", "march_f_shorty_alt", "mark8_rmr",
  "mauser_kit", "mod9", "mod_x_gen3", "mono_kit", "none",
  "ots2_upgr_kit", "pl15_scolaz", "pritseldob", "shakal", "side",
  "spec_alt", "spectre_tactical_kit", "sr1upgr1", "sr2_upkit",
  "sup", "swamp", "triji", "u2p2g0r", "upg220", "vorkuta",
]);

const scopeData = categoryData.get("scopes");
if (scopeData) {
  const kits = [];
  const realScopes = [];
  for (const item of scopeData.items) {
    if (TACTICAL_KIT_IDS.has(item.id)) kits.push(item);
    else realScopes.push(item);
  }
  if (kits.length) {
    scopeData.items = realScopes;
    const kitSlug = "tactical-kits";
    categoryData.set(kitSlug, {
      category: "Tactical Kits",
      headers: [...scopeData.headers],
      items: kits,
    });
    // Update index entries for moved items
    for (const item of kits) {
      const entry = index.find(e => e.id === item.id);
      if (entry) entry.category = "Tactical Kits";
    }
    console.log(`Split ${kits.length} tactical kits from Scopes into Tactical Kits`);
  }
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

// Generate item-stash-chance.json from export_item_chance_in_stash.csv
const STASH_CHANCE_FILE = join(CSV_DIR, "export_item_chance_in_stash.csv");
try {
  const scText = readFileSync(STASH_CHANCE_FILE, "utf-8");
  const scLines = scText.split(/\r?\n/).filter((l) => l.length > 0);
  if (scLines.length > 1) {
    const stashChance = {};
    // Row 0 is header (starts with ~), data starts at row 1
    for (let i = 1; i < scLines.length; i++) {
      const cols = parseCsvLine(scLines[i]);
      const id = cols[0]?.trim();
      const type = cols[2]?.trim();
      const chanceStr = cols[3]?.trim().replace("%", "") || "0";
      const ecosStr = cols[4]?.trim() || "";
      if (!id || !type) continue;
      const ecos = ecosStr
        .split("/")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));
      if (!stashChance[id]) stashChance[id] = {};
      stashChance[id][type] = { chance: parseFloat(chanceStr), ecos };
    }
    const stashChanceOut = join(OUT_DIR, "item-stash-chance.json");
    writeFileSync(stashChanceOut, JSON.stringify(stashChance, null, 2));
    console.log(`Wrote ${Object.keys(stashChance).length} stash chance entries to ${stashChanceOut}`);
  }
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  console.log("No item stash chance CSV found, skipping item-stash-chance.json");
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

// Generate upgrades.json from export_upgrade_sections.csv + export_upgrades_items.csv
const UPGRADE_SECTIONS_FILE = join(CSV_DIR, "export_upgrade_sections.csv");
const UPGRADE_ITEMS_FILE = join(CSV_DIR, "export_upgrades_items.csv");
try {
  const sectText = readFileSync(UPGRADE_SECTIONS_FILE, "utf-8");
  const sectLines = sectText.split(/\r?\n/).filter((l) => l.length > 0);
  const sectionsMap = new Map();

  for (let i = 1; i < sectLines.length; i++) {
    const cols = parseCsvLine(sectLines[i]);
    const sectionId = cols[0]?.trim();
    if (!sectionId) continue;
    // cols[1] is type (outfit/weapon/any) — not stored
    let cost = 0;
    const stats = {};
    for (let j = 2; j < cols.length; j += 2) {
      const key = cols[j]?.trim().replace(/^"|"$/g, "");
      const val = cols[j + 1]?.trim().replace(/^"|"$/g, "");
      if (!key) continue;
      if (key === "cost") {
        cost = parseFloat(val) || 0;
      } else {
        stats[key] = val;
      }
    }
    sectionsMap.set(sectionId, { cost, stats });
  }
  console.log(`Loaded ${sectionsMap.size} upgrade sections`);

  const upItemsText = readFileSync(UPGRADE_ITEMS_FILE, "utf-8");
  const upItemsLines = upItemsText.split(/\r?\n/).filter((l) => l.length > 0);
  const upgrades = {};

  for (let i = 1; i < upItemsLines.length; i++) {
    const cols = parseCsvLine(upItemsLines[i]);
    const itemId = cols[0]?.trim();
    if (!itemId) continue;

    const nodes = [];
    // Repeating groups of 8 columns starting at index 2: Row, Column, Cell, Property, Value, Name, Desc, Section
    for (let n = 0; n < 22; n++) {
      const base = 2 + n * 8;
      const row = cols[base]?.trim();
      const col = cols[base + 1]?.trim();
      const cell = cols[base + 2]?.trim();
      const prop = cols[base + 3]?.trim();
      const val = cols[base + 4]?.trim();
      const name = cols[base + 5]?.trim();
      const desc = cols[base + 6]?.trim();
      const sectionId = cols[base + 7]?.trim();
      if (!row || !sectionId) continue;

      const sect = sectionsMap.get(sectionId) || { cost: 0, stats: {} };
      nodes.push({
        row: parseInt(row, 10),
        col: parseInt(col, 10),
        cell: parseInt(cell, 10),
        prop: prop || "",
        val: val || "",
        name: name || "",
        desc: desc || "",
        section: sectionId,
        cost: sect.cost,
        stats: Object.keys(sect.stats).length > 0 ? sect.stats : undefined,
      });
    }

    if (nodes.length > 0) {
      upgrades[itemId] = nodes;
    }
  }

  // Mark items with hasUpgrades
  for (const [, data] of categoryData) {
    for (const item of data.items) {
      if (item.id in upgrades) item.hasUpgrades = true;
    }
  }

  const upgradesOut = join(OUT_DIR, "upgrades.json");
  writeFileSync(upgradesOut, JSON.stringify(upgrades));
  console.log(`Wrote ${Object.keys(upgrades).length} upgrade trees to ${upgradesOut}`);
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  console.log("No upgrade CSVs found, skipping upgrades.json");
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

// Generate starting-loadouts.json and item-loadouts.json from new_game_loadouts.ltx
const LOADOUT_FILE = join(CSV_DIR, "new_game_loadouts.ltx");
try {
  const ltxText = readFileSync(LOADOUT_FILE, "utf-8");

  // Parse LTX into sections: Map<name, { parent, entries: Map<key, value> }>
  const sections = new Map();
  let currentSection = null;
  for (const rawLine of ltxText.split(/\r?\n/)) {
    const line = rawLine.replace(/;.*$/, "").trim();
    if (!line) continue;

    const sectionMatch = line.match(/^\[([^\]]+)\](?::(.+))?/);
    if (sectionMatch) {
      const name = sectionMatch[1];
      const parent = sectionMatch[2] || null;
      currentSection = { parent, entries: new Map() };
      sections.set(name, currentSection);
      continue;
    }

    if (currentSection) {
      const eqIdx = line.indexOf("=");
      if (eqIdx >= 0) {
        const key = line.slice(0, eqIdx).trim();
        const value = line.slice(eqIdx + 1).trim();
        if (key) currentSection.entries.set(key, value);
      }
    }
  }

  // Extract points budget
  const pointsSec = sections.get("points");
  const points = [
    parseInt(pointsSec?.entries.get("total_points_eco_1")) || 0,
    parseInt(pointsSec?.entries.get("total_points_eco_2")) || 0,
    parseInt(pointsSec?.entries.get("total_points_eco_3")) || 0,
  ];

  // Extract ammo config
  const ammoPerWeapon = {};
  const ammoTypeSec = sections.get("ammo_type_per_wpn");
  if (ammoTypeSec) {
    for (const [k, v] of ammoTypeSec.entries) ammoPerWeapon[k] = v;
  }
  const ammoCount = {};
  const ammoCountSec = sections.get("ammo_count");
  if (ammoCountSec) {
    for (const [k, v] of ammoCountSec.entries) ammoCount[k] = parseInt(v) || 0;
  }

  // Parse item entries from a section
  function parseLoadoutItems(sec) {
    const items = [];
    if (!sec) return items;
    for (const [id, raw] of sec.entries) {
      const parts = raw.split(",").map(s => s.trim());
      items.push({
        id,
        selectable: parts[0] === "true",
        quantity: parseInt(parts[1]) || 1,
        cost: parseInt(parts[2]) || 0,
        difficultyLock: parts[3] ? parseInt(parts[3]) : null,
      });
    }
    return items;
  }

  // Resolve inheritance: collect items from parent chain + own entries
  function resolveItems(sectionName) {
    const sec = sections.get(sectionName);
    if (!sec) return [];
    const parentItems = sec.parent
      ? sec.parent.split(",").flatMap(p => resolveItems(p.trim()))
      : [];
    const ownItems = parseLoadoutItems(sec);
    // Own items override parent items with same id
    const merged = new Map();
    for (const item of parentItems) merged.set(item.id, item);
    for (const item of ownItems) merged.set(item.id, item);
    return [...merged.values()];
  }

  // Build shared items (from the shared section only, excluding custom)
  const sharedItems = parseLoadoutItems(sections.get("shared"));

  // Build faction loadouts
  const FACTION_SECTIONS = [
    "stalker_loadout", "bandit_loadout", "ecolog_loadout", "dolg_loadout",
    "freedom_loadout", "killer_loadout", "army_loadout", "monolith_loadout",
    "csky_loadout", "renegade_loadout", "greh_loadout", "isg_loadout", "zombied_loadout",
  ];
  const sharedIdSet = new Set(sharedItems.map(i => i.id));

  const factions = [];
  for (const secName of FACTION_SECTIONS) {
    if (!sections.has(secName)) continue;
    const factionId = secName.replace("_loadout", "");
    const moneySec = sections.get(`${factionId}_money`);
    const money = parseInt(moneySec?.entries.get("money")) || 0;
    const items = resolveItems(secName);
    factions.push({ id: factionId, money, items });
  }

  const loadoutsData = { points, factions, shared: sharedItems, ammoPerWeapon, ammoCount };
  const loadoutsOut = join(OUT_DIR, "starting-loadouts.json");
  writeFileSync(loadoutsOut, JSON.stringify(loadoutsData, null, 2));
  console.log(`Wrote ${factions.length} faction loadouts to ${loadoutsOut}`);

  // Build reverse-index: item ID -> factions that offer it
  const itemLoadouts = {};
  for (const item of sharedItems) {
    if (!itemLoadouts[item.id]) itemLoadouts[item.id] = [];
    itemLoadouts[item.id].push({ faction: "shared", cost: item.cost, selectable: item.selectable });
  }
  for (const faction of factions) {
    for (const item of faction.items) {
      if (sharedIdSet.has(item.id)) continue; // already covered by shared
      if (!itemLoadouts[item.id]) itemLoadouts[item.id] = [];
      itemLoadouts[item.id].push({ faction: faction.id, cost: item.cost, selectable: item.selectable });
    }
  }
  const itemLoadoutsOut = join(OUT_DIR, "item-loadouts.json");
  writeFileSync(itemLoadoutsOut, JSON.stringify(itemLoadouts, null, 2));
  console.log(`Wrote ${Object.keys(itemLoadouts).length} item-loadout mappings to ${itemLoadoutsOut}`);
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  console.log("No starting loadouts LTX found, skipping starting-loadouts.json");
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
// Add Starting Loadouts to categories if the JSON was generated
if (existsSync(join(OUT_DIR, "starting-loadouts.json"))) {
  categoriesList.push("Starting Loadouts");
}
const categoriesOut = join(OUT_DIR, "categories.json");
writeFileSync(categoriesOut, JSON.stringify(categoriesList, null, 2));
console.log(`Wrote ${categoriesList.length} categories to ${categoriesOut}`);

// Generate calibers.json from processed ammo data (enriched with stats)
const AMMO_STAT_KEYS = ["ui_inv_damage", "ui_inv_accuracy", "ui_inv_wrange", "st_data_export_falloff", "ui_inv_bspeed", "st_data_export_projectiles", "st_upgr_cost", "st_data_export_weapon_degradation", "st_data_export_k_hit", "st_data_export_k_ap", "st_data_export_k_air_resistance"];

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
  // Generate ballistic-ranges.json — theoretical max values for radar chart normalization
  // For each weapon, find max k_hit and k_ap across its compatible ammo, compute max raw damage and AP
  let maxDamage = 0; // max hit_power * k_hit
  let maxAp = 0;     // max k_ap * 10
  let maxDps = 0;    // max hit_power * k_hit * fire_rate / 60

  for (const slug of WEAPON_SLUGS) {
    const catData = categoryData.get(slug);
    if (!catData) continue;
    for (const wpn of catData.items) {
      const hitPower = parseFloat(wpn["st_data_export_hit_power"]) || 0;
      const fireRate = parseFloat(wpn["ui_inv_rate_of_fire"]) || 0;
      if (!hitPower) continue;

      // Find compatible ammo via caliber keys
      const ammoTypes = (wpn["ui_ammo_types"] || "").split(";").map(s => s.trim()).filter(Boolean);
      const altAmmoTypes = (wpn["st_data_export_ammo_types_alt"] || "").split(";").map(s => s.trim()).filter(Boolean);
      const allAmmoKeys = [...ammoTypes, ...altAmmoTypes];

      for (const ammoItem of ammoData.items) {
        const ammoName = ammoItem.pda_encyclopedia_name || ammoItem.displayName || "";
        const isCompat = allAmmoKeys.some(t => ammoName === t || ammoName.startsWith(t));
        if (!isCompat) continue;

        const kHit = parseFloat(ammoItem["st_data_export_k_hit"]) || 0;
        const kAp = parseFloat(ammoItem["st_data_export_k_ap"]) || 0;

        const rawDmg = hitPower * kHit;
        const rawAp = kAp * 10;
        const rawDps = rawDmg * fireRate / 60;

        if (rawDmg > maxDamage) maxDamage = rawDmg;
        if (rawAp > maxAp) maxAp = rawAp;
        if (rawDps > maxDps) maxDps = rawDps;
      }
    }
  }

  const ballisticRanges = {
    maxDamage: Math.round(maxDamage * 1000) / 1000,
    maxAp: Math.round(maxAp * 1000) / 1000,
    maxDps: Math.round(maxDps * 100) / 100,
  };
  const brOut = join(OUT_DIR, "ballistic-ranges.json");
  writeFileSync(brOut, JSON.stringify(ballisticRanges, null, 2));
  console.log(`Wrote ballistic ranges (maxDmg=${ballisticRanges.maxDamage}, maxAp=${ballisticRanges.maxAp}, maxDps=${ballisticRanges.maxDps}) to ${brOut}`);

} else {
  console.log("No ammo data found, skipping calibers.json");
}

// Generate mutant-profiles.json from export_mutant_profiles.csv
const MUTANT_PROFILES_FILE = join(CSV_DIR, "export_mutant_profiles.csv");
try {
  const mpText = readFileSync(MUTANT_PROFILES_FILE, "utf-8");
  const mpLines = mpText.split(/\r?\n/).filter((l) => l.length > 0);
  if (mpLines.length > 1) {
    const mpHeaders = parseCsvLine(mpLines[0]).map((h) => h.trim());
    const profiles = [];
    for (let i = 1; i < mpLines.length; i++) {
      const cols = parseCsvLine(mpLines[i]);
      const id = cols[0]?.trim();
      if (!id) continue;
      const profile = { id };
      for (let j = 1; j < mpHeaders.length; j++) {
        const key = mpHeaders[j].replace(/^st_data_export_/, "");
        const val = cols[j]?.trim();
        if (val !== undefined && val !== "") profile[key] = parseFloat(val);
      }
      profiles.push(profile);
    }
    const mpOut = join(OUT_DIR, "mutant-profiles.json");
    writeFileSync(mpOut, JSON.stringify(profiles, null, 2));
    console.log(`Wrote ${profiles.length} mutant profiles to ${mpOut}`);
  }
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  console.log("No mutant profiles CSV found, skipping mutant-profiles.json");
}

// Generate npc-armor-profiles.json from export_npc_armor_profiles.csv
const NPC_ARMOR_FILE = join(CSV_DIR, "export_npc_armor_profiles.csv");
try {
  const napText = readFileSync(NPC_ARMOR_FILE, "utf-8");
  const napLines = napText.split(/\r?\n/).filter((l) => l.length > 0);
  if (napLines.length > 1) {
    const napHeaders = parseCsvLine(napLines[0]).map((h) => h.trim());
    const profiles = [];
    for (let i = 1; i < napLines.length; i++) {
      const cols = parseCsvLine(napLines[i]);
      const id = cols[0]?.trim();
      if (!id) continue;
      const profile = { id };
      for (let j = 1; j < napHeaders.length; j++) {
        const key = napHeaders[j].replace(/^st_data_export_/, "");
        const raw = cols[j]?.trim();
        if (raw === undefined || raw === "") continue;
        const num = parseFloat(raw);
        profile[key] = isNaN(num) ? raw : num;
      }
      profiles.push(profile);
    }
    const napOut = join(OUT_DIR, "npc-armor-profiles.json");
    writeFileSync(napOut, JSON.stringify(profiles, null, 2));
    console.log(`Wrote ${profiles.length} NPC armor profiles to ${napOut}`);
  }
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  console.log("No NPC armor profiles CSV found, skipping npc-armor-profiles.json");
}

// Copy gbo-constants.json if present in pack data
const gboSrc = join(CSV_DIR, "gbo-constants.json");
if (existsSync(gboSrc)) {
  const gboOut = join(OUT_DIR, "gbo-constants.json");
  cpSync(gboSrc, gboOut);
  console.log(`Copied GBO constants to ${gboOut}`);
}

// Generate addon-weapons.json from export_addon_weapon_map.csv (addon ID → weapon IDs)
const ADDON_WEAPON_MAP_FILE = join(CSV_DIR, "export_addon_weapon_map.csv");
try {
  const text = readFileSync(ADDON_WEAPON_MAP_FILE, "utf-8");
  const addonWeapons = {};
  for (const line of text.split(/\r?\n/)) {
    const parts = line.split(",").map((v) => v.trim()).filter(Boolean);
    if (parts.length < 2) continue;
    addonWeapons[parts[0]] = parts.slice(1);
  }
  const awOut = join(OUT_DIR, "addon-weapons.json");
  writeFileSync(awOut, JSON.stringify(addonWeapons, null, 2));
  console.log(`Wrote ${Object.keys(addonWeapons).length} addon-weapon mappings to ${awOut}`);
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  console.log("No addon weapon map CSV found, skipping addon-weapons.json");
}

// Generate weapon-addons.json from export_weapon_addon_map.csv (weapon ID → addons by type)
const WEAPON_ADDON_MAP_FILE = join(CSV_DIR, "export_weapon_addon_map.csv");
try {
  // Build ID sets from the processed item categories for classification
  const scopeIds = new Set((categoryData.get("scopes")?.items || []).map(i => i.id));
  const silencerIds = new Set((categoryData.get("silencers")?.items || []).map(i => i.id));
  const launcherIds = new Set((categoryData.get("grenade-launchers")?.items || []).map(i => i.id));
  const kitIds = new Set((categoryData.get("tactical-kits")?.items || []).map(i => i.id));
  if (!scopeIds.size) console.warn("WARNING: No scope items found in categoryData — weapon-addons.json will have no scope classifications");
  if (!silencerIds.size) console.warn("WARNING: No silencer items found in categoryData — weapon-addons.json will have no silencer classifications");
  if (!launcherIds.size) console.warn("WARNING: No launcher items found in categoryData — weapon-addons.json will have no launcher classifications");

  const text = readFileSync(WEAPON_ADDON_MAP_FILE, "utf-8");
  const weaponAddons = {};
  for (const line of text.split(/\r?\n/)) {
    const parts = line.split(",").map((v) => v.trim()).filter(Boolean);
    if (parts.length < 2) continue;
    const weaponId = parts[0];
    const addons = { scopes: [], silencers: [], launchers: [], kits: [] };
    for (const addonId of parts.slice(1)) {
      if (scopeIds.has(addonId)) addons.scopes.push(addonId);
      else if (silencerIds.has(addonId)) addons.silencers.push(addonId);
      else if (launcherIds.has(addonId)) addons.launchers.push(addonId);
      else if (kitIds.has(addonId)) addons.kits.push(addonId);
    }
    if (addons.scopes.length || addons.silencers.length || addons.launchers.length || addons.kits.length) {
      weaponAddons[weaponId] = addons;
    }
  }
  const waOut = join(OUT_DIR, "weapon-addons.json");
  writeFileSync(waOut, JSON.stringify(weaponAddons, null, 2));
  console.log(`Wrote ${Object.keys(weaponAddons).length} weapon-addon mappings to ${waOut}`);
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  console.log("No weapon addon map CSV found, skipping weapon-addons.json");
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


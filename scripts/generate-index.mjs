import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, cpSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import { generateTraders, getSoldItemIds } from "./generate-traders.mjs";
import { LOADOUT_MODS } from "./loadout-mods.mjs";

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
  "export_item_parts.csv",
  "export_item_part_defs.csv",
  "export_outfit_exchange.csv",
  "export_weapon_drop_sources.csv",
  "export_items_list.csv",
  "export_item_drop_locations.csv",
  "export_artefact_recipes.csv",
  "export_stash_drop_rates.csv",
  "export_toolkit_map_rates.csv",
  "item_chance_in_stash.csv",
  "export_item_chance_in_stash.csv",
  "export_items_common_data.csv",
  "export_mag_capacity.csv",
  "export_magazine_info.csv",
  "export_weapon_magazine_map.csv",
  "export_mutant_profiles.csv",
  "export_npc_armor_profiles.csv",
  "export_adb_plate_mitigation.csv",
  "export_adb_constants.csv",
  "export_addon_weapon_map.csv",
  "export_weapon_addon_map.csv",
  "export_weapon_addon_status.csv",
  "export_craft_device.csv",
  "export_craft_equipment.csv",
  "export_craft_repair.csv",
  "export_craft_upgrades.csv",
  "export_craft_medical.csv",
  "export_craft_ammo.csv",
  "export_craft_artefact.csv",
  "export_craft_furniture.csv",
  "export_craft_decoration.csv",
  "export_upgrades_items.csv",
  "export_upgrade_sections.csv",
  "export_upgrade_effects.csv",
  "export_upgrade_kits.csv",
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

// The game engine writes Windows-1251 text with two kinds of non-ASCII artifacts:
//   1. Color markup:  %c[d_cyan], %c[0,255,255,255], etc.
//   2. U+FFFD replacement characters (appear as Cyrillic пїЅ when decoded
//      from Windows-1251) — used for bullets, dashes, quotes, and apostrophes.
// This function strips both, preserving a hyphen when a dash appears between
// digits (e.g. "3–10x" → "3-10x" instead of "310x").
const WIN1251_REPLACEMENT = "\u043F\u0457\u0405"; // пїЅ — U+FFFD decoded as Windows-1251
function cleanTranslationLine(line) {
  return line
    .replace(/%c\[[^\]]*\]/gi, "")                          // strip color codes
    .replace(new RegExp(`(\\d)${WIN1251_REPLACEMENT}(\\d)`, "g"), "$1-$2") // digit-dash-digit
    .replace(new RegExp(WIN1251_REPLACEMENT, "g"), "")       // strip remaining replacement chars
    .replace(/(\d)\uFFFD(\d)/g, "$1-$2")                    // same for raw U+FFFD (UTF-8 sources)
    .replace(/\uFFFD/g, "");                                 // strip remaining U+FFFD
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

// Keys app_translations.json defines for any locale — used to decide which
// self-referential pack rows are safe to drop (see loadTranslations).
function loadAppTranslationKeys() {
  const path = join(import.meta.dirname, "..", "data", "app_translations.json");
  if (!existsSync(path)) return new Set();
  const app = JSON.parse(readFileSync(path, "utf-8"));
  const keys = new Set();
  for (const locale of Object.keys(app)) {
    for (const k of Object.keys(app[locale] || {})) keys.add(k.toLowerCase());
  }
  return keys;
}
const appTranslationKeys = loadAppTranslationKeys();

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
      const cleanLine = cleanTranslationLine(lines[i]);
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
      // The exporter self-seeds any key with no game string table entry, writing
      // the key as its own value. Pack strings beat app_translations.json in t(),
      // so such a row would shadow our own label and leave the raw key on screen.
      // Only skip it where app_translations has a real string to take its place —
      // dropping self-referential rows wholesale would strip ~300 keys that other
      // code still expects to find in the map.
      if (value.toLowerCase() === key && appTranslationKeys.has(key)) continue;
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
let disassembleIndex = null;    // id -> materials; populated below, reused for magazines

// ── Detect "Magazines" mod items ─────────────────────────────────────────────
// The Magazines mod adds physical magazine items that the exporter mis-files as
// ammo (spawn kind "w_ammo") even though they're attachments (st_class
// "II_ATTCH"). Detect them by that class signature — the single source of truth
// for "is a magazine" — so they can be pulled out of the shared Ammo category and
// given their own opt-in "Magazines" category. Not every player runs the mod.
const MAGAZINE_CATEGORY = "Magazines";
const magazineRows = new Map(); // id -> base fields (from items_common_data)
{
  const icFile = join(CSV_DIR, "export_items_common_data.csv");
  if (existsSync(icFile)) {
    const lines = readFileSync(icFile, "utf-8").split(/\r?\n/).filter((l) => l.length > 0);
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const id = cols[0]?.trim();
      if (!id || cols[1]?.trim() !== "II_ATTCH" || cols[2]?.trim() !== "w_ammo") continue;
      // Skip abstract base/template sections (the mod's "tch_" technical-section
      // convention, e.g. tch_mag_base): they aren't real lootable magazines and
      // have no valid inventory icon. Real magazines are all "mag_*".
      if (id.startsWith("tch_")) continue;
      magazineRows.set(id, {
        id,
        pda_encyclopedia_name: cols[3]?.trim() || "",
        st_data_export_description: cols[4]?.trim() || "",
        st_prop_weight: cols[5]?.trim() || "",
        st_upgr_cost: cols[6]?.trim() || "",
      });
    }
  }
}
const magazineIds = new Set(magazineRows.keys());

// ── Curated field overrides for exporter rows ───────────────────────────────
// Shallow-merged over any item with a matching ID, in every category it appears
// in. This is the counterpart to synthetic-items.json: that file only ADDS rows
// the exporter never emits, and skips on ID collision, so it can't correct a row
// the exporter DID emit. Used for vestigial sections the game config still
// carries — e.g. wpn_addon_silencer, the built-in suppressor that integrally
// suppressed weapons point at, which is not an obtainable item.
// Underscore-prefixed keys (_why) are documentation and are not merged.
const itemOverrides = new Map();
{
  const overridesPath = join(CSV_DIR, "item-overrides.json");
  if (existsSync(overridesPath)) {
    const parsed = JSON.parse(readFileSync(overridesPath, "utf-8"));
    for (const [id, fields] of Object.entries(parsed.items ?? {})) {
      const clean = Object.fromEntries(Object.entries(fields).filter(([k]) => !k.startsWith("_")));
      itemOverrides.set(id, clean);
    }
    console.log(`Loaded ${itemOverrides.size} item overrides from ${overridesPath}`);
  }
}
const overriddenIds = new Set();

for (const file of files) {
  if (SKIP_FILES.has(file)) continue;

  const config = getConfig(file);
  if (!config) {
    console.warn(`No config for ${file}, skipping`);
    continue;
  }

  const { headers, items } = processFile(join(CSV_DIR, file), config);
  const slug = categorySlug(config.category);

  // A weapon with no `fire_modes` ltx line (bolt actions, pump/break shotguns,
  // launchers) has no mode selector and fires single only, which the engine
  // treats as mode 1. Backfill it so the badges, the spelled-out label and the
  // Fire Mode filter all agree instead of the filter silently skipping blanks.
  if (headers.includes("st_data_export_fire_modes")) {
    for (const item of items) {
      if (!item.st_data_export_fire_modes) item.st_data_export_fire_modes = "1";
    }
  }

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
    if (magazineIds.has(item.id)) continue; // magazines get their own category, not Ammo
    // Applied before the `seen` dedupe so every copy of the row is corrected,
    // not just the first category that happens to claim the ID.
    const override = itemOverrides.get(item.id);
    if (override) {
      Object.assign(item, override);
      overriddenIds.add(item.id);
    }
    if (!seen.has(item.id)) {
      seen.add(item.id);
      index.push({ id: item.id, name: item.pda_encyclopedia_name || item[headers[config.nameCol ?? 1]], category: config.category });
      catEntry.items.push(item);
    }
  }

  console.log(`${file}: ${items.length} items (${config.category})`);
}

// Mirror the override flag fields onto index entries so global search applies the
// same filtering, and warn about overrides that matched nothing — a stale entry
// after a pack update would otherwise fail silently.
{
  const FLAG_FIELDS = ["unobtainable", "integralOnly"];
  for (const entry of index) {
    const override = itemOverrides.get(entry.id);
    if (!override) continue;
    for (const f of FLAG_FIELDS) {
      if (override[f] !== undefined) entry[f] = override[f];
    }
  }
  for (const id of itemOverrides.keys()) {
    if (!overriddenIds.has(id)) console.warn(`Item override for "${id}" matched no exporter row — stale?`);
  }
}

// ── Merge synthetic (hand-authored) items into category data + index ─────────
// These are entries the game exporter doesn't emit — e.g. meta artefacts like
// Lucifer that the game spawns dynamically rather than placing in the world.
const syntheticPath = join(CSV_DIR, "synthetic-items.json");
if (existsSync(syntheticPath)) {
  const synthetic = JSON.parse(readFileSync(syntheticPath, "utf-8"));
  for (const entry of synthetic.items ?? []) {
    const slug = categorySlug(entry.category);
    const catEntry = categoryData.get(slug);
    if (!catEntry) {
      console.warn(`Synthetic item: category "${entry.category}" not loaded yet, skipping ${entry.fields?.id}`);
      continue;
    }
    const item = entry.fields;
    if (seen.has(item.id)) {
      console.warn(`Synthetic item ${item.id} collides with an exporter entry; skipping`);
      continue;
    }
    seen.add(item.id);
    catEntry.items.push(item);
    index.push({ id: item.id, name: item.pda_encyclopedia_name || item.displayName, category: entry.category });
    console.log(`Synthetic item: ${item.id} → ${entry.category}`);
  }
}

// ── Split tactical/conversion kits out of the Scopes category ────────────────
// The game exporter lumps all weapon addons (optics + body kits) into the scopes
// CSV. Three detection rules, any of which qualifies an item as a kit:
//   1. ID matches `^kit_` / `_kit$` / `_upgr_kit$`
//   2. A `<base_weapon>_<addonId>` variant exists in the weapon CSVs (the
//      in-game rename that happens when a kit is applied)
//   3. The English PDA name contains the word "Kit" (catches the RDS-style
//      optical kits like "ACOG + 1x RDS Kit" / "Suppressor Adapter Kit" that
//      attach without renaming and don't follow the ID convention)
const earlyTranslations = loadTranslations(CSV_DIR);
const enTranslations = earlyTranslations.en || {};

const WEAPON_SLUGS_FOR_KIT_DETECTION = ["pistols", "smgs", "shotguns", "rifles", "snipers", "launchers"];
const weaponIdsForKitDetection = new Set();
for (const slug of WEAPON_SLUGS_FOR_KIT_DETECTION) {
  for (const it of categoryData.get(slug)?.items || []) {
    weaponIdsForKitDetection.add(it.id);
  }
}

function isTacticalKit(item) {
  if (/_upgr_kit$|_kit$|^kit_/.test(item.id)) return true;
  const suffix = "_" + item.id;
  for (const wid of weaponIdsForKitDetection) {
    if (wid.endsWith(suffix) && wid.length > suffix.length) return true;
  }
  const nameKey = (item.pda_encyclopedia_name || "").toLowerCase();
  const displayName = enTranslations[nameKey] || "";
  if (/\bkit\b/i.test(displayName)) return true;
  return false;
}

const scopeData = categoryData.get("scopes");
if (scopeData) {
  const kits = [];
  const realScopes = [];
  for (const item of scopeData.items) {
    if (isTacticalKit(item)) kits.push(item);
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
      // The base item (empty suffix) keeps its plain name — the variants'
      // bracket suffixes are unique within the group, so no marker is needed.
      item.displayName = suffix ? `${name} [${suffix}]` : name;
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

// Process craft recipe CSVs into craft-recipes.json
const CRAFT_CATEGORIES = [
  { file: "export_craft_device.csv", key: "device", label: "Devices" },
  { file: "export_craft_equipment.csv", key: "equipment", label: "Equipment" },
  { file: "export_craft_repair.csv", key: "repair", label: "Repair" },
  { file: "export_craft_upgrades.csv", key: "upgrades", label: "Upgrades" },
  { file: "export_craft_medical.csv", key: "medical", label: "Medical" },
  { file: "export_craft_ammo.csv", key: "ammo", label: "Ammo" },
  { file: "export_craft_artefact.csv", key: "artefact", label: "Artefacts" },
  { file: "export_craft_furniture.csv", key: "furniture", label: "Furniture" },
  { file: "export_craft_decoration.csv", key: "decoration", label: "Decoration" },
];

const craftRecipes = {};
let craftTotal = 0;
for (const cat of CRAFT_CATEGORIES) {
  const craftFile = join(CSV_DIR, cat.file);
  try {
    const craftText = readFileSync(craftFile, "utf-8");
    const craftLines = craftText.split(/\r?\n/).filter((l) => l.length > 0);
    if (craftLines.length <= 1) continue;

    const items = [];
    for (let i = 1; i < craftLines.length; i++) {
      const cols = parseCsvLine(craftLines[i]);
      const id = cols[0]?.trim();
      const name = cols[1]?.trim();
      if (!id || !name) continue;

      const toolTier = parseInt(cols[2]?.trim(), 10) || 1;
      const recipeReq = cols[3]?.trim() || "";
      const recipeReqName = cols[4]?.trim() || "";

      const ingredients = [];
      // Columns 5-12: repeating pairs of ingredient name + amount
      for (let j = 5; j < cols.length; j += 2) {
        const ingName = cols[j]?.trim();
        const ingAmount = cols[j + 1]?.trim();
        if (!ingName || ingName === "nil") continue;
        ingredients.push({ name: ingName, amount: ingAmount || "x1" });
      }

      items.push({
        id,
        pda_encyclopedia_name: name,
        toolTier,
        recipeReq,
        recipeReqName,
        ingredients,
      });

      // Deliberately NOT added to `seen`: recipe outputs with no real category must
      // still fall through to the Misc catch-all below and get a card (a craftable
      // item like a detector or repair kit is a real item). Recipe outputs that are
      // real category items are already deduped via their category's `seen` entry.
    }

    if (items.length > 0) {
      craftRecipes[cat.key] = { label: cat.label, items };
      craftTotal += items.length;
      console.log(`${cat.file}: ${items.length} recipes (${cat.label})`);
    }
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
}

if (craftTotal > 0) {
  const craftOut = join(OUT_DIR, "craft-recipes.json");
  writeFileSync(craftOut, JSON.stringify(craftRecipes, null, 2));
  console.log(`Wrote ${craftTotal} craft recipes across ${Object.keys(craftRecipes).length} categories to ${craftOut}`);
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

// Obtainability flags (hasNpcWeaponDrop / hasStashDrop / inStartingLoadout /
// unobtainable) and the index.json write are deferred until after the stash-drop
// and starting-loadout blocks have populated their inputs further down.

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

// Generate items-common.json from export_items_common_data.csv
const ITEMS_COMMON_FILE = join(CSV_DIR, "export_items_common_data.csv");
try {
  const icText = readFileSync(ITEMS_COMMON_FILE, "utf-8");
  const icLines = icText.split(/\r?\n/).filter((l) => l.length > 0);
  if (icLines.length > 1) {
    const itemsCommon = {};
    for (let i = 1; i < icLines.length; i++) {
      const cols = parseCsvLine(icLines[i]);
      const id = cols[0]?.trim();
      const name = cols[3]?.trim();
      const priceStr = cols[6]?.trim();
      if (!id) continue;
      const entry = {};
      if (name) entry.name = name;
      const price = parseFloat(priceStr);
      if (!isNaN(price) && price > 0) entry.price = price;
      if (Object.keys(entry).length) itemsCommon[id] = entry;
    }
    const icOut = join(OUT_DIR, "items-common.json");
    writeFileSync(icOut, JSON.stringify(itemsCommon, null, 2));
    console.log(`Wrote ${Object.keys(itemsCommon).length} entries to ${icOut}`);
  }
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  console.log("No items common data CSV found, skipping items-common.json");
}

// ── Misc catch-all category ──────────────────────────────────────────────────
// Real items that exist in the game but land in no other category — devices,
// tools, repair kits, backpacks, etc. (e.g. the Anomaly Detector granted in
// starting loadouts). Sourced from export_items_common_data.csv, filtered to
// "i_*" spawn types (real inventory items) minus quest/letter items, upgrade
// *sections*, artefact containers (i_arty_cont — the same items as the Artefacts
// category) and parts (i_part — covered by the Weapon/Outfit Parts categories),
// and minus anything already a card in another category. Weapon variants (w_*
// spawn types) are intentionally excluded — they're covered by their base weapon
// card. Icons come from export_item_icons.csv, which the icon exporter now
// self-seeds for every real item. Runs after all other categories so `seen` is complete.
const MISC_EXCLUDED_SPAWN_TYPES = new Set(["i_quest", "i_letter", "i_upgrade", "i_arty_cont", "i_part"]);
// Non-real / dummy sections that slip through the spawn-type filter (they have a
// `kind` and inv_grid coords but no drawn icon — the crop is a blank transparent
// PNG). Dropped entirely so they never appear as a card. Add ids here as found.
const MISC_BLACKLIST = new Set([
  "items_anm_dummy",       // "don't spawn, dummy no sound item"
  "itm_xcvb_1", "itm_xcvb_2", "itm_xcvb_3", // test/junk sections
  "fieldcraft_plate_attch", // internal attach, no icon
]);
// Real items whose spawn type falls outside the `i_*` gate but which are genuine
// browsable items (the `w_*` bucket is mostly weapon variants + scope dummies, but a
// few real utility items live there). Forced into Misc regardless of spawn type.
const MISC_WHITELIST = new Set(["bolt", "wpn_binoc_inv"]);
if (existsSync(ITEMS_COMMON_FILE)) {
  const { headers, items } = processFile(ITEMS_COMMON_FILE, { category: "Misc", nameCol: 3 });
  const miscItems = [];
  for (const item of items) {
    const spawn = item["st_ui_dbg_spawn_type"] || "";
    if (!MISC_WHITELIST.has(item.id) && (!spawn.startsWith("i_") || MISC_EXCLUDED_SPAWN_TYPES.has(spawn))) continue;
    if (MISC_BLACKLIST.has(item.id)) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    miscItems.push(item);
    index.push({ id: item.id, name: item.pda_encyclopedia_name || item.id, category: "Misc" });
  }
  if (miscItems.length) {
    categoryData.set("misc", { category: "Misc", headers, items: miscItems });
    console.log(`Misc: ${miscItems.length} uncategorised items → misc.json`);
  }
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

    disassembleIndex = disassemble;

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

// Generate item-parts.json from export_item_parts.csv.
// An item's physical components (Weapon Parts Overhaul) — covers both weapons and
// outfits/helmets. Rows are wide: id, name, kind, then part section ids from column 3.
// kind is "weapon" | "outfit" | "other" so the site can render the two families in
// separate sections. Part fields live in item-part-defs.json (built below) and are
// joined by id — the part ids preserve the tier suffix (several tiers share one display
// name). Skips cleanly when the CSV is absent (WPO / itms_manager not installed, or an
// older extract).
const ITEM_PARTS_FILE = join(CSV_DIR, "export_item_parts.csv");
try {
  const ipText = readFileSync(ITEM_PARTS_FILE, "utf-8");
  const ipLines = ipText.split(/\r?\n/).filter((l) => l.length > 0);
  if (ipLines.length > 1) {
    const itemParts = {};

    for (let i = 1; i < ipLines.length; i++) {
      const cols = parseCsvLine(ipLines[i]);
      const id = cols[0]?.trim();
      if (!id) continue;

      const kind = cols[2]?.trim() || "other";
      const parts = [];
      for (let j = 3; j < cols.length; j++) {
        const partId = cols[j]?.trim();
        if (!partId) break;
        parts.push(partId);
      }

      if (parts.length > 0) {
        itemParts[id] = { kind, parts };
      }
    }

    // Flag items by part family (mirrors hasDisassemble; items are already in
    // categoryData by this point, so the flag lands in the per-category JSON files).
    for (const [slug, data] of categoryData) {
      for (const item of data.items) {
        const entry = itemParts[item.id];
        if (!entry) continue;
        if (entry.kind === "outfit") item.hasOutfitParts = true;
        else item.hasWeaponParts = true;
      }
    }

    const ipOut = join(OUT_DIR, "item-parts.json");
    writeFileSync(ipOut, JSON.stringify(itemParts, null, 2));
    console.log(`Wrote ${Object.keys(itemParts).length} item-parts entries to ${ipOut}`);
  }
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  console.log("No item parts CSV found, skipping item-parts.json");
}

// Generate item-part-defs.json from export_item_part_defs.csv — one entry per unique
// part section: id -> { name, descr, cost, weight }. name/descr are translation keys
// resolved by the site via translations.json; cost/weight are numbers. Skips cleanly
// when absent (same conditions as export_item_parts.csv).
const ITEM_PART_DEFS_FILE = join(CSV_DIR, "export_item_part_defs.csv");
try {
  const pdText = readFileSync(ITEM_PART_DEFS_FILE, "utf-8");
  const pdLines = pdText.split(/\r?\n/).filter((l) => l.length > 0);
  if (pdLines.length > 1) {
    const partDefs = {};

    for (let i = 1; i < pdLines.length; i++) {
      const cols = parseCsvLine(pdLines[i]);
      const id = cols[0]?.trim();
      if (!id) continue;

      const name = cols[1]?.trim() || id;
      const descr = cols[2]?.trim() || "";
      const cost = Number(cols[3]) || 0;
      const weight = Number(cols[4]) || 0;
      partDefs[id] = { name, descr, cost, weight };
    }

    const pdOut = join(OUT_DIR, "item-part-defs.json");
    writeFileSync(pdOut, JSON.stringify(partDefs, null, 2));
    console.log(`Wrote ${Object.keys(partDefs).length} item-part-defs entries to ${pdOut}`);

    // Promote parts to first-class, browsable items in two categories so each part
    // gets its own modal (showing the items it's used in). Split by id prefix:
    // prt_w_* = weapon components, prt_o_* = outfit components. Fields mirror the
    // CSV-sourced categories (string values) so the grid/modal render them the same
    // way. The reverse "used in" lookup is derived client-side from item-parts.json.
    const PART_CATEGORIES = [
      { slug: "weapon-parts", category: "Weapon Parts", prefix: "prt_w_" },
      { slug: "outfit-parts", category: "Outfit Parts", prefix: "prt_o_" },
    ];
    for (const { slug, category, prefix } of PART_CATEGORIES) {
      const items = [];
      for (const [id, d] of Object.entries(partDefs)) {
        if (!id.startsWith(prefix)) continue;
        items.push({
          id,
          pda_encyclopedia_name: d.name,
          st_data_export_description: d.descr,
          st_upgr_cost: String(d.cost),
          st_prop_weight: String(d.weight),
        });
      }
      if (!items.length) continue;
      addDisplayNames(items, "id", "pda_encyclopedia_name");
      categoryData.set(slug, {
        category,
        headers: ["id", "pda_encyclopedia_name", "st_data_export_description", "st_upgr_cost", "st_prop_weight"],
        items,
      });
      for (const item of items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        index.push({ id: item.id, name: item.pda_encyclopedia_name, category });
      }
      console.log(`Promoted ${items.length} parts to ${category}`);
    }
  }
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  console.log("No item part defs CSV found, skipping item-part-defs.json");
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

  // Per-upgrade full effect list (all converted stats), keyed by
  // `${itemSection}\0${upgradeSection}`. Optional — older exports omit it.
  const effectsMap = new Map();
  try {
    const effText = readFileSync(join(CSV_DIR, "export_upgrade_effects.csv"), "utf-8");
    const effLines = effText.split(/\r?\n/).filter((l) => l.length > 0);
    for (let i = 1; i < effLines.length; i++) {
      const cols = parseCsvLine(effLines[i]);
      const itemId = cols[0]?.trim();
      const upgradeSection = cols[1]?.trim();
      const blob = cols[2]?.trim();
      if (!itemId || !upgradeSection || !blob) continue;
      const effects = blob.split("|").map((e) => {
        const [key, value, unit] = e.split(":");
        return { key, value, unit };
      }).filter((e) => e.key && e.value !== undefined);
      if (effects.length) effectsMap.set(`${itemId}\0${upgradeSection}`, effects);
    }
    console.log(`Loaded upgrade effects for ${effectsMap.size} nodes`);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }

  // Upgrade kit consumed by each node. Optional — absent on packs without GAMMA's
  // upgrade overhaul, and on older exports. Keyed by tree coordinates rather than by
  // upgrade section: a few items (SPAS-12, APS, ACE families) reuse one section across
  // two cells that need different kits, so the section alone would collide.
  // All three tiers of a kit share one inv_name, so tier is carried separately.
  const kitsMap = new Map();
  try {
    const kitText = readFileSync(join(CSV_DIR, "export_upgrade_kits.csv"), "utf-8");
    const kitLines = kitText.split(/\r?\n/).filter((l) => l.length > 0);
    for (let i = 1; i < kitLines.length; i++) {
      const cols = parseCsvLine(kitLines[i]);
      const itemId = cols[0]?.trim();
      const row = cols[1]?.trim();
      const col = cols[2]?.trim();
      const cell = cols[3]?.trim();
      const kit = cols[5]?.trim();
      const kitName = cols[6]?.trim();
      const tier = parseInt(cols[7]?.trim(), 10);
      if (!itemId || !row || !kit) continue;
      kitsMap.set(`${itemId}\0${row}\0${col}\0${cell}`, {
        id: kit,
        name: kitName || "",
        tier: Number.isFinite(tier) ? tier : undefined,
      });
    }
    console.log(`Loaded upgrade kits for ${kitsMap.size} nodes`);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }

  const upItemsText = readFileSync(UPGRADE_ITEMS_FILE, "utf-8");
  const upItemsLines = upItemsText.split(/\r?\n/).filter((l) => l.length > 0);
  const upgrades = {};

  for (let i = 1; i < upItemsLines.length; i++) {
    const cols = parseCsvLine(upItemsLines[i]);
    const itemId = cols[0]?.trim();
    if (!itemId) continue;

    const nodes = [];
    // Repeating groups starting at index 2: Row, Column, Cell, Property, Value, [ActualValue,] Name, Desc, Section.
    // The exporter historically emitted 8 fields per group; a newer export inserts an "actual value" field
    // after Value (9 fields) without updating the header. Detect the stride from the field after Value in the
    // first group — a translation key (Name) means the old 8-wide layout; a numeric/empty value means the new
    // 9-wide one — then read Name/Desc/Section from the group tail so the extra field only shifts Value's neighbours.
    const afterValue = cols[2 + 5]?.trim() ?? "";
    const stride = /^[+\-]?[\d.]*$/.test(afterValue) ? 9 : 8;
    for (let n = 0; n < 22; n++) {
      const base = 2 + n * stride;
      const row = cols[base]?.trim();
      const col = cols[base + 1]?.trim();
      const cell = cols[base + 2]?.trim();
      const prop = cols[base + 3]?.trim();
      const val = cols[base + 4]?.trim();
      const name = cols[base + stride - 3]?.trim();
      const desc = cols[base + stride - 2]?.trim();
      const sectionId = cols[base + stride - 1]?.trim();
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
        effects: effectsMap.get(`${itemId}\0${sectionId}`),
        kit: kitsMap.get(`${itemId}\0${row}\0${col}\0${cell}`),
      });
    }

    if (nodes.length > 0) {
      upgrades[itemId] = nodes;
    }
  }

  // Mark items with hasUpgrades, and recompute outfit_artefact_count_max from
  // upgrade values. The game exporter undercounts when an upgrade contributes
  // more than +1 (e.g. "Two-compartment Armor Attachment Module" gives +2).
  for (const [, data] of categoryData) {
    for (const item of data.items) {
      if (item.id in upgrades) item.hasUpgrades = true;

      const nodes = upgrades[item.id];

      // Annotate ammo_class upgrade nodes. The section's ammo_class effect is
      // either a rechamber (introduces a caliber the weapon doesn't fire by
      // default — e.g. TOZ-106 20x70 → 12x76) or a same-caliber ammo unlock
      // (e.g. an AK gaining AP rounds). The displayed prop/name on these nodes
      // is often unrelated (the TOZ-106 rechamber rides on an "accuracy" node),
      // so without this the change is invisible in the tree.
      if (nodes) {
        const baseCalibers = new Set(
          String(item["ui_ammo_types"] || "")
            .split(";").map((s) => s.trim()).filter(Boolean)
            .map(ammoTokenToCaliber)
        );
        for (const node of nodes) {
          const ac = node.stats?.ammo_class;
          if (!ac) continue;
          const tokens = ac.split(";").map((s) => s.trim()).filter(Boolean);
          const newCalibers = [...new Set(tokens.map(ammoTokenToCaliber))]
            .filter((c) => baseCalibers.size && !baseCalibers.has(c));
          if (newCalibers.length) {
            node.rechamberTo = newCalibers.join(", ");
          } else {
            node.ammoUnlock = tokens;
          }
        }
      }

      const baseStr = item["ui_inv_outfit_artefact_count"];
      if (baseStr === undefined || baseStr === null || baseStr === "") continue;
      if (!nodes) continue;
      let sum = 0;
      for (const node of nodes) {
        if (node.prop !== "st_prop_artefact") continue;
        const v = parseInt(node.val, 10);
        if (Number.isFinite(v)) sum += v;
      }
      if (sum > 0) {
        const base = parseInt(baseStr, 10) || 0;
        item["st_data_export_outfit_artefact_count_max"] = String(base + sum);
      }
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

    // Join the stats the exchange view filters and sorts on (armour class,
    // artefact slots, repair class, plus the two raw armour fields that feed
    // ballisticRating()) so it never has to load the whole Outfits category at
    // runtime. Keyed by name, shared between the outfit handed in and the
    // outfits received.
    const oeNames = new Set();
    for (const ex of exchanges) {
      oeNames.add(ex.name);
      for (const v of Object.values(ex.results)) oeNames.add(v);
    }
    const stats = {};
    const numOrNull = (v) => {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : null;
    };
    for (const item of categoryData.get("outfits")?.items || []) {
      const key = item.pda_encyclopedia_name;
      if (!key || !oeNames.has(key) || stats[key]) continue;
      const s = {};
      if (item.ui_mcm_menu_exo === "Y") s.exo = true;
      const art = numOrNull(item.ui_inv_outfit_artefact_count);
      if (art !== null) s.art = art;
      if (item.ui_mm_repair) s.repair = item.ui_mm_repair;
      // Raw armour fields, not display percents: the view runs them through the
      // shared ballisticRating() so there is one implementation of the formula.
      // ARMOR_FIELD_MAP hasn't run yet at this point in the pipeline, so read
      // the raw export columns and fall back to the camelCase names.
      const bone = numOrNull(item.st_data_export_bone_armor ?? item.boneArmor);
      if (bone !== null) s.boneArmor = bone;
      const hfa = numOrNull(item.st_data_export_hit_fraction_actor ?? item.hitFractionActor);
      if (hfa !== null) s.hitFractionActor = hfa;
      stats[key] = s;
    }
    const missingStats = [...oeNames].filter((n) => !stats[n]);
    if (missingStats.length) {
      console.log(`Outfit exchange: no outfit stats for ${missingStats.length} entries (${missingStats.slice(0, 3).join(", ")}…)`);
    }

    const oeOut = join(OUT_DIR, "outfit-exchange.json");
    writeFileSync(oeOut, JSON.stringify({ factions, stats, exchanges }, null, 2));
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

// Generate starting-loadouts.json and item-loadouts.json from new_game_loadouts.ltx.
// The base game file drives item-loadouts.json and the `inStartingLoadout` weapon
// flag; optional loadout mods (see LOADOUT_MODS below) only emit their own
// starting-loadouts-<id>.json, which the app swaps in behind a Mods-menu toggle.

// Parse an LTX body into Map<name, { parent, entries: Map<key,value> }>.
function parseLtxSections(ltxText) {
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
  return sections;
}

// Resolve a single entry key through the (comma-separated) parent chain.
function resolveLtxEntry(sections, name, key, seen = new Set()) {
  if (seen.has(name)) return null;
  seen.add(name);
  const sec = sections.get(name);
  if (!sec) return null;
  if (sec.entries.has(key)) return sec.entries.get(key);
  if (sec.parent) {
    for (const p of sec.parent.split(",")) {
      const v = resolveLtxEntry(sections, p.trim(), key, seen);
      if (v != null) return v;
    }
  }
  return null;
}

// Parse a new_game_loadouts.ltx body into the shape the loadout view consumes.
function parseLoadoutLtx(ltxText) {
  const sections = parseLtxSections(ltxText);

  const pointsSec = sections.get("points");
  const points = [
    parseInt(pointsSec?.entries.get("total_points_eco_1")) || 0,
    parseInt(pointsSec?.entries.get("total_points_eco_2")) || 0,
    parseInt(pointsSec?.entries.get("total_points_eco_3")) || 0,
  ];

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

  const parseLoadoutItems = (sec) => {
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
  };

  // Resolve inheritance: collect items from parent chain + own entries.
  const resolveItems = (sectionName) => {
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
  };

  const sharedItems = parseLoadoutItems(sections.get("shared"));

  // Preferred display order for the known factions; any other [*_loadout] section a
  // mod introduces is appended after these so it isn't silently dropped.
  const FACTION_SECTIONS = [
    "stalker_loadout", "bandit_loadout", "ecolog_loadout", "dolg_loadout",
    "freedom_loadout", "killer_loadout", "army_loadout", "monolith_loadout",
    "csky_loadout", "renegade_loadout", "greh_loadout", "isg_loadout", "zombied_loadout",
  ];
  for (const name of sections.keys()) {
    if (name.endsWith("_loadout") && !FACTION_SECTIONS.includes(name)) FACTION_SECTIONS.push(name);
  }

  const factions = [];
  for (const secName of FACTION_SECTIONS) {
    if (!sections.has(secName)) continue;
    const factionId = secName.replace("_loadout", "");
    const moneySec = sections.get(`${factionId}_money`);
    const money = parseInt(moneySec?.entries.get("money")) || 0;
    const items = resolveItems(secName);
    factions.push({ id: factionId, money, items });
  }

  return { points, factions, shared: sharedItems, ammoPerWeapon, ammoCount };
}

// Base starting loadout. Prefer the in-game export (export_starting_loadouts.json):
// the fully-merged loadout the engine actually builds — the base ltx plus
// mod_new_game_loadouts_*.ltx appends plus runtime *_mcm.script injections (e.g.
// the Thompson → freedom/stalker/csky/bandit/renegade, and the anomaly detector).
// Produced by the "Export starting loadouts" command in
// universal_anomaly_data_export.script. Falls back to parsing the raw ltx (static
// file only, no injected items) until that export has been generated and dropped in.
const LOADOUT_JSON = join(CSV_DIR, "export_starting_loadouts.json");
const LOADOUT_LTX = existsSync(join(CSV_DIR, "source", "new_game_loadouts.ltx"))
  ? join(CSV_DIR, "source", "new_game_loadouts.ltx")
  : join(CSV_DIR, "new_game_loadouts.ltx");
let loadoutsData = null;
if (existsSync(LOADOUT_JSON)) {
  loadoutsData = JSON.parse(readFileSync(LOADOUT_JSON, "utf-8"));
} else if (existsSync(LOADOUT_LTX)) {
  console.log("Starting loadouts: using legacy new_game_loadouts.ltx — run the in-game 'Export starting loadouts' for the fully-merged loadout (mod_ appends + script-injected items)");
  loadoutsData = parseLoadoutLtx(readFileSync(LOADOUT_LTX, "utf-8"));
}
if (loadoutsData) {
  const { factions, shared: sharedItems } = loadoutsData;
  const sharedIdSet = new Set(sharedItems.map(i => i.id));

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

  // Mark weapons/explosives whose IDs appear in any starting loadout
  const loadoutFlagCategories = new Set(["pistols", "smgs", "shotguns", "rifles", "snipers", "launchers", "explosives"]);
  for (const [slug, data] of categoryData) {
    if (!loadoutFlagCategories.has(slug)) continue;
    for (const item of data.items) {
      item.inStartingLoadout = item.id in itemLoadouts;
    }
  }
} else {
  console.log("No starting loadouts source found, skipping starting-loadouts.json");
}

// Optional loadout mods (registry in scripts/loadout-mods.mjs): each present source
// emits its own starting-loadouts-<id>.json. The app discovers these from manifest.json
// and lets the player swap one in via the Mods menu (falls back to the base game file).
// These do NOT feed item-loadouts.json / weapon flags. `generatedLoadoutMods` collects
// the mods actually built so the companion-name and icon passes below can skip absent ones.
const generatedLoadoutMods = [];
for (const mod of LOADOUT_MODS) {
  const modPath = join(CSV_DIR, "source", mod.ltx);
  if (!existsSync(modPath)) continue;
  const data = parseLoadoutLtx(readFileSync(modPath, "utf-8"));
  const outPath = join(OUT_DIR, `starting-loadouts-${mod.id}.json`);
  writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`Wrote ${data.factions.length} faction loadouts to ${outPath}`);
  generatedLoadoutMods.push(mod);
}

// Build the kit→weapon mapping (kit ID → modified weapon IDs). The relationship
// is implicit in the game's naming convention: applying a kit renames the weapon
// to `<base_weapon_id>_<kit_id>`. Scan every obtainability-tracked weapon for
// IDs that end in `_<kitId>` for some known kit. Computed here (before the
// obtainability pass) so kit-derived weapons can be flagged `tacticalKit`
// instead of `unobtainable`; also written out as kit-weapons.json later.
const kitWeapons = {};
const kitDerivedWeaponIds = new Set();
// derived weapon id -> { base: <base weapon id>, kitId: <tactical kit id> }.
// Lets the obtainability pass test whether a kit weapon's prerequisites (the
// base weapon and the kit item) are themselves reachable.
const kitDerivedBase = new Map();
{
  const kitIds = (categoryData.get("tactical-kits")?.items || []).map(i => i.id);
  const allWeaponIds = [];
  for (const slug of ["pistols", "smgs", "shotguns", "rifles", "snipers", "launchers"]) {
    for (const it of categoryData.get(slug)?.items || []) allWeaponIds.push(it.id);
  }
  // Match longest kit-suffix first so e.g. `wpn_kiparis_ots2_upgr_kit` is
  // attributed to `ots2_upgr_kit` rather than the shorter generic `_kit`.
  const sortedKitIds = [...kitIds].sort((a, b) => b.length - a.length);
  for (const wid of allWeaponIds) {
    for (const kitId of sortedKitIds) {
      const suffix = "_" + kitId;
      if (wid.endsWith(suffix) && wid.length > suffix.length) {
        (kitWeapons[kitId] ||= []).push(wid);
        kitDerivedWeaponIds.add(wid);
        kitDerivedBase.set(wid, { base: wid.slice(0, -suffix.length), kitId });
        break;
      }
    }
  }
}

// Mark kit-derived weapons in duplicate-name groups so the UI can render a
// localized "[Kit Upgrade]" suffix instead of the raw ID suffix baked into
// displayName. Groups with more than one kit-derived variant (e.g. the
// Walther P99 mod9 pair) get a stable #N qualifier (ordered by weapon ID)
// so the generic label still disambiguates them.
for (const slug of ["pistols", "smgs", "shotguns", "rifles", "snipers", "launchers"]) {
  const data = categoryData.get(slug);
  if (!data) continue;
  const groups = new Map();
  for (const item of data.items) {
    const name = item.pda_encyclopedia_name || "";
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(item);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const kitVariants = group.filter(i => kitDerivedWeaponIds.has(i.id));
    if (kitVariants.length === 1) {
      kitVariants[0].kitSuffix = true;
    } else if (kitVariants.length > 1) {
      kitVariants.sort((a, b) => a.id.localeCompare(b.id));
      kitVariants.forEach((item, i) => {
        item.kitSuffix = true;
        item.kitSuffixNum = i + 1;
      });
    }
  }
}

// Disambiguate tactical kits that share a translated display name — many are
// literally just "Tactical Kit". Their translation keys are unique, so the
// generic displayName pass never catches them; group by EN-translated name
// instead and tag each duplicate with the name key of the weapon the kit
// produces (from kitWeapons), rendered by the UI as a localized
// "Tactical Kit [Weapon]" suffix. Kits with no weapon mapping fall back to
// the weapon listed in their description's COMPATIBILITY section. Kits whose
// suffix still collides (e.g. the three SA-58 AUS sight kits) get a stable
// #N qualifier (ordered by kit ID), mirroring the kit-derived weapon handling.
const kitNameSuffixes = new Map(); // kit id -> { key, num }
{
  const kitData = categoryData.get("tactical-kits");
  if (kitData) {
    const weaponNameKeyById = new Map();
    const weaponKeyByEnName = new Map();
    for (const slug of ["pistols", "smgs", "shotguns", "rifles", "snipers", "launchers"]) {
      for (const it of categoryData.get(slug)?.items || []) {
        const key = it.pda_encyclopedia_name;
        if (!key) continue;
        weaponNameKeyById.set(it.id, key);
        const enName = enTranslations[key.toLowerCase()];
        if (enName && !weaponKeyByEnName.has(enName)) weaponKeyByEnName.set(enName, key);
      }
    }

    // Fallback for kits that attach without renaming: the EN description ends
    // with a COMPATIBILITY section listing weapon display names as bullets.
    function compatibilityWeaponKey(item) {
      const descr = enTranslations[(item.st_data_export_description || "").toLowerCase()] || "";
      const compat = descr.split(/COMPATIBILITY:/i)[1];
      if (!compat) return undefined;
      for (const line of compat.split("\\n")) {
        const name = line.replace(/^[\s•]+/, "").trim();
        if (name && weaponKeyByEnName.has(name)) return weaponKeyByEnName.get(name);
      }
      return undefined;
    }

    const groups = new Map();
    for (const item of kitData.items) {
      const enName = enTranslations[(item.pda_encyclopedia_name || "").toLowerCase()] || item.pda_encyclopedia_name || "";
      if (!groups.has(enName)) groups.set(enName, []);
      groups.get(enName).push(item);
    }
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      const bySuffix = new Map();
      for (const item of group) {
        const wid = [...(kitWeapons[item.id] || [])].sort()[0];
        const key = (wid && weaponNameKeyById.get(wid)) || compatibilityWeaponKey(item);
        if (!key) {
          console.warn(`Ambiguous tactical kit ${item.id} has no weapon to disambiguate by`);
          continue;
        }
        item.nameSuffixKey = key;
        if (!bySuffix.has(key)) bySuffix.set(key, []);
        bySuffix.get(key).push(item);
      }
      for (const sameSuffix of bySuffix.values()) {
        if (sameSuffix.length < 2) continue;
        sameSuffix.sort((a, b) => a.id.localeCompare(b.id));
        sameSuffix.forEach((item, i) => {
          item.nameSuffixNum = i + 1;
        });
      }
    }
    for (const item of kitData.items) {
      if (item.nameSuffixKey) kitNameSuffixes.set(item.id, { key: item.nameSuffixKey, num: item.nameSuffixNum });
    }
    if (kitNameSuffixes.size > 0) {
      console.log(`Disambiguated ${kitNameSuffixes.size} tactical kits with weapon-name suffixes`);
    }
  }
}

// Compute the derived `unobtainable` / `tacticalKit` flags for weapons,
// explosives, and tactical-kit items, and propagate hasNpcWeaponDrop /
// hasStashDrop / inStartingLoadout / unobtainable / tacticalKit from category
// items into the index entries. Runs after stash-drop and loadout blocks so all
// input flags are available.
//
// "Directly reachable" is category-aware, because how an item enters the world
// differs by type:
//   - Weapons/explosives: a world source — NPC drop, stash, or starting loadout.
//     Trader sales are intentionally NOT counted (preserving existing weapon
//     semantics; only a couple of weapons are sold anyway).
//   - Tactical-kit items: bought, crafted, or stash-found — never NPC-dropped.
// A kit-derived weapon has no direct source of its own; it exists only once a
// kit is applied to a base weapon, so it is reachable only when BOTH (a) its
// base weapon and (b) the kit item that produces it are reachable. Reachability
// is resolved to a fixed point because a base weapon can itself be kit-derived
// (kit items are seeded up front). Kit weapons reachable purely via a kit are
// flagged `tacticalKit`; everything unreachable is flagged `unobtainable`.
const obtainabilityCategories = new Set(["pistols", "smgs", "shotguns", "rifles", "snipers", "launchers", "explosives", "tactical-kits"]);

// Purchase/craft sources for kit items. getSoldItemIds reads the trader CSV
// inputs (source data, not the produced sold-by.json); craftableIds comes from
// the craft recipes built above.
const soldItemIds = getSoldItemIds(pack);
const craftableIds = new Set();
for (const grp of Object.values(craftRecipes)) {
  for (const it of grp.items) craftableIds.add(it.id);
}

// Nimble weapon-upgrade trades (base GAMMA — Darkasleif's Nimble Upgrades Guns).
// The trade table isn't in any exporter CSV; it's hardcoded in NimbleTrade.script,
// so it's transcribed into a curated data/<pack>/nimble.json. Each received weapon
// is a real world source (trade a base weapon + RU with Nimble), so it counts
// toward obtainability and gets a `nimble` flag for the UI badge. Absent for packs
// without the file.
const nimbleIds = new Set();
{
  const nimbleFile = join(CSV_DIR, "nimble.json");
  if (existsSync(nimbleFile)) {
    try {
      for (const tr of JSON.parse(readFileSync(nimbleFile, "utf-8")).trades ?? []) {
        if (tr.received) nimbleIds.add(tr.received);
      }
    } catch (e) {
      console.warn(`Could not read nimble.json: ${e.message}`);
    }
  }
}

const directlyReachable = (item, slug) =>
  slug === "tactical-kits"
    ? (item.hasStashDrop === true || soldItemIds.has(item.id) || craftableIds.has(item.id))
    : (item.hasNpcWeaponDrop === true || item.hasStashDrop === true || item.inStartingLoadout === true || nimbleIds.has(item.id));

const obtItems = [];
for (const [slug, data] of categoryData) {
  if (!obtainabilityCategories.has(slug)) continue;
  for (const item of data.items) obtItems.push({ item, slug });
}

const reachable = new Set();
for (const { item, slug } of obtItems) {
  if (directlyReachable(item, slug)) reachable.add(item.id);
}
// A kit weapon's kit id is the producing kit item's id (in tactical-kits), so
// reachable.has(kd.kitId) reflects whether that kit item is itself obtainable.
let reachabilityChanged = true;
while (reachabilityChanged) {
  reachabilityChanged = false;
  for (const { item } of obtItems) {
    if (reachable.has(item.id)) continue;
    const kd = kitDerivedBase.get(item.id);
    if (kd && reachable.has(kd.base) && reachable.has(kd.kitId)) {
      reachable.add(item.id);
      reachabilityChanged = true;
    }
  }
}
for (const { item, slug } of obtItems) {
  item.unobtainable = !reachable.has(item.id);
  item.tacticalKit = reachable.has(item.id)
    && !directlyReachable(item, slug)
    && kitDerivedWeaponIds.has(item.id);
  item.nimble = nimbleIds.has(item.id);
}

const obtainabilityLookup = new Map();
for (const [slug, data] of categoryData) {
  if (!obtainabilityCategories.has(slug)) continue;
  for (const item of data.items) {
    obtainabilityLookup.set(item.id, {
      hasNpcWeaponDrop: item.hasNpcWeaponDrop,
      hasStashDrop: item.hasStashDrop,
      inStartingLoadout: item.inStartingLoadout === true,
      unobtainable: item.unobtainable === true,
      tacticalKit: item.tacticalKit === true,
      nimble: item.nimble === true,
      kitSuffix: item.kitSuffix === true,
      kitSuffixNum: item.kitSuffixNum,
    });
  }
}
for (const entry of index) {
  const flags = obtainabilityLookup.get(entry.id);
  if (!flags) continue;
  entry.hasNpcWeaponDrop = flags.hasNpcWeaponDrop;
  entry.hasStashDrop = flags.hasStashDrop;
  entry.inStartingLoadout = flags.inStartingLoadout;
  entry.unobtainable = flags.unobtainable;
  entry.tacticalKit = flags.tacticalKit;
  if (flags.nimble) entry.nimble = true;
  if (flags.kitSuffix) entry.kitSuffix = true;
  if (flags.kitSuffixNum) entry.kitSuffixNum = flags.kitSuffixNum;
}
// Mirror tactical-kit name suffixes onto index entries so global search
// renders the same disambiguated labels.
for (const entry of index) {
  const suffix = kitNameSuffixes.get(entry.id);
  if (!suffix) continue;
  entry.nameSuffixKey = suffix.key;
  if (suffix.num) entry.nameSuffixNum = suffix.num;
}

// index.json is written further below — deferred past the Magazines block so its
// items are included in the index (needed for category counts and modal navigation).

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

// Faction classification (NATO / WP / other) based on weapon caliber.
// The xray engine and game LTX have no faction concept — this is a static
// caliber-to-faction lookup derived from the ammo translation keys.
// Calibers marked "dual" (9x19, .45 ACP, .357) are used by both blocs in real
// life and across trader stock — ammo gets both tags; weapons fall back to
// design lineage so e.g. PP Vityaz (Russian) classifies as WP while MP5
// (German) classifies as NATO.
const FACTION_BY_CALIBER = {
  // Warsaw Pact / Soviet
  "5.45x39": "wp",
  "7.62x39": "wp",
  "7.62x54": "wp",
  "9x18": "wp",
  "9x39": "wp",
  "7.62x25": "wp",
  "9x21": "wp",
  "12.7x55": "wp",
  "23x75": "wp",
  "23": "wp",
  "vog": "wp",
  "og": "wp",
  "pg": "wp",
  "pkm": "wp",
  // NATO / Western
  "5.56x45": "nato",
  "7.62x51": "nato",
  "338": "nato",
  "5.7x28": "nato",
  "4.6x30": "nato",
  "50": "nato",
  "m209": "nato",
  "magnum": "nato", // .300 Win Mag — used by USSOCOM / UK SF
  // Dual-use (manufactured and consumed by both blocs)
  "9x19": "dual",
  "11.43x23": "dual",
  "357": "dual",
  // Pre-bloc / shared / civilian
  "12x70": "other",
  "12x76": "other",
  "20x70": "other",
  "7.92x33": "other",
  "gauss": "other",
};

function expandFaction(f) {
  if (f === "dual") return ["nato", "wp"];
  return f ? [f] : [];
}

// Shotguns are bloc-neutral by caliber (12/20-gauge shells are used everywhere),
// so we classify them by design lineage instead. Anything unmatched falls back
// to "other".
function shotgunDesignFaction(id) {
  const s = id.toLowerCase();
  if (/mossberg|remington|benelli|ithaca|spas|winchea?ster|usas/.test(s)) return "nato";
  if (/toz|saiga|mp_?1(33|53|55)|vepr|bm_?16|fort_?500|ks_?23|ksg_?23|mts_?255/.test(s)) return "wp";
  return null;
}

// Design-lineage classifier for non-shotgun weapons. Used when caliber alone
// can't pin the bloc — either the caliber is dual-use (9x19/.45/.357) or
// "other" (.300 WinMag pre-fix). Returns null when no design hint is
// available, leaving the caliber-derived classification untouched.
function nonShotgunDesignFaction(id) {
  const s = id.toLowerCase();
  // Russian / Warsaw Pact / Eastern designs (in dual-use calibers)
  if (/^wpn_(gsh18|mp443|pp2000|vityaz|vz61|mp412|pl15)/.test(s)) return "wp";
  // Western / NATO designs (also rescues "other" calibers: Desert Eagle .357,
  // .300 WinMag Winchester rifles).
  if (/colt|desert_eagle|winchester|m1911/.test(s)) return "nato";
  if (/^wpn_(beretta|cz75|glock|hpsa|mp5|mp7|mp9|usp|walther|fnp45|fnx45|sig\d|ump45|kriss|m45a1|thompson|udp9|uzi|korth|aug)/.test(s)) return "nato";
  return null;
}

function ammoTokenToCaliber(token) {
  const stripped = token.replace(/^ammo[-_]/, "");
  const m = stripped.match(/^([0-9]+(?:\.[0-9]+)?(?:x[0-9]+(?:\.[0-9]+)?)?)/);
  if (m) return m[1];
  return stripped.split(/[-_]/)[0];
}

function classifyAmmoTypes(...fields) {
  const factions = new Set();
  let sawDualUseOnly = true;
  let sawAny = false;
  for (const raw of fields) {
    if (!raw) continue;
    for (const tok of raw.split(";").map(s => s.trim()).filter(Boolean)) {
      const cal = ammoTokenToCaliber(tok);
      const f = FACTION_BY_CALIBER[cal];
      if (!f) continue;
      sawAny = true;
      if (f !== "dual") sawDualUseOnly = false;
      for (const x of expandFaction(f)) factions.add(x);
    }
  }
  return { factions: [...factions].sort(), onlyDualUse: sawAny && sawDualUseOnly };
}

const WEAPON_FACTIONS = new Map();
const WEAPON_SLUGS_FOR_FACTIONS = ["pistols", "smgs", "shotguns", "rifles", "snipers", "launchers"];
for (const slug of WEAPON_SLUGS_FOR_FACTIONS) {
  const cat = categoryData.get(slug);
  if (!cat) continue;
  for (const wpn of cat.items) {
    let factions;
    if (slug === "shotguns") {
      // Caliber alone can't distinguish blocs for shotguns — same shells are
      // used worldwide. Fall back to "other" when design lineage is unknown.
      factions = [shotgunDesignFaction(wpn.id) || "other"];
    } else {
      const result = classifyAmmoTypes(wpn["ui_ammo_types"]);
      factions = result.factions;
      // Design lineage takes over when caliber alone is ambiguous:
      //   - "other" only (e.g. Desert Eagle .357 → NATO under old rule)
      //   - dual-use only (e.g. PP Vityaz 9x19 → WP, MP5 9x19 → NATO)
      const onlyOther = factions.length === 1 && factions[0] === "other";
      if (onlyOther || result.onlyDualUse) {
        const ovr = nonShotgunDesignFaction(wpn.id);
        if (ovr) factions = [ovr];
      }
    }
    if (factions.length) {
      wpn.factions = factions;
      WEAPON_FACTIONS.set(wpn.id, factions);
    }
  }
}

const ammoFactionCat = categoryData.get("ammo");
if (ammoFactionCat) {
  for (const ammo of ammoFactionCat.items) {
    const cal = ammoTokenToCaliber(ammo.id);
    const fs = expandFaction(FACTION_BY_CALIBER[cal]);
    if (fs.length) ammo.factions = fs;
  }
}

// Propagate factions to addons via export_addon_weapon_map.csv:
// each addon's factions = union of factions of every weapon it attaches to.
try {
  const addonMapText = readFileSync(join(CSV_DIR, "export_addon_weapon_map.csv"), "utf-8");
  const addonWeaponsMap = new Map();
  for (const line of addonMapText.split(/\r?\n/)) {
    const parts = line.split(",").map(v => v.trim()).filter(Boolean);
    if (parts.length < 2) continue;
    addonWeaponsMap.set(parts[0], parts.slice(1));
  }
  const ADDON_SLUGS = ["scopes", "silencers", "grenade-launchers", "tactical-kits"];
  for (const slug of ADDON_SLUGS) {
    const cat = categoryData.get(slug);
    if (!cat) continue;
    for (const addon of cat.items) {
      const weapons = addonWeaponsMap.get(addon.id);
      if (!weapons) continue;
      const factionSet = new Set();
      for (const wId of weapons) {
        const fs = WEAPON_FACTIONS.get(wId);
        if (fs) for (const f of fs) factionSet.add(f);
      }
      if (factionSet.size) addon.factions = [...factionSet].sort();
    }
  }
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}

// ── Build the optional "Magazines" category (non-destructive, durable store) ──
// magazines.json doubles as a committed store: union the magazines found in THIS
// extract with whatever is already committed, so regenerating from an extract
// taken WITHOUT the Magazines mod never drops them. Registered here so the write
// loop below emits magazines.json and lists it; the app hides it behind an
// opt-in toggle. (Post-loop passes only touch fixed weapon/ammo slugs, so a
// Magazines entry added now is left untouched by them.)
{
  const magOutFile = join(OUT_DIR, "magazines.json");
  const merged = new Map();
  if (existsSync(magOutFile)) {
    try {
      for (const it of (JSON.parse(readFileSync(magOutFile, "utf-8")).items ?? [])) {
        if (it.id?.startsWith("tch_")) continue; // evict template rows from older stores
        merged.set(it.id, it);
      }
    } catch (e) {
      console.warn(`Could not read existing magazines.json: ${e.message}`);
    }
  }
  // export_magazine_info.csv carries each magazine's size class (small/medium/large)
  // and round capacity — fields the Magazines mod sets but items_common_data omits.
  // Absent without the mod, so we carry prior values forward (below) to stay durable.
  const magInfo = new Map(); // id -> { magSize, magRounds }
  const magInfoFile = join(CSV_DIR, "export_magazine_info.csv");
  if (existsSync(magInfoFile)) {
    const lines = readFileSync(magInfoFile, "utf-8").split(/\r?\n/).filter((l) => l.length > 0);
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const id = cols[0]?.trim();
      if (!id) continue;
      magInfo.set(id, {
        magSize: cols[2]?.trim() || "",
        magRounds: parseInt(cols[3], 10) || 0,
      });
    }
  }
  for (const [id, row] of magazineRows) {
    const cal = id.match(/(\d+\.?\d*x\d+)/);
    const prev = merged.get(id);          // prior committed entry (durable store)
    const info = magInfo.get(id);         // fresh extract (overrides prior)
    const magSize = info?.magSize || prev?.magSize || "";
    const magRounds = info?.magRounds ?? prev?.magRounds ?? 0;
    merged.set(id, {
      ...row,
      caliber: cal ? cal[1] : "",
      magSize,
      magRounds,
      displayName: row.pda_encyclopedia_name,
      hasDisassemble: disassembleIndex ? id in disassembleIndex : false,
    });
  }
  if (merged.size > 0) {
    const items = [...merged.values()].sort((a, b) => a.id.localeCompare(b.id));
    categoryData.set(categorySlug(MAGAZINE_CATEGORY), {
      category: MAGAZINE_CATEGORY,
      headers: ["id", "pda_encyclopedia_name", "st_data_export_description", "st_prop_weight", "st_upgr_cost", "caliber", "magSize", "magRounds"],
      items,
    });
    // Register in the global index so the category gets a count and items are
    // navigable/openable (the app resolves modal navigation through index.json).
    for (const it of items) {
      index.push({ id: it.id, name: it.pda_encyclopedia_name || it.displayName, category: MAGAZINE_CATEGORY });
    }
    console.log(`Magazines: ${magazineRows.size} from extract, ${items.length} total after merge`);
  }
}

// Write index.json (deferred so obtainability flags and the Magazines category are
// included). Re-run addDisplayNames because entries added after the initial pass
// (Materials at the disassembles step, Magazines here) wouldn't otherwise have it set.
addDisplayNames(index, "id", "name");
index.sort((a, b) => a.displayName.localeCompare(b.displayName));
writeFileSync(OUT_FILE, JSON.stringify(index, null, 2));
console.log(`\nWrote ${index.length} items to ${OUT_FILE}`);

// ── Magazine carry capacity per gear item (Magazines mod) ────────────────────
// export_mag_capacity.csv lists the small/medium/large magazine slots granted by
// outfits, backpacks and belt mag-pouch artefacts (they stack additively in-game).
// Emitted as an id-keyed lookup (mag-capacity.json) and attached inline to the
// matching category items as `magCapacity`. Like magazines.json, the lookup is a
// committed durable store: merged non-destructively so regenerating from an extract
// taken WITHOUT the mod never drops it. Skips cleanly when the CSV is absent.
{
  const magCapOutFile = join(OUT_DIR, "mag-capacity.json");
  const magCap = {};
  // existing committed store first (current extract overrides per id)
  if (existsSync(magCapOutFile)) {
    try {
      Object.assign(magCap, JSON.parse(readFileSync(magCapOutFile, "utf-8")));
    } catch (e) {
      console.warn(`Could not read existing mag-capacity.json: ${e.message}`);
    }
  }
  const magCapFile = join(CSV_DIR, "export_mag_capacity.csv");
  if (existsSync(magCapFile)) {
    const lines = readFileSync(magCapFile, "utf-8").split(/\r?\n/).filter((l) => l.length > 0);
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const id = cols[0]?.trim();
      if (!id) continue;
      magCap[id] = {
        provider: cols[2]?.trim() || "",
        small: parseInt(cols[3], 10) || 0,
        medium: parseInt(cols[4], 10) || 0,
        large: parseInt(cols[5], 10) || 0,
      };
    }
  }
  if (Object.keys(magCap).length > 0) {
    writeFileSync(magCapOutFile, JSON.stringify(magCap, null, 2));
    // Attach inline to matching category items (outfits, belt attachments, artefacts…)
    let attached = 0;
    for (const [, data] of categoryData) {
      for (const item of data.items) {
        const cap = magCap[item.id];
        if (cap) {
          item.magCapacity = { small: cap.small, medium: cap.medium, large: cap.large };
          attached++;
        }
      }
    }
    console.log(`Mag capacity: ${Object.keys(magCap).length} providers, attached to ${attached} items`);
  }
}

// ── Coerce raw armor fields on outfits + helmets into typed calc inputs ──────
// The exporter emits these raw LTX numerics (blank on plain Anomaly / older
// extracts). They drive the GAMMA actor armor formula and can't be recovered
// from the display percents (see docs/gamma-actor-damage-formula.md):
//   * hitFractionActor — bullet penetration gate: (1 - hfa) * cond >= k_ap
//   * boneArmor        — real flat BR% multiplicand (spine for outfits, head
//                        for helmets); NOT the displayed fire_wound_protection
//   * apScale          — penetrating-damage falloff (engine / NPC path)
//   * brClass          — coarse br_class tier label from the LTX header; NOT
//                        the penetration gate (that's hitFractionActor) and NOT
//                        equal to it — e.g. Nosorog brClass 0.17 vs hfa 0.31
// Converted to typed camelCase fields and stripped from the raw header set so
// they don't render as untranslated table columns. Absent columns => omitted.
const ARMOR_FIELD_MAP = {
  st_data_export_hit_fraction_actor: "hitFractionActor",
  st_data_export_br_class: "brClass",
  st_data_export_bone_armor: "boneArmor",
  st_data_export_ap_scale: "apScale",
};
for (const slug of ["outfits", "helmets"]) {
  const cat = categoryData.get(slug);
  if (!cat) continue;
  let enriched = 0;
  for (const item of cat.items) {
    let touched = false;
    for (const [rawKey, outKey] of Object.entries(ARMOR_FIELD_MAP)) {
      const raw = item[rawKey];
      delete item[rawKey]; // drop the raw string column regardless
      if (raw === undefined || raw === "") continue;
      const num = parseFloat(raw);
      if (!isNaN(num)) { item[outKey] = num; touched = true; }
    }
    if (touched) enriched++;
  }
  cat.headers = cat.headers.filter((h) => !(h in ARMOR_FIELD_MAP));
  if (enriched) console.log(`Armor fields: enriched ${enriched} ${slug}`);
}

// ── ADB ballistic-plate mitigation table ────────────────────────────────────
// The GAMMA Actor Damage Balancer's mitigation table lives only in Lua, so the
// exporter dumps it. Each belt-item section contributes apRes (raises the
// penetration threshold) and premitigation (adds to the stopped-round flat
// reduction), split by body/head slot. Parsed here -- before the category write --
// because the body values are merged onto artefact/belt items below; the same
// object is written out as adb-plate-mitigation.json further down.
const ADB_MIT_FILE = join(CSV_DIR, "export_adb_plate_mitigation.csv");
const plateMitigation = (() => {
  try {
    const lines = readFileSync(ADB_MIT_FILE, "utf-8").split(/\r?\n/).filter((l) => l.length > 0);
    if (lines.length <= 1) return null;
    const mit = { body: {}, head: {} };
    const num = (s) => { const n = parseFloat(s); return isNaN(n) ? undefined : n; };
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const sec = cols[0]?.trim();
      if (!sec || sec === "~") continue;
      const bAp = num(cols[1]), bPre = num(cols[2]), hAp = num(cols[3]), hPre = num(cols[4]);
      if (bAp !== undefined || bPre !== undefined) mit.body[sec] = { apRes: bAp ?? 0, premitigation: bPre ?? 0 };
      if (hAp !== undefined || hPre !== undefined) mit.head[sec] = { apRes: hAp ?? 0, premitigation: hPre ?? 0 };
    }
    return mit;
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
    return null;
  }
})();

// ── Coerce raw belt-item ballistic fields into typed calc inputs ─────────────
// Artefacts and belt attachments (mutant hides, ballistic plates) both feed the
// actor armor formula. The exporter's percent columns are the same values already
// scaled by 0.6 * arti_adjuster at full condition; these are the raw LTX numerics
// ADB itself reads, so the calc can apply condition and the adjusters itself:
//   * fireWoundImmunity — flat BR% bucket, ADB applies cond * 0.6 * arti_adjuster.
//     CAN BE NEGATIVE (af_oasis_heart -0.35, af_glass -0.24): several artefacts
//     trade flat BR% for premitigation, so never clamp this at 0.
//   * fireWoundCap      — raises the 0.65 protection limiter (hard cap 0.90)
// The penetration-gate half (apRes / premitigation) isn't in any LTX and comes
// from adb-plate-mitigation.json instead. Same strip-the-raw-column treatment as
// ARMOR_FIELD_MAP above; absent columns => omitted.
const BELT_BALLISTIC_FIELD_MAP = {
  st_data_export_fire_wound_immunity: "fireWoundImmunity",
  st_data_export_fire_wound_cap: "fireWoundCap",
};
for (const slug of ["artefacts", "belt-attachments"]) {
  const cat = categoryData.get(slug);
  if (!cat) continue;
  let enriched = 0;
  for (const item of cat.items) {
    let touched = false;
    for (const [rawKey, outKey] of Object.entries(BELT_BALLISTIC_FIELD_MAP)) {
      const raw = item[rawKey];
      delete item[rawKey]; // drop the raw string column regardless
      if (raw === undefined || raw === "") continue;
      const num = parseFloat(raw);
      if (!isNaN(num)) { item[outKey] = num; touched = true; }
    }
    if (touched) enriched++;
  }
  cat.headers = cat.headers.filter((h) => !(h in BELT_BALLISTIC_FIELD_MAP));
  if (enriched) console.log(`Belt ballistic fields: enriched ${enriched} ${slug}`);
}

// ── Merge the two ADB mitigation channels onto belt items as real columns ────
// apRes and premitigation are the only bullet-mitigation facts NOT already shown
// on these items (fire_wound immunity and cap surface as the Ballistic Res /
// Ballistic Cap columns). Materialising them as ordinary percent-scaled numeric
// fields -- rather than computing them client-side -- is what lets the existing
// header, sort, table and *filter-range* machinery pick them up untouched:
// `availableFilters` reads item[key] directly, so a runtime-only value would get
// a column but never a filter.
// Body/torso values only. Ballistic plates have no head entry at all (they do
// nothing for a helmet) and mutant hides are symmetric, so the body number is
// always present and never contradicts the head one; the head caveat lives in the
// column tooltip instead of a second near-duplicate pair of columns.
// Zero contributions are left unset so the column stays absent for the ~65 items
// that don't participate.
const BELT_MIT_COLUMNS = [
  ["apRes", "st_data_export_belt_br_class"],
  ["premitigation", "st_data_export_belt_stopped_bonus"],
];
if (plateMitigation) {
  for (const slug of ["artefacts", "belt-attachments"]) {
    const cat = categoryData.get(slug);
    if (!cat) continue;
    const present = new Set();
    for (const item of cat.items) {
      const m = plateMitigation.body[item.id];
      if (!m) continue;
      for (const [src, key] of BELT_MIT_COLUMNS) {
        if (!m[src]) continue; // 0 => no contribution, leave the column unset
        item[key] = Math.round(m[src] * 1000) / 10; // fraction -> percent points
        present.add(key);
      }
    }
    // Slot them straight after Ballistic Res so all the bullet-defence numbers sit
    // together, in both the stat grid's reading order and the table's columns.
    const anchor = cat.headers.indexOf("ui_inv_outfit_fire_wound_protection");
    let at = anchor >= 0 ? anchor + 1 : cat.headers.length;
    for (const [, key] of BELT_MIT_COLUMNS) {
      if (!present.has(key) || cat.headers.includes(key)) continue;
      cat.headers.splice(at++, 0, key);
    }
    if (present.size) console.log(`Belt mitigation columns: ${[...present].join(", ")} on ${slug}`);
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
          if (wpn.unobtainable === true) ref.noDrop = true;
          if (wpn.tacticalKit === true) ref.tacticalKit = true;
          if (wpn.kitSuffix === true) ref.kitSuffix = true;
          if (wpn.kitSuffixNum) ref.kitSuffixNum = wpn.kitSuffixNum;
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

// Write adb-plate-mitigation.json (parsed above, before the category write, since
// the body values are also merged onto artefact/belt items as real columns). Kept
// as a standalone file because the actor armor calc needs the head split too.
if (plateMitigation) {
  const out = join(OUT_DIR, "adb-plate-mitigation.json");
  writeFileSync(out, JSON.stringify(plateMitigation, null, 2));
  console.log(`Wrote plate mitigation (${Object.keys(plateMitigation.body).length} body, ${Object.keys(plateMitigation.head).length} head) to ${out}`);
} else {
  console.log("No ADB plate mitigation CSV found, skipping adb-plate-mitigation.json");
}

// Generate adb-constants.json from export_adb_constants.csv — the per-damage-type
// multipliers get_adb_constants() feeds the player armor formula. basePremitigation
// (0.40) and hardCap (0.90) are script literals (not per-type, not exported), added
// here so the site's calc has the full constant set in one place.
const ADB_CONST_FILE = join(CSV_DIR, "export_adb_constants.csv");
try {
  const lines = readFileSync(ADB_CONST_FILE, "utf-8").split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length > 1) {
    const byType = {};
    const num = (s) => { const n = parseFloat(s); return isNaN(n) ? s : n; };
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const ht = cols[0]?.trim();
      if (!ht || ht === "~") continue;
      byType[ht] = {
        adjuster: num(cols[1]?.trim()),
        artiAdjuster: num(cols[2]?.trim()),
        limiter: num(cols[3]?.trim()),
        immunity: cols[4]?.trim() || "",
        capStat: cols[5]?.trim() || "",
        defense: cols[6]?.trim() || "",
      };
    }
    const constants = { byType, basePremitigation: 0.4, hardCap: 0.9 };
    const out = join(OUT_DIR, "adb-constants.json");
    writeFileSync(out, JSON.stringify(constants, null, 2));
    console.log(`Wrote ADB constants (${Object.keys(byType).length} damage types) to ${out}`);
  }
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  console.log("No ADB constants CSV found, skipping adb-constants.json");
}

// Copy gbo-constants.json if present in pack data
const gboSrc = join(CSV_DIR, "gbo-constants.json");
if (existsSync(gboSrc)) {
  const gboOut = join(OUT_DIR, "gbo-constants.json");
  cpSync(gboSrc, gboOut);
  console.log(`Copied GBO constants to ${gboOut}`);
}

// Copy pba-constants.json (Perk Based Artefacts) if present in pack data
const pbaSrc = join(CSV_DIR, "pba-constants.json");
if (existsSync(pbaSrc)) {
  const pbaOut = join(OUT_DIR, "pba-constants.json");
  cpSync(pbaSrc, pbaOut);
  console.log(`Copied PBA constants to ${pbaOut}`);
}

// Per-weapon addon status (X-Ray EWeaponAddonStatus): 0=disabled, 1=permanent/integral, 2=attachable.
// The exporter map now carries both attachable (2) and integral (1) addons; this status data lets us
// tag the integral ones so the UI can show them in the "compatible" section with an "Integrated"
// badge (rather than hide them) and the ballistics calc can treat integral silencers as always-on.
// Written to weapon-addon-status.json. Absent (old extract) => empty map => no integral tagging.
const weaponAddonStatus = {};
{
  const statusFile = join(CSV_DIR, "export_weapon_addon_status.csv");
  if (existsSync(statusFile)) {
    for (const line of readFileSync(statusFile, "utf-8").split(/\r?\n/)) {
      const parts = line.split(",").map((v) => v.trim());
      if (parts.length < 4 || parts[0] === "" || parts[0] === "~") continue;
      weaponAddonStatus[parts[0]] = {
        silencer: Number(parts[1]) || 0,
        scope: Number(parts[2]) || 0,
        launcher: Number(parts[3]) || 0,
      };
    }
    const wsOut = join(OUT_DIR, "weapon-addon-status.json");
    writeFileSync(wsOut, JSON.stringify(weaponAddonStatus, null, 2));
    console.log(`Wrote ${Object.keys(weaponAddonStatus).length} weapon addon statuses to ${wsOut}`);
  }
}

// Addon ID → type sets, shared by both addon maps for status-aware filtering.
const scopeIds = new Set((categoryData.get("scopes")?.items || []).map(i => i.id));
const silencerIds = new Set((categoryData.get("silencers")?.items || []).map(i => i.id));
const launcherIds = new Set((categoryData.get("grenade-launchers")?.items || []).map(i => i.id));
const kitIds = new Set((categoryData.get("tactical-kits")?.items || []).map(i => i.id));
if (!scopeIds.size) console.warn("WARNING: No scope items found in categoryData — weapon-addons.json will have no scope classifications");
if (!silencerIds.size) console.warn("WARNING: No silencer items found in categoryData — weapon-addons.json will have no silencer classifications");
if (!launcherIds.size) console.warn("WARNING: No launcher items found in categoryData — weapon-addons.json will have no launcher classifications");

// Per-slot integral flags for a weapon (status 1 = eAddonPermanent), e.g. { silencer: true }.
// Drives the "Integrated" badge in the UI. Returns null when the weapon has no integral slot.
function integralSlots(weaponId) {
  const st = weaponAddonStatus[weaponId];
  if (!st) return null;
  const integral = {};
  if (st.silencer === 1) integral.silencer = true;
  if (st.scope === 1) integral.scope = true;
  if (st.launcher === 1) integral.launcher = true;
  return Object.keys(integral).length ? integral : null;
}

// Generate addon-weapons.json from export_addon_weapon_map.csv (addon ID → weapon IDs).
// Includes weapons that mount the addon integrally as well as attachably (the UI badges integral).
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

// Generate weapon-magazines.json from export_weapon_magazine_map.csv (weapon ID → mag IDs).
// Durable committed store like magazines.json: merge this extract over whatever is already
// committed so regenerating from an extract taken WITHOUT GAMMA Mags Reloaded never drops it.
{
  const wmOut = join(OUT_DIR, "weapon-magazines.json");
  const weaponMags = {};
  if (existsSync(wmOut)) {
    try {
      Object.assign(weaponMags, JSON.parse(readFileSync(wmOut, "utf-8")));
    } catch (e) {
      console.warn(`Could not read existing weapon-magazines.json: ${e.message}`);
    }
  }
  const wmFile = join(CSV_DIR, "export_weapon_magazine_map.csv");
  if (existsSync(wmFile)) {
    for (const line of readFileSync(wmFile, "utf-8").split(/\r?\n/)) {
      const parts = line.split(",").map((v) => v.trim()).filter(Boolean);
      if (parts.length < 2) continue;
      weaponMags[parts[0]] = parts.slice(1); // current extract overrides per weapon
    }
  }
  if (Object.keys(weaponMags).length > 0) {
    writeFileSync(wmOut, JSON.stringify(weaponMags, null, 2));
    console.log(`Wrote ${Object.keys(weaponMags).length} weapon-magazine mappings to ${wmOut}`);
  }
}

// Generate weapon-addons.json from export_weapon_addon_map.csv (weapon ID → addons by type)
const WEAPON_ADDON_MAP_FILE = join(CSV_DIR, "export_weapon_addon_map.csv");
try {
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
      // Tag integral slots (status 1) so the UI badges them "Integrated" instead of hiding them.
      const integral = integralSlots(weaponId);
      if (integral) addons.integral = integral;
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

// Write kit-weapons.json: kit ID → modified weapon IDs. The mapping itself is
// computed earlier (before the obtainability pass) so the `tacticalKit` flag
// can reuse it.
if ((categoryData.get("tactical-kits")?.items || []).length) {
  const kwOut = join(OUT_DIR, "kit-weapons.json");
  writeFileSync(kwOut, JSON.stringify(kitWeapons, null, 2));
  console.log(`Wrote ${Object.keys(kitWeapons).length} kit→weapon mappings to ${kwOut}`);
}

// Generate translations.json from translation CSVs + supplementary.
// Reuses the early load done for kit-detection above.
const translations = earlyTranslations;
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

// Inject companion item names for any generated loadout mod that ships companions.
// The loadout view resolves <faction>_sim_squad_comp_N_comp_item IDs via t(id); map
// each to its display name from the mod's companions.ltx (id -> inv_name key, through
// parent inheritance) + the eng/rus string tables (key -> text). The Russian XML
// typically only defines the base names; faction-specific ones resolve to the English
// text via t()'s en fallback, so we only set ru where the XML has it.
{
  const parseStringTable = (xmlPath) => {
    const map = {};
    if (!existsSync(xmlPath)) return map;
    const text = new TextDecoder("windows-1251").decode(readFileSync(xmlPath));
    const re = /<string id="([^"]+)">\s*<text>([\s\S]*?)<\/text>/g;
    let m;
    while ((m = re.exec(text))) map[m[1].toLowerCase()] = m[2].trim();
    return map;
  };
  let injected = 0;
  for (const mod of generatedLoadoutMods) {
    const comp = mod.companions;
    if (!comp) continue;
    const compLtxPath = join(CSV_DIR, "source", comp.ltx);
    if (!existsSync(compLtxPath)) continue;
    const compSections = parseLtxSections(readFileSync(compLtxPath, "utf-8"));
    const engStr = parseStringTable(join(CSV_DIR, "source", comp.eng));
    const rusStr = parseStringTable(join(CSV_DIR, "source", comp.rus));
    for (const [name] of compSections) {
      if (!name.endsWith("_comp_item")) continue;
      const nameKey = resolveLtxEntry(compSections, name, "inv_name");
      if (!nameKey) continue;
      const k = nameKey.toLowerCase();
      const idKey = name.toLowerCase();
      if (engStr[k]) { translations.en[idKey] = engStr[k]; injected++; }
      if (rusStr[k]) translations.ru[idKey] = rusStr[k];
    }
  }
  if (injected) console.log(`Injected ${injected} companion item translations`);

  // Crop companion portrait icons off each mod's sprite sheet (needs sharp; loaded
  // lazily so packs without companion mods don't pull it in).
  if (generatedLoadoutMods.some((m) => m.companions)) {
    const { extractCompanionIcons } = await import("./extract-companion-icons.mjs");
    await extractCompanionIcons(pack, generatedLoadoutMods);
  }
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
generateTraders(pack);

// Trader origin enrichment:
//   1. Tag items sold by ≥70% of combat-traders with `shared: true` — these are
//      the universal-supply rounds (basic FMJ for every common caliber, plus
//      shotgun shells / .357) that ignore bloc.
//   2. Tag each trader in traders-meta.json with `primaryOrigin` derived from
//      the dominant bloc of their *non-shared* combat stock. ≥65% dominance
//      → that bloc; otherwise `mixed`. Traders with no weapons/ammo get
//      `neutral`.
{
  const SHARED_PCT = 0.7;
  const PRIMARY_PCT = 0.65;
  const tradersOutDir = join(OUT_DIR, "traders");
  const itemFactions = new Map(); // id -> factions[]
  const itemCategory = new Map(); // id -> category slug
  for (const slug of ["pistols", "smgs", "shotguns", "rifles", "snipers", "launchers", "ammo"]) {
    const cat = categoryData.get(slug);
    if (!cat) continue;
    for (const it of cat.items) {
      if (Array.isArray(it.factions)) itemFactions.set(it.id, it.factions);
      itemCategory.set(it.id, slug);
    }
  }

  const stockByTrader = new Map(); // trader -> Set<itemId>
  const traderFiles = readdirSync(tradersOutDir).filter(f => f.endsWith(".json"));
  for (const f of traderFiles) {
    const traderId = f.replace(/\.json$/, "");
    const j = JSON.parse(readFileSync(join(tradersOutDir, f), "utf-8"));
    const set = new Set();
    for (const key of Object.keys(j)) {
      if (!key.startsWith("supplies_")) continue;
      for (const row of (j[key] || [])) {
        const id = row[0];
        if (itemCategory.has(id)) set.add(id);
      }
    }
    if (set.size > 0) stockByTrader.set(traderId, set);
  }
  const combatTraderCount = stockByTrader.size;
  const sharedThreshold = Math.ceil(SHARED_PCT * combatTraderCount);

  // Per-item trader count → shared set
  const itemTraderCount = new Map();
  for (const set of stockByTrader.values()) {
    for (const id of set) itemTraderCount.set(id, (itemTraderCount.get(id) || 0) + 1);
  }
  const sharedIds = new Set();
  for (const [id, count] of itemTraderCount) {
    if (count >= sharedThreshold) sharedIds.add(id);
  }

  // Apply shared:true to category items in memory, then re-write affected JSONs.
  const dirtyCats = new Set();
  for (const slug of ["pistols", "smgs", "shotguns", "rifles", "snipers", "launchers", "ammo"]) {
    const cat = categoryData.get(slug);
    if (!cat) continue;
    for (const it of cat.items) {
      if (sharedIds.has(it.id)) {
        it.shared = true;
        dirtyCats.add(slug);
      }
    }
  }
  for (const slug of dirtyCats) {
    const cat = categoryData.get(slug);
    writeFileSync(join(OUT_DIR, `${slug}.json`), JSON.stringify(cat, null, 2));
  }
  console.log(`Tagged ${sharedIds.size} items shared:true across ${dirtyCats.size} categories (threshold ≥${sharedThreshold}/${combatTraderCount} traders)`);

  // Compute primaryOrigin per trader from non-shared stock.
  const primaryByTrader = new Map();
  for (const [traderId, set] of stockByTrader) {
    let nato = 0, wp = 0;
    for (const id of set) {
      if (sharedIds.has(id)) continue;
      const f = itemFactions.get(id);
      if (!Array.isArray(f) || f.length !== 1) continue;
      if (f[0] === "nato") nato++;
      else if (f[0] === "wp") wp++;
    }
    const total = nato + wp;
    if (total === 0) { primaryByTrader.set(traderId, "neutral"); continue; }
    if (nato / total >= PRIMARY_PCT) primaryByTrader.set(traderId, "nato");
    else if (wp / total >= PRIMARY_PCT) primaryByTrader.set(traderId, "wp");
    else primaryByTrader.set(traderId, "mixed");
  }

  // Merge primaryOrigin into traders-meta.json (preserving manual fields like color).
  const metaPath = join(OUT_DIR, "traders-meta.json");
  if (existsSync(metaPath)) {
    const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
    for (const entry of meta) {
      entry.primaryOrigin = primaryByTrader.get(entry.id) || "neutral";
    }
    writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    const counts = { nato: 0, wp: 0, mixed: 0, neutral: 0 };
    for (const v of primaryByTrader.values()) counts[v] = (counts[v] || 0) + 1;
    console.log(`Tagged traders-meta primaryOrigin: nato=${counts.nato}, wp=${counts.wp}, mixed=${counts.mixed}, neutral=${counts.neutral} (+${meta.length - primaryByTrader.size} non-combat)`);
  }
}

for (const file of readdirSync(OUT_DIR).filter(f => f.endsWith(".json") && f !== "manifest.json")) {
  const content = readFileSync(join(OUT_DIR, file));
  manifest[file] = createHash("md5").update(content).digest("hex").slice(0, 8);
}
const manifestOut = join(OUT_DIR, "manifest.json");
writeFileSync(manifestOut, JSON.stringify(manifest, null, 2));
console.log(`Wrote manifest (${Object.keys(manifest).length} entries) to ${manifestOut}`);

// Global data manifest: content hashes for pack-independent JSONs in site/public/data/
// (release-notes.json is excluded — it is hand-edited and fetched with cache: "no-cache")
const GLOBAL_DIR = join(OUT_DIR, "..");
const globalManifest = {};
for (const file of readdirSync(GLOBAL_DIR).filter(f => f.endsWith(".json") && f !== "manifest.json" && f !== "release-notes.json")) {
  const content = readFileSync(join(GLOBAL_DIR, file));
  globalManifest[file] = createHash("md5").update(content).digest("hex").slice(0, 8);
}
const globalManifestOut = join(GLOBAL_DIR, "manifest.json");
writeFileSync(globalManifestOut, JSON.stringify(globalManifest, null, 2));
console.log(`Wrote global manifest (${Object.keys(globalManifest).length} entries) to ${globalManifestOut}`);

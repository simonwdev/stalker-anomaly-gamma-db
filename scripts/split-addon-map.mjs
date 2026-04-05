/**
 * Splits export_addon_weapon_map.csv into three focused CSV files:
 *   export_scopes.csv           – optical sights / optics
 *   export_silencers.csv        – suppressors / silencers
 *   export_grenade_launchers.csv – underbarrel grenade launchers
 *
 * Usage: node scripts/split-addon-map.mjs --pack <pack-id>
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

function parsePackArg(argv) {
  const equalsArg = argv.find((a) => a.startsWith("--pack="));
  if (equalsArg) return equalsArg.split("=")[1];
  const idx = argv.indexOf("--pack");
  if (idx >= 0) return argv[idx + 1];
  return undefined;
}

const pack = parsePackArg(process.argv);
if (!pack) {
  console.error("Usage: node split-addon-map.mjs --pack <pack-id>");
  process.exit(1);
}

const CSV_DIR = join(import.meta.dirname, "..", "data", pack);
const SRC = join(CSV_DIR, "export_addon_weapon_map.csv");

if (!existsSync(SRC)) {
  console.error(`Source file not found: ${SRC}`);
  process.exit(1);
}

// ── Categorisation rules ──────────────────────────────────────────────────────

// Grenade launcher IDs
const GL_PREFIX = "wpn_addon_grenade_launcher";

// Silencer IDs
const SIL_PREFIXES = ["wpn_sil_", "wpn_addon_silencer"];
const SIL_EXACT = new Set(["sup", "sil_kzrzp", "silen98"]);

// Weapon conversion / body-kit IDs that are NOT optics – skip from scopes
const CONVERSION_IDS = new Set([
  "226sig_kit", "23_up", "5c_tik", "apsabigo", "archangel",
  "gurza_up", "infiltrator_tactical_kit", "kab_up", "kit_aus_tri",
  "kit_fal_leup", "kit_sa5x_spec", "kp_sr2", "lapua700", "lazup_pl15",
  "magpul_pro", "mauser_kit", "mod9", "mod_x_gen3", "mono_kit", "none",
  "ots2_upgr_kit", "pl15_scolaz", "shakal", "side", "spectre_tactical_kit",
  "sr1upgr1", "sr2_upkit", "swamp", "u2p2g0r", "upg220", "vorkuta",
]);

function categorise(id) {
  if (id.startsWith(GL_PREFIX)) return "gl";
  if (SIL_EXACT.has(id)) return "sil";
  if (SIL_PREFIXES.some((p) => id.startsWith(p))) return "sil";
  if (CONVERSION_IDS.has(id)) return "other";
  return "scope";
}

// ── Parse & split ─────────────────────────────────────────────────────────────

const lines = readFileSync(SRC, "utf-8").split(/\r?\n/).filter((l) => l.trim());

const buckets = { scope: [], sil: [], gl: [] };

for (const line of lines) {
  const id = line.split(",")[0].trim();
  const cat = categorise(id);
  if (cat !== "other") buckets[cat].push(line);
}

const OUT = {
  scope: join(CSV_DIR, "export_scopes.csv"),
  sil:   join(CSV_DIR, "export_silencers.csv"),
  gl:    join(CSV_DIR, "export_grenade_launchers.csv"),
};

for (const [cat, outPath] of Object.entries(OUT)) {
  if (!buckets[cat].length) {
    console.warn(`WARNING: No entries categorised as "${cat}" — output file will be empty`);
  }
  writeFileSync(outPath, buckets[cat].join("\n") + "\n");
  console.log(`Wrote ${buckets[cat].length} entries → ${outPath}`);
}


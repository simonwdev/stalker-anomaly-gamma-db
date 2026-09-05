#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MOD = join(ROOT, "mod");
const DATA = join(ROOT, "site", "public", "data");
const SCRIPTS = ["stalker_db.script", "stalker_db_json.script"];

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) {
    return "";
  }
  const next = process.argv[i + 1];
  return !next || next.startsWith("--") ? true : next;
}

function activePacks() {
  return JSON.parse(readFileSync(join(DATA, "packs.json"), "utf8")).packs.filter((p) => !p.deprecated);
}

function dateVersion(now = new Date()) {
  const p2 = (n) => String(n).padStart(2, "0");
  const hhmm = String(now.getUTCHours() * 100 + now.getUTCMinutes()).padStart(4, "0");
  return `${now.getUTCFullYear()}-${p2(now.getUTCMonth() + 1)}-${p2(now.getUTCDate())}-${hhmm}`;
}

function verParts(version) {
  const m = String(version).match(/^(\d{4})[-.](\d{1,2})[-.](\d{1,2})[-.](\d{1,4})$/);
  if (!m) {
    return null;
  }
  return [m[1], m[2].padStart(2, "0"), m[3].padStart(2, "0"), m[4].padStart(4, "0")];
}

// MO2 VersionInfo eats ^\d+ then dotted minors. 2026-08-30-0708 becomes 2026.0.0.0-08-30-0708.
function modVer(version) {
  const p = verParts(version);
  return p ? `${p[0]}.${p[1]}.${p[2]}-${p[3]}` : String(version);
}

function copyPackJson(id, dest) {
  mkdirSync(dest, { recursive: true });
  const files = [];
  const walk = (from, to, rel) => {
    mkdirSync(to, { recursive: true });
    for (const name of readdirSync(from)) {
      const src = join(from, name);
      const out = join(to, name);
      const relName = rel ? `${rel}/${name}` : name;
      if (statSync(src).isDirectory()) {
        walk(src, out, relName);
      } else if (name.endsWith(".json")) {
        copyFileSync(src, out);
        files.push(relName.replaceAll("\\", "/"));
      }
    }
  };
  walk(join(DATA, id), dest, "");
  writeFileSync(join(dest, "pack-files.json"), `${JSON.stringify(files)}\n`);
  return files.length;
}

function xml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const LANG_LABEL = { en: "English", ru: "Russian", fr: "French" };

function packLocales(id) {
  const path = join(DATA, id, "translations.json");
  if (!existsSync(path)) {
    return ["en"];
  }
  const t = JSON.parse(readFileSync(path, "utf8"));
  if (Array.isArray(t.locales) && t.locales.length) {
    return t.locales.filter((k) => t[k]);
  }
  return ["en", "ru", "fr"].filter((k) => t[k]);
}

function stampMeta(dest, version, pack) {
  const ver = modVer(version);
  writeFileSync(
    join(dest, "meta.ini"),
    `[General]
gameName=
modid=0
version=${ver}
newestVersion=${ver}
category=0
nexusFileStatus=1
installationFile=StalkerDB_${pack.id}.zip
comments=Stalker DB - ${pack.name}
notes=
`,
  );
}

function writeFomod(stage, folder, version, pack, locales) {
  const name = folder;
  const ver = modVer(version);
  mkdirSync(join(stage, "fomod", "lang"), { recursive: true });
  const plugins = locales
    .map((lang, i) => {
      writeFileSync(join(stage, "fomod", "lang", lang), lang + "\n");
      const rec = i === 0 ? "\n              <typeDescriptor><type name=\"Recommended\"/></typeDescriptor>" : "";
      return `            <plugin name="${xml(LANG_LABEL[lang] || lang)}">
              <description>Item names.</description>
              <files>
                <file source="fomod/lang/${lang}" destination="gamedata/configs/db/lang" />
              </files>${rec}
            </plugin>`;
    })
    .join("\n");
  writeFileSync(
    join(stage, "fomod", "info.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<fomod>
  <Name>${xml(name)}</Name>
  <Version>${xml(ver)}</Version>
  <Author>Stalker DB</Author>
  <Description>Item catalog for other mods. Site pack JSON plus a small Lua loader.</Description>
</fomod>
`,
  );
  writeFileSync(
    join(stage, "fomod", "ModuleConfig.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://qconsulting.ca/fo3/ModConfig5.0.xsd">
  <moduleName>${xml(name)}</moduleName>
  <requiredInstallFiles>
    <folder source="gamedata" destination="gamedata" />
    <file source="meta.ini" destination="meta.ini" />
  </requiredInstallFiles>
  <installSteps order="Explicit">
    <installStep name="Language">
      <optionalFileGroups order="Explicit">
        <group name="Language" type="SelectExactlyOne">
          <plugins order="Explicit">
${plugins}
          </plugins>
        </group>
      </optionalFileGroups>
    </installStep>
  </installSteps>
</config>
`,
  );
}

const ZIP_PY = `
import sys, zipfile
from pathlib import Path
parent, folder, out = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
if out.exists():
    out.unlink()
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
    for path in sorted((parent / folder).rglob("*")):
        if path.is_file():
            zf.write(path, path.relative_to(parent).as_posix())
`;

function zipFolder(parent, folder, zipPath) {
  const attempts =
    process.platform === "win32" ? [["py", "-3"], ["python"], ["python3"]] : [["python3"], ["python"]];
  for (const [cmd, ...pre] of attempts) {
    const r = spawnSync(cmd, [...pre, "-c", ZIP_PY, parent, folder, zipPath], { stdio: "inherit" });
    if (r.status === 0) {
      return;
    }
  }
  throw new Error("python required to zip");
}

function buildZip(pack, version, outDir) {
  const folder = `Stalker DB - ${pack.name}`;
  const zip = `StalkerDB_${pack.id}_${modVer(version)}.zip`;
  const stage = join(outDir, folder);
  rmSync(stage, { recursive: true, force: true });
  mkdirSync(join(stage, "gamedata", "scripts"), { recursive: true });
  for (const f of SCRIPTS) {
    copyFileSync(join(MOD, "gamedata", "scripts", f), join(stage, "gamedata", "scripts", f));
  }
  const n = copyPackJson(pack.id, join(stage, "gamedata", "configs", "db"));
  writeFileSync(join(stage, "gamedata", "configs", "db", "lang"), "en\n");
  stampMeta(stage, version, pack);
  writeFomod(stage, folder, version, pack, packLocales(pack.id));
  zipFolder(outDir, folder, join(outDir, zip));
  return { zip, folder, files: n, stage };
}

function runRelease() {
  const outDir = arg("out") || join(ROOT, "dist", "mod");
  mkdirSync(outDir, { recursive: true });
  const version = (arg("version") !== true && arg("version")) || dateVersion();
  const rebuilt = [];
  for (const p of activePacks()) {
    const { files, stage } = buildZip(p, version, outDir);
    rmSync(stage, { recursive: true, force: true });
    rebuilt.push(`${p.id} (${files} files)`);
  }
  writeFileSync(join(outDir, "VERSION"), version + "\n");
  writeFileSync(join(outDir, "NOTES"), `rebuilt: ${rebuilt.join(", ")}\n`);
  console.log(`version ${version}`);
  console.log(`rebuilt: ${rebuilt.join(", ")}`);
}

if (arg("release")) {
  runRelease();
} else {
  console.error("usage: pack-mod.mjs --release [--out dir] [--version YYYY-MM-DD-HHMM]");
  process.exit(1);
}

import { cpSync, mkdirSync } from "fs";
import { join } from "path";

const destination = "C:\\Stalker_GAMMA\\overwrite\\gamedata\\scripts";
const source = "C:\\Source\\Other\\Universal-Stalker-Anomaly-Data-Export\\gamedata\\scripts";

mkdirSync(destination, { recursive: true });

const files = [
  "universal_anomaly_data_export.script",
];

for (const file of files) {
  cpSync(join(source, file), join(destination, file));
  console.log(`Copied ${file}`);
}

console.log(`Done — copied ${files.length} files to ${destination}`);

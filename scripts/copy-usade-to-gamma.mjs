import { cpSync } from "fs";

const destination = "C:\\Stalker_GAMMA\\overwrite\\gamedata";
const source = "C:\\Source\\Other\\Universal-Stalker-Anomaly-Data-Export\\gamedata";

cpSync(source, destination, { recursive: true });

console.log(`Done — copied ${source} to ${destination}`);

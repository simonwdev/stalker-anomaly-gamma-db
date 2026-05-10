import { cpSync } from "fs";

const destination = "D:\\gamma0.9.5\\gamma\\overwrite\\gamedata";
const source = "C:\\Source\\Other\\Universal-Stalker-Anomaly-Data-Export\\gamedata";

cpSync(source, destination, { recursive: true });

console.log(`Done — copied ${source} to ${destination}`);

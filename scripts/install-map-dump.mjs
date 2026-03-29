import { cpSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const src = resolve(dirname(fileURLToPath(import.meta.url)), 'zzz_gamma_map_entities.script');
const dest = 'C:\\Stalker_GAMMA\\overwrite\\gamedata\\scripts\\zzz_gamma_map_entities.script';

mkdirSync(dirname(dest), { recursive: true });
cpSync(src, dest);
console.log(`Copied to ${dest}`);

import { readFileSync, readdirSync, unlinkSync, existsSync } from "fs";
import { join } from "path";

const SITE_DATA = join(import.meta.dirname, "..", "site", "public", "data");
const ICONS_DIR = join(import.meta.dirname, "..", "site", "public", "img", "icons");

const dryRun = process.argv.includes("--dry-run");

// Collect all item IDs from all packs
const allIds = new Set();

const packs = JSON.parse(readFileSync(join(SITE_DATA, "packs.json"), "utf8")).packs;
for (const pack of packs) {
    const packDir = join(SITE_DATA, pack.id);
    if (!existsSync(packDir)) continue;

    // Index has top-level item IDs
    const indexPath = join(packDir, "index.json");
    if (existsSync(indexPath)) {
        const index = JSON.parse(readFileSync(indexPath, "utf8"));
        for (const item of index) {
            allIds.add(item.id);
        }
    }

    // Category JSONs have item IDs in their items arrays
    const files = readdirSync(packDir).filter(f => f.endsWith(".json"));
    for (const file of files) {
        if (file === "index.json" || file === "manifest.json" || file === "translations.json" || file === "display-labels.json") continue;
        try {
            const data = JSON.parse(readFileSync(join(packDir, file), "utf8"));
            if (Array.isArray(data)) {
                for (const item of data) {
                    if (item.id) allIds.add(item.id);
                }
            } else if (data.items && Array.isArray(data.items)) {
                for (const item of data.items) {
                    if (item.id) allIds.add(item.id);
                }
            }
        } catch { /* skip non-parseable */ }
    }
}

console.log(`Found ${allIds.size} item IDs across all packs`);

// Check icons against item IDs
const icons = readdirSync(ICONS_DIR).filter(f => f.endsWith(".png"));
console.log(`Found ${icons.length} icons`);

const toDelete = [];
for (const icon of icons) {
    const id = icon.replace(/\.png$/, "");
    if (!allIds.has(id)) {
        toDelete.push(icon);
    }
}

console.log(`${toDelete.length} icons have no matching item ID`);

if (toDelete.length === 0) {
    console.log("Nothing to prune.");
    process.exit(0);
}

if (dryRun) {
    console.log("\nDry run - would delete:");
    for (const icon of toDelete) {
        console.log(`  ${icon}`);
    }
} else {
    for (const icon of toDelete) {
        unlinkSync(join(ICONS_DIR, icon));
    }
    console.log(`Deleted ${toDelete.length} icons.`);
}

/**
 * Upload generated map tiles to Cloudflare R2 via the S3-compatible API.
 *
 * Usage: node scripts/upload-tiles.mjs [--purge]
 *
 * Requires:
 *   npm install @aws-sdk/client-s3
 *   R2 API token with read/write access — set env vars:
 *     R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID
 *
 * Bucket: stalker-anomaly-db-tiles
 */

import { readdirSync, readFileSync } from "fs";
import { join, relative, extname } from "path";
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const ROOT = join(import.meta.dirname, "..");
const TILES_DIR = join(ROOT, "site", "public", "tiles");
const BUCKET = "stalker-anomaly-db-tiles";
const KEY_PREFIX = "v2/";
const CONCURRENCY = 50;

const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID } = process.env;
if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ACCOUNT_ID) {
  console.error("Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_ACCOUNT_ID env vars.");
  console.error("Create an R2 API token at: Cloudflare Dashboard > R2 > Manage R2 API Tokens");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".json": "application/json",
};

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

const files = walk(TILES_DIR);
console.log(`Uploading ${files.length} files to R2 bucket "${BUCKET}" (concurrency: ${CONCURRENCY})...\n`);

let uploaded = 0;
let failed = 0;
const start = Date.now();

// Process files in batches of CONCURRENCY
for (let i = 0; i < files.length; i += CONCURRENCY) {
  const batch = files.slice(i, i + CONCURRENCY);

  const results = await Promise.allSettled(
    batch.map(async (file) => {
      const key = KEY_PREFIX + relative(TILES_DIR, file).replace(/\\/g, "/");
      const contentType = MIME_TYPES[extname(file)] || "application/octet-stream";
      const body = readFileSync(file);

      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      }));
    })
  );

  for (const r of results) {
    if (r.status === "fulfilled") uploaded++;
    else { failed++; console.error(`  Failed: ${r.reason.message}`); }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  process.stdout.write(`\r  ${uploaded + failed}/${files.length} (${elapsed}s)`);
}

const totalTime = ((Date.now() - start) / 1000).toFixed(1);
console.log(`\n\nUpload done in ${totalTime}s: ${uploaded} uploaded, ${failed} failed.`);

if (!process.argv.includes("--purge")) {
  process.exit(0);
}

// --- Purge stale tiles ---
const localKeys = new Set(files.map((f) => KEY_PREFIX + relative(TILES_DIR, f).replace(/\\/g, "/")));

console.log("\nListing remote objects to find stale tiles...");
const remoteKeys = [];
let continuationToken;
do {
  const res = await s3.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: KEY_PREFIX,
    ContinuationToken: continuationToken,
  }));
  if (res.Contents) {
    for (const obj of res.Contents) remoteKeys.push(obj.Key);
  }
  continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
} while (continuationToken);

const staleKeys = remoteKeys.filter((k) => !localKeys.has(k));

if (staleKeys.length === 0) {
  console.log("No stale tiles to purge.");
} else {
  console.log(`Purging ${staleKeys.length} stale tiles...`);
  // DeleteObjects accepts up to 1000 keys per request
  for (let i = 0; i < staleKeys.length; i += 1000) {
    const batch = staleKeys.slice(i, i + 1000);
    await s3.send(new DeleteObjectsCommand({
      Bucket: BUCKET,
      Delete: { Objects: batch.map((Key) => ({ Key })) },
    }));
  }
  console.log(`Purged ${staleKeys.length} stale tiles.`);
}

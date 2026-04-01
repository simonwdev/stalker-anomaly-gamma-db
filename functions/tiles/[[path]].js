/**
 * Tile proxy — serves map tiles from the R2 bucket "stalker-anomaly-db-tiles".
 *
 * Route: /tiles/*  (e.g. /tiles/v2/metadata.json, /tiles/v2/{z}/{x}/{y}.jpg)
 * R2 key: the path after /tiles/  (e.g. "v2/metadata.json")
 *
 * This sidesteps the ERR_SSL_VERSION_OR_CIPHER_MISMATCH issue on the
 * tiles.stalker-anomaly-db.com custom domain by reading directly from R2
 * through the Pages binding (Cloudflare-internal transport, no browser SSL).
 */

const CONTENT_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  json: 'application/json',
  webp: 'image/webp',
};

export async function onRequest({ env, params }) {
  if (!env.TILES) {
    return new Response('Tile storage not configured', { status: 503 });
  }

  const pathParts = Array.isArray(params.path) ? params.path : (params.path ? [params.path] : []);
  const key = pathParts.join('/');

  if (!key) {
    return new Response('Not found', { status: 404 });
  }

  const obj = await env.TILES.get(key);
  if (!obj) {
    return new Response('Not found', { status: 404 });
  }

  const ext = key.split('.').pop()?.toLowerCase() || '';
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';

  const headers = new Headers();
  headers.set('Content-Type', contentType);
  // Tiles are content-addressed / immutable — cache aggressively
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Access-Control-Allow-Origin', '*');

  return new Response(obj.body, { headers });
}


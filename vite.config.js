import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const publicDir = resolve(__dirname, 'site', 'public');

// Serve index.html from public/ subdirectories (acknowledgements/, contact/, etc.)
// before Vite's SPA fallback rewrites them to the root index.html.
function publicDirIndex() {
  return {
    name: 'public-dir-index',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0];
        if (url.endsWith('/')) {
          const indexPath = join(publicDir, url, 'index.html');
          if (existsSync(indexPath)) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(readFileSync(indexPath, 'utf-8'));
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  root: 'site',
  plugins: [vue(), publicDirIndex()],
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
  },
  server: {
    proxy: {
      // Forward /tiles/v2/* to the R2 CDN in dev mode.
      // Node.js handles TLS differently from the browser, so
      // ERR_SSL_VERSION_OR_CIPHER_MISMATCH doesn't apply here.
      // Strip the /tiles prefix so /tiles/v2/foo → /v2/foo on the target.
      '/tiles/v2': {
        target: 'https://tiles.stalker-anomaly-db.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/tiles/, ''),
      },
    },
  },
});

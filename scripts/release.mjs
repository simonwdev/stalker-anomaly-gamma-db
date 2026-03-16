import { buildSync } from 'esbuild';
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

const siteDir = resolve('site');
const distDir = resolve('dist');

if (existsSync(distDir)) rmSync(distDir, { recursive: true });
cpSync(siteDir, distDir, { recursive: true });

// Minify app.js
const appJs = join(distDir, 'js', 'app.js');
const appMin = join(distDir, 'js', 'app.min.js');
buildSync({ entryPoints: [appJs], minify: true, outfile: appMin, bundle: false });
rmSync(appJs);

// Swap reference in index.html
const indexPath = join(distDir, 'index.html');
writeFileSync(indexPath, readFileSync(indexPath, 'utf8').replace('js/app.js', 'js/app.min.js'));

console.log('Built to dist/');

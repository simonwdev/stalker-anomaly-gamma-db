import { execSync } from 'child_process';
import { cpSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

execSync('npx vite build', { stdio: 'inherit' });

// Copy style.css to dist/css/ for standalone static pages (acknowledgements, contact, release-notes)
const distCss = join(root, 'dist', 'css');
mkdirSync(distCss, { recursive: true });
cpSync(join(root, 'site', 'css', 'style.css'), join(distCss, 'style.css'));
console.log('Copied css/style.css to dist/css/');

console.log('Built to dist/');

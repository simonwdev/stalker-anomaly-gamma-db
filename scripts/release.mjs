import { execSync } from 'child_process';
import { cpSync, existsSync } from 'fs';
import { resolve } from 'path';

execSync('npx vite build', { stdio: 'inherit' });

// Copy Cloudflare Functions to dist
const functionsDir = resolve('functions');
const distFunctions = resolve('dist', 'functions');
if (existsSync(functionsDir)) {
  cpSync(functionsDir, distFunctions, { recursive: true });
  console.log('Copied functions/ to dist/functions/');
}

console.log('Built to dist/');

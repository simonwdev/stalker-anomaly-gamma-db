import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

const distDir = resolve('dist');
if (!existsSync(distDir)) {
  console.error('dist/ not found — run "npm run release" first');
  process.exit(1);
}

execSync('npx wrangler pages deploy ./dist --project-name stalker-gamma-db', {
  stdio: 'inherit',
});

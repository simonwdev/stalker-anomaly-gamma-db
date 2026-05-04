import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

const distDir = resolve('dist');
if (!existsSync(distDir)) {
  console.error('dist/ not found — run "npm run release" first');
  process.exit(1);
}

const preview = process.argv.includes('--preview');
const cmd = preview
  ? 'npx wrangler pages deploy --branch=preview'
  : 'npx wrangler pages deploy';

execSync(cmd, { stdio: 'inherit' });

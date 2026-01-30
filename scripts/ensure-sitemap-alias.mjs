import { copyFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const distDir = path.join(process.cwd(), 'dist');
const source = path.join(distDir, 'sitemap-0.xml');
const destination = path.join(distDir, 'sitemap.xml');

try {
  await access(source, constants.F_OK);
  await copyFile(source, destination);
} catch (error) {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
    process.exit(0);
  }
  throw error;
}

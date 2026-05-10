import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(join(dist, 'src'), { recursive: true });
await copyFile(join(root, 'src', 'main.js'), join(dist, 'src', 'main.js'));
await copyFile(join(root, 'src', 'style.css'), join(dist, 'src', 'style.css'));

const html = await readFile(join(root, 'index.html'), 'utf8');
await writeFile(join(dist, 'index.html'), html);
console.log('Built static GitHub Pages site in dist/');

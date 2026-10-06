import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { root, validateCatalog } from './validate.mjs';
import { pngIcon } from './icons.mjs';
await validateCatalog();
const source = path.join(root, 'site'), destination = path.join(root, 'dist');
// Only this project's known build output is replaced.
if (destination !== path.resolve(root, 'dist')) throw new Error('Destino de compilación incorrecto.');
await fs.rm(destination, { recursive: true, force: true });
await fs.cp(source, destination, { recursive: true });
for (const size of [192, 512]) await fs.writeFile(path.join(destination, 'icons', `icon-${size}.png`), pngIcon(size));
await fs.writeFile(path.join(destination, '.nojekyll'), '');
async function walk(folder, prefix = '') { let out = []; for (const entry of await fs.readdir(folder, { withFileTypes: true })) { const relative = prefix + entry.name; if (entry.isDirectory()) out.push(...await walk(path.join(folder, entry.name), relative + '/')); else out.push(relative); } return out.sort(); }
const files = await walk(destination), hash = createHash('sha256');
for (const f of files) hash.update(f).update(await fs.readFile(path.join(destination, f)));
const template = await fs.readFile(path.join(root, 'scripts/sw-template.js'), 'utf8'); hash.update(template);
const version = hash.digest('hex').slice(0, 16);
await fs.writeFile(path.join(destination, 'sw.js'), template.replace('__VERSION__', version).replace('__ASSETS__', JSON.stringify(files.filter(f => f !== '.nojekyll'))));
console.log(`Mi horario preparado: ${files.length + 1} archivos; versión ${version}.`);

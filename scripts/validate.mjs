/*
 * SPDX-License-Identifier: GPL-3.0-only
 * Copyright (c) 2026 P3M-ACTF and contributors.
 * License: https://github.com/P3M-ACTF/horario-clases/blob/main/LICENSE
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseImport, publicTemplate } from '../site/js/model.js';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function validateCatalog(directory = path.join(root, 'site/templates')) {
  const index = JSON.parse(await fs.readFile(path.join(directory, 'index.json'), 'utf8'));
  if (index.schemaVersion !== 1 || !Array.isArray(index.templates) || !index.templates.length) throw new Error('Catálogo vacío o versión incorrecta.');
  const ids = new Set(), files = new Set();
  for (const entry of index.templates) {
    if (!/^[a-z0-9-]+$/.test(entry.id) || ids.has(entry.id) || !/^[a-z0-9-]+\.json$/.test(entry.file) || files.has(entry.file) || !entry.name?.trim() || typeof entry.description !== 'string' || !Array.isArray(entry.tags) || !entry.tags.every(t => typeof t === 'string')) throw new Error('Entrada de catálogo incorrecta o repetida.');
    ids.add(entry.id); files.add(entry.file);
    const raw = JSON.parse(await fs.readFile(path.join(directory, entry.file), 'utf8'));
    if (raw.type !== 'template') throw new Error(`${entry.file}: solo se admiten plantillas públicas.`);
    const [course] = parseImport(raw);
    if (course.name !== entry.name) throw new Error(`${entry.file}: el nombre no coincide con el índice.`);
    if (JSON.stringify(raw) !== JSON.stringify(publicTemplate(course))) throw new Error(`${entry.file}: contiene profesores o cambios provisionales. Exporta como plantilla.`);
  }
  const actual = (await fs.readdir(directory)).filter(f => f.endsWith('.json') && f !== 'index.json');
  if (actual.some(f => !files.has(f))) throw new Error('Hay plantillas no registradas en el índice.');
  return index.templates.length;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Catálogo validado: ${await validateCatalog()} plantilla(s), sin profesores ni excepciones.`);
}

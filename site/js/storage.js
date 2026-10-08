/*
 * SPDX-License-Identifier: GPL-3.0-only
 * Copyright (c) 2026 P3M-ACTF and contributors.
 * License: https://github.com/P3M-ACTF/horario-clases/blob/main/LICENSE
 */
import { validateState, clone, VERSION } from './model.js';
export const KEY = 'mi-horario:v1';
export const BACKUP_KEY = `${KEY}:last-good`;
export const emptyState = () => ({ schemaVersion: VERSION, courses: [], selectedId: null, theme: 'system' });
export function loadState(storage = globalThis.localStorage) {
  let warning = '', primary = null;
  try {
    primary = storage.getItem(KEY);
    if (primary) return { state: validateState(JSON.parse(primary)), warning };
  } catch { warning = 'No se pudo leer el guardado principal.'; }
  try {
    const saved = storage.getItem(BACKUP_KEY);
    if (saved) return { state: validateState(JSON.parse(saved)), warning: 'Se ha recuperado la última copia válida. Exporta una copia de seguridad.' };
  } catch { warning = 'No se pueden recuperar los datos guardados. Importa una copia de seguridad; no se borrará el guardado anterior.'; }
  return { state: emptyState(), warning };
}
export function saveState(state, storage = globalThis.localStorage) {
  validateState(state);
  try {
    const previous = storage.getItem(KEY);
    if (previous) {
      let good = false; try { validateState(JSON.parse(previous)); good = true; } catch { /* Preserve backup when the primary is corrupt. */ }
      if (good) storage.setItem(BACKUP_KEY, previous);
      else storage.setItem(`${KEY}:unreadable`, previous);
    }
    storage.setItem(KEY, JSON.stringify(state));
  } catch { throw new Error('No se ha podido guardar en este navegador. Exporta tus datos antes de cerrar la página.'); }
  return clone(state);
}

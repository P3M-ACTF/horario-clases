/*
 * SPDX-License-Identifier: GPL-3.0-only
 * Copyright (c) 2026 P3M-ACTF and contributors.
 * License: https://github.com/P3M-ACTF/horario-clases/blob/main/LICENSE
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
async function loadASIR(page) {
  await page.goto('./');
  await page.getByRole('button', { name: /Usar plantilla/ }).click();
  await page.getByRole('button', { name: 'Crear mi copia' }).click();
  await expect(page.getByRole('heading', { name: 'ASIR 2', exact: true })).toBeVisible();
  await page.locator('#selected-date').fill('2026-10-05');
  await page.locator('#selected-date').dispatchEvent('change');
}
const first = page => page.locator('.lesson[data-date="2026-10-05"][data-block="d1-c1"]');
test('empty welcome, catalog import, responsive weekly view and reload', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('./'); await expect(page.getByRole('heading', { name: /Tu semana/ })).toBeVisible();
  await page.screenshot({ path: 'test-results/welcome.png', fullPage: true });
  await loadASIR(page);
  await expect(page.locator('.lesson')).toHaveCount(30);
  await expect(page.locator('.time-label')).toHaveText(['15:15', '16:05', '16:10', '17:00', '17:05', '17:55', '18:15', '19:05', '19:10', '20:00', '20:05', '20:55']);
  await page.screenshot({ path: 'test-results/week.png', fullPage: true });
  await page.getByRole('button', { name: 'Cambiar tema' }).click();
  await page.screenshot({ path: 'test-results/week-dark.png', fullPage: true });
  await page.getByRole('button', { name: 'Cambiar tema' }).click();
  await page.reload(); await expect(page.getByRole('heading', { name: 'ASIR 2', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test('keyboard editor changes subjects, joins and separates breaks and swaps cards', async ({ page }) => {
  await loadASIR(page); await page.locator('#edit-scope').selectOption('week');
  await first(page).focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Unir con la siguiente' }).click();
  await expect(page.locator('.lesson[data-date="2026-10-05"]').first()).toContainText('15:15 – 16:55');
  await expect(page.locator('.time-label').filter({ hasText: /^16:55$/ })).toBeVisible();
  await expect(page.locator('.time-label').filter({ hasText: /^15:30$/ })).toHaveCount(0);
  await page.locator('.lesson[data-date="2026-10-05"]').first().click();
  await page.getByRole('button', { name: 'Separar bloque' }).click();
  await expect(first(page)).toContainText('15:15 – 16:05');
  const third = page.locator('.lesson[data-date="2026-10-05"][data-block="d1-c3"]');
  await first(page).dragTo(third); await expect(first(page)).toContainText('SRI'); await expect(third).toContainText('ASO');
  await first(page).click(); await page.getByLabel('Profesor solo para este bloque').fill('Docente de ejemplo'); await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(first(page)).toContainText('Docente de ejemplo');
});
test('dated cancellation affects only chosen date and restores', async ({ page }) => {
  await loadASIR(page); await page.locator('#edit-scope').selectOption('date');
  await first(page).click(); await page.getByRole('button', { name: 'Dejar hueco libre' }).click();
  await expect(first(page)).toContainText('Asignar clase');
  await page.locator('#selected-date').fill('2026-10-12'); await page.locator('#selected-date').dispatchEvent('change');
  await expect(page.locator('.lesson').first()).toContainText('ASO');
  await page.locator('#selected-date').fill('2026-10-05'); await page.locator('#selected-date').dispatchEvent('change');
  await page.getByRole('button', { name: 'Restaurar horario habitual' }).click(); await page.getByRole('button', { name: 'Restaurar', exact: true }).click();
  await expect(first(page)).toContainText('ASO');
});
test('morning course, professor editing, duplicate and local independence', async ({ page }) => {
  await page.goto('./'); await page.getByRole('button', { name: /Empieza desde cero/ }).click();
  await page.getByLabel('Nombre del curso').fill('Curso matutino');
  await page.getByRole('button', { name: 'Crear horario', exact: true }).click();
  await expect(page.locator('.lesson').first()).toContainText('08:00 – 08:50');
  await page.getByRole('button', { name: 'Añadir asignatura' }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Redes'); await page.getByLabel('Abreviatura').fill('RED');
  await page.getByLabel(/Profesor habitual/).fill('Persona de prueba'); await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await page.locator('.subject-item').first().dragTo(page.locator('.lesson').first());
  await expect(page.locator('.lesson').first()).toContainText('RED');
  await page.getByRole('button', { name: 'Configurar curso' }).click(); await page.getByRole('button', { name: 'Duplicar curso' }).click();
  await expect(page.locator('#course-select option')).toHaveCount(2);
  await page.getByRole('button', { name: 'Configurar curso' }).click(); await page.getByLabel('Nombre', { exact: true }).fill('Mi copia'); await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await page.locator('#course-select').selectOption({ label: 'Curso matutino' });
  await expect(page.getByRole('heading', { name: 'Curso matutino', exact: true })).toBeVisible();
});
test('export template strips professors; backup preserves them; invalid import keeps courses', async ({ page }) => {
  await loadASIR(page); await page.locator('.subject-item').first().click();
  await page.getByLabel(/Profesor habitual/).fill('Persona de prueba'); await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await page.getByRole('button', { name: /Exportar horario/ }).click();
  const downloaded = page.waitForEvent('download'); await page.getByRole('button', { name: 'Exportar como plantilla' }).click();
  const raw = await fs.readFile(await (await downloaded).path(), 'utf8'); expect(raw).not.toContain('Persona de prueba'); expect(raw).not.toContain('teacher');
  const full = page.waitForEvent('download'); await page.getByRole('button', { name: 'Copia personal de este curso' }).click();
  const personal = await fs.readFile(await (await full).path(), 'utf8'); expect(personal).toContain('Persona de prueba');
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.locator('#file-input').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
  await expect(page.locator('#toast')).toContainText('JSON válido'); await expect(page.locator('#course-select option')).toHaveCount(1);
  await page.locator('#file-input').setInputFiles({ name: 'my-template.json', mimeType: 'application/json', buffer: Buffer.from(raw) });
  await page.getByRole('button', { name: 'Crear mi copia' }).click(); await expect(page.locator('#course-select option')).toHaveCount(2);
});
test('mobile default day, accessible controls and both print modes', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'es-ES', timezoneId: 'Europe/Madrid' });
  const page = await context.newPage(); await loadASIR(page);
  await expect(page.locator('.daily')).toBeVisible(); await expect(page.locator('.lesson')).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
  await page.emulateMedia({ media: 'print' }); await expect(page.locator('.daily')).toBeVisible(); await expect(page.locator('.sidebar')).toBeHidden();
  await page.emulateMedia({ media: 'screen' }); await page.getByRole('button', { name: 'Semana', exact: true }).click();
  await page.emulateMedia({ media: 'print' }); await expect(page.locator('.week')).toBeVisible(); await page.emulateMedia({ media: 'screen' });
  await page.getByRole('button', { name: 'Día', exact: true }).click(); await page.locator('#edit-scope').selectOption('week');
  await first(page).click(); await page.locator('#move-target').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Mover / intercambiar clase actual', exact: true }).click();
  await expect(page.locator('#dialog')).not.toBeVisible(); await context.close();
});
test('touch handle moves a lesson without requiring native HTML drag support', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage(); await loadASIR(page); await page.locator('#edit-scope').selectOption('week');
  await first(page).evaluate(el => el.scrollIntoView({ block: 'start' }));
  const source = await first(page).locator('.drag-handle').boundingBox();
  const target = await page.locator('.lesson[data-date="2026-10-05"][data-block="d1-c3"]').boundingBox();
  const cdp = await context.newCDPSession(page), x = source.x + source.width / 2, y = source.y + source.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: target.x + target.width / 2, y: target.y + target.height / 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(first(page)).toContainText('SRI'); await context.close();
});
test('weekly and daily print fit on one A4 sheet for the original six-class schedule', async ({ page }) => {
  await loadASIR(page);
  for (const mode of ['Semana', 'Día']) {
    await page.getByRole('button', { name: mode, exact: true }).click();
    const pdf = await page.pdf({ path: `test-results/print-${mode === 'Semana' ? 'week' : 'day'}.pdf`, format: 'A4', landscape: true, preferCSSPageSize: true, printBackground: true });
    expect((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length).toBe(1);
  }
});
test('second public morning template is listed and loaded using only catalog data', async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: 'block' }), page = await context.newPage();
  const payload = JSON.parse(await fs.readFile(new URL('../../site/templates/asir2.json', import.meta.url), 'utf8'));
  payload.course.id = 'morning'; payload.course.name = 'Curso de mañana';
  for (const d of Object.values(payload.course.week)) d.start = 480;
  await page.route('**/templates/index.json', route => route.fulfill({ json: { schemaVersion: 1, templates: [{ id: 'morning', file: 'morning.json', name: payload.course.name, description: 'Plantilla matutina de prueba', tags: ['Matutino'] }] } }));
  await page.route('**/templates/morning.json', route => route.fulfill({ json: payload }));
  await page.goto('./'); await expect(page.getByText('Curso de mañana', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Usar plantilla/ }).click(); await page.getByRole('button', { name: 'Crear mi copia' }).click();
  await expect(page.getByRole('heading', { name: 'Curso de mañana' })).toBeVisible(); await expect(page.locator('.lesson').first()).toContainText('08:00');
  await context.close();
});
test('offline reopen, edits and cached catalog import', async ({ page, context }) => {
  await loadASIR(page);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true })); });
  await context.setOffline(true); await page.reload();
  await expect(page.getByRole('heading', { name: 'ASIR 2', exact: true })).toBeVisible();
  await page.locator('.subject-item').first().click(); await page.getByLabel(/Profesor habitual/).fill('Profesor sin conexión'); await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await page.getByRole('button', { name: /Plantillas de la comunidad/ }).click(); await page.getByRole('button', { name: /Usar plantilla/ }).click();
  await page.getByRole('button', { name: 'Crear mi copia' }).click(); await expect(page.locator('#course-select option')).toHaveCount(2);
  await page.reload(); await expect(page.locator('#course-select option')).toHaveCount(2);
  await context.setOffline(false);
});
test('new service worker version updates without losing local courses', async ({ page }) => {
  await loadASIR(page); await page.evaluate(() => navigator.serviceWorker.ready);
  const file = new URL('../../dist/sw.js', import.meta.url), original = await fs.readFile(file, 'utf8');
  try {
    await fs.writeFile(file, original.replace(/mi-horario-([0-9a-f]{16})/, 'mi-horario-$1-test'));
    await page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); await reg.update(); });
    await expect(page.locator('#update')).toBeVisible();
    await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'ASIR 2', exact: true })).toBeVisible(); await expect(page.locator('#course-select option')).toHaveCount(1);
    await expect(page.locator('#update')).toBeHidden();
  } finally { await fs.writeFile(file, original); }
});

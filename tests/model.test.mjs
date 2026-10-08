/*
 * SPDX-License-Identifier: GPL-3.0-only
 * Copyright (c) 2026 P3M-ACTF and contributors.
 * License: https://github.com/P3M-ACTF/horario-clases/blob/main/LICENSE
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { makeCourse, clone, timeline, visibleTimeline, endOfDay, assign, mergeNext, splitBlock, validateCourse, swapAssignments, ensureException, effectiveDay, publicTemplate, parseImport, backup, importCopy, statusAt, addDays, minutes, removeSubject, teacherFor } from '../site/js/model.js';
import { saveState, loadState, emptyState, KEY, BACKUP_KEY } from '../site/js/storage.js';
import { validateCatalog } from '../scripts/validate.mjs';
function fixture(start = 480) {
  const c = makeCourse('Curso de prueba', [1, 2, 3, 4, 5], { start, count: 6, duration: 50, shortBreak: 5, recess: 20, after: 3 });
  c.subjects = [{ id: 'math', name: 'Matemáticas', short: 'MAT', color: '#376f58', teacher: 'Docente de prueba' }, { id: 'other', name: 'Otra', short: 'OTR', color: '#8866aa' }];
  for (const day of Object.values(c.week)) for (const b of day.blocks) if (b.kind === 'lesson') b.subjectId = 'math';
  return c;
}
function memory() { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k) }; }
test('morning and afternoon templates preserve all 300 teaching and 40 break minutes', () => {
  for (const start of [480, 915]) { const c = fixture(start), day = c.week[1]; validateCourse(c); assert.equal(endOfDay(day), start + 340); assert.equal(day.blocks.filter(b => b.kind === 'lesson').length, 6); }
});
test('join across 5-minute break, preserve end and exactly restore original', () => {
  const c = fixture(915), day = c.week[1], before = clone(day);
  const id = mergeNext(c, day, day.blocks[0].id);
  assert.equal(day.blocks[0].duration, 100); assert.equal(timeline(day)[1].start, 1015); assert.equal(endOfDay(day), endOfDay(before)); validateCourse(c);
  splitBlock(day, id); assert.deepEqual(day, before);
});
test('join across recess shifts 20 minutes after lessons without moving subsequent class', () => {
  const c = fixture(915), day = c.week[1], before = clone(day), rows = timeline(day), third = rows.filter(b => b.kind === 'lesson')[2], fifth = rows.filter(b => b.kind === 'lesson')[4];
  const id = mergeNext(c, day, third.id); validateCourse(c);
  const next = timeline(day), merged = next.find(b => b.id === id);
  assert.equal(merged.start, 1025); assert.equal(merged.end, 1125);
  assert.equal(next.find(b => b.id === fifth.id).start, fifth.start);
  splitBlock(day, id); assert.deepEqual(day, before);
});
test('joined classes inherit later professor edits and adjacent breaks display as one interval', () => {
  const c = fixture(), day = c.week[1]; mergeNext(c, day, day.blocks[0].id);
  c.subjects[0].teacher = 'Profesor actualizado'; assert.equal(teacherFor(c, day.blocks[0]), 'Profesor actualizado');
  const rows = visibleTimeline(day); assert.equal(rows[1].duration, 10); assert.equal(rows[1].start, 580); assert.equal(rows[1].end, 590);
});
test('nested unions and union into a previously merged block are reversible', () => {
  for (const reverse of [false, true]) {
    const c = fixture(), day = c.week[1], before = clone(day), classes = day.blocks.filter(b => b.kind === 'lesson');
    const first = mergeNext(c, day, reverse ? classes[1].id : classes[0].id);
    const second = mergeNext(c, day, reverse ? classes[0].id : first);
    validateCourse(c); assert.equal(day.blocks[0].duration, 150);
    splitBlock(day, second); validateCourse(c); splitBlock(day, first); assert.deepEqual(day, before);
  }
});
test('merging incompatible subject or teacher leaves day untouched', () => {
  const c = fixture(), day = c.week[1]; day.blocks[2].teacherOverride = 'Sustituto'; const before = clone(day);
  assert.throws(() => mergeNext(c, day, day.blocks[0].id), /misma asignatura y profesor/); assert.deepEqual(day, before);
});
test('compatible swaps include professor overrides; incompatible duration does not mutate', () => {
  const c = fixture(), a = c.week[1].blocks[0], b = c.week[2].blocks[0]; assign(b, 'other', 'Otra persona'); swapAssignments(a, b);
  assert.equal(a.subjectId, 'other'); assert.equal(a.teacherOverride, 'Otra persona'); assert.equal(b.subjectId, 'math');
  b.duration = 30; const before = clone([a, b]); assert.throws(() => swapAssignments(a, b)); assert.deepEqual([a, b], before);
});
test('reassigning merged block updates split contents; cancellation keeps timings', () => {
  const c = fixture(), day = c.week[1], end = endOfDay(day), id = mergeNext(c, day, day.blocks[0].id);
  assign(day.blocks[0], 'other'); splitBlock(day, id); assert.equal(day.blocks[0].subjectId, 'other'); assert.equal(day.blocks[2].subjectId, 'other');
  assign(day.blocks[0], null); assert.equal(endOfDay(day), end); validateCourse(c);
});
test('dated overrides stay independent of baseline edits and restore by deletion', () => {
  const c = fixture(), date = '2026-10-07'; ensureException(c, date); assign(c.exceptions[date].blocks[0], 'other');
  assert.equal(effectiveDay(c, '2026-10-14').blocks[0].subjectId, 'math');
  c.week[3].start = 900; assert.equal(effectiveDay(c, date).start, 480);
  delete c.exceptions[date]; assert.equal(effectiveDay(c, date).start, 900);
});
test('public export removes teachers recursively and dates; backup retains them', () => {
  const c = fixture(), day = c.week[1]; mergeNext(c, day, day.blocks[0].id); ensureException(c, '2026-10-07');
  const tpl = publicTemplate(c), raw = JSON.stringify(tpl); assert.ok(!raw.includes('teacher')); assert.equal(Object.keys(tpl.course.exceptions).length, 0);
  assert.deepEqual(parseImport(backup([c]))[0], c); assert.equal(parseImport(tpl)[0].name, c.name);
  const copy = importCopy(c); copy.subjects[0].name = 'Independiente'; assert.notEqual(copy.id, c.id); assert.notEqual(c.subjects[0].name, copy.subjects[0].name);
});
test('invalid imported dates, subjects, colors, durations and foreign format fail', () => {
  for (const corrupt of [c => c.week[1].blocks[0].duration = -5, c => c.subjects[0].color = 'url(example)', c => c.exceptions['2026-02-30'] = clone(c.week[1]), c => c.week[1].blocks[0].subjectId = 'unknown', c => c.week[1].start = 1400]) {
    const c = fixture(); corrupt(c); assert.throws(() => parseImport(backup([c])));
  }
  assert.throws(() => parseImport({ schemaVersion: 2, type: 'template' })); assert.throws(() => minutes('24:00'));
});
test('current class excludes end, recognizes break, weekends and dated cancellation', () => {
  const c = fixture();
  assert.equal(statusAt(c, new Date('2026-10-05T06:49:00Z')).title, 'Ahora · MAT');
  assert.equal(statusAt(c, new Date('2026-10-05T06:50:00Z')).title, 'Descanso');
  assert.equal(statusAt(c, new Date('2026-10-10T08:00:00Z')).title, 'Siguiente · MAT');
  const d = ensureException(c, '2026-10-05'); assign(d.blocks[0], null);
  assert.equal(statusAt(c, new Date('2026-10-05T06:30:00Z')).title, 'Tiempo libre');
  assert.equal(addDays('2026-10-25', 1), '2026-10-26');
});
test('removing a subject clears both baseline and dated classes including merged originals', () => {
  const c = fixture(); mergeNext(c, c.week[1], c.week[1].blocks[0].id); ensureException(c, '2026-10-05'); removeSubject(c, 'math'); validateCourse(c);
  assert.equal(c.week[1].blocks[0].subjectId, null); assert.equal(c.exceptions['2026-10-05'].blocks[0].subjectId, null);
});
test('storage roundtrip, last-good recovery and write failure preserve valid copy', () => {
  const store = memory(), state = emptyState(); state.courses.push(fixture()); saveState(state, store);
  const before = clone(state); state.courses[0].name = 'Actualizado'; saveState(state, store);
  assert.equal(loadState(store).state.courses[0].name, 'Actualizado');
  store.setItem(KEY, '{broken'); const recovered = loadState(store); assert.deepEqual(recovered.state, before); assert.match(recovered.warning, /recuperado/);
  const oldBackup = store.getItem(BACKUP_KEY); saveState(recovered.state, store); assert.equal(store.getItem(BACKUP_KEY), oldBackup);
  assert.throws(() => saveState(state, { getItem: store.getItem, setItem() { throw new Error('quota'); } }), /No se ha podido guardar/);
});
test('ASIR2 public template contains exact 30 classes, nine subjects, afternoon hours and no teachers', async () => {
  const raw = JSON.parse(await fs.readFile(new URL('../site/templates/asir2.json', import.meta.url), 'utf8')), [c] = parseImport(raw);
  assert.equal(c.subjects.length, 9); assert.equal(Object.values(c.week).flatMap(d => d.blocks).filter(b => b.kind === 'lesson').length, 30);
  for (const d of Object.values(c.week)) { assert.equal(d.start, 915); assert.equal(endOfDay(d), 1255); }
  assert.ok(!JSON.stringify(raw).includes('teacher')); assert.equal(await validateCatalog(), 1);
});
test('catalog discovers a second morning template without UI code changes and rejects private fields', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mi-horario-catalog-'));
  try {
    const c = fixture(), template = publicTemplate(c);
    const source = JSON.parse(await fs.readFile(new URL('../site/templates/asir2.json', import.meta.url), 'utf8'));
    await fs.writeFile(path.join(dir, 'morning.json'), JSON.stringify(template)); await fs.writeFile(path.join(dir, 'asir2.json'), JSON.stringify(source));
    await fs.writeFile(path.join(dir, 'index.json'), JSON.stringify({ schemaVersion: 1, templates: [{ id: 'morning', name: c.name, description: 'Mañana', tags: ['Matutino'], file: 'morning.json' }, { id: 'asir2', name: source.course.name, description: 'Tarde', tags: [], file: 'asir2.json' }] }));
    assert.equal(await validateCatalog(dir), 2);
    template.course.subjects[0].teacher = 'No publicar'; await fs.writeFile(path.join(dir, 'morning.json'), JSON.stringify(template));
    await assert.rejects(() => validateCatalog(dir), /profesores/);
  } finally {
    if (path.dirname(path.resolve(dir)) !== path.resolve(os.tmpdir()) || !path.basename(dir).startsWith('mi-horario-catalog-')) throw new Error('Directorio temporal inesperado.');
    await fs.rm(dir, { recursive: true, force: true });
  }
});

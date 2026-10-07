export const VERSION = 1;
export const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const COLORS = ['#775a94', '#e9c90b', '#76ad72', '#1189b8', '#d95e39', '#dc5a3d', '#ce243d', '#dbbd08', '#1888ad'];
export const clone = value => structuredClone(value);
export const uid = () => crypto.randomUUID();
export const time = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
export function minutes(s) {
  if (!/^\d{2}:\d{2}$/.test(s)) throw new Error('Introduce una hora válida.');
  const [h, m] = s.split(':').map(Number);
  if (h > 23 || m > 59) throw new Error('La hora debe estar entre 00:00 y 23:59.');
  return h * 60 + m;
}
export function calendarDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === s;
}
export const weekday = date => new Date(`${date}T12:00:00Z`).getUTCDay();
export function addDays(date, n) {
  const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const monday = date => addDays(date, -((weekday(date) + 6) % 7));
export function dateLabel(date, options = { weekday: 'long', day: 'numeric', month: 'long' }) {
  return new Intl.DateTimeFormat('es-ES', { ...options, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}
export function nowInZone(zone = 'Europe/Madrid', now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
}
export function timeline(day) {
  let start = day.start;
  return day.blocks.map(block => { const row = { ...block, start, end: start + block.duration }; start = row.end; return row; });
}
export const endOfDay = day => day.start + day.blocks.reduce((sum, b) => sum + b.duration, 0);
export function visibleTimeline(day) {
  const rows = [];
  for (const b of timeline(day)) {
    const previous = rows.at(-1);
    if (b.kind === 'break' && previous?.kind === 'break') {
      previous.duration += b.duration; previous.end = b.end;
      if (b.label === 'Recreo') previous.label = 'Recreo';
    } else rows.push(b);
  }
  return rows;
}
export function effectiveDay(course, date) {
  return course.exceptions[date] ?? course.week[weekday(date)] ?? { start: 480, blocks: [] };
}
export function ensureException(course, date) {
  if (!course.exceptions[date]) course.exceptions[date] = clone(effectiveDay(course, date));
  return course.exceptions[date];
}
export function makeDay({ start = 480, count = 6, duration = 50, shortBreak = 5, recess = 20, after = 3 } = {}) {
  if (![start, count, duration, shortBreak, recess, after].every(Number.isInteger) || count < 1 || count > 24 || duration < 1 || shortBreak < 0 || recess < 0 || after < 1 || after > count) throw new Error('Revisa las duraciones y el número de clases.');
  const blocks = [];
  for (let i = 1; i <= count; i++) {
    blocks.push({ id: uid(), kind: 'lesson', duration, subjectId: null });
    const pause = i === after ? recess : shortBreak;
    if (i < count && pause) blocks.push({ id: uid(), kind: 'break', duration: pause, label: i === after ? 'Recreo' : 'Descanso' });
  }
  const day = { start, blocks };
  validateDay(day, new Set());
  return day;
}
export function makeCourse(name, days, options) {
  if (!days.length) throw new Error('Selecciona al menos un día lectivo.');
  const course = { id: uid(), name: name.trim(), description: '', timeZone: 'Europe/Madrid', subjects: [], week: {}, exceptions: {} };
  for (const d of days) course.week[d] = makeDay(options);
  validateCourse(course);
  return course;
}
export function teacherFor(course, block) {
  return block.teacherOverride ?? course.subjects.find(s => s.id === block.subjectId)?.teacher ?? '';
}
export function assign(block, subjectId, teacherOverride = null) {
  block.subjectId = subjectId;
  if (teacherOverride === null) delete block.teacherOverride; else block.teacherOverride = teacherOverride;
  if (block.merge) for (const part of block.merge.original) if (part.kind === 'lesson') assign(part, subjectId, teacherOverride);
}
export function swapAssignments(first, second) {
  if (first.kind !== 'lesson' || second.kind !== 'lesson' || first.duration !== second.duration) throw new Error('Solo puedes intercambiar bloques de clase de la misma duración. Separa antes los bloques unidos.');
  const a = { subjectId: first.subjectId, teacher: first.teacherOverride ?? null };
  assign(first, second.subjectId, second.teacherOverride ?? null);
  assign(second, a.subjectId, a.teacher);
}
export function mergeNext(course, day, id) {
  const i = day.blocks.findIndex(b => b.id === id), first = day.blocks[i];
  if (!first || first.kind !== 'lesson' || !first.subjectId) throw new Error('Selecciona una clase con asignatura.');
  let j = i + 1;
  while (day.blocks[j]?.kind === 'break') j++;
  const second = day.blocks[j];
  if (!second || second.kind !== 'lesson' || second.subjectId !== first.subjectId || teacherFor(course, second) !== teacherFor(course, first)) throw new Error('La siguiente clase debe tener la misma asignatura y profesor. Solo puede haber descansos entre ambas.');
  let end = j + 1;
  while (day.blocks[end]?.movedBy === second.id) end++;
  const original = clone(day.blocks.slice(i, end));
  const merged = { id: uid(), kind: 'lesson', subjectId: first.subjectId, duration: first.duration + second.duration, merge: { original } };
  if (first.teacherOverride != null || second.teacherOverride != null) merged.teacherOverride = teacherFor(course, first);
  // Keeping each moved break separately makes nested joins exactly reversible.
  const moved = original.filter(b => b.kind === 'break').map(b => ({ ...clone(b), movedBy: merged.id }));
  day.blocks.splice(i, end - i, merged, ...moved);
  return merged.id;
}
export function splitBlock(day, id) {
  const i = day.blocks.findIndex(b => b.id === id), block = day.blocks[i];
  if (!block?.merge) throw new Error('Este bloque no está unido.');
  day.blocks = day.blocks.filter(b => b.movedBy !== id);
  const pos = day.blocks.findIndex(b => b.id === id);
  day.blocks.splice(pos, 1, ...clone(block.merge.original));
}
function assert(test, message) { if (!test) throw new Error(message); }
function text(value, max = 200) { return typeof value === 'string' && value.length <= max; }
function identifier(value) { return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value); }
function validateBlocks(blocks, subjects, depth = 0) {
  assert(Array.isArray(blocks) && blocks.length <= 200 && depth <= 20, 'Hay demasiados bloques o uniones.');
  const ids = new Set();
  for (const b of blocks) {
    assert(b && typeof b === 'object' && identifier(b.id) && !ids.has(b.id), 'Cada bloque debe tener un identificador único.'); ids.add(b.id);
    assert(['lesson', 'break', 'free'].includes(b.kind) && Number.isInteger(b.duration) && b.duration > 0 && b.duration <= 1440, 'Un bloque tiene un tipo o duración incorrectos.');
    assert(b.label === undefined || text(b.label), 'El nombre del bloque es demasiado largo.');
    if (b.kind === 'lesson') {
      assert(b.subjectId === null || subjects.has(b.subjectId), 'Una clase hace referencia a una asignatura inexistente.');
      assert(b.teacherOverride == null || text(b.teacherOverride), 'El profesor de una clase no es válido.');
    }
    if (b.movedBy !== undefined) assert(b.kind === 'break' && identifier(b.movedBy), 'Descanso desplazado incorrecto.');
    if (b.merge) {
      assert(b.kind === 'lesson' && b.merge.original?.length >= 2, 'Unión incorrecta.');
      validateBlocks(b.merge.original, subjects, depth + 1);
      assert(b.merge.original.every(p => ['lesson', 'break'].includes(p.kind)), 'Una unión no puede contener tiempo libre.');
      const lessons = b.merge.original.filter(p => p.kind === 'lesson');
      assert(lessons.length === 2 && lessons.reduce((s, p) => s + p.duration, 0) === b.duration, 'La duración de la unión no coincide con sus clases.');
      assert(lessons.every(p => p.subjectId === b.subjectId), 'Las asignaturas de una unión no coinciden.');
    }
  }
  for (const b of blocks) {
    if (b.movedBy) assert(blocks.some(p => p.id === b.movedBy && p.merge), 'Un descanso ha perdido su bloque unido.');
    if (b.merge) {
      const expected = b.merge.original.filter(p => p.kind === 'break');
      const actual = blocks.filter(p => p.movedBy === b.id);
      assert(expected.length === actual.length && expected.every(p => actual.some(a => a.id === p.id && a.duration === p.duration)), 'Los descansos de la unión no coinciden.');
    }
  }
}
export function validateDay(day, subjects) {
  assert(day && Number.isInteger(day.start) && day.start >= 0 && day.start < 1440, 'La hora inicial no es válida.');
  validateBlocks(day.blocks, subjects);
  assert(endOfDay(day) <= 1440, 'La jornada no puede terminar después de medianoche.');
}
export function validateCourse(c) {
  assert(c && identifier(c.id) && text(c.name) && c.name.trim(), 'El curso necesita un nombre e identificador válidos.');
  assert(c.description === undefined || text(c.description, 1000), 'La descripción es demasiado larga.');
  assert(typeof c.timeZone === 'string', 'Falta la zona horaria.');
  try { new Intl.DateTimeFormat('es', { timeZone: c.timeZone }); } catch { throw new Error('Zona horaria desconocida.'); }
  assert(Array.isArray(c.subjects) && c.subjects.length <= 200, 'Lista de asignaturas incorrecta.');
  const ids = new Set();
  for (const s of c.subjects) {
    assert(identifier(s.id) && !ids.has(s.id) && text(s.name) && s.name.trim() && text(s.short, 24) && s.short.trim() && /^#[0-9a-fA-F]{6}$/.test(s.color), 'Revisa el nombre, abreviatura y color de las asignaturas.');
    assert(s.teacher == null || text(s.teacher), 'Nombre de profesor incorrecto.'); ids.add(s.id);
  }
  assert(c.week && typeof c.week === 'object' && !Array.isArray(c.week) && Object.keys(c.week).every(k => /^[0-6]$/.test(k)), 'Semana incorrecta.');
  assert(c.exceptions && typeof c.exceptions === 'object' && !Array.isArray(c.exceptions) && Object.keys(c.exceptions).length <= 1000, 'Excepciones incorrectas.');
  for (const d of Object.values(c.week)) validateDay(d, ids);
  for (const [date, d] of Object.entries(c.exceptions)) { assert(calendarDate(date), 'Una excepción tiene una fecha incorrecta.'); validateDay(d, ids); }
  return c;
}
export function validateState(state) {
  assert(state?.schemaVersion === VERSION && Array.isArray(state.courses) && state.courses.length <= 50, 'Formato de datos desconocido o demasiados cursos.');
  const ids = new Set(); for (const c of state.courses) { validateCourse(c); assert(!ids.has(c.id), 'Los cursos tienen identificadores repetidos.'); ids.add(c.id); }
  assert(['light', 'dark', 'system'].includes(state.theme), 'Tema desconocido.');
  return state;
}
export function publicTemplate(course) {
  const c = clone(course); c.exceptions = {};
  for (const s of c.subjects) delete s.teacher;
  function strip(blocks) { for (const b of blocks) { delete b.teacherOverride; if (b.merge) strip(b.merge.original); } }
  for (const d of Object.values(c.week)) strip(d.blocks);
  return { schemaVersion: VERSION, type: 'template', course: c };
}
export const backup = courses => ({ schemaVersion: VERSION, type: 'backup', courses: clone(courses) });
export function parseImport(value) {
  assert(value && value.schemaVersion === VERSION && ['template', 'backup'].includes(value.type), 'Archivo no compatible. Utiliza un JSON exportado por Mi horario (versión 1).');
  const list = value.type === 'template' ? [value.course] : value.courses;
  assert(Array.isArray(list) && list.length > 0 && list.length <= 50, 'El archivo debe contener entre 1 y 50 cursos.');
  for (const c of list) validateCourse(c);
  return clone(list);
}
export function importCopy(course) { const c = clone(course); c.id = uid(); return c; }
export function subjectUsage(course, subjectId) {
  return [...Object.values(course.week), ...Object.values(course.exceptions)].flatMap(d => d.blocks).filter(b => b.subjectId === subjectId).length;
}
export function removeSubject(course, id) {
  for (const d of [...Object.values(course.week), ...Object.values(course.exceptions)]) for (const b of d.blocks) if (b.kind === 'lesson' && b.subjectId === id) assign(b, null);
  course.subjects = course.subjects.filter(s => s.id !== id);
}
export function statusAt(course, now = new Date()) {
  const { date, minute } = nowInZone(course.timeZone, now), rows = visibleTimeline(effectiveDay(course, date));
  const current = rows.find(b => b.start <= minute && minute < b.end);
  if (current) {
    const s = course.subjects.find(s => s.id === current.subjectId);
    return { title: current.kind === 'break' ? current.label || 'Descanso' : s ? `Ahora · ${s.short}` : 'Tiempo libre', detail: `${time(current.start)}–${time(current.end)}${s && teacherFor(course, current) ? ` · ${teacherFor(course, current)}` : ''}`, current: current.id, date, minute };
  }
  for (let offset = 0; offset <= 14; offset++) {
    const nextDate = addDays(date, offset), next = timeline(effectiveDay(course, nextDate)).find(b => b.kind === 'lesson' && b.subjectId && (offset > 0 || b.start > minute));
    if (next) return { title: `Siguiente · ${course.subjects.find(s => s.id === next.subjectId).short}`, detail: `${offset ? dateLabel(nextDate, { weekday: 'long', day: 'numeric', month: 'short' }) + ' · ' : ''}${time(next.start)}–${time(next.end)}`, date, minute };
  }
  return { title: 'Sin clases próximas', detail: 'Tu horario está al día. Disfruta del tiempo libre.', date, minute };
}

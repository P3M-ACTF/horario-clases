/*
 * SPDX-License-Identifier: GPL-3.0-only
 * Copyright (c) 2026 P3M-ACTF and contributors.
 * License: https://github.com/P3M-ACTF/horario-clases/blob/main/LICENSE
 */
import { DAYS, COLORS, clone, uid, time, minutes, weekday, monday, addDays, dateLabel, nowInZone, timeline, visibleTimeline, endOfDay, effectiveDay, ensureException, makeDay, makeCourse, teacherFor, assign, swapAssignments, mergeNext, splitBlock, validateState, validateDay, publicTemplate, backup, parseImport, importCopy, subjectUsage, removeSubject, statusAt } from './model.js';
import { loadState, saveState, KEY } from './storage.js';

const $ = (s, root = document) => root.querySelector(s);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let storage;
try { storage = window.localStorage; } catch { storage = { getItem() { throw new Error(); }, setItem() { throw new Error(); } }; }
const loaded = loadState(storage);
let state = loaded.state, date = nowInZone().date, view = matchMedia('(max-width:720px)').matches ? 'day' : 'week', scope = 'read';
let catalog = [], catalogError = '', catalogLoading = true, deferredInstall, waitingWorker, memoryUnsaved = false;
let undo = [], dragSource = null, pointerDrag = null, suppressClick = false, toastTimer;
const dialog = $('#dialog');
const course = () => state.courses.find(c => c.id === state.selectedId) || state.courses[0];
if (loaded.warning) notice(loaded.warning);

function notice(message) {
  $('#notice').hidden = !message;
  $('#notice').replaceChildren(document.createTextNode(message));
  if (memoryUnsaved) {
    const retry = document.createElement('button'); retry.className = 'text-button'; retry.textContent = 'Reintentar guardado';
    retry.onclick = () => { try { saveState(state, storage); memoryUnsaved = false; notice(''); toast('Datos guardados.'); } catch (e) { toast(e.message, true); } }; $('#notice').append(retry);
  }
}
function toast(message, error = false) {
  clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.toggle('error', error); $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, error ? 8000 : 3500);
}
function persist(candidate, message, record = true) {
  validateState(candidate);
  if (record) { undo.push(clone(state)); if (undo.length > 30) undo.shift(); }
  state = candidate;
  try { saveState(state, storage); memoryUnsaved = false; if (loaded.warning) loaded.warning = ''; notice(''); if (message) toast(message); }
  catch (e) { memoryUnsaved = true; notice(e.message); toast(e.message, true); }
  render();
}
function change(fn, message = 'Cambios guardados en este dispositivo.') {
  const candidate = clone(state), c = candidate.courses.find(c => c.id === course()?.id);
  fn(c, candidate); persist(candidate, message);
}
function theme() {
  document.documentElement.dataset.theme = state.theme === 'system' ? (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light') : state.theme;
}
function openDialog(title, content, options = {}) {
  if (dialog.open) dialog.close();
  dialog.className = options.wide ? 'wide' : '';
  dialog.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">${esc(title)}</h2><button class="icon-button" data-close aria-label="Cerrar">×</button></div><div class="dialog-body">${content}</div>`;
  dialog.showModal(); $('[data-close]', dialog).onclick = () => dialog.close();
  dialog.querySelectorAll('[data-cancel]').forEach(b => b.onclick = () => dialog.close());
}
function formDialog(title, body, onSubmit, { submit = 'Guardar', wide = false, after } = {}) {
  openDialog(title, `<form id="editor-form">${body}<p class="form-error" role="alert" id="form-error"></p><div class="dialog-actions"><button class="button ghost" type="button" data-cancel>Cancelar</button><button class="button primary" type="submit">${esc(submit)}</button></div></form>`, { wide });
  $('#editor-form', dialog).onsubmit = e => {
    e.preventDefault();
    try { onSubmit(new FormData(e.currentTarget)); dialog.close(); } catch (error) { $('#form-error', dialog).textContent = error.message; }
  };
  after?.();
}
function confirmAction(title, text, action, label = 'Confirmar') {
  formDialog(title, `<p class="muted">${esc(text)}</p>`, () => action(), { submit: label });
}
function teacherName(c, b) { return teacherFor(c, b) || 'Sin profesor asignado'; }
function subject(c, id) { return c.subjects.find(s => s.id === id); }
function displayDay(c, d) { return scope === 'week' ? c.week[weekday(d)] || { start: 480, blocks: [] } : effectiveDay(c, d); }
function editingDay(c, d) {
  if (scope === 'week') return c.week[weekday(d)] ||= { start: 480, blocks: [] };
  if (scope === 'date' && d === date) return ensureException(c, d);
  throw new Error('Activa la edición del horario habitual o de esta fecha.');
}
function editable(d) { return scope === 'week' || (scope === 'date' && date === d); }
function getBlock(c, d, id) {
  const day = editingDay(c, d), block = day.blocks.find(b => b.id === id);
  if (!block) throw new Error('Este bloque ya no está disponible.');
  return { day, block };
}
const shortDate = d => dateLabel(d, { day: 'numeric', month: 'short' });
function dateRange() {
  const first = monday(date); return view === 'day' ? dateLabel(date) : `${shortDate(first)} — ${shortDate(addDays(first, 6))}`;
}
function daysToShow(c) {
  const first = monday(date), list = Array.from({ length: 7 }, (_, i) => addDays(first, i));
  return list.filter(d => weekday(d) >= 1 && weekday(d) <= 5 || displayDay(c, d).blocks.length || d === date);
}
function catalogCards() {
  if (catalogLoading) return '<p class="template-empty">Cargando plantillas…</p>';
  if (catalogError) return `<div class="template-empty"><p>${esc(catalogError)}</p><button class="button small" data-action="reload-catalog">Reintentar</button></div>`;
  if (!catalog.length) return '<p class="template-empty">Aún no hay plantillas. Puedes crear tu horario o importar un archivo.</p>';
  return `<div class="template-grid">${catalog.map(t => `<article class="template-card"><div class="template-mark">${esc(t.name)}</div><p>${esc(t.description)}</p><div class="template-meta">${(t.tags || []).map(s => `<span class="pill">${esc(s)}</span>`).join('')}</div><button class="button small" data-action="load-template" data-template="${esc(t.id)}">Usar plantilla <span aria-hidden="true">↗</span></button></article>`).join('')}</div>`;
}
function renderWelcome() {
  return `<section class="welcome"><div class="welcome-hero"><div class="welcome-copy"><div class="eyebrow">Un poco de orden. Mucha tranquilidad.</div><h1>Tu semana,<br>a tu manera<span class="brand-dot">.</span></h1><p>Organiza tus clases, ajusta los descansos y ten claro qué viene después. Por la mañana o por la tarde. También sin conexión.</p></div><div class="hero-art" aria-hidden="true"><div class="art-head"><span>UNA SEMANA A TU MEDIDA</span><span>✳</span></div><div class="art-grid">${'<i></i>'.repeat(12)}</div></div></div><div class="start-options"><button class="start-card" data-action="new-course"><span class="card-icon" aria-hidden="true">＋</span><b>Empieza desde cero</b><p>Tu curso, tus asignaturas y tus horas.</p><span class="arrow" aria-hidden="true">↗</span></button><button class="start-card" data-action="catalog"><span class="card-icon" aria-hidden="true">▦</span><b>Elige una plantilla</b><p>Un horario listo para hacerlo tuyo.</p><span class="arrow" aria-hidden="true">↗</span></button><button class="start-card" data-action="import"><span class="card-icon" aria-hidden="true">↥</span><b>Trae tu horario</b><p>Importa una plantilla o una copia personal.</p><span class="arrow" aria-hidden="true">↗</span></button></div><section id="catalog-section"><div class="section-heading"><div><div class="eyebrow">Un buen punto de partida</div><h2>Plantillas de la comunidad</h2><p>Carga una copia y adáptala. Solo tú verás tus cambios.</p></div><span class="pill">${catalog.length} disponible${catalog.length === 1 ? '' : 's'}</span></div>${catalogCards()}</section></section>`;
}
function lessonColors(color = '#83917c') {
  // Match the original HTML for its palette, including the dark text on yellow.
  const original = {
    '#775a94': ['#81639d', '#684b85', '#ffffff'],
    '#e9c90b': ['#e5c709', '#cdaa02', '#332d00'],
    '#dbbd08': ['#e5c709', '#cdaa02', '#332d00'],
    '#76ad72': ['#7fb679', '#639d61', '#ffffff'],
    '#1189b8': ['#148fbf', '#0e739b', '#ffffff'],
    '#1888ad': ['#148fbf', '#0e739b', '#ffffff'],
    '#d95e39': ['#df6845', '#bf4f31', '#ffffff'],
    '#dc5a3d': ['#df6246', '#c24731', '#ffffff'],
    '#ce243d': ['#d82d47', '#b91f39', '#ffffff']
  };
  let palette = original[color.toLowerCase()];
  if (!palette) {
    const rgb = color.slice(1).match(/../g).map(n => parseInt(n, 16));
    const shade = amount => '#' + rgb.map(n => Math.round(amount > 0 ? n + (255 - n) * amount : n * (1 + amount)).toString(16).padStart(2, '0')).join('');
    const brightness = rgb.reduce((sum, n, i) => sum + [0.2126, 0.7152, 0.0722][i] * (n / 255 <= .04045 ? n / 255 / 12.92 : ((n / 255 + .055) / 1.055) ** 2.4), 0);
    palette = [shade(.06), shade(-.14), brightness > .24 ? '#182033' : '#ffffff'];
  }
  return `--subject:${color};--lesson-start:${palette[0]};--lesson-end:${palette[1]};--lesson-ink:${palette[2]}`;
}
function lessonHTML(c, b, d, currentId, compact = false) {
  const s = subject(c, b.subjectId), can = editable(d);
  if (b.kind === 'break') return `<button type="button" class="break-block" data-action="day-settings" data-date="${d}" title="${esc(b.label || 'Descanso')} · ${time(b.start)}–${time(b.end)} · ${b.duration} min" aria-label="${esc(b.label || 'Descanso')}, ${time(b.start)} a ${time(b.end)}${can ? '. Ajustar jornada' : ''}" ${can ? '' : 'disabled'}>${esc(b.label || 'Descanso')} · ${b.duration}′</button>`;
  if (b.kind === 'free') return `<button class="free-block" data-action="day-settings" data-date="${d}" ${can ? '' : 'disabled'}>Tiempo libre · ${b.duration}′</button>`;
  return `<button type="button" class="lesson ${s ? '' : 'empty'} ${b.id === currentId ? 'current' : ''} ${compact ? 'compact' : ''}" style="${lessonColors(s?.color)}" data-action="lesson" data-date="${d}" data-block="${esc(b.id)}" draggable="${can && !!s}" aria-label="${esc(s?.name || 'Hueco libre')}, ${DAYS[weekday(d)]}, ${time(b.start)} a ${time(b.end)}${s?.teacher ? ', ' + esc(teacherFor(c, b)) : ''}">${can && s ? '<span class="drag-handle" aria-hidden="true">⠿</span>' : ''}<span><strong>${esc(s?.short || (can ? '+ Asignar clase' : 'Hueco libre'))}</strong>${s ? `<small class="lesson-detail">${esc(teacherFor(c, b))}</small>` : ''}</span><span class="lesson-time">${time(b.start)} – ${time(b.end)}${b.merge ? ' · Unido' : ''}</span></button>`;
}
function renderWeek(c) {
  const dates = daysToShow(c), days = dates.map(d => displayDay(c, d)), active = statusAt(c);
  const nonempty = days.filter(d => d.blocks.length), min = nonempty.length ? Math.min(...nonempty.map(d => d.start)) : 480;
  const max = nonempty.length ? Math.max(...nonempty.map(endOfDay)) : 780;
  const scale = 2, height = Math.max(300, (max - min) * scale + 16);
  const lessonRows = days.map(d => timeline(d).filter(b => b.kind === 'lesson')).filter(rows => rows.length);
  const signature = rows => rows.map(b => `${b.start}-${b.end}`).join(',');
  const sharedTimes = lessonRows.length && lessonRows.every(rows => signature(rows) === signature(lessonRows[0]));
  const position = minute => ((minute - min) * scale + 8) / height * 100;
  let ticks;
  if (sharedTimes) {
    // The source timetable shows one start/end pair per class, not a clock ruler.
    ticks = lessonRows[0].map(b => `<div class="time-range" style="top:${position((b.start + b.end) / 2)}%"><b class="time-label">${time(b.start)}</b><span class="time-label">${time(b.end)}</span></div>`);
  } else {
    // Joined or individually adjusted days still show their real class boundaries.
    const bounds = [...new Set(lessonRows.flatMap(rows => rows.flatMap(b => [b.start, b.end])))].sort((a, b) => a - b);
    let lane = 0;
    ticks = bounds.map((m, i) => {
      lane = i && (m - bounds[i - 1]) * scale < 18 ? 1 - lane : 0;
      return `<span class="time-tick time-label lane-${lane}" style="top:${position(m)}%">${time(m)}</span>`;
    });
  }
  return `<div class="week-scroll"><div class="week" style="--days:${dates.length}"><div class="week-header"><div class="week-head"><small class="muted">HORA</small></div>${dates.map(d => `<div class="week-head ${active.date === d ? 'today' : ''}"><span class="day-name">${DAYS[weekday(d)].slice(0, 3)}</span><span class="day-number">${Number(d.slice(-2))}</span>${c.exceptions[d] && scope !== 'week' ? '<span class="pill exception">Cambio</span>' : ''}${editable(d) ? `<button class="head-action" data-action="day-settings" data-date="${d}">Ajustar día</button>` : ''}</div>`).join('')}</div><div class="week-body" style="height:${height}px"><div class="time-axis">${ticks.join('')}</div>${dates.map((d, i) => `<div class="day-column ${active.date === d ? 'today' : ''}">${visibleTimeline(days[i]).map(b => `<div class="slot" style="top:${((b.start - min) * scale + 8) / height * 100}%;height:${b.duration * scale / height * 100}%;${b.kind === 'break' ? 'padding:0 0 1px' : ''}">${lessonHTML(c, b, d, scope !== 'week' && d === active.date ? active.current : null, b.duration < 30)}</div>`).join('')}${!days[i].blocks.length ? '<p class="empty-day">Sin clases</p>' : ''}</div>`).join('')}</div></div></div>`;
}
function renderDay(c) {
  const active = statusAt(c), first = monday(date), rows = visibleTimeline(displayDay(c, date));
  return `<div class="day-tabs" aria-label="Días de la semana">${Array.from({ length: 7 }, (_, i) => addDays(first, i)).map(d => `<button class="day-tab ${date === d ? 'active' : ''}" data-action="select-date" data-date="${d}" aria-pressed="${date === d}">${DAYS[weekday(d)].slice(0, 3)}<strong>${Number(d.slice(-2))}</strong></button>`).join('')}</div>${editable(date) ? `<div class="edit-strip"><span class="muted">${c.exceptions[date] && scope === 'date' ? 'Cambio provisional guardado' : dateLabel(date)}</span><button class="button small" data-action="day-settings" data-date="${date}">Ajustar jornada y descansos</button></div>` : ''}<div class="daily">${rows.length ? rows.map(b => `<div class="day-row ${b.kind === 'break' ? 'break-row' : ''}"><div class="day-time"><b>${time(b.start)}</b><span>${time(b.end)}</span></div>${lessonHTML(c, b, date, scope !== 'week' && date === active.date ? active.current : null)}</div>`).join('') : `<div class="daily-empty"><strong>Un día sin clases</strong><p>${editable(date) ? 'Añade una jornada desde «Ajustar jornada y descansos».' : 'No hay clases programadas para esta fecha.'}</p></div>`}</div>`;
}
function renderSidebar(c) {
  return `<aside class="sidebar"><section class="side-panel"><div class="side-heading"><h2>Tus asignaturas <span class="muted">· ${c.subjects.length}</span></h2><button class="icon-button" data-action="new-subject" aria-label="Añadir asignatura">＋</button></div><div class="subject-list">${c.subjects.map(s => `<button class="subject-item" style="--subject:${s.color}" data-action="subject" data-subject="${esc(s.id)}" draggable="${scope !== 'read'}"><span class="swatch"></span><span><b>${esc(s.short)}</b><small>${esc(s.teacher || s.name)}</small></span>${scope !== 'read' ? '<span class="drag-handle" aria-hidden="true">⠿</span>' : ''}</button>`).join('') || '<p class="subject-empty">Añade tu primera asignatura. Después podrás colocarla en el horario.</p>'}</div></section><p class="side-tip"><b>${scope === 'read' ? 'Todo en su sitio.' : 'Tu horario es flexible.'}</b><br>${scope === 'read' ? 'Activa la edición para mover clases o hacer un cambio solo para una fecha.' : 'Arrastra las asignaturas o pulsa una clase para editarla. También puedes moverla con el selector de destino.'}</p><div class="side-buttons"><button class="button" data-action="catalog">▦ &nbsp; Plantillas de la comunidad</button><button class="button" data-action="import">↥ &nbsp; Importar archivo</button><button class="button" data-action="export-menu">↧ &nbsp; Exportar horario</button></div></aside>`;
}
function statusHTML(c) {
  const s = statusAt(c);
  return `<div class="status-main"><strong>${esc(s.title)}</strong><p>${esc(s.detail)}</p></div><span class="clock">${time(s.minute)} <small>${esc(c.timeZone.split('/').pop().replaceAll('_', ' '))}</small></span>`;
}
function renderCourse(c) {
  return `<section class="course-top"><div class="course-title"><div class="eyebrow">Tu espacio para organizarte</div><h1>${esc(c.name)}</h1><p>${esc(c.description || 'Cada clase en su sitio. Cada cambio bajo control.')}</p></div><div class="course-tools"><select class="course-select" id="course-select" aria-label="Curso activo">${state.courses.map(x => `<option value="${esc(x.id)}" ${x.id === c.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select><button class="button" data-action="add-course">＋ Curso</button><button class="icon-button" data-action="course-settings" aria-label="Configurar curso" title="Configurar curso">⚙</button><button class="icon-button" data-action="print" aria-label="Imprimir vista actual" title="Imprimir vista actual">⎙</button></div></section><p class="print-context" style="display:none">${esc(dateRange())} · ${scope === "week" ? "Horario habitual" : "Horario con cambios de fechas concretas"}</p><section class="now-card" id="now-card" aria-label="Clase actual y reloj">${statusHTML(c)}</section><div class="workspace"><section class="board" aria-label="Horario de ${esc(c.name)}"><div class="board-toolbar"><div class="view-switch" aria-label="Vista del horario"><button data-action="view-week" class="${view === 'week' ? 'active' : ''}" aria-pressed="${view === 'week'}">Semana</button><button data-action="view-day" class="${view === 'day' ? 'active' : ''}" aria-pressed="${view === 'day'}">Día</button></div><div class="date-nav"><button class="icon-button" data-action="previous" aria-label="${view === 'week' ? 'Semana' : 'Día'} anterior">‹</button><span class="range-label">${esc(dateRange())}</span><button class="icon-button" data-action="next" aria-label="${view === 'week' ? 'Semana' : 'Día'} siguiente">›</button><button class="button small" data-action="today">Hoy</button><input type="date" id="selected-date" aria-label="Seleccionar fecha" value="${date}"></div></div><div class="edit-strip"><label>Modo <select id="edit-scope"><option value="read" ${scope === 'read' ? 'selected' : ''}>Consultar</option><option value="week" ${scope === 'week' ? 'selected' : ''}>Editar horario habitual</option><option value="date" ${scope === 'date' ? 'selected' : ''}>Editar solo esta fecha</option></select></label>${scope === 'date' && c.exceptions[date] ? '<button class="button small" data-action="restore-date">Restaurar horario habitual</button>' : ''}${scope !== 'read' ? `<button class="button small" data-action="undo" ${undo.length ? '' : 'disabled'}>↶ Deshacer</button>` : ''}<span class="edit-description">${scope === 'week' ? 'Los cambios se repiten cada semana. Las excepciones se conservan.' : scope === 'date' ? `Solo ${esc(shortDate(date))}. Las demás fechas no cambian.` : 'Tu horario habitual, con los cambios de cada fecha.'}</span></div>${view === 'week' ? renderWeek(c) : renderDay(c)}<div class="board-caption"><span>${scope === 'week' ? '↻ Horario habitual' : c.exceptions[date] ? '◷ Incluye cambio provisional' : '✓ Horario personal'}</span><span>${memoryUnsaved ? 'Pendiente de guardar' : 'Guardado en este navegador'}</span></div></section>${renderSidebar(c)}</div>`;
}
function render() {
  theme(); const c = course();
  $('#main').innerHTML = c ? renderCourse(c) : renderWelcome();
  document.title = c ? `${c.name} · Mi horario` : 'Mi horario';
  $('#course-select')?.addEventListener('change', e => { scope = 'read'; persist({ ...state, selectedId: e.target.value }, '', false); });
  $('#selected-date')?.addEventListener('change', e => { if (e.target.value) { date = e.target.value; render(); } });
  $('#edit-scope')?.addEventListener('change', e => { scope = e.target.value; if (scope === 'date') view = 'day'; render(); });
}
function setupFields(options = {}) {
  return `<div class="form-grid"><label class="field">Turno orientativo<select id="turno"><option value="480">Matutino · desde las 08:00</option><option value="915">Vespertino · desde las 15:15</option><option value="custom">Otro horario</option></select></label><label class="field">Hora de inicio<input name="start" type="time" value="${time(options.start ?? 480)}" required></label><label class="field">Clases por día<input name="count" type="number" min="1" max="24" value="6" required></label><label class="field">Minutos por clase<input name="duration" type="number" min="1" max="480" value="50" required></label><label class="field">Descanso entre clases (min)<input name="shortBreak" type="number" min="0" max="180" value="5" required></label><label class="field">Recreo (min)<input name="recess" type="number" min="0" max="180" value="20" required></label><label class="field">Recreo después de la clase<input name="after" type="number" min="1" max="24" value="3" required></label></div>`;
}
function readSetup(f) { return { start: minutes(f.get('start')), ...Object.fromEntries(['count', 'duration', 'shortBreak', 'recess', 'after'].map(k => [k, Number(f.get(k))])) }; }
function wireTurno() { $('#turno', dialog)?.addEventListener('change', e => { if (e.target.value !== 'custom') $('[name=start]', dialog).value = time(Number(e.target.value)); }); }
function newCourse() {
  formDialog('Un nuevo horario', `<p class="muted">Empieza con los huecos de clase. Después añade tus asignaturas.</p><div class="form-grid" style="margin:16px 0"><label class="field full">Nombre del curso<input name="name" placeholder="Ej. ASIR 1 · Mañana" maxlength="200" required autofocus></label><div class="field full"><span>Días lectivos</span><div class="checkbox-row">${[1, 2, 3, 4, 5, 6, 0].map(d => `<label class="check"><input type="checkbox" name="days" value="${d}" ${d > 0 && d < 6 ? 'checked' : ''}>${DAYS[d].slice(0, 3)}</label>`).join('')}</div></div></div>${setupFields()}`, f => {
    const c = makeCourse(f.get('name'), f.getAll('days').map(Number), readSetup(f));
    scope = 'week'; change((_, s) => { s.courses.push(c); s.selectedId = c.id; }, 'Curso creado. Añade tus asignaturas.');
  }, { submit: 'Crear horario', after: wireTurno });
}
function addCourse() {
  openDialog('Añade otro horario', '<p>Cada curso guarda sus asignaturas, horas y cambios por separado.</p><div class="dialog-links"><button class="button" data-action="new-course">＋ Crear desde cero</button><button class="button" data-action="catalog">▦ Elegir una plantilla</button><button class="button" data-action="import">↥ Importar un archivo</button></div>');
}
function editSubject(id) {
  const c = course(), s = c.subjects.find(x => x.id === id), color = s?.color || COLORS[c.subjects.length % COLORS.length];
  formDialog(s ? 'Editar asignatura' : 'Nueva asignatura', `<div class="form-grid"><label class="field full">Nombre<input name="name" value="${esc(s?.name || '')}" placeholder="Ej. Administración de sistemas" maxlength="200" required autofocus></label><label class="field">Abreviatura<input name="short" value="${esc(s?.short || '')}" placeholder="Ej. ASO" maxlength="24" required></label><label class="field">Color<input name="color" type="color" value="${color}"></label><label class="field full">Profesor habitual <span class="muted">(opcional)</span><input name="teacher" value="${esc(s?.teacher || '')}" maxlength="200" placeholder="Puedes añadirlo más adelante"></label></div>${s ? '<div class="settings-section"><button class="button danger small" type="button" id="delete-subject">Eliminar asignatura</button></div>' : ''}`, f => {
    const next = { id: s?.id || uid(), name: f.get('name').trim(), short: f.get('short').trim(), color: f.get('color'), teacher: f.get('teacher').trim() };
    change(c => { const i = c.subjects.findIndex(s => s.id === next.id); if (i < 0) c.subjects.push(next); else c.subjects[i] = next; });
  }, { after: () => $('#delete-subject', dialog)?.addEventListener('click', () => confirmAction('Eliminar asignatura', `Se eliminará ${s.short} y quedarán libres sus ${subjectUsage(c, id)} bloques de clase, incluidos los cambios provisionales.`, () => change(c => removeSubject(c, id)), 'Eliminar')) });
}
function editCourse() {
  const c = course();
  formDialog('Configurar curso', `<div class="form-grid"><label class="field full">Nombre<input name="name" value="${esc(c.name)}" maxlength="200" required></label><label class="field full">Descripción<textarea name="description" maxlength="1000">${esc(c.description)}</textarea></label><label class="field full">Zona horaria<input name="timeZone" value="${esc(c.timeZone)}" required><small>Por ejemplo, Europe/Madrid o Atlantic/Canary.</small></label></div><div class="settings-section"><h3>Gestionar este horario</h3><div class="chip-list"><button class="button small" type="button" id="duplicate-course">Duplicar curso</button><button class="button danger small" type="button" id="delete-course">Eliminar curso</button></div></div>`, f => change(c => { c.name = f.get('name').trim(); c.description = f.get('description').trim(); c.timeZone = f.get('timeZone').trim(); }), { after: () => {
    $('#duplicate-course', dialog).onclick = () => { const copy = importCopy(c); copy.name = `${c.name.slice(0, 185)} (copia)`; change((_, s) => { s.courses.push(copy); s.selectedId = copy.id; }, 'Copia independiente creada.'); dialog.close(); };
    $('#delete-course', dialog).onclick = () => confirmAction('Eliminar curso', `Se eliminará «${c.name}» de este dispositivo, incluidos sus cambios provisionales. Puedes exportarlo antes desde el menú Exportar.`, () => change((_, s) => { s.courses = s.courses.filter(x => x.id !== c.id); s.selectedId = s.courses[0]?.id || null; }), 'Eliminar curso');
  } });
}
function editLesson(d, id) {
  const c = course(), day = displayDay(c, d), b = timeline(day).find(b => b.id === id), s = subject(c, b?.subjectId);
  if (!b) return;
  const preview = `<div class="lesson-preview" style="--subject:${s?.color || '#748568'}"><strong>${esc(s?.name || 'Hueco libre')}</strong><span>${esc(DAYS[weekday(d)])} · ${time(b.start)}–${time(b.end)} · ${b.duration} minutos</span></div>`;
  if (!editable(d)) {
    openDialog('Detalle de la clase', `${preview}<p>${esc(teacherName(c, b))}</p><div class="dialog-links"><button class="button" id="edit-base">Editar horario habitual</button><button class="button" id="edit-date">Cambiar solo el ${esc(shortDate(d))}</button></div>`);
    $('#edit-base', dialog).onclick = () => { scope = 'week'; render(); const base = c.week[weekday(d)]; if (base?.blocks.some(x => x.id === id)) editLesson(d, id); else { dialog.close(); toast('Se muestra el horario habitual. Selecciona la clase que quieras cambiar.'); } };
    $('#edit-date', dialog).onclick = () => { scope = 'date'; date = d; view = 'day'; render(); editLesson(d, id); };
    return;
  }
  const targets = daysToShow(c).filter(editable).flatMap(targetDate => timeline(displayDay(c, targetDate)).filter(x => x.kind === 'lesson' && x.duration === b.duration && !(d === targetDate && x.id === id)).map(x => ({ date: targetDate, id: x.id, label: `${DAYS[weekday(targetDate)]} ${time(x.start)} · ${subject(c, x.subjectId)?.short || 'Hueco libre'}` })));
  formDialog('Editar clase', `${preview}<div class="form-grid"><label class="field full">Asignatura<select name="subjectId"><option value="">Hueco libre / clase cancelada</option>${c.subjects.map(x => `<option value="${esc(x.id)}" ${b.subjectId === x.id ? 'selected' : ''}>${esc(x.short)} · ${esc(x.name)}</option>`).join('')}</select></label><label class="field full">Profesor solo para este bloque<input name="teacher" value="${esc(b.teacherOverride ?? '')}" placeholder="Usar el profesor habitual" maxlength="200"><small>Déjalo vacío para utilizar el profesor de la asignatura.</small></label></div><div class="settings-section"><h3>Mover o intercambiar</h3><label class="field">Destino de igual duración<select id="move-target"><option value="">Selecciona un destino…</option>${targets.map((x, i) => `<option value="${i}">${esc(x.label)}</option>`).join('')}</select></label><button class="button small" type="button" id="move-lesson" style="margin-top:10px" ${targets.length ? '' : 'disabled'}>Mover / intercambiar clase actual</button><p class="muted" style="font-size:11px;margin-top:7px">Este botón mueve la asignación actual. Guarda primero si acabas de cambiar la asignatura o el profesor.</p></div><div class="settings-section"><h3>Clases y descansos</h3><div class="chip-list"><button class="button small" type="button" id="join-lesson">Unir con la siguiente</button>${b.merge ? '<button class="button small" type="button" id="split-lesson">Separar bloque</button>' : ''}<button class="button small danger" type="button" id="cancel-lesson">Dejar hueco libre</button></div></div>`, f => change(c => { const { block } = getBlock(c, d, id); assign(block, f.get('subjectId') || null, f.get('teacher').trim() || null); }), { after: () => {
    function action(fn) { try { fn(); dialog.close(); } catch (e) { $('#form-error', dialog).textContent = e.message; } }
    $('#move-lesson', dialog).onclick = () => action(() => { const index = $('#move-target', dialog).value; if (index === '') throw new Error('Selecciona un destino.'); const t = targets[Number(index)]; change(c => swapAssignments(getBlock(c, d, id).block, getBlock(c, t.date, t.id).block)); });
    $('#join-lesson', dialog).onclick = () => action(() => change(c => mergeNext(c, editingDay(c, d), id), 'Clases unidas. El descanso se conserva al final.'));
    $('#split-lesson', dialog)?.addEventListener('click', () => action(() => change(c => splitBlock(editingDay(c, d), id), 'Se han recuperado las clases y sus descansos.')));
    $('#cancel-lesson', dialog).onclick = () => action(() => change(c => assign(getBlock(c, d, id).block, null), 'El bloque queda libre; las demás horas no cambian.'));
  } });
}
function editDay(d) {
  if (!editable(d)) return;
  const c = course(), draft = clone(displayDay(c, d));
  function show() {
    formDialog(`Ajustar ${DAYS[weekday(d)].toLowerCase()}`, `<p class="muted">${scope === 'week' ? 'Se aplica cada semana.' : `Solo el ${dateLabel(d)}.`} Las duraciones recalculan las horas siguientes.</p><div class="form-grid" style="margin-top:16px"><label class="field">Hora de inicio<input name="start" type="time" value="${time(draft.start)}" required></label></div><div class="block-editor">${timeline(draft).map((b, i) => `<div class="block-edit-row"><div class="block-label">${esc(b.kind === 'lesson' ? subject(c, b.subjectId)?.short || 'Hueco de clase' : b.label || (b.kind === 'break' ? 'Descanso' : 'Tiempo libre'))}${b.merge ? ' · Unido' : ''}<small>${time(b.start)}–${time(b.end)}${b.merge || b.movedBy ? ' · separar para ajustar' : ''}</small></div><label class="field"><input type="number" name="duration-${i}" value="${b.duration}" min="1" max="720" aria-label="Duración en minutos del bloque ${i + 1}" ${b.merge || b.movedBy ? 'readonly' : ''} required></label><button type="button" class="icon-button" data-remove-block="${i}" aria-label="Eliminar bloque ${i + 1}" ${b.merge || b.movedBy ? 'disabled' : ''}>×</button></div>`).join('')}</div><p class="muted" style="font-size:11px;margin-top:8px">Duraciones en minutos. Fin previsto: ${time(endOfDay(draft))}.</p><div class="chip-list" style="margin-top:14px"><button type="button" class="button small" data-add-block="lesson">＋ Clase</button><button type="button" class="button small" data-add-block="break">＋ Descanso</button><button type="button" class="button small" data-add-block="free">＋ Tiempo libre</button></div>${!draft.blocks.length ? '<div class="settings-section"><button type="button" class="button" id="generate-day">Generar franjas de clase</button></div>' : ''}`, f => {
      sync(f); validateDay(draft, new Set(c.subjects.map(s => s.id)));
      change(c => { if (scope === 'week') c.week[weekday(d)] = clone(draft); else c.exceptions[d] = clone(draft); });
    }, { after: () => {
      dialog.querySelectorAll('[data-remove-block]').forEach(b => b.onclick = () => { try { sync(new FormData($('#editor-form', dialog))); draft.blocks.splice(Number(b.dataset.removeBlock), 1); show(); } catch (e) { $('#form-error', dialog).textContent = e.message; } });
      dialog.querySelectorAll('[data-add-block]').forEach(b => b.onclick = () => { try { sync(new FormData($('#editor-form', dialog))); const kind = b.dataset.addBlock; draft.blocks.push({ id: uid(), kind, duration: kind === 'lesson' ? 50 : 10, ...(kind === 'lesson' ? { subjectId: null } : { label: kind === 'break' ? 'Descanso' : 'Tiempo libre' }) }); show(); } catch (e) { $('#form-error', dialog).textContent = e.message; } });
      $('#generate-day', dialog)?.addEventListener('click', () => {
        formDialog('Generar jornada', setupFields({ start: draft.start }), f => { const next = makeDay(readSetup(f)); change(c => { if (scope === 'week') c.week[weekday(d)] = next; else c.exceptions[d] = next; }); }, { after: wireTurno, submit: 'Crear franjas' });
      });
    } });
  }
  function sync(f) { draft.start = minutes(f.get('start')); draft.blocks.forEach((b, i) => { if (!b.merge && !b.movedBy) b.duration = Number(f.get(`duration-${i}`)); }); }
  show();
}
async function loadCatalog() {
  catalogLoading = true; catalogError = ''; render();
  try {
    const response = await fetch('./templates/index.json'); if (!response.ok) throw new Error();
    const value = await response.json();
    if (value.schemaVersion !== 1 || !Array.isArray(value.templates) || value.templates.length > 200 || value.templates.some(t => !/^[a-z0-9-]+$/.test(t.id) || !/^[a-z0-9-]+\.json$/.test(t.file) || typeof t.name !== 'string' || typeof t.description !== 'string' || !Array.isArray(t.tags) || !t.tags.every(x => typeof x === 'string'))) throw new Error();
    catalog = value.templates;
  } catch { catalogError = 'No se ha podido cargar el catálogo. Puedes importar un archivo o crear un curso vacío.'; }
  catalogLoading = false; render();
  if (dialog.open && dialog.dataset.catalog === 'true') showCatalog();
}
function showCatalog() { openDialog('Plantillas de la comunidad', '<p>Cada plantilla crea una copia en tu dispositivo. Puedes añadir los profesores y cambiar lo que necesites.</p>' + catalogCards(), { wide: true }); dialog.dataset.catalog = 'true'; }
dialog.addEventListener('close', () => { delete dialog.dataset.catalog; });
function importPreview(value) {
  const copies = parseImport(value);
  formDialog('Importar horario', `<p class="muted">Se añadirán ${copies.length} ${copies.length === 1 ? 'curso nuevo' : 'cursos nuevos'}. Tus horarios actuales se conservarán.</p><ul class="summary-list">${copies.map(c => `<li><b>${esc(c.name)}</b><br><span class="muted">${c.subjects.length} asignaturas · ${Object.keys(c.week).length} días · ${Object.keys(c.exceptions).length} cambios provisionales</span></li>`).join('')}</ul>`, () => {
    scope = 'read'; change((_, s) => { for (const c of copies) { const copy = importCopy(c); s.courses.push(copy); s.selectedId = copy.id; } }, 'Horario importado. Esta copia es tuya.');
  }, { submit: copies.length === 1 ? 'Crear mi copia' : 'Importar cursos' });
}
async function loadTemplate(id) {
  const t = catalog.find(t => t.id === id); if (!t) return;
  try { const response = await fetch(`./templates/${t.file}`); if (!response.ok) throw new Error('No se ha podido cargar esta plantilla. Reintenta cuando tengas conexión.'); const value = await response.json(); if (value.type !== 'template') throw new Error('La plantilla tiene un formato incorrecto.'); importPreview(value); }
  catch (e) { toast(e.message, true); }
}
function download(value, name) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function exportMenu() {
  const c = course(), slug = c.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'horario';
  openDialog('Llévate tu horario', '<p>Comparte una plantilla o guarda todos los detalles en una copia personal.</p><div class="dialog-links"><button class="button" id="export-template">Exportar como plantilla</button><p class="muted" style="font-size:12px">Solo el horario semanal, sin profesores ni cambios provisionales.</p><button class="button" id="export-course">Copia personal de este curso</button><p class="muted" style="font-size:12px">Incluye profesores y cambios para fechas concretas.</p><button class="button" id="export-all">Copia de todos mis cursos</button></div>');
  $('#export-template', dialog).onclick = () => download(publicTemplate(c), `${slug}.plantilla.json`);
  $('#export-course', dialog).onclick = () => download(backup([c]), `${slug}.personal.json`);
  $('#export-all', dialog).onclick = () => download(backup(state.courses), 'mis-horarios.personal.json');
}
function help() {
  openDialog('Tu horario, siempre a mano', '<ul class="help-list"><li><b>Tus datos están en este navegador.</b> No hay cuentas ni sincronización automática. Exporta una copia para llevarla a otro dispositivo o conservarla si borras los datos del navegador.</li><li><b>Las plantillas son un punto de partida.</b> Al cargarlas creas una copia independiente. Tus cambios nunca se publican en el catálogo.</li><li><b>Editar horario habitual</b> cambia todas las semanas. <b>Editar solo esta fecha</b> crea una excepción independiente. Las horas admiten turnos de mañana y tarde.</li><li><b>Mover clases:</b> arrastra con el ratón o usa el asa ⠿ en una pantalla táctil. También puedes pulsar una clase y elegir un destino con el teclado.</li><li><b>Instalar:</b> utiliza «Instalar app» si aparece, o la opción de instalación del navegador. En Safari para iPhone: Compartir → Añadir a la pantalla de inicio.</li><li><b>Sin conexión:</b> después de completar la primera carga puedes consultar, editar y cargar las plantillas guardadas. Una nueva versión no borra tus cursos.</li><li><b>Compartir plantillas:</b> usa «Exportar como plantilla» para obtener el archivo sin profesores ni cambios provisionales.</li></ul>');
}
async function dispatch(e) {
  if (suppressClick) { suppressClick = false; e.preventDefault(); return; }
  const button = e.target.closest('[data-action]'); if (!button) return;
  const action = button.dataset.action;
  try {
    switch (action) {
      case 'new-course': newCourse(); break;
      case 'add-course': addCourse(); break;
      case 'catalog': showCatalog(); break;
      case 'load-template': await loadTemplate(button.dataset.template); break;
      case 'reload-catalog': await loadCatalog(); break;
      case 'import': $('#file-input').click(); break;
      case 'new-subject': editSubject(); break;
      case 'subject': editSubject(button.dataset.subject); break;
      case 'course-settings': editCourse(); break;
      case 'lesson': editLesson(button.dataset.date, button.dataset.block); break;
      case 'day-settings': editDay(button.dataset.date); break;
      case 'view-week': view = 'week'; render(); break;
      case 'view-day': view = 'day'; render(); break;
      case 'previous': date = addDays(date, view === 'week' ? -7 : -1); render(); break;
      case 'next': date = addDays(date, view === 'week' ? 7 : 1); render(); break;
      case 'today': date = nowInZone(course().timeZone).date; view = 'day'; render(); break;
      case 'select-date': date = button.dataset.date; render(); break;
      case 'restore-date': confirmAction('Restaurar horario habitual', `Se eliminarán los cambios provisionales del ${dateLabel(date)}.`, () => change(c => { delete c.exceptions[date]; }), 'Restaurar'); break;
      case 'undo': if (undo.length) { const last = undo.pop(); persist(last, 'Último cambio deshecho.', false); } break;
      case 'export-menu': exportMenu(); break;
      case 'print': window.print(); break;
    }
  } catch (e) { toast(e.message, true); }
}
document.addEventListener('click', dispatch);
$('#file-input').addEventListener('change', async e => {
  const file = e.target.files[0]; e.target.value = ''; if (!file) return;
  try { if (file.size > 5_000_000) throw new Error('El archivo supera el máximo de 5 MB.'); importPreview(JSON.parse(await file.text())); }
  catch (error) { toast(error instanceof SyntaxError ? 'El archivo no contiene JSON válido. Exporta una plantilla desde Mi horario.' : error.message, true); }
});
function sourceFrom(el) { if (el.dataset.block) return { type: 'block', date: el.dataset.date, id: el.dataset.block }; if (el.dataset.subject) return { type: 'subject', id: el.dataset.subject }; }
function drop(source, target) {
  if (!source || !target || !editable(target.dataset.date)) return;
  try {
    change(c => {
      const { block } = getBlock(c, target.dataset.date, target.dataset.block);
      if (source.type === 'subject') { if (!subject(c, source.id)) throw new Error('Asignatura no encontrada.'); assign(block, source.id); }
      else { if (!editable(source.date)) throw new Error('Este día no está en edición.'); swapAssignments(getBlock(c, source.date, source.id).block, block); }
    }, 'Clase colocada.');
  } catch (e) { toast(e.message, true); }
}
document.addEventListener('dragstart', e => {
  const el = e.target.closest('[draggable=true]'); if (!el) return;
  dragSource = sourceFrom(el); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'mi-horario');
});
document.addEventListener('dragover', e => { const el = e.target.closest('.lesson'); if (dragSource && el && editable(el.dataset.date)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; el.classList.add('drop-target'); } });
document.addEventListener('dragleave', e => e.target.closest('.lesson')?.classList.remove('drop-target'));
document.addEventListener('drop', e => { if (!dragSource) return; e.preventDefault(); drop(dragSource, e.target.closest('.lesson')); dragSource = null; document.querySelectorAll('.drop-target').forEach(x => x.classList.remove('drop-target')); });
document.addEventListener('dragend', () => { dragSource = null; document.querySelectorAll('.drop-target').forEach(x => x.classList.remove('drop-target')); });
document.addEventListener('pointerdown', e => {
  const handle = e.target.closest('.drag-handle'); if (!handle || e.pointerType === 'mouse') return;
  const el = handle.closest('[draggable=true]'); if (!el) return;
  e.preventDefault(); handle.setPointerCapture(e.pointerId); pointerDrag = { source: sourceFrom(el), x: e.clientX, y: e.clientY, moved: false, handle, pointerId: e.pointerId };
});
document.addEventListener('pointermove', e => {
  if (!pointerDrag) return; e.preventDefault();
  if (Math.hypot(e.clientX - pointerDrag.x, e.clientY - pointerDrag.y) > 7) pointerDrag.moved = true;
  document.querySelectorAll('.drop-target').forEach(x => x.classList.remove('drop-target'));
  const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('.lesson');
  if (el && editable(el.dataset.date)) el.classList.add('drop-target');
}, { passive: false });
document.addEventListener('pointerup', e => {
  if (!pointerDrag) return;
  const current = pointerDrag; pointerDrag = null;
  if (current.moved) { suppressClick = true; drop(current.source, document.elementFromPoint(e.clientX, e.clientY)?.closest('.lesson')); setTimeout(() => { suppressClick = false; }, 400); }
  document.querySelectorAll('.drop-target').forEach(x => x.classList.remove('drop-target'));
});
document.addEventListener('pointercancel', () => { pointerDrag = null; document.querySelectorAll('.drop-target').forEach(x => x.classList.remove('drop-target')); });
$('#theme').onclick = () => persist({ ...state, theme: document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark' }, '', false);
$('#help').onclick = help; $('#privacy').onclick = help;
matchMedia('(prefers-color-scheme:dark)').addEventListener('change', theme);
function connection() { $('#connection').textContent = navigator.onLine ? 'En este dispositivo' : 'Sin conexión · guardado local'; }
window.addEventListener('online', connection); window.addEventListener('offline', connection);
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; $('#install').hidden = false; });
$('#install').onclick = async () => { if (!deferredInstall) return help(); await deferredInstall.prompt(); deferredInstall = null; $('#install').hidden = true; };
window.addEventListener('appinstalled', () => { $('#install').hidden = true; toast('Mi horario ya está instalado.'); });
window.addEventListener('storage', e => {
  if (e.key !== KEY) return;
  if (dialog.open || memoryUnsaved) { notice('Hay cambios en otra pestaña. Exporta tu copia actual antes de recargar para revisar la otra versión.'); return; }
  const fresh = loadState(storage); state = fresh.state; undo = []; render(); toast('Horario actualizado desde otra pestaña.');
});
window.addEventListener('beforeunload', e => { if (memoryUnsaved) { e.preventDefault(); e.returnValue = ''; } });
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(reg => {
    function showUpdate(worker) { waitingWorker = worker; $('#update').hidden = false; }
    if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing; worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate(worker);
        else if (worker.state === 'installed') toast('La aplicación y sus plantillas ya están disponibles sin conexión.');
      });
    });
  }).catch(() => notice('El modo sin conexión no se ha podido preparar. La edición y el guardado local siguen disponibles.'));
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading && waitingWorker) { reloading = true; location.reload(); } });
  $('#apply-update').onclick = () => {
    if (dialog.open || memoryUnsaved) { toast('Termina la edición y guarda o exporta tus datos antes de actualizar.', true); return; }
    waitingWorker?.postMessage({ type: 'ACTIVATE' });
  };
}
setInterval(() => {
  const c = course(); if (!c) return;
  $('#now-card') && ($('#now-card').innerHTML = statusHTML(c));
  const active = statusAt(c);
  document.querySelectorAll('.lesson').forEach(el => el.classList.toggle('current', scope !== 'week' && el.dataset.date === active.date && el.dataset.block === active.current));
}, 15000);
connection(); render(); loadCatalog();

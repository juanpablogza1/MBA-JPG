// Escalera MBA: navegación y vistas.
import { SCHOOLS, HOME, DATA_NOTES } from '../data/schools.js';
import { GUIDE, GUIDE_SOURCES } from '../data/guide.js';
import { state, save, resetAll, importData, liveStreak, dayStats, today } from './store.js';
import { predict, project, fitFor, FIT, mastery, scoreToPercentile } from './engine.js';
import { levelFromXp, todaysMissions, ACHIEVEMENTS, DAILY_GOAL, onToast, award } from './gamify.js';
import * as P from './practice.js';
import { lineChart } from './charts.js';
import { QUANT_TOPICS } from './quant.js';

const view = document.getElementById('view');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fmtDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MES[m - 1]} ${y}`; };
const daysUntil = (iso) => Math.ceil((new Date(iso + 'T23:59:00') - Date.now()) / 86400000);
const r0 = (x) => Math.round(x);
const byId = (id) => SCHOOLS.find((s) => s.id === id);
function km(a, b) {
  const R = 6371; const t = Math.PI / 180;
  const dLat = (b.lat - a.lat) * t; const dLon = (b.lon - a.lon) * t;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}
const nextDeadline = (s) => s.deadlines.find((d) => daysUntil(d.d) >= 0) || null;
const hasData = () => state.responses.length > 0 || state.tests.some((t) => t.kind === 'oficial');

// ------------------------------------------------------------------ tema
function applyTheme() {
  const t = state.profile.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}
const isDark = () => (document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);

// ------------------------------------------------------------------ toast
const toastEl = document.getElementById('toast');
let toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg; toastEl.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3200);
}
onToast(toast);

// ------------------------------------------------------------------ escalera
function sortedByGre() { return [...SCHOOLS].sort((a, b) => b.gre.total - a.gre.total || a.acceptance - b.acceptance); }

function fitChip(f) {
  if (!f) return '<span class="chip fit-none">Sin pronóstico</span>';
  return `<span class="chip fit-${f.cat}"><i aria-hidden="true"></i>${FIT[f.cat].label}</span>`;
}

function ladderHtml(pred, { limit = null, focus = null } = {}) {
  const me = hasData() ? r0(pred.total.score) : null;
  let rows = sortedByGre();
  const items = [];
  let placed = me === null;
  for (const s of rows) {
    if (!placed && me >= s.gre.total) { items.push({ me: true }); placed = true; }
    items.push({ s });
  }
  if (!placed) items.push({ me: true });
  let list = items;
  if (limit) {
    const idx = items.findIndex((x) => x.me);
    const from = Math.max(0, idx - limit); list = items.slice(from, idx + limit + 1);
  }
  return `<ol class="ladder">${list.map((x) => {
    if (x.me) return `<li class="rung me"><span class="r-num">${me}</span><span class="r-name"><strong>Tú</strong><small>${r0(pred.total.lo)} a ${r0(pred.total.hi)}, Verbal ${r0(pred.V.score)}, Quant ${r0(pred.Q.score)}</small></span></li>`;
    const s = x.s; const f = me !== null ? fitFor(s, pred) : null;
    return `<li class="rung ${focus === s.id ? 'focus' : ''}"><a href="#/escuela/${s.id}"><span class="r-num">${s.gre.total}${s.gre.kind === 'estimado' ? '<sup title="estimado">e</sup>' : ''}</span><span class="r-name"><strong>${esc(s.short)}</strong><small>Verbal ${s.gre.v}, Quant ${s.gre.q}, admite ${s.acceptance}%</small></span>${me !== null ? fitChip(f) : ''}</a></li>`;
  }).join('')}</ol>`;
}

// ------------------------------------------------------------------ inicio
function viewHome() {
  const pred = predict();
  const lv = levelFromXp(state.xp);
  const ds = dayStats();
  const streak = liveStreak();
  const missions = todaysMissions();
  const wrongN = Object.keys(state.wrong).length;
  const vs = P.vocabStats();
  const goalPct = Math.min(1, ds.xp / DAILY_GOAL);
  const C = 2 * Math.PI * 22;
  let hero;
  if (!hasData()) {
    hero = `<section class="hero empty-hero"><h1>¿En qué escalón estás hoy?</h1><p>Haz el diagnóstico: 10 preguntas de Quant y 10 de Verbal, sin tiempo. Con eso la app estima tu GRE y te dice a qué escuelas llega tu puntaje.</p><button class="btn big" data-start="diag">Hacer diagnóstico</button></section>`;
  } else {
    const me = r0(pred.total.score);
    const asc = [...SCHOOLS].sort((a, b) => a.gre.total - b.gre.total);
    const above = asc.find((s) => s.gre.total > me);
    const target = byId(state.profile.target);
    const gap = above ? above.gre.total - me : 0;
    hero = `<section class="hero"><div class="hero-score"><span class="hs-label">Tu GRE pronosticado</span><span class="hs-num">${me}</span><span class="hs-range">${r0(pred.total.lo)} a ${r0(pred.total.hi)}${pred.enough ? '' : ', provisional'}</span><span class="hs-split">Verbal ${r0(pred.V.score)} y Quant ${r0(pred.Q.score)}</span></div><div class="hero-next">${above ? `<p class="next-line">Siguiente escalón</p><p class="next-school"><a href="#/escuela/${above.id}">${esc(above.short)}</a> <span>${above.gre.total}</span></p><p class="next-gap">Te ${gap === 1 ? 'falta 1 punto' : `faltan ${gap} puntos`}</p>` : '<p class="next-school">Estás por encima de todas las medianas de la lista.</p>'}${target ? `<p class="target-line">Tu meta, ${esc(target.short)}: ${target.gre.total}${me >= target.gre.total ? ', ya la alcanzas' : `, te faltan ${target.gre.total - me}`}</p>` : '<p class="target-line"><a href="#/escuelas">Elige tu escuela meta</a></p>'}</div>${ladderHtml(pred, { limit: 2 })}</section>`;
  }
  const missionsHtml = missions.map((m) => `<li class="${m.done ? 'done' : ''}"><span class="check" aria-hidden="true">${m.done ? '✓' : ''}</span><span>${esc(m.text)}</span><span class="count">${m.have}/${m.goal}</span></li>`).join('');
  const earned = ACHIEVEMENTS.filter((a) => state.achievements[a.id]);
  view.innerHTML = `
  ${hero}
  <section class="status">
    <div class="ring" role="img" aria-label="Meta diaria: ${ds.xp} de ${DAILY_GOAL} XP"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="22" class="ring-bg"/><circle cx="26" cy="26" r="22" class="ring-fg" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - goalPct)}"/></svg><span>${Math.min(ds.xp, 999)}</span></div>
    <div class="st-text"><p><strong>Nivel ${lv.lvl}: ${esc(lv.name)}</strong></p><div class="bar" aria-hidden="true"><i style="width:${r0(lv.progress * 100)}%"></i></div><p class="meta">${state.xp} XP en total. Meta de hoy: ${DAILY_GOAL} XP. ${streak ? `Racha: ${streak} ${streak === 1 ? 'día' : 'días'}.` : 'Empieza tu racha hoy.'}</p></div>
  </section>
  <section class="block"><h2>Misiones de hoy</h2><ul class="missions">${missionsHtml}</ul></section>
  <section class="block"><h2>Práctica rápida</h2><p class="sub">10 preguntas que suben o bajan de dificultad según aciertes. Retroalimentación inmediata.</p>
    <div class="modes">
      <button class="mode" data-start="sprint" data-sec="Q"><strong>Sprint Quant</strong><span>Aritmética, álgebra, geometría, datos</span></button>
      <button class="mode" data-start="sprint" data-sec="V"><strong>Sprint Verbal</strong><span>Completar textos, equivalencias, lectura</span></button>
      <button class="mode" data-start="sprint" data-sec="M"><strong>Sprint mixto</strong><span>Alterna Quant y Verbal</span></button>
      <a class="mode" href="#/temas"><strong>Por tema</strong><span>Ataca tu punto débil</span></a>
    </div></section>
  <section class="block"><h2>Como el examen</h2><p class="sub">Con reloj, sin retroalimentación hasta el final, con calculadora en Quant.</p>
    <div class="modes">
      <button class="mode" data-start="section" data-sec="Q"><strong>Sección Quant</strong><span>12 preguntas, 21 minutos</span></button>
      <button class="mode" data-start="section" data-sec="V"><strong>Sección Verbal</strong><span>12 preguntas, 18 minutos</span></button>
      <button class="mode wide" data-start="mock"><strong>Simulacro completo</strong><span>Verbal y Quant adaptativos por sección, 1 h 28 min</span></button>
      <button class="mode wide" data-start="mock" data-essay="1"><strong>Simulacro con ensayo</strong><span>Agrega Analytical Writing, 1 h 58 min como el real</span></button>
    </div></section>
  <section class="block"><h2>Refuerzo</h2>
    <div class="modes">
      <button class="mode" data-start="review" ${wrongN ? '' : 'disabled'}><strong>Repaso de errores</strong><span>${wrongN ? `${wrongN} pendientes` : 'Sin errores pendientes'}</span></button>
      <button class="mode" data-start="vocab" data-kind="cards"><strong>Vocabulario</strong><span>${vs.due ? `${vs.due} por repasar` : `${vs.fresh} nuevas`}, ${vs.learned} dominadas</span></button>
      <button class="mode" data-start="vocab" data-kind="quiz"><strong>Quiz de vocabulario</strong><span>10 palabras, elige el significado</span></button>
      <button class="mode" data-start="essay"><strong>Ensayo Issue</strong><span>30 minutos y autoevaluación</span></button>
    </div></section>
  <section class="block"><h2>Logros <span class="count">${earned.length} de ${ACHIEVEMENTS.length}</span></h2><ul class="badges">${ACHIEVEMENTS.map((a) => `<li class="${state.achievements[a.id] ? 'got' : ''}" title="${esc(a.desc)}"><strong>${esc(a.name)}</strong><span>${esc(a.desc)}</span></li>`).join('')}</ul></section>`;
}

function viewTopics() {
  const btn = (sec, t) => `<button class="mode" data-start="topic" data-sec="${sec}" data-topic="${esc(t)}"><strong>${esc(t)}</strong></button>`;
  const m = mastery();
  const weak = m.filter((x) => x.n >= 4).slice(0, 3);
  view.innerHTML = `<section class="block"><h1>Practicar por tema</h1>${weak.length ? `<p class="sub">Tus temas más débiles (últimos 60 días): ${weak.map((w) => `${esc(w.topic)} ${r0(w.acc * 100)}%`).join(', ')}.</p>` : '<p class="sub">Elige un tema. Cada sesión son 10 preguntas adaptativas.</p>'}<h2>Quant</h2><div class="modes">${QUANT_TOPICS.map((t) => btn('Q', t)).join('')}</div><h2>Verbal</h2><div class="modes">${P.VERBAL_TOPICS.map((t) => btn('V', t)).join('')}</div></section>`;
}

// ------------------------------------------------------------------ pronóstico
function viewForecast() {
  const pred = predict();
  const pr = state.profile;
  const proj = project(pred, pr.hoursPerWeek, pr.testDate);
  const m = mastery();
  const data = hasData();
  const conf = { provisional: 'Provisional: necesito al menos 15 respuestas por sección', alta: 'Precisión alta', media: 'Precisión media', baja: 'Precisión baja: sigue practicando' }[pred.level];
  const officials = state.tests.filter((t) => t.kind === 'oficial').slice(-5).reverse();
  const mocks = state.tests.filter((t) => t.kind === 'simulacro').slice(-5).reverse();
  const groups = ['alcanzable', 'objetivo', 'reto'].map((cat) => ({ cat, list: SCHOOLS.map((s) => ({ s, f: fitFor(s, pred) })).filter((x) => x.f.cat === cat).sort((a, b) => b.s.gre.total - a.s.gre.total) }));
  view.innerHTML = `
  <section class="block forecast">
    <h1>Pronóstico</h1>
    ${data ? '' : '<p class="notice">Aún no hay respuestas: los números de abajo son el promedio de todos los que presentan el GRE. <button class="link" data-start="diag">Haz el diagnóstico</button> para ver los tuyos.</p>'}
    <div class="scoreboard">
      <div class="sb-total"><span class="sb-label">Total</span><span class="sb-num">${r0(pred.total.score)}</span><span class="sb-range">${r0(pred.total.lo)} a ${r0(pred.total.hi)}</span></div>
      <div class="sb-sec"><span class="sb-label">Verbal</span><span class="sb-num">${r0(pred.V.score)}</span><span class="sb-range">${r0(pred.V.lo)} a ${r0(pred.V.hi)}, percentil ${scoreToPercentile(pred.V.score, 'V')}</span></div>
      <div class="sb-sec"><span class="sb-label">Quant</span><span class="sb-num">${r0(pred.Q.score)}</span><span class="sb-range">${r0(pred.Q.lo)} a ${r0(pred.Q.hi)}, percentil ${scoreToPercentile(pred.Q.score, 'Q')}</span></div>
    </div>
    <p class="meta">${conf}. Basado en ${pred.V.n} respuestas de Verbal y ${pred.Q.n} de Quant${officials.length ? ' y tus simulacros oficiales registrados' : ''}. El rango es un intervalo del 80%. Es una estimación orientativa: las preguntas de la app son originales y su dificultad es aproximada; calibra con POWERPREP de ETS.</p>
  </section>
  <section class="block"><h2>Proyección al día del examen</h2>
    <form class="proj-form" data-form="proj"><label>Fecha del examen<input type="date" name="testDate" value="${esc(pr.testDate)}"></label><label>Horas de estudio por semana<input type="number" min="0" max="60" step="1" name="hours" value="${esc(pr.hoursPerWeek)}"></label><button class="btn small" type="submit">Actualizar</button></form>
    ${proj ? `<p class="proj">${proj.weeks < 0.5 ? 'Tu fecha de examen ya pasó o es esta semana.' : `En ${r0(proj.weeks)} semanas, con unas ${r0(proj.hours)} horas en total, podrías llegar a <strong>${r0(proj.total)}</strong> (Verbal ${r0(proj.v)}, Quant ${r0(proj.q)}).`}</p><p class="meta">Regla práctica: unas 40 horas de estudio de calidad por cada 5 puntos totales, con menos ganancia cerca de 340 (PrepScholar).</p>` : '<p class="meta">Pon tu fecha de examen para calcular cuánto puedes subir.</p>'}
  </section>
  <section class="block"><h2>¿A qué escuelas llega tu GRE?</h2>
    <p class="sub">El número junto a cada escuela es tu diferencia contra su GRE típico (mediana o promedio publicado). Las de admisión menor al 15% bajan un nivel. El GRE es una parte de la solicitud: ensayos, experiencia y recomendaciones deciden el resto.</p>
    <div class="fit-groups">${groups.map((g) => `<div class="fit-group"><h3>${fitChip({ cat: g.cat })} <span class="meta">${FIT[g.cat].desc}</span></h3>${g.list.length ? `<ul>${g.list.map(({ s, f }) => `<li><a href="#/escuela/${s.id}" title="GRE típico ${s.gre.total}">${esc(s.short)} <span class="delta ${f.delta >= 0 ? 'pos' : 'neg'}">${f.delta >= 0 ? '+' : '−'}${Math.abs(f.delta)}</span>${f.quantGap ? ' <span class="warn-q">Quant bajo</span>' : ''}</a></li>`).join('')}</ul>` : '<p class="meta">Ninguna por ahora.</p>'}</div>`).join('')}</div>
  </section>
  <section class="block"><h2>La escalera completa</h2><p class="sub">Todas las escuelas ordenadas por su GRE típico. Tu lugar se mueve cada vez que practicas.</p>${ladderHtml(pred)}</section>
  <section class="block"><h2>Tendencia</h2><div class="chart" data-chart></div>
    <details class="table-view"><summary>Ver como tabla</summary><table class="gtable"><thead><tr><th>Día</th><th>Verbal</th><th>Quant</th><th>Total</th></tr></thead><tbody>${state.history.slice(-30).reverse().map((h) => `<tr><td>${fmtDate(h.day)}</td><td>${h.v}</td><td>${h.q}</td><td>${h.v + h.q}</td></tr>`).join('') || '<tr><td colspan="4">Sin datos todavía</td></tr>'}</tbody></table></details>
  </section>
  <section class="block"><h2>Dominio por tema</h2><p class="sub">Porcentaje de aciertos en los últimos 60 días. Los temas con menos aciertos aparecen primero.</p>
    ${m.length ? `<table class="mastery"><thead><tr><th>Tema</th><th>Aciertos</th><th>Preguntas</th></tr></thead><tbody>${m.map((x) => `<tr><td>${esc(x.topic)} <small>${x.sec === 'Q' ? 'Quant' : 'Verbal'}</small></td><td><span class="mbar"><i style="width:${r0(x.acc * 100)}%"></i></span>${r0(x.acc * 100)}%</td><td>${x.n}</td></tr>`).join('')}</tbody></table>` : '<p class="meta">Aparecerá cuando respondas preguntas.</p>'}
  </section>
  <section class="block"><h2>Registrar un examen oficial de práctica</h2><p class="sub">Si haces un POWERPREP de ETS, regístralo: pesa más que la práctica de la app y ancla tu pronóstico.</p>
    <form class="off-form" data-form="official"><label>Verbal<input type="number" name="v" min="130" max="170" required></label><label>Quant<input type="number" name="q" min="130" max="170" required></label><label>Writing<input type="number" name="awa" min="0" max="6" step="0.5"></label><button class="btn small" type="submit">Guardar</button></form>
    ${officials.length || mocks.length ? `<ul class="tests">${[...officials.map((t) => ({ ...t, l: 'POWERPREP' })), ...mocks.map((t) => ({ ...t, l: 'Simulacro de la app' }))].sort((a, b) => b.ts - a.ts).map((t) => `<li><span>${new Date(t.ts).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span><span>${t.l}</span><strong>${t.v ?? '—'} + ${t.q ?? '—'}${t.v && t.q ? ` = ${t.v + t.q}` : ''}</strong>${t.awa != null ? `<span>Writing ${t.awa}</span>` : ''}</li>`).join('')}</ul>` : ''}
  </section>`;
  requestAnimationFrame(() => {
    const el = view.querySelector('[data-chart]');
    if (el) lineChart(el, state.history.slice(-60), { series: [{ key: 'v', name: 'Verbal', color: '--series-1' }, { key: 'q', name: 'Quant', color: '--series-2' }], yMin: 130, yMax: 170, label: (r) => { const [, mo, d] = r.day.split('-').map(Number); return `${d} ${MES[mo - 1]}`; } });
  });
}

// ------------------------------------------------------------------ mapa
let map = null;
function viewMap() {
  const pred = predict();
  view.innerHTML = `<section class="map-wrap"><div class="map-bar"><div class="chips" role="group" aria-label="Filtrar escuelas">${['Todas', 'Ivy League', 'M7', 'Texas', 'Favoritas'].map((c, i) => `<button class="chip-btn ${i === 0 ? 'on' : ''}" data-mf="${c}">${c}</button>`).join('')}</div><div class="legend">${['alcanzable', 'objetivo', 'reto'].map((c) => fitChip({ cat: c })).join('')}${hasData() ? '' : '<span class="meta">Haz el diagnóstico para colorear por ajuste</span>'}</div></div><div id="map" aria-label="Mapa de escuelas"></div><p class="map-off" hidden>El mapa necesita internet para cargar. La lista de escuelas funciona sin conexión.</p></section>`;
  if (typeof L === 'undefined') { view.querySelector('.map-off').hidden = false; return; }
  if (map) { map.remove(); map = null; }
  map = L.map('map', { zoomControl: true, attributionControl: true }).setView([37, -92], 4);
  const dark = isDark();
  const tiles = L.tileLayer(`https://{s}.basemaps.cartocdn.com/${dark ? 'dark_all' : 'light_all'}/{z}/{x}/{y}{r}.png`, { maxZoom: 18, subdomains: 'abcd', attribution: '&copy; OpenStreetMap contributors &copy; CARTO' }).addTo(map);
  tiles.on('tileerror', () => { view.querySelector('.map-off').hidden = false; });
  const layer = L.layerGroup().addTo(map);
  L.circleMarker([HOME.lat, HOME.lon], { radius: 6, className: 'mk home' }).addTo(map).bindTooltip('Monterrey', { permanent: false });
  const draw = (filter) => {
    layer.clearLayers();
    const shown = SCHOOLS.filter((s) => filter === 'Todas' || (filter === 'Ivy League' && s.ivy) || (filter === 'M7' && s.tier === 'M7') || (filter === 'Texas' && s.texas) || (filter === 'Favoritas' && state.profile.favorites.includes(s.id)));
    const pts = [];
    for (const s of shown) {
      const f = hasData() ? fitFor(s, pred) : null;
      const mk = L.circleMarker([s.lat, s.lon], { radius: 9, className: `mk fit-${f ? f.cat : 'none'}` });
      const nd = nextDeadline(s);
      mk.bindPopup(`<div class="pop"><strong>${esc(s.short)}</strong><span>${esc(s.city)}, ${s.state}</span><span>GRE típico ${s.gre.total}${s.gre.kind === 'estimado' ? ' (estimado)' : ''}, admite ${s.acceptance}%</span>${f ? `<span>Tu ajuste: ${FIT[f.cat].label} (${f.delta >= 0 ? '+' : '−'}${Math.abs(f.delta)})</span>` : ''}<span>${esc(s.stands.split('. ')[0])}.</span>${nd ? `<span>Próxima fecha: ${esc(nd.r)}, ${fmtDate(nd.d)}</span>` : ''}<a href="#/escuela/${s.id}">Ver ficha completa</a></div>`, { maxWidth: 260 });
      mk.bindTooltip(s.short, { direction: 'top', offset: [0, -8] });
      mk.addTo(layer); pts.push([s.lat, s.lon]);
    }
    if (pts.length) map.fitBounds(L.latLngBounds([...pts, [HOME.lat, HOME.lon]]).pad(0.15), { maxZoom: 7 });
  };
  draw('Todas');
  view.querySelectorAll('[data-mf]').forEach((b) => b.addEventListener('click', () => {
    view.querySelectorAll('[data-mf]').forEach((x) => x.classList.toggle('on', x === b));
    draw(b.dataset.mf);
  }));
  setTimeout(() => map && map.invalidateSize(), 60);
}

// ------------------------------------------------------------------ escuelas
const listState = { q: '', f: 'Todas', sort: 'gre' };
function viewSchools() {
  const pred = predict();
  const data = hasData();
  const filters = ['Todas', 'Ivy League', 'M7', 'Top 15', 'Texas', 'Favoritas'];
  const sorters = { gre: 'GRE más alto', acc: 'Más selectiva', dist: 'Más cerca de Monterrey', usn: 'Ranking U.S. News', fit: 'Mejor ajuste a tu GRE' };
  let list = SCHOOLS.filter((s) => {
    const f = listState.f;
    if (f === 'Ivy League' && !s.ivy) return false;
    if (f === 'M7' && s.tier !== 'M7') return false;
    if (f === 'Top 15' && !(s.tier === 'M7' || s.tier === 'T15')) return false;
    if (f === 'Texas' && !s.texas) return false;
    if (f === 'Favoritas' && !state.profile.favorites.includes(s.id)) return false;
    if (listState.q) { const t = `${s.name} ${s.short} ${s.univ} ${s.city} ${s.state} ${s.tags.join(' ')}`.toLowerCase(); if (!t.includes(listState.q.toLowerCase())) return false; }
    return true;
  });
  const sorts = {
    gre: (a, b) => b.gre.total - a.gre.total,
    acc: (a, b) => a.acceptance - b.acceptance,
    dist: (a, b) => km(HOME, a) - km(HOME, b),
    usn: (a, b) => (a.usn || 99) - (b.usn || 99),
    fit: (a, b) => (r0(pred.total.score) - b.gre.total) - (r0(pred.total.score) - a.gre.total),
  };
  list = list.sort(sorts[listState.sort]);
  view.innerHTML = `<section class="block"><h1>Escuelas</h1><p class="sub">${SCHOOLS.length} programas MBA de tiempo completo. Toca una para ver todo: historia, perfil, requisitos y fechas.</p>
  <div class="list-tools"><input type="search" placeholder="Buscar escuela, ciudad o tema" value="${esc(listState.q)}" data-q aria-label="Buscar"><select data-sort aria-label="Ordenar">${Object.entries(sorters).map(([k, v]) => `<option value="${k}" ${listState.sort === k ? 'selected' : ''} ${k === 'fit' && !data ? 'disabled' : ''}>${v}</option>`).join('')}</select></div>
  <div class="chips" role="group" aria-label="Filtrar">${filters.map((f) => `<button class="chip-btn ${listState.f === f ? 'on' : ''}" data-f="${f}">${f}</button>`).join('')}</div>
  <ul class="school-list">${list.map((s) => {
    const nd = nextDeadline(s); const f = data ? fitFor(s, pred) : null; const fav = state.profile.favorites.includes(s.id);
    return `<li><a href="#/escuela/${s.id}" class="srow"><span class="s-gre"><strong>${s.gre.total}</strong><small>GRE${s.gre.kind === 'estimado' ? ' est.' : ''}</small></span><span class="s-main"><strong>${esc(s.short)}</strong><small>${esc(s.city)}, ${s.state}${s.ivy ? ', Ivy League' : ''}</small><small>Admite ${s.acceptance}%${nd ? `. ${esc(nd.r)}: ${fmtDate(nd.d)}` : '. Ciclo 2026-27 cerrado'}</small></span>${f ? fitChip(f) : ''}</a><button class="star ${fav ? 'on' : ''}" data-fav="${s.id}" aria-pressed="${fav}" aria-label="${fav ? 'Quitar de favoritas' : 'Agregar a favoritas'}">${fav ? '★' : '☆'}</button></li>`;
  }).join('') || '<li class="meta">Ninguna escuela coincide con la búsqueda.</li>'}</ul>
  <p class="meta">${esc(DATA_NOTES.cycle)}. ${esc(DATA_NOTES.nextCycle)}</p></section>`;
  const q = view.querySelector('[data-q]');
  q.addEventListener('input', () => { listState.q = q.value; const pos = q.selectionStart; viewSchools(); const nq = view.querySelector('[data-q]'); nq.focus(); nq.setSelectionRange(pos, pos); });
  view.querySelector('[data-sort]').addEventListener('change', (e) => { listState.sort = e.target.value; viewSchools(); });
  view.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { listState.f = b.dataset.f; viewSchools(); }));
}

function toggleFav(id) {
  const fv = state.profile.favorites;
  state.profile.favorites = fv.includes(id) ? fv.filter((x) => x !== id) : [...fv, id];
  save();
}

function viewSchool(id) {
  const s = byId(id);
  if (!s) { view.innerHTML = '<section class="block"><p>No encontré esa escuela.</p><a href="#/escuelas">Volver a Escuelas</a></section>'; return; }
  const pred = predict(); const data = hasData();
  const f = data ? fitFor(s, pred) : null;
  const fav = state.profile.favorites.includes(s.id);
  const isTarget = state.profile.target === s.id;
  const stat = (label, val) => (val === null || val === undefined || val === '' ? '' : `<div><span>${label}</span><strong>${val}</strong></div>`);
  const range = (r) => (r ? `${r[0]} a ${r[1]}` : null);
  const me = data ? r0(pred.total.score) : null;
  const dl = s.deadlines.map((d) => { const n = daysUntil(d.d); return `<li class="${n < 0 ? 'past' : ''}"><span class="dl-r">${esc(d.r)}</span><span class="dl-d">${fmtDate(d.d)}</span><span class="dl-s">${n < 0 ? 'Cerrada' : n === 0 ? 'Hoy' : `Faltan ${n} días`}</span>${d.dec ? `<span class="dl-x">Decisión: ${/^\d{4}/.test(d.dec) ? fmtDate(d.dec) : esc(d.dec)}</span>` : ''}${d.note ? `<span class="dl-x">${esc(d.note)}</span>` : ''}</li>`; }).join('');
  view.innerHTML = `<article class="school">
    <a class="back" href="#/escuelas">Escuelas</a>
    <header class="sch-head"><h1>${esc(s.name)}</h1><p>${esc(s.univ)}, ${esc(s.city)}, ${s.state}. A ${km(HOME, s).toLocaleString('es-MX')} km de Monterrey.</p><div class="sch-actions"><button class="ghost small ${fav ? 'on' : ''}" data-fav="${s.id}" aria-pressed="${fav}">${fav ? '★ Favorita' : '☆ Agregar a favoritas'}</button><button class="ghost small ${isTarget ? 'on' : ''}" data-target="${s.id}" aria-pressed="${isTarget}">${isTarget ? 'Es tu escuela meta' : 'Hacerla mi meta'}</button><a class="btn small" href="${s.web}" target="_blank" rel="noopener">Sitio oficial</a></div></header>
    <section class="sch-gre"><div class="big-gre"><span>GRE típico</span><strong>${s.gre.total}</strong><small>${s.gre.kind === 'estimado' ? 'Estimado' : s.gre.kind === 'mediana' ? 'Mediana' : 'Promedio'}, ${esc(s.gre.cls)}</small></div><div class="gre-split">${stat('Verbal', s.gre.v)}${stat('Quant', s.gre.q)}${stat('Verbal 10-90%', range(s.gre.rv))}${stat('Quant 10-90%', range(s.gre.rq))}${stat('Alumnos con GRE', s.gre.share ? `${s.gre.share}%` : null)}</div>
    ${f ? `<p class="you-vs">Tu pronóstico, ${me}: ${f.delta >= 0 ? `${f.delta} ${f.delta === 1 ? 'punto' : 'puntos'} arriba` : `${Math.abs(f.delta)} ${Math.abs(f.delta) === 1 ? 'punto' : 'puntos'} abajo`} de su GRE típico. ${fitChip(f)}${f.quantGap ? ' Tu Quant está más de 4 puntos debajo del suyo: refuérzalo.' : ''}</p>` : '<p class="you-vs">Haz el diagnóstico para compararte con esta escuela.</p>'}
    ${s.gre.note ? `<p class="meta">${esc(s.gre.note)}</p>` : ''}</section>
    <section class="stats-grid">${stat('Tasa de admisión', `${s.acceptance}%`)}${stat('Tamaño de clase', s.classSize ? s.classSize.toLocaleString('es-MX') : null)}${stat('Internacionales', s.intl ? `${s.intl}%` : null)}${stat('Mujeres', s.women ? `${s.women}%` : null)}${stat('Experiencia promedio', s.work ? `${s.work} años` : null)}${stat('Edad promedio', s.age ? `${s.age} años` : null)}${stat('GPA', s.gpa)}${stat('GMAT', s.gmat ? esc(s.gmat) : null)}${stat('Ranking U.S. News 2026', s.usn ? `#${s.usn}` : null)}${stat('Duración', esc(s.length))}${stat('Cartas de recomendación', s.lors)}${stat('Fundada', s.founded)}</section>
    <section class="prose"><h2>Por qué destaca en MBA</h2><p>${esc(s.stands)}</p><div class="tags">${s.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div></section>
    <section class="prose"><h2>Historia</h2><p>${esc(s.history)}</p></section>
    <section class="prose"><h2>Quién entra</h2><p>${esc(s.students)}</p></section>
    <section class="prose"><h2>Requisitos de admisión</h2><ul>${s.reqs.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></section>
    <section class="prose"><h2>Fechas de aplicación</h2><p class="meta">${esc(DATA_NOTES.cycle)}.${s.roundsNote ? ` ${esc(s.roundsNote)}` : ''}</p><ol class="deadlines">${dl}</ol><p class="meta">${esc(DATA_NOTES.nextCycle)}</p></section>
    <p class="meta">Datos de class profile, Poets&amp;Quants, U.S. News, Clear Admit, GMAT Club y sitios de las escuelas. Verifica siempre en el sitio oficial antes de aplicar.</p>
  </article>`;
}

// ------------------------------------------------------------------ guía
function viewGuide() {
  view.innerHTML = `<section class="block guide"><h1>Guía</h1><p class="sub">Todo lo que necesitas decidir y estudiar, en orden. Toca un tema para abrirlo.</p>${GUIDE.map((g, i) => `<details ${i === 0 ? 'open' : ''} id="g-${g.id}"><summary>${esc(g.title)}</summary><div class="gbody">${g.html}</div></details>`).join('')}<details><summary>Fuentes</summary><div class="gbody"><ul class="sources">${[...GUIDE_SOURCES, ...DATA_NOTES.sources].map(([t, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('')}</ul></div></details></section>`;
}

// ------------------------------------------------------------------ ajustes
function viewSettings() {
  const pr = state.profile;
  view.innerHTML = `<section class="block"><h1>Ajustes</h1>
  <form class="settings" data-form="settings">
    <label>Tu nombre<input name="name" value="${esc(pr.name)}"></label>
    <label>Fecha del examen<input type="date" name="testDate" value="${esc(pr.testDate)}"></label>
    <label>Horas de estudio por semana<input type="number" name="hours" min="0" max="60" value="${esc(pr.hoursPerWeek)}"></label>
    <label>Escuela meta<select name="target"><option value="">Sin elegir</option>${[...SCHOOLS].sort((a, b) => a.short.localeCompare(b.short)).map((s) => `<option value="${s.id}" ${pr.target === s.id ? 'selected' : ''}>${esc(s.short)}</option>`).join('')}</select></label>
    <label>Tema visual<select name="theme"><option value="auto" ${pr.theme === 'auto' ? 'selected' : ''}>Automático</option><option value="light" ${pr.theme === 'light' ? 'selected' : ''}>Claro</option><option value="dark" ${pr.theme === 'dark' ? 'selected' : ''}>Oscuro</option></select></label>
    <button class="btn" type="submit">Guardar</button>
  </form></section>
  <section class="block"><h2>Tus datos</h2><p class="sub">Tu progreso vive en este navegador. Descarga un respaldo para pasarlo a otro dispositivo.</p>
  <div class="data-actions"><button class="ghost" data-act="export">Descargar respaldo</button><label class="ghost file">Cargar respaldo<input type="file" accept="application/json" data-import hidden></label><button class="ghost danger" data-act="reset">Borrar todo</button></div>
  <div class="confirm-reset" hidden><p>Se borrarán respuestas, XP, vocabulario y ensayos. No se puede deshacer.</p><button class="btn danger" data-act="reset-yes">Borrar todo</button><button class="ghost" data-act="reset-no">Cancelar</button></div>
  <p class="meta">${state.responses.length} respuestas, ${state.essays.length} ensayos, ${Object.keys(state.vocab).length} palabras vistas.</p></section>`;
}

// ------------------------------------------------------------------ eventos globales
view.addEventListener('click', (e) => {
  const st = e.target.closest('[data-start]');
  if (st) {
    const cfg = { mode: st.dataset.start, sec: st.dataset.sec, topic: st.dataset.topic || null, kind: st.dataset.kind, essay: !!st.dataset.essay };
    const titles = { sprint: { Q: 'Sprint Quant', V: 'Sprint Verbal', M: 'Sprint mixto' }, review: 'Repaso de errores', topic: cfg.topic };
    cfg.title = cfg.mode === 'sprint' ? titles.sprint[cfg.sec] : titles[cfg.mode];
    if (!P.start(cfg)) { toast(cfg.mode === 'review' ? 'No tienes errores pendientes. Buena señal.' : 'No pude armar la sesión.'); return; }
    location.hash = '#/practicar';
    return;
  }
  const fav = e.target.closest('[data-fav]');
  if (fav) { e.preventDefault(); toggleFav(fav.dataset.fav); route(); return; }
  const tg = e.target.closest('[data-target]');
  if (tg) { state.profile.target = state.profile.target === tg.dataset.target ? '' : tg.dataset.target; save(); route(); return; }
  const act = e.target.closest('[data-act]');
  if (act && act.dataset.act === 'export') {
    const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `escalera-mba-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  if (act && act.dataset.act === 'reset') view.querySelector('.confirm-reset').hidden = false;
  if (act && act.dataset.act === 'reset-no') view.querySelector('.confirm-reset').hidden = true;
  if (act && act.dataset.act === 'reset-yes') { resetAll(); applyTheme(); toast('Datos borrados.'); location.hash = '#/'; }
});

view.addEventListener('change', (e) => {
  if (e.target.matches('[data-import]')) {
    const file = e.target.files[0]; if (!file) return;
    file.text().then((txt) => { importData(JSON.parse(txt)); applyTheme(); toast('Respaldo cargado.'); route(); }).catch((err) => toast(err.message || 'No pude leer el archivo.'));
  }
});

view.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-form]'); if (!f) return;
  e.preventDefault();
  const fd = new FormData(f);
  const kind = f.dataset.form;
  if (kind === 'proj' || kind === 'settings') {
    state.profile.testDate = fd.get('testDate') || '';
    state.profile.hoursPerWeek = Math.max(0, Number(fd.get('hours')) || 0);
    if (kind === 'settings') { state.profile.name = fd.get('name') || ''; state.profile.target = fd.get('target') || ''; state.profile.theme = fd.get('theme'); applyTheme(); }
    save(); toast('Guardado.'); route();
  }
  if (kind === 'official') {
    const v = Number(fd.get('v')); const q = Number(fd.get('q')); const awa = fd.get('awa') === '' ? null : Number(fd.get('awa'));
    state.tests.push({ ts: Date.now(), kind: 'oficial', v, q, awa });
    award(30, {});
    const p = predict();
    const day = today();
    const row = { day, ts: Date.now(), v: r0(p.V.score), q: r0(p.Q.score) };
    const last = state.history[state.history.length - 1];
    if (last && last.day === day) state.history[state.history.length - 1] = row; else state.history.push(row);
    save(); toast('Examen oficial registrado.'); route();
  }
});

// ------------------------------------------------------------------ router
const TABS = { '': 'home', temas: 'home', pronostico: 'forecast', mapa: 'map', escuelas: 'schools', escuela: 'schools', guia: 'guide', ajustes: 'settings' };
function route() {
  const [, path = '', arg] = (location.hash || '#/').split('/');
  document.body.classList.toggle('running', path === 'practicar');
  if (path !== 'mapa' && map) { map.remove(); map = null; }
  document.querySelectorAll('.tabs a').forEach((a) => a.classList.toggle('on', a.dataset.tab === TABS[path]));
  if (path === 'practicar') { if (!P.active()) { location.hash = '#/'; return; } P.mount(view, () => { location.hash = '#/'; }); window.scrollTo(0, 0); return; }
  if (P.active() && path !== 'practicar') P.quit();
  view.onclick = null; view.onkeydown = null;
  if (path === '') viewHome();
  else if (path === 'temas') viewTopics();
  else if (path === 'pronostico') viewForecast();
  else if (path === 'mapa') viewMap();
  else if (path === 'escuelas') viewSchools();
  else if (path === 'escuela') viewSchool(arg);
  else if (path === 'guia') viewGuide();
  else if (path === 'ajustes') viewSettings();
  else viewHome();
  if (path !== 'escuelas') window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
applyTheme();
route();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

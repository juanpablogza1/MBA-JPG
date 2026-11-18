// Motor de sesiones: sprints adaptativos, secciones cronometradas, simulacro,
// repaso de errores, vocabulario y ensayo Issue.

import { VERBAL, PASSAGES } from '../data/verbal.js';
import { VOCAB } from '../data/vocab.js';
import { ISSUES, ISSUE_TASK, RUBRIC } from '../data/issues.js';
import { randomQuant, regenerate } from './quant.js';
import { state, save, today } from './store.js';
import { guessRate, predict, scoreSet } from './engine.js';
import { award, xpForAnswer, checkAchievements } from './gamify.js';

let S = null;
let root = null;
let exitCb = () => {};
let tick = null;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuffle = (n) => { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const LETTERS = 'ABCDEF';

// ------------------------------------------------------------------ banco
VERBAL.forEach((q) => { q.sec = 'V'; });
export function topicOf(q) {
  if (q.sec === 'Q') return q.topic;
  if (q.type === 'tc') return 'Text Completion';
  if (q.type === 'se') return 'Sentence Equivalence';
  if (q.topic === 'cr') return 'Argumentos';
  return 'Comprensión de lectura';
}
export const VERBAL_TOPICS = ['Text Completion', 'Sentence Equivalence', 'Comprensión de lectura', 'Argumentos'];

function pickVerbal({ topic = null, d = 3, exclude = new Set(), types = null }) {
  const cands = VERBAL.filter((q) => !exclude.has(q.id) && (!topic || topicOf(q) === topic) && (!types || types.includes(q.type)));
  if (!cands.length) return null;
  let best = null; let bestScore = Infinity;
  for (const q of cands) {
    const sc = Math.abs(q.d - d) + 1.6 * (state.seen[q.id] || 0) + Math.random() * 0.9;
    if (sc < bestScore) { bestScore = sc; best = q; }
  }
  return best;
}

function byId(id) {
  if (id.startsWith('g:') || id.startsWith('x:')) return regenerate(id);
  return VERBAL.find((q) => q.id === id) || null;
}

function prep(q) {
  const view = {};
  if (q.type === 'tc') view.orders = q.choices.map((col) => shuffle(col.length));
  else if (q.choices && q.type !== 'qc' && q.sub !== 'select') {
    // En Quant, si todas las opciones son números, van en orden ascendente como en el GRE.
    const vals = q.sec === 'Q' ? q.choices.map(numVal) : [];
    view.order = vals.length && vals.every((v) => v !== null) ? [...vals.keys()].sort((a, b) => vals[a] - vals[b]) : shuffle(q.choices.length);
  }
  return { q, view, a: emptyAnswer(q), t: 0 };
}

function numVal(c) {
  const t = String(c).replace(/[$,%]/g, '').trim();
  const f = t.match(/^(-?\d+(?:\.\d+)?)\/(\d+)$/);
  if (f) return Number(f[1]) / Number(f[2]);
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null;
}

function emptyAnswer(q) {
  if (q.type === 'tc') return q.choices.map(() => null);
  if (q.type === 'multi' || q.type === 'se' || q.sub === 'multi') return [];
  if (q.type === 'numeric') return '';
  return null;
}

function kindOf(q) { return q.type === 'rc' ? q.sub : q.type; }

export function isCorrect(q, a) {
  const k = kindOf(q);
  if (k === 'tc') return a.every((v, i) => v === q.answer[i]);
  if (k === 'multi' || k === 'se') return a.length === q.answer.length && q.answer.every((x) => a.includes(x));
  if (k === 'numeric') {
    const v = parseNum(a);
    if (v === null) return false;
    return Math.abs(v - q.answer.value) < 1e-6 * Math.max(1, Math.abs(q.answer.value));
  }
  return a === q.answer;
}

function parseNum(s) {
  if (typeof s !== 'string') return null;
  const t = s.replace(/,/g, '').trim();
  if (!t) return null;
  if (/^-?\d+(\.\d+)?\/-?\d+(\.\d+)?$/.test(t)) { const [n, d] = t.split('/').map(Number); return d ? n / d : null; }
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}

function answered(q, a) {
  const k = kindOf(q);
  if (k === 'tc') return a.every((v) => v !== null);
  if (k === 'multi') return a.length > 0;
  if (k === 'se') return a.length === 2;
  if (k === 'numeric') return parseNum(a) !== null;
  return a !== null;
}

function gOf(q) {
  const k = kindOf(q);
  if (k === 'tc') return guessRate('tc', 5, q.choices.length);
  if (k === 'select') return guessRate('select', PASSAGES[q.pid].paras.flat().length);
  return guessRate(k, q.choices ? q.choices.length : 5);
}

function startD(sec) {
  const p = predict();
  const s = sec === 'V' ? p.V.score : sec === 'Q' ? p.Q.score : (p.V.score + p.Q.score) / 2;
  if (!p.enough) return 3;
  return s < 148 ? 2 : s < 157 ? 3 : s < 163 ? 4 : 5;
}

// ------------------------------------------------------------- constructores
function nextAdaptive() {
  const sec = S.sec === 'M' ? (S.items.length % 2 === 0 ? 'Q' : 'V') : S.sec;
  const used = new Set(S.items.map((it) => it.q.id));
  let q = null;
  if (S.mode === 'review') {
    const ids = Object.entries(state.wrong).filter(([id]) => !used.has(id)).sort((a, b) => a[1].due - b[1].due).map(([id]) => id);
    for (const id of ids) { q = byId(id); if (q) break; delete state.wrong[id]; }
    if (!q) return null;
  } else if (sec === 'Q') {
    q = randomQuant({ d: S.d, topic: S.topic });
  } else {
    q = pickVerbal({ topic: S.topic, d: S.d, exclude: used });
    if (!q) q = pickVerbal({ topic: S.topic, d: S.d });
  }
  return prep(q);
}

function quantSection(n, dr, exclude = new Set()) {
  const plan = n >= 15 ? { qc: 5, mc: 6, multi: 2, numeric: 2 } : n >= 12 ? { qc: 4, mc: 5, multi: 1, numeric: 2 } : { qc: 3, mc: 4, multi: 1, numeric: 2 };
  const out = [];
  for (const [type, k] of Object.entries(plan)) {
    for (let i = 0; i < k; i++) {
      const d = dr[0] + Math.floor(Math.random() * (dr[1] - dr[0] + 1));
      let q = randomQuant({ d, type });
      let guard = 0;
      while ((exclude.has(q.id) || out.some((o) => o.q.id === q.id)) && guard++ < 10) q = randomQuant({ d, type });
      out.push(prep(q));
    }
  }
  return out;
}

function verbalSection(n, dr, exclude = new Set()) {
  const plan = n >= 15 ? { tc: 5, se: 4, rc: 6 } : n >= 12 ? { tc: 4, se: 3, rc: 5 } : { tc: 3, se: 3, rc: 4 };
  const used = new Set(exclude);
  const mid = (dr[0] + dr[1]) / 2;
  const take = (types) => {
    const q = pickVerbal({ types, d: mid + (Math.random() - 0.5) * (dr[1] - dr[0]), exclude: used });
    if (q) used.add(q.id);
    return q;
  };
  const tcs = []; const ses = [];
  for (let i = 0; i < plan.tc; i++) { const q = take(['tc']); if (q) tcs.push(q); }
  for (let i = 0; i < plan.se; i++) { const q = take(['se']); if (q) ses.push(q); }
  // Lectura: un pasaje completo y argumentos para completar.
  const groups = {};
  VERBAL.filter((q) => q.type === 'rc' && q.topic !== 'cr').forEach((q) => { (groups[q.pid] = groups[q.pid] || []).push(q); });
  const pids = Object.keys(groups).sort((a, b) => {
    const sa = groups[a].reduce((s, q) => s + (state.seen[q.id] || 0), 0) + Math.random();
    const sb = groups[b].reduce((s, q) => s + (state.seen[q.id] || 0), 0) + Math.random();
    return sa - sb;
  });
  const rc = [];
  for (const pid of pids) {
    if (groups[pid].some((q) => used.has(q.id))) continue;
    if (rc.length + groups[pid].length <= plan.rc - 1) { rc.push(...groups[pid]); groups[pid].forEach((q) => used.add(q.id)); }
    if (rc.length >= plan.rc - 2) break;
  }
  const args = [];
  while (rc.length + args.length < plan.rc) { const q = pickVerbal({ types: ['rc'], topic: 'Argumentos', d: mid, exclude: used }); if (!q) break; used.add(q.id); args.push(q); }
  const half = Math.ceil(tcs.length / 2);
  const order = [...tcs.slice(0, half), ...rc, ...ses.slice(0, 2), ...tcs.slice(half), ...args, ...ses.slice(2)];
  return order.map(prep);
}

function sectionPart(sec, n, minutes, dr, title) {
  return { sec, title, minutes, items: sec === 'Q' ? quantSection(n, dr) : verbalSection(n, dr), cur: 0, marked: new Set() };
}

export function start(cfg) {
  clearInterval(tick);
  const base = { ...cfg, xp: 0, streak: 0, correct: 0, done: false, started: Date.now() };
  if (cfg.mode === 'sprint' || cfg.mode === 'topic' || cfg.mode === 'review') {
    const n = cfg.mode === 'review' ? Math.min(cfg.n || 10, Object.keys(state.wrong).length) : cfg.n || 10;
    if (!n) return false;
    S = { ...base, feedback: 'now', items: [], idx: 0, n, d: cfg.d || startD(cfg.sec), phase: 'question' };
    const first = nextAdaptive();
    if (!first) { S = null; return false; }
    S.items.push(first);
    S.items[0].shown = Date.now();
    return true;
  }
  if (cfg.mode === 'section') {
    const n = cfg.sec === 'Q' ? 12 : 12;
    const minutes = cfg.sec === 'Q' ? 21 : 18;
    S = { ...base, feedback: 'end', parts: [sectionPart(cfg.sec, n, minutes, [2, 4], cfg.sec === 'Q' ? 'Quantitative Reasoning' : 'Verbal Reasoning')], p: 0, phase: 'question' };
  } else if (cfg.mode === 'diag') {
    const q = quantSection(10, [2, 4]);
    const v = verbalSection(10, [2, 4]);
    S = { ...base, feedback: 'end', parts: [{ sec: 'Q', title: 'Diagnóstico: Quant', minutes: 0, items: q, cur: 0, marked: new Set() }, { sec: 'V', title: 'Diagnóstico: Verbal', minutes: 0, items: v, cur: 0, marked: new Set() }], p: 0, phase: 'question' };
  } else if (cfg.mode === 'mock') {
    const vFirst = Math.random() < 0.5;
    const order = vFirst ? ['V', 'Q'] : ['Q', 'V'];
    const parts = [];
    if (cfg.essay) parts.push({ sec: 'AW', title: 'Analytical Writing', minutes: 30, essay: true });
    for (const sec of order) {
      parts.push(sectionPart(sec, 12, sec === 'Q' ? 21 : 18, [2, 4], `${sec === 'Q' ? 'Quantitative' : 'Verbal'} Reasoning, sección 1`));
      parts.push({ sec, title: `${sec === 'Q' ? 'Quantitative' : 'Verbal'} Reasoning, sección 2`, minutes: sec === 'Q' ? 26 : 23, n: 15, adaptive: true, items: null, cur: 0, marked: new Set() });
    }
    S = { ...base, feedback: 'end', parts, p: 0, phase: 'intro' };
  } else if (cfg.mode === 'vocab') {
    S = { ...base, phase: 'vocab', deck: vocabDeck(cfg.kind === 'quiz' ? 10 : 20), i: 0, flipped: false, right: 0 };
    if (cfg.kind === 'quiz') S.quiz = S.deck.map((w) => quizFor(w));
  } else if (cfg.mode === 'essay') {
    S = { ...base, phase: 'essay', prompt: ISSUES[Math.floor(Math.random() * ISSUES.length)], text: '', ends: Date.now() + 30 * 60000 };
  }
  if (S.parts && S.phase === 'question') beginPart();
  return true;
}

function beginPart() {
  const part = S.parts[S.p];
  if (part.adaptive && !part.items) {
    const prev = S.parts[S.p - 1];
    const c = prev.items.filter((it) => isCorrect(it.q, it.a)).length;
    const r = c / prev.items.length;
    const dr = r >= 0.75 ? [3, 5] : r >= 0.45 ? [2, 4] : [1, 3];
    part.level = r >= 0.75 ? 'difícil' : r >= 0.45 ? 'media' : 'fácil';
    const ex = new Set(S.parts.filter((p) => p.items).flatMap((p) => p.items.map((it) => it.q.id)));
    part.items = part.sec === 'Q' ? quantSection(part.n, dr, ex) : verbalSection(part.n, dr, ex);
  }
  if (part.essay) {
    S.prompt = ISSUES[Math.floor(Math.random() * ISSUES.length)]; S.text = '';
  }
  S.ends = part.minutes ? Date.now() + part.minutes * 60000 : null;
  if (part.items) part.items[part.cur].shown = Date.now();
  startTick();
}

function startTick() {
  clearInterval(tick);
  if (!S || !S.ends) return;
  tick = setInterval(() => {
    if (!S) { clearInterval(tick); return; }
    const left = S.ends - Date.now();
    const el = root && root.querySelector('[data-timer]');
    if (el) { el.textContent = mmss(left); el.classList.toggle('warn', left < 120000); }
    if (left <= 0) { clearInterval(tick); timeUp(); }
  }, 500);
}
const mmss = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

function timeUp() {
  if (S.phase === 'essay' || (S.parts && S.parts[S.p].essay)) { finishEssay(); return; }
  if (S.parts) { flushTime(); submitPart(); }
}

// ------------------------------------------------------------- registro
function record(it, mode) {
  const q = it.q; const c = isCorrect(q, it.a) ? 1 : 0;
  state.responses.push({ id: q.id, sec: q.sec, topic: topicOf(q), type: kindOf(q), d: q.d, c, g: gOf(q), t: Math.round(it.t || 0), ts: Date.now(), mode });
  state.seen[q.id] = (state.seen[q.id] || 0) + 1;
  if (!c) state.wrong[q.id] = { box: 1, due: Date.now(), sec: q.sec };
  else if (state.wrong[q.id]) {
    const w = state.wrong[q.id]; w.box += 1; w.due = Date.now() + (w.box === 2 ? 2 : 5) * 86400000;
    if (w.box > 3) delete state.wrong[q.id];
  }
  const counters = { [q.sec === 'Q' ? 'q' : 'v']: 1, correct: c, hard: c && q.d >= 4 ? 1 : 0, review: mode === 'review' ? 1 : 0 };
  return { c, counters };
}

function snapshot() {
  const p = predict();
  const day = today();
  const row = { day, ts: Date.now(), v: Math.round(p.V.score), q: Math.round(p.Q.score), vlo: p.V.lo, vhi: p.V.hi, qlo: p.Q.lo, qhi: p.Q.hi };
  const last = state.history[state.history.length - 1];
  if (last && last.day === day) state.history[state.history.length - 1] = row; else state.history.push(row);
}

// ------------------------------------------------------------- render
export function mount(el, onExit) { root = el; exitCb = onExit; render(); }
export function active() { return !!S; }
export function quit() { clearInterval(tick); S = null; }

function render() {
  if (!root) return;
  if (!S) { root.innerHTML = '<div class="empty"><p>No hay una sesión activa.</p><a class="btn" href="#/">Ir a Entrenar</a></div>'; return; }
  if (S.phase === 'vocab') return renderVocab();
  if (S.phase === 'essay') return renderEssay(false);
  if (S.phase === 'intro') return renderIntro();
  if (S.phase === 'between') return renderBetween();
  if (S.phase === 'results') return renderResults();
  if (S.parts && S.parts[S.p].essay) return renderEssay(true);
  if (S.phase === 'grid') return renderGrid();
  renderQuestion();
  wire();
}

function header(extra = '') {
  const part = S.parts ? S.parts[S.p] : null;
  const title = part ? part.title : S.title || 'Práctica';
  const timer = S.ends ? `<span class="timer" data-timer>${mmss(S.ends - Date.now())}</span>` : '';
  return `<header class="run-head"><button class="ghost" data-act="exit" aria-label="Salir de la sesión">Salir</button><div class="run-title"><strong>${esc(title)}</strong>${extra}</div>${timer}</header><div class="confirm-exit" hidden><span>${S.feedback === 'now' || S.phase === 'vocab' ? '¿Salir? Lo que ya respondiste quedó guardado.' : '¿Salir? Lo respondido en esta sección no se guardará.'}</span><button class="btn small" data-act="exit-yes">Salir</button><button class="ghost small" data-act="exit-no">Seguir</button></div>`;
}

function current() {
  if (S.parts) { const part = S.parts[S.p]; return part.items[part.cur]; }
  return S.items[S.idx];
}

function renderQuestion() {
  const it = current();
  const q = it.q;
  let pos; let total;
  if (S.parts) { const part = S.parts[S.p]; pos = part.cur + 1; total = part.items.length; } else { pos = S.idx + 1; total = S.n; }
  const progress = `<span class="run-pos">Pregunta ${pos} de ${total}</span>`;
  const isFb = S.phase === 'feedback';
  const k = kindOf(q);
  const passage = q.pid ? renderPassage(q, it, isFb) : '';
  const body = `<div class="qbody">${q.qa !== undefined ? renderQC(q) : `<div class="stem">${k === 'select' ? `<p class="hint">Toca la oración en el texto.</p>` : ''}${fmtStem(q)}</div>`}${renderChoices(q, it, isFb)}</div>`;
  const nav = S.feedback === 'now' ? navNow(it, isFb) : navEnd(it);
  const calc = q.sec === 'Q' ? '<button class="ghost small" data-act="calc">Calculadora</button>' : '';
  const markBtn = S.feedback === 'end' ? `<button class="ghost small ${S.parts[S.p].marked.has(S.parts[S.p].cur) ? 'on' : ''}" data-act="mark" aria-pressed="${S.parts[S.p].marked.has(S.parts[S.p].cur)}">Marcar</button>` : '';
  const tools = `<div class="run-tools">${progress}<span class="spacer"></span>${markBtn}${calc}</div>`;
  const fb = isFb ? feedbackBox(it) : '';
  root.innerHTML = `${header()}${tools}<div class="run-grid ${passage ? 'has-passage' : ''}">${passage}<section class="qcol">${body}${fb}</section></div>${nav}${calcHtml()}`;
}

function fmtStem(q) {
  const k = kindOf(q);
  let s = q.stem || '';
  if (k === 'tc') {
    const labels = q.choices.length > 1 ? ['(i)', '(ii)', '(iii)'] : [''];
    let i = 0;
    s = esc(s).replace(/(\((i{1,3})\)\s*)?____/g, () => `<span class="blank">${labels[i++] || ''}<span class="line"></span></span>`);
    return `<p>${s}</p>`;
  }
  if (k === 'se') return `<p>${esc(s).replace('____', '<span class="blank"><span class="line"></span></span>')}</p>`;
  if (q.sec === 'V') return `<p>${esc(s)}</p>`;
  return `<p>${s}</p>`;
}

function renderQC(q) {
  return `<div class="stem">${q.stem ? `<p class="qc-info">${q.stem}</p>` : ''}<div class="qc"><div><span>Quantity A</span><p>${q.qa}</p></div><div><span>Quantity B</span><p>${q.qb}</p></div></div></div>`;
}

function renderPassage(q, it, isFb) {
  const P = PASSAGES[q.pid];
  let gi = 0;
  const sel = kindOf(q) === 'select';
  const paras = P.paras.map((para) => `<p>${para.map((sent) => {
    const i = gi++;
    let cls = '';
    if (sel) {
      cls = 'sent';
      if (it.a === i) cls += ' picked';
      if (isFb && i === q.answer) cls += ' right';
      if (isFb && it.a === i && i !== q.answer) cls += ' wrong';
    }
    return sel ? `<span class="${cls}" data-sent="${i}" role="button" tabindex="0">${esc(sent)}</span> ` : `${esc(sent)} `;
  }).join('')}</p>`).join('');
  const label = q.topic === 'cr' ? 'Argumento' : 'Pasaje';
  return `<section class="passage" aria-label="${label}"><details open><summary>${label}${P.title && q.topic !== 'cr' ? `: ${esc(P.title)}` : ''}</summary><div class="ptext">${paras}</div></details></section>`;
}

function renderChoices(q, it, isFb) {
  const k = kindOf(q);
  if (k === 'select') return '';
  if (k === 'numeric') {
    const right = isFb ? `<p class="num-answer">Respuesta correcta: <strong>${q.answer.value}</strong></p>` : '';
    return `<label class="num"><span>Tu respuesta</span><input inputmode="decimal" autocomplete="off" data-num value="${esc(it.a)}" ${isFb ? 'disabled' : ''} placeholder="Número o fracción, p. ej. 3/4"></label>${right}`;
  }
  if (k === 'tc') {
    const cols = q.choices.map((col, b) => {
      const order = it.view.orders[b];
      const opts = order.map((oi) => {
        const on = it.a[b] === oi;
        let cls = 'opt';
        if (on) cls += ' on';
        if (isFb && oi === q.answer[b]) cls += ' right';
        if (isFb && on && oi !== q.answer[b]) cls += ' wrong';
        return `<button class="${cls}" data-tc="${b}:${oi}" ${isFb ? 'disabled' : ''} aria-pressed="${on}">${esc(col[oi])}</button>`;
      }).join('');
      return `<div class="tc-col">${q.choices.length > 1 ? `<span class="tc-label">Blank (${['i', 'ii', 'iii'][b]})</span>` : ''}${opts}</div>`;
    }).join('');
    return `<div class="tc-grid cols-${q.choices.length}">${cols}</div>`;
  }
  const multi = k === 'multi' || k === 'se';
  const order = it.view.order || [...q.choices.keys()];
  const correctSet = Array.isArray(q.answer) ? q.answer : [q.answer];
  const note = k === 'se' ? '<p class="hint">Elige exactamente dos opciones.</p>' : k === 'multi' ? '<p class="hint">Selecciona todas las que apliquen.</p>' : '';
  const opts = order.map((oi, pos) => {
    const on = multi ? it.a.includes(oi) : it.a === oi;
    let cls = `opt ${multi ? 'sq' : 'rd'}`;
    if (on) cls += ' on';
    if (isFb && correctSet.includes(oi)) cls += ' right';
    if (isFb && on && !correctSet.includes(oi)) cls += ' wrong';
    const txt = q.sec === 'V' ? esc(q.choices[oi]) : q.choices[oi];
    return `<button class="${cls}" data-opt="${oi}" ${isFb ? 'disabled' : ''} aria-pressed="${on}"><span class="mark">${k === 'qc' ? LETTERS[pos] : ''}</span><span>${txt}</span></button>`;
  }).join('');
  return `${note}<div class="opts">${opts}</div>`;
}

function feedbackBox(it) {
  const ok = isCorrect(it.q, it.a);
  return `<div class="fb ${ok ? 'ok' : 'bad'}" role="status"><p class="fb-head">${ok ? '<span class="ico" aria-hidden="true">✓</span> Correcta' : '<span class="ico" aria-hidden="true">✕</span> Incorrecta'}${it.xp ? ` <span class="xp">+${it.xp} XP</span>` : ''}</p><p>${it.q.exp}</p><p class="meta">${esc(topicOf(it.q))}, dificultad ${it.q.d} de 5</p></div>`;
}

function navNow(it, isFb) {
  if (isFb) {
    const last = S.idx + 1 >= S.n;
    return `<nav class="run-nav"><span class="streak">${S.streak >= 2 ? `Racha: ${S.streak}` : ''}</span><button class="btn" data-act="next">${last ? 'Ver resultados' : 'Siguiente'}</button></nav>`;
  }
  return `<nav class="run-nav"><span class="streak">${S.streak >= 2 ? `Racha: ${S.streak}` : ''}</span><button class="btn" data-act="check" ${answered(it.q, it.a) ? '' : 'disabled'}>Comprobar</button></nav>`;
}

function navEnd() {
  const part = S.parts[S.p];
  const last = part.cur + 1 >= part.items.length;
  return `<nav class="run-nav"><button class="ghost" data-act="prev" ${part.cur === 0 ? 'disabled' : ''}>Anterior</button><button class="ghost" data-act="grid">Revisar</button><button class="btn" data-act="${last ? 'grid' : 'nextq'}">${last ? 'Terminar' : 'Siguiente'}</button></nav>`;
}

function renderGrid() {
  const part = S.parts[S.p];
  const cells = part.items.map((it, i) => `<button class="cell ${answered(it.q, it.a) ? 'done' : ''} ${part.marked.has(i) ? 'marked' : ''}" data-go="${i}">${i + 1}<small>${answered(it.q, it.a) ? 'respondida' : 'sin responder'}${part.marked.has(i) ? ', marcada' : ''}</small></button>`).join('');
  const pending = part.items.filter((it) => !answered(it.q, it.a)).length;
  root.innerHTML = `${header()}<section class="grid-review"><h2>Revisión de la sección</h2><p>${pending ? `Te faltan ${pending} por responder. Una respuesta en blanco cuenta como incorrecta.` : 'Respondiste todas.'} Toca un número para volver a esa pregunta.</p><div class="cells">${cells}</div></section><nav class="run-nav"><button class="ghost" data-act="back">Volver a la pregunta</button><button class="btn" data-act="submit">Terminar sección</button></nav>`;
  wire();
}

function renderIntro() {
  const secs = S.parts.map((p) => `<li>${esc(p.title)}${p.minutes ? `: ${p.essay ? '1 tarea' : `${p.items ? p.items.length : p.n} preguntas`}, ${p.minutes} min` : ''}</li>`).join('');
  root.innerHTML = `${header()}<section class="intro"><h2>Simulacro completo</h2><p>Mismo formato que el GRE actual: la segunda sección de cada área se ajusta a cómo te fue en la primera. No hay descansos programados.</p><ol>${secs}</ol><p>Dentro de cada sección puedes saltar, marcar y regresar a preguntas. Al terminar verás tu puntaje estimado y la revisión de cada pregunta.</p><button class="btn" data-act="begin">Empezar</button></section>`;
  wire();
}

function renderBetween() {
  const next = S.parts[S.p];
  root.innerHTML = `${header()}<section class="intro"><h2>Sección terminada</h2><p>Siguiente: <strong>${esc(next.title)}</strong>${next.minutes ? `, ${next.minutes} minutos` : ''}.</p><button class="btn" data-act="begin">Continuar</button></section>`;
  wire();
}

function renderResults() {
  const R = S.result;
  const rows = R.items.map((it, i) => {
    const ok = isCorrect(it.q, it.a);
    const yours = describeAnswer(it.q, it.a);
    const right = describeAnswer(it.q, it.q.answer, true);
    return `<details class="rev ${ok ? 'ok' : 'bad'}"><summary><span class="ico" aria-hidden="true">${ok ? '✓' : '✕'}</span><span>${i + 1}. ${esc(topicOf(it.q))}</span><span class="sr">${ok ? 'correcta' : 'incorrecta'}</span><span class="d">Dificultad ${it.q.d}</span></summary><div class="rev-body">${it.q.pid ? `<p class="meta">Pasaje: ${esc(PASSAGES[it.q.pid].title)}</p>` : ''}${it.q.qa !== undefined ? renderQC(it.q) : `<div class="stem">${fmtStem(it.q)}</div>`}<p><strong>Tu respuesta:</strong> ${yours}</p><p><strong>Correcta:</strong> ${right}</p><p>${it.q.exp}</p></div></details>`;
  }).join('');
  const scores = R.scores ? `<div class="res-scores">${R.scores.map((s) => `<div><span>${s.label}</span><strong>${s.value}</strong></div>`).join('')}</div>` : '';
  root.innerHTML = `<header class="run-head"><div class="run-title"><strong>${esc(R.title)}</strong></div></header><section class="results"><p class="big">${R.correct} de ${R.items.length} correctas</p>${scores}<p class="meta">+${R.xp} XP${R.note ? `. ${R.note}` : ''}</p><div class="res-actions"><a class="btn" href="#/pronostico" data-act="done">Ver mi pronóstico</a><a class="ghost" href="#/" data-act="done">Volver a Entrenar</a></div><h3>Revisión</h3><div class="revs">${rows}</div></section>`;
  root.querySelectorAll('[data-act="done"]').forEach((a) => a.addEventListener('click', () => { S = null; }));
}

function describeAnswer(q, a, isKey = false) {
  const k = kindOf(q);
  if (a === null || a === undefined || (Array.isArray(a) && !a.length) || a === '') return 'sin respuesta';
  if (k === 'numeric') return esc(isKey ? a.value : a);
  if (k === 'select') return `“${esc(PASSAGES[q.pid].paras.flat()[a])}”`;
  if (k === 'tc') return a.map((v, b) => (v === null ? '—' : esc(q.choices[b][v]))).join(' / ');
  const list = Array.isArray(a) ? a : [a];
  return list.map((i) => (q.sec === 'V' ? esc(q.choices[i]) : q.choices[i])).join(', ');
}

// ------------------------------------------------------------- eventos
function wire() {
  root.onclick = (e) => {
    const t = e.target.closest('[data-act],[data-opt],[data-tc],[data-sent],[data-go],[data-calc]');
    if (!t) return;
    if (t.dataset.calc !== undefined) return calcPress(t.dataset.calc);
    const it = S && (S.items || S.parts) && S.phase !== 'grid' && S.phase !== 'intro' && S.phase !== 'between' ? current() : null;
    if (t.dataset.opt !== undefined && it && S.phase === 'question') {
      const oi = Number(t.dataset.opt); const k = kindOf(it.q);
      if (k === 'multi') it.a = it.a.includes(oi) ? it.a.filter((x) => x !== oi) : [...it.a, oi];
      else if (k === 'se') { if (it.a.includes(oi)) it.a = it.a.filter((x) => x !== oi); else if (it.a.length < 2) it.a = [...it.a, oi]; }
      else it.a = oi;
      return render();
    }
    if (t.dataset.tc !== undefined && it && S.phase === 'question') {
      const [b, oi] = t.dataset.tc.split(':').map(Number); it.a[b] = oi; return render();
    }
    if (t.dataset.sent !== undefined && it && S.phase === 'question' && kindOf(it.q) === 'select') { it.a = Number(t.dataset.sent); return render(); }
    if (t.dataset.go !== undefined) { const part = S.parts[S.p]; part.cur = Number(t.dataset.go); S.phase = 'question'; part.items[part.cur].shown = Date.now(); return render(); }
    const act = t.dataset.act;
    if (act === 'exit') { root.querySelector('.confirm-exit').hidden = false; return; }
    if (act === 'exit-no') { root.querySelector('.confirm-exit').hidden = true; return; }
    if (act === 'exit-yes') { quit(); exitCb(); return; }
    if (act === 'check') return check();
    if (act === 'next') return nextNow();
    if (act === 'nextq') { flushTime(); const part = S.parts[S.p]; part.cur++; part.items[part.cur].shown = Date.now(); return render(); }
    if (act === 'prev') { flushTime(); const part = S.parts[S.p]; part.cur--; part.items[part.cur].shown = Date.now(); return render(); }
    if (act === 'mark') { const part = S.parts[S.p]; if (part.marked.has(part.cur)) part.marked.delete(part.cur); else part.marked.add(part.cur); return render(); }
    if (act === 'grid') { flushTime(); S.phase = 'grid'; return render(); }
    if (act === 'back') { S.phase = 'question'; current().shown = Date.now(); return render(); }
    if (act === 'submit') return submitPart();
    if (act === 'begin') { S.phase = 'question'; beginPart(); return render(); }
    if (act === 'calc') { const c = root.querySelector('.calc'); c.hidden = !c.hidden; return; }
  };
  const num = root.querySelector('[data-num]');
  if (num) {
    num.addEventListener('input', () => {
      const it = current(); it.a = num.value;
      const btn = root.querySelector('[data-act="check"]');
      if (btn) btn.disabled = !answered(it.q, it.a);
    });
    if (S.phase === 'question') num.focus({ preventScroll: true });
  }
  root.onkeydown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.sent !== undefined) { e.preventDefault(); e.target.click(); }
  };
}

function flushTime() {
  const it = current();
  if (it && it.shown) { it.t = (it.t || 0) + (Date.now() - it.shown); it.shown = null; }
}

function check() {
  const it = current();
  flushTime();
  const { c, counters } = record(it, S.mode);
  S.streak = c ? S.streak + 1 : 0;
  if (c) S.correct++;
  it.xp = xpForAnswer(it.q.d, c, S.streak - 1);
  S.xp += it.xp;
  award(it.xp, counters);
  // Dificultad adaptativa.
  S.d = Math.max(1, Math.min(5, S.d + (c ? (S.streak >= 2 ? 1 : 0.5) : -1)));
  S.d = Math.round(S.d * 2) / 2;
  S.phase = 'feedback';
  render();
}

function nextNow() {
  if (S.idx + 1 >= S.n) return finishNow();
  const nx = nextAdaptive();
  if (!nx) return finishNow();
  S.items.push(nx); S.idx++; S.phase = 'question'; nx.shown = Date.now();
  render();
}

function finishNow() {
  const bonus = S.mode === 'sprint' ? 20 : 10;
  award(bonus, S.mode === 'sprint' ? { sprint: 1 } : {});
  S.xp += bonus;
  state.sessions.push({ ts: Date.now(), mode: S.mode, n: S.items.length, correct: S.correct, xp: S.xp, sec: S.sec });
  snapshot(); checkAchievements(); save();
  S.result = { title: S.title || 'Resultados', items: S.items, correct: S.correct, xp: S.xp };
  S.phase = 'results';
  render();
}

function submitPart() {
  clearInterval(tick);
  S.ends = null;
  const part = S.parts[S.p];
  let xp = 0; let correct = 0;
  const counters = { q: 0, v: 0, correct: 0, hard: 0 };
  let run = 0;
  for (const it of part.items) {
    const r = record(it, S.mode === 'mock' ? 'mock' : 'section');
    run = r.c ? run + 1 : 0;
    correct += r.c; xp += xpForAnswer(it.q.d, r.c, Math.max(0, run - 1));
    for (const [k, v] of Object.entries(r.counters)) counters[k] = (counters[k] || 0) + v;
  }
  part.correct = correct;
  xp += 40;
  S.xp += xp;
  award(xp, { ...counters, section: S.mode === 'section' ? 1 : 0 });
  save();
  if (S.p + 1 < S.parts.length) {
    S.p++; S.phase = S.mode === 'diag' ? 'question' : 'between';
    if (S.mode === 'diag') beginPart();
    return render();
  }
  finishParts();
}

function finishParts() {
  const items = S.parts.filter((p) => p.items).flatMap((p) => p.items);
  const respV = items.filter((it) => it.q.sec === 'V').map((it) => ({ sec: 'V', d: it.q.d, c: isCorrect(it.q, it.a) ? 1 : 0, g: gOf(it.q), ts: Date.now() }));
  const respQ = items.filter((it) => it.q.sec === 'Q').map((it) => ({ sec: 'Q', d: it.q.d, c: isCorrect(it.q, it.a) ? 1 : 0, g: gOf(it.q), ts: Date.now() }));
  const scores = [];
  let v = null; let q = null;
  if (respV.length) { v = scoreSet(respV, 'V'); scores.push({ label: 'Verbal estimado', value: v }); }
  if (respQ.length) { q = scoreSet(respQ, 'Q'); scores.push({ label: 'Quant estimado', value: q }); }
  if (v && q) scores.push({ label: 'Total', value: v + q });
  if (S.essayScore !== undefined) scores.push({ label: 'Writing (autoevaluación)', value: S.essayScore });
  let note = '';
  if (S.mode === 'mock') {
    state.tests.push({ ts: Date.now(), kind: 'simulacro', v, q, awa: S.essayScore ?? null });
    award(150, {}); S.xp += 150;
    const lv = S.parts.filter((p) => p.level).map((p) => `${p.sec === 'Q' ? 'Quant' : 'Verbal'} 2: ${p.level}`).join(', ');
    note = lv ? `Segundas secciones: ${lv}` : '';
  }
  state.sessions.push({ ts: Date.now(), mode: S.mode, n: items.length, correct: items.filter((it) => isCorrect(it.q, it.a)).length, xp: S.xp, sec: S.sec || 'M' });
  snapshot(); checkAchievements(); save();
  const titles = { section: 'Sección terminada', mock: 'Simulacro terminado', diag: 'Diagnóstico terminado' };
  S.result = { title: titles[S.mode] || 'Resultados', items, correct: items.filter((it) => isCorrect(it.q, it.a)).length, xp: S.xp, scores, note };
  S.phase = 'results';
  render();
}

// ------------------------------------------------------------- calculadora
let calcVal = '0'; let calcAcc = null; let calcOp = null; let calcFresh = true; let calcMem = 0;
function calcHtml() {
  const keys = ['MR', 'MC', 'M+', 'C', '7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '±', '+', 'CE', '√', '='];
  const isNum = S && current() && kindOf(current().q) === 'numeric' && S.phase === 'question';
  return `<div class="calc" hidden role="dialog" aria-label="Calculadora"><div class="calc-disp" aria-live="polite">${calcVal}</div><div class="calc-keys">${keys.map((k) => `<button data-calc="${k}" ${k === '=' ? 'class="eq"' : ''}>${k}</button>`).join('')}</div>${isNum ? '<button class="btn small" data-calc="transfer">Transferir resultado</button>' : ''}</div>`;
}
function calcPress(k) {
  const num = () => parseFloat(calcVal);
  const apply = () => {
    if (calcOp === null || calcAcc === null) return num();
    const b = num();
    return calcOp === '+' ? calcAcc + b : calcOp === '−' ? calcAcc - b : calcOp === '×' ? calcAcc * b : b === 0 ? NaN : calcAcc / b;
  };
  if (/^[0-9]$/.test(k)) { calcVal = calcFresh || calcVal === '0' ? k : calcVal + k; calcFresh = false; }
  else if (k === '.') { if (calcFresh) { calcVal = '0.'; calcFresh = false; } else if (!calcVal.includes('.')) calcVal += '.'; }
  else if (['+', '−', '×', '÷'].includes(k)) { calcAcc = apply(); calcOp = k; calcVal = trim(calcAcc); calcFresh = true; }
  else if (k === '=') { calcVal = trim(apply()); calcAcc = null; calcOp = null; calcFresh = true; }
  else if (k === 'C') { calcVal = '0'; calcAcc = null; calcOp = null; calcFresh = true; }
  else if (k === 'CE') { calcVal = '0'; calcFresh = true; }
  else if (k === '±') calcVal = trim(-num());
  else if (k === '√') { calcVal = trim(Math.sqrt(num())); calcFresh = true; }
  else if (k === 'M+') { calcMem += num(); calcFresh = true; }
  else if (k === 'MR') { calcVal = trim(calcMem); calcFresh = true; }
  else if (k === 'MC') calcMem = 0;
  else if (k === 'transfer') {
    const it = current(); it.a = calcVal; const inp = root.querySelector('[data-num]'); if (inp) inp.value = calcVal;
    const btn = root.querySelector('[data-act="check"]'); if (btn) btn.disabled = !answered(it.q, it.a);
  }
  const d = root.querySelector('.calc-disp'); if (d) d.textContent = calcVal;
}
const trim = (x) => (Number.isFinite(x) ? String(Math.round(x * 1e8) / 1e8) : 'Error');

// ------------------------------------------------------------- vocabulario
const INTERVAL = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 16 };
function vocabDeck(n) {
  const now = Date.now();
  const due = VOCAB.filter((v) => state.vocab[v.w] && state.vocab[v.w].due <= now).sort((a, b) => state.vocab[a.w].due - state.vocab[b.w].due);
  const fresh = VOCAB.filter((v) => !state.vocab[v.w]);
  const later = VOCAB.filter((v) => state.vocab[v.w] && state.vocab[v.w].due > now).sort((a, b) => state.vocab[a.w].due - state.vocab[b.w].due);
  return [...due, ...fresh, ...later].slice(0, n);
}
export function vocabStats() {
  const now = Date.now();
  const vals = Object.values(state.vocab);
  return { total: VOCAB.length, learned: vals.filter((v) => v.box >= 4).length, due: vals.filter((v) => v.due <= now).length, fresh: VOCAB.length - vals.length };
}
function grade(word, knew) {
  const v = state.vocab[word] || { box: 0, due: 0 };
  v.box = knew ? Math.min(5, v.box + 1) : 1;
  v.due = Date.now() + INTERVAL[v.box] * 86400000 + (knew ? 0 : 60000);
  state.vocab[word] = v;
}
function quizFor(w) {
  const pool = VOCAB.filter((x) => x.w !== w.w);
  const opts = [w];
  while (opts.length < 4) { const c = pool[Math.floor(Math.random() * pool.length)]; if (!opts.includes(c)) opts.push(c); }
  const order = shuffle(4);
  return { opts: order.map((i) => opts[i]), answer: order.indexOf(0), picked: null };
}

function renderVocab() {
  const w = S.deck[S.i];
  if (!w) return finishVocab();
  const box = state.vocab[w.w] ? state.vocab[w.w].box : 0;
  const pos = `<span class="run-pos">${S.i + 1} de ${S.deck.length}</span>`;
  let body;
  if (S.quiz) {
    const qz = S.quiz[S.i];
    const opts = qz.opts.map((o, i) => {
      let cls = 'opt rd';
      if (qz.picked !== null && i === qz.answer) cls += ' right';
      if (qz.picked === i && i !== qz.answer) cls += ' wrong';
      return `<button class="${cls}" data-vq="${i}" ${qz.picked !== null ? 'disabled' : ''}><span class="mark"></span><span>${esc(o.en)} <em>(${esc(o.es)})</em></span></button>`;
    }).join('');
    body = `<div class="card-word"><p class="word">${esc(w.w)}</p><p class="hint">¿Qué significa?</p></div><div class="opts">${opts}</div>${qz.picked !== null ? '<nav class="run-nav"><span></span><button class="btn" data-v="next">Siguiente</button></nav>' : ''}`;
  } else {
    body = `<div class="card-word ${S.flipped ? 'flipped' : ''}"><p class="word">${esc(w.w)}</p>${S.flipped ? `<p class="def">${esc(w.en)}</p><p class="es">${esc(w.es)}</p>` : '<p class="hint">Piensa en su significado y voltea la tarjeta.</p>'}<p class="meta">Caja ${box} de 5</p></div><nav class="run-nav">${S.flipped ? '<button class="ghost" data-v="no">No la sabía</button><button class="btn" data-v="yes">La sabía</button>' : '<span></span><button class="btn" data-v="flip">Voltear</button>'}</nav>`;
  }
  root.innerHTML = `${header()}<div class="run-tools">${pos}</div><section class="vocab">${body}</section>`;
  root.onclick = (e) => {
    const t = e.target.closest('[data-v],[data-vq],[data-act]');
    if (!t) return;
    if (t.dataset.act === 'exit') { root.querySelector('.confirm-exit').hidden = false; return; }
    if (t.dataset.act === 'exit-no') { root.querySelector('.confirm-exit').hidden = true; return; }
    if (t.dataset.act === 'exit-yes') { finishVocab(true); return; }
    if (t.dataset.vq !== undefined) {
      const qz = S.quiz[S.i]; qz.picked = Number(t.dataset.vq);
      const ok = qz.picked === qz.answer; grade(w.w, ok); if (ok) S.right++;
      const xp = ok ? 4 : 1; S.xp += xp; award(xp, { vocab: 1 });
      return renderVocab();
    }
    const v = t.dataset.v;
    if (v === 'flip') { S.flipped = true; return renderVocab(); }
    if (v === 'yes' || v === 'no') { grade(w.w, v === 'yes'); if (v === 'yes') S.right++; const xp = v === 'yes' ? 3 : 1; S.xp += xp; award(xp, { vocab: 1 }); }
    S.i++; S.flipped = false; renderVocab();
  };
}
function finishVocab(early = false) {
  save();
  const st = vocabStats();
  if (early) { S = null; exitCb(); return; }
  root.innerHTML = `<section class="results"><h2>Vocabulario</h2><p class="big">${S.right} de ${S.deck.length}</p><p class="meta">+${S.xp} XP. Dominadas: ${st.learned} de ${st.total}. Las palabras que fallaste vuelven en tu siguiente repaso.</p><div class="res-actions"><a class="btn" href="#/" data-act="done">Volver a Entrenar</a></div></section>`;
  root.querySelector('[data-act="done"]').addEventListener('click', () => { S = null; });
}

// ------------------------------------------------------------- ensayo
function renderEssay(inMock) {
  if (!S.ends) S.ends = Date.now() + 30 * 60000;
  startTick();
  const words = (S.text.trim().match(/\S+/g) || []).length;
  root.innerHTML = `${header()}<section class="essay"><p class="task">${esc(ISSUE_TASK)}</p><blockquote>${esc(S.prompt)}</blockquote><textarea data-essay spellcheck="false" placeholder="Escribe tu ensayo en inglés. El GRE no tiene corrector ortográfico, así que aquí tampoco.">${esc(S.text)}</textarea><div class="essay-foot"><span data-words>${words} palabras</span><button class="btn" data-act="essay-done">Terminar ensayo</button></div></section>${inMock ? '' : ''}`;
  const ta = root.querySelector('[data-essay]');
  ta.addEventListener('input', () => { S.text = ta.value; root.querySelector('[data-words]').textContent = `${(ta.value.trim().match(/\S+/g) || []).length} palabras`; });
  root.onclick = (e) => {
    const t = e.target.closest('[data-act]'); if (!t) return;
    if (t.dataset.act === 'exit') { root.querySelector('.confirm-exit').hidden = false; return; }
    if (t.dataset.act === 'exit-no') { root.querySelector('.confirm-exit').hidden = true; return; }
    if (t.dataset.act === 'exit-yes') { quit(); exitCb(); return; }
    if (t.dataset.act === 'essay-done') finishEssay();
  };
}

function finishEssay() {
  clearInterval(tick);
  const words = (S.text.trim().match(/\S+/g) || []).length;
  const crit = RUBRIC.map((c, i) => `<fieldset><legend>${esc(c)}</legend>${['Sí', 'Parcial', 'No'].map((l, j) => `<label><input type="radio" name="r${i}" value="${[1, 0.5, 0][j]}" ${j === 1 ? 'checked' : ''}> ${l}</label>`).join('')}</fieldset>`).join('');
  root.innerHTML = `<header class="run-head"><div class="run-title"><strong>Autoevaluación del ensayo</strong></div></header><section class="essay-eval"><p>${words} palabras. Evalúa tu texto con honestidad: así funciona la rúbrica oficial (0 a 6, en medios puntos).</p><form data-rubric>${crit}<button class="btn" type="submit">Calcular puntaje</button></form></section>`;
  root.querySelector('[data-rubric]').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    let sum = 0; RUBRIC.forEach((_, i) => { sum += Number(fd.get(`r${i}`)); });
    let score = words < 50 ? 0 : Math.max(1, Math.round(sum * 2) / 2);
    if (words < 250 && score > 4) score = 4;
    state.essays.push({ ts: Date.now(), prompt: S.prompt, text: S.text, words, score });
    award(60, {});
    S.xp += 60;
    if (S.parts) {
      S.essayScore = score;
      S.p++; S.phase = 'between'; S.ends = null; save(); return render();
    }
    save();
    root.innerHTML = `<section class="results"><h2>Ensayo guardado</h2><p class="big">${score.toFixed(1)} de 6</p><p class="meta">+60 XP. Puntaje orientativo de autoevaluación${words < 250 && sum * 2 > 8 ? '; se limitó a 4.0 porque los ensayos muy cortos rara vez desarrollan bien las ideas' : ''}.</p><details class="rev"><summary>Ver tu texto</summary><div class="rev-body"><blockquote>${esc(S.prompt)}</blockquote><p class="essay-text">${esc(S.text) || '(vacío)'}</p></div></details><div class="res-actions"><a class="btn" href="#/" data-act="done">Volver a Entrenar</a></div></section>`;
    root.querySelector('[data-act="done"]').addEventListener('click', () => { S = null; });
  });
}

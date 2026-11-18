// Persistencia local (localStorage) con respaldo en memoria si el navegador la bloquea.
const KEY = 'escalera-mba.v1';

const DEFAULT = () => ({
  version: 1,
  createdAt: Date.now(),
  profile: { name: 'Juan Pablo', testDate: '', hoursPerWeek: 10, target: '', favorites: ['mit', 'mays'], theme: 'auto' },
  responses: [], // {id, sec, topic, type, d, c, t, ts, mode}
  sessions: [], // {ts, mode, n, correct, xp, sec}
  tests: [], // {ts, kind: 'simulacro'|'oficial', v, q, awa}
  history: [], // {day, v, q, vlo, vhi, qlo, qhi}
  xp: 0,
  streak: { last: '', count: 0, best: 0 },
  vocab: {}, // palabra -> {box, due}
  wrong: {}, // id -> {box, due, sec}
  seen: {}, // id -> veces vista
  essays: [],
  achievements: {},
  daily: {}, // 'YYYY-MM-DD' -> {xp, q, v, vocab, sprint, section, hard, review}
});

let memory = null;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT(), ...JSON.parse(raw) };
  } catch (e) { /* almacenamiento no disponible */ }
  return memory || DEFAULT();
}

export const state = load();
// Completa campos de perfil agregados en versiones nuevas.
state.profile = { ...DEFAULT().profile, ...state.profile };

export function save() {
  memory = state;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* sin persistencia */ }
}

export function resetAll() {
  const fresh = DEFAULT();
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, fresh);
  save();
}

export function importData(obj) {
  if (!obj || typeof obj !== 'object' || !Array.isArray(obj.responses)) throw new Error('El archivo no parece un respaldo de Escalera MBA.');
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, DEFAULT(), obj);
  save();
}

export function today(ts = Date.now()) {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function dayStats(day = today()) {
  if (!state.daily[day]) state.daily[day] = { xp: 0, q: 0, v: 0, vocab: 0, sprint: 0, section: 0, hard: 0, review: 0, correct: 0 };
  return state.daily[day];
}

export function touchStreak() {
  const t = today();
  if (state.streak.last === t) return;
  const y = today(Date.now() - 86400000);
  state.streak.count = state.streak.last === y ? state.streak.count + 1 : 1;
  state.streak.best = Math.max(state.streak.best || 0, state.streak.count);
  state.streak.last = t;
}

export function liveStreak() {
  const t = today();
  const y = today(Date.now() - 86400000);
  if (state.streak.last === t || state.streak.last === y) return state.streak.count;
  return 0;
}

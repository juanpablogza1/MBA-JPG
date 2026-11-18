// Experiencia, niveles, misiones diarias y logros.
import { state, save, today, dayStats, touchStreak, liveStreak } from './store.js';

export const DAILY_GOAL = 150; // XP

const LEVEL_NAMES = [
  [1, 'Aspirante'], [3, 'Candidato'], [6, 'Shortlist'], [10, 'Entrevistado'],
  [15, 'Admitido'], [21, 'Becado'], [28, 'Dean’s List'], [36, 'Baker Scholar'],
];

export function levelFromXp(xp) {
  let lvl = 1;
  while (xp >= threshold(lvl + 1)) lvl++;
  const cur = threshold(lvl); const next = threshold(lvl + 1);
  const name = [...LEVEL_NAMES].reverse().find(([n]) => lvl >= n)[1];
  return { lvl, name, cur, next, progress: (xp - cur) / (next - cur) };
}
function threshold(n) { return n <= 1 ? 0 : Math.round(120 * (n - 1) ** 1.6); }

export function xpForAnswer(d, correct, streak) {
  if (!correct) return 2;
  return 6 + 4 * d + Math.min(10, 2 * streak);
}

let toastHook = () => {};
export function onToast(fn) { toastHook = fn; }

export function award(xp, counters = {}) {
  touchStreak();
  state.xp += xp;
  const ds = dayStats();
  const before = ds.xp;
  ds.xp += xp;
  for (const [k, v] of Object.entries(counters)) ds[k] = (ds[k] || 0) + v;
  if (before < DAILY_GOAL && ds.xp >= DAILY_GOAL) {
    state.xp += 50; ds.xp += 50;
    toastHook('Meta diaria cumplida: +50 XP');
  }
  checkAchievements();
  save();
}

// Misiones del día: tres, elegidas de forma determinista según la fecha.
const MISSIONS = [
  { id: 'q15', text: 'Responde 15 preguntas de Quant', key: 'q', goal: 15 },
  { id: 'v10', text: 'Responde 10 preguntas de Verbal', key: 'v', goal: 10 },
  { id: 'vocab20', text: 'Repasa 20 tarjetas de vocabulario', key: 'vocab', goal: 20 },
  { id: 'sprint', text: 'Termina un sprint', key: 'sprint', goal: 1 },
  { id: 'section', text: 'Termina una sección cronometrada', key: 'section', goal: 1 },
  { id: 'hard5', text: 'Acierta 5 preguntas de dificultad 4 o 5', key: 'hard', goal: 5 },
  { id: 'review5', text: 'Repasa 5 de tus errores', key: 'review', goal: 5 },
  { id: 'correct25', text: 'Consigue 25 respuestas correctas', key: 'correct', goal: 25 },
];

export function todaysMissions() {
  const t = today();
  let h = 0; for (const ch of t) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const pool = [...MISSIONS];
  const out = [];
  while (out.length < 3) { out.push(pool.splice(h % pool.length, 1)[0]); h = (h * 7 + 13) >>> 0; }
  const ds = dayStats(t);
  return out.map((m) => ({ ...m, have: Math.min(m.goal, ds[m.key] || 0), done: (ds[m.key] || 0) >= m.goal }));
}

export const ACHIEVEMENTS = [
  { id: 'first', name: 'Primer paso', desc: 'Responde tu primera pregunta', test: () => state.responses.length >= 1 },
  { id: 'q100', name: 'Centenar', desc: 'Responde 100 preguntas', test: () => state.responses.length >= 100 },
  { id: 'q500', name: 'Quinientas', desc: 'Responde 500 preguntas', test: () => state.responses.length >= 500 },
  { id: 'run10', name: 'Racha de 10', desc: '10 respuestas correctas seguidas', test: () => runOf(10) },
  { id: 'hard10', name: 'Escalador', desc: 'Acierta 10 preguntas de dificultad 5', test: () => state.responses.filter((r) => r.d === 5 && r.c).length >= 10 },
  { id: 'section', name: 'Contra reloj', desc: 'Termina una sección cronometrada', test: () => state.sessions.some((s) => s.mode === 'section') },
  { id: 'mock', name: 'Simulacro', desc: 'Termina un simulacro completo', test: () => state.tests.some((t) => t.kind === 'simulacro') },
  { id: 'vocab50', name: '50 palabras', desc: 'Domina 50 palabras (caja 4 o más)', test: () => Object.values(state.vocab).filter((v) => v.box >= 4).length >= 50 },
  { id: 'vocab150', name: '150 palabras', desc: 'Domina 150 palabras', test: () => Object.values(state.vocab).filter((v) => v.box >= 4).length >= 150 },
  { id: 'essay', name: 'Primer ensayo', desc: 'Escribe un ensayo Issue completo', test: () => state.essays.length >= 1 },
  { id: 'days3', name: 'Tres días', desc: 'Practica 3 días seguidos', test: () => liveStreak() >= 3 },
  { id: 'days7', name: 'Semana completa', desc: 'Practica 7 días seguidos', test: () => liveStreak() >= 7 },
  { id: 'days30', name: 'Un mes', desc: 'Practica 30 días seguidos', test: () => liveStreak() >= 30 },
  { id: 'z320', name: 'Zona 320', desc: 'Tu pronóstico llega a 320', test: () => lastTotal() >= 320 },
  { id: 'z325', name: 'Zona M7', desc: 'Tu pronóstico llega a 325', test: () => lastTotal() >= 325 },
];

function lastTotal() {
  const h = state.history[state.history.length - 1];
  return h ? h.v + h.q : 0;
}
function runOf(n) {
  let run = 0;
  for (const r of state.responses) { run = r.c ? run + 1 : 0; if (run >= n) return true; }
  return false;
}

export function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (!state.achievements[a.id] && a.test()) {
      state.achievements[a.id] = Date.now();
      toastHook(`Logro: ${a.name}`);
    }
  }
}

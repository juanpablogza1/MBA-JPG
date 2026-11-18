// Motor de predicción: Teoría de Respuesta al Ítem (modelo logístico de 3 parámetros)
// + tablas de percentiles oficiales de ETS para convertir habilidad en puntaje 130-170.

import { state } from './store.js';
import { SCHOOLS } from '../data/schools.js';

// Percentil (porcentaje que obtuvo menos) según ETS, test takers jul 2022 - jun 2025.
// Valores "no reportados" en los extremos se completan con interpolación conservadora.
const PCT_V = { 170: 99, 169: 99, 168: 98, 167: 97, 166: 96, 165: 95, 164: 93, 163: 90, 162: 88, 161: 85, 160: 82, 159: 79, 158: 76, 157: 72, 156: 68, 155: 64, 154: 59, 153: 54, 152: 48, 151: 43, 150: 39, 149: 34, 148: 30, 147: 27, 146: 24, 145: 21, 144: 18, 143: 16, 142: 14, 141: 11, 140: 10, 139: 8, 138: 6, 137: 5, 136: 4, 135: 3, 134: 2, 133: 2, 132: 1, 131: 1, 130: 0 };
const PCT_Q = { 170: 89, 169: 85, 168: 80, 167: 75, 166: 72, 165: 67, 164: 63, 163: 60, 162: 57, 161: 53, 160: 50, 159: 47, 158: 45, 157: 42, 156: 39, 155: 37, 154: 34, 153: 31, 152: 29, 151: 26, 150: 23, 149: 21, 148: 19, 147: 16, 146: 14, 145: 12, 144: 10, 143: 9, 142: 7, 141: 6, 140: 5, 139: 4, 138: 3, 137: 2, 136: 2, 135: 1, 134: 1, 133: 1, 132: 0.5, 131: 0.2, 130: 0 };
export const PCT = { V: PCT_V, Q: PCT_Q };
export const MEANS = { V: 151.39, Q: 157.62, AW: 3.46 };

const B = { 1: -1.5, 2: -0.6, 3: 0.2, 4: 1.0, 5: 1.7 };
const A = 1.3;

export function guessRate(type, nChoices = 5, blanks = 1) {
  switch (type) {
    case 'qc': return 0.25;
    case 'numeric': return 0.01;
    case 'multi': return 1 / (2 ** Math.max(nChoices, 3) - 1);
    case 'se': return 1 / 15;
    case 'tc': return blanks === 1 ? 0.2 : 1 / 3 ** blanks;
    case 'select': return 1 / Math.max(nChoices, 4);
    default: return 0.2;
  }
}

function pCorrect(theta, d, c) {
  return c + (1 - c) / (1 + Math.exp(-A * (theta - B[d])));
}

function normPdf(x) { return Math.exp(-0.5 * x * x); }
export function normCdf(x) {
  // Aproximación de Abramowitz-Stegun.
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const dd = 0.3989423 * Math.exp((-x * x) / 2);
  const p = dd * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

// Estimación EAP de la habilidad con prior N(0,1) en la población de ETS.
// Las respuestas recientes pesan más (vida media de 21 días).
export function estimateTheta(responses, { halfLife = 21, now = Date.now() } = {}) {
  const grid = [];
  for (let t = -3.5; t <= 3.5001; t += 0.05) grid.push(t);
  const logPost = grid.map((t) => Math.log(normPdf(t)));
  let nEff = 0;
  for (const r of responses) {
    const age = (now - r.ts) / 86400000;
    const w = halfLife ? 0.5 ** (age / halfLife) : 1;
    nEff += w;
    const c = r.g ?? 0.2;
    grid.forEach((t, i) => {
      const p = pCorrect(t, r.d, c);
      logPost[i] += w * Math.log(r.c ? p : 1 - p);
    });
  }
  const mx = Math.max(...logPost);
  const post = logPost.map((l) => Math.exp(l - mx));
  const z = post.reduce((a, b) => a + b, 0);
  const mean = grid.reduce((a, t, i) => a + t * post[i], 0) / z;
  const varr = grid.reduce((a, t, i) => a + (t - mean) ** 2 * post[i], 0) / z;
  return { theta: mean, sd: Math.sqrt(varr), n: responses.length, nEff };
}

// Habilidad (z de la población) -> puntaje escalado usando el percentil de ETS.
export function thetaToScore(theta, sec) {
  const p = normCdf(theta) * 100;
  const tab = PCT[sec];
  if (p >= tab[170]) return 170;
  for (let s = 169; s >= 130; s--) {
    if (p >= tab[s]) {
      const lo = tab[s]; const hi = tab[s + 1];
      const frac = hi > lo ? (p - lo) / (hi - lo) : 0;
      return Math.min(170, s + frac);
    }
  }
  return 130;
}

export function scoreToPercentile(score, sec) {
  const s = Math.max(130, Math.min(170, Math.round(score)));
  return PCT[sec][s];
}

function sectionEstimate(sec, responses) {
  const rs = responses.filter((r) => r.sec === sec).slice(-250);
  const est = estimateTheta(rs);
  const score = thetaToScore(est.theta, sec);
  const lo = thetaToScore(est.theta - 1.2816 * est.sd, sec);
  const hi = thetaToScore(est.theta + 1.2816 * est.sd, sec);
  return { ...est, score, lo, hi };
}

// Combina la estimación de la app con simulacros oficiales (POWERPREP), que pesan más.
function blendOfficial(sec, est) {
  const key = sec === 'V' ? 'v' : 'q';
  const off = state.tests.filter((t) => t.kind === 'oficial' && t[key]);
  if (!off.length) return est;
  let num = 0; let den = 0;
  const halfW = Math.max(1.5, (est.hi - est.lo) / 2);
  const wApp = est.n ? 1 / halfW ** 2 : 0;
  num += wApp * est.score; den += wApp;
  for (const t of off) {
    const age = (Date.now() - t.ts) / 86400000;
    const w = (1 / 3 ** 2) * 0.5 ** (age / 45);
    num += w * t[key]; den += w;
  }
  const score = num / den;
  const half = Math.max(2, 1 / Math.sqrt(den));
  return { ...est, score, lo: Math.max(130, score - half * 1.28), hi: Math.min(170, score + half * 1.28), blended: true };
}

export function predict(responses = state.responses) {
  const V = blendOfficial('V', sectionEstimate('V', responses));
  const Q = blendOfficial('Q', sectionEstimate('Q', responses));
  const total = V.score + Q.score;
  const half = Math.sqrt(((V.hi - V.lo) / 2) ** 2 + ((Q.hi - Q.lo) / 2) ** 2);
  const enough = Math.min(V.n, Q.n) >= 15 || V.blended || Q.blended;
  const level = !enough ? 'provisional' : half <= 4 ? 'alta' : half <= 7 ? 'media' : 'baja';
  return {
    V, Q,
    total: { score: total, lo: Math.max(260, total - half), hi: Math.min(340, total + half) },
    enough, level,
  };
}

// Puntaje de una sola sección o simulacro (sin mezclar con historial).
export function scoreSet(responses, sec) {
  const est = estimateTheta(responses.filter((r) => r.sec === sec), { halfLife: 0 });
  return Math.round(thetaToScore(est.theta, sec));
}

// Proyección con la regla práctica de ~40 horas por cada 5 puntos totales
// (PrepScholar), con rendimientos decrecientes cerca del máximo.
export function project(pred, hoursPerWeek, testDate) {
  if (!testDate) return null;
  const weeks = Math.max(0, (new Date(testDate + 'T12:00:00') - Date.now()) / (7 * 86400000));
  const hours = weeks * (hoursPerWeek || 0);
  const cur = pred.total.score;
  const room = Math.max(0, 340 - cur);
  const f = Math.min(1, Math.max(0.2, (338 - cur) / 28));
  const gain = Math.min(room * 0.8, (hours / 40) * 5 * f);
  const vRoom = 170 - pred.V.score; const qRoom = 170 - pred.Q.score;
  const share = vRoom + qRoom > 0 ? vRoom / (vRoom + qRoom) : 0.5;
  return { weeks, hours, gain, total: cur + gain, v: pred.V.score + gain * share, q: pred.Q.score + gain * (1 - share) };
}

// Clasificación de ajuste por escuela según tu GRE total y su selectividad.
export const FIT = {
  alcanzable: { label: 'Alcanzable', desc: 'Tu GRE supera su mediana' },
  objetivo: { label: 'Objetivo', desc: 'Tu GRE está en su rango' },
  reto: { label: 'Reto', desc: 'Tu GRE está por debajo o la escuela es muy selectiva' },
};

export function fitFor(school, pred) {
  if (!pred) return null;
  const total = Math.round(pred.total.score);
  const delta = total - school.gre.total;
  let cat = delta >= 3 ? 'alcanzable' : delta >= -3 ? 'objetivo' : 'reto';
  if (school.acceptance < 15) cat = cat === 'alcanzable' ? 'objetivo' : 'reto';
  const quantGap = school.gre.q && pred.Q.score < school.gre.q - 4;
  return { cat, delta, quantGap };
}

export function schoolsByFit(pred) {
  return SCHOOLS.map((s) => ({ s, f: fitFor(s, pred) }));
}

// Dominio por tema en los últimos 60 días.
export function mastery(responses = state.responses) {
  const cut = Date.now() - 60 * 86400000;
  const by = {};
  for (const r of responses) {
    if (r.ts < cut) continue;
    const k = `${r.sec}|${r.topic}`;
    by[k] = by[k] || { sec: r.sec, topic: r.topic, n: 0, c: 0, d: 0 };
    by[k].n++; by[k].c += r.c; by[k].d += r.d;
  }
  return Object.values(by).map((x) => ({ ...x, acc: x.c / x.n, avgD: x.d / x.n })).sort((a, b) => a.acc - b.acc);
}

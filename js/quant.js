// Generadores paramétricos de preguntas Quant estilo GRE.
// Cada generador recibe un RNG con semilla, así una pregunta se puede regenerar
// exactamente para el repaso de errores (id = g:<nombre>:<semilla>).

import { QUANT_EXTRA } from '../data/quant-extra.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
const C = (n, k) => fact(n) / (fact(k) * fact(n - k));
const P = (n, k) => fact(n) / fact(n - k);

export function fmt(n) {
  if (typeof n === 'string') return n;
  if (Number.isInteger(n)) return n.toLocaleString('en-US');
  return (Math.round(n * 100) / 100).toLocaleString('en-US');
}
function frac(n, d) {
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d) || 1;
  n /= g; d /= g;
  return d === 1 ? `${n}` : `${n}/${d}`;
}
const money = (n) => '$' + fmt(n);
const par = (n) => (n < 0 ? `(${n})` : `${n}`);
const pct = (n) => fmt(n) + '%';

// Construye una pregunta de opción múltiple con distractores únicos.
// Si faltan distractores, genera vecinos que conservan el formato (unidades, $, π, fracción).
function mc(correct, distractors) {
  const seen = new Set([String(correct)]);
  const out = [String(correct)];
  const add = (v) => { const s = String(v); if (!seen.has(s) && out.length < 5 && !/NaN|undefined|Infinity/.test(s)) { seen.add(s); out.push(s); } };
  distractors.forEach(add);
  const c = String(correct);
  const fm = c.match(/^(-?\d+)\/(\d+)$/);
  if (fm) {
    const n = Number(fm[1]); const d = Number(fm[2]);
    for (let k = 1; out.length < 5 && k < 12; k++) { add(frac(n + k, d)); add(frac(n, d + k)); if (n - k > 0) add(frac(n - k, d)); }
  } else {
    const m = c.match(/^(\D*?)(-?[\d,]*\.?\d+)(.*)$/);
    if (m) {
      const base = parseFloat(m[2].replace(/,/g, ''));
      const step = Math.abs(base) >= 100 ? Math.pow(10, Math.floor(Math.log10(Math.abs(base))) - 1) : 1;
      for (let k = 1; out.length < 5 && k < 20; k++) { add(m[1] + fmt(base + k * step) + m[3]); if (base - k * step >= 0) add(m[1] + fmt(base - k * step) + m[3]); }
    }
  }
  return { choices: out, answer: 0 };
}

const QC_CHOICES = [
  'Quantity A is greater.',
  'Quantity B is greater.',
  'The two quantities are equal.',
  'The relationship cannot be determined from the information given.',
];
const qcIdx = { A: 0, B: 1, C: 2, D: 3 };

// --------------------------------------------------------------------------
// Generadores
// --------------------------------------------------------------------------
const G = {};

G.pctChange = { topic: 'Porcentajes', type: 'mc', d: [1, 2], make(r) {
  const p = pick(r, [10, 15, 20, 25, 30, 40, 50, 60, 75]);
  const up = r() < 0.5;
  const old = ri(r, 2, 15) * 40;
  const neu = old * (1 + (up ? p : -p) / 100);
  const wrong = Math.round((Math.abs(neu - old) / neu) * 1000) / 10;
  const m = mc(pct(p), [pct(wrong), pct(p / 2), pct(p + 10), pct(100 - p)], 5);
  return { d: up ? 1 : 2, stem: `The price of a jacket changed from ${money(old)} to ${money(neu)}. By what percent did the price ${up ? 'increase' : 'decrease'}?`, ...m,
    exp: `Cambio porcentual = (cambio ÷ valor original) × 100 = ${fmt(Math.abs(neu - old))} ÷ ${fmt(old)} × 100 = ${p}%. Trampa común: dividir entre el valor nuevo.` };
} };

G.successive = { topic: 'Porcentajes', type: 'mc', d: [3], make(r) {
  const a = pick(r, [10, 20, 25, 30, 40, 50]);
  const b = pick(r, [10, 20, 25, 30, 40, 50]);
  const net = Math.round(((1 + a / 100) * (1 - b / 100) - 1) * 1000) / 10;
  const label = net === 0 ? 'no net change' : net > 0 ? `a ${fmt(net)}% increase` : `a ${fmt(-net)}% decrease`;
  const alt = (v) => (v === 0 ? 'no net change' : v > 0 ? `a ${fmt(v)}% increase` : `a ${fmt(-v)}% decrease`);
  const m = mc(label, [alt(a - b), alt(b - a), alt(-net), alt(Math.round((net + 5) * 10) / 10), alt(Math.round((net - 5) * 10) / 10), alt(Math.round((net + 10) * 10) / 10), alt(Math.round((net - 10) * 10) / 10), alt(a), alt(-b)]);
  return { stem: `A stock’s price rose by ${a}% in March and then fell by ${b}% in April. Over the two months, the price experienced`, ...m,
    exp: `Multiplica factores: (1 + ${a / 100}) × (1 − ${b / 100}) = ${fmt(Math.round((1 + a / 100) * (1 - b / 100) * 1000) / 1000)}. Cambio neto: ${fmt(net)}%. Los porcentajes no se suman.` };
} };

G.ratio = { topic: 'Razones', type: 'mc', d: [2], make(r) {
  let a, b;
  do { a = ri(r, 2, 7); b = ri(r, 2, 9); } while (a === b || gcd(a, b) !== 1);
  const k = ri(r, 3, 12);
  const N = (a + b) * k;
  const m = mc(a * k, [b * k, Math.round(N / a), k, (a + b) * a]);
  return { stem: `In a cohort of ${N} MBA students, the ratio of engineers to non-engineers is ${a} to ${b}. How many students in the cohort are engineers?`, ...m,
    exp: `Hay ${a} + ${b} = ${a + b} partes; cada parte vale ${N} ÷ ${a + b} = ${k}. Ingenieros: ${a} × ${k} = ${a * k}.` };
} };

G.weightedAvg = { topic: 'Promedios', type: 'numeric', d: [3], make(r) {
  let n1, n2, m1, m2, avg;
  for (let i = 0; i < 200; i++) {
    n1 = ri(r, 2, 12) * 5; n2 = ri(r, 2, 12) * 5; m1 = ri(r, 60, 95); m2 = ri(r, 60, 95);
    avg = (n1 * m1 + n2 * m2) / (n1 + n2);
    if (Number.isInteger(avg) && m1 !== m2) break;
  }
  return { stem: `A section of ${n1} students had an average score of ${m1} on an exam, and another section of ${n2} students had an average score of ${m2}. What was the average score of all ${n1 + n2} students?`, answer: { value: avg },
    exp: `Promedio ponderado = (${n1}·${m1} + ${n2}·${m2}) ÷ ${n1 + n2} = ${fmt(n1 * m1 + n2 * m2)} ÷ ${n1 + n2} = ${avg}. No promedies ${m1} y ${m2} directamente.` };
} };

G.avgMissing = { topic: 'Promedios', type: 'numeric', d: [2], make(r) {
  const n = ri(r, 4, 9); const m = ri(r, 10, 40); const m2 = m + ri(r, 1, 4);
  const x = m2 * (n + 1) - m * n;
  return { stem: `The average (arithmetic mean) of ${n} numbers is ${m}. When one more number is added to the list, the average becomes ${m2}. What number was added?`, answer: { value: x },
    exp: `Suma original = ${n}·${m} = ${n * m}. Suma nueva = ${n + 1}·${m2} = ${(n + 1) * m2}. Número agregado = ${(n + 1) * m2} − ${n * m} = ${x}.` };
} };

G.linear = { topic: 'Ecuaciones', type: 'mc', d: [1], make(r) {
  const a = ri(r, 2, 9); const x = ri(r, -8, 12); const b = ri(r, -20, 20);
  const c = a * x + b;
  const bs = b >= 0 ? `+ ${b}` : `− ${-b}`;
  const m = mc(x, [x + 1, -x, (c + b) / a, x - 2].map((v) => (Number.isInteger(v) ? v : fmt(v))));
  return { stem: `If ${a}x ${bs} = ${c}, what is the value of x?`, ...m,
    exp: `${a}x = ${c} ${b >= 0 ? '−' : '+'} ${Math.abs(b)} = ${c - b}, así que x = ${c - b} ÷ ${a} = ${x}.` };
} };

G.system = { topic: 'Ecuaciones', type: 'mc', d: [2, 3], make(r) {
  const x = ri(r, 2, 15); const y = ri(r, 1, 12);
  const s = x + y; const d = x - y;
  const ask = r() < 0.5 ? 'xy' : 'x';
  if (ask === 'x') {
    const m = mc(x, [y, s, d, (s + d)]);
    return { d: 2, stem: `If x + y = ${s} and x − y = ${d}, what is the value of x?`, ...m,
      exp: `Suma las ecuaciones: 2x = ${s + d}, x = ${x}.` };
  }
  const m = mc(x * y, [x + y, x * y + x, s * d, x * x - y * y]);
  return { d: 3, stem: `If x + y = ${s} and x − y = ${d}, what is the value of xy?`, ...m,
    exp: `x = (${s} + ${d}) ÷ 2 = ${x} y y = ${y}, así que xy = ${x * y}.` };
} };

G.quadratic = { topic: 'Ecuaciones', type: 'mc', d: [3], make(r) {
  let r1, r2;
  do { r1 = ri(r, -9, 9); r2 = ri(r, -9, 9); } while (r1 === r2 || r1 === 0 || r2 === 0);
  const B = -(r1 + r2); const Cc = r1 * r2;
  const term = (v, s) => (v === 0 ? '' : ` ${v > 0 ? '+' : '−'} ${Math.abs(v) === 1 && s ? '' : Math.abs(v)}${s}`);
  const eq = `x<sup>2</sup>${term(B, 'x')}${term(Cc, '')} = 0`;
  const diff = Math.abs(r1 - r2);
  const m = mc(diff, [Math.abs(r1 + r2), Math.abs(Cc), diff + 2, Math.max(Math.abs(r1), Math.abs(r2))]);
  return { stem: `What is the positive difference between the two solutions of ${eq}?`, ...m,
    exp: `Factoriza: (x ${r1 > 0 ? '−' : '+'} ${Math.abs(r1)})(x ${r2 > 0 ? '−' : '+'} ${Math.abs(r2)}) = 0, soluciones ${r1} y ${r2}. Diferencia = ${diff}.` };
} };

G.exponent = { topic: 'Exponentes', type: 'mc', d: [3, 4], make(r) {
  const v = ri(r, 0, 2);
  if (v === 0) {
    const a = ri(r, 2, 9); const b = ri(r, 2, 9); const n = a + 2 * b;
    const m = mc(n, [a + b, 2 * a + b, a * b * 2, n + 2]);
    return { d: 3, stem: `If 2<sup>${a}</sup> · 4<sup>${b}</sup> = 2<sup>n</sup>, what is the value of n?`, ...m,
      exp: `4<sup>${b}</sup> = 2<sup>${2 * b}</sup>, así que 2<sup>${a}</sup> · 2<sup>${2 * b}</sup> = 2<sup>${n}</sup>.` };
  }
  if (v === 1) {
    const n = ri(r, 5, 20);
    const m = mc(`3<sup>${n + 1}</sup>`, [`3<sup>${3 * n}</sup>`, `9<sup>${n}</sup>`, `3<sup>${n + 3}</sup>`, `27<sup>${n}</sup>`]);
    return { d: 3, stem: `3<sup>${n}</sup> + 3<sup>${n}</sup> + 3<sup>${n}</sup> =`, ...m,
      exp: `Sumar tres veces 3<sup>${n}</sup> es 3 · 3<sup>${n}</sup> = 3<sup>${n + 1}</sup>. Sumar no multiplica exponentes.` };
  }
  const k = ri(r, 6, 30); const base = pick(r, [2, 5, 7]);
  const qbCoef = base - 1;
  return { type: 'qc', d: 4, qa: `${base}<sup>${k + 1}</sup> − ${base}<sup>${k}</sup>`, qb: `${qbCoef} · ${base}<sup>${k}</sup>`, stem: 'k = ' + k, choices: QC_CHOICES, answer: qcIdx.C,
    exp: `Factoriza ${base}<sup>${k}</sup>: ${base}<sup>${k}</sup>(${base} − 1) = ${qbCoef} · ${base}<sup>${k}</sup>. Son iguales.` };
} };

G.remainder = { topic: 'Números', type: 'mc', d: [3], make(r) {
  const dv = ri(r, 5, 9); const rem = ri(r, 1, dv - 1); const k = ri(r, 2, 6); const c = ri(r, 1, 9);
  const ans = (k * rem + c) % dv;
  const opts = [...Array(dv).keys()].filter((v) => v !== ans).slice(0, 4);
  const m = mc(ans, [rem, (rem + c) % dv, ...opts]);
  return { stem: `When the positive integer n is divided by ${dv}, the remainder is ${rem}. What is the remainder when ${k}n + ${c} is divided by ${dv}?`, ...m,
    exp: `Prueba n = ${rem}: ${k}·${rem} + ${c} = ${k * rem + c}, y ${k * rem + c} ÷ ${dv} deja residuo ${ans}. Elegir números concretos es una técnica clave.` };
} };

G.divisors = { topic: 'Números', type: 'numeric', d: [4], make(r) {
  const opts = [[2, 3, 3, 2], [2, 4, 3, 1], [2, 2, 5, 2], [2, 3, 5, 1], [3, 2, 5, 2], [2, 5, 3, 1], [2, 2, 7, 2], [2, 4, 5, 1]];
  const [p, a, q, b] = pick(r, opts);
  const N = p ** a * q ** b;
  return { stem: `How many positive divisors does ${fmt(N)} have?`, answer: { value: (a + 1) * (b + 1) },
    exp: `${fmt(N)} = ${p}<sup>${a}</sup> · ${q}<sup>${b}</sup>. Número de divisores = (${a} + 1)(${b} + 1) = ${(a + 1) * (b + 1)}.` };
} };

G.work = { topic: 'Tasas', type: 'mc', d: [3], make(r) {
  const [a, b, t] = pick(r, [[3, 6, 2], [4, 12, 3], [6, 12, 4], [10, 15, 6], [12, 24, 8], [20, 30, 12], [6, 30, 5], [9, 18, 6]]);
  const m = mc(`${t} hours`, [`${(a + b) / 2} hours`, `${a + b} hours`, `${b - a} hours`, `${t + 1} hours`]);
  return { stem: `Machine A can process a batch of steel coils in ${a} hours, and Machine B can process the same batch in ${b} hours. Working together at these constant rates, how long will the two machines take to process one batch?`, ...m,
    exp: `Tasas: 1/${a} + 1/${b} = ${frac(a + b, a * b)} de lote por hora. Tiempo = ${a}·${b} ÷ (${a} + ${b}) = ${t} horas.` };
} };

G.roundTrip = { topic: 'Tasas', type: 'mc', d: [4], make(r) {
  const [v1, v2, avg] = pick(r, [[30, 60, 40], [40, 60, 48], [20, 30, 24], [45, 90, 60], [60, 90, 72], [40, 120, 60]]);
  const m = mc(`${avg} km/h`, [`${(v1 + v2) / 2} km/h`, `${avg + 4} km/h`, `${v1} km/h`, `${Math.round((v1 * v2) / (v1 + v2))} km/h`]);
  return { stem: `A truck drives from Monterrey to a plant at an average speed of ${v1} km/h and returns along the same route at ${v2} km/h. What is the truck’s average speed for the round trip?`, ...m,
    exp: `Velocidad promedio = distancia total ÷ tiempo total = 2·${v1}·${v2} ÷ (${v1} + ${v2}) = ${avg}. La trampa es promediar las velocidades (${(v1 + v2) / 2}).` };
} };

G.interest = { topic: 'Porcentajes', type: 'mc', d: [3], make(r) {
  const Pp = ri(r, 1, 9) * 1000; const rate = pick(r, [10, 20]);
  const amt = Pp * (1 + rate / 100) ** 2; const intr = Math.round(amt - Pp);
  const m = mc(money(intr), [money((Pp * rate * 2) / 100), money(Math.round(amt)), money((Pp * rate) / 100), money(intr + 100)]);
  return { stem: `An investment of ${money(Pp)} earns ${rate}% annual interest, compounded annually. How much interest will it have earned at the end of 2 years?`, ...m,
    exp: `Monto = ${fmt(Pp)} × ${fmt(1 + rate / 100)}<sup>2</sup> = ${fmt(amt)}. Interés = ${fmt(intr)}. El interés simple daría ${fmt((Pp * rate * 2) / 100)}.` };
} };

G.combos = { topic: 'Combinatoria', type: 'mc', d: [3, 4], make(r) {
  if (r() < 0.5) {
    const n = ri(r, 6, 10); const k = ri(r, 2, 4);
    const m = mc(C(n, k), [P(n, k), n * k, C(n, k - 1), C(n, k) * 2]);
    return { d: 3, stem: `A team of ${k} analysts is to be chosen from ${n} candidates. How many different teams are possible?`, ...m,
      exp: `El orden no importa: C(${n}, ${k}) = ${n}! ÷ (${k}!·${n - k}!) = ${C(n, k)}. Si importara el orden serían ${P(n, k)}.` };
  }
  const [word, total, note] = pick(r, [['STEEL', 60, 'E se repite 2 veces: 5!/2!'], ['ALLOY', 60, 'L se repite 2 veces: 5!/2!'], ['METAL', 120, 'sin repeticiones: 5!'], ['ANNEAL', 180, 'A y N se repiten 2 veces: 6!/(2!·2!)'], ['BILLET', 360, 'L se repite 2 veces: 6!/2!']]);
  const m = mc(total, [fact(word.length), total / 2, total * 2, fact(word.length - 1)]);
  return { d: 4, stem: `How many distinct arrangements of the letters in the word ${word} are possible?`, ...m,
    exp: `Permutaciones con repetición: ${note} = ${total}.` };
} };

G.prob = { topic: 'Probabilidad', type: 'mc', d: [3, 4], make(r) {
  if (r() < 0.55) {
    const red = ri(r, 3, 6); const blue = ri(r, 3, 8); const n = red + blue;
    const ans = frac(red * (red - 1), n * (n - 1));
    const m = mc(ans, [frac(red * red, n * n), frac(red, n), frac(red - 1, n - 1), frac(red * (red - 1), n * n)]);
    return { d: 4, stem: `A box contains ${red} red chips and ${blue} blue chips. If two chips are drawn at random without replacement, what is the probability that both are red?`, ...m,
      exp: `(${red}/${n}) × (${red - 1}/${n - 1}) = ${ans}. Sin reemplazo, la segunda probabilidad cambia.` };
  }
  const s = ri(r, 3, 11);
  const ways = 6 - Math.abs(7 - s);
  const ans = frac(ways, 36);
  const m = mc(ans, [frac(1, 11), frac(ways, 11), frac(ways + 1, 36), frac(ways, 18), frac(1, 36), frac(1, 6)]);
  return { d: 3, stem: `Two fair six-sided dice are rolled. What is the probability that the sum of the numbers rolled is ${s}?`, ...m,
    exp: `Hay 36 resultados igualmente probables; ${ways} suman ${s}. Probabilidad = ${ans}.` };
} };

G.rightTriangle = { topic: 'Geometría', type: 'mc', d: [2], make(r) {
  const [a, b, c] = pick(r, [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]]);
  const k = ri(r, 1, 4);
  const A = a * k; const B = b * k; const Cc = c * k;
  if (r() < 0.5) {
    const m = mc(Cc, [A + B, Cc + k, Math.round(Math.sqrt(A * B) * 10) / 10, B + 1]);
    return { stem: `A right triangle has legs of length ${A} and ${B}. What is the length of its hypotenuse?`, ...m,
      exp: `Pitágoras: √(${A}² + ${B}²) = √${A * A + B * B} = ${Cc}. Es la terna ${a}-${b}-${c} multiplicada por ${k}.` };
  }
  const m = mc((A * B) / 2, [A * B, A + B + Cc, (A * Cc) / 2, (A * B) / 4]);
  return { stem: `A right triangle has a hypotenuse of length ${Cc} and one leg of length ${A}. What is the area of the triangle?`, ...m,
    exp: `El otro cateto es √(${Cc}² − ${A}²) = ${B}. Área = ${A}·${B} ÷ 2 = ${(A * B) / 2}.` };
} };

G.circle = { topic: 'Geometría', type: 'mc', d: [3], make(r) {
  const rad = ri(r, 2, 9);
  if (r() < 0.5) {
    const m = mc(2 * rad * rad, [4 * rad * rad, rad * rad, Math.round(Math.PI * rad * rad), 2 * rad]);
    return { stem: `A square is inscribed in a circle of radius ${rad}. What is the area of the square?`, ...m,
      exp: `La diagonal del cuadrado es el diámetro, ${2 * rad}. Lado = ${2 * rad}/√2, área = (diagonal²)/2 = ${2 * rad * rad}.` };
  }
  const circ = 2 * rad;
  const m = mc(`${rad * rad}π`, [`${2 * rad * rad}π`, `${circ}π`, `${rad}π`, `${(rad * rad) / 2}π`]);
  return { stem: `A circle has a circumference of ${circ}π. What is the area of the circle?`, ...m,
    exp: `2πr = ${circ}π → r = ${rad}. Área = πr² = ${rad * rad}π.` };
} };

G.slope = { topic: 'Coordenadas', type: 'mc', d: [2], make(r) {
  let x1, y1, x2, y2;
  do { x1 = ri(r, -6, 6); y1 = ri(r, -6, 6); x2 = ri(r, -6, 8); y2 = ri(r, -6, 8); } while (x1 === x2 || y1 === y2);
  const s = frac(y2 - y1, x2 - x1);
  const m = mc(s, [frac(x2 - x1, y2 - y1), frac(-(y2 - y1), x2 - x1), frac(y2 + y1, x2 + x1 || 1), frac(y2 - y1 + 1, x2 - x1)]);
  return { stem: `In the xy-plane, what is the slope of the line that passes through the points (${x1}, ${y1}) and (${x2}, ${y2})?`, ...m,
    exp: `Pendiente = (y₂ − y₁)/(x₂ − x₁) = (${y2} − ${par(y1)})/(${x2} − ${par(x1)}) = ${s}.` };
} };

G.box = { topic: 'Geometría', type: 'mc', d: [2], make(r) {
  const l = ri(r, 2, 9); const w = ri(r, 2, 8); const h = ri(r, 2, 7);
  const sa = 2 * (l * w + l * h + w * h);
  const m = mc(sa, [l * w * h, l * w + l * h + w * h, 4 * (l + w + h), sa + 2 * l]);
  return { stem: `A rectangular box has dimensions ${l} by ${w} by ${h}. What is its total surface area?`, ...m,
    exp: `Superficie = 2(${l}·${w} + ${l}·${h} + ${w}·${h}) = ${sa}. El volumen sería ${l * w * h}.` };
} };

G.sdQC = { topic: 'Estadística', type: 'qc', d: [4], make(r) {
  const a = ri(r, 1, 10); const k = ri(r, 2, 5);
  const A = [0, 1, 2, 3, 4].map((i) => a + i * k);
  if (r() < 0.5) {
    const c = ri(r, 5, 40);
    const B = A.map((x) => x + c);
    return { stem: `Set A: {${A.join(', ')}}<br>Set B: {${B.join(', ')}}`, qa: 'The standard deviation of set A', qb: 'The standard deviation of set B', choices: QC_CHOICES, answer: qcIdx.C,
      exp: `B es A desplazado ${c} unidades. Sumar una constante no cambia la dispersión: desviaciones iguales.` };
  }
  const B = A.map((x) => x * 2);
  return { stem: `Set A: {${A.join(', ')}}<br>Set B: {${B.join(', ')}}`, qa: 'The standard deviation of set A', qb: 'The standard deviation of set B', choices: QC_CHOICES, answer: qcIdx.B,
    exp: 'Multiplicar por 2 duplica las distancias al promedio: la desviación estándar de B es el doble.' };
} };

G.qcAlgebra = { topic: 'Álgebra', type: 'qc', d: [3, 4, 5], make(r) {
  const v = ri(r, 0, 8);
  const T = [
    { d: 3, stem: '0 < x < 1', qa: 'x<sup>2</sup>', qb: 'x', ans: 'B', exp: 'Una fracción positiva al cuadrado se hace más pequeña (0.5² = 0.25).' },
    { d: 3, stem: 'x < 0', qa: 'x<sup>3</sup>', qb: 'x<sup>2</sup>', ans: 'B', exp: 'Con x negativo, x³ es negativo y x² positivo.' },
    { d: 5, stem: 'x ≠ 0', qa: 'x<sup>2</sup>', qb: '|x|', ans: 'D', exp: 'Con x = 0.5, x² < |x|; con x = 2, x² > |x|; con x = 1 son iguales. No se puede determinar.' },
    { d: 3, stem: 'a > b > 0', qa: 'a/b', qb: 'b/a', ans: 'A', exp: 'a/b > 1 y b/a < 1.' },
    { d: 4, stem: 'x and y are positive and x/y = 3/4.', qa: 'x', qb: 'y', ans: 'B', exp: 'x = 0.75y, y como y > 0, x < y.' },
    { d: 4, stem: 'n is an integer.', qa: 'The remainder when n<sup>2</sup> + n is divided by 2', qb: '0', ans: 'C', exp: 'n² + n = n(n + 1) es producto de enteros consecutivos: siempre par.' },
    { d: 3, stem: 'x > 1', qa: '1/x', qb: '1/x<sup>2</sup>', ans: 'A', exp: 'Si x > 1, x² > x, así que 1/x² < 1/x.' },
    { d: 5, stem: 'x is a real number.', qa: '(x + 3)<sup>2</sup>', qb: 'x<sup>2</sup> + 9', ans: 'D', exp: '(x + 3)² = x² + 6x + 9. Depende del signo de x: positivo → A, negativo → B, cero → iguales.' },
    { d: 3, stem: 'x + y = 10 and x − y = 2', qa: 'x', qb: '2y', ans: 'B', exp: 'x = 6 y y = 4, así que 2y = 8 > 6.' },
  ][v];
  return { d: T.d, stem: T.stem, qa: T.qa, qb: T.qb, choices: QC_CHOICES, answer: qcIdx[T.ans], exp: T.exp };
} };

G.qcNumbers = { topic: 'Números', type: 'qc', d: [3, 4], make(r) {
  const n = ri(r, 12, 60);
  if (r() < 0.5) {
    const sum = (n * (n + 1)) / 2;
    const qb = sum + pick(r, [-n, -1, 0, 1, n]);
    const ans = sum > qb ? 'A' : sum < qb ? 'B' : 'C';
    return { d: 3, stem: '', qa: `The sum of all the integers from 1 to ${n}, inclusive`, qb: `${fmt(qb)}`, choices: QC_CHOICES, answer: qcIdx[ans],
      exp: `Suma de 1 a n = n(n + 1)/2 = ${n}·${n + 1}/2 = ${fmt(sum)}, comparado con ${fmt(qb)}.` };
  }
  const pctV = pick(r, [20, 25, 40, 50]); const of = n * 4;
  const qa = (pctV / 100) * of;
  return { d: 4, stem: '', qa: `${pctV}% of ${of}`, qb: `${of}% of ${pctV}`, choices: QC_CHOICES, answer: qcIdx.C,
    exp: `x% de y = y% de x, porque ambos son x·y/100. Los dos valen ${fmt(qa)}.` };
} };

G.di = { topic: 'Interpretación de datos', type: 'mc', d: [3], make(r) {
  const names = ['Flat steel', 'Long steel', 'Pipes', 'Coated'];
  const y1 = names.map(() => ri(r, 8, 40) * 10);
  const gPool = [-10, 5, 10, 15, 20, 25, 30, 40, 50];
  const g = names.map(() => gPool.splice(Math.floor(r() * gPool.length), 1)[0]);
  const y2 = y1.map((v, i) => Math.round(v * (1 + g[i] / 100)));
  const table = `<table class="qtable"><caption>Revenue by division (millions of USD)</caption><thead><tr><th>Division</th><th>2024</th><th>2025</th></tr></thead><tbody>${names.map((n, i) => `<tr><td>${n}</td><td>${y1[i]}</td><td>${y2[i]}</td></tr>`).join('')}</tbody></table>`;
  if (r() < 0.5) {
    const pc = y2.map((v, i) => (v - y1[i]) / y1[i]);
    let best = 0; pc.forEach((p, i) => { if (p > pc[best]) best = i; });
    const absInc = y2.map((v, i) => v - y1[i]);
    let bestAbs = 0; absInc.forEach((p, i) => { if (p > absInc[bestAbs]) bestAbs = i; });
    const others = names.filter((_, i) => i !== best);
    return { stem: `${table}Which division had the greatest percent increase in revenue from 2024 to 2025?`, choices: [names[best], ...others], answer: 0,
      exp: `Calcula (2025 − 2024) ÷ 2024 para cada una: ${names.map((n, i) => `${n} ${fmt(Math.round(pc[i] * 1000) / 10)}%`).join(', ')}.${bestAbs !== best ? ` Ojo: el mayor aumento absoluto fue ${names[bestAbs]}, no el mayor porcentual.` : ''}` };
  }
  const tot = y2.reduce((a, b) => a + b, 0); const i = ri(r, 0, 3);
  const share = Math.round((y2[i] / tot) * 100);
  const m = mc(`${share}%`, [`${share + 5}%`, `${share - 5}%`, `${Math.round((y1[i] / y1.reduce((a, b) => a + b, 0)) * 100) + 8}%`, `${share + 10}%`]);
  return { stem: `${table}In 2025, the revenue of the ${names[i]} division was approximately what percent of the total revenue of the four divisions?`, ...m,
    exp: `${y2[i]} ÷ ${tot} ≈ ${share}%. Estima redondeando antes de calcular.` };
} };

G.stats = { topic: 'Estadística', type: 'mc', d: [1, 2], make(r) {
  const L = Array.from({ length: 7 }, () => ri(r, 2, 40));
  const s = [...L].sort((a, b) => a - b);
  const ask = pick(r, ['median', 'range']);
  if (ask === 'median') {
    const m = mc(s[3], [L[3], Math.round(L.reduce((a, b) => a + b, 0) / 7), s[2], s[4]]);
    return { d: 1, stem: `What is the median of the following list? ${L.join(', ')}`, ...m,
      exp: `Ordena: ${s.join(', ')}. El valor central (4º de 7) es ${s[3]}.` };
  }
  const m = mc(s[6] - s[0], [s[6], s[5] - s[1], s[6] - s[1], L[6] - L[0]]);
  return { d: 2, stem: `What is the range of the following list? ${L.join(', ')}`, ...m,
    exp: `Rango = máximo − mínimo = ${s[6]} − ${s[0]} = ${s[6] - s[0]}.` };
} };

G.absIneq = { topic: 'Desigualdades', type: 'mc', d: [3, 4], make(r) {
  const a = ri(r, -5, 8); const b = ri(r, 2, 7);
  const strict = r() < 0.5;
  const count = strict ? 2 * b - 1 : 2 * b + 1;
  const m = mc(count, [strict ? 2 * b + 1 : 2 * b - 1, 2 * b, b, count + 2]);
  return { d: strict ? 3 : 4, stem: `How many integers x satisfy |x − ${a}| ${strict ? '<' : '≤'} ${b}?`, ...m,
    exp: `${a - b} ${strict ? '<' : '≤'} x ${strict ? '<' : '≤'} ${a + b}. Enteros: ${strict ? `de ${a - b + 1} a ${a + b - 1}` : `de ${a - b} a ${a + b}`}, total ${count}.` };
} };

G.venn = { topic: 'Conjuntos', type: 'numeric', d: [2], make(r) {
  const T = ri(r, 8, 20) * 10; const both = ri(r, 5, 25); const A = both + ri(r, 10, 40); const B = both + ri(r, 10, 40);
  const neither = T - (A + B - both);
  if (neither < 0) return G.venn.make(r);
  return { stem: `Of the ${T} employees at a plant, ${A} speak English, ${B} speak Portuguese, and ${both} speak both languages. How many employees speak neither language?`, answer: { value: neither },
    exp: `Al menos uno = ${A} + ${B} − ${both} = ${A + B - both}. Ninguno = ${T} − ${A + B - both} = ${neither}.` };
} };

G.multiRange = { topic: 'Desigualdades', type: 'multi', d: [4, 5], make(r) {
  const p = ri(r, 2, 4); const q = ri(r, -3, 5);
  const lo = ri(r, -2, 3); const hi = lo + ri(r, 3, 5);
  const L = p * lo + q; const H = p * hi + q;
  const cands = [lo - 1, lo, lo + 1, hi - 1, hi, hi + 1];
  const uniq = [...new Set(cands)];
  const ok = (x) => p * x + q > L && p * x + q < H;
  const answer = uniq.map((x, i) => (ok(x) ? i : -1)).filter((i) => i >= 0);
  const qs = q >= 0 ? `+ ${q}` : `− ${-q}`;
  return { d: 5, stem: `If ${L} < ${p}x ${qs} < ${H}, which of the following could be the value of x? Select all that apply.`, choices: uniq.map(String), answer,
    exp: `${q >= 0 ? `Resta ${q}` : `Suma ${-q}`} y divide entre ${p}: ${lo} < x < ${hi}. Válidos: ${uniq.filter(ok).join(', ')}. Los extremos no cuentan porque la desigualdad es estricta.` };
} };

G.func = { topic: 'Funciones', type: 'mc', d: [2, 3], make(r) {
  if (r() < 0.5) {
    const a = ri(r, 1, 4); const b = ri(r, -5, 6);
    const f = (x) => a * x * x + b;
    const ans = f(f(1));
    const bs = b >= 0 ? `+ ${b}` : `− ${-b}`;
    const m = mc(ans, [f(1), f(2), f(1) * f(1), ans + a]);
    return { d: 3, stem: `If f(x) = ${a === 1 ? '' : a}x<sup>2</sup> ${bs}, what is f(f(1))?`, ...m,
      exp: `f(1) = ${f(1)}. f(${f(1)}) = ${a}·${f(1)}² ${bs} = ${ans}.` };
  }
  const x = ri(r, 2, 6); const y = ri(r, 1, 5);
  const op = (u, v) => u * u - u * v;
  const ans = op(op(x, y), 1);
  const m = mc(ans, [op(x, y), op(y, x), ans + 2, op(x, y) * 2]);
  return { d: 2, stem: `For all numbers u and v, the operation ◆ is defined by u ◆ v = u<sup>2</sup> − uv. What is (${x} ◆ ${y}) ◆ 1?`, ...m,
    exp: `${x} ◆ ${y} = ${x * x} − ${x * y} = ${op(x, y)}. Después ${op(x, y)} ◆ 1 = ${op(x, y) ** 2} − ${op(x, y)} = ${ans}.` };
} };

G.seq = { topic: 'Secuencias', type: 'numeric', d: [3], make(r) {
  const a1 = ri(r, -5, 12); const d = ri(r, 2, 7); const n = ri(r, 10, 30);
  if (r() < 0.5) {
    return { stem: `In an arithmetic sequence, the first term is ${a1} and each term after the first is ${d} more than the previous term. What is the ${n}th term?`, answer: { value: a1 + (n - 1) * d },
      exp: `aₙ = a₁ + (n − 1)d = ${a1} + ${n - 1}·${d} = ${a1 + (n - 1) * d}.` };
  }
  const sum = (n * (2 * a1 + (n - 1) * d)) / 2;
  return { stem: `In an arithmetic sequence, the first term is ${a1} and the common difference is ${d}. What is the sum of the first ${n} terms?`, answer: { value: sum },
    exp: `Suma = n(a₁ + aₙ)/2 = ${n}(${a1} + ${a1 + (n - 1) * d})/2 = ${fmt(sum)}.` };
} };

G.parity = { topic: 'Números', type: 'mc', d: [2], make(r) {
  const variants = [
    { stem: 'If n is an odd integer, which of the following must be even?', choices: ['n + 1', 'n<sup>2</sup>', '2n + 1', 'n<sup>3</sup>', 'n<sup>2</sup> + 2'], exp: 'Impar + 1 = par. Las demás son impares (impar² es impar; 2n + 1 es impar).' },
    { stem: 'If m is an even integer and k is an odd integer, which of the following must be odd?', choices: ['m + k', 'mk', 'm<sup>2</sup>', '2k', 'k − 1'], exp: 'Par + impar = impar. mk es par porque m es par.' },
    { stem: 'If x is a positive integer, which of the following must be divisible by 6?', choices: ['x(x + 1)(x + 2)', 'x(x + 1)', '6x + 3', 'x + 6', '3x(x + 2)'], exp: 'Tres enteros consecutivos incluyen un múltiplo de 2 y uno de 3.' },
  ];
  const v = pick(r, variants);
  return { stem: v.stem, choices: v.choices, answer: 0, exp: v.exp };
} };

G.mixture = { topic: 'Porcentajes', type: 'numeric', d: [4], make(r) {
  let x, y, a, b, c;
  for (let i = 0; i < 300; i++) {
    x = ri(r, 2, 12) * 5; y = ri(r, 2, 12) * 5; a = pick(r, [10, 20, 30, 40]); b = pick(r, [50, 60, 70, 80]);
    c = (x * a + y * b) / (x + y);
    if (Number.isInteger(c)) break;
  }
  return { stem: `${x} liters of a ${a}% acid solution are mixed with ${y} liters of a ${b}% acid solution. What is the acid concentration, in percent, of the resulting mixture?`, answer: { value: c },
    exp: `Ácido total = ${x}·${a / 100} + ${y}·${b / 100} = ${fmt((x * a + y * b) / 100)} L de ${x + y} L → ${c}%.` };
} };

G.unitsDigit = { topic: 'Números', type: 'mc', d: [4], make(r) {
  const base = pick(r, [2, 3, 7, 8]); const n = ri(r, 21, 99);
  const cyc = { 2: [2, 4, 8, 6], 3: [3, 9, 7, 1], 7: [7, 9, 3, 1], 8: [8, 4, 2, 6] }[base];
  const ans = cyc[(n - 1) % 4];
  const m = mc(ans, cyc.filter((d) => d !== ans).concat([5, 0]));
  const res = n % 4;
  return { stem: `What is the units digit of ${base}<sup>${n}</sup>?`, ...m,
    exp: `Las unidades de ${base}ⁿ siguen el ciclo ${cyc.join(', ')} (periodo 4). ${n} ÷ 4 deja residuo ${res}, así que toca la posición ${res === 0 ? 4 : res} del ciclo: ${ans}.` };
} };

G.extra = { topic: 'Mixto', type: 'extra', d: [3, 4, 5], make(r) {
  const q = pick(r, QUANT_EXTRA);
  return { ...q, extraId: q.id };
} };

export const GENERATORS = G;
export const QUANT_TOPICS = [...new Set(Object.values(G).map((g) => g.topic))].filter((t) => t !== 'Mixto');

// Crea una pregunta a partir de un generador y una semilla.
export function makeQuant(genName, seed) {
  const g = G[genName];
  const r = mulberry32(seed);
  const q = g.make(r);
  const type = q.type || g.type;
  const d = q.d || g.d[0];
  const topic = q.topic || g.topic;
  return { id: q.extraId ? `x:${q.extraId}` : `g:${genName}:${seed}`, sec: 'Q', gen: genName, seed, type, d, topic, ...q, type, d, topic };
}

// Elige un generador que pueda producir algo cercano a la dificultad pedida.
export function randomQuant({ d = 3, type = null, topic = null, rng = Math.random } = {}) {
  const names = Object.keys(G).filter((n) => {
    const g = G[n];
    if (topic && g.topic !== topic) return false;
    if (type && g.type !== type && !(type === 'mc' && n === 'extra')) return false;
    return true;
  });
  // Intenta acercarse a la dificultad objetivo con varias muestras.
  let best = null;
  for (let i = 0; i < 14; i++) {
    const name = names[Math.floor(rng() * names.length)] || 'linear';
    const seed = Math.floor(rng() * 1e9);
    const q = makeQuant(name, seed);
    if (type && q.type !== type) continue;
    const dist = Math.abs(q.d - d);
    if (!best || dist < best.dist) best = { q, dist };
    if (dist === 0) break;
  }
  return best ? best.q : makeQuant('linear', Math.floor(rng() * 1e9));
}

export function regenerate(id) {
  if (id.startsWith('x:')) {
    const q = QUANT_EXTRA.find((e) => e.id === id.slice(2));
    if (q) return { ...q, id, sec: 'Q', topic: q.topic };
    return null;
  }
  const [, gen, seed] = id.split(':');
  if (!G[gen]) return null;
  return makeQuant(gen, Number(seed));
}

// Gráfica de líneas en SVG con cruz de lectura y tooltip (una sola escala Y).
const NS = 'http://www.w3.org/2000/svg';

export function lineChart(el, rows, { series, yMin, yMax, label = (r) => r.day } = {}) {
  el.innerHTML = '';
  if (rows.length < 2) {
    el.innerHTML = '<p class="empty-chart">La tendencia aparece cuando practiques al menos dos días distintos.</p>';
    return;
  }
  const W = Math.max(300, el.clientWidth || 600);
  const H = 240;
  const m = { t: 16, r: 64, b: 30, l: 36 };
  const iw = W - m.l - m.r; const ih = H - m.t - m.b;
  const x = (i) => m.l + (rows.length === 1 ? iw / 2 : (i / (rows.length - 1)) * iw);
  const y = (v) => m.t + ih - ((v - yMin) / (yMax - yMin)) * ih;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', W); svg.setAttribute('height', H);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Tendencia de ${series.map((s) => s.name).join(' y ')}`);
  let html = '';
  for (let v = yMin; v <= yMax; v += 10) {
    html += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  }
  const step = Math.max(1, Math.ceil(rows.length / 5));
  rows.forEach((r, i) => { if (i % step === 0 || i === rows.length - 1) html += `<text class="axis" x="${x(i)}" y="${H - 8}" text-anchor="middle">${label(r)}</text>`; });
  const ends = [];
  for (const s of series) {
    const d = rows.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(r[s.key]).toFixed(1)}`).join('');
    html += `<path d="${d}" fill="none" stroke="var(${s.color})" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    const last = rows[rows.length - 1][s.key];
    ends.push({ s, yy: y(last), v: last });
  }
  // Etiquetas directas al final, separadas si chocan.
  ends.sort((a, b) => a.yy - b.yy);
  for (let i = 1; i < ends.length; i++) if (ends[i].yy - ends[i - 1].yy < 16) ends[i].yy = ends[i - 1].yy + 16;
  for (const e of ends) {
    html += `<circle cx="${x(rows.length - 1)}" cy="${y(e.v)}" r="4" fill="var(${e.s.color})" stroke="var(--card)" stroke-width="2"/><text class="end-label" x="${x(rows.length - 1) + 10}" y="${e.yy + 4}">${e.s.name} ${Math.round(e.v)}</text>`;
  }
  html += `<line class="cross" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}" visibility="hidden"/>`;
  html += `<rect class="hit" x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="transparent"/>`;
  svg.innerHTML = html;
  el.appendChild(svg);
  const tip = document.createElement('div');
  tip.className = 'tip'; tip.hidden = true;
  el.appendChild(tip);
  const cross = svg.querySelector('.cross');
  const show = (clientX) => {
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * W;
    const i = Math.max(0, Math.min(rows.length - 1, Math.round(((px - m.l) / iw) * (rows.length - 1))));
    const r = rows[i];
    cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('visibility', 'visible');
    tip.hidden = false;
    tip.innerHTML = `<strong>${label(r)}</strong>${series.map((s) => `<span><i style="background:var(${s.color})"></i>${s.name}: ${Math.round(r[s.key])}</span>`).join('')}`;
    const left = (x(i) / W) * rect.width;
    tip.style.left = `${Math.min(rect.width - 150, Math.max(0, left + 12))}px`;
    tip.style.top = '8px';
  };
  svg.addEventListener('pointermove', (e) => show(e.clientX));
  svg.addEventListener('pointerdown', (e) => show(e.clientX));
  svg.addEventListener('pointerleave', () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); });
}

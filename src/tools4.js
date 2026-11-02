/* ================= Cubes (3D stacking, with top / front / side views) ================= */
(() => {
  const PAL = [C.blue, C.red, C.yellow, C.green];
  const NAMES = ['Blue', 'Red', 'Yellow', 'Green'];
  const SIZES = [3, 4, 5, 6];
  const MAXH = 8;
  const mix = (hex, t, to) => { const n = parseInt(hex.slice(1), 16); return '#' + [16, 8, 0].map(sh => Math.round(((n >> sh) & 255) * (1 - t) + to * t).toString(16).padStart(2, '0')).join(''); };
  const FACES = PAL.map(c => ({ top: mix(c.f, 0.38, 255), left: c.f, right: mix(c.f, 0.28, 0), line: c.s }));
  // Grid cell (i, j) as seen after turning the board r quarter turns.
  const turn = (i, j, n, r) => (r === 1 ? [n - 1 - j, i] : r === 2 ? [n - 1 - i, n - 1 - j] : r === 3 ? [j, n - 1 - i] : [i, j]);
  const count = d => d.cols.reduce((a, c) => a + c.length, 0);
  function viewsOf(d) {
    const n = d.n, top = new Set(), front = Array(n).fill(0), side = Array(n).fill(0);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const h = d.cols[j * n + i].length; if (!h) continue;
      const [u, v] = turn(i, j, n, d.view | 0);
      top.add(u + ',' + v); front[u] = Math.max(front[u], h); side[v] = Math.max(side[v], h);
    }
    return { top, front, side };
  }
  function lay(d) {
    const n = d.n, maxH = Math.max(4, ...d.cols.map(c => c.length));
    const panel = d.views && showVals() ? Math.min(150, 30 + Math.max(n, maxH) * 12) : 0;
    const top = -app.H / 2 + hudTop(), bottom = app.H / 2 - 16 - panel;
    const Hh = Math.max(120, bottom - top), W = app.W - 32;
    const s = Math.max(12, Math.min(W / (2 * n * 0.866 + 0.6), Hh / (n + maxH + 0.8)));
    const a = s * 0.866, b = s / 2, c = s, total = 2 * n * b + maxH * c;
    return { n, a, b, c, ox: 0, oy: top + (Hh - total) / 2 + maxH * c, maxH, panel, bottom };
  }
  const pts = arr => arr.map(p => `${r1(p[0])},${r1(p[1])}`).join(' ');
  function viewsSVG(d, L) {
    const n = d.n, V = viewsOf(d), maxH = Math.max(3, ...V.front, ...V.side);
    const q = clamp((app.W - 90) / (3 * n + 4), 6, 12), gap = 2 * q, total = 3 * n * q + 2 * gap;
    const x0 = -total / 2, y0 = L.bottom + 22;
    const cell = (x, y, on) => `<rect class="cu-v${on ? ' on' : ''}" x="${r1(x)}" y="${r1(y)}" width="${r1(q)}" height="${r1(q)}"/>`;
    let s = `<text class="cu-vt" x="${r1(x0 + n * q / 2)}" y="${r1(y0 - 6)}">Top</text>`;
    for (let v = 0; v < n; v++) for (let u = 0; u < n; u++) s += cell(x0 + u * q, y0 + v * q, V.top.has(u + ',' + v));
    const fx = x0 + n * q + gap, sx = fx + n * q + gap;
    s += `<text class="cu-vt" x="${r1(fx + n * q / 2)}" y="${r1(y0 - 6)}">Front</text><text class="cu-vt" x="${r1(sx + n * q / 2)}" y="${r1(y0 - 6)}">Right side</text>`;
    for (let u = 0; u < n; u++) for (let k = 0; k < maxH; k++) s += cell(fx + u * q, y0 + (maxH - 1 - k) * q, k < V.front[u]);
    for (let p = 0; p < n; p++) { const v = n - 1 - p; for (let k = 0; k < maxH; k++) s += cell(sx + p * q, y0 + (maxH - 1 - k) * q, k < V.side[v]); }
    return s;
  }
  function resize(d, n) {
    const cols = Array.from({ length: n * n }, () => []);
    for (let j = 0; j < Math.min(n, d.n); j++) for (let i = 0; i < Math.min(n, d.n); i++) cols[j * n + i] = d.cols[j * d.n + i];
    d.n = n; d.cols = cols;
  }
  // build(n, [[i, j, height, color?], ...]) -> a board state
  function build(n, spec, extra) {
    const d = Object.assign({ n, cols: Array.from({ length: n * n }, () => []), view: 0, mode: 'add', color: 0, views: true, ink: [] }, extra || {});
    for (const [i, j, h, c] of spec) for (let k = 0; k < h; k++) d.cols[j * n + i].push(c | 0);
    return d;
  }

  defineTool({
    id: 'cubes', short: 'Cubes', kind: 'custom',
    init: () => build(5, [[1, 1, 3], [2, 1, 2], [3, 1, 1], [1, 2, 2], [2, 2, 1], [1, 3, 1]]),
    valid: d => Array.isArray(d.cols) && d.cols.length === d.n * d.n,
    api: { count, viewsOf, build },
    frame(d) { const L = lay(d); return { ox: L.ox, oy: L.oy, k: L.c / 40 }; },
    render(d) {
      const L = lay(d), n = d.n;
      const P = (u, v, k) => [L.ox + (u - v) * L.a, L.oy + (u + v + 1) * L.b - k * L.c];
      const cells = [];
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const [u, v] = turn(i, j, n, d.view | 0); cells.push({ idx: j * n + i, u, v }); }
      cells.sort((p, q) => p.u + p.v - (q.u + q.v) || p.u - q.u);
      let s = '';
      for (const cl of cells) { const [x, y] = P(cl.u, cl.v, 0); s += `<polygon class="cu-floor" data-cell="${cl.idx}" points="${pts([[x, y - L.b], [x + L.a, y], [x, y + L.b], [x - L.a, y]])}"/>`; }
      const [fx, fy] = P((n - 1) / 2, n - 1, 0), [rx, ry] = P(n - 1, (n - 1) / 2, 0);
      s += `<text class="cu-dir" x="${r1(fx - L.a * 0.9)}" y="${r1(fy + L.b + 22)}">Front</text><text class="cu-dir" x="${r1(rx + L.a * 0.9)}" y="${r1(ry + L.b + 22)}">Right side</text>`;
      for (const cl of cells) {
        const col = d.cols[cl.idx]; if (!col.length) continue;
        s += `<g class="cu-col" data-cell="${cl.idx}">`;
        col.forEach((ci, k) => {
          const F = FACES[(ci | 0) % FACES.length], [x, y] = P(cl.u, cl.v, k + 1);
          const T = [[x, y - L.b], [x + L.a, y], [x, y + L.b], [x - L.a, y]];
          const left = [[x - L.a, y], [x, y + L.b], [x, y + L.b + L.c], [x - L.a, y + L.c]];
          const right = [[x, y + L.b], [x + L.a, y], [x + L.a, y + L.c], [x, y + L.b + L.c]];
          const st = `stroke="${F.line}" stroke-width="1.2" stroke-linejoin="round"`;
          s += `<polygon points="${pts(left)}" fill="${F.left}" ${st}/><polygon points="${pts(right)}" fill="${F.right}" ${st}/><polygon points="${pts(T)}" fill="${F.top}" ${st}/>`;
        });
        s += '</g>';
      }
      if (L.panel) s += viewsSVG(d, L);
      return s;
    },
    down(pt, e, d) {
      const el = e.target.closest && e.target.closest('[data-cell]');
      if (!el) return { up() {} };
      const idx = +el.dataset.cell, snap = snapshot();
      return {
        up(p, ev, cancelled) {
          if (cancelled) return;
          const col = d.cols[idx];
          if (d.mode === 'remove') col.pop(); else if (col.length < MAXH) col.push(d.color | 0);
          if (snapshot() !== snap) pushUndo(snap);
          render(); saveSoon();
        },
      };
    },
    readout(d) {
      const n = count(d), V = viewsOf(d);
      if (!n) return `<div class="sub">Tap a square on the floor to place a cube. Tap a stack to add another on top.</div>`;
      return `<div class="big">${n} <small>${plural(n, 'cube')}</small></div><div class="sub">Tallest stack ${Math.max(...d.cols.map(c => c.length))} · the top view covers ${V.top.size} ${plural(V.top.size, 'square')}</div>`;
    },
    tray(d) {
      return [
        { h: 'Tapping the board will', items: [
          { type: 'toggle', label: 'Add cubes', on: d.mode !== 'remove', fn: dd => { dd.mode = 'add'; } },
          { type: 'toggle', label: 'Remove cubes', on: d.mode === 'remove', fn: dd => { dd.mode = 'remove'; } },
        ] },
        { h: 'Cube color', items: PAL.map((c, i) => ({ type: 'toggle', label: NAMES[i], on: (d.color | 0) === i, fn: dd => { dd.color = i; dd.mode = 'add'; } })) },
        { h: 'Turn and look', items: [
          { type: 'btn', label: 'Turn left', fn: dd => { dd.view = ((dd.view | 0) + 3) % 4; } },
          { type: 'btn', label: 'Turn right', fn: dd => { dd.view = ((dd.view | 0) + 1) % 4; } },
          { type: 'toggle', label: 'Show views', on: d.views, fn: dd => { dd.views = !dd.views; } },
        ] },
        { h: 'Floor', items: SIZES.map(n => ({ type: 'toggle', label: `${n} × ${n}`, on: d.n === n, fn: dd => resize(dd, n) })).concat([exampleItem()]) },
      ];
    },
    clear(d) { d.cols = d.cols.map(() => []); },
  });
})();

/* ================= Balance (pan balance with mystery weights) ================= */
(() => {
  const NUM = { w1: 1, w2: 2, w5: 5, w10: 10 };
  const MYS = { c: { name: 'circle', col: C.red, sym: '●' }, s: { name: 'square', col: C.blue, sym: '■' }, t: { name: 'triangle', col: C.green, sym: '▲' } };
  const wt = (d, k) => (NUM[k] != null ? NUM[k] : (d.sec && d.sec[k]) || 0);
  const sum = (d, side) => d[side].reduce((a, k) => a + wt(d, k), 0);
  const sym = k => (NUM[k] != null ? String(NUM[k]) : MYS[k].sym);
  const randomWeights = () => { const r = () => 2 + Math.floor(Math.random() * 8); return { c: r(), s: r(), t: r() }; };
  function lay() {
    const top = -app.H / 2 + hudTop(), bottom = app.H / 2 - 18, Hh = Math.max(220, bottom - top);
    const half = Math.min(app.W * 0.3, 250), pivotY = top + Math.max(46, Hh * 0.2);
    const hang = clamp(Hh * 0.34, 90, 170), baseY = Math.min(bottom - 10, pivotY + hang + 120);
    // Pans hang from the beam ends and must stay on screen on a phone.
    const pw = Math.min(half * 0.95, Math.max(80, app.W - 20 - 2 * half));
    return { half, pivotY, hang, baseY, pw, sz: clamp(pw * 0.23, 26, 42) };
  }
  function itemSVG(d, k, x, y, sz, pan, i) {
    const at = pan ? ` data-pan="${pan}" data-i="${i}"` : '';
    if (NUM[k] != null) {
      return `<g class="ba-item"${at}><rect x="${r1(x - sz / 2)}" y="${r1(y - sz / 2)}" width="${r1(sz)}" height="${r1(sz)}" rx="6" fill="${C.amber.f}" stroke="${C.amber.s}" stroke-width="1.5"/>` +
        `<text class="ba-num" x="${r1(x)}" y="${r1(y + sz * 0.17)}" font-size="${r1(sz * 0.46)}" fill="${C.amber.t}">${NUM[k]}</text></g>`;
    }
    const m = MYS[k], c = m.col, h = sz / 2, lbl = (d.reveal && showVals()) || isCoach() ? d.sec[k] : '?';
    const shape = k === 'c' ? `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(h)}" fill="${c.f}" stroke="${c.s}" stroke-width="1.5"/>`
      : k === 's' ? `<rect x="${r1(x - h)}" y="${r1(y - h)}" width="${r1(sz)}" height="${r1(sz)}" rx="3" fill="${c.f}" stroke="${c.s}" stroke-width="1.5"/>`
        : `<polygon points="${r1(x)},${r1(y - h)} ${r1(x + h)},${r1(y + h)} ${r1(x - h)},${r1(y + h)}" fill="${c.f}" stroke="${c.s}" stroke-width="1.5" stroke-linejoin="round"/>`;
    return `<g class="ba-item"${at}>${shape}<text class="ba-num" x="${r1(x)}" y="${r1(y + sz * (k === 't' ? 0.3 : 0.17))}" font-size="${r1(sz * (k === 't' ? 0.36 : 0.44))}" fill="${c.t}">${lbl}</text></g>`;
  }

  defineTool({
    id: 'balance', short: 'Balance', kind: 'custom',
    init: () => ({ L: ['c', 'c'], R: ['w5', 'w2', 'w1'], sec: { c: 4, s: 7, t: 3 }, pan: 'L', reveal: false, ink: [] }),
    valid: d => Array.isArray(d.L) && Array.isArray(d.R) && d.sec && typeof d.sec === 'object',
    api: { sum, wt },
    frame() { const L = lay(); return { ox: 0, oy: L.pivotY, k: L.half / 250 }; },
    render(d) {
      const L = lay(), diff = sum(d, 'R') - sum(d, 'L');
      const ang = diff === 0 ? 0 : Math.sign(diff) * Math.min(14, 5 + Math.abs(diff));
      const ex = Math.cos(ang * Math.PI / 180) * L.half, ey = Math.sin(ang * Math.PI / 180) * L.half;
      let s = `<rect class="ba-stand" x="-70" y="${r1(L.baseY)}" width="140" height="12" rx="6"/><rect class="ba-stand" x="-6" y="${r1(L.pivotY)}" width="12" height="${r1(L.baseY - L.pivotY)}"/>`;
      s += `<line class="ba-beam" x1="${r1(-ex)}" y1="${r1(L.pivotY - ey)}" x2="${r1(ex)}" y2="${r1(L.pivotY + ey)}"/><circle class="ba-pivot" cx="0" cy="${r1(L.pivotY)}" r="9"/>`;
      for (const side of ['L', 'R']) {
        const sx = side === 'L' ? -ex : ex, sy = L.pivotY + (side === 'L' ? -ey : ey), py = sy + L.hang, pw = L.pw, act = d.pan === side && !isCoach();
        s += `<line class="ba-string" x1="${r1(sx)}" y1="${r1(sy)}" x2="${r1(sx - pw / 2)}" y2="${r1(py)}"/><line class="ba-string" x1="${r1(sx)}" y1="${r1(sy)}" x2="${r1(sx + pw / 2)}" y2="${r1(py)}"/>`;
        s += `<path class="ba-pan${act ? ' act' : ''}" data-pick="${side}" d="M${r1(sx - pw / 2)} ${r1(py)}Q${r1(sx)} ${r1(py + 30)} ${r1(sx + pw / 2)} ${r1(py)}Z"/>`;
        const items = d[side], per = Math.max(2, Math.floor(pw / (L.sz * 1.12)));
        items.forEach((k, i) => {
          const row = Math.floor(i / per), inRow = Math.min(per, items.length - row * per);
          s += itemSVG(d, k, sx + ((i % per) - (inRow - 1) / 2) * L.sz * 1.12, py - L.sz / 2 - 2 - row * L.sz * 1.06, L.sz, side, i);
        });
        s += `<text class="ba-lbl" x="${r1(sx)}" y="${r1(py + 46)}">${side === 'L' ? 'Left pan' : 'Right pan'}${act ? ' · adding here' : ''}</text>`;
      }
      return s;
    },
    down(pt, e, d) {
      const it = e.target.closest && e.target.closest('[data-pan]'), pk = e.target.closest && e.target.closest('[data-pick]');
      if (!it && !pk) return { up() {} };
      const snap = snapshot();
      return {
        up(p, ev, cancelled) {
          if (cancelled) return;
          if (it) d[it.dataset.pan].splice(+it.dataset.i, 1); else d.pan = pk.dataset.pick;
          if (snapshot() !== snap) pushUndo(snap);
          renderTray(); render(); saveSoon();
        },
      };
    },
    readout(d) {
      const Ls = sum(d, 'L'), Rs = sum(d, 'R'), mystery = [...d.L, ...d.R].some(k => MYS[k]);
      const state = Ls === Rs ? 'Balanced' : Ls > Rs ? 'Left side is heavier' : 'Right side is heavier';
      const expr = side => (d[side].length ? d[side].map(sym).join(' + ') : 'empty');
      return `<div class="big">${state}</div><div class="sub">Left: ${expr('L')} · Right: ${expr('R')}</div>` +
        (!mystery || d.reveal || isCoach() ? `<div class="sub">Totals: ${Ls} and ${Rs}</div>` : '');
    },
    tray(d) {
      const add = k => dd => { if (dd[dd.pan].length < 16) dd[dd.pan].push(k); };
      return [
        { h: 'Add to', items: [
          { type: 'toggle', label: 'Left pan', on: d.pan === 'L', fn: dd => { dd.pan = 'L'; } },
          { type: 'toggle', label: 'Right pan', on: d.pan === 'R', fn: dd => { dd.pan = 'R'; } },
        ] },
        { h: 'Number weights', items: [1, 2, 5, 10].map(n => ({ type: 'btn', sq: true, label: String(n), aria: `Add a ${n}`, fn: add('w' + n) })) },
        { h: 'Mystery shapes', items: ['c', 's', 't'].map(k => ({ type: 'btn', label: `${MYS[k].sym} ${cap(MYS[k].name)}`, fn: add(k) })) },
        { h: 'Options', items: (showVals() ? [
          { type: 'toggle', label: 'Show mystery weights', on: d.reveal, fn: dd => { dd.reveal = !dd.reveal; } },
          { type: 'btn', label: 'New mystery weights', fn: dd => { dd.sec = randomWeights(); } },
        ] : [{ type: 'note', text: 'The mystery weights stay secret until the task is solved.' }]).concat([
          { type: 'btn', label: 'Empty both pans', fn: dd => { dd.L = []; dd.R = []; } },
          exampleItem(),
          { type: 'note', text: 'Tap a weight on the scale to take it off. Tap a pan to add to it.' },
        ]) },
      ];
    },
    clear(d) { d.L = []; d.R = []; },
  });
})();

/* ================= Base Ten Blocks ================= */
(() => {
  const U = 16;
  const COL = { h: C.green, t: C.blue, o: C.amber };
  const GRID = { h: [10, 10], t: [1, 10], o: [1, 1] };
  function block(k) {
    const [cols, rows] = GRID[k], c = COL[k], w = cols * U, h = rows * U, x = -w / 2, y = -h / 2;
    let g = '';
    for (let i = 1; i < cols; i++) g += `M${x + i * U} ${y}V${y + h}`;
    for (let j = 1; j < rows; j++) g += `M${x} ${y + j * U}H${x + w}`;
    return `<rect x="${x + 3}" y="${y + 3}" width="${w}" height="${h}" rx="2" fill="${c.s}"/>` +
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${c.f}" stroke="${c.s}" stroke-width="1.5"/>` +
      (g ? `<path d="${g}" fill="none" stroke="${c.s}" stroke-width="1" opacity=".55"/>` : '');
  }
  const DRAWN = { h: block('h'), t: block('t'), o: block('o') };
  const MAT = { x0: -245, x1: 245, top: -205, bottom: 225, cols: [[-245, -55, 'h'], [-55, 115, 't'], [115, 245, 'o']] };
  const SLOT = {
    h: i => ({ x: -150 + 10 * Math.floor(i / 2), y: (i % 2 ? 92 : -82) + 10 * Math.floor(i / 2) }),
    t: i => { const layer = Math.floor(i / 14), j = i % 14; return { x: -38 + 22 * (j % 7) + 6 * layer, y: (j >= 7 ? 92 : -82) + 6 * layer }; },
    o: i => { const layer = Math.floor(i / 85), j = i % 85; return { x: 137 + 22 * (j % 5) + 6 * layer, y: -152 + 22 * Math.floor(j / 5) + 6 * layer }; },
  };
  const bb = (k, x, y, r, inset = 0) => {
    let w = GRID[k][0] * U, h = GRID[k][1] * U; if (r) [w, h] = [h, w];
    return { l: x - w / 2 + inset, r: x + w / 2 - inset, t: y - h / 2 + inset, b: y + h / 2 - inset };
  };
  function freeSlot(k, d) {
    // first choice: a slot that overlaps nothing; fallback: a slot with no block of the same kind on it
    for (let i = 0; i < 400; i++) {
      const s = SLOT[k](i), a = bb(k, s.x, s.y, 0, 1);
      if (!d.pieces.some(p => { const q = bb(p.k, p.x, p.y, p.r); return q.l < a.r && q.r > a.l && q.t < a.b && q.b > a.t; })) return s;
    }
    for (let i = 0; i < 400; i++) {
      const s = SLOT[k](i);
      if (!d.pieces.some(p => p.k === k && Math.abs(p.x - s.x) < 5 && Math.abs(p.y - s.y) < 5)) return s;
    }
    return SLOT[k](0);
  }
  const HEAD = { int: ['Hundreds', 'Tens', 'Ones'], dec: ['Ones', 'Tenths', 'Hundredths'] };
  const ONE = { int: { h: 'Hundred', t: 'Ten', o: 'One' }, dec: { h: 'One', t: 'Tenth', o: 'Hundredth' } };
  const mode = d => (d.dec ? 'dec' : 'int');
  const count = d => { const n = { h: 0, t: 0, o: 0 }; for (const p of d.pieces) if (p.k in n) n[p.k]++; return n; };

  function breakApart(p, d) {
    const out = [];
    for (let i = 0; i < 10; i++) {
      const off = (i - 4.5) * (U + 3);
      if (p.k === 't') { const v = p.r ? [off, 0] : [0, off]; out.push({ id: uid(), k: 'o', x: r1(p.x + v[0]), y: r1(p.y + v[1]), r: 0 }); }
      else out.push({ id: uid(), k: 't', x: r1(p.x + off), y: p.y, r: 0 });
    }
    removeP(d, p.id); d.pieces.push(...out); out.forEach(q => app.popIds.add(q.id)); S.sel = null;
  }
  function trade(p, d) {
    const same = d.pieces.filter(q => q.k === p.k)
      .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, 10);
    if (same.length < 10) return;
    const ids = new Set(same.map(q => q.id));
    const cx = same.reduce((s, q) => s + q.x, 0) / 10, cy = same.reduce((s, q) => s + q.y, 0) / 10;
    d.pieces = d.pieces.filter(q => !ids.has(q.id));
    const k = p.k === 'o' ? 't' : 'h';
    const pos = d.mat ? freeSlot(k, d) : { x: r1(cx), y: r1(cy) };
    const np = { id: uid(), k, x: pos.x, y: pos.y, r: 0 };
    d.pieces.push(np); app.popIds.add(np.id); S.sel = null;
  }
  function example() {
    const d = { pieces: [], mat: true, dec: false, ink: [] };
    const add = (k, i) => { const s = SLOT[k](i); d.pieces.push({ id: uid(), k, x: s.x, y: s.y, r: 0 }); };
    add('h', 0); add('h', 1);
    for (let i = 0; i < 4; i++) add('t', i);
    for (let i = 0; i < 3; i++) add('o', i);
    return d;
  }

  // Builds a mat with the given counts in tidy slots (used by practice tasks).
  function build(spec, dec) {
    const d = { pieces: [], mat: true, dec: !!dec, ink: [] };
    for (const k of ['h', 't', 'o']) for (let i = 0; i < (spec[k] || 0); i++) { const s = SLOT[k](i); d.pieces.push({ id: uid(), k, x: s.x, y: s.y, r: 0 }); }
    return d;
  }

  defineTool({
    id: 'base-ten', short: 'Base Ten', kind: 'pieces', grid: U, center: { x: 0, y: 10 },
    init: example,
    api: { count, total: d => { const n = count(d); return n.h * 100 + n.t * 10 + n.o; }, build },
    extent: d => (d.mat ? { l: MAT.x0, t: MAT.top, r: MAT.x1, b: MAT.bottom } : null),
    kinds: {
      h: { draw: () => DRAWN.h, box: () => ({ x: -80, y: -80, w: 160, h: 160 }) },
      t: { rot: true, draw: () => DRAWN.t, box: () => ({ x: -8, y: -80, w: 16, h: 160 }) },
      o: { draw: () => DRAWN.o, box: () => ({ x: -8, y: -8, w: 16, h: 16 }) },
    },
    place(p, d) { if (!d.mat) return false; const s = freeSlot(p.k, d); p.x = s.x; p.y = s.y; return true; },
    acts(p, d) {
      const a = [], n = count(d);
      if (p.k !== 'o') a.push({ label: 'Break apart', icon: 'brk', fn: () => breakApart(p, d) });
      if (p.k !== 'h' && n[p.k] >= 10) a.push({ label: 'Trade 10', icon: 'trade', fn: () => trade(p, d) });
      if (p.k === 't') a.push({ label: 'Turn', icon: 'rotcw', fn: () => { p.r = p.r ? 0 : 90; } });
      a.push(dupAct(p, d), delAct(p, d));
      return a;
    },
    underlay(d) {
      if (!d.mat) return '';
      const names = HEAD[mode(d)];
      let s = `<rect class="mat" x="${MAT.x0}" y="${MAT.top}" width="${MAT.x1 - MAT.x0}" height="${MAT.bottom - MAT.top}" rx="14"/>`;
      s += `<path class="mat-div" d="M-55 ${MAT.top}V${MAT.bottom}M115 ${MAT.top}V${MAT.bottom}"/>`;
      MAT.cols.forEach(([a, b, k], i) => {
        s += `<text class="mat-h" x="${(a + b) / 2}" y="${MAT.top + 27}">${names[i]}</text>`;
        s += `<rect x="${a + 14}" y="${MAT.top + 37}" width="${b - a - 28}" height="3" rx="1.5" fill="${COL[k].f}"/>`;
      });
      return s;
    },
    readout(d) {
      const n = count(d), dec = d.dec, total = n.h * 100 + n.t * 10 + n.o;
      const big = dec ? (total / 100).toFixed(2) : total.toLocaleString('en-US');
      const w = dec ? [['one', 'ones'], ['tenth', 'tenths'], ['hundredth', 'hundredths']] : [['hundred', 'hundreds'], ['ten', 'tens'], ['one', 'ones']];
      const part = (c, [a, b]) => `${c} ${c === 1 ? a : b}`;
      let hint = '';
      if (n.o >= 10) hint = dec ? '10 hundredths can be traded for 1 tenth.' : '10 ones can be traded for 1 ten.';
      else if (n.t >= 10) hint = dec ? '10 tenths can be traded for 1 one.' : '10 tens can be traded for 1 hundred.';
      return `<div class="big">${big}</div><div class="sub">${part(n.h, w[0])} + ${part(n.t, w[1])} + ${part(n.o, w[2])}</div>` +
        (hint ? `<div class="hint">${hint} Tap one, then Trade 10.</div>` : '');
    },
    tray(d) {
      const nm = ONE[mode(d)];
      return [
        { h: 'Blocks', items: [
          { type: 'piece', k: 'h', label: nm.h, icon: `<g transform="scale(.24)">${DRAWN.h}</g>` },
          { type: 'piece', k: 't', label: nm.t, icon: `<g transform="scale(.26)">${DRAWN.t}</g>` },
          { type: 'piece', k: 'o', label: nm.o, icon: `<g transform="scale(1.3)">${DRAWN.o}</g>` },
        ] },
        { h: 'Options', items: [
          { type: 'toggle', label: 'Place-value mat', on: d.mat, fn: d => { d.mat = !d.mat; } },
          { type: 'toggle', label: 'Decimals', on: d.dec, fn: d => { d.dec = !d.dec; } },
          exampleItem(),
        ] },
      ];
    },
  });
})();

/* ================= Fraction Tiles ================= */
(() => {
  const FL = 400, FH = 40;
  const DEN = [1, 2, 3, 4, 5, 6, 8, 10, 12];
  const FC = { 1: C.red, 2: C.orange, 3: C.yellow, 4: C.green, 5: C.teal, 6: C.blue, 8: C.violet, 10: C.pink, 12: C.brown };
  const DEC = { 1: '1', 2: '0.5', 3: '≈0.33', 4: '0.25', 5: '0.2', 6: '≈0.17', 8: '0.125', 10: '0.1', 12: '≈0.08' };
  const PCT = { 1: '100%', 2: '50%', 3: '33⅓%', 4: '25%', 5: '20%', 6: '16⅔%', 8: '12.5%', 10: '10%', 12: '8⅓%' };
  const wOf = den => FL / den;

  function label(den, mode) {
    const w = wOf(den), c = FC[den];
    if (mode === 'none') return '';
    if (mode === 'frac' && den > 1) {
      const fs = Math.min(15, w / 2.3), bw = (String(den).length * 0.62 + 0.4) * fs / 2;
      return `<g class="fl" fill="${c.t}"><text x="0" y="-3.5" font-size="${r1(fs)}">1</text>` +
        `<path d="M${r1(-bw)} 0H${r1(bw)}" stroke="${c.t}" stroke-width="1.4"/>` +
        `<text x="0" y="${r1(fs * 0.84)}" font-size="${r1(fs)}">${den}</text></g>`;
    }
    const str = mode === 'dec' ? DEC[den] : mode === 'pct' ? PCT[den] : '1';
    const fs = Math.min(17, w / (str.length * 0.62 + 0.5));
    return `<text class="fl" x="0" y="${r1(fs * 0.36)}" font-size="${r1(fs)}" fill="${c.t}">${str}</text>`;
  }
  function tile(p, d) {
    const w = wOf(p.d), c = FC[p.d];
    return `<rect x="${r1(-w / 2)}" y="${-FH / 2}" width="${r1(w)}" height="${FH}" rx="3" fill="${c.f}" stroke="${c.s}" stroke-width="1.5"/>` + label(p.d, d.lbl || 'frac');
  }
  function row(den, y) {
    const out = [];
    for (let j = 0; j < den; j++) out.push({ id: uid(), k: 'f', d: den, x: r1(-FL / 2 + wOf(den) * (j + 0.5)), y, r: 0 });
    return out;
  }
  function example() { const d = { pieces: [], lbl: 'frac', ink: [] }; [1, 2, 4, 8, 3, 6].forEach((den, i) => d.pieces.push(...row(den, -100 + i * FH))); return d; }
  function wall(d) { d.pieces = []; DEN.forEach((den, i) => d.pieces.push(...row(den, -170 + i * FH))); S.sel = null; }
  function split(p, d, m) {
    const nd = p.d * m, w = wOf(nd), l = p.x - wOf(p.d) / 2;
    removeP(d, p.id);
    for (let j = 0; j < m; j++) { const q = { id: uid(), k: 'f', d: nd, x: r1(l + w * (j + 0.5)), y: p.y, r: 0 }; d.pieces.push(q); app.popIds.add(q.id); }
    S.sel = null;
  }
  // rows of touching tiles, top to bottom
  function chains(d) {
    const ps = d.pieces.filter(p => p.k === 'f').slice().sort((a, b) => a.y - b.y || a.x - b.x);
    const rows = [];
    for (const p of ps) { let r = rows.find(q => Math.abs(q.y - p.y) < 6); if (!r) rows.push(r = { y: p.y, items: [] }); r.items.push(p); }
    const out = [];
    for (const r of rows) {
      r.items.sort((a, b) => a.x - b.x);
      let cur = [], right = -Infinity;
      for (const p of r.items) {
        const w = wOf(p.d), l = p.x - w / 2;
        if (cur.length && Math.abs(l - right) > 6) { out.push(cur); cur = []; }
        cur.push(p); right = p.x + w / 2;
      }
      if (cur.length) out.push(cur);
    }
    return out;
  }
  const sum120 = ch => ch.reduce((s, p) => s + 120 / p.d, 0);
  function sumText(n, mode) {
    if (mode === 'dec') { const v = n / 120, r = Math.round(v * 100) / 100; return (Math.abs(v - r) > 1e-9 ? '≈' : '') + r; }
    if (mode === 'pct') { const v = n / 1.2, r = Math.round(v * 10) / 10; return (Math.abs(v - r) > 1e-9 ? '≈' : '') + r + '%'; }
    return mixedText(n, 120);
  }
  function exprHTML(ch) {
    const den = ch[0].d;
    if (ch.every(p => p.d === den)) return den === 1 ? String(ch.length) : stack(ch.length, den);
    if (ch.length > 4) return `${ch.length} tiles`;
    return ch.map(p => (p.d === 1 ? '1' : stack(1, p.d))).join(' + ');
  }
  const tileIcon = den => {
    const c = FC[den];
    return `<rect x="-20" y="-7" width="40" height="14" rx="2" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-width="1.2"/>` +
      `<rect x="-20" y="-7" width="${r1(40 / den)}" height="14" rx="2" fill="${c.f}" stroke="${c.s}" stroke-width="1.2"/>`;
  };

  // A row of exactly n tiles that are all 1/den.
  const hasRow = (d, den, n) => chains(d).some(ch => ch.length === n && ch.every(p => p.d === den));

  defineTool({
    id: 'fractions', short: 'Fractions', kind: 'pieces', grid: 20, center: { x: 0, y: 0 },
    init: example,
    api: { chains, hasRow, row },
    kinds: { f: { draw: tile, box: p => ({ x: -wOf(p.d) / 2, y: -FH / 2, w: wOf(p.d), h: FH }) } },
    make: (k, extra) => ({ d: DEN.includes(+extra) ? +extra : 1 }),
    onDrop(p, d) {
      const w = wOf(p.d); let best = null, bd = 20;
      for (const q of d.pieces) {
        if (q === p) continue;
        const qw = wOf(q.d);
        const cands = [
          { x: q.x + qw / 2 + w / 2, y: q.y }, { x: q.x - qw / 2 - w / 2, y: q.y },
          { x: q.x - qw / 2 + w / 2, y: q.y + FH }, { x: q.x - qw / 2 + w / 2, y: q.y - FH },
        ];
        for (const c of cands) { const dd = Math.hypot(c.x - p.x, c.y - p.y); if (dd < bd) { bd = dd; best = c; } }
      }
      if (best) { p.x = r1(best.x); p.y = r1(best.y); }
    },
    acts(p, d) {
      const a = [];
      for (const m of [2, 3]) if (DEN.includes(p.d * m)) a.push({ label: `Split in ${m}`, icon: m === 2 ? 'split' : 'split3', fn: () => split(p, d, m) });
      a.push(dupAct(p, d, q => { q.x = r1(p.x + wOf(p.d)); q.y = p.y; }), delAct(p, d));
      return a;
    },
    overlay(d) {
      if (!showVals()) return '';
      const mode = !d.lbl || d.lbl === 'none' ? 'frac' : d.lbl;
      return chains(d).filter(ch => ch.length > 1).map(ch => {
        const last = ch[ch.length - 1];
        return `<text class="rowsum" x="${r1(last.x + wOf(last.d) / 2 + 9)}" y="${r1(last.y + 6)}">= ${sumText(sum120(ch), mode)}</text>`;
      }).join('');
    },
    readout(d) {
      const p = S.sel && findP(d, S.sel);
      if (p) {
        return `<div class="big">${p.d === 1 ? '1' : stack(1, p.d)} = ${DEC[p.d]} = ${PCT[p.d]}</div>` +
          `<div class="sub">${p.d === 1 ? 'This tile is the whole.' : `${p.d} of these tiles make 1 whole.`}</div>`;
      }
      if (!d.pieces.length) return `<div class="sub">Add tiles from the tray and line them up to compare.</div>`;
      const groups = new Map();
      for (const ch of chains(d)) { const s = Math.round(sum120(ch)); if (!groups.has(s)) groups.set(s, []); groups.get(s).push(ch); }
      let best = null;
      for (const [s, list] of groups) if (list.length > 1 && (!best || list.length > best[1].length)) best = [s, list];
      if (!best) return `<div class="sub">Line tiles up in rows. Rows of the same length are equivalent. Tap a tile to see its value.</div>`;
      const seen = new Set(), exprs = [];
      for (const ch of best[1]) { const e = exprHTML(ch); if (!seen.has(e)) { seen.add(e); exprs.push(e); } }
      const val = mixedHTML(best[0], 120);
      if (!seen.has(val)) exprs.push(val);
      return `<div class="big">${exprs.join(' = ')}</div><div class="sub">These rows are the same length, so they are equivalent.</div>`;
    },
    tray(d) {
      const lbl = d.lbl || 'frac';
      return [
        { h: 'Tiles', items: DEN.map(den => ({ type: 'piece', k: 'f', extra: den, label: den === 1 ? '1 whole' : `1/${den}`, icon: tileIcon(den) })) },
        { h: 'Labels', items: [['frac', 'Fraction'], ['dec', 'Decimal'], ['pct', 'Percent'], ['none', 'None']].map(([v, l]) => ({ type: 'toggle', label: l, on: lbl === v, fn: d => { d.lbl = v; } })) },
        { h: 'Build', items: [{ type: 'btn', label: 'Full fraction wall', fn: d => wall(d) }, exampleItem()] },
      ];
    },
  });
})();

/* ================= Number Line ================= */
(() => {
  const PRE = [
    { id: '0-10', label: '0 to 10', i0: 0, i1: 10, un: 1, ud: 1 },
    { id: '0-20', label: '0 to 20', i0: 0, i1: 20, un: 1, ud: 1 },
    { id: '0-100', label: '0 to 100 by tens', i0: 0, i1: 10, un: 10, ud: 1 },
    { id: 'neg', label: '−10 to 10', i0: -10, i1: 10, un: 1, ud: 1 },
    { id: 'tenths', label: '0 to 1 in tenths', i0: 0, i1: 10, un: 1, ud: 10, dec: true },
    { id: 'fourths', label: '0 to 2 in fourths', i0: 0, i1: 8, un: 1, ud: 4 },
    { id: 'eighths', label: '0 to 1 in eighths', i0: 0, i1: 8, un: 1, ud: 8 },
  ];
  const preset = d => PRE.find(p => p.id === d.preset) || PRE[1];
  function val(pr, i, html) {
    const n = i * pr.un, dd = pr.ud, neg = n < 0, a = Math.abs(n);
    let s;
    if (dd === 1) s = String(a);
    else if (pr.dec) s = String(Math.round((a / dd) * 1000) / 1000);
    else if (a % dd === 0) s = String(a / dd);
    else s = html ? stack(a, dd) : `${a}/${dd}`;
    return (neg ? MINUS : '') + s;
  }
  function lay(pr) {
    const m = Math.max(30, app.W * 0.07), x0 = -app.W / 2 + m, x1 = app.W / 2 - m;
    const n = pr.i1 - pr.i0, gap = (x1 - x0) / n;
    const y = r1(Math.min(app.H / 2 - 56, Math.max(Math.min(60, app.H * 0.1), -app.H / 2 + hudTop() + 130)));
    let maxLen = 0; for (let i = pr.i0; i <= pr.i1; i++) maxLen = Math.max(maxLen, val(pr, i).length);
    const need = maxLen * 7.5 + 10;
    const every = [1, 2, 4, 5, 10].find(k => gap * k >= need && n % k === 0) || n;
    return { x0, x1, gap, y, every, X: i => x0 + (i - pr.i0) * gap, I: x => clamp(Math.round((x - x0) / gap) + pr.i0, pr.i0, pr.i1) };
  }
  function jumpSVG(L, pr, j, k) {
    const xa = L.X(j.a), xb = L.X(j.b), fwd = j.b > j.a, dx = xb - xa;
    const h = clamp(Math.abs(dx) * 0.45, 26, 120) * (fwd ? -1 : 1);
    const y0 = L.y + (fwd ? -3 : 3), cx = (xa + xb) / 2, cy = y0 + 2 * h;
    const tx = xb - cx, ty = y0 - cy, tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl;
    const ah = `${r1(xb)},${r1(y0)} ${r1(xb - ux * 11 - uy * 6)},${r1(y0 - uy * 11 + ux * 6)} ${r1(xb - ux * 11 + uy * 6)},${r1(y0 - uy * 11 - ux * 6)}`;
    const lab = (fwd ? '+' : MINUS) + val(pr, Math.abs(j.b - j.a));
    const ly = y0 + h + (fwd ? -8 : 20);
    const path = `M${r1(xa)} ${r1(y0)}Q${r1(cx)} ${r1(cy)} ${r1(xb)} ${r1(y0)}`;
    const sel = S.sel === 'j' + k ? ' sel' : '';
    return `<g class="nl-jump ${fwd ? 'fwd' : 'back'}${sel}"${k >= 0 ? ` data-jump="${k}"` : ''}>` +
      `<path class="hit" d="${path}" stroke-width="22"/><path class="arc" d="${path}"/><polygon class="ah" points="${ah}"/>` +
      `<text class="nl-jl" x="${r1(cx)}" y="${r1(ly)}">${lab}</text></g>`;
  }

  defineTool({
    id: 'number-line', short: 'Number Line', kind: 'custom',
    init: () => ({ preset: '0-20', jumps: [{ a: 8, b: 10 }, { a: 10, b: 15 }], marks: [], hide: false, ink: [] }),
    valid: d => Array.isArray(d.jumps) && Array.isArray(d.marks),
    frame(d) { const L = lay(preset(d)); return { ox: L.x0, oy: L.y, k: (L.x1 - L.x0) / 1000 }; },
    render(d) {
      const pr = preset(d), L = lay(pr);
      let s = `<line class="nl-axis" x1="${r1(L.x0 - 20)}" y1="${L.y}" x2="${r1(L.x1 + 20)}" y2="${L.y}"/>` +
        `<polygon class="nl-arrow" points="${r1(L.x1 + 30)},${L.y} ${r1(L.x1 + 18)},${L.y - 6} ${r1(L.x1 + 18)},${L.y + 6}"/>` +
        `<polygon class="nl-arrow" points="${r1(L.x0 - 30)},${L.y} ${r1(L.x0 - 18)},${L.y - 6} ${r1(L.x0 - 18)},${L.y + 6}"/>`;
      const marks = new Set(d.marks);
      for (let i = pr.i0; i <= pr.i1; i++) {
        const x = r1(L.X(i)), whole = (i * pr.un) % pr.ud === 0, t = whole ? 12 : 8;
        s += `<line class="nl-tick${whole ? ' whole' : ''}" x1="${x}" y1="${L.y - t}" x2="${x}" y2="${L.y + t}"/>`;
        const show = (i - pr.i0) % L.every === 0 || marks.has(i), ends = i === pr.i0 || i === pr.i1;
        if (show && (!d.hide || ends)) s += `<text class="nl-lbl${whole ? ' whole' : ''}${marks.has(i) ? ' mk' : ''}" x="${x}" y="${L.y + 34}">${val(pr, i)}</text>`;
      }
      d.jumps.forEach((j, k) => { s += jumpSVG(L, pr, j, k); });
      if (app.nlPrev) s += jumpSVG(L, pr, app.nlPrev, -1);
      for (const i of d.marks) s += `<circle class="nl-mark" cx="${r1(L.X(i))}" cy="${L.y}" r="8"/>`;
      return s;
    },
    down(pt, e, d) {
      const pr = preset(d), L = lay(pr);
      const jt = e.target.closest && e.target.closest('[data-jump]');
      if (jt) { const k = +jt.dataset.jump; return { up(p, ev, c) { if (!c) { S.sel = 'j' + k; render(); } } }; }
      if (Math.abs(pt.y - L.y) < 64 && pt.x > L.x0 - 24 && pt.x < L.x1 + 24) {
        const a = L.I(pt.x), snap = snapshot();
        app.nlPrev = null; S.sel = null;
        return {
          move(p) {
            const b = L.I(p.x), nv = b !== a ? { a, b } : null;
            if ((nv && nv.b) !== (app.nlPrev && app.nlPrev.b)) { app.nlPrev = nv; render(); }
          },
          up(p, ev, c) {
            const pv = app.nlPrev; app.nlPrev = null;
            if (!c) {
              if (pv) d.jumps.push(pv);
              else { const i = d.marks.indexOf(a); if (i > -1) d.marks.splice(i, 1); else d.marks.push(a); }
            }
            if (snapshot() !== snap) pushUndo(snap);
            render(); saveSoon();
          },
        };
      }
      return { up() { if (S.sel) { S.sel = null; render(); } } };
    },
    actions(sel, d) {
      if (!sel || sel[0] !== 'j') return null;
      const k = +sel.slice(1); if (!d.jumps[k]) return null;
      return [{ id: 'del', label: 'Delete jump', icon: 'trash', fn: () => { d.jumps.splice(k, 1); S.sel = null; } }];
    },
    readout(d) {
      const pr = preset(d);
      if (!d.jumps.length) {
        if (d.marks.length) return `<div class="big">${d.marks.slice().sort((a, b) => a - b).map(i => val(pr, i, true)).join(', ')}</div><div class="sub">Drag along the line to add a jump.</div>`;
        return `<div class="sub">Drag along the line to draw a jump. Tap a tick to mark a point.</div>`;
      }
      let chain = true;
      for (let k = 1; k < d.jumps.length; k++) if (d.jumps[k].a !== d.jumps[k - 1].b) chain = false;
      const op = j => `${j.b > j.a ? '+' : MINUS} ${val(pr, Math.abs(j.b - j.a), true)}`;
      const big = chain
        ? `${val(pr, d.jumps[0].a, true)} ${d.jumps.map(op).join(' ')} = ${val(pr, d.jumps[d.jumps.length - 1].b, true)}`
        : d.jumps.map(j => `${val(pr, j.a, true)} ${op(j)} = ${val(pr, j.b, true)}`).join('<br>');
      return `<div class="big">${big}</div><div class="sub">${d.jumps.length} ${plural(d.jumps.length, 'jump')}. Tap a jump to remove it.</div>`;
    },
    tray(d) {
      return [
        { h: 'Number line', items: PRE.map(pr => ({ type: 'toggle', label: pr.label, on: preset(d).id === pr.id, fn: d => { if (d.preset !== pr.id) { d.preset = pr.id; d.jumps = []; d.marks = []; S.sel = null; } } })) },
        { h: 'Options', items: [
          { type: 'toggle', label: 'Hide numbers', on: d.hide, fn: d => { d.hide = !d.hide; } },
          { type: 'btn', label: 'Clear jumps', fn: d => { d.jumps = []; d.marks = []; S.sel = null; } },
          exampleItem(),
        ] },
      ];
    },
    clear(d) { d.jumps = []; d.marks = []; },
  });
})();

/* ================= Geoboard ================= */
(() => {
  const SIZES = [5, 7, 10];
  const BC = [C.red, C.blue, C.green, C.orange, C.violet];
  function lay(n) {
    const top = -app.H / 2 + Math.max(96, hudTop()), bottom = app.H / 2 - 64, left = -app.W / 2 + 14, right = app.W / 2 - 14;
    const side = Math.max(140, Math.min(right - left, bottom - top));
    const cy = (top + bottom) / 2, bx = -side / 2, by = cy - side / 2;
    const pad = side * 0.075, g = (side - 2 * pad) / (n - 1);
    return {
      side, bx, by, g,
      P: (i, j) => [bx + pad + i * g, by + pad + j * g],
      I: x => clamp(Math.round((x - bx - pad) / g), 0, n - 1),
      J: y => clamp(Math.round((y - by - pad) / g), 0, n - 1),
    };
  }
  function cleanPts(p) {
    const out = [];
    for (const q of p) { const l = out[out.length - 1]; if (!l || l[0] !== q[0] || l[1] !== q[1]) out.push([q[0], q[1]]); }
    while (out.length > 1 && out[0][0] === out[out.length - 1][0] && out[0][1] === out[out.length - 1][1]) out.pop();
    return out;
  }
  function simplify(p) {
    const pts = cleanPts(p);
    let changed = true;
    while (changed && pts.length > 2) {
      changed = false;
      for (let k = 0; k < pts.length; k++) {
        const a = pts[(k - 1 + pts.length) % pts.length], b = pts[k], c = pts[(k + 1) % pts.length];
        if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) === 0) { pts.splice(k, 1); changed = true; break; }
      }
    }
    return pts;
  }
  function shapeName(p) {
    const s = simplify(p), n = s.length;
    if (n < 3) return 'line segment';
    const e = s.map((q, k) => { const r = s[(k + 1) % n]; return [r[0] - q[0], r[1] - q[1]]; });
    const L2 = e.map(v => v[0] * v[0] + v[1] * v[1]);
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1], cross = (a, b) => a[0] * b[1] - a[1] * b[0];
    if (n === 3) {
      const right = [0, 1, 2].some(k => dot(e[k], e[(k + 1) % 3]) === 0);
      const iso = L2[0] === L2[1] || L2[1] === L2[2] || L2[0] === L2[2];
      return right ? (iso ? 'right isosceles triangle' : 'right triangle') : iso ? 'isosceles triangle' : 'triangle';
    }
    if (n === 4) {
      const p1 = cross(e[0], e[2]) === 0, p2 = cross(e[1], e[3]) === 0;
      if (p1 && p2) {
        const eq = L2.every(v => v === L2[0]), right = dot(e[0], e[1]) === 0;
        return eq && right ? 'square' : right ? 'rectangle' : eq ? 'rhombus' : 'parallelogram';
      }
      return p1 || p2 ? 'trapezoid' : 'quadrilateral';
    }
    return { 5: 'pentagon', 6: 'hexagon', 7: 'heptagon', 8: 'octagon' }[n] || `${n}-sided polygon`;
  }
  function measure(pts) {
    const p = cleanPts(pts), n = p.length;
    if (n < 2) return null;
    let per = 0, exact = true, a2 = 0;
    const m = n === 2 ? 1 : n;
    for (let k = 0; k < m; k++) {
      const a = p[k], b = p[(k + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], q = dx * dx + dy * dy, l = Math.sqrt(q);
      if (Math.round(l) ** 2 !== q) exact = false;
      per += l;
    }
    for (let k = 0; k < n; k++) { const a = p[k], b = p[(k + 1) % n]; a2 += a[0] * b[1] - b[0] * a[1]; }
    return { n, per, exact, a2: Math.abs(a2), name: shapeName(p) };
  }
  const fmtLen = (v, exact) => (exact ? String(Math.round(v)) : '≈' + Math.round(v * 100) / 100);
  const fmtArea = a2 => (a2 % 2 ? `${(a2 - 1) / 2 || ''}½` : String(a2 / 2));
  function edgeLen(a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], q = dx * dx + dy * dy, l = Math.sqrt(q); return Math.round(l) ** 2 === q ? String(Math.round(l)) : '≈' + Math.round(l * 10) / 10; }
  const selIdx = d => { if (!S.sel || S.sel[0] !== 'b') return -1; const k = +S.sel.slice(1); return d.bands[k] ? k : -1; };
  function segDist(p, a, b) {
    const vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy;
    const t = l2 ? clamp(((p.x - a[0]) * vx + (p.y - a[1]) * vy) / l2, 0, 1) : 0;
    return Math.hypot(p.x - (a[0] + t * vx), p.y - (a[1] + t * vy));
  }
  function inPoly(poly, p) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > p.y) !== (yj > p.y) && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function nextColor(d) { for (let c = 0; c < BC.length; c++) if (!d.bands.some(b => b.c === c)) return c; return d.bands.length % BC.length; }
  function dragVertex(d, k, v, snap) {
    S.sel = 'b' + k; render();
    return {
      move(p) { const L = lay(d.n), b = d.bands[k], i = L.I(p.x), j = L.J(p.y); if (b.p[v][0] !== i || b.p[v][1] !== j) { b.p[v] = [i, j]; render(); } },
      up() {
        const b = d.bands[k]; b.p = cleanPts(b.p);
        if (b.p.length < 2) { d.bands.splice(k, 1); S.sel = null; }
        if (snapshot() !== snap) pushUndo(snap);
        render(); saveSoon();
      },
    };
  }
  function dragBand(d, k, p0, snap) {
    S.sel = 'b' + k; render();
    const b = d.bands[k], orig = b.p.map(q => q.slice());
    const minI = Math.min(...orig.map(q => q[0])), maxI = Math.max(...orig.map(q => q[0]));
    const minJ = Math.min(...orig.map(q => q[1])), maxJ = Math.max(...orig.map(q => q[1]));
    let last = '0,0';
    return {
      move(p) {
        const L = lay(d.n);
        const di = clamp(Math.round((p.x - p0.x) / L.g), -minI, d.n - 1 - maxI), dj = clamp(Math.round((p.y - p0.y) / L.g), -minJ, d.n - 1 - maxJ);
        if (`${di},${dj}` !== last) { last = `${di},${dj}`; b.p = orig.map(q => [q[0] + di, q[1] + dj]); render(); }
      },
      up() { if (snapshot() !== snap) pushUndo(snap); render(); saveSoon(); },
    };
  }

  defineTool({
    id: 'geoboard', short: 'Geoboard', kind: 'custom',
    init: () => ({ n: 7, fill: true, ink: [], bands: [{ c: 1, p: [[1, 1], [5, 1], [5, 3], [1, 3]] }, { c: 0, p: [[1, 4], [1, 6], [4, 6]] }] }),
    valid: d => Array.isArray(d.bands) && SIZES.includes(d.n),
    frame(d) { const L = lay(d.n); return { ox: L.bx, oy: L.by, k: L.side / 1000 }; },
    api: { measure },
    render(d) {
      const L = lay(d.n);
      let s = `<rect class="gb-board" x="${r1(L.bx)}" y="${r1(L.by)}" width="${r1(L.side)}" height="${r1(L.side)}" rx="${r1(L.side * 0.04)}"/>`;
      const pr = r1(clamp(L.g * 0.085, 3, 6));
      for (let j = 0; j < d.n; j++) for (let i = 0; i < d.n; i++) { const [x, y] = L.P(i, j); s += `<circle class="gb-peg" cx="${r1(x)}" cy="${r1(y)}" r="${pr}"/>`; }
      const sw = r1(clamp(L.g * 0.1, 4, 7));
      d.bands.forEach(b => {
        const c = BC[b.c % BC.length], pts = b.p.map(q => L.P(q[0], q[1]).map(r1).join(',')).join(' ');
        if (b.p.length >= 3) s += `<polygon class="gb-band" points="${pts}" fill="${d.fill ? c.f : 'none'}" fill-opacity=".2" stroke="${c.f}" stroke-width="${sw}" stroke-linejoin="round"/>`;
        else s += `<polyline class="gb-band" points="${pts}" fill="none" stroke="${c.f}" stroke-width="${sw}" stroke-linecap="round"/>`;
      });
      const k = selIdx(d);
      if (k > -1) {
        const b = d.bands[k], c = BC[b.c % BC.length], p = b.p, n = p.length, m = n === 2 ? 1 : n;
        let a2 = 0; for (let e = 0; e < n; e++) { const a = p[e], q = p[(e + 1) % n]; a2 += a[0] * q[1] - q[0] * a[1]; }
        const orient = a2 < 0 ? -1 : 1;
        for (let e = 0; e < m; e++) {
          const a = p[e], q = p[(e + 1) % n], [ax, ay] = L.P(a[0], a[1]), [bx, by] = L.P(q[0], q[1]);
          const mx = (ax + bx) / 2, my = (ay + by) / 2;
          let nx = by - ay, ny = -(bx - ax); const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
          if (n >= 3) { nx *= orient; ny *= orient; } else if (ny > 0) { nx = -nx; ny = -ny; }
          s += `<text class="gb-len" x="${r1(mx + nx * 17)}" y="${r1(my + ny * 17 + 4)}">${edgeLen(a, q)}</text>`;
          if (Math.abs(q[0] - a[0]) + Math.abs(q[1] - a[1]) > 1) s += `<circle class="gb-mh" cx="${r1(mx)}" cy="${r1(my)}" r="7" stroke="${c.f}"/>`;
        }
        p.forEach(q => { const [x, y] = L.P(q[0], q[1]); s += `<circle class="gb-vh" cx="${r1(x)}" cy="${r1(y)}" r="9" stroke="${c.f}"/>`; });
      }
      return s;
    },
    down(pt, e, d) {
      const L = lay(d.n), snap = snapshot(), k0 = selIdx(d);
      const near = (x, y, r) => Math.hypot(pt.x - x, pt.y - y) < r;
      const order = []; if (k0 > -1) order.push(k0);
      for (let k = d.bands.length - 1; k >= 0; k--) if (k !== k0) order.push(k);
      const vr = Math.max(16, L.g * 0.32);
      for (const k of order) {
        const b = d.bands[k];
        for (let v = 0; v < b.p.length; v++) { const [x, y] = L.P(b.p[v][0], b.p[v][1]); if (near(x, y, vr)) return dragVertex(d, k, v, snap); }
      }
      if (k0 > -1) {
        const b = d.bands[k0], n = b.p.length, m = n === 2 ? 1 : n;
        for (let ei = 0; ei < m; ei++) {
          const a = b.p[ei], q = b.p[(ei + 1) % n];
          if (Math.abs(q[0] - a[0]) + Math.abs(q[1] - a[1]) <= 1) continue;
          const [ax, ay] = L.P(a[0], a[1]), [bx, by] = L.P(q[0], q[1]);
          if (near((ax + bx) / 2, (ay + by) / 2, 15)) { b.p.splice(ei + 1, 0, [L.I(pt.x), L.J(pt.y)]); return dragVertex(d, k0, ei + 1, snap); }
        }
      }
      const tol = 10 + clamp(L.g * 0.05, 2, 4);
      for (const k of order) {
        const b = d.bands[k], P = b.p.map(q => L.P(q[0], q[1])), n = P.length, m = n === 2 ? 1 : n;
        for (let ei = 0; ei < m; ei++) if (segDist(pt, P[ei], P[(ei + 1) % n]) < tol) return dragBand(d, k, pt, snap);
      }
      const i = L.I(pt.x), j = L.J(pt.y), [px, py] = L.P(i, j);
      if (near(px, py, L.g * 0.42)) {
        d.bands.push({ c: nextColor(d), p: [[i, j], [i, j]] });
        return dragVertex(d, d.bands.length - 1, 1, snap);
      }
      for (const k of order) { const b = d.bands[k]; if (b.p.length >= 3 && inPoly(b.p.map(q => L.P(q[0], q[1])), pt)) return dragBand(d, k, pt, snap); }
      return { up() { if (S.sel) { S.sel = null; render(); } } };
    },
    actions(sel, d) {
      const k = selIdx(d); if (k < 0) return null;
      const b = d.bands[k];
      return [
        { label: 'Color', icon: 'palette', fn: () => { b.c = (b.c + 1) % BC.length; } },
        { id: 'del', label: 'Delete', icon: 'trash', fn: () => { d.bands.splice(k, 1); S.sel = null; } },
      ];
    },
    readout(d) {
      if (!d.bands.length) return `<div class="sub">Drag from a peg to stretch a band. Drag a corner to reshape it.</div>`;
      const k = selIdx(d);
      const list = k > -1 ? [k] : d.bands.map((_, i) => i).slice(-3);
      return list.map(i => {
        const b = d.bands[i], m = measure(b.p), c = BC[b.c % BC.length];
        if (!m) return '';
        const facts = m.n === 2 ? `length ${fmtLen(m.per, m.exact)}` : `area ${fmtArea(m.a2)} sq units · perimeter ${fmtLen(m.per, m.exact)}`;
        return `<div class="gb-row"><span class="dot" style="background:${c.f}"></span><b>${cap(m.name)}</b><span>${facts}</span></div>`;
      }).join('');
    },
    tray(d) {
      return [
        { h: 'Board', items: SIZES.map(n => ({ type: 'toggle', label: `${n} × ${n}`, on: d.n === n, fn: d => {
          d.n = n;
          d.bands = d.bands.map(b => ({ c: b.c, p: cleanPts(b.p.map(q => [Math.min(q[0], n - 1), Math.min(q[1], n - 1)])) })).filter(b => b.p.length > 1);
          S.sel = null;
        } })) },
        { h: 'Options', items: [
          { type: 'toggle', label: 'Fill shapes', on: d.fill, fn: d => { d.fill = !d.fill; } },
          exampleItem(),
          { type: 'note', text: 'Drag from any peg to stretch a new band.' },
        ] },
      ];
    },
    clear(d) { d.bands = []; },
  });
})();

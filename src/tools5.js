/* ================= Hundred chart ================= */
(() => {
  const COLS = [C.yellow, C.blue, C.red, C.green];
  const NAMES = ['Yellow', 'Blue', 'Red', 'Green'];
  function lay() {
    const top = -app.H / 2 + hudTop(), bottom = app.H / 2 - 14;
    const cs = Math.max(18, Math.min((app.W - 28) / 10, (bottom - top) / 10));
    return { cs, x0: -cs * 5, y0: top + Math.max(0, (bottom - top - cs * 10) / 2) };
  }
  const numAt = (d, r, c) => d.start + r * 10 + c;
  const colored = d => new Set(Object.keys(d.marks).map(Number));

  defineTool({
    id: 'hundred-chart', short: 'Hundred Chart', kind: 'custom',
    init: () => { const marks = {}; for (let n = 4; n <= 100; n += 4) marks[n] = 0; return { start: 1, marks, color: 0, hide: false, ink: [] }; },
    valid: d => d.marks && typeof d.marks === 'object' && (d.start === 0 || d.start === 1),
    api: { colored },
    frame() { const L = lay(); return { ox: L.x0, oy: L.y0, k: L.cs / 40 }; },
    render(d) {
      const L = lay(), fs = r1(clamp(L.cs * 0.38, 9, 18));
      let s = '';
      for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
        const n = numAt(d, r, c), m = d.marks[n], x = L.x0 + c * L.cs, y = L.y0 + r * L.cs;
        s += `<rect class="hc-cell" x="${r1(x)}" y="${r1(y)}" width="${r1(L.cs)}" height="${r1(L.cs)}"${m != null ? ` style="fill:${COLS[m % 4].f}"` : ''}/>`;
        if (!d.hide || m != null) s += `<text class="hc-num" x="${r1(x + L.cs / 2)}" y="${r1(y + L.cs / 2 + fs * 0.36)}" font-size="${fs}"${m != null ? ` style="fill:${COLS[m % 4].t}"` : ''}>${n}</text>`;
      }
      return s;
    },
    down(pt, e, d) {
      const L = lay();
      const at = p => { const c = Math.floor((p.x - L.x0) / L.cs), r = Math.floor((p.y - L.y0) / L.cs); return c >= 0 && c < 10 && r >= 0 && r < 10 ? numAt(d, r, c) : null; };
      const n0 = at(pt); if (n0 == null) return { up() {} };
      const snap = snapshot(), erase = d.marks[n0] === (d.color | 0);
      const apply = n => { if (erase) delete d.marks[n]; else d.marks[n] = d.color | 0; };
      apply(n0); render();
      let last = n0;
      return {
        move(p) { const n = at(p); if (n != null && n !== last) { last = n; apply(n); render(); } },
        up() { if (snapshot() !== snap) pushUndo(snap); render(); saveSoon(); },
      };
    },
    readout(d) {
      const by = [0, 0, 0, 0]; for (const k in d.marks) by[d.marks[k] % 4]++;
      const total = by.reduce((a, b) => a + b, 0);
      if (!total) return `<div class="sub">Tap numbers to color them. Drag to color many at once.</div>`;
      return `<div class="big">${total} <small>colored</small></div><div class="sub">${by.map((n, i) => (n ? `${n} ${NAMES[i].toLowerCase()}` : '')).filter(Boolean).join(' · ')}</div>`;
    },
    tray(d) {
      return [
        { h: 'Color', items: COLS.map((c, i) => ({ type: 'toggle', label: NAMES[i], on: (d.color | 0) === i, fn: dd => { dd.color = i; } })) },
        { h: 'Options', items: [
          { type: 'toggle', label: 'Start at 0', on: d.start === 0, fn: dd => { dd.start = dd.start === 0 ? 1 : 0; } },
          { type: 'toggle', label: 'Hide numbers', on: d.hide, fn: dd => { dd.hide = !dd.hide; } },
          { type: 'btn', label: 'Clear colors', fn: dd => { dd.marks = {}; } },
          exampleItem(),
          { type: 'note', text: 'Tap a colored number with the same color to erase it.' },
        ] },
      ];
    },
    clear(d) { d.marks = {}; },
  });
})();

/* ================= Tangram ================= */
(() => {
  const U = 40;
  // The classic 7-piece square, side 4 units.
  const RAW = {
    lt: [[0, 0], [4, 0], [2, 2]], mt: [[4, 2], [4, 4], [2, 4]], sq: [[2, 2], [3, 1], [4, 2], [3, 3]],
    st: [[3, 1], [4, 0], [4, 2]], pa: [[1, 3], [3, 3], [2, 4], [0, 4]],
  };
  const SH = {}, CEN = {};
  for (const k in RAW) {
    const v = RAW[k], cx = v.reduce((a, q) => a + q[0], 0) / v.length, cy = v.reduce((a, q) => a + q[1], 0) / v.length;
    CEN[k] = [cx * U, cy * U]; SH[k] = v.map(q => [(q[0] - cx) * U, (q[1] - cy) * U]);
  }
  const LABEL = { lt: 'Big triangle', mt: 'Medium triangle', sq: 'Square', st: 'Small triangle', pa: 'Parallelo\u00ADgram' };
  const PALT = [C.red, C.blue, C.green, C.yellow, C.violet, C.pink, C.orange];
  const KIND_COLOR = { lt: 0, mt: 2, sq: 3, st: 4, pa: 6 };
  // [kind, rotation, color] for each piece of the solved square, in the same order as SOLVED_AT.
  const SET = [['lt', 0, 0], ['lt', 270, 1], ['mt', 0, 2], ['sq', 0, 3], ['st', 0, 4], ['st', 90, 5], ['pa', 0, 6]];
  const SOLVED_AT = [[2, 2 / 3], [2 / 3, 2], [10 / 3, 10 / 3], [3, 2], [11 / 3, 1], [2, 8 / 3], [1.5, 3.5]];
  const worldVerts = p => SH[p.k].map(v => { const q = rot([p.f ? -v[0] : v[0], v[1]], p.r || 0); return [q[0] + p.x, q[1] + p.y]; });
  const draw = p => { const c = PALT[(p.c ?? KIND_COLOR[p.k]) % PALT.length]; return `<polygon points="${SH[p.k].map(q => `${r1(q[0])},${r1(q[1])}`).join(' ')}" fill="${c.f}" stroke="${c.s}" stroke-width="2" stroke-linejoin="round"/>`; };
  const box = p => { const xs = SH[p.k].map(q => q[0]), ys = SH[p.k].map(q => q[1]); return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; };
  const kinds = {}; for (const k in SH) kinds[k] = { rot: true, draw, box };
  function solvedSquare(cx = 0, cy = 0) {
    return SET.map(([k, r, c], i) => ({ id: uid(), k, r, c, x: r1(cx + (SOLVED_AT[i][0] - 2) * U), y: r1(cy + (SOLVED_AT[i][1] - 2) * U) }));
  }
  // The full set (or some kinds) spread around a ring so a shape in the middle stays clear.
  function scattered(only, radius = 215) {
    const used = new Set();
    const list = (only || SET.map(s => s[0])).map(k => {
      const i = SET.findIndex(([kk], j) => kk === k && !used.has(j));
      if (i > -1) { used.add(i); return SET[i]; }
      return [k, 0, KIND_COLOR[k]];
    });
    return list.map(([k, r, c], i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / list.length;
      return { id: uid(), k, r: (r + 45 * ((i % 3) + 1)) % 360, c, x: r1(Math.cos(a) * radius), y: r1(Math.sin(a) * radius * 0.82) };
    });
  }

  defineTool({
    id: 'tangram', short: 'Tangram', kind: 'pieces', grid: 20, center: { x: 0, y: 0 },
    init: () => ({ pieces: solvedSquare(), ink: [] }),
    api: { polys: d => d.pieces.map(worldVerts), scattered, SH, U, worldVerts },
    kinds,
    make: k => ({ c: KIND_COLOR[k] }),
    underlay: d => targetSVG(d),
    extent: d => { if (!Array.isArray(d.target)) return null; const xs = d.target.flat().map(q => q[0]), ys = d.target.flat().map(q => q[1]); return { l: Math.min(...xs), t: Math.min(...ys), r: Math.max(...xs), b: Math.max(...ys) }; },
    onDrop(p, d) {
      const mine = worldVerts(p); let best = null, bd = 14;
      for (const q of d.pieces) {
        if (q === p || Math.hypot(q.x - p.x, q.y - p.y) > 260) continue;
        for (const a of mine) for (const b of worldVerts(q)) { const dd = Math.hypot(a[0] - b[0], a[1] - b[1]); if (dd < bd) { bd = dd; best = [b[0] - a[0], b[1] - a[1]]; } }
      }
      if (!best && Array.isArray(d.target)) {
        for (const a of mine) for (const poly of d.target) for (const b of poly) { const dd = Math.hypot(a[0] - b[0], a[1] - b[1]); if (dd < bd) { bd = dd; best = [b[0] - a[0], b[1] - a[1]]; } }
      }
      if (best) { p.x = r1(p.x + best[0]); p.y = r1(p.y + best[1]); }
    },
    acts(p, d) {
      const a = [
        { label: 'Turn left', icon: 'rotccw', fn: () => { p.r = ((p.r || 0) + 315) % 360; } },
        { label: 'Turn right', icon: 'rotcw', fn: () => { p.r = ((p.r || 0) + 45) % 360; } },
      ];
      if (p.k === 'pa') a.push({ label: 'Flip', icon: 'pm', fn: () => { p.f = !p.f; } });
      a.push(delAct(p, d));
      return a;
    },
    readout(d) {
      if (Array.isArray(d.target)) {
        const cv = coverage(d.pieces.map(worldVerts), d.target);
        return `<div class="big">${Math.round(cv.cover * 100)}% <small>of the shape covered</small></div>` + (cv.fit < 0.97 && d.pieces.length ? '<div class="sub">Some pieces stick out of the shape.</div>' : '');
      }
      return `<div class="big">${d.pieces.length} <small>${plural(d.pieces.length, 'piece')}</small></div><div class="sub">Tap a piece to turn it. Pieces snap together at their corners.</div>`;
    },
    tray(d) {
      return [
        { h: 'Pieces', items: Object.keys(RAW).map(k => ({ type: 'piece', k, label: LABEL[k], icon: `<g transform="scale(${k === 'lt' ? 0.3 : 0.42})">${draw({ k })}</g>` })) },
        { h: 'Arrange', items: [
          { type: 'btn', label: 'Full set, spread out', fn: dd => { dd.pieces = scattered(); delete dd.target; } },
          { type: 'btn', label: 'Spread these out', fn: dd => { const sc = scattered(null, 215); dd.pieces.forEach((p, i) => { const q = sc[i % sc.length]; p.x = q.x + (i >= sc.length ? 30 : 0); p.y = q.y; }); } },
          exampleItem(),
        ] },
      ];
    },
  });
})();

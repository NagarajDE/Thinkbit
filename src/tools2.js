/* ================= Pattern Blocks ================= */
(() => {
  const s = 50, h = s * Math.sqrt(3) / 2, c30 = Math.cos(Math.PI / 6);
  const RAW = {
    hex: [0, 60, 120, 180, 240, 300].map(a => [s * Math.cos(a * Math.PI / 180), s * Math.sin(a * Math.PI / 180)]),
    trap: [[-s, 0], [s, 0], [s / 2, -h], [-s / 2, -h]],
    rhomb: [[0, 0], [s, 0], [1.5 * s, -h], [s / 2, -h]],
    tri: [[0, 0], [s, 0], [s / 2, -h]],
    sq: [[0, 0], [s, 0], [s, s], [0, s]],
    thin: [[0, 0], [s, 0], [s + s * c30, -s / 2], [s * c30, -s / 2]],
  };
  const SH = {};
  for (const k in RAW) {
    const v = RAW[k], cx = v.reduce((a, q) => a + q[0], 0) / v.length, cy = v.reduce((a, q) => a + q[1], 0) / v.length;
    SH[k] = v.map(q => [q[0] - cx, q[1] - cy]);
  }
  const ORDER = ['hex', 'trap', 'rhomb', 'tri', 'sq', 'thin'];
  const COL = { hex: C.yellow, trap: C.red, rhomb: C.blue, tri: C.green, sq: C.orange, thin: C.tan };
  const NM = { hex: ['hexagon', 'hexagons'], trap: ['trapezoid', 'trapezoids'], rhomb: ['blue rhombus', 'blue rhombuses'], tri: ['triangle', 'triangles'], sq: ['square', 'squares'], thin: ['tan rhombus', 'tan rhombuses'] };
  const LABEL = { hex: 'Hexagon', trap: 'Trapezoid', rhomb: 'Rhombus', tri: 'Triangle', sq: 'Square', thin: 'Thin rhombus' };
  const SIX = { hex: 6, trap: 3, rhomb: 2, tri: 1 };
  const ICON_SCALE = { hex: 0.38, trap: 0.38, rhomb: 0.3, tri: 0.52, sq: 0.56, thin: 0.32 };
  const DRAWN = {}, BOX = {};
  for (const k in SH) {
    DRAWN[k] = `<polygon points="${SH[k].map(q => `${r1(q[0])},${r1(q[1])}`).join(' ')}" fill="${COL[k].f}" stroke="${COL[k].s}" stroke-width="2" stroke-linejoin="round"/>`;
    const xs = SH[k].map(q => q[0]), ys = SH[k].map(q => q[1]);
    BOX[k] = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  const worldVerts = p => SH[p.k].map(v => { const q = rot(v, p.r || 0); return [q[0] + p.x, q[1] + p.y]; });
  const kinds = {};
  for (const k in SH) kinds[k] = { rot: true, draw: () => DRAWN[k], box: () => BOX[k] };

  function example() {
    const P = [];
    const add = (k, x, y, r) => P.push({ id: uid(), k, x: r1(x), y: r1(y), r });
    const A = [-70, -62], B = [70, -62], Cc = [-70, 62], D = [70, 62];
    add('hex', A[0], A[1], 0);
    add('trap', B[0], B[1] - h / 2, 0); add('trap', B[0], B[1] + h / 2, 180);
    for (let k = 0; k < 3; k++) { const c = rot([s / 4, h / 2], 120 * k); add('rhomb', Cc[0] + c[0], Cc[1] + c[1], 120 * k); }
    for (let k = 0; k < 6; k++) { const c = rot([s / 2, h / 3], 60 * k); add('tri', D[0] + c[0], D[1] + c[1], (180 + 60 * k) % 360); }
    return { pieces: P, ink: [] };
  }

  // Largest number of pieces of kind k that share one corner point.
  function meetAtPoint(d, k) {
    const ps = d.pieces.filter(p => p.k === k), vs = ps.map(worldVerts);
    let best = 0;
    for (const a of vs.flat()) best = Math.max(best, vs.filter(v => v.some(b => Math.hypot(a[0] - b[0], a[1] - b[1]) < 3)).length);
    return best;
  }
  const sixths = d => d.pieces.reduce((a, p) => a + (SIX[p.k] || 0), 0);

  defineTool({
    id: 'pattern-blocks', short: 'Pattern Blocks', kind: 'pieces', grid: 25, center: { x: 0, y: 0 },
    init: example,
    api: { meetAtPoint, sixths, polys: d => d.pieces.map(worldVerts), SH },
    kinds,
    underlay: d => targetSVG(d),
    extent: d => { if (!Array.isArray(d.target)) return null; const xs = d.target.flat().map(q => q[0]), ys = d.target.flat().map(q => q[1]); return { l: Math.min(...xs) - 60, t: Math.min(...ys) - 60, r: Math.max(...xs) + 60, b: Math.max(...ys) + 60 }; },
    onDrop(p, d) {
      const mine = worldVerts(p); let best = null, bd = 16;
      for (const q of d.pieces) {
        if (q === p || Math.hypot(q.x - p.x, q.y - p.y) > 170) continue;
        for (const a of mine) for (const b of worldVerts(q)) {
          const dd = Math.hypot(a[0] - b[0], a[1] - b[1]);
          if (dd < bd) { bd = dd; best = [b[0] - a[0], b[1] - a[1]]; }
        }
      }
      // With no block nearby, corners snap to the corners of a shape to cover.
      if (!best && Array.isArray(d.target)) {
        for (const a of mine) for (const poly of d.target) for (const b of poly) { const dd = Math.hypot(a[0] - b[0], a[1] - b[1]); if (dd < bd) { bd = dd; best = [b[0] - a[0], b[1] - a[1]]; } }
      }
      if (best) { p.x = r1(p.x + best[0]); p.y = r1(p.y + best[1]); }
    },
    acts(p, d) {
      return [
        { label: 'Turn left', icon: 'rotccw', fn: () => { p.r = ((p.r || 0) + 330) % 360; } },
        { label: 'Turn right', icon: 'rotcw', fn: () => { p.r = ((p.r || 0) + 30) % 360; } },
        dupAct(p, d), delAct(p, d),
      ];
    },
    readout(d) {
      if (Array.isArray(d.target)) {
        const cv = coverage(d.pieces.map(worldVerts), d.target);
        return `<div class="big">${Math.round(cv.cover * 100)}% <small>of the shape covered</small></div><div class="sub">${d.pieces.length} ${plural(d.pieces.length, 'block')}${cv.fit < 0.97 && d.pieces.length ? ' \u00B7 some blocks stick out' : ''}</div>`;
      }
      if (!d.pieces.length) return `<div class="sub">Add blocks from the tray. A hexagon counts as 1 whole.</div>`;
      const n = {}; for (const p of d.pieces) n[p.k] = (n[p.k] || 0) + 1;
      const six = Object.keys(SIX).reduce((a, k) => a + (n[k] || 0) * SIX[k], 0);
      const parts = Object.keys(SIX).filter(k => n[k]).map(k => `${n[k]} ${n[k] === 1 ? NM[k][0] : NM[k][1]}`);
      const other = ['sq', 'thin'].filter(k => n[k]).map(k => NM[k][1]);
      const unit = six === 6 ? 'whole' : six < 6 && six > 0 ? 'of a whole' : 'wholes';
      return `<div class="big">${mixedHTML(six, 6)} <small>${unit}</small></div>` +
        `<div class="sub">${parts.join(' + ') || 'No hexagon-family blocks yet'}</div>` +
        `<div class="sub">Hexagon = 1 whole${other.length ? `. ${cap(other.join(' and '))} are not counted.` : ''}</div>`;
    },
    tray() {
      return [
        { h: 'Blocks', items: ORDER.map(k => ({ type: 'piece', k, label: LABEL[k], icon: `<g transform="scale(${ICON_SCALE[k]})">${DRAWN[k]}</g>` })) },
        { h: 'Options', items: [exampleItem(), { type: 'note', text: 'Blocks snap together at their corners.' }] },
      ];
    },
  });
})();

/* ================= Ten Frames ================= */
(() => {
  const CS = 54, CR = 21;
  const CC = { r: C.red, y: C.yellow };
  const ROWS = { f10: 2, f5: 1 };
  const hOf = p => ROWS[p.k] * CS;
  const cellPos = (k, i) => ({ x: -2 * CS + (i % 5) * CS, y: ROWS[k] === 2 ? (i < 5 ? -CS / 2 : CS / 2) : 0 });
  const counter = c => { const k = CC[c] || CC.r; return `<circle r="${CR}" fill="${k.f}" stroke="${k.s}" stroke-width="2"/><circle r="${r1(CR * 0.6)}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>`; };
  function frame(p) {
    const w = 5 * CS, hh = hOf(p); let g = '';
    for (let i = 1; i < 5; i++) g += `M${-w / 2 + i * CS} ${-hh / 2}V${hh / 2}`;
    if (ROWS[p.k] === 2) g += `M${-w / 2} 0H${w / 2}`;
    let s = `<rect class="tf-frame" x="${-w / 2}" y="${-hh / 2}" width="${w}" height="${hh}" rx="6"/><path class="tf-grid" d="${g}"/>`;
    (p.cells || []).forEach((c, i) => { if (c) { const q = cellPos(p.k, i); s += `<g class="cnt" data-cell="${i}" transform="translate(${q.x} ${q.y})">${counter(c)}</g>`; } });
    return s;
  }
  const frameBox = p => ({ x: -2.5 * CS, y: -hOf(p) / 2, w: 5 * CS, h: hOf(p) });

  defineTool({
    id: 'ten-frames', short: 'Ten Frames', kind: 'pieces', grid: 27, center: { x: 0, y: 0 },
    init() {
      const f = (y, cells) => ({ id: uid(), k: 'f10', x: 0, y, r: 0, cells });
      const A = f(-70, ['r', 'r', 'r', 'r', 'r', 'r', 'r', 'y', 'y', 'y']);
      const B = f(70, ['y', 'y', null, null, null, null, null, null, null, null]);
      return { pieces: [A, B], last: B.id, ink: [] };
    },
    kinds: {
      f10: { draw: frame, box: frameBox },
      f5: { draw: frame, box: frameBox },
      cnt: { draw: p => counter(p.c), box: () => ({ x: -CR, y: -CR, w: 2 * CR, h: 2 * CR }) },
    },
    make: (k, extra) => (k === 'cnt' ? { c: extra === 'y' ? 'y' : 'r' } : { cells: Array(ROWS[k] * 5).fill(null) }),
    place(p, d) {
      const frames = d.pieces.filter(q => q.cells);
      if (p.k === 'cnt') {
        const f = frames.find(q => q.id === d.last && q.cells.includes(null)) || frames.find(q => q.cells.includes(null));
        if (f) { f.cells[f.cells.indexOf(null)] = p.c; d.last = f.id; return 'absorbed'; }
        return false;
      }
      if (!frames.length) return false;
      const low = frames.reduce((a, q) => (q.y + hOf(q) / 2 > a.y + hOf(a) / 2 ? q : a));
      const v = view(), y = r1(low.y + hOf(low) / 2 + 16 + hOf(p) / 2);
      if (y + hOf(p) / 2 > v.y + app.H / (2 * v.s) - 10) return false;
      p.x = low.x; p.y = y; d.last = p.id; return true;
    },
    pieceDown(p, e, pt, d) {
      if (p.k === 'cnt') return null;
      d.last = p.id;
      const ce = e.target.closest && e.target.closest('.cnt');
      if (!ce) return null;
      const i = +ce.dataset.cell, snap = snapshot(), sx = e.clientX, sy = e.clientY;
      let drag = null;
      return {
        move(q, ev) {
          if (drag) { drag.move(q, ev); return; }
          if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
          const c = p.cells[i]; p.cells[i] = null;
          const cnt = { id: uid(), k: 'cnt', x: r1(q.x), y: r1(q.y), r: 0, c };
          d.pieces.push(cnt);
          drag = startPieceDrag(cnt, q, ev, { snap, moved: true, off: { x: 0, y: 0 } });
          drag.move(q, ev);
        },
        up(q, ev, c) {
          if (drag) { drag.up(q, ev, c); return; }
          if (!c && p.cells[i]) { p.cells[i] = p.cells[i] === 'r' ? 'y' : 'r'; }
          if (snapshot() !== snap) pushUndo(snap);
          render(); saveSoon();
        },
      };
    },
    tap(p) { if (p.k !== 'cnt') return false; p.c = p.c === 'r' ? 'y' : 'r'; return true; },
    onDrop(p, d) {
      if (p.k !== 'cnt') return;
      const frames = d.pieces.filter(q => q.cells).reverse();
      for (const f of frames) {
        const lx = p.x - f.x, ly = p.y - f.y;
        if (Math.abs(lx) > 2.5 * CS + 14 || Math.abs(ly) > hOf(f) / 2 + 14) continue;
        let best = -1, bd = Infinity;
        f.cells.forEach((c, i) => { if (c) return; const q = cellPos(f.k, i), dd = Math.hypot(q.x - lx, q.y - ly); if (dd < bd) { bd = dd; best = i; } });
        if (best > -1) { f.cells[best] = p.c; removeP(d, p.id); d.last = f.id; return; }
      }
    },
    acts(p, d) {
      if (!p.cells) return null;
      return [
        { label: 'Fill', icon: 'fill', fn: () => { p.cells = p.cells.map(c => c || 'r'); } },
        { label: 'Empty', icon: 'empty', fn: () => { p.cells = p.cells.map(() => null); } },
        dupAct(p, d, q => { q.x = p.x; q.y = r1(p.y + hOf(p) + 16); }),
        delAct(p, d),
      ];
    },
    readout(d) {
      let r = 0, y = 0; const per = [];
      for (const p of d.pieces) {
        if (p.cells) { let n = 0; for (const c of p.cells) if (c) { n++; if (c === 'y') y++; else r++; } per.push(n); }
        else if (p.k === 'cnt') { if (p.c === 'y') y++; else r++; }
      }
      if (!r && !y && !per.length) return `<div class="sub">Add a ten frame, then tap a counter in the tray to fill it.</div>`;
      return `<div class="big">${r + y}</div><div class="sub">${r} red + ${y} yellow</div>` + (per.length > 1 ? `<div class="sub">In the frames: ${per.join(' + ')}</div>` : '');
    },
    tray() {
      return [
        { h: 'Frames and counters', items: [
          { type: 'piece', k: 'f10', label: 'Ten frame', icon: `<g transform="scale(.15)">${frame({ k: 'f10', cells: [] })}</g>` },
          { type: 'piece', k: 'f5', label: 'Five frame', icon: `<g transform="scale(.15)">${frame({ k: 'f5', cells: [] })}</g>` },
          { type: 'piece', k: 'cnt', extra: 'r', label: 'Red', icon: `<g transform="scale(.8)">${counter('r')}</g>` },
          { type: 'piece', k: 'cnt', extra: 'y', label: 'Yellow', icon: `<g transform="scale(.8)">${counter('y')}</g>` },
        ] },
        { h: 'Options', items: [exampleItem(), { type: 'note', text: 'Tap a counter to flip its color. Drag it out to move it.' }] },
      ];
    },
  });
})();

/* ================= Algebra Tiles ================= */
(() => {
  const XL = 90, UL = 20;
  const K = { x2: { w: XL, h: XL, c: C.blue, l: 'x²', fs: 24 }, x: { w: UL, h: XL, c: C.green, l: 'x', fs: 15 }, one: { w: UL, h: UL, c: C.amber, l: '1', fs: 11 } };
  const dims = p => (p.r ? { w: K[p.k].h, h: K[p.k].w } : { w: K[p.k].w, h: K[p.k].h });
  function draw(p) {
    const { w, h } = dims(p), k = K[p.k], c = p.neg ? C.red : k.c;
    return `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="3" fill="${c.f}" stroke="${c.s}" stroke-width="1.5"/>` +
      `<text class="at-l" x="0" y="${r1(k.fs * 0.36)}" font-size="${k.fs}" fill="${c.t}">${p.neg ? MINUS : ''}${k.l}</text>`;
  }
  const snapGrid = p => { const { w, h } = dims(p); p.x = Math.round((p.x - w / 2) / 10) * 10 + w / 2; p.y = Math.round((p.y - h / 2) / 10) * 10 + h / 2; };
  const tally = ps => { const n = { x2: 0, x: 0, one: 0 }; for (const p of ps) if (p.k in n) n[p.k] += p.neg ? -1 : 1; return n; };
  function expr(n) {
    const terms = [];
    const add = (c, v) => { if (!c) return; const a = Math.abs(c); terms.push([c < 0, v ? (a === 1 ? '' : a) + v : String(a)]); };
    add(n.x2, 'x²'); add(n.x, 'x'); add(n.one, '');
    if (!terms.length) return '0';
    return terms.map(([neg, s], i) => (i ? ` ${neg ? MINUS : '+'} ` : neg ? MINUS : '') + s).join('');
  }
  const pairs = ps => ['x2', 'x', 'one'].reduce((z, k) => z + Math.min(ps.filter(p => p.k === k && !p.neg).length, ps.filter(p => p.k === k && p.neg).length), 0);
  const sides = d => (d.mat ? [d.pieces.filter(p => p.x < 0), d.pieces.filter(p => p.x >= 0)] : [d.pieces]);
  function removeZeroPairs(d) {
    let removed = 0;
    for (const side of sides(d)) for (const k of ['x2', 'x', 'one']) {
      const pos = side.filter(p => p.k === k && !p.neg), neg = side.filter(p => p.k === k && p.neg), m = Math.min(pos.length, neg.length);
      if (!m) continue;
      const kill = new Set([...pos.slice(-m), ...neg.slice(-m)].map(p => p.id));
      d.pieces = d.pieces.filter(p => !kill.has(p.id)); removed += m;
    }
    return removed;
  }
  function example() {
    const P = [];
    const add = (k, l, t, neg) => { const p = { id: uid(), k, x: 0, y: 0, r: 0, neg: !!neg }; const { w, h } = dims(p); p.x = l + w / 2; p.y = t + h / 2; P.push(p); };
    add('x', -220, -60); add('x', -190, -60);
    for (let i = 0; i < 3; i++) add('one', -150 + 30 * i, -60);
    for (let i = 0; i < 7; i++) add('one', 40 + 30 * i, -60);
    return { pieces: P, mat: true, ink: [] };
  }
  const box = p => { const { w, h } = dims(p); return { x: -w / 2, y: -h / 2, w, h }; };

  defineTool({
    id: 'algebra-tiles', short: 'Algebra Tiles', kind: 'pieces', grid: 10, center: { x: 0, y: 10 },
    init: example,
    kinds: { x2: { draw, box }, x: { draw, box }, one: { draw, box } },
    make: (k, extra) => ({ neg: extra === 'neg' }),
    place(p) {
      const v = view(), n = app.cascade = (app.cascade + 1) % 7;
      p.x = v.x + (n - 3) * 20; p.y = v.y + 30 / v.s + (n - 3) * 20; snapGrid(p); return true;
    },
    onDrop: p => snapGrid(p),
    acts(p, d) {
      const a = [{ label: 'Flip sign', icon: 'pm', fn: () => { p.neg = !p.neg; } }];
      if (p.k === 'x') a.push({ label: 'Turn', icon: 'rotcw', fn: () => { p.r = p.r ? 0 : 90; snapGrid(p); } });
      a.push(dupAct(p, d, q => snapGrid(q)), delAct(p, d));
      return a;
    },
    underlay(d) {
      if (!d.mat) return '';
      return `<rect class="mat" x="-250" y="-190" width="240" height="400" rx="14"/><rect class="mat" x="10" y="-190" width="240" height="400" rx="14"/>` +
        `<text class="mat-h" x="-130" y="-160">Left side</text><text class="mat-h" x="130" y="-160">Right side</text>` +
        `<circle class="eq-c" cx="0" cy="10" r="16"/><text class="eq-t" x="0" y="18">=</text>`;
    },
    readout(d) {
      if (!d.pieces.length) return `<div class="sub">Add tiles from the tray. Red tiles are negative.</div>`;
      const sd = sides(d), z = sd.reduce((a, s) => a + pairs(s), 0);
      let big, sub = '';
      if (d.mat) {
        const a = tally(sd[0]), b = tally(sd[1]);
        big = `${expr(a)} = ${expr(b)}`;
        if (!a.x2 && !b.x2) {
          if (a.x !== b.x) sub = `Balanced when x = ${ratHTML(b.one - a.one, a.x - b.x)}`;
          else if (a.x) sub = a.one === b.one ? 'True for every value of x' : 'No value of x balances this';
        }
      } else big = expr(tally(d.pieces));
      return `<div class="big">${big}</div>` + (sub ? `<div class="sub">${sub}</div>` : '') +
        (z ? `<div class="hint">${z} zero ${plural(z, 'pair')} can be removed.</div>` : '');
    },
    tray(d) {
      const it = (k, neg, label) => ({ type: 'piece', k, extra: neg ? 'neg' : '', label, icon: `<g transform="scale(${k === 'one' ? 1.4 : 0.4})">${draw({ k, neg, r: 0 })}</g>` });
      return [
        { h: 'Tiles', items: [it('x2', false, 'x²'), it('x', false, 'x'), it('one', false, '1'), it('x2', true, '−x²'), it('x', true, '−x'), it('one', true, '−1')] },
        { h: 'Options', items: [
          { type: 'toggle', label: 'Equation mat', on: d.mat, fn: d => { d.mat = !d.mat; } },
          { type: 'btn', label: 'Remove zero pairs', fn: d => { const n = removeZeroPairs(d); S.sel = null; toast(n ? `Removed ${n} zero ${plural(n, 'pair')}.` : 'No zero pairs to remove.'); } },
          exampleItem(),
        ] },
      ];
    },
    extent: d => (d.mat ? { l: -250, t: -190, r: 250, b: 210 } : null),
  });
})();

/* ================= Clock ================= */
(() => {
  const WORD = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  function lay() {
    const top = -app.H / 2 + hudTop(), bottom = app.H / 2 - 12;
    const R = Math.max(70, Math.min(app.W / 2 - 42, (bottom - top) / 2 - 26));
    return { cx: 0, cy: r1((top + bottom) / 2), R };
  }
  function words(h, m) {
    const nx = (h % 12) + 1;
    if (m === 0) return `${WORD[h]} o’clock`;
    if (m === 15) return `quarter past ${WORD[h]}`;
    if (m === 30) return `half past ${WORD[h]}`;
    if (m === 45) return `quarter to ${WORD[nx]}`;
    if (m < 30) return `${m} ${plural(m, 'minute')} past ${WORD[h]}`;
    return `${60 - m} ${plural(60 - m, 'minute')} to ${WORD[nx]}`;
  }
  function hand(id, ang, len, w, c, cx, cy) {
    const a = ang * Math.PI / 180, x2 = r1(cx + Math.sin(a) * len), y2 = r1(cy - Math.cos(a) * len);
    const xb = r1(cx - Math.sin(a) * len * 0.14), yb = r1(cy + Math.cos(a) * len * 0.14);
    return `<g data-hand="${id}"><line class="hit" x1="${xb}" y1="${yb}" x2="${x2}" y2="${y2}" stroke-width="36"/>` +
      `<line x1="${xb}" y1="${yb}" x2="${x2}" y2="${y2}" stroke="${c.f}" stroke-width="${r1(w)}" stroke-linecap="round"/></g>`;
  }

  defineTool({
    id: 'clock', short: 'Clock', kind: 'custom',
    init: () => ({ m: 225, mins: true, snap5: false, ink: [] }),
    valid: d => typeof d.m === 'number' && isFinite(d.m),
    frame() { const { cx, cy, R } = lay(); return { ox: cx, oy: cy, k: R / 500 }; },
    render(d) {
      const { cx, cy, R } = lay();
      let s = `<circle class="ck-face" cx="${cx}" cy="${cy}" r="${r1(R)}"/>`;
      for (let i = 0; i < 60; i++) {
        const a = i * Math.PI / 30, maj = i % 5 === 0, r0 = R * (maj ? 0.86 : 0.92), r2 = R * 0.96;
        s += `<line class="ck-tick${maj ? ' major' : ''}" x1="${r1(cx + Math.sin(a) * r0)}" y1="${r1(cy - Math.cos(a) * r0)}" x2="${r1(cx + Math.sin(a) * r2)}" y2="${r1(cy - Math.cos(a) * r2)}"/>`;
      }
      const fs = r1(R * 0.16);
      for (let n = 1; n <= 12; n++) {
        const a = n * Math.PI / 6, rr = R * 0.7;
        s += `<text class="ck-num" x="${r1(cx + Math.sin(a) * rr)}" y="${r1(cy - Math.cos(a) * rr + fs * 0.36)}" font-size="${fs}">${n}</text>`;
      }
      if (d.mins) {
        const ms = r1(clamp(R * 0.075, 10, 14));
        for (let m = 0; m < 60; m += 5) {
          const a = m * Math.PI / 30, rr = R + ms * 1.3;
          s += `<text class="ck-min" x="${r1(cx + Math.sin(a) * rr)}" y="${r1(cy - Math.cos(a) * rr + ms * 0.36)}" font-size="${ms}">${String(m).padStart(2, '0')}</text>`;
        }
      }
      s += hand('h', (d.m % 720) / 2, R * 0.5, R * 0.06, C.blue, cx, cy) + hand('m', (d.m % 60) * 6, R * 0.8, R * 0.038, C.red, cx, cy);
      return s + `<circle class="ck-cap" cx="${cx}" cy="${cy}" r="${r1(R * 0.045)}"/>`;
    },
    down(pt, e, d) {
      const { cx, cy, R } = lay(), dist = Math.hypot(pt.x - cx, pt.y - cy);
      const ang = p => (Math.atan2(p.x - cx, -(p.y - cy)) * 180 / Math.PI + 360) % 360;
      const adiff = (a, b) => { const x = Math.abs(a - b) % 360; return x > 180 ? 360 - x : x; };
      if (dist > R + 24) return { up() {} };
      // Grab the hand under the finger: near the middle means the short hour hand, farther out the minute hand.
      const a0 = ang(pt), ha = (d.m % 720) / 2, ma = (d.m % 60) * 6;
      let which, grabbed = true;
      if (dist < R * 0.58 && adiff(a0, ha) < 25) which = 'h';
      else if (dist < R * 0.92 && adiff(a0, ma) < 20) which = 'm';
      else { grabbed = false; which = dist < R * 0.62 && adiff(a0, ha) < adiff(a0, ma) ? 'h' : 'm'; }
      const snap = snapshot(); let prev = d.m % 60;
      const apply = p => {
        const a = ang(p); let m;
        if (which === 'm') {
          let mm = Math.round(a / 6) % 60;
          if (d.snap5) mm = (Math.round(mm / 5) * 5) % 60;
          let hr = Math.floor(d.m / 60);
          if (prev >= 45 && mm < 15) hr++; else if (prev < 15 && mm >= 45) hr--;
          prev = mm; m = hr * 60 + mm;
        } else {
          m = Math.round(a * 2) % 720;
          if (d.snap5) m = (Math.round(m / 5) * 5) % 720;
          prev = m % 60;
        }
        m = ((m % 720) + 720) % 720;
        if (m !== d.m) { d.m = m; render(); }
      };
      if (!grabbed) apply(pt); // tapping the face moves the nearest hand there
      return { move: apply, up() { if (snapshot() !== snap) pushUndo(snap); render(); saveSoon(); } };
    },
    readout(d) {
      const h = Math.floor(d.m / 60) % 12 || 12, mm = d.m % 60;
      return `<div class="big">${h}:${String(mm).padStart(2, '0')}</div><div class="sub">${cap(words(h, mm))}</div>`;
    },
    tray(d) {
      return [
        { h: 'Clock', items: [
          { type: 'toggle', label: 'Minute numbers', on: d.mins, fn: d => { d.mins = !d.mins; } },
          { type: 'toggle', label: 'Snap to 5 minutes', on: d.snap5, fn: d => { d.snap5 = !d.snap5; if (d.snap5) d.m = Math.round(d.m / 5) * 5 % 720; } },
          { type: 'btn', label: 'Random time', fn: d => { d.m = Math.floor(Math.random() * 144) * 5; } },
          exampleItem(),
        ] },
        { h: 'How to use', items: [{ type: 'note', text: 'Drag the red minute hand or the blue hour hand. The hour hand follows the minutes.' }] },
      ];
    },
    clear(d) { d.m = 0; },
  });
})();

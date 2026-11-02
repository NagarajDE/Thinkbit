/* ================= Area Model (multi-digit multiplication) ================= */
(() => {
  const PAL = [C.blue, C.green, C.amber, C.violet, C.teal, C.orange];
  const MIN = 46; // smallest part, in px, so its label still fits
  // 245 -> [200, 40, 5]
  function parts(n) {
    const s = String(n), out = [];
    for (let i = 0; i < s.length; i++) { const v = +s[i] * 10 ** (s.length - 1 - i); if (v) out.push(v); }
    return out.length ? out : [n];
  }
  // Scale sizes to `total`, then make sure every part is at least MIN wide.
  function distribute(weights, total) {
    const sum = weights.reduce((a, b) => a + b, 0) || 1;
    let sz = weights.map(w => (w / sum) * total), adjusted = false;
    if (sz.some(v => v < MIN) && MIN * sz.length <= total) {
      adjusted = true;
      const small = sz.map(v => v < MIN), rest = total - MIN * small.filter(Boolean).length;
      const bigSum = sz.reduce((a, v, i) => a + (small[i] ? 0 : v), 0) || 1;
      sz = sz.map((v, i) => (small[i] ? MIN : (v / bigSum) * rest));
    }
    return { sz, adjusted };
  }
  function region() {
    const top = -app.H / 2 + Math.max(108, hudTop() + 22), bottom = app.H / 2 - 30, left = -app.W / 2 + 58, right = app.W / 2 - 22;
    return { top, left, RW: Math.max(140, right - left), RH: Math.max(140, bottom - top) };
  }
  function lay(d) {
    const g = region(), A = d.split ? parts(d.a) : [d.a], B = d.split ? parts(d.b) : [d.b];
    const toScale = d.a / d.b <= 4 && d.b / d.a <= 4;
    let W, H, wa, hb;
    if (toScale) {
      const u = Math.min(g.RW / d.a, g.RH / d.b);
      W = d.a * u; H = d.b * u; wa = distribute(A, W); hb = distribute(B, H);
      return finish(g, A, B, W, H, wa, hb, wa.adjusted || hb.adjusted ? 0 : u);
    }
    if (d.a >= d.b) { W = g.RW; H = Math.min(g.RH, g.RW * 0.62); } else { H = g.RH; W = Math.min(g.RW, g.RH * 0.62); }
    wa = distribute(A.map(Math.sqrt), W); hb = distribute(B.map(Math.sqrt), H);
    return finish(g, A, B, W, H, wa, hb, 0, true);
  }
  function finish(g, A, B, W, H, wa, hb, u, open) {
    const x0 = g.left + (g.RW - W) / 2, y0 = g.top + (g.RH - H) / 2;
    const xs = [x0], ys = [y0];
    wa.sz.forEach(v => xs.push(xs[xs.length - 1] + v)); hb.sz.forEach(v => ys.push(ys[ys.length - 1] + v));
    return { A, B, x0, y0, W, H, xs, ys, u, notToScale: !!open || wa.adjusted || hb.adjusted };
  }
  const key = (i, j) => `${i},${j}`;

  defineTool({
    id: 'area-model', short: 'Area Model', kind: 'custom',
    init: () => ({ a: 23, b: 14, split: true, grid: true, all: false, rev: [], ink: [] }),
    valid: d => Number.isInteger(d.a) && Number.isInteger(d.b) && Array.isArray(d.rev),
    frame() { const g = region(); return { ox: g.left, oy: g.top, k: Math.min(g.RW, g.RH) / 1000 }; },
    render(d) {
      const L = lay(d); let s = '';
      L.B.forEach((pb, j) => L.A.forEach((pa, i) => {
        const x = L.xs[i], y = L.ys[j], w = L.xs[i + 1] - x, h = L.ys[j + 1] - y, c = PAL[(i + j * 2) % PAL.length];
        const shown = d.all || d.rev.includes(key(i, j)) || isCoach();
        const big = clamp(Math.min(w, h) * 0.3, 12, 30), small = clamp(big * 0.55, 10, 15);
        const cx = r1(x + w / 2), cy = r1(y + h / 2);
        s += `<rect class="am-cell" data-cell="${i},${j}" x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" fill="${c.f}" fill-opacity=".16"/>`;
        if (Math.min(w, h) >= 40) s += `<text class="am-e" x="${cx}" y="${r1(cy - big * 0.55)}" font-size="${r1(small)}">${pa} × ${pb}</text>`;
        s += `<text class="am-q" x="${cx}" y="${r1(cy + big * (Math.min(w, h) >= 40 ? 0.6 : 0.35))}" font-size="${r1(big)}">${shown ? pa * pb : '?'}</text>`;
      }));
      if (d.grid && L.u >= 5 && d.a * d.b <= 2500) {
        let g = '';
        for (let k = 1; k < d.a; k++) g += `M${r1(L.x0 + k * L.u)} ${r1(L.y0)}v${r1(L.H)}`;
        for (let k = 1; k < d.b; k++) g += `M${r1(L.x0)} ${r1(L.y0 + k * L.u)}h${r1(L.W)}`;
        s += `<path class="am-grid" d="${g}"/>`;
      }
      L.A.forEach((pa, i) => { s += `<text class="am-side" x="${r1((L.xs[i] + L.xs[i + 1]) / 2)}" y="${r1(L.y0 - 10)}" font-size="16">${pa}</text>`; });
      L.B.forEach((pb, j) => { s += `<text class="am-side" x="${r1(L.x0 - 10)}" y="${r1((L.ys[j] + L.ys[j + 1]) / 2 + 6)}" font-size="16" style="text-anchor:end">${pb}</text>`; });
      if (L.notToScale) s += `<text class="am-note" x="${r1(L.x0 + L.W / 2)}" y="${r1(L.y0 + L.H + 20)}">Parts not drawn to scale</text>`;
      return s;
    },
    down(pt, e, d) {
      const c = e.target.closest && e.target.closest('[data-cell]');
      if (!c) return { up() {} };
      const k = c.dataset.cell, snap = snapshot();
      return {
        up(p, ev, cancelled) {
          if (cancelled) return;
          const i = d.rev.indexOf(k); if (i > -1) d.rev.splice(i, 1); else d.rev.push(k);
          if (snapshot() !== snap) pushUndo(snap);
          render(); saveSoon();
        },
      };
    },
    readout(d) {
      const A = d.split ? parts(d.a) : [d.a], B = d.split ? parts(d.b) : [d.b];
      const prods = []; B.forEach(pb => A.forEach(pa => prods.push(pa * pb)));
      const done = d.all || isCoach() || d.rev.length >= prods.length;
      if (done) return `<div class="big">${d.a} × ${d.b} = ${prods.length > 1 ? prods.join(' + ') + ' = ' : ''}${(d.a * d.b).toLocaleString('en-US')}</div>`;
      return `<div class="big">${d.a} × ${d.b}</div><div class="sub">Work out each part, then tap it to check (${d.rev.length} of ${prods.length}).</div>`;
    },
    tray(d) {
      const set = (k, v) => dd => { dd[k] = clamp(v, 1, 999); dd.rev = []; };
      const step = (k, delta) => ({ type: 'btn', sq: true, label: (delta > 0 ? '+' : MINUS) + Math.abs(delta), aria: `${delta > 0 ? 'Increase' : 'Decrease'} the ${k === 'a' ? 'first' : 'second'} number by ${Math.abs(delta)}`, fn: dd => set(k, dd[k] + delta)(dd) });
      const pick = (a, b) => ({ type: 'btn', label: `${a} × ${b}`, fn: dd => { dd.a = a; dd.b = b; dd.rev = []; } });
      return [
        { h: 'First number (width)', items: [step('a', -10), step('a', -1), { type: 'label', text: String(d.a) }, step('a', 1), step('a', 10)] },
        { h: 'Second number (height)', items: [step('b', -10), step('b', -1), { type: 'label', text: String(d.b) }, step('b', 1), step('b', 10)] },
        { h: 'Try', items: [pick(4, 36), pick(23, 14), pick(3, 245), { type: 'btn', label: 'Random', fn: dd => {
          const two = Math.random() < 0.5;
          dd.a = two ? 11 + Math.floor(Math.random() * 89) : 2 + Math.floor(Math.random() * 8);
          dd.b = two ? 11 + Math.floor(Math.random() * 89) : 12 + Math.floor(Math.random() * 988);
          dd.rev = [];
        } }] },
        { h: 'Options', items: [
          { type: 'toggle', label: 'Split by place value', on: d.split, fn: dd => { dd.split = !dd.split; dd.rev = []; } },
          { type: 'toggle', label: 'Grid', on: d.grid, fn: dd => { dd.grid = !dd.grid; } },
          { type: 'toggle', label: 'Show all products', on: d.all, fn: dd => { dd.all = !dd.all; } },
        ] },
      ];
    },
    clear(d) { d.rev = []; },
  });
})();

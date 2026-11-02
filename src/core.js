/* ================= helpers ================= */
const $ = (s, el = document) => el.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = v => Math.round(v * 10) / 10;
const uid = () => 'p' + Math.random().toString(36).slice(2, 9);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const MINUS = '−';
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a || 1; };
const plural = (n, one, many) => (n === 1 ? one : many || one + 's');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const rot = (v, deg) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c]; };
function pip(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
// How much of the target shapes the pieces cover (cover), and how much of the pieces sit inside the targets (fit).
function coverage(polys, targets, step = 3) {
  const box = ps => { let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity; for (const p of ps) for (const [x, y] of p) { l = Math.min(l, x); t = Math.min(t, y); r = Math.max(r, x); b = Math.max(b, y); } return { l, t, r, b }; };
  const inAny = (ps, x, y) => ps.some(p => pip(p, x, y));
  const sample = (ps, other) => {
    let n = 0, hit = 0; if (!ps.length) return 0;
    const B = box(ps);
    for (let y = B.t + step / 2; y < B.b; y += step) for (let x = B.l + step / 2; x < B.r; x += step) if (inAny(ps, x, y)) { n++; if (inAny(other, x, y)) hit++; }
    return n ? hit / n : 0;
  };
  return { cover: sample(targets, polys), fit: sample(polys, targets) };
}
const targetSVG = d => (Array.isArray(d.target) ? d.target.map(p => `<polygon class="target" points="${p.map(q => `${r1(q[0])},${r1(q[1])}`).join(' ')}"/>`).join('') : '');

const C = {
  red:    { f: '#E5484D', s: '#B42F34', t: '#FFFFFF' },
  orange: { f: '#F48A2A', s: '#C0640D', t: '#2B1500' },
  yellow: { f: '#F5C842', s: '#C39A14', t: '#2B2200' },
  amber:  { f: '#FFB224', s: '#C68100', t: '#2B1C00' },
  green:  { f: '#2FA36B', s: '#1D774C', t: '#FFFFFF' },
  teal:   { f: '#14A494', s: '#0C766A', t: '#04241F' },
  blue:   { f: '#3E7BFA', s: '#2759C9', t: '#FFFFFF' },
  violet: { f: '#8B6CEF', s: '#6447C8', t: '#FFFFFF' },
  pink:   { f: '#E5498A', s: '#B52A65', t: '#FFFFFF' },
  brown:  { f: '#A97C55', s: '#7B5534', t: '#FFFFFF' },
  tan:    { f: '#E4CBA3', s: '#B4976A', t: '#3A2A14' },
};

const ICON = {
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  tasks: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="m3.5 6 1.5 1.5L8 4.5M3.5 12l1.5 1.5L8 10.5M3.5 18l1.5 1.5L8 16.5"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  next: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  min: '<path d="m6 15 6-6 6 6"/>',
  max: '<path d="m6 9 6 6 6-6"/>',
  rotcw: '<path d="M21 12a9 9 0 1 1-2.64-6.36L21 8"/><path d="M21 3v5h-5"/>',
  rotccw: '<path d="M3 12a9 9 0 1 0 2.64-6.36L3 8"/><path d="M3 3v5h5"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  pm: '<path d="M12 4v9M7.5 8.5h9M7.5 19h9"/>',
  split: '<rect x="3" y="7" width="7.5" height="10" rx="1"/><rect x="13.5" y="7" width="7.5" height="10" rx="1"/>',
  split3: '<rect x="2" y="7" width="5.5" height="10" rx="1"/><rect x="9.25" y="7" width="5.5" height="10" rx="1"/><rect x="16.5" y="7" width="5.5" height="10" rx="1"/>',
  brk: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  trade: '<path d="M4 8h13l-3-3"/><path d="M20 16H7l3 3"/>',
  fill: '<rect x="2" y="7" width="20" height="10" rx="1"/><circle cx="7" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="17" cy="12" r="2" fill="currentColor"/>',
  empty: '<rect x="2" y="7" width="20" height="10" rx="1"/><path d="M8.7 7v10M15.3 7v10"/>',
  palette: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1.5" fill="currentColor"/><circle cx="12" cy="7.5" r="1.5" fill="currentColor"/><circle cx="16" cy="10" r="1.5" fill="currentColor"/>',
};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n] || ''}</svg>`;

/* fractions as text and as stacked HTML */
function fracParts(n, d) { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); n /= g; d /= g; const neg = n < 0; n = Math.abs(n); return { neg, w: Math.floor(n / d), n: n % d, d }; }
const stack = (n, d) => `<span class="fr"><span>${n}</span><span>${d}</span></span>`;
function mixedHTML(n, d) { const f = fracParts(n, d); let s = ''; if (f.w || !f.n) s += f.w; if (f.n) s += (s ? ' ' : '') + stack(f.n, f.d); return (f.neg ? MINUS : '') + s; }
function mixedText(n, d) { const f = fracParts(n, d); let s = ''; if (f.w || !f.n) s += f.w; if (f.n) s += (s ? ' ' : '') + f.n + '/' + f.d; return (f.neg ? MINUS : '') + s; }
function ratHTML(n, d) { const f = fracParts(n, d); const num = f.w * f.d + f.n; return (f.neg ? MINUS : '') + (f.d === 1 ? num : stack(num, f.d)); }

/* ================= state ================= */
const TOOLS = [], TOOL = {};
const defineTool = t => { TOOLS.push(t); TOOL[t.id] = t; };
const S = {
  tool: null, data: {}, views: {}, undo: {}, sel: null, show: true,
  role: 'solo', task: null, taskMin: false, progress: [], seen: {}, coachInk: {}, custom: [], build: null, set: null, lastSet: null,
  pen: { on: false, color: 0, erase: false },
};
const app = { W: 1, H: 1, popIds: new Set(), cascade: 0, trayItems: [], ctxActs: [] };
let active = null;
const tool = () => TOOL[S.tool];
const data = () => S.data[S.tool];
// The parent's phone mirrors the kid's board, except while it builds a board for a new task.
const isCoach = () => S.role === 'coach' && !S.build;
const findP = (d, id) => (d.pieces || []).find(p => p.id === id);
const removeP = (d, id) => { d.pieces = d.pieces.filter(p => p.id !== id); };
// Values (readouts, row totals) are hidden from the kid while a task asks them to work it out.
function showVals() {
  if (!S.show) return false;
  if (isCoach()) return true;
  if (S.set) return false; // contest practice: no readouts until it is scored
  if (!S.task) return true;
  const t = getTask(S.task.id);
  return !(t && t.hide !== false && S.task.status !== 'ok');
}

/* ================= view ================= */
function view() {
  const t = tool();
  if (t.kind !== 'pieces') return { x: 0, y: 0, s: 1 };
  let v = S.views[t.id];
  if (!v || !isFinite(v.s) || !isFinite(v.x) || !isFinite(v.y)) {
    const s = clamp(Math.min(app.W / 520, app.H / 560), 0.55, 1.25);
    const c = t.center || { x: 0, y: 0 };
    v = S.views[t.id] = { x: c.x, y: c.y - 34 / s, s };
  }
  return v;
}
function measure() { const r = app.wrap.getBoundingClientRect(); app.W = Math.max(1, Math.round(r.width)); app.H = Math.max(1, Math.round(r.height)); }
function toWorld(e) {
  const r = app.wrap.getBoundingClientRect(), v = view();
  return { x: v.x + (e.clientX - r.left - r.width / 2) / v.s, y: v.y + (e.clientY - r.top - r.height / 2) / v.s };
}
function applyView() {
  const t = tool(), v = view();
  const vw = app.W / v.s, vh = app.H / v.s, vx = v.x - vw / 2, vy = v.y - vh / 2;
  app.ws.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);
  app.bg.setAttribute('x', vx); app.bg.setAttribute('y', vy); app.bg.setAttribute('width', vw); app.bg.setAttribute('height', vh);
  if (t.grid) {
    const g = t.grid;
    app.pat.setAttribute('width', g); app.pat.setAttribute('height', g);
    app.patBg.setAttribute('width', g); app.patBg.setAttribute('height', g);
    app.patLine.setAttribute('d', `M${g} 0H0V${g}`);
    app.bg.setAttribute('class', 'bg grid');
  } else app.bg.setAttribute('class', 'bg');
}
function zoomBy(f) { if (tool().kind !== 'pieces') return; const v = view(); v.s = clamp(v.s * f, 0.3, 3); applyView(); saveSoon(); }
// Zoom and pan so every piece (and any mat) is in view.
function fitView() {
  const t = tool(), d = data(); if (t.kind !== 'pieces') return;
  let b = t.extent ? t.extent(d) : null;
  const grow = (x, y) => { b = b ? { l: Math.min(b.l, x), t: Math.min(b.t, y), r: Math.max(b.r, x), b: Math.max(b.b, y) } : { l: x, t: y, r: x, b: y }; };
  for (const p of d.pieces) {
    const k = t.kinds[p.k]; if (!k) continue;
    const bx = k.box(p, d);
    for (const c of [[bx.x, bx.y], [bx.x + bx.w, bx.y], [bx.x, bx.y + bx.h], [bx.x + bx.w, bx.y + bx.h]]) {
      const q = k.rot && p.r ? rot(c, p.r) : c; grow(q[0] + p.x, q[1] + p.y);
    }
  }
  if (!b) return;
  const pad = 28, top = Math.max(96, hudTop() + 8);
  const s = clamp(Math.min((app.W - 2 * pad) / Math.max(1, b.r - b.l), (app.H - top - pad) / Math.max(1, b.b - b.t)), 0.3, 1.6);
  const v = view(); v.s = s; v.x = (b.l + b.r) / 2; v.y = (b.t + b.b) / 2 - (top - pad) / 2 / s;
  applyView(); saveSoon();
}

/* ================= undo + persistence ================= */
const snapshot = () => JSON.stringify(data());
function pushUndo(snap) { const st = S.undo[S.tool] || (S.undo[S.tool] = []); st.push(snap); if (st.length > 100) st.shift(); syncChrome(); }
function undo() {
  if (isCoach()) return;
  const st = S.undo[S.tool]; if (!st || !st.length) return;
  S.data[S.tool] = JSON.parse(st.pop()); S.sel = null;
  renderTray(); render(); saveSoon();
}
function change(fn, opt = {}) {
  const snap = snapshot();
  try { fn(); } catch (err) { console.error(err); }
  if (snapshot() !== snap) pushUndo(snap);
  if (opt.tray) renderTray();
  render(); saveSoon();
}
// ?ns=... keeps two copies apart in one browser (used when testing a kid and a coach side by side)
const KEY_NS = (new URLSearchParams(location.search).get('ns') || '').replace(/\W/g, '');
const KEY = 'mathbench.v2' + (KEY_NS ? '.' + KEY_NS : '');
function saveSoon() { clearTimeout(app.saveT); app.saveT = setTimeout(saveNow, 300); }
function saveNow() {
  if (S.role === 'coach') return; // the coach device only mirrors the kid's board (its own tasks are kept separately)
  try { localStorage.setItem(KEY, JSON.stringify({ v: 2, tool: S.tool, data: S.data, views: S.views, show: S.show, task: S.task, set: S.set, progress: S.progress.slice(-800), seen: S.seen })); } catch (_) { /* storage unavailable */ }
}
function load() {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (o && o.v === 2) {
      if (o.data && typeof o.data === 'object') S.data = o.data;
      if (o.views && typeof o.views === 'object') S.views = o.views;
      if (typeof o.show === 'boolean') S.show = o.show;
      if (Array.isArray(o.progress)) S.progress = o.progress;
      if (o.seen && typeof o.seen === 'object') S.seen = o.seen;
      if (o.task && typeof o.task === 'object' && getTask(o.task.id)) S.task = o.task;
      if (o.set && typeof o.set === 'object' && Array.isArray(o.set.ids) && o.set.ids.every(getTask) && SETS[o.set.style]) { S.set = o.set; S.task = null; }
      return o.tool;
    }
  } catch (_) { /* ignore */ }
  return null;
}

/* ================= common piece helpers ================= */
const exampleItem = () => ({ type: 'btn', label: 'Reset example', fn: () => { S.data[S.tool] = tool().init(); S.sel = null; } });
const dupAct = (p, d, after) => ({ label: 'Copy', icon: 'copy', fn: () => {
  const q = JSON.parse(JSON.stringify(p)); q.id = uid(); q.x = r1(p.x + 24); q.y = r1(p.y + 24);
  if (after) after(q); d.pieces.push(q); app.popIds.add(q.id); S.sel = q.id;
} });
const delAct = (p, d) => ({ id: 'del', label: 'Delete', icon: 'trash', fn: () => { removeP(d, p.id); S.sel = null; } });

function addPiece(k, extra, at) {
  const t = tool(), d = data();
  const p = Object.assign({ id: uid(), k, x: 0, y: 0, r: 0 }, t.make ? t.make(k, extra, d) : {});
  if (at) { p.x = r1(at.x); p.y = r1(at.y); }
  else {
    const res = t.place ? t.place(p, d) : false;
    if (res === 'absorbed') return null;
    if (!res) {
      const v = view(), n = app.cascade = (app.cascade + 1) % 7;
      p.x = r1(v.x + (n - 3) * 16); p.y = r1(v.y + 30 / v.s + (n - 3) * 16);
    }
  }
  d.pieces.push(p); app.popIds.add(p.id);
  return p;
}

/* ================= rendering ================= */
const tf = (p, k) => `translate(${r1(p.x)} ${r1(p.y)})` + (k && k.rot && p.r ? ` rotate(${p.r})` : '') + (k && k.rot && p.f ? ' scale(-1 1)' : '');
function pieceSVG(t, p, d) {
  const k = t.kinds[p.k]; if (!k) return '';
  const body = k.draw(p, d);
  let s = `<g class="pc" data-id="${p.id}" transform="${tf(p, k)}">` + (app.popIds.has(p.id) ? `<g class="pop">${body}</g>` : body);
  if (p.id === S.sel) { const b = k.box(p, d); s += `<rect class="selbox" x="${r1(b.x - 5)}" y="${r1(b.y - 5)}" width="${r1(b.w + 10)}" height="${r1(b.h + 10)}" rx="6"/>`; }
  return s + '</g>';
}
function render() {
  const t = tool(), d = data();
  applyView();
  let ok = false;
  try {
    app.L.under.innerHTML = t.underlay ? t.underlay(d) : '';
    if (t.kind === 'pieces') {
      app.L.pieces.innerHTML = d.pieces.map(p => pieceSVG(t, p, d)).join('');
      app.L.over.innerHTML = t.overlay ? t.overlay(d) : '';
    } else {
      app.L.pieces.innerHTML = t.render(d);
      app.L.over.innerHTML = '';
    }
    ok = true;
  } catch (err) { console.error(err); }
  if (!ok && !app.recovering && !isCoach()) { app.recovering = true; S.data[t.id] = t.init(); S.sel = null; renderTray(); render(); app.recovering = false; return; }
  app.popIds.clear();
  renderInk(); renderHUD(); renderCtx(); syncChrome();
  // Fixed-layout tools sit below the readout and task card. The reserved space only grows while the
  // same tool and task are open, so the board does not jump around as the kid works.
  const key = `${S.tool}|${S.task ? S.task.id : ''}|${S.taskMin}|${!!S.build}`, hh = app.hud.offsetHeight;
  if (app.hudKey !== key) { app.hudKey = key; app.hudH = 0; }
  if (t.kind !== 'pieces' && hh > (app.hudH || 0) + 6 && !app.relayout) { app.hudH = hh; app.relayout = true; render(); app.relayout = false; return; }
  app.hudH = Math.max(app.hudH || 0, hh);
}
// Pixels from the top of the workspace that the readout and task card cover.
const hudTop = () => clamp((app.hudH || 0) + 24, 84, app.H * 0.5);
// Ink is stored in each tool's own frame so it lines up on any screen size.
const inkFrame = (t, d) => (t.frame ? t.frame(d) : { ox: 0, oy: 0, k: 1 });
function inkPathL(pts, fr) {
  if (!pts.length) return '';
  const P = q => `${r1(fr.ox + q[0] * fr.k)} ${r1(fr.oy + q[1] * fr.k)}`;
  return 'M' + P(pts[0]) + pts.slice(1).map(q => 'L' + P(q)).join('');
}
function renderInk() {
  const t = tool(), d = data(), fr = inkFrame(t, d);
  const ink = Array.isArray(d.ink) ? d.ink : [];
  app.L.ink.innerHTML = ink.map((st, i) => { const dd = inkPathL(st.p || [], fr); return `<path class="hit" data-ink="${i}" d="${dd}" stroke-width="18"/><path class="ink${st.c | 0}" d="${dd}" stroke-width="${r1((st.w || 4) * fr.k)}"/>`; }).join('');
  const cink = S.build ? [] : S.coachInk[S.tool] || [];
  app.L.coach.innerHTML = cink.map(st => `<path class="inkc" d="${inkPathL(st.p || [], fr)}" stroke-width="${r1((st.w || 4) * fr.k)}"/>`).join('');
}
function renderHUD() {
  const t = tool(), d = data();
  let html = '';
  if (showVals() && t.readout) { try { html = t.readout(d) || ''; } catch (err) { console.error(err); } }
  app.readout.innerHTML = html; app.readout.hidden = !html;
  renderTaskCard();
}
function renderCtx() {
  const t = tool(), d = data(); let acts = null;
  if (S.sel && !S.pen.on && !isCoach()) {
    try {
      if (t.kind === 'pieces') { const p = findP(d, S.sel); acts = p && t.acts ? t.acts(p, d) : null; }
      else acts = t.actions ? t.actions(S.sel, d) : null;
    } catch (err) { console.error(err); }
  }
  app.ctxActs = acts || [];
  app.ctx.hidden = !app.ctxActs.length;
  app.ctx.innerHTML = app.ctxActs.map((a, i) => `<button type="button" data-act="${i}">${icon(a.icon)}<span>${esc(a.label)}</span></button>`).join('');
}
function syncChrome() {
  const st = S.undo[S.tool];
  app.bUndo.disabled = !(st && st.length);
  app.bPen.setAttribute('aria-pressed', String(S.pen.on));
  app.bShow.setAttribute('aria-pressed', String(S.show));
  const locked = S.show && !showVals();
  app.bShow.disabled = locked;
  app.bShow.title = locked ? 'Values come back after you solve the task' : 'Show values';
  app.bTask.setAttribute('aria-pressed', String(!!S.task));
  app.penbar.hidden = !S.pen.on;
  app.ws.classList.toggle('penmode', S.pen.on);
  app.ws.classList.toggle('erasing', S.pen.on && S.pen.erase);
  app.penbar.querySelectorAll('[data-pc]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.pc === S.pen.color && !S.pen.erase)));
  app.pErase.setAttribute('aria-pressed', String(S.pen.erase));
  const isP = tool().kind === 'pieces';
  app.zoom.hidden = !isP; app.wrap.classList.toggle('nozoom', !isP);
  liveChrome();
}
function trayItemHTML(it) {
  const i = app.trayItems.push(it) - 1;
  switch (it.type) {
    case 'piece': return `<button type="button" class="pbtn" data-ti="${i}" aria-label="Add ${esc(it.label)}" title="Tap to add, or drag onto the workspace"><svg viewBox="-24 -24 48 48" aria-hidden="true">${it.icon}</svg><span>${esc(it.label)}</span></button>`;
    case 'toggle': return `<button type="button" class="opt" data-ti="${i}" aria-pressed="${!!it.on}">${esc(it.label)}</button>`;
    case 'btn': return `<button type="button" class="opt${it.sq ? ' sq' : ' ghost'}" data-ti="${i}"${it.aria ? ` aria-label="${esc(it.aria)}"` : ''}>${esc(it.label)}</button>`;
    case 'label': return `<span class="tlabel">${esc(it.text)}</span>`;
    case 'note': return `<p class="note">${esc(it.text)}</p>`;
  }
  return '';
}
function renderTray() {
  if (isCoach()) return;
  const t = tool(), d = data();
  const sl = app.tray.scrollLeft, st = app.tray.scrollTop;
  app.trayItems = [];
  let secs = [];
  try { secs = t.tray(d); } catch (err) { console.error(err); }
  app.tray.innerHTML = secs.map(sec => `<div class="sec"><div class="sec-h">${esc(sec.h)}</div><div class="row">${sec.items.map(trayItemHTML).join('')}</div></div>`).join('');
  app.tray.scrollLeft = sl; app.tray.scrollTop = st;
}
function toast(msg, withUndo) {
  app.toast.innerHTML = `<span>${esc(msg)}</span>` + (withUndo ? '<button type="button" class="tbtn" data-undo>Undo</button>' : '');
  app.toast.hidden = false;
  clearTimeout(app.toastT); app.toastT = setTimeout(() => { app.toast.hidden = true; }, 3200);
}
function openSheet(title, html, mount) {
  $('#sheetTitle').textContent = title;
  // A fresh body element each time, so click handlers from the last sheet do not pile up.
  const old = $('#sheetBody'), body = old.cloneNode(false);
  body.innerHTML = html; old.replaceWith(body);
  app.sheet.hidden = false;
  if (mount) mount(body);
}
function closeSheet() { app.sheet.hidden = true; $('#sheetBody').innerHTML = ''; }

/* ================= gestures ================= */
function dragUI(on) { document.body.classList.toggle('dragging', on); if (!on) app.trash.classList.remove('hot'); }
function overTrash(ev) { const r = app.trash.getBoundingClientRect(); return ev.clientX > r.left - 12 && ev.clientX < r.right + 12 && ev.clientY > r.top - 12 && ev.clientY < r.bottom + 12; }
function overWs(ev) { const r = app.wrap.getBoundingClientRect(); return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom; }

function startPieceDrag(p, pt, e, o = {}) {
  const t = tool(), d = data(), k = t.kinds[p.k];
  const snap = o.snap || snapshot();
  const i = d.pieces.indexOf(p);
  if (i > -1 && i < d.pieces.length - 1) { d.pieces.splice(i, 1); d.pieces.push(p); }
  let moved = !!o.moved;
  const off = o.off || { x: pt.x - p.x, y: pt.y - p.y }, sx = e.clientX, sy = e.clientY;
  if (moved) dragUI(true);
  render();
  let el = null;
  return {
    move(pt, ev) {
      if (!moved) { if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return; moved = true; dragUI(true); }
      p.x = pt.x - off.x; p.y = pt.y - off.y;
      if (!el || !el.isConnected) el = app.L.pieces.querySelector(`[data-id="${p.id}"]`);
      if (el) el.setAttribute('transform', tf(p, k));
      app.trash.classList.toggle('hot', overTrash(ev));
    },
    up(pt, ev, cancelled) {
      dragUI(false);
      if (moved) {
        const dropOff = !cancelled && (overTrash(ev) || (o.fromTray && !overWs(ev)));
        if (dropOff) { removeP(d, p.id); if (S.sel === p.id) S.sel = null; }
        else { p.x = r1(p.x); p.y = r1(p.y); if (t.onDrop) t.onDrop(p, d); }
      } else if (!cancelled) {
        if (!(t.tap && t.tap(p, d))) S.sel = p.id;
      }
      if (snapshot() !== snap) pushUndo(snap);
      render(); saveSoon();
    },
  };
}
function startPan(e) {
  const v = view(), sx = e.clientX, sy = e.clientY, vx = v.x, vy = v.y; let moved = false;
  return {
    move(pt, ev) {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!moved && Math.hypot(dx, dy) < 5) return;
      moved = true; v.x = vx - dx / v.s; v.y = vy - dy / v.s; applyView();
    },
    up() { if (!moved) { if (S.sel) { S.sel = null; render(); } } else saveSoon(); },
  };
}
// Draws a stroke into `list` (kid ink or coach ink), stored in the tool's frame.
function strokeInto(list, pt, color, done) {
  const t = tool(), d = data(), fr = inkFrame(t, d), v = view();
  const toL = p => [r1((p.x - fr.ox) / fr.k), r1((p.y - fr.oy) / fr.k)];
  const st = { c: color, w: r1(4 / v.s / fr.k), p: [toL(pt)] };
  list.push(st); renderInk();
  return {
    move(p) {
      const q = toL(p), l = st.p[st.p.length - 1];
      if (Math.hypot(q[0] - l[0], q[1] - l[1]) * fr.k * v.s < 1.5) return;
      st.p.push(q); renderInk();
    },
    up() { if (st.p.length === 1) st.p.push([st.p[0][0] + 0.1, st.p[0][1]]); renderInk(); done(); },
  };
}
function startInk(pt, e, d) {
  if (!Array.isArray(d.ink)) d.ink = [];
  const snap = snapshot();
  if (S.pen.erase) {
    let changed = false;
    const hit = ev => { const el = document.elementFromPoint(ev.clientX, ev.clientY); const s = el && el.closest && el.closest('[data-ink]'); if (s) { d.ink.splice(+s.dataset.ink, 1); changed = true; renderInk(); } };
    hit(e);
    return { move(p, ev) { hit(ev); }, up() { if (changed) { pushUndo(snap); saveSoon(); } } };
  }
  return strokeInto(d.ink, pt, S.pen.color, () => { pushUndo(snap); saveSoon(); });
}
function onDown(e) {
  if (active) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  e.preventDefault();
  try { app.ws.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
  const t = tool(), d = data(), pt = toWorld(e);
  let h = null;
  try {
    if (isCoach()) {
      if (S.pen.on) h = startCoachInk(pt);
      else if (t.kind === 'pieces') h = startPan(e);
    } else if (S.pen.on) h = startInk(pt, e, d);
    else if (t.kind !== 'pieces') h = t.down(pt, e, d);
    else {
      const g = e.target.closest && e.target.closest('.pc');
      const p = g && findP(d, g.dataset.id);
      if (p) h = (t.pieceDown && t.pieceDown(p, e, pt, d)) || startPieceDrag(p, pt, e);
      else h = startPan(e);
    }
  } catch (err) { console.error(err); }
  if (h) active = { id: e.pointerId, h };
}
function endActive(e, cancelled) {
  if (!active || e.pointerId !== active.id) return;
  const h = active.h; active = null;
  try { if (h.up) h.up(toWorld(e), e, cancelled); } catch (err) { console.error(err); render(); }
}
function onWheel(e) {
  if (tool().kind !== 'pieces') return;
  e.preventDefault();
  const v = view();
  if (e.ctrlKey || e.metaKey) {
    const p = toWorld(e), ns = clamp(v.s * Math.exp(-e.deltaY * 0.01), 0.3, 3);
    v.x = p.x + (v.x - p.x) * (v.s / ns); v.y = p.y + (v.y - p.y) * (v.s / ns); v.s = ns;
  } else { v.x += e.deltaX / v.s; v.y += e.deltaY / v.s; }
  applyView(); saveSoon();
}
function wirePointers() {
  app.ws.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', e => {
    if (!active || e.pointerId !== active.id) return;
    try { if (active.h.move) active.h.move(toWorld(e), e); } catch (err) { console.error(err); }
  });
  window.addEventListener('pointerup', e => endActive(e, false));
  window.addEventListener('pointercancel', e => endActive(e, true));
  app.ws.addEventListener('wheel', onWheel, { passive: false });
  app.ws.addEventListener('contextmenu', e => e.preventDefault());
}
function wireTray() {
  app.tray.addEventListener('pointerdown', e => {
    const b = e.target.closest('.pbtn'); if (!b || active) return;
    if (e.pointerType === 'mouse') { if (e.button !== 0) return; e.preventDefault(); }
    const it = app.trayItems[+b.dataset.ti]; if (!it) return;
    const sx = e.clientX, sy = e.clientY, horiz = getComputedStyle(app.tray).flexDirection === 'row';
    let drag = null;
    active = { id: e.pointerId, h: {
      move(pt, ev) {
        if (drag) { drag.move(pt, ev); return; }
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (Math.hypot(dx, dy) < 8) return;
        if (ev.pointerType !== 'mouse' && (horiz ? Math.abs(dx) > Math.abs(dy) : Math.abs(dy) > Math.abs(dx))) { active = null; return; }
        if (S.pen.on) { S.pen.on = false; S.pen.erase = false; }
        const snap = snapshot(), p = addPiece(it.k, it.extra, pt);
        if (!p) { active = null; return; }
        drag = startPieceDrag(p, pt, ev, { snap, moved: true, off: { x: 0, y: 0 }, fromTray: true });
        drag.move(pt, ev);
      },
      up(pt, ev, cancelled) {
        if (drag) { drag.up(pt, ev, cancelled); return; }
        if (!cancelled) change(() => { addPiece(it.k, it.extra); });
      },
    } };
  });
  app.tray.addEventListener('click', e => {
    const b = e.target.closest('[data-ti]'); if (!b) return;
    const it = app.trayItems[+b.dataset.ti]; if (!it) return;
    if (it.type === 'piece') { if (e.detail === 0) change(() => { addPiece(it.k, it.extra); }); return; }
    if (it.fn) change(() => it.fn(data()), { tray: true });
  });
}

/* ================= commands ================= */
function ensureData(t) {
  const d = S.data[t.id];
  let bad = !d || typeof d !== 'object' || (t.kind === 'pieces' && !Array.isArray(d.pieces));
  if (!bad && t.valid) { try { bad = !t.valid(d); } catch (_) { bad = true; } }
  if (bad) S.data[t.id] = t.init();
  if (!Array.isArray(S.data[t.id].ink)) S.data[t.id].ink = [];
}
function setTool(id, user) {
  const t = TOOL[id] || TOOLS[0];
  const changed = S.tool !== t.id;
  S.tool = t.id; S.sel = null; app.nlPrev = null;
  ensureData(t);
  app.tools.querySelectorAll('[data-tool]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tool === t.id)));
  const chip = document.getElementById('tab-' + t.id);
  if (chip) {
    const l = chip.offsetLeft, r = l + chip.offsetWidth, vl = app.tools.scrollLeft, vr = vl + app.tools.clientWidth;
    if (l < vl + 8 || r > vr - 8) app.tools.scrollLeft = Math.max(0, l - (user ? 48 : 16));
  }
  if (!isCoach()) { try { if (location.hash.slice(1) !== t.id) history.replaceState(null, '', '#' + t.id); } catch (_) { /* sandboxed */ } }
  renderTray(); render(); saveSoon();
  if (changed && isCoach()) fitView();
}
function togglePen(on) { S.pen.on = on === undefined ? !S.pen.on : on; if (S.pen.on) S.sel = null; else S.pen.erase = false; render(); }
function clearAll() {
  if (isCoach()) return;
  const t = tool(), before = snapshot();
  change(() => { const d = data(); if (t.clear) t.clear(d); else d.pieces = []; d.ink = []; S.sel = null; }, { tray: true });
  if (snapshot() !== before) toast('Workspace cleared.', true);
}
function onKey(e) {
  if (/input|textarea|select/i.test(e.target.tagName)) return;
  if (e.key === 'Escape' && !app.sheet.hidden) { closeSheet(); return; }
  if (isCoach()) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
  else if ((e.key === 'Delete' || e.key === 'Backspace') && S.sel) {
    const a = app.ctxActs.find(x => x.id === 'del');
    if (a) { e.preventDefault(); change(a.fn); }
  } else if (e.key === 'Escape') { if (S.pen.on) togglePen(false); else if (S.sel) { S.sel = null; render(); } }
}

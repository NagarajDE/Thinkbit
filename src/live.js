/* ================= live mode ================= */
// One kid device sends its board; one or more coach devices watch, assign tasks and send messages.
const LKEY = 'mathbench.live' + (KEY_NS ? '.' + KEY_NS : '');
const LIVE = { role: 'solo', room: '', cfg: null, kid: '', coach: '' };
const LV = { t: null, conn: false, peerOn: false, peerAt: 0, lastSig: '', log: [], err: '', tab: null, timer: 0 };
const FB_V = '10.12.2';

function liveLoad() { try { Object.assign(LIVE, JSON.parse(localStorage.getItem(LKEY) || '{}')); } catch (_) { /* ignore */ } S.role = LIVE.role || 'solo'; }
function liveSave() { try { localStorage.setItem(LKEY, JSON.stringify(LIVE)); } catch (_) { /* ignore */ } }
const b64e = o => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64d = s => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));
function newRoom() { const a = new Uint8Array(24); crypto.getRandomValues(a); return Array.from(a, x => 'abcdefghijklmnopqrstuvwxyz0123456789'[x % 36]).join(''); }
const pairPayload = () => ({ v: 1, r: LIVE.room, c: LIVE.cfg, k: LIVE.kid, n: LIVE.coach });
const pageBase = () => location.href.split('#')[0];
const kidLink = () => pageBase() + '#join=' + b64e(pairPayload());
const coachLink = () => pageBase() + '#coach=' + b64e(pairPayload());

// Opening a pairing link stores the room on this device.
function consumePairingHash() {
  const m = location.hash.match(/^#(join|coach)=([\w-]+)$/);
  if (!m) return false;
  try {
    const p = b64d(m[2]);
    if (!p || !p.r || !p.c) return false;
    Object.assign(LIVE, { role: m[1] === 'join' ? 'kid' : 'coach', room: p.r, cfg: p.c, kid: p.k || '', coach: p.n || '' });
    liveSave(); S.role = LIVE.role;
    try { history.replaceState(null, '', pageBase()); } catch (_) { /* sandboxed */ }
    return true;
  } catch (_) { return false; }
}

/* ---- transports: Firebase Realtime Database, or a same-browser channel used for testing ---- */
async function makeFirebase(cfg, room) {
  const base = `https://www.gstatic.com/firebasejs/${FB_V}/`;
  const [A, D, Au] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-database.js'), import(base + 'firebase-auth.js')]);
  const name = 'mb-' + room.slice(0, 8);
  const fapp = A.getApps().find(x => x.name === name) || A.initializeApp(cfg, name);
  const auth = Au.getAuth(fapp);
  if (!auth.currentUser) await Au.signInAnonymously(auth);
  const db = cfg.databaseURL ? D.getDatabase(fapp, cfg.databaseURL) : D.getDatabase(fapp);
  const r = p => D.ref(db, `rooms/${room}/${p}`);
  const conn = D.ref(db, '.info/connected');
  await D.get(r('meta')); // fails fast if the rules or the database URL are wrong
  return {
    kind: 'firebase',
    write: (p, v) => D.set(r(p), v),
    push: (p, v) => Promise.resolve(D.push(r(p), v)),
    watch(p, cb, o = {}) { const q = o.last ? D.query(r(p), D.limitToLast(o.last)) : r(p); return D.onValue(q, s => cb(s.val()), err => { LV.err = friendlyErr(err); liveChrome(); }); },
    onConn(cb) { return D.onValue(conn, s => cb(s.val() === true)); },
    presence(p) {
      const pr = r(p);
      D.onValue(conn, s => {
        if (s.val() !== true) return;
        D.onDisconnect(pr).set({ on: false, at: D.serverTimestamp() }).then(() => D.set(pr, { on: true, at: D.serverTimestamp() })).catch(() => {});
      });
    },
  };
}
function makeLocal(room) {
  // One tree per room, like the real database, kept in this browser. Used for testing on one computer.
  // Messages carry the written value: storage can lag behind the message in another tab.
  const ch = new BroadcastChannel('mathbench-' + room), KEYL = 'mbl.' + room, subs = [];
  let tree = {}; try { tree = JSON.parse(localStorage.getItem(KEYL) || '{}') || {}; } catch (_) { /* ignore */ }
  const parts = p => String(p).split('/').filter(Boolean);
  const get = p => { let o = tree; for (const k of parts(p)) { if (!o || typeof o !== 'object' || !(k in o)) return null; o = o[k]; } return o == null ? null : JSON.parse(JSON.stringify(o)); };
  const set = (p, v) => {
    const ks = parts(p); let o = tree;
    for (const k of ks.slice(0, -1)) { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }
    if (v == null) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = v;
  };
  const related = (a, b) => a === b || a.startsWith(b + '/') || b.startsWith(a + '/');
  const emit = p => { for (const s of subs.slice()) if (related(s.p, p)) s.cb(get(s.p)); };
  ch.onmessage = e => { set(e.data.p, e.data.v); emit(e.data.p); };
  const write = (p, v) => {
    v = v == null ? null : JSON.parse(JSON.stringify(v)); set(p, v);
    try { localStorage.setItem(KEYL, JSON.stringify(tree)); } catch (_) { /* full */ }
    ch.postMessage({ p, v }); emit(p); return Promise.resolve();
  };
  return {
    kind: 'local',
    write,
    push: (p, v) => write(`${p}/k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, v),
    watch(p, cb) { const sub = { p, cb }; subs.push(sub); setTimeout(() => cb(get(p)), 0); return () => { const i = subs.indexOf(sub); if (i > -1) subs.splice(i, 1); }; },
    onConn(cb) { setTimeout(() => cb(true), 0); return () => {}; },
    presence(p) { write(p, { on: true, at: Date.now() }); addEventListener('pagehide', () => write(p, { on: false, at: Date.now() })); },
  };
}
function friendlyErr(e) {
  const s = String((e && (e.code || e.message)) || e || '');
  if (/operation-not-allowed|admin-restricted/i.test(s)) return 'Turn on Anonymous sign-in in Firebase: Authentication → Sign-in method → Anonymous.';
  if (/permission[_ ]denied/i.test(s)) return 'The database refused access. Paste the rules from database.rules.json into Realtime Database → Rules, then Publish.';
  if (/api-key|invalid-api-key|API key/i.test(s)) return 'That Firebase config did not work. Copy it again from Project settings → Your apps.';
  if (/dynamically imported module|import|Failed to fetch|NetworkError|Load failed/i.test(s)) return 'Could not load Firebase. Live mode needs your hosted copy of Thinkbit and an internet connection.';
  if (/databaseURL|database URL|Cannot parse Firebase url|FIREBASE FATAL/i.test(s)) return 'The database URL looks wrong. Copy it from Realtime Database → Data (it ends in firebaseio.com or firebasedatabase.app).';
  return 'Live mode could not connect: ' + s.slice(0, 160);
}

async function connectLive() {
  if (LIVE.role === 'solo' || !LIVE.room || !LIVE.cfg) return;
  LV.err = ''; LV.conn = false; liveChrome();
  try { LV.t = LIVE.cfg === 'local' ? makeLocal(LIVE.room) : await makeFirebase(LIVE.cfg, LIVE.room); }
  catch (e) { console.error(e); LV.t = null; LV.err = friendlyErr(e); liveChrome(); renderCoach(); return; }
  LV.t.onConn(c => { LV.conn = c; liveChrome(); });
  LV.t.watch('meta', v => { if (v && typeof v === 'object') { LIVE.kid = v.kid || LIVE.kid; LIVE.coach = v.coach || LIVE.coach; liveSave(); liveChrome(); renderCoach(); } });
  wireTasks();
  if (LIVE.role === 'kid') wireKid(); else wireCoach();
}
function liveOff() {
  Object.assign(LIVE, { role: 'solo', room: '', cfg: null, kid: '', coach: '' });
  liveSave(); location.reload();
}

/* ---- kid device ---- */
function wireKid() {
  const t = LV.t;
  t.presence('kid/on');
  t.watch('coach/on', v => { LV.peerOn = !!(v && v.on); liveChrome(); });
  t.watch('coach/assign', v => {
    if (!v || !v.n || S.seen.assign === v.n) return;
    const fresh = S.seen.assign !== undefined || Date.now() - (v.at || 0) < 6 * 3600e3;
    S.seen.assign = v.n; saveSoon();
    if (v.set) { if (fresh && SETS[v.set]) { startSet(v.set, 'coach'); toast(`${LIVE.coach || 'Your coach'} sent a ${SETS[v.set].name} practice. The timer is running.`); } return; }
    if (v.c) { try { const c = JSON.parse(v.c), mine = S.custom.find(x => x.id === c.id); if (validCustom(c) && (!mine || (c.at || 0) >= (mine.at || 0))) saveCustom(c, false); } catch (_) { /* ignore */ } }
    if (fresh && getTask(v.id)) { startTask(v.id, 'coach'); toast(`New task from ${LIVE.coach || 'your coach'}.`); }
  });
  t.watch('coach/msg', v => {
    if (!v || !v.n || S.seen.msg === v.n) return;
    const fresh = S.seen.msg !== undefined || Date.now() - (v.at || 0) < 3600e3;
    S.seen.msg = v.n; saveSoon();
    if (fresh && v.text) showMsg(v.text);
  });
  t.watch('coach/ink', v => { S.coachInk = parseInk(v); if (S.tool) renderInk(); });
  clearInterval(LV.timer); LV.timer = setInterval(kidSync, 250);
  kidSync(true);
}
function parseInk(v) { const o = {}; if (v && typeof v === 'object') for (const k in v) { try { o[k] = JSON.parse(v[k]); } catch (_) { /* skip */ } } return o; }
function kidSync(force) {
  if (!LV.t || LIVE.role !== 'kid' || !S.tool) return;
  const state = JSON.stringify(data()), task = S.task ? JSON.stringify(S.task) : '';
  const set = S.set ? JSON.stringify({ style: S.set.style, ids: S.set.ids, i: S.set.i, ans: S.set.ans, start: S.set.start, end: S.set.end, by: S.set.by }) : '';
  const sig = S.tool + '|' + state + '|' + task + '|' + set;
  if (sig === LV.lastSig && !force) return;
  LV.lastSig = sig;
  LV.t.write('kid/view', { tool: S.tool, state, task, set, at: Date.now() }).catch(e => { LV.err = friendlyErr(e); liveChrome(); });
}
function liveLog(entry) { if (LV.t && LIVE.role === 'kid') LV.t.push('log', entry).catch(e => console.error(e)); }
function showMsg(text) {
  app.msgbar.innerHTML = `<span><b>${esc(LIVE.coach || 'Coach')}:</b> ${esc(text)}</span><button class="ib sm" type="button" data-x aria-label="Close message">${icon('close')}</button>`;
  app.msgbar.hidden = false;
  clearTimeout(app.msgT); app.msgT = setTimeout(() => { app.msgbar.hidden = true; }, 15000);
}

/* ---- coach device ---- */
function wireCoach() {
  const t = LV.t;
  t.presence('coach/on');
  t.watch('kid/on', v => { LV.peerOn = !!(v && v.on); LV.peerAt = (v && v.at) || 0; liveChrome(); });
  t.watch('kid/view', v => {
    if (!v || !TOOL[v.tool]) return;
    let st, task = null;
    try { st = JSON.parse(v.state); } catch (_) { return; }
    try { task = v.task ? JSON.parse(v.task) : null; } catch (_) { /* ignore */ }
    let set = null; try { set = v.set ? JSON.parse(v.set) : null; } catch (_) { /* ignore */ }
    if (set && !(Array.isArray(set.ids) && set.ids.every(getTask) && SETS[set.style])) set = null;
    if (S.build) { LV.mirror = { tool: v.tool, data: st, task, set }; return; }
    S.data[v.tool] = st; S.task = task && task.id ? task : null; S.set = set;
    if (S.set) { if (!app.setT) startSetTimer(); } else stopSetTimer();
    if (S.tool !== v.tool) setTool(v.tool); else { ensureData(TOOL[v.tool]); render(); }
    const sig = v.tool + '|' + (S.task ? S.task.id : '');
    if (LV.tab === 'assign' && sig !== LV.assignSig) { LV.assignSig = sig; renderCoach(); }
  });
  t.watch('log', v => { LV.log = v ? Object.values(v).filter(e => e && e.id).sort((a, b) => a.at - b.at) : []; renderCoach(); }, { last: 500 });
  t.watch('coach/ink', v => { S.coachInk = parseInk(v); if (S.tool) renderInk(); });
}
function startCoachInk(pt) {
  const list = S.coachInk[S.tool] || (S.coachInk[S.tool] = []);
  return strokeInto(list, pt, 3, pushCoachInk);
}
function pushCoachInk() {
  if (!LV.t) return;
  const o = {};
  for (const k in S.coachInk) if (S.coachInk[k] && S.coachInk[k].length) o[k] = JSON.stringify(S.coachInk[k]);
  LV.t.write('coach/ink', o);
}
function assignTask(id) {
  const t = getTask(id);
  if (!LV.t || !t) return;
  const a = { id, n: uid(), at: Date.now() };
  if (t.custom) a.c = JSON.stringify(t.raw);
  LV.t.write('coach/assign', a).then(() => toast(`Sent “${t.title}” to ${LIVE.kid || 'your kid'}.`)).catch(e => { LV.err = friendlyErr(e); liveChrome(); });
}
function sendSet(style) {
  if (!LV.t || !SETS[style]) return;
  LV.t.write('coach/assign', { set: style, n: uid(), at: Date.now() }).then(() => toast(`Sent a ${SETS[style].name} practice to ${LIVE.kid || 'your kid'}.`)).catch(e => { LV.err = friendlyErr(e); liveChrome(); });
}
function sendMsg(text) {
  text = String(text || '').trim().slice(0, 140);
  if (!text || !LV.t) return;
  LV.t.write('coach/msg', { text, n: uid(), at: Date.now() }).then(() => { LV.lastMsg = text; toast('Message sent.'); renderCoach(); }).catch(e => { LV.err = friendlyErr(e); liveChrome(); });
}
const hhmm = t => { const d = new Date(t), today = new Date().toDateString() === d.toDateString(); return (today ? '' : `${d.getMonth() + 1}/${d.getDate()} `) + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
function resultsHTML() {
  const kid = esc(LIVE.kid || 'your kid'), log = LV.log;
  if (!log.length) return `<p class="sub" style="margin-top:12px">No checks yet. Results show up here as soon as ${kid} taps Check.</p>`;
  const stats = taskStats(log), vals = Object.values(stats), all = allTasks();
  const solved = vals.filter(s => s.ok).length, first = vals.filter(s => s.first).length;
  const today = log.filter(e => e.id !== '__set' && new Date(e.at).toDateString() === new Date().toDateString()).length;
  const bar = (label, ts) => { const done = ts.filter(t => stats[t.id] && stats[t.id].ok).length; return `<div class="topic-row"><span>${esc(label)}</span><span class="bar-bg" aria-hidden="true"><i style="width:${ts.length ? Math.round((done / ts.length) * 100) : 0}%"></i></span><span class="sub">${done}/${ts.length}</span></div>`; };
  let h = `<div class="stats"><div class="stat"><b>${solved}/${all.length}</b><span>tasks solved</span></div><div class="stat"><b>${vals.length ? Math.round((first / vals.length) * 100) : 0}%</b><span>right on first check</span></div><div class="stat"><b>${today}</b><span>checks today</span></div></div>`;
  const sets = log.filter(e => e.id === '__set' && SETS[e.set]).slice(-6).reverse();
  if (sets.length) h += '<div class="h3">Contest practice</div>' + sets.map(e => `<div class="res"><time>${esc(hhmm(e.at))}</time><span class="t">${esc(SETS[e.set].name)} <span class="sub">· ${e.right}/${e.n} right · ${mmss((e.secs || 0) * 1000)}</span></span><b>${e.score}/${e.max}</b></div>`).join('');
  h += '<div class="h3">By level</div>' + [1, 2, 3].map(lv => bar(LEVELS[lv], all.filter(t => (t.level || 2) === lv))).join('');
  h += '<div class="h3">By topic</div>';
  for (const topic of [...new Set(all.map(t => t.topic))]) {
    const ts = all.filter(t => t.topic === topic);
    if (ts.some(t => stats[t.id])) h += bar(topic, ts);
  }
  h += '<div class="h3">Latest checks</div>';
  for (const e of log.filter(x => x.id !== '__set').slice(-20).reverse()) {
    const t = getTask(e.id);
    h += `<div class="res"><time>${esc(hhmm(e.at))}</time><span class="t">${esc(t ? t.title : 'A deleted task')}${e.ans ? ` <span class="sub">· answered ${esc(e.ans)}</span>` : ''}${e.hint ? ' <span class="sub">· hint</span>' : ''}${e.by === 'set' ? ' <span class="sub">· practice set</span>' : ''}</span><span class="${e.ok ? 'r-ok' : 'r-no'}">${e.ok ? '✓' : 'not yet'}</span></div>`;
  }
  return h;
}
const QUICK = ['Great job!', 'Check your ones place.', 'Try the hint.', 'Read the question again.', 'Draw it first.', 'Take a short break.'];
function renderCoach() {
  if (!isCoach() || !app.cbody) return;
  app.coach.querySelectorAll('.ctab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === LV.tab)));
  app.coach.classList.toggle('collapsed', !LV.tab);
  const kid = esc(LIVE.kid || 'your kid');
  let h = '';
  if (LV.err) h += `<p class="err">${esc(LV.err)}</p>`;
  switch (LV.tab || 'assign') {
    case 'assign': {
      const scope = LV.scope || 'all';
      h += `<p class="sub" style="margin-top:10px">Tap a task to send it to ${kid}. It opens on their screen right away.</p>` +
        `<div class="btnrow" style="margin-top:6px"><button class="btn" type="button" data-make>Make a task</button></div>` +
        setButtonsHTML(LV.log, true) + filterRow(scope, S.tool) + taskListHTML(taskStats(LV.log), S.task && S.task.id, 'Send', scope === 'tool' ? S.tool : null, true);
      break;
    }
    case 'results': h += resultsHTML(); break;
    case 'msg':
      h += `<p class="sub" style="margin-top:10px">Pops up on ${kid}’s screen.</p><div class="chips">${QUICK.map(q => `<button class="opt" type="button" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>` +
        `<div class="linkbox"><input id="msgIn" type="text" maxlength="140" placeholder="Write a message" aria-label="Message"><button class="btn primary" type="button" data-send>Send</button></div>` +
        (LV.lastMsg ? `<p class="sub">Last sent: “${esc(LV.lastMsg)}”</p>` : '');
      break;
    case 'pair':
      h += `<p style="margin-top:10px">Open this link on ${kid}’s tablet or computer (scan the code, or send the link). That device stays connected.</p><div class="qr" id="qrBox" aria-label="QR code for the kid link"></div>` +
        `<div class="linkbox"><input id="kidLink" type="text" readonly value="${esc(kidLink())}" aria-label="Kid link"><button class="btn" type="button" data-copy="kidLink">Copy</button></div>` +
        `<div class="h3">Another parent device</div><p class="sub">Open this on another phone or computer to watch from there too.</p>` +
        `<div class="linkbox"><input id="coachLink" type="text" readonly value="${esc(coachLink())}" aria-label="Coach link"><button class="btn" type="button" data-copy="coachLink">Copy</button></div>` +
        `<p class="sub">Keep these links private: anyone with one can see this board.</p><div class="btnrow"><button class="btn" type="button" data-off>Turn off live mode on this device</button></div>`;
      break;
  }
  app.cbody.innerHTML = h;
  if ((LV.tab || 'assign') === 'pair') fillQR($('#qrBox'), kidLink());
}
function onCoachPanel(e) {
  const tab = e.target.closest('.ctab');
  if (tab) { LV.tab = LV.tab === tab.dataset.tab && innerWidth < 900 ? null : tab.dataset.tab; renderCoach(); return; }
  const sc = e.target.closest('[data-scope]'); if (sc) { LV.scope = sc.dataset.scope; renderCoach(); return; }
  const ed = e.target.closest('[data-edit]'); if (ed) { if (CUSTOM[ed.dataset.edit]) openEditor(CUSTOM[ed.dataset.edit].raw); return; }
  if (e.target.closest('[data-make]')) { openEditor(); return; }
  const ss = e.target.closest('[data-sendset]'); if (ss) { sendSet(ss.dataset.sendset); return; }
  const tl = e.target.closest('[data-tl]'); if (tl) { assignTask(tl.dataset.tl); return; }
  const q = e.target.closest('[data-q]'); if (q) { sendMsg(q.dataset.q); return; }
  if (e.target.closest('[data-send]')) { const i = $('#msgIn'); sendMsg(i && i.value); return; }
  const cp = e.target.closest('[data-copy]'); if (cp) { copyText($('#' + cp.dataset.copy).value); return; }
  if (e.target.closest('[data-off]')) liveOff();
}
function copyText(s, msg) {
  const ok = () => toast(msg || 'Link copied.');
  try { navigator.clipboard.writeText(s).then(ok, () => toast('Select the link and copy it.')); } catch (_) { toast('Select the link and copy it.'); }
}
function loadQR() {
  return new Promise((res, rej) => {
    if (window.qrcode) { res(window.qrcode); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
    s.onload = () => (window.qrcode ? res(window.qrcode) : rej(new Error('qr'))); s.onerror = rej;
    document.head.appendChild(s);
  });
}
function fillQR(el, text) {
  if (!el) return;
  loadQR().then(qrcode => { const q = qrcode(0, 'L'); q.addData(text); q.make(); el.innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); })
    .catch(() => { el.outerHTML = '<p class="sub">The QR code could not load. Use the Copy button instead.</p>'; });
}

/* ---- your own tasks, shared through the room ---- */
// tasks/<id> holds each task as JSON (or a deletion marker). The newest version wins on every device.
function liveShareTask(c, del) {
  if (!LV.t || !c || !c.id) return;
  const v = del ? { id: c.id, del: true, at: Date.now() } : c;
  LV.t.write('tasks/' + c.id, JSON.stringify(v)).catch(e => { LV.err = friendlyErr(e); liveChrome(); });
}
function wireTasks() {
  let first = true;
  LV.t.watch('tasks', v => {
    const room = {};
    if (v && typeof v === 'object') for (const id in v) { try { const c = JSON.parse(v[id]); if (c && c.id === id) room[id] = c; } catch (_) { /* skip */ } }
    let changed = false;
    for (const id in room) {
      const c = room[id], mine = S.custom.find(x => x.id === id);
      if (c.del) { if (mine && (mine.at || 0) <= (c.at || 0)) { deleteCustom(id, false); changed = true; } continue; }
      if (validCustom(c) && (!mine || (c.at || 0) > (mine.at || 0))) { saveCustom(c, false); changed = true; }
    }
    if (first) { // tasks made on this device while it was offline go up to the room
      first = false;
      for (const c of S.custom) { const r = room[c.id]; if (!r || (c.at || 0) > (r.at || 0)) liveShareTask(c); }
    }
    if (changed) { app.tcSig = ''; if (S.tool) render(); renderCoach(); }
  });
}

/* ---- build mode: the parent sets up a starting board on their phone ---- */
// The kid's board keeps arriving while the parent builds; it is held and shown again afterwards.
function enterBuild(toolId, draft, existing) {
  if (S.role !== 'coach' || S.build) return;
  LV.mirror = { tool: S.tool, data: S.data[S.tool], task: S.task, set: S.set };
  let board = null;
  if (draft.built && draft.built.tool === toolId) board = draft.built.board;
  else if (existing && existing.tool === toolId) board = existing.board;
  else if (toolId === S.tool) board = JSON.stringify(S.data[S.tool]);
  let d = null; try { d = board ? JSON.parse(board) : null; } catch (_) { /* empty board */ }
  S.build = { draft, existing: existing || null };
  S.task = null; S.set = null; S.sel = null; S.pen.on = false;
  S.data[toolId] = d || emptyBoard(toolId); S.undo[toolId] = [];
  liveChrome();
  if (S.tool !== toolId) setTool(toolId); else { ensureData(TOOL[toolId]); renderTray(); render(); }
  delete S.views[toolId]; if (TOOL[toolId].kind === 'pieces') fitView();
}
function exitBuild(use) {
  const b = S.build; if (!b) return;
  const draft = { ...b.draft };
  if (use) { draft.built = { tool: S.tool, board: JSON.stringify(S.data[S.tool]) }; draft.start = 'built'; draft.tool = S.tool; }
  S.build = null; S.sel = null; S.pen.on = false;
  const m = LV.mirror; LV.mirror = null;
  if (m) { S.data[m.tool] = m.data; S.task = m.task; S.set = m.set || null; if (S.set) startSetTimer(); }
  liveChrome();
  if (m && TOOL[m.tool] && S.tool !== m.tool) setTool(m.tool); else { if (S.tool) ensureData(TOOL[S.tool]); render(); fitView(); }
  renderCoach();
  openEditor(b.existing, draft);
}
function renderBuildBar() {
  const el = app.buildbar; if (!el) return;
  if (!S.build) { el.hidden = true; el.innerHTML = ''; return; }
  const q = S.build.draft.prompt;
  el.innerHTML = `<p class="tc-p" style="margin:0 0 8px"><b>Set up the starting board.</b> <span class="sub">${q ? `Task: “${esc(q.length > 80 ? q.slice(0, 78) + '…' : q)}” ` : ''}${esc(cap(LIVE.kid || 'your kid'))} does not see this.</span></p>` +
    `<div class="tc-btns"><button class="btn primary" type="button" data-build="use">Use this board</button><button class="btn" type="button" data-build="cancel">Cancel</button></div>`;
  el.hidden = false;
}

/* ---- header pill + setup ---- */
function liveChrome() {
  if (!app.liveBtn) return;
  let cls = '', label = 'Live';
  const kid = LIVE.kid || 'Kid', coach = LIVE.coach || 'Coach';
  if (LIVE.role !== 'solo') {
    if (LV.err) { cls = 'wait'; label = 'Live: needs a fix'; }
    else if (!LV.conn) { cls = 'wait'; label = 'Connecting…'; }
    else if (LIVE.role === 'kid') { cls = 'on'; label = LV.peerOn ? `${coach} is watching` : 'Live'; }
    else { cls = LV.peerOn ? 'on' : ''; label = LV.peerOn ? `${kid} is online` : `${kid} is offline`; }
  }
  app.liveBtn.className = 'live-pill ' + cls;
  app.liveTxt.textContent = label;
  const coachMode = LIVE.role === 'coach' && !S.build;
  document.body.classList.toggle('coachmode', coachMode);
  app.tray.hidden = coachMode; app.coach.hidden = !coachMode;
  app.bTask.hidden = !!S.build;
  renderBuildBar();
}
function onLiveClick() {
  if (LIVE.role === 'coach') { LV.tab = 'pair'; renderCoach(); return; }
  if (LIVE.role === 'kid') {
    openSheet('Live mode', `<p>${LV.err ? `<span class="err">${esc(LV.err)}</span>` : LV.peerOn ? `${esc(LIVE.coach || 'Your coach')} can see this board right now.` : 'This device is connected. Your coach sees your board when they open their link.'}</p><div class="btnrow"><button class="btn" type="button" data-off>Turn off live mode on this device</button></div>`,
      b => b.addEventListener('click', e => { if (e.target.closest('[data-off]')) liveOff(); }));
    return;
  }
  openSetup();
}
function openSetup(msg) {
  openSheet('Set up live mode', `
    <p>Your phone watches and assigns tasks. Your kid works on their own device. Both talk through a free Firebase database that only you own.</p>
    <ol class="steps">
      <li>In the <a href="https://console.firebase.google.com" target="_blank" rel="noopener">Firebase console</a>, add a project (Analytics off).</li>
      <li>Build → Realtime Database → Create database. On the Rules tab, paste the rules from <b>database.rules.json</b> and Publish.</li>
      <li>Build → Authentication → Get started → Sign-in method → turn on <b>Anonymous</b>.</li>
      <li>Project settings → Your apps → add a Web app, then copy its <b>firebaseConfig</b> and paste it below.</li>
    </ol>
    <div class="field"><label for="cfgIn">Firebase config</label><textarea id="cfgIn" spellcheck="false" placeholder='const firebaseConfig = { apiKey: "...", authDomain: "...", ... };'></textarea></div>
    <div class="field"><label for="dbIn">Database URL (only if it is not in the config)</label><input id="dbIn" type="url" placeholder="https://your-project-default-rtdb.firebaseio.com"></div>
    <div class="field"><label for="kidIn">Kid's first name</label><input id="kidIn" type="text" maxlength="24" autocomplete="off"></div>
    <div class="field"><label for="coachIn">What your kid calls you</label><input id="coachIn" type="text" maxlength="24" autocomplete="off" placeholder="Dad"></div>
    ${msg ? `<p class="err">${esc(msg)}</p>` : ''}<p class="err" id="setupErr" hidden></p>
    <div class="btnrow"><button class="btn primary" type="button" id="setupGo">Connect</button></div>
    <p class="sub">Opened a link from the parent's phone? Then this device is already set up.</p>`,
  body => {
    $('#setupGo', body).addEventListener('click', async () => {
      const err = $('#setupErr', body), go = $('#setupGo', body);
      const cfg = parseConfig($('#cfgIn', body).value, $('#dbIn', body).value);
      if (!cfg) { err.textContent = 'Paste the firebaseConfig block. It needs at least apiKey and projectId.'; err.hidden = false; return; }
      go.disabled = true; go.textContent = 'Connecting…'; err.hidden = true;
      const room = newRoom(), kid = $('#kidIn', body).value.trim().slice(0, 24), coach = $('#coachIn', body).value.trim().slice(0, 24) || 'Coach';
      try {
        const t = cfg === 'local' ? makeLocal(room) : await makeFirebase(cfg, room);
        await t.write('meta', { kid, coach, created: Date.now() });
      } catch (e) { console.error(e); err.textContent = friendlyErr(e); err.hidden = false; go.disabled = false; go.textContent = 'Connect'; return; }
      Object.assign(LIVE, { role: 'coach', room, cfg, kid, coach, fresh: true });
      liveSave(); closeSheet();
      location.reload();
    });
  });
}
// Accepts the snippet from the Firebase console or plain JSON.
function parseConfig(text, dbUrl) {
  if (String(text).trim() === 'local') return 'local';
  const o = {}, re = /["']?(apiKey|authDomain|databaseURL|projectId|appId)["']?\s*:\s*["']([^"']+)["']/g;
  let m; while ((m = re.exec(text))) o[m[1]] = m[2].trim();
  if (!o.apiKey || !o.projectId) return null;
  const url = (dbUrl || '').trim() || o.databaseURL || `https://${o.projectId}-default-rtdb.firebaseio.com`;
  return { apiKey: o.apiKey, authDomain: o.authDomain || `${o.projectId}.firebaseapp.com`, databaseURL: url, projectId: o.projectId, appId: o.appId || '' };
}

// End-to-end checks: task checkers, solo task flow, and kid + coach live flows (test channel and stand-in Firebase SDK).
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const BASE = 'http://localhost:8765/';
const MOCK = path.resolve(__dirname, 'mockfb');
const QR = (() => { try { return require.resolve('qrcode-generator/qrcode.js'); } catch (_) { return '/tmp/qr/package/qrcode.js'; } })();
const out = path.resolve(__dirname, 'shots2'); fs.mkdirSync(out, { recursive: true });
const results = [], errors = [];
const check = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  (' + extra + ')' : ''}`);
const b64e = o => Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const js = { status: 200, contentType: 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' } };

async function routes(ctx) {
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ ...js, body: fs.readFileSync(path.join(MOCK, r.request().url().split('/').pop()), 'utf8') }));
  await ctx.route('https://cdn.jsdelivr.net/**', r => r.fulfill({ ...js, body: fs.readFileSync(QR, 'utf8') }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
}
const watch = (p, tag) => { p.on('pageerror', e => errors.push(`${tag} pageerror: ${e.message}`)); p.on('console', m => { if (m.type() === 'error') errors.push(`${tag} console: ${m.text()}`); }); };
const S = (p, expr) => p.evaluate(expr);
async function waitFor(p, fn, arg, ms = 3000) { const t = Date.now(); while (Date.now() - t < ms) { if (await p.evaluate(fn, arg)) return true; await sleep(100); } return false; }

async function liveFlow(tag, coach, kid) {
  check(`${tag}: kid sees coach watching`, await waitFor(kid, () => /is watching/.test(document.getElementById('liveTxt').textContent)), await kid.$eval('#liveTxt', e => e.textContent));
  check(`${tag}: coach sees kid online`, await waitFor(coach, () => /is online/.test(document.getElementById('liveTxt').textContent)), await coach.$eval('#liveTxt', e => e.textContent));
  // mirror
  await kid.click('.pbtn:has-text("Ten")');
  const kidN = await S(kid, () => window.mathbench.S.data['base-ten'].pieces.length);
  check(`${tag}: coach mirrors the kid's board`, await waitFor(coach, n => window.mathbench.S.tool === 'base-ten' && window.mathbench.S.data['base-ten'].pieces.length === n, kidN), `kid=${kidN}`);
  // assign a task
  if ((await S(coach, () => window.mathbench.LV.tab)) !== 'assign') await coach.click('.ctab[data-tab="assign"]');
  await coach.click('[data-tl="fr-34"]');
  check(`${tag}: assigned task opens on kid`, await waitFor(kid, () => window.mathbench.S.task && window.mathbench.S.task.id === 'fr-34' && window.mathbench.S.tool === 'fractions'));
  check(`${tag}: kid values hidden during task`, await S(kid, () => document.getElementById('readout').hidden));
  check(`${tag}: coach follows to the task's tool`, await waitFor(coach, () => window.mathbench.S.tool === 'fractions' && window.mathbench.S.task && window.mathbench.S.task.id === 'fr-34'));
  // kid checks a wrong board first, then the right one
  await kid.click('#tcard [data-tc="check"]');
  check(`${tag}: wrong board gets feedback`, await S(kid, () => window.mathbench.S.task.status === 'no'));
  await S(kid, () => {
    const t = (den, n, y) => Array.from({ length: n }, (_, j) => ({ id: `q${den}${j}`, k: 'f', d: den, x: -200 + 400 / den * (j + 0.5), y, r: 0 }));
    window.mathbench.S.data.fractions.pieces.push(...t(4, 3, 0), ...t(8, 6, 40)); window.mathbench.render();
  });
  await kid.click('#tcard [data-tc="check"]');
  check(`${tag}: right board passes`, await S(kid, () => window.mathbench.S.task.status === 'ok'));
  check(`${tag}: coach log gets both checks`, await waitFor(coach, () => window.mathbench.LV.log.filter(e => e.id === 'fr-34').length === 2), String(await S(coach, () => window.mathbench.LV.log.length)));
  await coach.click('.ctab[data-tab="results"]');
  const res = await coach.$eval('#cbody', e => e.innerText);
  check(`${tag}: results tab lists the check`, /3\/4 in eighths/.test(res) && /1\/\d+\s*tasks solved/.test(res) && /Foundations/.test(res), res.slice(0, 120).replace(/\n/g, ' | '));
  // message
  await coach.click('.ctab[data-tab="msg"]');
  await coach.click('[data-q="Great job!"]');
  check(`${tag}: message reaches kid`, await waitFor(kid, () => !document.getElementById('msgbar').hidden && /Great job!/.test(document.getElementById('msgbar').textContent)));
  // coach ink: on a phone the coach first folds the panel away to see the board
  if ((await coach.viewportSize()).width < 900) await coach.click('.ctab[data-tab="msg"]');
  await coach.click('#bPen');
  const wb = await coach.$eval('#wrap', e => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await coach.mouse.move(wb[0] - 40, wb[1]); await coach.mouse.down(); await coach.mouse.move(wb[0] + 40, wb[1] + 20, { steps: 8 }); await coach.mouse.up();
  check(`${tag}: coach ink shows on kid`, await waitFor(kid, () => (window.mathbench.S.coachInk.fractions || []).length === 1));
  await coach.click('#bPen');
}

(async () => {
  const srv = require('child_process').spawn('python3', ['-m', 'http.server', '8765', '--directory', path.resolve(__dirname, '../dist')], { stdio: 'ignore' });
  await sleep(700);
  const browser = await chromium.launch();
  try {
    /* ---------- A. task checkers ---------- */
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 } });
    await routes(ctx);
    const u = await ctx.newPage(); watch(u, 'unit');
    await u.goto(BASE + '?ns=unit');
    const unit = await u.evaluate(src => {
      const { TASKS, parseAns, ansMatch } = window.mathbench;
      const { solved, near } = eval('(' + src + ')')();
      const rows = TASKS.map(t => {
        const s0 = t.check(t.setup(), null), sv = solved[t.id], s1 = sv ? t.check(sv[0], sv[1] === undefined ? null : sv[1]) : [null, 'no solved state'];
        const nv = near[t.id], s2 = nv ? t.check(nv[0], nv[1] === undefined ? null : nv[1]) : null;
        // contest problems are scored without a board when a practice set finishes
        if (t.answerOnly && s1[0]) { try { if (!t.check(null, sv[1])[0]) s1[0] = false, s1[1] = 'fails without a board'; } catch (e) { s1[0] = false; s1[1] = 'needs a board: ' + e.message; } }
        return [t.id, s0[0], s1[0], s1[1], s2 && s2[0], s2 && s2[1]];
      });
      const { SETS, pickSet, STYLES } = window.mathbench;
      const sets = Object.keys(SETS).map(k => { const ids = pickSet(k), d = ids.map(id => window.mathbench.getTask(id).diff); return [k, ids.length === SETS[k].pick.reduce((a, b) => a + b, 0) && d.every((x, i) => !i || x >= d[i - 1]) && ids.every(id => window.mathbench.getTask(id).style === k), d.join('')]; });
      const styled = Object.keys(STYLES).map(k => TASKS.filter(t => t.style === k).length);
      const pa = ['1 1/2', '0.5', '.5', '3/4', '7', '1-3/4', 'abc', ' 12 ', '-4', '−4'].map(s => [s, parseAns(s)]);
      const am = [['2/4', '0.5'], ['Square', ' square '], ['12', '12.0'], ['3', '4'], ['', '0']].map(([x, y]) => ansMatch(x, y));
      const levels = [1, 2, 3].map(l => TASKS.filter(t => t.level === l).length);
      const words = TASKS.filter(t => /grade|4th|fourth grader/i.test(t.prompt + t.title + t.hint)).map(t => t.id);
      return { rows, pa, am, levels, words, sets, styled, n: TASKS.length, ids: new Set(TASKS.map(t => t.id)).size };
    }, require('./solutions').toString());
    check('task bank size', unit.n >= 70, String(unit.n));
    check('task ids are unique', unit.ids === unit.n);
    check('every level has tasks', unit.levels.every(x => x >= 15), JSON.stringify(unit.levels));
    check('no grade wording in tasks', !unit.words.length, unit.words.join(','));
    check('contest pools: Kangaroo, MOEMS and Noetic problems', unit.styled.every(x => x >= 12), JSON.stringify(unit.styled));
    for (const [k, ok, d] of unit.sets) check(`practice set ${k}: right size, easy to hard`, ok, d);
    for (const [id, start, ok, msg, nearOk, nearMsg] of unit.rows) {
      check(`task ${id}: not solved at start`, start === false);
      check(`task ${id}: solved board passes`, ok === true, ok ? '' : msg);
      if (nearOk !== null && nearOk !== undefined) check(`task ${id}: near miss is caught`, nearOk === false, nearMsg);
    }
    check('parseAns forms', JSON.stringify(unit.pa.map(x => x[1])) === JSON.stringify([[3, 2], [5, 10], [5, 10], [3, 4], [7, 1], [7, 4], null, [12, 1], [-4, 1], [-4, 1]]), JSON.stringify(unit.pa));
    check('typed answers match by value or word', JSON.stringify(unit.am) === JSON.stringify([true, true, true, false, false]), JSON.stringify(unit.am));

    /* ---------- B. solo task flow on a tablet ---------- */
    await u.click('#bTask');
    check('solo: task list starts with this manipulative', !(await u.$('[data-tl="tm-845"]')) && !!(await u.$('[data-tl="pv-347"]')));
    await u.click('[data-scope="all"]');
    await u.click('[data-tl="tm-845"]');
    check('solo: task opens on the clock', await S(u, () => window.mathbench.S.tool === 'clock' && window.mathbench.S.task.id === 'tm-845'));
    check('solo: readout hidden while working', await S(u, () => document.getElementById('readout').hidden));
    await u.click('.opt:has-text("Snap to 5 minutes")');
    const K = await u.$eval('.ck-face', e => { const r = e.getBoundingClientRect(); return { cx: r.x + r.width / 2, cy: r.y + r.height / 2, R: r.width / 2 }; });
    const ang = 262.5 * Math.PI / 180;
    await u.mouse.move(K.cx, K.cy - K.R * 0.32); await u.mouse.down();
    await u.mouse.move(K.cx + Math.sin(ang) * K.R * 0.4, K.cy - Math.cos(ang) * K.R * 0.4, { steps: 16 }); await u.mouse.up();
    const m = await S(u, () => window.mathbench.S.data.clock.m);
    check('solo: dragging the hour hand sets the time', m === 525, `m=${m}`);
    await u.click('#tcard [data-tc="check"]');
    check('solo: correct check', await S(u, () => window.mathbench.S.task.status === 'ok'));
    check('solo: values come back after solving', await S(u, () => !document.getElementById('readout').hidden));
    await u.screenshot({ path: `${out}/solo-clock-task.png` });
    await u.click('#tcard [data-tc="next"]');
    check('solo: next task opens', await S(u, () => window.mathbench.S.task && window.mathbench.S.task.id !== 'tm-845'));
    await u.evaluate(() => window.mathbench.startTask('am-23x14'));
    await sleep(150);
    await u.screenshot({ path: `${out}/solo-area-model.png` });
    await u.fill('#tcIn', '322'); await u.press('#tcIn', 'Enter');
    check('solo: typed answer checked with Enter', await S(u, () => window.mathbench.S.task.status === 'ok'));

    /* ---------- C. live over the test channel ---------- */
    const ROOM = 'abcdefghijklmnopqrstuvwx';
    const pay = b64e({ v: 1, r: ROOM, c: 'local', k: 'Aarav', n: 'Dad' });
    const coach = await ctx.newPage(); watch(coach, 'coach'); await coach.setViewportSize({ width: 390, height: 760 });
    await coach.goto(BASE + '?ns=coach#coach=' + pay);
    const kid = await ctx.newPage(); watch(kid, 'kid');
    await kid.goto(BASE + '?ns=kid#join=' + pay);
    check('pairing link is removed from the address bar', !(await kid.url()).includes('join='));
    await liveFlow('local', coach, kid);
    await kid.screenshot({ path: `${out}/kid-tablet.png` });
    await coach.click('.ctab[data-tab="results"]'); await sleep(100);
    await coach.screenshot({ path: `${out}/coach-results.png` });
    await kid.close();
    check('local: coach sees kid go offline', await waitFor(coach, () => /offline/.test(document.getElementById('liveTxt').textContent)));
    await coach.close();

    /* ---------- D. live over the stand-in Firebase SDK, set up through the UI ---------- */
    const c2 = await ctx.newPage(); watch(c2, 'fb-coach'); await c2.setViewportSize({ width: 390, height: 760 });
    await c2.goto(BASE + '?ns=c2');
    await c2.click('#bLive');
    await c2.fill('#cfgIn', 'const firebaseConfig = {\n  apiKey: "no-anon",\n  authDomain: "demo-mb.firebaseapp.com",\n  projectId: "demo-mb",\n  appId: "1:1:web:1"\n};');
    await c2.click('#setupGo');
    check('fb: setup explains a missing Anonymous sign-in', await waitFor(c2, () => /Anonymous/.test(document.getElementById('setupErr').textContent)));
    await c2.fill('#cfgIn', 'const firebaseConfig = {\n  apiKey: "AIzaFAKE",\n  authDomain: "demo-mb.firebaseapp.com",\n  projectId: "demo-mb",\n  storageBucket: "demo-mb.appspot.com",\n  messagingSenderId: "1",\n  appId: "1:1:web:1"\n};');
    await c2.fill('#kidIn', 'Aarav'); await c2.fill('#coachIn', 'Dad');
    await Promise.all([c2.waitForNavigation(), c2.click('#setupGo')]);
    await sleep(500);
    check('fb: setup switches this phone to coach mode', await S(c2, () => window.mathbench.LIVE.role === 'coach' && document.body.classList.contains('coachmode')));
    check('fb: devices tab shows a QR code', await waitFor(c2, () => !!document.querySelector('#qrBox svg')));
    await c2.screenshot({ path: `${out}/coach-pair.png` });
    const link = (await c2.$eval('#kidLink', e => e.value)).replace('?ns=c2', '?ns=k2');
    check('fb: kid link carries the default database URL', await S(c2, () => window.mathbench.LIVE.cfg.databaseURL === 'https://demo-mb-default-rtdb.firebaseio.com'));
    const k2 = await ctx.newPage(); watch(k2, 'fb-kid');
    await k2.goto(link);
    await liveFlow('fb', c2, k2);
    await k2.close(); await c2.close();

    /* ---------- E. your own tasks on one device ---------- */
    const e1 = await ctx.newPage(); watch(e1, 'mine');
    await e1.goto(BASE + '?ns=mine');
    await e1.click('#tab-hundred-chart');
    await e1.click('#bTask'); await e1.click('[data-make]');
    await e1.click('[data-save="only"]');
    check('editor: asks for the question first', /question/i.test(await e1.$eval('#edErr', e => e.textContent)));
    await e1.fill('#edQ', 'Which is the biggest multiple of 9 below 100?');
    await e1.fill('#edC0', '90'); await e1.click('[data-save="only"]');
    check('editor: needs two choices', /two choices/i.test(await e1.$eval('#edErr', e => e.textContent)));
    await e1.fill('#edC1', '99'); await e1.fill('#edC2', '98');
    await e1.click('[data-right="1"]'); await e1.click('[data-lv="3"]');
    await e1.click('[data-save="go"]');
    check('mine: saved task opens', await S(e1, () => { const m = window.mathbench, t = m.S.task && m.getTask(m.S.task.id); return !!(t && t.custom && m.S.tool === 'hundred-chart'); }));
    check('mine: card shows level and lettered choices', /hundred chart · challenge/i.test(await e1.$eval('.tc-k', e => e.textContent)) && (await e1.$$('#tcard .ch')).length === 3 && /^A/.test(await e1.$eval('#tcard .ch', e => e.textContent)));
    check('mine: starts from the board it was made from', await S(e1, () => Object.keys(window.mathbench.S.data['hundred-chart'].marks).length === 25));
    check('mine: readouts hidden while solving', await S(e1, () => document.getElementById('readout').hidden));
    await e1.click('#tcard [data-i="0"]'); await e1.click('#tcard [data-tc="check"]');
    check('mine: wrong choice is caught', await S(e1, () => window.mathbench.S.task.status === 'no'));
    await e1.click('#tcard [data-i="1"]'); await e1.click('#tcard [data-tc="check"]');
    check('mine: right choice passes', await S(e1, () => window.mathbench.S.task.status === 'ok'));
    await e1.click('#bTask');
    check('mine: list has a My tasks group', /my tasks/i.test(await e1.$eval('#sheetBody', e => e.innerText)));
    await e1.click('#sheetBody [data-edit]');
    await e1.click('[data-ty="answer"]'); await e1.fill('#edA', '99'); await e1.click('[data-st="empty"]');
    await e1.click('[data-save="go"]');
    check('mine: edited task starts on an empty board', await S(e1, () => Object.keys(window.mathbench.S.data['hundred-chart'].marks).length === 0 && window.mathbench.S.custom.length === 1));
    await e1.fill('#tcIn', '99.0'); await e1.press('#tcIn', 'Enter');
    check('mine: typed answer passes', await S(e1, () => window.mathbench.S.task.status === 'ok'));
    await e1.click('#bTask'); await e1.click('[data-make]');
    await e1.fill('#edQ', 'Set the clock to 7:15.'); await e1.click('[data-ty="done"]');
    await e1.selectOption('#edTool', 'clock');
    check('editor: warns when the board is another manipulative', /Hundred Chart/.test(await e1.$eval('#edStartNote', e => e.textContent)));
    await e1.click('[data-save="only"]');
    check('editor: will not save a mismatched board', !(await e1.$eval('#edErr', e => e.hidden)));
    await e1.click('[data-st="empty"]'); await e1.click('[data-save="only"]');
    check('editor: saves with an empty clock', await S(e1, () => window.mathbench.S.custom.some(c => c.tool === 'clock' && JSON.parse(c.board).m === 0)));
    await e1.reload(); await sleep(300);
    check('mine: tasks kept after reload', await S(e1, () => window.mathbench.S.custom.length === 2 && Object.keys(window.mathbench.CUSTOM).length === 2));
    const tlink = await S(e1, () => window.mathbench.taskLink(window.mathbench.S.custom[0]));
    const e2 = await ctx.newPage(); watch(e2, 'mine2');
    await e2.goto(tlink.replace('?ns=mine', '?ns=mine2'));
    check('link: task added and opened on another device', await waitFor(e2, () => { const m = window.mathbench, t = m.S.task && m.getTask(m.S.task.id); return !!(t && t.custom && m.S.custom.length === 1); }));
    check('link: removed from the address bar', !(await e2.url()).includes('task='));
    await e2.close(); await e1.close();

    /* ---------- G. timed contest practice on one device ---------- */
    const SOL = require('./solutions').toString();
    const g = await ctx.newPage(); watch(g, 'sets');
    await g.goto(BASE + '?ns=sets');
    await g.click('#bTask');
    check('sets: task list offers three contest practices', (await g.$$('#sheetBody [data-set]')).length === 3);
    await g.click('[data-set="moems"]');
    check('sets: MOEMS practice starts with 5 problems and a 30 minute timer', await S(g, () => { const st = window.mathbench.S.set; return !!st && st.ids.length === 5 && /^(30:00|29:5\d)$/.test(document.getElementById('tcTimer').textContent); }));
    check('sets: readouts hidden during the practice', await S(g, () => document.getElementById('readout').hidden));
    const answers = await g.evaluate(src => { const { solved } = eval('(' + src + ')')(); return window.mathbench.S.set.ids.map(id => solved[id][1]); }, SOL);
    for (let i = 0; i < answers.length; i++) {
      if (typeof answers[i] === 'number') await g.click(`#tcard [data-sc="choice"][data-i="${answers[i]}"]`);
      else await g.fill('#scIn', String(answers[i]));
      if (i < answers.length - 1) await g.click('#tcard [data-sc="next"]');
    }
    await g.click('#tcard [data-sc="prev"]');
    check('sets: going back keeps the answer', await S(g, () => { const st = window.mathbench.S.set, a = st.ans[st.ids[st.i]]; return a != null && a !== ''; }));
    await g.click('#bTask');
    check('sets: task list waits while a practice runs', /practice is running/.test(await g.$eval('#sheetBody', e => e.innerText)));
    await g.click('#sheetBody [data-back]');
    await g.click('#tcard [data-sc="finish"]');
    check('sets: all right scores 5 of 5', await S(g, () => { const l = window.mathbench.S.lastSet; return !window.mathbench.S.set && l.score === 5 && l.max === 5; }));
    check('sets: results sheet opens', /MOEMS style practice/.test(await g.$eval('#sheetTitle', e => e.textContent)));
    await g.click('#sheetBody [data-close]');
    await g.evaluate(src => { const m = window.mathbench, { solved } = eval('(' + src + ')')(); m.startSet('kangaroo'); m.S.set.ids.forEach(id => { m.S.set.ans[id] = solved[id][1]; }); m.finishSet(); }, SOL);
    check('sets: Kangaroo scores 3, 4 and 5 points', await S(g, () => window.mathbench.S.lastSet.score === 36 && window.mathbench.S.lastSet.max === 36));
    await g.click('#sheetBody [data-again]');
    await g.evaluate(() => { const m = window.mathbench; m.S.set.ans[m.S.set.ids[0]] = 'x'; m.finishSet(); });
    check('sets: a wrong answer can be tried again as a task', await S(g, () => window.mathbench.S.lastSet.rows[0].ok === false) && !!(await g.$('#sheetBody [data-retry]')));
    await g.click('#sheetBody [data-retry]');
    check('sets: try again opens the problem with Check and Hint', await S(g, () => !!window.mathbench.S.task && !!document.querySelector('#tcard [data-tc="check"]')));
    await g.evaluate(() => window.mathbench.startSet('noetic'));
    await g.fill('#scIn', '7').catch(() => g.click('#tcard [data-sc="choice"][data-i="0"]'));
    await sleep(400); await g.reload(); await sleep(400);
    check('sets: a running practice survives a reload', await S(g, () => { const st = window.mathbench.S.set; return !!st && st.style === 'noetic' && Object.keys(st.ans).length === 1 && !!document.getElementById('tcTimer'); }));
    await g.evaluate(() => { window.mathbench.S.set.end = Date.now() - 5; });
    check('sets: time running out scores the practice', await waitFor(g, () => !window.mathbench.S.set && window.mathbench.S.lastSet.timeUp === true && /practice/.test(document.getElementById('sheetTitle').textContent), null, 2500));
    check('sets: last score shows on the practice buttons', await S(g, () => { window.mathbench.app.sheet.hidden = true; return true; }) && (await g.click('#sheetClose').then(() => true, () => true)) && (await g.click('#bTask').then(() => true)) && /Last time/.test(await g.$eval('#sheetBody', e => e.innerText)));
    await g.close();

    /* ---------- F. your own tasks in live mode, with build mode on the parent phone ---------- */
    const pay3 = b64e({ v: 1, r: 'bcdefghijklmnopqrstuvwxy', c: 'local', k: 'Aarav', n: 'Dad' });
    const co = await ctx.newPage(); watch(co, 'coach3'); await co.setViewportSize({ width: 390, height: 760 });
    await co.goto(BASE + '?ns=co3#coach=' + pay3);
    const ki = await ctx.newPage(); watch(ki, 'kid3');
    await ki.goto(BASE + '?ns=ki3#join=' + pay3);
    check('F: coach sees kid online', await waitFor(co, () => /is online/.test(document.getElementById('liveTxt').textContent)));
    await ki.click('#bTask');
    check('F: kid device has no task maker', !(await ki.$('#sheetBody [data-make]')) && !(await ki.$('#sheetBody [data-edit]')));
    await ki.click('#sheetClose');
    await ki.click('#tab-balance');
    check('F: coach follows to the balance', await waitFor(co, () => window.mathbench.S.tool === 'balance'));
    if ((await S(co, () => window.mathbench.LV.tab)) !== 'assign') await co.click('.ctab[data-tab="assign"]');
    check('F: assign list shows every manipulative by default', !!(await co.$('#cbody [data-tl="tm-845"]')) && !!(await co.$('#cbody [data-tl="ba-ten"]')));
    await co.click('#cbody [data-scope="tool"]');
    check('F: filter shows only balance tasks', !(await co.$('#cbody [data-tl="tm-845"]')) && !!(await co.$('#cbody [data-tl="ba-ten"]')));
    await co.click('#cbody [data-make]');
    check('F: coach editor offers the kid board and build mode', /Aarav’s board now/.test(await co.$eval('#sheetBody', e => e.innerText)) && !!(await co.$('#sheetBody [data-build]')));
    await co.fill('#edQ', 'How much does one circle weigh?'); await co.click('[data-ty="answer"]'); await co.fill('#edA', '4');
    await co.click('[data-save="go"]');
    check('F: kid gets the parent task', await waitFor(ki, () => { const m = window.mathbench, t = m.S.task && m.getTask(m.S.task.id); return !!(t && t.custom && m.S.task.by === 'coach'); }));
    check('F: task board is the kid board it was made from', await S(ki, () => JSON.stringify(window.mathbench.S.data.balance.L) === '["c","c"]'));
    check('F: mystery weights locked during the task', await S(ki, () => !/New mystery weights/.test(document.getElementById('tray').innerText) && /\?/.test(document.querySelector('.ba-item text').textContent)));
    await ki.fill('#tcIn', '4'); await ki.press('#tcIn', 'Enter');
    check('F: kid solves it', await S(ki, () => window.mathbench.S.task.status === 'ok'));
    check('F: coach log has the parent task', await waitFor(co, () => window.mathbench.LV.log.some(e => e.ok && window.mathbench.getTask(e.id) && window.mathbench.getTask(e.id).custom)));
    // build a starting board on the parent phone
    await co.click('#cbody [data-make]');
    await co.fill('#edQ', 'Build 25 with the fewest blocks.'); await co.click('[data-ty="done"]');
    await co.selectOption('#edTool', 'base-ten');
    await co.click('[data-build]');
    check('F build: tray and build bar on the parent phone', await S(co, () => !document.getElementById('tray').hidden && !document.getElementById('buildbar').hidden && !document.body.classList.contains('coachmode') && window.mathbench.S.tool === 'base-ten'));
    check('F build: starts from an empty board', await S(co, () => window.mathbench.S.data['base-ten'].pieces.length === 0));
    await ki.click('#tab-clock'); await sleep(600);
    check('F build: kid moving on does not replace the board being built', await S(co, () => window.mathbench.S.tool === 'base-ten' && window.mathbench.LV.mirror && window.mathbench.LV.mirror.tool === 'clock'));
    await co.click('.pbtn:has-text("Ten")'); await co.click('.pbtn:has-text("Ten")');
    const builtN = await S(co, () => window.mathbench.S.data['base-ten'].pieces.length);
    await co.screenshot({ path: `${out}/coach-build.png` });
    await co.click('[data-build="use"]');
    check('F build: editor returns with the built board picked', await S(co, () => { const b = document.querySelector('#sheetBody [data-st="built"]'); return !!b && b.getAttribute('aria-pressed') === 'true'; }));
    check('F build: parent phone mirrors the kid again', await S(co, () => window.mathbench.S.tool === 'clock' && document.body.classList.contains('coachmode') && document.getElementById('buildbar').hidden));
    await co.click('[data-save="go"]');
    check('F build: kid gets the built board', await waitFor(ki, n => { const m = window.mathbench; return m.S.tool === 'base-ten' && m.S.data['base-ten'].pieces.length === n && m.S.task && m.S.task.by === 'coach'; }, builtN), `built ${builtN}`);
    await ki.screenshot({ path: `${out}/kid-parent-task.png` });
    await ki.click('#tcard [data-tc="check"]');
    check('F build: "I’m done" completes it', await S(ki, () => window.mathbench.S.task.status === 'ok'));
    check('F: both parent tasks are on the kid device', await S(ki, () => window.mathbench.S.custom.length === 2));
    await co.click('.ctab[data-tab="assign"]'); if ((await S(co, () => window.mathbench.LV.tab)) !== 'assign') await co.click('.ctab[data-tab="assign"]');
    await co.click('#cbody [data-scope="all"]');
    await co.click('#cbody [data-edit]');
    await co.click('[data-del]');
    check('F: deleting on the parent phone removes it on the kid device', await waitFor(ki, () => window.mathbench.S.custom.length === 1));
    await co.click('#cbody [data-sendset="moems"]');
    check('F set: kid starts the practice the parent sent', await waitFor(ki, () => window.mathbench.S.set && window.mathbench.S.set.style === 'moems' && window.mathbench.S.set.by === 'coach'));
    check('F set: parent phone shows the set and its timer', await waitFor(co, () => window.mathbench.S.set && !!document.getElementById('tcTimer')));
    await ki.evaluate(src => { const m = window.mathbench, { solved } = eval('(' + src + ')')(); m.S.set.ids.forEach(id => { m.S.set.ans[id] = solved[id][1]; }); m.render(); }, require('./solutions').toString());
    check('F set: parent sees the answers so far', await waitFor(co, () => /5 of 5 answered/.test(document.getElementById('tcard').textContent)));
    await ki.evaluate(() => window.mathbench.finishSet());
    check('F set: parent results list the practice score', await waitFor(co, () => window.mathbench.LV.log.some(e => e.id === '__set' && e.score === 5)));
    await co.click('.ctab[data-tab="results"]');
    const coRes = await co.$eval('#cbody', e => e.innerText), coTab = await S(co, () => window.mathbench.LV.tab);
    check('F set: results tab shows contest practice', /Contest practice/i.test(coRes) && /MOEMS style/.test(coRes), `tab=${coTab} ` + coRes.slice(0, 160).replace(/\n/g, ' | '));
    check('F set: parent card clears when the set ends', await waitFor(co, () => !window.mathbench.S.set));
    await co.reload(); await sleep(500);
    check('F: parent phone keeps its tasks after reload', await S(co, () => window.mathbench.S.custom.length === 1 && window.mathbench.LIVE.role === 'coach'));
    await ki.close(); await co.close();
    await u.close(); await ctx.close();
  } finally {
    await browser.close(); srv.kill();
  }
  console.log(results.filter(r => r.startsWith('FAIL')).join('\n') || 'no failures');
  console.log(`${results.filter(r => r.startsWith('PASS')).length} passed, ${results.filter(r => r.startsWith('FAIL')).length} failed`);
  console.log(errors.length ? 'ERRORS:\n' + [...new Set(errors)].join('\n') : 'No page errors.');
})().catch(e => { console.log(results.slice(-12).join('\n')); console.log([...new Set(errors)].join('\n')); console.error('TEST CRASH', e); process.exit(1); });

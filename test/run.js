// Headless check: loads the page at phone and desktop sizes, exercises each tool, reports errors.
const { chromium } = require('playwright');
const path = require('path');
const url = 'file://' + path.resolve(__dirname, '../dist/mathbench.html');
const out = path.resolve(__dirname, 'shots');
require('fs').mkdirSync(out, { recursive: true });

const results = [];
const check = (name, cond, extra = '') => { results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  (' + extra + ')' : ''}`); };

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto(url);
  await page.waitForTimeout(300);

  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.mathbench.S.data[window.mathbench.S.tool])));
  const tool = id => page.click(`#tab-${id}`).then(() => page.waitForTimeout(150));
  const box = sel => page.locator(sel).first().boundingBox();
  const center = b => [b.x + b.width / 2, b.y + b.height / 2];
  async function drag(from, to, steps = 12) {
    await page.mouse.move(from[0], from[1]); await page.mouse.down();
    await page.mouse.move(to[0], to[1], { steps }); await page.mouse.up(); await page.waitForTimeout(80);
  }
  async function tapAt(p) { await page.mouse.move(p[0], p[1]); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(80); }
  const trayBtn = label => page.locator('.pbtn', { hasText: label }).first();
  const optBtn = label => page.locator('.opt', { hasText: label }).first();
  const ctxBtn = label => page.locator('#ctx button', { hasText: label }).first();

  // ---------- Base ten ----------
  await page.screenshot({ path: `${out}/m-base-ten.png` });
  let d = await st();
  check('base-ten starts at 243', d.pieces.length === 9);
  await trayBtn('Ten').click(); await page.waitForTimeout(80);
  d = await st(); check('tap tray adds a ten', d.pieces.filter(p => p.k === 't').length === 5);
  // select a rod, break it
  const rodId = d.pieces.find(p => p.k === 't').id;
  await tapAt(center(await box(`[data-id="${rodId}"]`)));
  check('rod selected shows context bar', await page.locator('#ctx').isVisible());
  await ctxBtn('Break').click(); await page.waitForTimeout(80);
  d = await st(); check('break rod gives 10 ones', d.pieces.filter(p => p.k === 'o').length === 13, `ones=${d.pieces.filter(p => p.k === 'o').length}`);
  let ro = await page.locator('#readout').innerText();
  check('readout shows regroup hint', /traded/.test(ro), ro.replace(/\n/g, ' | '));
  // select a unit, trade 10
  const unitId = d.pieces.find(p => p.k === 'o').id;
  await tapAt(center(await box(`[data-id="${unitId}"]`)));
  await ctxBtn('Trade').click(); await page.waitForTimeout(80);
  d = await st(); check('trade 10 ones -> 1 ten', d.pieces.filter(p => p.k === 'o').length === 3 && d.pieces.filter(p => p.k === 't').length === 5);
  // drag a unit to trash
  const u2 = d.pieces.find(p => p.k === 'o').id;
  const ub = center(await box(`[data-id="${u2}"]`));
  await page.mouse.move(ub[0], ub[1]); await page.mouse.down(); await page.mouse.move(ub[0] + 30, ub[1] + 30, { steps: 4 });
  const tb = center(await box('#trash'));
  await page.mouse.move(tb[0], tb[1], { steps: 10 }); await page.mouse.up(); await page.waitForTimeout(80);
  d = await st(); check('drag to trash deletes', d.pieces.filter(p => p.k === 'o').length === 2);
  // undo
  await page.click('#bUndo'); await page.waitForTimeout(80);
  d = await st(); check('undo restores', d.pieces.filter(p => p.k === 'o').length === 3);
  // drag from tray into workspace
  const hb = center(await (await trayBtn('Hundred')).boundingBox());
  const before = (await st()).pieces.length;
  await drag(hb, [hb[0] + 60, hb[1] - 300], 15);
  d = await st(); check('drag from tray creates piece', d.pieces.length === before + 1);

  // ---------- Fractions ----------
  await tool('fractions');
  await page.screenshot({ path: `${out}/m-fractions.png` });
  ro = await page.locator('#readout').innerText();
  check('fractions readout lists equivalents', ro.length > 5, ro.replace(/\n/g, ' '));
  await optBtn('Full fraction wall').click(); await page.waitForTimeout(80);
  d = await st(); check('fraction wall has 51 tiles', d.pieces.length === 51, `n=${d.pieces.length}`);
  await page.click('#bUndo'); await page.waitForTimeout(80);
  // add a 1/3 tile and drop near the right edge of the 1/2 row's first tile -> should snap
  await trayBtn('1/3').click(); await page.waitForTimeout(80);
  d = await st(); const third = d.pieces[d.pieces.length - 1];
  const half = d.pieces.find(p => p.d === 2);
  const tbx = center(await box(`[data-id="${third.id}"]`));
  const s = await page.evaluate(() => window.mathbench.S.views['fractions'].s);
  // target: just below the first 1/2 tile's left edge, at row y of the last row + 40
  const lastRowY = Math.max(...d.pieces.filter(p => p !== third).map(p => p.y));
  const leftX = -200 + 400 / 3 / 2;
  const dx = (leftX + 6 - third.x) * s, dy = (lastRowY + 40 + 5 - third.y) * s;
  await drag(tbx, [tbx[0] + dx, tbx[1] + dy]);
  d = await st(); const t2 = d.pieces.find(p => p.id === third.id);
  check('fraction tile snaps under row', Math.abs(t2.x - leftX) < 0.2 && Math.abs(t2.y - (lastRowY + 40)) < 0.2, `x=${t2.x} y=${t2.y}`);
  await tapAt(center(await box(`[data-id="${third.id}"]`)));
  ro = await page.locator('#readout').innerText();
  check('selected tile readout', /33/.test(ro), ro.replace(/\n/g, ' '));
  await ctxBtn('Split in 2').click(); await page.waitForTimeout(80);
  d = await st(); check('split 1/3 into sixths', d.pieces.filter(p => p.d === 6).length === 8);

  // ---------- Number line ----------
  await tool('number-line');
  await page.screenshot({ path: `${out}/m-number-line.png` });
  ro = await page.locator('#readout').innerText();
  check('number line readout', /8\s*\+\s*2\s*\+\s*5\s*=\s*15/.test(ro), ro.replace(/\n/g, ' '));
  const wsb = await box('#wrap');
  const ticks = await page.$$eval('.nl-tick', es => es.map(e => { const r = e.getBoundingClientRect(); return r.x + r.width / 2; }));
  const Y = await page.$eval('.nl-axis', e => { const r = e.getBoundingClientRect(); return r.y + r.height / 2; });
  const X = i => ticks[i];
  await drag([X(15), Y], [X(19), Y]);
  d = await st(); check('drag along line adds jump', d.jumps.length === 3 && d.jumps[2].a === 15 && d.jumps[2].b === 19, JSON.stringify(d.jumps[2]));
  await tapAt([X(3), Y]);
  d = await st(); check('tap tick adds mark', d.marks.includes(3));
  await optBtn('0 to 2 in fourths').click(); await page.waitForTimeout(80);
  await page.screenshot({ path: `${out}/m-number-line-fourths.png` });

  // ---------- Geoboard ----------
  await tool('geoboard');
  await page.screenshot({ path: `${out}/m-geoboard.png` });
  const pegsNow = () => page.$$eval('.gb-peg', es => es.map(e => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }));
  let pegs = await pegsNow();
  const P = (i, j) => pegs[j * 7 + i];
  await drag(P(6, 0), P(6, 5));
  d = await st(); check('drag from peg makes band', d.bands.length === 3 && d.bands[2].p.length === 2, JSON.stringify(d.bands[2]));
  // add a vertex via midpoint handle: midpoint of (6,0)-(6,5) is at (6,2.5) -> drag to (4,2)
  pegs = await pegsNow();
  const mid = [(P(6, 0)[0] + P(6, 5)[0]) / 2, (P(6, 0)[1] + P(6, 5)[1]) / 2];
  await drag(mid, P(4, 2));
  d = await st(); check('midpoint drag adds vertex', d.bands[2].p.length === 3, JSON.stringify(d.bands[2].p));
  ro = await page.locator('#readout').innerText();
  check('geoboard readout names triangle', /triangle/i.test(ro), ro.replace(/\n/g, ' '));
  await page.screenshot({ path: `${out}/m-geoboard-2.png` });

  // ---------- Pattern blocks ----------
  await tool('pattern-blocks');
  await page.screenshot({ path: `${out}/m-pattern-blocks.png` });
  ro = await page.locator('#readout').innerText();
  check('pattern readout = 4 wholes', /^4/.test(ro.trim()), ro.replace(/\n/g, ' '));
  await trayBtn('Triangle').click(); await page.waitForTimeout(80);
  d = await st(); const tri = d.pieces[d.pieces.length - 1];
  await tapAt(center(await box(`[data-id="${tri.id}"]`)));
  await ctxBtn('Turn right').click(); await page.waitForTimeout(60);
  d = await st(); check('rotate block 30deg', d.pieces.find(p => p.id === tri.id).r === 30);

  // ---------- Ten frames ----------
  await tool('ten-frames');
  await page.screenshot({ path: `${out}/m-ten-frames.png` });
  d = await st(); const fA = d.pieces[0];
  const c0 = page.locator(`[data-id="${fA.id}"] .cnt[data-cell="0"]`);
  await tapAt(center(await c0.boundingBox()));
  d = await st(); check('tap counter flips color', d.pieces[0].cells[0] === 'y');
  await trayBtn('Red').click(); await page.waitForTimeout(80);
  d = await st(); check('tap counter fills frame', d.pieces.find(p => p.cells && p.cells.filter(Boolean).length === 3) !== undefined);
  // drag a counter out of a frame
  const c5 = page.locator(`[data-id="${fA.id}"] .cnt[data-cell="5"]`);
  const c5c = center(await c5.boundingBox());
  await drag(c5c, [c5c[0] + 20, c5c[1] + 230]);
  d = await st(); check('drag counter out of frame', d.pieces.some(p => p.k === 'cnt') && d.pieces[0].cells[5] === null);

  // ---------- Algebra ----------
  await tool('algebra-tiles');
  await page.screenshot({ path: `${out}/m-algebra-tiles.png` });
  ro = await page.locator('#readout').innerText();
  check('algebra readout 2x + 3 = 7, x = 2', /2x\s*\+\s*3\s*=\s*7/.test(ro) && /x = 2/.test(ro), ro.replace(/\n/g, ' '));
  await trayBtn('−1').click(); await page.waitForTimeout(80);
  d = await st(); const neg = d.pieces[d.pieces.length - 1];
  // move the -1 onto the left side
  const nb = center(await box(`[data-id="${neg.id}"]`));
  const s2 = await page.evaluate(() => window.mathbench.S.views['algebra-tiles'].s);
  await drag(nb, [nb[0] + (-140 - neg.x) * s2, nb[1] + (40 - neg.y) * s2]);
  ro = await page.locator('#readout').innerText();
  check('zero pair hint', /zero pair/.test(ro), ro.replace(/\n/g, ' '));
  await optBtn('Remove zero pairs').click(); await page.waitForTimeout(80);
  d = await st(); check('remove zero pairs', d.pieces.length === 11, `n=${d.pieces.length}`);

  // ---------- Clock ----------
  await tool('clock');
  await page.screenshot({ path: `${out}/m-clock.png` });
  const K = await page.$eval('.ck-face', e => { const r = e.getBoundingClientRect(); return { cx: r.x + r.width / 2, cy: r.y + r.height / 2, R: r.width / 2 }; });
  const cxp = K.cx, cyp = K.cy;
  // minute hand at 45 (pointing left). drag it to 12 (top)
  await drag([cxp - K.R * 0.7, cyp], [cxp, cyp - K.R * 0.7], 20);
  d = await st(); check('drag minute hand wraps hour', d.m === 240, `m=${d.m}`);
  ro = await page.locator('#readout').innerText();
  check('clock readout words', /four o.clock/i.test(ro), ro.replace(/\n/g, ' '));

  // ---------- Pen + challenge ----------
  await page.click('#bPen');
  await drag([cxp - 100, cyp - 100], [cxp + 60, cyp - 40]);
  d = await st(); check('pen draws a stroke', d.ink.length === 1);
  await page.click('#bUndo'); await page.waitForTimeout(60);
  d = await st(); check('undo removes stroke', d.ink.length === 0);
  await page.click('#bPen');
  await page.click('#bTask'); await page.waitForTimeout(60);
  check('task list opens', await page.locator('#sheet').isVisible());
  await page.click('#sheetClose');

  // ---------- Cubes ----------
  await tool('cubes');
  await page.screenshot({ path: `${out}/m-cubes.png` });
  const cubes = dd => dd.cols.reduce((a, c) => a + c.length, 0);
  d = await st(); const cu0 = cubes(d);
  await tapAt(center(await box('.cu-floor[data-cell="24"]')));
  d = await st(); check('cubes: tap the floor adds a cube', d.cols[24].length === 1 && cubes(d) === cu0 + 1, `n=${cubes(d)}`);
  const topFace = () => page.locator('.cu-col[data-cell="24"] polygon').last().boundingBox();
  await tapAt(center(await topFace()));
  d = await st(); check('cubes: tap a stack adds on top', d.cols[24].length === 2);
  await optBtn('Remove cubes').click(); await page.waitForTimeout(60);
  await tapAt(center(await topFace()));
  d = await st(); check('cubes: remove mode takes one off', d.cols[24].length === 1);
  await optBtn('Turn right').click(); await page.waitForTimeout(60);
  d = await st(); check('cubes: turn the view', d.view === 1);
  check('cubes: top, front and side views drawn', (await page.locator('.cu-v').count()) === 25 + 2 * 5 * 3, String(await page.locator('.cu-v').count()));

  // ---------- Balance ----------
  await tool('balance');
  await page.screenshot({ path: `${out}/m-balance.png` });
  ro = await page.locator('#readout').innerText();
  check('balance: example starts balanced', /balanced/i.test(ro), ro.replace(/\n/g, ' '));
  await page.click('[aria-label="Add a 5"]'); await page.waitForTimeout(60);
  d = await st(); check('balance: adds to the chosen pan', d.L.length === 3 && d.L[2] === 'w5');
  ro = await page.locator('#readout').innerText();
  check('balance: heavier side named', /left side is heavier/i.test(ro), ro.replace(/\n/g, ' '));
  check('balance: mystery weights hidden', /\?/.test(await page.locator('.ba-item').first().textContent()));
  await tapAt(center(await box('.ba-pan[data-pick="R"]')));
  d = await st(); check('balance: tap a pan to add there', d.pan === 'R');
  await tapAt(center(await box('.ba-item[data-pan="L"][data-i="2"]')));
  d = await st(); check('balance: tap a weight to take it off', d.L.length === 2);

  // ---------- Hundred chart ----------
  await tool('hundred-chart');
  await page.screenshot({ path: `${out}/m-hundred-chart.png` });
  await optBtn('Clear colors').click(); await page.waitForTimeout(60);
  const hc = i => page.locator('.hc-cell').nth(i).boundingBox();
  await drag(center(await hc(0)), center(await hc(2)), 10);
  d = await st(); check('hundred chart: drag colors a run', JSON.stringify(Object.keys(d.marks).map(Number).sort((a, b) => a - b)) === '[1,2,3]', JSON.stringify(d.marks));
  await tapAt(center(await hc(0)));
  d = await st(); check('hundred chart: tap the same color erases', !('1' in d.marks) && Object.keys(d.marks).length === 2);

  // ---------- Tangram ----------
  await tool('tangram');
  await page.screenshot({ path: `${out}/m-tangram.png` });
  d = await st();
  const pa0 = d.pieces.find(p => p.k === 'pa');
  const paEl = () => box(`#lPieces .pc[data-id="${pa0.id}"]`);
  let pb0 = center(await paEl());
  await drag(pb0, [pb0[0] + 70, pb0[1] - 90]);
  pb0 = center(await paEl());
  await drag(pb0, [pb0[0] - 70 + 5, pb0[1] + 90 + 4]);
  d = await st(); const pa1 = d.pieces.find(p => p.id === pa0.id);
  check('tangram: piece snaps back into place', Math.abs(pa1.x - pa0.x) < 0.2 && Math.abs(pa1.y - pa0.y) < 0.2, `${pa1.x},${pa1.y} vs ${pa0.x},${pa0.y}`);
  await tapAt(center(await paEl()));
  await ctxBtn('Turn right').click(); await page.waitForTimeout(60);
  d = await st(); check('tangram: turn a piece 45 degrees', d.pieces.find(p => p.id === pa0.id).r === 45);
  await ctxBtn('Flip').click(); await page.waitForTimeout(60);
  d = await st(); check('tangram: flip the parallelogram', d.pieces.find(p => p.id === pa0.id).f === true);

  // ---------- Desktop ----------
  const dctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const dp = await dctx.newPage();
  dp.on('pageerror', e => errors.push('desktop pageerror: ' + e.message));
  dp.on('console', m => { if (m.type() === 'error') errors.push('desktop console: ' + m.text()); });
  await dp.goto(url + '#fractions'); await dp.waitForTimeout(300);
  await dp.screenshot({ path: `${out}/d-fractions.png` });
  await dp.goto(url + '#base-ten'); await dp.waitForTimeout(300);
  await dp.screenshot({ path: `${out}/d-base-ten.png` });
  const dark = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
  const kp = await dark.newPage(); await kp.goto(url + '#geoboard'); await kp.waitForTimeout(300);
  await kp.screenshot({ path: `${out}/d-geoboard-dark.png` });

  await browser.close();
  console.log(results.join('\n'));
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'No console errors.');
})().catch(e => { console.error('TEST CRASH', e); process.exit(1); });

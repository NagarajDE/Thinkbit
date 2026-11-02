/* ================= tasks: built-in library, your own tasks, task card, task list, editor ================= */
// Answers like 7, -4, 0.5, .5, 3/4, 1 3/4 -> [numerator, denominator]
function parseAns(s) {
  if (s == null) return null;
  s = String(s).trim().replace(/[−–]/g, '-').replace(/\s+/g, ' ');
  if (!s) return null;
  let m;
  if ((m = s.match(/^(-?\d+)[ -](\d+)\/(\d+)$/))) { const w = +m[1], n = +m[2], d = +m[3]; return d ? [w * d + (w < 0 ? -n : n), d] : null; }
  if ((m = s.match(/^(-?\d+)\/(\d+)$/))) { const d = +m[2]; return d ? [+m[1], d] : null; }
  if ((m = s.match(/^(-?)(\d*)\.(\d+)$/))) { const d = 10 ** m[3].length, n = (+(m[2] || 0)) * d + +m[3]; return [m[1] ? -n : n, d]; }
  if (/^-?\d+$/.test(s)) return [+s, 1];
  return null;
}
const ansIs = (s, n, d = 1) => { const a = parseAns(s); return !!a && a[0] * d === n * a[1]; };
// Your own tasks: numbers compare by value; words ignore case and extra spaces.
function ansMatch(given, correct) {
  const a = parseAns(given), b = parseAns(correct);
  if (a && b) return a[0] * b[1] === b[0] * a[1];
  const norm = x => String(x == null ? '' : x).trim().toLowerCase().replace(/\s+/g, ' ');
  return !!norm(given) && norm(given) === norm(correct);
}
const LEVELS = { 1: 'Foundations', 2: 'Builder', 3: 'Challenge' };
const LETTERS = 'ABCDE';
const NOPICK = [false, 'Pick an answer first.'];
const pick = (a, right, ok, no) => (a == null ? NOPICK : a === right ? [true, ok] : [false, no]);

const T_B10 = TOOL['base-ten'].api, T_FR = TOOL.fractions.api, T_GB = TOOL.geoboard.api, T_PB = TOOL['pattern-blocks'].api;
const T_CU = TOOL.cubes.api, T_BA = TOOL.balance.api, T_HC = TOOL['hundred-chart'].api, T_TG = TOOL.tangram.api;
const fresh = {
  fr: () => { const d = { pieces: [], lbl: 'frac', ink: [] }; d.pieces.push(...T_FR.row(1, -120)); return d; },
  nl: preset => ({ preset, jumps: [], marks: [], hide: false, ink: [] }),
  gb: () => ({ n: 7, fill: true, bands: [], ink: [] }),
  ck: m => ({ m, mins: true, snap5: false, ink: [] }),
  pb: target => Object.assign({ pieces: [], ink: [] }, target ? { target } : {}),
  am: (a, b) => ({ a, b, split: true, grid: true, all: false, rev: [], ink: [] }),
  cu: (n, spec) => T_CU.build(n, spec || []),
  ba: (sec, L, R) => ({ L: L || [], R: R || [], sec, pan: 'L', reveal: false, ink: [] }),
  hc: () => ({ start: 1, marks: {}, color: 0, hide: false, ink: [] }),
  tg: (kinds, target) => ({ pieces: T_TG.scattered(kinds), target, ink: [] }),
  // Ten frames: each entry is [red, yellow] counters, filled from the first cell.
  tf: frames => { const ps = frames.map(([r, y], i) => ({ id: uid(), k: 'f10', x: 0, y: -70 + i * 140, r: 0, cells: Array.from({ length: 10 }, (_, j) => (j < r ? 'r' : j < r + y ? 'y' : null)) })); return { pieces: ps, last: ps[0].id, ink: [] }; },
  // Algebra tiles on the equation mat: [kind, left edge, top edge, negative?]
  at: (tiles, mat = true) => ({ pieces: tiles.map(([k, l, t, neg]) => ({ id: uid(), k, r: 0, neg: !!neg, x: l + 10, y: t + (k === 'x' ? 45 : 10) })), mat, ink: [] }),
};
const frameCounts = d => d.pieces.filter(p => p.cells).map(p => p.cells.filter(Boolean).length);
// Fewest number weights (1, 2, 5, 10) that add up to n.
const fewestWeights = n => { let k = 0; for (const w of [10, 5, 2, 1]) { k += Math.floor(n / w); n %= w; } return k; };
// Shapes to cover (pattern blocks use side 50; tangram units are 40)
const SQ = h => [[[-h, -h], [h, -h], [h, h], [-h, h]]];
const SHAPE = {
  bigTri: () => [[[-50, 28.87], [50, 28.87], [0, -57.74]]],
  bigHex: () => [[0, 60, 120, 180, 240, 300].map(a => [100 * Math.cos(a * Math.PI / 180), 100 * Math.sin(a * Math.PI / 180)])],
  star: () => [Array.from({ length: 12 }, (_, i) => { const a = i * 30 * Math.PI / 180, r = i % 2 ? 86.6 : 50; return [r1(r * Math.cos(a)), r1(r * Math.sin(a))]; })],
  tgSmallSq: () => SQ(28.28),
  tgBigSq: () => SQ(56.57),
  tgSquare7: () => SQ(80),
  tgPa: () => [T_TG.SH.pa.map(q => [r1(q[0]), r1(q[1])])],
  tgMt: () => [T_TG.SH.mt.map(q => [r1(q[0]), r1(q[1])])],
  tgHalf: () => [[[53.3, -106.7], [53.3, 53.3], [-106.7, 53.3]]],
};
const covered = (polys, d) => { const cv = coverage(polys, d.target); return cv.cover >= 0.96 && cv.fit >= 0.96; };
const coverMsg = (polys, d) => { const cv = coverage(polys, d.target); return cv.fit < 0.96 ? 'Some pieces stick out of the shape.' : `About ${Math.round(cv.cover * 100)}% is covered. Keep going.`; };
const shapes = d => d.bands.map(b => T_GB.measure(b.p)).filter(Boolean);
const rects = d => shapes(d).filter(m => m.name === 'rectangle' || m.name === 'square');
const clockTxt = m => `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, '0')}`;
const range = (a, b, step = 1) => { const out = []; for (let n = a; n <= b; n += step) out.push(n); return out; };
const isPrime = n => { if (n < 2) return false; for (let k = 2; k * k <= n; k++) if (n % k === 0) return false; return true; };
// Compares the colored numbers on the hundred chart with the numbers the task wants.
function chartCheck(d, want, done) {
  const got = T_HC.colored(d), W = new Set(want);
  const missing = want.filter(n => !got.has(n)).length, extra = [...got].filter(n => !W.has(n)).length;
  if (!missing && !extra) return [true, done];
  if (!got.size) return [false, 'Tap numbers to color them.'];
  return [false, [missing ? `${missing} ${plural(missing, 'number')} still missing` : '', extra ? `${extra} colored ${plural(extra, 'number')} should not be` : ''].filter(Boolean).join(', and ') + '.'];
}
const cubeCols = d => d.cols.map((c, i) => ({ i: i % d.n, j: Math.floor(i / d.n), h: c.length })).filter(c => c.h);
// A solid block w x l x h: every used column has height h and the columns fill a w x l rectangle.
function isBlock(d, w, l, h) {
  const cs = cubeCols(d); if (cs.length !== w * l || cs.some(c => c.h !== h)) return false;
  const is = cs.map(c => c.i), js = cs.map(c => c.j), wi = Math.max(...is) - Math.min(...is) + 1, lj = Math.max(...js) - Math.min(...js) + 1;
  return (wi === w && lj === l) || (wi === l && lj === w);
}

// Contest-style problems: the board is scratch space and only the answer is checked.
// style: which contest's format it follows; diff: 1–3 inside a practice set (Kangaroo scores them 3, 4, 5 points).
const STYLES = { kangaroo: 'Kangaroo style', moems: 'MOEMS style', noetic: 'Noetic style' };
function contest(o) {
  const t = { level: 3, answerOnly: true, ...o };
  const no = o.no || 'Not quite. Try again, or open the hint.';
  if (o.choices) t.check = (d, a) => pick(a, o.correct, o.ok, no);
  else {
    t.input = o.input || 'number';
    t.check = (d, a) => {
      if (a == null || String(a).trim() === '') return [false, 'Type your answer first.'];
      return (o.match ? o.match(a) : ansMatch(a, o.answer)) ? [true, o.ok] : [false, no];
    };
  }
  return t;
}

const TASKS = [
  /* ---- Base ten ---- */
  { id: 'pv-347', level: 1, topic: 'Place value', tool: 'base-ten', title: 'Build 347',
    prompt: 'Build 347 using the fewest blocks.', hint: '347 is 3 hundreds, 4 tens and 7 ones.',
    setup: () => T_B10.build({}),
    check(d) {
      const n = T_B10.count(d), t = T_B10.total(d);
      if (n.h === 3 && n.t === 4 && n.o === 7) return [true, 'Correct! 3 hundreds, 4 tens and 7 ones.'];
      if (t === 347) return [false, 'That makes 347, but you can use fewer blocks. Trade 10 small blocks for 1 bigger one.'];
      return [false, `Your blocks make ${t}. Check each place.`];
    } },
  { id: 'pv-trade', level: 1, topic: 'Place value', tool: 'base-ten', title: 'Trade to the fewest blocks',
    prompt: 'Here are 5 tens and 23 ones. Trade until you use the fewest blocks.', hint: 'Tap a small cube, then tap Trade 10. Repeat if you can.',
    setup: () => T_B10.build({ t: 5, o: 23 }),
    check(d) {
      const n = T_B10.count(d), t = T_B10.total(d);
      if (t !== 73) return [false, `The number changed to ${t}. Undo, then only trade.`];
      if (!n.h && n.t === 7 && n.o === 3) return [true, 'Great trading! 73 is 7 tens and 3 ones.'];
      return [false, 'You can still trade. 10 ones make 1 ten.'];
    } },
  { id: 'pv-14tens', level: 2, topic: 'Place value', tool: 'base-ten', title: '347 with 14 tens',
    prompt: 'Here is 347. Show the same number using exactly 14 tens.', hint: 'Break one hundred into 10 tens.',
    setup: () => T_B10.build({ h: 3, t: 4, o: 7 }),
    check(d) {
      const n = T_B10.count(d), t = T_B10.total(d);
      if (t === 347 && n.t === 14) return [true, 'Yes! 2 hundreds + 14 tens + 7 ones is still 347.'];
      if (t === 347) return [false, `Still 347, but you have ${n.t} tens.`];
      return [false, `Your blocks make ${t}. Keep the number at 347.`];
    } },
  { id: 'pv-3x24', level: 2, topic: 'Multiplication', tool: 'base-ten', title: '3 groups of 24',
    prompt: 'Build 3 groups of 24. Then trade so 3 × 24 uses the fewest blocks.', hint: 'Build 2 tens and 4 ones three times. Then trade 10 ones for a ten.',
    setup: () => T_B10.build({}),
    check(d) {
      const n = T_B10.count(d), t = T_B10.total(d);
      if (t === 72 && n.t === 7 && n.o === 2 && !n.h) return [true, 'Yes! 3 × 24 = 72.'];
      if (t === 72) return [false, 'That makes 72! Now trade 10 ones for a ten.'];
      return [false, `You have ${t}. Three groups of 24 is 24 + 24 + 24.`];
    } },
  { id: 'dv-84', level: 2, topic: 'Division', tool: 'base-ten', title: 'Share 84 into 4 groups',
    prompt: 'Build 84. Share it into 4 equal groups (break a ten if you need to). How many are in each group?', input: 'number',
    hint: '84 is 8 tens and 4 ones. Give each group 2 tens first.',
    setup: () => T_B10.build({}),
    check(d, a) { if (parseAns(a) == null) return [false, 'Type how many are in each group.']; return ansIs(a, 21) ? [true, 'Yes! 84 ÷ 4 = 21.'] : [false, 'Not quite. Make 4 equal groups, then count one group.']; } },
  { id: 'dec-136', level: 2, topic: 'Decimals', tool: 'base-ten', title: 'Build 1.36',
    prompt: 'A flat is 1 whole now. Build 1.36.', hint: '1 flat, 3 rods (tenths) and 6 small cubes (hundredths).',
    setup: () => T_B10.build({}, true),
    check(d) {
      const t = T_B10.total(d);
      if (!d.dec) return [false, 'Turn Decimals back on so a flat is 1 whole.'];
      return t === 136 ? [true, 'Correct! 1 one, 3 tenths and 6 hundredths.'] : [false, `Your blocks make ${(t / 100).toFixed(2)}.`];
    } },
  { id: 'dec-060', level: 2, topic: 'Decimals', tool: 'base-ten', title: '0.6 as hundredths',
    prompt: 'This is 0.6. Show the same amount as 5 tenths and 10 hundredths.', hint: 'Tap a rod (a tenth), then tap Break apart.',
    setup: () => T_B10.build({ t: 6 }, true),
    check(d) {
      const n = T_B10.count(d), t = T_B10.total(d);
      if (t !== 60) return [false, `The amount changed to ${(t / 100).toFixed(2)}. Keep it at 0.6.`];
      return !n.h && n.t === 5 && n.o === 10 ? [true, 'Yes! 0.6 = 0.60 = 5 tenths and 10 hundredths.'] : [false, 'Break one tenth into 10 hundredths.'];
    } },
  { id: 'dec-cmp', level: 2, topic: 'Decimals', tool: 'base-ten', title: 'Compare 0.5 and 0.45',
    prompt: 'Which is greater, 0.5 or 0.45? Build both to check.', choices: ['0.5', '0.45', 'They are equal'],
    hint: '0.5 is 5 tenths. 0.45 is 4 tenths and 5 hundredths.', setup: () => T_B10.build({}, true),
    check: (d, a) => pick(a, 0, 'Right! 5 tenths is more than 4 tenths and 5 hundredths.', 'Build both numbers. Compare the tenths first.') },
  { id: 'bt-999', level: 3, topic: 'Place value', tool: 'base-ten', title: 'Fewest blocks for 999',
    prompt: 'What is the fewest number of base ten blocks that show 999?', choices: ['9', '18', '27', '99', '999'],
    hint: 'How many hundreds, tens and ones are in 999?', setup: () => T_B10.build({}),
    check: (d, a) => pick(a, 2, 'Yes! 9 hundreds + 9 tens + 9 ones = 27 blocks.', 'Think about each place: hundreds, tens and ones.') },
  { id: 'bt-ten', level: 3, topic: 'Place value', tool: 'base-ten', title: 'Ten blocks, biggest number',
    prompt: 'Using exactly 10 blocks, what is the largest number you can make that has 7 in the ones place?', choices: ['307', '370', '703', '317', '397'],
    hint: 'The 7 ones use up 7 of your 10 blocks.', setup: () => T_B10.build({}),
    check: (d, a) => pick(a, 0, 'Yes! 7 ones leave 3 blocks, and 3 hundreds make it 307.', 'Count blocks: 7 of the 10 are already ones. Build your answer to check.') },

  /* ---- Fractions ---- */
  { id: 'fr-34', level: 1, topic: 'Fractions', tool: 'fractions', title: '3/4 in eighths',
    prompt: 'Build 3/4 in one row. Under it, build the same length using eighths.', hint: 'Two eighths are as long as one fourth.',
    setup: fresh.fr,
    check(d) {
      const a = T_FR.hasRow(d, 4, 3), b = T_FR.hasRow(d, 8, 6);
      if (a && b) return [true, 'Yes! 3/4 = 6/8.'];
      return [false, a ? 'Good, that is 3/4. Now line up eighths under it until the rows match.' : 'Start with three 1/4 tiles touching in one row.'];
    } },
  { id: 'fr-mixed', level: 1, topic: 'Fractions', tool: 'fractions', title: '1 3/4 in fourths',
    prompt: 'Build 1 3/4 using only fourths. How many fourths is that?', input: 'number', hint: '4 fourths make 1 whole.',
    setup: fresh.fr,
    check(d, a) {
      const row = T_FR.hasRow(d, 4, 7);
      if (ansIs(a, 7) && row) return [true, 'Yes! 1 3/4 = 7/4.'];
      return [false, ansIs(a, 7) ? 'Right! Now build the fourths in one row.' : 'Build 1 whole with fourths, then add 3 more fourths.'];
    } },
  { id: 'fr-23', level: 2, topic: 'Fractions', tool: 'fractions', title: '2/3 in sixths',
    prompt: 'How many sixths equal 2/3? Build both rows, then type the number.', input: 'number', hint: 'Build 2/3, then put sixths under it.',
    setup: fresh.fr,
    check(d, a) {
      const rows = T_FR.hasRow(d, 3, 2) && T_FR.hasRow(d, 6, 4);
      if (ansIs(a, 4) && rows) return [true, 'Yes! 2/3 = 4/6.'];
      if (ansIs(a, 4)) return [false, 'Right number! Now build both rows to prove it.'];
      return [false, rows ? 'Your rows match. Count the sixths.' : 'Build 2/3 first, then line up sixths under it.'];
    } },
  { id: 'fr-cmp', level: 2, topic: 'Fractions', tool: 'fractions', title: 'Compare 3/5 and 2/3',
    prompt: 'Which is greater: 3/5 or 2/3? Build both rows to check.', choices: ['3/5', '2/3', 'They are equal'], hint: 'Start both rows at the same left edge.',
    setup: fresh.fr,
    check(d, a) {
      const rows = T_FR.hasRow(d, 5, 3) && T_FR.hasRow(d, 3, 2);
      if (a == null) return NOPICK;
      if (a === 1 && rows) return [true, 'Right! The 2/3 row is longer.'];
      return [false, a === 1 ? 'Right answer! Build both rows to show why.' : 'Build both rows and compare their lengths.'];
    } },
  { id: 'fr-add', level: 2, topic: 'Fractions', tool: 'fractions', title: '2/5 + 4/5',
    prompt: 'Add 2/5 + 4/5. Build it in one row, then type the answer as a mixed number.', input: 'fraction', hint: '5 fifths make 1 whole.',
    setup: fresh.fr,
    check(d, a) {
      const row = T_FR.hasRow(d, 5, 6);
      if (ansIs(a, 6, 5) && row) return [true, /\s|-/.test(String(a).trim()) ? 'Yes! 2/5 + 4/5 = 1 1/5.' : 'Correct! As a mixed number, 6/5 is 1 1/5.'];
      if (ansIs(a, 6, 5)) return [false, 'Right answer! Now build all six fifths in one row.'];
      return [false, row ? 'How many fifths make 1 whole? Count what is left over.' : 'Build 2 fifths and 4 more fifths in one row.'];
    } },
  { id: 'fr-sub', level: 2, topic: 'Fractions', tool: 'fractions', title: '1 − 3/8',
    prompt: 'Build 1 whole using eighths. Take away 3/8. What is left?', input: 'fraction', hint: '1 whole is 8 eighths.',
    setup: fresh.fr,
    check(d, a) {
      const row = T_FR.hasRow(d, 8, 5);
      if (ansIs(a, 5, 8) && row) return [true, 'Yes! 1 − 3/8 = 5/8.'];
      return [false, ansIs(a, 5, 8) ? 'Right! Leave the 5 eighths in one row to show it.' : 'Build 8 eighths, drag 3 of them to the trash, then count.'];
    } },
  { id: 'fr-close', level: 3, topic: 'Fractions', tool: 'fractions', title: 'Closest to 1',
    prompt: 'Which fraction is closest to 1?', choices: ['3/4', '4/5', '5/6', '7/8', '9/10'],
    hint: 'Look at how much is missing from 1 whole for each one.', setup: fresh.fr,
    check: (d, a) => pick(a, 4, 'Yes! 9/10 is only 1/10 away from 1, the smallest gap.', 'Build a few rows and compare the gaps at the end.') },
  { id: 'fr-half', level: 3, topic: 'Fractions', tool: 'fractions', title: 'Ways to make 1/2',
    prompt: 'Make a row exactly as long as 1/2 using tiles that are all the same size. How many of the tile sizes in the tray can do it?',
    choices: ['3', '4', '5', '6', '7'], hint: 'Try halves, thirds, fourths, fifths, sixths, eighths, tenths and twelfths.', setup: fresh.fr,
    check: (d, a) => pick(a, 3, 'Yes! 1/2, 2/4, 3/6, 4/8, 5/10 and 6/12. Thirds and fifths do not work.', 'Build rows under a 1/2 tile and test each size.') },

  /* ---- Pattern blocks ---- */
  { id: 'pb-tri', level: 1, topic: 'Geometry', tool: 'pattern-blocks', title: 'Fill the big triangle',
    prompt: 'Cover the big triangle with blocks. No gaps, nothing sticking out.', hint: 'Green triangles always fit. Can a trapezoid fit too?',
    setup: () => fresh.pb(SHAPE.bigTri()),
    check: d => (covered(T_PB.polys(d), d) ? [true, 'Covered! Can you do it with only 2 blocks?'] : [false, coverMsg(T_PB.polys(d), d)]) },
  { id: 'pb-213', level: 2, topic: 'Fractions', tool: 'pattern-blocks', title: '2 1/3 with blocks',
    prompt: 'The yellow hexagon is 1 whole. Show 2 1/3 using exactly 3 kinds of blocks.', hint: 'A blue rhombus is 1/3 of a hexagon.',
    setup: () => fresh.pb(),
    check(d) {
      const six = T_PB.sixths(d), kinds = new Set(d.pieces.map(p => p.k)).size;
      if (six === 14 && kinds === 3) return [true, 'Yes! That is 2 1/3 wholes.'];
      return [false, six === 14 ? `That is 2 1/3! Now use exactly 3 kinds of blocks (you used ${kinds}).` : `Your blocks are worth ${mixedText(six, 6)}. You need 2 1/3.`];
    } },
  { id: 'pb-hex7', level: 2, topic: 'Geometry', tool: 'pattern-blocks', title: 'Big hexagon, 7 blocks',
    prompt: 'Cover the big hexagon using exactly 7 blocks.', hint: 'Start with one yellow hexagon in the middle.',
    setup: () => fresh.pb(SHAPE.bigHex()),
    check(d) {
      const ok = covered(T_PB.polys(d), d);
      if (ok && d.pieces.length === 7) return [true, 'Yes! 7 blocks cover it. One way: a hexagon in the middle with 6 trapezoids around it.'];
      return [false, ok ? `Covered with ${d.pieces.length} blocks. Now try exactly 7.` : coverMsg(T_PB.polys(d), d)];
    } },
  { id: 'pb-star', level: 3, topic: 'Geometry', tool: 'pattern-blocks', title: 'Cover the star',
    prompt: 'Cover the star with 1 hexagon and green triangles. How many triangles do you need?', input: 'number', hint: 'Put the hexagon in the middle first.',
    setup: () => fresh.pb(SHAPE.star()),
    check(d, a) {
      const ok = covered(T_PB.polys(d), d), hex = d.pieces.filter(p => p.k === 'hex').length;
      if (ok && hex === 1 && ansIs(a, 6)) return [true, 'Yes! 1 hexagon and 6 triangles make the star.'];
      if (!ok) return [false, coverMsg(T_PB.polys(d), d)];
      return [false, hex !== 1 ? 'Use exactly 1 hexagon.' : 'Count the triangles you used.'];
    } },
  { id: 'pb-60', level: 3, topic: 'Angles', tool: 'pattern-blocks', title: 'Angles around a point',
    prompt: 'Fit green triangles around one point until they go all the way around. What is the angle at each corner?',
    choices: ['30°', '45°', '60°', '90°', '120°'], hint: 'All the way around a point is 360°.',
    setup: () => fresh.pb(),
    check(d, a) {
      const n = T_PB.meetAtPoint(d, 'tri');
      if (a == null) return NOPICK;
      if (a === 2 && n >= 6) return [true, 'Yes! 6 corners of 60° make 360°.'];
      if (a === 2) return [false, `Right answer! Now fit triangles all the way around one point (${n} of 6).`];
      return [false, n >= 6 ? 'Six corners fit around the point. 360° split into 6 equal parts is...?' : 'Build it first: snap triangles around one point.'];
    } },

  /* ---- Number line ---- */
  { id: 'nl-74', level: 1, topic: 'Number line', tool: 'number-line', title: 'Mark 7/4',
    prompt: 'Mark 7/4 on the number line.', hint: 'Count fourths from 0: 1/4, 2/4, 3/4, 4/4 ...',
    setup: () => fresh.nl('fourths'),
    check(d) {
      if (d.marks.length === 1 && d.marks[0] === 7) return [true, 'Yes! 7/4 is the same as 1 3/4.'];
      return [false, d.marks.includes(7) ? 'Correct spot! Tap the other marks to remove them.' : 'Count jumps of 1/4 from 0. Tap the 7th tick.'];
    } },
  { id: 'nl-34x2', level: 2, topic: 'Fractions', tool: 'number-line', title: '3/4 + 3/4',
    prompt: 'Start at 0. Show 3/4 + 3/4 with two jumps. Where do you land?', input: 'fraction', hint: 'Drag from 0 to 3/4, then 3 more fourths.',
    setup: () => fresh.nl('fourths'),
    check(d, a) {
      const j = d.jumps, ok = j.length === 2 && j[0].a === 0 && j[0].b === 3 && j[1].a === 3 && j[1].b === 6;
      if (ok && ansIs(a, 6, 4)) return [true, 'Yes! 3/4 + 3/4 = 6/4 = 1 2/4.'];
      return [false, ok ? 'Read the tick where your second jump lands.' : 'Make one jump from 0 to 3/4, then one more jump of 3/4.'];
    } },
  { id: 'nl-dec', level: 2, topic: 'Decimals', tool: 'number-line', title: '0.3 to 0.8',
    prompt: 'Mark 0.3. Then jump from 0.3 to 0.8. How far did you jump?', input: 'fraction', hint: 'Count the tenths in your jump.',
    setup: () => fresh.nl('tenths'),
    check(d, a) {
      const m = d.marks.includes(3), j = d.jumps.some(x => x.a === 3 && x.b === 8);
      if (m && j && ansIs(a, 1, 2)) return [true, 'Yes! 0.8 − 0.3 = 0.5.'];
      return [false, !m ? 'First tap the tick for 0.3.' : !j ? 'Now drag from 0.3 to 0.8.' : 'Count the tenths in your jump.'];
    } },
  { id: 'nl-back', level: 2, topic: 'Fractions', tool: 'number-line', title: '1 − 3/8 on the line',
    prompt: 'Start at 1 and jump back 3/8. Where do you land?', input: 'fraction', hint: 'Drag from 1 to the left, 3 ticks.',
    setup: () => fresh.nl('eighths'),
    check(d, a) {
      const j = d.jumps.some(x => x.a === 8 && x.b === 5);
      if (j && ansIs(a, 5, 8)) return [true, 'Yes! 1 − 3/8 = 5/8.'];
      return [false, j ? 'Read the tick where your jump lands.' : 'Drag from 1 back 3 eighths.'];
    } },
  { id: 'nl-neg', level: 2, topic: 'Number line', tool: 'number-line', title: 'Below zero',
    prompt: 'Start at 3 and jump back 7. Where do you land?', input: 'text', hint: 'Jump back 3 to reach 0. How many more?',
    setup: () => fresh.nl('neg'),
    check(d, a) {
      const j = d.jumps.some(x => x.a === 3 && x.b === -4);
      if (j && ansIs(a, -4)) return [true, 'Yes! 3 − 7 = −4.'];
      return [false, j ? 'Read where your jump lands. Numbers left of 0 are negative.' : 'Drag from 3 back 7 ticks.'];
    } },
  { id: 'nl-meet', level: 3, topic: 'Number patterns', tool: 'number-line', title: 'Frog and rabbit',
    prompt: 'A frog jumps from 0 in jumps of 4. A rabbit jumps from 0 in jumps of 6. Where do they first land on the same number (after 0)?',
    choices: ['10', '12', '18', '20', '24'], hint: 'Draw the frog’s jumps, then the rabbit’s.', setup: () => fresh.nl('0-20'),
    check: (d, a) => pick(a, 1, 'Yes! 12 is the first number both reach.', 'List where each animal lands: 4, 8, 12 ... and 6, 12 ...') },

  /* ---- Area model ---- */
  { id: 'am-4x36', level: 1, topic: 'Multiplication', tool: 'area-model', title: '4 × 36',
    prompt: 'Find 4 × 36 with the area model.', input: 'number', hint: 'Find 4 × 30 and 4 × 6, then add.',
    setup: () => fresh.am(4, 36), check: (d, a) => (ansIs(a, 144) ? [true, 'Yes! 120 + 24 = 144.'] : [false, 'Find each part, then add the two parts.']) },
  { id: 'am-3x245', level: 2, topic: 'Multiplication', tool: 'area-model', title: '3 × 245',
    prompt: 'Find 3 × 245 with the area model.', input: 'number', hint: '3 × 200, 3 × 40 and 3 × 5.',
    setup: () => fresh.am(3, 245), check: (d, a) => (ansIs(a, 735) ? [true, 'Yes! 600 + 120 + 15 = 735.'] : [false, 'Find all three parts, then add them.']) },
  { id: 'am-23x14', level: 2, topic: 'Multiplication', tool: 'area-model', title: '23 × 14',
    prompt: 'Find 23 × 14. Work out each part, tap it to check, then add the parts.', input: 'number', hint: '23 × 14 = (20 + 3) × (10 + 4). There are 4 parts.',
    setup: () => fresh.am(23, 14), check: (d, a) => (ansIs(a, 322) ? [true, 'Yes! 200 + 30 + 80 + 12 = 322.'] : [false, 'Check each part, then add all four.']) },
  { id: 'am-32x21', level: 2, topic: 'Multiplication', tool: 'area-model', title: '32 × 21',
    prompt: 'Find 32 × 21 with the area model.', input: 'number', hint: '(30 + 2) × (20 + 1) has 4 parts.',
    setup: () => fresh.am(32, 21), check: (d, a) => (ansIs(a, 672) ? [true, 'Yes! 600 + 40 + 30 + 2 = 672.'] : [false, 'Find all four parts, then add.']) },
  { id: 'am-99x25', level: 3, topic: 'Multiplication', tool: 'area-model', title: '99 × 25',
    prompt: 'Find 99 × 25. Then find a faster way using 100 × 25.', input: 'number', hint: '99 × 25 is one 25 less than 100 × 25.',
    setup: () => fresh.am(99, 25), check: (d, a) => (ansIs(a, 2475) ? [true, 'Yes! 2500 − 25 = 2475.'] : [false, 'Try 100 × 25 first, then take away one 25.']) },

  /* ---- Hundred chart ---- */
  { id: 'hc-5s', level: 1, topic: 'Number patterns', tool: 'hundred-chart', title: 'Multiples of 5',
    prompt: 'Color all the multiples of 5.', hint: 'Count by 5s: 5, 10, 15 ...', setup: fresh.hc,
    check: d => chartCheck(d, range(5, 100, 5), 'Yes! They make two straight columns.') },
  { id: 'hc-4s', level: 1, topic: 'Number patterns', tool: 'hundred-chart', title: 'Count by 4s',
    prompt: 'Start at 4 and count by 4s. Color every number you land on.', hint: '4, 8, 12, 16 ...', setup: fresh.hc,
    check: d => chartCheck(d, range(4, 100, 4), 'Yes! Did you see the slanted pattern?') },
  { id: 'hc-sum10', level: 2, topic: 'Number patterns', tool: 'hundred-chart', title: 'Digits add to 10',
    prompt: 'Color every number whose digits add up to 10.', hint: '19 works because 1 + 9 = 10.', setup: fresh.hc,
    check: d => chartCheck(d, range(19, 91, 9), 'Yes! 9 numbers, all on one diagonal.') },
  { id: 'hc-squares', level: 2, topic: 'Number patterns', tool: 'hundred-chart', title: 'Square numbers',
    prompt: 'Color all the square numbers: 1 × 1, 2 × 2, 3 × 3 and so on.', hint: 'The first three are 1, 4 and 9.', setup: fresh.hc,
    check: d => chartCheck(d, range(1, 10).map(k => k * k), 'Yes! 10 square numbers up to 100.') },
  { id: 'hc-primes', level: 3, topic: 'Number patterns', tool: 'hundred-chart', title: 'Primes below 50',
    prompt: 'Color every prime number less than 50.', hint: 'A prime has exactly two factors: 1 and itself. 1 is not prime.', setup: fresh.hc,
    check: d => chartCheck(d, range(2, 49).filter(isPrime), 'Yes! There are 15 primes below 50.') },
  { id: 'hc-sevens', level: 3, topic: 'Number patterns', tool: 'hundred-chart', title: 'How many 7s?',
    prompt: 'How many numbers from 1 to 100 have the digit 7? Color them, then type how many.', input: 'number', hint: 'Check the 7s column and the 70s row. Do not count 77 twice.', setup: fresh.hc,
    check(d, a) {
      const c = chartCheck(d, range(1, 100).filter(n => String(n).includes('7')), '');
      if (c[0] && ansIs(a, 19)) return [true, 'Yes! 19 numbers. 77 is in both the column and the row.'];
      return c[0] ? [false, 'Your coloring is right. Count the colored numbers.'] : c;
    } },
  { id: 'hc-4and6', level: 3, topic: 'Number patterns', tool: 'hundred-chart', title: 'Multiples of 4 and 6',
    prompt: 'Color the numbers that are multiples of both 4 and 6. What is the smallest one?', input: 'number', hint: 'Count by 4s and by 6s. Where do they meet?', setup: fresh.hc,
    check(d, a) {
      const c = chartCheck(d, range(12, 96, 12), '');
      if (c[0] && ansIs(a, 12)) return [true, 'Yes! They are the multiples of 12.'];
      return c[0] ? [false, 'Your coloring is right. Which colored number is smallest?'] : c;
    } },

  /* ---- Balance ---- */
  { id: 'ba-ten', level: 1, topic: 'Logic', tool: 'balance', title: 'Balance 10 with 2s',
    prompt: 'Put a 10 on the left pan. Balance it using only 2s.', hint: 'How many 2s make 10?', setup: () => fresh.ba({ c: 4, s: 7, t: 3 }),
    check(d) {
      const ok = d.L.length === 1 && d.L[0] === 'w10' && d.R.length && d.R.every(k => k === 'w2') && T_BA.sum(d, 'R') === 10;
      return ok ? [true, 'Balanced! Five 2s make 10.'] : [false, d.L.join() !== 'w10' ? 'Put just one 10 on the left pan.' : 'Use only 2s on the right until it balances.'];
    } },
  { id: 'ba-circle', level: 1, topic: 'Logic', tool: 'balance', title: 'Weigh the circle',
    prompt: 'How much does one circle weigh? Put a circle on one pan and balance it with number weights.', input: 'number', hint: 'When the scale is level, both sides weigh the same.',
    setup: () => fresh.ba({ c: 6, s: 7, t: 3 }, ['c']),
    check: (d, a) => (ansIs(a, d.sec.c) ? [true, `Yes! The circle weighs ${d.sec.c}.`] : [false, 'Balance the circle with weights, then add them up.']) },
  { id: 'ba-compare', level: 2, topic: 'Logic', tool: 'balance', title: 'Squares or triangles',
    prompt: 'Which is heavier: 2 squares or 3 triangles?', choices: ['2 squares', '3 triangles', 'They weigh the same'], hint: 'Put 2 squares on one pan and 3 triangles on the other.',
    setup: () => fresh.ba({ c: 4, s: 5, t: 3 }),
    check(d, a) {
      const sq = 2 * d.sec.s, tr = 3 * d.sec.t, right = sq > tr ? 0 : tr > sq ? 1 : 2;
      return pick(a, right, ['Right! 2 squares are heavier.', 'Right! 3 triangles are heavier.', 'Right! They weigh the same.'][right], 'Build it on the scale and watch which side goes down.');
    } },
  { id: 'ba-fewest', level: 2, topic: 'Logic', tool: 'balance', title: 'Fewest weights',
    prompt: 'Put 3 triangles on the left pan. Balance them using the fewest number weights.', hint: 'First find what one triangle weighs.',
    setup: () => fresh.ba({ c: 5, s: 7, t: 4 }),
    check(d) {
      const tri = d.L.length === 3 && d.L.every(k => k === 't'), nums = d.R.every(k => k[0] === 'w'), bal = T_BA.sum(d, 'L') === T_BA.sum(d, 'R');
      const best = fewestWeights(3 * d.sec.t);
      if (!tri) return [false, 'Put exactly 3 triangles on the left pan and nothing else.'];
      if (!nums) return [false, 'Use only number weights on the right pan.'];
      if (!bal) return [false, 'The scale is not level yet.'];
      if (d.R.length === best) return [true, `Yes! 3 triangles weigh ${3 * d.sec.t}, and ${best} ${plural(best, 'weight')} is the fewest.`];
      return [false, `Balanced with ${d.R.length} weights. Can you use fewer?`];
    } },
  { id: 'ba-sum', level: 3, topic: 'Logic', tool: 'balance', title: 'Circle and square',
    prompt: 'A circle and a square weigh 11 together. The square weighs 3 more than the circle. What does the square weigh?',
    choices: ['4', '6', '7', '8', '11'], hint: 'Test your guess on the scale.', setup: () => fresh.ba({ c: 4, s: 7, t: 3 }),
    check: (d, a) => pick(a, 2, 'Yes! The square is 7 and the circle is 4.', 'Try a guess: does it add to 11, and is the square 3 more?') },
  { id: 'ba-chain', level: 3, topic: 'Logic', tool: 'balance', title: 'Swap and balance',
    prompt: '2 circles balance 3 squares. 1 square balances 2 triangles. How many triangles balance 4 circles?',
    choices: ['6', '8', '9', '12', '16'], hint: 'How many squares balance 4 circles?', setup: () => fresh.ba({ c: 6, s: 4, t: 2 }),
    check: (d, a) => pick(a, 3, 'Yes! 4 circles = 6 squares = 12 triangles.', 'Change circles into squares first, then squares into triangles.') },

  /* ---- Geoboard ---- */
  { id: 'ap-12', level: 1, topic: 'Area & perimeter', tool: 'geoboard', title: 'Area of 12',
    prompt: 'Make a rectangle with an area of 12 square units.', hint: 'Try 3 rows of 4 squares.', setup: fresh.gb,
    check(d) {
      const r = rects(d);
      if (r.some(m => m.a2 === 24)) return [true, 'Yes! That rectangle covers 12 square units.'];
      return [false, r.length ? `Your rectangle has an area of ${r[r.length - 1].a2 / 2}. Count the squares inside.` : 'Drag from a peg to stretch a band, then drag the corners into a rectangle.'];
    } },
  { id: 'ap-sq16', level: 1, topic: 'Area & perimeter', tool: 'geoboard', title: 'Square, perimeter 16',
    prompt: 'Make a square with a perimeter of 16.', hint: 'A square has 4 equal sides.', setup: fresh.gb,
    check(d) {
      const s = shapes(d).filter(m => m.name === 'square');
      if (s.some(m => m.exact && Math.round(m.per) === 16)) return [true, 'Yes! 4 sides of 4 make 16.'];
      return [false, s.length ? `That square has a perimeter of ${Math.round(s[0].per * 100) / 100}.` : 'Make a square first. All four sides must be equal.'];
    } },
  { id: 'ap-12-14', level: 2, topic: 'Area & perimeter', tool: 'geoboard', title: 'Area 12, perimeter 14',
    prompt: 'Make a rectangle with an area of 12 and a perimeter of 14.', hint: 'Which pair of sides multiplies to 12 and adds to 7?', setup: fresh.gb,
    check(d) {
      const r = rects(d).filter(m => m.a2 === 24);
      if (r.some(m => m.exact && Math.round(m.per) === 14)) return [true, 'Yes! A 3 by 4 rectangle.'];
      return [false, r.length ? `The area is 12, but the perimeter is ${Math.round(r[0].per)}. Try different sides.` : 'First make a rectangle with an area of 12.'];
    } },
  { id: 'ap-6-two', level: 2, topic: 'Area & perimeter', tool: 'geoboard', title: 'Same area, new perimeter',
    prompt: 'Make two rectangles that both have an area of 6 but different perimeters.', hint: '1 by 6 and 2 by 3 both have an area of 6.', setup: fresh.gb,
    check(d) {
      const r = rects(d).filter(m => m.a2 === 12), per = new Set(r.map(m => Math.round(m.per)));
      if (per.size >= 2) return [true, `Yes! Perimeters of ${[...per].join(' and ')} with the same area.`];
      return [false, r.length ? 'Good. Now make a second rectangle with an area of 6 and a different shape.' : 'Make a rectangle with an area of 6 first.'];
    } },
  { id: 'ap-tri6', level: 2, topic: 'Area & perimeter', tool: 'geoboard', title: 'Right triangle, area 6',
    prompt: 'Make a right triangle with an area of 6 square units.', hint: 'A right triangle is half of a rectangle.', setup: fresh.gb,
    check(d) {
      const t = shapes(d).filter(m => /right/.test(m.name) && /triangle/.test(m.name));
      if (t.some(m => m.a2 === 12)) return [true, 'Yes! Half of a 3 by 4 rectangle is 6.'];
      return [false, t.length ? `That right triangle has an area of ${mixedText(t[0].a2, 2)}.` : 'Make a triangle with a square corner first.'];
    } },
  { id: 'gb-sq2', level: 3, topic: 'Area & perimeter', tool: 'geoboard', title: 'A square of area 2',
    prompt: 'Make a square with an area of exactly 2 square units.', hint: 'The square does not have to sit straight. Try tilting it.', setup: fresh.gb,
    check(d) {
      const s = shapes(d).filter(m => m.name === 'square');
      if (s.some(m => m.a2 === 4)) return [true, 'Yes! A tilted square made of 4 half-squares.'];
      return [false, s.length ? `That square has an area of ${mixedText(s[0].a2, 2)}. Try a tilted one.` : 'Make a square first. Tilted squares count too.'];
    } },
  { id: 'gb-sq5', level: 3, topic: 'Area & perimeter', tool: 'geoboard', title: 'A square of area 5',
    prompt: 'Make a square with an area of exactly 5 square units.', hint: 'Each side goes 2 across and 1 up.', setup: fresh.gb,
    check(d) {
      const s = shapes(d).filter(m => m.name === 'square');
      if (s.some(m => m.a2 === 10)) return [true, 'Yes! Its sides go 2 across and 1 up.'];
      return [false, s.length ? `That square has an area of ${mixedText(s[0].a2, 2)}.` : 'Make a square first. It will need to be tilted.'];
    } },

  /* ---- Clock ---- */
  { id: 'tm-845', level: 1, topic: 'Time', tool: 'clock', title: 'Quarter to 9',
    prompt: 'Set the clock to quarter to 9.', hint: 'Quarter to 9 means 15 minutes before 9:00.', setup: () => fresh.ck(0),
    check(d) {
      if (d.m === 525) return [true, 'Yes! Quarter to 9 is 8:45.'];
      return [false, d.m % 60 === 45 ? 'The minute hand is right. Check the hour hand: it should be just before the 9.' : `The clock shows ${clockTxt(d.m)}. Quarter to 9 is 15 minutes before 9.`];
    } },
  { id: 'tm-35', level: 2, topic: 'Time', tool: 'clock', title: '35 minutes later',
    prompt: 'It is 3:40. Show the time 35 minutes later.', hint: '20 minutes gets you to 4:00. How many minutes are left?', setup: () => fresh.ck(220),
    check: d => (d.m === 255 ? [true, 'Yes! 35 minutes after 3:40 is 4:15.'] : [false, `The clock shows ${clockTxt(d.m)}. Try counting on to 4:00 first.`]) },
  { id: 'tm-100', level: 2, topic: 'Time', tool: 'clock', title: '100 minutes later',
    prompt: 'The clock shows 9:15. Show the time 100 minutes later.', hint: '100 minutes is 1 hour and 40 minutes.', setup: () => fresh.ck(555),
    check: d => (d.m === 655 ? [true, 'Yes! 100 minutes after 9:15 is 10:55.'] : [false, `The clock shows ${clockTxt(d.m)}. Add 1 hour, then 40 minutes.`]) },
  { id: 'tm-game', level: 2, topic: 'Time', tool: 'clock', title: 'When does the game end?',
    prompt: 'A game starts at 10:50 and lasts 1 hour 25 minutes. Show when it ends.', hint: 'Add the hour first (11:50), then 25 minutes.', setup: () => fresh.ck(650),
    check: d => (d.m === 15 ? [true, 'Yes! The game ends at 12:15.'] : [false, `The clock shows ${clockTxt(d.m)}. Add 1 hour, then 25 minutes.`]) },
  { id: 'ck-330', level: 3, topic: 'Angles', tool: 'clock', title: 'Angle at 3:30',
    prompt: 'Set the clock to 3:30. What is the angle between the two hands?', choices: ['60°', '75°', '80°', '90°', '105°'],
    hint: 'The hour hand is halfway between 3 and 4. Each hour mark is 30° apart.', setup: () => fresh.ck(0),
    check(d, a) {
      if (d.m !== 210) return [false, `Set the clock to 3:30 first (it shows ${clockTxt(d.m)}).`];
      return pick(a, 1, 'Yes! 2 and a half hour marks apart: 30° + 30° + 15° = 75°.', 'Count the hour marks between the hands. Each one is 30°.');
    } },

  /* ---- Cubes ---- */
  { id: 'cu-tower', level: 1, topic: 'Spatial', tool: 'cubes', title: 'A tower of 5',
    prompt: 'Build one tower that is 5 cubes tall.', hint: 'Tap the same stack again to add a cube on top.', setup: () => fresh.cu(5),
    check(d) {
      const cs = cubeCols(d);
      if (cs.length === 1 && cs[0].h === 5) return [true, 'Yes! A tower 5 cubes tall.'];
      return [false, cs.length > 1 ? 'Use just one stack.' : `Your tower is ${cs.length ? cs[0].h : 0} tall.`];
    } },
  { id: 'cu-2x2', level: 1, topic: 'Spatial', tool: 'cubes', title: 'A 2 × 2 × 2 cube',
    prompt: 'Build a big cube that is 2 cubes long, 2 cubes wide and 2 cubes tall.', hint: 'Make a 2 by 2 square on the floor, then a second layer.', setup: () => fresh.cu(5),
    check: d => (isBlock(d, 2, 2, 2) ? [true, `Yes! It takes ${T_CU.count(d)} small cubes.`] : [false, `You have ${T_CU.count(d)} cubes. A 2 by 2 by 2 cube needs a 2 by 2 square, 2 layers high.`]) },
  { id: 'cu-count', level: 2, topic: 'Spatial', tool: 'cubes', title: 'Count the staircase',
    prompt: 'How many cubes are in this shape? Turn it to look for hidden cubes.', choices: ['6', '8', '9', '10', '12'], hint: 'Count one stack at a time.',
    setup: () => fresh.cu(5, [[1, 1, 3], [2, 1, 2], [3, 1, 1], [1, 2, 2], [2, 2, 1], [1, 3, 1]]),
    check: (d, a) => pick(a, 3, 'Yes! 3 + 2 + 1 + 2 + 1 + 1 = 10.', 'Turn the shape and count each stack from top to bottom.') },
  { id: 'cu-27', level: 2, topic: 'Spatial', tool: 'cubes', title: 'A 3 × 3 × 3 cube',
    prompt: 'Build a big cube that is 3 cubes on every side.', hint: 'Make a 3 by 3 floor, then add two more layers.', setup: () => fresh.cu(5),
    check: d => (isBlock(d, 3, 3, 3) ? [true, 'Yes! 3 × 3 × 3 = 27 small cubes.'] : [false, `You have ${T_CU.count(d)} cubes so far. Every stack in the 3 by 3 square needs to be 3 tall.`]) },
  { id: 'cu-more', level: 3, topic: 'Spatial', tool: 'cubes', title: 'Finish the big cube',
    prompt: 'How many more cubes are needed to turn this into a 3 × 3 × 3 cube?', choices: ['12', '13', '14', '15', '18'], hint: 'A 3 × 3 × 3 cube has 27 cubes.',
    setup: () => fresh.cu(5, [[1, 1, 2], [2, 1, 2], [3, 1, 1], [1, 2, 2], [2, 2, 1], [3, 2, 1], [1, 3, 2], [2, 3, 1], [3, 3, 1]]),
    check: (d, a) => pick(a, 2, 'Yes! 27 − 13 = 14.', 'Count the cubes that are there, then take that away from 27. You can build the rest to check.') },
  { id: 'cu-paint', level: 3, topic: 'Spatial', tool: 'cubes', title: 'The painted cube',
    prompt: 'A 3 × 3 × 3 cube is painted on the outside, then taken apart. How many small cubes have no paint at all?',
    choices: ['0', '1', '3', '6', '9'], hint: 'Which small cubes do not touch the outside?', setup: () => fresh.cu(5, [[1, 1, 3], [2, 1, 3], [3, 1, 3], [1, 2, 3], [2, 2, 3], [3, 2, 3], [1, 3, 3], [2, 3, 3], [3, 3, 3]]),
    check: (d, a) => pick(a, 1, 'Yes! Only the one in the very middle.', 'Think about the cube in the center of the middle layer.') },

  /* ---- Tangram ---- */
  { id: 'tg-sq2', level: 1, topic: 'Geometry', tool: 'tangram', title: 'Square from 2 triangles',
    prompt: 'Make the square using the two small triangles.', hint: 'Tap a triangle to turn it. Long sides go together.',
    setup: () => fresh.tg(['st', 'st'], SHAPE.tgSmallSq()), check: d => (covered(T_TG.polys(d), d) ? [true, 'Yes! Two small triangles make a square.'] : [false, coverMsg(T_TG.polys(d), d)]) },
  { id: 'tg-pa', level: 1, topic: 'Geometry', tool: 'tangram', title: 'Parallelogram from 2 triangles',
    prompt: 'Make the parallelogram shape using the two small triangles.', hint: 'Put two short sides together.',
    setup: () => fresh.tg(['st', 'st'], SHAPE.tgPa()), check: d => (covered(T_TG.polys(d), d) ? [true, 'Yes! Same pieces, new shape.'] : [false, coverMsg(T_TG.polys(d), d)]) },
  { id: 'tg-mt', level: 2, topic: 'Geometry', tool: 'tangram', title: 'Medium triangle from 2',
    prompt: 'Cover the medium triangle shape with the two small triangles.', hint: 'The square corner of the big shape is where two small triangles meet.',
    setup: () => fresh.tg(['st', 'st'], SHAPE.tgMt()), check: d => (covered(T_TG.polys(d), d) ? [true, 'Yes! Two small triangles make one medium triangle.'] : [false, coverMsg(T_TG.polys(d), d)]) },
  { id: 'tg-sq2lt', level: 2, topic: 'Geometry', tool: 'tangram', title: 'Square from 2 big triangles',
    prompt: 'Make the square using the two big triangles.', hint: 'Turn one triangle all the way around.',
    setup: () => fresh.tg(['lt', 'lt'], SHAPE.tgBigSq()), check: d => (covered(T_TG.polys(d), d) ? [true, 'Yes! Two big triangles make a big square.'] : [false, coverMsg(T_TG.polys(d), d)]) },
  { id: 'tg-tri5', level: 3, topic: 'Geometry', tool: 'tangram', title: 'Big triangle from 5 pieces',
    prompt: 'Make the big triangle using the 5 smaller pieces.', hint: 'Put the medium triangle in the square corner first.',
    setup: () => fresh.tg(['mt', 'sq', 'st', 'st', 'pa'], SHAPE.tgHalf()), check: d => (covered(T_TG.polys(d), d) ? [true, 'Yes! Those 5 pieces are exactly half of the full square.'] : [false, coverMsg(T_TG.polys(d), d)]) },
  { id: 'tg-sq7', level: 3, topic: 'Geometry', tool: 'tangram', title: 'All 7 pieces',
    prompt: 'Make the big square using all 7 pieces.', hint: 'The two big triangles fill half of the square.',
    setup: () => fresh.tg(null, SHAPE.tgSquare7()), check: d => (covered(T_TG.polys(d), d) ? [true, 'You did it! The classic tangram square.'] : [false, coverMsg(T_TG.polys(d), d)]) },

  /* ---- Ten frames ---- */
  { id: 'tf-make10', level: 1, topic: 'Addition', tool: 'ten-frames', title: 'Make 10',
    prompt: 'Fill the ten frame. How many counters did you add?', input: 'number', hint: 'Count the empty squares.',
    setup: () => fresh.tf([[7, 0]]),
    check(d, a) {
      const full = frameCounts(d).some(n => n === 10);
      if (full && ansIs(a, 3)) return [true, 'Yes! 7 and 3 make 10.'];
      return [false, full ? 'The frame is full. How many did you add to the 7?' : 'Tap a counter in the tray to add it. Fill every square.'];
    } },
  { id: 'tf-8p5', level: 1, topic: 'Addition', tool: 'ten-frames', title: '8 + 5 by making 10',
    prompt: 'Here is 8 + 5. Drag counters so the first frame is full. What is 8 + 5?', input: 'number', hint: 'The first frame needs 2 more. Drag 2 yellow counters up.',
    setup: () => fresh.tf([[8, 0], [0, 5]]),
    check(d, a) {
      const fs = frameCounts(d).sort((a, b) => b - a), free = d.pieces.filter(p => p.k === 'cnt').length, ten = fs[0] === 10 && fs[1] === 3 && !free;
      if (ten && ansIs(a, 13)) return [true, 'Yes! 8 + 5 = 10 + 3 = 13.'];
      if (ten) return [false, 'Now you have 10 and 3. What is the total?'];
      return [false, `Your frames show ${fs.join(' and ')}. Move counters until the first frame has 10.`];
    } },

  /* ---- Algebra tiles ---- */
  { id: 'at-zero', level: 2, topic: 'Algebra', tool: 'algebra-tiles', title: 'Zero pairs',
    prompt: 'A tile and its red opposite make zero. Take away the zero pairs. What is left?', choices: ['3x + 2', '5x + 8', '4x + 5', '3x + 8', 'x + 2'],
    hint: 'One x and one −x make 0. One 1 and one −1 make 0.',
    setup: () => fresh.at([['x', -180, -110], ['x', -150, -110], ['x', -120, -110], ['x', -90, -110], ['x', -40, -110, true],
      ['one', 20, -110], ['one', 50, -110], ['one', 80, -110], ['one', 110, -110], ['one', 140, -110], ['one', 20, 0, true], ['one', 50, 0, true], ['one', 80, 0, true]], false),
    check: (d, a) => pick(a, 0, 'Yes! 4x − x = 3x and 5 − 3 = 2.', 'Pair each red tile with a matching tile, then count what is left.') },
  { id: 'at-solve', level: 3, topic: 'Algebra', tool: 'algebra-tiles', title: 'Solve 3x + 2 = 11',
    prompt: 'Use the tiles to solve 3x + 2 = 11. What is x?', input: 'number', hint: 'Take 2 ones off both sides, then share what is left equally among the x tiles.',
    setup: () => fresh.at([['x', -230, -60], ['x', -200, -60], ['x', -170, -60], ['one', -130, -60], ['one', -100, -60]]
      .concat(Array.from({ length: 11 }, (_, i) => ['one', 40 + 30 * (i % 6), -60 + 30 * Math.floor(i / 6)]))),
    check: (d, a) => (ansIs(a, 3) ? [true, 'Yes! 3x = 9, so x = 3.'] : [false, 'Remove 2 ones from each side. How many ones go with each x?']) },

  /* ---- Contest style: Math Kangaroo (choices A–E) ---- */
  contest({ id: 'kg-ones', style: 'kangaroo', diff: 1, topic: 'Number patterns', tool: 'hundred-chart', title: 'Counting the 1s',
    prompt: 'Mia writes all the numbers from 1 to 20. How many times does she write the digit 1?', choices: ['10', '11', '12', '13', '20'], correct: 2,
    hint: 'Color every number that has a 1. Remember that 11 has two of them.', setup: fresh.hc, ok: 'Yes! 1, 10, 11 (twice) and 12 to 19.' }),
  contest({ id: 'kg-blocks15', style: 'kangaroo', diff: 1, topic: 'Fractions', tool: 'pattern-blocks', title: 'Triangles to match',
    prompt: 'How many green triangles cover the same area as 2 yellow hexagons and 1 red trapezoid?', choices: ['9', '12', '13', '15', '18'], correct: 3,
    hint: 'Cover one hexagon and one trapezoid with triangles first.', setup: () => fresh.pb(), ok: 'Yes! 6 + 6 + 3 = 15.' }),
  contest({ id: 'kg-stairs', style: 'kangaroo', diff: 1, topic: 'Spatial', tool: 'cubes', title: 'Six-step staircase',
    prompt: 'A staircase has 1 cube in the first step, 2 cubes in the second step, and so on. How many cubes does a staircase with 6 steps need?', choices: ['12', '15', '18', '21', '36'], correct: 3,
    hint: 'Here are the first 3 steps. Add steps and look for the pattern 1 + 2 + 3 + ...', setup: () => fresh.cu(5, [[1, 2, 1], [2, 2, 2], [3, 2, 3]]), ok: 'Yes! 1 + 2 + 3 + 4 + 5 + 6 = 21.' }),
  contest({ id: 'kg-clock100', style: 'kangaroo', diff: 2, topic: 'Time', tool: 'clock', title: '100 hours later',
    prompt: 'A clock shows 9:00. What time will it show 100 hours later?', choices: ['1:00', '3:00', '5:00', '9:00', '11:00'], correct: 0,
    hint: 'Every 12 hours the clock shows the same time again.', setup: () => fresh.ck(540), ok: 'Yes! After 96 hours it shows 9:00 again, then 4 more hours.' }),
  contest({ id: 'kg-fruit', style: 'kangaroo', diff: 2, topic: 'Logic', tool: 'balance', title: 'Apples, pears, plums',
    prompt: '3 apples weigh the same as 2 pears. 1 pear weighs the same as 6 plums. How many plums weigh the same as 1 apple?', choices: ['2', '3', '4', '6', '12'], correct: 2,
    hint: 'Use circles for apples, squares for pears and triangles for plums, and test on the scale.', setup: () => fresh.ba({ c: 4, s: 6, t: 1 }), ok: 'Yes! 2 pears = 12 plums = 3 apples, so 1 apple = 4 plums.' }),
  contest({ id: 'kg-squares14', style: 'kangaroo', diff: 2, topic: 'Geometry', tool: 'geoboard', title: 'Squares in a 3 × 3 grid',
    prompt: 'How many squares of any size are there in a 3 × 3 grid of small squares?', choices: ['9', '10', '12', '13', '14'], correct: 4,
    hint: 'Count the 1 × 1 squares, then the 2 × 2 squares, then the 3 × 3 square.', setup: fresh.gb, ok: 'Yes! 9 + 4 + 1 = 14.' }),
  contest({ id: 'kg-pizza', style: 'kangaroo', diff: 2, topic: 'Fractions', tool: 'fractions', title: 'What is left of the pizza',
    prompt: 'Half of a pizza is eaten. Then a third of what is left is eaten. What fraction of the whole pizza is left?', choices: ['1/6', '1/4', '1/3', '1/2', '2/3'], correct: 2,
    hint: 'A third of a half is a sixth.', setup: fresh.fr, ok: 'Yes! 1/2 − 1/6 = 2/6 = 1/3.' }),
  contest({ id: 'kg-tangram8', style: 'kangaroo', diff: 2, topic: 'Fractions', tool: 'tangram', title: 'The parallelogram’s share',
    prompt: 'The 7 tangram pieces make a square. What fraction of the square is the parallelogram?', choices: ['1/4', '1/6', '1/8', '1/12', '1/16'], correct: 2,
    hint: 'How many small triangles would cover the whole square?', setup: () => TOOL.tangram.init(), ok: 'Yes! The square is 16 small triangles and the parallelogram is 2 of them.' }),
  contest({ id: 'kg-legs', style: 'kangaroo', diff: 3, topic: 'Logic', tool: 'ten-frames', title: 'Heads and legs',
    prompt: 'A farm has only chickens and cows. Together they have 8 heads and 22 legs. How many cows are there?', choices: ['2', '3', '4', '5', '6'], correct: 1,
    hint: 'Give every animal 2 legs first (one counter is one head). Where do the extra legs go?', setup: () => fresh.tf([[8, 0]]), ok: 'Yes! 3 cows have 12 legs and 5 chickens have 10.' }),
  contest({ id: 'kg-path', style: 'kangaroo', diff: 3, topic: 'Number patterns', tool: 'number-line', title: 'Forward 3, back 1',
    prompt: 'A frog starts at 0. It jumps 3 forward, then 1 back, then 3 forward, then 1 back, and so on. After how many jumps does it first land on 10?', choices: ['7', '8', '9', '10', '11'], correct: 3,
    hint: 'Draw the jumps one at a time and write where it lands.', setup: () => fresh.nl('0-20'), ok: 'Yes! It lands on 3, 2, 5, 4, 7, 6, 9, 8, 11, 10.' }),

  /* ---- Contest style: MOEMS (5 problems, number answers) ---- */
  contest({ id: 'mo-consec', style: 'moems', diff: 1, topic: 'Number patterns', tool: 'number-line', title: 'Three in a row',
    prompt: 'Three whole numbers in a row (like 4, 5, 6) add up to 75. What is the largest of the three?', answer: '26',
    hint: 'The middle number is 75 ÷ 3.', setup: () => fresh.nl('0-100'), ok: 'Yes! 24 + 25 + 26 = 75.' }),
  contest({ id: 'mo-think', style: 'moems', diff: 1, topic: 'Algebra', tool: 'balance', title: 'Think of a number',
    prompt: 'I think of a number. I multiply it by 3, then add 5. The result is 41. What is my number?', answer: '12',
    hint: 'The scale shows 3 circles + 5 = 41. Undo the + 5, then share the rest.', setup: () => fresh.ba({ c: 12, s: 7, t: 3 }, ['c', 'c', 'c', 'w5'], ['w10', 'w10', 'w10', 'w10', 'w1']), ok: 'Yes! 41 − 5 = 36 and 36 ÷ 3 = 12.' }),
  contest({ id: 'mo-frac', style: 'moems', diff: 1, topic: 'Fractions', tool: 'fractions', title: 'A fraction of a fraction',
    prompt: 'What is 3/4 of 2/3 of 48?', answer: '24', hint: 'First find 2/3 of 48.', setup: fresh.fr, ok: 'Yes! 2/3 of 48 is 32, and 3/4 of 32 is 24.' }),
  contest({ id: 'mo-shake', style: 'moems', diff: 2, topic: 'Logic', tool: 'geoboard', title: 'Handshakes',
    prompt: '6 friends meet. Each friend shakes hands once with every other friend. How many handshakes are there in all?', answer: '15',
    hint: 'The first friend shakes 5 hands. The next friend has 4 new hands to shake, and so on.', setup: fresh.gb, ok: 'Yes! 5 + 4 + 3 + 2 + 1 = 15.' }),
  contest({ id: 'mo-pages', style: 'moems', diff: 2, topic: 'Number patterns', tool: 'hundred-chart', title: 'Page numbers',
    prompt: 'How many digits are needed to number the pages of a book from page 1 to page 40?', answer: '71',
    hint: 'Pages 1 to 9 use one digit each. How many pages use two digits?', setup: fresh.hc, ok: 'Yes! 9 one-digit pages and 31 two-digit pages: 9 + 62 = 71.' }),
  contest({ id: 'mo-rem', style: 'moems', diff: 2, topic: 'Number patterns', tool: 'hundred-chart', title: 'Remainder 1',
    prompt: 'What is the smallest number greater than 1 that leaves a remainder of 1 when divided by 2, by 3 and by 4?', answer: '13',
    hint: 'Find the smallest number that 2, 3 and 4 all divide evenly, then add 1.', setup: fresh.hc, ok: 'Yes! 12 + 1 = 13.' }),
  contest({ id: 'mo-ages', style: 'moems', diff: 2, topic: 'Logic', tool: 'number-line', title: 'Ann and Ben',
    prompt: 'Ann is 7 years older than Ben. In 3 years, their ages will add up to 33. How old is Ben now?', answer: '10',
    hint: 'Right now their ages add up to 33 − 6.', setup: () => fresh.nl('0-100'), ok: 'Yes! Ben is 10 and Ann is 17. In 3 years: 13 + 20 = 33.' }),
  contest({ id: 'mo-rect', style: 'moems', diff: 2, topic: 'Area & perimeter', tool: 'geoboard', title: 'Perimeter 20',
    prompt: 'A rectangle has a perimeter of 20 cm. Its length is 4 cm more than its width. What is its area in square centimeters?', answer: '21',
    hint: 'Length + width = 10. Which two numbers add to 10 and are 4 apart?', setup: fresh.gb, ok: 'Yes! It is 7 by 3, so the area is 21.' }),
  contest({ id: 'mo-coins', style: 'moems', diff: 2, topic: 'Logic', tool: 'base-ten', title: '12 coins',
    prompt: 'Sam has 12 coins. Some are 5-cent coins and the rest are 10-cent coins. Together they are worth 85 cents. How many 10-cent coins does Sam have?', answer: '5',
    hint: 'If all 12 were 5-cent coins, they would be worth 60 cents. Each 10-cent coin adds 5 cents more.', setup: () => T_B10.build({}), ok: 'Yes! 5 × 10 + 7 × 5 = 85.' }),
  contest({ id: 'mo-paint4', style: 'moems', diff: 3, topic: 'Spatial', tool: 'cubes', title: 'Two painted faces',
    prompt: 'This 4 × 4 × 4 cube is painted on the outside, then cut into small cubes. How many small cubes have paint on exactly 2 faces?', answer: '24',
    hint: 'Those cubes are on the edges, but not at the corners.', setup: () => fresh.cu(5, [0, 1, 2, 3].flatMap(i => [0, 1, 2, 3].map(j => [i, j, 4]))), ok: 'Yes! 12 edges with 2 such cubes each.' }),
  contest({ id: 'mo-seq', style: 'moems', diff: 3, topic: 'Number patterns', tool: 'hundred-chart', title: '2, 6, 12, 20, ...',
    prompt: 'What is the 10th number in the pattern 2, 6, 12, 20, 30, ...?', answer: '110',
    hint: 'Look at how much it grows each time: 4, 6, 8, 10, ...', setup: fresh.hc, ok: 'Yes! The 10th number is 10 × 11 = 110.' }),
  contest({ id: 'mo-digits3', style: 'moems', diff: 3, topic: 'Place value', tool: 'base-ten', title: 'Digits that add to 3',
    prompt: 'How many 3-digit numbers have digits that add up to 3? (300 is one of them.)', answer: '6',
    hint: 'Try each hundreds digit: 1, 2 and 3.', setup: () => T_B10.build({}), ok: 'Yes! 102, 111, 120, 201, 210 and 300.' }),
  contest({ id: 'mo-hour', style: 'moems', diff: 3, topic: 'Angles', tool: 'clock', title: 'The hour hand turns',
    prompt: 'How many degrees does the hour hand of a clock turn in 2 hours and 20 minutes?', answer: '70',
    hint: 'In 1 hour the hour hand moves from one number to the next: 30°.', setup: () => fresh.ck(0), ok: 'Yes! 60° for 2 hours and 10° for 20 minutes.' }),

  /* ---- Contest style: Noetic (20 problems, mostly number answers) ---- */
  contest({ id: 'no-take', style: 'noetic', diff: 1, topic: 'Place value', tool: 'base-ten', title: '1000 take away',
    prompt: 'What is 1000 − 100 − 10 − 1?', answer: '889', hint: 'Take away 100 first, then 10, then 1.', setup: () => T_B10.build({}), ok: 'Yes! 889.' }),
  contest({ id: 'no-share', style: 'noetic', diff: 1, topic: 'Division', tool: 'base-ten', title: 'Sharing stickers',
    prompt: 'Four friends share 132 stickers equally. Then each friend gives 5 stickers away. How many stickers does each friend have now?', answer: '28',
    hint: 'First share 132 into 4 equal groups.', setup: () => T_B10.build({ h: 1, t: 3, o: 2 }), ok: 'Yes! 132 ÷ 4 = 33, and 33 − 5 = 28.' }),
  contest({ id: 'no-sum1', style: 'noetic', diff: 1, topic: 'Fractions', tool: 'fractions', title: 'Halves, fourths, eighths',
    prompt: 'What is 1/2 + 1/4 + 1/8 + 1/8?', answer: '1', input: 'fraction', hint: 'Two eighths make one fourth.', setup: fresh.fr, ok: 'Yes! They make exactly 1 whole.' }),
  contest({ id: 'no-square28', style: 'noetic', diff: 1, topic: 'Area & perimeter', tool: 'geoboard', title: 'Square with perimeter 28',
    prompt: 'A square has a perimeter of 28 cm. What is its area in square centimeters?', answer: '49', hint: 'Find the length of one side first.', setup: fresh.gb, ok: 'Yes! Each side is 7, and 7 × 7 = 49.' }),
  contest({ id: 'no-circles', style: 'noetic', diff: 1, topic: 'Logic', tool: 'balance', title: 'Two circles and a square',
    prompt: '2 circles and 1 square weigh 20 together. The square weighs 8. How much does 1 circle weigh?', answer: '6',
    hint: 'Take the square away. What do the 2 circles weigh?', setup: () => fresh.ba({ c: 6, s: 8, t: 3 }), ok: 'Yes! 20 − 8 = 12, and 12 ÷ 2 = 6.' }),
  contest({ id: 'no-box', style: 'noetic', diff: 1, topic: 'Spatial', tool: 'cubes', title: 'Fill the box',
    prompt: 'A box is 4 cubes long, 3 cubes wide and 2 cubes tall. How many small cubes fill it?', answer: '24', hint: 'Build one layer first.', setup: () => fresh.cu(5), ok: 'Yes! 12 in each layer, 2 layers.' }),
  contest({ id: 'no-rhombs', style: 'noetic', diff: 1, topic: 'Fractions', tool: 'pattern-blocks', title: 'Rhombuses and trapezoids',
    prompt: 'How many green triangles cover the same area as 3 blue rhombuses and 2 red trapezoids?', answer: '12', hint: 'A blue rhombus is 2 triangles.', setup: () => fresh.pb(), ok: 'Yes! 6 + 6 = 12.' }),
  contest({ id: 'no-box10', style: 'noetic', diff: 1, topic: 'Addition', tool: 'ten-frames', title: 'Make the 10',
    prompt: 'What number goes in the box? 8 + 7 = 10 + ☐', answer: '5', hint: 'Move counters to fill the first frame.', setup: () => fresh.tf([[8, 0], [0, 7]]), ok: 'Yes! 8 + 7 = 15 = 10 + 5.' }),
  contest({ id: 'no-mult', style: 'noetic', diff: 1, topic: 'Number patterns', tool: 'hundred-chart', title: 'Both 3 and 5',
    prompt: 'Which number is a multiple of both 3 and 5?', choices: ['35', '53', '45', '54', '25'], correct: 2,
    hint: 'A multiple of both 3 and 5 is a multiple of 15.', setup: fresh.hc, ok: 'Yes! 45 = 3 × 15.' }),
  contest({ id: 'no-sevens', style: 'noetic', diff: 1, topic: 'Number patterns', tool: 'number-line', title: 'Counting by 7s',
    prompt: 'Count by 7s starting at 3: 3, 10, 17, 24, ... What is the first number in the list that is bigger than 100?', answer: '101',
    hint: '3 + 70 = 73 is in the list. Keep going from there.', setup: () => fresh.nl('0-100'), ok: 'Yes! ... 87, 94, 101.' }),
  contest({ id: 'no-movie', style: 'noetic', diff: 2, topic: 'Time', tool: 'clock', title: 'When the movie ends',
    prompt: 'A movie starts at 6:45 and lasts 1 hour 50 minutes. When does it end? Type the time like 7:05.', answer: '8:35', input: 'text',
    match: a => String(a).replace(/[^\d:]/g, '') === '8:35', hint: 'Add 1 hour first, then 50 minutes.', setup: () => fresh.ck(405), ok: 'Yes! 7:45, then 50 more minutes is 8:35.' }),
  contest({ id: 'no-twentieth', style: 'noetic', diff: 2, topic: 'Number patterns', tool: 'hundred-chart', title: 'The 20th number',
    prompt: 'In the list 5, 9, 13, 17, ... what is the 20th number?', answer: '81', hint: 'From the 1st number to the 20th there are 19 jumps of 4.', setup: fresh.hc, ok: 'Yes! 5 + 19 × 4 = 81.' }),
  contest({ id: 'no-25x44', style: 'noetic', diff: 2, topic: 'Multiplication', tool: 'area-model', title: '25 × 44',
    prompt: 'What is 25 × 44?', answer: '1100', hint: '25 × 4 = 100.', setup: () => fresh.am(25, 44), ok: 'Yes! 25 × 4 × 11 = 100 × 11 = 1100.' }),
  contest({ id: 'no-odd', style: 'noetic', diff: 2, topic: 'Number patterns', tool: 'hundred-chart', title: 'Adding odd numbers',
    prompt: 'What is 1 + 3 + 5 + 7 + 9 + 11 + 13 + 15 + 17 + 19?', answer: '100', hint: 'Pair the first and last, the second and second-to-last, and so on.', setup: fresh.hc, ok: 'Yes! 5 pairs of 20. The first 10 odd numbers add to 10 × 10.' }),
  contest({ id: 'no-half', style: 'noetic', diff: 2, topic: 'Number line', tool: 'number-line', title: 'Halfway',
    prompt: 'What number is exactly halfway between 37 and 83?', answer: '60', hint: 'Find how far apart they are, then go half of that from 37.', setup: () => fresh.nl('0-100'), ok: 'Yes! They are 46 apart, and 37 + 23 = 60.' }),
  contest({ id: 'no-ways', style: 'noetic', diff: 3, topic: 'Logic', tool: 'ten-frames', title: 'Ways to make 10 cents',
    prompt: 'In how many different ways can you make 10 cents using 1-cent, 2-cent and 5-cent coins?', answer: '10',
    hint: 'Sort the ways by how many 5-cent coins they use: two, one or none.', setup: () => fresh.tf([[0, 0]]), ok: 'Yes! 1 way with two 5s, 3 ways with one 5, and 6 ways with none.' }),
  contest({ id: 'no-digits5', style: 'noetic', diff: 3, topic: 'Number patterns', tool: 'hundred-chart', title: 'Digits that add to 5',
    prompt: 'How many numbers from 1 to 50 have digits that add up to 5?', answer: '6', hint: 'Color them on the chart. They fall on a diagonal.', setup: fresh.hc, ok: 'Yes! 5, 14, 23, 32, 41 and 50.' }),
];
const TASK = {}; TASKS.forEach(t => { TASK[t.id] = t; });
// Earlier Challenge problems that already follow a contest format (only the answer is checked).
const TAGS = { 'bt-999': ['kangaroo', 1], 'fr-close': ['kangaroo', 1], 'nl-meet': ['kangaroo', 1], 'bt-ten': ['kangaroo', 2], 'fr-half': ['kangaroo', 2], 'ba-sum': ['kangaroo', 2],
  'cu-more': ['kangaroo', 2], 'ba-chain': ['kangaroo', 3], 'cu-paint': ['kangaroo', 3], 'at-solve': ['moems', 1], 'am-99x25': ['moems', 2] };
for (const id in TAGS) Object.assign(TASK[id], { style: TAGS[id][0], diff: TAGS[id][1], answerOnly: true });
const TOPICS = []; TASKS.forEach(t => { if (!TOPICS.includes(t.topic)) TOPICS.push(t.topic); });


/* ---- your own tasks ---- */
// A task you make is stored as plain data: { id, tool, level, title, prompt, type: choice|answer|done, choices, correct, answer, hint, hide, board, at }.
const CUSTOM = {};
function getTask(id) { return TASK[id] || CUSTOM[id] || null; }
const allTasks = () => Object.values(CUSTOM).concat(TASKS);
function emptyBoard(toolId) {
  const t = TOOL[toolId], d = t.init();
  if (t.clear) t.clear(d); else if (Array.isArray(d.pieces)) d.pieces = [];
  d.ink = []; delete d.target;
  return d;
}
const validCustom = c => {
  if (!c || typeof c !== 'object' || !/^u[a-z0-9]{6,16}$/.test(c.id || '') || !TOOL[c.tool]) return false;
  if (typeof c.prompt !== 'string' || !c.prompt.trim() || c.prompt.length > 600 || typeof c.board !== 'string') return false;
  if (c.type === 'choice') return Array.isArray(c.choices) && c.choices.length >= 2 && c.choices.length <= 5 && c.choices.every(x => typeof x === 'string') && Number.isInteger(c.correct) && c.correct >= 0 && c.correct < c.choices.length;
  if (c.type === 'answer') return typeof c.answer === 'string' && !!c.answer.trim();
  return c.type === 'done';
};
function registerCustom(c) {
  const t = { id: c.id, custom: true, tool: c.tool, level: [1, 2, 3].includes(c.level) ? c.level : 2, topic: 'My tasks', title: String(c.title || c.prompt).slice(0, 60), prompt: c.prompt, hint: c.hint || '', hide: c.hide !== false, raw: c };
  if (c.type === 'choice') t.choices = c.choices;
  if (c.type === 'answer') t.input = 'text';
  if (c.type === 'done') t.done = true;
  t.setup = () => { try { const d = JSON.parse(c.board); if (d && typeof d === 'object') return d; } catch (_) { /* fall through */ } return emptyBoard(c.tool); };
  t.check = (d, a) => {
    if (c.type === 'done') return [true, 'Marked as done.'];
    if (c.type === 'choice') return pick(a, c.correct, 'Correct!', 'Not quite. Try again.');
    if (a == null || String(a).trim() === '') return [false, 'Type your answer first.'];
    return ansMatch(a, c.answer) ? [true, 'Correct!'] : [false, 'Not quite. Try again.'];
  };
  CUSTOM[c.id] = t;
}
// Your tasks live in their own storage, so a parent phone keeps them too.
const KEY_MINE = 'mathbench.mine' + (KEY_NS ? '.' + KEY_NS : '');
function saveMine() { try { localStorage.setItem(KEY_MINE, JSON.stringify(S.custom)); } catch (_) { /* storage unavailable */ } }
function loadMine() {
  try {
    const a = JSON.parse(localStorage.getItem(KEY_MINE) || '[]');
    if (Array.isArray(a)) { S.custom = a.filter(validCustom); S.custom.forEach(registerCustom); }
  } catch (_) { /* ignore */ }
}
function saveCustom(c, share = true) {
  const i = S.custom.findIndex(x => x.id === c.id);
  if (i > -1) S.custom[i] = c; else S.custom.push(c);
  registerCustom(c); saveMine();
  if (share) liveShareTask(c);
}
function deleteCustom(id, share = true) {
  S.custom = S.custom.filter(x => x.id !== id); delete CUSTOM[id]; saveMine();
  if (share) liveShareTask({ id }, true);
  if (S.task && S.task.id === id) { S.task = null; render(); saveSoon(); }
}
const taskLink = c => pageBase() + '#task=' + b64e(c);
// Opening a task link adds the task on this device (and to the live room). Returns its id.
function consumeTaskHash() {
  const m = location.hash.match(/^#task=([\w-]+)$/);
  if (!m) return null;
  try { history.replaceState(null, '', pageBase()); } catch (_) { /* sandboxed */ }
  try {
    const c = b64d(m[1]); if (!validCustom(c)) return null;
    const mine = S.custom.find(x => x.id === c.id);
    if (!mine || (c.at || 0) >= (mine.at || 0)) saveCustom(c);
    return c.id;
  } catch (_) { return null; }
}

/* ---- running a task ---- */
function taskStats(log) {
  const st = {};
  for (const e of log) {
    if (!e || !getTask(e.id)) continue;
    const s = st[e.id] || (st[e.id] = { tries: 0, ok: false, first: null, last: 0 });
    s.tries++; if (s.first === null) s.first = !!e.ok; if (e.ok) s.ok = true; s.last = Math.max(s.last, e.at || 0);
  }
  return st;
}
function startTask(id, by = 'self') {
  const t = getTask(id); if (!t) return;
  if (S.set && !isCoach()) finishSet(false, true);
  S.pen.on = false; S.pen.erase = false;
  if (S.tool !== t.tool) setTool(t.tool);
  const snap = snapshot();
  S.data[t.tool] = t.setup();
  ensureData(TOOL[t.tool]);
  if (snap !== snapshot()) pushUndo(snap);
  S.task = { id, by, tries: 0, status: 'open', msg: '', ans: null, hint: false, at: Date.now() };
  S.taskMin = false; S.sel = null; app.tcSig = '';
  if (TOOL[t.tool].kind === 'pieces') { delete S.views[t.tool]; if (TOOL[t.tool].extent || Array.isArray(S.data[t.tool].target)) setTimeout(() => { if (S.tool === t.tool) fitView(); }, 0); }
  renderTray(); render(); saveSoon();
}
function checkTask() {
  const st = S.task; if (!st || st.status === 'ok') return;
  const t = getTask(st.id); if (!t) return;
  let res;
  try { res = t.check(S.data[t.tool], st.ans); } catch (err) { console.error(err); res = [false, 'Something went wrong checking this one.']; }
  st.tries++; st.status = res[0] ? 'ok' : 'no'; st.msg = res[1];
  const ans = st.ans == null || st.ans === '' ? '' : String(t.choices ? `${LETTERS[st.ans]}) ${t.choices[st.ans]}` : st.ans);
  const entry = { id: st.id, ok: !!res[0], at: Date.now(), tries: st.tries, ans, by: st.by, hint: !!st.hint };
  S.progress.push(entry); liveLog(entry);
  if (res[0]) renderTray(); // options that stay locked during a task come back
  render(); saveSoon();
}
function nextTask() {
  const solved = taskStats(S.progress), cur = S.task ? getTask(S.task.id) : null, toolId = cur ? cur.tool : S.tool, all = allTasks();
  const open = all.filter(t => !(solved[t.id] && solved[t.id].ok) && (!cur || t.id !== cur.id));
  open.sort((a, b) => (a.tool === toolId ? 0 : 1) - (b.tool === toolId ? 0 : 1) || (a.level || 2) - (b.level || 2) || all.indexOf(a) - all.indexOf(b));
  if (open.length) { startTask(open[0].id, 'self'); return; }
  S.task = null; renderTray(); render(); saveSoon(); toast('Every task is solved. Amazing work!');
}
function resetTask() {
  const st = S.task; if (!st) return;
  const t = getTask(st.id); if (!t) return;
  if (S.tool !== t.tool) setTool(t.tool);
  const snap = snapshot(); S.data[t.tool] = t.setup(); ensureData(TOOL[t.tool]); if (snap !== snapshot()) pushUndo(snap);
  st.status = 'open'; st.msg = '';
  renderTray(); render(); saveSoon();
}
const kickerOf = (t, st, coach) => `${TOOL[t.tool].short} · ${LEVELS[t.level || 2]}` + (t.style ? ` · ${STYLES[t.style]}` : '') + (st && st.by === 'coach' && !coach ? ` · from ${LIVE.coach || 'your coach'}` : '');
function renderTaskCard() {
  if (S.set && !S.build) { renderSetCard(app.tcard); return; }
  const el = app.tcard, st = S.task, coach = isCoach();
  const t = st && getTask(st.id);
  if (!t || S.build) { el.hidden = true; el.innerHTML = ''; app.tcSig = ''; return; }
  const sig = JSON.stringify([st.id, st.status, st.msg, st.hint, st.tries, S.taskMin, S.tool, coach, coach ? st.ans : (t.choices ? st.ans : 0), LIVE.coach, t.prompt, t.raw && t.raw.at]);
  if (sig === app.tcSig && !el.hidden) return; // unchanged; keeps the answer box focused while typing
  app.tcSig = sig;
  const top = `<div class="tc-top"><span class="tc-k">${esc(kickerOf(t, st, coach))}</span>` +
    (coach ? '' : (S.taskMin ? `<button class="ib sm" type="button" data-tc="max" aria-label="Show the task">${icon('max')}</button>` : `<button class="ib sm" type="button" data-tc="min" aria-label="Make the task smaller">${icon('min')}</button>`) +
      `<button class="ib sm" type="button" data-tc="close" aria-label="Close the task">${icon('close')}</button>`) + '</div>';
  if (S.taskMin && !coach) { el.innerHTML = top + `<p class="tc-p" style="margin:2px 0 0">${esc(t.title)}${st.status === 'ok' ? ' ✓' : ''}</p>`; el.hidden = false; return; }
  const choiceTxt = i => `${LETTERS[i]}) ${t.choices[i]}`;
  if (coach) {
    const ans = st.ans == null || st.ans === '' ? '' : String(t.choices ? choiceTxt(st.ans) : st.ans);
    el.innerHTML = top + `<p class="tc-p" style="margin:2px 0 4px"><b>${esc(t.title)}</b> <span class="sub">${esc(t.prompt)}</span></p>` +
      (st.msg ? `<div class="tc-fb ${st.status === 'ok' ? 'ok' : 'no'}" style="margin-bottom:4px">${esc(st.msg)}</div>` : '') +
      `<div class="tc-meta" style="margin-top:0">${ans ? `Answer so far: <b>${esc(ans)}</b> · ` : ''}${st.tries ? `${st.tries} ${plural(st.tries, 'check')}` : 'Not checked yet'}${st.hint ? ' · opened the hint' : ''}${st.status === 'ok' ? ' · solved' : ''}</div>`;
    el.hidden = false; return;
  }
  let h = top + `<p class="tc-p">${esc(t.prompt)}</p>`;
  if (S.tool !== t.tool) h += `<div class="tc-row"><button class="btn" type="button" data-tc="goto">Go back to ${esc(TOOL[t.tool].short)}</button></div>`;
  if (t.choices) h += `<div class="tc-row">${t.choices.map((c, i) => `<button class="btn ch" type="button" data-tc="choice" data-i="${i}" aria-pressed="${st.ans === i}"${st.status === 'ok' ? ' disabled' : ''}><b>${LETTERS[i]}</b> ${esc(c)}</button>`).join('')}</div>`;
  if (t.input) {
    const ph = t.input === 'fraction' ? 'like 12, 1 1/2 or 0.5' : 'Your answer';
    h += `<div class="tc-row"><input class="tc-in" id="tcIn" type="text" inputmode="${t.input === 'number' ? 'numeric' : 'text'}" autocomplete="off" enterkeyhint="done" placeholder="${ph}" aria-label="Your answer" value="${esc(st.ans == null ? '' : st.ans)}"${st.status === 'ok' ? ' disabled' : ''}></div>`;
  }
  // An empty feedback line keeps its space so the board below does not move when feedback appears.
  h += st.msg ? `<div class="tc-fb ${st.status === 'ok' ? 'ok' : 'no'}">${esc(st.msg)}</div>` : '<div class="tc-fb" aria-hidden="true" style="visibility:hidden">&nbsp;</div>';
  if (st.hint && t.hint) h += `<p class="tc-hint">Hint: ${esc(t.hint)}</p>`;
  if (st.status === 'ok') h += `<div class="tc-btns"><button class="btn primary" type="button" data-tc="next">Next task</button><button class="btn" type="button" data-tc="list">All tasks</button></div>`;
  else h += `<div class="tc-btns"><button class="btn primary" type="button" data-tc="check">${t.done ? 'I’m done' : 'Check'}</button>` + (st.hint || !t.hint ? '' : `<button class="btn" type="button" data-tc="hint">Hint</button>`) + `<button class="btn" type="button" data-tc="reset">Start over</button></div>`;
  el.innerHTML = h; el.hidden = false;
}
function onTaskCard(e) {
  if (S.set) { onSetCard(e); return; }
  const b = e.target.closest('[data-tc]'); if (!b || isCoach()) return;
  const st = S.task; if (!st) return;
  switch (b.dataset.tc) {
    case 'check': { const inp = $('#tcIn'); if (inp) st.ans = inp.value; checkTask(); break; }
    case 'hint': st.hint = true; render(); saveSoon(); break;
    case 'reset': resetTask(); break;
    case 'next': nextTask(); break;
    case 'list': openTaskList(); break;
    case 'goto': setTool(getTask(st.id).tool, true); break;
    case 'choice': st.ans = +b.dataset.i; if (st.status === 'no') { st.status = 'open'; st.msg = ''; } render(); saveSoon(); break;
    case 'min': S.taskMin = true; render(); break;
    case 'max': S.taskMin = false; render(); break;
    case 'close': S.task = null; renderTray(); render(); saveSoon(); break;
  }
}
function wireTaskCard() {
  app.tcard.addEventListener('click', onTaskCard);
  app.tcard.addEventListener('input', e => {
    if (e.target.id === 'tcIn' && S.task) { S.task.ans = e.target.value; saveSoon(); }
    if (e.target.id === 'scIn' && S.set) { S.set.ans[S.set.ids[S.set.i]] = e.target.value; saveSoon(); }
  });
  app.tcard.addEventListener('keydown', e => {
    if (e.target.id === 'tcIn' && e.key === 'Enter' && S.task) { S.task.ans = e.target.value; checkTask(); }
    if (e.target.id === 'scIn' && e.key === 'Enter' && S.set) { S.set.ans[S.set.ids[S.set.i]] = e.target.value; if (S.set.i < S.set.ids.length - 1) setGo(S.set.i + 1); }
  });
}

/* ---- contest practice: timed sets in each contest's format ---- */
// pick: how many problems of difficulty 1, 2, 3; pts: points for each difficulty.
const SETS = {
  kangaroo: { name: 'Kangaroo style', mins: 28, pick: [3, 3, 3], pts: [3, 4, 5], about: 'Choices A–E. 3, 4 or 5 points each' },
  moems: { name: 'MOEMS style', mins: 30, pick: [2, 2, 1], pts: [1, 1, 1], about: 'Number answers, hardest last' },
  noetic: { name: 'Noetic style', mins: 23, pick: [5, 3, 2], pts: [1, 1, 1], about: 'Half a contest, mostly number answers' },
};
const setSize = style => SETS[style].pick.reduce((a, b) => a + b, 0);
const mmss = ms => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
// Problems not solved yet come first; each difficulty is shuffled, and the set runs from easy to hard.
function pickSet(style) {
  const cfg = SETS[style], solved = taskStats(S.progress), pool = TASKS.filter(t => t.style === style);
  const shuffle = a => a.map(t => [Math.random(), t]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
  const ids = [];
  cfg.pick.forEach((k, i) => {
    const lv = pool.filter(t => t.diff === i + 1), done = t => solved[t.id] && solved[t.id].ok;
    ids.push(...shuffle(lv.filter(t => !done(t))).concat(shuffle(lv.filter(done))).slice(0, k).map(t => t.id));
  });
  for (const t of pool) if (ids.length < setSize(style) && !ids.includes(t.id)) ids.push(t.id);
  return ids;
}
function startSet(style, by = 'self') {
  if (!SETS[style] || isCoach()) return;
  const ids = pickSet(style); if (!ids.length) return;
  if (S.set) finishSet(false, true);
  S.task = null; S.taskMin = false; S.pen.on = false; S.pen.erase = false;
  const now = Date.now();
  S.set = { style, ids, i: 0, ans: {}, boards: {}, by, start: now, end: now + SETS[style].mins * 60000 };
  setGo(0, true); startSetTimer();
}
// Moves to problem i. Each problem keeps its own board, so scratch work is still there after going back.
function setGo(i, first) {
  const st = S.set; if (!st) return;
  const cur = getTask(st.ids[st.i]);
  if (!first && cur && S.data[cur.tool]) st.boards[cur.id] = JSON.stringify(S.data[cur.tool]);
  st.i = clamp(i, 0, st.ids.length - 1);
  const t = getTask(st.ids[st.i]); if (!t) return;
  if (S.tool !== t.tool) setTool(t.tool);
  let d = null; try { d = st.boards[t.id] ? JSON.parse(st.boards[t.id]) : null; } catch (_) { /* fresh board */ }
  S.data[t.tool] = d || t.setup(); ensureData(TOOL[t.tool]);
  S.undo[t.tool] = []; S.sel = null; app.tcSig = '';
  if (TOOL[t.tool].kind === 'pieces') { delete S.views[t.tool]; setTimeout(() => { if (S.tool === t.tool) fitView(); }, 0); }
  renderTray(); render(); saveSoon();
}
const stopSetTimer = () => { clearInterval(app.setT); app.setT = 0; };
function startSetTimer() {
  stopSetTimer();
  app.setT = setInterval(() => {
    const st = S.set; if (!st) { stopSetTimer(); return; }
    const left = st.end - Date.now(), el = document.getElementById('tcTimer');
    if (el) { el.textContent = mmss(left); el.classList.toggle('low', left < 120000); }
    if (left <= 0 && !isCoach()) finishSet(true);
  }, 1000);
}
// Scores the set. Every problem goes into the log (the parent sees it), plus one line for the whole set.
function finishSet(timeUp, quiet) {
  const st = S.set; if (!st || isCoach()) return;
  const cur = getTask(st.ids[st.i]); if (cur && S.data[cur.tool]) st.boards[cur.id] = JSON.stringify(S.data[cur.tool]);
  const cfg = SETS[st.style], now = Date.now();
  const rows = st.ids.map(id => {
    const t = getTask(id), a = st.ans[id], given = a != null && a !== '';
    let ok = false;
    if (t && given) { try { ok = !!t.check(null, a)[0]; } catch (_) { ok = false; } }
    const max = cfg.pts[((t && t.diff) || 1) - 1];
    return { id, ok, given, ans: given ? String(t && t.choices ? `${LETTERS[a]}) ${t.choices[a]}` : a) : '', pts: ok ? max : 0, max };
  });
  const score = rows.reduce((x, r) => x + r.pts, 0), max = rows.reduce((x, r) => x + r.max, 0), secs = Math.round((Math.min(now, st.end) - st.start) / 1000);
  for (const r of rows) { const e = { id: r.id, ok: r.ok, at: now, tries: 1, ans: r.ans, by: 'set', hint: false }; S.progress.push(e); liveLog(e); }
  const sum = { id: '__set', set: st.style, ok: score === max, at: now + 1, score, max, right: rows.filter(r => r.ok).length, n: rows.length, secs, by: st.by };
  S.progress.push(sum); liveLog(sum);
  S.lastSet = { style: st.style, rows, score, max, secs, timeUp: !!timeUp };
  S.set = null; stopSetTimer(); app.tcSig = '';
  renderTray(); render(); saveSoon();
  if (!quiet) openSetResults();
}
function openSetResults() {
  const r = S.lastSet; if (!r) return;
  const cfg = SETS[r.style], right = r.rows.filter(x => x.ok).length, points = cfg.pts[2] > 1;
  const list = r.rows.map((x, i) => { const t = getTask(x.id); return `<div class="res"><span class="${x.ok ? 'r-ok' : 'r-no'}" aria-label="${x.ok ? 'right' : 'not right'}">${x.ok ? '✓' : '✗'}</span><span class="t">${i + 1}. ${esc(t ? t.title : 'A problem')}${x.given ? '' : ' <span class="sub">· no answer</span>'}</span>` + (x.ok ? (points ? `<span class="sub">+${x.pts}</span>` : '') : `<button class="btn sm" type="button" data-retry="${x.id}">Try again</button>`) + '</div>'; }).join('');
  openSheet(`${cfg.name} practice`,
    `<div class="stats">${points ? `<div class="stat"><b>${r.score}/${r.max}</b><span>points</span></div>` : ''}<div class="stat"><b>${right}/${r.rows.length}</b><span>right</span></div><div class="stat"><b>${mmss(r.secs * 1000)}</b><span>${r.timeUp ? 'time ran out' : 'time used'}</span></div></div>` + list +
    `<p class="sub">Try again opens the problem by itself, with a hint and a Check button.</p><div class="btnrow"><button class="btn primary" type="button" data-again>Practice again</button><button class="btn" type="button" data-close>Close</button></div>`,
    body => body.addEventListener('click', e => {
      const rt = e.target.closest('[data-retry]'); if (rt) { closeSheet(); startTask(rt.dataset.retry, 'self'); return; }
      if (e.target.closest('[data-again]')) { closeSheet(); startSet(r.style, 'self'); return; }
      if (e.target.closest('[data-close]')) closeSheet();
    }));
}
// Last result for each style, for the buttons in the task list.
function setButtonsHTML(log, coach) {
  const last = {}; for (const e of log) if (e && e.id === '__set' && SETS[e.set]) last[e.set] = e;
  return `<div class="tl-topic">Contest practice${coach ? ' · send a timed set' : ''}</div><div class="cp-grid">` + Object.keys(SETS).map(k => {
    const c = SETS[k], l = last[k];
    return `<button class="cp" type="button" data-${coach ? 'sendset' : 'set'}="${k}"><b>${esc(c.name)}</b><span>${setSize(k)} problems · ${c.mins} min · ${esc(c.about)}</span>${l ? `<span class="cp-last">Last time: ${l.score}/${l.max}${c.pts[2] > 1 ? ' points' : ''}</span>` : ''}</button>`;
  }).join('') + '</div>';
}
function renderSetCard(el) {
  const st = S.set, coach = isCoach(), cfg = SETS[st.style], n = st.ids.length, id = st.ids[st.i], t = getTask(id);
  if (!t || !cfg) { el.hidden = true; return; }
  const a = st.ans[id], has = a != null && a !== '', answered = st.ids.filter(k => st.ans[k] != null && st.ans[k] !== '').length;
  const sig = JSON.stringify(['set', st.style, st.i, st.ids, S.taskMin, coach, S.tool === t.tool, t.choices || coach ? a : 0, coach ? answered : 0]);
  if (sig === app.tcSig && !el.hidden) return;
  app.tcSig = sig;
  const left = st.end - Date.now();
  const top = `<div class="tc-top"><span class="tc-k">${esc(cfg.name)} · ${st.i + 1} of ${n}</span><span class="tc-timer${left < 120000 ? ' low' : ''}" id="tcTimer" aria-label="Time left">${mmss(left)}</span>` +
    (coach ? '' : (S.taskMin ? `<button class="ib sm" type="button" data-sc="max" aria-label="Show the problem">${icon('max')}</button>` : `<button class="ib sm" type="button" data-sc="min" aria-label="Make the problem smaller">${icon('min')}</button>`)) + '</div>';
  if (S.taskMin && !coach) { el.innerHTML = top + `<p class="tc-p" style="margin:2px 0 0">${esc(t.title)}</p>`; el.hidden = false; return; }
  const shown = has ? String(t.choices ? `${LETTERS[a]}) ${t.choices[a]}` : a) : '';
  if (coach) {
    el.innerHTML = top + `<p class="tc-p" style="margin:2px 0 4px">${esc(t.prompt)}</p><div class="tc-meta" style="margin-top:0">${answered} of ${n} answered${has ? ` · answer here: <b>${esc(shown)}</b>` : ''}</div>`;
    el.hidden = false; return;
  }
  let h = top + `<p class="tc-p">${esc(t.prompt)}</p>`;
  if (S.tool !== t.tool) h += `<div class="tc-row"><button class="btn" type="button" data-sc="goto">Go back to ${esc(TOOL[t.tool].short)}</button></div>`;
  if (t.choices) h += `<div class="tc-row">${t.choices.map((c, i) => `<button class="btn ch" type="button" data-sc="choice" data-i="${i}" aria-pressed="${a === i}"><b>${LETTERS[i]}</b> ${esc(c)}</button>`).join('')}</div>`;
  else h += `<div class="tc-row"><input class="tc-in" id="scIn" type="text" inputmode="${t.input === 'number' ? 'numeric' : 'text'}" autocomplete="off" enterkeyhint="next" placeholder="Your answer" aria-label="Your answer" value="${esc(has ? a : '')}"></div>`;
  const last = st.i === n - 1;
  h += `<div class="tc-btns"><button class="btn" type="button" data-sc="prev"${st.i ? '' : ' disabled'}>Back</button>` +
    (last ? '' : `<button class="btn primary" type="button" data-sc="next">Next</button>`) + `<button class="btn${last ? ' primary' : ''}" type="button" data-sc="finish">Finish</button></div>` +
    `<div class="tc-meta">Answers are checked when you finish.</div>`;
  el.innerHTML = h; el.hidden = false;
}
function onSetCard(e) {
  const b = e.target.closest('[data-sc]'); if (!b || isCoach()) return;
  const st = S.set; if (!st) return;
  const inp = $('#scIn'); if (inp) st.ans[st.ids[st.i]] = inp.value;
  switch (b.dataset.sc) {
    case 'choice': st.ans[st.ids[st.i]] = +b.dataset.i; render(); saveSoon(); break;
    case 'next': setGo(st.i + 1); break;
    case 'prev': setGo(st.i - 1); break;
    case 'finish': finishSet(); break;
    case 'goto': setTool(getTask(st.ids[st.i]).tool, true); break;
    case 'min': S.taskMin = true; render(); break;
    case 'max': S.taskMin = false; render(); break;
  }
}

/* ---- task lists (kid: start a task; parent: send a task) ---- */
// toolId limits the list to one manipulative; editable adds an edit button to your own tasks.
function taskListHTML(stats, curId, verb, toolId, editable) {
  const scope = t => !toolId || t.tool === toolId;
  const row = t => {
    const s = stats[t.id], cls = s && s.ok ? 'ok' : s ? 'tried' : '';
    const sub = s ? (s.ok ? (s.first ? 'first try' : `${s.tries} checks`) : `${s.tries} ${plural(s.tries, 'check')}`) : (toolId ? '' : TOOL[t.tool].short);
    return `<div class="tl-row"><button type="button" class="tl-item${curId === t.id ? ' cur' : ''}" data-tl="${t.id}" aria-label="${esc(verb + ': ' + t.title)}"><span class="tl-st ${cls}" aria-hidden="true">${s && s.ok ? '✓' : s ? '•' : ''}</span><span>${esc(t.title)}</span><span class="tl-sub">${esc(sub)}</span></button>` +
      (editable && t.custom ? `<button type="button" class="ib sm" data-edit="${t.id}" aria-label="Edit ${esc(t.title)}" title="Edit">${icon('pen')}</button>` : '') + '</div>';
  };
  let h = '';
  const mine = Object.values(CUSTOM).filter(scope);
  if (mine.length) h += `<div class="tl-topic">My tasks</div>` + mine.map(row).join('');
  for (const lv of [1, 2, 3]) {
    const list = TASKS.filter(t => t.level === lv && !t.style && scope(t));
    if (list.length) h += `<div class="tl-topic">${LEVELS[lv]}</div>` + list.map(row).join('');
  }
  for (const sty in STYLES) {
    const list = TASKS.filter(t => t.style === sty && scope(t)).sort((a, b) => a.diff - b.diff);
    if (list.length) h += `<div class="tl-topic">${LEVELS[3]} · ${STYLES[sty]}</div>` + list.map(row).join('');
  }
  return h || '<p class="sub">No tasks for this manipulative yet. Make one, or show all manipulatives.</p>';
}
const filterRow = (scope, toolId) => `<div class="chips" role="group" aria-label="Which tasks"><button class="opt" type="button" data-scope="tool" aria-pressed="${scope === 'tool'}">${esc(TOOL[toolId].short)}</button><button class="opt" type="button" data-scope="all" aria-pressed="${scope === 'all'}">All manipulatives</button></div>`;
// On a kid device in live mode, tasks are made on the parent phone (the editor shows answers).
const canEdit = () => LIVE.role !== 'kid';
function openTaskList() {
  if (S.set) {
    const cfg = SETS[S.set.style];
    openSheet('Contest practice', `<p>${esc(cfg.name)} practice is running: ${mmss(S.set.end - Date.now())} left. Answers are checked when you finish.</p><div class="btnrow"><button class="btn primary" type="button" data-back>Back to the problems</button><button class="btn" type="button" data-fin>Finish now</button></div>`,
      body => body.addEventListener('click', e => { if (e.target.closest('[data-back]')) closeSheet(); if (e.target.closest('[data-fin]')) { closeSheet(); finishSet(); } }));
    return;
  }
  const toolId = S.tool, stats = taskStats(S.progress), all = allTasks();
  const scope = app.tlScope || (all.some(t => t.tool === toolId) ? 'tool' : 'all');
  const solved = all.filter(t => stats[t.id] && stats[t.id].ok).length;
  openSheet('Practice tasks',
    `<p class="sub">${solved} of ${all.length} solved. Foundations build the basics, Builder stretches them, Challenge is contest style.</p>` +
    `<div class="btnrow"><button class="btn primary" type="button" data-tl="__next">Next unsolved task</button>${canEdit() ? '<button class="btn" type="button" data-make>Make a task</button>' : ''}</div>` +
    setButtonsHTML(S.progress) + filterRow(scope, toolId) + taskListHTML(stats, S.task && S.task.id, 'Start', scope === 'tool' ? toolId : null, canEdit()),
    body => body.addEventListener('click', e => {
      const sc = e.target.closest('[data-scope]'); if (sc) { app.tlScope = sc.dataset.scope; openTaskList(); return; }
      const ss = e.target.closest('[data-set]'); if (ss) { closeSheet(); startSet(ss.dataset.set, 'self'); return; }
      const ed = e.target.closest('[data-edit]'); if (ed) { if (CUSTOM[ed.dataset.edit]) openEditor(CUSTOM[ed.dataset.edit].raw); return; }
      if (e.target.closest('[data-make]')) { openEditor(); return; }
      const b = e.target.closest('[data-tl]'); if (!b) return;
      closeSheet();
      if (b.dataset.tl === '__next') nextTask(); else startTask(b.dataset.tl, 'self');
    }));
}

/* ---- task editor ---- */
// existing: a saved task to edit. draft: the editor's fields coming back from build mode on the parent phone.
function openEditor(existing, draft) {
  const coach = S.role === 'coach', kidName = LIVE.kid || 'your kid';
  const v = draft || (existing ? { ...existing, start: 'keep' } : { type: 'choice', level: 2, hide: true, tool: S.tool, choices: [], correct: 0, start: 'current' });
  const built = (draft && draft.built) || null; // { tool, board } from build mode
  const ch = v.choices || [];
  const opt = (attr, val, label) => `<button class="opt" type="button" data-${attr}="${val}" aria-pressed="false">${esc(label)}</button>`;
  const starts = [];
  if (existing) starts.push(['keep', 'Keep the saved board']);
  if (built) starts.push(['built', 'The board you built']);
  starts.push(['current', coach ? `${cap(kidName)}’s board now` : 'This board'], ['empty', 'Empty board']);
  openSheet(existing ? 'Edit task' : 'Make a task', `
    <div class="field"><label for="edQ">Question</label><textarea id="edQ" class="plain" rows="3" maxlength="400" placeholder="What should your kid do or find out?">${esc(v.prompt || '')}</textarea></div>
    <div class="field"><label for="edT">Short name (optional)</label><input id="edT" type="text" maxlength="40" value="${esc(v.title && v.title !== String(v.prompt || '').slice(0, 40) ? v.title : '')}"></div>
    <div class="field"><label>How is it answered?</label><div class="chips" style="margin:0">${opt('ty', 'choice', 'Choices A–E')}${opt('ty', 'answer', 'Typed answer')}${opt('ty', 'done', 'Just build it')}</div></div>
    <div id="edChoice">${[0, 1, 2, 3, 4].map(i => `<div class="choice-row"><button class="opt sq" type="button" data-right="${i}" aria-pressed="false" aria-label="${LETTERS[i]} is the right answer">${LETTERS[i]}</button><input id="edC${i}" type="text" maxlength="40" value="${esc(ch[i] || '')}" placeholder="Choice ${LETTERS[i]}${i > 1 ? ' (optional)' : ''}" aria-label="Choice ${LETTERS[i]}"></div>`).join('')}<p class="sub">Tap the letter of the right answer.</p></div>
    <div class="field" id="edAns"><label for="edA">Right answer</label><input id="edA" type="text" maxlength="40" value="${esc(v.answer || '')}" placeholder="12, 3/4, 0.5 or a word"><span class="sub">Numbers match in any form: 1/2, 2/4 and 0.5 all count.</span></div>
    <div class="field"><label for="edH">Hint (optional)</label><input id="edH" type="text" maxlength="160" value="${esc(v.hint || '')}"></div>
    <div class="field"><label>Level</label><div class="chips" style="margin:0">${opt('lv', 1, 'Foundations')}${opt('lv', 2, 'Builder')}${opt('lv', 3, 'Challenge')}</div></div>
    <div class="field"><label for="edTool">Manipulative</label><select id="edTool" class="sel">${TOOLS.map(t => `<option value="${t.id}"${t.id === v.tool ? ' selected' : ''}>${esc(t.short)}</option>`).join('')}</select></div>
    <div class="field"><label>Starting board</label><div class="chips" style="margin:0">${starts.map(([k, l]) => opt('st', k, l)).join('')}${coach ? `<button class="opt ghost" type="button" data-build>${built ? 'Build it again' : 'Build one on this phone'}</button>` : ''}</div><span class="sub" id="edStartNote"></span></div>
    <label class="checkrow"><input type="checkbox" id="edHide"${v.hide !== false ? ' checked' : ''}> Hide the readouts until it is solved</label>
    <p class="err" id="edErr" hidden></p>
    <div class="btnrow"><button class="btn primary" type="button" data-save="go">${coach ? `Save and send to ${esc(kidName)}` : 'Save and start'}</button><button class="btn" type="button" data-save="only">Save</button>${existing ? '<button class="btn" type="button" data-link>Copy task link</button><button class="btn" type="button" data-del>Delete</button>' : ''}</div>`,
  body => {
    const st = { type: v.type || 'choice', level: +v.level || 2, start: starts.some(s => s[0] === v.start) ? v.start : starts[0][0], correct: v.correct | 0 };
    const boardTool = k => (k === 'keep' ? existing.tool : k === 'built' ? built.tool : k === 'current' ? S.tool : null);
    const mismatch = () => { const bt = boardTool(st.start), tool = $('#edTool', body).value; return bt && bt !== tool ? `That board is ${TOOL[bt].short}. Pick ${TOOL[bt].short} above, or choose another starting board.` : ''; };
    const sync = () => {
      body.querySelectorAll('[data-ty]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ty === st.type)));
      body.querySelectorAll('[data-lv]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.lv === st.level)));
      body.querySelectorAll('[data-st]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.st === st.start)));
      body.querySelectorAll('[data-right]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.right === st.correct)));
      $('#edChoice', body).hidden = st.type !== 'choice'; $('#edAns', body).hidden = st.type !== 'answer';
      $('#edStartNote', body).textContent = mismatch();
    };
    const read = () => ({
      id: existing ? existing.id : v.id, prompt: $('#edQ', body).value.trim(), title: $('#edT', body).value.trim(), type: st.type,
      choices: [0, 1, 2, 3, 4].map(i => $('#edC' + i, body).value.trim()), correct: st.correct, answer: $('#edA', body).value.trim(),
      hint: $('#edH', body).value.trim(), level: st.level, tool: $('#edTool', body).value, hide: $('#edHide', body).checked, start: st.start, built,
    });
    body.addEventListener('change', e => { if (e.target.id === 'edTool') sync(); });
    body.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const err = $('#edErr', body), fail = m => { err.textContent = m; err.hidden = false; };
      if (b.dataset.ty) { st.type = b.dataset.ty; sync(); return; }
      if (b.dataset.lv) { st.level = +b.dataset.lv; sync(); return; }
      if (b.dataset.st) { st.start = b.dataset.st; sync(); return; }
      if (b.dataset.right) { st.correct = +b.dataset.right; sync(); return; }
      if (b.hasAttribute('data-build')) { const r = read(); closeSheet(); enterBuild(r.tool, r, existing); return; }
      if (b.hasAttribute('data-link')) { copyText(taskLink(existing), 'Task link copied. Open it on any device to add the task there.'); return; }
      if (b.hasAttribute('data-del')) { deleteCustom(existing.id); closeSheet(); toast('Task deleted.'); if (isCoach()) renderCoach(); return; }
      if (!b.dataset.save) return;
      const r = read();
      if (!r.prompt) return fail('Write the question first.');
      if (r.type === 'choice') {
        if (r.choices.filter(Boolean).length < 2) return fail('Fill in at least two choices.');
        if (!r.choices[r.correct]) return fail('Tap the letter of a filled-in choice to mark the right answer.');
      }
      if (r.type === 'answer' && !r.answer) return fail('Type the right answer.');
      if (mismatch()) return fail(mismatch());
      const board = r.start === 'keep' ? existing.board : r.start === 'built' ? built.board : JSON.stringify(r.start === 'empty' ? emptyBoard(r.tool) : S.data[S.tool]);
      const keep = r.choices.map((c, i) => [c, i]).filter(x => x[0]);
      const c = { id: r.id || 'u' + newRoom().slice(0, 10), v: 1, tool: r.tool, level: r.level, title: r.title || r.prompt.slice(0, 40), prompt: r.prompt, type: r.type, hint: r.hint, hide: r.hide, board, at: Date.now() };
      if (r.type === 'choice') { c.choices = keep.map(x => x[0]); c.correct = keep.findIndex(x => x[1] === r.correct); }
      if (r.type === 'answer') c.answer = r.answer;
      saveCustom(c);
      closeSheet();
      if (b.dataset.save === 'go') { if (coach) assignTask(c.id); else startTask(c.id, 'self'); } else toast('Task saved.');
      if (isCoach()) renderCoach();
    });
    sync();
  });
}

// Runs inside the page. For every built-in task: a board (and answer) that solves it, and some near misses that must not pass.
module.exports = function solutions() {
  const { TOOL, TASK } = window.mathbench;
  const B = TOOL['base-ten'].api, CU = TOOL.cubes.api;
  const rot = (v, deg) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c]; };
  let n = 0;
  // Finds the turn (and flip) that puts a piece exactly on a polygon.
  function place(tool, k, poly) {
    const SH = TOOL[tool].api.SH, steps = tool === 'tangram' ? 8 : 12;
    const cx = poly.reduce((a, q) => a + q[0], 0) / poly.length, cy = poly.reduce((a, q) => a + q[1], 0) / poly.length;
    for (const f of tool === 'tangram' ? [false, true] : [false]) {
      for (let i = 0; i < steps; i++) {
        const r = (i * 360) / steps;
        const vs = SH[k].map(v => rot([f ? -v[0] : v[0], v[1]], r)).map(q => [q[0] + cx, q[1] + cy]);
        if (vs.length === poly.length && poly.every(p => vs.some(q => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1))) return { id: 'p' + n++, k, r, f, x: cx, y: cy };
      }
    }
    throw new Error(`no fit for ${tool} ${k}`);
  }
  const target = id => TASK[id].setup().target;
  const tiles = (den, cnt, y) => Array.from({ length: cnt }, (_, j) => ({ id: `t${den}_${y}_${j}`, k: 'f', d: den, x: -200 + 400 / den * (j + 0.5), y, r: 0 }));
  const fr = (...rows) => ({ pieces: rows.flat(), lbl: 'frac', ink: [] });
  const nl = (preset, marks, jumps) => ({ preset, marks, jumps, hide: false, ink: [] });
  const gb = (...bands) => ({ n: 7, fill: true, ink: [], bands: bands.map((p, i) => ({ c: i, p })) });
  const ck = m => ({ m, mins: true, snap5: false, ink: [] });
  const am = (a, b) => ({ a, b, split: true, grid: true, all: false, rev: [], ink: [] });
  const hc = nums => ({ start: 1, marks: Object.fromEntries(nums.map(x => [x, 0])), color: 0, hide: false, ink: [] });
  const ba = (L, R, sec = { c: 4, s: 7, t: 3 }) => ({ L, R, sec, pan: 'L', reveal: false, ink: [] });
  const tf = (...counts) => ({ pieces: counts.map((c, i) => ({ id: 'f' + i, k: 'f10', x: 0, y: -70 + i * 140, r: 0, cells: Array.from({ length: 10 }, (_, j) => (j < c ? 'r' : null)) })), ink: [] });
  const range = (a, b, st = 1) => { const o = []; for (let x = a; x <= b; x += st) o.push(x); return o; };
  const isPrime = x => { if (x < 2) return false; for (let k = 2; k * k <= x; k++) if (x % k === 0) return false; return true; };
  const pb = (pieces, id) => ({ pieces, target: target(id), ink: [] });
  const tg = (pieces, id) => ({ pieces, target: target(id), ink: [] });

  // Pattern block shapes
  const h = 50 * Math.sqrt(3) / 2;
  const tris = Array.from({ length: 6 }, (_, k) => { const c = rot([25, h / 3], 60 * k); return { id: 'tr' + k, k: 'tri', x: c[0] + 37, y: c[1] - 11, r: (180 + 60 * k) % 360 }; });
  const P = (r, a) => [r * Math.cos(a * Math.PI / 180), r * Math.sin(a * Math.PI / 180)];
  const bl = [-50, 28.87], br = [50, 28.87], top = [0, -57.74], ml = [-25, -14.43], mr = [25, -14.43], mb = [0, 28.87];
  const bigTri = [place('pattern-blocks', 'tri', [bl, mb, ml]), place('pattern-blocks', 'tri', [mb, br, mr]), place('pattern-blocks', 'tri', [ml, mr, top]), place('pattern-blocks', 'tri', [ml, mr, mb])];
  const hex0 = { id: 'hx', k: 'hex', x: 0, y: 0, r: 0 };
  const ring = range(0, 5).map(k => place('pattern-blocks', 'trap', [P(50, 60 * k), P(50, 60 * k + 60), P(100, 60 * k + 60), P(100, 60 * k)]));
  const points = range(0, 5).map(k => place('pattern-blocks', 'tri', [P(50, 60 * k), P(50, 60 * k + 60), P(86.6, 60 * k + 30)]));

  // Tangram shapes
  const sq = TOOL.tangram.init().pieces; // the solved 7-piece square, centered
  const half = sq.filter(p => p.k !== 'lt').map(p => ({ ...p, x: p.x - 26.67, y: p.y - 26.67 }));
  const a = 28.28, A = 56.57;
  const smallSq = [place('tangram', 'st', [[-a, -a], [a, -a], [a, a]]), place('tangram', 'st', [[-a, -a], [a, a], [-a, a]])];
  const para = [place('tangram', 'st', [[-60, 20], [-20, -20], [20, 20]]), place('tangram', 'st', [[-20, -20], [60, -20], [20, 20]])];
  const med = [place('tangram', 'st', [[26.67, -53.33], [26.67, 26.67], [-13.33, -13.33]]), place('tangram', 'st', [[26.67, 26.67], [-53.33, 26.67], [-13.33, -13.33]])];
  const bigSq = [place('tangram', 'lt', [[-A, -A], [A, -A], [A, A]]), place('tangram', 'lt', [[-A, -A], [A, A], [-A, A]])];

  const solved = {
    // base ten
    'pv-347': [B.build({ h: 3, t: 4, o: 7 })], 'pv-trade': [B.build({ t: 7, o: 3 })], 'pv-14tens': [B.build({ h: 2, t: 14, o: 7 })],
    'pv-3x24': [B.build({ t: 7, o: 2 })], 'dv-84': [B.build({ t: 8, o: 4 }), '21'], 'dec-136': [B.build({ h: 1, t: 3, o: 6 }, true)],
    'dec-060': [B.build({ t: 5, o: 10 }, true)], 'dec-cmp': [B.build({}, true), 0], 'bt-999': [B.build({}), 2], 'bt-ten': [B.build({}), 0],
    // fractions
    'fr-34': [fr(tiles(4, 3, 0), tiles(8, 6, 40))], 'fr-mixed': [fr(tiles(4, 7, 0)), '7'], 'fr-23': [fr(tiles(3, 2, 0), tiles(6, 4, 40)), '4'],
    'fr-cmp': [fr(tiles(5, 3, 0), tiles(3, 2, 40)), 1], 'fr-add': [fr(tiles(5, 6, 0)), '1 1/5'], 'fr-sub': [fr(tiles(8, 5, 0)), '5/8'],
    'fr-close': [fr(), 4], 'fr-half': [fr(), 3],
    // pattern blocks
    'pb-tri': [pb(bigTri, 'pb-tri')], 'pb-hex7': [pb([hex0, ...ring], 'pb-hex7')], 'pb-star': [pb([hex0, ...points], 'pb-star'), '6'],
    'pb-213': [{ pieces: [{ id: 'a', k: 'hex', x: 0, y: 0, r: 0 }, { id: 'b', k: 'trap', x: 200, y: 0, r: 0 }, { id: 'c', k: 'trap', x: 320, y: 0, r: 0 }, { id: 'd', k: 'rhomb', x: 440, y: 0, r: 0 }], ink: [] }],
    'pb-60': [{ pieces: tris, ink: [] }, 2],
    // number line
    'nl-74': [nl('fourths', [7], [])], 'nl-34x2': [nl('fourths', [], [{ a: 0, b: 3 }, { a: 3, b: 6 }]), '1 1/2'], 'nl-dec': [nl('tenths', [3], [{ a: 3, b: 8 }]), '0.5'],
    'nl-back': [nl('eighths', [], [{ a: 8, b: 5 }]), '5/8'], 'nl-neg': [nl('neg', [], [{ a: 3, b: -4 }]), '-4'], 'nl-meet': [nl('0-20', [], []), 1],
    // area model
    'am-4x36': [am(4, 36), '144'], 'am-3x245': [am(3, 245), '735'], 'am-23x14': [am(23, 14), '322'], 'am-32x21': [am(32, 21), '672'], 'am-99x25': [am(99, 25), '2475'],
    // hundred chart
    'hc-5s': [hc(range(5, 100, 5))], 'hc-4s': [hc(range(4, 100, 4))], 'hc-sum10': [hc([19, 28, 37, 46, 55, 64, 73, 82, 91])], 'hc-squares': [hc([1, 4, 9, 16, 25, 36, 49, 64, 81, 100])],
    'hc-primes': [hc(range(2, 49).filter(isPrime))], 'hc-sevens': [hc(range(1, 100).filter(x => String(x).includes('7'))), '19'], 'hc-4and6': [hc(range(12, 96, 12)), '12'],
    // balance
    'ba-ten': [ba(['w10'], ['w2', 'w2', 'w2', 'w2', 'w2'])], 'ba-circle': [ba(['c'], ['w5', 'w1'], { c: 6, s: 7, t: 3 }), '6'], 'ba-compare': [ba([], [], { c: 4, s: 5, t: 3 }), 0],
    'ba-fewest': [ba(['t', 't', 't'], ['w10', 'w2'], { c: 5, s: 7, t: 4 })], 'ba-sum': [ba([], []), 2], 'ba-chain': [ba([], [], { c: 6, s: 4, t: 2 }), 3],
    // geoboard
    'ap-12': [gb([[0, 0], [4, 0], [4, 3], [0, 3]])], 'ap-sq16': [gb([[0, 0], [4, 0], [4, 4], [0, 4]])], 'ap-12-14': [gb([[0, 0], [4, 0], [4, 3], [0, 3]])],
    'ap-6-two': [gb([[0, 0], [6, 0], [6, 1], [0, 1]], [[0, 2], [3, 2], [3, 4], [0, 4]])], 'ap-tri6': [gb([[0, 0], [0, 3], [4, 3]])],
    'gb-sq2': [gb([[1, 0], [2, 1], [1, 2], [0, 1]])], 'gb-sq5': [gb([[2, 0], [3, 2], [1, 3], [0, 1]])],
    // clock
    'tm-845': [ck(525)], 'tm-35': [ck(255)], 'tm-100': [ck(655)], 'tm-game': [ck(15)], 'ck-330': [ck(210), 1],
    // cubes
    'cu-tower': [CU.build(5, [[2, 2, 5]])], 'cu-2x2': [CU.build(5, [[1, 1, 2], [2, 1, 2], [1, 2, 2], [2, 2, 2]])], 'cu-count': [CU.build(5, []), 3],
    'cu-27': [CU.build(5, [1, 2, 3].flatMap(i => [1, 2, 3].map(j => [i, j, 3])))], 'cu-more': [CU.build(5, []), 2], 'cu-paint': [CU.build(5, []), 1],
    // tangram
    'tg-sq2': [tg(smallSq, 'tg-sq2')], 'tg-pa': [tg(para, 'tg-pa')], 'tg-mt': [tg(med, 'tg-mt')], 'tg-sq2lt': [tg(bigSq, 'tg-sq2lt')],
    'tg-tri5': [tg(half, 'tg-tri5')], 'tg-sq7': [tg(sq, 'tg-sq7')],
    // ten frames, algebra tiles
    'tf-make10': [tf(10), '3'], 'tf-8p5': [tf(10, 3), '13'], 'at-zero': [{ pieces: [], mat: false, ink: [] }, 0], 'at-solve': [{ pieces: [], mat: true, ink: [] }, '3'],
    // contest style: only the answer counts (choice index or typed answer)
    ...Object.fromEntries(Object.entries({
      'kg-ones': 2, 'kg-blocks15': 3, 'kg-stairs': 3, 'kg-clock100': 0, 'kg-fruit': 2, 'kg-squares14': 4, 'kg-pizza': 2, 'kg-tangram8': 2, 'kg-legs': 1, 'kg-path': 3,
      'mo-consec': '26', 'mo-think': '12', 'mo-frac': '24', 'mo-shake': '15', 'mo-pages': '71', 'mo-rem': '13', 'mo-ages': '10', 'mo-rect': '21', 'mo-coins': '5',
      'mo-paint4': '24', 'mo-seq': '110', 'mo-digits3': '6', 'mo-hour': '70',
      'no-take': '889', 'no-share': '28', 'no-sum1': '8/8', 'no-square28': '49', 'no-circles': '6', 'no-box': '24', 'no-rhombs': '12', 'no-box10': '5', 'no-mult': 2,
      'no-sevens': '101', 'no-movie': '8:35 pm', 'no-twentieth': '81', 'no-25x44': '1100', 'no-odd': '100', 'no-half': '60', 'no-ways': '10', 'no-digits5': '6',
    }).map(([id, a]) => [id, [TASK[id].setup(), a]])),
  };
  const near = {
    'pv-347': [B.build({ h: 2, t: 14, o: 7 })], 'fr-cmp': [fr(tiles(5, 3, 0)), 1], 'nl-34x2': [nl('fourths', [], [{ a: 0, b: 6 }]), '6/4'],
    'ap-12-14': [gb([[0, 0], [6, 0], [6, 2], [0, 2]])], 'tm-845': [ck(45)], 'pb-60': [{ pieces: tris.slice(0, 5), ink: [] }, 2],
    'pb-tri': [pb(bigTri.slice(0, 3), 'pb-tri')], 'pb-hex7': [pb([hex0, ...ring.slice(0, 5)], 'pb-hex7')], 'pb-star': [pb([hex0, ...points], 'pb-star'), '7'],
    'tg-sq7': [tg(sq.map((p, i) => (i ? p : { ...p, x: p.x + 40 })), 'tg-sq7')], 'tg-sq2': [tg([smallSq[0]], 'tg-sq2')],
    'hc-primes': [hc(range(1, 49).filter(x => x === 1 || isPrime(x)))], 'hc-sevens': [hc(range(1, 100).filter(x => String(x).includes('7'))), '20'],
    'ba-fewest': [ba(['t', 't', 't'], ['w5', 'w5', 'w2'], { c: 5, s: 7, t: 4 })], 'ba-ten': [ba(['w10'], ['w5', 'w5'])],
    'cu-27': [CU.build(5, [1, 2, 3].flatMap(i => [1, 2, 3].map(j => [i, j, 2])))], 'cu-2x2': [CU.build(5, [[1, 1, 2], [2, 1, 2], [1, 2, 2], [3, 2, 2]])],
    'gb-sq5': [gb([[0, 0], [2, 0], [2, 2], [0, 2]])], 'tf-8p5': [tf(8, 5), '13'], 'ck-330': [ck(200), 1], 'nl-neg': [nl('neg', [], [{ a: 3, b: -4 }]), '4'],
    'kg-path': [TASK['kg-path'].setup(), 2], 'mo-pages': [TASK['mo-pages'].setup(), '62'], 'no-movie': [TASK['no-movie'].setup(), '8:25'],
    'mo-paint4': [TASK['mo-paint4'].setup(), '8'], 'no-sum1': [TASK['no-sum1'].setup(), '7/8'], 'kg-legs': [TASK['kg-legs'].setup(), 2],
  };
  return { solved, near };
};

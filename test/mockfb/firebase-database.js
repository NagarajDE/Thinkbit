// In-browser stand-in for the Realtime Database API surface the app uses (shared across pages via BroadcastChannel).
const KEY = 'mockfb', ch = new BroadcastChannel('mockfb'), listeners = new Set();
let tree = null; // this page's copy; other pages send their writes over the channel
const load = () => { if (!tree) { try { tree = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { tree = {}; } } return tree; };
const save = t => localStorage.setItem(KEY, JSON.stringify(t));
const parts = p => p.split('/').filter(Boolean);
function getAt(t, p) { let n = t; for (const k of parts(p)) { if (n == null || typeof n !== 'object') return null; n = n[k]; } return n === undefined ? null : n; }
function setAt(t, p, v) { const ks = parts(p); let n = t; for (let i = 0; i < ks.length - 1; i++) { if (n[ks[i]] == null || typeof n[ks[i]] !== 'object') n[ks[i]] = {}; n = n[ks[i]]; } if (v === null) delete n[ks[ks.length - 1]]; else n[ks[ks.length - 1]] = v; }
const ts = v => (v && typeof v === 'object') ? (v['.sv'] === 'timestamp' ? Date.now() : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, ts(x)]))) : v;
function fire(l) {
  let v = l.path === '.info/connected' ? true : getAt(load(), l.path);
  if (l.last && v && typeof v === 'object') { const ks = Object.keys(v).sort().slice(-l.last); v = Object.fromEntries(ks.map(k => [k, v[k]])); }
  const s = JSON.stringify(v); if (s === l.s) return; l.s = s;
  l.cb({ val: () => (s === undefined ? null : JSON.parse(s)) });
}
const notify = () => listeners.forEach(fire);
ch.onmessage = e => { setAt(load(), e.data.p, e.data.v); notify(); };
function perm(r) {
  if (!r.db.app._auth || !r.db.app._auth.currentUser || !/^rooms\/[a-z0-9]{24}\//.test(r.path + '/')) { const e = new Error('Permission denied'); e.code = 'PERMISSION_DENIED'; throw e; }
  if (r.path.includes('undefined')) throw new Error('bad path ' + r.path);
}
export function getDatabase(app, url) { if (url && !/^https:\/\/[\w.-]+(firebaseio\.com|firebasedatabase\.app)\/?$/.test(url)) throw new Error('FIREBASE FATAL ERROR: Cannot parse Firebase url.'); return { app, url }; }
export const ref = (db, path) => ({ db, path });
export const query = (r, ...cs) => Object.assign({ ...r }, ...cs);
export const limitToLast = n => ({ last: n });
export const serverTimestamp = () => ({ '.sv': 'timestamp' });
export async function set(r, v) {
  perm(r);
  if (v === undefined) throw new Error('set failed: value argument contains undefined');
  const json = JSON.stringify(v); if (/:undefined/.test(json)) throw new Error('undefined in value');
  const v2 = ts(JSON.parse(json)), t = load(); setAt(t, r.path, v2); save(t); ch.postMessage({ p: r.path, v: v2 }); notify();
}
export function push(r, v) { const key = '-M' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); const p = set({ db: r.db, path: r.path + '/' + key }, v); p.key = key; return p; }
export async function get(r) { perm(r); const v = getAt(load(), r.path); return { val: () => v }; }
export function onValue(q, cb) { const l = { path: q.path, cb, last: q.last }; listeners.add(l); setTimeout(() => fire(l), 0); return () => listeners.delete(l); }
export function onDisconnect(r) { return { set: async v => { addEventListener('pagehide', () => { const v2 = ts(v), t = load(); setAt(t, r.path, v2); save(t); ch.postMessage({ p: r.path, v: v2 }); }); } }; }

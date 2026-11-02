const apps = [];
export function initializeApp(options, name = '[DEFAULT]') {
  if (apps.find(a => a.name === name)) throw new Error('duplicate-app');
  const a = { name, options }; apps.push(a); return a;
}
export function getApps() { return apps.slice(); }

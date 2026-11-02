export function getAuth(app) { return app._auth || (app._auth = { currentUser: null, app }); }
export async function signInAnonymously(auth) {
  if (auth.app.options.apiKey === 'no-anon') { const e = new Error('Firebase: Error (auth/admin-restricted-operation).'); e.code = 'auth/admin-restricted-operation'; throw e; }
  auth.currentUser = { uid: 'u' + Math.random().toString(36).slice(2) };
  return { user: auth.currentUser };
}

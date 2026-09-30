const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, imports = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => imports[name], Headers, Error, Date, Promise, Set });
  return module.exports;
}
const { SessionManager } = load('auth/session-manager.ts');
const NOW = Date.parse('2026-10-01T10:00:00Z');
const session = (accessToken = 'old', refreshToken = 'refresh-old', expired = true) => ({ accessToken, refreshToken, accessTokenExpiresAtUtc: new Date(NOW + (expired ? -1 : 900000)).toISOString(), userId: 'user', fullName: 'User', username: 'user', role: 3 });
function setup(overrides = {}) {
  const state = { stored: session(), saves: 0, clears: 0, refreshes: 0, revocations: [] };
  const dependencies = {
    load: async () => state.stored,
    save: async value => { state.saves++; state.stored = value; },
    clear: async () => { state.clears++; state.stored = null; },
    refresh: async () => { state.refreshes++; return session('new', 'refresh-new', false); },
    revoke: async token => { state.revocations.push(token); },
    invalid: error => error.status === 401,
    now: () => NOW,
    ...overrides,
  };
  return { manager: new SessionManager(dependencies), state };
}
test('expired login refreshes automatically and persists rotated credentials', async () => {
  const { manager, state } = setup();
  assert.equal(await manager.accessToken(), 'new');
  assert.equal(state.stored.refreshToken, 'refresh-new');
  assert.equal(state.saves, 1);
});
test('concurrent requests perform only one refresh', async () => {
  const { manager, state } = setup();
  const tokens = await Promise.all(Array.from({ length: 20 }, () => manager.accessToken()));
  assert.ok(tokens.every(token => token === 'new'));
  assert.equal(state.refreshes, 1);
});
test('a delayed 401 from the old token reuses the new token', async () => {
  const { manager, state } = setup();
  await manager.accessToken();
  assert.equal(await manager.accessToken('old'), 'new');
  assert.equal(state.refreshes, 1);
});
test('offline refresh preserves the saved login and recovery works', async () => {
  let offline = true;
  const { manager, state } = setup({ refresh: async () => { if (offline) throw new Error('offline'); return session('new', 'refresh-new', false); } });
  await assert.rejects(manager.accessToken(), /offline/);
  assert.equal(state.clears, 0);
  assert.equal(state.stored.refreshToken, 'refresh-old');
  offline = false;
  assert.equal(await manager.accessToken(), 'new');
});
test('a revoked refresh token clears the session', async () => {
  const { manager, state } = setup({ refresh: async () => { throw Object.assign(new Error('revoked'), { status: 401 }); } });
  await assert.rejects(manager.accessToken(), /revoked/);
  assert.equal(state.clears, 1);
  assert.equal(await manager.accessToken(), null);
});
test('logout during refresh cannot restore login and revokes the rotated token', async () => {
  let resolveRefresh;
  const { manager, state } = setup({ refresh: () => new Promise(resolve => { resolveRefresh = resolve; }) });
  const refresh = manager.accessToken();
  while (!resolveRefresh) await new Promise(resolve => setImmediate(resolve));
  const logout = manager.signOut();
  await new Promise(resolve => setImmediate(resolve));
  resolveRefresh(session('new', 'refresh-new', false));
  await logout;
  assert.equal(await refresh, null);
  assert.equal(state.stored, null);
  assert.deepEqual(state.revocations, ['refresh-new']);
});
test('switching login cannot reuse the previous users pending refresh', async () => {
  let resolveOld;
  let calls = 0;
  const { manager } = setup({ refresh: () => ++calls === 1 ? new Promise(resolve => { resolveOld = resolve; }) : Promise.resolve(session('user2-new', 'user2-refresh', false)) });
  const first = manager.accessToken();
  while (!resolveOld) await new Promise(resolve => setImmediate(resolve));
  await manager.accept(session('user2', 'user2-refresh'));
  assert.equal(await manager.accessToken(), 'user2-new');
  resolveOld(session('user1-new', 'user1-refresh', false));
  assert.equal(await first, null);
});
test('valid access token does not need a network refresh', async () => {
  const { manager, state } = setup({ load: async () => session('valid', 'refresh', false) });
  assert.equal(await manager.accessToken(), 'valid');
  assert.equal(state.refreshes, 0);
});
function fetchClient(manager, fetch) {
  return load('api/authenticated-fetch.ts', { 'expo/fetch': { fetch }, '../auth/app-session': { appSession: manager } }).authenticatedFetch;
}
test('a 401 retries once using the refreshed bearer token', async () => {
  const { manager } = setup({ load: async () => session('valid', 'refresh', false) });
  const calls = [];
  const fetch = fetchClient(manager, async (_url, options) => { calls.push(options.headers.get('Authorization')); return { status: calls.length === 1 ? 401 : 200 }; });
  const response = await fetch('https://example.test', { headers: { Authorization: 'Bearer old' }, method: 'POST', body: '{"amount":100}' });
  assert.equal(response.status, 200);
  assert.deepEqual(calls, ['Bearer valid', 'Bearer new']);
});
test('network failure never retries a financial write', async () => {
  const { manager } = setup(); let calls = 0;
  const fetch = fetchClient(manager, async () => { calls++; throw new Error('offline'); });
  await assert.rejects(fetch('https://example.test', { method: 'POST', headers: { Authorization: 'Bearer old' } }), /offline/);
  assert.equal(calls, 1);
});
test('403 is returned without refreshing or replaying', async () => {
  const { manager, state } = setup({ load: async () => session('valid', 'refresh', false) }); let calls = 0;
  const fetch = fetchClient(manager, async () => { calls++; return { status: 403 }; });
  assert.equal((await fetch('https://example.test', { headers: { Authorization: 'Bearer old' } })).status, 403);
  assert.equal(calls, 1); assert.equal(state.refreshes, 0);
});

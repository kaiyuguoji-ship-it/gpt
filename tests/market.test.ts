import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import handler from '../server/index.ts';
import { emptyBrief, missingConditions, statusForBrief, suggestBrief, validateBrief } from '../lib/market.ts';
import type { Database, Env, Statement } from '../server/types.ts';
import { authenticated, sessionCookie } from '../server/auth.ts';

const complete = { ...emptyBrief, budgetCny: 100000, targetCount: 5, marketplace: 'US', fulfillment: 'FBA', allocation: 'alternatives', budgetScope: 'all_in' };
function setup() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../migrations/0001_market_research.sql', import.meta.url), 'utf8'));
  const database: Database = {
    prepare(sql) {
      let args: unknown[] = [];
      const s: Statement = {
        bind(...values) { args = values; return s; },
        async first<T>() { return (sqlite.prepare(sql).get(...args as (string | number | null)[]) ?? null) as T | null; },
        async all<T>() { return { results: sqlite.prepare(sql).all(...args as (string | number | null)[]) as T[] }; },
        async run() { return { meta: { changes: Number(sqlite.prepare(sql).run(...args as (string | number | null)[]).changes) } }; },
      }; return s;
    },
    async batch(statements) { sqlite.exec('BEGIN'); try { const result = []; for (const s of statements) result.push(await s.run()); sqlite.exec('COMMIT'); return result; } catch (e) { sqlite.exec('ROLLBACK'); throw e; } },
  };
  const env: Env = { DB: database, WORKSPACE_ACCESS_KEY: 'test-only-secret-at-least-32-characters', ASSETS: { fetch: async () => new Response('static asset') } };
  let cookie = '';
  async function request(path: string, method = 'GET', data?: unknown, headers: Record<string,string> = {}) {
    return handler.fetch(new Request(`http://localhost${path}`, { method, headers: { 'Content-Type': 'application/json', Origin: 'http://localhost', Cookie: cookie, ...headers }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) }), env);
  }
  async function login() { const r = await request('/api/session', 'POST', { key: env.WORKSPACE_ACCESS_KEY }); cookie = r.headers.get('Set-Cookie')!.split(';')[0]; return r; }
  return { env, request, login, close: () => sqlite.close() };
}

test('extracts the actual user example without guessing country or allocation', () => {
  assert.deepEqual(suggestBrief('我现在有10w人民币初始资金，请帮我筛选5个可以进场的小类目节点'), { budgetCny: 100000, targetCount: 5 });
  assert.deepEqual(suggestBrief('我有10万人民币，帮我筛选5个市场'), { budgetCny: 100000, targetCount: 5 });
  assert.deepEqual(suggestBrief('研究10万个商品'), {});
});
test('requires all consequential conditions; never marks a task running', () => {
  assert.equal(missingConditions(emptyBrief).length, 6);
  assert.equal(statusForBrief(emptyBrief), 'needs_clarification');
  assert.equal(statusForBrief(validateBrief(complete)), 'blocked_configuration');
});
test('rejects invalid numeric and enum conditions', () => {
  for (const bad of [{ budgetCny: -1 }, { budgetCny: Infinity }, { targetCount: 2.5 }, { targetCount: 21 }, { marketplace: 'invented' }, { allocation: 'guess' }, { exclusions: 'a'.repeat(1001) }]) assert.throws(() => validateBrief({ ...complete, ...bad }));
});
test('session cannot be forged and has secure cookie flags', async () => {
  const cookie = await sessionCookie('test-key', true);
  assert.match(cookie, /HttpOnly; SameSite=Strict/); assert.match(cookie, /Secure/);
  assert.equal(await authenticated(new Request('https://example.com', { headers: { Cookie: cookie.split(';')[0] } }), 'different-key'), false);
  assert.equal(await authenticated(new Request('https://example.com', { headers: { Cookie: cookie.split(';')[0] } }), 'test-key'), true);
});
test('static pages continue to work without backend configuration', async () => {
  const f = setup(); delete f.env.DB; delete f.env.WORKSPACE_ACCESS_KEY;
  assert.equal(await (await f.request('/centers/1/')).text(), 'static asset');
  assert.equal((await f.request('/api/research/tasks')).status, 503); f.close();
});
test('requires authentication and rejects cross-origin writes', async () => {
  const f = setup();
  assert.equal((await f.request('/api/research/tasks')).status, 401);
  assert.equal((await f.request('/api/session', 'POST', { key: f.env.WORKSPACE_ACCESS_KEY }, { Origin: 'https://attacker.example' })).status, 403);
  assert.equal((await f.request('/api/session', 'POST', { key: 'incorrect' })).status, 401);
  assert.equal((await f.login()).status, 200); f.close();
});
test('creates, persists, clarifies, audits and cancels a task', async () => {
  const f = setup(); await f.login();
  const created = await f.request('/api/research/tasks', 'POST', { prompt: '我有10万元，寻找5个候选市场', brief: emptyBrief }, { 'Idempotency-Key': crypto.randomUUID() });
  assert.equal(created.status, 201); const { task } = await created.json() as { task: { id: string; status: string } };
  assert.equal(task.status, 'needs_clarification');
  assert.equal((await f.request(`/api/research/tasks/${task.id}/run`, 'POST', {})).status, 409);
  const updated = await f.request(`/api/research/tasks/${task.id}`, 'PATCH', { version: 1, brief: complete }); assert.equal(updated.status, 200);
  const detail = await (await f.request(`/api/research/tasks/${task.id}`)).json() as { task: { status: string }; candidates: unknown[]; events: unknown[]; plan: unknown[] };
  assert.equal(detail.task.status, 'blocked_configuration'); assert.equal(detail.events.length, 2); assert.equal(detail.plan.length, 6); assert.deepEqual(detail.candidates, []);
  assert.equal((await f.request(`/api/research/tasks/${task.id}`, 'PATCH', { version: 1, brief: complete })).status, 409);
  assert.equal((await f.request(`/api/research/tasks/${task.id}/cancel`, 'POST', { version: 2 })).status, 200);
  assert.equal((await f.request(`/api/research/tasks/${task.id}`, 'PATCH', { version: 3, brief: complete })).status, 409);
  const tasks = await (await f.request('/api/research/tasks')).json() as { tasks: unknown[] }; assert.equal(tasks.tasks.length, 1); f.close();
});
test('retrying an identical request does not duplicate tasks or audit records', async () => {
  const f = setup(); await f.login(); const key = crypto.randomUUID();
  const data = { prompt: '研究美国市场候选类目', brief: complete };
  const a = await (await f.request('/api/research/tasks','POST',data,{'Idempotency-Key':key})).json() as { task: { id: string } };
  const b = await (await f.request('/api/research/tasks','POST',data,{'Idempotency-Key':key})).json() as { task: { id: string } };
  assert.equal(a.task.id, b.task.id);
  const detail = await (await f.request(`/api/research/tasks/${a.task.id}`)).json() as { events: unknown[] }; assert.equal(detail.events.length, 1);
  assert.equal((await f.request('/api/research/tasks','POST',{ ...data, prompt: '修改后的研究需求' },{'Idempotency-Key':key})).status,409); f.close();
});
test('empty, oversized and malformed requests fail cleanly', async () => {
  const f = setup(); await f.login();
  assert.equal((await f.request('/api/research/tasks','POST',{prompt:'x',brief:complete},{'Idempotency-Key':crypto.randomUUID()})).status,400);
  assert.equal((await f.request('/api/research/tasks','POST',{prompt:'x'.repeat(17000),brief:complete},{'Idempotency-Key':crypto.randomUUID()})).status,413);
  assert.equal((await f.request('/api/research/tasks','POST',{prompt:'valid prompt',brief:complete})).status,400); f.close();
});
test('unbound storage is explicit and cannot pretend a task was saved', async () => {
  const f = setup(); await f.login(); delete f.env.DB;
  const result = await f.request('/api/research/tasks', 'POST', { prompt:'research task',brief:complete }); assert.equal(result.status,503); f.close();
});

test('health verifies migrated storage rather than just the binding', async () => {
  const f = setup();
  assert.equal((await (await f.request('/api/health')).json() as { storage: boolean }).storage, true);
  f.env.DB = { prepare() { throw new Error('missing table'); }, batch: async () => [] };
  assert.equal((await (await f.request('/api/health')).json() as { storage: boolean }).storage, false); f.close();
});

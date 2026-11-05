import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import handler from '../apps/api/src/index.ts';
import { processNextJob } from '../apps/api/src/admin.ts';
import { emptyBrief, missingConditions, statusForBrief, suggestBrief, validateBrief } from '../packages/shared/market.ts';
import type { Database, Env, Statement } from '../apps/api/src/types.ts';
import { authenticated, sessionCookie } from '../apps/api/src/auth.ts';

const complete = { ...emptyBrief, budgetCny: 100000, targetCount: 5, marketplace: 'US', fulfillment: 'FBA', allocation: 'alternatives', budgetScope: 'all_in' };
function setup() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../apps/api/migrations/0001_market_research.sql', import.meta.url), 'utf8'));
  sqlite.exec(readFileSync(new URL('../apps/api/migrations/0002_admin.sql', import.meta.url), 'utf8'));
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
  const env: Env = { DB: database, WORKSPACE_ACCESS_KEY: 'test-only-secret-at-least-32-characters', ADMIN_ACCESS_KEY: 'test-admin-secret-at-least-32-characters' };
  let cookie = '';
  async function request(path: string, method = 'GET', data?: unknown, headers: Record<string,string> = {}) {
    return handler.fetch(new Request(`http://localhost${path}`, { method, headers: { 'Content-Type': 'application/json', Origin: 'http://localhost', Cookie: cookie, ...headers }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) }), env);
  }
  async function login(admin = true) { const r = await request('/api/session', 'POST', { key: env.WORKSPACE_ACCESS_KEY }); cookie = r.headers.get('Set-Cookie')!.split(';')[0]; if(admin) { const a=await request('/api/admin/session','POST',{key:env.ADMIN_ACCESS_KEY}); cookie += '; '+a.headers.get('Set-Cookie')!.split(';')[0]; } return r; }
  return { env, request, login, sqlite, close: () => sqlite.close() };
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
test('API no longer serves frontend assets', async () => {
  const f = setup(); delete f.env.DB; delete f.env.WORKSPACE_ACCESS_KEY;
  assert.equal((await f.request('/centers/1/')).status, 404);
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


test('admin data requires a session and supports persisted versioned settings', async () => {
 const f=setup(); assert.equal((await f.request('/api/admin/overview')).status,401); await f.login();
 const get=await (await f.request('/api/admin/overview')).json() as {settings:{version:number}};
 const data={name:'测试工作区',acceptingTasks:false,queueEnabled:false,version:get.settings.version};
 assert.equal((await f.request('/api/admin/settings','PATCH',data)).status,200);
 assert.equal((await f.request('/api/admin/settings','PATCH',data)).status,409);
 assert.equal((await f.request('/api/research/tasks','POST',{prompt:'测试暂停接收任务',brief:complete},{'Idempotency-Key':crypto.randomUUID()})).status,409);
 assert.equal((await f.request('/api/admin/jobs','POST',{})).status,409);
 const logs=await (await f.request('/api/admin/logs')).json() as {events:unknown[]};assert.equal(logs.events.length,1);f.close();
});
test('diagnostic jobs execute once and expose actual results, not research output',async()=>{
 const f=setup();await f.login();
 const created=await f.request('/api/admin/jobs','POST',{});assert.equal(created.status,201);
 assert.equal((await f.request('/api/admin/jobs/process','POST',{})).status,200);
 const list=await (await f.request('/api/admin/jobs')).json() as {jobs:{status:string;attempts:number;result_json:string}[]};
 assert.equal(list.jobs[0].status,'succeeded');assert.equal(list.jobs[0].attempts,1);assert.equal(JSON.parse(list.jobs[0].result_json).researchTasks,0);
 const second=await (await f.request('/api/admin/jobs/process','POST',{})).json() as {processed:boolean};assert.equal(second.processed,false);f.close();
});
test('queued cancellation prevents execution and queue size is bounded',async()=>{
 const f=setup();await f.login();
 const {id}=await (await f.request('/api/admin/jobs','POST',{})).json() as {id:string};
 assert.equal((await f.request(`/api/admin/jobs/${id}/cancel`,'POST',{})).status,200);
 assert.equal((await (await f.request('/api/admin/jobs/process','POST',{})).json() as {processed:boolean}).processed,false);
 for(let i=0;i<10;i++)assert.equal((await f.request('/api/admin/jobs','POST',{})).status,201);
 assert.equal((await f.request('/api/admin/jobs','POST',{})).status,429);f.close();
});
test('expired leases recover and capped jobs stop retrying',async()=>{
 const f=setup();await f.login();
 const {id}=await (await f.request('/api/admin/jobs','POST',{})).json() as {id:string};
 f.sqlite.prepare("UPDATE background_jobs SET status='running',attempts=1,lease_until=1,lease_token='old' WHERE id=?").run(id);
 await processNextJob(f.env.DB!);
 assert.equal((f.sqlite.prepare('SELECT status FROM background_jobs WHERE id=?').get(id) as {status:string}).status,'succeeded');
 f.sqlite.prepare("UPDATE background_jobs SET status='running',attempts=3,lease_until=1,lease_token='old' WHERE id=?").run(id);
 await processNextJob(f.env.DB!);
 assert.equal((f.sqlite.prepare('SELECT status FROM background_jobs WHERE id=?').get(id) as {status:string}).status,'failed');
 assert.equal((await f.request(`/api/admin/jobs/${id}/retry`,'POST',{})).status,200);
 f.close();
});
test('job errors are persisted with bounded retry and do not leak database details',async()=>{
 const f=setup();await f.login();await f.request('/api/admin/jobs','POST',{});
 f.sqlite.exec('DROP TABLE research_events');
 await processNextJob(f.env.DB!);
 const job=f.sqlite.prepare('SELECT * FROM background_jobs').get() as {status:string;attempts:number;last_error:string};
 assert.equal(job.status,'queued');assert.equal(job.attempts,1);assert.doesNotMatch(job.last_error,/research_events|SELECT/);f.close();
});
test('admin query validation and pagination are bounded',async()=>{
 const f=setup();await f.login();
 for(const url of ['/api/admin/tasks?page=-1','/api/admin/tasks?status=running','/api/admin/logs?page=1.5'])assert.equal((await f.request(url)).status,400);
 assert.equal((await (await f.request('/api/admin/tasks?q=%27')).json() as {total:number}).total,0);f.close();
});

 test('business credentials cannot access admin APIs or mint admin sessions', async()=>{
 const f=setup();await f.login(false);
 assert.equal((await f.request('/api/admin/overview')).status,401);
 assert.equal((await f.request('/api/admin/session','POST',{key:f.env.WORKSPACE_ACCESS_KEY})).status,401);
 assert.equal((await f.request('/api/research/tasks')).status,200);
 assert.equal((await f.request('/')).status,404);
 f.close();
 });

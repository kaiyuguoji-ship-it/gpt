import { readSettings, auditStatement, processNextJob } from './admin.ts';
import type { Job } from './admin.ts';
import { blockers, missingConditions, skills, statusForBrief, validateBrief } from '../../../packages/shared/market.ts';
import type { Brief, Task, TaskEvent, TaskStatus } from '../../../packages/shared/market.ts';
import type { Env } from './types.ts';
import { authenticated, clearAdminCookie, clearCookie, sameSecret, sessionCookie } from './auth.ts';

type Row = { id: string; prompt: string; brief_json: string; status: TaskStatus; version: number; created_at: string; updated_at: string; request_body: string };
const mapTask = (r: Row): Task => ({ id: r.id, prompt: r.prompt, brief: JSON.parse(r.brief_json) as Brief, status: r.status, version: r.version, createdAt: r.created_at, updatedAt: r.updated_at });
class HttpError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
const json = (value: unknown, status = 200, extra: Record<string, string> = {}) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra } });
async function body(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new HttpError(415, '请使用 JSON 请求');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, '请求不能为空');
  let length = 0; const chunks: Uint8Array[] = [];
  while (true) { const { done, value } = await reader.read(); if (done) break; length += value.length; if (length > 16384) { await reader.cancel(); throw new HttpError(413, '请求内容过长'); } chunks.push(value); }
  const buffer = new Uint8Array(length); let offset = 0;
  for (const c of chunks) { buffer.set(c, offset); offset += c.length; }
  try { const parsed = JSON.parse(new TextDecoder().decode(buffer)); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error(); return parsed; }
  catch { throw new HttpError(400, '请求 JSON 格式不正确'); }
}
const briefFrom = (v: unknown) => { try { return validateBrief(v); } catch (e) { throw new HttpError(400, (e as Error).message); } };
export default {
  async scheduled(_event: unknown, env: Env): Promise<void> {
    if (env.DB) await processNextJob(env.DB);
  },
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return json({ error: 'API service only' }, 404);
    try {
      if (request.method !== 'GET' && request.headers.get('Origin') !== url.origin) throw new HttpError(403, '请求来源不匹配');
      const isAdmin = url.pathname.startsWith('/api/admin/');
      const secret = isAdmin ? env.ADMIN_ACCESS_KEY : env.WORKSPACE_ACCESS_KEY;
      const configured = Boolean(secret && secret.length >= 32);
      const sessionPath = isAdmin ? '/api/admin/session' : '/api/session';
      if ((url.pathname === '/api/health' || url.pathname === '/api/admin/health') && request.method === 'GET') {
        let storage = false;
        if (env.DB) { try { await env.DB.prepare('SELECT id FROM research_tasks LIMIT 1').all(); storage = true; } catch { /* Binding alone does not prove migrations succeeded. */ } }
        return json({ backend: true, storage, accessConfigured: configured, model: false, marketData: false, runner: false });
      }
      if (!configured || !secret) throw new HttpError(503, '工作区访问密钥尚未配置，请先完成后台部署设置');
      if (url.pathname === sessionPath && request.method === 'POST') {
        const input = await body(request);
        if (typeof input.key !== 'string' || !(await sameSecret(input.key, secret))) throw new HttpError(401, '访问密钥不正确');
        return json({ authenticated: true }, 200, { 'Set-Cookie': await sessionCookie(secret, url.protocol === 'https:', isAdmin) });
      }
      if (url.pathname === sessionPath && request.method === 'DELETE') return json({ authenticated: false }, 200, { 'Set-Cookie': isAdmin ? clearAdminCookie : clearCookie });
      const adminAuthenticated = Boolean(env.ADMIN_ACCESS_KEY && env.ADMIN_ACCESS_KEY.length >= 32 && await authenticated(request, env.ADMIN_ACCESS_KEY, true));
      if (!(isAdmin ? adminAuthenticated : (adminAuthenticated || await authenticated(request, secret)))) throw new HttpError(401, '请先解锁工作区');
      if (url.pathname === sessionPath && request.method === 'GET') return json({ authenticated: true });
      if (!env.DB) throw new HttpError(503, '研究数据库尚未绑定，任务未保存');
      const db = env.DB;
      if (url.pathname === '/api/admin/overview' && request.method === 'GET') {
        const settings = await readSettings(db);
        const stats = await db.prepare('SELECT status,COUNT(*) AS count FROM research_tasks GROUP BY status').all<{status:string;count:number}>();
        const jobs = await db.prepare('SELECT status,COUNT(*) AS count FROM background_jobs GROUP BY status').all<{status:string;count:number}>();
        return json({ settings, stats: stats.results, jobs: jobs.results, serverTime: new Date().toISOString(), version: '0.2.0', capabilities: { storage: true, sessions: true, backgroundJobs: true, researchRunner: false, agent: false, mcp: false } });
      }
      if (url.pathname === '/api/admin/settings' && request.method === 'PATCH') {
        const input = await body(request);
        if (typeof input.name !== 'string' || input.name.trim().length < 1 || input.name.length > 60 || typeof input.acceptingTasks !== 'boolean' || typeof input.queueEnabled !== 'boolean' || !Number.isInteger(input.version)) throw new HttpError(400,'设置格式不正确');
        const results = await db.batch([
          db.prepare('UPDATE workspace_settings SET name=?,accepting_tasks=?,queue_enabled=?,version=version+1,updated_at=? WHERE id=1 AND version=?').bind(input.name.trim(),Number(input.acceptingTasks),Number(input.queueEnabled),new Date().toISOString(),input.version),
          auditStatement(db,'settings_updated',`更新工作区设置：接收任务=${input.acceptingTasks}，后台队列=${input.queueEnabled}`,true),
        ]) as {meta:{changes:number}}[];
        if (results[0].meta.changes !== 1) throw new HttpError(409,'设置已更新，请刷新后重试');
        return json({settings:await readSettings(db)});
      }
      if (url.pathname === '/api/admin/tasks' && request.method === 'GET') {
        const page = Number(url.searchParams.get('page') ?? 1);
        const search = (url.searchParams.get('q') ?? '').trim();
        const status = url.searchParams.get('status') ?? '';
        if (!Number.isInteger(page) || page < 1 || page > 100000 || search.length > 200 || !['','needs_clarification','blocked_configuration','cancelled'].includes(status)) throw new HttpError(400,'筛选条件无效');
        const where = "WHERE (?='' OR status=?) AND (?='' OR instr(prompt,?)>0 OR id=?)";
        const args = [status,status,search,search,search];
        const total = await db.prepare(`SELECT COUNT(*) AS count FROM research_tasks ${where}`).bind(...args).first<{count:number}>();
        const rows = await db.prepare(`SELECT * FROM research_tasks ${where} ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET ?`).bind(...args,(page-1)*20).all<Row>();
        return json({ tasks: rows.results.map(mapTask), total: total?.count ?? 0, page, pageSize:20 });
      }
      if (url.pathname === '/api/admin/logs' && request.method === 'GET') {
        const page = Number(url.searchParams.get('page') ?? 1);
        if (!Number.isInteger(page) || page < 1 || page > 100000) throw new HttpError(400,'页码无效');
        const union = "SELECT id,kind,message,created_at,task_id FROM research_events UNION ALL SELECT id,kind,message,created_at,NULL AS task_id FROM admin_events";
        const rows = await db.prepare(`SELECT * FROM (${union}) ORDER BY created_at DESC,id DESC LIMIT 30 OFFSET ?`).bind((page-1)*30).all();
        const total = await db.prepare(`SELECT COUNT(*) AS count FROM (${union})`).first<{count:number}>();
        return json({events:rows.results,total:total?.count ?? 0,page,pageSize:30});
      }
      if (url.pathname === '/api/admin/jobs' && request.method === 'GET') {
        return json({jobs:(await db.prepare('SELECT * FROM background_jobs ORDER BY created_at DESC,id DESC LIMIT 50').all<Job>()).results});
      }
      if (url.pathname === '/api/admin/jobs' && request.method === 'POST') {
        if (!(await readSettings(db)).queue_enabled) throw new HttpError(409,'后台队列已暂停');
        const id=crypto.randomUUID(), now=new Date().toISOString();
        // Bound pending diagnostic jobs, even if concurrent submissions occur.
        const results=await db.batch([
          db.prepare("INSERT INTO background_jobs(id,kind,status,available_at,created_at,updated_at) SELECT ?,'database_check','queued',?,?,? WHERE (SELECT COUNT(*) FROM background_jobs WHERE status IN ('queued','running'))<10").bind(id,Date.now(),now,now),
          auditStatement(db,'job_created',`创建后台数据库检查：${id}`,true),
        ]) as {meta:{changes:number}}[];
        if (!results[0].meta.changes) throw new HttpError(429,'待处理作业已达上限，请等待完成');
        return json({id},201);
      }
      if (url.pathname === '/api/admin/jobs/process' && request.method === 'POST') return json(await processNextJob(db));
      const jobAction=url.pathname.match(/^\/api\/admin\/jobs\/([a-f0-9-]{36})\/(cancel|retry)$/);
      if (jobAction && request.method === 'POST') {
        const [,id,action]=jobAction;
        const sql=action==='cancel'
          ? "UPDATE background_jobs SET status='cancelled',lease_token=NULL,lease_until=NULL,updated_at=? WHERE id=? AND status IN ('queued','running')"
          : "UPDATE background_jobs SET status='queued',attempts=0,last_error=NULL,available_at=0,updated_at=? WHERE id=? AND status='failed'";
        if (action==='retry' && !(await readSettings(db)).queue_enabled) throw new HttpError(409,'后台队列已暂停');
        const results=await db.batch([db.prepare(sql).bind(new Date().toISOString(),id),auditStatement(db,`job_${action}`,`后台作业${action==='cancel'?'取消':'重试'}：${id}`,true)]) as {meta:{changes:number}}[];
        if (!results[0].meta.changes) throw new HttpError(409,'作业不存在或状态已变化');
        return json({success:true});
      }
      if (url.pathname === '/api/research/tasks' && request.method === 'GET') {
        const rows = await db.prepare('SELECT * FROM research_tasks ORDER BY created_at DESC LIMIT 100').all<Row>();
        return json({ tasks: rows.results.map(mapTask) });
      }
      if (url.pathname === '/api/research/tasks' && request.method === 'POST') {
        const input = await body(request);
        if (typeof input.prompt !== 'string' || input.prompt.trim().length < 5 || input.prompt.length > 4000) throw new HttpError(400, '研究需求应为 5–4000 字');
        const key = request.headers.get('Idempotency-Key');
        if (!key || !/^[\w-]{16,100}$/.test(key)) throw new HttpError(400, '缺少有效的任务请求标识');
        const brief = briefFrom(input.brief); const prompt = input.prompt.trim();
        const serialized = JSON.stringify({ prompt, brief });
        const existing = await db.prepare('SELECT * FROM research_tasks WHERE request_key = ?').bind(key).first<Row>();
        if (existing) { if (existing.request_body !== serialized) throw new HttpError(409, '任务请求标识已用于其他内容'); return json({ task: mapTask(existing) }); }
        if (!(await readSettings(db)).accepting_tasks) throw new HttpError(409,'工作区已暂停接收新研究任务');
        const id = crypto.randomUUID(), now = new Date().toISOString(), status = statusForBrief(brief);
        await db.batch([
          db.prepare('INSERT OR IGNORE INTO research_tasks (id,request_key,request_body,prompt,brief_json,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').bind(id,key,serialized,prompt,JSON.stringify(brief),status,now,now),
          db.prepare("INSERT INTO research_events (id,task_id,kind,message,created_at) SELECT ?,id,'created',?,? FROM research_tasks WHERE id = ?").bind(crypto.randomUUID(),'研究需求已保存。尚未执行市场查询或模型分析。',now,id),
        ]);
        const saved = await db.prepare('SELECT * FROM research_tasks WHERE request_key = ?').bind(key).first<Row>();
        if (!saved || saved.request_body !== serialized) throw new HttpError(409, '任务请求标识冲突');
        return json({ task: mapTask(saved) }, 201);
      }
      const match = url.pathname.match(/^\/api\/research\/tasks\/([a-f0-9-]{36})(?:\/(cancel|run))?$/);
      if (!match) throw new HttpError(404, '接口不存在');
      const [, id, action] = match;
      const row = await db.prepare('SELECT * FROM research_tasks WHERE id = ?').bind(id).first<Row>();
      if (!row) throw new HttpError(404, '研究任务不存在');
      if (request.method === 'GET' && !action) {
        const events = await db.prepare('SELECT id,kind,message,created_at AS createdAt FROM research_events WHERE task_id = ? ORDER BY created_at,id').bind(id).all<TaskEvent>();
        const task = mapTask(row);
        return json({ task, events: events.results, missing: missingConditions(task.brief), plan: skills, candidates: [], blockers: row.status === 'cancelled' ? [] : blockers });
      }
      if (request.method === 'POST' && action === 'run') throw new HttpError(409, row.status === 'cancelled' ? '任务已取消，请新建研究任务' : missingConditions(mapTask(row).brief).length ? '请先补充研究条件' : blockers.join('；'));
      if ((request.method === 'PATCH' && !action) || (request.method === 'POST' && action === 'cancel')) {
        const input = await body(request);
        if (input.version !== row.version) throw new HttpError(409, '任务已被更新，请刷新后重试');
        if (row.status === 'cancelled') throw new HttpError(409, '已取消任务不能修改');
        const brief = action === 'cancel' ? JSON.parse(row.brief_json) as Brief : briefFrom(input.brief);
        const status = action === 'cancel' ? 'cancelled' : statusForBrief(brief);
        const now = new Date().toISOString();
        // D1 batch is transactional; changes() makes the audit conditional on winning the version check.
        const result = await db.batch([
          db.prepare('UPDATE research_tasks SET brief_json = ?,status = ?,updated_at = ?,version = version + 1 WHERE id = ? AND version = ?').bind(JSON.stringify(brief),status,now,id,row.version),
          db.prepare('INSERT INTO research_events (id,task_id,kind,message,created_at) SELECT ?,?,?,?,? WHERE changes() = 1').bind(crypto.randomUUID(),id,action === 'cancel' ? 'cancelled' : 'clarified',action === 'cancel' ? '用户取消了任务。' : `研究条件已更新：${JSON.stringify(brief)}`,now),
        ]) as { meta: { changes: number } }[];
        if (result[0].meta.changes !== 1) throw new HttpError(409, '任务已被更新，请刷新后重试');
        return json({ task: mapTask((await db.prepare('SELECT * FROM research_tasks WHERE id = ?').bind(id).first<Row>())!) });
      }
      throw new HttpError(405, '此接口不支持该操作');
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      // Never expose SQL, secrets or upstream payloads to clients.
      console.error('market_api_failure', error instanceof Error ? error.name : 'UnknownError');
      return json({ error: '后台暂时无法处理请求，请检查数据库迁移或稍后重试' }, 503);
    }
  },
};

import type { Database } from './types.ts';
import type { Settings, Job } from '../../../packages/shared/admin.ts';
export type { Settings, Job } from '../../../packages/shared/admin.ts';
export async function readSettings(db: Database) {
  const s = await db.prepare('SELECT * FROM workspace_settings WHERE id = 1').first<Settings>();
  if (!s) throw new Error('Admin migration required');
  return s;
}
export const auditStatement = (db: Database, kind: string, message: string, conditional = false) => db.prepare(`INSERT INTO admin_events(id,kind,message,created_at) SELECT ?,?,?,?${conditional ? ' WHERE changes() = 1' : ''}`).bind(crypto.randomUUID(),kind,message,new Date().toISOString());
export async function processNextJob(db: Database, now = Date.now()) {
  const settings = await readSettings(db);
  if (!settings.queue_enabled) return { processed: false, reason: '后台队列已暂停' };
  // Recover expired leases; jobs cannot retry forever if the worker repeatedly stops.
  await db.batch([
    db.prepare("UPDATE background_jobs SET status='failed',lease_token=NULL,lease_until=NULL,last_error='执行超时，已达到重试上限',updated_at=? WHERE status='running' AND lease_until < ? AND attempts >= 3").bind(new Date(now).toISOString(),now),
    db.prepare("UPDATE background_jobs SET status='queued',lease_token=NULL,lease_until=NULL,available_at=?,last_error='执行中断，等待重试',updated_at=? WHERE status='running' AND lease_until < ? AND attempts < 3").bind(now,new Date(now).toISOString(),now),
  ]);
  const token = crypto.randomUUID();
  // Claim one job atomically. No read-then-update race between concurrent workers.
  const claim = await db.prepare("UPDATE background_jobs SET status='running',attempts=attempts+1,lease_token=?,lease_until=?,updated_at=? WHERE id=(SELECT id FROM background_jobs WHERE status='queued' AND available_at<=? ORDER BY created_at,id LIMIT 1) AND status='queued'").bind(token,now+60000,new Date(now).toISOString(),now).run();
  if (claim.meta.changes !== 1) return { processed: false, reason: '没有待处理作业' };
  const job = await db.prepare('SELECT * FROM background_jobs WHERE lease_token=?').bind(token).first<Job>();
  if (!job) return { processed: false, reason: '作业租约已失效' };
  try {
    if (job.kind !== 'database_check') throw new Error('Unsupported job');
    const tasks = await db.prepare('SELECT COUNT(*) AS count FROM research_tasks').first<{ count: number }>();
    const events = await db.prepare('SELECT COUNT(*) AS count FROM research_events').first<{ count: number }>();
    const result = JSON.stringify({ checkedAt: new Date(now).toISOString(), researchTasks: tasks?.count ?? 0, researchEvents: events?.count ?? 0, message: '数据库读取及后台作业执行正常；未调用模型或市场数据。' });
    await db.batch([
      db.prepare("UPDATE background_jobs SET status='succeeded',result_json=?,last_error=NULL,lease_token=NULL,lease_until=NULL,updated_at=? WHERE id=? AND lease_token=? AND status='running'").bind(result,new Date().toISOString(),job.id,token),
      auditStatement(db,'job_succeeded',`后台数据库检查完成：${job.id}`,true),
    ]);
    return { processed: true, jobId: job.id };
  } catch {
    await db.batch([
      db.prepare("UPDATE background_jobs SET status=?,last_error='数据库检查未完成，请检查服务日志',available_at=?,lease_token=NULL,lease_until=NULL,updated_at=? WHERE id=? AND lease_token=? AND status='running'").bind(job.attempts >= 3 ? 'failed' : 'queued',now+60000*job.attempts,new Date().toISOString(),job.id,token),
      auditStatement(db,'job_error',`后台检查失败，按重试策略处理：${job.id}`,true),
    ]);
    return { processed: true, jobId: job.id, retrying: job.attempts < 3 };
  }
}

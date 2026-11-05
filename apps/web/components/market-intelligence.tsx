'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Circle, LockKeyhole, RefreshCw, Search, TrendingUp } from 'lucide-react';
import { emptyBrief, marketplaces, missingConditions, skills, statusLabels, suggestBrief } from '@swanyo/shared/market';
import type { Brief, Task, TaskDetail } from '@swanyo/shared/market';

type Health = { backend: boolean; storage: boolean; accessConfigured: boolean; model: boolean; marketData: boolean; runner: boolean };
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const type = response.headers.get('Content-Type') ?? '';
  if (!type.includes('application/json')) throw new Error('当前站点尚未接入后台接口。请部署 Worker 后再创建研究任务。');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? '请求失败，请重试');
  return data as T;
}
const dates = (value: string) => new Date(value).toLocaleString('zh-CN');
const tabs = ['市场发现', '竞争分析', '细分市场', '机会评估'] as const;
function BriefFields({ value, onChange, disabled = false }: { value: Brief; onChange: (v: Brief) => void; disabled?: boolean }) {
  const set = (key: keyof Brief, val: string | number | null) => onChange({ ...value, [key]: val });
  return <div className="mi-fields">
    <label>初始资金 · 人民币<input disabled={disabled} type="number" min="1" max="100000000" step="0.01" placeholder="例如 100000" value={value.budgetCny ?? ''} onChange={e => set('budgetCny', e.target.value ? Number(e.target.value) : null)} /></label>
    <label>候选数量<input disabled={disabled} type="number" min="1" max="20" step="1" placeholder="例如 5" value={value.targetCount ?? ''} onChange={e => set('targetCount', e.target.value ? Number(e.target.value) : null)} /></label>
    <label>目标站点<select disabled={disabled} value={value.marketplace} onChange={e => set('marketplace', e.target.value)}><option value="">待确认</option>{marketplaces.map(m => <option key={m}>{m}</option>)}</select></label>
    <label>履约方式<select disabled={disabled} value={value.fulfillment} onChange={e => set('fulfillment', e.target.value)}><option value="">待确认</option><option value="FBA">FBA · 平台仓储配送</option><option value="FBM">FBM · 自行安排配送</option></select></label>
    <label>资金使用方式<select disabled={disabled} value={value.allocation} onChange={e => set('allocation', e.target.value)}><option value="">待确认</option><option value="alternatives">多个备选方向，之后择一</option><option value="portfolio">总预算内同时进入多个方向</option></select></label>
    <label>预算口径<select disabled={disabled} value={value.budgetScope} onChange={e => set('budgetScope', e.target.value)}><option value="">待确认</option><option value="all_in">包含采购、物流、广告和周转</option><option value="inventory_only">仅采购预算，其他资金待核实</option></select></label>
    <label>排除条件 · 选填<input disabled={disabled} maxLength={1000} placeholder="例如不做带电、大件产品" value={value.exclusions} onChange={e => set('exclusions', e.target.value)} /></label>
    <label>供应链能力 · 选填<input disabled={disabled} maxLength={1000} placeholder="例如暂无货源，希望采购现货" value={value.supplyChain} onChange={e => set('supplyChain', e.target.value)} /></label>
  </div>;
}
export function MarketIntelligence() {
  const [health, setHealth] = useState<Health | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [accessKey, setAccessKey] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [brief, setBrief] = useState<Brief>({ ...emptyBrief });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selected, setSelected] = useState<TaskDetail | null>(null);
  const [editBrief, setEditBrief] = useState<Brief>({ ...emptyBrief });
  const [tab, setTab] = useState(0);
  const submission = useRef<{ body: string; key: string } | null>(null);
  const selectionEpoch = useRef(0);
  const refreshTasks = useCallback(async () => {
    const result = await api<{ tasks: Task[] }>('/api/research/tasks'); setTasks(result.tasks);
  }, []);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const h = await api<Health>('/api/health'); if (!active) return; setHealth(h);
        if (h.accessConfigured) {
          try { await api('/api/session'); if (active) setAuthenticated(true); if (h.storage && active) await refreshTasks(); }
          catch (e) { if (active && !String(e).includes('解锁')) setError((e as Error).message); }
        }
      } catch (e) { if (active) setError((e as Error).message); }
      finally { if (active) setLoading(false); }
    })(); return () => { active = false; };
  }, [refreshTasks]);
  async function action(fn: () => Promise<void>) { setBusy(true); setError(''); setNotice(''); try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  async function selectTask(id: string) {
    const epoch = ++selectionEpoch.current;
    const result = await api<TaskDetail>(`/api/research/tasks/${id}`);
    if (epoch === selectionEpoch.current) { setSelected(result); setEditBrief(result.task.brief); }
  }
  function fillExample() {
    const p = '我现在有10万人民币初始资金，请帮我筛选5个可以进场的小类目节点。';
    setPrompt(p); setBrief({ ...emptyBrief, ...suggestBrief(p) });
    setNotice('已填入示例需求。请确认站点、预算口径和资金使用方式。');
  }
  async function createTask() {
    const body = JSON.stringify({ prompt, brief });
    if (submission.current?.body !== body) submission.current = { body, key: crypto.randomUUID() };
    const result = await api<{ task: Task }>('/api/research/tasks', { method: 'POST', headers: { 'Idempotency-Key': submission.current.key }, body });
    await refreshTasks(); await selectTask(result.task.id); setTab(0);
    setNotice('任务已保存，可在研究记录中继续补充条件。尚未执行市场研究。');
  }
  const missing = missingConditions(brief);
  return <main className="page-shell mi-shell">
    <div className="eyebrow">APPLICATION / 01</div>
    <div className="page-heading"><div><div className="app-heading-icon"><TrendingUp size={23} /></div><h1>市场情报中心</h1><p>从一个经营目标出发，建立有证据的市场研究。</p></div><span className="availability">{loading ? '检查连接中' : health?.storage ? '研究任务可保存' : '后台待配置'}</span></div>
    <div className="mi-connections" aria-label="服务连接状态">{[['任务后台', health?.backend], ['研究数据库', health?.storage], ['模型执行', health?.model], ['市场数据', health?.marketData]].map(([label, ready]) => <span key={String(label)} className={ready ? 'is-ready' : ''}>{ready ? <CheckCircle2 size={14} /> : <Circle size={14} />}{label} · {ready ? '已连接' : '待接入'}</span>)}</div>
    {error && <div className="mi-alert" role="alert">{error}</div>}
    {notice && <div className="mi-notice" role="status">{notice}</div>}
    {!loading && health && !health.accessConfigured && <div className="mi-notice">后台尚未配置工作区访问密钥，当前无法保存研究任务。请按仓库部署说明完成配置。</div>}
    {health?.accessConfigured && !authenticated && <form className="mi-unlock mi-panel" onSubmit={e => { e.preventDefault(); void action(async () => { await api('/api/session', { method: 'POST', body: JSON.stringify({ key: accessKey }) }); setAccessKey(''); setAuthenticated(true); if (health.storage) await refreshTasks(); }); }}><LockKeyhole size={18} /><label htmlFor="workspace-key">解锁个人工作区</label><input id="workspace-key" type="password" autoComplete="current-password" placeholder="输入部署时设置的访问密钥" value={accessKey} onChange={e => setAccessKey(e.target.value)} required /><button disabled={busy} className="mi-button" type="submit">解锁</button></form>}
    <nav className="mi-tabs" aria-label="市场研究模块">{tabs.map((name, i) => <button type="button" key={name} aria-current={tab === i ? 'page' : undefined} onClick={() => setTab(i)}>{name}</button>)}</nav>
    <div className="mi-layout">
      <section className="mi-main">
        {tab === 0 ? <>
          <form className="mi-panel" onSubmit={e => { e.preventDefault(); void action(createTask); }}>
            <div className="mi-panel-heading"><div><span className="mi-kicker">NEW RESEARCH</span><h2>你想寻找什么市场？</h2></div><Search size={20} /></div>
            <label className="mi-prompt-label" htmlFor="research-prompt">研究需求</label>
            <textarea id="research-prompt" minLength={5} maxLength={4000} required value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="例如：我有 10 万元初始资金，帮我筛选 5 个值得进一步验证的小类目节点。" />
            <div className="mi-inline-actions"><button type="button" className="mi-text-button" onClick={fillExample}>使用 10 万元示例</button><button type="button" className="mi-text-button" disabled={!prompt.trim()} onClick={() => { setBrief(b => ({ ...b, ...suggestBrief(prompt) })); setNotice('已尝试提取明确的数字预算和候选数量，请核对。复杂条件需手动填写。'); }}>从需求提取预算与数量</button></div>
            <h3>确认研究条件</h3><p className="mi-muted">结构化条件是执行依据。未填的条件将保存为待确认，不会由系统擅自假定。</p>
            <BriefFields value={brief} onChange={setBrief} disabled={busy} />
            <div className="mi-form-footer"><span>{missing.length ? `还有 ${missing.length} 项条件待确认，可先保存` : '条件已齐全，可保存研究任务'}</span><button className="mi-button mi-primary" type="submit" disabled={busy || !authenticated || !health?.storage}>{busy ? '处理中…' : '保存研究任务'}<ArrowRight size={16} /></button></div>
          </form>
          <section className="mi-panel"><div className="mi-panel-heading"><h2>研究方法</h2><span className="mi-muted">6 个阶段 · 尚未执行</span></div><ol className="mi-plan">{skills.map((s, i) => <li key={s.id}><span>{String(i + 1).padStart(2, '0')}</span><div><h3>{s.name}</h3><p>{s.output}</p></div></li>)}</ol></section>
        </> : <section className="mi-panel mi-empty"><Search size={28} /><h2>{tabs[tab]}</h2><p>{selected ? '当前研究任务尚未执行，暂无可验证的市场数据。' : '先在市场发现中创建或选择一项研究任务。'}</p><p>{tab === 1 ? '这里将展示品牌集中度、价格分布、评论门槛与代表商品的证据。' : tab === 2 ? '这里将分别展示官方类目节点、完整路径和节点内的细分需求。' : '这里将展示候选对比、资金适配、推荐理由及待验证问题。'}</p><button type="button" className="mi-button" onClick={() => setTab(0)}>返回市场发现</button></section>}
        {selected && <section className="mi-panel" aria-label="当前研究任务">
          <div className="mi-panel-heading"><h2>研究条件与记录</h2><span className="mi-badge">{statusLabels[selected.task.status]}</span></div>
          <p className="mi-task-prompt">{selected.task.prompt}</p><p className="mi-muted">创建于 {dates(selected.task.createdAt)} · 版本 {selected.task.version}</p>
          {selected.task.status !== 'cancelled' && <div className="mi-notice">{selected.missing.length ? `待确认：${selected.missing.join('、')}。` : '条件已齐全。'} {selected.blockers.join('；')}。当前未开始研究，候选结果为 0。</div>}
          <form onSubmit={e => { e.preventDefault(); void action(async () => { await api(`/api/research/tasks/${selected.task.id}`, { method: 'PATCH', body: JSON.stringify({ brief: editBrief, version: selected.task.version }) }); await refreshTasks(); await selectTask(selected.task.id); setNotice('研究条件已保存。'); }); }}>
            <BriefFields value={editBrief} onChange={setEditBrief} disabled={busy || selected.task.status === 'cancelled'} />
            <div className="mi-inline-actions"><button type="submit" className="mi-button" disabled={busy || selected.task.status === 'cancelled'}>保存条件</button><button type="button" className="mi-text-button" disabled={busy || selected.task.status === 'cancelled'} onClick={() => void action(async () => { await api(`/api/research/tasks/${selected.task.id}/cancel`, { method: 'POST', body: JSON.stringify({ version: selected.task.version }) }); await refreshTasks(); await selectTask(selected.task.id); })}>取消研究任务</button></div>
          </form>
          <h3>操作记录</h3><ol className="mi-events">{selected.events.map(event => <li key={event.id}><time>{dates(event.createdAt)}</time><span>{event.kind === 'clarified' ? '已更新研究条件，完整记录保存在后台。' : event.message}</span></li>)}</ol>
          <p className="mi-muted">任务 ID：{selected.task.id}</p>
        </section>}
      </section>
      <aside className="mi-panel mi-history"><div className="mi-panel-heading"><h2>研究记录</h2><button type="button" title="刷新研究记录" aria-label="刷新研究记录" className="mi-icon-button" disabled={busy || !authenticated || !health?.storage} onClick={() => void action(async () => { await refreshTasks(); if (selected) await selectTask(selected.task.id); })}><RefreshCw size={16} /></button></div><p className="mi-muted">最近 100 项 · 保存在工作区数据库</p>
        {!tasks.length ? <p className="mi-history-empty">{authenticated && health?.storage ? '还没有研究任务。从左侧的经营目标开始。' : '连接并解锁后台后，可查看研究记录。'}</p> : <ul>{tasks.map(task => <li key={task.id}><button type="button" disabled={busy} aria-pressed={selected?.task.id === task.id} onClick={() => void action(() => selectTask(task.id))}><strong>{task.prompt}</strong><span>{statusLabels[task.status]}</span><small>{dates(task.createdAt)}</small></button></li>)}</ul>}
        {authenticated && <button type="button" className="mi-text-button" disabled={busy} onClick={() => void action(async () => { await api('/api/session', { method: 'DELETE' }); setAuthenticated(false); setTasks([]); setSelected(null); })}>锁定工作区</button>}
      </aside>
    </div>
  </main>;
}

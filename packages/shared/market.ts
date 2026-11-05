export const marketplaces = ['US', 'UK', 'DE', 'JP', 'CA'] as const;
export type Brief = {
  budgetCny: number | null;
  targetCount: number | null;
  marketplace: string;
  fulfillment: '' | 'FBA' | 'FBM';
  allocation: '' | 'alternatives' | 'portfolio';
  budgetScope: '' | 'all_in' | 'inventory_only';
  exclusions: string;
  supplyChain: string;
};
export const emptyBrief: Brief = { budgetCny: null, targetCount: null, marketplace: '', fulfillment: '', allocation: '', budgetScope: '', exclusions: '', supplyChain: '' };
export const skills = [
  { id: 'research-brief', name: '研究任务定义', output: '明确站点、资金口径与目标，保留未确认条件。' },
  { id: 'category-discovery', name: '类目发现与节点验证', output: '验证站点、官方节点 ID 和路径，区分关键词细分市场。' },
  { id: 'demand-validation', name: '需求与趋势验证', output: '记录需求证据、统计周期、季节性和估算口径。' },
  { id: 'competition-analysis', name: '竞争与进入门槛', output: '比较品牌集中度、评论门槛、价格及新品表现。' },
  { id: 'capital-fit', name: '资金适配初筛', output: '计算采购、物流、广告与周转需求；缺报价时仅给待验证区间。' },
  { id: 'opportunity-report', name: '候选比较与报告', output: '按证据筛选，允许少于目标数量，列出排除原因。' },
] as const;
export type TaskStatus = 'needs_clarification' | 'blocked_configuration' | 'cancelled';
export const statusLabels: Record<TaskStatus, string> = { needs_clarification: '待补充条件', blocked_configuration: '待接入研究服务', cancelled: '已取消' };
export type Task = { id: string; prompt: string; brief: Brief; status: TaskStatus; createdAt: string; updatedAt: string; version: number };
export type TaskEvent = { id: string; kind: string; message: string; createdAt: string };
export type TaskDetail = { task: Task; events: TaskEvent[]; missing: string[]; plan: typeof skills; candidates: []; blockers: string[] };
export const blockers = ['尚未接入可授权查询的市场数据源', '尚未接入模型与后台研究执行器'];

// Conservative suggestions only: structured fields confirmed by the user remain authoritative.
export function suggestBrief(prompt: string): Partial<Brief> {
  const suggestions: Partial<Brief> = {};
  const budget = prompt.match(/(?:预算|资金|有)\s*(\d[\d,]*(?:\.\d+)?)\s*(万|[wW])?(?:\s*(?:元|人民币|初始资金|预算|资金)|(?=[，,。\s]))/);
  if (budget) {
    const amount = Number(budget[1].replaceAll(',', '')) * (budget[2] ? 10000 : 1);
    if (amount > 0 && amount <= 100000000) suggestions.budgetCny = amount;
  }
  const count = prompt.match(/(?:筛选|推荐|寻找|找出|找|选)\s*(\d+)\s*个/);
  if (count && +count[1] >= 1 && +count[1] <= 20) suggestions.targetCount = +count[1];
  return suggestions;
}
export function validateBrief(value: unknown): Brief {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('研究条件格式不正确');
  const v = value as Record<string, unknown>;
  const number = (key: string, max: number, integer = false) => {
    const n = v[key];
    if (n === null || n === undefined) return null;
    if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0 || n > max || (integer && !Number.isInteger(n))) throw new Error(`${key} 超出允许范围`);
    return n;
  };
  const choice = (key: string, values: readonly string[]) => {
    const s = v[key] ?? '';
    if (typeof s !== 'string' || !values.includes(s)) throw new Error(`${key} 选项不正确`);
    return s;
  };
  const short = (key: string) => {
    const s = v[key] ?? '';
    if (typeof s !== 'string' || s.length > 1000) throw new Error(`${key} 最多 1000 字`);
    return s.trim();
  };
  return { budgetCny: number('budgetCny', 100000000), targetCount: number('targetCount', 20, true), marketplace: choice('marketplace', ['', ...marketplaces]), fulfillment: choice('fulfillment', ['', 'FBA', 'FBM']) as Brief['fulfillment'], allocation: choice('allocation', ['', 'alternatives', 'portfolio']) as Brief['allocation'], budgetScope: choice('budgetScope', ['', 'all_in', 'inventory_only']) as Brief['budgetScope'], exclusions: short('exclusions'), supplyChain: short('supplyChain') };
}
export function missingConditions(b: Brief): string[] {
  return [!b.budgetCny && '初始资金（人民币）', !b.targetCount && '候选数量', !b.marketplace && '目标站点', !b.fulfillment && '履约方式', !b.allocation && '备选方向还是同时进入', !b.budgetScope && '资金是否包含物流、广告和周转'].filter((s): s is string => Boolean(s));
}
export function statusForBrief(b: Brief): TaskStatus { return missingConditions(b).length ? 'needs_clarification' : 'blocked_configuration'; }

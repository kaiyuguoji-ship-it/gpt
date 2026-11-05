/** Frontend demonstration only. No Amazon observations or remote API contracts. */
export type ModuleId = 'discovery' | 'competition' | 'segments' | 'opportunity';
export type DemoStatus = 'queued' | 'running' | 'paused' | 'completed' | 'cancelled';
export type Field = { id: string; label: string; kind?: 'number' | 'range' | 'textarea'; options?: readonly string[]; placeholder?: string; wide?: boolean; min?: number; max?: number; integer?: boolean };
export type Module = { id: ModuleId; name: string; description: string; fields: readonly Field[] };
const budget: Field = { id:'budget',label:'初始资金（人民币）',kind:'number',placeholder:'例如 100000',min:1 };
const count: Field = { id:'count',label:'候选数量',kind:'number',placeholder:'例如 5',min:1,max:20,integer:true };
const site: Field = { id:'site',label:'目标站点',options:['美国站 · US','日本站 · JP','英国站 · UK','德国站 · DE','加拿大站 · CA'] };
const fulfillment: Field = { id:'fulfillment',label:'履约方式',options:['FBA · 平台配送','FBM · 卖家配送','不限'] };
const scope: Field = { id:'scope',label:'市场范围',placeholder:'类目名称、节点 ID 或完整路径' };
const price: Field = { id:'price',label:'产品价格区间（USD）',kind:'range',min:0 };
const sales: Field = { id:'sales',label:'月销量区间（件）',kind:'range',min:0,integer:true };
const age: Field = { id:'age',label:'上架时间',options:['近 3 个月','近 6 个月','近 12 个月','超过 12 个月','不限'] };
const exclusions: Field = { id:'exclusions',label:'排除条件（选填）',placeholder:'例如：不做带电、大件、易碎、强监管产品',wide:true };
const supply: Field = { id:'supply',label:'供应链能力（选填）',placeholder:'例如：现有供应商、MOQ、生产周期、认证能力',wide:true };
const demand: Field = { id:'demand',label:'需求门槛',options:['优先稳定需求','优先增长需求','优先长尾需求','不限'] };
const strength: Field = { id:'strength',label:'竞争强度',options:['优先较低竞争','接受中等竞争','不限'] };
export const modules: readonly Module[] = [
 {id:'discovery',name:'市场发现',description:'从大类 / 小类中梳理需求、竞争与进入条件，建立待验证的市场方向。',fields:[budget,count,site,fulfillment,
 {id:'allocation',label:'资金使用方式',options:['多个备选，后续择一','总预算内同时进入多个方向','不限']},
 {id:'budgetScope',label:'预算口径',options:['采购、物流、广告及周转全包','仅采购预算','不限']},scope,demand,strength,price,sales,age,exclusions,supply]},
 {id:'competition',name:'竞争分析',description:'围绕指定商品或类目，设定竞品样本、竞争指标与对比范围。',fields:[site,scope,
 {id:'asins',label:'竞品 ASIN / 商品链接',placeholder:'输入研究对象，多个对象以逗号分隔',wide:true},
 {id:'brands',label:'关注品牌（选填）',placeholder:'输入希望对比的品牌'},
 {id:'sampleCount',label:'竞品样本数量',kind:'number',placeholder:'例如 20',min:1,max:100,integer:true},
 {id:'dimension',label:'重点分析维度',options:['价格与促销','评论与评分','品牌与卖家集中度','产品差异化','综合对比']},
 {id:'seller',label:'卖家范围',options:['全部卖家','平台自营','第三方卖家']},price,
 {id:'reviews',label:'评论数量区间',kind:'range',min:0,integer:true},age,exclusions]},
 {id:'segments',name:'细分市场',description:'从父类目与用户需求出发，按人群、场景和属性划分细分方向。',fields:[site,
 {id:'parent',label:'父类目 / 节点路径',placeholder:'输入父类目名称或节点路径'},
 {id:'keywords',label:'核心需求关键词',placeholder:'例如：使用场景、功能或痛点',wide:true},
 {id:'audience',label:'目标人群',placeholder:'填写目标用户人群'},
 {id:'scenario',label:'使用场景',placeholder:'填写使用场景'},
 {id:'granularity',label:'细分维度',options:['按人群细分','按使用场景细分','按功能属性细分','交叉细分']},count,demand,price,sales,strength,exclusions]},
 {id:'opportunity',name:'机会评估',description:'对已有候选方向设定资金、利润与风险约束，整理进入前的验证清单。',fields:[budget,count,site,fulfillment,
 {id:'candidates',label:'待评估候选方向',kind:'textarea',placeholder:'逐行填写已有候选类目或产品方向',wide:true},
 {id:'cost',label:'目标采购成本（人民币 / 件）',kind:'range',min:0},
 {id:'margin',label:'目标净利率下限（%）',kind:'number',placeholder:'例如 20',min:0,max:100},
 {id:'payback',label:'目标回款周期',options:['3 个月内','6 个月内','12 个月内','不限']},
 {id:'launch',label:'计划入场时间',options:['1 个月内','3 个月内','6 个月内','待产品验证后决定']},
 {id:'risk',label:'风险接受程度',options:['保守','适中','较高']},exclusions,supply]},
];
export const advancedFields: readonly Field[] = [
 {id:'growth',label:'市场增长率（%）',kind:'range',min:-100},
 {id:'seasonality',label:'季节性波动',options:['优先全年稳定','可接受季节性','不限']},
 {id:'lifecycle',label:'生命周期',options:['新兴需求','稳定成熟需求','不限']},
 {id:'concentration',label:'品牌集中度',options:['优先分散市场','可接受较高集中度','不限']},
 {id:'patent',label:'专利风险',options:['需安排专利排查','已有排查材料，待复核','待专业人员评估']},
 {id:'compliance',label:'合规要求',placeholder:'填写所需认证、检测或排除要求'},
];
export type Values = Record<string,string>;
export type Draft = {prompt:string;values:Values;advanced:string[]};
export type DemoEvent = {id:string;at:string;text:string};
export type DemoRecord = {id:string;module:ModuleId;title:string;prompt:string;values:Values;advanced:string[];status:DemoStatus;step:number;createdAt:string;updatedAt:string;events:DemoEvent[]};
export const statusLabels: Record<DemoStatus,string> = {queued:'待开始',running:'执行中',paused:'暂停中',completed:'已完成',cancelled:'已取消'};
export const STORE_KEY = 'swanyo.market.frontend-demo.v1';
export const emptyDraft = ():Draft => ({prompt:'',values:{},advanced:[]});
export const moduleById = (id:ModuleId) => modules.find(m=>m.id===id)!;
export function activeFields(module:ModuleId,advanced:readonly string[]) { return [...moduleById(module).fields,...advancedFields.filter(f=>advanced.includes(f.id))]; }
export function fieldValue(f:Field,values:Values) { if(f.kind==='range')return `${values[f.id+'Min']?.trim()||'待确认'} — ${values[f.id+'Max']?.trim()||'待确认'}`; return values[f.id]?.trim()||'待确认'; }
export function pendingFields(module:ModuleId,values:Values,advanced:readonly string[]) {return activeFields(module,advanced).filter(f=>f.kind==='range'?(!values[f.id+'Min']?.trim()||!values[f.id+'Max']?.trim()):!values[f.id]?.trim()).map(f=>f.label);}
export function validateDraft(module:ModuleId,draft:Draft):string|null {
 if(draft.prompt.trim().length<5)return '请填写至少 5 个字的研究需求。';
 if(draft.prompt.length>500)return '研究需求不能超过 500 个字。';
 for(const f of activeFields(module,draft.advanced)) {
  for(const key of f.kind==='range'?[f.id+'Min',f.id+'Max']:[f.id]) {
   const v=draft.values[key]?.trim();if(!v)continue;
   if(f.kind==='number'||f.kind==='range') {
    const n=Number(v);if(!Number.isFinite(n)||(f.min!==undefined&&n<f.min)||(f.max!==undefined&&n>f.max)||(f.integer&&!Number.isInteger(n)))return `${f.label}的数值无效，请检查允许的范围。`;
   }
  }
  if(f.kind==='range'&&draft.values[f.id+'Min']&&draft.values[f.id+'Max']&&Number(draft.values[f.id+'Min'])>Number(draft.values[f.id+'Max']))return `${f.label}的最低值不能大于最高值。`;
 }
 return null;
}
export function createDemoRecord(module:ModuleId,draft:Draft,id:string,at:string):DemoRecord {return {id,module,title:draft.prompt.trim().slice(0,32),prompt:draft.prompt.trim(),values:{...draft.values},advanced:[...draft.advanced],status:'queued',step:0,createdAt:at,updatedAt:at,events:[{id:id+'-created',at,text:'演示任务已保存在此浏览器，未发送到后端或启动 Agent。'}]};}
export function transitionRecord(record:DemoRecord,status:DemoStatus,at:string):DemoRecord {
 const allowed:Record<DemoStatus,DemoStatus[]>={queued:['running','paused','cancelled'],running:['paused','completed','cancelled'],paused:['running','cancelled'],completed:[],cancelled:[]};
 if(!allowed[record.status].includes(status))return record;
 const text={running:'演示开始 / 恢复：仅切换界面状态，未运行或恢复 Agent。',paused:'演示暂停：仅切换界面状态，不代表保存了 Agent 检查点。',completed:'演示完成：报告结构示例可查看，未生成市场分析结论。',cancelled:'演示取消：记录保留在本地。',queued:''}[status];
 return {...record,status,step:status==='completed'?5:record.step,updatedAt:at,events:[...record.events,{id:`${record.id}-${record.events.length}`,at,text}]};
}
export function seedRecords():DemoRecord[] {
 const examples:[ModuleId,DemoStatus,number,string][]=[['discovery','running',3,'演示研究 A · 市场发现'],['competition','completed',5,'演示研究 B · 竞争分析'],['segments','paused',1,'演示研究 C · 细分市场']];
 return examples.map(([module,status,step,title],i)=>{const at=`2026-11-04T09:${37-i*2}:00.000Z`;const record=createDemoRecord(module,{prompt:`${title}：体验研究条件与任务状态流转。`,values:{},advanced:[]},`demo-example-${i+1}`,at);return {...record,title,status,step,events:[...record.events,{id:`demo-seed-${i}`,at,text:'预置界面演示状态；阶段进度为交互示意，不对应真实研究。'}]};});
}
/** Reject malformed browser data rather than mixing unrelated/real backend records in. */
export function parseRecords(raw:string):DemoRecord[] {
 const data:unknown=JSON.parse(raw);
 if(!Array.isArray(data)||data.length>100)throw Error('invalid demo data');
 const ids=new Set<string>();
 return data.map((item:unknown)=>{
  const r=item as DemoRecord;
  if(!r||typeof r.id!=='string'||ids.has(r.id)||!modules.some(m=>m.id===r.module)||!Object.hasOwn(statusLabels,r.status)||typeof r.prompt!=='string'||r.prompt.length>500||typeof r.title!=='string'||typeof r.createdAt!=='string'||!Number.isFinite(Date.parse(r.createdAt))||typeof r.updatedAt!=='string'||!Number.isFinite(Date.parse(r.updatedAt))||!Number.isInteger(r.step)||r.step<0||r.step>5||!r.values||typeof r.values!=='object'||Array.isArray(r.values)||!Object.values(r.values).every(v=>typeof v==='string')||!Array.isArray(r.advanced)||!r.advanced.every(id=>advancedFields.some(f=>f.id===id))||!Array.isArray(r.events)||!r.events.every(e=>e&&typeof e.id==='string'&&typeof e.text==='string'&&typeof e.at==='string'&&Number.isFinite(Date.parse(e.at))))throw Error('invalid demo record');
  ids.add(r.id);return r;
 });
}
export function reportMarkdown(record:DemoRecord) {return `# 研究报告结构示例\n\n> 仅为前端演示，不含亚马逊市场数据、分析结论或投资建议。\n\n任务 ID：${record.id}\n模块：${moduleById(record.module).name}\n\n## 研究需求\n${record.prompt}\n\n## 条件摘要\n${activeFields(record.module,record.advanced).map(f=>`- ${f.label}：${fieldValue(f,record.values)}`).join('\n')}\n\n## 后续待验证\n- 数据来源与采集时间：待接入\n- 市场需求与竞争证据：待研究\n- 资金适配与风险判断：待研究\n- 推荐结论：未生成\n`;}

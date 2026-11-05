import test from 'node:test';
import assert from 'node:assert/strict';
import { activeFields, createDemoRecord, emptyDraft, parseRecords, pendingFields, reportMarkdown, seedRecords, transitionRecord, validateDraft } from '../apps/web/lib/market-demo.ts';

test('empty module filters remain unconfirmed and module inputs differ',()=>{
 for(const module of ['discovery','competition','segments','opportunity'] as const) assert.equal(pendingFields(module,{},[]).length,activeFields(module,[]).length);
 assert.ok(activeFields('competition',[]).some(f=>f.id==='asins'));
 assert.ok(!activeFields('discovery',[]).some(f=>f.id==='asins'));
 assert.ok(activeFields('segments',[]).some(f=>f.id==='audience'));
 assert.ok(activeFields('opportunity',[]).some(f=>f.id==='margin'));
});
test('range validation and unconfirmed conditions do not fabricate defaults',()=>{
 const draft={...emptyDraft(),prompt:'验证筛选条件的演示需求',values:{priceMin:'30',priceMax:'10'}};
 assert.match(validateDraft('discovery',draft)!,/最低值/);
 assert.equal(validateDraft('discovery',{...draft,values:{}}),null);
 assert.ok(pendingFields('discovery',{priceMin:'10'},[]).includes('产品价格区间（USD）'));
});
test('creating a demo snapshots inputs and retains a single event history',()=>{
 const draft={prompt:'这是演示研究需求',values:{budget:'100000'},advanced:['patent']};
 const record=createDemoRecord('discovery',draft,'demo-test','2026-11-06T01:00:00Z');
 draft.values.budget='20';draft.advanced.push('growth');
 assert.equal(record.values.budget,'100000');assert.deepEqual(record.advanced,['patent']);
 const running=transitionRecord(record,'running','2026-11-06T01:01:00Z');
 const paused=transitionRecord(running,'paused','2026-11-06T01:02:00Z');
 const resumed=transitionRecord(paused,'running','2026-11-06T01:03:00Z');
 assert.equal(resumed.id,record.id);assert.equal(resumed.events.length,4);
 assert.match(resumed.events.at(-1)!.text,/未运行或恢复 Agent/);
 assert.equal(record.status,'queued');assert.equal(resumed.step,0);
});
test('terminal demo states cannot restart and reports contain no market conclusions',()=>{
 const record=seedRecords().find(r=>r.status==='completed')!;
 assert.equal(transitionRecord(record,'running','2026-11-06T01:01:00Z'),record);
 const report=reportMarkdown(record);assert.match(report,/仅为前端演示/);assert.match(report,/待确认/);assert.match(report,/推荐结论：未生成/);
});
test('local persistence roundtrips the same task records and rejects invalid data',()=>{
 const records=seedRecords();assert.deepEqual(parseRecords(JSON.stringify(records)),records);
 assert.throws(()=>parseRecords(JSON.stringify([{...records[0],status:'real-agent-running'}])));
 assert.throws(()=>parseRecords(JSON.stringify([records[0],records[0]])));
 assert.throws(()=>parseRecords('not json'));
});

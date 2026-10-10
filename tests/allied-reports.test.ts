import {test} from 'node:test';
import assert from 'node:assert/strict';
import {importAlliedReports,removeAlliedReport,reviewAlliedReports,reportAge} from '../src/lib/allied-reports';
import {browserRepository,createCampaign,decodeWorkspace,emptyWorkspace,importReports} from '../src/lib/workspace';
import {mergeLocalWorkspace,validateCloudSave} from '../src/lib/cloud-validation';
import {demoReport,demoWorkspace} from '../src/lib/demo';
import {parseReport} from '../src/lib/wwbp/parser';
import {pastedReport} from '../src/lib/pasted-report';
import {saveOrderDraft} from '../src/lib/order-drafts';

const ally=(player=2,turn=2,army=12,game='DEMO-A')=>({filename:`player-${player}-turn-${turn}.txt`,text:demoReport(game,turn,army).replaceAll('[1:DEMONSTRATION]',`[${player}:FICTIONAL ALLY]`)});

test('allied imports keep multiple players on the same turn separate from own reports and drafts',()=>{
 const before=saveOrderDraft(demoWorkspace(),'demo-a',{baseTurn:2,text:'@AAL BA2',updatedAt:'2026-10-10T12:00:00.000Z'});
 const original=JSON.stringify(before);
 const result=importAlliedReports(before,'demo-a',[ally(3),ally(2)]);
 assert.equal(result.added,2);
 assert.deepEqual(result.reports.map(raw=>parseReport(raw.text).player),[2,3]);
 assert.deepEqual(result.state.campaigns[0].reports,before.campaigns[0].reports);
 assert.deepEqual(result.state.campaigns[0].orderDrafts,before.campaigns[0].orderDrafts);
 assert.deepEqual(result.state.campaigns[1],before.campaigns[1]);
 assert.equal(JSON.stringify(before),original);
 assert.throws(()=>importReports(before,'demo-a',[ally()]),/belongs/);
});

test('wrong game, own player, incomplete report, and mixed batches fail atomically',()=>{
 const before=demoWorkspace(),snapshot=JSON.stringify(before);
 for(const bad of [ally(2,2,12,'DEMO-B'),ally(1),{filename:'partial.txt',text:'Game DEMO-A, Turn 2, Player [2:ALLY]'}]){
  assert.throws(()=>importAlliedReports(before,'demo-a',[ally(3),bad]));
  assert.equal(JSON.stringify(before),snapshot);
 }
 assert.throws(()=>importAlliedReports(before,'missing',[ally()]),/Select a campaign/);
});

test('review and import skip duplicates including within a batch and normalize Windows newlines',()=>{
 const raw=ally(),before=demoWorkspace();
 const duplicate={filename:'resent.txt',text:raw.text.replace(/\n/g,'\r\n')};
 const preview=reviewAlliedReports(before.campaigns[0],[raw,duplicate]);
 assert.deepEqual(preview.rows.map(row=>row.status),['new','duplicate']);
 assert.equal(before.campaigns[0].alliedReports,undefined);
 const imported=importAlliedReports(before,'demo-a',[raw,duplicate]);
 assert.equal(imported.added,1);assert.equal(imported.duplicates,1);
 assert.equal(imported.reports[0].filename,raw.filename);
 const again=importAlliedReports(imported.state,'demo-a',[duplicate]);
 assert.equal(again.added,0);assert.equal(again.duplicates,1);
});

test('conflicts identify the player, turn, and both sources and preserve the entire batch',()=>{
 const before=importAlliedReports(demoWorkspace(),'demo-a',[ally()]).state,snapshot=JSON.stringify(before);
 const conflict={...ally(2,2,99),filename:'revised.txt'};
 assert.throws(()=>importAlliedReports(before,'demo-a',[ally(3),conflict]),error=>{
  assert.match((error as Error).message,/Player 2, turn 2/);
  assert.match((error as Error).message,/player-2-turn-2.txt/);
  assert.match((error as Error).message,/revised.txt/);return true;
 });
 assert.equal(JSON.stringify(before),snapshot);
 assert.throws(()=>importAlliedReports(demoWorkspace(),'demo-a',[ally(),conflict]),/different report/);
});

test('allied library works before own imports and accepts a complete pasted email',()=>{
 const before=createCampaign(emptyWorkspace,'New game','DEMO-A',1,'new');
 const imported=importAlliedReports(before,'new',[pastedReport(ally().text)]).state;
 assert.equal(imported.campaigns[0].reports.length,0);
 assert.equal(imported.campaigns[0].alliedReports?.length,1);
 assert.deepEqual(decodeWorkspace(JSON.stringify(imported)),imported);
});

test('allied reports survive cloud validation, browser reload, and campaign JSON serialization',()=>{
 const before=importAlliedReports(demoWorkspace(),'demo-a',[ally(3,4),ally(2,1),ally(2,3)]).state;
 assert.deepEqual(validateCloudSave({workspace:before,revision:5}).workspace,before);
 let saved='';
 const storage={getItem:()=>saved||null,setItem:(_key:string,value:string)=>{saved=value;}} as unknown as Storage;
 browserRepository(storage).save(before);
 assert.deepEqual(browserRepository(storage).load(),before);
 assert.deepEqual(JSON.parse(JSON.stringify(before.campaigns[0])).alliedReports,before.campaigns[0].alliedReports);
 assert.deepEqual(decodeWorkspace(JSON.stringify(demoWorkspace())),demoWorkspace());
});

test('server validation rejects malformed, misassigned, and excessive allied collections',()=>{
 for(const bad of [null,{},[null],[{filename:'x',text:4}],[ally(1)],[ally(2,2,12,'DEMO-B')],[{...ally(),filename:'x'.repeat(256)}]]){
  const workspace=demoWorkspace();Object.assign(workspace.campaigns[0],{alliedReports:bad});
  assert.throws(()=>validateCloudSave({workspace,revision:1}));
 }
 const tooMany=Array.from({length:501},(_,i)=>ally(2,i));
 assert.throws(()=>importAlliedReports(demoWorkspace(),'demo-a',tooMany),/500 allied reports/);
 for(const player of [0,1000])assert.throws(()=>importAlliedReports(demoWorkspace(),'demo-a',[ally(player)]),/invalid player/);
 assert.throws(()=>importAlliedReports(demoWorkspace(),'demo-a',[{...ally(),text:ally().text+'\n'+ally(3).text}]),/one complete report/);
});

test('browser to cloud transfer preserves allied reports for existing and new campaigns',()=>{
 const local=importAlliedReports(demoWorkspace(),'demo-a',[ally(2),ally(3)]).state;
 const cloud=importAlliedReports(demoWorkspace(),'demo-a',[ally(2)]).state;
 const merged=mergeLocalWorkspace(cloud,local);
 assert.equal(merged.campaigns[0].alliedReports?.length,2);
 assert.equal(cloud.campaigns[0].alliedReports?.length,1);
 const fresh=mergeLocalWorkspace(emptyWorkspace,local);
 assert.notEqual(fresh.campaigns[0].id,local.campaigns[0].id);
 assert.deepEqual(fresh.campaigns[0].alliedReports,local.campaigns[0].alliedReports);
});

test('allied transfer conflicts preserve both workspaces',()=>{
 const local=importAlliedReports(demoWorkspace(),'demo-a',[ally(2,2,99),ally(3)]).state;
 const cloud=importAlliedReports(demoWorkspace(),'demo-a',[ally()]).state;
 const originalLocal=JSON.stringify(local),originalCloud=JSON.stringify(cloud);
 assert.throws(()=>mergeLocalWorkspace(cloud,local),/different report/);
 assert.equal(JSON.stringify(local),originalLocal);assert.equal(JSON.stringify(cloud),originalCloud);
});

test('removal targets only one allied player and turn and permits explicit replacement',()=>{
 const before=importAlliedReports(demoWorkspace(),'demo-a',[ally(2,1),ally(2,2),ally(3,2)]).state;
 const removed=removeAlliedReport(before,'demo-a',2,2);
 assert.equal(removed.campaigns[0].alliedReports?.length,2);
 assert.deepEqual(removed.campaigns[0].reports,before.campaigns[0].reports);
 assert.equal(before.campaigns[0].alliedReports?.length,3);
 assert.deepEqual(removed.campaigns[1],before.campaigns[1]);
 assert.equal(importAlliedReports(removed,'demo-a',[ally(2,2,99)]).added,1);
 assert.throws(()=>removeAlliedReport(removed,'demo-a',2,2),/no longer saved/);
 const only=importAlliedReports(demoWorkspace(),'demo-a',[ally()]).state;
 const empty=removeAlliedReport(only,'demo-a',2,2);
 assert.deepEqual(decodeWorkspace(JSON.stringify(empty)),empty);
});

test('viewing freshness never treats absent, older, or future observations as current',()=>{
 assert.match(reportAge(2,null),/No own report/);
 assert.match(reportAge(2,2),/Same turn/);
 assert.match(reportAge(1,3),/2 turns older/);
 assert.match(reportAge(3,2),/Do not use this intelligence for an earlier turn/);
});

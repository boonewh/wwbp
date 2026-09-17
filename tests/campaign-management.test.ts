import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demoWorkspace} from '../src/lib/demo';
import {manageCampaign} from '../src/lib/campaign-management';
import {decodeWorkspace,importReports} from '../src/lib/workspace';
import {validateCloudSave,mergeLocalWorkspace} from '../src/lib/cloud-validation';
import {mapPlayers,playerColor} from '../src/lib/map-legend';
import {parseReport} from '../src/lib/wwbp/parser';
test('rename and archive survive cloud validation without changing identity or reports',()=>{
 const original=demoWorkspace();let state=manageCampaign(original,'demo-a',{kind:'rename',name:'  Finished game  '});
 state=manageCampaign(state,'demo-a',{kind:'archive',archived:true});
 const saved=validateCloudSave({workspace:state,revision:4}).workspace;
 assert.equal(saved.campaigns[0].name,'Finished game');assert.equal(saved.campaigns[0].archived,true);
 assert.deepEqual(saved.campaigns[0].reports,original.campaigns[0].reports);assert.equal(saved.campaigns[0].game,original.campaigns[0].game);
 assert.deepEqual(saved.campaigns[1],original.campaigns[1]);assert.equal(original.campaigns[0].archived,undefined);
 assert.equal(decodeWorkspace(JSON.stringify(manageCampaign(saved,'demo-a',{kind:'archive',archived:false}))).campaigns[0].archived,false);
 assert.throws(()=>manageCampaign(state,'demo-a',{kind:'rename',name:' '}));
 assert.throws(()=>decodeWorkspace(JSON.stringify({...state,campaigns:[{...state.campaigns[0],archived:'yes'}]})),/archive/);
});
test('removing a report permits replacement and preserves all other campaigns and turns',()=>{
 const original=demoWorkspace(),removed=original.campaigns[0].reports[1];
 const state=manageCampaign(original,'demo-a',{kind:'remove-report',turn:2});
 assert.equal(state.campaigns[0].reports.length,1);assert.deepEqual(state.campaigns[1],original.campaigns[1]);
 assert.equal(original.campaigns[0].reports.length,2);assert.equal(state.selectedId,original.selectedId);
 assert.deepEqual(importReports(state,'demo-a',[removed]).state,original);
 assert.equal(manageCampaign(state,'demo-a',{kind:'remove-report',turn:1}).campaigns[0].reports.length,0);
 assert.throws(()=>manageCampaign(state,'demo-a',{kind:'remove-report',turn:99}),/no longer/);
});
test('browser transfer retains archive status for new campaigns and respects existing cloud status',()=>{
 const local=manageCampaign(demoWorkspace(),'demo-a',{kind:'archive',archived:true});
 const empty={version:1 as const,campaigns:[],selectedId:null};
 assert.equal(mergeLocalWorkspace(empty,local).campaigns[0].archived,true);
 assert.equal(mergeLocalWorkspace(demoWorkspace(),local).campaigns[0].archived,undefined);
});
test('legend lists marker players in order using map colors and updates with the report',()=>{
 const report=parseReport(demoWorkspace().campaigns[0].reports[0].text);
 report.spaces.AAL.owner=14;report.spaces.ALI.owner=null;report.spaces.ALI.controller=3;
 const players=mapPlayers(report);assert.ok(players.some(p=>p.id===14&&p.color===playerColor(14)));
 assert.ok(players.some(p=>p.id===3));assert.deepEqual(players.map(p=>p.id),[...new Set(players.map(p=>p.id))].sort((a,b)=>a-b));
 const next={...report,spaces:{AAL:{...report.spaces.AAL,owner:2,controller:null}}};
 assert.deepEqual(mapPlayers(next).map(p=>p.id),[2]);
});

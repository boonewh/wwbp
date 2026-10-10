import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyzeBattle,estimateBattle,roleProblem,type BattleForce} from '../src/lib/battle-scenarios';
import {newScenario,saveScenario,validateScenarios,scenarioEvidenceKey,removeScenario} from '../src/lib/scenario-storage';
import {MODEL_VERSION,type BattleScenario,type BattleRole} from '../src/lib/scenario-types';
import {parseReport} from '../src/lib/wwbp/parser';
import {demoReport} from '../src/lib/demo';
import {decodeWorkspace,browserRepository} from '../src/lib/workspace';
import {validateCloudSave,mergeLocalWorkspace} from '../src/lib/cloud-validation';
import {removeAlliedReport} from '../src/lib/allied-reports';
import type {Report,Geography,Space,Workspace} from '../src/lib/wwbp/types';

const key='a'.repeat(64);
const atlas:Record<string,Geography>=Object.fromEntries(['AAA','BBB','CCC','DDD','WWW','WXX'].map(code=>[code,{name:code,x:0,y:0,surface:['DDD','WXX'].includes(code)?[]:['AAA','BBB','CCC','WWW'].filter(c=>c!==code),air:code==='DDD'?['BBB']:[],canals:code==='WXX'?[{target:'BBB',gate:'CCC'}]:[]} ]));
const space=(code:string,owner:number,army=10,air=0,navy=0):Space=>({code,kind:'occupied',owner,controller:null,visible:true,values:{Army:army,AirF:air,Navy:navy,ABMs:0,Missiles:2,Industry:5},suppressed:{AirF:0},popularity:{},fleets:[],raw:`${code} fictional observation`});
function reports():Report[]{const r=parseReport(demoReport());r.spaces={AAA:space('AAA',1,20),BBB:space('BBB',3,10),CCC:space('CCC',2,15),DDD:space('DDD',1,10)};r.own={};return [r];}
function scenario():BattleScenario{return {...newScenario(1,'BBB'),id:'scenario-1',name:'Test attack',evidenceKey:key,assumptions:{isolated:true,precombat:true},commitments:[{id:'a',groupId:'AAA',role:'conquer',quantity:20}]};}
const analyze=(s=scenario(),r=reports())=>analyzeBattle(s,r,'DEMO-A',atlas,key);
const force=(role:BattleRole,quantity:number,kind:'occupied'|'minor'|'sea'='occupied',id=role):BattleForce=>({id,role,quantity,kind,code:kind==='sea'?'WWW':'AAA',player:1,hypothetical:false});
const defense=(Army=0,AirF=0,Navy=0,ABMs=0)=>({Army,AirF,Navy,ABMs});

test('army formula: 20 against 10 loses five, leaves 15 conquering armies',()=>{
 const e=estimateBattle([force('conquer',20)],defense(10));assert.equal(e.attackArmy,15);assert.equal(e.defenseArmy,0);assert.equal(e.capture,'estimated');assert.equal(e.stages.length,8);
});
test('defender wins unequal and equal army battles; ties never capture',()=>{
 const losing=estimateBattle([force('conquer',10)],defense(20));assert.equal(losing.defenseArmy,15);assert.equal(losing.attackArmy,0);assert.equal(losing.capture,'none');
 const tie=estimateBattle([force('conquer',10)],defense(10));assert.equal(tie.defenseArmy,0.5);assert.equal(tie.capture,'none');assert.match(tie.stages[6].detail,/zero or one/);
});
test('bombard and missiles can eliminate defenders without conquering',()=>{
 assert.equal(estimateBattle([force('bombard',20)],defense(10)).capture,'none');
 const e=estimateBattle([force('missileArmy',3)],defense(10,0,0,1));assert.equal(e.defenseArmy,0);assert.equal(e.capture,'none');assert.equal(e.survivors[0].remaining,0);assert.match(e.stages[1].detail,/1 intercepted/);
});
test('missiles hit defenders before army; ABMs intercept one for one',()=>{
 const e=estimateBattle([force('conquer',10),force('missileArmy',2)],defense(15,0,0,1));assert.equal(e.attackArmy,7.5);assert.equal(e.defenseArmy,0);
});
test('air clash uses half smaller pool total losses, split equally; excess targets army',()=>{
 const e=estimateBattle([force('conquer',20),force('airArmy',10)],defense(10,4));assert.equal(e.attackAir,9);assert.equal(e.defenseAir,3);assert.ok(Math.abs(e.attackArmy-17.55)<1e-9);assert.match(e.stages[3].detail,/3 defending army losses/);
});
test('defensive excess air hits armies then navy then air',()=>{
 const e=estimateBattle([force('conquer',1),force('navyAttack',1,'sea'),force('airArmy',1)],defense(0,10));assert.equal(e.attackArmy,0);assert.equal(e.attackNavy,0);assert.equal(e.attackAir,0);assert.equal(e.capture,'none');
});
test('naval exchange precedes coastal fire; coastal navy cannot hit land approaches',()=>{
 const sea=estimateBattle([force('conquer',20,'sea'),force('navyAttack',10,'sea')],defense(10,0,10));assert.equal(sea.attackNavy,5);assert.equal(sea.defenseNavy,5);assert.ok(Math.abs(sea.attackArmy-(17.5-100/17.5))<1e-9);
 const land=estimateBattle([force('conquer',20)],defense(10,0,10));assert.equal(land.attackArmy,15);
});
test('support joins each defender pool once and shares losses',()=>{
 const e=estimateBattle([force('conquer',10),force('armySupport',10)],defense(10));assert.equal(e.defenseArmy,15);assert.equal(e.survivors.find(g=>g.force.role==='armySupport')!.remaining,7.5);
});
test('scarce conquerors make capture uncertain even when attackers win',()=>{
 const e=estimateBattle([force('conquer',1),force('bombard',19)],defense(10));assert.equal(e.capture,'uncertain');assert.equal(e.conquer,0.75);assert.equal(e.conquerMin,0);assert.equal(e.conquerMax,1);
});
test('two reporting players do not duplicate a source allocation',()=>{
 const r=reports(),ally={...structuredClone(r[0]),player:2,filename:'ally.txt'};const s=scenario();s.commitments.push({id:'b',groupId:'CCC',role:'bombard',quantity:10});
 const result=analyze(s,[...r,ally]);assert.deepEqual(result.errors,[]);assert.equal(result.estimates[1].attackArmy,30-100/30);assert.equal(result.rows.find(r=>r.group.id==='AAA')!.group.candidates.length,2);
});
test('overcommitment accumulates conquer and bombard against one resource',()=>{
 const s=scenario();s.commitments.push({id:'b',groupId:'AAA',role:'bombard',quantity:1});const r=analyze(s);assert.equal(r.estimates.length,0);assert.match(r.errors.join(' '),/only 20/);
});
test('unknown defense requires explicit assumptions rather than zero',()=>{
 const r=reports();r[0].spaces.BBB.visible=false;r[0].spaces.BBB.values={};assert.match(analyze(scenario(),r).errors.join(' '),/Army is unknown/);
 const s=scenario();s.defense={Army:10,AirF:0};assert.equal(analyze(s,r).estimates.length,3);
});
test('current conflicting ownership or counts require a complete source choice',()=>{
 const r=reports(),other={...structuredClone(r[0]),player:2};other.spaces.BBB.values.Army=30;
 assert.match(analyze(scenario(),[...r,other]).errors.join(' '),/conflicting reports/);
 const s=scenario();s.choices.BBB='2:1';assert.equal(analyze(s,[...r,other]).estimates[1].capture,'none');
});
test('historical and future source troops cannot be allocated',()=>{
 const s=scenario();s.baseTurn=2;s.orderTurn=3;assert.match(analyze(s).errors.join(' '),/current, resolved/);
 assert.match(analyze(s).errors.join(' '),/ownership is unknown or historical/);
 const r=reports();r[0].turn=3;assert.match(analyze(s,r).errors.join(' '),/report is missing/);
});
test('minor armies cannot conquer; out of range and land navy are rejected',()=>{
 const r=reports();r[0].spaces.AAA.kind='minor';r[0].spaces.AAA.owner=null;r[0].spaces.AAA.controller=1;
 assert.match(analyze(scenario(),r).errors.join(' '),/Minor armies cannot conquer/);
 assert.match(roleProblem('DDD','occupied','conquer','BBB',atlas)!,/surface range/);
 assert.equal(roleProblem('DDD','occupied','airArmy','BBB',atlas),null);
 assert.match(roleProblem('AAA','occupied','navyAttack','BBB',atlas)!,/start at sea/);
 assert.match(roleProblem('WXX','sea','navyAttack','BBB',atlas)!,/canal permission/);
});
test('source fractions are unavailable; suppressed recovery at target requires assumption',()=>{
 const r=reports();r[0].spaces.AAA.values.Army=19.9;assert.match(analyze(scenario(),r).errors.join(' '),/only 19/);
 r[0].spaces.AAA.values.Army=20;r[0].spaces.BBB.suppressed.AirF=8;assert.match(analyze(scenario(),r).errors.join(' '),/including recovery/);
 const s=scenario();s.defense.AirF=2;assert.equal(analyze(s,r).estimates.length,3);
});
test('no assumptions, stale evidence and old models yield incomplete results',()=>{
 for(const s of [{...scenario(),evidenceKey:''},{...scenario(),modelVersion:'old'},{...scenario(),assumptions:{precombat:false,isolated:false}}])assert.equal(analyze(s).estimates.length,0);
});
test('enemy attackers, diplomatic disadvantage, and self attacks are blocked',()=>{
 const s=scenario();s.commitments.push({id:'b',groupId:'CCC',role:'bombard',quantity:1});const r=reports();r[0].diplomacy.enemies=[2];assert.match(analyze(s,r).errors.join(' '),/another attacker an enemy/);
 r[0].diplomacy={incoming:[3]};assert.match(analyze(s,r).errors.join(' '),/combat disadvantage/);
 r[0].diplomacy={};r[0].spaces.BBB.owner=1;assert.match(analyze(s,r).errors.join(' '),/own occupied country/);
});
test('hypothetical enemy commitments are labeled and still obey range and minor restrictions',()=>{
 const s=scenario();s.mode='defense';s.commitments=[{id:'h',groupId:'hyp:h',role:'conquer',quantity:20,hypothetical:{code:'AAA',player:4,kind:'occupied'}}];
 const r=analyze(s);assert.equal(r.estimates.length,3);assert.ok(r.warnings.some(w=>w.includes('Hypothetical')));s.commitments[0].hypothetical!.kind='minor';assert.equal(analyze(s).estimates.length,0);
});
test('a player may conquer their controlled minor but not attack and support it with the same army side',()=>{
 const r=reports();r[0].spaces.BBB.kind='minor';r[0].spaces.BBB.owner=null;r[0].spaces.BBB.controller=1;
 const result=analyze(scenario(),r);assert.deepEqual(result.errors,[]);assert.equal(result.estimates[1].capture,'estimated');assert.ok(result.warnings.some(w=>w.includes('popularity')));
 const s=scenario();s.commitments.push({id:'support',groupId:'DDD',role:'airSupport',quantity:1});r[0].spaces.DDD.values.AirF=2;assert.match(analyze(s,r).errors.join(' '),/both sides/);
});
test('reported and hypothetical copies of the same resource cannot inflate it',()=>{
 const s=scenario();s.commitments.push({id:'h',groupId:'hyp:h',role:'bombard',quantity:20,hypothetical:{code:'AAA',player:1,kind:'occupied'}});assert.match(analyze(s).errors.join(' '),/do not mix/);
});
test('additional defense and different air assumptions change estimates',()=>{
 const s=scenario(),initial=analyze(s).estimates[1];s.defense.Army=30;assert.notEqual(analyze(s).estimates[1].outcome,initial.outcome);
 const low=estimateBattle([force('conquer',20),force('airArmy',20)],defense(22),0.25);const high=estimateBattle([force('conquer',20),force('airArmy',20)],defense(22),0.75);assert.notEqual(low.attackArmy,high.attackArmy);
});
test('source revision hashes ignore future and excluded reports, but detect replacement/removal',async()=>{
 const r=reports(),a=await scenarioEvidenceKey(r,1,[]);const later={...structuredClone(r[0]),turn:2,raw:'future'};
 assert.equal(await scenarioEvidenceKey([...r,later],1,[]),a);
 const excluded={...structuredClone(r[0]),player:2,raw:'excluded'};assert.equal(await scenarioEvidenceKey([...r,excluded],1,[2]),a);
 r[0].raw+=' changed';assert.notEqual(await scenarioEvidenceKey(r,1,[]),a);assert.notEqual(await scenarioEvidenceKey([],1,[]),a);
});

function workspace():Workspace{return {version:1,selectedId:'c',campaigns:[{id:'c',name:'Fictional',game:'DEMO-A',player:1,reports:[{filename:'own.txt',text:demoReport()}],alliedReports:[{filename:'ally.txt',text:demoReport().replace('Player [1:','Player [2:').replaceAll('AAL [1:','AAL [2:')}],orderDrafts:[{baseTurn:1,text:'ORDERS\nEND',updatedAt:new Date().toISOString()}]}]};}
test('scenario inputs survive browser/cloud decode, export and local transfer; orders unchanged',()=>{
 const original=workspace(),saved=saveScenario(original,'c',scenario());assert.equal(original.campaigns[0].battleScenarios,undefined);assert.deepEqual(saved.campaigns[0].orderDrafts,original.campaigns[0].orderDrafts);
 const decoded=decodeWorkspace(JSON.stringify(saved));assert.deepEqual(decoded.campaigns[0].battleScenarios,[scenarioWithIds(saved)]);
 assert.deepEqual(validateCloudSave({workspace:saved,revision:0}).workspace.campaigns[0].battleScenarios,saved.campaigns[0].battleScenarios);
 const merged=mergeLocalWorkspace({version:1,campaigns:[],selectedId:null},decoded);assert.deepEqual(merged.campaigns[0].battleScenarios,saved.campaigns[0].battleScenarios);
 let raw='';const storage={getItem:()=>raw||null,setItem:(_k:string,v:string)=>{raw=v;}} as Storage;browserRepository(storage).save(saved);assert.deepEqual(browserRepository(storage).load().campaigns[0].battleScenarios,saved.campaigns[0].battleScenarios);
});
function scenarioWithIds(state:Workspace){return state.campaigns[0].battleScenarios![0];}
test('conflicting saved alternatives stop local transfer without overwriting',()=>{
 const a=saveScenario(workspace(),'c',scenario()),b=structuredClone(a);b.campaigns[0].battleScenarios![0].name='Changed';assert.throws(()=>mergeLocalWorkspace(a,b),/Conflicting battle scenarios/);assert.equal(a.campaigns[0].battleScenarios![0].name,'Test attack');
});
test('report removal preserves plan for review; deleting scenario preserves reports and orders',async()=>{
 let w=workspace();const r=w.campaigns[0];const all=[...r.reports,...r.alliedReports!].map(x=>parseReport(x.text,x.filename));const s=scenario();s.evidenceKey=await scenarioEvidenceKey(all,1,[]);w=saveScenario(w,'c',s);const removed=removeAlliedReport(w,'c',2,1);assert.equal(removed.campaigns[0].battleScenarios![0].evidenceKey,s.evidenceKey);assert.notEqual(await scenarioEvidenceKey(removed.campaigns[0].reports.map(x=>parseReport(x.text,x.filename)),1,[]),s.evidenceKey);
 const deleted=removeScenario(w,'c',s.id);assert.equal(deleted.campaigns[0].battleScenarios!.length,0);assert.deepEqual(deleted.campaigns[0].reports,w.campaigns[0].reports);assert.deepEqual(deleted.campaigns[0].orderDrafts,w.campaigns[0].orderDrafts);
});
test('malformed persisted scenarios and oversized inputs are rejected',()=>{
 for(const patch of [{baseTurn:-1},{orderTurn:9},{defense:{Army:-1}},{defense:{Army:NaN}},{choices:{__x:'1:1'}},{target:'WWW'},{commitments:[{id:'bad',groupId:'AAA',role:'unknown',quantity:1}]},{targetHolder:{kind:'occupied',player:null}},{evidenceKey:'fake'},{notes:'x'.repeat(4001)}])assert.throws(()=>validateScenarios([{...scenario(),...patch}]));
 assert.throws(()=>validateScenarios([scenario(),scenario()]));assert.equal(validateScenarios([scenario()])[0].modelVersion,MODEL_VERSION);
});
test('new scenarios require explicit assumptions and do not preallocate forces',()=>{const s=newScenario(3,'BBB');assert.equal(s.orderTurn,4);assert.deepEqual(s.commitments,[]);assert.equal(s.assumptions.isolated,false);assert.equal(s.evidenceKey,'');});

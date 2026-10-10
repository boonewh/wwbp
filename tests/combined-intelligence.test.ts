import {test} from 'node:test';
import assert from 'node:assert/strict';
import {combineIntelligence,resolveGroup,intelligenceTotals,sourceId} from '../src/lib/combined-intelligence';
import {parseReport} from '../src/lib/wwbp/parser';
import {demoReport} from '../src/lib/demo';
import type {Report,Space,Values} from '../src/lib/wwbp/types';

const land=(code:string,player:number|null,values:Values={},visible=true):Space=>({code,kind:player===null?'minor':'occupied',owner:player,controller:null,values,suppressed:{},visible,popularity:{},fleets:[],raw:`${code}: fictional observed record`});
const sea=(player:number,values:Values):Space=>({...land('WWM',null),kind:'sea',fleets:[{player,values}],raw:`WWM [${player}](Navy=${values.Navy??0})`});
function report(player=1,turn=2):Report{
 const r=parseReport(demoReport('DEMO-A',turn));
 return {...r,player,filename:`P${player}-T${turn}.txt`,spaces:{},own:{},raw:`Game DEMO-A, Turn ${turn}, Player [${player}:TEST]\nForces under your control:\nOccupied Countries\n`};
}
function rows(reports:Report[],turn=2,choices:Record<string,string>={}){
 return combineIntelligence(reports,'DEMO-A',turn).groups.map(group=>resolveGroup(group,turn,choices[group.id]));
}

test('matching country sightings and different report sources contribute one force count',()=>{
 const a=report(1),b=report(2);
 a.spaces.AAL=land('AAL',3,{Army:12,Navy:0,AirF:5});b.spaces.AAL=structuredClone(a.spaces.AAL);
 b.spaces.AMO=land('AMO',3,{Army:4});
 const result=rows([a,b]),algeria=result.find(r=>r.group.id==='AAL')!;
 assert.equal(algeria.group.candidates.length,2);
 assert.equal(algeria.values.Army,12);assert.deepEqual(algeria.conflicts,[]);
 const total=intelligenceTotals(result).players.find(p=>p.player===3)!;
 assert.equal(total.fields.Army.units,16);assert.equal(total.groups,2);
});

test('sea sightings deduplicate by location and contingent player, not reporting player',()=>{
 const a=report(1),b=report(2);
 a.spaces.WWM=sea(4,{Army:3,Navy:10,AirF:2});
 b.spaces.WWM={...sea(4,{Army:3,Navy:10,AirF:2}),fleets:[...a.spaces.WWM.fleets,{player:5,values:{Army:1,Navy:7,AirF:4}}]};
 const result=rows([a,b]);
 assert.equal(result.length,2);
 const total=intelligenceTotals(result).players;
 assert.equal(total.find(p=>p.player===4)!.fields.Navy.units,10);
 assert.equal(total.find(p=>p.player===5)!.fields.Navy.units,7);
 assert.equal(result.find(r=>r.group.id==='WWM:P4')!.group.candidates.length,2);
});

test('a command-table contingent overlaps its visible listing and other players sightings',()=>{
 const a=report(2),b=report(1);
 a.spaces.WWM=sea(2,{Navy:10});a.own.WWM={code:'WWM',kind:'sea',values:{Army:0,Navy:10,AirF:0}};
 b.spaces.WWM=sea(2,{Army:0,Navy:10,AirF:0});
 const result=rows([a,b]);
 assert.equal(result.length,1);assert.equal(result[0].group.candidates.length,2);
 assert.equal(result[0].values.Navy,10);
 assert.equal(intelligenceTotals(result).players[0].fields.Navy.units,10);
 assert.equal(result[0].group.candidates.find(o=>o.source.player===2)!.basis,'command');
});

test('unknown and zero stay distinct while complementary sources fill gaps without addition',()=>{
 const a=report(1),b=report(2);
 a.spaces.AAL=land('AAL',3,{Army:0});b.spaces.AAL=land('AAL',3,{Navy:7});
 const row=rows([a,b])[0];
 assert.deepEqual(row.values,{Army:0,Navy:7});assert.deepEqual(row.conflicts,[]);
 const total=intelligenceTotals([row]).players[0];
 assert.equal(total.fields.Army.reported,1);assert.equal(total.fields.Army.units,0);
 assert.equal(total.fields.AirF.reported,0);assert.equal(total.fields.AirF.missing,1);
});

test('conflicting counts exclude the entire group until a source is explicitly chosen',()=>{
 const a=report(1),b=report(2);
 a.spaces.AAL=land('AAL',3,{Army:12,Navy:2});b.spaces.AAL=land('AAL',3,{Army:18});
 let result=rows([a,b]);
 assert.deepEqual(result[0].conflicts,['Army']);
 assert.equal(result[0].values.Army,undefined);
 assert.equal(intelligenceTotals(result).conflicted,1);assert.equal(intelligenceTotals(result).players.length,0);
 result=rows([a,b],2,{AAL:sourceId(b)});
 assert.equal(result[0].values.Army,18);assert.equal(result[0].values.Navy,undefined);
 assert.equal(intelligenceTotals(result).players[0].fields.Army.units,18);
 assert.deepEqual(result[0].conflicts,['Army']);
 assert.equal(rows([a,b],2,{AAL:'not-a-source'})[0].chosen,undefined);
});

test('conflicting ownership is a single country, and a decision takes its forces and holder together',()=>{
 const a=report(1),b=report(2);
 a.spaces.AAL=land('AAL',3,{Army:12});b.spaces.AAL=land('AAL',4,{Army:20});
 const unresolved=rows([a,b]);
 assert.equal(unresolved.length,1);assert.ok(unresolved[0].conflicts.includes('Ownership/control'));
 assert.equal(intelligenceTotals(unresolved).players.length,0);
 const decided=rows([a,b],2,{AAL:sourceId(b)});
 assert.equal(decided[0].holder?.player,4);
 assert.equal(intelligenceTotals(decided).players[0].fields.Army.units,20);
});

test('minor control disagreement cannot turn one minor into two contingents',()=>{
 const a=report(1),b=report(2);
 a.spaces.AMO={...land('AMO',null,{Army:5}),controller:1};b.spaces.AMO={...land('AMO',null,{Army:5}),controller:2};
 const result=rows([a,b]);assert.equal(result.length,1);
 assert.deepEqual(result[0].conflicts,['Ownership/control']);assert.equal(intelligenceTotals(result).conflicted,1);
});

test('future reports cannot contribute forces, sources, records, or player identities to an earlier snapshot',()=>{
 const a=report(1,2),future=report(9,4);
 a.spaces.AAL=land('AAL',3,{Army:12});future.spaces.AMO={...land('AMO',9,{Army:999}),raw:'FUTURE SECRET'};
 const snapshot=combineIntelligence([a,future],'DEMO-A',2);
 assert.equal(snapshot.sources.length,1);assert.equal(snapshot.groups.length,1);
 assert.equal(JSON.stringify(snapshot).includes('FUTURE SECRET'),false);
 assert.equal(snapshot.sources.some(s=>s.player===9),false);
});

test('older reports are historical and never added to current observations of the same location',()=>{
 const old=report(1,1),current=report(2,3);
 old.spaces.AAL=land('AAL',3,{Army:100});current.spaces.AAL=land('AAL',3,{Army:8});
 old.spaces.AMO=land('AMO',4,{Army:50});
 const result=rows([old,current],3),algeria=result.find(r=>r.group.id==='AAL')!;
 assert.equal(algeria.values.Army,8);assert.equal(algeria.group.observations.length,2);
 assert.equal(algeria.group.candidates.length,1);assert.deepEqual(algeria.conflicts,[]);
 const totals=intelligenceTotals(result);assert.equal(totals.historical,1);
 assert.equal(totals.players.length,1);assert.equal(totals.players[0].fields.Army.units,8);
});

test('new ownership-only reports do not silently restore older force counts',()=>{
 const old=report(1,1),current=report(2,3);
 old.spaces.AAL=land('AAL',3,{Army:100});current.spaces.AAL=land('AAL',4,{},false);
 const result=rows([old,current],3);
 assert.equal(result[0].holder?.player,4);assert.equal(result[0].values.Army,undefined);
 assert.equal(result[0].group.observations[1].values.Army,100);
 const totals=intelligenceTotals(result).players[0];
 assert.equal(totals.player,4);assert.equal(totals.fields.Army.reported,0);
});

test('a missing fleet listing leaves old contingents historical instead of fabricating current zeroes',()=>{
 const old=report(1,1),current=report(2,2);
 old.spaces.WWM=sea(3,{Navy:10});current.spaces.WWM={...sea(0,{}),fleets:[]};
 const result=rows([old,current]);
 assert.equal(result.find(r=>r.group.id==='WWM:P3')!.historical,true);
 assert.equal(result.find(r=>r.group.id==='WWM:Punknown')!.values.Navy,undefined);
 assert.equal(intelligenceTotals(result).players.length,0);
});

test('suppression and fractions remain visible but do not inflate usable totals',()=>{
 const a=report(1),b=report(2);
 a.spaces.AAL=land('AAL',3,{Army:4.75,AirF:2.9});a.spaces.AAL.suppressed={AirF:8};
 b.spaces.AAL=structuredClone(a.spaces.AAL);
 const result=rows([a,b]),total=intelligenceTotals(result).players[0];
 assert.equal(result[0].values.Army,4.75);assert.equal(result[0].suppressed.AirF,8);
 assert.equal(total.fields.Army.units,4);assert.equal(total.fields.AirF.units,2);assert.equal(total.fields.AirF.suppressed,8);
 b.spaces.AAL.suppressed.AirF=10;
 assert.ok(rows([a,b])[0].conflicts.includes('AirF suppressed'));
});

test('source observations retain report attribution and source records without mutating inputs',()=>{
 const a=report(1);a.spaces.AAL=land('AAL',3,{Army:5});
 const original=JSON.stringify(a),snapshot=combineIntelligence([a],'DEMO-A',2);
 assert.deepEqual(snapshot.groups[0].candidates[0].source,{id:'1:2',player:1,turn:2,filename:'P1-T2.txt'});
 assert.equal(snapshot.groups[0].candidates[0].record,'AAL: fictional observed record');
 resolveGroup(snapshot.groups[0],2);intelligenceTotals(rows([a]));
 assert.equal(JSON.stringify(a),original);
});

test('source removal and source filtering recompute evidence and totals, without retained decisions',()=>{
 const a=report(1),b=report(2);a.spaces.AAL=land('AAL',3,{Army:5});b.spaces.AAL=land('AAL',3,{Army:7});
 assert.equal(intelligenceTotals(rows([a,b])).conflicted,1);
 const result=rows([a],2,{AAL:sourceId(b)});
 assert.equal(result[0].chosen,undefined);assert.equal(result[0].values.Army,5);
 assert.equal(result[0].group.observations.length,1);
 assert.deepEqual(combineIntelligence([],'DEMO-A',2).groups,[]);
});

test('different games, duplicate revisions, invalid turns, and repeated contingent entries fail explicitly',()=>{
 assert.throws(()=>combineIntelligence([{...report(),game:'DEMO-B'}],'DEMO-A',2),/mix games/);
 assert.throws(()=>combineIntelligence([report(),report()],'DEMO-A',2),/one report revision/);
 for(const turn of [-1,NaN,1.5])assert.throws(()=>combineIntelligence([],'DEMO-A',turn),/valid intelligence turn/);
 const a=report();a.spaces.WWM=sea(3,{Navy:2});a.spaces.WWM.fleets.push({player:3,values:{Navy:2}});
 assert.throws(()=>combineIntelligence([a],'DEMO-A',2),/multiple fleet entries/);
});

test('real parser command and visibility records reconcile into one current location',()=>{
 const own=parseReport(demoReport());
 const ally=parseReport(demoReport().replace('Player [1:DEMONSTRATION]','Player [2:ALLY]'));
 // Both test reports command the same location; that disagreement must not be added.
 const result=rows([own,ally],1);
 const country=result.find(r=>r.group.id==='AAL')!;
 assert.equal(country.group.candidates.length,2);
 assert.equal(country.values.Army,12);
 assert.ok(country.conflicts.includes('Ownership/control'));
 assert.match(country.group.candidates[0].record,/AAL 12 0 5/);
});

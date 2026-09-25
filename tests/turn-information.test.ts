import {test} from 'node:test';
import assert from 'node:assert/strict';
import {turnInformation} from '../src/lib/turn-information';
import {mapChanges} from '../src/lib/map-changes';
import {parseReport} from '../src/lib/wwbp/parser';
import {demoReport} from '../src/lib/demo';
test('minor control changes between other players show each turn position names',()=>{
 const a=parseReport(demoReport());a.spaces.AMO.controller=2;a.players['2']='FIRST POSITION';
 const b=structuredClone(a);b.turn=2;b.spaces.AMO.controller=3;b.players['3']='SECOND POSITION';
 const row=turnInformation(a,b).ownership[0];
 assert.equal(row.code,'AMO');assert.match(row.before,/Player 2 · FIRST POSITION/);assert.match(row.after,/Player 3 · SECOND POSITION/);assert.equal(row.type,'Minor control changed');
 assert.ok(mapChanges(a,b).AMO.some(x=>x.label==='Minor control changed'));
});
test('conquest differs from minor control and unknown control is not a confirmed transfer',()=>{
 const a=parseReport(demoReport()),b=structuredClone(a);b.spaces.AMO.owner=2;b.spaces.AMO.controller=null;b.spaces.AMO.kind='occupied';
 assert.equal(turnInformation(a,b).ownership[0].type,'Conquered');
 b.spaces.AMO=structuredClone(a.spaces.AMO);b.spaces.AMO.visible=false;b.spaces.AMO.controller=null;
 assert.equal(turnInformation(a,b).ownership[0].type,'Minor control no longer reported');
 assert.match(turnInformation(a,b).ownership[0].after,/unknown/);
});
test('newly visible and lost visibility remain separate from updated known forces',()=>{
 const a=parseReport(demoReport()),b=structuredClone(a);
 b.spaces.ALI.visible=true;b.spaces.ALI.values.Army=8;b.spaces.AAL.values.Army=30;b.spaces.AMO.visible=false;
 const result=turnInformation(a,b);assert.deepEqual(result.information,['AAL']);assert.deepEqual(result.visible,['ALI']);assert.deepEqual(result.hidden,['AMO']);
 assert.deepEqual(turnInformation(null,b),{ownership:[],information:[],visible:[],hidden:[]});
});
test('fleet order and object property order alone do not create information changes',()=>{
 const a=parseReport(demoReport());a.spaces.WWM={...structuredClone(a.spaces.AAL),code:'WWM',kind:'sea',fleets:[{player:2,values:{Army:2,Navy:3}},{player:1,values:{AirF:4}}]};
 const b=structuredClone(a);b.spaces.WWM.fleets.reverse();b.spaces.WWM.fleets[1].values={Navy:3,Army:2};
 assert.deepEqual(turnInformation(a,b).information,[]);b.spaces.WWM.fleets[0].values.AirF=5;assert.deepEqual(turnInformation(a,b).information,['WWM']);
});

test('all conquests use the same capture wording regardless of previous minor visibility or occupation',()=>{
 for(const previousState of ['controlled','uncontrolled','unseen','occupied']){
  const a=parseReport(demoReport());const space=a.spaces.AMO;
  space.owner=previousState==='occupied'?3:null;
  space.controller=previousState==='controlled'?3:null;
  space.visible=previousState!=='unseen';a.players['3']='PREVIOUS POSITION';
  const b=structuredClone(a);b.spaces.AMO.owner=7;b.spaces.AMO.controller=null;b.players['7']='ETHI/KENYA/SOMA';
  const row=turnInformation(a,b).ownership[0];
  assert.equal(row.type,'Conquered');assert.equal(row.capturedBy,'Captured by Player 7 · ETHI/KENYA/SOMA');
  if(previousState==='controlled')assert.equal(row.before,'Player 3 · PREVIOUS POSITION (minor control)');
  if(previousState==='occupied')assert.equal(row.before,'Player 3 · PREVIOUS POSITION (occupied)');
 }
});
test('minor visibility and control changes stay separate from conquests',()=>{
 const a=parseReport(demoReport());a.spaces.AMO.owner=null;a.spaces.AMO.controller=null;a.spaces.AMO.visible=false;
 const b=structuredClone(a);b.spaces.AMO.visible=true;b.spaces.AMO.controller=3;b.players['3']='AUSTRIA';
 const row=turnInformation(a,b).ownership[0];
 assert.equal(row.capturedBy,null);assert.equal(row.type,'Minor controller now visible');
 assert.equal(row.after,'Player 3 · AUSTRIA (minor control)');
 const reverse=turnInformation(b,a).ownership[0];
 assert.equal(reverse.capturedBy,null);assert.equal(reverse.type,'Minor control no longer reported');
});

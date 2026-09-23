import {test} from 'node:test';
import assert from 'node:assert/strict';
import {forcesInRange} from '../src/lib/forces-in-range';
import {parseReport} from '../src/lib/wwbp/parser';
import {demoReport} from '../src/lib/demo';
import atlasData from '../src/data/atlas.json';
import type {Space,Geography} from '../src/lib/wwbp/types';
const atlas:Record<string,Geography>=atlasData;
const space=(code:string,player:number,army=0,navy=0,air=0):Space=>({code,kind:code.startsWith('W')?'sea':'occupied',owner:player,controller:null,visible:true,values:{Army:army,Navy:navy,AirF:air},suppressed:{},popularity:{},fleets:[],raw:''});
test('land attack candidates keep minor armies and different sea players separate',()=>{
 const r=parseReport(demoReport());r.spaces.AMO={...space('AMO',3,25),kind:'minor',owner:null,controller:3};
 r.spaces.WWM={...space('WWM',0),owner:null,fleets:[{player:14,values:{Army:40,Navy:20,AirF:10}},{player:2,values:{Army:9,Navy:8,AirF:7}}]};
 const result=forcesInRange(r,atlas,'AAL');
 assert.match(result.rows.find(x=>x.source==='AMO'&&x.force==='A')!.action,/cannot conquer/);
 assert.equal(result.rows.filter(x=>x.source==='WWM').length,6);
 assert.match(result.rows.find(x=>x.source==='WWM'&&x.force==='A')!.action,/coastal air.navy/);
 assert.equal(result.rows.find(x=>x.source==='AAL')!.local,true);
 assert.ok(result.gaps.some(g=>g.source==='ALI'));
});
test('navy cannot attack land from neighboring land and suppressed air is not added',()=>{
 const r=parseReport(demoReport());r.spaces.AMO=space('AMO',2,10,30,0);r.spaces.EIT=space('EIT',2,0,0,30);r.spaces.EIT.suppressed.AirF=8;
 const rows=forcesInRange(r,atlas,'AAL').rows;
 assert.equal(rows.some(x=>x.source==='AMO'&&x.force==='N'),false);
 const air=rows.find(x=>x.source==='EIT'&&x.force==='F')!;assert.equal(air.count,30);assert.match(air.action,/8F suppressed, excluded/);
});
test('sea targets admit naval/air support but never incoming army combat',()=>{
 const r=parseReport(demoReport());r.spaces.AMO=space('AMO',2,20,30,10);
 const rows=forcesInRange(r,atlas,'WWM').rows;
 assert.ok(rows.some(x=>x.source==='AMO'&&x.force==='N'));assert.ok(rows.some(x=>x.source==='AMO'&&x.force==='F'));
 assert.equal(rows.some(x=>!x.local&&x.force==='A'),false);
});
test('canal navy remains conditional unless the relevant player controls its gate',()=>{
 const r=parseReport(demoReport());r.spaces.WMA={...space('WMA',0),fleets:[{player:2,values:{Army:0,Navy:20,AirF:0}}]};
 let row=forcesInRange(r,atlas,'WWM').rows.find(x=>x.source==='WMA'&&x.force==='N')!;assert.match(row.action,/not confirmed/);
 r.spaces.EGI=space('EGI',2);row=forcesInRange(r,atlas,'WWM').rows.find(x=>x.source==='WMA'&&x.force==='N')!;assert.match(row.action,/controlled by this player/);
});
test('explicit air connections are not recursively extended and Gibraltar has no mid-Atlantic landing',()=>{
 const r=parseReport(demoReport());r.spaces.WMA={...space('WMA',0),fleets:[{player:2,values:{Army:20,Navy:20,AirF:0}}]};
 assert.equal(forcesInRange(r,atlas,'EGI').rows.some(x=>x.source==='WMA'&&x.force==='A'),false);
 const small={AAA:{name:'A',x:0,y:0,surface:[],air:['BBB'],canals:[]},BBB:{name:'B',x:0,y:0,surface:[],air:['CCC'],canals:[]},CCC:{name:'C',x:0,y:0,surface:[],air:[],canals:[]}};
 r.spaces.AAA=space('AAA',2,0,0,20);assert.equal(forcesInRange(r,small,'CCC').rows.some(x=>x.source==='AAA'),false);
});
test('unknown controllers are unassigned and unbuilt fractions do not inflate force counts',()=>{
 const r=parseReport(demoReport());r.spaces.AMO={...space('AMO',0,3.99),kind:'minor',owner:null,controller:null};
 const row=forcesInRange(r,atlas,'AAL').rows.find(x=>x.source==='AMO'&&x.force==='A')!;
 assert.equal(row.count,3);assert.equal(row.player,null);assert.match(row.action,/fraction excluded/);
});

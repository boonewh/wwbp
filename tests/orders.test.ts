import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkOrders} from '../src/lib/order-checker';
import {saveOrderDraft} from '../src/lib/order-drafts';
import {decodeWorkspace} from '../src/lib/workspace';
import {validateCloudSave,mergeLocalWorkspace} from '../src/lib/cloud-validation';
import {demoReport,demoWorkspace} from '../src/lib/demo';
import {parseReport} from '../src/lib/wwbp/parser';
import type {Geography} from '../src/lib/wwbp/types';
const node=(name:string,surface:string[],air:string[]=[]):Geography=>({name,x:0,y:0,surface,air,canals:[]});
const atlas={AAL:node('Algeria',['AMO','ALI','WWM']),AMO:node('Morocco',['AAL','WWM']),ALI:node('Libya',['AAL','WWM'],['AMO']),WWM:node('West Mediterranean',['AAL','AMO','ALI']),WMA:node('Mid Atlantic',[]),ERO:node('Romania',[])};
function fixture(){const r=parseReport(demoReport());r.own.AMO={code:'AMO',kind:'minor',values:{Army:8,Navy:4,AirF:5,Industry:3,Missiles:2,ABMs:2}};r.own.AAL.values={Army:12,Navy:4,AirF:5,Industry:10,Missiles:3,ABMs:2};r.players['2']='OPPONENT';return r;}
const errors=(s:string,r=fixture())=>{const result=checkOrders(s,r,atlas);return [...result.issues,...result.rows.flatMap(row=>row.issues)].filter(i=>i.level==='error').map(i=>i.message);};
test('order count excludes context and wrappers; explanations and export preserve orders',()=>{
 const result=checkOrders('ORDERS\n@ 2A\n@AAL BA5 AC3ALI\nEND',fixture(),atlas);
 assert.equal(result.count,3);assert.equal(result.rows[2].source,'AAL');assert.match(result.rows[2].description,/Conquer: 3A/);
 assert.equal(result.exportText,'ORDERS\r\n@     2A\r\n@AAL  BA5 AC3ALI\r\nEND\r\n');
 assert.deepEqual(errors(result.exportText),[]);assert.ok(result.exportText.split('\r\n').every(l=>l.length<=76));
});
test('combined orders cannot reuse units or industry; new builds do not increase available force',()=>{
 assert.ok(errors('@AAL AC8ALI AB7ALI').some(e=>e.includes('15 Army')));
 assert.ok(errors('@AAL BA8 BF5').some(e=>e.includes('13 Industry')));
 assert.ok(errors('@AAL BA10 AC20ALI').some(e=>e.includes('only 12')));
 assert.ok(errors('@AAL BA2 BA3').some(e=>e.includes('Duplicate')));
});
test('minor troops cannot conquer or move, but can bombard',()=>{
 assert.ok(errors('@AMO AC1AAL').some(e=>e.includes('Minor forces')));
 for(const action of ['AT','NT','FT','MT','XT'])assert.ok(errors('@AMO '+action+'1ALI').some(e=>e.includes('Minor forces')));
 const r=fixture();r.spaces.AAL.owner=2;assert.deepEqual(errors('@AMO AB2AAL',r),[]);
});
test('target terrain, own-country attacks and range checks respect unit type',()=>{
 assert.ok(errors('@AAL AC1WWM').some(e=>e.includes('land target')));
 assert.ok(errors('@AAL NT1AMO').some(e=>e.includes('land to land')));
 assert.ok(errors('@AAL MT1WWM').some(e=>e.includes('land target')));
 assert.ok(errors('@AAL AC1ERO').some(e=>e.includes('out of surface range')));
 assert.ok(errors('@AAL FA1ERO').some(e=>e.includes('out of air range')));
 assert.deepEqual(errors('@AAL MI1ERO'),[]);
 assert.ok(errors('@AMO AB1AAL').some(e=>e.includes('own occupied')));
 assert.ok(errors('@XYZ AC1ALI').some(e=>e.includes('unknown source')));
});
test('spy, counterspy and cash reservations exclude newly trained resources',()=>{
 assert.ok(errors('@ TS5 S6ALI').some(e=>e.includes('only 5')));
 assert.ok(errors('@ C3AAL').some(e=>e.includes('only 2')));
 assert.ok(errors('@ RI60 2D50').some(e=>e.includes('110 Dollars')));
 assert.ok(errors('@ S1AAL').some(e=>e.includes('cannot send spies')));
 assert.deepEqual(errors('@ 0S2 C1AAL RF10 P20AMO'),[]);
});
test('defaults use proportions while standing orders are explicit manual-review cases',()=>{
 assert.ok(errors('@ BA101').some(e=>e.includes('0 to 100')));
 assert.deepEqual(errors('@ BF0 BA100'),[]);
 const result=checkOrders('@AAL /1/BA999 /2/',fixture(),atlas);
 assert.deepEqual(errors('@AAL /1/BA999 /2/'),[]);
 assert.equal(result.budgets.length,0);assert.ok(result.issues.some(i=>i.message.includes('not simulated')));
 assert.ok(errors('@WWM /1/BA5').length>0);
});
test('conflicts and gift warnings identify easy-to-miss order semantics',()=>{
 assert.ok(errors('@AAL AC3ALI AS2ALI').some(e=>e.includes('Conflicts')));
 assert.ok(errors('@AAL MA1ALI XT1ALI').some(e=>e.includes('Conflicts')));
 const result=checkOrders('@AAL AT2AMO',fixture(),atlas);
 assert.ok(result.rows[0].issues.some(i=>i.level==='warning'&&i.message.includes('gift')));
});
test('canal-only surface connections warn on unknown permission, but air is allowed',()=>{
 const map=structuredClone(atlas);map.WWM.canals=[{target:'WMA',gate:'AMO'}];
 const r=fixture();r.own.WWM={code:'WWM',kind:'sea',values:{Army:4,Navy:5,AirF:3}};r.spaces.AMO.controller=2;
 const naval=checkOrders('@WWM NT2WMA',r,map),air=checkOrders('@WWM FS2WMA',r,map);
 assert.ok(naval.rows[0].issues.some(i=>i.message.includes('Canal AMO')));
 assert.ok(!air.rows[0].issues.some(i=>i.message.includes('Canal AMO')));
});
test('malformed envelope and unrecognized text block export review',()=>{
 assert.ok(errors('ORDERS\n@ 2A\nEND\n@ 2E').some(e=>e.includes('after END')));
 assert.ok(errors('ORDERS\nORDERS\n@ 2A\nEND').length>0);
 assert.ok(errors('@AAL AC1NOPE').length>0);
 assert.ok(errors('@AAL AC-1ALI').length>0);
 assert.ok(errors('MSG\n2\nhello').length>0);
});
test('drafts survive cloud validation and backups with campaign and base-turn separation',()=>{
 const original=demoWorkspace(),draft={baseTurn:2,text:'@AAL AC3ALI',updatedAt:'2026-09-25T12:00:00Z'};
 const changed=saveOrderDraft(original,'demo-a',draft);
 assert.equal(original.campaigns[0].orderDrafts,undefined);assert.equal(changed.campaigns[1].orderDrafts,undefined);
 assert.deepEqual(decodeWorkspace(JSON.stringify(changed)).campaigns[0].orderDrafts,[draft]);
 assert.deepEqual(validateCloudSave({workspace:changed,revision:0}).workspace.campaigns[0].orderDrafts,[draft]);
 const next=saveOrderDraft(changed,'demo-a',{...draft,baseTurn:3,text:'@ 2A'});assert.equal(next.campaigns[0].orderDrafts?.length,2);
 assert.throws(()=>decodeWorkspace(JSON.stringify({...changed,campaigns:[{...changed.campaigns[0],orderDrafts:[draft,draft]}]})),/duplicate/);
 assert.throws(()=>saveOrderDraft(changed,'demo-a',{...draft,text:'x'.repeat(100001)}),/Invalid/);
});
test('browser transfer preserves private drafts and refuses silent conflict overwrites',()=>{
 const original=demoWorkspace(),draft={baseTurn:2,text:'@ 2A',updatedAt:'2026-09-25T12:00:00Z'};
 const local=saveOrderDraft(original,'demo-a',draft),merged=mergeLocalWorkspace(original,local);
 assert.deepEqual(merged.campaigns[0].orderDrafts,[draft]);
 assert.throws(()=>mergeLocalWorkspace(saveOrderDraft(original,'demo-a',{...draft,text:'@ 2E'}),local),/Conflicting order drafts/);
});

test('export groups repeated sources, keeps each source order, and places player orders first',()=>{
 const result=checkOrders('@AAL BA2\n@AMO BF1\n@AAL AC3ALI\n@ 2A',fixture(),atlas);
 assert.equal(result.exportText,'ORDERS\r\n@     2A\r\n@AAL  BA2 AC3ALI\r\n@AMO  BF1\r\nEND\r\n');
 const roundtrip=checkOrders(result.exportText,fixture(),atlas);
 assert.equal(roundtrip.count,result.count);
 assert.deepEqual(roundtrip.rows.filter(r=>r.source==='AAL').map(r=>r.token),['BA2','AC3ALI']);
 assert.deepEqual(errors(result.exportText),[]);
});
test('long export groups wrap at 76 characters without splitting or losing orders',()=>{
 const text='@ '+Array.from({length:40},(_,i)=>(i+2)+'A').join(' ')+'\n@AAL BA2 AC3ALI';
 const result=checkOrders(text,fixture(),atlas);
 assert.ok(result.exportText.split('\r\n').every(line=>line.length<=76));
 assert.match(result.exportText,/\r\n {6}\d+A/);
 const parsed=checkOrders(result.exportText,fixture(),atlas);
 assert.deepEqual(parsed.rows.map(r=>[r.source,r.token]),result.rows.map(r=>[r.source,r.token]));
 assert.equal(parsed.count,42);
 assert.equal(parsed.exportText,result.exportText);
});

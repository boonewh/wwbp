import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapChanges} from '../src/lib/map-changes';
import {parseReport} from '../src/lib/wwbp/parser';
import {demoReport} from '../src/lib/demo';
test('overlay preserves simultaneous capture and intelligence gain without duplicate ownership label',()=>{
 const before=parseReport(demoReport()),after=structuredClone(before);after.turn=2;
 after.spaces.ALI.owner=1;after.spaces.ALI.visible=true;
 assert.deepEqual(mapChanges(before,after).ALI.map(c=>c.label),['Captured','Newly visible intelligence']);
 assert.deepEqual(mapChanges(null,after),{});
 assert.equal(mapChanges(before,before).AAL,undefined);
});
test('overlay distinguishes loss, control, other ownership and lost visibility',()=>{
 const before=parseReport(demoReport()),after=structuredClone(before);
 after.spaces.AAL.owner=2;after.spaces.AAL.visible=false;
 after.spaces.AMO.controller=2;after.spaces.ALI.owner=3;
 const changes=mapChanges(before,after);
 assert.deepEqual(changes.AAL.map(c=>c.style),['loss','hidden']);
 assert.equal(changes.AMO[0].label,'Minor control lost');
 assert.equal(changes.ALI[0].label,'Ownership changed');
});

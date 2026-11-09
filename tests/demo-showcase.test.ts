import {test} from 'node:test';
import assert from 'node:assert/strict';
import {showcaseReport,showcaseWorkspace} from '../src/lib/demo-showcase';
import {parseReport,compare} from '../src/lib/wwbp/parser';
import {decodeWorkspace} from '../src/lib/workspace';

test('showcase demo reports parse with many players and visible turn changes',()=>{
 const reports=[1,2,3].map(t=>parseReport(showcaseReport(t),`demo-world-turn-${t}.txt`));
 for(const r of reports){
  assert.equal(r.game,'DEMO-WORLD');assert.equal(r.player,1);
  assert.ok(Object.keys(r.own).length>=20);
  assert.ok(new Set(Object.values(r.spaces).map(s=>s.owner||s.controller).filter(Boolean)).size>=8);
 }
 const changes=compare(reports[0],reports[1]);
 assert.ok(changes.captures.length>0);
 assert.equal(reports[0].errors.length,0);assert.equal(reports[1].errors.length,1);
});

test('showcase workspace selects the world campaign and keeps the practice campaigns',()=>{
 const state=showcaseWorkspace();
 assert.equal(state.selectedId,'demo-world');
 assert.deepEqual(state.campaigns.map(c=>c.id),['demo-world','demo-a','demo-b']);
 assert.deepEqual(decodeWorkspace(JSON.stringify(state)),state);
});

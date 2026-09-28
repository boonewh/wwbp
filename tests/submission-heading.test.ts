import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateHeading,headingForTurn,saveHeading} from '../src/lib/submission-heading';
import {saveOrderDraft} from '../src/lib/order-drafts';
import {demoWorkspace} from '../src/lib/demo';
import {decodeWorkspace} from '../src/lib/workspace';
import {validateCloudSave,mergeLocalWorkspace} from '../src/lib/cloud-validation';
const heading='DEMO-A T-9 [1] Fictional Player, #123 <T-99-EXAMPLE>';
test('heading persists through cloud validation and reload in its own campaign only',()=>{
 const original=demoWorkspace(),saved=saveHeading(original,'demo-a',heading);
 assert.equal(original.campaigns[0].submissionHeading,undefined);
 assert.equal(saved.campaigns[1].submissionHeading,undefined);
 const checked=validateCloudSave({workspace:saved,revision:0}).workspace;
 assert.equal(decodeWorkspace(JSON.stringify(checked)).campaigns[0].submissionHeading,heading);
 assert.equal(headingForTurn(heading,10),'DEMO-A T-10 [1] Fictional Player, #123 <T-99-EXAMPLE>');
 assert.equal(headingForTurn(heading,2),'DEMO-A T-2 [1] Fictional Player, #123 <T-99-EXAMPLE>');
 assert.equal(saveHeading(saved,'demo-a','').campaigns[0].submissionHeading,'');
});
test('heading rejects wrong campaign/player, multiline text and oversized lines',()=>{
 assert.throws(()=>validateHeading(heading,'DEMO-B',1),/match/);
 assert.throws(()=>validateHeading(heading,'DEMO-A',2),/match/);
 assert.throws(()=>validateHeading(heading+'\nORDERS','DEMO-A',1),/one heading/);
 assert.throws(()=>validateHeading('x'.repeat(77),'DEMO-A',1),/76/);
 assert.throws(()=>validateHeading('missing turn','DEMO-A',1),/Use:/);
 assert.equal(validateHeading('   ','DEMO-A',1),'');
});
test('transfer carries headings and stops on conflicts without changing originals',()=>{
 const cloud=demoWorkspace(),local=saveHeading(demoWorkspace(),'demo-a',heading);
 assert.equal(mergeLocalWorkspace(cloud,local).campaigns[0].submissionHeading,heading);
 const other=saveHeading(cloud,'demo-a','DEMO-A T-9 [1] Different Player, #456 <OTHER>');
 assert.throws(()=>mergeLocalWorkspace(other,local),/Conflicting submission headings/);
 assert.equal(other.campaigns[0].submissionHeading,'DEMO-A T-9 [1] Different Player, #456 <OTHER>');
});

test('compact turn headings save with empty and populated drafts and retain their format on export',()=>{
 for(const text of ['', '@\n2A']){
  const compact='DEMO-A T5 [1] #123 FICTIONAL';
  const original=demoWorkspace();
  const saved=saveOrderDraft(saveHeading(original,'demo-a',compact),'demo-a',{baseTurn:5,text,updatedAt:'2026-09-27T12:00:00Z'});
  const reloaded=decodeWorkspace(JSON.stringify(validateCloudSave({workspace:saved,revision:0}).workspace));
  assert.equal(reloaded.campaigns[0].submissionHeading,compact);
  assert.equal(reloaded.campaigns[0].orderDrafts?.find(d=>d.baseTurn===5)?.text,text);
  assert.equal(headingForTurn(reloaded.campaigns[0].submissionHeading!,6),'DEMO-A T6 [1] #123 FICTIONAL');
 }
});

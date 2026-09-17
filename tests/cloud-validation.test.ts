import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateCloudSave,mergeLocalWorkspace,sameOriginWrite} from '../src/lib/cloud-validation';
import {demoWorkspace,demoReport} from '../src/lib/demo';
import {emptyWorkspace} from '../src/lib/workspace';
test('server validation accepts good reports and rejects forged game ownership',()=>{const workspace=demoWorkspace();assert.deepEqual(validateCloudSave({workspace,revision:0}).workspace,workspace);workspace.campaigns[0].game='FORGED';assert.throws(()=>validateCloudSave({workspace,revision:1}),/belongs/);});
test('server validation rejects invalid revisions and corrupt payloads',()=>{for(const revision of [-1,1.2,'1',null])assert.throws(()=>validateCloudSave({workspace:demoWorkspace(),revision}));assert.throws(()=>validateCloudSave({revision:0,workspace:{version:1,campaigns:[{}]}}));});
test('local transfer merges same game/player, skips duplicates, and keeps cloud selection',()=>{const cloud=demoWorkspace(),local=demoWorkspace();local.campaigns[0].reports.push({filename:'turn3.txt',text:demoReport('DEMO-A',3)});const merged=mergeLocalWorkspace(cloud,local);assert.equal(merged.campaigns.length,2);assert.equal(merged.campaigns[0].reports.length,3);assert.equal(merged.selectedId,cloud.selectedId);assert.equal(cloud.campaigns[0].reports.length,2);});
test('local transfer creates fresh IDs and rejects conflicting turns atomically',()=>{const local=demoWorkspace();const result=mergeLocalWorkspace(emptyWorkspace,local);assert.notEqual(result.campaigns[0].id,local.campaigns[0].id);const cloud=demoWorkspace();local.campaigns[0].reports[0].text=demoReport('DEMO-A',1,99);assert.throws(()=>mergeLocalWorkspace(cloud,local),/different report/);assert.equal(cloud.campaigns[0].reports[0].text,demoReport());});

test('server refuses oversized save bodies',()=>{assert.throws(()=>validateCloudSave({revision:0,workspace:{version:1,campaigns:[],padding:"x".repeat(3_500_001)}}),/too large/);});

test('same-origin check uses external host while rejecting foreign, missing, and malformed origins',()=>{
 const req=(origin:string,host='127.0.0.1:3000')=>new Request('http://localhost:3000/api/workspace',{headers:{host,origin}});
 assert.equal(sameOriginWrite(req('http://127.0.0.1:3000')),true);
 for(const origin of ['https://evil.example','null','','http://127.0.0.1:3000/path','https://127.0.0.1:3000'])assert.equal(sameOriginWrite(req(origin)),false);
});

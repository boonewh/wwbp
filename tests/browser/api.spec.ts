import {test,expect} from '@playwright/test';
import {demoWorkspace} from '../../src/lib/demo';
import {fixture,seedSession} from './helpers';

test.beforeEach(async({request})=>{await request.post(fixture+'/__fixture/reset');});
const sameOrigin={origin:'http://127.0.0.1:3321'};

test('missing and forged sessions cannot access private workspaces',async({context})=>{
 for(const forged of [false,true]){
  if(forged)await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:'forged',refresh_token:'invalid'})).toString('base64url'),url:'http://127.0.0.1:3321'}]);
  const response=await context.request.get('/api/workspace');expect(response.status()).toBe(401);
  expect(response.headers()['cache-control']).toContain('no-store');expect(response.headers()['vary']).toContain('Cookie');
 }
});

test('approved accounts load only their own workspace and unapproved accounts are denied',async({context,request})=>{
 for(const position of ['a','b','c']){
  await seedSession(context,request,position);const response=await context.request.get('/api/workspace');
  expect(response.status()).toBe(position==='c'?403:200);
  if(position!=='c')expect((await response.json()).workspace.campaigns[0].name).toBe(`Account ${position.toUpperCase()} fictional campaign`);
 }
});

test('cross-site, malformed and oversized saves leave campaigns untouched',async({context,request})=>{
 await seedSession(context,request);
 expect((await context.request.put('/api/workspace',{headers:{origin:'https://attacker.example'},data:{workspace:demoWorkspace(),revision:1}})).status()).toBe(403);
 expect((await context.request.put('/api/workspace',{headers:{...sameOrigin,'content-type':'text/plain'},data:'invalid'})).status()).toBe(415);
 expect((await context.request.put('/api/workspace',{headers:sameOrigin,data:{workspace:{},revision:1}})).status()).toBe(400);
 expect((await context.request.put('/api/workspace',{headers:{...sameOrigin,'content-type':'application/json'},data:'x'.repeat(3_500_001)})).status()).toBe(413);
 const state=await request.get(fixture+'/__fixture/stats').then(r=>r.json());
 expect(state.rows['11111111-1111-4111-8111-111111111111'].revision).toBe(1);
 expect(state.events.some((e:{method:string,path:string})=>['POST','PATCH'].includes(e.method)&&e.path==='/rest/v1/player_workspaces')).toBe(false);
});

test('revision filters preserve stale-save conflicts and the latest payload',async({context,request})=>{
 await seedSession(context,request);const workspace=demoWorkspace();workspace.campaigns[0].name='Synthetic updated campaign';
 const saved=await context.request.put('/api/workspace',{headers:sameOrigin,data:{workspace,revision:1}});
 expect(saved.status()).toBe(200);expect(await saved.json()).toEqual({revision:2});
 const conflict=await context.request.put('/api/workspace',{headers:sameOrigin,data:{workspace:demoWorkspace(),revision:1}});
 expect(conflict.status()).toBe(409);
 const loaded=await context.request.get('/api/workspace').then(r=>r.json());
 expect(loaded.revision).toBe(2);expect(loaded.workspace.campaigns[0].name).toBe('Synthetic updated campaign');
});

test('first cloud save and duplicate first-save race keep the correct revisions',async({context,request})=>{
 await request.post(fixture+'/__fixture/reset',{data:{emptyB:true}});await seedSession(context,request,'b');
 expect((await context.request.get('/api/workspace').then(r=>r.json())).revision).toBe(0);
 const data={workspace:demoWorkspace(),revision:0};
 const saved=await context.request.put('/api/workspace',{headers:sameOrigin,data});expect(saved.status()).toBe(200);expect(await saved.json()).toEqual({revision:1});
 expect((await context.request.put('/api/workspace',{headers:sameOrigin,data})).status()).toBe(409);
});

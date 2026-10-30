import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';

function client(fetch: typeof globalThis.fetch) {
 return createClient('https://database.example.test','synthetic-publishable-key',{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
  global:{fetch},
 });
}

test('patched SDK retains filtered workspace response/revision shapes',async()=>{
 let seenUrl='';let seenMethod='';
 const sdk=client(async(input,init)=>{seenUrl=String(input);seenMethod=String(init?.method);return new Response(JSON.stringify({revision:2}),{status:200,headers:{'Content-Type':'application/json'}});});
 const {data,error}=await sdk.from('player_workspaces').update({payload:{version:1,campaigns:[]},revision:2}).eq('owner_id','synthetic-owner').eq('revision',1).select('revision').maybeSingle();
 assert.equal(error,null);assert.deepEqual(data,{revision:2});assert.equal(seenMethod,'PATCH');
 const url=new URL(seenUrl);assert.equal(url.searchParams.get('owner_id'),'eq.synthetic-owner');assert.equal(url.searchParams.get('revision'),'eq.1');
});

test('SDK never retries an uncertain workspace write after a network error',async()=>{
 for(const method of ['insert','update'] as const){
  let attempts=0;
  const sdk=client(async()=>{attempts++;throw new TypeError('synthetic lost response');});
  const query=method==='insert'?sdk.from('player_workspaces').insert({revision:1}):sdk.from('player_workspaces').update({revision:2});
  const result=await query.select('revision');assert.ok(result.error);assert.equal(attempts,1);
 }
});

test('SDK preserves retryable reads and does not retry an aborted request',async()=>{
 let attempts=0;
 const sdk=client(async()=>{attempts++;return attempts===1?new Response('synthetic unavailable',{status:503,headers:{'Retry-After':'0'}}):new Response(JSON.stringify([{revision:1}]),{status:200,headers:{'Content-Type':'application/json'}});});
 const read=await sdk.from('player_workspaces').select('revision').maybeSingle();
 assert.equal(read.error,null);assert.deepEqual(read.data,{revision:1});assert.equal(attempts,2);
 const controller=new AbortController();controller.abort();let abortedAttempts=0;
 const aborted=client(async()=>{abortedAttempts++;throw Object.assign(new Error('synthetic abort'),{name:'TimeoutError'});});
 const result=await aborted.from('player_workspaces').select('revision').abortSignal(controller.signal);
 assert.ok(result.error);assert.equal(abortedAttempts,1);
});

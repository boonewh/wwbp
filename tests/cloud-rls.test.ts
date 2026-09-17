import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
test('PostgreSQL policies isolate accounts, enforce approval, and protect concurrent saves',async()=>{
 const db=new PGlite();
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',c='33333333-3333-4333-8333-333333333333';
 const payload=JSON.stringify({version:1,campaigns:[],selectedId:null});
 try{
 await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon; insert into auth.users values ('${a}'),('${b}'),('${c}');`);
 await db.exec(readFileSync(new URL('../supabase/migrations/202609150001_private_workspaces.sql',import.meta.url),'utf8'));
 await db.query('insert into public.pilot_members(user_id) values ($1),($2)',[a,b]);
 async function as(user:string,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec(`set role ${role}`);}
 await as(a);await db.query('insert into public.player_workspaces(payload) values ($1::jsonb)',[payload]);
 await assert.rejects(db.query('insert into public.player_workspaces(owner_id,payload) values ($1,$2::jsonb)',[b,payload]),/row-level security/);
 await as(b);assert.equal((await db.query('select * from public.player_workspaces')).rows.length,0);
 assert.equal((await db.query('update public.player_workspaces set payload=$1::jsonb,revision=2 where owner_id=$2 returning owner_id',[payload,a])).rows.length,0);
 await assert.rejects(db.query('delete from public.player_workspaces where owner_id=$1',[a]),/permission denied/);
 await db.query('insert into public.player_workspaces(payload) values ($1::jsonb)',[payload]);
 await assert.rejects(db.query('update public.player_workspaces set owner_id=$1,revision=2',[c]));
 await assert.rejects(db.query('insert into public.pilot_members(user_id) values ($1)',[c]),/permission denied/);
 await as(a);assert.equal((await db.query('select owner_id from public.player_workspaces')).rows.length,1);
 assert.equal((await db.query('update public.player_workspaces set revision=2 where owner_id=$1 and revision=1 returning revision',[a])).rows.length,1);
 assert.equal((await db.query('update public.player_workspaces set revision=2 where owner_id=$1 and revision=1 returning revision',[a])).rows.length,0);
 await assert.rejects(db.query('update public.player_workspaces set revision=4'),/increase by one/);
 await assert.rejects(db.query("update public.player_workspaces set payload='{}',revision=3"),/check constraint/);
 await assert.rejects(db.query("update public.player_workspaces set payload='{\"version\":null,\"campaigns\":[]}',revision=3"),/check constraint/);
 await as(c);assert.equal((await db.query('select * from public.player_workspaces')).rows.length,0);
 await assert.rejects(db.query('insert into public.player_workspaces(payload) values ($1::jsonb)',[payload]),/row-level security/);
 await as('','anon');await assert.rejects(db.query('select * from public.player_workspaces'),/permission denied/);
 await db.exec('reset role');await db.query('delete from public.pilot_members where user_id=$1',[a]);
 await as(a);assert.equal((await db.query('select * from public.player_workspaces')).rows.length,0);
 assert.equal((await db.query('update public.player_workspaces set revision=3 returning revision')).rows.length,0);
 }finally{await db.close();}
});

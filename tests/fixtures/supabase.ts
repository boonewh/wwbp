// Local-only synthetic Auth/PostgREST transport for the real application's SDK.
// No real keys, emails, reports, database connection or external request is used.
import {createServer} from 'node:http';
import {createHmac} from 'node:crypto';
import {demoWorkspace} from '../../src/lib/demo';

const ids={a:'11111111-1111-4111-8111-111111111111',b:'22222222-2222-4222-8222-222222222222',c:'33333333-3333-4333-8333-333333333333'};
type Position=keyof typeof ids;
let rows:Record<string,{payload:ReturnType<typeof demoWorkspace>;revision:number}>={};
let events:{method:string;path:string;owner?:string;createUser?:boolean}[]=[];
function reset(emptyB=false){rows={};events=[];for(const position of ['a','b'] as const){if(position==='b'&&emptyB)continue;const payload=demoWorkspace();payload.campaigns[0].name=`Account ${position.toUpperCase()} fictional campaign`;rows[ids[position]]={payload,revision:1};}}
function user(position:Position){return {id:ids[position],email:`player-${position}@example.test`,aud:'authenticated',role:'authenticated',created_at:'2026-01-01T00:00:00Z',app_metadata:{provider:'email',providers:['email']},user_metadata:{}};}
function token(position:Position,expired=false){const encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url');const input=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:ids[position],aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+(expired?-120:3600)});return input+'.'+createHmac('sha256','synthetic-local-signing-key').update(input).digest('base64url');}
function session(position:Position,expired=false){return {access_token:token(position,expired),refresh_token:`refresh-${position}`,token_type:'bearer',expires_in:expired?-120:3600,expires_at:Math.floor(Date.now()/1000)+(expired?-120:3600),user:user(position)};}
reset();
const server=createServer(async(req,res)=>{
 const url=new URL(req.url!,'http://127.0.0.1:4531');let raw='';for await(const chunk of req)raw+=chunk;
 const body=raw?JSON.parse(raw):{};
 res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:3321');res.setHeader('Access-Control-Allow-Headers','*');res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,OPTIONS');
 const reply=(status:number,data:unknown)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 if(url.pathname==='/health'){reply(200,{ready:true});return;}
 if(url.pathname==='/__fixture/reset'){reset(!!body.emptyB);reply(200,{});return;}
 if(url.pathname==='/__fixture/session'){reply(200,session((url.searchParams.get('user')||'a') as Position,url.searchParams.has('expired')));return;}
 if(url.pathname==='/__fixture/stats'){reply(200,{events,rows});return;}
 const bearer=req.headers.authorization?.replace(/^Bearer /,'');
 const position=(Object.keys(ids) as Position[]).find(key=>bearer===token(key));
 // Tokens use wall-clock seconds; recognize their fixture signature and subject.
 let authenticated=position;
 if(!authenticated&&bearer){try{const [header,payload,signature]=bearer.split('.');const expected=createHmac('sha256','synthetic-local-signing-key').update(header+'.'+payload).digest('base64url');const claims=JSON.parse(Buffer.from(payload,'base64url').toString());if(signature===expected&&claims.exp>Date.now()/1000)authenticated=(Object.keys(ids) as Position[]).find(key=>ids[key]===claims.sub);}catch{}}
 const event={method:req.method!,path:url.pathname,owner:authenticated?ids[authenticated]:undefined};events.push(event);
 if(url.pathname==='/auth/v1/otp'){
  events[events.length-1].createUser=body.create_user;
  if(body.create_user!==false){reply(400,{msg:'Fixture requires invited-account login'});return;}
  reply(200,{});return;
 }
 if(url.pathname==='/auth/v1/verify'){
  const key=(Object.keys(ids) as Position[]).find(key=>user(key).email===body.email);
  if(!key||body.token!=='123456'){reply(400,{msg:'Synthetic invalid code'});return;}
  reply(200,session(key));return;
 }
 if(url.pathname==='/auth/v1/token'){
  const key=(Object.keys(ids) as Position[]).find(key=>body.refresh_token===`refresh-${key}`);
  if(!key){reply(400,{msg:'Synthetic invalid refresh'});return;}reply(200,session(key));return;
 }
 if(url.pathname==='/auth/v1/user'){reply(authenticated?200:401,authenticated?user(authenticated):{msg:'Synthetic unauthorized'});return;}
 if(url.pathname==='/auth/v1/logout'){reply(200,{});return;}
 if(!authenticated){reply(401,{message:'Synthetic unauthorized'});return;}
 const owner=ids[authenticated];
 if(url.pathname==='/rest/v1/pilot_members'){
  if(url.searchParams.get('user_id')!==`eq.${owner}`){reply(400,{message:'Missing owner filter'});return;}
  reply(200,authenticated==='c'?[]:[{user_id:owner}]);return;
 }
 if(url.pathname==='/rest/v1/player_workspaces'){
  if(authenticated==='c'){reply(403,{message:'Synthetic pilot denial'});return;}
  if(req.method==='POST'){
   if(body.owner_id!==owner){reply(403,{message:'Synthetic owner denial'});return;}
   if(rows[owner]){reply(409,{code:'23505',message:'Synthetic duplicate'});return;}
   rows[owner]={payload:body.payload,revision:1};reply(201,{revision:1});return;
  }
  if(url.searchParams.get('owner_id')!==`eq.${owner}`){reply(400,{message:'Missing owner filter'});return;}
  if(req.method==='GET'){reply(200,rows[owner]?[rows[owner]]:[]);return;}
  if(req.method==='PATCH'){
   if(url.searchParams.get('revision')!==`eq.${rows[owner]?.revision}`){reply(200,null);return;}
   rows[owner]={payload:body.payload,revision:body.revision};reply(200,{revision:body.revision});return;
  }
 }
 reply(404,{message:'Unknown synthetic request'});
});
server.listen(4531,'127.0.0.1');

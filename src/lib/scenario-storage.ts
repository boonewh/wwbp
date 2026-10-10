import {MODEL_VERSION,roles,defenseFields,type BattleScenario,type Commitment} from './scenario-types';
import type {Report,Workspace} from './wwbp/types';

const object=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const integer=(n:unknown,min=0,max=1_000_000):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=min&&n<=max;
const str=(x:unknown,max:number):x is string=>typeof x==='string'&&x.length<=max;
const code=(x:unknown):x is string=>typeof x==='string'&&/^[A-Z]{3}$/.test(x);
export function validateScenarios(input:unknown):BattleScenario[]{
 if(!Array.isArray(input)||input.length>100)throw Error('Keep at most 100 battle scenarios per campaign.');
 const ids=new Set<string>();
 return input.map(s=>{
  if(!object(s)||!str(s.id,80)||!s.id||ids.has(s.id)||!str(s.name,80)||!s.name.trim()||!['attack','defense'].includes(String(s.mode))||!integer(s.baseTurn,0,99999)||!integer(s.orderTurn,1,100000)||s.orderTurn!==s.baseTurn+1||!code(s.target)||s.target.startsWith('W')||!str(s.notes,4000)||!str(s.evidenceKey,64)||!(/^[a-f0-9]{64}$/.test(s.evidenceKey)||s.evidenceKey==='')||!str(s.modelVersion,80)||!str(s.updatedAt,40)||!Number.isFinite(Date.parse(s.updatedAt)))throw Error('Invalid saved battle scenario.');
  ids.add(s.id);
  if(!Array.isArray(s.excludedPlayers)||s.excludedPlayers.length>999||s.excludedPlayers.some(p=>!integer(p,1,999))||new Set(s.excludedPlayers).size!==s.excludedPlayers.length||!object(s.choices)||Object.keys(s.choices).length>3000)throw Error('Invalid scenario intelligence selections.');
  const choices:Record<string,string>={};
  for(const [key,value] of Object.entries(s.choices)){if(!/^[A-Z]{3}(?::P(?:\d+|unknown))?$/.test(key)||!str(value,20)||!/^\d+:\d+$/.test(value))throw Error('Invalid scenario source choice.');choices[key]=value;}
  if(!object(s.defense)||Object.keys(s.defense).some(f=>!defenseFields.includes(f as typeof defenseFields[number]))||Object.values(s.defense).some(v=>!integer(v)))throw Error('Invalid assumed defense.');
  if(s.targetHolder!==undefined&&(!object(s.targetHolder)||!['occupied','minor'].includes(String(s.targetHolder.kind))||!(s.targetHolder.player===null&&s.targetHolder.kind==='minor')&&!integer(s.targetHolder.player,1,999)))throw Error('Invalid assumed target ownership.');
  if(!object(s.assumptions)||typeof s.assumptions.precombat!=='boolean'||typeof s.assumptions.isolated!=='boolean'||!Array.isArray(s.commitments)||s.commitments.length>100)throw Error('Invalid scenario assumptions or commitments.');
  const lineIds=new Set<string>();
  const commitments:Commitment[]=s.commitments.map((c:unknown)=>{
   if(!object(c)||!str(c.id,80)||!c.id||lineIds.has(c.id)||!str(c.groupId,80)||!Object.hasOwn(roles,String(c.role))||!integer(c.quantity,1))throw Error('Invalid or duplicate force commitment.');
   lineIds.add(c.id);
   const h=c.hypothetical;
   if(h!==undefined&&(!object(h)||!code(h.code)||!integer(h.player,1,999)||!['occupied','minor','sea'].includes(String(h.kind))||(h.kind==='sea')!==h.code.startsWith('W')))throw Error('Invalid hypothetical force source.');
   if(!h&&!/^[A-Z]{3}(?::P\d+)?$/.test(c.groupId))throw Error('Invalid reported force source.');
   return {id:c.id,groupId:c.groupId,role:c.role,quantity:c.quantity,...(h?{hypothetical:{code:h.code,player:h.player,kind:h.kind}}:{})} as Commitment;
  });
  return {id:s.id,name:s.name,mode:s.mode,baseTurn:s.baseTurn,orderTurn:s.orderTurn,target:s.target,excludedPlayers:[...s.excludedPlayers],choices,commitments,defense:{...s.defense},...(s.targetHolder?{targetHolder:{...s.targetHolder}}:{}),assumptions:{precombat:s.assumptions.precombat,isolated:s.assumptions.isolated},notes:s.notes,evidenceKey:s.evidenceKey,modelVersion:s.modelVersion,updatedAt:s.updatedAt} as BattleScenario;
 });
}
export function saveScenario(state:Workspace,campaignId:string,scenario:BattleScenario):Workspace{
 const [valid]=validateScenarios([scenario]);
 const campaign=state.campaigns.find(c=>c.id===campaignId);if(!campaign)throw Error('Campaign no longer exists.');
 const battleScenarios=validateScenarios([...(campaign.battleScenarios||[]).filter(s=>s.id!==valid.id),valid]);
 return {...state,campaigns:state.campaigns.map(c=>c.id===campaignId?{...c,battleScenarios}:c)};
}
export function removeScenario(state:Workspace,campaignId:string,id:string):Workspace{
 return {...state,campaigns:state.campaigns.map(c=>c.id===campaignId?{...c,battleScenarios:(c.battleScenarios||[]).filter(s=>s.id!==id)}:c)};
}
/** Hash the actual eligible source revisions, not just their player/turn identifiers. */
export async function scenarioEvidenceKey(reports:Report[],turn:number,excluded:number[]){
 const evidence=reports.filter(r=>r.turn<=turn&&!excluded.includes(r.player)).map(r=>[r.game,r.player,r.turn,r.filename,r.raw.replace(/\r/g,'')]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(evidence)));
 return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
export function newScenario(turn:number,target:string):BattleScenario{
 return {id:crypto.randomUUID(),name:'New land scenario',mode:'attack',baseTurn:turn,orderTurn:turn+1,target,excludedPlayers:[],choices:{},commitments:[],defense:{},assumptions:{precombat:false,isolated:false},notes:'',evidenceKey:'',modelVersion:MODEL_VERSION,updatedAt:new Date().toISOString()};
}

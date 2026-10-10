import {roles,defenseFields} from './scenario-types';
import {TURN_MODEL_VERSION,type TurnPlan,type ExpectedContribution,type BattleReview} from './turn-plan-types';
import type {Workspace} from './wwbp/types';

const obj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const str=(x:unknown,n:number):x is string=>typeof x==='string'&&x.length<=n;
const int=(x:unknown,min=0,max=1_000_000):x is number=>typeof x==='number'&&Number.isSafeInteger(x)&&x>=min&&x<=max;
const code=(x:unknown):x is string=>typeof x==='string'&&/^[A-Z]{3}$/.test(x);
const date=(x:unknown):x is string=>str(x,40)&&Number.isFinite(Date.parse(x));
export function validateTurnPlans(input:unknown):TurnPlan[]{
 if(!Array.isArray(input)||input.length>50)throw Error('Keep at most 50 coordinated turn plans per campaign.');
 const ids=new Set<string>();
 return input.map(p=>{
  if(!obj(p)||!str(p.id,80)||!p.id||ids.has(p.id)||!str(p.name,80)||!p.name.trim()||!int(p.baseTurn,0,99999)||p.orderTurn!==p.baseTurn+1||!str(p.notes,4000)||!str(p.evidenceKey,64)||!/^([a-f0-9]{64})?$/.test(p.evidenceKey)||!str(p.modelVersion,80)||!date(p.updatedAt))throw Error('Invalid coordinated turn plan.');
  ids.add(p.id);
  if(!Array.isArray(p.sets)||p.sets.length>50)throw Error('Keep at most 50 player order sets in one plan.');
  const players=new Set<number>();
  const sets=p.sets.map(s=>{
   if(!obj(s)||!int(s.player,1,999)||players.has(s.player)||!int(s.reportTurn,0,99999)||!str(s.text,100_000)||typeof s.standingReviewed!=='boolean'||s.copiedDraftAt!==undefined&&!date(s.copiedDraftAt))throw Error('Invalid or duplicate player order set.');
   players.add(s.player);return {player:s.player,reportTurn:s.reportTurn,text:s.text,standingReviewed:s.standingReviewed,...(s.copiedDraftAt?{copiedDraftAt:s.copiedDraftAt}:{})};
  });
  if(!obj(p.choices)||Object.keys(p.choices).length>3000||!obj(p.reviews)||Object.keys(p.reviews).length>500)throw Error('Invalid turn-plan intelligence selections.');
  const choices:Record<string,string>={},reviews:Record<string,BattleReview>={};
  for(const [k,v] of Object.entries(p.choices)){if(!/^[A-Z]{3}(?::P\d+)?$/.test(k)||!str(v,20)||!/^\d+:\d+$/.test(v))throw Error('Invalid turn-plan source choice.');choices[k]=v;}
  for(const [k,v] of Object.entries(p.reviews)){
   if(!code(k)||k.startsWith('W')||!obj(v)||!obj(v.defense)||Object.keys(v.defense).some(f=>!defenseFields.includes(f as typeof defenseFields[number]))||Object.values(v.defense).some(n=>!int(n))||typeof v.unknownOrders!=='boolean'||typeof v.isolated!=='boolean'||!str(v.note,2000))throw Error('Invalid battle review.');
   reviews[k]={defense:{...v.defense},unknownOrders:v.unknownOrders,isolated:v.isolated,note:v.note};
  }
  function contributions(input:unknown,threat=false):ExpectedContribution[]{
   if(!Array.isArray(input)||input.length>100)throw Error('Keep at most 100 expected contributions or specified threats.');
   const seen=new Set<string>();
   return input.map(c=>{
    if(!obj(c)||!str(c.id,80)||!c.id||seen.has(c.id)||!int(c.player,1,999)||!code(c.source)||!code(c.target)||c.target.startsWith('W')||!Object.hasOwn(roles,String(c.role))||!int(c.quantity,1)||threat&&roles[c.role as keyof typeof roles].side!=='attack')throw Error('Invalid expected contribution or specified threat.');
    seen.add(c.id);return {id:c.id,player:c.player,source:c.source,target:c.target,role:c.role,quantity:c.quantity} as ExpectedContribution;
   });
  }
  return {id:p.id,name:p.name,baseTurn:p.baseTurn,orderTurn:p.orderTurn,sets,choices,reviews,expected:contributions(p.expected),threats:contributions(p.threats,true),notes:p.notes,evidenceKey:p.evidenceKey,modelVersion:p.modelVersion,updatedAt:p.updatedAt} as TurnPlan;
 });
}
export function newTurnPlan(turn:number):TurnPlan{return {id:crypto.randomUUID(),name:`Coordinated turn ${turn+1}`,baseTurn:turn,orderTurn:turn+1,sets:[],choices:{},reviews:{},expected:[],threats:[],notes:'',evidenceKey:'',modelVersion:TURN_MODEL_VERSION,updatedAt:new Date().toISOString()};}
export function saveTurnPlan(state:Workspace,campaignId:string,plan:TurnPlan):Workspace{
 const campaign=state.campaigns.find(c=>c.id===campaignId);if(!campaign)throw Error('Campaign no longer exists.');
 const [valid]=validateTurnPlans([plan]);
 const turnPlans=validateTurnPlans([...(campaign.turnPlans||[]).filter(p=>p.id!==valid.id),valid]);
 return {...state,campaigns:state.campaigns.map(c=>c.id===campaignId?{...c,turnPlans}:c)};
}
export function removeTurnPlan(state:Workspace,campaignId:string,id:string):Workspace{return {...state,campaigns:state.campaigns.map(c=>c.id===campaignId?{...c,turnPlans:(c.turnPlans||[]).filter(p=>p.id!==id)}:c)};}

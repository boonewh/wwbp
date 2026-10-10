import {fields,type Field,type Report,type Values} from './wwbp/types';

export type Holder={kind:'occupied'|'minor'|'sea';player:number|null};
export type IntelSource={id:string;player:number;turn:number;filename:string};
export type Observation={source:IntelSource;holder:Holder|null;values:Values;suppressed:Values;record:string;basis:'command'|'visible'|'ownership'};
export type IntelGroup={id:string;code:string;sea:boolean;turn:number;observations:Observation[];candidates:Observation[]};
export type CombinedIntelligence={turn:number;groups:IntelGroup[];sources:IntelSource[]};
export type ResolvedGroup={group:IntelGroup;holder:Holder|null;values:Values;suppressed:Values;conflicts:string[];chosen:Observation|undefined;historical:boolean};
export const seaFields:Field[]=['Army','Navy','AirF'];
export const sourceId=(r:Report)=>`${r.player}:${r.turn}`;
const valid=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
function copyValues(values:Values,allowed:readonly Field[]){return Object.fromEntries(allowed.filter(field=>valid(values[field])).map(field=>[field,values[field]])) as Values;}

/** Each land location is one physical group. At sea each player's contingent is one group. */
export function combineIntelligence(reports:Report[],game:string,turn:number):CombinedIntelligence{
 if(!Number.isSafeInteger(turn)||turn<0)throw Error('Choose a valid intelligence turn.');
 const grouped=new Map<string,{code:string;sea:boolean;observations:Observation[]}>();
 const sources:IntelSource[]=[];
 const seen=new Set<string>();
 for(const report of reports){
  if(report.game!==game)throw Error('Combined intelligence cannot mix games.');
  if(report.turn>turn)continue;
  const source:IntelSource={id:sourceId(report),player:report.player,turn:report.turn,filename:report.filename};
  if(seen.has(source.id))throw Error('Choose one report revision per player and turn.');
  seen.add(source.id);sources.push(source);
  const commandLines=new Map(report.raw.slice(report.raw.indexOf('Forces under your control:'),report.raw.indexOf('Occupied Countries')).split('\n').flatMap(line=>{const code=line.match(/^([A-Z]{3})\s+/)?.[1];return code?[[code,line] as const]:[];}));
  const add=(code:string,player:number|null,observation:Omit<Observation,'source'>)=>{
   const sea=code.startsWith('W'),id=sea?`${code}:P${player??'unknown'}`:code;
   const group=grouped.get(id)||{code,sea,observations:[]};
   group.observations.push({...observation,source});grouped.set(id,group);
  };
  for(const code of new Set([...Object.keys(report.spaces),...Object.keys(report.own)])){
   const space=report.spaces[code],own=report.own[code];
   const commandLine=own?commandLines.get(code)||`${code}: command table`:'';
   if(code.startsWith('W')){
    const fleets=new Map<number,Values>();
    for(const fleet of space?.fleets||[]){
     if(fleets.has(fleet.player))throw Error(`${code}: multiple fleet entries for Player ${fleet.player} in one report need review.`);
     fleets.set(fleet.player,fleet.values);
    }
    // The command table and the visible listing describe the same contingent.
    if(own)fleets.set(report.player,own.values);
    for(const [player,values] of fleets){
     const commanded=!!own&&player===report.player;
     const known=copyValues(values,seaFields);
     add(code,player,{holder:{kind:'sea',player},values:known,suppressed:Object.fromEntries(Object.keys(known).map(field=>[field,0])),record:commanded?`Forces under your control:\n${commandLine}`:space?.raw||'No source record.',basis:commanded?'command':'visible'});
    }
    if(!fleets.size)add(code,null,{holder:null,values:{},suppressed:{},record:space?.raw||'Fleet listing unavailable.',basis:'ownership'});
   }else{
    const holder:Holder|null=own?{kind:own.kind==='minor'?'minor':'occupied',player:report.player}:space?.owner?{kind:'occupied',player:space.owner}:space?.kind==='minor'&&(space.visible||space.controller)?{kind:'minor',player:space.controller??null}:null;
    const values=own?copyValues(own.values,fields):space?.visible?copyValues(space.values,fields):{};
    const suppressed=space?.visible?copyValues(space.suppressed,fields):{};
    add(code,null,{holder,values,suppressed,record:own?`Forces under your control:\n${commandLine}\n\n${space?.raw||''}`:space?.raw||'Not reported.',basis:own?'command':space?.visible?'visible':'ownership'});
   }
  }
 }
 const groups=[...grouped].map(([id,group])=>{
  const observations=group.observations.sort((a,b)=>b.source.turn-a.source.turn||a.source.player-b.source.player);
  const latest=observations[0].source.turn;
  return {id,...group,observations,turn:latest,candidates:observations.filter(o=>o.source.turn===latest)};
 }).sort((a,b)=>a.code.localeCompare(b.code)||a.id.localeCompare(b.id));
 return {turn,groups,sources:sources.sort((a,b)=>a.player-b.player||b.turn-a.turn)};
}

/** A deliberate source choice resolves the whole group, keeping ownership and forces together. */
export function resolveGroup(group:IntelGroup,turn:number,sourceChoice?:string):ResolvedGroup{
 const conflicts:string[]=[],values:Values={},suppressed:Values={};
 const holders=new Map(group.candidates.filter(o=>o.holder).map(o=>[JSON.stringify(o.holder),o.holder!]));
 if(holders.size>1)conflicts.push('Ownership/control');
 for(const field of group.sea?seaFields:fields){
  const counts=[...new Set(group.candidates.map(o=>o.values[field]).filter(valid))];
  const inactive=[...new Set(group.candidates.map(o=>o.suppressed[field]).filter(valid))];
  if(counts.length>1)conflicts.push(field);else if(counts.length===1)values[field]=counts[0];
  if(inactive.length>1)conflicts.push(`${field} suppressed`);else if(inactive.length===1)suppressed[field]=inactive[0];
 }
 const chosen=conflicts.length?group.candidates.find(o=>o.source.id===sourceChoice):undefined;
 return {group,holder:chosen?chosen.holder:holders.size===1?[...holders.values()][0]:null,values:chosen?chosen.values:values,suppressed:chosen?chosen.suppressed:suppressed,conflicts,chosen,historical:group.turn<turn};
}

export type IntelTotal={player:number|null;groups:number;fields:Record<Field,{units:number;suppressed:number;reported:number;missing:number;suppressionMissing:number}>};
export function intelligenceTotals(rows:ResolvedGroup[]){
 const players=new Map<number|null,IntelTotal>();
 let historical=0,conflicted=0,unassigned=0;
 for(const row of rows){
  if(row.historical){historical++;continue;}
  if(row.conflicts.length&&!row.chosen){conflicted++;continue;}
  if(!row.holder){unassigned++;continue;}
  const player=row.holder.player;
  const total=players.get(player)||{player,groups:0,fields:Object.fromEntries(fields.map(field=>[field,{units:0,suppressed:0,reported:0,missing:0,suppressionMissing:0}])) as IntelTotal['fields']};
  total.groups++;
  for(const field of row.group.sea?seaFields:fields){
   const entry=total.fields[field],value=row.values[field],suppressed=row.suppressed[field];
   if(valid(value)){entry.units+=Math.floor(value);entry.reported++;}else entry.missing++;
   if(valid(suppressed))entry.suppressed+=suppressed;else entry.suppressionMissing++;
  }
  players.set(player,total);
 }
 return {players:[...players.values()].sort((a,b)=>(a.player??1000)-(b.player??1000)),historical,conflicted,unassigned};
}

export function holderLabel(holder:Holder|null){
 if(!holder)return 'Owner/controller unknown';
 if(holder.player===null)return 'Minor · no clear controller';
 return `Player ${holder.player}${holder.kind==='minor'?' · minor control':holder.kind==='sea'?' · sea contingent':' · occupied'}`;
}

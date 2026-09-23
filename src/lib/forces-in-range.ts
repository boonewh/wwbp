import type {Geography,Report} from './wwbp/types';
export type RangeRow={source:string;player:number|null;force:'A'|'N'|'F';count:number;action:string;local:boolean};
export type IntelligenceGap={source:string;player:number|null;message:string};
export function forcesInRange(report:Report,atlas:Record<string,Geography>,target:string){
 const rows:RangeRow[]=[],gaps:IntelligenceGap[]=[];
 if(!atlas[target])return {rows,gaps};
 const targetSea=target.startsWith('W');
 for(const [source,geo] of Object.entries(atlas)){
  const local=source===target,sea=source.startsWith('W'),surface=geo.surface.includes(target),canal=geo.canals.find(c=>c.target===target);
  const air=surface||geo.air.includes(target)||!!canal;
  if(!local&&!surface&&!canal&&!air)continue;
  const space=report.spaces[source],owner=sea?null:space?.owner||space?.controller||null;
  const capable=(force:'A'|'N'|'F')=>local||force==='F'&&air||force==='A'&&!targetSea&&surface||force==='N'&&(surface||!!canal)&&(sea||targetSea);
  if(!space?.visible&&!report.own[source]){gaps.push({source,player:owner,message:'Forces unknown in this report.'});continue;}
  const entries=sea?space?.fleets.map(f=>({player:f.player,values:f.values}))||[]:[{player:owner,values:space?.values||{}}];
  // The command table can disclose our contingent even without a complete sea listing.
  if(sea&&report.own[source]&&!entries.some(e=>e.player===report.player))entries.push({player:report.player,values:report.own[source].values});
  if(sea&&!space?.fleets.length)gaps.push({source,player:null,message:'No complete player fleet listing; other forces are unknown.'});
  for(const entry of entries)for(const [force,field] of [['A','Army'],['N','Navy'],['F','AirF']] as const){
   if(!capable(force))continue;
   const value=entry.player===report.player&&report.own[source]?report.own[source].values[field]:entry.values[field];
   if(value==null){gaps.push({source,player:entry.player,message:force+' unknown.'});continue;}
   const count=Math.floor(value);if(count<=0)continue;
   let action='';
   if(local)action=sea?(force==='A'?'At target; takes naval/air hits, cannot fight at sea.':'At target; fights enemies according to declarations.'):'At target; potential defender.';
   else if(force==='A')action=(space?.kind==='minor'?'Bombard or support; minor cannot conquer.':'Bombard, conquer, or support defense.')+(sea?' Landing faces coastal air/navy before defending army.':'');
   else if(force==='N')action=targetSea?'Support sea; fights enemies according to declarations.':'Attack coastal navy or support defense.';
   else action=targetSea?'Support sea; fights enemies according to declarations.':'Attack A/N/Industry/Air Base, or support defense.';
   if(!local&&force==='F')action+=' '+(surface?'Adjacent.':'Listed air range.');
   if(!local&&force==='N'&&canal&&!surface){const gate=report.spaces[canal.gate],controller=gate?.owner||gate?.controller;action+=' Canal '+canal.gate+': '+(controller&&controller===entry.player?'controlled by this player.':'permission/control required; access not confirmed.');}
   if(!sea&&space?.kind==='minor')action+=entry.player==null?' Minor source; controller unassigned.':' Controlled-minor source.';
   if(force==='F'&&(space?.suppressed.AirF||0)>0&&!sea)action+=' '+space!.suppressed.AirF+'F suppressed, excluded.';
   if(value!==count)action+=' Unbuilt fraction excluded.';
   rows.push({source,player:entry.player,force,count,action,local});
  }
 }
 rows.sort((a,b)=>(a.player===report.player?-1:a.player??10000)-(b.player===report.player?-1:b.player??10000)||a.source.localeCompare(b.source)||a.force.localeCompare(b.force));
 return {rows,gaps};
}

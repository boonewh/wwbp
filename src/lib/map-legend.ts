import type {Report} from './wwbp/types';
const colors=['#20624e','#aa474b','#aa772b','#7c5098','#426bc4','#d3662a','#2b9097','#b23d69','#756b25','#9a6228','#6859a0','#4b809b','#66843a'];
export const unknownColor='#8c9790';
export function playerColor(player:number){return colors[(player-1)%colors.length];}
export function mapPlayers(report:Report){
 const ids=new Set<number>();
 for(const space of Object.values(report.spaces)){const id=space.owner||space.controller;if(id)ids.add(id);}
 return [...ids].sort((a,b)=>a-b).map(id=>({id,color:playerColor(id),name:report.players[String(id)]||'',you:id===report.player}));
}

import type {Report,Space} from './wwbp/types';
export type ChangeCategory='ownership'|'information'|'visible'|'hidden';
export const categoryLabels:Record<ChangeCategory,string>={ownership:'Changed ownership',information:'New information',visible:'Newly visible',hidden:'No longer visible'};
function control(s:Space){return s.owner?{kind:'occupied',player:s.owner}:s.controller?{kind:'minor',player:s.controller}:s.visible?{kind:'minor',player:null}:{kind:'unknown',player:null};}
export function holder(report:Report,code:string){const s=report.spaces[code];if(!s)return 'Not reported';const c=control(s);if(c.kind==='unknown')return 'Minor · control unknown';if(c.player==null)return 'Minor · no clear controller';return 'Player '+c.player+' · '+(report.players[String(c.player)]||'Position name not reported')+(c.kind==='minor'?' (minor control)':' (occupied)');}
function facts(s:Space){
 const ordered=(o:object)=>Object.entries(o).sort(([a],[b])=>a.localeCompare(b));
 return JSON.stringify([ordered(s.values),ordered(s.suppressed),ordered(s.popularity),s.HPI??null,s.MaxInd??null,s.fleets.map(f=>[f.player,ordered(f.values)]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))]);
}
export function turnInformation(previous:Report|null,current:Report){
 const ownership:{code:string;before:string;after:string;type:string}[]=[],information:string[]=[],visible:string[]=[],hidden:string[]=[];
 if(!previous)return {ownership,information,visible,hidden};
 for(const code of new Set([...Object.keys(previous.spaces),...Object.keys(current.spaces)])){
  const a=previous.spaces[code],b=current.spaces[code];
  if(b?.visible&&!a?.visible)visible.push(code);
  if(a?.visible&&!b?.visible)hidden.push(code);
  if(a?.visible&&b?.visible&&facts(a)!==facts(b))information.push(code);
  if(!a||!b||code.startsWith('W'))continue;
  const old=control(a),now=control(b);
  if(old.kind===now.kind&&old.player===now.player)continue;
  let type:string;
  if(now.kind==='occupied')type=old.kind==='occupied'?'Occupation changed (conquest/transfer)':old.kind==='minor'?'Minor conquered / now occupied':'Occupation newly reported';
  else if(old.kind==='unknown'||now.kind==='unknown')type=now.kind==='unknown'?'Minor control no longer reported':'Minor control newly reported';
  else if(old.kind==='occupied')type='Now a minor (occupation ended)';
  else type=old.player==null?'Minor control gained':now.player==null?'Minor control lost':'Minor control changed';
  ownership.push({code,before:holder(previous,code),after:holder(current,code),type});
 }
 ownership.sort((a,b)=>a.code.localeCompare(b.code));information.sort();visible.sort();hidden.sort();
 return {ownership,information,visible,hidden};
}

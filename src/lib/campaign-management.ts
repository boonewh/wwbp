import type {Workspace} from './wwbp/types';
import {parseReport} from './wwbp/parser';
export type CampaignChange = {kind:'rename';name:string}|{kind:'archive';archived:boolean}|{kind:'remove-report';turn:number};
export function manageCampaign(state:Workspace,id:string,change:CampaignChange):Workspace {
 const campaign=state.campaigns.find(c=>c.id===id);
 if(!campaign)throw Error('Campaign no longer exists. Reload your campaigns.');
 let next={...campaign};
 if(change.kind==='rename'){
  const name=change.name.trim();
  if(!name||name.length>80)throw Error('Enter a campaign name between 1 and 80 characters.');
  next.name=name;
 }else if(change.kind==='archive')next.archived=change.archived;
 else {
  if(!campaign.reports.some(r=>parseReport(r.text,r.filename).turn===change.turn))throw Error('This report no longer exists.');
  next.reports=campaign.reports.filter(r=>parseReport(r.text,r.filename).turn!==change.turn);
 }
 return {...state,campaigns:state.campaigns.map(c=>c.id===id?next:c)};
}

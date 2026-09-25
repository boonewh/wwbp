import {saveOrderDraft} from './order-drafts';
import {decodeWorkspace,createCampaign,importReports} from './workspace';
import {manageCampaign} from './campaign-management';
import type {Workspace} from './wwbp/types';
export const MAX_CLOUD_BYTES=3_500_000;
export function validateCloudSave(input:unknown):{workspace:Workspace;revision:number}{
 if(!input||typeof input!=='object')throw Error('Invalid cloud save.');
 const {workspace,revision}=input as {workspace:unknown;revision:unknown};
 if(typeof revision!=='number'||!Number.isSafeInteger(revision)||revision<0||revision>=2147483647)throw Error('Invalid workspace revision.');
 const serialized=JSON.stringify(workspace);if(!serialized||new TextEncoder().encode(serialized).length>MAX_CLOUD_BYTES)throw Error('Workspace is too large for this pilot. Export a backup and contact the administrator.');
 const state=decodeWorkspace(serialized);
 if(state.campaigns.length>100||state.campaigns.some(c=>c.reports.length>500||c.reports.some(r=>r.filename.length>255)))throw Error('Workspace exceeds pilot limits.');
 return {workspace:state,revision};
}
export function mergeLocalWorkspace(cloud:Workspace,local:Workspace):Workspace {
 let result=cloud;
 for(const c of local.campaigns){let target=result.campaigns.find(x=>x.game===c.game&&x.player===c.player);
  if(!target){const id=crypto.randomUUID();result=createCampaign(result,c.name,c.game,c.player,id);target=result.campaigns.find(x=>x.id===id)!;if(c.archived)result=manageCampaign(result,id,{kind:'archive',archived:true});}
  result=importReports(result,target.id,c.reports).state;
  for(const draft of c.orderDrafts||[]){
   const existing=result.campaigns.find(x=>x.id===target!.id)?.orderDrafts?.find(d=>d.baseTurn===draft.baseTurn);
   if(existing&&existing.text!==draft.text)throw Error('Conflicting order drafts for '+c.game+' after turn '+draft.baseTurn+'. Both workspaces were preserved.');
   if(!existing)result=saveOrderDraft(result,target.id,draft);
  }
 }
 return {...result,selectedId:cloud.selectedId??result.selectedId};
}

export function sameOriginWrite(request:Request):boolean {
 const origin=request.headers.get('origin'),host=request.headers.get('host');
 if(!origin||!host)return false;
 try{const url=new URL(origin);return origin===url.origin&&url.host===host&&url.protocol===new URL(request.url).protocol;}catch{return false;}
}

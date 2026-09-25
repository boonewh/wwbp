import {validateDrafts} from './order-drafts';
import {parseReport} from './wwbp/parser';
import type {Campaign,RawReport,Workspace} from './wwbp/types';
export const emptyWorkspace:Workspace={version:1,campaigns:[],selectedId:null};
export function createCampaign(state:Workspace,name:string,game:string,player:number,id:string):Workspace {
 game=game.trim().toUpperCase();
 if(!/^[A-Z0-9][A-Z0-9-]{1,39}$/.test(game))throw Error('Enter the game identifier exactly as it appears in a report, for example WW-X309.');
 if(!Number.isSafeInteger(player)||player<1||player>999)throw Error('Enter your player number.');
 if(state.campaigns.some(c=>c.game===game&&c.player===player))throw Error('This game and player position already have a campaign.');
 if(!id||state.campaigns.some(c=>c.id===id))throw Error('Campaign identifier already exists.');
 const campaign:Campaign={id,name:name.trim().slice(0,80)||game,game,player,reports:[]};
 return {...state,campaigns:[...state.campaigns,campaign],selectedId:id};
}
export function importReports(state:Workspace,id:string,files:RawReport[]):{state:Workspace;added:number;duplicates:number} {
 const c=state.campaigns.find(c=>c.id===id);if(!c)throw Error('Select a campaign first.');
 const reports=[...c.reports];let added=0,duplicates=0;
 for(const file of files){
  const r=parseReport(file.text,file.filename);
  if(r.game!==c.game||r.player!==c.player)throw Error(`${file.filename}: report belongs to ${r.game}, player ${r.player}; selected campaign is ${c.game}, player ${c.player}.`);
  const existing=reports.find(x=>parseReport(x.text,x.filename).turn===r.turn);
  if(existing){if(existing.text.replace(/\r/g,'')===file.text.replace(/\r/g,'')){duplicates++;continue;}throw Error(`Turn ${r.turn} already has a different report. Existing data was preserved.`);}
  reports.push({filename:file.filename,text:r.raw});added++;
 }
 reports.sort((a,b)=>parseReport(a.text).turn-parseReport(b.text).turn);
 return {state:{...state,campaigns:state.campaigns.map(x=>x.id===id?{...x,reports}:x)},added,duplicates};
}
export function decodeWorkspace(raw:string):Workspace {
 const data=JSON.parse(raw) as Workspace;
 if(data?.version!==1||!Array.isArray(data.campaigns))throw Error('Saved workspace has an unsupported format.');
 let state:Workspace={...emptyWorkspace,campaigns:[]};
 for(const c of data.campaigns){
  if(typeof c.name!=='string'||typeof c.game!=='string'||typeof c.id!=='string'||!Array.isArray(c.reports))throw Error('Saved campaign is invalid.');
  state=createCampaign(state,c.name,c.game,c.player,c.id);
  if(c.archived!==undefined){
   if(typeof c.archived!=='boolean')throw Error('Saved archive status is invalid.');
   state={...state,campaigns:state.campaigns.map(x=>x.id===c.id?{...x,archived:c.archived}:x)};
  }
  if(c.orderDrafts!==undefined)state={...state,campaigns:state.campaigns.map(x=>x.id===c.id?{...x,orderDrafts:validateDrafts(c.orderDrafts)}:x)};
  for(const r of c.reports)if(typeof r.text!=='string'||typeof r.filename!=='string')throw Error('Saved report is invalid.');
  state=importReports(state,c.id,c.reports).state;
 }
 return {...state,selectedId:state.campaigns.some(c=>c.id===data.selectedId)?data.selectedId:state.campaigns[0]?.id??null};
}
export interface WorkspaceRepository { load():Workspace; save(state:Workspace):void; }
export function browserRepository(storage:Storage):WorkspaceRepository {
 const key='wwbp.online.workspace.v1';
 return {load(){const raw=storage.getItem(key);return raw?decodeWorkspace(raw):{...emptyWorkspace,campaigns:[]};},save(state){storage.setItem(key,JSON.stringify(state));}};
}

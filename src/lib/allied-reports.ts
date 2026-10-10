import {parseReport} from './wwbp/parser';
import type {Campaign,RawReport,Report,Workspace} from './wwbp/types';

export const MAX_ALLIED_REPORTS=500;
export type AlliedImportRow={report:Report;status:'new'|'duplicate'};
const key=(report:Report)=>`${report.player}:${report.turn}`;

/** Review and apply use the same validation; no partial batch can reach storage. */
export function reviewAlliedReports(campaign:Campaign,files:RawReport[]){
 const reports=[...(campaign.alliedReports||[])];
 const known=new Map(reports.map(raw=>{const report=parseReport(raw.text,raw.filename);return [key(report),report];}));
 const rows:AlliedImportRow[]=[];
 for(const file of files){
  if(!file||typeof file.filename!=='string'||!file.filename.trim()||file.filename.length>255||typeof file.text!=='string')throw Error('Each allied report needs a filename of 1–255 characters and report text.');
  if(new TextEncoder().encode(file.text).length>2_000_000)throw Error(`${file.filename}: use a report smaller than 2 MB.`);
  if((file.text.match(/^Game \S+, Turn \d+, Player \[/gm)||[]).length>1)throw Error(`${file.filename}: import one complete report per file or paste.`);
  const report=parseReport(file.text,file.filename);
  if(report.game!==campaign.game)throw Error(`${file.filename}: report belongs to ${report.game}; this campaign is ${campaign.game}. No reports were imported.`);
  if(!Number.isSafeInteger(report.player)||report.player<1||report.player>999||!Number.isSafeInteger(report.turn)||report.turn<0)throw Error(`${file.filename}: invalid player or report turn.`);
  if(report.player===campaign.player)throw Error(`${file.filename}: Player ${report.player} is your position. Use Import my reports instead.`);
  const existing=known.get(key(report));
  if(existing&&existing.raw!==report.raw)throw Error(`Player ${report.player}, turn ${report.turn} already has a different report (${existing.filename}); ${file.filename} conflicts with it. Nothing was imported. Review the saved report in Allied Reports; remove it explicitly before importing a replacement.`);
  rows.push({report,status:existing?'duplicate':'new'});
  if(!existing){known.set(key(report),report);reports.push({filename:file.filename,text:report.raw});}
 }
 if(reports.length>MAX_ALLIED_REPORTS)throw Error(`This campaign can hold up to ${MAX_ALLIED_REPORTS} allied reports. Export a backup before removing older reports.`);
 // Keep persisted order stable for reloads, exports, and transfers.
 reports.sort((a,b)=>{const x=parseReport(a.text),y=parseReport(b.text);return x.player-y.player||x.turn-y.turn;});
 return {reports,rows,added:rows.filter(row=>row.status==='new').length,duplicates:rows.filter(row=>row.status==='duplicate').length};
}

export function importAlliedReports(state:Workspace,id:string,files:RawReport[]){
 const campaign=state.campaigns.find(c=>c.id===id);
 if(!campaign)throw Error('Select a campaign first.');
 const result=reviewAlliedReports(campaign,files);
 return {...result,state:{...state,campaigns:state.campaigns.map(c=>c.id===id?{...c,alliedReports:result.reports}:c)}};
}

export function removeAlliedReport(state:Workspace,id:string,player:number,turn:number):Workspace{
 const campaign=state.campaigns.find(c=>c.id===id);
 if(!campaign)throw Error('Select a campaign first.');
 const reports=(campaign.alliedReports||[]).filter(raw=>{const report=parseReport(raw.text,raw.filename);return report.player!==player||report.turn!==turn;});
 if(reports.length===(campaign.alliedReports||[]).length)throw Error('That allied report is no longer saved.');
 return {...state,campaigns:state.campaigns.map(c=>c.id===id?{...c,alliedReports:reports}:c)};
}

export function reportAge(turn:number,referenceTurn:number|null){
 if(referenceTurn===null)return 'No own report available for comparison.';
 if(turn===referenceTurn)return `Same turn as your selected report (${referenceTurn}).`;
 if(turn<referenceTurn)return `${referenceTurn-turn} turn${referenceTurn-turn===1?'':'s'} older than your selected report (${referenceTurn}). Historical intelligence; current forces may differ.`;
 return `Newer than your selected report (${referenceTurn}). Do not use this intelligence for an earlier turn.`;
}

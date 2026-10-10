"use client";
import {useMemo,useRef,useState} from 'react';
import {fields,type Campaign,type Geography,type RawReport,type Report} from '../lib/wwbp/types';
import {parseReport} from '../lib/wwbp/parser';
import {pastedReport} from '../lib/pasted-report';
import {reportAge,reviewAlliedReports,type AlliedImportRow} from '../lib/allied-reports';

type Props={campaign:Campaign;referenceTurn:number|null;atlas:Record<string,Geography>;busy:boolean;onImport:(files:RawReport[])=>Promise<{added:number;duplicates:number}>;onRemove:(player:number,turn:number)=>Promise<void>;onExport:()=>void};
const reportKey=(r:Report)=>`${r.player}:${r.turn}`;
const number=(value:number|undefined)=>value==null?'Unknown':value.toLocaleString('en-US',{maximumFractionDigits:2});

export default function AlliedReports({campaign,referenceTurn,atlas,busy,onImport,onRemove,onExport}:Props){
 const reports=useMemo(()=>(campaign.alliedReports||[]).map(raw=>parseReport(raw.text,raw.filename)).sort((a,b)=>a.player-b.player||b.turn-a.turn),[campaign.alliedReports]);
 const players=[...new Set(reports.map(r=>r.player))];
 const [player,setPlayer]=useState('all'),[selected,setSelected]=useState('');
 const [pasted,setPasted]=useState(''),[pending,setPending]=useState<{files:RawReport[];rows:AlliedImportRow[]}|null>(null);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[working,setWorking]=useState(false);
 const [removing,setRemoving]=useState<Report|null>(null),[removeError,setRemoveError]=useState('');
 const importDialog=useRef<HTMLDialogElement>(null),sourceDialog=useRef<HTMLDialogElement>(null),removeDialog=useRef<HTMLDialogElement>(null),input=useRef<HTMLInputElement>(null);
 const filtered=reports.filter(r=>player==='all'||!players.includes(+player)||r.player===+player);
 const report=filtered.find(r=>reportKey(r)===selected)||filtered[0];
 const locked=busy||working;
 const selectedPlayer=report?reports.filter(r=>r.player===report.player).map(r=>r.turn).sort((a,b)=>a-b):[];
 const gaps=selectedPlayer.slice(1).flatMap((turn,i)=>turn-selectedPlayer[i]>1?[turn-selectedPlayer[i]===2?String(turn-1):`${selectedPlayer[i]+1}–${turn-1}`]:[]);

 function review(files:RawReport[]){
  const result=reviewAlliedReports(campaign,files);
  setPending({files,rows:result.rows});setError('');
 }
 async function readFiles(files:FileList|null){
  if(!files?.length)return;
  setWorking(true);setError('');
  try{
   if(files.length>500)throw Error('Choose no more than 500 reports at once.');
   const raw:RawReport[]=[];
   for(const file of Array.from(files)){
    if(file.size>2_000_000)throw Error(`${file.name} is larger than 2 MB.`);
    raw.push({filename:file.name,text:await file.text()});
   }
   review(raw);
  }catch(e){setError((e as Error).message);}
  finally{setWorking(false);if(input.current)input.current.value='';}
 }
 async function confirmImport(){
  if(!pending)return;
  setWorking(true);setError('');
  try{
   const result=await onImport(pending.files);
   const first=pending.rows[0]?.report;
   if(first){setPlayer(String(first.player));setSelected(reportKey(first));}
   setNotice(`Imported ${result.added} allied report${result.added===1?'':'s'}; skipped ${result.duplicates} matching duplicate${result.duplicates===1?'':'s'}.`);
   setPasted('');setPending(null);importDialog.current?.close();
  }catch(e){setError((e as Error).message);}
  finally{setWorking(false);}
 }
 async function confirmRemove(){
  if(!removing)return;
  setWorking(true);setRemoveError('');
  try{await onRemove(removing.player,removing.turn);setNotice(`Removed Player ${removing.player}'s turn ${removing.turn} report.`);removeDialog.current?.close();setRemoving(null);}
  catch(e){setRemoveError((e as Error).message);}
  finally{setWorking(false);}
 }

 return <section className="allied-reports" aria-labelledby="allied-title">
  <div className="allied-heading"><div><p className="eyebrow">{campaign.game} · Shared intelligence</p><h1 id="allied-title">Allied Reports</h1><p>Reports sent to you by other players, kept separate from your own turns and orders.</p></div><button type="button" className="primary" disabled={locked} onClick={()=>{setError('');setPending(null);importDialog.current?.showModal();}}>Import allied reports</button></div>
  <p className="allied-context">Your position: Player {campaign.player} · {reports.length} allied report{reports.length===1?'':'s'} from {players.length} player{players.length===1?'':'s'}. Imports stay in your private workspace; they do not change diplomatic declarations.</p>
  {notice&&<p role="status" className="manage-notice">{notice}</p>}
  {!report?<div className="allied-empty"><h2>No allied reports yet</h2><p>Paste a complete report from an ally’s email or choose their text files. You’ll review the game, player, and turn before saving.</p><p>You can import allied reports even before adding your own turn.</p></div>:<>
   <div className="allied-filters">
    <label>Reporting player<select name="allied-player" value={players.includes(+player)?player:'all'} onChange={e=>{setPlayer(e.target.value);setSelected('');}}><option value="all">All players</option>{players.map(id=><option key={id} value={id}>Player {id} · {reports.find(r=>r.player===id)?.position}</option>)}</select></label>
    <label>Report<select name="allied-report" value={reportKey(report)} onChange={e=>setSelected(e.target.value)}>{players.filter(id=>filtered.some(r=>r.player===id)).map(id=><optgroup key={id} label={`Player ${id}`}>{filtered.filter(r=>r.player===id).map(r=><option key={reportKey(r)} value={reportKey(r)}>Turn {r.turn} · {r.filename}</option>)}</optgroup>)}</select></label>
   </div>
   <article className="allied-report-detail" aria-labelledby="allied-report-title">
    <div className="allied-heading"><div><h2 id="allied-report-title">Player {report.player} · {report.position} · Turn {report.turn}</h2><p className="allied-filename">Source: {report.filename}</p></div><div className="actions"><button type="button" onClick={()=>sourceDialog.current?.showModal()}>Read allied source report</button><button type="button" disabled={locked} onClick={()=>{setRemoving(report);setRemoveError('');removeDialog.current?.showModal();}}>Remove this report</button></div></div>
    <p className="allied-age">{reportAge(report.turn,referenceTurn)}</p>
    {!!gaps.length&&<p>Missing reports between this player’s imported turns: {gaps.join(', ')}.</p>}
    <dl className="allied-reserves"><div><dt>Player {report.player}’s dollars</dt><dd>{number(report.Dollars)}</dd></div><div><dt>Spies</dt><dd>{number(report.Spies)}</dd></div><div><dt>Counterspies</dt><dd>{number(report.CounterSpies)}</dd></div></dl>
    <h3>Forces under Player {report.player}’s control</h3><p>Command-table values from turn {report.turn}, including fractional balances. Suppressed forces are listed separately below each value when reported.</p>
    <div className="table-scroll allied-table" tabIndex={0} role="region" aria-label={`Player ${report.player} forces, turn ${report.turn}`}><table><thead><tr><th scope="col">Space</th><th scope="col">Control</th>{fields.map(field=><th scope="col" key={field}>{field}</th>)}</tr></thead><tbody>{Object.values(report.own).map(space=><tr key={space.code}><th scope="row">{atlas[space.code]?.name||space.code} · {space.code}</th><td>{space.kind}</td>{fields.map(field=><td key={field}>{number(space.values[field])}{(report.spaces[space.code]?.suppressed[field]??0)>0&&<small>+ {number(report.spaces[space.code].suppressed[field])} suppressed</small>}</td>)}</tr>)}</tbody></table></div>
    <p>The full source report includes this player’s visible intelligence, diplomacy, and historical order echo. These observations are not yet combined with other reports.</p>
   </article>
  </>}
  <dialog ref={importDialog} className="paste-dialog allied-import-dialog" aria-labelledby="allied-import-title" onCancel={e=>{if(locked)e.preventDefault();}}>
   <h2 id="allied-import-title">{pending?'Review allied report import':'Import allied reports'}</h2><p>{campaign.name} · {campaign.game} · Your position: Player {campaign.player}</p>
   {error&&<p role="alert" className="import-error">{error}</p>}
   {pending?<>
    <ul role="list" className="allied-import-list">{pending.rows.map((row,i)=><li key={i}><strong>Player {row.report.player} · {row.report.position} · Turn {row.report.turn}</strong><p>{row.report.filename}</p><p>{row.status==='new'?'Ready to import':'Matching duplicate — will be skipped'}</p></li>)}</ul>
    <p>These reports will be saved in Allied Reports for {campaign.game}. Your own reports and orders stay separate.</p>
    <div className="actions"><button type="button" className="primary" disabled={locked} onClick={()=>void confirmImport()}>{locked?'Saving…':'Confirm allied import'}</button><button type="button" disabled={locked} onClick={()=>{setPending(null);setError('');}}>Back</button><button type="button" disabled={locked} onClick={()=>importDialog.current?.close()}>Cancel</button></div>
   </>:<>
    <p id="allied-paste-help">Paste one complete report, including the game heading and all sections, or choose several text files. Each report must be for {campaign.game} and another player.</p>
    <label htmlFor="allied-email-report">Ally’s email report</label><textarea id="allied-email-report" name="allied-email-report" aria-describedby="allied-paste-help" value={pasted} disabled={locked} onChange={e=>{setPasted(e.target.value);setError('');}} spellCheck={false} autoCapitalize="off" autoCorrect="off" placeholder="Paste an ally’s complete report here…"/>
    <div className="actions"><button type="button" className="primary" disabled={locked||!pasted.trim()} onClick={()=>{try{review([pastedReport(pasted)]);}catch(e){setError((e as Error).message);}}}>Review pasted report</button><button type="button" disabled={locked} onClick={()=>input.current?.click()}>{working?'Reading files…':'Choose text files'}</button><button type="button" disabled={locked} onClick={()=>importDialog.current?.close()}>Cancel</button></div>
   </>}
   <input ref={input} name="allied-files" aria-label="Allied report text files" type="file" hidden multiple accept=".txt,text/plain" onChange={e=>void readFiles(e.target.files)}/>
  </dialog>
  <dialog ref={sourceDialog} className="source-dialog" aria-labelledby="allied-source-title"><div className="source-dialog-header"><h2 id="allied-source-title">{campaign.game} · Player {report?.player} · Turn {report?.turn}</h2><button type="button" onClick={()=>sourceDialog.current?.close()}>Close</button></div><pre className="source-dialog-body" tabIndex={0} role="region" aria-label="Allied source report text">{report?.raw}</pre></dialog>
  <dialog ref={removeDialog} className="manage-dialog" aria-labelledby="allied-remove-title" onCancel={e=>{if(locked)e.preventDefault();}}><h2 id="allied-remove-title">Remove Player {removing?.player}’s turn {removing?.turn} report?</h2><p>{removing?.filename}</p><p>This removes only this allied report from {campaign.name}. Keep the original file or email to import it again.</p>{removeError&&<p role="alert" className="import-error">{removeError}</p>}<div className="actions"><button type="button" onClick={onExport}>Export backup first</button><button type="button" disabled={locked} onClick={()=>removeDialog.current?.close()}>Keep report</button><button type="button" className="primary danger" disabled={locked} onClick={()=>void confirmRemove()}>Remove allied report</button></div></dialog>
 </section>;
}

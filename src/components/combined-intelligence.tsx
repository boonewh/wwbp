"use client";
import {useMemo,useState} from 'react';
import {parseReport} from '../lib/wwbp/parser';
import {fields,type Campaign,type Geography,type Field} from '../lib/wwbp/types';
import {combineIntelligence,resolveGroup,intelligenceTotals,holderLabel,seaFields,type CombinedIntelligence,type Observation,type ResolvedGroup} from '../lib/combined-intelligence';

const number=(value:number|undefined)=>value==null?'Unknown':value.toLocaleString('en-US',{maximumFractionDigits:2});
const label=(o:Observation)=>`Player ${o.source.player} · Turn ${o.source.turn} · ${o.source.filename}`;
function status(row:ResolvedGroup){return row.historical?'Historical':row.conflicts.length?(row.chosen?'Source chosen':'Conflict'):Object.keys(row.values).length?'Current':'Forces unknown';}

export default function CombinedIntelligenceView({campaign,referenceTurn,atlas}:{campaign:Campaign;referenceTurn:number|null;atlas:Record<string,Geography>}){
 const reports=useMemo(()=>[...campaign.reports,...(campaign.alliedReports||[])].map(raw=>parseReport(raw.text,raw.filename)),[campaign.reports,campaign.alliedReports]);
 const turns=[...new Set(reports.map(r=>r.turn))].sort((a,b)=>b-a);
 const [requestedTurn,setRequestedTurn]=useState<number|null>(null),[excluded,setExcluded]=useState<number[]>([]);
 const turn=requestedTurn!==null&&turns.includes(requestedTurn)?requestedTurn:referenceTurn??turns[0]??null;
 const eligible=reports.filter(r=>turn!==null&&r.turn<=turn);
 const reporters=[...new Set(eligible.map(r=>r.player))].sort((a,b)=>a-b);
 const result=useMemo(()=>{
  if(turn===null)return {snapshot:null,error:''};
  try{return {snapshot:combineIntelligence(reports.filter(r=>!excluded.includes(r.player)),campaign.game,turn),error:''};}
  catch(e){return {snapshot:null,error:(e as Error).message};}
 },[reports,excluded,campaign.game,turn]);

 return <section className="combined-intelligence" aria-labelledby="analysis-title">
  <div className="intel-heading"><div><p className="eyebrow">{campaign.game} · Analysis</p><h1 id="analysis-title">Combined intelligence</h1><p>Your reports and allied reports, reconciled by location and player. Matching sightings count once.</p></div>{turn!==null&&<label>Intelligence turn<select name="intelligence-turn" value={turn} onChange={e=>setRequestedTurn(+e.target.value)}>{turns.map(t=><option key={t} value={t}>Turn {t}</option>)}</select></label>}</div>
  {turn===null?<p className="allied-empty">Import your report or an allied report to start combining intelligence.</p>:<>
   <p className="allied-context">Viewing turn {turn}. Later reports are excluded. Older observations are historical and never enter current totals. This view does not change your reports or order drafts.</p>
   <details className="intel-sources"><summary>Included reporting players · {reporters.filter(p=>!excluded.includes(p)).length} of {reporters.length}</summary><p>Choose whose reports to use. Including a report does not establish an alliance or canal permission.</p><div className="intel-source-options">{reporters.map(player=>{
    const own=player===campaign.player,available=eligible.filter(r=>r.player===player),latest=Math.max(...available.map(r=>r.turn));
    return <label key={player}><input type="checkbox" name={`intelligence-player-${player}`} checked={!excluded.includes(player)} onChange={e=>setExcluded(current=>e.target.checked?current.filter(p=>p!==player):[...current,player])}/><span>Player {player}{own?' (you)':''} · {latest===turn?'Report for this turn':`Latest available: turn ${latest}`} · {available.length} report{available.length===1?'':'s'}</span></label>;
   })}</div></details>
   {result.error&&<p role="alert" className="import-error">Could not combine these reports: {result.error}</p>}
   {result.snapshot&&<IntelligenceResults snapshot={result.snapshot} atlas={atlas}/>}
  </>}
 </section>;
}

function IntelligenceResults({snapshot,atlas}:{snapshot:CombinedIntelligence;atlas:Record<string,Geography>}){
 // Choices belong to these exact inputs. Changing turn, sources, or report content resets them
 // synchronously, so an old choice can never silently resolve a new disagreement.
 const [decisions,setDecisions]=useState<{snapshot:CombinedIntelligence;choices:Record<string,string>}>({snapshot,choices:{}});
 const choices=decisions.snapshot===snapshot?decisions.choices:{};
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[selected,setSelected]=useState('');
 const rows=snapshot.groups.map(group=>resolveGroup(group,snapshot.turn,choices[group.id]));
 const totals=intelligenceTotals(rows);
 const shown=rows.filter(row=>`${row.group.code} ${atlas[row.group.code]?.name||''} ${holderLabel(row.holder)}`.toLowerCase().includes(query.toLowerCase())&&(filter==='all'||filter==='conflicts'&&row.conflicts.length>0||filter==='historical'&&row.historical||filter==='current'&&!row.historical||filter==='unknown'&&(!row.holder||(row.group.sea?seaFields:fields).some(field=>row.values[field]===undefined))));
 const active=shown.find(row=>row.group.id===selected)||shown[0];
 const chosenCount=rows.filter(row=>row.chosen).length;
 function choose(id:string,source:string){setDecisions({snapshot,choices:{...choices,[id]:source}});}

 return <>
  <div className="intel-summary" role="status"><p>{snapshot.sources.filter(s=>s.turn===snapshot.turn).length} reports for turn {snapshot.turn} · {rows.filter(r=>!r.historical).length} current location/contingent records · {totals.conflicted} unresolved current conflict{totals.conflicted===1?'':'s'} · {totals.historical} historical records.</p><p>Countries count once; each player’s contingent at sea counts once. A missing fleet listing is not evidence of an empty sea.</p></div>
  <details className="intel-totals" open><summary>Known current forces by player</summary><p>Whole units and usable industry only. Fractions and suppressed forces are not added. Counts may be incomplete: {totals.conflicted} conflicting, {totals.historical} historical, and {totals.unassigned} records with unknown ownership are excluded. Location filters below do not change these totals.</p>
   {totals.players.length?<div className="table-scroll intel-table" tabIndex={0} role="region" aria-label="Known current force totals"><table><thead><tr><th scope="col">Player</th>{fields.map(field=><th scope="col" key={field}>{field}</th>)}</tr></thead><tbody>{totals.players.map(total=><tr key={total.player??'minor'}><th scope="row">{total.player===null?'Unassigned minors':`Player ${total.player}`}</th>{fields.map(field=>{const value=total.fields[field];return <td key={field}>{value.reported?number(value.units):'Unknown'}{value.missing>0&&value.reported>0&&<small>{value.missing} unknown</small>}{value.suppressed>0&&<small>{number(value.suppressed)} suppressed, excluded</small>}</td>;})}</tr>)}</tbody></table></div>:<p>No current forces can be totaled from the included reports.</p>}
  </details>
  {chosenCount>0&&<p className="intel-choice-note">{chosenCount} source choice{chosenCount===1?'':'s'} applied in this view. These choices are temporary and reset when the turn or included reports change.</p>}
  <div className="intel-filters"><label>Find a location or player<input type="search" name="intelligence-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Country, sea, code, or Player 2"/></label><label>Show<select name="intelligence-filter" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All observations</option><option value="current">Current turn</option><option value="conflicts">Disagreements</option><option value="historical">Historical only</option><option value="unknown">Unknown values</option></select></label></div>
  <p>{shown.length} of {rows.length} location/contingent records. Select a row to inspect its sources. Unreported locations and unknown values are not zero.</p>
  {!!shown.length&&<div className="table-scroll intel-table intel-location-table" tabIndex={0} role="region" aria-label="Combined location intelligence"><table><thead><tr><th scope="col">Location</th><th scope="col">Owner/controller</th><th scope="col">Status</th>{fields.map(field=><th scope="col" key={field}>{field}</th>)}<th scope="col">Sources</th></tr></thead><tbody>{shown.map(row=><tr key={row.group.id} data-selected={active?.group.id===row.group.id}><th scope="row"><button type="button" className="text-button" aria-pressed={active?.group.id===row.group.id} onClick={()=>setSelected(row.group.id)}>{atlas[row.group.code]?.name||row.group.code} · {row.group.code}{row.group.sea&&row.holder?.player!=null?` · P${row.holder.player}`:''}</button></th><td>{row.conflicts.includes('Ownership/control')&&!row.chosen?'Conflicting ownership':holderLabel(row.holder)}</td><td>{status(row)}<small>Turn {row.group.turn}</small></td>{fields.map(field=><td key={field}><ForceValue row={row} field={field}/></td>)}<td>{row.group.candidates.length}<small>report{row.group.candidates.length===1?'':'s'}</small></td></tr>)}</tbody></table></div>}
  {!shown.length&&<p className="allied-empty">No observations match. Include reporting players or change the location filters.</p>}
  {active&&<section className="intel-evidence" aria-labelledby="intel-evidence-title"><p>This section shows the reports behind the location selected in the table above. Click another location in that table to update these details.</p><h2 id="intel-evidence-title">{atlas[active.group.code]?.name||active.group.code} · {active.group.code}{active.group.sea&&active.holder?.player!=null?` · Player ${active.holder.player}`:''} — sources and decisions</h2>
   <p>{active.historical?`Last observed on turn ${active.group.turn}; excluded from turn ${snapshot.turn} totals.`:`Observations for turn ${snapshot.turn}.`}{active.group.sea?' Contingents belonging to different players are kept separate.':''}</p>
   {!!active.conflicts.length&&<div className="intel-conflict"><h3>Reports disagree</h3><p>Conflicting fields: {active.conflicts.join(', ')}. {active.chosen?'A source choice is applied; the original disagreement is preserved.':'This entire record is excluded from current totals until you choose a source.'}</p><label>Source to use for {active.group.id}<select name="intelligence-source-choice" value={active.chosen?.source.id||''} onChange={e=>choose(active.group.id,e.target.value)}><option value="">Leave unresolved</option>{active.group.candidates.map(o=><option key={o.source.id} value={o.source.id}>{label(o)}</option>)}</select></label><p>A choice uses that source’s ownership and force values together, including its unknowns. It never rewrites a report.</p></div>}
   {!active.conflicts.length&&<p>Known values agree or provide complementary information. Repeated values are counted once; unknown values do not contradict a known value.</p>}
   <div className="intel-evidence-list">{active.group.candidates.map(o=><Evidence key={o.source.id} observation={o} sea={active.group.sea}/>)}</div>
   {active.group.observations.length>active.group.candidates.length&&<details className="intel-history"><summary>Earlier observations ({active.group.observations.length-active.group.candidates.length}) — excluded from current totals</summary><p>Earlier force counts are historical, even when the current report gives only ownership.</p>{active.group.observations.filter(o=>o.source.turn<active.group.turn).map(o=><Evidence key={o.source.id} observation={o} sea={active.group.sea}/>)}</details>}
  </section>}
 </>;
}

function ForceValue({row,field}:{row:ResolvedGroup;field:Field}){
 if(row.group.sea&&!seaFields.includes(field))return <>Not applicable</>;
 return <>{row.conflicts.includes(field)&&!row.chosen?'Conflict':number(row.values[field])}{row.conflicts.includes(`${field} suppressed`)&&!row.chosen?<small>Suppression conflict</small>:(row.suppressed[field]??0)>0?<small>+ {number(row.suppressed[field])} suppressed</small>:null}</>;
}

function Evidence({observation:o,sea}:{observation:Observation;sea:boolean}){
 return <article className="intel-source-record"><h3>{label(o)}</h3><p>{holderLabel(o.holder)} · {o.basis==='command'?'Forces-under-control table':o.basis==='visible'?'Visible intelligence':'Ownership only; forces unknown'}</p><dl className="intel-values">{(sea?seaFields:fields).map(field=><div key={field}><dt>{field}</dt><dd>{number(o.values[field])}{o.suppressed[field]!==undefined&&<small>{number(o.suppressed[field])} suppressed</small>}</dd></div>)}</dl><details><summary>Original location record</summary><pre>{o.record}</pre></details></article>;
}

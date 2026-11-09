"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import type {Campaign,Geography,OrderDraft,Report} from '../lib/wwbp/types';
import PlanningReference,{SourceBudget,DestinationInfo} from './planning-reference';
import OrderHelp,{BuilderHelp} from './order-help';
import {validateHeading,headingForTurn} from '../lib/submission-heading';
import {checkOrders} from '../lib/order-checker';
import InfoTip from './info-tip';

export default function OrderEditor({campaign,report,atlas,busy,onSave,onDirty,latestTurn}:{campaign:Campaign;report:Report;atlas:Record<string,Geography>;busy:boolean;onSave:(draft:OrderDraft,heading:string)=>Promise<void>;onDirty:(dirty:boolean)=>void;latestTurn:number}){
 const saved=campaign.orderDrafts?.find(d=>d.baseTurn===report.turn);
 const [text,setText]=useState(saved?.text||''),[status,setStatus]=useState(''),[source,setSource]=useState(''),[action,setAction]=useState('AC'),[amount,setAmount]=useState('1'),[target,setTarget]=useState('');
 const [heading,setHeading]=useState(campaign.submissionHeading||'');
 const previousHeading=useRef(campaign.submissionHeading||'');
 useEffect(()=>{const prior=previousHeading.current,next=campaign.submissionHeading||'';previousHeading.current=next;setHeading(current=>current===prior?next:current);},[campaign.submissionHeading]);
 let headingError='';try{validateHeading(heading,campaign.game,campaign.player);if(headingForTurn(heading,report.turn+1).length>76)throw Error('The heading for this turn exceeds 76 characters. Shorten it before exporting.');}catch(e){headingError=(e as Error).message;}
 const [copyStatus,setCopyStatus]=useState('');
 const [builderOpen,setBuilderOpen]=useState(false),[railTab,setRailTab]=useState<'checks'|'budget'|'review'>('checks');
 const helpDialog=useRef<HTMLDialogElement>(null);
 const editor=useRef<HTMLTextAreaElement>(null),preview=useRef<HTMLDialogElement>(null);
 const previousSaved=useRef(saved?.text||'');
 useEffect(()=>{const prior=previousSaved.current;const next=saved?.text||'';previousSaved.current=next;setText(current=>current===prior?next:current);},[saved?.text]);
 const dirty=text!==(saved?.text||'')||heading!==(campaign.submissionHeading||'');
 useEffect(()=>{onDirty(dirty);return()=>onDirty(false);},[dirty,onDirty]);
 useEffect(()=>{if(!dirty)return;const handler=(event:BeforeUnloadEvent)=>event.preventDefault();window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler);},[dirty]);
 const result=useMemo(()=>checkOrders(text,report,atlas),[text,report,atlas]);
 const submission=heading.trim()?headingForTurn(heading.trim(),report.turn+1)+'\r\n\r\n'+result.exportText:result.exportText;
 const allIssues=[...result.issues,...result.rows.flatMap(r=>r.issues)];
 const errors=allIssues.filter(i=>i.level==='error').length,warnings=allIssues.filter(i=>i.level==='warning').length;
 const cashAllocated=result.budgets.find(b=>b.source==='Player'&&b.resource==='Dollars')?.used??0;
 const cashAvailable=Math.floor(report.Dollars),cashRemaining=cashAvailable-cashAllocated;
 const number=(value:number)=>value.toLocaleString('en-US');
 const budgetRows=result.budgets;
 const defaults=report.raw.slice(0,report.raw.indexOf('Forces under your control:')).match(/Defaults=\(([^)]*)\)/)?.[1]||'Not reported';
 const standing=Object.values(report.spaces).filter(s=>/\/[1-5]\//.test(s.raw));
 const build=action.startsWith('B');
 function chooseSource(code:string){setSource(code);setBuilderOpen(true);}
 function chooseTarget(code:string){setTarget(code);setBuilderOpen(true);}
 function append(){
  if(!source||!/^\d+$/.test(amount)||!build&&!atlas[target])return;
  const addition=`@${source}\n${action}${amount}${build?'':target}`;
  setText(current=>{const end=/^\s*END\s*$/im;return end.test(current)?current.replace(end,addition+'\nEND'):current.trimEnd()+(current.trim()?'\n':'')+addition+'\n';});setStatus('Added order. Its checks are in the panel on the right.');editor.current?.focus();
 }
 async function save(){if(headingError){setStatus('Nothing was saved: '+headingError);document.getElementById('submission-heading')?.focus();return;}try{await onSave({baseTurn:report.turn,text,updatedAt:new Date().toISOString()},heading);setHeading(current=>current===heading?heading.trim():current);setStatus('Draft and heading saved.');}catch(e){setStatus('Nothing was saved: '+(e as Error).message);}}
 function locate(line:number){const area=editor.current;if(!area)return;const start=text.split('\n').slice(0,line-1).reduce((n,s)=>n+s.length+1,0);area.focus();area.setSelectionRange(start,start+(text.split('\n')[line-1]?.length||0));}
 function download(){const url=URL.createObjectURL(new Blob([submission],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`${report.game}-P${report.player}-after-turn-${report.turn}-orders.txt`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 const issueRows=result.rows.flatMap((row,i)=>row.issues.map((issue,j)=>({key:i+'-'+j,row,issue})));
 const headingSet=!!heading.trim()&&!headingError;
 return <section className="order-editor orders-workspace" aria-labelledby="orders-heading">
  <div className="ow-header">
   <div className="ow-title"><h1 id="orders-heading">Orders · Turn {report.turn+1}</h1><p role={status.startsWith('Nothing was saved:')?'alert':'status'} className={status.startsWith('Nothing was saved:')?'order-error':undefined}>Based on report {report.turn} · {dirty?<span className="ow-unsaved">Unsaved changes</span>:saved?'Saved '+new Date(saved.updatedAt).toLocaleString():'New draft, not saved yet'}{status?' · '+status:''}</p></div>
   <div className="actions"><button type="button" disabled={busy||!dirty} onClick={()=>{if(window.confirm('Discard unsaved edits and return to the saved draft?')){setText(saved?.text||'');setHeading(campaign.submissionHeading||'');setStatus('Unsaved edits discarded.');}}}>Discard edits</button><button type="button" className="ow-save" disabled={busy||!dirty} onClick={()=>void save()}>Save draft</button><button type="button" className="primary" disabled={!result.count||errors>0||!!headingError} title={!result.count?'Add at least one order first.':errors>0?'Resolve errors before exporting.':headingError?'Fix the email heading first.':undefined} onClick={()=>preview.current?.showModal()}>Review &amp; export</button></div>
  </div>
  {report.turn!==latestTurn&&<p className="notice">You are drafting from an older report. The latest available report is turn {latestTurn}.</p>}
  <div className="ow-layout">
   <PlanningReference report={report} atlas={atlas} source={source} onSource={chooseSource} onTarget={chooseTarget}/>
   <div className="ow-center" role="region" aria-label="Draft and order builder">
    <div className="ow-toolbar"><button type="button" aria-expanded={builderOpen} aria-controls="order-builder" className={builderOpen?'ow-toggle-on':undefined} onClick={()=>setBuilderOpen(!builderOpen)}>{builderOpen?'Close builder':'+ Add order'}</button><button type="button" onClick={()=>helpDialog.current?.showModal()}>Order help</button><span className="ow-toolbar-hint">Start player orders with @, each space with @ and its code.</span></div>
    {builderOpen&&<div id="order-builder" className="order-builder ow-builder" role="group" aria-label="Add a space order"><div className="order-builder-fields">
     <label>Source<select value={source} onChange={e=>setSource(e.target.value)}><option value="">Choose your space</option>{Object.keys(report.own).sort().map(code=><option key={code} value={code}>{code} · {atlas[code]?.name||code}</option>)}</select></label>
     <label>Action<select value={action} onChange={e=>setAction(e.target.value)}>{Object.entries({AC:'Army: conquer',AB:'Army: bombard',AS:'Army: support',AT:'Army: move',NN:'Navy: attack coast',NS:'Navy: support',NT:'Navy: move',FA:'Air: attack army',FN:'Air: attack navy',FF:'Air: attack air base',FI:'Air: attack industry',FS:'Air: support',FT:'Air: move',MA:'Missiles: attack army',MF:'Missiles: attack air base',MI:'Missiles: attack industry',MT:'Missiles: move',XT:'Anti-missiles: move',BI:'Build industry',BA:'Build army',BN:'Build navy',BF:'Build air force',BM:'Build missiles',BX:'Build anti-missiles'}).map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label>
     <label>{build?'Industry to spend':'Units'}<input type="number" min={1} step={1} value={amount} onChange={e=>setAmount(e.target.value)}/></label>
     {!build&&<label>Target code<input list="order-targets" value={target} maxLength={3} onChange={e=>setTarget(e.target.value.toUpperCase())} placeholder="ALI"/><datalist id="order-targets">{Object.entries(atlas).map(([code,g])=><option key={code} value={code}>{g.name}</option>)}</datalist></label>}
    </div><SourceBudget source={source} report={report} budgets={result.budgets}/>{!build&&<DestinationInfo code={target} report={report} atlas={atlas}/>}<BuilderHelp source={source} action={action} amount={amount} target={target} atlas={atlas}/><div className="actions"><button type="button" className="primary" disabled={!source||!/^\d+$/.test(amount)||+amount<1||!build&&!atlas[target]} onClick={append}>Add order</button><button type="button" onClick={()=>setBuilderOpen(false)}>Done</button></div></div>}
    <label className="order-label" htmlFor="order-text">Your orders</label>
    <textarea ref={editor} id="order-text" aria-describedby="order-help" value={text} maxLength={100000} onChange={e=>{setText(e.target.value);setStatus('');}} spellCheck={false} autoCapitalize="characters" autoCorrect="off" placeholder={'@\n2A\n@AAL\nBA5\nAC3ALI'}/>
    <p id="order-help" className="ow-note with-tip">ORDERS and END are optional; export adds them.<InfoTip label="What belongs in this box">Only orders go here. Keep your email heading, security code, and messages out of this box; the heading field below handles it.</InfoTip></p>
    <div className="ow-heading" data-state={headingError&&heading.trim()?'error':headingSet?'ok':'empty'}>
     <label htmlFor="submission-heading">Email heading {headingSet?<span className="ow-ok" aria-label="Heading is valid">✓</span>:null}</label>
     <input id="submission-heading" value={heading} maxLength={76} spellCheck={false} autoComplete="off" placeholder={report.game+' T-'+(report.turn+1)+' ['+report.player+'] Your name, #Account <SecurityCode>'} onChange={e=>{setHeading(e.target.value);setStatus('');}} aria-describedby="heading-help"/>
     <p id="heading-help">{headingError&&heading.trim()?<span role="alert" className="order-error">{headingError}</span>:headingSet?<>Exports as <code>{headingForTurn(heading.trim(),report.turn+1)}</code></>:'Paste it once and save. It stays private to this campaign; the turn number updates on export.'}</p>
    </div>
   </div>
   <aside className="ow-rail" aria-label="Draft checks">
    <section className="order-summary ow-summary" aria-label="Draft resource summary">
     <dl className="order-cash"><div><dt>Money</dt><dd>${number(cashAvailable)}</dd></div><div><dt>Allocated</dt><dd>${number(cashAllocated)}</dd></div><div><dt>Remaining</dt><dd className={cashRemaining<0?'order-error':undefined}>${number(cashRemaining)}</dd></div></dl>
     <p className="ow-counts"><span>{result.count} orders</span><span className={'ow-count'+(errors?' is-error':'')}>{errors} errors</span><span className={'ow-count'+(warnings?' is-warning':'')}>{warnings} warnings</span></p>
    </section>
    <div className="ow-tabs" role="tablist" aria-label="Check views">{([['checks','Checks'],['budget','Budget'],['review','Review']] as const).map(([id,label])=><button type="button" role="tab" key={id} id={'ow-tab-'+id} aria-selected={railTab===id} aria-controls={'ow-panel-'+id} onClick={()=>setRailTab(id)}>{label}{id==='checks'&&errors+warnings>0?<span className="ow-tab-count">{errors+warnings}</span>:null}</button>)}</div>
    <div className="ow-panel" role="tabpanel" id={'ow-panel-'+railTab} aria-labelledby={'ow-tab-'+railTab} tabIndex={0}>
     {railTab==='checks'&&<>{!text.trim()?<p>Start a draft to see explanations and checks.</p>:errors+warnings===0?<p className="ow-clear">No problems found in the rules checked.</p>:null}
      {result.issues.length>0&&<ul className="ow-issues">{result.issues.map((issue,i)=><li key={i} className={'order-'+issue.level}><strong>{issue.level==='error'?'Error':'Review'}</strong> {issue.message}</li>)}</ul>}
      {issueRows.length>0&&<ul className="ow-issues">{issueRows.map(({key,row,issue})=><li key={key} className={'order-'+issue.level}><button type="button" className="text-button" onClick={()=>locate(row.line)}>Line {row.line} · <code>{row.token}</code></button><span>{issue.message}</span></li>)}</ul>}
      <p className="ow-note with-tip"><button type="button" className="text-button" onClick={()=>helpDialog.current?.showModal()}>What’s checked?</button><InfoTip label="What these totals include">Explicit draft orders only; defaults and standing orders are not included. Context markers (@) don’t count as orders.</InfoTip></p></>}
     {railTab==='budget'&&<><p className="ow-note with-tip">Highlighted rows still have forces or industry unallocated.<InfoTip label="What the budget includes">Every space under your control in report {report.turn}. Whole usable units; suppressed forces, new construction, standing orders and defaults are excluded.</InfoTip></p><div className="table-scroll"><table className="ow-budget"><thead><tr><th>Source</th><th>Resource</th><th>Avail.</th><th>Used</th><th>Left</th></tr></thead><tbody>{budgetRows.map(b=><tr key={b.source+b.resource} className={b.source!=='Player'&&b.available>b.used?'order-budget-unallocated':undefined}><td>{b.source}</td><td>{b.resource}</td><td>{b.available}</td><td>{b.used}</td><td className={b.used>b.available?'order-error':''}>{b.available-b.used}</td></tr>)}</tbody></table></div></>}
     {railTab==='review'&&<>{!result.rows.length&&<p>No orders yet.</p>}<ol className="ow-review">{result.rows.map((row,i)=><li key={i}><div className="ow-review-head"><button type="button" className="text-button" onClick={()=>locate(row.line)}>Line {row.line}</button><span>{row.source||'Player'}</span><code>{row.token}</code></div><p>{row.description}</p>{row.issues.length>0&&<ul>{row.issues.map((issue,j)=><li key={j} className={'order-'+issue.level}><strong>{issue.level==='error'?'Error':'Review'}:</strong> {issue.message}</li>)}</ul>}</li>)}</ol></>}
    </div>
   </aside>
  </div>
  <dialog ref={helpDialog} className="ow-help" aria-labelledby="order-help-title"><header className="source-dialog-header"><h2 id="order-help-title">Order help</h2><button type="button" onClick={()=>helpDialog.current?.close()}>Close</button></header><div className="ow-help-body">
   <section><h3>What the checker covers</h3><p>Full order syntax, source control, space codes, unit range, minor restrictions, explicit resource totals, duplicate space orders, and common attack/support conflicts.</p>
   <h3>Still needs your review</h3><p>Standing orders, automatic default builds, canal permissions, game-specific exceptions, and combat outcomes are not fully simulated. Incoming forces are not added to available units. Use the official order-check service before submission.</p>
   <h3>Defaults in this report</h3><code>{defaults}</code><p>Defaults persist. Setting BA100 does not cancel an existing BF100; use BF0 if that is your intention.</p>
   <details><summary>Standing-order source records</summary>{standing.length?standing.map(s=><pre key={s.code}>{s.raw}</pre>):<p>No standing-order notation recognized in country records. Check the original report before relying on that.</p>}</details></section>
   <OrderHelp embedded/>
  </div></dialog>
  <dialog ref={preview} className="range-dialog" aria-labelledby="order-export-title"><header className="source-dialog-header"><h2 id="order-export-title">Review order export</h2><button type="button" onClick={()=>preview.current?.close()}>Close</button></header><div className="range-body"><p>{report.game} · Player {report.player} · For turn {report.turn+1} · {result.count} orders</p><p>{heading.trim()?'Your submission heading is included with the turn number updated. Verify the heading before sending.':'No submission heading is set. Add the required identity and security heading to your email, or save it in the editor.'} Review standing orders with the official checker. Nothing is sent by this app.</p>{dirty&&<p className="notice">This preview includes unsaved edits. Save your draft separately to keep them in the app.</p>}<pre>{submission}</pre><div className="actions"><button type="button" className="primary" onClick={async()=>{try{await navigator.clipboard.writeText(submission);setCopyStatus('Copied. Paste this block into your order email.');}catch{setCopyStatus('Could not copy. Download the block or select its text above.');}}}>{heading.trim()?'Copy orders with heading':'Copy order block'}</button><button type="button" onClick={download}>Download orders</button></div><p role="status">{copyStatus}</p></div></dialog>
 </section>;
}

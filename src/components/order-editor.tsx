"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import type {Campaign,Geography,OrderDraft,Report} from '../lib/wwbp/types';
import OrderHelp,{BuilderHelp} from './order-help';
import {checkOrders} from '../lib/order-checker';

export default function OrderEditor({campaign,report,atlas,busy,onSave,onDirty,latestTurn}:{campaign:Campaign;report:Report;atlas:Record<string,Geography>;busy:boolean;onSave:(draft:OrderDraft)=>Promise<void>;onDirty:(dirty:boolean)=>void;latestTurn:number}){
 const saved=campaign.orderDrafts?.find(d=>d.baseTurn===report.turn);
 const [text,setText]=useState(saved?.text||''),[status,setStatus]=useState(''),[source,setSource]=useState(''),[action,setAction]=useState('AC'),[amount,setAmount]=useState('1'),[target,setTarget]=useState('');
 const [copyStatus,setCopyStatus]=useState('');
 const editor=useRef<HTMLTextAreaElement>(null),preview=useRef<HTMLDialogElement>(null);
 const previousSaved=useRef(saved?.text||'');
 useEffect(()=>{const prior=previousSaved.current;const next=saved?.text||'';previousSaved.current=next;setText(current=>current===prior?next:current);},[saved?.text]);
 const dirty=text!==(saved?.text||'');
 useEffect(()=>{onDirty(dirty);return()=>onDirty(false);},[dirty,onDirty]);
 useEffect(()=>{if(!dirty)return;const handler=(event:BeforeUnloadEvent)=>event.preventDefault();window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler);},[dirty]);
 const result=useMemo(()=>checkOrders(text,report,atlas),[text,report,atlas]);
 const allIssues=[...result.issues,...result.rows.flatMap(r=>r.issues)];
 const errors=allIssues.filter(i=>i.level==='error').length,warnings=allIssues.filter(i=>i.level==='warning').length;
 const defaults=report.raw.slice(0,report.raw.indexOf('Forces under your control:')).match(/Defaults=\(([^)]*)\)/)?.[1]||'Not reported';
 const standing=Object.values(report.spaces).filter(s=>/\/[1-5]\//.test(s.raw));
 const build=action.startsWith('B');
 function append(){
  if(!source||!/^\d+$/.test(amount)||!build&&!atlas[target])return;
  const addition=`@${source}\n${action}${amount}${build?'':target}`;
  setText(current=>{const end=/^\s*END\s*$/im;return end.test(current)?current.replace(end,addition+'\nEND'):current.trimEnd()+(current.trim()?'\n':'')+addition+'\n';});setStatus('Added order. Review its checks below.');editor.current?.focus();
 }
 async function save(){try{await onSave({baseTurn:report.turn,text,updatedAt:new Date().toISOString()});setStatus('Draft saved.');}catch(e){setStatus('Draft was not saved: '+(e as Error).message);}}
 function locate(line:number){const area=editor.current;if(!area)return;const start=text.split('\n').slice(0,line-1).reduce((n,s)=>n+s.length+1,0);area.focus();area.setSelectionRange(start,start+(text.split('\n')[line-1]?.length||0));}
 function download(){const url=URL.createObjectURL(new Blob([result.exportText],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`${report.game}-P${report.player}-after-turn-${report.turn}-orders.txt`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <section className="order-editor" aria-labelledby="orders-heading">
  <div className="table-heading"><div><h2 id="orders-heading">Order editor & checker</h2><p>{report.game} · Player {report.player} · Draft for turn {report.turn+1}, based on report {report.turn}</p></div><div className="actions"><button type="button" className="primary" disabled={busy||!dirty} onClick={()=>void save()}>Save draft</button><button type="button" disabled={busy||!dirty} onClick={()=>{if(window.confirm('Discard unsaved edits and return to the saved draft?')){setText(saved?.text||'');setStatus('Unsaved edits discarded.');}}}>Discard edits</button><button type="button" disabled={!result.count||errors>0} onClick={()=>preview.current?.showModal()}>Review export</button></div></div>
  <p role="status">{dirty?'Unsaved changes — save before changing campaign or report.':saved?'Saved draft · '+new Date(saved.updatedAt).toLocaleString():'New draft — nothing has been saved yet.'} {status}</p>
  {report.turn!==latestTurn&&<p className="notice">You are drafting from an older report. The latest available report is turn {latestTurn}.</p>}
  <div className="order-layout"><div>
   <label className="order-label" htmlFor="order-text">Your orders</label><p id="order-help">Paste orders or use the builder below. Start player orders with @ and each space with @ plus its code. ORDERS and END are optional here; export adds them. Keep your email heading, security code, and messages out of this box.</p>
   <textarea ref={editor} id="order-text" aria-describedby="order-help" value={text} maxLength={100000} onChange={e=>{setText(e.target.value);setStatus('');}} spellCheck={false} autoCapitalize="characters" autoCorrect="off" placeholder={'@\n2A\n@AAL\nBA5\nAC3ALI'}/>
   <details className="order-builder"><summary>Add a space order</summary><div className="order-builder-fields">
    <label>Source<select value={source} onChange={e=>setSource(e.target.value)}><option value="">Choose your space</option>{Object.keys(report.own).sort().map(code=><option key={code} value={code}>{code} · {atlas[code]?.name||code}</option>)}</select></label>
    <label>Action<select value={action} onChange={e=>setAction(e.target.value)}>{Object.entries({AC:'Army: conquer',AB:'Army: bombard',AS:'Army: support',AT:'Army: move',NN:'Navy: attack coast',NS:'Navy: support',NT:'Navy: move',FA:'Air: attack army',FN:'Air: attack navy',FF:'Air: attack air base',FI:'Air: attack industry',FS:'Air: support',FT:'Air: move',MA:'Missiles: attack army',MF:'Missiles: attack air base',MI:'Missiles: attack industry',MT:'Missiles: move',XT:'Anti-missiles: move',BI:'Build industry',BA:'Build army',BN:'Build navy',BF:'Build air force',BM:'Build missiles',BX:'Build anti-missiles'}).map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label>
    <label>{build?'Industry to spend':'Units'}<input type="number" min={1} step={1} value={amount} onChange={e=>setAmount(e.target.value)}/></label>
    {!build&&<label>Target code<input list="order-targets" value={target} maxLength={3} onChange={e=>setTarget(e.target.value.toUpperCase())} placeholder="ALI"/><datalist id="order-targets">{Object.entries(atlas).map(([code,g])=><option key={code} value={code}>{g.name}</option>)}</datalist></label>}
   </div><BuilderHelp source={source} action={action} amount={amount} target={target} atlas={atlas}/><button type="button" disabled={!source||!/^\d+$/.test(amount)||+amount<1||!build&&!atlas[target]} onClick={append}>Add order</button></details>
   <OrderHelp/>
  </div><aside className="order-check-panel"><h3>Checks</h3><p>{result.count} orders · {errors} errors · {warnings} warnings</p><p>Context markers (@) do not count as orders.</p>{!text.trim()?<p>Start a draft to see explanations and checks.</p>:errors===0&&<p>No errors found in the rules checked below.</p>}
   {result.issues.length>0&&<ul>{result.issues.map((issue,i)=><li key={i} className={'order-'+issue.level}><strong>{issue.level==='error'?'Error':'Review'}:</strong> {issue.message}</li>)}</ul>}
   <h3>What is checked</h3><p>Full order syntax, source control, space codes, unit range, minor restrictions, explicit resource totals, duplicate space orders, and common attack/support conflicts.</p>
   <h3>Still needs your review</h3><p>Standing orders, automatic default builds, canal permissions, game-specific exceptions, and combat outcomes are not fully simulated. Incoming forces are not added to available units. Use the official order-check service before submission.</p>
   <h3>Defaults in this report</h3><code>{defaults}</code><p>Defaults persist. Setting BA100 does not cancel an existing BF100; use BF0 if that is your intention.</p>
   <details><summary>Standing-order source records</summary>{standing.length?standing.map(s=><pre key={s.code}>{s.raw}</pre>):<p>No standing-order notation recognized in country records. Check the original report before relying on that.</p>}</details>
  </aside></div>
  <h3>Order-by-order review</h3><div className="table-scroll"><table className="order-review"><thead><tr><th>Line / source</th><th>Order</th><th>Meaning and checks</th></tr></thead><tbody>{result.rows.map((row,i)=><tr key={i}><td><button type="button" className="text-button" onClick={()=>locate(row.line)}>Line {row.line}</button><br/>{row.source||'Player'}</td><td><code>{row.token}</code></td><td>{row.description}{row.issues.length>0&&<ul>{row.issues.map((issue,j)=><li key={j} className={'order-'+issue.level}><strong>{issue.level==='error'?'Error':'Review'}:</strong> {issue.message}</li>)}</ul>}</td></tr>)}</tbody></table></div>
  {result.budgets.length>0&&<><h3>Explicit-order budget</h3><p>Whole usable units from report {report.turn}. Suppressed forces and new construction are excluded. Standing orders and defaults are not included.</p><div className="table-scroll"><table><thead><tr><th>Source</th><th>Resource</th><th>Available</th><th>Allocated</th><th>Unallocated</th></tr></thead><tbody>{result.budgets.map(b=><tr key={b.source+b.resource}><td>{b.source}</td><td>{b.resource}</td><td>{b.available}</td><td>{b.used}</td><td className={b.used>b.available?'order-error':''}>{b.available-b.used}</td></tr>)}</tbody></table></div></>}
  <dialog ref={preview} className="range-dialog" aria-labelledby="order-export-title"><header className="source-dialog-header"><h2 id="order-export-title">Review order export</h2><button type="button" onClick={()=>preview.current?.close()}>Close</button></header><div className="range-body"><p>{report.game} · Player {report.player} · For turn {report.turn+1} · {result.count} orders</p><p>This is the order block only. Add the required game/turn/player, real name, account number, and security code heading in your email. Verify the turn number and review standing orders with the official checker. Nothing is sent by this app.</p>{dirty&&<p className="notice">This preview includes unsaved edits. Save your draft separately to keep them in the app.</p>}<pre>{result.exportText}</pre><div className="actions"><button type="button" className="primary" onClick={async()=>{try{await navigator.clipboard.writeText(result.exportText);setCopyStatus('Copied. Paste this block into your order email.');}catch{setCopyStatus('Could not copy. Download the block or select its text above.');}}}>Copy order block</button><button type="button" onClick={download}>Download order block</button></div><p role="status">{copyStatus}</p></div></dialog>
 </section>;
}

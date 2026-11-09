"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import type {Geography,Report} from '../lib/wwbp/types';
import {viewLabels,type View} from './app-sidebar';
import {ownership} from './space-inspector';

type Result={kind:'page';id:View;label:string}|{kind:'space';code:string;label:string;detail:string};

/** Ctrl+K palette: jump to any page, or find a space and open it. */
export default function QuickFind({open,onClose,atlas,report,onPage,onSpace}:{open:boolean;onClose:()=>void;atlas:Record<string,Geography>;report:Report|undefined;onPage:(v:View)=>void;onSpace:(code:string)=>void}){
 const dialog=useRef<HTMLDialogElement>(null),input=useRef<HTMLInputElement>(null);
 const [query,setQuery]=useState(''),[active,setActive]=useState(0);
 useEffect(()=>{const d=dialog.current;if(!d)return;if(open&&!d.open){setQuery('');setActive(0);d.showModal();input.current?.focus();}else if(!open&&d.open)d.close();},[open]);
 const results=useMemo<Result[]>(()=>{
  const q=query.trim().toLowerCase();
  const pages:Result[]=(Object.entries(viewLabels) as [View,string][]).filter(([,label])=>!q||label.toLowerCase().includes(q)).map(([id,label])=>({kind:'page',id,label}));
  if(!report)return pages;
  const spaces:Result[]=q?Object.entries(atlas).filter(([code,g])=>code.toLowerCase().startsWith(q)||g.name.toLowerCase().includes(q)).sort(([a],[b])=>Number(!a.toLowerCase().startsWith(q))-Number(!b.toLowerCase().startsWith(q))||a.localeCompare(b)).slice(0,12).map(([code,g])=>({kind:'space',code,label:g.name,detail:code+' · '+ownership(report,code)})):[];
  return q?[...spaces,...pages]:pages;
 },[query,atlas,report]);
 const choose=(r:Result|undefined)=>{if(!r)return;onClose();if(r.kind==='page')onPage(r.id);else onSpace(r.code);};
 const current=Math.min(active,Math.max(results.length-1,0));
 return <dialog ref={dialog} className="quick-find" aria-label="Quick find" onClose={onClose} onClick={e=>{if(e.target===dialog.current)onClose();}}>
  <input ref={input} role="combobox" aria-expanded="true" aria-controls="quick-find-results" aria-activedescendant={results.length?'qf-'+current:undefined} aria-label="Find a page or space" placeholder={report?'Find a country, sea, or page…':'Find a page…'} value={query} autoComplete="off" spellCheck={false}
   onChange={e=>{setQuery(e.target.value);setActive(0);}}
   onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();setActive(Math.min(current+1,results.length-1));}else if(e.key==='ArrowUp'){e.preventDefault();setActive(Math.max(current-1,0));}else if(e.key==='Enter'){e.preventDefault();choose(results[current]);}}}/>
  <ul id="quick-find-results" role="listbox" aria-label="Results">{results.map((r,i)=><li key={r.kind+(r.kind==='page'?r.id:r.code)} id={'qf-'+i} role="option" aria-selected={i===current} onMouseEnter={()=>setActive(i)} onClick={()=>choose(r)}>{r.kind==='page'?<><span className="qf-kind">Page</span><strong>{r.label}</strong></>:<><span className="qf-kind">Space</span><strong>{r.label}</strong><small>{r.detail}</small></>}</li>)}{!results.length&&<li className="qf-empty">No matches.</li>}</ul>
  <p className="qf-hint"><kbd>↑</kbd><kbd>↓</kbd> to move · <kbd>Enter</kbd> to open · <kbd>Esc</kbd> to close</p>
 </dialog>;
}

"use client";
import {useEffect,useId,useRef,useState,type ReactNode} from 'react';

/** A small "i" that reveals a caveat or explanation on demand, instead of a paragraph on every page.
 * Uses only phrasing content so it can sit inside paragraphs and headings. */
export default function InfoTip({label,children}:{label:string;children:ReactNode}){
 const [open,setOpen]=useState(false),id=useId(),wrap=useRef<HTMLSpanElement>(null);
 useEffect(()=>{if(!open)return;const close=(e:Event)=>{if(e instanceof KeyboardEvent?e.key==='Escape':!wrap.current?.contains(e.target as Node))setOpen(false);};document.addEventListener('pointerdown',close);document.addEventListener('keydown',close);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',close);};},[open]);
 return <span className="info-tip" ref={wrap} data-open={open}><button type="button" className="info-tip-button" aria-label={label} title={label} aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)}><span aria-hidden="true">i</span></button><span id={id} className="info-tip-body" role="note" hidden={!open}>{children}</span></span>;
}

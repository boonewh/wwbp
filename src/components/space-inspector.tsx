"use client";
import {fields,type Geography,type Report} from '../lib/wwbp/types';
import {mapChanges} from '../lib/map-changes';
import ForcesInRange from './forces-in-range';

const num=(n:number|undefined)=>n==null?'—':n.toLocaleString('en-US',{maximumFractionDigits:2});
export function ownership(r:Report,code:string){const s=r.spaces[code];return code.startsWith('W')?'Sea space':!s?'Not reported':s.owner?`Occupied by player ${s.owner}`:s.controller?`Minor · player ${s.controller} control`:'Minor · control unknown';}

/** Everything known about one space in one report. Used by the map detail panel and the global slide-over. */
export default function SpaceInspector({report:r,previous,atlas,code,onSpace,headingLevel=2}:{report:Report;previous:Report|null;atlas:Record<string,Geography>;code:string;onSpace:(code:string)=>void;headingLevel?:2|3}){
 const geo=atlas[code];if(!geo)return <p>Unknown space {code}.</p>;
 const s=r.spaces[code],changes=previous?mapChanges(previous,r)[code]:undefined;
 const H=headingLevel===2?'h2':'h3';
 const links=(items:string[])=>items.length?items.map(c=><button type="button" className="chip" key={c} onClick={()=>onSpace(c)}>{c} · {atlas[c]?.name||c}</button>):<p>None reported.</p>;
 return <div className="space-inspector">
  <p className="eyebrow">{code} / {code.startsWith('W')?'Sea space':'Country'}</p>
  <H className="inspector-name">{geo.name}</H>
  <p>{ownership(r,code)}{r.own[code]?' · under your control':''}</p>
  <ForcesInRange key={code} report={r} atlas={atlas} selected={code}/>
  {previous&&<section className="selected-changes"><h3>Changes since turn {previous.turn}</h3>{changes?.length?<><ul>{changes.map(change=><li key={change.label}>{change.label}</li>)}</ul><p>Before: {ownership(previous,code)}.</p><p>Now: {ownership(r,code)}.</p></>:<p>No ownership, control, visibility, or reported-force change.</p>}</section>}
  {s?.visible?<><h3>Known forces · Turn {r.turn}</h3><dl className="force-grid">{fields.map(f=><div key={f}><dt>{f}</dt><dd>{num(s.values[f])}{(s.suppressed[f]??0)>0&&<small> + {num(s.suppressed[f])} suppressed</small>}</dd></div>)}</dl>{s.fleets.length>0&&<><h3>Reported fleets</h3>{s.fleets.map((f,i)=><p key={i}>Player {f.player}: Army {num(f.values.Army)}, Navy {num(f.values.Navy)}, Air {num(f.values.AirF)}</p>)}</>}</>:<p className="inspector-unknown">Forces unknown in this report.</p>}
  <h3>Surface connections</h3><div className="chips">{links(geo.surface)}</div>
  <h3>Air connections</h3><div className="chips">{links(geo.air)}</div>
  {geo.canals.map(c=><p key={c.target}>Canal to {atlas[c.target]?.name||c.target} via {atlas[c.gate]?.name||c.gate}.</p>)}
  <p className="inspector-note">Connections describe geography. Unit rules, canal control, and permissions still apply.</p>
 </div>;
}

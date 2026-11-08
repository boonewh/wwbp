import type {Campaign,Geography,Report} from '../lib/wwbp/types';
import {metrics,compare} from '../lib/wwbp/parser';
import Multipliers from './multipliers';

const num=(n:number|undefined)=>n==null?'—':n.toLocaleString('en-US',{maximumFractionDigits:2});
const metricLabels=[['occupied','Occupied countries'],['industry','Usable industry'],['cash','Reserve dollars'],['suppressedIndustry','Suppressed industry'],['suppressedAir','Recovering air force']] as const;
const changeLabels=[['captures','Countries captured'],['lost','Countries lost'],['controlGained','Minor control gained'],['controlLost','Minor control lost']] as const;

export function KpiStrip({report,onOpen}:{report:Report;onOpen:()=>void}){
 const m=metrics(report);
 return <div className="kpi-strip"><span><strong>{num(m.occupied)}</strong> countries</span><span><strong>{num(m.industry)}</strong> usable industry</span><span><strong>${num(m.cash)}</strong> reserve</span><button type="button" className="text-button" onClick={onOpen}>Turn summary →</button></div>;
}

export default function TurnSummary({campaign,report:r,previous,atlas,onSpace}:{campaign:Campaign;report:Report;previous:Report|null;atlas:Record<string,Geography>;onSpace:(code:string)=>void}){
 const m=metrics(r),before=previous?metrics(previous):null,changes=compare(previous,r);
 const links=(items:string[])=>items.length?items.map(code=><button type="button" className="chip" key={code} onClick={()=>onSpace(code)}>{code} · {atlas[code]?.name||code}</button>):<p>None reported.</p>;
 const own=campaign.reports.length,allied=campaign.alliedReports?.length||0;
 return <section className="turn-summary" aria-labelledby="summary-title">
  <div className="page-head"><div><h1 id="summary-title">Turn {r.turn} summary</h1><p>{r.position.replaceAll('/',' / ')} · {previous?`Compared with turn ${previous.turn}`:'Opening report'} · {r.due}</p></div></div>
  <div className="metrics-wrapper"><div className="metrics">{metricLabels.map(([k,label])=><div className="metric" key={k}><p>{label}</p><div className="metric-value">{num(m[k])}</div><p>{before?`${m[k]-before[k]>0?'+':''}${num(m[k]-before[k])} since turn ${previous?.turn}`:'Opening report'}</p></div>)}</div></div>
  <Multipliers report={r} previous={previous}/>
  <div className="briefing">
   <div><h2>What changed</h2>{!previous&&<p>Select a later report to see changes.</p>}{changeLabels.map(([k,title])=><section key={k}><h3>{title}</h3><div className="chips">{links(changes[k])}</div></section>)}</div>
   <div><h2>Orders & diplomacy</h2>
    <h3>Rejected orders</h3>{r.errors.length?<ul className="summary-errors">{r.errors.map((e,i)=><li key={i}>{e}</li>)}</ul>:<p>None reported.</p>}
    <h3>Intelligence assets</h3><p>Reserve spies: {r.Spies} · Counterspies: {r.CounterSpies}</p>
    <h3>Declared allies</h3><p>{r.diplomacy.allies?.join(', ')||'None'}. Declarations don’t share app data.</p>
    <h3>Historical order echo</h3><pre>{r.orderEcho||'No order echo in this report.'}</pre>
   </div>
  </div>
  <p className="summary-counts">{own} own report{own===1?'':'s'} · {allied} allied report{allied===1?'':'s'} in this campaign.</p>
 </section>;
}

import type {Report,MultiplierCode} from '../lib/wwbp/types';
const categories:ReadonlyArray<readonly [MultiplierCode,string]>=[['I','Industry'],['A','Army'],['N','Navy'],['F','Air Force'],['X','Anti-missiles'],['M','Missiles'],['S','Spies'],['C','Counterspies']];
const format=(value:number)=>value.toLocaleString('en-US',{maximumFractionDigits:2});
export default function Multipliers({report,previous}:{report:Report;previous:Report|null}){
 return <section className="multipliers" aria-labelledby="multipliers-title"><div className="multipliers-heading"><h2 id="multipliers-title">Multipliers</h2><p>Turn {report.turn}{previous?' · Compared with turn '+previous.turn:' · No earlier report imported'}</p></div><dl className="multiplier-grid">{categories.map(([code,label])=>{
 const current=report.multipliers[code],before=previous?.multipliers[code];
 const delta=current!=null&&before!=null?Math.round((current-before)*100)/100:null;
 const change=current==null?'Not reported':!previous?'No earlier report':before==null?'Previously unreported':delta===0?'No change':(delta!>0?'+':'')+format(delta!);
 return <div className="multiplier-item" key={code}><dt>{label} <span>({code})</span></dt><dd className="multiplier-value">{current==null?'—':format(current)}</dd><dd className="multiplier-change" data-direction={delta==null||delta===0?'neutral':delta>0?'up':'down'}>{change}{current!=null&&before!=null&&<span className="multiplier-previous">Previous: {format(before)}</span>}</dd></div>;
 })}</dl></section>;
}

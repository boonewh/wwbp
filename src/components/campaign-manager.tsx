"use client";
import {useRef,useState} from 'react';
import type {Campaign} from '../lib/wwbp/types';
import type {CampaignChange} from '../lib/campaign-management';
import {parseReport} from '../lib/wwbp/parser';
export default function CampaignManager({campaign,busy,onChange,onExport}:{campaign:Campaign;busy:boolean;onChange:(change:CampaignChange)=>Promise<void>;onExport:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [name,setName]=useState(campaign.name),[error,setError]=useState(''),[notice,setNotice]=useState(''),[removing,setRemoving]=useState<number|null>(null);
 const [working,setWorking]=useState(false);const locked=busy||working;
 async function save(change:CampaignChange){setError('');setNotice('');setWorking(true);try{await onChange(change);setRemoving(null);setNotice(change.kind==='rename'?'Campaign renamed.':change.kind==='archive'?(change.archived?'Campaign archived. All reports are preserved.':'Campaign restored to active games.'):'Report removed. You can import a replacement.');}catch(e){setError((e as Error).message);}finally{setWorking(false);}}
 return <><button type="button" disabled={busy} onClick={()=>{setName(campaign.name);setError('');setNotice('');setRemoving(null);dialog.current?.showModal();}}>Manage campaign</button>
 <dialog ref={dialog} className="manage-dialog" aria-labelledby="manage-title" onCancel={e=>{if(locked)e.preventDefault();}}>
 <div className="table-heading"><div><h2 id="manage-title">Manage campaign</h2><p>{campaign.game} · Player {campaign.player}</p></div><button type="button" disabled={locked} onClick={()=>dialog.current?.close()}>Close</button></div>
 {error&&<p role="alert" className="import-error">{error}</p>}{notice&&<p role="status" className="manage-notice">{notice}</p>}
 {removing!==null?<section className="manage-section"><h3>Remove turn {removing}?</h3><p>This removes only turn {removing} from {campaign.name}. Other turns stay saved. To recover it, import the original email or text report again.</p><div className="actions"><button type="button" onClick={onExport}>Export backup first</button><button type="button" disabled={locked} onClick={()=>setRemoving(null)}>Keep report</button><button type="button" className="primary danger" disabled={locked} onClick={()=>void save({kind:'remove-report',turn:removing})}>Remove turn {removing}</button></div></section>:<>
 <form className="manage-section" onSubmit={e=>{e.preventDefault();void save({kind:'rename',name});}}><label htmlFor="campaign-name">Campaign name</label><input id="campaign-name" name="campaign-name" required maxLength={80} value={name} disabled={locked} onChange={e=>setName(e.target.value)}/><div><button type="submit" disabled={locked||!name.trim()||name.trim()===campaign.name}>Save name</button></div></form>
 <section className="manage-section"><h3>{campaign.archived?'Archived campaign':'Finished playing?'}</h3><p>Archived games stay available in the Archived group of the campaign selector. Their reports remain saved.</p><div><button type="button" disabled={locked} onClick={()=>void save({kind:'archive',archived:!campaign.archived})}>{campaign.archived?'Restore to active games':'Archive campaign'}</button></div></section>
 <section className="manage-section"><h3>Imported reports</h3><p>Remove a mistaken import here before importing its replacement.</p><ul role="list" className="report-management">{campaign.reports.map(raw=>{const report=parseReport(raw.text,raw.filename);return <li key={report.turn}><div><strong>Turn {report.turn}</strong><p>{raw.filename}</p></div><button type="button" disabled={locked} aria-label={'Remove turn '+report.turn} onClick={()=>{setNotice('');setRemoving(report.turn);}}>Remove</button></li>;})}</ul>{!campaign.reports.length&&<p>No reports imported yet.</p>}</section>
 <div className="actions"><button type="button" onClick={onExport}>Export campaign backup</button></div></>}
 </dialog></>;
}

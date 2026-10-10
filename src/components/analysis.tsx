"use client";
import {useState} from 'react';
import type {Campaign,Geography} from '../lib/wwbp/types';
import type {BattleScenario} from '../lib/scenario-types';
import CombinedIntelligenceView from './combined-intelligence';
import BattleScenarios from './battle-scenarios';

export default function Analysis({campaign,referenceTurn,atlas,busy,onSave,onRemove,onDirty}:{campaign:Campaign;referenceTurn:number|null;atlas:Record<string,Geography>;busy:boolean;onSave:(s:BattleScenario)=>Promise<void>;onRemove:(id:string)=>Promise<void>;onDirty:(dirty:boolean)=>void}){
 const [view,setView]=useState('intelligence');
 return <><div className="analysis-navigation" aria-label="Analysis sections">{[['intelligence','Combined intelligence'],['scenarios','Attack & defense scenarios']].map(([id,label])=><button type="button" key={id} aria-pressed={view===id} onClick={()=>setView(id)}>{label}</button>)}</div><div hidden={view!=='intelligence'}><CombinedIntelligenceView campaign={campaign} referenceTurn={referenceTurn} atlas={atlas}/></div><div hidden={view!=='scenarios'}><BattleScenarios campaign={campaign} referenceTurn={referenceTurn} atlas={atlas} busy={busy} onSave={onSave} onRemove={onRemove} onDirty={onDirty}/></div></>;
}

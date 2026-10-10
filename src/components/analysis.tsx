"use client";
import {useEffect,useState} from 'react';
import type {Campaign,Geography} from '../lib/wwbp/types';
import type {BattleScenario} from '../lib/scenario-types';
import type {TurnPlan} from '../lib/turn-plan-types';
import CombinedIntelligenceView from './combined-intelligence';
import BattleScenarios from './battle-scenarios';
import CoordinatedOrders from './coordinated-orders';

export default function Analysis({campaign,referenceTurn,atlas,busy,onSave,onRemove,onSavePlan,onRemovePlan,onDirty}:{campaign:Campaign;referenceTurn:number|null;atlas:Record<string,Geography>;busy:boolean;onSave:(s:BattleScenario)=>Promise<void>;onRemove:(id:string)=>Promise<void>;onSavePlan:(p:TurnPlan)=>Promise<void>;onRemovePlan:(id:string)=>Promise<void>;onDirty:(dirty:boolean)=>void}){
 const [view,setView]=useState('intelligence');
 const [scenarioDirty,setScenarioDirty]=useState(false),[planDirty,setPlanDirty]=useState(false);
 useEffect(()=>{onDirty(scenarioDirty||planDirty);return()=>onDirty(false);},[scenarioDirty,planDirty,onDirty]);
 return <><div className="analysis-navigation" aria-label="Analysis sections">{[['intelligence','Combined intelligence'],['scenarios','Attack & defense scenarios'],['orders','Coordinated orders']].map(([id,label])=><button type="button" key={id} aria-pressed={view===id} onClick={()=>setView(id)}>{label}</button>)}</div><div hidden={view!=='intelligence'}><CombinedIntelligenceView campaign={campaign} referenceTurn={referenceTurn} atlas={atlas}/></div><div hidden={view!=='scenarios'}><BattleScenarios campaign={campaign} referenceTurn={referenceTurn} atlas={atlas} busy={busy} onSave={onSave} onRemove={onRemove} onDirty={setScenarioDirty}/></div><div hidden={view!=='orders'}><CoordinatedOrders campaign={campaign} referenceTurn={referenceTurn} atlas={atlas} busy={busy} onSave={onSavePlan} onRemove={onRemovePlan} onDirty={setPlanDirty}/></div></>;
}

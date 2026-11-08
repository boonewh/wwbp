"use client";
import {useEffect,useState} from 'react';
import type {Campaign,Geography} from '../lib/wwbp/types';
import type {BattleScenario} from '../lib/scenario-types';
import type {TurnPlan} from '../lib/turn-plan-types';
import CombinedIntelligenceView from './combined-intelligence';
import BattleScenarios from './battle-scenarios';
import CoordinatedOrders from './coordinated-orders';

export type AnalysisSection="intelligence"|"scenarios"|"orders";
export default function Analysis({section,campaign,referenceTurn,atlas,busy,onSave,onRemove,onSavePlan,onRemovePlan,onDirty}:{section:AnalysisSection;campaign:Campaign;referenceTurn:number|null;atlas:Record<string,Geography>;busy:boolean;onSave:(s:BattleScenario)=>Promise<void>;onRemove:(id:string)=>Promise<void>;onSavePlan:(p:TurnPlan)=>Promise<void>;onRemovePlan:(id:string)=>Promise<void>;onDirty:(dirty:boolean)=>void}){
 const [scenarioDirty,setScenarioDirty]=useState(false),[planDirty,setPlanDirty]=useState(false);
 useEffect(()=>{onDirty(scenarioDirty||planDirty);return()=>onDirty(false);},[scenarioDirty,planDirty,onDirty]);
 return <><div hidden={section!=='intelligence'}><CombinedIntelligenceView campaign={campaign} referenceTurn={referenceTurn} atlas={atlas}/></div><div hidden={section!=='scenarios'}><BattleScenarios campaign={campaign} referenceTurn={referenceTurn} atlas={atlas} busy={busy} onSave={onSave} onRemove={onRemove} onDirty={setScenarioDirty}/></div><div hidden={section!=='orders'}><CoordinatedOrders campaign={campaign} referenceTurn={referenceTurn} atlas={atlas} busy={busy} onSave={onSavePlan} onRemove={onRemovePlan} onDirty={setPlanDirty}/></div></>;
}

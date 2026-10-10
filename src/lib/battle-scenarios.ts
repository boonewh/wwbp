import {combineIntelligence,resolveGroup,type ResolvedGroup} from './combined-intelligence';
import {roles,defenseFields,MODEL_VERSION,type BattleScenario,type BattleRole,type Commitment} from './scenario-types';
import {validateScenarios} from './scenario-storage';
import type {Geography,Report} from './wwbp/types';

export type BattleForce={id:string;code:string;player:number;kind:'occupied'|'minor'|'sea';role:BattleRole;quantity:number;hypothetical:boolean};
export type Stage={name:string;detail:string};
export type BattleEstimate={rate:number;stages:Stage[];attackArmy:number;defenseArmy:number;attackAir:number;defenseAir:number;attackNavy:number;defenseNavy:number;conquer:number;conquerMin:number;conquerMax:number;capture:'estimated'|'uncertain'|'none';outcome:string;survivors:{force:BattleForce;remaining:number}[]};
export const displayNumber=(n:number)=>n.toLocaleString('en-US',{maximumFractionDigits:2});
export function scenarioRows(s:BattleScenario,reports:Report[],game:string){
 const snapshot=combineIntelligence(reports.filter(r=>!s.excludedPlayers.includes(r.player)),game,s.baseTurn);
 return snapshot.groups.map(g=>resolveGroup(g,s.baseTurn,s.choices[g.id]));
}
export function forceOrigin(c:Commitment,rows:ResolvedGroup[]){
 const row=rows.find(r=>r.group.id===c.groupId);
 return c.hypothetical?{...c.hypothetical,row:undefined}:row?.holder?.player!=null?{code:row.group.code,player:row.holder.player,kind:row.holder.kind,row}:null;
}
/** Same atlas surface/air/canal semantics as the order checker, for one land engagement. */
export function roleProblem(code:string,kind:string,role:BattleRole,target:string,atlas:Record<string,Geography>):string|null{
 const from=atlas[code];
 if(!from||!atlas[target]||target.startsWith('W'))return 'Choose known sources and a land target.';
 if(code===target)return 'Local defenders belong in the target defense, not an outgoing commitment.';
 if(role==='conquer'&&kind==='minor')return 'Minor armies cannot conquer (4C.1).';
 const field=roles[role].field;
 if(field==='Missiles')return code.startsWith('W')?'Missiles cannot originate at sea (4F).':null;
 if(field==='Navy'&&!code.startsWith('W'))return 'Navy attacking or supporting a country must start at sea (4D).';
 const surface=from.surface.includes(target),canal=from.canals.some(c=>c.target===target);
 if(field==='AirF')return surface||from.air.includes(target)||canal?null:'Target is outside air range (4E.1).';
 if(surface)return null;
 if(canal)return 'This route needs canal permission; conditional surface routes are outside this scenario model.';
 return 'Target is outside surface range.';
}

export function analyzeBattle(s:BattleScenario,reports:Report[],game:string,atlas:Record<string,Geography>,currentKey:string){
 const errors:string[]=[],warnings:string[]=[];
 const fail=(message:string)=>{if(!errors.includes(message))errors.push(message);};
 try{validateScenarios([s]);}catch(e){return {errors:[(e as Error).message],warnings,rows:[] as ResolvedGroup[],estimates:[] as BattleEstimate[]};}
 let rows:ResolvedGroup[]=[];
 try{rows=scenarioRows(s,reports,game);}catch(e){fail((e as Error).message);}
 if(!currentKey||s.evidenceKey!==currentKey)fail('Intelligence has changed or has not been reviewed. Use current intelligence and review the assumptions.');
 if(s.modelVersion!==MODEL_VERSION)fail('This scenario uses an older calculation model. Use current intelligence to review it with the current model.');
 if(!atlas[s.target]||s.target.startsWith('W'))fail('Select a known land target.');
 if(!s.assumptions.precombat)fail('Review movement, builds, recovery, and standing orders before confirming the pre-combat defense.');
 if(!s.assumptions.isolated)fail('Confirm the isolated engagement assumptions; connected battles and diplomatic combat penalties are not modeled.');
 const target=rows.find(r=>r.group.id===s.target);
 const holder=s.targetHolder||(!target?.historical?target?.holder:null);
 if(!holder)fail('Target ownership is unknown or historical. Enter an explicit hypothetical owner/controller.');
 const unusable=(row:ResolvedGroup|undefined)=>!row||row.historical||!!row.conflicts.length&&!row.chosen;
 if(target?.conflicts.length&&!target.chosen)fail(`${s.target}: resolve the conflicting reports by choosing a source.`);
 const forces:BattleForce[]=[],spent=new Map<string,number>();
 const originTypes=new Map<string,Set<boolean>>();
 for(const c of s.commitments){
  const origin=forceOrigin(c,rows);
  if(!origin){fail(`${c.groupId}: source ownership is unknown or the report is missing.`);continue;}
  const prefix=`${origin.code} · P${origin.player} · ${roles[c.role].label}`;
  const problem=roleProblem(origin.code,origin.kind,c.role,s.target,atlas);if(problem)fail(`${prefix}: ${problem}`);
  if(!c.hypothetical&&unusable(origin.row))fail(`${prefix}: use current, resolved intelligence.`);
  if(roles[c.role].side==='attack'&&holder?.kind==='occupied'&&holder.player===origin.player)fail(`${prefix}: a player cannot attack their own occupied country (12A).`);
  const key=`${origin.code}:${origin.player}:${roles[c.role].field}`;
  spent.set(key,(spent.get(key)||0)+c.quantity);
  const types=originTypes.get(key)||new Set<boolean>();types.add(!!c.hypothetical);originTypes.set(key,types);
  if(!c.hypothetical){
   const available=origin.row?.values[roles[c.role].field];
   if(available===undefined)fail(`${prefix}: available forces are unknown; use a labeled hypothetical source instead.`);
   else if(spent.get(key)!>Math.floor(available))fail(`${prefix}: committed ${spent.get(key)} but only ${Math.floor(available)} whole units are available.`);
  }
  forces.push({id:c.id,code:origin.code,player:origin.player,kind:origin.kind,role:c.role,quantity:c.quantity,hypothetical:!!c.hypothetical});
 }
 for(const [key,types] of originTypes)if(types.size>1)fail(`${key}: do not mix reported and hypothetical quantities for the same source resource.`);
 const attackers=new Set(forces.filter(f=>roles[f.role].side==='attack').map(f=>f.player));
 const defenders=new Set(forces.filter(f=>roles[f.role].side==='defense').map(f=>f.player));
 // A controller may attack their own minor (12A); control is not occupation.
 if(holder?.player!=null&&holder.kind==='occupied')defenders.add(holder.player);
 if(!attackers.size)fail('Add a specified attacking force.');
 for(const p of attackers)if(defenders.has(p))fail(`Player ${p} has forces on both sides. Conflicting attack/support orders are not supported.`);
 const included=reports.filter(r=>r.turn===s.baseTurn&&!s.excludedPlayers.includes(r.player));
 for(const r of included){
  if(attackers.has(r.player)&&(r.diplomacy.enemies||[]).some(p=>attackers.has(p)))fail(`Player ${r.player} declares another attacker an enemy. Fighting between attackers is outside this model.`);
  if(defenders.has(r.player)&&(r.diplomacy.allies||[]).some(p=>attackers.has(p)))fail(`Player ${r.player} declares an attacker an ally. The resulting combat disadvantage is not modeled.`);
  if(attackers.has(r.player)&&(r.diplomacy.incoming||[]).some(p=>defenders.has(p)))fail(`A defender declares Player ${r.player} an ally. The resulting combat disadvantage is not modeled.`);
 }
 const coastal=forces.some(f=>f.kind==='sea'&&['conquer','bombard'].includes(f.role))||forces.some(f=>f.role==='navyAttack');
 const missiles=forces.some(f=>f.role==='missileArmy');
 const defense={Army:0,AirF:0,Navy:0,ABMs:0};
 for(const field of defenseFields){
  const assumed=s.defense[field],observed=unusable(target)?undefined:target?.values[field];
  const needed=field==='Army'||field==='AirF'||field==='Navy'&&coastal||field==='ABMs'&&missiles;
  if(needed&&assumed===undefined&&observed===undefined)fail(`${s.target}: ${field} is unknown or historical. Enter an explicit pre-combat assumption.`);
  if(!needed&&assumed===undefined&&observed===undefined)warnings.push(`${s.target}: ${field} is unknown and does not affect the selected attack. Its inactive phase displays zero; this is not evidence that none exist.`);
  defense[field]=assumed??Math.floor(observed??0);
 }
 if(s.defense.AirF===undefined&&(target?.suppressed.AirF??0)>0)fail('The target has suppressed air force. Enter its pre-combat AirF, including recovery (5F.4), as an explicit assumption.');
 if(s.targetHolder||Object.keys(s.defense).length||forces.some(f=>f.hypothetical))warnings.push('Hypothetical values are included. They are assumptions, not observed forces.');
 if(forces.some(f=>f.kind==='minor'&&roles[f.role].side==='attack')||holder?.kind==='minor'&&holder.player!=null&&attackers.has(holder.player))warnings.push('Minor forces may bombard but cannot conquer; attacking a controlled minor can also change popularity.');
 if(forces.some(f=>f.kind==='sea'))warnings.push('Sea-source forces are included only in this land engagement. Subsequent sea combat and safe return are not estimated.');
 warnings.push('Estimates use fractional expected losses and proportional loss allocation. Actual losses and which conquering group survives are randomized. Sensitivity cases are not probabilities or outcome bounds.');
 warnings.push('Target values are the defense after movement, new builds, and air recovery, before support and combat. No proposed ORDERS, standing orders, or build orders have been simulated.');
 return {errors,warnings,rows,estimates:errors.length?[]:[0.25,0.5,0.75].map(rate=>estimateBattle(forces,defense,rate))};
}

/** Rulebook 4C.6 and sequence 9, with explicit approximations for randomized phases. */
export function estimateBattle(forces:BattleForce[],defense:{Army:number;AirF:number;Navy:number;ABMs:number},rate=0.5):BattleEstimate{
 const groups=forces.map(force=>({force,remaining:force.quantity}));
 const sum=(...rs:BattleRole[])=>groups.filter(g=>rs.includes(g.force.role)).reduce((n,g)=>n+g.remaining,0);
 const lose=(amount:number,rs:BattleRole[],seaOnly=false)=>{
  const selected=groups.filter(g=>rs.includes(g.force.role)&&(!seaOnly||g.force.kind==='sea'));
  const total=selected.reduce((n,g)=>n+g.remaining,0),loss=Math.min(total,Math.max(0,amount));
  if(total)selected.forEach(g=>g.remaining=Math.max(0,g.remaining*(1-loss/total)));return loss;
 };
 const stages:Stage[]=[];
 const f=displayNumber;
 let da=defense.Army+sum('armySupport'),df=defense.AirF+sum('airSupport'),dn=defense.Navy+sum('navySupport');
 const initial={Army:da,AirF:df,Navy:dn};
 stages.push({name:'Defense assembled · 9.1–3b',detail:`${f(da)} army, ${f(df)} air force, ${f(dn)} navy and ${f(defense.ABMs)} ABMs, including selected support. Local movement/build/recovery values are supplied assumptions.`});
 const launched=sum('missileArmy'),intercepted=Math.min(launched,defense.ABMs),missileHits=Math.min(da,(launched-intercepted)*10);
 da-=missileHits;
 stages.push({name:'Missiles · 9.3c–d / 4F–G',detail:`${f(launched)} launched; ${f(intercepted)} intercepted one-for-one; ${f(launched-intercepted)} reach army and destroy ${f(missileHits)}. ${f(defense.ABMs-intercepted)} ABMs remain.`});
 lose(launched,['missileArmy']);
 const af=sum('airArmy'),excess=af-df,airLoss=Math.min(af,df)*rate/2;
 lose(airLoss,['airArmy']);df=Math.max(0,df-airLoss);
 stages.push({name:'Air combat · 9.3e',detail:`${f(af)} attacking vs ${f(initial.AirF)} defending air. Approximate combined losses ${f(airLoss*2)}, split equally: ${f(airLoss)} per side.`});
 let excessDetail='No excess air force; no ground hits.';
 if(excess>0){const loss=Math.min(da,excess*rate);da-=loss;excessDetail=`${f(excess)} excess attacking air causes about ${f(loss)} defending army losses.`;}
 if(excess<0){let hits=-excess*rate;const army=lose(hits,['conquer','bombard']);hits-=army;const navy=lose(hits,['navyAttack']);hits-=navy;const air=lose(hits,['airArmy']);excessDetail=`Excess defending air causes about ${f(army)} attacking army, ${f(navy)} navy, and ${f(air)} air losses, in that priority.`;}
 stages.push({name:'Excess air · 9.3f',detail:excessDetail});
 const an=sum('navyAttack'),navalAttackLoss=an>0?Math.min(an,dn*rate):0,navalDefenseLoss=Math.min(dn,an*rate);
 lose(navalAttackLoss,['navyAttack']);dn-=navalDefenseLoss;
 stages.push({name:'Naval exchange · 9.3g',detail:`${f(an)} attacking navy exchanges fire with ${f(dn+navalDefenseLoss)} defenders: about ${f(navalAttackLoss)} attacking and ${f(navalDefenseLoss)} defending navy lost.`});
 const coastLoss=lose(dn*rate,['conquer','bombard'],true);
 stages.push({name:'Coastal defense · 9.3h',detail:`${f(dn)} remaining defending navy causes about ${f(coastLoss)} army losses to sea landings. Armies arriving from land are unaffected.`});
 const aa=sum('conquer','bombard'),beforeArmy=da;
 let attackerLoss=0,defenderLoss=0,tie=false;
 if(aa>da){attackerLoss=da*da/aa;lose(attackerLoss,['conquer','bombard']);defenderLoss=da;da=0;}
 else if(aa>0&&aa===da){tie=true;attackerLoss=aa;lose(aa,['conquer','bombard']);defenderLoss=Math.max(0,da-0.5);da=0.5;}
 else if(aa>0&&da>aa){attackerLoss=aa;lose(aa,['conquer','bombard']);defenderLoss=aa*aa/da;da-=defenderLoss;}
 stages.push({name:'Army combat · 4C.6',detail:`${f(aa)} attacking vs ${f(beforeArmy)} defending army. ${tie?'Equal forces: defender wins with zero or one army (0.5 displayed as a midpoint).':`Smaller force is destroyed; winner loses loser² ÷ winner. Attacking losses ${f(attackerLoss)}; defending losses ${f(defenderLoss)}.`}`});
 const conquer=sum('conquer'),initialConquer=forces.filter(g=>g.role==='conquer').reduce((n,g)=>n+g.quantity,0);
 const totalInitialArmy=forces.filter(g=>['conquer','bombard'].includes(g.role)).reduce((n,g)=>n+g.quantity,0);
 const attackArmy=sum('conquer','bombard'),totalArmyLoss=totalInitialArmy-attackArmy;
 const conquerMin=Math.max(0,initialConquer-totalArmyLoss),conquerMax=Math.min(initialConquer,attackArmy);
 const capture=da>0||tie||conquerMax<1?'none':conquerMin<1?'uncertain':'estimated';
 const outcome=da>0||tie?'Target holds in this estimate':conquerMax<1?'Defenders eliminated; no eligible conquering army remains':capture==='uncertain'?'Capture depends on which conquering armies survive':'Capture estimated';
 stages.push({name:'Capture · 9.3k / 4C.1',detail:`${outcome}. Estimated conquering survivors ${f(conquer)}; allocation range ${f(conquerMin)}–${f(conquerMax)} at these total losses. Only surviving conquer orders can occupy; bombard/support survivors return. Multiple conquering players do not establish which player captures.`});
 for(const g of groups){const field=roles[g.force.role].field;if(roles[g.force.role].side==='defense')g.remaining=g.force.quantity*(initial[field as keyof typeof initial]?({Army:da,AirF:df,Navy:dn}[field as keyof typeof initial]/initial[field as keyof typeof initial]):0);}
 // Support is part of the defender pool; its losses are allocated proportionally, not added again.
 return {rate,stages,attackArmy,defenseArmy:da,attackAir:sum('airArmy'),defenseAir:df,attackNavy:sum('navyAttack'),defenseNavy:dn,conquer,conquerMin,conquerMax,capture,outcome,survivors:groups};
}

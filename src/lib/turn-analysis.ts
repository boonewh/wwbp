import {checkOrders,type CheckedOrder} from './order-checker';
import {combineIntelligence,resolveGroup,type ResolvedGroup} from './combined-intelligence';
import {analyzeBattle,type BattleEstimate} from './battle-scenarios';
import {MODEL_VERSION,roles,defenseFields,type BattleRole,type BattleScenario} from './scenario-types';
import {TURN_MODEL_VERSION,type TurnPlan,type ProposedOrders} from './turn-plan-types';
import {validateTurnPlans} from './turn-plan-storage';
import type {Field,Geography,Report} from './wwbp/types';

export const orderRoles:Record<string,BattleRole>={AC:'conquer',AB:'bombard',FA:'airArmy',NN:'navyAttack',MA:'missileArmy',AS:'armySupport',FS:'airSupport',NS:'navySupport'};
const resources:Record<string,Field>={A:'Army',N:'Navy',F:'AirF',M:'Missiles',X:'ABMs',I:'Industry'};
const movements=new Set(['AT','NT','FT','MT','XT']);
const attacks=new Set(['AC','AB','FA','FN','FF','FI','NN','MA','MF','MI']);
export type OrderRef=CheckedOrder&{id:string;player:number;phase:string};
export type Finding={kind:'error'|'coordination'|'incomplete'|'estimate'|'assumption';message:string;refs:OrderRef[];target?:string;player?:number};
export type TurnBattle={target:string;refs:OrderRef[];errors:string[];warnings:string[];estimates:BattleEstimate[];defense:Record<'Army'|'AirF'|'Navy'|'ABMs',number>;phases:string[];conditional:boolean};
export type CheckedPlayer={set:ProposedOrders;report?:Report;check?:ReturnType<typeof checkOrders>};
export type TurnAnalysis={findings:Finding[];players:CheckedPlayer[];orders:OrderRef[];rows:ResolvedGroup[];battles:TurnBattle[];exposures:{code:string;player:number;refs:OrderRef[];defense:TurnBattle['defense'];errors:string[];phases:string[]}[]};
const phase=(r:CheckedOrder)=>r.standing?'Standing order':movements.has(r.action||'')?'1 · Movement':r.action?.startsWith('B')?'2 · Builds':r.source?'3 · Combat / support':'Player instruction';
const usable=(r:ResolvedGroup|undefined)=>r&&!r.historical&&(!r.conflicts.length||r.chosen);

/** Build the local pre-combat garrison, never making new units available for outgoing orders. */
export function precombatDefense(code:string,rows:ResolvedGroup[],orders:OrderRef[],players:CheckedPlayer[],atlas:Record<string,Geography>){
 const row=rows.find(r=>r.group.id===code),errors:string[]=[],phases:string[]=[];
 const defense={Army:0,AirF:0,Navy:0,ABMs:0};
 const owner=row?.holder?.player,participant=players.find(p=>p.set.player===owner);
 if(!usable(row)){errors.push(`${code}: current, resolved intelligence is required.`);return {defense,errors,phases};}
 for(const f of defenseFields){if(row!.values[f]===undefined)errors.push(`${code}: ${f} is unknown.`);else defense[f]=row!.values[f]!;}
 const departures=orders.filter(o=>!o.standing&&o.source===code&&o.player===owner&&o.target&&(movements.has(o.action||'')||orderRoles[o.action||'']||attacks.has(o.action||'')));
 for(const o of departures){const field=resources[o.action![0]];if(field in defense){defense[field as keyof typeof defense]-=o.quantity||0;phases.push(`P${o.player} line ${o.line}: ${o.quantity} ${field} leave ${code} (${o.token}).`);}}
 for(const o of orders.filter(o=>!o.standing&&o.target===code&&movements.has(o.action||''))){const field=resources[o.action![0]];if(field in defense){defense[field as keyof typeof defense]+=o.quantity||0;phases.push(`P${o.player} line ${o.line}: ${o.quantity} ${field} arrive before combat (${o.token}).`);}}
 const suppression=row!.suppressed.AirF;
 if(suppression===undefined)errors.push(`${code}: suppressed AirF is unknown; recovery cannot be calculated.`);
 else if(suppression>0){const recovery=Math.min(suppression,Math.ceil(suppression/4));defense.AirF+=recovery;phases.push(`${recovery} AirF recover from ${suppression} suppressed (5F.4).`);}
 if(!participant?.report){errors.push(`${code}: the owner/controller's proposed orders and base report are missing. Supply an explicit pre-combat defense assumption.`);return {defense,errors,phases};}
 const report=participant.report;
 if(!report.own[code])errors.push(`${code}: not in Player ${owner}'s command table.`);
 if(!participant.set.standingReviewed)errors.push(`Player ${owner}: review active standing orders before calculating ${code}.`);
 const industry=row!.values.Industry;
 if(industry===undefined)errors.push(`${code}: available Industry is unknown.`);
 if((row!.suppressed.Industry??0)>0)errors.push(`${code}: suppressed Industry recovery and build availability require the broader operations model.`);
 let remaining=Math.floor(industry??0);
 const local=orders.filter(o=>o.player===owner&&o.source===code&&!o.standing&&/^B[IANFMX]$/.test(o.action||''));
 const explicit=new Set(local.map(o=>o.action!.slice(1)));
 const builds:Record<string,number>={};
 for(const o of local){builds[o.action!.slice(1)]=(builds[o.action!.slice(1)]||0)+(o.quantity||0);remaining-=o.quantity||0;phases.push(`P${o.player} line ${o.line}: ${o.quantity} Industry allocated by ${o.token}.`);}
 if(remaining<0)errors.push(`${code}: explicit builds exceed available Industry.`);
 // A missing Defaults header means standard defaults (4B); malformed specified defaults are not guessed.
 const defaultText=report.defaults||'';
 const defaults:Record<string,number>={};
 for(const m of defaultText.matchAll(/B?([IANFMXD])(\d+)/g))defaults[m[1]]=+m[2];
 if(defaultText.replace(/B?[IANFMXD]\d+/g,'').replace(/[\s,]/g,''))errors.push(`Player ${owner}: unrecognized default build proportions.`);
 for(const o of orders.filter(o=>o.player===owner&&!o.source&&/^B[IANFMXD]$/.test(o.action||'')))defaults[o.action!.slice(1)]=o.quantity||0;
 const eligible='IANFMXD'.split('').filter(unit=>!explicit.has(unit)&&!(unit==='N'&&!atlas[code]?.surface.some(c=>c.startsWith('W')))&&!(unit==='D'&&row!.holder?.kind==='minor'));
 let weight=eligible.reduce((n,k)=>n+(defaults[k]||0),0);
 for(const unit of eligible){const proportion=defaults[unit]||0;if(remaining<=0||proportion<=0||weight<=0)continue;const amount=Math.min(remaining,Math.round(remaining*proportion/weight));builds[unit]=(builds[unit]||0)+amount;remaining-=amount;weight-=proportion;}
 if(remaining>0){const unit=row!.holder?.kind==='minor'?'A':'D';builds[unit]=(builds[unit]||0)+remaining;}
 for(const [unit,amount] of Object.entries(builds)){
  if(!amount)continue;
  const field=resources[unit];
  if(!field||!(field in defense)){phases.push(`${amount} Industry build ${unit==='D'?'Dollars':field}; no extra local combat defense.`);continue;}
  const multiplier=report.multipliers[unit as keyof Report['multipliers']];
  if(multiplier===undefined){errors.push(`Player ${owner}: ${unit} multiplier is missing for ${code}'s builds.`);continue;}
  if(orders.some(o=>o.player===owner&&o.action===`R${unit}`))errors.push(`${code}: research may change the ${unit} build multiplier this cycle; not modeled.`);
  const built=amount*multiplier/100;defense[field as keyof typeof defense]+=built;
  phases.push(`${amount} Industry × ${multiplier}% produce ${built} ${field}, available only for local defense (4B).`);
 }
 for(const f of defenseFields)defense[f]=Math.max(0,Math.floor(defense[f]+1e-9));
 return {defense,errors,phases};
}

export function analyzeTurnPlan(plan:TurnPlan,reports:Report[],game:string,atlas:Record<string,Geography>,currentKey:string):TurnAnalysis{
 const result:TurnAnalysis={findings:[],players:[],orders:[],rows:[],battles:[],exposures:[]};
 const add=(kind:Finding['kind'],message:string,refs:OrderRef[]=[],target?:string,player?:number)=>result.findings.push({kind,message,refs,target,player});
 try{validateTurnPlans([plan]);}catch(e){add('error',(e as Error).message);return result;}
 const global:string[]=[];
 if(!currentKey||plan.evidenceKey!==currentKey)global.push('Intelligence revisions have changed or have not been reviewed. Use current intelligence and review the plan.');
 if(plan.modelVersion!==TURN_MODEL_VERSION)global.push('This plan uses an older model. Use current intelligence to review it.');
 try{result.rows=combineIntelligence(reports,game,plan.baseTurn).groups.map(g=>resolveGroup(g,plan.baseTurn,plan.choices[g.id]));}catch(e){global.push((e as Error).message);}
 for(const set of plan.sets){
  const report=reports.find(r=>r.game===game&&r.player===set.player&&r.turn===set.reportTurn);
  const player:CheckedPlayer={set,report};result.players.push(player);
  if(set.reportTurn!==plan.baseTurn){global.push(`Player ${set.player}: report turn ${set.reportTurn} does not match base turn ${plan.baseTurn}.`);continue;}
  if(!report){global.push(`Player ${set.player}: the associated base report is missing.`);continue;}
  if(!set.text.trim()){global.push(`Player ${set.player}: enter proposed orders, or ORDERS / END on separate lines to explicitly propose no new orders.`);continue;}
  player.check=checkOrders(set.text,report,atlas);
  const refs=player.check.rows.map((o,i)=>({...o,id:`p${set.player}-o${i}`,player:set.player,phase:phase(o)}));result.orders.push(...refs);
  for(const issue of player.check.issues){add(issue.level==='error'?'error':'coordination',`Player ${set.player}: ${issue.message}`,[],undefined,set.player);if(issue.level==='error')global.push(`Player ${set.player}: fix order-block errors before estimating the coordinated plan.`);}
  for(const o of refs)for(const issue of o.issues){add(issue.level==='error'?'error':'coordination',issue.message,[o],o.target&&atlas[o.target]?o.target:undefined,set.player);if(issue.level==='error')global.push(`Player ${set.player}: fix invalid orders before estimating the coordinated plan.`);else if(issue.message.startsWith('Repeated or conflicting'))global.push(`Player ${set.player}: resolve repeated or conflicting player instructions before estimating.`);}
  if(!set.standingReviewed)global.push(`Player ${set.player}: review the base report's standing orders. Historical order echoes are never used as proposals.`);
 }
 for(const message of new Set(global))add('incomplete',message,[],undefined,message.match(/^Player (\d+):/) ? Number(message.match(/^Player (\d+):/)![1]) : undefined);
 const orders=result.orders;
 const affected=new Map<string,string[]>();
 function block(code:string|null|undefined,message:string,refs:OrderRef[]=[]){if(!code||!atlas[code])return;const list=affected.get(code)||[];if(!list.includes(message))list.push(message);affected.set(code,list);add('incomplete',message,refs,code);}
 for(const p of result.players){
  if(!p.report)continue;
  // Only current location records are examined; the historical ORDERS echo is excluded.
  for(const code of Object.keys(p.report.own)){
   const slots=new Map<string,string>();
   for(const m of (p.report.spaces[code]?.raw||'').matchAll(/\/([1-5])\/([^\s]*)/g))if(m[2])slots.set(m[1],m[2]);
   for(const o of orders.filter(o=>o.player===p.set.player&&o.source===code&&o.standing)){const command=o.token.replace(/^\/[1-5]\//,'');if(command)slots.set(String(o.standing),command);else slots.delete(String(o.standing));}
   if(slots.size){const refs=orders.filter(o=>o.player===p.set.player&&o.source===code);const message=`${code} · P${p.set.player}: active standing orders need priority, trimming, and legality resolution. This interaction is not modeled.`;block(code,message,refs);for(const o of refs)block(o.target,message,refs);for(const command of slots.values())block(command.match(/([A-Z]{3})$/)?.[1],message,refs);}
  }
 }
 for(const o of orders){
  if(o.standing||!o.action)continue;
  if(o.source&&o.target&&(!orderRoles[o.action]&&!movements.has(o.action)||o.target.startsWith('W')&&!movements.has(o.action))){block(o.target,`${o.token}: this combat role or sea engagement requires the broader operations model.`,[o]);block(o.source,`${o.token}: returning forces and connected combat are not modeled.`,[o]);}
  if(o.issues.some(i=>i.message.startsWith('Canal '))){block(o.target,`${o.token}: conditional canal access has not been verified.`,[o]);block(o.source,`${o.token}: departure depends on canal access.`,[o]);}
  if(!o.source&&o.action==='P')for(const row of result.rows.filter(r=>r.holder?.kind==='minor'&&(o.target==='0'||o.target===r.group.code||!atlas[o.target||''])))block(row.group.code,`${o.token}: propaganda may change minor control; the political phase is not modeled.`,[o]);
 }
 for(const expected of plan.expected){
  const matching=orders.filter(o=>!o.standing&&o.player===expected.player&&o.source===expected.source&&o.target===expected.target&&orderRoles[o.action||'']===expected.role&&!o.issues.some(i=>i.level==='error'));
  const actual=matching.reduce((n,o)=>n+(o.quantity||0),0);
  if(actual<expected.quantity){const related=orders.filter(o=>o.player===expected.player&&o.source===expected.source);add('coordination',`Expected P${expected.player} to send ${expected.quantity} ${roles[expected.role].field} from ${expected.source} to ${expected.target} as “${roles[expected.role].label}”; only ${actual} valid units match. Check missing orders, quantity, destination, or combat role.`,related,expected.target,expected.player);}
 }
 const targetCodes=[...new Set([...orders.filter(o=>!o.standing&&o.target&&atlas[o.target]&&!o.target.startsWith('W')&&(orderRoles[o.action||'']||attacks.has(o.action||''))).map(o=>o.target!),...plan.threats.map(t=>t.target)])].sort();
 // Any outgoing combat from a simultaneously attacked home creates a return/counterattack dependency.
 const attacked=new Set([...orders.filter(o=>!o.standing&&attacks.has(o.action||'')).map(o=>o.target!),...plan.threats.map(t=>t.target)]);
 for(const o of orders.filter(o=>!o.standing&&o.source&&attacked.has(o.source)&&o.target&&orderRoles[o.action||''])){
  const message=`${o.source} ↔ ${o.target}: outgoing combat from an attacked source can involve border fighting, returns, or counterattacks. Connected results are incomplete.`;block(o.source,message,[o]);block(o.target,message,[o]);
 }
 for(const t of plan.threats){
  if(plan.sets.some(s=>s.player===t.player))block(t.target,`P${t.player}: use either proposed orders or specified threats, not both for the same player.`);
  if(attacked.has(t.source)){block(t.target,`${t.source}: a specified threat leaves an attacked home; connected battles are not modeled.`);block(t.source,`${t.source}: a specified threat may return and counterattack.`);}
 }
 // Apply submitted diplomacy to report copies. A later explicit declaration replaces the prior relation.
 const diplomatic=reports.map(r=>({...r,diplomacy:Object.fromEntries(Object.entries(r.diplomacy).map(([k,v])=>[k,[...v]]))}));
 for(const o of orders.filter(o=>!o.source&&['A','N','E'].includes(o.action||'')&&o.target)){
  for(const r of diplomatic.filter(r=>r.turn===plan.baseTurn)){
   if(r.player===o.player){r.diplomacy.allies=(r.diplomacy.allies||[]).filter(p=>p!==+o.target!);r.diplomacy.enemies=(r.diplomacy.enemies||[]).filter(p=>p!==+o.target!);if(o.action==='A')r.diplomacy.allies.push(+o.target!);if(o.action==='E')r.diplomacy.enemies.push(+o.target!);}
   if(r.player===+o.target!){r.diplomacy.incoming=(r.diplomacy.incoming||[]).filter(p=>p!==o.player);if(o.action==='A')r.diplomacy.incoming.push(o.player);}
  }
 }
 for(const target of targetCodes){
  const refs=orders.filter(o=>!o.standing&&o.target===target&&orderRoles[o.action||'']);
  const review=plan.reviews[target],targetRow=result.rows.find(r=>r.group.id===target);
  const targetPlayer=targetRow?.holder?.player,hasOrders=plan.sets.some(s=>s.player===targetPlayer);
  const modeled=precombatDefense(target,result.rows,orders,result.players,atlas);
  const errors=[...new Set(global)],warnings:string[]=[];
  let defense=modeled.defense;
  if(!hasOrders){
   if(!review?.unknownOrders||!review.note.trim()||defenseFields.some(f=>review.defense[f]===undefined))errors.push(`${target}: opposing orders are unknown. Specify all four pre-combat defense values and explain the assumed enemy behavior.`);
   else {defense={Army:review.defense.Army!,AirF:review.defense.AirF!,Navy:review.defense.Navy!,ABMs:review.defense.ABMs!};warnings.push(`Opposing orders are unknown. Assumed pre-combat garrison: ${review.note}`);}
  }else{
   errors.push(...modeled.errors);
   if(review&&Object.keys(review.defense).length)warnings.push('Manual defense values are ignored because this defender has proposed orders; the garrison is calculated from those orders.');
  }
  if(!review?.isolated)errors.push(`${target}: review the assumption that no omitted orders, combat, or diplomacy change this isolated engagement.`);
  if(!usable(targetRow)||!targetRow?.holder)errors.push(`${target}: resolve current ownership and intelligence before estimating.`);
  for(const code of new Set([target,...refs.map(o=>o.source!),...plan.threats.filter(t=>t.target===target).map(t=>t.source)]))errors.push(...(affected.get(code)||[]));
  const commitments:BattleScenario['commitments']=refs.map(o=>({id:o.id,groupId:o.source!.startsWith('W')?`${o.source}:P${o.player}`:o.source!,role:orderRoles[o.action!],quantity:o.quantity!}));
  for(const o of refs){const group=result.rows.find(r=>r.group.id===(o.source!.startsWith('W')?`${o.source}:P${o.player}`:o.source));if(group?.holder?.player!==o.player)errors.push(`${o.source}: chosen intelligence does not establish Player ${o.player}'s control.`);}
  for(const t of plan.threats.filter(t=>t.target===target)){const group=result.rows.find(r=>r.group.id===(t.source.startsWith('W')?`${t.source}:P${t.player}`:t.source));commitments.push({id:`threat-${t.id}`,groupId:`threat-${t.id}`,role:t.role,quantity:t.quantity,hypothetical:{code:t.source,player:t.player,kind:t.source.startsWith('W')?'sea':group?.holder?.kind==='minor'?'minor':'occupied'}});warnings.push(`Specified threat, not submitted orders: P${t.player} ${t.quantity} ${roles[t.role].field} from ${t.source}.`);}
  const scenario:BattleScenario={id:plan.id,name:plan.name,mode:'attack',baseTurn:plan.baseTurn,orderTurn:plan.orderTurn,target,excludedPlayers:[],choices:plan.choices,commitments,defense,assumptions:{precombat:true,isolated:true},notes:plan.notes,evidenceKey:plan.evidenceKey,modelVersion:MODEL_VERSION,updatedAt:plan.updatedAt};
  const battle=analyzeBattle(scenario,diplomatic,game,atlas,currentKey);
  errors.push(...battle.errors);
  warnings.push(...battle.warnings.filter(w=>!w.startsWith('Target values are')&&!w.startsWith('Hypothetical values are')));
  const estimates=errors.length?[]:battle.estimates;
  for(const estimate of estimates)estimate.stages[0].detail=estimate.stages[0].detail.replace('Local movement/build/recovery values are supplied assumptions.',hasOrders?'Local defense reflects the supported proposed movement, builds, and recovery shown above.':'Local defense is the explicit enemy-behavior assumption shown above.');
  const hasThreat=plan.threats.some(t=>t.target===target);
  result.battles.push({target,refs:orders.filter(o=>o.source===target||o.target===target),errors:[...new Set(errors)],warnings,estimates,defense,phases:hasOrders?modeled.phases:[`Manual pre-combat defense; incoming movement, builds, recovery and enemy decisions are included in the stated assumption.`],conditional:!hasOrders||hasThreat});
  if(estimates.length){const mid=estimates[1];if(mid.capture!=='estimated')add('estimate',`${target}: ${mid.outcome}`,refs,target);else if(mid.conquer<3)add('estimate',`${target}: only ${mid.conquer.toFixed(2)} conquering army survive in the central estimate; capture has little reserve.`,refs,target);if(estimates.some(e=>e.capture!==mid.capture))add('estimate',`${target}: changing the assumed hit rate changes capture eligibility. Review the sensitivity cases.`,refs,target);}
  if(!hasOrders)add('assumption',`${target}: no proposed orders from the defender. Any estimate depends on the stated enemy behavior, not proof that the enemy stands still.`,refs,target);
 }
 for(const code of new Set(orders.filter(o=>!o.standing&&o.source&&!o.source.startsWith('W')&&o.target&&(orderRoles[o.action||'']||movements.has(o.action||''))).map(o=>o.source!))){
  const row=result.rows.find(r=>r.group.id===code),player=row?.holder?.player;if(player==null)continue;
  const refs=orders.filter(o=>o.source===code&&o.player===player&&!o.standing);
  const modeled=precombatDefense(code,result.rows,orders,result.players,atlas);
  result.exposures.push({code,player,refs,...modeled,errors:[...modeled.errors,...(affected.get(code)||[]),...new Set(global)]});
  if(!attacked.has(code))add('assumption',`${code}: forces leave this country, but no incoming attack is specified. Remaining defense is not a safety guarantee; add a specified threat to test it.`,refs,code,player);
 }
 return result;
}

/** A comparison preview changes one recognized token in a cloned plan, never the saved text. */
export function previewQuantity(plan:TurnPlan,ref:OrderRef,quantity:number):TurnPlan{
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>1_000_000||!ref.action||!ref.target||ref.standing||!orderRoles[ref.action])throw Error('Choose a combat order and 1–1,000,000 whole units.');
 return {...plan,sets:plan.sets.map(s=>{if(s.player!==ref.player)return s;const lines=s.text.split('\n');let replaced=false;lines[ref.line-1]=lines[ref.line-1].replace(/\S+/g,token=>{if(!replaced&&token.toUpperCase()===ref.token){replaced=true;return `${ref.action}${quantity}${ref.target}`;}return token;});if(!replaced)throw Error('Order changed. Select it again before previewing.');return {...s,text:lines.join('\n')};})};
}

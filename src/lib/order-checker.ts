import type {Field,Geography,Report} from './wwbp/types';

export type OrderIssue={level:'error'|'warning';message:string};
export type CheckedOrder={line:number;token:string;source:string|null;description:string;issues:OrderIssue[];action?:string;target?:string;quantity?:number;standing?:number};
export type OrderBudget={source:string;resource:string;available:number;used:number};
const resources:Record<string,Field>={A:'Army',N:'Navy',F:'AirF',M:'Missiles',X:'ABMs',I:'Industry'};
const actions:Record<string,string>={AT:'Move army',NT:'Move navy',FT:'Move air force',MT:'Move missiles',XT:'Move anti-missiles',AC:'Conquer',AB:'Bombard',AS:'Support with army',NN:'Attack coastal navy',NS:'Support with navy',FA:'Air attack on army',FN:'Air attack on navy',FF:'Air attack on air base',FI:'Air attack on industry',FS:'Support with air force',MA:'Missile attack on army',MF:'Missile attack on air base',MI:'Missile attack on industry'};
const sea=(code:string)=>code.startsWith('W');
const attacking=(action:string)=>['AC','AB','NN','FA','FN','FF','FI','MA','MF','MI'].includes(action);

export function checkOrders(text:string,report:Report,atlas:Record<string,Geography>){
 const rows:CheckedOrder[]=[],issues:OrderIssue[]=[],budgets:OrderBudget[]=[];
 const issue=(row:CheckedOrder,level:OrderIssue['level'],message:string)=>row.issues.push({level,message});
 const error=(row:CheckedOrder,message:string)=>issue(row,'error',message);
 const warn=(row:CheckedOrder,message:string)=>issue(row,'warning',message);
 const budgetMap=new Map<string,{budget:OrderBudget;rows:CheckedOrder[]}>();
 const charge=(row:CheckedOrder,source:string,resource:string,available:number,amount:number)=>{
  if(row.standing)return;
  const key=source+':'+resource;
  if(!budgetMap.has(key)){const budget={source,resource,available:Math.floor(available),used:0};budgets.push(budget);budgetMap.set(key,{budget,rows:[]});}
  const entry=budgetMap.get(key)!;entry.budget.used+=amount;entry.rows.push(row);
 };
 if(text.length>100_000||text.trim().split(/\s+/).length>2000)return {rows,issues:[{level:'error' as const,message:'Draft exceeds the checker limit of 100,000 characters or 2,000 tokens.'}],budgets,count:0,exportText:''};
 let source:string|null=null,seenSpace=false,opened=false,ended=false;
 const normalized:string[]=[];
 const lines=text.replace(/\r/g,'').split('\n');
 for(let index=0;index<lines.length;index++){
  const line=lines[index].trim().toUpperCase();if(!line)continue;
  if(line==='ORDERS'){if(opened||normalized.length||ended)issues.push({level:'error',message:`Line ${index+1}: ORDERS must appear once at the start.`});opened=true;continue;}
  if(line==='END'){if(ended)issues.push({level:'error',message:`Line ${index+1}: duplicate END.`});ended=true;continue;}
  if(ended){issues.push({level:'error',message:`Line ${index+1}: text after END will not be exported. Move orders above END.`});continue;}
  for(const token of line.split(/\s+/)){
   normalized.push(token);
   if(token.startsWith('@')){
    source=token.slice(1)||null;
    if(source){seenSpace=true;if(!atlas[source])issues.push({level:'error',message:`Line ${index+1}: unknown source ${source}.`});else if(!report.own[source])issues.push({level:'error',message:`Line ${index+1}: ${source} is not in your forces-under-control table.`});}
    else if(seenSpace)issues.push({level:'warning',message:`Line ${index+1}: put player orders before space orders (rule 8).`});
    continue;
   }
   const row:CheckedOrder={line:index+1,token,source,description:'Unrecognized order',issues:[]};rows.push(row);
   let command=token;
   const standing=command.match(/^\/([1-5])\/(.*)$/);
   if(standing){row.standing=+standing[1];command=standing[2];if(!source||sea(source))error(row,'Standing orders require a land country (rule 11).');row.description=`Cancel standing order ${row.standing}`;if(!command)continue;warn(row,'Standing order: executes this turn and persists. Available quantities and conflicts need manual review; excluded from the explicit-order budget.');}
   if(command.startsWith('/')){error(row,'Use standing-order slots /1/ through /5/.');continue;}
   const build=command.match(/^B([IANFMXD])(\d+)$/);
   if(build){
    const [,unit,n]=build;const amount=+n;row.action='B'+unit;row.quantity=amount;
    if(!Number.isSafeInteger(amount)){error(row,'Quantity is too large.');continue;}
    if(!source){row.description=`Set default ${unit==='D'?'dollar':resources[unit]} build proportion to ${amount}`;if(amount>100)error(row,'Default proportions must be from 0 to 100 (rule 10).');warn(row,'Other default proportions remain in effect until changed to zero.');}
    else {
     row.description=`Use ${amount} industry in ${source} to build ${resources[unit]||'dollars'}`;
     if(sea(source))error(row,'Build orders require a land country.');
     if(unit==='D')error(row,'BD is a player default, not an explicit country build order.');
     if(unit==='N'&&atlas[source]&&!atlas[source].surface.some(sea))error(row,'Navy can only be built in a country with a coast.');
     charge(row,source,'Industry',report.own[source]?.values.Industry||0,amount);
    }
    continue;
   }
   const move=command.match(/^(AT|NT|FT|MT|XT|AC|AB|AS|NN|NS|FA|FN|FF|FI|FS|MA|MF|MI)(\d+)([A-Z]{3})$/);
   if(move){
    const [,action,n,target]=move;const quantity=+n;row.action=action;row.target=target;row.quantity=quantity;
    row.description=`${actions[action]}: ${quantity}${action[0]} → ${target} · ${atlas[target]?.name||'unknown space'}`;
    if(!Number.isSafeInteger(quantity)||quantity<1){error(row,'Unit quantity must be a positive whole number.');continue;}
    if(!source){error(row,'Add an @SPACE source before this order.');continue;}
    if(!atlas[source]||!atlas[target]){error(row,'Unknown source or target space.');continue;}
    if(source===target)error(row,'Choose another space; forces already defend their own space.');
    const own=report.own[source],minor=own?.kind==='minor';
    if(minor&&(action==='AC'||action.endsWith('T')))error(row,'Minor forces cannot move or conquer (rules 4C–4G).');
    const countryOnly=attacking(action)||action==='AS'||action==='MT'||action==='XT';
    if(countryOnly&&sea(target))error(row,'This order requires a land target. Use NS or FS for naval/air combat at sea.');
    if(action[0]==='N'&&!sea(source)&&!sea(target))error(row,'Navy cannot move, attack, or support directly from land to land.');
    if(action==='NN'&&!sea(source))error(row,'A naval attack must start at sea.');
    if(['M','X'].includes(action[0])&&sea(source))error(row,'Missiles and anti-missiles cannot be at sea.');
    const geo=atlas[source],surface=geo.surface.includes(target),canal=geo.canals.find(c=>c.target===target);
    const air=surface||geo.air.includes(target)||!!canal;
    const missileAttack=action.startsWith('M')&&action!=='MT';
    const withinRange=missileAttack||(['F','M','X'].includes(action[0])?air:surface||!!canal);
    if(!withinRange)error(row,`Target ${target} is out of ${['F','M','X'].includes(action[0])?'air':'surface'} range.`);
    if(canal&&!surface&&['A','N'].includes(action[0])){
     const gate=report.spaces[canal.gate],controller=gate?.owner||gate?.controller;
     if(controller!==report.player)warn(row,`Canal ${canal.gate}: permission is required and has not been verified.`);
    }
    if(attacking(action)){
     const targetSpace=report.spaces[target];
     if(targetSpace?.owner===report.player)error(row,'You cannot attack your own occupied country (rule 12A).');
     if(targetSpace?.controller===report.player&&['A','F'].includes(action[0]))warn(row,'Attacking this controlled minor resets your positive popularity there to zero.');
    }
    if(action.endsWith('T')&&!sea(target)&&report.spaces[target]?.owner!==report.player)warn(row,'This move is a gift if the destination is a minor or another player’s country. You give up ownership of the units.');
    if((action==='NS'||action==='FS')&&sea(target))warn(row,'Sea combat depends on enemy declarations. Review both players’ declarations.');
    charge(row,source,resources[action[0]],own?.values[resources[action[0]]]||0,quantity);
    continue;
   }
   if(source){error(row,'Not a recognized space order. Use @ before player orders, or check the syntax reference.');continue;}
   if(row.standing){error(row,'Standing orders cannot apply to a player.');continue;}
   let match=command.match(/^(\d+)([ANEKXFHZ])$/);
   if(match){
    const player=+match[1],verb=match[2];
    const descriptions:Record<string,string>={A:'Declare ally',N:'Declare neutral',E:'Declare enemy',K:'Permit canal use',X:'Forbid canal use',F:'Share full spy information',H:'Share partial spy information',Z:'Stop sharing spy information'};
    row.description=`${descriptions[verb]}: Player ${player} · ${report.players[String(player)]||'name not reported'}`;row.action=verb;row.target=String(player);
    if(player<1||player>999||player===report.player)error(row,'Choose another valid player number.');
    else if(!report.players[String(player)])warn(row,'This player number is not named in the selected report. Verify it.');
    continue;
   }
   match=command.match(/^([SCP])(\d+)([A-Z]{3})$/);
   if(match){
    const [,verb,n,target]=match,quantity=+n;row.action=verb;row.target=target;row.quantity=quantity;
    row.description=`${verb==='S'?'Send spies':verb==='C'?'Send counterspies':'Spend dollars on propaganda'}: ${quantity} → ${target}`;
    if(!atlas[target]||sea(target))error(row,'Choose a valid land country.');
    if(verb==='S'&&report.spaces[target]?.owner===report.player)error(row,'You cannot send spies to a country you occupy (rule 6B).');
    charge(row,'Player',verb==='S'?'Spies':verb==='C'?'CounterSpies':'Dollars',verb==='S'?report.Spies:verb==='C'?report.CounterSpies:report.Dollars,quantity);
   }else if((match=command.match(/^(\d+)([DSCP])(\d+)$/))){
    const [,p,verb,n]=match,player=+p,quantity=+n;row.action=verb;row.target=p;row.quantity=quantity;
    row.description=`${verb==='D'?'Give dollars':verb==='S'?'Distribute spies':verb==='C'?'Distribute counterspies':'Distribute propaganda dollars'}: ${quantity} → ${player===0?'all minors':'Player '+player}`;
    if(player>999||verb==='D'&&(player===0||player===report.player)||verb==='S'&&player===report.player)error(row,'Invalid recipient for this order.');
    if(player!==0&&!report.players[p])warn(row,'Recipient is not named in this report. Verify the player number.');
    charge(row,'Player',verb==='S'?'Spies':verb==='C'?'CounterSpies':'Dollars',verb==='S'?report.Spies:verb==='C'?report.CounterSpies:report.Dollars,quantity);
   }else if((match=command.match(/^(T[SC]|R[IANFMXSC])(\d+)$/))){
    const [,verb,n]=match,quantity=+n;row.action=verb;row.quantity=quantity;
    row.description=`Spend ${quantity} dollars on ${verb[0]==='T'?(verb[1]==='S'?'spy training':'counterspy training'):verb[1]+' research'}`;
    charge(row,'Player','Dollars',report.Dollars,quantity);
   }else if(/^U[12]$/.test(command)){row.action=command;row.description=command==='U1'?'Toggle player names in reports':'Toggle alphabetical country listing';}
   else error(row,'Unrecognized order. Use the full syntax in the reference. Email headings, messages, and comments do not belong in the order body.');
   if(row.quantity!==undefined&&(!Number.isSafeInteger(row.quantity)||row.quantity<1))error(row,'Quantity must be a positive whole number.');
  }
 }
 if(opened&&!ended)issues.push({level:'warning',message:'Missing END; the exported order block will include it.'});
 for(const {budget,rows:usedRows} of budgetMap.values())if(budget.used>budget.available)for(const row of usedRows)error(row,`${budget.source}: orders use ${budget.used} ${budget.resource}, but only ${budget.available} are available. New builds, incoming transfers, and new training are not included.`);
 const duplicates=new Map<string,CheckedOrder[]>();
 for(const row of rows){
  if(!row.action&&!row.standing)continue;
  const group=row.standing?'slot'+row.standing:row.source?row.action+':'+(row.target||''):['A','N','E'].includes(row.action!)?'diplomacy:'+row.target:['K','X'].includes(row.action!)?'canal:'+row.target:['F','H','Z'].includes(row.action!)?'sharing:'+row.target:row.action+':'+(row.target||'');
  const key=(row.source||'Player')+':'+group;
  duplicates.set(key,[...(duplicates.get(key)||[]),row]);
 }
 for(const group of duplicates.values())if(group.length>1)for(const row of group){if(row.source||row.standing)error(row,'Duplicate order or standing slot. Combine quantities or choose one instruction (rule 12C).');else warn(row,'Repeated or conflicting player instruction. Review which one you intend.');}
 for(const attack of rows.filter(r=>r.source&&r.action&&attacking(r.action)))for(const other of rows){
  if(other===attack||other.source!==attack.source||other.target!==attack.target||!other.action)continue;
  const conflict=attack.action![0]==='A'&&['AT','AS'].includes(other.action)||attack.action![0]==='F'&&['FT','FS'].includes(other.action)||attack.action==='NN'&&['NT','NS'].includes(other.action)||attack.action![0]==='M'&&(other.action==='XT'||attack.action==='MA'&&['AT','AS'].includes(other.action));
  if(conflict){const level=attack.standing||other.standing?'warning':'error';issue(attack,level,`Conflicts with ${other.token} from the same source to ${other.target} (rule 12B).`);issue(other,level,`Conflicts with ${attack.token} (rule 12B).`);}
 }
 if(rows.some(row=>row.standing))issues.push({level:'warning',message:'Standing-order execution, trimming, and priority are not simulated. Review them against your report and explicit orders.'});
 // Group by context, preserving the order of instructions within each source.
 if(normalized.some(token=>token.length>76))issues.push({level:'error',message:'An order exceeds the 76-character email line limit.'});
 return {rows,issues,budgets,count:rows.length,exportText:formatOrderBlock(normalized)};
}

function formatOrderBlock(tokens:string[]):string {
 const groups=new Map<string,string[]>();let context='@';
 for(const token of tokens){
  if(token.startsWith('@')){context=token;continue;}
  if(!groups.has(context))groups.set(context,[]);
  groups.get(context)!.push(token);
 }
 const lines=['ORDERS'];
 const contexts=[...(groups.has('@')?['@']:[]),...Array.from(groups.keys()).filter(key=>key!=='@')];
 for(const key of contexts){
  let line=key.padEnd(6,' ');
  for(const token of groups.get(key)!){
   const candidate=line+(line.endsWith(' ')?'':' ')+token;
   if(candidate.length<=76)line=candidate;
   else {lines.push(line.trimEnd());line=(token.length<=70?'      ':'')+token;}
  }
  lines.push(line.trimEnd());
 }
 return [...lines,'END',''].join('\r\n');
}

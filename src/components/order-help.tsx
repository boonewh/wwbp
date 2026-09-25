import type {Geography} from '../lib/wwbp/types';

const units:Record<string,string>={A:'army',N:'navy',F:'air force',M:'missiles',X:'anti-missiles',I:'industry'};
const help:Record<string,{purpose:string;rule:string}>={
 AC:{purpose:'conquer',rule:'Only armies from occupied countries or sea spaces can conquer. Minor-country armies cannot. The target must be adjacent land.'},
 AB:{purpose:'bombard',rule:'Bombarding armies attack defending armies and then survivors return home. Minor-country armies may bombard adjacent land.'},
 AS:{purpose:'help defend',rule:'Support defends the adjacent country; it does not help conquer it. Survivors return home after combat.'},
 AT:{purpose:'move to',rule:'Army moves one surface connection. Minor-country armies cannot move. Moving into a minor or another player’s country gives those units away.'},
 NN:{purpose:'attack the coastal navy in',rule:'The navy must start at sea and attack adjacent land. To fight at sea, use Navy: support and review enemy declarations.'},
 NS:{purpose:'help defend',rule:'Navy supports an adjacent space and survivors return home. Land-based navy can support sea only. At sea, combat depends on enemy declarations.'},
 NT:{purpose:'move to',rule:'Navy moves one surface connection, with canal permission where required. It cannot move directly from land to land. Minor-country navy cannot move.'},
 FA:{purpose:'attack armies in',rule:'The target must be land within air range. Attacking air force must overcome defending and supporting air force before hitting armies.'},
 FN:{purpose:'attack navy in',rule:'The target must be land within air range. Use Air: support to fight at sea.'},
 FF:{purpose:'attack the air base in',rule:'The target must be land within air range. This targets the air base, rather than armies, navy, or industry.'},
 FI:{purpose:'attack industry in',rule:'The target must be land within air range. Industry is suppressed rather than destroyed.'},
 FS:{purpose:'help defend',rule:'The target must be within air range. Support defends land; at sea, combat depends on enemy declarations. Survivors return home.'},
 FT:{purpose:'move to',rule:'The destination must be within air range. Minor-country air force cannot move. Moving into a minor or another player’s country is a gift.'},
 MA:{purpose:'attack defending armies in',rule:'Missiles can target land anywhere on the map. They may be intercepted by anti-missiles and cannot target attacking armies.'},
 MF:{purpose:'attack the air base in',rule:'Missiles can target land anywhere on the map. They may be intercepted by anti-missiles.'},
 MI:{purpose:'attack industry in',rule:'Missiles can target land anywhere on the map. Industry is suppressed rather than destroyed; anti-missiles may intercept the attack.'},
 MT:{purpose:'move to',rule:'Missiles move within air range, to land only. Minor-country missiles cannot move. Transfers to minors or other players are gifts.'},
 XT:{purpose:'move to',rule:'Anti-missiles move within air range, to land only. Minor-country anti-missiles cannot move. Transfers to minors or other players are gifts.'},
};

export function BuilderHelp({source,action,amount,target,atlas}:{source:string;action:string;amount:string;target:string;atlas:Record<string,Geography>}){
 const build=action.startsWith('B'),entry=help[action];
 const ready=!!atlas[source]&&/^\d+$/.test(amount)&&+amount>0&&(build||!!atlas[target]);
 const from=atlas[source]?.name,to=atlas[target]?.name;
 return <div className="builder-help"><h3>What this order does</h3>{ready?<><code>@{source} {action}{amount}{build?'':target}</code><p className="order-meaning">{build?`Use ${amount} industry in ${from} to build ${units[action[1]]}.`:`Send ${amount}${action[0]} from ${from} to ${entry?.purpose} ${to}.`}</p></>:<p>Choose a source, {build?'industry amount':'unit amount, and target'} to see your order explained here.</p>}<p>{build?'The number is industry spent, not units produced. Your multiplier determines production. Newly built forces cannot move, attack, or support this turn. Navy requires a coastal country.':entry?.rule}</p></div>;
}

const groups=[
 {title:'Combat — conquer, attack, or defend',intro:'Give these orders under the space the forces start in.',examples:[
  ['Conquer a country','@ANR AC3ACH','Send 3A from Niger to conquer Chad.','Minor-country armies cannot conquer.'],
  ['Bombard without taking ownership','@ANR AB3ACH','Send 3A from Niger to attack defending armies in Chad.','Survivors return to Niger. Controlled minors may bombard.'],
  ['Defend another country','@ANR AS3ACH','Send 3A from Niger to help defend Chad.','Support defends; it does not join an attack on Chad.'],
  ['Attack with air force','@ANR FA10ACH','Send 10F from Niger to attack armies in Chad.','Use FN for navy, FF for air base, or FI for industry. Targets must be land within air range.'],
 ]},
 {title:'Movement — relocate forces or give them away',intro:'Move orders use T. They relocate forces rather than sending them out and back.',examples:[
  ['Move armies','@ANR AT3ACH','Move 3A from Niger to Chad.','If Chad is a minor or belongs to another player, this is a gift—even if you control the minor. Minor forces cannot move.'],
  ['Move air force','@ANR FT5ACH','Move 5F from Niger to Chad.','Air force moves within air range. Navy uses NT; missiles use MT; anti-missiles use XT. Missiles and anti-missiles must stay on land.'],
 ]},
 {title:'Construction — spend industry',intro:'The same build code means different things under a country and under player orders (@).',examples:[
  ['Build in one country','@ANR BA5','Use 5 industry in Niger to build army.','This does not necessarily produce 5A: your army multiplier determines the result. Use BI / BN / BF / BM / BX for other builds.'],
  ['Set a default for your countries','@ BA100 BF0','Set the army default proportion to 100 and the air-force proportion to 0.','Other default proportions remain unchanged. Defaults persist and are not fully simulated by this checker.'],
 ]},
 {title:'Diplomacy — relations, canals, and sharing',intro:'These are player orders. Start with @ alone, not a country code.',examples:[
  ['Declare an ally','@ 7A','Declare Player 7 your ally.','7N declares neutral; 7E declares enemy. Your declaration does not guarantee theirs matches.'],
  ['Allow canal passage','@ 7K','Permit Player 7 to use canals you control.','7X withdraws that permission.'],
  ['Share your spy information','@ 7F','Share full spy information with Player 7 in the game.','7H shares partial information; 7Z stops sharing. This does not share your app workspace.'],
  ['Give another player cash','@ 7D20','Give Player 7 twenty dollars.','The dollars come from your reserve.'],
 ]},
 {title:'Spies, propaganda, and research',intro:'These also go under player orders (@). Quantities refer to agents or dollars, depending on the action.',examples:[
  ['Send spies','@ S2ACH','Send 2 spies from your reserve to Chad.','Spies cannot go to sea or a country you occupy. C2ACH sends 2 counterspies instead.'],
  ['Train spies','@ TS10','Spend 10 dollars training spies.','TS is dollars spent, not spies produced. TC trains counterspies. Newly trained agents cannot be sent this turn.'],
  ['Increase popularity','@ P20ACH','Spend 20 dollars on propaganda in Chad.','7P20 distributes 20 dollars among countries occupied by Player 7.'],
  ['Research army production','@ RA20','Spend 20 dollars on army research.','RI / RN / RF / RM / RX / RS / RC research the other multipliers.'],
 ]},
 {title:'Standing orders — repeat until changed',intro:'Standing orders belong to a land country. There are five slots, /1/ through /5/.',examples:[
  ['Set a recurring build','@ANR /1/BA999','Set Niger’s standing slot 1 to build army using up to 999 industry.','Standing orders can be reduced or skipped by the processor. Execution and priority need manual review.'],
  ['Cancel a standing order','@ANR /1/','Cancel Niger’s standing slot 1.','Other standing slots remain unchanged.'],
 ]},
];

export default function OrderHelp(){return <details className="order-help-guide"><summary>Order help</summary><p>Choose what you want to do. These are examples, not recommendations for your current position; change the spaces, players, and quantities before using them.</p>{groups.map(group=><details key={group.title} className="order-help-group"><summary>{group.title}</summary><p>{group.intro}</p>{group.examples.map(([title,code,meaning,note])=><div className="order-help-example" key={title}><h4>{title}</h4><code>{code}</code><p className="order-meaning">{meaning}</p><p>{note}</p></div>)}</details>)}</details>;}

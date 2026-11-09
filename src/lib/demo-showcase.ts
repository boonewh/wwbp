import atlasData from '../data/atlas.json';
import type {Geography,Workspace} from './wwbp/types';
import {demoWorkspace} from './demo';

// Invented showcase fixture: fictional player names, made-up forces, no real reports.
// It exists so the first look at the demo has a lively, multi-player map.
const atlas:Record<string,Geography>=atlasData;
const players:[number,string,string][]=[
 [1,'DEMONSTRATION','AMO'],[2,'LONE STAR PACT','NTX'],[3,'RHINE COMPACT','EWG'],[4,'STEPPE UNION','RRU'],
 [5,'JADE DYNASTY','CHE'],[6,'SOUTHERN CROSS','SSP'],[7,'MONSOON ALLIANCE','IPU'],[8,'CORAL REPUBLIC','PSW'],
];
const tag=(p:number)=>`[${p}:${players[p-1][1]}]`;
function hash(text:string){let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
const roll=(code:string,salt:string,max:number)=>hash(code+salt)%(max+1);
/** Core radius per player and turn; the player and their neighbours shift so turn changes are visible. */
function coreRadius(player:number,turn:number){return player===1?115+30*(turn-1):player===3?140-15*(turn-1):player===4?150+10*(turn-1):125;}

type Holding={code:string;player:number;kind:'occupied'|'minor'|'unknown'};
function holdings(turn:number):Holding[]{
 return Object.entries(atlas).filter(([code])=>!code.startsWith('W')).map(([code,g])=>{
  let best=players[0],dist=Infinity;
  for(const p of players){const c=atlas[p[2]];const d=Math.hypot(c.x-g.x,c.y-g.y)/coreRadius(p[0],turn);if(d<dist){dist=d;best=p;}}
  return {code,player:best[0],kind:dist<1?'occupied':dist<1.7?'minor':'unknown'};
 });
}

export function showcaseReport(turn:number):string{
 const list=holdings(turn),home=atlas.AMO;
 const visible=(code:string)=>Math.hypot(atlas[code].x-home.x,atlas[code].y-home.y)<330;
 const forces=(code:string,minor:boolean)=>{const army=roll(code,'A'+turn,minor?6:14)+(minor?1:2),navy=roll(code,'N',5),air=roll(code,'F'+turn,8),missiles=minor?0:roll(code,'M',3),abms=roll(code,'X',minor?3:9),industry=roll(code,'I',minor?6:16)+2;return {army,navy,air,missiles,abms,industry,tax:industry*4+roll(code,'T',20)};};
 const own=list.filter(h=>h.player===1&&h.kind!=='unknown');
 const rows=own.map(h=>{const f=forces(h.code,h.kind==='minor');return {h,f};});
 const sea={army:2,navy:3+turn,air:4};
 const totals=[0,0,0,0,0,0];
 for(const {f} of rows)[f.army,f.navy,f.air,f.missiles,f.abms,f.industry].forEach((v,i)=>totals[i]+=v);
 totals[0]+=sea.army;totals[1]+=sea.navy;totals[2]+=sea.air;
 const pad=(v:number|string)=>String(v).padStart(8);
 const table=rows.map(({h,f})=>`${h.code}${h.kind==='minor'?' *  ':'    '}${[f.army,f.navy,f.air,f.missiles,f.abms,f.industry].map(pad).join('')}${h.kind==='minor'?'':pad(300+roll(h.code,'H',40))}`).join('\n');
 const ranking=players.map(([p])=>`   ${tag(p).padEnd(24)}${list.filter(h=>h.player===p&&h.kind==='occupied').length}`).join('\n');
 const records=list.map(h=>{
  if(h.kind==='unknown')return `${h.code} *`;
  if(!visible(h.code))return h.kind==='occupied'?`${h.code} ${tag(h.player)}`:`${h.code} *`;
  const f=forces(h.code,h.kind==='minor');
  const body=`Army=${f.army} Navy=${f.navy} AirF=${f.air} Missiles=${f.missiles} ABMs=${f.abms} Industry=${f.industry} TaxBase=${f.tax}`;
  if(h.kind==='occupied')return `${h.code} ${tag(h.player)} ${body}`;
  const rival=h.player===1?3:1;
  return `${h.code} * ${body} [${h.player}]=${55+roll(h.code,'P',30)} [${rival}]=${roll(h.code,'Q',25)}`;
 }).join('\n');
 const echo=turn===1?'':`\nOrder-count: 4\n@\n2A\n@AMO\nBA2\nAC2AAL\n-----\n`;
 return `Game DEMO-WORLD, Turn ${turn}, Player ${tag(1)}

Spies=${12-turn*2} CounterSpies=6 Dollars=${(80+turn*12.5).toFixed(2)}
   Defaults=(BA1)
   Multipliers=(I20,A${148+turn},N75,F75,X200,S50,C75)
   Allies=(${tag(3)},${tag(6)})
   Players declaring you ally=(${tag(6)})
Due Tuesday, March ${3+turn*7} at 6:00 PM (fictional demo)
${turn>1?'\n<S1XYZ -- No such space>\n':''}
Forces under your control:
             A       N       F       M       X       I    HPI
${table}
WWM ${[sea.army,sea.navy,sea.air].map(pad).join('')}
       ------- ------- ------- ------- ------- -------
 ${totals.map(pad).join('')}

   Player      Occupied Countries
${ranking}

Occupied Countries
${records}
WWM ${tag(1)}(Army=${sea.army} Navy=${sea.navy} AirF=${sea.air})
${echo}
Visible forces of all players:
`;
}

/** Demo workspace for the welcome screen: a rich showcase campaign plus the two small practice campaigns. */
export function showcaseWorkspace():Workspace{
 const base=demoWorkspace();
 return {...base,selectedId:'demo-world',campaigns:[{id:'demo-world',name:'Demo world campaign',game:'DEMO-WORLD',player:1,reports:[1,2,3].map(t=>({filename:`demo-world-turn-${t}.txt`,text:showcaseReport(t)}))},...base.campaigns]};
}

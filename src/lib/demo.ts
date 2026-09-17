import type {Workspace} from './wwbp/types';
// Invented fixtures: no real reports, contact details, or player identities.
export function demoReport(game='DEMO-A',turn=1,army=12):string {return `Game ${game}, Turn ${turn}, Player [1:DEMONSTRATION]
Spies=5 CounterSpies=2 Dollars=100
Forces under your control:
AAL ${army} 0 5 0 0 10 80
 ${army} 0 5 0 0 10
Occupied Countries
AAL [1:DEMONSTRATION] Army=${army} Navy=0 AirF=5 Missiles=0 ABMs=0 Industry=10 TaxBase=30
AMO * Army=2 Industry=3 TaxBase=10 [1]=50 [2]=20
ALI [2:FICTIONAL OPPONENT]
Visible forces of all players:
`;}
export function demoWorkspace():Workspace {return {version:1,selectedId:'demo-a',campaigns:[{id:'demo-a',name:'Practice campaign A',game:'DEMO-A',player:1,reports:[1,2].map(t=>({filename:`demo-a-turn-${t}.txt`,text:demoReport('DEMO-A',t,t===1?12:18)}))},{id:'demo-b',name:'Practice campaign B',game:'DEMO-B',player:1,reports:[{filename:'demo-b-turn-1.txt',text:demoReport('DEMO-B',1,7)}]}]};}

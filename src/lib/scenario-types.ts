export const MODEL_VERSION='land-estimate-1';
export const roles={
 conquer:{label:'Conquer with army',field:'Army',side:'attack'},
 bombard:{label:'Bombard with army (returns home)',field:'Army',side:'attack'},
 airArmy:{label:'Air attack on army',field:'AirF',side:'attack'},
 navyAttack:{label:'Attack coastal navy',field:'Navy',side:'attack'},
 missileArmy:{label:'Missiles against army',field:'Missiles',side:'attack'},
 armySupport:{label:'Army supporting defense',field:'Army',side:'defense'},
 airSupport:{label:'Air supporting defense',field:'AirF',side:'defense'},
 navySupport:{label:'Navy supporting defense',field:'Navy',side:'defense'},
} as const;
export type BattleRole=keyof typeof roles;
export type Commitment={id:string;groupId:string;role:BattleRole;quantity:number;hypothetical?:{code:string;player:number;kind:'occupied'|'minor'|'sea'}};
export const defenseFields=['Army','AirF','Navy','ABMs'] as const;
export type DefenseField=typeof defenseFields[number];
export type BattleScenario={
 id:string;name:string;mode:'attack'|'defense';baseTurn:number;orderTurn:number;target:string;
 excludedPlayers:number[];choices:Record<string,string>;commitments:Commitment[];
 defense:Partial<Record<DefenseField,number>>;
 targetHolder?:{kind:'occupied'|'minor';player:number|null};
 assumptions:{precombat:boolean;isolated:boolean};
 notes:string;evidenceKey:string;modelVersion:string;updatedAt:string;
};

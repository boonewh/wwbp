export const fields = ['Army','Navy','AirF','Missiles','ABMs','Industry'] as const;
export type Field = typeof fields[number];
export type Values = Partial<Record<Field | 'TaxBase', number>>;
export interface Space { code:string; kind:string; owner?:number|null; controller?:number|null; visible:boolean; commanded?:boolean; values:Values; suppressed:Values; popularity:Record<string,number>; fleets:{player:number;values:Values}[]; raw:string; HPI?:number; MaxInd?:number; }
export type MultiplierCode = 'I' | 'A' | 'N' | 'F' | 'X' | 'M' | 'S' | 'C';
export interface Report { multipliers:Partial<Record<MultiplierCode,number>>; game:string; player:number; position:string; turn:number; filename:string; raw:string; spaces:Record<string,Space>; own:Record<string,{code:string;kind:string;values:Values}>; totals:Record<Field,number>; Dollars:number; Spies:number; CounterSpies:number; due:string; errors:string[]; warnings:string[]; orderEcho:string; diplomacy:Record<string,number[]>; players:Record<string,string>; }
export interface Geography { name:string; x:number; y:number; surface:string[]; air:string[]; canals:{target:string;gate:string}[]; }
export interface RawReport { filename:string; text:string; }
export interface Campaign { id:string; name:string; game:string; player:number; reports:RawReport[]; archived?:boolean; }
export interface Workspace { version:1; campaigns:Campaign[]; selectedId:string|null; }
export interface Changes { captures:string[]; lost:string[]; controlGained:string[]; controlLost:string[]; intelGained:string[]; intelLost:string[]; ownership:string[]; }

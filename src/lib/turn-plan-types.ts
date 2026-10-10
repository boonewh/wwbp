import type {BattleRole,DefenseField} from './scenario-types';

export const TURN_MODEL_VERSION='coordinated-orders-1';
export type ProposedOrders={player:number;reportTurn:number;text:string;standingReviewed:boolean;copiedDraftAt?:string};
export type ExpectedContribution={id:string;player:number;source:string;target:string;role:BattleRole;quantity:number};
export type SpecifiedThreat=ExpectedContribution;
export type BattleReview={defense:Partial<Record<DefenseField,number>>;unknownOrders:boolean;isolated:boolean;note:string};
export type TurnPlan={
 id:string;name:string;baseTurn:number;orderTurn:number;sets:ProposedOrders[];
 choices:Record<string,string>;reviews:Record<string,BattleReview>;
 expected:ExpectedContribution[];threats:SpecifiedThreat[];
 notes:string;evidenceKey:string;modelVersion:string;updatedAt:string;
};

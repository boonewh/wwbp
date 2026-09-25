import type {OrderDraft,Workspace} from './wwbp/types';

export function validateDrafts(input:unknown):OrderDraft[]{
 if(!Array.isArray(input)||input.length>500)throw Error('Invalid order drafts.');
 const turns=new Set<number>();
 return input.map(d=>{
  if(!d||!Number.isSafeInteger(d.baseTurn)||d.baseTurn<0||d.baseTurn>99999||typeof d.text!=='string'||d.text.length>100_000||typeof d.updatedAt!=='string'||!Number.isFinite(Date.parse(d.updatedAt))||turns.has(d.baseTurn))throw Error('Invalid or duplicate order draft.');
  turns.add(d.baseTurn);return {baseTurn:d.baseTurn,text:d.text,updatedAt:d.updatedAt};
 });
}
export function saveOrderDraft(state:Workspace,id:string,draft:OrderDraft):Workspace{
 const [valid]=validateDrafts([draft]);
 const campaign=state.campaigns.find(c=>c.id===id);if(!campaign)throw Error('Campaign no longer exists.');
 return {...state,campaigns:state.campaigns.map(c=>c.id===id?{...c,orderDrafts:validateDrafts([...(c.orderDrafts||[]).filter(d=>d.baseTurn!==valid.baseTurn),valid])}:c)};
}

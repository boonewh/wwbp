import type {Workspace} from './wwbp/types';
export function validateHeading(input:unknown,game:string,player:number):string{
 if(typeof input!=='string'||/[\r\n\x00-\x1f]/.test(input)||input.length>76)throw Error('Use one heading line, no longer than 76 characters.');
 const heading=input.trim();if(!heading)return '';
 const match=heading.match(/^(\S+)\s+T-?(\d+)\s+\[(\d+)\]\s+(.+)$/i);
 if(!match)throw Error('Use: GAME T6 [1] followed by your submission details. T-6 is also accepted.');
 if(match[1].toUpperCase()!==game.toUpperCase()||+match[3]!==player)throw Error('The heading must match this campaign’s game and player number.');
 return heading;
}
export function headingForTurn(heading:string,turn:number):string{
 return heading.replace(/^(\S+\s+T-?)\d+(?=\s+\[)/i,(_,prefix:string)=>prefix+turn);
}
export function saveHeading(state:Workspace,id:string,heading:string):Workspace{
 const c=state.campaigns.find(c=>c.id===id);if(!c)throw Error('Campaign no longer exists.');
 const submissionHeading=validateHeading(heading,c.game,c.player);
 return {...state,campaigns:state.campaigns.map(c=>c.id===id?{...c,submissionHeading}:c)};
}

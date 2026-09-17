import {parseReport} from './wwbp/parser';
import type {RawReport} from './wwbp/types';
export function pastedReport(body:string):RawReport {
 if(!body.trim())throw Error('Paste the complete turn report from your email first.');
 if(new TextEncoder().encode(body).length>2_000_000)throw Error('Use a report smaller than 2 MB.');
 // Mail clients can copy non-breaking spaces in otherwise plain-text tables.
 const text=body.replace(/\u00a0/g,' ').replace(/^\uFEFF/,'');
 const report=parseReport(text,'Pasted email');
 return {filename:`${report.game}-turn-${report.turn}-player-${report.player}-email.txt`,text:report.raw};
}

import {compare} from './wwbp/parser';
import type {Report} from './wwbp/types';
export const changeKinds=[['captures','Captured','gain'],['lost','Lost occupation','loss'],['controlGained','Minor control gained','gain'],['controlLost','Minor control lost','loss'],['intelGained','Newly visible intelligence','intel'],['intelLost','Intelligence no longer visible','hidden'],['ownership','Ownership changed','ownership']] as const;
export type MapChange={label:string;style:typeof changeKinds[number][2]};
export function mapChanges(previous:Report|null,current:Report):Record<string,MapChange[]>{
 const changes=compare(previous,current),result:Record<string,MapChange[]>={};
 for(const [key,label,style] of changeKinds)for(const code of changes[key]){
  if(key==='ownership'&&(changes.captures.includes(code)||changes.lost.includes(code)))continue;
  (result[code]??=[]).push({label,style});
 }
 return result;
}

import type {Report, Changes} from './types';
export function parseReport(raw:string, filename?:string):Report;
export function compare(previous:Report|null, current:Report):Changes;
export function metrics(report:Report):Record<string,number>;
export const FIELDS:readonly string[];

declare const api: { parseReport:typeof parseReport; compare:typeof compare; metrics:typeof metrics; FIELDS:typeof FIELDS };
export default api;

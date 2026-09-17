import {decodeWorkspace} from './workspace';
import type {Workspace} from './wwbp/types';
export async function loadCloud(){const response=await fetch('/api/workspace',{cache:'no-store'});const body=await response.json();if(!response.ok)throw Error(body.error||'Cloud load failed.');return {workspace:decodeWorkspace(JSON.stringify(body.workspace)),revision:body.revision as number};}
export async function saveCloud(workspace:Workspace,revision:number){const response=await fetch('/api/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({workspace,revision})});const body=await response.json();if(!response.ok)throw Error(body.error||'Cloud save failed.');return body.revision as number;}

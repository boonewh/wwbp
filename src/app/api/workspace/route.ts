import {NextResponse} from 'next/server';
import {serverClient} from '../../../lib/supabase/server';
import {cloudConfigured} from '../../../lib/supabase/config';
import {emptyWorkspace} from '../../../lib/workspace';
import {validateCloudSave,MAX_CLOUD_BYTES,sameOriginWrite} from '../../../lib/cloud-validation';
export const dynamic='force-dynamic';
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Vary':'Cookie'}});
async function identity(){if(!cloudConfigured())return null;const client=await serverClient();const {data:{user},error}=await client.auth.getUser();return !error&&user?{client,user}:null;}
export async function GET(){const auth=await identity();if(!auth)return reply({error:'Sign in to load your campaigns.'},401);
 const allowed=await auth.client.from('pilot_members').select('user_id').eq('user_id',auth.user.id).maybeSingle();if(allowed.error)return reply({error:'Cloud setup is incomplete. Contact the administrator.'},503);if(!allowed.data)return reply({error:'Your account has not been approved for the pilot.'},403);
 const {data,error}=await auth.client.from('player_workspaces').select('payload,revision').eq('owner_id',auth.user.id).maybeSingle();
 if(error)return reply({error:'Cloud storage could not be loaded. Please try again.'},503);
 return reply({workspace:data?.payload??emptyWorkspace,revision:data?.revision??0});
}
export async function PUT(request:Request){
 // Cookies alone must never authorize a cross-site write.
 if(!sameOriginWrite(request))return reply({error:'This save must come from the companion.'},403);
 const auth=await identity();if(!auth)return reply({error:'Your session expired. Sign in again before saving.'},401);
 const allowed=await auth.client.from('pilot_members').select('user_id').eq('user_id',auth.user.id).maybeSingle();if(allowed.error)return reply({error:'Cloud setup is incomplete. Contact the administrator.'},503);if(!allowed.data)return reply({error:'Your account has not been approved for the pilot.'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'Expected a JSON workspace.'},415);
 let validated;
 try{const reader=request.body?.getReader();if(!reader)throw Error('Missing workspace.');let length=0;const parts:Uint8Array[]=[];for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>MAX_CLOUD_BYTES){await reader.cancel();return reply({error:'Workspace exceeds the pilot size limit.'},413);}parts.push(value);}const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}validated=validateCloudSave(JSON.parse(new TextDecoder().decode(bytes)));}catch{return reply({error:'Workspace validation failed. Check your reports; no changes were saved.'},400);}
 const {workspace,revision}=validated;
 if(revision===0){const {data,error}=await auth.client.from('player_workspaces').insert({owner_id:auth.user.id,payload:workspace,revision:1}).select('revision').single();if(error?.code==='23505')return reply({error:'Another device saved first. Reload cloud data before trying again.'},409);if(error)return reply({error:'Cloud save failed. Your previous data is unchanged.'},503);return reply({revision:data.revision});}
 const {data,error}=await auth.client.from('player_workspaces').update({payload:workspace,revision:revision+1}).eq('owner_id',auth.user.id).eq('revision',revision).select('revision').maybeSingle();
 if(error)return reply({error:'Cloud save failed. Your previous data is unchanged.'},503);
 if(!data)return reply({error:'Another device changed this workspace. Reload cloud data before trying again.'},409);
 return reply({revision:data.revision});
}

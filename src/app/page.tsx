import {redirect} from 'next/navigation';
import CampaignRoom from '../components/campaign-room';
import {cloudConfigured} from '../lib/supabase/config';
import {serverClient} from '../lib/supabase/server';
export const dynamic='force-dynamic';
export default async function Page(){
 if(!cloudConfigured())return <CampaignRoom/>;
 const supabase=await serverClient();const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)redirect('/login');
 return <CampaignRoom key={user.id} account={{id:user.id,email:user.email||'Signed-in player'}}/>;
}

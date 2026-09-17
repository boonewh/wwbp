import Link from 'next/link';
import {redirect} from 'next/navigation';
import LoginForm from '../../components/login-form';
import {cloudConfigured} from '../../lib/supabase/config';
import {serverClient} from '../../lib/supabase/server';
export const dynamic='force-dynamic';
export default async function Login(){
 if(!cloudConfigured())return <main className="login-page"><h1>Cloud accounts are not connected yet</h1><p>The local companion is still available. Supabase project setup is needed before sign-in and cloud saves can be used.</p><Link href="/">Back to the browser workspace</Link></main>;
 const client=await serverClient();const {data:{user}}=await client.auth.getUser();if(user)redirect('/');
 return <LoginForm/>;
}

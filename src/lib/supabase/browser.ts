import {createBrowserClient} from '@supabase/ssr';
import {cloudConfig} from './config';
export function browserClient(){const {url,key}=cloudConfig();return createBrowserClient(url,key);}

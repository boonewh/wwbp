import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {cloudConfig} from './config';
export async function serverClient(){const {url,key}=cloudConfig();const jar=await cookies();return createServerClient(url,key,{cookies:{getAll(){return jar.getAll();},setAll(values){try{values.forEach(({name,value,options})=>jar.set(name,value,options));}catch{/* Server Component: proxy refreshes cookies before rendering. */}}}});}

import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {realpathSync,lstatSync,existsSync,rmSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const root=realpathSync(fileURLToPath(new URL('../../',import.meta.url)));
const syntheticBuild=resolve(root,'.next');
if(relative(root,syntheticBuild)!=='.next')throw Error('Unexpected synthetic build path');
let exitCode=0;
try{modes:for(const mode of ['demo','cloud']){
 const env={...process.env,WWBP_TEST_MODE:mode,NEXT_TELEMETRY_DISABLED:'1',
  NEXT_PUBLIC_SUPABASE_URL:mode==='cloud'?'http://127.0.0.1:4531':'',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:mode==='cloud'?'synthetic-publishable-key':''};
 console.log(`Checking synthetic ${mode} production build`);
 for(const command of [[require.resolve('next/dist/bin/next'),'build'],[require.resolve('@playwright/test/cli'),'test','--workers=1']]){
  const result=spawnSync(process.execPath,command,{cwd:root,env,stdio:'inherit',windowsHide:true});
  if(result.status!==0){exitCode=result.status??1;break modes;}
 }
}}finally{
 // The exact generated directory is inside this repository. Never retain a
 // synthetic cloud build that could later be mistaken for a release artifact.
 if(existsSync(syntheticBuild)){
  if(lstatSync(syntheticBuild).isSymbolicLink())throw Error('Refusing synthetic build cleanup through a link');
  rmSync(syntheticBuild,{recursive:true,force:true});
 }
}
process.exitCode=exitCode;

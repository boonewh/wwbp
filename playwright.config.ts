import {defineConfig,devices} from '@playwright/test';
const cloud=process.env.WWBP_TEST_MODE==='cloud';
export default defineConfig({
 testDir:'./tests/browser',fullyParallel:false,workers:1,retries:0,forbidOnly:!!process.env.CI,
 outputDir:`test-results/${cloud?'cloud':'demo'}`,
 reporter:'list',use:{baseURL:'http://127.0.0.1:3321',trace:'retain-on-failure'},
 projects:[
  {name:'desktop',testMatch:cloud?'cloud.spec.ts':'demo.spec.ts',use:{viewport:{width:1440,height:1000}}},
  {name:'mobile',testMatch:cloud?'cloud.spec.ts':'demo.spec.ts',use:{...devices['iPhone 13'],browserName:'chromium'}},
  ...(cloud?[{name:'api',testMatch:'api.spec.ts'}]:[]),
 ],
 webServer:[
  ...(cloud?[{command:'node --import tsx tests/fixtures/supabase.ts',url:'http://127.0.0.1:4531/health',reuseExistingServer:false}]:[]),
  {command:'node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3321',url:'http://127.0.0.1:3321/login',reuseExistingServer:false,timeout:60_000},
 ],
});

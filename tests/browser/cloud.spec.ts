import {test,expect} from '@playwright/test';
import {fixture,guardNetwork,seedSession,noOverflow} from './helpers';

test.beforeEach(async({context,request})=>{await guardNetwork(context);await request.post(fixture+'/__fixture/reset');});

test('invited email-code login establishes cookies and reloads the correct account',async({page,request})=>{
 await page.goto('/');await expect(page).toHaveURL(/\/login$/);
 await page.getByLabel('Email address',{exact:true}).fill('player-a@example.test');
 await page.getByRole('button',{name:'Send sign-in code',exact:true}).click();
 await expect(page.getByLabel('Email code',{exact:true})).toBeVisible();
 await page.getByLabel('Email code',{exact:true}).fill('123456');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Account A fictional campaign',exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('heading',{name:'Account A fictional campaign',exact:true})).toBeVisible();
 expect((await request.get(fixture+'/__fixture/stats').then(r=>r.json())).events.filter((e:{path:string})=>e.path==='/auth/v1/otp')).toEqual([expect.objectContaining({createUser:false})]);
 await noOverflow(page);
});

test('expired cookies refresh through the proxy without caching private responses',async({page,context,request})=>{
 await seedSession(context,request,'a',true);const response=await page.goto('/');
 await expect(page.getByRole('heading',{name:'Account A fictional campaign',exact:true})).toBeVisible();
 // Next manages HTML Vary; confidentiality depends on private/no-store, not
 // a literal Cookie entry on a response that must never enter a shared cache.
 expect(response?.headers()['cache-control']).toContain('no-store');expect(response?.headers()['cache-control']).toContain('private');
 const api=await context.request.get('/api/workspace');
 expect(api.headers()['cache-control']).toContain('no-store');expect(api.headers()['vary']).toContain('Cookie');
 const cookie=(await context.cookies()).find(item=>item.name==='sb-127-auth-token');expect(cookie).toBeDefined();
 const renewed=JSON.parse(Buffer.from(cookie!.value.replace(/^base64-/,''),'base64url').toString());
 expect(renewed.expires_at).toBeGreaterThan(Date.now()/1000);
 const state=await request.get(fixture+'/__fixture/stats').then(r=>r.json());
 expect(state.events.some((e:{path:string})=>e.path==='/auth/v1/token')).toBe(true);
 await page.reload();await expect(page.getByRole('heading',{name:'Account A fictional campaign',exact:true})).toBeVisible();
});

test('sign out removes account access without deleting the saved workspace',async({page,context,request})=>{
 await seedSession(context,request);await page.goto('/');
 await expect(page.getByRole('heading',{name:'Account A fictional campaign',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page).toHaveURL(/\/login$/);
 expect((await context.request.get('/api/workspace')).status()).toBe(401);
 const state=await request.get(fixture+'/__fixture/stats').then(r=>r.json());
 expect(state.rows['11111111-1111-4111-8111-111111111111'].revision).toBe(1);
 expect(state.events.some((e:{method:string,path:string})=>['POST','PATCH','DELETE'].includes(e.method)&&e.path==='/rest/v1/player_workspaces')).toBe(false);
});

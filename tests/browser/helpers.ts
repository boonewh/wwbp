import {expect,type BrowserContext,type Page,type APIRequestContext} from '@playwright/test';
export const fixture='http://127.0.0.1:4531';
export async function guardNetwork(context:BrowserContext){await context.route('**/*',route=>{
 const url=new URL(route.request().url());
 if(url.origin==='http://127.0.0.1:3321'||url.origin===fixture)return route.continue();
 return route.abort();
});}
export async function seedSession(context:BrowserContext,request:APIRequestContext,user='a',expired=false){
 const response=await request.get(`${fixture}/__fixture/session?user=${user}${expired?'&expired=1':''}`);
 const session=await response.json();
 await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),url:'http://127.0.0.1:3321'}]);
 return session;
}
export async function openNav(page:Page){
 const toggle=page.getByRole('button',{name:'Open navigation'});
 if(await toggle.isVisible()&&await page.locator('#sidebar').getAttribute('data-open')!=='true')await toggle.click();
}
export const campaignTitle=(page:Page)=>page.getByRole('banner').locator('.topbar-context strong');
export async function view(page:Page,name:string){
 await openNav(page);
 await page.getByRole('navigation',{name:'Campaign views'}).getByRole('button',{name,exact:true}).click();
}
export async function noOverflow(page:Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}

import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {demoReport,demoWorkspace} from '../../src/lib/demo';
import {guardNetwork,view,noOverflow} from './helpers';

test.beforeEach(async({context})=>guardNetwork(context));

test('fictional demo navigation and coordinated analysis remain available',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');await page.getByRole('button',{name:'Explore the fictional demo'}).click();
 await expect(page.getByRole('heading',{name:'Practice campaign A',exact:true})).toBeVisible();
 await view(page,'Analysis');await page.getByRole('button',{name:'Coordinated orders',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Coordinated orders',exact:true})).toBeVisible();
 await page.locator('select[name=campaign]').selectOption('demo-b');
 await view(page,'Map & intelligence');
 await expect(page.getByRole('heading',{name:'Practice campaign B',exact:true})).toBeVisible();
 await noOverflow(page);expect(errors).toEqual([]);
 await page.screenshot({path:info.outputPath('demo.png'),fullPage:true});
 expect(await page.evaluate(()=>localStorage.getItem('wwbp.online.workspace.v1'))).toBeNull();
});

test('synthetic paste import persists and exports the same campaign',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Add campaign',exact:true}).click();
 await page.getByLabel('Campaign name',{exact:true}).fill('Synthetic saved campaign');
 await page.getByLabel('Game identifier',{exact:true}).fill('DEMO-C');
 await page.getByLabel('Player number',{exact:true}).fill('1');
 await page.getByRole('button',{name:'Create campaign'}).click();
 await page.getByRole('button',{name:'Import my reports',exact:true}).click();
 await page.getByLabel('Email report',{exact:true}).fill(demoReport('DEMO-C',1,9));
 await page.getByRole('button',{name:'Review pasted report'}).click();
 await page.getByRole('button',{name:'Confirm import'}).click();
 await expect(page.getByRole('heading',{name:'Synthetic saved campaign',exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('heading',{name:'Synthetic saved campaign',exact:true})).toBeVisible();
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:'Export campaign backup',exact:true}).click();
 const download=await downloadPromise;expect(download.suggestedFilename()).toBe('DEMO-C-campaign.json');
 const exported=JSON.parse(await readFile((await download.path())!,'utf8'));
 expect(exported.game).toBe('DEMO-C');expect(exported.reports).toHaveLength(1);
 expect(exported.reports[0].text).toContain('DEMONSTRATION');
 await noOverflow(page);
});

test('unsaved order drafts guard campaign switching and survive a saved reload',async({page})=>{
 await page.addInitScript(state=>{if(!localStorage.getItem('wwbp.online.workspace.v1'))localStorage.setItem('wwbp.online.workspace.v1',JSON.stringify(state));},demoWorkspace());
 await page.goto('/');await expect(page.getByRole('heading',{name:'Practice campaign A',exact:true})).toBeVisible();
 await view(page,'Order editor');const text='@\n2A\n@AAL\nBA1';await page.getByLabel('Your orders',{exact:true}).fill(text);
 await expect(page.locator('select[name=campaign]')).toBeDisabled();
 await expect(page.getByRole('button',{name:'Import my reports',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Save draft',exact:true}).click();
 await expect(page.locator('select[name=campaign]')).toBeEnabled();
 await page.reload();await expect(page.getByRole('heading',{name:'Practice campaign A',exact:true})).toBeVisible();
 await view(page,'Order editor');await expect(page.getByLabel('Your orders',{exact:true})).toHaveValue(text);
 await noOverflow(page);
});

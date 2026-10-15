import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { WORKSPACES, ROUTES } from '../client/src/data/nav.js';
import { canAccess } from '../client/src/utils/access.js';
import { exportedAuthorizationFixture } from './helpers/exported-authorization.mjs';
const origin='http://127.0.0.1:5179';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5179','--strictPort'],{
  env:{...process.env,VITE_SUPABASE_URL:'http://127.0.0.1:59999',VITE_SUPABASE_PUBLISHABLE_KEY:'test-only-key'},stdio:'pipe',windowsHide:true,
});
let browser, fixture;
try {
  await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(new Error('Preview did not start')),20000);
    server.stdout.on('data',data=>{if(data.toString().includes('127.0.0.1')){clearTimeout(timeout);resolve();}});
    server.on('exit',code=>{clearTimeout(timeout);reject(new Error(`Preview exited ${code}`));});
  });
  browser=await chromium.launch({channel:'msedge',headless:true});
  fixture=await exportedAuthorizationFixture();
  async function scenario(workspace,options={}) {
    const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
    const page=await context.newPage();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const code=({hr:'hr_administrator',support:'support_agent'})[workspace?.id]||workspace?.id||'employee';
    const resolved=await fixture.accessFor(code);
    if(options.multirole) {
      resolved.roles.push({id:5,code:'support_agent',name:'Support Agent'});
      resolved.permissions=[...new Set([...resolved.permissions,...(await fixture.accessFor('support_agent')).permissions])];
    }
    const user={id:resolved.profile.id,email:'staff@example.test',aud:'authenticated',role:'authenticated'};
    let denied=options.denied, saved=null, adminRequests=0;
    await context.route('http://127.0.0.1:59999/**',async route=>{
      const path=new URL(route.request().url()).pathname;
      let body={},status=200;
      if(path==='/auth/v1/token') body={access_token:'test-token',refresh_token:'test-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
      else if(path==='/auth/v1/user') body=user;
      else if(path==='/auth/v1/logout') status=204;
      else if(path.endsWith('/get_access_context')) {
        if(options.delay) await new Promise(resolve=>setTimeout(resolve,options.delay));
        body={...resolved,active:!denied,profile:{...user,first_name:'Test',last_name:'Staff'},roles:denied?[]:resolved.roles,permissions:denied?[]:resolved.permissions};
        if(options.failure){status=503;body={message:'Unavailable'};}
      } else if(path.endsWith('/get_role_administration')) {
        adminRequests++;
        body={roles:[{id:1,name:'Admin',permissions:['role.assign']},{id:2,name:'Employee',permissions:['profile.self']}],accounts:[{id:user.id,email:user.email,is_active:true,role_ids:[1]}]};
      } else if(path.endsWith('/set_user_roles')){saved=route.request().postDataJSON();status=204;}
      else if(path.endsWith('/get_access_audit')){adminRequests++;body=[];}
      else {status=404;body={message:'Unexpected request'};}
      await route.fulfill({status,contentType:'application/json',body:status===204?'':JSON.stringify(body)});
    });
    await context.route('https://**',route=>route.abort());
    await page.goto(`${origin}/#/${options.returnTo||'login'}`);
    await page.getByLabel('Email',{exact:true}).fill(user.email);
    await page.getByLabel('Password',{exact:true}).fill('test-password');
    await page.getByRole('button',{name:'Log In',exact:true}).click();
    if(options.delay){await page.getByText('Signing you in…',{exact:true}).waitFor();assert.equal(await page.locator('.nx-sidebar').count(),0);}
    if(options.failure||options.denied){
      await page.locator('.nx-error__code').filter({hasText:options.failure?'503':'403'}).waitFor();
      assert.equal(await page.locator('.nx-sidebar').count(),0);
    } else {
      const requested=ROUTES.find(item=>item.route===`#/${options.returnTo}`);
      const target=canAccess(requested,resolved.permissions)?options.returnTo:'dashboard';
      await page.waitForURL(`**/#/${target}`);
      await page.locator('.nx-sidebar').waitFor();
      if(workspace && target==='dashboard') await page.getByRole('heading',{name:workspace.label,exact:true}).waitFor();
      if(options.multirole){
        await page.getByLabel('Workspace',{exact:true}).selectOption('support');
        await page.getByRole('heading',{name:'Support Operations',exact:true}).waitFor();
        assert.equal(new URL(page.url()).hash,'#/dashboard');
        await page.reload();
        await page.getByRole('heading',{name:'Support Operations',exact:true}).waitFor();
        await page.getByLabel('Workspace',{exact:true}).selectOption('employee');
        await page.locator('.nx-welcome-card__title').waitFor();
        assert.equal(new URL(page.url()).hash,'#/dashboard');
        await page.getByLabel('Workspace',{exact:true}).selectOption('admin');
      }
      // Attempt every other workspace's protected feature by its neutral URL.
      for(const other of WORKSPACES.filter(item=>!resolved.permissions.includes(item.permission))){
        const item=ROUTES.find(route=>route.workspace===other.id);
        const requestsBefore=adminRequests;
        await page.goto(`${origin}/${item.route}`);
        await page.getByRole('heading',{name:"You don't have access to this page"}).waitFor();
        assert.equal(adminRequests,requestsBefore,'denied child must not fetch protected data');
      }
      await page.goto(`${origin}/#/dashboard`);
      await page.locator('.nx-sidebar').waitFor();
      const links=await page.locator('.nx-sidebar a').evaluateAll(items=>items.map(item=>item.getAttribute('href')));
      for(const link of links) assert.doesNotMatch(link,/^#\/(admin|manager|hr|support)(\/|$)/);
      if(workspace?.id==='admin'){
        await page.getByRole('link',{name:'Roles & Permissions Open →'}).click();
        await page.waitForURL('**/#/roles-permissions');
        await page.getByRole('button',{name:`Edit roles for ${user.email}`}).click();
        await page.getByLabel('Employee',{exact:true}).check();
        await page.getByLabel('Reason for change').fill('Assign employee access');
        await page.getByRole('button',{name:'Save role assignments'}).click();
        await page.getByText('Role assignments saved.').waitFor();
        assert.deepEqual(saved.assigned_roles,[1,2]);
        await page.setViewportSize({width:390,height:844});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
        await page.screenshot({path:'tests/rbac-admin-mobile.png',fullPage:true});
        await page.setViewportSize({width:1280,height:900});
        await page.goto(`${origin}/#/dashboard`);
        await page.getByRole('heading',{name:workspace.label,exact:true}).waitFor();
        await page.screenshot({path:'tests/rbac-admin-desktop.png',fullPage:true});
      }
      await page.goto(`${origin}/#/not-a-route`);
      await page.getByRole('heading',{name:"We couldn't find that page"}).waitFor();
      denied=true;
      await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
      await page.locator('.nx-error__code').filter({hasText:'403'}).waitFor();
      assert.equal(await page.locator('.nx-sidebar').count(),0);
      await page.getByRole('button',{name:'Sign out',exact:true}).click();
      await page.getByRole('button',{name:'Log In',exact:true}).waitFor();
    }
    assert.deepEqual(errors,[]);
    await context.close();
    console.log(`PASS browser ${workspace?.id||'employee'} ${JSON.stringify(options)}`);
  }
  for(const workspace of WORKSPACES) await scenario(workspace);
  await scenario(null,{returnTo:'settings',delay:300});
  await scenario(null,{returnTo:'accounts'});
  await scenario(WORKSPACES.find(item=>item.id==='admin'),{returnTo:'accounts'});
  await scenario(WORKSPACES.find(item=>item.id==='admin'),{multirole:true});
  await scenario(null,{denied:true});
  await scenario(null,{failure:true});
} finally {
  await browser?.close();
  await fixture?.db.close();
  server.kill();
}

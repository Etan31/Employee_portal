import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { WORKSPACES } from '../client/src/data/nav.js';
import { exportedAuthorizationFixture } from './helpers/exported-authorization.mjs';
const port = 5179;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  env: {...process.env, VITE_SUPABASE_URL:'http://127.0.0.1:59999', VITE_SUPABASE_PUBLISHABLE_KEY:'test-only-key'}, stdio:'pipe', windowsHide:true,
});
let browser;
let fixture;
try {
  await new Promise((resolve, reject) => {
    const timeout=setTimeout(()=>reject(new Error('Preview did not start')),20000);
    server.stdout.on('data',data=>{ if(data.toString().includes('127.0.0.1')) {clearTimeout(timeout);resolve();} });
    server.on('exit',code=>{clearTimeout(timeout);reject(new Error(`Preview exited ${code}`));});
  });
  browser=await chromium.launch({channel:'msedge',headless:true});
  fixture=await exportedAuthorizationFixture();
  async function scenario(workspace, options={}) {
    const context=await browser.newContext({viewport:{width:1280,height:900}, reducedMotion:'reduce'});
    const page=await context.newPage();
    const errors=[]; page.on('pageerror',error=>errors.push(error.message));
    const code=({hr:'hr_administrator',support:'support_agent'})[workspace?.id] || workspace?.id || 'employee';
    const resolved=await fixture.accessFor(code);
    const permissions=resolved.permissions;
    let denied=options.denied;
    const user={id:resolved.profile.id,email:'staff@example.test',aud:'authenticated',role:'authenticated'};
    let saved=null;
    await context.route('http://127.0.0.1:59999/**',async route=>{
      const path=new URL(route.request().url()).pathname;
      let body={}; let status=200;
      if(path==='/auth/v1/token') body={access_token:'test-token',refresh_token:'test-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
      else if(path==='/auth/v1/user') body=user;
      else if(path==='/auth/v1/logout') status=204;
      else if(path.endsWith('/get_access_context')) {
        if(options.delay) await new Promise(resolve=>setTimeout(resolve,options.delay));
        body={active:!denied,profile:{...user,first_name:'Test',last_name:'Staff'},roles:denied?[]:resolved.roles,permissions:denied?[]:permissions};
        if(options.failure) {status=503;body={message:'Unavailable'};}
      } else if(path.endsWith('/get_role_administration')) body={roles:[{id:1,name:'Admin',permissions:['role.assign']},{id:2,name:'Employee',permissions:['profile.self']}],accounts:[{id:user.id,email:user.email,is_active:true,role_ids:[1]}]};
      else if(path.endsWith('/set_user_roles')) {saved=route.request().postDataJSON();status=204;}
      else if(path.endsWith('/get_access_audit')) body=[];
      else {status=404;body={message:'Unexpected request'};}
      await route.fulfill({status,contentType:'application/json',body:status===204?'':JSON.stringify(body)});
    });
    await context.route('https://**',route=>route.abort());
    await page.goto(`${origin}/#/${options.returnTo||'login'}`);
    await page.getByLabel('Email',{exact:true}).fill(user.email);
    await page.getByLabel('Password',{exact:true}).fill('test-password');
    await page.getByRole('button',{name:'Log In',exact:true}).click();
    if(options.delay) {await page.getByText('Signing you in…',{exact:true}).waitFor();assert.equal(await page.locator('.nx-sidebar').count(),0);}
    if(options.failure||options.denied) {
      await page.locator('.nx-error__code').filter({hasText:options.failure?'503':'403'}).waitFor();
      assert.equal(await page.locator('.nx-sidebar').count(),0);
    } else {
      const target=options.returnTo==='settings'?'settings':workspace?.id||'dashboard';
      await page.waitForURL(`**/#/${target}`);
      await page.locator('.nx-sidebar').waitFor();
      if(workspace) await page.getByRole('heading',{name:workspace.label,exact:true}).waitFor();
      for (const other of WORKSPACES.filter(item => item.id !== workspace?.id)) {
        assert.equal(await page.locator(`.nx-sidebar a[href="#/${other.id}"]`).count(),0);
        await page.evaluate(id=>{window.location.hash=`#/${id}`;},other.id);
        await page.getByRole('heading',{name:"You don't have access to this page"}).waitFor();
        await page.evaluate(id=>{window.location.hash=`#/${id}/${({admin:'roles',hr:'employee-records',manager:'leave-approvals',support:'queues'})[id]}`;},other.id);
        await page.getByRole('heading',{name:"You don't have access to this page"}).waitFor();
      }
      await page.goto(`${origin}/#/${target}`);
      await page.locator('.nx-sidebar').waitFor();
      if(!workspace) {
        await page.goto(`${origin}/#/admin/roles`);
        await page.getByRole('heading',{name:"You don't have access to this page"}).waitFor();
        assert.equal(await page.getByRole('button',{name:'Edit roles',exact:true}).count(),0);
        await page.goto(`${origin}/#/not-a-route`);
        await page.getByRole('heading',{name:"We couldn't find that page"}).waitFor();
      }
      if(workspace?.id==='admin') {
        await page.getByRole('link',{name:'Roles & Permissions Open →'}).click();
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
        await page.goto(`${origin}/#/admin`);
        await page.getByRole('heading',{name:workspace.label,exact:true}).waitFor();
        await page.screenshot({path:'tests/rbac-admin-desktop.png',fullPage:true});
      }
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
  await scenario(null,{denied:true});
  await scenario(null,{failure:true});
} finally {
  await browser?.close();
  await fixture?.db.close();
  server.kill();
}

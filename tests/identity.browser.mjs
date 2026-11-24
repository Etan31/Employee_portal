import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const origin='http://127.0.0.1:5181';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5181','--strictPort'],{
  env:{...process.env,VITE_SUPABASE_URL:'http://127.0.0.1:59998',VITE_SUPABASE_PUBLISHABLE_KEY:'test-only-key'},stdio:'pipe',windowsHide:true,
});
let browser;
try {
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Preview timeout')),20000);
    server.stdout.on('data',chunk=>{if(chunk.toString().includes('127.0.0.1')){clearTimeout(timer);resolve();}});
    server.on('exit',code=>{clearTimeout(timer);reject(new Error(`Preview exited ${code}`));});});
  browser=await chromium.launch({channel:'msedge',headless:true});
  for(const persona of ['hr','admin','employee','invite']) {
    const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
    const page=await context.newPage(); const errors=[]; page.on('pageerror',error=>errors.push(error.message));
    const user={id:'00000000-0000-0000-0000-000000000001',email:'staff@example.test',aud:'authenticated',role:'authenticated'};
    let accepted=false, saved, requested=false, suspended=false;
    const permissions=['dashboard.read','directory.read','org.read','profile.self',...(persona==='hr'?['hr.workspace','employee.update_employment']:persona==='admin'?['admin.workspace','account.read','account.invite','account.deactivate']:[])];
    const record={id:'00000000-0000-0000-0000-000000000002',first_name:'New',last_name:'Staff',work_email:'new@example.test',employee_no:'N-2',job_title:'Coordinator',department_id:'dept',department:'Operations',employment_status:'pending_onboarding',account_status:'invited',invitation_state:'requested'};
    await context.route('http://127.0.0.1:59998/**',async route=>{
      const path=new URL(route.request().url()).pathname; let body={},status=200;
      if(path==='/auth/v1/token') body={access_token:'token',refresh_token:'refresh',expires_in:3600,token_type:'bearer',user};
      else if(path==='/auth/v1/user') body=user;
      else if(path.endsWith('/get_access_context')) body={active:persona!=='invite'||accepted,onboarding:persona==='invite'&&!accepted,
        profile:{...user,first_name:'Test',last_name:'Staff'},roles:[{code:'employee',name:'Employee'}],permissions};
      else if(path.endsWith('/staff_administration')) body={departments:[{id:'dept',name:'Operations'}],employees:[{...record,account_status:persona==='admin'?'active':record.account_status}]};
      else if(path.endsWith('/save_staff_record')) {saved=route.request().postDataJSON();body=record.id;}
      else if(path.endsWith('/set_staff_access')) {suspended=route.request().postDataJSON();status=204;}
      else if(path.endsWith('/request_staff_invitation')) {requested=true;status=204;}
      else if(path.endsWith('/staff_directory')) body=[record];
      else if(path.endsWith('/my_staff_record')) body={...record,company:'Nexus',timezone:'Asia/Manila'};
      else if(path.endsWith('/accept_staff_invitation')) {accepted=true;status=204;}
      else {status=404;body={message:'Unexpected request'};}
      await route.fulfill({status,contentType:'application/json',body:status===204?'':JSON.stringify(body)});
    });
    await context.route('https://**',route=>route.abort());
    await page.goto(`${origin}/#/login`);
    await page.getByLabel('Email',{exact:true}).fill(user.email); await page.getByLabel('Password',{exact:true}).fill('test-password');
    await page.getByRole('button',{name:'Log In',exact:true}).click();
    if(persona==='invite') {
      await page.getByRole('heading',{name:'Complete your account setup'}).waitFor();
      await page.getByLabel('New password').fill('long-enough-password');
      await page.getByRole('checkbox').check(); await page.getByRole('button',{name:'Complete account setup',exact:true}).click();
      await page.waitForURL('**/#/dashboard'); assert.equal(accepted,true);
    } else {
      await page.waitForURL('**/#/dashboard');
      if(persona==='hr') {
        await page.goto(`${origin}/#/employee-lifecycle`); await page.getByRole('button',{name:'Add staff member'}).click();
        for(const [label,value] of Object.entries({'Staff number':'N-123','First name':'Jamie','Last name':'Smith','Work email':'jamie@example.test','Job title':'Coordinator','Start date':'2026-10-15'})) await page.getByLabel(label,{exact:true}).fill(value);
        await page.getByLabel('Department',{exact:true}).selectOption('dept'); await page.getByLabel('Reason',{exact:true}).fill('Approved new hire');
        await page.getByRole('button',{name:'Save staff record'}).click(); await page.getByText('Staff record saved.',{exact:true}).waitFor();
        assert.equal(saved.fields.work_email,'jamie@example.test'); assert.equal(saved.record_id,null);
      } else if(persona==='admin') {
        await page.goto(`${origin}/#/accounts`); await page.getByRole('button',{name:'Suspend',exact:true}).click();
        await page.getByLabel('Reason',{exact:true}).fill('Review account access'); await page.getByRole('button',{name:'Confirm access change'}).click();
        await page.getByText('Account access updated.',{exact:true}).waitFor(); assert.equal(suspended.new_status,'suspended');
      } else {
        await page.goto(`${origin}/#/employees`); await page.getByRole('heading',{name:'New Staff',exact:true}).waitFor();
        await page.getByLabel('Search employees by name or position').fill('missing'); await page.getByText('No one matches your search.').waitFor();
        await page.goto(`${origin}/#/profile`); await page.getByRole('heading',{name:'Employment details'}).waitFor();
        assert.equal(await page.getByText('private@example.test').count(),0);
      }
      await page.setViewportSize({width:390,height:844});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
      await page.screenshot({path:`tests/identity-${persona}-mobile.png`,fullPage:true});
    }
    assert.equal(requested,false); assert.deepEqual(errors,[]);
    await context.close(); console.log(`PASS identity browser ${persona}`);
  }
} finally { await browser?.close(); server.kill(); }

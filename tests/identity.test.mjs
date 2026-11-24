import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const ids = Object.fromEntries(['admin','hr','manager','employee','other','support','admin2'].map((r,i) => [r, `00000000-0000-0000-0000-${String(i+1).padStart(12,'0')}`]));
let department, staff;
async function as(name) {
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role','authenticated',false)",[ids[name] || name]);
  await db.exec('SET ROLE authenticated');
}
async function rpc(name,args=[]) { return (await db.query(`SELECT public.${name}(${args.map((_,i)=>`$${i+1}`).join(',')}) AS result`,args)).rows[0].result; }
before(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}',email_confirmed_at timestamptz,invited_at timestamptz);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;`);
  await db.exec(fs.readFileSync('supabase/bootstrap.sql','utf8'));
  for(const [name,id] of Object.entries(ids)) {
    await db.query('INSERT INTO auth.users(id,email) VALUES($1,$2)',[id,`${name}@example.test`]);
    const role=({hr:'hr administrator',support:'support agent',admin2:'admin'})[name] || (['admin','manager'].includes(name)?name:'employee');
    await db.query('UPDATE public.profiles SET role_id=(SELECT id FROM public.roles WHERE name=$1) WHERE id=$2',[role,id]);
  }
  for(const file of ['006_rbac.sql','007_hr_support_authorization.sql','008_identity_foundation.sql']) await db.exec(fs.readFileSync(`supabase/migrations/${file}`,'utf8'));
});
after(()=>db.close());
test('all five personas retain baseline access and private data stays HR scoped',async()=>{
  await db.exec('RESET ROLE');
  await db.exec("INSERT INTO public.employee_private SELECT id,'private@example.test',NULL,NULL FROM public.employees");
  for(const role of ['admin','hr','manager','employee','support']) {
    await as(role);
    const access=await rpc('get_access_context');
    assert.equal(access.active,true);
    assert.ok(access.permissions.includes('profile.self'));
    assert.equal((await rpc('staff_directory')).length,7);
    assert.equal((await db.query('SELECT * FROM public.employee_private')).rows.length,role==='hr'?7:0);
    await assert.rejects(db.query('SELECT * FROM public.employees'),/permission denied/);
  }
});
test('HR creates staff and transfers change current team visibility without a new JWT',async()=>{
  await as('hr'); department=await rpc('create_department',['Operations']);
  const fields={employee_no:'N-100',first_name:'New',last_name:'Staff',work_email:'new@example.test',job_title:'Coordinator',hire_date:'2026-10-15',department_id:department,manager_id:null};
  staff=await rpc('save_staff_record',[null,fields,'Hire approved']);
  await rpc('request_staff_invitation',[staff]);
  await as('employee'); await assert.rejects(rpc('save_staff_record',[null,fields,'Unauthorized']),/Access denied/);
  await as('hr');
  const rows=(await rpc('staff_administration')).employees;
  const manager=rows.find(e=>e.auth_user_id===ids.manager);
  const employee=rows.find(e=>e.auth_user_id===ids.employee);
  const update={...fields,employee_no:employee.employee_no,work_email:employee.work_email,manager_id:manager.id};
  await rpc('save_staff_record',[employee.id,update,'Assign manager']);
  await as('manager'); assert.equal((await rpc('staff_directory',[true])).length,1);
  await as('hr'); await rpc('save_staff_record',[employee.id,{...update,manager_id:null},'Transfer reporting']);
  await as('manager'); assert.equal((await rpc('staff_directory',[true])).length,0);
});
test('invitation links only verified identity and cannot be activated by status bypass',async()=>{
  await as('admin'); await assert.rejects(rpc('set_staff_access',[staff,'suspended','Bypass invite']),/Invalid account transition/);
  await assert.rejects(rpc('claim_staff_invitation',[ids.admin,staff]),/permission denied/);
  await db.exec('RESET ROLE');
  const invited='00000000-0000-0000-0000-000000000099';
  await db.query('INSERT INTO auth.users(id,email) VALUES($1,$2)',[invited,'new@example.test']);
  await db.exec("SELECT set_config('request.jwt.claim.role','service_role',false); SET ROLE service_role");
  const claim=await rpc('claim_staff_invitation',[ids.admin,staff]);
  await assert.rejects(rpc('claim_staff_invitation',[ids.admin,staff]),/already in progress/);
  await rpc('finish_staff_invitation',[ids.admin,staff,claim.attempt_id,invited]);
  await as(invited); assert.equal((await rpc('get_access_context')).active,false);
  await assert.rejects(rpc('accept_staff_invitation'),/verified/);
  await db.exec('RESET ROLE'); await db.query('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1',[invited]);
  await as(invited); await rpc('accept_staff_invitation');
  assert.equal((await rpc('get_access_context')).active,true);
  assert.deepEqual((await rpc('get_access_context')).roles.map(r=>r.code),['employee']);
  await assert.rejects(rpc('accept_staff_invitation'),/verified/);
  await as('admin'); await rpc('set_staff_access',[staff,'suspended','Security investigation']);
  await db.exec('RESET ROLE');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.identity_sync_jobs WHERE user_id=$1',[invited])).rows[0].n,1);
  await as(invited); assert.equal((await rpc('get_access_context')).active,false);
  await assert.rejects(rpc('staff_directory'),/Access denied/);
  await as('admin'); await rpc('set_staff_access',[staff,'active','Investigation resolved']);
  await rpc('set_staff_access',[staff,'deactivated','Employment ended']);
  await as(invited); assert.equal((await rpc('get_access_context')).active,false);
  await as('admin'); await assert.rejects(rpc('set_staff_access',[staff,'active','Reactivate']),/Invalid account transition/);
});
test('cross-company directory, private records and role writes denied; expired roles denied',async()=>{
  await db.exec('RESET ROLE');
  const company=(await db.query("INSERT INTO public.companies(name) VALUES('Other') RETURNING id")).rows[0].id;
  await db.query('UPDATE public.employees SET company_id=$1 WHERE auth_user_id=$2',[company,ids.other]);
  await as('admin'); await assert.rejects(rpc('set_user_roles',[ids.other,[],'Cross company']),/Access denied/);
  assert.ok(!(await rpc('get_role_administration')).accounts.some(a=>a.id===ids.other));
  await as('hr'); assert.equal((await db.query('SELECT * FROM public.employee_private')).rows.length,6);
  await db.exec('RESET ROLE');
  await db.query("UPDATE public.user_roles SET starts_at=now()-interval '2 days',ends_at=now()-interval '1 day' WHERE user_id=$1",[ids.support]);
  await as('support'); assert.deepEqual((await rpc('get_access_context')).permissions,[]);
});
test('last administrator, self suspension, audit writes and employment mass assignment are blocked',async()=>{
  await as('admin');
  const rows=(await rpc('staff_administration')).employees;
  const admin=rows.find(e=>e.auth_user_id===ids.admin), second=rows.find(e=>e.auth_user_id===ids.admin2);
  await assert.rejects(rpc('set_staff_access',[admin.id,'suspended','Self suspend']),/Invalid account transition/);
  await rpc('set_staff_access',[second.id,'suspended','Disable secondary admin']);
  await assert.rejects(rpc('set_user_roles',[ids.admin,[],'Remove final admin']),/Keep at least one/);
  await assert.rejects(db.query("DELETE FROM public.staff_audit"),/permission denied/);
  await assert.rejects(db.query("UPDATE public.employees SET employment_status='active'"),/permission denied/);
  await as('hr');
  await assert.rejects(rpc('save_staff_record',[staff,{role_id:1},'Escalate privileges']),/valid staff fields/);
});

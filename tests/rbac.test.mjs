import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { ROUTES, WORKSPACES } from '../client/src/data/nav.js';
import { canAccess, homeRoute, loginDestination, authorizedWorkspace } from '../client/src/utils/access.js';

const db = new PGlite();
const ids = Object.fromEntries(['admin', 'employee', 'manager', 'hr_administrator', 'support_agent', 'other', 'custom', 'inactive', 'unassigned'].map((name, index) => [name, `00000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`]));
async function asUser(name) {
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claim.role', 'authenticated', false)", [ids[name]]);
  await db.exec('SET ROLE authenticated');
}
async function owner() { await db.exec('RESET ROLE'); }
async function context(name) {
  await asUser(name);
  const { rows } = await db.query('SELECT public.get_access_context() AS access');
  return rows[0].access;
}
before(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}'::jsonb);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role', true) $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;`);
  await db.exec(fs.readFileSync('supabase/bootstrap.sql', 'utf8'));
  for (const [name, id] of Object.entries(ids)) {
    await db.query('INSERT INTO auth.users(id, email) VALUES ($1, $2)', [id, `${name}@example.test`]);
  }
  // Use the actual bootstrap role names supplied for this project.
  for (const role of ['admin', 'manager', 'hr_administrator', 'support_agent']) {
    await db.query('UPDATE public.profiles SET role_id = (SELECT id FROM public.roles WHERE name = $1) WHERE id = $2',
      [({hr_administrator:'hr administrator', support_agent:'support agent'})[role] || role, ids[role]]);
  }
  // Reproduce a legacy recursive policy from rls-setup; the migration must replace it.
  await db.exec(`CREATE POLICY profiles_admin_select_all ON public.profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name = 'admin')
  );`);
  await db.exec(fs.readFileSync('supabase/migrations/006_rbac.sql', 'utf8'));
  await db.query('UPDATE public.profiles SET is_active = false WHERE id = $1', [ids.inactive]);
  await db.query('DELETE FROM public.user_roles WHERE user_id = $1', [ids.unassigned]);
  await db.query("INSERT INTO public.notifications(user_id, title) VALUES ($1, 'Private notice')", [ids.inactive]);
});
after(async () => db.close());

test('all five existing roles migrate to explicit grants and correct homes', async () => {
  for (const [role, route] of Object.entries({admin:'#/dashboard', employee:'#/dashboard', manager:'#/dashboard', hr_administrator:'#/dashboard', support_agent:'#/dashboard'})) {
    const access = await context(role);
    assert.equal(access.active, true);
    assert.ok(access.roles.some(item => item.code === role));
    assert.equal(homeRoute(ROUTES, access.permissions), route);
    assert.equal(canAccess(ROUTES.find(item => item.id === 'profile'), access.permissions), true);
  }
});
test('employee cannot enter any elevated route, including hidden children', async () => {
  const access = await context('employee');
  for (const route of ROUTES.filter(item => item.workspace)) assert.equal(canAccess(route, access.permissions), false, route.id);
  assert.equal(canAccess({ id:'missing-policy' }, access.permissions), false);
  assert.equal(loginDestination(ROUTES, access.permissions, 'admin/roles'), '#/dashboard');
  assert.equal(loginDestination(ROUTES, access.permissions, 'https://evil.test'), '#/dashboard');
  assert.equal(loginDestination(ROUTES, access.permissions, 'settings'), '#/settings');
});
test('database prevents cross-user profile reads and self escalation', async () => {
  await asUser('employee');
  assert.equal((await db.query('SELECT id FROM public.profiles')).rows.length, 1);
  await assert.rejects(db.query('SELECT role_id FROM public.profiles'), /permission denied/);
  assert.equal((await db.query('SELECT public.is_admin() AS allowed')).rows[0].allowed, false);
  await assert.rejects(db.query('UPDATE public.profiles SET is_active = false'), /permission denied/);
  await assert.rejects(db.query('UPDATE public.profiles SET role_id = 1'), /permission denied/);
  await assert.rejects(db.query('INSERT INTO public.user_roles(user_id, role_id) VALUES ($1, 1)', [ids.employee]), /permission denied/);
  await assert.rejects(db.query('SELECT public.get_access_context($1)', [ids.admin]), /Access denied/);
  await assert.rejects(db.query('SELECT public.get_role_administration()'), /Access denied/);
  await assert.rejects(db.query('SELECT public.get_access_audit()'), /Access denied/);
  await db.query("UPDATE public.profiles SET first_name = 'Updated' WHERE id = $1", [ids.employee]);
});
test('system admin sees account metadata, not private profiles or HR capabilities', async () => {
  const access = await context('admin');
  assert.equal((await db.query('SELECT public.is_admin() AS allowed')).rows[0].allowed, true);
  assert.equal(access.permissions.includes('employee.read_private'), false);
  assert.equal((await db.query('SELECT id FROM public.profiles')).rows.length, 1);
  const { rows } = await db.query('SELECT public.get_role_administration() AS result');
  assert.ok(rows[0].result.accounts.length >= 5);
  assert.deepEqual(Object.keys(rows[0].result.accounts[0]).sort(), ['email','id','is_active','role_ids']);
});
test('inactive and unassigned users fail closed', async () => {
  const inactive = await context('inactive');
  assert.equal(inactive.active, false);
  assert.deepEqual(inactive.permissions, []);
  assert.equal((await db.query('SELECT id FROM public.profiles')).rows.length, 0);
  assert.equal((await db.query('SELECT * FROM public.notifications')).rows.length, 0);
  assert.deepEqual((await context('unassigned')).permissions, []);
});
test('custom and multiple roles reuse capabilities without client changes', async () => {
  await owner();
  await db.exec("INSERT INTO public.roles(name, code) VALUES ('Team Coordinator', 'coordinator'); INSERT INTO public.role_permissions SELECT id, 'manager.workspace' FROM public.roles WHERE code = 'coordinator';");
  await db.query("INSERT INTO public.user_roles SELECT $1, id, NULL, now() FROM public.roles WHERE code = 'coordinator'", [ids.custom]);
  const custom = await context('custom');
  assert.equal(homeRoute(ROUTES, custom.permissions), '#/dashboard');
  await owner();
  await db.query("INSERT INTO public.user_roles SELECT $1, id, NULL, now() FROM public.roles WHERE code = 'support_agent'", [ids.manager]);
  const multi = await context('manager');
  assert.ok(multi.permissions.includes('support.workspace'));
  assert.ok(multi.permissions.includes('manager.workspace'));
  assert.equal(authorizedWorkspace(WORKSPACES, multi.permissions, 'support').id, 'support');
});
test('role changes are atomic, audited, and protect the last administrator', async () => {
  await asUser('admin');
  await assert.rejects(db.query('SELECT public.set_user_roles($1, $2, $3)', [ids.admin, [], 'Remove admin']), /Keep at least one/);
  assert.ok((await context('admin')).permissions.includes('role.assign'));
  await assert.rejects(db.query('SELECT public.set_user_roles($1, $2, $3)', [ids.employee, [999999], 'Invalid role']), /Unknown role/);
  await assert.rejects(db.query('SELECT public.set_user_roles($1, $2, $3)', [ids.employee, [], '']), /reason/);
  await db.query('SELECT public.set_user_roles($1, $2, $3)', [ids.other, [], 'Remove portal access']);
  const audit = (await db.query('SELECT public.get_access_audit() AS rows')).rows[0].rows;
  assert.equal(audit.length, 1);
  assert.equal(audit[0].target_user_id, ids.other);
  assert.equal(audit[0].actor_id, ids.admin);
  assert.deepEqual((await context('other')).permissions, []);
  assert.equal((await db.query('SELECT id FROM public.profiles')).rows.length, 0);
  await asUser('employee');
  await assert.rejects(db.query('SELECT public.set_user_roles($1, $2, $3)', [ids.employee, [], 'Self change']), /Access denied/);
});
test('new signups receive no active staff access; anonymous RPCs are denied', async () => {
  await owner();
  const id = '00000000-0000-0000-0000-000000000099';
  await db.query("INSERT INTO auth.users(id, email, raw_user_meta_data) VALUES ($1, 'new@example.test', '{\"role\":\"admin\"}')", [id]);
  const profile = (await db.query('SELECT is_active, role_id FROM public.profiles WHERE id = $1', [id])).rows[0];
  assert.equal(profile.is_active, false); assert.equal(profile.role_id, null);
  assert.equal((await db.query('SELECT * FROM public.user_roles WHERE user_id = $1', [id])).rows.length, 0);
  await db.exec('SET ROLE anon');
  await assert.rejects(db.query('SELECT public.get_access_context()'), /permission denied/);
});

test('migration retries preserve revoked assignments, custom grants and audit history', async () => {
  await owner();
  await db.exec("DELETE FROM public.role_permissions WHERE role_id = (SELECT id FROM public.roles WHERE code = 'employee') AND permission_code = 'time.self';");
  await db.query('DELETE FROM public.user_roles WHERE user_id = $1 AND role_id = (SELECT id FROM public.roles WHERE code = $2)', [ids.manager, 'manager']);
  const snapshot = async () => ({
    roles: (await db.query('SELECT * FROM public.user_roles ORDER BY user_id, role_id')).rows,
    grants: (await db.query('SELECT * FROM public.role_permissions ORDER BY role_id, permission_code')).rows,
    audit: (await db.query('SELECT * FROM public.access_audit ORDER BY id')).rows,
  });
  const before = await snapshot();
  await db.exec(fs.readFileSync('supabase/migrations/006_rbac.sql', 'utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/006_rbac.sql', 'utf8'));
  assert.deepEqual(await snapshot(), before);
  assert.deepEqual((await context('other')).permissions, []);
  assert.equal((await context('employee')).permissions.includes('time.self'), false);
  await owner();
  assert.equal((await db.query('SELECT 1 FROM public.user_roles WHERE user_id = $1 AND role_id = (SELECT id FROM public.roles WHERE code = $2)', [ids.manager, 'manager'])).rows.length, 0);
});

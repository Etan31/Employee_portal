import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { exportedAuthorizationFixture } from './helpers/exported-authorization.mjs';
import { ROUTES, SHARED_ROUTES, WORKSPACES } from '../client/src/data/nav.js';
import { loginDestination, canAccess, homeRoute, authorizedWorkspace } from '../client/src/utils/access.js';
import { resolveAccessContext } from '../shared/authorization.js';

const followup = fs.readFileSync('supabase/migrations/007_hr_support_authorization.sql', 'utf8');

test('exported HR/support assignments need the follow-up grants to reach their workspaces', async () => {
  const fixture = await exportedAuthorizationFixture({applyFollowup:false});
  try {
    for (const role of ['hr_administrator','support_agent']) {
      assert.equal(authorizedWorkspace(WORKSPACES,(await fixture.accessFor(role)).permissions),null);
    }
    await fixture.db.exec('RESET ROLE');
    const before = (await fixture.db.query('SELECT * FROM public.user_roles ORDER BY user_id, role_id')).rows;
    await fixture.db.exec(followup);
    assert.deepEqual((await fixture.db.query('SELECT * FROM public.user_roles ORDER BY user_id, role_id')).rows,before);
    assert.equal(authorizedWorkspace(WORKSPACES,(await fixture.accessFor('hr_administrator')).permissions).id,'hr');
    assert.equal(authorizedWorkspace(WORKSPACES,(await fixture.accessFor('support_agent')).permissions).id,'support');
  } finally { await fixture.db.close(); }
});

test('all exported role combinations receive their own login home and deny other workspaces', async () => {
  const fixture = await exportedAuthorizationFixture();
  try {
    for (const [code,workspace] of Object.entries({admin:'admin',manager:'manager',employee:'dashboard',hr_administrator:'hr',support_agent:'support'})) {
      const access = await fixture.accessFor(code);
      const account = fixture.accounts.find(account => account.code === code);
      const verified = resolveAccessContext(access,account.id);
      assert.ok(verified);
      assert.equal(loginDestination(ROUTES,verified.permissions,null),'#/dashboard');
      for (const route of SHARED_ROUTES) assert.ok(canAccess(route,verified.permissions),`${code}: ${route.id}`);
      for (const route of ROUTES.filter(route=>route.workspace && route.workspace !== workspace)) assert.equal(canAccess(route,verified.permissions),false,`${code}: ${route.id}`);
      assert.equal(loginDestination(ROUTES,verified.permissions,'admin/roles'),code==='admin'?'#/roles-permissions':'#/dashboard');
    }
  } finally { await fixture.db.close(); }
});

test('follow-up retries do not restore revoked HR/support rights or change other role grants', async () => {
  const fixture = await exportedAuthorizationFixture();
  try {
    await fixture.db.exec("DELETE FROM public.role_permissions WHERE role_id = (SELECT id FROM public.roles WHERE code = 'support_agent') AND permission_code = 'support.workspace'");
    const before = (await fixture.db.query('SELECT * FROM public.role_permissions ORDER BY role_id, permission_code')).rows;
    await fixture.db.exec(followup);
    assert.deepEqual((await fixture.db.query('SELECT * FROM public.role_permissions ORDER BY role_id, permission_code')).rows,before);
    assert.equal(homeRoute(ROUTES,(await fixture.accessFor('support_agent')).permissions),'#/dashboard');
  } finally { await fixture.db.close(); }
});

test('malformed access responses and identity mismatches never authorize a session', () => {
  const valid={active:true,profile:{id:'person'},roles:[{code:'custom_role'}],permissions:['profile.self']};
  assert.deepEqual(resolveAccessContext(valid,'person'),valid);
  assert.equal(resolveAccessContext({...valid,active:false},'person'),null);
  assert.equal(resolveAccessContext({...valid,roles:[]},'person'),null);
  for (const value of [{...valid,active:'false'},{...valid,roles:'admin'},{...valid,permissions:'role.assign'},{...valid,roles:[{name:'Admin'}]},{...valid,profile:{id:'other'}}]) {
    assert.throws(()=>resolveAccessContext(value,'person'));
  }
});

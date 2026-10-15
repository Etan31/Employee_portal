import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTES, WORKSPACES } from '../client/src/data/nav.js';
import { canAccess, isRouteAuthorized, homeRoute, authorizedWorkspace } from '../client/src/utils/access.js';

test('protected route supports explicit roles, grants and combinations without admin bypass', () => {
  const auth={roles:[{code:'employee'},{code:'manager'}],permissions:['manager.workspace','leave.approve']};
  const route=ROUTES.find(item=>item.route==='#/leave-approvals');
  assert.equal(isRouteAuthorized({route},auth),true);
  assert.equal(isRouteAuthorized({requiredRoles:['manager']},auth),true);
  assert.equal(isRouteAuthorized({requiredRoles:['custom_role','manager']},auth),true);
  assert.equal(isRouteAuthorized({requiredRoles:['admin']},auth),false);
  assert.equal(isRouteAuthorized({requiredPermissions:['role.assign']},auth),false);
  assert.equal(isRouteAuthorized({route,requiredRoles:['employee']},auth),true);
  assert.equal(isRouteAuthorized({route},{...auth,permissions:['manager.workspace']}),false);
  assert.equal(isRouteAuthorized({route},{...auth,permissions:['leave.approve']}),false);
  assert.equal(isRouteAuthorized({route:null},auth),false);
  assert.equal(canAccess({id:'missing-policy'},auth.permissions),false);
});

test('feature URLs are unique, role-neutral and workspace selection cannot grant access', () => {
  const urls=ROUTES.map(item=>item.route);
  assert.equal(new Set(urls).size,urls.length);
  for (const url of urls) assert.doesNotMatch(url,/^#\/(admin|manager|hr|support)(\/|$)/);
  assert.equal(homeRoute(ROUTES,['manager.workspace']),'#/dashboard');
  assert.equal(authorizedWorkspace(WORKSPACES,['manager.workspace'],'admin').id,'manager');
  assert.equal(authorizedWorkspace(WORKSPACES,['dashboard.read'],'admin'),null);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
process.env.SUPABASE_URL = 'http://127.0.0.1:59999';
process.env.SUPABASE_SECRET_KEY = 'test-only-key';
const { createVerifyToken, requirePermission, requireOwner } = await import('../server/middleware/auth.middleware.js');
const access = { active: true, roles: [{code:'employee'}], permissions: ['profile.self'], profile:{id:'user-a'} };
function response() { return { statusCode:200, status(n) { this.statusCode=n; return this; }, json(body) { this.body=body; return this; } }; }
function client(overrides = {}) { return { auth: { getUser: async () => ({data:{user:{id:'user-a'}}}) }, rpc: async () => ({data:access}), ...overrides }; }
test('API rejects absent/invalid sessions, inactive users, and resolver outages', async () => {
  for (const [authHeader, api, code] of [
    ['',client(),401], ['Bearer bad token',client(),401], ['Bearer token',client({auth:{getUser:async()=>({error:{message:'expired'}})}}),401],
    ['Bearer token',client({rpc:async()=>({data:{...access,active:false}})}),403],
    ['Bearer token',client({rpc:async()=>({data:{...access,roles:[]}})}),403],
    ['Bearer token',client({rpc:async()=>({error:{message:'unavailable'}})}),503],
    ['Bearer token',client({rpc:async()=>({data:{...access,active:'false'}})}),503],
    ['Bearer token',client({rpc:async()=>({data:{...access,permissions:'role.assign'}})}),503],
    ['Bearer token',client({rpc:async()=>({data:{...access,profile:{id:'different-account'}}})}),503],
  ]) {
    const res=response(); let next=false;
    await createVerifyToken(api)({headers:{authorization:authHeader}},res,()=>{next=true;});
    assert.equal(res.statusCode,code); assert.equal(next,false);
  }
});
test('API checks fresh permissions for every request and denies other users', async () => {
  let granted=true;
  const api=client({rpc:async()=>({data:{...access, permissions:granted?['profile.self']:[]}})});
  const verify=createVerifyToken(api);
  const req={headers:{authorization:'Bearer token'},params:{userId:'user-b'}};
  let calls=0;
  await verify(req,response(),()=>calls++);
  assert.equal(calls,1);
  const res=response(); requireOwner(req,res,()=>calls++); assert.equal(res.statusCode,403);
  const roleRes=response(); requirePermission('role.assign')(req,roleRes,()=>calls++); assert.equal(roleRes.statusCode,403);
  granted=false;
  const revoked=response(); await verify(req,revoked,()=>calls++); assert.equal(revoked.statusCode,403); assert.equal(calls,1);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendStaffInvitation } from '../server/services/invitations.service.js';

function client({ deliveryFails=false, finishFails=false, recovery=null, claimFails=false }={}) {
  const calls=[];
  return { calls, auth:{admin:{inviteUserByEmail:async(email,options)=>{
    calls.push({email,options}); return deliveryFails?{error:{message:'provider'}}:{data:{user:{id:'invited'}}};
  }}}, rpc:async(name,args)=>{
    calls.push({name,args});
    if(name==='claim_staff_invitation') return claimFails?{error:{message:'denied'}}:{data:{email:'staff@example.test',attempt_id:'attempt',recovery_user_id:recovery}};
    return finishFails?{error:{message:'database unavailable'}}:{data:null};
  }};
}
test('invitation uses trusted email and completes the leased identity link',async()=>{
  const api=client(); assert.deepEqual(await sendStaffInvitation(api,'admin','staff','https://portal.test/'),{sent:true,reconciled:false});
  assert.equal(api.calls[1].email,'staff@example.test');
  assert.equal(api.calls[2].args.invited_user,'invited');
});
test('delivery failure resets attempt; linking failure never reports success',async()=>{
  const api=client({deliveryFails:true}); await assert.rejects(sendStaffInvitation(api,'admin','staff','https://portal.test/'),{status:502});
  assert.equal(api.calls.at(-1).args.invited_user,null);
  await assert.rejects(sendStaffInvitation(client({finishFails:true}),'admin','staff','https://portal.test/'),{status:409});
});
test('reconciliation reuses database-validated identity without duplicate email',async()=>{
  const api=client({recovery:'previously-invited'});
  assert.deepEqual(await sendStaffInvitation(api,'admin','staff','https://portal.test/'),{sent:false,reconciled:true});
  assert.equal(api.calls.length,2); assert.equal(api.calls[1].args.invited_user,'previously-invited');
});
test('rejected or concurrent invitation never reaches Auth delivery',async()=>{
  const api=client({claimFails:true}); await assert.rejects(sendStaffInvitation(api,'admin','staff','https://portal.test/'),{status:409});
  assert.equal(api.calls.length,1);
});

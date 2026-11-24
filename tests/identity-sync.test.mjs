import { test } from 'node:test';
import assert from 'node:assert/strict';
import { syncIdentityAccounts } from '../server/services/identity-sync.service.js';

test('Auth synchronization retries failures and only removes the processed revision',async()=>{
  const bans=[],deletes=[];
  const api={
    auth:{admin:{updateUserById:async(id,body)=>{bans.push([id,body.ban_duration]);return id==='failed'?{error:{}}:{};}}},
    from(table){
      if(table==='employees') return {select:()=>({eq:(_,id)=>({single:async()=>({data:{account_status:id==='active'?'active':'suspended'}})})})};
      return {select:()=>({order:()=>({limit:async()=>({data:['active','suspended','failed'].map(user_id=>({user_id,revision:`v-${user_id}`}))})})}),
        delete:()=>({eq:(_,id)=>({eq:async(key,revision)=>{deletes.push([id,key,revision]);return {};}})})};
    },
  };
  assert.deepEqual(await syncIdentityAccounts(api),{attempted:3,completed:2});
  assert.deepEqual(bans,[['active','none'],['suspended','876000h'],['failed','876000h']]);
  assert.deepEqual(deletes,[['active','revision','v-active'],['suspended','revision','v-suspended']]);
});

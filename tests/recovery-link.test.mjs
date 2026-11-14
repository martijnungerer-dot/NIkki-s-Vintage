import test from 'node:test';
import assert from 'node:assert/strict';
import {takeRecovery} from '../app/admin/login.js';
function win(hash){const w={location:{hash,pathname:'/',search:'?x=1'},replaced:null,history:{replaceState:(a,b,url)=>{w.replaced=url;w.location.hash='';}}};return w;}

test('a recovery link yields a session and is removed from the address bar',()=>{
  const w=win('#access_token=a&refresh_token=r&expires_in=60&type=recovery');
  const r=takeRecovery(w);
  assert.equal(r.session.access_token,'a');assert.equal(r.session.refresh_token,'r');
  assert.ok(r.session.expires_at>Date.now()/1000);assert.equal(w.replaced,'/?x=1');
});
test('an expired or incomplete link becomes a clear message and is removed too',()=>{
  for(const hash of ['#error=access_denied&error_code=otp_expired','#access_token=a&type=recovery']){
    const w=win(hash);assert.match(takeRecovery(w).error,/verlopen/);assert.equal(w.replaced,'/?x=1');
  }
});
test('other fragments, such as a shared shop link, are left alone',()=>{
  for(const hash of ['','#stuk-12','#access_token=a&type=signup']){
    const w=win(hash);assert.equal(takeRecovery(w),null);assert.equal(w.replaced,null);
  }
});

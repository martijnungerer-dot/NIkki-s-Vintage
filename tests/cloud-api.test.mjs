import test from 'node:test';
import assert from 'node:assert/strict';
import {Api} from '../app/api.js';
const config={supabaseUrl:'https://test.supabase.co',supabasePublishableKey:'sb_publishable_test'};
function memory(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};}
function api(routes){const calls=[];const a=new Api(config,async(url,opts={})=>{const path=new URL(url).pathname;calls.push({path,opts});const r=routes[path];if(!r)throw Error('Unexpected '+path);return r(opts);},memory());return {a,calls};}
const session={access_token:'user-token',refresh_token:'refresh',expires_at:Date.now()/1000+3600};

test('server validation errors tell Nikki what to check instead of "try again"',async()=>{
  const {a}=api({'/rest/v1/rpc/save_garment':()=>Response.json({code:'22023',message:'INVALID_PRODUCT'},{status:400})});
  a.keep(session);
  await assert.rejects(a.request('/rest/v1/rpc/save_garment',{method:'POST',body:{}}),e=>/niet opgeslagen/.test(e.message)&&/hoofdfoto/.test(e.message));
  const {a:b}=api({'/rest/v1/rpc/save_garment':()=>Response.json({code:'22023',message:'PHOTO_NOT_UPLOADED'},{status:400})});
  b.keep(session);
  await assert.rejects(b.request('/rest/v1/rpc/save_garment',{method:'POST',body:{}}),e=>/foto is nog niet goed geüpload/.test(e.message));
});

test('a non-staff login is ended on the server as well as locally',async()=>{
  const {a,calls}=api({
    '/auth/v1/token':()=>Response.json(session),
    '/rest/v1/rpc/require_staff':()=>Response.json({message:'STAFF_REQUIRED'},{status:403}),
    '/auth/v1/logout':()=>new Response(null,{status:204})
  });
  await assert.rejects(a.login('iemand@example.test','x'),e=>e.status===403);
  const logout=calls.find(c=>c.path==='/auth/v1/logout');
  assert.ok(logout,'logout must be called');assert.equal(logout.opts.headers.Authorization,'Bearer user-token');
  assert.equal(a.session,null);
});

test('photos are signed in one batch and unreachable ones are left out',async()=>{
  const ok='11111111-1111-4111-8111-111111111111/'+'a'.repeat(64)+'.jpg',gone='11111111-1111-4111-8111-111111111111/'+'b'.repeat(64)+'.jpg';
  const {a,calls}=api({'/storage/v1/object/sign/garment-photos':opts=>{
    const {paths,expiresIn}=JSON.parse(opts.body);assert.equal(expiresIn,3600);
    return Response.json(paths.map(path=>path===ok?{error:null,path,signedURL:'/object/sign/garment-photos/'+path+'?token=t'}:{error:'not found',path,signedURL:null}));
  }});
  const urls=await a.imageUrls([ok,gone]);
  assert.equal(calls.length,1);assert.equal(urls.size,1);
  assert.equal(urls.get(ok),'https://test.supabase.co/storage/v1/object/sign/garment-photos/'+ok+'?token=t');
  assert.equal((await a.imageUrls([])).size,0);assert.equal(calls.length,1);
});

test('a reset link request goes to Supabase with the redirect, and a rate limit gets its own message',async()=>{
  const {a,calls}=api({'/auth/v1/recover':()=>Response.json({})});
  await a.recover('nikki@example.test','https://shop.example/');
  assert.deepEqual(JSON.parse(calls[0].opts.body),{email:'nikki@example.test'});
  assert.equal(calls[0].opts.headers.Authorization,undefined,'no session is sent');
  const {a:b}=api({'/auth/v1/recover':()=>Response.json({code:'over_email_send_rate_limit'},{status:429})});
  await assert.rejects(b.recover('nikki@example.test','https://shop.example/'),e=>/net al een link/.test(e.message));
});

test('a new password is set with the link session, which is stored only after the staff check',async()=>{
  const link={access_token:'recovery-token',refresh_token:'r',expires_at:Date.now()/1000+3600};
  const store=memory();const calls=[];
  const routes={'/auth/v1/user':()=>Response.json({id:'u'}),'/rest/v1/rpc/require_staff':()=>Response.json(null)};
  const a=new Api(config,async(url,opts={})=>{const path=new URL(url).pathname;calls.push({path,opts,stored:store.getItem(a.sessionKey)});return routes[path](opts);},store);
  await a.setPassword(link,'nieuw-wachtwoord-1');
  assert.equal(calls[0].opts.method,'PUT');assert.equal(calls[0].opts.headers.Authorization,'Bearer recovery-token');
  assert.equal(calls.every(c=>c.stored===null),true,'not stored while checking');
  assert.equal(JSON.parse(store.getItem(a.sessionKey)).access_token,'recovery-token');

  const denied=memory();const b=new Api(config,async(url)=>{const path=new URL(url).pathname;
    return path==='/rest/v1/rpc/require_staff'?Response.json({},{status:403}):path==='/auth/v1/logout'?new Response(null,{status:204}):Response.json({id:'u'});},denied);
  await assert.rejects(b.setPassword(link,'nieuw-wachtwoord-1'),e=>e.status===403);
  assert.equal(b.session,null);assert.equal(denied.getItem(b.sessionKey),null);

  const c=new Api(config,async()=>Response.json({code:'bad_jwt'},{status:401}),memory());
  await assert.rejects(c.setPassword(link,'nieuw-wachtwoord-1'),e=>e.expired&&/verlopen/.test(e.message));
  const d=new Api(config,async()=>Response.json({code:'same_password'},{status:422}),memory());
  await assert.rejects(d.setPassword(link,'nieuw-wachtwoord-1'),e=>!e.expired&&/ander wachtwoord/.test(e.message));
});

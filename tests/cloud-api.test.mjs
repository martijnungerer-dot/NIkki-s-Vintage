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

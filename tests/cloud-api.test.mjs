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

test('saving splits photos: internal ones only reach the staff-only function, never the public data',async()=>{
  const id='33333333-3333-4333-8333-333333333333',pub=id+'/'+'a'.repeat(64)+'.jpg',intern=id+'/'+'b'.repeat(64)+'.jpg';
  const product={key:id,title:'Jas',description:'',priceMinor:100,material:'Wol',species:null,model:'Cape',colour:'Zwart',length:'Kort',fit:'',era:'',details:[],measurements:[50,null,null,80],furClass:'Nee',
    images:[{path:pub,role:'Voorkant',main:true,internal:false},{path:intern,role:'Label',main:false,internal:true}]};
  const {a,calls}=api({'/rest/v1/rpc/save_garment_with_private':()=>Response.json({id,version:1})});a.keep(session);
  await a.save(product,0,{ai:{titel:'Jas'}});
  const body=JSON.parse(calls[0].opts.body);
  assert.deepEqual(body.p_data.images,[{path:pub,role:'Voorkant',main:true}]);
  assert.deepEqual(body.p_internal,[{path:intern,role:'Label'}]);
  assert.deepEqual(body.p_ai,{titel:'Jas'});
  assert.doesNotMatch(JSON.stringify(body.p_data),/bbbb|titel/);

  // Before the migration: without internal photos fall back to the old save; with them, stop.
  const old=api({'/rest/v1/rpc/save_garment_with_private':()=>Response.json({code:'PGRST202'},{status:404}),'/rest/v1/rpc/save_garment':()=>Response.json({id,version:1})});old.a.keep(session);
  await old.a.save({...product,images:[product.images[0]]},0);
  assert.deepEqual(old.calls.map(c=>c.path),['/rest/v1/rpc/save_garment_with_private','/rest/v1/rpc/save_garment']);
  const blocked=api({'/rest/v1/rpc/save_garment_with_private':()=>Response.json({code:'PGRST202'},{status:404}),'/rest/v1/rpc/save_garment':()=>assert.fail('must not publish')});blocked.a.keep(session);
  await assert.rejects(blocked.a.save(product,0),/database is nog niet bijgewerkt/);
});

test('internal photos are loaded with signed links, and a missing one stops editing',async()=>{
  const id='33333333-3333-4333-8333-333333333333',intern=id+'/'+'b'.repeat(64)+'.jpg';
  const routes={'/rest/v1/garment_private':()=>Response.json([{internal_images:[{path:intern,role:'Label'}]}]),
    '/storage/v1/object/sign/garment-photos':()=>Response.json([{path:intern,signedURL:'/object/sign/x'}])};
  const {a}=api(routes);a.keep(session);
  assert.deepEqual(await a.internalPhotos(id),[{path:intern,role:'Label',src:'https://test.supabase.co/storage/v1/object/sign/x'}]);
  const {a:b}=api({...routes,'/storage/v1/object/sign/garment-photos':()=>Response.json([])});b.keep(session);
  await assert.rejects(b.internalPhotos(id),/Niet alle foto/);
  const {a:c}=api({'/rest/v1/garment_private':()=>Response.json({code:'42P01'},{status:404})});c.keep(session);
  assert.deepEqual(await c.internalPhotos(id),[],'before the migration there are none');
});

test('photos upload three at a time with progress, keep their order, and a duplicate photo is kept once',async()=>{
  const id='33333333-3333-4333-8333-333333333333';
  let active=0,peak=0;const progress=[];
  const a=new Api(config,async(url,opts={})=>{
    const path=new URL(url).pathname;
    if(path.startsWith('/storage/v1/object/garment-photos/')){active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,5));active--;return Response.json({Key:path});}
    if(path==='/rest/v1/rpc/save_garment_with_private'){a.lastBody=JSON.parse(opts.body);return Response.json({id,version:1});}
    if(url.startsWith('data:'))return new Response(new Blob([url.slice(-1)],{type:'image/jpeg'}));
    throw Error('Unexpected '+url);
  },memory());a.keep(session);
  const img=(c,extra={})=>({src:'data:image/jpeg;base64,'+c,role:'Detail',main:false,internal:false,...extra});
  const product={key:id,title:'Jas',description:'',priceMinor:100,material:'Wol',species:null,model:'Cape',colour:'Zwart',length:'Kort',fit:'',era:'',details:[],measurements:[50,null,null,80],furClass:'Nee',
    images:[img('A',{main:true,role:'Voorkant'}),img('B'),img('C'),img('D'),img('E'),img('A',{internal:true,role:'Label'})]};
  await a.save(product,0,{onProgress:m=>progress.push(m)});
  assert.equal(peak,3,'three uploads at a time');
  assert.equal(progress[0],'Foto’s opslaan: 0 van 6…');assert.equal(progress.at(-2),'Foto’s opslaan: 6 van 6…');assert.equal(progress.at(-1),'Stuk opslaan…');
  const imgs=a.lastBody.p_data.images;
  assert.equal(imgs.length,5,'the duplicate is kept once');assert.equal(imgs[0].main,true);assert.equal(imgs[0].role,'Voorkant');
  assert.deepEqual(a.lastBody.p_internal,[],'a photo that is also a boutique photo is not internal');
});

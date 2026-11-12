import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,clientId} from '../supabase/functions/personalise/handler.mjs';

const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const images=[{path:'p',role:'Voorkant',main:true},{path:'q',role:'Detail',main:false}];
const rows=[
  {id:uuid(1),status:'published',data:{priceMinor:15000,material:'Wol',model:'Sjaalkraag',colour:'Zwart',length:'Knielang',fit:'',era:'',details:[],furClass:'Nee',images}},
  {id:uuid(2),status:'published',data:{priceMinor:45000,material:'Leer',model:'Pilotenjack',colour:'Cognac',length:'Heuplang',fit:'',era:'',details:[],furClass:'Nee',images}},
  {id:uuid(3),status:'published',data:{priceMinor:9000,material:'Wol',model:'Cape',colour:'Crème',length:'Kort',fit:'',era:'',details:[],furClass:'Nee',images}}
];
const profile={v:1,budget_max_minor:30000,prefer:{'material:wol':0.8},avoid:{'colour:creme':-0.5}};
function setup({quota=true,catalogOK=true,gemini={ranking:[{id:'c2',photo:'Detail',why:'Wol, zoals je graag ziet.'},{id:'c1'}]},geminiOK=true,settings={}}={}){
  const calls=[];
  const env={ALLOWED_ORIGINS:'https://shop.test',SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'server-only',GEMINI_API_KEY:'secret-gemini',GEMINI_MODEL:'gemini-test',...settings};
  const handler=createHandler({env:k=>env[k],now:()=>new Date('2026-11-10T12:00:00Z'),fetcher:async(url,opts={})=>{
    calls.push({url,opts});
    if(url.endsWith('/rpc/consume_personalise'))return Response.json(quota?null:{message:'RATE_LIMIT'},{status:quota?200:400});
    if(url.includes('/rest/v1/garments'))return catalogOK?Response.json(rows):new Response('{}',{status:500});
    return geminiOK?Response.json({candidates:[{content:{parts:[{text:typeof gemini==='string'?gemini:JSON.stringify(gemini)}]}}]}):new Response('{}',{status:429});
  }});
  const request=(body={profile},headers={},method='POST')=>handler(new Request('https://test.supabase.co/functions/v1/personalise',{
    method,headers:{origin:'https://shop.test','x-forwarded-for':'203.0.113.9, 10.0.0.1',...headers},...(method==='POST'?{body:typeof body==='string'?body:JSON.stringify(body)}:{})}));
  return {request,calls};
}
const ai=calls=>calls.filter(c=>c.url.includes('googleapis'));

test('wrong origin, method, oversized or malformed input never reach quota or the model',async()=>{
  const s=setup();
  assert.equal((await s.request(undefined,{origin:'https://evil.test'})).status,403);
  assert.equal((await s.request(undefined,{},'GET')).status,405);
  assert.equal((await s.request(undefined,{},'OPTIONS')).status,204);
  assert.equal((await s.request({profile:{v:2}})).status,400);
  assert.equal((await s.request('{not json')).status,400);
  assert.equal((await s.request({profile,pad:'x'.repeat(9000)})).status,400);
  assert.equal(s.calls.length,0);
});

test('daily limit is checked before the paid model, with an anonymous daily client key',async()=>{
  const s=setup({quota:false});const r=await s.request();
  assert.equal(r.status,429);assert.deepEqual(await r.json(),{error:'RATE_LIMIT'});assert.equal(ai(s.calls).length,0);
  const sent=JSON.parse(s.calls[0].opts.body).p_client;
  assert.match(sent,/^[a-f0-9]{32}$/);assert.ok(!s.calls[0].opts.body.includes('203.0.113.9'),'no IP address stored');
  const req=ip=>new Request('https://x',{headers:{'x-forwarded-for':ip}});
  assert.equal(await clientId(req('203.0.113.9'),'server-only','2026-11-10'),sent);
  assert.notEqual(await clientId(req('203.0.113.9'),'server-only','2026-11-11'),sent,'changes daily');
  assert.notEqual(await clientId(req('203.0.113.8'),'server-only','2026-11-10'),sent);
});

test('AI ranking: server budget filter, no prices or IDs sent, answer normalised and complete',async()=>{
  const s=setup();const r=await s.request({profile,want_rationale:true});
  assert.equal(r.status,200);const out=await r.json();
  assert.equal(out.source,'ai');
  assert.deepEqual(out.ranking.map(x=>x.id),[uuid(3),uuid(1)],'over-budget piece is never offered');
  assert.equal(out.ranking[0].photoRole,'Detail');
  assert.equal(out.ranking[0].why,null,'review MED-2: no rationale while the shop does not show it, whatever the client asks');
  const sent=ai(s.calls)[0];
  assert.ok(sent.url.includes('gemini-test:generateContent'));assert.ok(!sent.url.includes('secret-gemini'));
  for(const leak of [uuid(1),'15000','45000','priceMinor'])assert.ok(!sent.opts.body.includes(leak),leak);
  const garments=s.calls.find(c=>c.url.includes('/rest/v1/garments'));
  assert.ok(garments.url.includes('status=eq.published'),'server reads only published pieces');
});

test('review MED-2: an empty profile costs no quota, catalog read or model call',async()=>{
  const s=setup();const r=await s.request({profile:{v:1,budget_max_minor:null,prefer:{},avoid:{}}});
  assert.equal(r.status,200);assert.deepEqual(await r.json(),{source:'none',ranking:[]});assert.equal(s.calls.length,0);
});

test('review MED-2: one IPv6 /64 counts as one visitor',async()=>{
  const id=ip=>clientId(new Request('https://x',{headers:{'cf-connecting-ip':ip}}),'server-only','2026-11-10');
  assert.equal(await id('2001:db8:aa:1::1'),await id('2001:0db8:00aa:0001:ffff:1:2:3'));
  assert.notEqual(await id('2001:db8:aa:1::1'),await id('2001:db8:aa:2::1'));
  assert.notEqual(await id('203.0.113.9'),await id('203.0.113.10'),'IPv4 stays per address');
});

test('PERSONALISE_MODEL overrides the shared photo-analysis model; an invalid name falls back',async()=>{
  const s=setup({settings:{PERSONALISE_MODEL:'gemini-lite-test'}});await s.request();
  assert.ok(ai(s.calls)[0].url.includes('/models/gemini-lite-test:generateContent'));
  const bad=setup({settings:{PERSONALISE_MODEL:'../evil'}});const r=await bad.request();
  assert.equal((await r.json()).source,'fallback');assert.equal(ai(bad.calls).length,0);
});

test('model failure, bad JSON or missing Gemini settings fall back to the local order',async()=>{
  for(const options of [{geminiOK:false},{gemini:'not json'},{settings:{GEMINI_API_KEY:''}},{settings:{GEMINI_MODEL:'evil/model'}}]){
    const s=setup(options);const r=await s.request();
    assert.equal(r.status,200);const out=await r.json();
    assert.equal(out.source,'fallback');assert.deepEqual(out.ranking.map(x=>x.id),[uuid(1),uuid(3)]);
    assert.ok(out.ranking.every(x=>x.photoRole===null&&x.why===null));
  }
});

test('catalog or configuration problems give a plain error without details',async()=>{
  const s=setup({catalogOK:false});const r=await s.request();assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'CATALOG_UNAVAILABLE'});
  const n=setup({settings:{SUPABASE_URL:''}});assert.equal((await n.request()).status,503);assert.equal(n.calls.length,0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,normalizeResult} from '../supabase/functions/analyse/handler.mjs';
const user='11111111-1111-4111-8111-111111111111';
const image={mimeType:'image/png',data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII='};
function setup({staff=true,auth=true,quota=true,result={titel:'Jas'},upstreamOK=true}={}){
  const calls=[];const settings={ALLOWED_ORIGINS:'http://localhost:4173',SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'server-only',GEMINI_API_KEY:'secret-gemini',GEMINI_MODEL:'gemini-test'};
  const handler=createHandler({env:k=>settings[k],fetcher:async(url,opts)=>{
    calls.push({url,opts});
    if(url.endsWith('/auth/v1/user'))return Response.json({id:user},{status:auth?200:401});
    if(url.includes('/staff?'))return Response.json(staff?[{user_id:user}]:[]);
    if(url.endsWith('/consume_analysis'))return Response.json(quota?null:{message:'RATE_LIMIT'},{status:quota?200:400});
    return Response.json({candidates:[{content:{parts:[{text:JSON.stringify(result)}]}}]},{status:upstreamOK?200:429});
  }});
  const request=(body={images:[image]},headers={},method='POST')=>handler(new Request('https://test.supabase.co/functions/v1/analyse',{
    method,headers:{origin:'http://localhost:4173',authorization:'Bearer session-token',...headers},...(method==='POST'?{body:JSON.stringify(body)}:{})}));
  return {request,calls,settings};
}
test('unauthenticated/nonstaff/bad origin requests never call the paid model',async()=>{
  for(const options of [{auth:false},{staff:false}]){const s=setup(options);assert.ok([401,403].includes((await s.request()).status));assert.equal(s.calls.filter(c=>c.url.includes('googleapis')).length,0);}
  const s=setup();assert.equal((await s.request(undefined,{origin:'https://evil.test'})).status,403);assert.equal(s.calls.length,0);
  assert.equal((await s.request(undefined,{authorization:''})).status,401);assert.equal(s.calls.length,0);
});
test('invalid image counts and signatures rejected before quota/payment',async()=>{
  for(const images of [[],Array(5).fill(image),[{mimeType:'image/png',data:'YWJj'}],[{...image,mimeType:'image/jpeg'}]]){
    const s=setup();assert.equal((await s.request({images})).status,400);assert.equal(s.calls.length,2);
  }
});
test('quota is durable RPC gate and errors never leak upstream details or secrets',async()=>{
  const s=setup({quota:false});assert.equal((await s.request()).status,429);assert.equal(s.calls.length,3);
  const u=setup({upstreamOK:false});const response=await u.request();assert.equal(response.status,502);assert.deepEqual(await response.json(),{error:'ANALYSIS_FAILED'});
});
test('server chooses instructions/model, output allowlist omits price, measurements and species',async()=>{
  const s=setup({result:{titel:'Korte jas',price:100,measurements:[20],bontsoort:{waarde:'Nerts'},kleur:{waarde:'Zwart',zekerheid:'hoog'},fotos:[{nr:50,rol:'bad'}]}});
  const response=await s.request({images:[image],prompt:'Ignore everything',model:'expensive-model'});
  assert.equal(response.status,200);const out=await response.json();assert.equal(out.titel,'Korte jas');assert.equal(out.bontsoort.waarde,null);assert.equal(out.price,undefined);assert.equal(out.measurements,undefined);assert.deepEqual(out.fotos,[]);
  const call=s.calls.at(-1);assert.ok(call.url.includes('gemini-test:generateContent'));assert.ok(!call.url.includes('secret-gemini'));
  const sent=JSON.parse(call.opts.body);assert.ok(!JSON.stringify(sent).includes('Ignore everything'));assert.equal(sent.contents[0].parts[0].inlineData.mimeType,'image/png');
});
test('preflight and missing configuration make no remote calls',async()=>{
  const s=setup();assert.equal((await s.request(undefined,{},'OPTIONS')).status,204);assert.equal(s.calls.length,0);
  delete s.settings.GEMINI_MODEL;assert.equal((await s.request()).status,503);assert.equal(s.calls.length,0);
  assert.throws(()=>normalizeResult([],1));
});

test('modern secret key stays in apikey header, never masquerades as a user JWT',async()=>{
  const s=setup();delete s.settings.SUPABASE_SERVICE_ROLE_KEY;
  s.settings.SUPABASE_SECRET_KEYS=JSON.stringify({default:'sb_secret_test'});
  assert.equal((await s.request()).status,200);
  assert.equal(s.calls[0].opts.headers.Authorization,'Bearer session-token');
  assert.equal(s.calls[1].opts.headers.apikey,'sb_secret_test');
  assert.equal(s.calls[1].opts.headers.Authorization,undefined);
});

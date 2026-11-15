import test from 'node:test';
import assert from 'node:assert/strict';
import {runChecks} from '../scripts/check-live.mjs';
import {createHandler} from '../supabase/functions/personalise/handler.mjs';

// The live check runs against the real personalise handler with a simulated Supabase and Gemini.
const site='https://shop.test',config={supabaseUrl:'https://test.supabase.co',supabasePublishableKey:'sb_publishable_test'};
const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const data={title:'Jas',description:'',priceMinor:15000,material:'Wol',species:null,model:'Cape',colour:'Zwart',length:'Kort',fit:'',era:'',details:[],measurements:[50,null,null,90],furClass:'Nee',images:[{path:'p',role:'Voorkant',main:true},{path:'q',role:'Detail',main:false}]};
function world({deployed=true,gemini=true,leak=false,origins=site,hiddenVisible=false,privateTable=401,salesTable=401}={}){
  const rows=[{id:uuid(1),status:'published',data:leak?{...data,purchaseCostMinor:5000}:data},{id:uuid(2),status:'published',data}];
  const supabase=async(url,opts={})=>{
    const u=new URL(url);
    if(u.pathname==='/rest/v1/rpc/consume_personalise')return Response.json(null);
    if(u.pathname==='/rest/v1/garment_private')return privateTable===200?Response.json([]):new Response('{}',{status:privateTable});
    if(u.pathname==='/rest/v1/garment_sales')return salesTable===200?Response.json([]):new Response('{}',{status:salesTable});
    if(u.pathname==='/rest/v1/garments')return Response.json(u.searchParams.get('status')==='neq.published'?(hiddenVisible?[{id:uuid(9)}]:[]):rows);
    if(u.hostname==='generativelanguage.googleapis.com')return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({ranking:[{id:'c2',photo:'Detail'},{id:'c1'}]})}]}}]});
    return new Response('',{status:404});
  };
  const handler=createHandler({env:k=>({ALLOWED_ORIGINS:origins,SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'server-only',GEMINI_API_KEY:gemini?'k':'',GEMINI_MODEL:'gemini-test'})[k],fetcher:supabase});
  return async(url,opts={})=>{
    const u=new URL(url);
    if(u.origin===site)return new Response('<script type="module" src="main.js"></script>');
    if(u.pathname==='/functions/v1/personalise')return deployed?handler(new Request(url,{method:opts.method,headers:opts.headers,body:opts.body})):new Response('',{status:404});
    return supabase(url,opts);
  };
}
const levels=lines=>lines.map(l=>l.level);

test('a healthy deployment passes every check',async()=>{
  const lines=await runChecks({config,site,fetch:world()});
  assert.deepEqual(lines.filter(l=>l.level!=='ok'),[]);
  assert.ok(lines.some(l=>l.text.startsWith('Gemini rangschikt: 2 stukken, 1 met')));
});

test('missing Gemini settings are a warning, not a failure',async()=>{
  const lines=await runChecks({config,site,fetch:world({gemini:false})});
  assert.ok(!levels(lines).includes('fail'));assert.ok(lines.some(l=>l.level==='warn'&&l.text.includes('zonder Gemini')));
});

test('undeployed function, wrong origin, leaked fields and visible drafts are failures',async()=>{
  const notDeployed=await runChecks({config,site,fetch:world({deployed:false})});
  assert.ok(notDeployed.some(l=>l.level==='fail'&&l.text.includes('functions deploy personalise')));
  const origin=await runChecks({config,site,fetch:world({origins:'https://ander.test'})});
  assert.ok(origin.some(l=>l.level==='fail'&&l.text.includes('ALLOWED_ORIGINS')));
  const leak=await runChecks({config,site,fetch:world({leak:true})});
  assert.ok(leak.some(l=>l.level==='fail'&&l.text.includes('purchaseCostMinor')));
  const drafts=await runChecks({config,site,fetch:world({hiddenVisible:true})});
  assert.ok(drafts.some(l=>l.level==='fail'&&l.text.includes('niet-gepubliceerde')));
});

test('a secret key in the public config stops the check at once',async()=>{
  const lines=await runChecks({config:{...config,supabasePublishableKey:'sb_secret_x'},site,fetch:world()});
  assert.deepEqual(levels(lines),['fail']);
});

test('the internal-photo table: missing is a warning, readable by visitors is a failure',async()=>{
  const missing=await runChecks({config,site,fetch:world({privateTable:404})});
  assert.ok(missing.some(l=>l.level==='warn'&&l.text.includes('db push')));
  const open=await runChecks({config,site,fetch:world({privateTable:200})});
  assert.ok(open.some(l=>l.level==='fail'&&l.text.includes('alleen voor controle')));
});
test('the sale-price table: missing is a warning, readable by visitors is a failure',async()=>{
  const missing=await runChecks({config,site,fetch:world({salesTable:404})});
  assert.ok(missing.some(l=>l.level==='warn'&&l.text.includes('verkoopprijzen')&&l.text.includes('db push')));
  const open=await runChecks({config,site,fetch:world({salesTable:200})});
  assert.ok(open.some(l=>l.level==='fail'&&l.text.includes('verkoopprijzen')));
});
test('a legacy service_role JWT in the config is refused',async()=>{
  const jwt=role=>'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({role})).toString('base64url')+'.sig';
  const bad=await runChecks({config:{...config,supabasePublishableKey:jwt('service_role')},site,fetch:world()});
  assert.ok(bad.some(l=>l.level==='fail'&&l.text.includes('geheime')));
  const anon=await runChecks({config:{...config,supabasePublishableKey:jwt('anon')},site,fetch:world()});
  assert.ok(!anon.some(l=>l.text.includes('geheime')));
});

const {chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
try{
const db=new Map(),photos=new Map();let failSave=true,analyses=0;
const errors=[];
async function context(){
 const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true});
 c.on('page',p=>{p.on('pageerror',e=>{errors.push(e.message);console.error('PAGEERROR',e.message);});p.on('dialog',d=>d.accept());});
 await c.route('**/*',async r=>{
  const u=new URL(r.request().url());
  if(u.hostname==='app.test'){
   const pathname=u.pathname==='/'?'/index.html':u.pathname;
   if(pathname==='/config.js')return r.fulfill({contentType:'text/javascript',body:"export const config={supabaseUrl:'https://test.supabase.co',supabasePublishableKey:'public-test-key'}"});
   try{return r.fulfill({contentType:pathname.endsWith('.js')?'text/javascript':pathname.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(path.join('dist/cloud',pathname))});}catch{return r.fulfill({status:404});}
  }
  if(u.hostname!=='test.supabase.co')return r.abort();
  const req=r.request();const auth=req.headers().authorization==='Bearer test-session';
  const headers={'access-control-allow-origin':'https://app.test','access-control-allow-headers':'*','access-control-allow-methods':'*'};
  const json=(d,status=200)=>r.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(d)});
  if(req.method()==='OPTIONS')return r.fulfill({status:204,headers});
  if(u.pathname==='/auth/v1/token')return json({access_token:'test-session',refresh_token:'refresh',expires_at:Date.now()/1000+3600});
  if(u.pathname==='/auth/v1/logout')return json(null);
  if(u.pathname==='/rest/v1/rpc/require_staff')return json(auth?null:{},auth?200:403);
  if(u.pathname==='/rest/v1/garments')return json([...db.values()].filter(row=>auth||row.status==='published'));
  if(u.pathname.startsWith('/storage/v1/object/sign/garment-photos/')){
   const name=u.pathname.split('/garment-photos/')[1];
   if(req.method()==='POST')return json({signedURL:'/object/sign/garment-photos/'+name+'?token=test'});
   return r.fulfill({headers,contentType:'image/jpeg',body:photos.get(name)});
  }
  if(u.pathname.startsWith('/storage/v1/object/garment-photos/')){
   assert.ok(auth);const name=u.pathname.split('/garment-photos/')[1];
   if(photos.has(name))return json({error:'Duplicate'},409);photos.set(name,req.postDataBuffer());return json({Key:name});
  }
  if(u.pathname==='/rest/v1/rpc/save_garment'){
   assert.ok(auth);if(failSave){failSave=false;return json({error:'temporary'},503);}
   const b=req.postDataJSON();const old=db.get(b.p_id);assert.equal(b.p_version,old?.version||0);
   const row={id:b.p_id,display_id:old?.display_id||db.size+1,data:b.p_data,version:(old?.version||0)+1,status:old?.status||'published'};db.set(row.id,row);return json(row);
  }
  if(u.pathname==='/rest/v1/rpc/mark_garment_sold'){
   const b=req.postDataJSON();const row=db.get(b.p_id);row.status='sold';row.version++;return json(row);
  }
  if(u.pathname==='/functions/v1/analyse'){
   assert.ok(auth);analyses++;assert.equal(req.postDataJSON().images[0].mimeType,'image/jpeg');
   return json({titel:'AI voorstel',beschrijving:'Controleerbare tekst',kleur:{waarde:'Zwart',zekerheid:'middel',waarom:'Zichtbaar'},fotos:[{nr:1,rol:'Voorkant',bruikbaar:true}]});
  }
  throw Error('Unexpected route '+u.pathname);
 });return c;
}
const c=await context(),p=await c.newPage();p.setDefaultTimeout(10000);await p.goto('https://app.test');
await p.waitForFunction(()=>document.getElementById('status').textContent==='Collectie geladen.').catch(async e=>{console.error(await p.locator('#status').innerText());throw e;});
const shop=()=>p.frames().find(f=>f.name()==='shop');const intake=()=>p.frames().find(f=>f.name()==='intake');
assert.equal(await shop().locator('#hero-track .slide').count(),0);
await p.locator('[data-screen=manage]').click();await p.locator('#email').fill('nikki@example.test');await p.locator('#password').fill('test-password');await p.locator('#login button').click();await p.locator('#new').waitFor({state:'visible'});await p.locator('#new').click();
const png=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=20;c.height=20;c.getContext('2d').fillRect(0,0,20,20);return c.toDataURL().split(',')[1];});
const f=intake();
await f.locator('#gallery').setInputFiles({name:'jas.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
await f.locator('#analyse').click();await f.locator('#step-review').waitFor({state:'visible'});assert.equal(analyses,1);
await f.locator('[data-allok]').click();await f.locator('[data-open=wat]').click();
for(const [k,v]of [['bont','Nee'],['materiaal','Leer'],['model','Autojas'],['lengte','Lang']])await f.locator(`[data-k="${k}"][data-v="${v}"]`).click();
await f.locator('[data-open=maten]').click();await f.locator('#m-chest').fill('56,5');await f.locator('#m-length').fill('100');
await f.locator('[data-open=bijz]').click();await f.locator('[data-k=bijzonderheden][data-v=Geen]').click();
await f.locator('[data-open=tekst]').click();const title='<img src=x onerror=alert(1)> Testjas';await f.locator('#t-titel').fill(title);await f.locator('#t-prijs').fill('125,50');
await f.locator('#publish').click();await f.locator('#review-err').filter({hasText:'niet afgerond'}).waitFor().catch(async e=>{console.error('SAVE ERROR:',await f.locator('#review-err').innerText());throw e;});assert.equal(db.size,0);assert.equal(await f.locator('#t-titel').inputValue(),title);
await f.locator('#publish').click();await p.waitForFunction(()=>document.getElementById('status').textContent.includes('is opgeslagen'));
assert.equal(db.size,1);assert.equal([...db.values()][0].data.measurements[0],56.5);assert.equal([...db.values()][0].data.priceMinor,12550);assert.equal([...db.values()][0].data.furClass,'Nee');assert.equal(photos.size,1);
assert.equal(await shop().locator('#hero-track .slide').count(),1);assert.ok(await shop().locator('#hero-track img').first().evaluate(i=>i.complete&&i.naturalWidth>0));
const originalId=[...db.values()][0].display_id;
const originalKey=[...db.keys()][0];
const extraId='44444444-4444-4444-8444-444444444444';
db.set(extraId,{...structuredClone(db.get(originalKey)),id:extraId,display_id:2,data:{...structuredClone(db.get(originalKey).data),title:'Ander stuk'}});
await p.locator('#reload').click();await p.waitForFunction(()=>document.getElementById('status').textContent==='Collectie vernieuwd.');
assert.equal(await shop().locator('#hero-track [data-open]').filter({hasText:title}).getAttribute('data-open'),String(originalId));
db.delete(extraId);await p.locator('#reload').click();await p.waitForFunction(()=>document.getElementById('shop').contentDocument.querySelectorAll('#hero-track .slide').length===1);
const styles=[];for(let i=0;i<5;i++){styles.push(await shop().locator('html').getAttribute('data-style'));await shop().locator('#style-next').click();}assert.equal(new Set(styles).size,5);
await p.reload();await p.waitForFunction(()=>document.getElementById('status').textContent==='Collectie geladen.');assert.equal(await shop().locator('#hero-track .slide').count(),1);
const visitor=await context(),v=await visitor.newPage();await v.goto('https://app.test');await v.waitForFunction(()=>document.getElementById('status').textContent==='Collectie geladen.');assert.equal(await v.frames().find(f=>f.name()==='shop').locator('#hero-track .slide').count(),1);
await p.locator('[data-screen=manage]').click();await p.getByRole('button',{name:'Markeer verkocht'}).click();await p.locator('#items').filter({hasText:'Verkocht'}).waitFor();assert.equal(await shop().locator('#hero-track .slide').count(),0);
await p.getByRole('button',{name:'Bewerken',exact:true}).click();await p.waitForFunction(()=>!document.getElementById('intake').hidden);
const edit=intake();await edit.locator('[data-open=tekst]').click();await edit.locator('#t-titel').fill('Gewijzigde verkochte jas');await edit.locator('#publish').click();await p.waitForFunction(()=>document.getElementById('status').textContent.includes('blijft verkocht'));
assert.equal(db.size,1);assert.equal(photos.size,1);assert.equal([...db.values()][0].status,'sold');assert.equal([...db.values()][0].version,3);
await v.locator('#reload').click();await v.waitForFunction(()=>document.getElementById('status').textContent==='Collectie vernieuwd.');assert.equal(await v.frames().find(f=>f.name()==='shop').locator('#hero-track .slide').count(),0);
assert.deepEqual(errors,[]);console.log('PASS cloud UI: login, analysis adapter, photos, failed save/retry, durable reload, guest catalog, five styles, edit sold without resurrection. Remote services mocked.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

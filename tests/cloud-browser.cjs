const {chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
try{
const db=new Map(),photos=new Map(),privateRows=new Map();let failSave=true,analyses=0,signBatches=0,lastAnalysisCount=0;
// Hold the sale response so the test cannot accidentally pass before saving finishes.
let releaseSoldResponse;
const soldResponse=new Promise(resolve=>{releaseSoldResponse=resolve;});
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
  if(u.pathname==='/storage/v1/object/sign/garment-photos'&&req.method()==='POST'){
   signBatches++;
   return json(req.postDataJSON().paths.map(name=>photos.has(name)?{error:null,path:name,signedURL:'/object/sign/garment-photos/'+name+'?token=test-'+signBatches}:{error:'Either the object does not exist or you do not have access to it',path:name,signedURL:null}));
  }
  if(u.pathname.startsWith('/storage/v1/object/sign/garment-photos/')){
   const name=u.pathname.split('/garment-photos/')[1];
   if(req.method()==='POST')return json({signedURL:'/object/sign/garment-photos/'+name+'?token=test'});
   return r.fulfill({headers,contentType:'image/jpeg',body:photos.get(name)});
  }
  if(u.pathname.startsWith('/storage/v1/object/garment-photos/')){
   assert.ok(auth);const name=u.pathname.split('/garment-photos/')[1];
   if(photos.has(name))return json({error:'Duplicate'},409);photos.set(name,req.postDataBuffer());return json({Key:name});
  }
  if(u.pathname==='/rest/v1/garment_private'){assert.ok(auth);const key=u.searchParams.get('id').replace('eq.','');return json(privateRows.has(key)?[{internal_images:privateRows.get(key).internal}]:[]);}
  if(u.pathname==='/rest/v1/rpc/save_garment_with_private'){
   assert.ok(auth);if(failSave){failSave=false;return json({error:'temporary'},503);}
   const b=req.postDataJSON();const before=privateRows.get(b.p_id);
   privateRows.set(b.p_id,{internal:b.p_internal,ai:b.p_ai??before?.ai??null});const old=db.get(b.p_id);assert.equal(b.p_version,old?.version||0);
   const row={id:b.p_id,display_id:old?.display_id||db.size+1,data:b.p_data,version:(old?.version||0)+1,status:old?.status||'published'};db.set(row.id,row);return json(row);
  }
  if(u.pathname==='/rest/v1/rpc/mark_garment_sold'){
   await soldResponse;
   const b=req.postDataJSON();const row=db.get(b.p_id);row.status='sold';row.version++;return json(row);
  }
  if(u.pathname==='/functions/v1/analyse'){
   assert.ok(auth);analyses++;lastAnalysisCount=req.postDataJSON().images.length;assert.equal(req.postDataJSON().images[0].mimeType,'image/jpeg');
   return json({titel:'AI voorstel',beschrijving:'Controleerbare tekst',kleur:{waarde:'Zwart',zekerheid:'middel',waarom:'Zichtbaar'},fotos:[{nr:1,rol:'Voorkant',bruikbaar:true}]});
  }
  if(u.pathname==='/functions/v1/personalise')return json({source:'fallback',ranking:[]});
  throw Error('Unexpected route '+u.pathname);
 });return c;
}
const c=await context(),p=await c.newPage();p.setDefaultTimeout(10000);await p.goto('https://app.test');
await p.waitForFunction(()=>document.getElementById('status').textContent==='Collectie geladen.').catch(async e=>{console.error(await p.locator('#status').innerText());throw e;});
const shop=()=>p.frames().find(f=>f.name()==='shop');const intake=()=>p.frames().find(f=>f.name()==='intake');
assert.equal(await shop().locator('#track .slide').count(),0);
assert.equal(await shop().locator('#ph').getAttribute('data-catalog-empty'),'true');
assert.equal(await shop().locator('[data-act="prev-photo"]').isVisible(),false);
await shop().getByRole('button',{name:'Mijn account'}).click();await p.locator('#email').fill('nikki@example.test');await p.locator('#password').fill('test-password');await p.locator('#login [type=submit]').click();await p.locator('#new').waitFor({state:'visible'});await p.locator('#new').click();
const png=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=20;c.height=20;c.getContext('2d').fillRect(0,0,20,20);return c.toDataURL().split(',')[1];});
// Exercise the real browser encoder with a JPEG containing synthetic EXIF metadata.
const jpeg=Buffer.from(await p.evaluate(()=>{const c=document.createElement('canvas');c.width=20;c.height=20;return c.toDataURL('image/jpeg').split(',')[1];}),'base64');
const marker=Buffer.from('NIKKI-SYNTHETIC-PRIVATE-METADATA\0');
const tiff=Buffer.alloc(26);tiff.write('II');tiff.writeUInt16LE(42,2);tiff.writeUInt32LE(8,4);
tiff.writeUInt16LE(1,8);tiff.writeUInt16LE(0x010e,10);tiff.writeUInt16LE(2,12);tiff.writeUInt32LE(marker.length,14);tiff.writeUInt32LE(26,18);
const exif=Buffer.concat([Buffer.from('Exif\0\0'),tiff,marker]);const app1=Buffer.from([0xff,0xe1,0,0]);app1.writeUInt16BE(exif.length+2,2);
const original=Buffer.concat([jpeg.subarray(0,2),app1,exif,jpeg.subarray(2)]);assert.ok(original.includes(marker));
const cleaned=await p.evaluate(async bytes=>{
 const {prepareImage}=await import('/images.js');const {transferPhotos}=await import('/photo-transfer.js');
 const photo={file:new File([Uint8Array.from(bytes)],'original.jpg',{type:'image/jpeg'})};
 const [result]=await transferPhotos([photo],photo,{prepareImage});
 return {src:result.src,main:result.main};
},[...original]);
assert.ok(cleaned.src.startsWith('data:image/jpeg;base64,'));assert.equal(cleaned.main,true);
const encoded=Buffer.from(cleaned.src.split(',')[1],'base64');assert.ok(!encoded.includes(marker));assert.ok(!encoded.includes(Buffer.from('Exif\0\0')));assert.notDeepEqual(encoded,original);
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
assert.equal(await shop().locator('#track .slide').count(),1);assert.ok(await shop().locator('#track img').first().evaluate(i=>i.complete&&i.naturalWidth>0));
const originalKey=[...db.keys()][0];
assert.equal(await shop().locator('#ph').getAttribute('data-catalog-empty'),'false');
assert.equal(await shop().locator('#title').textContent(),title,'markup in a title stays text');
assert.equal(await shop().locator('#title img').count(),0);
async function reloadCatalog(page=p) {
 // Use the account entry point directly so a refresh can also exercise an open dialog.
 if(await page.locator('#shop').isVisible())await page.evaluate(()=>window.NikkiApp.openAccount());
 // Clear the previous status so repeated refreshes cannot pass on stale success.
 await page.locator('#status').evaluate(el=>{el.textContent='';});
 await page.locator('#reload').click();
 await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Collectie vernieuwd.'));
 await page.locator('[data-screen=shop]').click();
}
for(const width of [1440,1920]) {
 await p.setViewportSize({width,height:1000});
 assert.ok((await shop().locator('#ph').boundingBox()).width<=390);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight));
 assert.ok(await shop().evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
}
await p.setViewportSize({width:390,height:844});
await shop().locator('#price').click();await shop().locator('#like').click();
const extraId='44444444-4444-4444-8444-444444444444';
db.set(extraId,{...structuredClone(db.get(originalKey)),id:extraId,display_id:2,data:{...structuredClone(db.get(originalKey).data),title:'Ander stuk'}});
await reloadCatalog();
assert.equal(await shop().locator('#title').textContent(),title,'reordering preserves the viewed garment');
assert.equal(await shop().locator('#price').getAttribute('aria-pressed'),'true','cart follows the permanent ID');
assert.equal(await shop().locator('#like').getAttribute('aria-pressed'),'true','likes follow display_id');
db.delete(extraId);await reloadCatalog();
const brokenId='55555555-5555-4555-8555-555555555555';
db.set(brokenId,{...structuredClone(db.get(originalKey)),id:brokenId,display_id:3,data:{...structuredClone(db.get(originalKey).data),title:'Stuk zonder foto',images:[{path:brokenId+'/'+'a'.repeat(64)+'.jpg',role:'Voorkant',main:true}]}});
const batchesBefore=signBatches;await reloadCatalog();
assert.equal(await p.locator('#status').innerText(),'Collectie vernieuwd. 1 stuk wordt niet getoond omdat de foto’s niet bereikbaar zijn.');
assert.equal(signBatches-batchesBefore,1);assert.equal(await shop().locator('#track .slide').count(),1);db.delete(brokenId);
// Refresh keeps a menu destination, then the detail panel and its selected photo.
await shop().locator('.shop').click();await shop().getByRole('menuitem',{name:'Collectie',exact:true}).click();
await reloadCatalog();assert.ok(await shop().getByRole('dialog',{name:'Collectie',exact:true}).isVisible());
await shop().locator('#cart [data-act=close]').click();
const row=db.get(originalKey),savedImages=row.data.images;
const detailPath=originalKey+'/'+'c'.repeat(64)+'.jpg';photos.set(detailPath,photos.get(savedImages[0].path));
row.data.images=[...savedImages,{path:detailPath,role:'Detail',main:false}];
await reloadCatalog();
await shop().locator('[data-act=next-photo]').click();
assert.equal(await shop().locator('#dots').getAttribute('aria-label'),'Foto 2 van 2');
assert.equal(await shop().locator('[data-act=next-photo]').evaluate(el=>el===document.activeElement),true);
await shop().locator('[data-act=info]').click();
assert.ok(await shop().locator('#info').isVisible());
assert.equal(await shop().locator('#info .kv').first().innerText(),'Borstbreedte\n56,5 cm');
let nextBatch=signBatches+1;await reloadCatalog();
assert.ok((await shop().locator('#track img').first().getAttribute('src')).endsWith('token=test-'+nextBatch));
assert.equal(await shop().locator('#dots').getAttribute('aria-label'),'Foto 2 van 2');
assert.ok(await shop().locator('#info').isVisible());
await shop().locator('#info [data-act=close]').focus();
await p.clock.setFixedTime(new Date(Date.now()+41*60*1000));
const beforeHidden=signBatches;
await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
assert.equal(signBatches,beforeHidden);
await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
await shop().waitForFunction(n=>document.querySelector('#track img')?.src.endsWith('token=test-'+n),beforeHidden+1);
assert.equal(await shop().locator('#dots').getAttribute('aria-label'),'Foto 2 van 2');
assert.ok(await shop().locator('#info').isVisible());
assert.equal(await shop().locator('#info [data-act=close]').evaluate(el=>document.activeElement===el),true,'photo renewal retains dialog focus');
await p.evaluate(()=>{document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});assert.equal(signBatches,beforeHidden+1);
await p.clock.setFixedTime(new Date());row.data.images=savedImages;photos.delete(detailPath);
await p.reload();await p.waitForFunction(()=>document.getElementById('status').textContent==='Collectie geladen.');assert.equal(await shop().locator('#track .slide').count(),1);
const visitor=await context(),v=await visitor.newPage();await v.goto('https://app.test');await v.waitForFunction(()=>document.getElementById('status').textContent==='Collectie geladen.');assert.equal(await v.frames().find(f=>f.name()==='shop').locator('#track .slide').count(),1);
// The visitor has this unique piece in the basket when it is sold.
await v.frames().find(f=>f.name()==='shop').locator('#price').click();
await shop().getByRole('button',{name:'Mijn account'}).click();
const soldRequest=p.waitForRequest(req=>new URL(req.url()).pathname==='/rest/v1/rpc/mark_garment_sold',{timeout:10000});
await p.getByRole('button',{name:'Markeer verkocht'}).click();
await soldRequest;
assert.equal(await shop().locator('#track .slide').count(),1);
assert.equal(await p.locator('#items li > span').innerText(),title+' — Beschikbaar');
releaseSoldResponse();
await p.waitForFunction(()=>document.getElementById('status').textContent==='Als verkocht opgeslagen.');
assert.equal(await p.locator('#items li > span').innerText(),title+' — Verkocht');
assert.equal(await shop().locator('#track .slide').count(),0);
await p.getByRole('button',{name:'Bewerken',exact:true}).click();await p.waitForFunction(()=>!document.getElementById('intake').hidden);
// Once opened, changing text must not decode a saved image or read it as a data URL again.
await p.evaluate(()=>{
 window.photoWork={decode:0,read:0};
 const decode=window.createImageBitmap;window.createImageBitmap=function(...args){window.photoWork.decode++;return decode.apply(this,args);};
 const read=FileReader.prototype.readAsDataURL;FileReader.prototype.readAsDataURL=function(...args){window.photoWork.read++;return read.apply(this,args);};
});
const edit=intake();await edit.locator('[data-open=tekst]').click();await edit.locator('#t-titel').fill('Gewijzigde verkochte jas');await edit.locator('#publish').click();await p.waitForFunction(()=>document.getElementById('status').textContent.includes('blijft verkocht'));
assert.deepEqual(await p.evaluate(()=>window.photoWork),{decode:0,read:0});
assert.equal(db.size,1);assert.equal(photos.size,1);assert.equal([...db.values()][0].status,'sold');assert.equal([...db.values()][0].version,3);
await reloadCatalog(v);assert.equal(await v.frames().find(f=>f.name()==='shop').locator('#track .slide').count(),0);
{const vs=v.frames().find(f=>f.name()==='shop');await vs.locator('.shop').click();await vs.getByRole('menuitem',{name:'Winkelmand',exact:true}).click();
 await vs.locator('.cart-note').filter({hasText:'inmiddels verkocht'}).waitFor();await vs.locator('#cart [data-act=close]').first().click().catch(()=>{});}
// Photos "Alleen voor controle": Gemini sees them, the boutique never does, and editing keeps them.
{
 await p.evaluate(()=>window.NikkiApp.openAccount());await p.locator('#new').click();
 const n=intake();await n.evaluate(()=>document.getElementById('again').click());
 const colours=['#111','#933','#393','#339','#990','#909','#099','#777','#abc'];
 const files=[];for(const [i,colour] of colours.entries())files.push({name:'foto-'+i+'.png',mimeType:'image/png',buffer:Buffer.from(await p.evaluate(c=>{const k=document.createElement('canvas');k.width=20;k.height=20;const x=k.getContext('2d');x.fillStyle=c;x.fillRect(0,0,20,20);return k.toDataURL().split(',')[1];},colour),'base64')});
 await n.locator('#gallery').setInputFiles(files);
 assert.equal(await n.locator('#thumbs .thumb').count(),8,'at most eight photos');
 assert.match(await n.locator('#photo-count').innerText(),/meer kan niet/);
 for(let i=7;i>=2;i--){await n.locator(`[data-del="${i}"]`).dispatchEvent("click");assert.equal(await n.locator("#thumbs .thumb").count(),i);}
 await n.locator('#analyse').click();await n.locator('#step-review').waitFor({state:'visible'});assert.equal(lastAnalysisCount,2,'Gemini sees every photo');
 await n.locator('#intern-1').click();assert.equal(await n.locator('#intern-1').getAttribute('aria-pressed'),'true');
 assert.equal(await n.locator('[data-main="1"]').count(),0,'an internal photo cannot be the main photo');
 assert.equal(await n.locator('#intern-1').evaluate(e=>document.activeElement===e),true);
 await n.locator('[data-allok]').click();await n.locator('[data-open=wat]').click();
 for(const [k,v]of [['bont','Nee'],['materiaal','Wol'],['model','Cape'],['lengte','Kort']])await n.locator(`[data-k="${k}"][data-v="${v}"]`).click();
 await n.locator('[data-open=maten]').click();await n.locator('#m-chest').fill('50');await n.locator('#m-length').fill('80');
 await n.locator('[data-open=bijz]').click();await n.locator('[data-k=bijzonderheden][data-v=Geen]').click();
 await n.locator('[data-open=tekst]').click();await n.locator('#t-titel').fill('Cape met controlefoto');await n.locator('#t-prijs').fill('90');
 await n.locator('[data-open=fotos]').click();await n.locator('[data-main="0"]').click();
 await n.locator('#publish').click();await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Cape met controlefoto is opgeslagen'));
 const cape=[...db.values()].find(r=>r.data.title==='Cape met controlefoto'),hidden=privateRows.get(cape.id);
 assert.equal(cape.data.images.length,1);assert.equal(cape.data.images[0].main,true);
 assert.equal(hidden.internal.length,1);assert.deepEqual(Object.keys(hidden.internal[0]).sort(),['path','role']);
 assert.notEqual(hidden.internal[0].path,cape.data.images[0].path);assert.equal(photos.has(hidden.internal[0].path),true,'internal photo uploaded');
 assert.equal(hidden.ai.titel,'AI voorstel','the Gemini proposal is kept next to the piece');
 assert.doesNotMatch(JSON.stringify(cape.data),new RegExp(hidden.internal[0].path.split('/')[1]),'internal path never in public data');
 await reloadCatalog(v);const vs=v.frames().find(f=>f.name()==='shop');
 assert.equal(await vs.locator('#title').textContent(),'Cape met controlefoto');assert.equal(await vs.locator('#track .slide').count(),1,'visitor sees only the boutique photo');
 // Editing loads the internal photo again, marked, and saving without a new analysis keeps it and the proposal.
 await p.evaluate(()=>window.NikkiApp.openAccount());
 await p.locator('#items li').filter({hasText:'Cape met controlefoto'}).getByRole('button',{name:'Bewerken'}).click();await p.waitForFunction(()=>!document.getElementById('intake').hidden);
 const e=intake();await e.locator('.ph').first().waitFor();
 assert.equal(await e.locator('.ph').count(),2);assert.equal(await e.locator('.ph.intern').count(),1);assert.equal(await e.locator('#intern-1').getAttribute('aria-pressed'),'true');assert.equal(await e.locator('#intern-0').getAttribute('aria-pressed'),'false');
 fs.mkdirSync('test-results/intake',{recursive:true});
 for(const width of [390,320]){await p.setViewportSize({width,height:844});await e.locator('.ph-grid').scrollIntoViewIfNeeded();await p.screenshot({path:`test-results/intake/fotos-${width}.png`});}
 await p.setViewportSize({width:390,height:844});
 await e.locator('[data-open=tekst]').click();await e.locator('#t-prijs').fill('95');await e.locator('#publish').click();
 await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Cape met controlefoto is opgeslagen'));
 assert.equal(privateRows.get(cape.id).internal.length,1);assert.equal(privateRows.get(cape.id).ai.titel,'AI voorstel');
}
assert.deepEqual(errors,[]);console.log('PASS cloud UI: login, batch photo signing, broken photo isolated, refresh keeps view and product photo, visibility renewal, analysis adapter, new-photo EXIF removal, stored-photo reuse, failed save/retry, durable reload, guest catalog, option B, local cart/likes, edit sold without resurrection, eight photos with internal ones hidden from visitors. Remote services mocked.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

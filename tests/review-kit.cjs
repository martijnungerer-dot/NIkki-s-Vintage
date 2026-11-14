const {chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
// Review kit (app/review-kit): mark, describe (also inside a same-origin iframe), save, queue on failure, never read form values.
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
try{
 const page=await (await browser.newContext({viewport:{width:390,height:844},isMobile:true})).newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const kit=fs.readFileSync(path.join(__dirname,'../app/review-kit/review-kit.js'));
 const frame='<button id=coat style="margin:40px;width:200px;height:80px">Leren mantel</button><input id=pw type=password value=geheim style="margin:40px;width:200px;height:40px">';
 await page.route('https://kit.test/**',r=>{
  const u=new URL(r.request().url());
  if(u.pathname==='/review-kit.js')return r.fulfill({contentType:'text/javascript',body:kit});
  return r.fulfill({contentType:'text/html',body:`<!doctype html><meta name=viewport content="width=device-width"><body style="margin:0">
   <iframe id=shop style="border:0;width:390px;height:600px" srcdoc='${frame}'></iframe>
   <script type=module>import {createReviewKit} from '/review-kit.js';
    window.saved=[];window.enabled=false;window.fail=false;
    window.kit=createReviewKit({isEnabled:()=>window.enabled,context:()=>({screen:'shop'}),
     save:async(kind,body,context)=>{if(window.fail)throw Error('offline');window.saved.push({kind,body,context});}});
   </script>`});
 });
 await page.goto('https://kit.test/');
 const fab=page.getByRole('button',{name:/Opmerking maken/});
 await page.waitForTimeout(1200);
 assert.ok(await fab.isHidden(),'hidden while not enabled (not signed in)');
 await page.evaluate(()=>{window.enabled=true;});
 await fab.waitFor({state:'visible',timeout:3000});
 const box=await fab.boundingBox();assert.ok(box.width>=44&&box.height>=44,'44px target');

 // Drag over the coat button inside the iframe, choose "Vraag", save.
 const shop=await page.locator('#shop').boundingBox(),coat=await page.frameLocator('#shop').locator('#coat').boundingBox();
 await fab.click();
 await page.mouse.move(coat.x+10,coat.y+10);await page.mouse.down();await page.mouse.move(coat.x+150,coat.y+60,{steps:5});await page.mouse.up();
 assert.ok(await page.locator('.rk-mark').isVisible(),'yellow mark stays visible');
 await page.getByRole('button',{name:'Vraag',exact:true}).click();
 await page.getByRole('textbox',{name:'Jouw opmerking'}).fill('Wat betekent deze knop?');
 await page.getByRole('button',{name:'Bewaar',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Bewaard'}).waitFor();
 const first=(await page.evaluate(()=>window.saved))[0];
 assert.equal(first.kind,'vraag');assert.equal(first.body,'Wat betekent deze knop?');
 assert.equal(first.context.screen,'shop');assert.equal(first.context.target.frame,'shop');assert.equal(first.context.target.text,'Leren mantel');
 assert.ok(first.context.rect.w>=130&&first.context.rect.h>=45,'the marked area is stored');
 assert.ok(await page.locator('.rk-mark').count()===0 && await fab.isVisible(),'closed after saving');

 // A tap on a password field: the value is never stored.
 const pw=await page.frameLocator('#shop').locator('#pw').boundingBox();
 await fab.click();await page.mouse.click(pw.x+20,pw.y+10);
 await page.getByRole('textbox',{name:'Jouw opmerking'}).fill('Veld te smal');
 await page.getByRole('button',{name:'Bewaar',exact:true}).click();
 const second=(await page.evaluate(()=>window.saved))[1];
 assert.equal(second.kind,'opmerking','default kind');assert.equal(second.context.target.tag,'input');
 assert.ok(!JSON.stringify(second).includes('geheim'),'no form values in a note');

 // Escape cancels without saving; empty text is not saved.
 await fab.click();await page.keyboard.press('Escape');assert.equal(await page.locator('.rk-layer').count(),0);
 await fab.click();await page.mouse.click(30,30);await page.getByRole('button',{name:'Bewaar',exact:true}).click();
 assert.ok(await page.locator('.rk-sheet').isVisible(),'empty note stays open');await page.getByRole('button',{name:'Annuleer',exact:true}).click();
 assert.equal((await page.evaluate(()=>window.saved)).length,2);

 // Offline: the note is queued and sent once saving works again.
 await page.evaluate(()=>{window.fail=true;});
 await fab.click();await page.mouse.click(60,60);await page.getByRole('textbox',{name:'Jouw opmerking'}).fill('Later versturen');
 await page.getByRole('button',{name:'Bewaar',exact:true}).click();
 await page.getByRole('status').filter({hasText:'later vanzelf'}).waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('review-kit-queue')).length),1);
 await page.evaluate(()=>{window.fail=false;});
 await page.waitForFunction(()=>window.saved.length===3&&!localStorage.getItem('review-kit-queue'),null,{timeout:4000});
 assert.equal((await page.evaluate(()=>window.saved))[2].body,'Later versturen');

 // Signed out: the button disappears; destroy removes everything.
 await page.evaluate(()=>{window.enabled=false;});await fab.waitFor({state:'hidden',timeout:3000});
 await page.evaluate(()=>window.kit.destroy());assert.equal(await page.locator('.rk-host').count(),0);
 assert.deepEqual(errors,[]);
 // In the real app: hidden for visitors, shown after staff login, notes go to the add_review_note RPC.
 const app=await (await browser.newContext({viewport:{width:390,height:844},isMobile:true})).newPage();
 app.on('pageerror',e=>errors.push(e.message));
 const notes=[];
 await app.route('**/*',async r=>{
  const u=new URL(r.request().url()),req=r.request();
  if(u.hostname==='app.test'){
   const p=u.pathname==='/'?'/index.html':u.pathname;
   if(p==='/config.js')return r.fulfill({contentType:'text/javascript',body:"export const config={supabaseUrl:'https://test.supabase.co',supabasePublishableKey:'public-test-key'}"});
   try{return r.fulfill({contentType:p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(path.join(__dirname,'../dist/cloud',p))});}catch{return r.fulfill({status:404});}
  }
  if(u.hostname!=='test.supabase.co')return r.abort();
  const headers={'access-control-allow-origin':'https://app.test','access-control-allow-headers':'*','access-control-allow-methods':'*'};
  const json=(d,status=200)=>r.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(d)});
  if(req.method()==='OPTIONS')return r.fulfill({status:204,headers});
  if(u.pathname==='/auth/v1/token')return json({access_token:'test-session',refresh_token:'refresh',expires_at:Date.now()/1000+3600});
  if(u.pathname==='/rest/v1/garments')return json([]);
  if(u.pathname==='/rest/v1/rpc/require_staff')return json(null);
  if(u.pathname==='/rest/v1/rpc/add_review_note'){assert.equal(req.headers().authorization,'Bearer test-session');notes.push(req.postDataJSON());return json(1);}
  if(u.pathname==='/functions/v1/personalise')return json({source:'fallback',ranking:[]});
  return json({},404);
 });
 await app.goto('https://app.test/');
 await app.waitForFunction(()=>document.getElementById('status').textContent==='Collectie geladen.');
 const appFab=app.getByRole('button',{name:/Opmerking maken/});
 await app.waitForTimeout(1200);assert.ok(await appFab.isHidden(),'visitors never see the review button');
 await app.frames().find(f=>f.name()==='shop').getByRole('button',{name:'Mijn account'}).click();
 await app.locator('#email').fill('nikki@example.test');await app.locator('#password').fill('test-password');
 await app.locator('#login').evaluate(f=>f.requestSubmit());
 await appFab.waitFor({state:'visible',timeout:4000});
 await appFab.click();await app.mouse.click(195,300);
 await app.getByRole('button',{name:'Aanpassing',exact:true}).click();
 await app.getByRole('textbox',{name:'Jouw opmerking'}).fill('Maak deze tekst groter');
 await app.getByRole('button',{name:'Bewaar',exact:true}).click();
 await app.getByRole('status').filter({hasText:'Bewaard'}).waitFor();
 assert.equal(notes.length,1);assert.equal(notes[0].p_kind,'aanpassing');assert.equal(notes[0].p_body,'Maak deze tekst groter');
 assert.equal(notes[0].p_context.screen,'manage');assert.ok(!JSON.stringify(notes).includes('test-password'),'no password in a note');
 console.log('PASS review kit (incl. real app: hidden for visitors, staff only, RPC): hidden until enabled, 44px, mark and describe inside iframe, kinds, no form values, cancel, empty note, offline queue and retry, destroy.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

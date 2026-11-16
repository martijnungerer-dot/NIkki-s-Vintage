const {chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
// Review kit queue: no lost notes, no duplicate sends, stable ids, text stays editable on failure.
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const kit=fs.readFileSync(path.join(__dirname,'../app/review-kit/review-kit.js'));
const html=`<!doctype html><meta name=viewport content="width=device-width"><body style="margin:0"><button id=b style="margin:60px;width:200px;height:80px">Knop</button>
<script type=module>import {createReviewKit} from '/review-kit.js';
 window.sent=[];window.mode='ok';window.release=null;window.enabled=true;
 window.kit=createReviewKit({isEnabled:()=>window.enabled,save:(kind,body,context)=>{
  window.sent.push({kind,body,id:context.clientId});
  if(window.mode==='fail')return Promise.reject(Error('offline'));
  if(window.mode==='hold')return new Promise((res,rej)=>{window.release=(ok)=>ok?res():rej(Error('late'));});
  return Promise.resolve();}});
</script>`;
const route=async ctx=>ctx.route('https://kit.test/**',r=>{const u=new URL(r.request().url());
 r.fulfill(u.pathname==='/review-kit.js'?{contentType:'text/javascript',body:kit}:{contentType:'text/html',body:html});});
const keys=p=>p.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('review-kit-queue:')).sort());
const note=async(p,text,type)=>{await p.getByRole('button',{name:/Opmerking maken/}).click();await p.mouse.click(100,100);
 if(type)await p.getByRole('button',{name:type,exact:true}).click();await p.getByRole('textbox',{name:'Jouw opmerking'}).fill(text);};
const save=p=>p.getByRole('button',{name:/^Bewaar/}).click();
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true});await route(ctx);
 const errors=[];

 // 1. A note added while another one is still being sent is not lost.
 let page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://kit.test/');await page.waitForSelector('.rk-fab:not([hidden])');
 await page.evaluate(()=>{window.mode='hold';});
 await note(page,'Eerste');await save(page);
 await page.waitForFunction(()=>window.sent.length===1);
 assert.equal((await keys(page)).length,1,'stored before the send finished');
 assert.ok(await page.getByRole('textbox',{name:'Jouw opmerking'}).isDisabled(),'text locked while sending');
 assert.ok(await page.locator('[data-kind]').first().isDisabled(),'kind locked while sending');
 await page.evaluate(()=>window.release(false));
 await page.getByRole('status').filter({hasText:'later vanzelf'}).waitFor();
 await page.evaluate(()=>{window.mode='fail';});
 await note(page,'Tweede');await save(page);await page.getByRole('status').filter({hasText:'later vanzelf'}).last().waitFor();
 assert.equal((await keys(page)).length,2,'both notes are waiting, none overwritten');
 await page.evaluate(()=>{window.mode='hold';window.sent.length=0;});
 await page.evaluate(()=>window.kit.flush());
 await page.waitForFunction(()=>window.sent.length>=1);
 // finishing a flush removes only the notes it sent
 await page.evaluate(()=>{window.mode='ok';window.release&&window.release(true);});
 await page.waitForFunction(()=>!Object.keys(localStorage).some(k=>k.startsWith('review-kit-queue:')),null,{timeout:14000});
 await page.evaluate(()=>{window.mode='fail';});
 await note(page,'Derde');await save(page);await page.getByRole('status').filter({hasText:'later vanzelf'}).last().waitFor();
 assert.equal((await keys(page)).length,1);

 // 2. While sending the form cannot be cancelled; the answer then closes it.
 await page.evaluate(()=>{localStorage.clear();window.mode='hold';window.sent.length=0;});
 await note(page,'Laat antwoord');await save(page);await page.waitForFunction(()=>window.sent.length===1);
 assert.ok(await page.getByRole('button',{name:'Annuleer',exact:true}).isDisabled(),'cannot cancel while sending');
 await page.evaluate(()=>window.release(true));
 await page.getByRole('status').filter({hasText:'Bewaard'}).waitFor();
 assert.equal((await keys(page)).length,0,'removed after success');
 assert.equal(await page.locator('.rk-sheet').count(),0);
 await page.evaluate(()=>{window.mode='ok';});

 // 3. Legacy array is migrated with stable ids; sent once even with two tabs.
 const legacy=[{kind:'vraag',body:'Oud een',context:{screen:'x'}},{kind:'opmerking',body:'Oud twee',context:{screen:'y'}}];
 await page.close(); // other tabs would pick the notes up as well
 const a=await ctx.newPage(),b=await ctx.newPage();
 await a.goto('https://kit.test/');await b.goto('https://kit.test/');
 await b.evaluate(()=>{window.enabled=false;});await a.evaluate(l=>{window.enabled=false;localStorage.setItem('review-kit-queue',JSON.stringify(l));},legacy);
 await a.evaluate(()=>{window.mode='fail';window.enabled=true;});await a.waitForFunction(()=>Object.keys(localStorage).some(k=>k.startsWith('review-kit-queue:')),null,{timeout:4000});
 const firstKeys=await keys(a);
 assert.equal(firstKeys.length,2);assert.equal(await a.evaluate(()=>localStorage.getItem('review-kit-queue')),null,'old array removed after migration');
 // Same legacy data again (as from a partially migrated profile) gives the same ids.
 await a.evaluate(l=>{window.enabled=false;localStorage.setItem('review-kit-queue',JSON.stringify(l));},legacy);
 await a.evaluate(()=>{window.enabled=true;});await a.waitForFunction(()=>!localStorage.getItem('review-kit-queue'),null,{timeout:4000});
 assert.deepEqual(await keys(a),firstKeys,'deterministic ids');
 // Two tabs, same waiting notes: both may send, both send the same ids (the server stores each once).
 await a.evaluate(()=>{window.enabled=false;window.sent.length=0;});
 await a.evaluate(()=>{window.mode='ok';window.enabled=true;});await b.evaluate(()=>{window.mode='ok';window.enabled=true;});
 await a.waitForFunction(()=>!Object.keys(localStorage).some(k=>k.startsWith('review-kit-queue:')),null,{timeout:14000});
 const idsA=await a.evaluate(()=>window.sent.map(s=>s.id)),idsB=await b.evaluate(()=>window.sent.map(s=>s.id));
 const wanted=firstKeys.map(k=>k.split(':')[1]);
 for(const id of [...idsA,...idsB])assert.ok(wanted.includes(id),'only the migrated ids are sent');

 // 4. Storage and network both fail: the form stays open with the text; a retry keeps the same id.
 const f=await ctx.newPage();f.on('pageerror',e=>errors.push(e.message));await f.goto('https://kit.test/');await f.waitForSelector('.rk-fab:not([hidden])');
 await f.evaluate(()=>{window.mode='fail';Storage.prototype.setItem=()=>{throw new Error('quota');};});
 await note(f,'Blijft staan','Vraag');await save(f);
 await f.getByRole('status').filter({hasText:'Bewaren lukte niet'}).waitFor();
 const box=f.getByRole('textbox',{name:'Jouw opmerking'});
 assert.equal(await box.inputValue(),'Blijft staan');assert.ok(await box.isEnabled(),'editable again');
 await save(f);await f.waitForFunction(()=>window.sent.length===2);
 const ids2=await f.evaluate(()=>window.sent.map(s=>s.id));assert.equal(ids2[0],ids2[1],'same text and kind: same client id');
 await box.fill('Andere tekst');await save(f);await f.waitForFunction(()=>window.sent.length===3);
 assert.notEqual((await f.evaluate(()=>window.sent))[2].id,ids2[0],'changed text: new id');
 // Network recovers while storage is down: sending succeeds without a queue.
 await f.evaluate(()=>{window.mode='ok';});await save(f);await f.getByRole('status').filter({hasText:'Bewaard'}).waitFor();

 // 5. destroy() stops sending and new notes.
 await f.evaluate(()=>{window.mode='ok';});
 const d=await ctx.newPage();await d.goto('https://kit.test/');await d.waitForSelector('.rk-fab:not([hidden])');
 await d.evaluate(()=>{window.enabled=false;localStorage.setItem('review-kit-queue:00000000-0000-4000-8000-000000000001',JSON.stringify({kind:'vraag',body:'Wacht',context:{clientId:'00000000-0000-4000-8000-000000000001'}}));window.sent.length=0;window.kit.destroy();window.enabled=true;});
 await d.waitForTimeout(2500);
 assert.equal(await d.evaluate(()=>window.sent.length),0,'no sending after destroy');
 assert.equal(await d.locator('.rk-host').count(),0);
 assert.deepEqual(errors,[]);
 console.log('PASS review queue: per-note keys, no lost notes, legacy migration with stable ids, two tabs, editable text on failure, same id on retry, destroy.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

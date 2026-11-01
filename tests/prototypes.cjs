// Run with Playwright installed: node tests/prototypes.cjs
// Optional browser selector: CHROMIUM_PATH=/usr/bin/chromium
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,'concept',name),'utf8');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 try {
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,acceptDownloads:true});
 await context.route('https://**/*',r=>r.abort()); // offline prototypes must remain usable
 const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 for(const name of ['intake-prototype.html','site-skeleton.html','start-hier-nikki.html']){
  const page=await context.newPage();await page.setContent(read(name));
  assert.deepEqual(await page.evaluate(()=>[innerWidth,document.compatMode]),[390,'CSS1Compat']);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+' horizontal overflow');
  if(name==='site-skeleton.html'){
   const styles=[];
   for(let i=0;i<5;i++){styles.push(await page.locator('html').getAttribute('data-style'));await page.locator('#style-next').click();}
   assert.deepEqual(errors,[]); assert.equal(new Set(styles).size,5,JSON.stringify(styles));
   await page.locator('[data-style-like]').click();await page.locator('#style-choice').click();
   assert.ok(await page.locator('#choice').isVisible());await page.locator('#choice-close').click();
   await page.locator('#style-next').click();
   const exportedStyle=await page.locator('html').getAttribute('data-style');
   await page.locator('#open-photos').click();
   // A tiny synthetic PNG tests embedding without committing any user images.
   const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64');
   await page.locator('#mood-photo').setInputFiles({name:'fixture.png',mimeType:'image/png',buffer:png});
   await page.waitForFunction(()=>document.getElementById('photo-msg').textContent.includes('Foto toegevoegd'));
   const downloadPromise=page.waitForEvent('download');await page.locator('#save-photos').click();
   const download=await downloadPromise;const saved=fs.readFileSync(await download.path(),'utf8');
   assert.ok(saved.includes('data:image/png;base64,'));
   const reopened=await context.newPage();await reopened.setContent(saved);
   assert.equal(await reopened.locator('html').getAttribute('data-style'),exportedStyle);
   assert.ok(await reopened.locator('#hero-track img.photo').count()>0);
   assert.ok(await reopened.locator('#hero-track img.photo').first().evaluate(img=>img.complete&&img.naturalWidth>0));
   await reopened.locator('#style-next').click();
   await reopened.setViewportSize({width:1280,height:900});
   assert.ok(await reopened.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await reopened.close();
  }
  if(name==='start-hier-nikki.html'){
   await page.locator('#reflection').fill('Parisienne');await page.locator('#next').click();
   assert.ok((await page.locator('#question').innerText()).includes('gevoel'));
   await page.locator('#previous').click();assert.equal(await page.locator('#reflection').inputValue(),'Parisienne');
   await page.locator('[data-copy]').click();assert.ok((await page.locator('#copy-status').innerText()).length>0);
  }
  await page.close();
 }
 // Exercise actual validation functions with controlled state, not duplicated validators.
 let html=read('intake-prototype.html');
 html=html.replace(/\}\)\(\);\s*<\/script>/,`window.probe=function(){
 const results=[];
 resetItem(); m.chest='56.5';m.length='100';text.titel='Oefenjas';text.prijs='125.50';
 results.push(STEPS[3].done()&&STEPS[5].done());
 for(const bad of ['Infinity','-2','0','abc','1e3','56.55']){m.chest=bad;results.push(!STEPS[3].done());}
 m.chest='56';m.shoulder='-5';results.push(!STEPS[3].done());m.shoulder='';
 for(const bad of ['Infinity','-2','0','abc','1e3','125.555']){text.prijs=bad;results.push(!STEPS[5].done());}
 text.prijs='125';text.titel='   ';results.push(!STEPS[5].done());
 resetItem();startReview({bont:{waarde:'Misschien'},materiaal:{waarde:'Leer'},model:{waarde:'Cape'},kleur:{waarde:'Zwart'},lengte:{waarde:'Lang'}},0,'');
 results.push(!STEPS[1].done()&&!STEPS[2].done());
 sel.bont='Ja';sel.bontsoort='Vos';speciesChecked=false;results.push(!STEPS[2].done());speciesChecked=true;results.push(STEPS[2].done());
 m.chest='56';m.length='100';text.prijs='150';text.titel='Mijn eigen titel';
 startReview({titel:'Nieuwe suggestie'},0,'');results.push(m.chest==='56'&&text.prijs==='150'&&text.titel==='Mijn eigen titel');
 return results;
 };})();</script>`);
 const page=await context.newPage();await page.setContent(html);assert.ok((await page.evaluate(()=>window.probe())).every(Boolean));
 assert.deepEqual(errors,[]);
 console.log('PASS: mobile document layout, five styles, style choice, photo import/export/reopen, desktop layout, guide questions/copy, numeric validation, fur validation and preserved input. External requests blocked.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

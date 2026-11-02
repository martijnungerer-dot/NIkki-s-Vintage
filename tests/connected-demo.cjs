const {chromium}=require('playwright');const fs=require('fs');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,acceptDownloads:true});await c.route('https://**/*',r=>r.abort());const errors=[];c.on('page',p=>p.on('pageerror',e=>(errors.push(e.message),console.log('PAGEERROR',e.message))));
const p=await c.newPage();p.setDefaultTimeout(8000);await p.setContent(fs.readFileSync('concept/nikki-proefapp.html','utf8'));await p.waitForFunction(()=>document.getElementById('shop').contentWindow.NikkiStore);
const frame=()=>p.frames().find(f=>f.name()==='intake');const store=()=>p.frames().find(f=>f.name()==='shop');
await p.locator('[data-view=intake]').click();const f=frame();
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64');
async function fill(title){
await f.locator('#gallery').setInputFiles({name:'test.png',mimeType:'image/png',buffer:png});await f.locator('#manual').click();
await f.locator('[data-rol]').selectOption('Voorkant');await f.locator('[data-allok]').click();
await f.locator('[data-open=wat]').click();
for(const [k,v]of [['bont','Nee'],['materiaal','Leer'],['model','Autojas'],['kleur','Zwart'],['lengte','Lang']])await f.locator(`[data-k="${k}"][data-v="${v}"]`).click();
await f.locator('[data-open=maten]').click();await f.locator('#m-chest').fill('56,5');await f.locator('#m-length').fill('100');
await f.locator('[data-open=bijz]').click();await f.locator('[data-k=bijzonderheden][data-v=Geen]').click();
await f.locator('[data-open=tekst]').click();await f.locator('#t-titel').fill(title);await f.locator('#t-beschrijving').fill('Mijn eigen beschrijving');await f.locator('#t-prijs').fill('125,50');
}
const title='<img src=x onerror="window.hacked=1"> Oefenjas';await fill(title);
await p.locator('[data-view=shop]').click();await p.locator('[data-view=intake]').click();assert.equal(await f.locator('#t-titel').inputValue(),title);
await f.locator('#publish').click();await p.waitForFunction(()=>document.getElementById('count').textContent==='1 eigen stuk');
const s=store();assert.equal(await s.locator('#hero-track .slide').count(),10);assert.ok((await s.locator('#hero-track .ov-top').first().innerText()).includes('125,50'));
assert.equal(await s.evaluate(()=>window.hacked),undefined);
await s.locator('#hero-track [data-open]').first().click();assert.equal(await s.locator('#p-title').innerText(),title);assert.ok((await s.locator('#p-measure').innerText()).includes('56.5'));assert.equal(await s.locator('#p-description').innerText(),'Mijn eigen beschrijving');
await p.locator('[data-view=intake]').click();await f.locator('#t-prijs').fill('150');await f.locator('#publish').click();await p.waitForTimeout(150);assert.equal(await s.locator('#hero-track .slide').count(),10);
await p.locator('[data-view=intake]').click();await f.locator('#new-draft').click();await fill('Tweede stuk');await f.locator('#publish').click();await p.waitForFunction(()=>document.getElementById('count').textContent==='2 eigen stukken');assert.equal(await s.locator('#hero-track .slide').count(),11);
const styles=[];for(let i=0;i<5;i++){styles.push(await s.locator('html').getAttribute('data-style'));await s.locator('#style-next').click();}assert.equal(new Set(styles).size,5);
await s.locator('#style-next').click();const savedStyle=await s.locator('html').getAttribute('data-style');
const d=p.waitForEvent('download');await p.locator('#download').click();const file=await(await d).path();const reopened=await c.newPage();await reopened.setContent(fs.readFileSync(file,'utf8'));await reopened.waitForFunction(()=>document.getElementById('count').textContent==='2 eigen stukken');const rs=reopened.frames().find(f=>f.name()==='shop');assert.equal(await rs.locator('html').getAttribute('data-style'),savedStyle);assert.equal(await rs.locator('#hero-track .slide').count(),11);assert.ok(await rs.locator('#hero-track img.photo').first().evaluate(i=>i.complete&&i.naturalWidth>0));
assert.deepEqual(errors,[]);console.log('PASS: real input flow, tab preservation, photo/price/measurements/description, safe text, update without duplicate, second item, five styles, full HTML export/reopen.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});

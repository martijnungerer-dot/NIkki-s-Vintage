// Run with Playwright installed: node tests/ontdekken-optie-b.cjs
// Optional browser selector: CHROMIUM_PATH=/usr/bin/chromium
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','concept','ontdekken-optie-b.html'),'utf8');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 try {
  for (const width of [390,320]) {
   const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
   await context.route('https://**/*',r=>r.abort()); // must work offline: no external photos or fonts required
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setContent(html);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+'px horizontal overflow');
   assert.equal(await page.locator('img').count(),0,'no photos are committed or referenced by default');
   assert.equal(await page.locator('#title').textContent(),'Bruine vintage jas');
   // Price toggles the cart directly; no popup.
   await page.locator('#price').click();
   assert.equal(await page.locator('#price').getAttribute('aria-pressed'),'true');
   assert.ok(await page.locator('#bag-full').isVisible());
   // Name opens the detail panel; closing keeps the current piece.
   await page.locator('[data-act="info"]').click();
   assert.ok(await page.locator('#info').isVisible());
   await page.locator('#info [data-act="close"]').click();
   assert.ok(await page.locator('#info').isHidden());
   // Next piece from the button row; previous-piece button returns.
   await page.locator('#nexts .th').first().click();
   assert.equal(await page.locator('#title').textContent(),'Gevlekte jas met sjaalkraag');
   assert.equal(await page.locator('#price').getAttribute('aria-pressed'),'false','cart state is per piece');
   await page.locator('#prev-th').click();
   assert.equal(await page.locator('#title').textContent(),'Bruine vintage jas');
   // Photo arrows move within the piece.
   await page.locator('[data-act="next-photo"]').click();
   assert.equal(await page.locator('#dots').getAttribute('aria-label'),'Foto 2 van 3');
   // Menu leads to the cart, which lists the added piece.
   await page.locator('.shop').click();
   await page.locator('[data-act="cart-open"]').click();
   assert.equal(await page.locator('#cart .line').count(),1);
   await page.locator('#cart [data-act="cart-remove"]').click();
   assert.ok(await page.locator('#cart').getByText('Je winkelmand is leeg.').isVisible());
   assert.deepEqual(errors,[]);
   await context.close();
  }
  console.log('PASS ontdekken optie B: 390 en 320 px zonder overloop, offline, prijs naar winkelmand, uitlegpaneel, knoppenrij, foto-pijltjes, winkelmand.');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});

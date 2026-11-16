// Mock "Zoeken als gesprek" (concept/zoeken-gesprek.html). Run: node tests/zoeken-gesprek.cjs
// Optional: CHROMIUM_PATH=/usr/bin/chromium, NIKKI_SCREENSHOTS=<folder>
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'concept/zoeken-gesprek.html'),'utf8');
const output=path.resolve(process.env.NIKKI_SCREENSHOTS||path.join(root,'work/zoeken-gesprek'));
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 try{
  for(const [width,height] of [[390,844],[320,568],[1280,860]]){
   const phone=width<900;
   const context=await browser.newContext({viewport:{width,height},...(phone?{isMobile:true,hasTouch:true}:{}),reducedMotion:'reduce'});
   const requests=[],errors=[];
   // Offline apart from the font, which gets a local copy: the mock never sends anything.
   await context.route('**/*',route=>{
    const u=new URL(route.request().url());
    if(u.hostname==='fonts.googleapis.com')return route.fulfill({contentType:'text/css',body:"@font-face{font-family:Newsreader;font-weight:200 800;src:url('https://mock.test/font.ttf') format('truetype')}"});
    if(u.pathname==='/font.ttf')return route.fulfill({contentType:'font/ttf',body:fs.readFileSync(path.join(root,'tests/fixtures/fonts/Newsreader.ttf'))});
    if(u.hostname==='mock.test')return route.fulfill({contentType:'text/html',body:html});
    requests.push(u.href);return route.abort();
   });
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto('https://mock.test/');await page.evaluate(()=>document.fonts.ready);
   const tag=width+'x'+height;
   // Screenshot of the shop itself (and on a laptop the conversation next to it), not the demo buttons above.
   const shot=async name=>{await page.locator('.stage').scrollIntoViewIfNeeded();await page.locator(phone?'#ph':'.stage').screenshot({path:path.join(output,name+'-'+tag+'.png')});};
   const rules=async where=>{
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),tag+' no horizontal overflow at '+where);
    for(const b of await page.locator('#ph button:visible, #ph input:visible, #side button:visible, #side input:visible').all()){const r=await b.boundingBox();if(!r)continue;assert.ok(r.width>=43.9&&r.height>=43.9,tag+' control at least 44px at '+where+': '+r.width+'×'+r.height);}
    const small=await page.evaluate(()=>{const out=[];for(const el of document.querySelectorAll('#ph *, #side *')){if(el.closest('svg')||!el.offsetParent)continue;if([...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&parseFloat(getComputedStyle(el).fontSize)<16)out.push(el.textContent.trim().slice(0,30));}return out;});
    assert.deepEqual(small,[],tag+' text at least 16px at '+where);
    // No text over the photo.
    assert.equal(await page.locator('#photo').evaluate(el=>el.innerText.trim()),'',tag+' no text over the photo');
   };
   const said=()=>page.locator(phone?'#strip':'#side').innerText();
   const ask=async text=>{await page.fill('#q',text);await page.press('#q','Enter');await page.locator(phone?'#strip .say':'#side .turn-ai').last().waitFor();};
   await rules('rest');await shot('1-rust');
   assert.equal(await page.locator('#strip').isVisible(),false,'no strip before a question');

   // A sentence in her own words: one line back, the pieces in the big photo, one follow-up with buttons.
   await ask('Warme jas voor de winter');
   assert.match(await said(),/Ik vond zeven warme jassen\./);
   assert.match(await said(),/Met of zonder bont\?/);
   await rules('answer');await shot('2-antwoord');
   await page.getByRole('button',{name:'Zonder bont',exact:true}).click();
   assert.match(await said(),/twee warme jassen zonder bont/);
   const first=await page.locator('#title').innerText();
   assert.ok(['Shearling jas met kraag','Lange wollen jas'].includes(first),'the big photo shows a piece that was found: '+first);
   if(phone){
    // Browsing folds the strip to one line, so the photo gets its room back; "Verder vragen" opens it again.
    await page.locator('#thumbs [data-go]').first().click();
    assert.equal(await page.locator('#strip .chips').count(),0);assert.match(await page.locator('#strip').innerText(),/2 van 2/);
    await rules('browsing');await shot('3-bladeren');
   } else await shot('3-bladeren');
   // The fourth slot stays empty and switched off when fewer pieces were found.
   assert.ok(await page.locator('#thumbs button[disabled]').count()>=1);

   // Nothing found: honest, with something close.
   await page.locator('#clear').click();assert.equal(await page.locator('#q').inputValue(),'');
   await ask('Suède onder € 100');
   assert.match(await said(),/Geen jassen van suède tot € 100\. Wel dichtbij: suède jack voor € 140\./);

   // Size only when asked: measure a coat that fits, flat, armpit to armpit; "probably fits", never "your size".
   await page.locator('#clear').click();
   await ask('Past dit bij maat 38?');
   assert.match(await said(),/Leg hem plat en meet van oksel tot oksel/);
   await rules('size question');await shot('4-maat');
   const box=page.locator((phone?'#strip':'#side')+' [data-cm]');await box.locator('input').fill('54');await box.locator('button').click();
   assert.match(await said(),/plat ongeveer 54 cm breed.*passen waarschijnlijk/);
   assert.doesNotMatch(await said(),/jouw maat/i);
   await rules('size answer');
   // A question about anything else never asks about size by itself.
   await page.locator('#clear').click();await ask('Iets met bont, niet te lang');
   assert.doesNotMatch(await said(),/oksel|maat/i);
   assert.deepEqual(errors,[]);assert.deepEqual(requests,[],'the mock sends nothing');
   await context.close();
  }
  console.log('PASS zoeken als gesprek (mock): 390/320×568/1280, strip under the search bar folds while browsing, results in the photo and the bottom row, one follow-up with buttons, honest when nothing is found, size only when asked, 44 px / 16 px, no text over the photo, offline. Screenshots: '+output);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

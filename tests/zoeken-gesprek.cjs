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
   const shot=async name=>{await page.locator('.stage').scrollIntoViewIfNeeded();await page.locator(phone?'#ph':'.stage').screenshot({path:path.join(output,name+'-'+tag+'.png')});};
   const rules=async where=>{
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),tag+' no horizontal overflow at '+where);
    for(const b of await page.locator('#ph button:visible, #ph input:visible, #side button:visible, #side input:visible').all()){const r=await b.boundingBox();if(!r)continue;assert.ok(r.width>=43.9&&r.height>=43.9,tag+' control at least 44px at '+where+': '+(await b.innerText())+' '+r.width+'×'+r.height);}
    const small=await page.evaluate(()=>{const out=[];for(const el of document.querySelectorAll('#ph *, #side *')){if(el.closest('svg')||!el.offsetParent)continue;if([...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&parseFloat(getComputedStyle(el).fontSize)<16)out.push(el.textContent.trim().slice(0,30));}return out;});
    assert.deepEqual(small,[],tag+' text at least 16px at '+where);
    assert.equal(await page.locator('#photo').evaluate(el=>el.innerText.trim()),'',tag+' no text over the photo');
   };
   const talk=()=>page.locator(phone?'#strip':'#side');
   const said=()=>talk().innerText();
   const ask=async text=>{await page.fill('#q',text);await page.press('#q','Enter');await page.locator(phone?'#strip .say':'#side .turn-ai').last().waitFor();};
   const mode=async name=>{await page.locator('#setbtn').click();await page.getByRole('radio',{name:new RegExp('^'+name)}).click();};
   await rules('rest');await shot('1-rust');
   assert.equal(await page.locator('#strip').isVisible(),false,'no strip before a question');

   // Gewoon (default): one line back, the pieces in the big photo, one follow-up with buttons.
   await ask('Warme jas voor de winter');
   assert.match(await said(),/Ik vond zeven warme jassen\./);assert.match(await said(),/Met of zonder bont\?/);
   await rules('answer');await shot('2-antwoord');
   await page.getByRole('button',{name:'Zonder bont',exact:true}).click();
   // Few results are named, as links; a link shows that piece in the big photo. Never "perfect for you".
   assert.match(await said(),/twee warme jassen zonder bont\. Dat zijn shearling jas met kraag en lange wollen jas\./);
   assert.doesNotMatch(await said(),/perfect|aanrad|speciaal voor jou/i);
   await talk().getByRole('button',{name:/^lange wollen jas ·/i}).click();
   assert.equal(await page.locator('#title').innerText(),'Lange wollen jas');
   if(phone){
    // Browsing folds the strip; the whole conversation can be enlarged and read back, and made small again.
    assert.equal(await page.locator('#strip .chips').count(),0);
    await rules('browsing');await shot('3-bladeren');
    await page.getByRole('button',{name:'Het hele gesprek bekijken'}).click();
    const big=page.locator('#big');assert.equal(await big.isVisible(),true);
    assert.match(await big.innerText(),/Warme jas voor de winter[\s\S]*Ik vond zeven warme jassen[\s\S]*Zonder bont[\s\S]*Dat zijn/);
    await rules('enlarged');await shot('5-uitvergroot');
    await big.getByRole('button',{name:/^shearling jas met kraag ·/i}).click();
    assert.equal(await big.isVisible(),false,'a link closes the enlarged conversation and shows the piece');
    assert.equal(await page.locator('#title').innerText(),'Shearling jas met kraag');
   } else await shot('3-bladeren');
   assert.ok(await page.locator('#thumbs button[disabled]').count()>=1,'empty slots stay switched off');

   // Nothing found: honest, with something close as a link.
   await page.locator('#clear').click();
   await ask('Suède onder € 100');
   assert.match(await said(),/Geen jassen van suède tot € 100\. Wel dichtbij: suède jack voor € 140\./);
   await talk().getByRole('button',{name:/^suède jack ·/i}).click();assert.equal(await page.locator('#title').innerText(),'Suède jack');

   // Size only when asked; "probably fits", never "your size".
   await page.locator('#clear').click();
   await ask('Past dit bij maat 38?');
   assert.match(await said(),/Leg hem plat en meet van oksel tot oksel/);
   await rules('size question');await shot('4-maat');
   const box=talk().locator('[data-cm]');await box.locator('input').fill('54');await box.locator('button').click();
   assert.match(await said(),/plat ongeveer 54 cm breed.*passen waarschijnlijk/);assert.doesNotMatch(await said(),/jouw maat/i);
   await page.locator('#clear').click();await ask('Iets met bont, niet te lang');
   assert.doesNotMatch(await said(),/oksel|maat/i,'never about size by itself');

   // Hulpstand: Meer uitleg says why; Zakelijk is short and has only buttons; Uit is a plain word search.
   await page.locator('#clear').click();await ask('Warme jas voor de winter');
   await mode('Meer uitleg');await page.locator(phone?'#strip .say':'#side .turn-ai').last().waitFor();
   assert.match(await said(),/Warm betekent hier: bont, shearling of wol\./);
   await mode('Zakelijk');await page.locator(phone?'#strip .say':'#side .turn-ai').last().waitFor();
   assert.match(await said(),/^7 warme jassen\./m);assert.doesNotMatch(await said(),/Met of zonder bont\?/);
   assert.equal(await talk().getByRole('button',{name:'Zonder bont',exact:true}).count(),1,'buttons to refine stay');
   await mode('Uit');
   if(!phone)assert.equal(await page.locator('#side').isVisible(),false,'with the conversation off, the laptop column disappears');
   const talkOff=()=>page.locator('#strip').innerText();
   assert.match(await talkOff(),/Niets gevonden voor “Warme jas voor de winter”\./,'without AI the bar searches words, like the Collectie search');
   assert.equal(await page.getByRole('button',{name:'Het hele gesprek bekijken'}).count(),0);
   await page.fill('#q','nerts');await page.press('#q','Enter');assert.match(await talkOff(),/2 gevonden\./);
   await rules('off');await page.locator('#setbtn').click();await rules('settings');await shot('6-hulpstand');await page.keyboard.press('Escape');
   // The choice is remembered on this device.
   await page.reload();await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.locator('#offdot').isVisible(),true);
   await page.locator('#setbtn').click();assert.equal(await page.getByRole('radio',{name:/^Uit/}).getAttribute('aria-checked'),'true');
   assert.deepEqual(errors,[]);assert.deepEqual(requests,[],'the mock sends nothing');
   await context.close();
  }
  console.log('PASS zoeken als gesprek (mock): 390/320×568/1280; strip under the search bar folds while browsing and can be enlarged to the whole conversation; links to named pieces; reserved recommending; one follow-up; honest when nothing is found; size only when asked; hulpstand Uit/Zakelijk/Gewoon/Meer uitleg remembered; 44 px / 16 px; no text over the photo; offline. Screenshots: '+output);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

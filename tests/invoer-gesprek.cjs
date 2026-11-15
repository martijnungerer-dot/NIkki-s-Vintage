// Mock "Nieuw stuk als gesprek" (concept/invoer-gesprek.html). Run: node tests/invoer-gesprek.cjs
// Optional: CHROMIUM_PATH=/usr/bin/chromium, NIKKI_SCREENSHOTS=<folder>
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'concept/invoer-gesprek.html'),'utf8');
const output=path.resolve(process.env.NIKKI_SCREENSHOTS||path.join(root,'work/invoer-gesprek'));
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 try{
  for(const width of [390,320]){
   const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
   const requests=[],errors=[];
   // Offline apart from the font, which gets a local copy: the mock never sends anything.
   await context.route('**/*',route=>{
    const u=new URL(route.request().url());
    if(u.hostname==='fonts.googleapis.com')return route.fulfill({contentType:'text/css',body:"@font-face{font-family:Newsreader;font-weight:200 800;src:url('https://mock.test/font.ttf') format('truetype')}"});
    if(u.pathname==='/font.ttf')return route.fulfill({contentType:'font/ttf',body:fs.readFileSync(path.join(root,'tests/fixtures/fonts/Newsreader.ttf'))});
    if(u.hostname==='mock.test')return route.fulfill({contentType:'text/html',body:html});
    requests.push(u.href);return route.abort();
   });
   // Deterministic stand-ins for the browser's voice: speaking ends by itself, listening "hears" window.__say.
   await context.addInitScript(()=>{
    window.__spoken=[];
    window.SpeechSynthesisUtterance=function(text){this.text=text;};
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{cancel(){},speak(u){window.__spoken.push(u.text);window.__utter=u;}}});
    window.SpeechRecognition=window.webkitSpeechRecognition=function(){const rec=this;rec.start=()=>{window.__rec=rec;};rec.abort=()=>{};};
    window.__endSpeech=()=>window.__utter.onend();
    window.__hear=text=>{const rec=window.__rec;if(text)rec.onresult({results:[[{transcript:text}]]});rec.onend();};
   });
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto('https://mock.test/');await page.evaluate(()=>document.fonts.ready);
   const shot=name=>page.screenshot({path:path.join(output,name+'-'+width+'.png')});
   const question=()=>page.locator('#question').innerText();
   const rules=async where=>{
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),width+'px no horizontal overflow at '+where);
    for(const b of await page.locator('button:visible, label.chip:visible, #free:visible').all()){const r=await b.boundingBox();assert.ok(r.width>=43.9&&r.height>=43.9,width+'px control at least 44px at '+where+': '+(await b.innerText().catch(()=>''))+' '+r.width+'×'+r.height);}
    const small=await page.evaluate(()=>{const w=document.createTreeWalker(document.getElementById('app'),NodeFilter.SHOW_TEXT),out=[];while(w.nextNode()){const n=w.currentNode,e=n.parentElement;if(n.textContent.trim()&&e.getClientRects().length&&parseFloat(getComputedStyle(e).fontSize)<16)out.push(n.textContent.trim());}return out;});
    assert.deepEqual(small,[],width+'px text at least 16px at '+where);
    // No text over a photo: visible text never intersects an image (text scrolled out of the conversation does not count).
    assert.equal(await page.evaluate(()=>{const imgs=[...document.querySelectorAll('img')].map(i=>i.getBoundingClientRect()),w=document.createTreeWalker(document.getElementById('app'),NodeFilter.SHOW_TEXT);let hits=0;while(w.nextNode()){if(!w.currentNode.textContent.trim())continue;const r=document.createRange();r.selectNode(w.currentNode);const clip=w.currentNode.parentElement.closest('#talk')?.getBoundingClientRect();for(const b of r.getClientRects()){const top=clip?Math.max(b.top,clip.top):b.top,bottom=clip?Math.min(b.bottom,clip.bottom):b.bottom;if(bottom<=top)continue;for(const p of imgs)if(b.width&&p.width&&b.left<p.right&&b.right>p.left&&top<p.bottom&&bottom>p.top)hits++;}}return hits;}),0,width+'px no text over a photo at '+where);
   };
   assert.match(await page.locator('.ai.now').innerText(),/Laat me het stuk zien/);await rules('start');await shot('1-start');
   await page.getByRole('button',{name:'Voorbeeldfoto’s gebruiken'}).click();
   await page.locator('#question').waitFor();
   assert.equal(await page.locator('#thumbs img').count(),3);
   assert.match(await question(),/Is het hele stuk van bont/);await rules('bont');
   // The voice box is on every question, in the same place, and at rest until Nikki taps it.
   const voice=page.locator('#voice');
   assert.equal(await voice.getAttribute('data-voice'),'idle');assert.equal(await voice.getAttribute('aria-label'),'Praat met de AI');
   const voiceBox=await voice.boundingBox();
   assert.equal(await page.evaluate(()=>window.__spoken.length),0,'nothing is read aloud before a tap');
   // Tap: the AI reads the question (speaking wave), then listens (dancing bars); the answer moves the talk on.
   await voice.click();
   assert.equal(await voice.getAttribute('data-voice'),'speaking');assert.match(await page.evaluate(()=>window.__spoken[0]),/Is het hele stuk van bont/);
   assert.equal(await voice.locator('.wave').isVisible(),true);assert.equal(await voice.locator('.bars').isVisible(),false);
   await page.evaluate(()=>window.__endSpeech());
   assert.equal(await voice.getAttribute('data-voice'),'listening');assert.equal(await voice.locator('.bars').isVisible(),true);
   await shot('2a-luistert');
   await page.evaluate(()=>window.__hear('ja helemaal'));
   // The species is never proposed: Nikki says it. A typed or dictated word that is a choice counts as that choice.
   assert.match(await question(),/Wat voor bont is dit/);
   assert.equal(await page.locator('.chip[aria-pressed=true]').count(),0,'no species is preselected');
   assert.equal(await page.locator('#voice').getAttribute('data-voice'),'speaking','the next question is read aloud');
   assert.deepEqual(await page.locator('#voice').boundingBox(),voiceBox,'the voice box stays in the same place');
   // A tap while the AI talks stops the voice; typing keeps working.
   await page.locator('#voice').click();assert.equal(await page.locator('#voice').getAttribute('data-voice'),'idle');
   await shot('2-bontsoort');
   await page.locator('#free').fill('nerts');await page.locator('.send').click();
   assert.match(await question(),/O, mooi spul\./,'a warm reaction for Nikki');assert.match(await question(),/sjaalkraag, donkerbruin en lang\. Klopt dat/);
   assert.equal(await page.getByText('Waar is het van gemaakt').count(),0,'no material question when the whole piece is fur');
   await rules('klopt');await shot('3-klopt');
   await page.getByRole('button',{name:'Klopt',exact:true}).click();
   await page.getByRole('button',{name:'Jaren 70'}).click();
   // Several details at once, including a flaw and an own word.
   assert.equal(await page.getByRole('button',{name:'Zijden voering'}).getAttribute('aria-pressed'),'true','what the AI saw is preselected');
   await page.getByRole('button',{name:'Kale plek'}).click();await page.locator('#free').fill('gouden knopen');await page.locator('.send').click();
   assert.equal(await page.getByRole('button',{name:'Gouden knopen'}).getAttribute('aria-pressed'),'true');
   await rules('bijzonderheden');await shot('4-bijzonderheden');
   await page.getByRole('button',{name:'Klaar',exact:true}).click();
   assert.match(await question(),/Dat komt eerlijk in de beschrijving/);
   // Measurements: cm, a wrong value is refused, optional ones can be skipped (stay empty).
   assert.equal(await page.locator('#hero img.measure').count(),1);
   await page.locator('#free').fill('abc');await page.locator('.send').click();assert.match(await page.locator('.err').innerText(),/Vul een getal in/);
   await page.locator('#free').fill('400');await page.locator('.send').click();assert.match(await page.locator('.err').innerText(),/meer dan 300/);
   await rules('maten');await shot('5-maten');
   await page.locator('#free').fill('56,5');await page.locator('.send').click();
   await page.locator('#free').fill('112');await page.locator('.send').click();
   await page.getByRole('button',{name:'Weet ik nog niet',exact:true}).click();await page.getByRole('button',{name:'Weet ik nog niet',exact:true}).click();
   assert.match(await question(),/Lange jas van nerts met sjaalkraag/);
   await page.getByRole('button',{name:'Goed zo'}).click();
   await page.locator('#free').fill('450');await page.locator('.send').click();
   // Overview before saving; skipped measurements are not shown, and the compliments are not in it.
   const card=await page.locator('.card').innerText();
   for(const text of ['Lange jas van nerts met sjaalkraag','€ 450','Nerts','Donkerbruin','Jaren 70','Kale plek','Gouden knopen','56,5 cm','112 cm'])assert.ok(card.includes(text),'overview shows '+text);
   assert.doesNotMatch(card,/Schouderbreedte|Mouwlengte|mooi spul/i);
   await rules('overzicht');await shot('6-overzicht');
   // Any answer can be changed from the overview; the rest stays.
   await page.locator('.card [data-edit=bontsoort]').click();await page.getByRole('button',{name:'Vos',exact:true}).click();
   assert.ok((await page.locator('.card').innerText()).includes('Vos'));assert.ok((await page.locator('.card').innerText()).includes('56,5 cm'));
   // The back arrow reopens the last question.
   await page.locator('#back').click();assert.match(await question(),/Wat moet hij kosten/);await page.locator('#back').click();
   assert.equal(await page.locator('#open').count(),0,'nothing is missing');
   await page.getByRole('button',{name:'Opslaan (proef)',exact:true}).click();
   assert.match(await page.locator('.ai.now').innerText(),/Klaar/);
   await page.getByRole('button',{name:'Volgend stuk'}).click();assert.equal(await page.locator('#thumbs').isVisible(),false);
   // Without fur: no species question, the material is asked instead.
   await page.getByRole('button',{name:'Voorbeeldfoto’s gebruiken'}).click();await page.locator('#question').waitFor();
   await page.getByRole('button',{name:'Nee, geen bont'}).click();assert.match(await question(),/Waar is het van gemaakt/);
   await page.getByRole('button',{name:'Leer',exact:true}).click();assert.equal(await page.getByText('Wat voor bont is dit').count(),0);
   // Never stuck: every question can be skipped, also the measurements. The piece is then kept as a concept,
   // and the overview says what the boutique still needs.
   let guard=0;
   while(await page.locator('[data-skip]').count()){assert.ok(++guard<20,'stuck at: '+(await question()).replace(/\n/g,' | ')+' steps '+await page.locator('#steps').innerText());await rules('skip '+guard);await page.locator('[data-skip]').click();}
   assert.match(await page.locator('.ai.now').innerText(),/Voor de boetiek heb ik dit nog nodig/);
   const open=await page.locator('#open').innerText();
   for(const label of ['Model, kleur, lengte','Borstbreedte','Ruglengte','Titel','Prijs'])assert.ok(open.includes(label),'still needed: '+label);
   assert.doesNotMatch(open,/Periode|Schouderbreedte|Mouwlengte|Bijzonderheden/,'optional answers are never required');
   await rules('concept');await shot('7-concept');
   // One missing answer can be filled in straight from the overview, by voice too.
   await page.locator('#open [data-edit=chest]').click();await page.locator('#voice').click();await page.evaluate(()=>window.__endSpeech());
   await page.evaluate(()=>window.__hear('zesenvijftig komma vijf, 56,5 centimeter'));
   assert.ok((await page.locator('.card').last().innerText()).includes('56,5 cm'));assert.doesNotMatch(await page.locator('#open').innerText(),/Borstbreedte/);
   // Hearing nothing does not block either.
   await page.locator('#open [data-edit=length]').click();await page.locator('#voice').click();await page.evaluate(()=>window.__endSpeech());
   await page.evaluate(()=>window.__hear('weet ik niet'));
   await page.getByRole('button',{name:'Bewaar als concept (proef)'}).click();
   assert.match(await page.locator('.ai.now').innerText(),/Bewaard als concept/);
   assert.deepEqual(errors,[]);assert.deepEqual(requests,[],'the mock sends nothing');
   assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0,'the mock stores nothing');
   await context.close();
  }
  console.log('PASS invoer als gesprek (mock): 390/320, one question at a time, voice box (speaking and listening waves) in a fixed place, every question can be skipped and ends as a concept, species only from Nikki, typed answer matches a choice, confirm what the AI saw, details with flaws and own words, cm checks and skipping, overview and editing, no fur path, 44px/16px, no text over photos, nothing sent or stored. Screenshots: '+output);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

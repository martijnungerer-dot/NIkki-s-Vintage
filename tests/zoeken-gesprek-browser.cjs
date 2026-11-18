// Real storefront, mocked public search service; no production requests or inventory writes.
const assert=require('node:assert/strict');const path=require('node:path');const fs=require('node:fs');
const {fixture,id,names}=require('./zoek-fixture.cjs');
const output=path.resolve(process.env.NIKKI_SEARCH_SCREENSHOTS||'work/search-screenshots');
async function submit(shop,page,text){await shop.locator('#q').fill(text);await shop.locator('#q').press('Enter');await shop.locator('#search[aria-busy="false"]').waitFor();}
async function mode(shop,value){await shop.locator('#setbtn').click();await shop.locator('#set [data-mode="'+value+'"]').click();}
async function bounds(shop,width){
 assert.ok(await shop.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+' no horizontal document scroll');
 for(const el of await shop.locator('#search button:visible,#setbtn:visible,#strip button:visible,#big button:visible,#side button:visible').all()){
  const r=await el.boundingBox();assert.ok(r.width>=43.95&&r.height>=43.95,width+' control >=44px '+await el.getAttribute('aria-label')+' '+r.width+'x'+r.height);
 }
 const bad=await shop.evaluate(()=>[...document.querySelectorAll('#search input,#strip,#big,#side')].flatMap(root=>[root,...root.querySelectorAll('*')]).filter(el=>el.getClientRects().length&&[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&parseFloat(getComputedStyle(el).fontSize)<16).map(el=>el.className));
 assert.deepEqual(bad,[],width+' all search text >=16px');
 assert.equal(await shop.locator('#photo').evaluate(el=>el.innerText.trim()),'','photo has no text');
 if(width<900&&await shop.locator('#strip').isVisible()&&await shop.locator('#big').isHidden()){
  const strip=await shop.locator('#strip').boundingBox(),photo=await shop.locator('#photo').boundingBox();assert.ok(strip.y+strip.height<=photo.y+1,'conversation strip never overlays photo');
 }
 if(width<900){const band=await shop.locator('#band').boundingBox();assert.ok(band.y+band.height<= (width<=320?568:844)+1,'navigation fits the viewport');}
}
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 for(const width of [390,320,280,1024]){
  const {browser,page,state,open}=await fixture(width);
  try{
   let shop=await open();
   await bounds(shop,width);
   assert.ok(await shop.locator('#setbtn').isVisible(),'help button in topbar');
   assert.ok(await shop.locator('.brand img,.brand svg').count(),'emblem beside brand');
   await shop.locator('#setbtn').click();assert.equal(await shop.locator('[data-mode=gewoon]').getAttribute('aria-checked'),'true');await shop.locator('[data-mode=gewoon]').click();
   const tasteBefore=await shop.evaluate(()=>localStorage.getItem('nikki-taste'));
   await submit(shop,page,'Een wollen jas');
   assert.equal(state.requests.length,1);assert.equal(state.requests[0].mode,'gewoon');
   assert.ok(state.requestHeaders.every(h=>!h.authorization||h.authorization==='Bearer public-test-key'),'no staff/session token in public search');
   assert.equal(await shop.locator('#nexts img').count(),1,'only matching pieces in photo navigation');
   assert.equal(await shop.locator('#prev-th:visible,#nexts .th:visible').count(),4,'four slots remain visible');
   assert.equal(await shop.locator('#nexts .th:disabled').count(),2,'missing results leave disabled slots');
   await bounds(shop,width);
   const conversation=shop.locator(width<900?'#big':'#side');
   if(width<900){
    await shop.locator('#nexts .th:not(:disabled)').click();assert.equal(await shop.locator('#title').textContent(),names[1]);
    assert.equal(await shop.locator('#strip .chips:visible button').count(),0,'browsing collapses follow-up row');
    await shop.locator('#search-summary').click();assert.ok(await conversation.isVisible(),'sentence opens whole conversation');
   }else assert.ok(await conversation.isVisible(),'laptop conversation column');
   await bounds(shop,width);
   assert.ok((await conversation.innerText()).includes('Een wollen jas'),'full history retains question');
   assert.ok((await conversation.innerText()).includes('Welke kleur zoek je?'),'follow-up question visible');
   assert.equal(await conversation.locator('.hits [data-search-item]').count(),2,'found pieces rendered as grid');
   assert.ok(await conversation.locator('[data-search-item="'+id(0)+'"]').count()>=2,'named piece and result links');
   await page.screenshot({path:path.join(output,'conversation-'+width+'.png'),fullPage:true});
   await conversation.locator('.hits [data-search-item="'+id(0)+'"]').click();assert.equal(await shop.locator('#title').textContent(),names[0]);
   if(width<900){
    await conversation.waitFor({state:'hidden'});assert.equal(await shop.locator('#search-summary').evaluate(el=>document.activeElement===el),true,'piece selection restores focus');
    await shop.locator('#search-summary').click();await page.keyboard.press('Escape');await conversation.waitFor({state:'hidden'});
    assert.equal(await shop.locator('#search-summary').evaluate(el=>document.activeElement===el),true,'Escape restores focus');
    await shop.locator('#search-summary').click();await conversation.locator('[data-search-close]').click();await conversation.waitFor({state:'hidden'});
    await shop.locator('#search-summary').click();await page.evaluate(()=>history.back());await conversation.waitFor({state:'hidden'});
    assert.equal(await shop.locator('#search-summary').evaluate(el=>document.activeElement===el),true,'phone Back closes and restores focus');
   }
   await page.screenshot({path:path.join(output,'after-'+width+'.png'),fullPage:true});
   assert.equal(await shop.evaluate(()=>localStorage.getItem('nikki-taste')),tasteBefore,'search and links do not learn taste');
   await shop.locator('#clear').click();assert.equal(await shop.locator('#nexts img').count(),3,'clear restores full collection');
   for(const value of ['uit','zakelijk','meer','gewoon']){
    await mode(shop,value);await page.reload();await page.waitForFunction(()=>document.getElementById('status').textContent==='Collectie geladen.');shop=page.frames().find(f=>f.name()==='shop');
    await shop.locator('#setbtn').click();assert.equal(await shop.locator('[data-mode='+value+']').getAttribute('aria-checked'),'true','mode persists '+value);await shop.locator('[data-mode='+value+']').click();
    const count=state.requests.length;await submit(shop,page,'leren');
    if(value==='uit'){
     assert.equal(state.requests.length,count,'off sends no request');assert.equal(await shop.locator('#title').textContent(),names[2],'off uses word search');assert.ok(await shop.locator('#side').isHidden(),'off has no laptop column');
    }else assert.equal(state.requests.at(-1).mode,value);
    await shop.locator('#clear').click();
   }
   state.fail=true;await submit(shop,page,'leren');assert.equal(await shop.locator('#title').textContent(),names[2],'failure falls back to word search');
   assert.ok((await shop.locator(width<900?'#strip':'#side').innerText()).length>0,'calm failure notice');
   await shop.locator('#clear').click();state.fail=false;
   state.reply={source:'ai',filters:{},ids:[],reaction:'Niets gevonden.',question:null,buttons:[]};
   await submit(shop,page,'onbekend');assert.ok((await shop.locator(width<900?'#search-summary':'#side .search-reply').last().innerText()).includes('Niets gevonden'));assert.equal(await shop.locator('#track img').count(),0,'empty results invent nothing');
   await shop.locator('#clear').click();
   for(const cancel of ['clear','off']){
    let release;state.reply={source:'ai',filters:{},ids:[id(0)],reaction:'Eén stuk gevonden.',question:null,buttons:[]};state.hold=new Promise(resolve=>{release=resolve;});
    await shop.locator('#q').fill('jas');await shop.locator('#q').press('Enter');await shop.locator('#search[aria-busy="true"]').waitFor();
    if(cancel==='clear')await shop.locator('#clear').click();else await mode(shop,'uit');
    release();state.hold=null;await shop.locator('#search[aria-busy="false"]').waitFor();
    await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,100)));
    assert.equal(await shop.locator('#nexts img').count(),3,'late response cannot restrict cleared/off results');
    if(cancel==='off')await shop.locator('#clear').click();
   }
   assert.deepEqual(state.writes,[],'no inventory/auth/storage writes');assert.deepEqual(state.errors,[]);
  }finally{await browser.close();}
 }
 // Multi-turn size context and catalog renewal exercise state outside presentation alone.
 {
  const {browser,page,state,open}=await fixture(390);
  try{
   const shop=await open();
   state.reply={source:'ai',filters:{},ids:[id(0),id(1)],reaction:'Vergelijk een jas die goed zit.',question:'Meet die jas plat van oksel tot oksel in cm. Hoeveel is dat?',buttons:[]};
   await submit(shop,page,'Welke maat past waarschijnlijk?');await shop.locator('#search-summary').click();
   const follow=shop.locator('#big .search-follow input');
   state.reply={source:'ai',filters:{borstCm:52},ids:[id(0),id(1)],reaction:'Deze stukken passen waarschijnlijk.',question:null,buttons:[]};
   await follow.fill('52 cm');await follow.press('Enter');await shop.locator('#search[aria-busy="false"]').waitFor();
   assert.equal(await follow.inputValue(),'','submitted follow-up is cleared');
   assert.ok(JSON.stringify(state.requests.at(-1).context).includes('oksel'),'previous measurement question is sent in bounded context');
   assert.ok((await shop.locator('#big').innerText()).includes('Meet die jas plat'),'measurement question retained in visible history');
   await shop.locator('#big [data-search-close]').click();
   await shop.locator('[data-act=next-photo]').click();await shop.locator('[data-act=info]').click();
   const dots=await shop.locator('#dots').getAttribute('aria-label');
   async function refresh(){await page.evaluate(()=>{document.getElementById('status').textContent='';document.getElementById('reload').click();});await page.waitForFunction(()=>document.getElementById('status').textContent==='Collectie vernieuwd.');}
   await refresh();assert.ok(await shop.locator('#info').isVisible(),'catalog renewal keeps open product details');assert.equal(await shop.locator('#dots').getAttribute('aria-label'),dots,'renewal keeps photo position');
   await page.keyboard.press('Escape');state.rows[0].status='sold';await refresh();
   await shop.locator('#search-summary').click();assert.equal(await shop.locator('#big [data-search-item="'+id(0)+'"]').count(),0,'removed garment links disappear from conversation');
   assert.equal(await shop.locator('#title').textContent(),names[1],'remaining matching piece becomes current');
   assert.deepEqual(state.writes,[]);assert.deepEqual(state.errors,[]);
  }finally{await browser.close();}
 }
 const {browser,page,state,open}=await fixture(320,{noStorage:true});
 try{const shop=await open();await shop.locator('#setbtn').click();assert.equal(await shop.locator('[data-mode=gewoon]').getAttribute('aria-checked'),'true','blocked storage defaults to Gewoon');await shop.locator('[data-mode=gewoon]').click();await submit(shop,page,'jas');assert.equal(state.requests[0].mode,'gewoon');assert.deepEqual(state.errors,[]);}finally{await browser.close();}
 console.log('PASS search conversation: 280/320/390/laptop, topbar B, matching photo/grid/links, four slots, expand/close/Escape/Back/focus, persisted modes and blocked storage, off makes no request, fallback, late responses, no taste or inventory writes, 44px/16px and no overflow. Services mocked.');
})().catch(e=>{console.error(e);process.exitCode=1;});

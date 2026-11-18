const assert = require('node:assert/strict');
const path = require('node:path');

// Runs inside the existing routed storefront fixture: no live services or mutations.
module.exports = async function ({context, width, output, personalise}) {
 const page = await context.newPage();
 await page.goto('https://app.test', {waitUntil:'commit'});
 await page.waitForFunction(() => document.getElementById('status').textContent === 'Collectie geladen.');
 await page.evaluate(() => {localStorage.removeItem('nikki-taste');localStorage.removeItem('gsf-liked');localStorage.removeItem('nikki-cart');sessionStorage.clear();});
 await page.reload();
 await page.waitForFunction(() => document.getElementById('status').textContent === 'Collectie geladen.');
 const shop = page.frames().find(f => f.name() === 'shop');
 const read = () => shop.evaluate(() => JSON.parse(localStorage.getItem('nikki-taste')));
 const weight = async key => (await read())?.features[key]?.w || 0;
 const open = async () => {await shop.locator('.shop').click();await shop.getByRole('menuitem', {name:'Mijn smaak',exact:true}).click();};
 const close = () => shop.locator('#cart [data-act=close]').click();
 const more = shop.getByRole('button', {name:'Meer zoals dit',exact:true});
 const less = shop.getByRole('button', {name:'Minder zoals dit',exact:true});
 await shop.evaluate(() => {window.tasteRefreshes=0;const refresh=window.NikkiPersonalise.refresh;window.NikkiPersonalise.refresh=()=>{window.tasteRefreshes++;refresh();};});
 const refreshes = () => shop.evaluate(() => window.tasteRefreshes);
 const calls = personalise.calls.length;
 await shop.locator('.shop').click();
 assert.deepEqual(await shop.getByRole('menuitem').allTextContents(), ['Collectie','Mijn favorieten','Winkelmand','Mijn smaak','Beheer']);
 await shop.getByRole('menuitem', {name:'Mijn smaak',exact:true}).click();
 assert.ok(await shop.locator('.taste-empty').isVisible());
 assert.equal(await shop.locator('#cart input, #cart select').count(), 0, 'no budget or choice fields');
 await page.screenshot({path:path.join(output,'taste-empty-'+width+'.png')});
 await close();
 const feature = await shop.evaluate(() => window.NikkiTaste.aggregate.featuresOf(window.NikkiShop.api.publicCopy(window.NikkiShop.api.current()))[0][0]);
 const title = await shop.locator('#title').textContent();
 const order = await shop.evaluate(() => window.NikkiShop.api.items().map(it=>it.key));
 await shop.locator('#like').click(); assert.equal(await weight(feature), .5);
 await shop.locator('#like').click(); assert.equal(await weight(feature), 0);
 await shop.locator('#price').click(); assert.equal(await weight(feature), .4);
 await shop.locator('#price').click(); assert.equal(await weight(feature), 0);
 await more.click(); assert.equal(await weight(feature), 1);
 assert.equal(await more.getAttribute('aria-pressed'), 'true');
 await less.click(); assert.equal(await weight(feature), 0, 'opposite signal cancels more');
 assert.equal(await more.getAttribute('aria-pressed'), 'false');
 assert.equal(await less.getAttribute('aria-pressed'), 'false', 'cancelling more does not mark less as pressed');
 await less.click(); assert.equal(await weight(feature), -1);
 assert.equal(await less.getAttribute('aria-pressed'), 'true');
 await more.click(); assert.equal(await weight(feature), 0, 'opposite signal cancels less');
 assert.equal(await more.getAttribute('aria-pressed'), 'false', 'cancelling less does not mark more as pressed');
 assert.equal(await less.getAttribute('aria-pressed'), 'false');
 await more.click(); await more.click(); assert.equal(await weight(feature), 0, 'a second tap releases more and undoes its signal');
 assert.equal(await more.getAttribute('aria-pressed'), 'false');
 assert.equal(await less.getAttribute('aria-pressed'), 'false', 'releasing more does not mark less as pressed');
 await less.click(); await less.click(); assert.equal(await weight(feature), 0, 'a second tap releases less and undoes its signal');
 assert.equal(await less.getAttribute('aria-pressed'), 'false');
 await more.click(); await more.click(); await more.click(); assert.equal(await weight(feature), 1, 'a third tap presses again');
 assert.equal(await more.getAttribute('aria-pressed'), 'true');
 await less.click(); assert.equal(await weight(feature), 0, 'one opposite tap still cancels');
 assert.equal(await more.getAttribute('aria-pressed'), 'false');
 // Releasing or cancelling undoes only the change the first tap really made, also at the ±3 limit.
 const setWeight = w => shop.evaluate(([key,w]) => {const P=window.NikkiTaste.profile,p=P.load(localStorage,Date.now());if(w===null)delete p.features[key];else p.features[key]={w,t:Date.now(),label:'Grens'};P.save(localStorage,p);}, [feature,w]);
 for (const [start, first, second] of [[3,more,more],[-3,less,less],[3,more,less],[-3,less,more],[2.5,more,more]]) {
  await setWeight(start);
  await first.click(); await second.click();
  assert.equal(await weight(feature), start, 'undo restores '+start+' exactly');
  assert.equal(await more.getAttribute('aria-pressed'), 'false');
  assert.equal(await less.getAttribute('aria-pressed'), 'false');
 }
 await setWeight(null);
 // A press left on for 30 days: release removes only the decayed press, never creating the opposite.
 await more.click();
 await shop.evaluate(() => {window.realNow=Date.now;const later=window.realNow()+30*864e5;Date.now=()=>later;});
 await more.click();
 const decayedRelease = await weight(feature);
 await shop.evaluate(() => {Date.now=window.realNow;delete window.realNow;});
 assert.ok(Math.abs(decayedRelease) < .05, 'release after decay restores neutral, not '+decayedRelease);
 assert.equal(await more.getAttribute('aria-pressed'), 'false');
 await setWeight(null);
 // A full profile: entries the press evicts come back on release.
 const full = await shop.evaluate(() => {
  const P=window.NikkiTaste.profile,p=P.load(localStorage,Date.now());p.features={};
  for(let i=0;i<P.MAX_FEATURES;i++)p.features['detail:vulling'+String(i).padStart(2,'0')]={w:.5,t:Date.now(),label:'Vulling '+i};
  P.save(localStorage,p);return Object.keys(p.features).sort();
 });
 await more.click();
 assert.notDeepEqual(Object.keys((await read()).features).sort(), full, 'the press evicts weaker entries');
 await more.click();
 const restored = (await read()).features;
 assert.deepEqual(Object.keys(restored).sort(), full, 'release restores evicted entries');
 assert.ok(Object.values(restored).every(f => Math.abs(f.w - .5) < .001));
 await shop.evaluate(() => {const P=window.NikkiTaste.profile,p=P.load(localStorage,Date.now());p.features={};P.save(localStorage,p);});
 // Release restores the pre-press profile and replays hearts/basket signals made while pressed.
 const shape = p => ({w:Object.fromEntries(Object.entries(p.features).map(([k,f])=>[k,f.w])),counts:p.counts});
 await setWeight(.5);
 const beforePress = shape(await read());
 await more.click(); assert.equal((await read()).counts.more, beforePress.counts.more + 1);
 await more.click(); assert.deepEqual(shape(await read()), beforePress, 'release restores weights and counts exactly');
 await setWeight(2.5);
 await more.click(); await shop.locator('#like').click(); await more.click();
 assert.equal(await weight(feature), 3, 'a heart given at the limit while pressed survives release');
 await shop.locator('#like').click();
 await shop.locator('#like').click(); await setWeight(-.6);
 await more.click(); assert.equal(await weight(feature), .4);
 await shop.locator('#like').click(); await more.click();
 assert.equal(await weight(feature), -.6, 'an unlike while pressed is replayed with its floor at zero');
 // Another tab saved meanwhile: release never overwrites that tab's preferences.
 await setWeight(null);
 await more.click();
 const otherTab = await shop.evaluate(() => {const P=window.NikkiTaste.profile,p=P.load(localStorage,Date.now());p.features['colour:blauw']={w:2,t:Date.now(),label:'Blauw'};P.save(localStorage,p);return localStorage.getItem('nikki-taste');});
 await more.click();
 assert.equal(await shop.evaluate(() => localStorage.getItem('nikki-taste')), otherTab, 'release keeps changes from another tab');
 assert.equal(await more.getAttribute('aria-pressed'), 'false');
 await shop.evaluate(() => {const P=window.NikkiTaste.profile,p=P.load(localStorage,Date.now());p.features={};P.save(localStorage,p);});
 assert.equal(await refreshes(), 0, 'learning does not refresh the personal order');
 assert.equal(personalise.calls.length, calls, 'learning makes no network call');
 assert.equal(await shop.locator('#title').textContent(), title);
 assert.deepEqual(await shop.evaluate(() => window.NikkiShop.api.items().map(it=>it.key)), order);
 await more.click();
 // A failed save must not make a cancelling tap look successful.
 await shop.evaluate(()=>{window.nativeTasteSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='nikki-taste')throw new DOMException('Test quota','QuotaExceededError');return window.nativeTasteSet.call(this,k,v);};});
 await less.click();
 await shop.evaluate(()=>{Storage.prototype.setItem=window.nativeTasteSet;delete window.nativeTasteSet;});
 assert.equal(await weight(feature), 1, 'failed save keeps the stored signal');
 assert.equal(await more.getAttribute('aria-pressed'), 'true', 'failed save keeps the earlier pressed state');
 assert.equal(await less.getAttribute('aria-pressed'), 'false');
 await shop.locator('[data-act=next-photo]').click();
 assert.equal(await more.getAttribute('aria-pressed'), 'true', 'photo change keeps feedback');
 await shop.locator('#nexts .th').first().click();
 assert.equal(await more.getAttribute('aria-pressed'), 'false', 'new piece clears feedback');
 await less.click();
 await page.screenshot({path:path.join(output,'taste-photo-'+width+'.png')});
 const photo = await shop.locator('#photo').boundingBox(), heart = await shop.locator('#like').boundingBox();
 for (const button of [more,less]) {
  const box = await button.boundingBox();
  assert.ok(box.width >= 44 && box.height >= 44);
  assert.ok(box.x >= photo.x && box.x + box.width < heart.x, 'opposite the heart');
  assert.equal(await button.textContent(), '', 'icons without visible words');
 }
 await open();
 assert.ok(await shop.getByRole('heading',{name:'Meer van',exact:true}).isVisible());
 assert.ok(await shop.getByRole('heading',{name:'Minder van',exact:true}).isVisible());
 await page.screenshot({path:path.join(output,'taste-filled-'+width+'.png')});
 assert.ok(await shop.locator('.taste-window').evaluate(el => el.scrollWidth <= el.clientWidth));
 assert.ok(await shop.locator('.taste-window').evaluate(el => {
  const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
  while(walker.nextNode())if(walker.currentNode.textContent.trim() && parseFloat(getComputedStyle(walker.currentNode.parentElement).fontSize)<16)return false;
  return true;
 }));
 for (const button of await shop.locator('.taste-window button').all()) {
  const box=await button.boundingBox();assert.ok(box.width>=44 && box.height>=44);
 }
 const forgotten = await shop.locator('[data-act=taste-forget]').first().getAttribute('data-key');
 await shop.locator('[data-act=taste-forget]').first().click();
 assert.equal((await read()).features[forgotten], undefined);
 assert.equal(await refreshes(), 1);
 await shop.getByRole('switch').click();
 assert.equal((await read()).enabled, false);
 assert.equal(await refreshes(), 2);
 assert.equal(await shop.getByRole('switch').getAttribute('aria-checked'), 'false');
 await close();
 const off = await read();
 await shop.locator('#like').click();await shop.locator('#like').click();
 await shop.locator('#price').click();await shop.locator('#price').click();
 await more.click();await less.click();
 assert.deepEqual(await read(), off, 'off means no learning or storage updates');
 await open();
 page.once('dialog', dialog=>dialog.dismiss());await shop.getByRole('button',{name:'Wis alles',exact:true}).click();
 assert.deepEqual(await read(), off, 'cancel clear keeps preferences');assert.equal(await refreshes(),2);
 page.once('dialog', dialog=>dialog.accept());await shop.getByRole('button',{name:'Wis alles',exact:true}).click();
 assert.equal((await read()).enabled,false);assert.deepEqual((await read()).features,{});assert.equal(await refreshes(),3);
 await shop.getByRole('switch').click();assert.equal((await read()).enabled,true);assert.equal(await refreshes(),4);
 await close();
 const beforeSearch=await read();
 await shop.locator('.shop').click();await shop.getByRole('menuitem',{name:'Collectie',exact:true}).click();
 await shop.getByRole('searchbox',{name:'Zoek in Collectie',exact:true}).fill('jas');await shop.getByRole('combobox',{name:'Materiaal',exact:true}).selectOption('Wol');
 assert.deepEqual(await read(),beforeSearch,'search and filters never learn');
 await close();
 // Readable labels instead of bare stored values ("Ja", "200-350"); other values name their kind.
 await shop.evaluate(()=>{
  const P=window.NikkiTaste.profile,p=P.empty(Date.now()),t=Date.now();
  [['fur:ja','Ja',3],['fur:nee','Nee',2.5],['fur:alleen kraag of rand','Alleen kraag of rand',2],['price:200-350','200-350',1.5],['price:tot-100','tot-100',1.2],['price:600-plus','600-plus',1],['colour:zwart','Zwart',-1]]
   .forEach(([key,label,w])=>{p.features[key]={w,t,label};});
  P.save(localStorage,p);
 });
 await open();
 assert.deepEqual(await shop.locator('.taste-label').allTextContents(),['Met bont','Zonder bont','Alleen kraag of rand','€ 200–350','Tot € 100','Vanaf € 600','Zwart']);
 assert.deepEqual(await shop.locator('.taste-kind').allTextContents(),['kleur']);
 assert.equal(await shop.locator('[data-act=taste-forget]').first().getAttribute('aria-label'),'Vergeet Met bont');
 assert.ok(await shop.locator('.taste-kind').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16));
 await close();
 // Stored labels and attribute keys are untrusted, including when personalisation is disabled.
 const attack='<img src=x onerror=alert(1)> " &';
 await shop.evaluate(label=>{
  const P=window.NikkiTaste.profile,p=P.empty(Date.now());p.enabled=false;
  p.features['material:'+label]={w:1,t:Date.now(),label};P.save(localStorage,p);
 },attack);
 await open();
 assert.equal(await shop.locator('.taste-label').textContent(),attack);
 assert.equal(await shop.locator('.taste-window img, .taste-window script').count(),0);
 assert.equal(await shop.getByRole('heading',{name:'Minder van',exact:true}).count(),0,'empty opposite section is omitted');
 assert.equal(await shop.locator('[data-act=taste-forget]').getAttribute('aria-label'),'Vergeet '+attack);
 await shop.locator('[data-act=taste-forget]').click();assert.deepEqual((await read()).features,{});assert.equal((await read()).enabled,false);
 await close();
 await shop.evaluate(reviewCases);
 await shop.evaluate(()=>window.NikkiStore.replace([],[]));
 assert.ok(await more.isHidden());assert.ok(await less.isHidden());
 // Restore shared fixture state for the remainder of the existing suite.
 await page.evaluate(()=>{localStorage.removeItem('nikki-taste');sessionStorage.clear();});
 await page.close();
};

// DOM behaviour checks shared with a lightweight local review runner. These use the actual
// built shop, profile modules and UI handlers; layout/touch targets still require Playwright.
async function reviewCases() {
 const check=(condition,message)=>{if(!condition)throw Error(message);};
 const tick=()=>new Promise(resolve=>queueMicrotask(resolve));
 const storage=window.localStorage, P=window.NikkiTaste.profile, api=window.NikkiShop.api;
 const read=()=>JSON.parse(storage.getItem('nikki-taste'));
 const button=act=>document.querySelector('[data-act="'+act+'"]');
 const profile=P.empty(Date.now());profile.enabled=false;
 for(let i=0;i<59;i++)profile.features['detail:kenmerk'+String(i).padStart(2,'0')]={w:i<30?1:-1,t:Date.now(),label:'Kenmerk '+i};
 profile.features['material:wol']={w:1,t:Date.now(),label:'Wol'};
 profile.explicit.include.material=['Wol'];
 P.save(storage,profile);
 document.querySelector('.shop').click();
 Array.from(document.querySelectorAll('#menu button')).find(b=>b.textContent==='Mijn smaak').click();
 await tick();
 check(document.querySelectorAll('[data-act=taste-forget]').length===60,'all 60 saved features must be editable, beyond the AI summary limit');
 check(document.querySelectorAll('[data-key="material:wol"]').length===1,'learned and explicit copies share one row');
 let panel=document.querySelector('.taste-window');panel.scrollTop=300;
 const scroll=panel.scrollTop, forgotten=document.querySelector('[data-key="detail:kenmerk10"]');
 forgotten.focus({preventScroll:true});forgotten.click();await tick();
 check(!read().features['detail:kenmerk10'] && Object.keys(read().features).length===59,'forget exactly one feature');
 check(document.activeElement.dataset.key==='detail:kenmerk11','focus moves to the next remaining feature');
 check(document.querySelector('.taste-window').scrollTop===scroll,'forget preserves scroll');
 api.refresh();await tick();
 check(document.querySelector('.taste-window').scrollTop===scroll,'a later redraw also preserves scroll');
 document.querySelector('[data-key="material:wol"]').click();await tick();
 check(!read().features['material:wol'] && !read().explicit.include.material?.length,'forget removes learned and explicit copies');
 check(read().enabled===false,'forget keeps the off setting');

 const saved=storage.getItem('nikki-taste'), nativeSet=Storage.prototype.setItem;
 const nativeRefresh=window.NikkiPersonalise.refresh, nativeConfirm=window.confirm;
 const descriptor=Object.getOwnPropertyDescriptor(window,'localStorage');
 let writes=0,refreshes=0,fail=true;
 Storage.prototype.setItem=function(key,value){
  if(key==='nikki-taste'){writes++;if(fail)throw new DOMException('Test quota','QuotaExceededError');}
  return nativeSet.call(this,key,value);
 };
 window.NikkiPersonalise.refresh=function(){refreshes++;return nativeRefresh();};
 window.confirm=()=>true;
 try {
  for(const act of ['taste-enable','taste-forget','taste-clear']) {
   button(act).click();await tick();
   check(storage.getItem('nikki-taste')===saved,'failed '+act+' must leave the profile intact');
   check(refreshes===0,'failed '+act+' must not request a new personal order');
   check(document.querySelector('.taste-window [role=status]')?.textContent.includes('Opslaan lukt niet'),'storage failure must be visible');
  }
  check(writes===3,'each failed action tries exactly one write');
  Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('Test blocked storage','SecurityError');}});
  button('taste-enable').click();await tick();
  check(refreshes===0,'a blocked storage getter must not refresh');
  check(document.querySelector('.taste-window [role=status]'),'a blocked getter is handled without breaking the panel');
  check(button('taste-enable').getAttribute('aria-checked')==='false' && document.querySelectorAll('[data-act=taste-forget]').length===58,'blocked getter keeps last loaded view intact');
  Object.defineProperty(window,'localStorage',descriptor);
  // Another tab saved a newer profile; a read that fails must never be followed by a write.
  fail=false;
  const newer=JSON.parse(saved);newer.features['colour:rood']={w:1,t:Date.now(),label:'Rood'};
  nativeSet.call(storage,'nikki-taste',JSON.stringify(newer));
  const nativeGet=Storage.prototype.getItem;
  Storage.prototype.getItem=function(key){if(key==='nikki-taste')throw new DOMException('Test read','SecurityError');return nativeGet.call(this,key);};
  try {
   for(const act of ['taste-enable','taste-forget','taste-clear']) {
    button(act).click();await tick();
    check(nativeGet.call(storage,'nikki-taste')===JSON.stringify(newer),'a failed read must not let '+act+' overwrite newer preferences');
    check(document.querySelector('.taste-window [role=status]'),'a failed read before '+act+' is reported');
   }
  } finally {Storage.prototype.getItem=nativeGet;}
  check(refreshes===0,'a failed read must not refresh');
  nativeSet.call(storage,'nikki-taste',saved);
  api.refresh();await tick();
  writes=0;
  button('taste-clear').click();await tick();
  check(writes===1,'clear writes exactly once');
  check(refreshes===1,'successful clear refreshes exactly once');
  check(read().enabled===false && Object.keys(read().features).length===0,'clear retains off and removes the profile');
  check(!document.querySelector('.taste-window [role=status]'),'successful retry clears the error');
 } finally {
  Object.defineProperty(window,'localStorage',descriptor);
  Storage.prototype.setItem=nativeSet;window.NikkiPersonalise.refresh=nativeRefresh;window.confirm=nativeConfirm;
 }
 button('close').click();
 return 'PASS: 60 editable features, explicit forget, focus/scroll, quota failure, blocked storage and single-write clear';
}
module.exports.reviewCases=reviewCases;

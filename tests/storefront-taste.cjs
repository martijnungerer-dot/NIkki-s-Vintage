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
 assert.deepEqual(await shop.getByRole('menuitem').allTextContents(), ['Collectie','Mijn favorieten','Winkelmand','Mijn smaak']);
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
 await less.click(); assert.equal(await weight(feature), -1);
 await more.click(); assert.equal(await weight(feature), 0, 'opposite signal cancels less');
 assert.equal(await refreshes(), 0, 'learning does not refresh the personal order');
 assert.equal(personalise.calls.length, calls, 'learning makes no network call');
 assert.equal(await shop.locator('#title').textContent(), title);
 assert.deepEqual(await shop.evaluate(() => window.NikkiShop.api.items().map(it=>it.key)), order);
 await more.click();
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
 await shop.getByRole('searchbox').fill('jas');await shop.getByRole('combobox',{name:'Materiaal',exact:true}).selectOption('Wol');
 assert.deepEqual(await read(),beforeSearch,'search and filters never learn');
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
  Object.defineProperty(window,'localStorage',descriptor);
  api.refresh();await tick();
  fail=false;writes=0;
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

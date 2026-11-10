const assert=require('node:assert/strict');
const path=require('node:path');

module.exports=async function({page,shop,width,output,records,refresh,unavailable}) {
 const [a,b,c,d,e]=records();
 let clockTime=Date.now();
 await shop.evaluate(()=>{
  const replace=window.NikkiStore.replace;
  window.catalogReplacements=0;
  window.NikkiStore.replace=function(...args){const result=replace.apply(this,args);window.catalogReplacements++;return result;};
 });
 // Exercise the real background-link renewal while the visitor is typing in the visible panel.
 // Navigating to the separate management screen intentionally moves keyboard focus elsewhere.
 refresh=async()=>{
  const count=await shop.evaluate(()=>window.catalogReplacements);
  clockTime+=41*60*1000;await page.clock.setFixedTime(new Date(clockTime));
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});
  await shop.waitForFunction(count=>window.catalogReplacements>count,count);
 };
 const rows=()=>shop.locator('#catalog-results .catalog-item');
 const row=id=>shop.locator('[data-item-key="'+id+'"]');
 const action=(id,act)=>row(id).locator('[data-act="'+act+'"]');
 async function open(name,frame=shop) {
  await frame.locator('.shop').click();await frame.getByRole('menuitem',{name,exact:true}).click();
  assert.ok(await frame.getByRole('dialog',{name,exact:true}).isVisible());
 }
 async function close(){await shop.locator('#cart [data-act=close]').click();}
 async function reset(){if(await shop.locator('#catalog-reset').isEnabled())await shop.locator('#catalog-reset').click();}
 async function like(id,value=true){if(await action(id,'list-like').getAttribute('aria-pressed')!==String(value))await action(id,'list-like').click();}
 async function checkControls(){
  const panel=await shop.locator('#cart').boundingBox();
  assert.ok(await shop.locator('#cart').evaluate(el=>el.scrollWidth<=el.clientWidth),'no panel overflow');
  for(const button of await shop.locator('#cart button:visible, #cart input, #cart select').all()) {
   const box=await button.boundingBox();
   assert.ok(box.width>=44&&box.height>=44,'list controls have 44px targets');
   assert.ok(box.x>=panel.x && box.x+box.width<=panel.x+panel.width+1,'controls fit within panel');
  }
  for(const item of await rows().all()) {
   const photo=await item.locator('.face').boundingBox(),title=await item.locator('.catalog-title').boundingBox();
   assert.ok(title.x>=photo.x+photo.width,'text stays beside the photograph');
  }
 }
 await open('Collectie');assert.equal(await rows().count(),5);
 await like(a.id);await like(b.id);
 await checkControls();
 if([390,320].includes(width))await page.screenshot({path:path.join(output,'collection-'+width+'.png'),fullPage:true});
 // Search is case/accent insensitive, combines words, and never renders input as HTML.
 await shop.locator('#catalog-search').fill('suede');assert.equal(await rows().count(),1);
 assert.equal(await rows().first().getAttribute('data-item-key'),e.id);
 assert.ok(await shop.locator('#catalog-search').evaluate(el=>document.activeElement===el));
 await reset();await shop.locator('#catalog-search').fill('GEVLEKTE kraag');
 assert.equal(await rows().first().getAttribute('data-item-key'),b.id);
 await reset();await shop.getByRole('combobox',{name:'Materiaal',exact:true}).selectOption('Wol');
 assert.equal(await rows().count(),1);assert.equal(await rows().first().getAttribute('data-item-key'),b.id);
 await reset();await shop.getByRole('combobox',{name:'Sorteer stukken'}).selectOption('price-down');
 assert.deepEqual(await rows().evaluateAll(els=>els.map(el=>el.dataset.itemKey)),[e.id,d.id,c.id,b.id,a.id]);
 await shop.getByRole('combobox',{name:'Sorteer stukken'}).selectOption('name');
 const names=await shop.locator('.catalog-title').allTextContents();
 assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b,'nl-NL',{sensitivity:'base'})));
 await shop.locator('#catalog-search').fill('niets-gevonden"><img src=x>');
 assert.equal(await rows().count(),0);assert.ok((await shop.locator('.catalog-empty').innerText()).includes('Geen stukken gevonden'));
 assert.equal(await shop.locator('#cart img').count(),0);
 await reset();
 // Title opens the existing detail panel; closing returns to the same list and scroll position.
 await shop.getByRole('combobox',{name:'Sorteer stukken'}).selectOption('price-up');
 await action(e.id,'list-info').scrollIntoViewIfNeeded();
 const scroll=await shop.locator('#catalog-results').evaluate(el=>el.scrollTop);
 await action(e.id,'list-info').click();assert.ok(await shop.locator('#info').isVisible());
 assert.equal(await shop.locator('#info .ptitle').innerText(),e.data.title);
 await page.keyboard.press('Escape');
 assert.ok(await shop.getByRole('dialog',{name:'Collectie',exact:true}).isVisible());
 assert.equal(await shop.getByRole('combobox',{name:'Sorteer stukken'}).inputValue(),'price-up');
 assert.ok(Math.abs(await shop.locator('#catalog-results').evaluate(el=>el.scrollTop)-scroll)<2);
 assert.ok(await action(e.id,'list-info').evaluate(el=>document.activeElement===el));
 // Photo opens that exact garment in the approved main shop, including the current garment.
 await action(e.id,'list-photo').click();assert.ok(await shop.locator('#cart').isHidden());
 assert.equal(await shop.locator('#title').textContent(),e.data.title);
 await open('Collectie');await action(e.id,'list-photo').click();assert.ok(await shop.locator('#cart').isHidden());
 await open('Collectie');await reset();
 await action(b.id,'list-cart').click();assert.equal(await action(b.id,'list-cart').getAttribute('aria-pressed'),'true');
 assert.equal(await shop.evaluate(id=>JSON.parse(localStorage.getItem('nikki-cart'))[id],b.id),true);
 await action(b.id,'list-cart').click();assert.equal(await action(b.id,'list-cart').getAttribute('aria-pressed'),'false');
 assert.ok(await action(b.id,'list-cart').evaluate(el=>document.activeElement===el));
 // Renewal preserves the open list, filters and focused search field, while replacing signed URLs.
 await shop.locator('#catalog-search').fill('jas');
 await shop.getByRole('combobox',{name:'Materiaal',exact:true}).selectOption('Leer');
 await shop.getByRole('combobox',{name:'Sorteer stukken'}).selectOption('price-down');
 await shop.locator('#catalog-search').focus();await shop.locator('#catalog-search').evaluate(el=>el.setSelectionRange(2,2));
 const image=await shop.locator('#catalog-results img').first().getAttribute('src');
 await refresh();
 assert.ok(await shop.getByRole('dialog',{name:'Collectie',exact:true}).isVisible());
 assert.equal(await shop.locator('#catalog-search').inputValue(),'jas');
 assert.equal(await shop.getByRole('combobox',{name:'Materiaal',exact:true}).inputValue(),'Leer');
 assert.equal(await shop.getByRole('combobox',{name:'Sorteer stukken'}).inputValue(),'price-down');
 assert.deepEqual(await shop.locator('#catalog-search').evaluate(el=>[document.activeElement===el,el.selectionStart]),[true,2]);
 assert.notEqual(await shop.locator('#catalog-results img').first().getAttribute('src'),image);
 c.status='sold';await refresh();assert.equal(await rows().count(),0,'sold item disappears from an already open result list');
 c.status='published';await refresh();assert.equal(await rows().count(),1);
 await reset();await close();
 await open('Mijn favorieten');assert.deepEqual(await rows().evaluateAll(els=>els.map(el=>el.dataset.itemKey)),[a.id,b.id]);
 assert.ok((await shop.locator('.catalog-note').innerText()).includes('alleen in deze browser'));
 await checkControls();
 if([390,320].includes(width))await page.screenshot({path:path.join(output,'saved-'+width+'.png'),fullPage:true});
 await like(b.id,false);assert.equal(await rows().count(),1);
 await like(a.id,false);assert.equal(await rows().count(),0);
 assert.ok((await shop.locator('.catalog-empty').innerText()).includes('geen beschikbare stukken met een hartje'));
 assert.ok(await shop.locator('#catalog-search').evaluate(el=>document.activeElement===el),'removing last favourite retains usable focus');
 await close();await open('Collectie');await like(a.id);await like(b.id);await close();
 // A second page in the same browser reads the existing gsf-liked values; no account is required.
 const second=await page.context().newPage();await second.goto('https://app.test');
 await second.waitForFunction(()=>document.getElementById('status').textContent==='Collectie geladen.');
 const secondShop=second.frames().find(f=>f.name()==='shop');await open('Mijn favorieten',secondShop);
 assert.equal(await secondShop.locator('.catalog-item').count(),2);await second.close();
 await open('Mijn favorieten');
 unavailable.add('0');await refresh();assert.equal(await rows().count(),1);
 assert.equal(await shop.evaluate(id=>JSON.parse(localStorage.getItem('gsf-liked'))[id],a.display_id),true,'photo failure never deletes a favourite');
 unavailable.clear();await refresh();assert.equal(await rows().count(),2);
 b.status='sold';await refresh();assert.equal(await rows().count(),1);
 b.status='published';await refresh();assert.equal(await rows().count(),2);
 // Native controls and row actions participate in the existing keyboard trap.
 await shop.locator('#cart [data-act=close]').focus();await page.keyboard.press('Shift+Tab');
 assert.ok(await action(b.id,'list-like').evaluate(el=>document.activeElement===el));
 await page.keyboard.press('Tab');assert.ok(await shop.locator('#cart [data-act=close]').evaluate(el=>document.activeElement===el));
 await page.keyboard.press('Escape');assert.ok(await shop.locator('.shop').evaluate(el=>document.activeElement===el));
 // Short viewports keep the list scrollable; the approved shop itself is not resized by list content.
 await page.setViewportSize({width,height:568});await open('Collectie');await checkControls();
 assert.ok(await shop.locator('#catalog-results').evaluate(el=>el.scrollHeight>el.clientHeight));
 await action(e.id,'list-info').click();await page.keyboard.press('Escape');await close();
 await page.setViewportSize({width,height:844});
 await page.clock.setFixedTime(new Date());
};

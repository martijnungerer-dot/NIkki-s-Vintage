const assert=require('node:assert/strict');
const path=require('node:path');

// Winkelmand (app/store-screens/cart.js): local selection, option B rows, no checkout, no writes.
module.exports=async function({page,shop,width,output,records,refresh,unavailable}) {
 const all=records();
 const stored=()=>shop.evaluate(()=>JSON.parse(localStorage.getItem('nikki-cart')));
 async function openCart(){await shop.locator('.shop').click();await shop.getByRole('menuitem',{name:'Winkelmand',exact:true}).click();assert.ok(await shop.getByRole('dialog',{name:'Winkelmand',exact:true}).isVisible());}
 const close=()=>shop.locator('#cart [data-act=close]').click();
 const lines=()=>shop.locator('#cart .line');
 const keys=()=>lines().evaluateAll(els=>els.map(el=>el.dataset.itemKey));
 // Start from an empty basket using the remove buttons of the overview itself.
 await openCart();
 for(const key of await keys())await shop.locator('#cart [data-act=cart-remove][data-key="'+key+'"]').click();
 assert.deepEqual(await stored(),{});
 assert.ok((await shop.locator('#cart').innerText()).includes('Je winkelmand is leeg.'));
 assert.equal(await shop.locator('#cart .checkout').count(),0,'no checkout button while there is no checkout');
 assert.ok((await shop.locator('#cart').innerText()).includes('nog niet afrekenen'));
 await close();
 // Add three pieces through the collection list, which uses the same local basket.
 await shop.locator('.shop').click();await shop.getByRole('menuitem',{name:'Collectie',exact:true}).click();
 const picked=[all[0],all[1],all[4]];
 for(const r of picked)await shop.locator('[data-item-key="'+r.id+'"] [data-act=list-cart]').click();
 await close();
 await openCart();
 assert.deepEqual(await keys(),picked.map(r=>r.id),'rows follow the order of selection');
 const total=picked.reduce((s,r)=>s+r.data.priceMinor,0);
 const euro=new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR',minimumFractionDigits:total%100?2:0}).format(total/100);
 assert.equal(await shop.locator('#cart-total').textContent(),euro);
 assert.equal(await shop.locator('#cart img[onerror], #cart b').count(),0,'public text stays escaped');
 const panel=await shop.locator('#cart').boundingBox();
 assert.ok(await shop.locator('#cart').evaluate(el=>el.scrollWidth<=el.clientWidth),'no panel overflow');
 for(const button of await shop.locator('#cart button:visible').all()) {
  const box=await button.boundingBox();
  assert.ok(box.width>=44&&box.height>=44,'cart controls have 44px targets');
  assert.ok(box.x>=panel.x && box.x+box.width<=panel.x+panel.width+1,'controls fit within panel');
 }
 for(const line of await lines().all()) {
  const photo=await line.locator('.face').boundingBox(),text=await line.locator('.txt').boundingBox();
  assert.ok(text.x>=photo.x+photo.width,'text stays beside the photograph');
 }
 if([390,320].includes(width))await page.screenshot({path:path.join(output,'cart-'+width+'.png'),fullPage:true});
 // Removing by keyboard keeps focus in the list and updates storage and total.
 await shop.locator('#cart [data-act=cart-remove][data-key="'+picked[1].id+'"]').focus();await page.keyboard.press('Enter');
 assert.equal(await lines().count(),2);
 assert.equal(await shop.evaluate(()=>document.activeElement.dataset.key),picked[2].id,'focus moves to the next remove button');
 assert.deepEqual(Object.keys(await stored()),[picked[0].id,picked[2].id]);
 await page.keyboard.press('Escape');assert.ok(await shop.locator('#cart').isHidden());
 // A published piece whose photos fail stays selected and is reported, not shown.
 unavailable.add('0');await refresh();
 await openCart();
 assert.deepEqual(await keys(),[picked[2].id]);
 assert.ok((await shop.locator('#cart').innerText()).includes('1 stuk in je winkelmand is tijdelijk niet te zien.'));
 assert.deepEqual(Object.keys(await stored()),[picked[0].id,picked[2].id],'photo failure is not a removal');
 await close();
 unavailable.clear();await refresh();
 // Leave only the first garment selected, as the main storefront test expects afterwards.
 await openCart();
 await shop.locator('#cart [data-act=cart-remove][data-key="'+picked[2].id+'"]').click();
 assert.deepEqual(await stored(),{[picked[0].id]:true});
 await close();
};

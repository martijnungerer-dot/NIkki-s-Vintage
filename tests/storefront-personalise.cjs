const assert=require('node:assert/strict');

// Persoonlijke volgorde en hoofdfoto (app/store-screens/personalise.js). Server-proxy nagebootst.
module.exports=async function({context,records,names,personalise}) {
 const rec=records();
 const profile=(enabled=true)=>JSON.stringify({version:1,enabled,updatedAt:Date.now(),explicit:{include:{material:['Wol']},exclude:{},maxPriceMinor:null},features:{},counts:{like:0,cart:0,more:0,less:0}});
 personalise.calls=[];
 // The AI puts piece 3 first with its back photo, then piece 1; the rest is left out on purpose.
 personalise.reply={source:'ai',ranking:[{id:rec[2].id,photoRole:'Achterkant',why:null},{id:rec[0].id,photoRole:'Bestaat niet',why:null},{id:'not-a-uuid'}]};
 const page=await context.newPage();
 await page.goto('https://app.test',{waitUntil:'commit'});
 await page.evaluate(p=>{localStorage.setItem('nikki-taste',p);sessionStorage.clear();},profile());
 const open=async()=>{await page.reload();await page.waitForFunction(()=>document.getElementById('status').textContent==='Collectie geladen.');return page.frames().find(f=>f.name()==='shop');};
 let shop=await open();
 // 1. The local ranking opens on the best match (the only wool piece) without waiting for the AI.
 assert.equal(await shop.locator('#title').textContent(),names[1],'opens on the best local match');
 await shop.waitForFunction(()=>sessionStorage.getItem('nikki-taste-order'));
 // 2. The AI answer reorders everything after the piece in view; the piece in view stays.
 assert.equal(await shop.locator('#title').textContent(),names[1],'the piece in view never jumps');
 assert.equal(personalise.calls.length,1);
 const sent=personalise.calls[0];
 assert.deepEqual(Object.keys(sent).sort(),['profile']);
 assert.deepEqual(sent.profile.prefer,{'material:wol':1},'only the compact summary leaves the browser');
 assert.ok(!JSON.stringify(sent).includes(rec[0].id),'no garment IDs are sent');
 const next=await shop.locator('#nexts .th').evaluateAll(els=>els.map(el=>el.getAttribute('aria-label')));
 assert.deepEqual(next.slice(0,2),['Bekijk '+names[2],'Bekijk '+names[0]],'AI order follows the piece in view');
 assert.ok((await shop.locator('#nexts .th img').first().getAttribute('src')).includes('/2-1.jpg'),'lead photo: the back photo chosen for this visitor');
 assert.ok((await shop.locator('#nexts .th img').nth(1).getAttribute('src')).includes('/0-0.jpg'),'unknown photo role falls back to Nikki’s main photo');
 // Collection uses the same personal order.
 await shop.locator('.shop').click();await shop.getByRole('menuitem',{name:'Collectie',exact:true}).click();
 assert.deepEqual((await shop.locator('#catalog-results .catalog-item').evaluateAll(els=>els.map(el=>el.dataset.itemKey))).slice(0,3),[rec[1].id,rec[2].id,rec[0].id]);
 await shop.locator('#cart [data-act=close]').click();
 // 3. Same session: reload keeps the order and makes no new AI call.
 shop=await open();
 assert.equal(personalise.calls.length,1,'one AI call per session');
 assert.equal(await shop.locator('#title').textContent(),names[1]);
 // 4. A failing server keeps the local order and the shop working.
 await page.evaluate(()=>sessionStorage.clear());personalise.fail=true;
 shop=await open();
 assert.equal(await shop.locator('#title').textContent(),names[1]);
 for(let i=0;i<50&&personalise.calls.length<2;i++)await page.waitForTimeout(20);
 assert.equal(personalise.calls.length,2);assert.equal(await shop.locator('#title').textContent(),names[1],'local order stays after a server error');
 personalise.fail=false;
 // 5. Personalisation off: Nikki's order, no call.
 await page.evaluate(p=>{localStorage.setItem('nikki-taste',p);sessionStorage.clear();},profile(false));
 const before=personalise.calls.length;shop=await open();
 assert.equal(await shop.locator('#title').textContent(),names[0],'Nikki’s order without personalisation');
 assert.equal(personalise.calls.length,before);
 await page.evaluate(()=>{localStorage.removeItem('nikki-taste');sessionStorage.clear();});
 await page.close();
};

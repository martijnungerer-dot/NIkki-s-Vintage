const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const reference=fs.readFileSync(path.join(root,'concept/ontdekken-optie-b.html'),'utf8');
const output=path.resolve(process.env.NIKKI_SCREENSHOTS || path.join(root,'work/option-b-screenshots'));

// Public catalog fixtures, served through the same API and signed-photo route as real inventory.
const names=['Bruine vintage jas','Gevlekte jas met sjaalkraag','Korte zwarte jas','Korte jas met reverskraag','Lange jas met capuchon'];
const colours=['#8A5A3C','#B9A58E','#3B3431','#C9B8A6','#A08672'];
const drawing=(colour)=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420"><rect width="300" height="420" fill="#E9E1D6"/><path d="M120 70 L150 95 L180 70 L222 92 L240 220 L222 228 L214 150 L210 390 L90 390 L86 150 L78 228 L60 220 L78 92 Z" fill="'+colour+'"/><path d="M120 70 L150 140 L180 70" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="3"/><path d="M150 140 L150 390" stroke="rgba(0,0,0,0.18)" stroke-width="2"/></svg>';
function catalog() {return names.map((title,i)=>({id:'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),display_id:i+1,version:1,status:'published',data:{title,description:'Nikki’s eigen verkooptekst. <img src=x onerror=alert(1)>',priceMinor:15000+i*1000,material:['Leer <img src=x onerror=alert(1)>','Wol','Leer','','Suède'][i],species:i===3?null:'Vos <b>testwaarde</b>',furClass:['Ja','Nee','Alleen kraag of rand','Ja',''][i],model:'Sjaalkraag',colour:'Zwart',length:'Knielang',fit:'',era:'',details:['Bontkraag'],measurements:[55.5,null,null,100],images:Array.from({length:i===0?3:2},(_,j)=>({path:i+'-'+j+'.jpg',role:['Voorkant','Achterkant','Detail'][j],main:j===(i===1?1:0)}))}}));}
async function geometry(frame) {return frame.evaluate(()=>{
 const origin=document.getElementById('ph').getBoundingClientRect(), names=['.ph','.top','.brand','#photo','#row','.chip.title','.chip.price','#band','#prev-th','#nexts','.shop'];
 return Object.fromEntries(names.map(s=>{const el=document.querySelector(s),r=el.getBoundingClientRect(),c=getComputedStyle(el);return [s,{x:r.x-origin.x,y:r.y-origin.y,w:r.width,h:r.height,bg:c.backgroundColor,color:c.color,font:c.fontFamily,size:c.fontSize,radius:c.borderRadius,padding:c.padding,gap:c.gap}];}));
});}
async function layout(frame,width) {
 const g=await geometry(frame);
 assert.ok(g['#row'].y>=g['#photo'].y+g['#photo'].h-1,'name/price are below the photo');
 assert.ok(g['#band'].y>=g['#row'].y+g['#row'].h-1,'navigation follows name/price');
 assert.ok(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+'px no horizontal overflow');
 for(const b of await frame.locator('#ph button:visible').all()) {
  const r=await b.boundingBox();assert.ok(r.width>=43.95&&r.height>=43.95,width+'px every visible control is at least 44 × 44: '+await b.getAttribute('aria-label')+' '+r.width+' × '+r.height);
 }
 for(const b of await frame.locator('.band button:visible').all()) {const r=await b.boundingBox();assert.ok(Math.abs(r.width/r.height-52/64)<0.01,'thumbnail proportions preserved');}
 const contentWidth=await frame.locator('#ph').evaluate(el=>el.clientWidth-parseFloat(getComputedStyle(el).paddingLeft)-parseFloat(getComputedStyle(el).paddingRight));
 assert.equal(await frame.locator('#nexts .th:visible').count(),contentWidth<=259?2:3);
 assert.equal(g['#band'].gap,contentWidth<=307?'6px':'8px');
 assert.ok(Math.abs(g['#prev-th'].w-Math.max(44,Math.min(52,(contentWidth-88)/5)))<0.1,'thumbnail size follows actual available width');
 const band=await frame.locator('#band').boundingBox(),buttons=await frame.locator('#band button:visible').all();
 let right=band.x;
 for(const b of buttons){const r=await b.boundingBox();assert.ok(r.x>=right-0.1&&r.x+r.width<=band.x+band.width-7.9,'lower controls neither overlap nor overflow');right=r.x+r.width;}
 // Text nodes from the name, price or any other visible text must not intersect the photo.
 assert.deepEqual(await frame.evaluate(()=>{
  const p=document.getElementById('photo').getBoundingClientRect(), walker=document.createTreeWalker(document.getElementById('ph'),NodeFilter.SHOW_TEXT),hits=[];
  while(walker.nextNode()){const n=walker.currentNode;if(!n.textContent.trim())continue;const r=document.createRange();r.selectNode(n);for(const b of r.getClientRects())if(b.width&&b.height&&b.left<p.right&&b.right>p.left&&b.top<p.bottom&&b.bottom>p.top)hits.push(n.textContent.trim());}
  return hits;
 }),[],'no text over the photo');
 return g;
}

(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
 try {
  for(const width of [390,320,280,283,284,331,332,480,481,1024]) {
   const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
   const errors=[], writes=[],unavailable=new Set(),personalise={calls:[],reply:{source:'fallback',ranking:[]},fail:false};let records=catalog(),signs=0,failCatalog=false,releaseCatalog;
   const catalogReady=new Promise(resolve=>{releaseCatalog=resolve;});
   context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
   await context.route('**/*',async route=>{
    const req=route.request(),u=new URL(req.url());
    if(u.hostname==='app.test') {
     if(u.pathname==='/reference')return route.fulfill({contentType:'text/html',body:reference});
     if(u.pathname==='/config.js')return route.fulfill({contentType:'text/javascript',body:"export const config={supabaseUrl:'https://test.supabase.co',supabasePublishableKey:'public-test-key'}"});
     const file=u.pathname==='/'?'index.html':u.pathname.slice(1);
     return route.fulfill({contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(path.join(root,'dist/cloud',file))});
    }
    if(u.hostname!=='test.supabase.co')return route.abort();
    const headers={'access-control-allow-origin':'https://app.test','access-control-allow-headers':'*','access-control-allow-methods':'*'};
    if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
    const json=data=>route.fulfill({headers,contentType:'application/json',body:JSON.stringify(data)});
    if(u.pathname==='/rest/v1/garments') {
     await catalogReady;
     return failCatalog?route.fulfill({status:503,headers,contentType:'application/json',body:'{}'}):json([...records].reverse());
    }
    if(u.pathname==='/storage/v1/object/sign/garment-photos') {signs++;return json(req.postDataJSON().paths.filter(p=>!unavailable.has(p.split('-')[0])).map(p=>({path:p,signedURL:'/object/sign/garment-photos/'+p+'?token='+signs})));}
    if(u.pathname.startsWith('/storage/v1/object/sign/garment-photos/'))return route.fulfill({headers,contentType:'image/svg+xml',body:drawing(colours[Number(u.pathname.split('/').at(-1).split('-')[0])])});
    if(u.pathname==='/functions/v1/personalise') {
     personalise.calls.push(req.postDataJSON());if(personalise.hold)await personalise.hold;
     return personalise.fail?route.fulfill({status:503,headers,contentType:'application/json',body:'{"error":"UNAVAILABLE"}'}):json(personalise.reply);
    }
    writes.push(req.method()+' '+u.pathname);return route.fulfill({status:500,headers});
   });
   const ref=await context.newPage();await ref.goto('https://app.test/reference');
   if([390,320].includes(width)) {
    await ref.screenshot({path:path.join(output,'reference-'+width+'.png'),fullPage:true});
    await ref.locator('#ph').screenshot({path:path.join(output,'reference-phone-'+width+'.png')});
    // Reference basket with three sample pieces, for the side-by-side comparison of the Winkelmand.
    const refCart=await context.newPage();await refCart.goto('https://app.test/reference');
    for(let i=0;i<3;i++){await refCart.locator('#price').click();await refCart.locator('#nexts .th').first().click();}
    await refCart.locator('.shop').click();await refCart.locator('[data-act=cart-open]').click();
    await refCart.screenshot({path:path.join(output,'reference-cart-'+width+'.png'),fullPage:true});await refCart.close();
   }
   const page=await context.newPage();await page.goto('https://app.test',{waitUntil:'commit'});
   await page.waitForFunction(()=>document.getElementById('shop')?.contentWindow.NikkiStore);
   const shop=page.frames().find(f=>f.name()==='shop');
   assert.ok(await shop.locator('#catalog-status').isVisible(),'loading status is visible');
   const loadingStatus=await shop.locator('#catalog-status').boundingBox(),loadingPhoto=await shop.locator('#photo').boundingBox();
   assert.ok(loadingStatus.y+loadingStatus.height<=loadingPhoto.y,'loading text stays above the photo');
   const loading=await geometry(shop);
   releaseCatalog();
   await page.waitForFunction(()=>document.getElementById('status').textContent==='Collectie geladen.');
   assert.ok(await shop.locator('#catalog-status').isHidden(),'success status stays hidden');
   const actual=await layout(shop,width);
   for(const selector of ['.ph','.top','#photo','#row','#band'])for(const dimension of ['x','y','w','h'])
    assert.equal(actual[selector][dimension],loading[selector][dimension],'loading status does not move '+selector);
   const outer=await shop.locator('#ph').boundingBox(),expectedWidth=width<=480?width:390;
   assert.equal(outer.width,expectedWidth);assert.equal(outer.height,844);
   assert.equal(outer.x,(width-expectedWidth)/2);assert.equal(outer.y,0);
   assert.deepEqual(await shop.locator('#ph').evaluate(el=>{const c=getComputedStyle(el);return [c.borderWidth,c.borderRadius,c.boxShadow];}),['0px','0px','none']);
   // Normalize only the reference presentation box to the available app dimensions.
   // Its interior markup, CSS, padding, controls and container queries stay untouched.
   await ref.addStyleTag({content:'body{padding:0;gap:0}.note{display:none}.ph{width:'+expectedWidth+'px;height:844px;border-width:0}'});
   const refGeometry=await layout(ref,width);
   for(const [selector,expected] of Object.entries(refGeometry))for(const [key,value] of Object.entries(expected)) {
    if(selector==='.ph' && key==='radius')continue; // approved removal of the presentation frame
    if(typeof value==='number')assert.ok(Math.abs(actual[selector][key]-value)<0.1,width+'px '+selector+' '+key+': '+actual[selector][key]+' != '+value);
    else assert.equal(actual[selector][key],value,width+'px '+selector+' '+key);
   }
   // Ensure the outer management toolbar does not take space away from the copied screen.
   assert.equal(await page.locator('.app-header').isVisible(),false);
   assert.equal(await page.locator('#shop').evaluate(el=>el.getBoundingClientRect().height),844);
   if([390,320].includes(width)) {
    await page.screenshot({path:path.join(output,'app-'+width+'.png'),fullPage:true});
    await shop.locator('#ph').screenshot({path:path.join(output,'app-phone-'+width+'.png')});
   }
   if(width===390) {
    // Simulated insets exercise the CSS arithmetic; real Safari/device chrome remains a manual check.
    const safeStyle=await shop.addStyleTag({content:':root{--safe-top:24px;--safe-right:10px;--safe-bottom:20px;--safe-left:14px}'});
    const safe=await layout(shop,width);
    assert.equal(safe['.ph'].padding,'64px 22px 44px 26px');
    assert.equal(safe['#photo'].x,26);assert.equal(safe['#band'].x,26);
    await shop.locator('.shop').click();await shop.getByRole('menuitem',{name:'Winkelmand',exact:true}).click();
    assert.equal(await shop.locator('#cart').evaluate(el=>getComputedStyle(el).padding),'64px 30px 44px 34px');
    await shop.locator('#cart [data-act=close]').click();
    await shop.locator('[data-act=info]').click();
    assert.equal(await shop.locator('#info').evaluate(el=>getComputedStyle(el).top),'116px');
    await page.keyboard.press('Escape');
    await safeStyle.evaluate(el=>el.remove());
    assert.deepEqual(await geometry(shop),actual,'safe-area test restores the unchanged layout');
   }
   // Breakpoint/desktop cases need geometry only; interactions run on the three small viewports.
   if(![390,320,280].includes(width)){assert.deepEqual(errors,[]);await context.close();continue;}
   await shop.locator('#price').click();assert.equal(await shop.locator('#price').getAttribute('aria-pressed'),'true');
   assert.ok(await shop.locator('#bag-full').isVisible());assert.equal(await shop.locator('.pop:visible').count(),0);
   assert.deepEqual(await shop.evaluate(()=>JSON.parse(localStorage.getItem('nikki-cart'))),{[records[0].id]:true});
   await page.reload();await page.waitForFunction(()=>document.getElementById('status').textContent==='Collectie geladen.');
   const again=page.frames().find(f=>f.name()==='shop');
   assert.equal(await again.locator('#price').getAttribute('aria-pressed'),'true','cart persists without storing photos or products');
   await again.locator('[data-act=info]').click();
   assert.ok((await again.locator('#info').innerText()).includes(records[0].data.description));
   assert.equal(await again.locator('#info img').count(),0,'description is escaped');
   assert.deepEqual(await again.locator('#info .kv > span:last-child').allTextContents(),['55,5 cm','100 cm','','',records[0].data.material,records[0].data.species]);
   assert.equal(await again.locator('#info b, #info img').count(),0,'material and species stay escaped text');
   assert.ok(await again.locator('#info').evaluate(el=>el.scrollWidth<=el.clientWidth),'public text fits the detail panel');
   await page.keyboard.press('Escape');assert.ok(await again.locator('#info').isHidden());
   assert.equal(await again.locator('[data-act=info]').evaluate(el=>document.activeElement===el),true);
   await again.locator('[data-act=next-photo]').click();assert.equal(await again.locator('#dots').getAttribute('aria-label'),'Foto 2 van 3');
   await again.locator('#photo').dblclick({position:{x:80,y:80}});assert.equal(await again.locator('.slide.zoomed').count(),1);
   await again.locator('#photo').dblclick({position:{x:80,y:80}});assert.equal(await again.locator('.slide.zoomed').count(),0);
   const r=await again.locator('#photo').boundingBox();
   async function swipe(dx,dy) {await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2+dx,r.y+r.height/2+dy,{steps:5});await page.mouse.up();}
   await swipe(-80,0);assert.equal(await again.locator('#dots').getAttribute('aria-label'),'Foto 3 van 3');
   assert.equal(await again.locator('#title').textContent(),names[0]);
   await swipe(0,-80);assert.equal(await again.locator('#title').textContent(),names[1]);
   assert.equal(await again.locator('#dots').getAttribute('aria-label'),'Foto 2 van 2','a new garment starts on its designated main photo');
   await again.locator('[data-act=info]').click();
   assert.equal(await again.locator('#info .kv').filter({hasText:'Bontsoort'}).count(),0,'no species row for a garment without fur');
   assert.equal(await again.locator('#info .kv').filter({hasText:'Materiaal'}).count(),1);
   await page.keyboard.press('Escape');
   await again.locator('#prev-th').click();assert.equal(await again.locator('#title').textContent(),names[0]);
   await again.locator('#photo').hover();await page.mouse.wheel(0,80);await again.locator('#title').filter({hasText:names[1]}).waitFor();
   await require('./storefront-collections.cjs')({page,shop:again,width,output,records:()=>records,refresh,unavailable});
   await require('./storefront-cart.cjs')({page,shop:again,width,output,records:()=>records,refresh,unavailable});
   // Taste profile hooks: signals carry public fields only; learning stays local.
   await again.evaluate(()=>{window.seenSignals=[];window.NikkiShop.onSignal(s=>window.seenSignals.push(s));window.NikkiShop.onSignal(()=>{throw Error('listener');});});
   await again.locator('#like').click();await again.locator('#like').click();await again.locator('#price').click();await again.locator('#price').click();
   const signals=await again.evaluate(()=>window.seenSignals);
   assert.deepEqual(signals.slice(0,2).map(s=>s.type),['like','unlike'],'a failing listener never blocks the shop');
   assert.deepEqual(signals.slice(2).map(s=>s.type).sort(),['cart','uncart']);
   assert.deepEqual(Object.keys(signals[0].item).sort(),['colour','details','era','fit','furClass','key','length','material','model','priceMinor']);
   assert.ok(!JSON.stringify(signals).includes('token'),'no photo links in signals');
   assert.equal(await again.evaluate(()=>typeof window.NikkiTaste.aggregate.applySignal),'function');
   assert.ok(await again.evaluate(()=>JSON.parse(localStorage.getItem('nikki-taste'))?.version===1),'signals are learned locally');
   async function refresh(fails=false) {
    await page.evaluate(()=>window.NikkiApp.openAccount());
    await page.locator('#status').evaluate(el=>{el.textContent='';});
    await page.locator('#reload').click();
    await page.waitForFunction(fails=>document.getElementById('status').textContent.startsWith(fails?'De handeling is niet afgerond.':'Collectie vernieuwd.'),fails);
    await page.locator('button[data-screen=shop]').click();
   }
   async function visit(title) {
    for(let i=0;i<5 && await again.locator('#title').textContent()!==title;i++)await again.locator('#nexts .th').first().click();
    assert.equal(await again.locator('#title').textContent(),title);
   }
   for(const index of [2,3,4]) {
    await visit(names[index]);await again.locator('[data-act=info]').click();
    assert.equal(await again.locator('#info .kv').filter({hasText:'Bontsoort'}).count(),index===2?1:0,'collar fur is shown, empty/unknown fields are not inferred');
    if(index===3)assert.equal(await again.locator('#info .kv').filter({hasText:'Materiaal'}).count(),0,'empty material is omitted');
    await page.keyboard.press('Escape');
   }
   // A published garment stays in the basket even if all its photos temporarily fail.
   const original=records[0];records=[original];await refresh();
   assert.equal(await again.locator('#price').getAttribute('aria-pressed'),'true');
   unavailable.add('0');await refresh();
   assert.equal(await again.locator('#ph').getAttribute('data-catalog-empty'),'true');
   assert.ok(await again.locator('#bag-full').isHidden(),'empty display clears the SVG checkmark');
   assert.ok(await again.locator('#bag-empty').isVisible());
   assert.deepEqual(await again.evaluate(()=>JSON.parse(localStorage.getItem('nikki-cart'))),{[original.id]:true},'photo failure is not a withdrawal');
   assert.ok(await again.locator('#catalog-status').isVisible(),'photo failure is reported');
   unavailable.clear();await refresh();
   assert.equal(await again.locator('#price').getAttribute('aria-pressed'),'true','basket selection returns with the photo');
   assert.ok(await again.locator('#catalog-status').isHidden(),'photo recovery hides status');
   // An HTTP failure/recovery also leaves the inner layout and basket intact.
   const beforeFailure=await geometry(again);failCatalog=true;await refresh(true);
   assert.ok(await again.locator('#catalog-status').isVisible());
   assert.deepEqual(await geometry(again),beforeFailure,'error status never shifts the layout');
   assert.deepEqual(await again.evaluate(()=>JSON.parse(localStorage.getItem('nikki-cart'))),{[original.id]:true});
   failCatalog=false;await refresh();assert.ok(await again.locator('#catalog-status').isHidden());
   records=catalog();await refresh();await visit(names[0]);await again.locator('#nexts .th').first().click();
   assert.equal(await again.locator('#title').textContent(),names[1]); // previous is A, current is B
   records[0].status='sold';await refresh();
   assert.deepEqual(await again.evaluate(()=>JSON.parse(localStorage.getItem('nikki-cart'))),{},'sold garment leaves the basket even when its photos still exist');
   const current=await again.locator('#title').textContent();
   await again.locator('#prev-th').click();
   assert.notEqual(await again.locator('#title').textContent(),current,'missing previous garment falls back to a different garment');
   const remaining=records.find(r=>r.data.title===names[4]);records=[remaining];await refresh();
   assert.ok(await again.locator('#prev-th').isDisabled(),'one remaining garment disables previous');
   assert.ok(await again.locator('#prev-th').isVisible(),'the previous slot stays, empty');
   assert.equal(await again.locator('#prev-th img').count(),0,'previous slot does not repeat the current garment');
   assert.equal(await again.locator('#nexts .th').count(),3,'three next slots stay in place');
   assert.equal(await again.locator('#nexts .th:disabled').count(),3);assert.equal(await again.locator('#nexts img').count(),0);
   records=catalog().slice(0,2);await refresh();
   assert.equal(await again.locator('#nexts img').count(),1,'only existing garments get a photo');
   assert.equal(await again.locator('#nexts .th:disabled').count(),2);
   records=[remaining];await refresh();
   await again.locator('#price').click();assert.ok(await again.locator('#bag-full').isVisible());
   records=[];await refresh();
   assert.equal(await again.locator('#ph').getAttribute('data-catalog-empty'),'true');
   assert.equal(await again.locator('#track img').count(),0,'no fake inventory when empty');
   assert.equal(await again.locator('#nexts .th').count(),3,'empty catalogue keeps its empty slots');assert.ok(await again.locator('#prev-th').isVisible());
   assert.ok(await again.locator('#bag-full').isHidden(),'withdrawn last garment clears SVG checkmark');
   assert.deepEqual(await again.evaluate(()=>JSON.parse(localStorage.getItem('nikki-cart'))),{},'unavailable garments leave the local basket');
   for(const name of ['Collectie','Mijn favorieten']) {
    await again.locator('.shop').click();await again.getByRole('menuitem',{name,exact:true}).click();
    assert.equal(await again.locator('.catalog-item').count(),0,'empty catalog never creates sample items');
    assert.ok(await again.locator('.catalog-empty').isVisible());
    await again.locator('#cart [data-act=close]').click();
   }
   if([390,320,280].includes(width)){records=catalog();await require('./storefront-taste.cjs')({context,width,output,records:()=>records,personalise});}
   if(width===390){records=catalog();await require('./storefront-personalise.cjs')({context,records:()=>records,names,personalise});}
   assert.deepEqual(writes,[],'no write endpoints from shopping');assert.deepEqual(errors,[]);
   await context.close();
  }
  console.log('PASS option B storefront: unchanged main layout, mobile/desktop/breakpoints, 44px controls, stable status, photo loss/sold handling, safe material/species, collection search/filter/sort, saved hearts, local basket and basket overview, personal order and lead photo, detail return/focus/scroll, signed-link renewal, empty lists, gestures, no writes. Screenshots: '+output);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

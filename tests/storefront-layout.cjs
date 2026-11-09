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
function catalog() {return names.map((title,i)=>({id:'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),display_id:i+1,version:1,status:'published',data:{title,description:'Nikki’s eigen verkooptekst. <img src=x onerror=alert(1)>',priceMinor:15000+i*1000,measurements:[55.5,null,null,100],images:Array.from({length:i===0?3:2},(_,j)=>({path:i+'-'+j+'.jpg',role:['Voorkant','Achterkant','Detail'][j],main:j===(i===1?1:0)}))}}));}
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
 assert.equal(await frame.locator('#nexts .th:visible').count(),width<320?2:3);
 assert.equal(g['#band'].gap,width===390?'8px':'6px');
 assert.ok(Math.abs(g['#prev-th'].w-(width===390?48.8:44))<0.1,'390px stays unchanged; small screens keep 44px');
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
  for(const width of [390,320,280]) {
   const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
   const errors=[], writes=[];let records=catalog(),signs=0;
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
    if(u.pathname==='/rest/v1/garments')return json([...records].reverse());
    if(u.pathname==='/storage/v1/object/sign/garment-photos') {signs++;return json(req.postDataJSON().paths.map(p=>({path:p,signedURL:'/object/sign/garment-photos/'+p+'?token='+signs})));}
    if(u.pathname.startsWith('/storage/v1/object/sign/garment-photos/'))return route.fulfill({headers,contentType:'image/svg+xml',body:drawing(colours[Number(u.pathname.split('/').at(-1).split('-')[0])])});
    writes.push(req.method()+' '+u.pathname);return route.fulfill({status:500,headers});
   });
   const ref=await context.newPage();await ref.goto('https://app.test/reference');
   const refGeometry=await layout(ref,width);
   const page=await context.newPage();await page.goto('https://app.test');
   await page.waitForFunction(()=>document.getElementById('status').textContent==='Collectie geladen.');
   const shop=page.frames().find(f=>f.name()==='shop');
   const actual=await layout(shop,width);
   for(const [selector,expected] of Object.entries(refGeometry))for(const [key,value] of Object.entries(expected)) {
    if(typeof value==='number')assert.ok(Math.abs(actual[selector][key]-value)<0.1,width+'px '+selector+' '+key+': '+actual[selector][key]+' != '+value);
    else assert.equal(actual[selector][key],value,width+'px '+selector+' '+key);
   }
   // Ensure the outer management toolbar does not take space away from the copied screen.
   assert.equal(await page.locator('.app-header').isVisible(),false);
   assert.equal(await page.locator('#shop').evaluate(el=>el.getBoundingClientRect().height),844);
   if(width!==280) {
    await ref.screenshot({path:path.join(output,'reference-'+width+'.png'),fullPage:true});
    await page.screenshot({path:path.join(output,'app-'+width+'.png'),fullPage:true});
    await ref.locator('#ph').screenshot({path:path.join(output,'reference-phone-'+width+'.png')});
    await shop.locator('#ph').screenshot({path:path.join(output,'app-phone-'+width+'.png')});
   }
   await shop.locator('#price').click();assert.equal(await shop.locator('#price').getAttribute('aria-pressed'),'true');
   assert.ok(await shop.locator('#bag-full').isVisible());assert.equal(await shop.locator('.pop:visible').count(),0);
   assert.deepEqual(await shop.evaluate(()=>JSON.parse(localStorage.getItem('nikki-cart'))),{[records[0].id]:true});
   await page.reload();await page.waitForFunction(()=>document.getElementById('status').textContent==='Collectie geladen.');
   const again=page.frames().find(f=>f.name()==='shop');
   assert.equal(await again.locator('#price').getAttribute('aria-pressed'),'true','cart persists without storing photos or products');
   await again.locator('[data-act=info]').click();
   assert.ok((await again.locator('#info').innerText()).includes(records[0].data.description));
   assert.equal(await again.locator('#info img').count(),0,'description is escaped');
   assert.deepEqual(await again.locator('#info .kv > span:last-child').allTextContents(),['55,5 cm','100 cm','','']);
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
   await again.locator('#prev-th').click();assert.equal(await again.locator('#title').textContent(),names[0]);
   await again.locator('#photo').hover();await page.mouse.wheel(0,80);await again.locator('#title').filter({hasText:names[1]}).waitFor();
   for(const name of ['Collectie','Mijn items','Winkelmand']) {
    await again.locator('.shop').click();await again.getByRole('menuitem',{name,exact:true}).click();
    assert.ok(await again.getByRole('dialog',{name,exact:true}).isVisible());
    assert.equal(await again.locator('#cart .line, #cart .checkout').count(),0,'placeholder has no new screen design or checkout');
    await again.locator('#cart [data-act=close]').click();
   }
   records=[];
   await again.getByRole('button',{name:'Mijn account'}).click();await page.locator('#reload').click();
   await page.waitForFunction(()=>document.getElementById('status').textContent==='Collectie vernieuwd.');await page.locator('[data-screen=shop]').click();
   assert.equal(await again.locator('#ph').getAttribute('data-catalog-empty'),'true');
   assert.equal(await again.locator('#track img').count(),0,'no fake inventory when empty');
   assert.deepEqual(await again.evaluate(()=>JSON.parse(localStorage.getItem('nikki-cart'))),{},'unavailable garments leave the local basket');
   assert.deepEqual(writes,[],'no write endpoints from shopping');assert.deepEqual(errors,[]);
   await context.close();
  }
  console.log('PASS option B storefront: reference geometry/styles, 390/320/280 px, 44px controls, no photo text, real catalog contract, local basket, detail values, swipe/zoom, placeholders, no writes. Screenshots: '+output);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

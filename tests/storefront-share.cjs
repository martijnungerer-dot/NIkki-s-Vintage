// Delen en stuklinks (app/store-screens/share.js). Losse browsertest met nagebootste Supabase,
// zodat hij naast tests/storefront-layout.cjs kan bestaan zonder dat bestand te wijzigen.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const output=path.resolve(process.env.NIKKI_SCREENSHOTS || path.join(root,'work/option-b-screenshots'));
const names=['Bruine vintage jas','Gevlekte jas met sjaalkraag','Korte zwarte jas','Korte jas met reverskraag'];
const colours=['#8A5A3C','#B9A58E','#3B3431','#C9B8A6'];
const id=i=>'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0');
const drawing=c=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420"><rect width="300" height="420" fill="#E9E1D6"/><path d="M120 70 L180 70 L240 220 L210 390 L90 390 L60 220 Z" fill="'+c+'"/></svg>';
function catalog(sold=-1){return names.map((title,i)=>({id:id(i),display_id:i+1,version:1,status:i===sold?'sold':'published',data:{title,description:'Tekst',priceMinor:15000+i*1000,material:'Wol',species:null,furClass:'Nee',model:'Cape',colour:'Zwart',length:'Kort',fit:'',era:'',details:[],measurements:[50,null,null,90],images:[{path:i+'-0.jpg',role:'Voorkant',main:true},{path:i+'-1.jpg',role:'Achterkant',main:false}]}}));}

(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
 try {
  for(const width of [390,320]) {
   for(const nativeShare of [false,true]) {
    const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:'https://app.test'});
    const errors=[],writes=[];let records=catalog();
    context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
    // Native share sheet stub (phones) or no share API (desktop): both must work.
    await context.addInitScript(native=>{
      if(native){window.shared=[];Object.defineProperty(Navigator.prototype,'share',{configurable:true,value:function(data){window.top.shared=(window.top.shared||[]).concat([data]);return Promise.resolve();}});}
      else delete Navigator.prototype.share;
    },nativeShare);
    await context.route('**/*',async route=>{
     const req=route.request(),u=new URL(req.url());
     if(u.hostname==='app.test') {
      if(u.pathname==='/config.js')return route.fulfill({contentType:'text/javascript',body:"export const config={supabaseUrl:'https://test.supabase.co',supabasePublishableKey:'public-test-key'}"});
      const file=u.pathname==='/'?'index.html':u.pathname.slice(1);
      return route.fulfill({contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(path.join(root,'dist/cloud',file))});
     }
     if(u.hostname!=='test.supabase.co')return route.abort();
     const headers={'access-control-allow-origin':'https://app.test','access-control-allow-headers':'*','access-control-allow-methods':'*'};
     if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
     const json=data=>route.fulfill({headers,contentType:'application/json',body:JSON.stringify(data)});
     if(u.pathname==='/rest/v1/garments')return json([...records].reverse());
     if(u.pathname==='/storage/v1/object/sign/garment-photos')return json(req.postDataJSON().paths.map(p=>({path:p,signedURL:'/object/sign/garment-photos/'+p+'?token=geheim'})));
     if(u.pathname.startsWith('/storage/v1/object/sign/garment-photos/'))return route.fulfill({headers,contentType:'image/svg+xml',body:drawing(colours[Number(u.pathname.split('/').at(-1)[0])])});
     writes.push(req.method()+' '+u.pathname);return route.fulfill({status:500,headers});
    });
    const page=await context.newPage();
    const open=async(url='https://app.test/')=>{
     await page.goto('about:blank');await page.goto(url);await page.waitForFunction(()=>document.getElementById('status').textContent==='Collectie geladen.');
     return page.frames().find(f=>f.name()==='shop');
    };
    let shop=await open();
    const share=shop.locator('#photo .photo-acts button').first();
    assert.equal(await share.getAttribute('aria-label'),'Delen');
    const box=await share.boundingBox();assert.ok(box.width>=44&&box.height>=44,'share button keeps 44px');
    await shop.locator('#nexts .th').first().click();assert.equal(await shop.locator('#title').textContent(),names[1]);
    if(nativeShare) {
     // One tap opens the phone's share sheet with only the public title and a link.
     await share.click();
     const shared=await page.evaluate(()=>window.shared);
     assert.deepEqual(shared,[{title:names[1],url:'https://app.test/#stuk='+id(1)}]);
     assert.equal(await share.getAttribute('aria-label'),'Delen','no checkmark when the share sheet handled it');
    } else {
     // Without a share sheet the link is copied, and the same icon briefly shows a checkmark.
     await share.click();
     // Clipboard writes finish asynchronously; wait for the actual success signal.
     await shop.locator('#photo .photo-acts button[aria-label="Link gekopieerd"]').waitFor();
     assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'https://app.test/#stuk='+id(1));
     assert.equal(await share.getAttribute('aria-label'),'Link gekopieerd');
     assert.equal(await share.locator('path').getAttribute('d'),'M5 12.5l4.5 4.5L19 7.5');
     assert.equal(await shop.locator('#photo .photo-acts').evaluate(el=>el.innerText.trim()),'','no text over the photo');
     await page.screenshot({path:path.join(output,'share-copied-'+width+'.png'),fullPage:true});
     await page.waitForTimeout(2100);
     assert.equal(await share.getAttribute('aria-label'),'Delen');assert.equal(await share.locator('circle').count(),3,'original icon returns');
    }
    // Opening a shared link shows that piece, then the address bar is tidied.
    shop=await open('https://app.test/#stuk='+id(3));
    assert.equal(await shop.locator('#title').textContent(),names[3],'shared piece is shown');
    assert.equal(await page.evaluate(()=>location.hash),'','link part removed after use');
    await page.reload();await page.waitForFunction(()=>document.getElementById('status').textContent==='Collectie geladen.');
    shop=page.frames().find(f=>f.name()==='shop');
    assert.equal(await shop.locator('#title').textContent(),names[0],'reload does not jump back');
    // Unknown, malformed or sold pieces: just the shop, no error screen.
    for(const hash of ['#stuk=00000000-0000-4000-8000-999999999999','#stuk=<img src=x>','#stuk=../../etc','#iets-anders']) {
     shop=await open('https://app.test/'+hash);
     assert.equal(await shop.locator('#title').textContent(),names[0],hash);
    }
    records=catalog(2);
    shop=await open('https://app.test/#stuk='+id(2));
    assert.equal(await shop.locator('#title').textContent(),names[0],'a sold piece is not shown');
    assert.deepEqual(writes,[],'sharing writes nothing');assert.deepEqual(errors,[]);
    await context.close();
   }
  }
  console.log('PASS share: native share sheet with title and link only, copy with checkmark, 44px, no text over photo, shared link opens the piece, link part removed, unknown/malformed/sold ignored, no writes. Screenshots: '+output);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

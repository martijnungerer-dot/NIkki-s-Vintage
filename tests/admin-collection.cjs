// Jouw collectie as a photo grid: + card, photo cards, edit by tapping a card, and
// "Markeer verkocht" with five seconds to undo before anything is saved.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {fixture,garment}=require('./admin-fixture.cjs');
const piece=(n,title,priceMinor,status,file='a'.repeat(64))=>{
  const id='11111111-1111-4111-8111-'+String(n).padStart(12,'0');
  return {...structuredClone(garment),id,display_id:n,status,data:{...garment.data,title,priceMinor,images:[{path:id+'/'+file+'.jpg',role:'Voorkant',main:true}]}};
};
const rows=()=>[piece(1,'Leren mantel',12500,'published'),piece(2,'Korte zwarte jas',32050,'sold'),piece(3,'Jas zonder foto',9900,'sold','missing')];
const soldCalls=f=>f.state.requests.filter(r=>r.path==='/rest/v1/rpc/mark_garment_sold_with_price').length;
const status=(f,title)=>f.page.locator('.piece').filter({hasText:title}).locator('.piece-status').innerText();
const first=f=>f.page.locator('.piece').filter({hasText:'Leren mantel'});
async function paused(){
  const f=await fixture(320,{rows:rows(),clock:true});await f.login();
  await f.page.clock.pauseAt(new Date(Date.now()+1000));return f;
}
async function propose(f){
  await first(f).getByRole('button',{name:/^Markeer verkocht/}).click();
  await f.page.getByRole('button',{name:'Ander bedrag',exact:true}).click();
  await f.page.getByLabel('Verkocht voor').fill('110,50');
}
async function schedule(f){await propose(f);await first(f).getByRole('button',{name:'Verkocht',exact:true}).click();}
async function settle(f){await f.page.locator('#reload:not([disabled])').waitFor();}
async function safeguards(){
  // A repeated tap cannot schedule two writes, and 4,999ms still allows undo.
  {
    const f=await paused();try{
      await propose(f);await first(f).locator('form').evaluate(form=>{form.requestSubmit();form.requestSubmit();});
      await f.page.clock.runFor(4999);assert.equal(soldCalls(f),0);
      await first(f).getByRole('button',{name:/^Ongedaan maken/}).click();
      await f.page.clock.runFor(6000);assert.equal(soldCalls(f),0);
      await propose(f);await first(f).locator('form').evaluate(form=>{form.requestSubmit();form.requestSubmit();});
      await f.page.clock.runFor(5000);await f.page.locator('#status').filter({hasText:'Als verkocht opgeslagen.'}).waitFor({state:'attached'});
      await settle(f);assert.equal(soldCalls(f),1);
      assert.equal(await first(f).locator('.piece-open').evaluate(e=>e===document.activeElement),true,'focus remains on the saved piece');
      assert.deepEqual(f.state.errors,[]);
    }finally{await f.browser.close();}
  }
  // Once the request starts there is no undo; a later refresh failure must never restore availability.
  {
    const f=await paused();let release;try{
      const hold=new Promise(resolve=>{release=resolve;});
      await f.page.context().route('**/rest/v1/rpc/mark_garment_sold_with_price',async route=>{
        if(route.request().method()!=='OPTIONS')await hold;await route.fallback();
      });
      await schedule(f);await f.page.clock.runFor(5000);
      await first(f).locator('.piece-undo').waitFor({state:'detached'});
      assert.equal(await first(f).locator('.piece-open').isDisabled(),true);
      assert.match(await status(f,'Leren mantel'),/^Wordt verkocht/,'no optimistic sold status');
      f.state.failList=true;release();
      await f.page.locator('#status').filter({hasText:'Verkocht opgeslagen. Vernieuw'}).waitFor();await settle(f);
      assert.equal(await status(f,'Leren mantel'),'Verkocht');assert.equal(soldCalls(f),1);
      assert.match(await first(f).locator('.piece-soldfor').innerText(),/110,50/);
      assert.equal(await first(f).locator('.piece-sold, .piece-undo').count(),0);
      assert.equal(await f.page.frameLocator('#shop').locator('#track .slide').count(),0,'confirmed sale leaves the public view immediately');
      assert.deepEqual(f.state.errors,[]);
    }finally{release?.();await f.browser.close();}
  }
  // Navigation, hidden tabs and changed records must not sell a piece out of sight or with a new version.
  for(const change of ['navigate','hidden','version','sold','removed','logout']){
    const f=await paused();try{
      await schedule(f);
      if(change==='navigate')await f.page.getByRole('button',{name:'Boetiek',exact:true}).click();
      if(change==='hidden')await f.page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
      if(['version','sold','removed'].includes(change)){
        if(change==='version')f.state.rows[0].version++;
        if(change==='sold')f.state.rows[0].status='sold';
        if(change==='removed')f.state.rows.shift();
        await f.page.locator('#reload').click();await settle(f);
      }
      if(change==='logout'){await f.page.locator('#logout').click();await f.page.locator('#login').waitFor({state:'visible'});}
      await f.page.clock.runFor(6000);assert.equal(soldCalls(f),0,'cancel after '+change);assert.deepEqual(f.state.errors,[]);
    }finally{await f.browser.close();}
  }
  // Shared actions may take longer than the grace period. Undo stays available until the sale is sent.
  {
    const f=await paused();let release;try{
      await schedule(f);const hold=new Promise(resolve=>{release=resolve;});
      await f.page.context().route('**/rest/v1/garments?**',async route=>{await hold;await route.fallback();});
      await f.page.locator('#reload').click();await f.page.locator('#reload[disabled]').waitFor();
      await f.page.clock.runFor(5000);assert.equal(soldCalls(f),0);
      assert.equal(await first(f).locator('.piece-undo').isEnabled(),true);
      release();await settle(f);await f.page.clock.runFor(300);
      await f.page.locator('#status').filter({hasText:'Als verkocht opgeslagen.'}).waitFor({state:'attached'});assert.equal(soldCalls(f),1);
      const sent=f.state.requests.find(r=>r.path==='/rest/v1/rpc/mark_garment_sold_with_price').body;
      assert.equal(sent.p_version,1);assert.equal(sent.p_price_minor,11050);assert.deepEqual(f.state.errors,[]);
    }finally{release?.();await f.browser.close();}
  }
  for(const code of [503,404]){
    const f=await paused();try{
      await f.page.context().route('**/rest/v1/rpc/mark_garment_sold_with_price',route=>route.request().method()==='OPTIONS'?route.fallback():route.fulfill({status:code,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:'{}'}));
      await schedule(f);await f.page.clock.runFor(5000);await first(f).locator('.piece-error').waitFor();await settle(f);
      assert.equal(await status(f,'Leren mantel'),'In de boetiek');assert.equal(f.state.rows[0].status,'published');
      await f.page.context().unroute('**/rest/v1/rpc/mark_garment_sold_with_price');
      await schedule(f);await f.page.clock.runFor(5000);await f.page.locator('#status').filter({hasText:'Als verkocht opgeslagen.'}).waitFor({state:'attached'});
      assert.equal(soldCalls(f),1);assert.deepEqual(f.state.errors,[]);
    }finally{await f.browser.close();}
  }
  {
    const malicious=rows();malicious[0].data.title='<img src=x onerror=alert(1)> Een heel lange titel';
    const f=await fixture(320,{rows:malicious});try{
      await f.login();assert.equal(await f.page.locator('.piece-title').nth(1).innerText(),malicious[0].data.title);
      assert.equal(await f.page.locator('.piece-title img').count(),0);
      assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await f.page.getByRole('button',{name:'Bewerken: Jas zonder foto'}).click();
      await f.page.locator('#status').filter({hasText:'Niet alle foto’s'}).waitFor();assert.equal(await f.page.locator('#intake').isVisible(),false);
      assert.deepEqual(f.state.errors,[]);
    }finally{await f.browser.close();}
  }
}

(async()=>{
  for(const width of [390,320]){
    const f=await fixture(width,{rows:rows(),clock:true});
    try{
      const p=f.page;await f.login();await p.locator('#items li.piece').first().waitFor();
      // Two columns; the + card is first (top left) and opens Nieuw stuk.
      const boxes=await p.locator('#items > li').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,cls:e.className};}));
      assert.equal(boxes.length,4);assert.equal(boxes[0].cls,'new-card');
      assert.equal(boxes[0].y,boxes[1].y,'two cards on the first row');assert.ok(boxes[1].x>boxes[0].x+boxes[0].w);
      assert.equal(boxes[2].x,boxes[0].x,'the third card starts the second row');assert.ok(boxes[2].y>boxes[0].y);
      assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),width+'px no horizontal overflow');
      assert.equal(await p.locator('#new .piece-title').innerText(),'Nieuw stuk');
      assert.equal(await p.locator('#new svg').count(),1,'hanger icon on the + card');
      const sizes=await p.locator('#items > li').evaluateAll(es=>es.slice(0,2).map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,photo:e.querySelector('.piece-photo').getBoundingClientRect().height})));
      assert.deepEqual(sizes[0],sizes[1],'add card and its photo have the same size as the adjacent piece');
      const icons=await p.locator('.app-toolbar svg, #new svg, .piece-sold svg').evaluateAll(es=>es.map(e=>({size:e.getBoundingClientRect().width,stroke:e.getAttribute('stroke-width'),box:e.getAttribute('viewBox')})));
      assert.ok(icons.every(i=>i.size===24&&i.stroke==='1.5'&&i.box==='0 0 24 24'),'one icon family and size');
      const cdp=await p.context().newCDPSession(p);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
      const {root}=await cdp.send('DOM.getDocument'),{nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'.piece-title'});
      const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});assert.ok(fonts.some(font=>font.isCustomFont&&font.familyName.includes('Newsreader')),'actual rendered Newsreader');await cdp.detach();
      // Per card: main photo, title, price and status, under the photo and never on it.
      const first=p.locator('.piece').filter({hasText:'Leren mantel'});
      assert.equal(await first.locator('.piece-photo img').count(),1);
      assert.equal((await first.locator('.piece-price').innerText()).replace(/\s/g,' '),'€ 125');
      assert.equal((await p.locator('.piece').filter({hasText:'Korte zwarte jas'}).locator('.piece-price').innerText()).replace(/\s/g,' '),'€ 320,50');
      assert.equal(await status(f,'Leren mantel'),'In de boetiek');assert.equal(await status(f,'Korte zwarte jas'),'Verkocht');
      assert.equal(await p.locator('.piece').filter({hasText:'Korte zwarte jas'}).locator('.piece-photo img').count(),1,'sold pieces show their photo too');
      assert.deepEqual(await first.evaluate(li=>{const photo=li.querySelector('.piece-photo').getBoundingClientRect();return [...li.querySelectorAll('.piece-title,.piece-price,.piece-status')].filter(e=>e.getBoundingClientRect().top<photo.bottom).length;}),0,'no text over the photo');
      // A photo that cannot be signed leaves an empty tile; the card still works.
      const bare=p.locator('.piece').filter({hasText:'Jas zonder foto'});
      assert.equal(await bare.locator('.piece-photo img').count(),0);assert.equal(await bare.locator('.piece-open').isEnabled(),true);
      // House style: Newsreader, text at least 16px, controls at least 44px, cream/sand/ink only.
      const style=await p.locator('#items').evaluate(list=>{
        const texts=[...list.querySelectorAll('.piece-title,.piece-price,.piece-status,.new-plus')].map(e=>parseFloat(getComputedStyle(e).fontSize));
        const targets=[...list.querySelectorAll('button')].map(e=>{const r=e.getBoundingClientRect();return Math.min(r.width,r.height);});
        const colours=[...list.querySelectorAll('*')].flatMap(e=>{const c=getComputedStyle(e);return [c.color,c.backgroundColor];});
        return {font:getComputedStyle(list.querySelector('.piece-title')).fontFamily,minText:Math.min(...texts),minTarget:Math.min(...targets),colours:[...new Set(colours)]};
      });
      assert.match(style.font,/Newsreader/);assert.ok(style.minText>=16,'text at least 16px: '+style.minText);assert.ok(style.minTarget>=44,'controls at least 44px: '+style.minTarget);
      for(const colour of style.colours){
        const [r,g,b,a=1]=colour.match(/[\d.]+/g).map(Number);
        // Yellow or orange: clearly more red than blue with strong saturation. The palette is cream, sand and ink.
        assert.ok(a===0||Math.max(r,g,b)-Math.min(r,g,b)<60,'no yellow or orange in the grid: '+colour);
      }
      // Only an available piece can be marked sold.
      assert.equal(await p.getByRole('button',{name:/^Markeer verkocht/}).count(),1);
      // Markeer verkocht: nothing is saved for five seconds, and Ongedaan maken cancels it.
      // First one question: sold for the asking price? Three buttons; the amount field only opens with Ander bedrag.
      await p.getByRole('button',{name:'Markeer verkocht: Leren mantel'}).click();
      const direct=p.getByRole('button',{name:/^Verkocht voor/});
      assert.equal((await direct.innerText()).replace(/\s/g,' '),'Verkocht voor € 125');assert.equal(await direct.evaluate(e=>document.activeElement===e),true);
      assert.equal(await p.getByLabel('Verkocht voor').count(),0,'no amount field yet');
      for(const b of await p.locator('.piece-ask button').all()){const r=await b.boundingBox();assert.ok(r.height>=44,'sale buttons at least 44px');}
      assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),width+'px sale question fits');
      await p.getByRole('button',{name:'Annuleer'}).click();assert.equal(await status(f,'Leren mantel'),'In de boetiek');assert.equal(soldCalls(f),0);
      // Tapping the asking price: five seconds to undo, then saved at exactly the asking price in cents.
      await p.getByRole('button',{name:'Markeer verkocht: Leren mantel'}).click();await p.getByRole('button',{name:/^Verkocht voor/}).click();
      assert.equal((await status(f,'Leren mantel')).replace(/\s/g,' '),'Wordt verkocht voor € 125…');
      await p.clock.runFor(2000);assert.equal(soldCalls(f),0);await p.getByRole('button',{name:/^Ongedaan maken/}).click();
      assert.equal(await status(f,'Leren mantel'),'In de boetiek');await p.clock.runFor(10000);assert.equal(soldCalls(f),0);
      // Ander bedrag: the amount field opens with the asking price filled in; nonsense is refused; Annuleer goes back.
      await p.getByRole('button',{name:'Markeer verkocht: Leren mantel'}).click();await p.getByRole('button',{name:'Ander bedrag',exact:true}).click();
      const price=p.getByLabel('Verkocht voor');
      assert.equal(await price.inputValue(),'125');assert.equal(await price.evaluate(e=>document.activeElement===e),true);
      for(const b of await p.locator('.piece-ask button, .piece-ask input').all()){const r=await b.boundingBox();assert.ok(r.height>=44,'price question controls at least 44px');}
      assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),width+'px price question fits');
      await price.fill('veel');await p.getByRole('button',{name:'Verkocht',exact:true}).click();
      assert.match(await p.locator('.piece-error').innerText(),/Vul een bedrag in/);assert.equal(soldCalls(f),0);
      await p.getByRole('button',{name:'Annuleer'}).click();assert.equal(await status(f,'Leren mantel'),'In de boetiek');
      await p.getByRole('button',{name:'Markeer verkocht: Leren mantel'}).click();await p.getByRole('button',{name:'Ander bedrag',exact:true}).click();
      await p.getByLabel('Verkocht voor').fill('110,50');await p.getByRole('button',{name:'Verkocht',exact:true}).click();
      assert.equal((await status(f,'Leren mantel')).replace(/\s/g,' '),'Wordt verkocht voor € 110,50…');
      const undo=p.getByRole('button',{name:/^Ongedaan maken/});
      assert.equal(await undo.evaluate(e=>document.activeElement===e),true,'focus moves to Ongedaan maken');
      assert.ok((await undo.boundingBox()).height>=44);
      await p.clock.runFor(4000);assert.equal(soldCalls(f),0,'nothing saved within five seconds');
      await undo.click();
      assert.equal(await status(f,'Leren mantel'),'In de boetiek');
      assert.equal(await p.getByRole('button',{name:'Markeer verkocht: Leren mantel'}).evaluate(e=>document.activeElement===e),true);
      await p.clock.runFor(10000);assert.equal(soldCalls(f),0,'undone: never saved');
      // A refresh during the five seconds keeps the choice and the undo button.
      await p.getByRole('button',{name:'Markeer verkocht: Leren mantel'}).click();await p.getByRole('button',{name:'Ander bedrag',exact:true}).click();
      await p.getByLabel('Verkocht voor').fill('110,50');await p.getByRole('button',{name:'Verkocht',exact:true}).click();
      await p.locator('#reload').click();await p.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Collectie vernieuwd.'));
      assert.match(await status(f,'Leren mantel'),/^Wordt verkocht voor/);assert.equal(soldCalls(f),0);
      // After five seconds it is saved; sold has no way back.
      await p.clock.runFor(5200);
      await p.waitForFunction(()=>document.getElementById('status').textContent==='Als verkocht opgeslagen.');
      assert.equal(soldCalls(f),1);assert.equal(f.state.rows[0].status,'sold');
      assert.equal(f.state.requests.find(r=>r.path==='/rest/v1/rpc/mark_garment_sold_with_price').body.p_price_minor,11050,'the sale price is saved in cents');
      assert.equal((await p.locator('.piece').filter({hasText:'Leren mantel'}).locator('.piece-soldfor').innerText()).replace(/\s/g,' '),'voor € 110,50','the grid shows what it sold for');
      assert.equal(await status(f,'Leren mantel'),'Verkocht');
      assert.equal(await p.getByRole('button',{name:/^(Markeer verkocht|Ongedaan maken)/}).count(),0,'sold cannot go back to available');
      // Tap a card to edit it; the + card opens an empty Nieuw stuk.
      await p.getByRole('button',{name:'Bewerken: Korte zwarte jas'}).click();
      await p.waitForFunction(()=>!document.getElementById('intake').hidden);
      await p.evaluate(()=>window.NikkiApp.openAccount());
      await p.locator('#new').click();assert.equal(await p.locator('#intake').isVisible(),true);
      // Navigation: the button of the open screen is switched off and marked; from Nieuw stuk Jouw collectie works as the way back.
      const nav=p.locator('.app-toolbar button[data-screen=manage]');
      assert.equal(await nav.isEnabled(),true,'Jouw collectie works from Nieuw stuk');assert.equal(await nav.getAttribute('aria-current'),null);
      await nav.click();await p.waitForFunction(()=>document.getElementById('intake').hidden&&!document.getElementById('manage').hidden);
      assert.equal(await nav.isDisabled(),true,'on Jouw collectie the button does nothing, so it is off');
      assert.equal(await nav.getAttribute('aria-current'),'page');assert.equal(await nav.getAttribute('aria-pressed'),'true');
      const home=p.locator('.app-toolbar button[data-screen=shop]');assert.equal(await home.isEnabled(),true);assert.equal(await home.getAttribute('aria-current'),null);
      await p.locator('#new').click();assert.equal(await nav.isEnabled(),true,'back to enabled on Nieuw stuk');
      assert.deepEqual(f.state.errors,[]);
    }finally{await f.browser.close();}
  }
  // A failed save puts the piece back as available and says so; an empty collection shows only the + card.
  {
    const f=await fixture(390,{rows:rows(),clock:true,failSold:true});
    try{
      const p=f.page;await f.login();await p.locator('#items li.piece').first().waitFor();
      await p.getByRole('button',{name:'Markeer verkocht: Leren mantel'}).click();await p.getByRole('button',{name:/^Verkocht voor/}).click();await p.clock.runFor(5200);
      await p.locator('#status').filter({hasText:'elders gewijzigd'}).waitFor();
      assert.equal(await status(f,'Leren mantel'),'In de boetiek');
      assert.equal(await p.getByRole('button',{name:'Markeer verkocht: Leren mantel'}).count(),1);
    }finally{await f.browser.close();}
  }
  {
    const f=await fixture(390,{rows:[]});
    try{
      await f.login();
      assert.equal(await f.page.locator('#items > li').count(),1);assert.equal(await f.page.locator('#new').isVisible(),true);
      assert.equal(await f.page.locator('#empty').isVisible(),true);
    }finally{await f.browser.close();}
  }
  await safeguards();
  // Reproducible mobile review images; these use the same two pieces as the before images.
  fs.mkdirSync('test-results/admin',{recursive:true});
  for(const width of [390,320]){
    const f=await fixture(width,{clock:true});try{
      const sold=structuredClone(garment);sold.id='22222222-2222-4222-8222-222222222222';sold.status='sold';sold.data.title='Shearling jack';sold.data.priceMinor=18900;f.state.rows.push(sold);
      await f.login();await f.page.clock.pauseAt(new Date(Date.now()+1000));
      await f.page.locator('.piece-photo img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
      await f.page.screenshot({path:`test-results/admin/collection-${width}.png`});
      await schedule(f);await f.page.locator('.piece-photo img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
      await f.page.screenshot({path:`test-results/admin/undo-${width}.png`});
      assert.deepEqual(f.state.errors,[]);
    }finally{await f.browser.close();}
  }
  console.log('PASS admin collection: 390/320 grid, equal add card, actual Newsreader, 16px/44px and uniform icons, sale price and five-second undo, duplicate taps, in-flight locking, refresh failure after success, cancellation on navigation/hidden tab/version/logout, busy refresh, errors and retry, safe text and missing photos. Services mocked.');
})().catch(e=>{console.error(e);process.exit(1);});

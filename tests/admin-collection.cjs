// Jouw collectie as a photo grid: + card, photo cards, edit by tapping a card, and
// "Markeer verkocht" with five seconds to undo before anything is saved.
const assert=require('node:assert/strict');
const {fixture,garment}=require('./admin-fixture.cjs');
const piece=(n,title,priceMinor,status,file='a'.repeat(64))=>{
  const id='11111111-1111-4111-8111-'+String(n).padStart(12,'0');
  return {...structuredClone(garment),id,display_id:n,status,data:{...garment.data,title,priceMinor,images:[{path:id+'/'+file+'.jpg',role:'Voorkant',main:true}]}};
};
const rows=()=>[piece(1,'Leren mantel',12500,'published'),piece(2,'Korte zwarte jas',32050,'sold'),piece(3,'Jas zonder foto',9900,'sold','missing')];
const soldCalls=f=>f.state.requests.filter(r=>r.path==='/rest/v1/rpc/mark_garment_sold').length;
const status=(f,title)=>f.page.locator('.piece').filter({hasText:title}).locator('.piece-status').innerText();

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
      // Per card: main photo, title, price and status, under the photo and never on it.
      const first=p.locator('.piece').filter({hasText:'Leren mantel'});
      assert.equal(await first.locator('.piece-photo img').count(),1);
      assert.equal((await first.locator('.piece-price').innerText()).replace(/\s/g,' '),'€ 125');
      assert.equal((await p.locator('.piece').filter({hasText:'Korte zwarte jas'}).locator('.piece-price').innerText()).replace(/\s/g,' '),'€ 320,50');
      assert.equal(await status(f,'Leren mantel'),'Beschikbaar');assert.equal(await status(f,'Korte zwarte jas'),'Verkocht');
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
      await p.getByRole('button',{name:'Markeer verkocht: Leren mantel'}).click();
      assert.equal(await status(f,'Leren mantel'),'Wordt verkocht…');
      const undo=p.getByRole('button',{name:/^Ongedaan maken/});
      assert.equal(await undo.evaluate(e=>document.activeElement===e),true,'focus moves to Ongedaan maken');
      assert.ok((await undo.boundingBox()).height>=44);
      await p.clock.runFor(4000);assert.equal(soldCalls(f),0,'nothing saved within five seconds');
      await undo.click();
      assert.equal(await status(f,'Leren mantel'),'Beschikbaar');
      assert.equal(await p.getByRole('button',{name:'Markeer verkocht: Leren mantel'}).evaluate(e=>document.activeElement===e),true);
      await p.clock.runFor(10000);assert.equal(soldCalls(f),0,'undone: never saved');
      // A refresh during the five seconds keeps the choice and the undo button.
      await p.getByRole('button',{name:'Markeer verkocht: Leren mantel'}).click();
      await p.locator('#reload').click();await p.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Collectie vernieuwd.'));
      assert.equal(await status(f,'Leren mantel'),'Wordt verkocht…');assert.equal(soldCalls(f),0);
      // After five seconds it is saved; sold has no way back.
      await p.clock.runFor(5200);
      await p.waitForFunction(()=>document.getElementById('status').textContent==='Als verkocht opgeslagen.');
      assert.equal(soldCalls(f),1);assert.equal(f.state.rows[0].status,'sold');
      assert.equal(await status(f,'Leren mantel'),'Verkocht');
      assert.equal(await p.getByRole('button',{name:/^(Markeer verkocht|Ongedaan maken)/}).count(),0,'sold cannot go back to available');
      // Tap a card to edit it; the + card opens an empty Nieuw stuk.
      await p.getByRole('button',{name:'Bewerken: Korte zwarte jas'}).click();
      await p.waitForFunction(()=>!document.getElementById('intake').hidden);
      await p.evaluate(()=>window.NikkiApp.openAccount());
      await p.locator('#new').click();assert.equal(await p.locator('#intake').isVisible(),true);
      assert.deepEqual(f.state.errors,[]);
    }finally{await f.browser.close();}
  }
  // A failed save puts the piece back as available and says so; an empty collection shows only the + card.
  {
    const f=await fixture(390,{rows:rows(),clock:true,failSold:true});
    try{
      const p=f.page;await f.login();await p.locator('#items li.piece').first().waitFor();
      await p.getByRole('button',{name:'Markeer verkocht: Leren mantel'}).click();await p.clock.runFor(5200);
      await p.locator('#status').filter({hasText:'elders gewijzigd'}).waitFor();
      assert.equal(await status(f,'Leren mantel'),'Beschikbaar');
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
  console.log('PASS admin collection: two-column photo grid at 390/320, + card first, photo/title/price/status per card, sold photos, missing photo isolated, 16px/44px/Newsreader/no yellow, five-second undo before saving, refresh keeps the choice, sold has no way back, failed save restored, empty collection.');
})().catch(e=>{console.error(e);process.exit(1);});

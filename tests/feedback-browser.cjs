// Nikki's test feedback of 19 November 2026 (docs/FEEDBACK-OPVOLGING.md), in the real app with mocked services:
// a concept is never lost when another piece is opened, it shows as a red "Niet af" card, the back arrow leaves
// to Jouw collectie, the photo stays large, a tap shows it full screen, the phone's gallery is offered,
// Gemini gets what Nikki said per photo (close-ups sharp) and the brand is only a proposal.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {fixture}=require('./admin-fixture.cjs');
const {answer,change}=require('./intake-helper.cjs');
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'};
(async()=>{
  fs.mkdirSync('test-results/feedback',{recursive:true});
  for(const [width,height] of [[390,693],[320,568]]){
    const f=await fixture(width),p=f.page;
    try{
      await p.setViewportSize({width,height});
      let analysed=null;
      await p.route('**/functions/v1/analyse',route=>{
        if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
        analysed=route.request().postDataJSON();
        return route.fulfill({status:200,headers:cors,contentType:'application/json',body:JSON.stringify({titel:'Korte jas',beschrijving:'',labeltekst:'Dior Paris',merk:{waarde:'Dior',zekerheid:'hoog',waarom:'Staat op het label'},fotos:[]})});
      });
      await f.login();
      const intake=p.frameLocator('#intake'),manage=p.locator('#manage');
      const cards=()=>p.locator('#items li.piece[data-status=concept]');
      await p.locator('#new').click();await intake.locator('label.camera').waitFor();
      // The phone offers its own photo gallery (Android shows its picker for image/*, a file browser for a list of types).
      assert.equal(await intake.locator('#files').getAttribute('accept'),'image/*');
      // Back on the empty photo screen: to Jouw collectie, and an empty piece leaves no concept.
      assert.equal(await intake.locator('#back').isDisabled(),false);
      assert.equal(await intake.locator('#back').getAttribute('aria-label'),'Terug naar Jouw collectie');
      await intake.locator('#back').click();await manage.waitFor();assert.equal(await cards().count(),0);
      await p.locator('#new').click();
      const photo=c=>p.evaluate(colour=>{const k=document.createElement('canvas');k.width=2000;k.height=1500;const x=k.getContext('2d');x.fillStyle='#e9e1d6';x.fillRect(0,0,2000,1500);x.fillStyle=colour;x.fillRect(700,200,600,1200);return k.toDataURL('image/png').split(',')[1];},c);
      await intake.locator('#files').setInputFiles([{name:'voor.png',mimeType:'image/png',buffer:Buffer.from(await photo('#5a3b2a'),'base64')},{name:'label.png',mimeType:'image/png',buffer:Buffer.from(await photo('#222'),'base64')}]);
      assert.equal(await intake.locator('#label-hint').isVisible(),true,'asks for a label photo');
      // Photo screen on a small phone: the photo is visible and the photo buttons never cover the text.
      const hero=await intake.locator('#hero').boundingBox(),tools=await intake.locator('#photo-tools').boundingBox(),talk=await intake.locator('#talk').boundingBox();
      assert.ok(hero.height>=100,'photo visible on the photo screen: '+hero.height);
      assert.ok(tools.y+tools.height<=talk.y+1,'photo buttons stay above the conversation');
      await p.screenshot({path:`test-results/feedback/fotos-${width}.png`});
      await intake.locator('#thumbs [data-view]').nth(1).click();await intake.locator('#role').selectOption('Label');
      assert.equal(await intake.locator('#label-hint').count(),0);
      await intake.locator('#gemini-note').fill('Gekocht in Parijs');
      await intake.getByRole('button',{name:'Laat Gemini kijken'}).click();await intake.locator('#question').waitFor();
      // What Nikki said goes along as data; the label goes sharp (1600 px), the overview photo smaller (1024 px).
      assert.deepEqual(analysed.photos,[{rol:'',intern:false},{rol:'Label',intern:false}]);
      assert.equal(analysed.note,'Gekocht in Parijs');
      const widths=await p.evaluate(images=>Promise.all(images.map(i=>new Promise(r=>{const im=new Image();im.onload=()=>r(im.naturalWidth);im.src='data:'+i.mimeType+';base64,'+i.data;}))),analysed.images);
      assert.deepEqual(widths,[1024,1600]);
      // During the questions the photo keeps a large part of the screen.
      const big=await intake.locator('#hero').boundingBox();
      assert.ok(big.height>=height*(width===390?0.35:0.3),'photo height '+big.height+' of '+height);
      await p.screenshot({path:`test-results/feedback/vraag-${width}.png`});
      // A tap shows the photo full screen; arrows (or a swipe) go to the next one; close returns.
      await intake.locator('#hero img').click();
      assert.equal(await intake.locator('#viewer').isVisible(),true);assert.equal(await intake.locator('#viewer-count').textContent(),'2 van 2','the photo that was on screen');
      await intake.locator('#viewer-next').click();assert.equal(await intake.locator('#viewer-count').textContent(),'1 van 2','next wraps around');
      for(const b of ['#viewer-prev','#viewer-next','#viewer-close']){const r=await intake.locator(b).boundingBox();assert.ok(r.width>=44&&r.height>=44,b);}
      await p.screenshot({path:`test-results/feedback/schermvullend-${width}.png`});
      await intake.locator('#viewer-close').click();assert.equal(await intake.locator('#viewer').isVisible(),false);
      // The brand: what Gemini read is a marked button, never chosen by itself.
      await answer(intake,{},{stopAt:'merk'});
      assert.match(await intake.locator('#hint').innerText(),/Gemini las: Dior/);
      const dior=intake.locator('#answer [data-value=Dior]');
      assert.equal(await dior.getAttribute('aria-pressed'),'false');assert.match(await dior.getAttribute('class'),/guess/);
      await dior.click();await answer(intake,{});
      assert.match(await intake.locator('#summary').innerText(),/Merk\s+Dior/);
      // Back from the overview: to Jouw collectie; the piece waits there as a red card "Niet af".
      assert.equal(await intake.locator('#back').getAttribute('aria-label'),'Terug naar Jouw collectie');
      await intake.locator('#back').click();await manage.waitFor();await cards().first().waitFor();
      assert.equal(await cards().count(),1);
      // Below the photo: how many steps the boutique still needs (all questions were skipped: title, price, measurements …).
      const left=await cards().locator('.piece-status').textContent();assert.match(left,/^Nog \d+ stappen$/);
      const expected=await p.frames().find(x=>x.name()==='intake').evaluate(async()=>(await window.NikkiIntake.concepts())[0].open);
      assert.equal(left,'Nog '+expected+' stappen');assert.ok(expected>=3);
      assert.match(await cards().locator('.piece-open').getAttribute('aria-label'),/Niet af, nog niet in de boetiek/);
      assert.equal(await cards().locator('.piece-photo img').count(),1,'with its main photo');
      const frame=await cards().locator('.piece-photo').evaluate(e=>getComputedStyle(e,'::after').borderTopColor);
      assert.equal(frame,'rgb(155, 58, 47)','red frame');
      await p.screenshot({path:`test-results/feedback/collectie-${width}.png`});
      // Opening a saved piece no longer throws the concept away (19 November: "Concept foetsie").
      p.removeAllListeners('dialog');const asked=[];p.on('dialog',d=>{asked.push(d.message());d.accept();});
      await p.getByRole('button',{name:'Bewerken: Leren mantel'}).click();await intake.locator('#summary').waitFor();
      assert.deepEqual(asked,[],'no warning needed: the concept is kept');
      assert.equal(await intake.locator('#name').textContent(),'Stuk bewerken');
      await intake.locator('#back').click();await manage.waitFor();await cards().first().waitFor();
      assert.equal(await cards().count(),1,'concept still there after Bewerken');
      // Nieuw stuk starts empty; the concept stays.
      await p.locator('#new').click();await intake.locator('label.camera').waitFor();
      await intake.locator('#back').click();await manage.waitFor();await cards().first().waitFor();assert.equal(await cards().count(),1);
      // Tap the red card: back where she was.
      await cards().locator('.piece-open').click();await intake.locator('#summary').waitFor();
      assert.equal(await intake.locator('#name').textContent(),'Nieuw stuk');
      assert.match(await intake.locator('#summary').innerText(),/Merk\s+Dior/);
      assert.equal(await intake.locator('#thumbs [data-view]').count(),2);
      // An amount with cents shows two digits after the comma (Nikki, 24 November 2026).
      await change(intake,'prijs','147,5');await intake.locator('#summary').waitFor();
      assert.match(await intake.locator('#summary').innerText(),/€ 147,50/);
      // Logging out asks; OK keeps the concepts on this device.
      await p.evaluate(()=>window.NikkiApp.openAccount());
      await Promise.all([p.waitForEvent('load'),p.locator('#logout').click()]);
      assert.match(asked.at(-1),/1 onafgemaakt stuk of niet-opgeslagen wijziging op dit toestel\. Bewaren/);
      await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Collectie geladen.'));
      await p.evaluate(()=>window.NikkiApp.openAccount());await f.login();await cards().first().waitFor();
      assert.equal(await cards().count(),1,'kept after logging out and in');
      // Cancel removes them.
      p.removeAllListeners('dialog');p.on('dialog',d=>d.dismiss());
      await Promise.all([p.waitForEvent('load'),p.locator('#logout').click()]);
      await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Collectie geladen.'));
      await p.evaluate(()=>window.NikkiApp.openAccount());await f.login();await p.locator('#items li.piece').first().waitFor();
      assert.equal(await cards().count(),0,'removed when Nikki chose so');
      // An unsaved edit of a saved piece is no red card, but logging out asks about it too and can keep it
      // (review Codex, PR #66); opening the piece again brings the edit back.
      await p.getByRole('button',{name:'Bewerken: Leren mantel'}).click();await intake.locator('#summary').waitFor();
      await change(intake,'titel','Leren mantel met ceintuur');await intake.locator('#summary').waitFor();
      await intake.locator('#back').click();await manage.waitFor();assert.equal(await cards().count(),0);
      p.removeAllListeners('dialog');const kept=[];p.on('dialog',d=>{kept.push(d.message());d.accept();});
      await Promise.all([p.waitForEvent('load'),p.locator('#logout').click()]);
      assert.match(kept[0],/1 onafgemaakt stuk of niet-opgeslagen wijziging/);
      await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Collectie geladen.'));
      await p.evaluate(()=>window.NikkiApp.openAccount());await f.login();await p.locator('#items li.piece').first().waitFor();
      await p.evaluate(()=>window.NikkiApp.openAccount());
      await p.getByRole('button',{name:'Bewerken: Leren mantel'}).click();await intake.locator('#summary').waitFor();
      assert.match(await intake.locator('#summary').innerText(),/Leren mantel met ceintuur/,'the unsaved edit came back');
      assert.deepEqual(f.state.errors,[]);
    }finally{await f.browser.close();}
  }
  console.log('PASS feedback 19 November: concepts kept as red cards with the number of steps left (Bewerken, Nieuw stuk, logout), back arrow to Jouw collectie, large photo and full-screen view, gallery picker (image/*), photo roles and note to Gemini with sharp close-ups, brand only as a proposal. 390×693 and 320×568, services mocked.');
})().catch(e=>{console.error(e);process.exit(1);});

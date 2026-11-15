const assert=require('node:assert/strict');
const fs=require('node:fs');
const {fixture}=require('./admin-fixture.cjs');
const {answer,change,type,stepId}=require('./intake-helper.cjs');
async function fill(p){
  await p.locator('#email').fill('nikki@example.test');
  await p.locator('#password').fill('test-password');
}
async function realNewsreader(p){
  const cdp=await p.context().newCDPSession(p);
  await cdp.send('DOM.enable');await cdp.send('CSS.enable');
  const {root}=await cdp.send('DOM.getDocument');
  const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#manage-title'});
  const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});
  assert.ok(fonts.some(f=>f.isCustomFont&&f.familyName.includes('Newsreader')&&f.glyphCount>0),JSON.stringify(fonts));
  await cdp.detach();
}
(async()=>{
  fs.mkdirSync('test-results/admin',{recursive:true});
  for(const width of [390,320]) {
    const f=await fixture(width), p=f.page;
    try {
      assert.equal(await p.locator('#manage-title').textContent(),'Welkom terug');
      assert.equal(await p.locator('.app-messages').isVisible(),false);
      assert.equal(await p.locator('#manage').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)','login area stays cream, no red (Martijn, 14 Nov 2026)');
      assert.equal(await p.locator('.manage-content').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
      assert.equal(await p.locator('#trial-note').textContent(),'Proefboetiek · nog niet afrekenen');
      assert.ok((await p.locator('#trial-note').boundingBox()).y>=(await p.locator('.manage-content').boundingBox()).y+(await p.locator('.manage-content').boundingBox()).height);
      await realNewsreader(p);
      for(const el of await p.locator('#manage-title, #login label, #login input, #login button, #trial-note').evaluateAll(es=>es.map(e=>({font:getComputedStyle(e).fontFamily,size:parseFloat(getComputedStyle(e).fontSize)})))){
        assert.ok(el.font.includes('Newsreader'));assert.ok(el.size>=16);
      }
      const brand=await p.locator('.app-toolbar strong').boundingBox(),nav=await p.locator('.app-toolbar nav').boundingBox();
      assert.ok(brand.x+brand.width<=nav.x&&Math.abs((brand.y+brand.height/2)-(nav.y+nav.height/2))<2,'one header row');
      assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await p.getByRole('button',{name:'Wachtwoord tonen',exact:true}).click();
      assert.equal(await p.locator('#password').getAttribute('type'),'text');
      assert.equal(await p.getByRole('button',{name:'Wachtwoord verbergen',exact:true}).count(),1);
      assert.equal(await p.locator('#password-toggle').getAttribute('aria-pressed'),null);
      await p.locator('#password-toggle').click();
      await p.locator('#email').focus();
      assert.equal(await p.locator('#email').evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
      await p.locator('#email').press('Tab');assert.equal(await p.locator('#password').evaluate(e=>document.activeElement===e),true);
      await p.locator('#password').press('Tab');assert.equal(await p.locator('#password-toggle').evaluate(e=>document.activeElement===e),true);
      await p.locator('#password-toggle').blur();
      await p.mouse.move(0,843);
      await p.screenshot({path:`test-results/admin/login-${width}.png`});
      // Log in with the password visible: success must clear and hide it.
      await p.locator('#password-toggle').click();await f.login();
      assert.equal(await p.locator('#manage-title').textContent(),'Jouw collectie');
      assert.equal(await p.locator('#password').inputValue(),'');
      assert.equal(await p.locator('#password').getAttribute('type'),'password');
      assert.equal(await p.locator('#password-toggle').getAttribute('aria-label'),'Wachtwoord tonen');
      for(const box of await p.locator('button[data-icon]:visible').evaluateAll(es=>es.map(e=>({w:e.offsetWidth,h:e.offsetHeight,label:e.getAttribute('aria-label')}))))assert.ok(box.w>=44&&box.h>=44&&box.label);
      await p.mouse.move(0,843);
      await p.screenshot({path:`test-results/admin/collection-${width}.png`});
      await p.locator('#logout').click();
      await p.waitForFunction(()=>document.getElementById('status').textContent==='Collectie geladen.');
      await p.evaluate(()=>window.NikkiApp.openAccount());
      assert.equal(await p.locator('#login').isVisible(),true);
      assert.deepEqual(f.state.errors,[]);
    } finally {await f.browser.close();}
  }
  for(const failure of ['failLogin','denyStaff']) {
    const f=await fixture();try {
      f.state[failure]=true;await fill(f.page);
      await f.page.locator('#login [type=submit]').click();
      await f.page.locator('#login-error').filter({hasText:failure==='denyStaff'?'geen beheerrechten':'wachtwoord klopt niet'}).waitFor();
      assert.equal(await f.page.locator('#login').isVisible(),true);
      assert.equal(await f.page.locator('#login-error').evaluate(e=>document.activeElement===e),false);
      if(failure==='failLogin')assert.equal(await f.page.locator('#password').evaluate(e=>document.activeElement===e),true,'a wrong password puts the focus back in the password field');
      assert.equal(await f.page.locator('#login [type=submit]').isDisabled(),false);
      assert.equal(await f.page.locator('#new').isVisible(),false);
      assert.equal(await f.page.evaluate(()=>Object.values(sessionStorage).some(v=>v.includes('access_token'))),false);
      f.state[failure]=false;await f.login();assert.deepEqual(f.state.errors,[]);
    } finally {await f.browser.close();}
  }
  {
    const f=await fixture();try {
      f.state.failList=true;await fill(f.page);await f.page.locator('#password-toggle').click();
      await f.page.locator('#login [type=submit]').click();
      await f.page.locator('#status').filter({hasText:'niet afgerond'}).waitFor();
      assert.equal(await f.page.locator('#login').isVisible(),false);
      assert.equal(await f.page.locator('#password').inputValue(),'');
      assert.equal(await f.page.locator('#password').getAttribute('type'),'password');
      assert.equal(await f.page.locator('#login-error').textContent(),'');
      f.state.failList=false;await f.page.locator('#reload').click();
      await f.page.locator('#items li.piece').waitFor();assert.deepEqual(f.state.errors,[]);
    } finally {await f.browser.close();}
  }
  {
    const f=await fixture(320,{clock:true});let release;try {
      f.state.loginHold=new Promise(resolve=>{release=resolve;});await fill(f.page);
      await f.page.locator('#login [type=submit]').click();
      await f.page.waitForFunction(()=>document.getElementById('login').getAttribute('aria-busy')==='true');
      const count=f.state.requests.filter(r=>r.path==='/rest/v1/garments').length;
      await f.page.locator('#login').evaluate(e=>e.dispatchEvent(new Event('submit',{cancelable:true})));
      // Age the signed links without also firing the login's 45-second timeout.
      await f.page.clock.setSystemTime(new Date(Date.now()+41*60*1000));
      await f.page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
      assert.equal(f.state.requests.filter(r=>r.path==='/rest/v1/garments').length,count,'renewal blocked during login');
      assert.equal(f.state.requests.filter(r=>r.path==='/auth/v1/token').length,1,'double submit blocked');
      release();await f.page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Ingelogd.'));
      assert.equal(f.state.requests.filter(r=>r.path==='/rest/v1/garments').length,count+1);
      assert.equal(await f.page.locator('#reload').isDisabled(),false);assert.deepEqual(f.state.errors,[]);
    } finally {release?.();await f.browser.close();}
  }
  {
    const f=await fixture(320,{unconfigured:true});try {
      assert.equal(await f.page.locator('#login [type=submit]').isDisabled(),true);
      assert.equal(await f.page.locator('#password-toggle').isDisabled(),false);
      assert.equal(await f.page.locator('#login-error').isVisible(),true);
      assert.equal(await f.page.locator('.app-messages').isVisible(),false);assert.deepEqual(f.state.errors,[]);
    } finally {await f.browser.close();}
  }
  {
    // Wachtwoord vergeten: same form, e-mail only, neutral answer, redirect back to this page.
    const f=await fixture(390),p=f.page;try {
      await p.locator('#forgot').click();
      assert.equal(await p.locator('#login').getAttribute('data-mode'),'forgot');
      assert.equal(await p.locator('#password').isVisible(),false);
      assert.equal(await p.locator('#login [type=submit]').textContent(),'Stuur de link');
      await p.locator('#login [type=submit]').click();
      assert.equal(await p.locator('#email').evaluate(e=>e.matches(':invalid')),true,'the browser asks for the address first');
      assert.equal(f.state.requests.some(r=>r.path==='/auth/v1/recover'),false,'no request without an address');
      await p.locator('#email').fill('nikki@example.test');await p.locator('#login [type=submit]').click();
      await p.locator('#login-done').filter({hasText:'Als dit adres bij ons bekend is'}).waitFor();
      assert.equal(await p.locator('#login-error').textContent(),'');
      assert.deepEqual(f.state.requests.find(r=>r.path==='/auth/v1/recover').body,{email:'nikki@example.test'});
      assert.equal(f.state.recoverRedirect,'https://app.test/');
      for(const el of await p.locator('#forgot, #login [type=submit]').evaluateAll(es=>es.map(e=>({h:e.getBoundingClientRect().height,size:parseFloat(getComputedStyle(e).fontSize)}))))
        assert.ok(el.h>=44&&el.size>=16,JSON.stringify(el));
      await p.screenshot({path:'test-results/admin/forgot-390.png'});
      f.state.limitRecover=true;await p.locator('#login [type=submit]').click();
      await p.locator('#login-error').filter({hasText:'net al een link gevraagd'}).waitFor();
      await p.locator('#forgot').click();
      assert.equal(await p.locator('#login').getAttribute('data-mode'),'login');
      assert.equal(await p.locator('#password').isVisible(),true);
      assert.equal(await p.locator('#login-error').textContent(),'');assert.deepEqual(f.state.errors,[]);
    } finally {await f.browser.close();}
  }
  for(const width of [390,320]){
    // Opened from the reset e-mail: the token leaves the address bar at once and is never stored
    // until the new password is saved and the account is confirmed as staff.
    const hash='#access_token=recovery-token&refresh_token=recovery-refresh&expires_in=3600&token_type=bearer&type=recovery';
    const f=await fixture(width,{hash,weakPassword:true}),p=f.page;try {
      assert.equal(await p.evaluate(()=>location.hash),'');
      assert.equal(await p.locator('#manage').isVisible(),true);
      assert.equal(await p.locator('#login').getAttribute('data-mode'),'reset');
      assert.equal(await p.locator('#email').isVisible(),false);
      assert.equal(await p.locator('#forgot').isVisible(),false);
      assert.equal(await p.locator('#password-label').textContent(),'Nieuw wachtwoord');
      assert.equal(await p.locator('#password').getAttribute('autocomplete'),'new-password');
      assert.equal(await p.evaluate(()=>JSON.stringify(sessionStorage)).then(s=>s.includes('recovery-token')),false,'recovery token not stored before saving');
      await p.screenshot({path:`test-results/admin/reset-${width}.png`});
      await p.locator('#password').fill('kort');await p.locator('#login [type=submit]').click();
      await p.locator('#login-error').filter({hasText:'minstens 8 tekens'}).waitFor();
      assert.equal(f.state.requests.some(r=>r.path==='/auth/v1/user'),false,'short password is not sent');
      await p.locator('#password').fill('nieuw-wachtwoord-1');await p.locator('#login [type=submit]').click();
      await p.locator('#login-error').filter({hasText:'sterker wachtwoord'}).waitFor();
      assert.equal(await p.locator('#login').getAttribute('data-mode'),'reset','a weak password can be retried with the same link');
      await p.locator('#login [type=submit]').click();
      await p.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Je nieuwe wachtwoord is opgeslagen'));
      assert.equal(f.state.userAuth,'Bearer recovery-token');
      assert.equal(await p.locator('#login').isVisible(),false);
      assert.equal(await p.locator('#password').inputValue(),'');
      assert.equal(await p.evaluate(()=>JSON.stringify(sessionStorage)).then(s=>s.includes('recovery-token')),true,'stored as a normal login after saving');
      await p.locator('#items li.piece').waitFor();assert.deepEqual(f.state.errors,[]);
    } finally {await f.browser.close();}
  }
  for(const [name,options] of [['expired',{hash:'#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'}],
    ['rejected',{hash:'#access_token=old&refresh_token=old-refresh&expires_in=3600&type=recovery',expiredLink:true}]]){
    const f=await fixture(320,options),p=f.page;try {
      assert.equal(await p.evaluate(()=>location.hash),'');
      if(name==='rejected'){await p.locator('#password').fill('nieuw-wachtwoord-1');await p.locator('#login [type=submit]').click();}
      await p.locator('#login-error').filter({hasText:'verlopen of al gebruikt'}).waitFor();
      assert.equal(await p.locator('#login').getAttribute('data-mode'),'forgot',name+': offers a new link');
      assert.equal(await p.evaluate(()=>Object.keys(sessionStorage).some(k=>k.startsWith('nikki-session'))),false,'no session stored');assert.deepEqual(f.state.errors,[]);
    } finally {await f.browser.close();}
  }
  {
    // Editing on a phone: nothing blocks the conversation. If something the boutique needs is missing,
    // the overview names it and offers to keep the piece as a concept instead of a save button.
    const f=await fixture(390),p=f.page;try {
      await fill(p);await p.locator('#login [type=submit]').click();await p.locator('#items li.piece').waitFor();
      await p.getByRole('button',{name:'Bewerken'}).click();await p.waitForFunction(()=>!document.getElementById('intake').hidden);
      const intake=p.frameLocator('#intake'),frame=p.frames().find(x=>x.name()==='intake');
      await intake.locator('#summary').waitFor();
      assert.equal(await intake.locator('#name').textContent(),'Stuk bewerken');
      assert.equal(await intake.locator('#save').textContent(),'Wijziging opslaan');assert.equal(await intake.locator('#save').isDisabled(),false);
      assert.equal(await frame.evaluate(()=>window.NikkiIntake.hasUnsavedInput()),false,'an opened piece without changes is not unsaved');
      // Project rules in the intake too: every control at least 44 px, all text at least 16 px.
      const shortfalls=()=>intake.locator('body').evaluate(()=>{const out=[];
        for(const el of document.querySelectorAll('button,input,select,textarea,label.add,label.camera')){const r=el.getBoundingClientRect();if(el.offsetParent===null||!r.width||el.type==='file')continue;if(r.width<44||r.height<44)out.push('size '+(el.getAttribute('aria-label')||el.textContent.trim()).slice(0,30)+' '+Math.round(r.width)+'x'+Math.round(r.height));}
        for(const el of document.querySelectorAll('body *')){if(el.closest('svg')||el.offsetParent===null)continue;if([...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&parseFloat(getComputedStyle(el).fontSize)<16)out.push('text '+el.textContent.trim().slice(0,30));}
        return out;});
      assert.deepEqual(await shortfalls(),[],'overview');
      // Take away something the boutique needs: no save button, a clear list, nothing saved.
      await intake.locator('#talk [data-edit=chest]').click();assert.deepEqual(await shortfalls(),[],'question');
      // The voice box sits on every question and starts only after a tap; a second tap stops it again.
      const voice=intake.locator('#voice');
      assert.equal(await voice.getAttribute('data-voice'),'idle');assert.equal(await voice.getAttribute('aria-label'),'Praat met de AI');
      // In this test browser there is no speech service: the app says so and typing keeps working.
      // As on the CI runner: the voice never reports that it finished, and listening never starts.
      // The screen must not hang on "speaking" or "listening": after a safety time it says so.
      await frame.evaluate(()=>{window.speechSynthesis.speak=()=>{};const R=function(){};R.prototype.start=function(){};R.prototype.abort=function(){};window.webkitSpeechRecognition=window.SpeechRecognition=R;});
      await voice.click();await intake.locator('.voice-note').filter({hasText:'Luisteren lukt hier niet'}).waitFor();
      assert.equal(await intake.locator('#voice').getAttribute('data-voice'),'idle');assert.equal(await intake.locator('#free').isEnabled(),true);
      await intake.locator('[data-skip]').click();
      assert.match(await intake.locator('#open').innerText(),/Borstbreedte/);assert.equal(await intake.locator('#save').count(),0);
      assert.equal(await intake.getByRole('button',{name:'Bewaar als concept'}).count(),1);
      assert.equal(f.state.saved,undefined,'nothing saved while incomplete');assert.deepEqual(await shortfalls(),[],'missing list');
      assert.equal(await frame.evaluate(()=>window.NikkiIntake.hasUnsavedInput()),true);
      await p.screenshot({path:'test-results/admin/opslaan-ontbreekt-390.png'});
      // Starting over asks before throwing away unsaved input.
      await frame.evaluate(()=>{window.__confirm=window.confirm;window.confirm=m=>{window.__asked=m;return false;};});
      await intake.locator('#restart').click();
      assert.match(await frame.evaluate(()=>window.__asked),/nog niet opgeslagen/);
      await frame.evaluate(()=>{window.confirm=window.__confirm;});assert.equal(await intake.locator('#open').isVisible(),true,'cancel keeps the input');
      // An own word is added next to the buttons and stays while other buttons are tapped; focus stays in the field.
      await intake.locator('#talk [data-edit=bijzonderheden]').click();
      await type(intake,'Leren bies');
      assert.equal(await intake.locator('#free').evaluate(e=>document.activeElement===e),true);
      await intake.locator('#answer [data-value=Vlek]').click();await intake.locator('#answer [data-value=Vlek]').click();
      assert.equal(await intake.locator('#answer [data-value="Leren bies"]').getAttribute('aria-pressed'),'true');
      await intake.locator('[data-ready]').click();
      await change(intake,'chest','54');
      await intake.locator('#save').click();
      await p.waitForFunction(()=>document.getElementById('status').textContent.includes('is opgeslagen'));
      assert.deepEqual(f.state.saved.p_data.details,['Leren bies']);assert.equal(f.state.saved.p_data.measurements[0],54);
      assert.deepEqual(await frame.evaluate(()=>JSON.parse(localStorage.getItem('gsf-learned')).bijzonderheden),['Leren bies'],'the own word is offered next time');
      // After saving, Nieuw stuk starts empty instead of showing the saved piece again.
      await p.evaluate(()=>window.NikkiApp.openAccount());await p.locator('#new').click();
      assert.equal(await intake.locator('label.camera').isVisible(),true);assert.equal(await intake.locator('#thumbs [data-view]').count(),0);
      assert.equal(await intake.locator('#name').textContent(),'Nieuw stuk');
      // A photo can be removed again, also after the questions have started.
      const png=c=>p.evaluate(colour=>{const k=document.createElement('canvas');k.width=20;k.height=20;const x=k.getContext('2d');x.fillStyle=colour;x.fillRect(0,0,20,20);return k.toDataURL().split(',')[1];},c);
      await intake.locator('#files').setInputFiles([{name:'a.png',mimeType:'image/png',buffer:Buffer.from(await png('#111'),'base64')},{name:'b.png',mimeType:'image/png',buffer:Buffer.from(await png('#933'),'base64')}]);
      assert.deepEqual(await shortfalls(),[],'photos');
      await intake.getByRole('button',{name:'Zelf invullen'}).click();await intake.locator('#question').waitFor();assert.equal(await intake.locator('#thumbs [data-view]').count(),2);
      await intake.locator('#talk [data-photos]').click();await intake.locator('#thumbs [data-view]').nth(1).click();await intake.locator('[data-del]').click();
      assert.equal(await intake.locator('#thumbs [data-view]').count(),1);
      assert.equal(await frame.evaluate(()=>window.NikkiIntake.hasUnsavedInput()),true,'a new piece with a photo is unsaved');
      // The phone's back button returns to the previous screen of the app.
      await p.goBack();assert.equal(await p.locator('#manage').isVisible(),true,'back from Nieuw stuk to Jouw collectie');
      assert.equal(new URL(p.url()).hostname,'app.test','still on the site');
      assert.deepEqual(f.state.errors,[]);
    } finally {await f.browser.close();}
  }
  {
    // A refresh returns to the screen you were working on; a shared link still opens the boutique.
    const f=await fixture(390),p=f.page;try {
      await fill(p);await p.locator('#login [type=submit]').click();await p.locator('#items li.piece').waitFor();
      await p.reload();await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Collectie geladen.'));
      assert.equal(await p.locator('#manage').isVisible(),true,'back on Jouw collectie after refresh');
      assert.equal(await p.locator('#login').isVisible(),false,'still logged in');
      await p.locator('#new').click();assert.equal(await p.locator('#intake').isVisible(),true);
      await p.reload();await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Collectie geladen.'));
      assert.equal(await p.locator('#manage').isVisible(),true,'an unsaved intake returns to Jouw collectie');
      await p.locator('[data-screen=shop]').first().click();
      await p.reload();await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Collectie geladen.'));
      assert.equal(await p.locator('#shop').isVisible(),true,'the boutique stays the boutique');
      await p.evaluate(()=>window.NikkiApp.openAccount());
      await p.goto('about:blank');await p.goto('https://app.test/#stuk-1');await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Collectie geladen.'));
      assert.equal(await p.locator('#shop').isVisible(),true,'a shared link opens the boutique');
      assert.deepEqual(f.state.errors,[]);
    } finally {await f.browser.close();}
  }
  for(const blocked of [false,true]){
    // Concepten: a half-entered piece with photos survives a refresh, and is gone after saving.
    const f=await fixture(390,blocked?{noIndexedDb:true}:{}),p=f.page;try {
      const intake=p.frameLocator('#intake'),frame=()=>p.frames().find(x=>x.name()==='intake');
      await fill(p);await p.locator('#login [type=submit]').click();await p.locator('#items li.piece').waitFor();
      await p.locator('#new').click();
      const png=c=>p.evaluate(colour=>{const k=document.createElement('canvas');k.width=20;k.height=20;const x=k.getContext('2d');x.fillStyle=colour;x.fillRect(0,0,20,20);return k.toDataURL().split(',')[1];},c);
      await intake.locator('#files').setInputFiles([{name:'a.png',mimeType:'image/png',buffer:Buffer.from(await png('#111'),'base64')},{name:'b.png',mimeType:'image/png',buffer:Buffer.from(await png('#933'),'base64')}]);
      await intake.getByRole('button',{name:'Zelf invullen'}).click();
      await answer(intake,{bont:'Nee',materiaal:'Wol'},{stopAt:'model'});
      if(blocked){
        assert.equal(await frame().evaluate(()=>window.NikkiIntake.needsLeaveWarning()),true,'without storage, leaving still warns');
        assert.deepEqual(f.state.errors,[]);continue;
      }
      await p.waitForFunction(()=>!document.getElementById('intake').contentWindow.NikkiIntake.needsLeaveWarning(),null,{timeout:10000});
      assert.equal(await frame().evaluate(()=>window.NikkiIntake.needsLeaveWarning()),false,'stored on the device, so no warning needed');
      await p.reload();await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Collectie geladen.'));
      await p.waitForFunction(()=>!document.getElementById('intake').hidden);
      assert.equal(await intake.locator('#thumbs [data-view]').count(),2,'photos are back');
      assert.match(await intake.locator('#note').innerText(),/niet-opgeslagen stuk .* is teruggezet/);
      assert.equal(await intake.locator('#question').getAttribute('data-step'),'model','the conversation continues where it stopped');
      assert.equal(await intake.locator('#talk [data-edit=materiaal]').innerText(),'Wol');
      await p.screenshot({path:'test-results/admin/concept-teruggezet-390.png'});
      // Finish and save: the draft is removed, a refresh goes to Jouw collectie and Nieuw stuk is empty.
      await answer(intake,{model:'Cape',kleur:'Zwart',lengte:'Kort',bijzonderheden:[],chest:'50',length:'80',titel:'Half ingevulde cape',beschrijving:'',prijs:'90'});
      await intake.locator('#save').click();await p.waitForFunction(()=>document.getElementById('status').textContent.includes('is opgeslagen'));
      assert.equal(f.state.saved.p_data.title,'Half ingevulde cape');assert.equal(f.state.saved.p_data.images.length,2);
      await p.waitForTimeout(300);
      assert.equal(await frame().evaluate(()=>new Promise(r=>{const q=indexedDB.open('gsf-intake',1);q.onsuccess=()=>{const g=q.result.transaction('drafts').objectStore('drafts').get('current');g.onsuccess=()=>r(g.result===undefined);};})),true,'draft removed after saving');
      await p.evaluate(()=>window.NikkiApp.openAccount());await p.locator('#new').click();
      await p.reload();await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Collectie geladen.'));
      assert.equal(await p.locator('#manage').isVisible(),true,'no draft: back to Jouw collectie');
      assert.deepEqual(f.state.errors,[]);
    } finally {await f.browser.close();}
  }
  {
    // Gemini's proposals are marked but never chosen for Nikki; its warnings stay; logout removes the draft.
    const f=await fixture(390),p=f.page;try {
      const intake=p.frameLocator('#intake'),frame=()=>p.frames().find(x=>x.name()==='intake');
      await fill(p);await p.locator('#login [type=submit]').click();await p.locator('#items li.piece').waitFor();
      await p.locator('#new').click();
      const png=await p.evaluate(()=>{const k=document.createElement('canvas');k.width=20;k.height=20;k.getContext('2d').fillRect(0,0,20,20);return k.toDataURL().split(',')[1];});
      await intake.locator('#files').setInputFiles([{name:'a.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')}]);
      await intake.getByRole('button',{name:'Laat Gemini kijken'}).click();await intake.locator('#question').waitFor();
      // Fur and material: Gemini's guess is marked and named, but nothing is selected until Nikki taps.
      assert.equal(await intake.locator('#answer .chip[aria-pressed=true]').count(),0);
      assert.equal(await intake.locator('#answer .chip.guess').getAttribute('data-value'),'Nee');assert.match(await intake.locator('#hint').innerText(),/Gemini denkt: Nee, geen bont/);
      await answer(intake,{bont:'Nee'},{stopAt:'materiaal'});
      assert.equal(await intake.locator('#answer .chip.guess').getAttribute('data-value'),'Leer');assert.equal(await intake.locator('#answer .chip[aria-pressed=true]').count(),0);
      await p.screenshot({path:'test-results/admin/gemini-klopt-390.png'});
      await answer(intake,{materiaal:'Leer'},{stopAt:'bijzonderheden'});
      // Details Gemini saw are switched on in the list; Nikki changes them or confirms with Klaar.
      assert.match(await intake.locator('#question').innerText(),/Ik zie: bontkraag/);
      assert.equal(await intake.locator('#answer [data-value=Bontkraag]').getAttribute('aria-pressed'),'true');
      await intake.locator('#answer [data-value=Bontkraag]').click();await intake.locator('[data-ready]').click();
      assert.equal(await intake.locator('#talk [data-edit=bijzonderheden]').innerText(),'Niets bijzonders');
      await answer(intake,{},{stopAt:'titel'});
      // The title is a proposal; words about material in it are named so Nikki checks them.
      assert.match(await intake.locator('#question').innerText(),/Korte leren jas/);assert.match(await intake.locator('#hint').innerText(),/Gemini noemt hierin: leren/);
      await answer(intake,{titel:'Korte leren jas'});
      assert.match(await intake.locator('#talk .warn').innerText(),/controleer de bontsoort/);
      await intake.locator('#summary [data-photos]').click();await intake.getByRole('button',{name:'Verder',exact:true}).click();
      assert.match(await intake.locator('#talk .warn').innerText(),/controleer de bontsoort/,'warning still there after going back');
      await p.waitForFunction(()=>!document.getElementById('intake').contentWindow.NikkiIntake.needsLeaveWarning(),null,{timeout:10000});
      await p.evaluate(()=>window.NikkiApp.openAccount());await p.locator('#logout').click();
      await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Collectie geladen.'));
      assert.equal(await frame().evaluate(()=>new Promise(r=>{const q=indexedDB.open('gsf-intake',1);q.onsuccess=()=>{const g=q.result.transaction('drafts').objectStore('drafts').get('current');g.onsuccess=()=>r(g.result===undefined);};})),true,'logout removed the draft');
      assert.deepEqual(f.state.errors,[]);
    } finally {await f.browser.close();}
  }
  {
    // A free sentence: Gemini picks out what Nikki said, she confirms once; the price proposal comes from own sales.
    const soldId='22222222-2222-4222-8222-222222222222';
    const f=await fixture(390,{understand:b=>/lammy/.test(b.text)?{velden:{bont:'Alleen kraag of rand',materiaal:'Shearling',bontsoort:'Vos'},reactie:'Een lammy met een vossenkraag, mooi.'}:/bruin/.test(b.text)?{velden:{kleur:'Donkerbruin'},reactie:'Donkerbruin, mooi.'}:{velden:{},reactie:''},
      sales:[{id:soldId,sold_price_minor:24900,sold_at:'2026-11-01T12:00:00Z'}]}),p=f.page;
    const sold={...structuredClone(f.state.rows[0]),id:soldId,display_id:2,status:'sold'};
    sold.data={...sold.data,title:'Lammy',material:'Shearling',furClass:'Alleen kraag of rand',species:'Vos',priceMinor:30000};
    f.state.rows.push(sold);
    try {
      const intake=p.frameLocator('#intake');
      await fill(p);await p.locator('#login [type=submit]').click();await p.locator('#items li.piece').first().waitFor();
      await p.locator('#new').click();
      const png=await p.evaluate(()=>{const k=document.createElement('canvas');k.width=20;k.height=20;k.getContext('2d').fillRect(0,0,20,20);return k.toDataURL().split(',')[1];});
      await intake.locator('#files').setInputFiles([{name:'a.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')}]);
      await intake.getByRole('button',{name:'Zelf invullen'}).click();await intake.locator('#question').waitFor();
      await type(intake,'Het is een lammy met een vossenkraag');
      await intake.locator('#question').filter({hasText:'Klopt dat?'}).waitFor();
      assert.match(await intake.locator('#question').innerText(),/Een lammy met een vossenkraag, mooi\.\s+Ik noteer: bont alleen aan kraag of rand, materiaal shearling, bontsoort vos\. Klopt dat\?/);
      assert.equal(await intake.locator('#talk [data-edit=bontsoort]').count(),0,'nothing filled in before Klopt');
      const sent=f.state.requests.find(r=>r.path==='/functions/v1/begrijp').body;
      assert.equal(sent.step,'bont');assert.deepEqual(Object.keys(sent).sort(),['known','lists','step','text']);
      await p.waitForTimeout(3000);await p.screenshot({path:'test-results/admin/vrije-zin-390.png'});await p.setViewportSize({width:320,height:844});await p.waitForTimeout(500);await p.screenshot({path:'test-results/admin/vrije-zin-320.png'});await p.setViewportSize({width:390,height:844});
      await intake.getByRole('button',{name:'Klopt',exact:true}).click();
      assert.equal(await intake.locator('#talk [data-edit=bontsoort]').innerText(),'Vos');assert.equal(await intake.locator('#talk [data-edit=materiaal]').innerText(),'Shearling');
      assert.match(await intake.locator('#question .warm').innerText(),/Een lammy met een vossenkraag, mooi\./);
      assert.equal(await stepId(intake),'model','fur, species and material are not asked again');
      await answer(intake,{model:'Pilotenjack'},{stopAt:'kleur'});
      // Only the answer to this question: it counts at once, without asking Klopt.
      await type(intake,'zo een warm donker bruin');await intake.locator('#talk [data-edit=kleur]').waitFor();
      assert.equal(await intake.locator('#talk [data-edit=kleur]').innerText(),'Donkerbruin');
      await answer(intake,{lengte:'Heuplang',pasvorm:'Recht',periode:'Jaren 70',bijzonderheden:[],chest:'54',length:'72',titel:'Heuplange lammy met vossenkraag',beschrijving:''},{stopAt:'prijs'});
      assert.match(await intake.locator('#question').innerText(),/Van je eigen verkopen: één stuk van shearling ging voor € 249\. Wat moet deze kosten\?/);
      const chip=intake.getByRole('button',{name:'Rond € 250'});assert.equal(await chip.getAttribute('aria-pressed'),'false','a proposal, never chosen');
      await p.waitForTimeout(3000);await p.screenshot({path:'test-results/admin/prijsvoorstel-390.png'});await p.setViewportSize({width:320,height:844});await p.waitForTimeout(500);await p.screenshot({path:'test-results/admin/prijsvoorstel-320.png'});await p.setViewportSize({width:390,height:844});
      await chip.click();assert.match(await intake.locator('#summary').innerText(),/€ 250/);
      assert.deepEqual(f.state.errors,[]);
    } finally {await f.browser.close();}
  }
  console.log('PASS admin: real Newsreader, 390/320 layout, keyboard, login/logout, auth/refresh failure recovery, wachtwoord vergeten and reset link, Nieuw stuk as a conversation (16px/44px, missing answers end as a concept, own words, Gemini proposals marked but never chosen, free sentences confirmed before they count, price proposal from own sales), refresh keeps the screen, drafts survive a refresh, busy renewal guard and missing configuration.');
})().catch(e=>{console.error(e);process.exitCode=1;});

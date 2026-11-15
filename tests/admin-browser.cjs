const assert=require('node:assert/strict');
const fs=require('node:fs');
const {fixture}=require('./admin-fixture.cjs');
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
    // Editing on a phone: a tap on save with an unfinished step opens that step and names it,
    // instead of a grey button without a reason.
    const f=await fixture(390),p=f.page;try {
      await fill(p);await p.locator('#login [type=submit]').click();await p.locator('#items li.piece').waitFor();
      await p.getByRole('button',{name:'Bewerken'}).click();await p.waitForFunction(()=>!document.getElementById('intake').hidden);
      const intake=p.frameLocator('#intake');
      assert.equal(await intake.locator('#publish').isDisabled(),false,'save stays tappable');
      assert.equal(await intake.locator('#publish').textContent(),'Wijziging opslaan');
      assert.match(await intake.locator('#publish').getAttribute('class'),/incomplete/);
      await intake.locator('#publish').click();
      await intake.locator('#review-err').filter({hasText:'Nog niet af: Bijzonderheden'}).waitFor();
      // The message sits right above the save button, inside the sticky bar.
      assert.equal(await intake.locator('.bar #review-err + #publish').count(),1);
      // Project rules in the intake too: every control at least 44 px, all text at least 16 px.
      const shortfalls=await intake.locator('body').evaluate(()=>{const out=[];
        for(const el of document.querySelectorAll('button,input,select,label.picker')){const r=el.getBoundingClientRect();if(el.offsetParent===null||!r.width)continue;if(r.width<44||r.height<44)out.push('size '+(el.getAttribute('aria-label')||el.textContent.trim()).slice(0,30)+' '+Math.round(r.width)+'x'+Math.round(r.height));}
        for(const el of document.querySelectorAll('body *')){if(el.closest('svg')||el.offsetParent===null)continue;if([...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&parseFloat(getComputedStyle(el).fontSize)<16)out.push('text '+el.textContent.trim().slice(0,30));}
        return out;});
      assert.deepEqual(shortfalls,[]);
      assert.equal(await intake.locator('[data-step=bijz] .stephead').getAttribute('aria-expanded'),'true');
      assert.equal(f.state.saved,undefined,'nothing saved while incomplete');
      await p.screenshot({path:'test-results/admin/opslaan-ontbreekt-390.png'});
      // "Volgend stuk" is secondary and asks before throwing away unsaved input.
      assert.equal(await intake.locator('#new-draft').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
      const frame=p.frames().find(x=>x.name()==='intake');
      assert.equal(await frame.evaluate(()=>window.NikkiIntake.hasUnsavedInput()),false,'an opened piece without changes is not unsaved');
      await intake.locator('[data-k=bijzonderheden][data-v=Geen]').click();
      assert.equal(await frame.evaluate(()=>window.NikkiIntake.hasUnsavedInput()),true);
      assert.equal(await intake.locator('[data-k=bijzonderheden][data-v=Geen]').evaluate(e=>document.activeElement===e),true,'focus stays on the chip after the redraw');
      await frame.evaluate(()=>{window.__confirm=window.confirm;window.confirm=m=>{window.__asked=m;return false;};});
      await intake.locator('#new-draft').click();
      assert.match(await frame.evaluate(()=>window.__asked),/nog niet opgeslagen/);
      await frame.evaluate(()=>{window.confirm=window.__confirm;});assert.equal(await intake.locator('#step-review').isVisible(),true,'cancel keeps the input');
      // Text typed in "+ nieuw" survives a tap on another chip.
      await intake.locator('[data-add=bijzonderheden]').click();await intake.locator('#add-bijzonderheden').fill('Leren bies');
      await intake.locator('[data-k=bijzonderheden][data-v=Vlek]').click();
      assert.equal(await intake.locator('#add-bijzonderheden').inputValue(),'Leren bies');
      await intake.locator('[data-k=bijzonderheden][data-v=Vlek]').click();await intake.locator('[data-add=bijzonderheden]').click();
      if(await intake.locator('[data-k=bijzonderheden][data-v=Geen]').getAttribute('aria-pressed')!=='true')await intake.locator('[data-k=bijzonderheden][data-v=Geen]').click();
      assert.doesNotMatch(await intake.locator('#publish').getAttribute('class'),/incomplete/);
      await intake.locator('#publish').click();
      await p.waitForFunction(()=>document.getElementById('status').textContent.includes('is opgeslagen'));
      assert.deepEqual(f.state.saved.p_data.details,['Geen']);
      // After saving, Nieuw stuk starts empty instead of showing the saved piece again.
      await p.evaluate(()=>window.NikkiApp.openAccount());await p.locator('#new').click();
      assert.equal(await intake.locator('#step-photos').isVisible(),true);
      assert.equal(await intake.locator('#thumbs .thumb').count(),0);
      assert.equal(await intake.locator('#publish').textContent(),'Opslaan en tonen in boetiek');
      // A photo can be removed in Controleren too.
      const png=c=>p.evaluate(colour=>{const k=document.createElement('canvas');k.width=20;k.height=20;const x=k.getContext('2d');x.fillStyle=colour;x.fillRect(0,0,20,20);return k.toDataURL().split(',')[1];},c);
      await intake.locator('#gallery').setInputFiles([{name:'a.png',mimeType:'image/png',buffer:Buffer.from(await png('#111'),'base64')},{name:'b.png',mimeType:'image/png',buffer:Buffer.from(await png('#933'),'base64')}]);
      await intake.locator('#manual').click();assert.equal(await intake.locator('.ph').count(),2);
      await intake.locator('[data-delrev="1"]').click();assert.equal(await intake.locator('.ph').count(),1);
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
      await intake.locator('#gallery').setInputFiles([{name:'a.png',mimeType:'image/png',buffer:Buffer.from(await png('#111'),'base64')},{name:'b.png',mimeType:'image/png',buffer:Buffer.from(await png('#933'),'base64')}]);
      await intake.locator('#manual').click();
      await intake.locator('[data-open=tekst]').click();await intake.locator('#t-titel').fill('Half ingevulde cape');
      if(blocked){
        assert.equal(await frame().evaluate(()=>window.NikkiIntake.needsLeaveWarning()),true,'without storage, leaving still warns');
        assert.deepEqual(f.state.errors,[]);continue;
      }
      await p.waitForFunction(()=>!document.getElementById('intake').contentWindow.NikkiIntake.needsLeaveWarning(),null,{timeout:10000});
      assert.equal(await frame().evaluate(()=>window.NikkiIntake.needsLeaveWarning()),false,'stored on the device, so no warning needed');
      await p.reload();await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Collectie geladen.'));
      await p.waitForFunction(()=>!document.getElementById('intake').hidden);
      assert.equal(await intake.locator('.ph').count(),2,'photos are back');
      assert.match(await intake.locator('#warnings').innerText(),/niet-opgeslagen stuk .* is teruggezet/);
      await intake.locator('[data-open=tekst]').click();assert.equal(await intake.locator('#t-titel').inputValue(),'Half ingevulde cape');
      await p.screenshot({path:'test-results/admin/concept-teruggezet-390.png'});
      // Finish and save: the draft is removed, a refresh goes to Jouw collectie and Nieuw stuk is empty.
      await intake.locator('[data-allok]').click().catch(()=>{});
      await intake.locator('[data-open=fotos]').click();if(await intake.locator('[data-allok]').getAttribute('aria-pressed')!=='true')await intake.locator('[data-allok]').click();
      await intake.locator('[data-main="0"]').click();
      await intake.locator('[data-open=wat]').click();
      for(const [k,v] of [['bont','Nee'],['materiaal','Wol'],['model','Cape'],['kleur','Zwart'],['lengte','Kort']])await intake.locator(`[data-k="${k}"][data-v="${v}"]`).click();
      await intake.locator('[data-open=maten]').click();await intake.locator('#m-chest').fill('50');await intake.locator('#m-length').fill('80');
      await intake.locator('[data-open=bijz]').click();await intake.locator('[data-k=bijzonderheden][data-v=Geen]').click();
      await intake.locator('[data-open=tekst]').click();await intake.locator('#t-prijs').fill('90');
      await intake.locator('#publish').click();await p.waitForFunction(()=>document.getElementById('status').textContent.includes('is opgeslagen'));
      await p.waitForTimeout(300);
      assert.equal(await frame().evaluate(()=>new Promise(r=>{const q=indexedDB.open('gsf-intake',1);q.onsuccess=()=>{const g=q.result.transaction('drafts').objectStore('drafts').get('current');g.onsuccess=()=>r(g.result===undefined);};})),true,'draft removed after saving');
      await p.evaluate(()=>window.NikkiApp.openAccount());await p.locator('#new').click();
      await p.reload();await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Collectie geladen.'));
      assert.equal(await p.locator('#manage').isVisible(),true,'no draft: back to Jouw collectie');
      assert.deepEqual(f.state.errors,[]);
    } finally {await f.browser.close();}
  }
  {
    // Gemini's "bijzonderheden" are suggestions only; its warnings stay; logout removes the draft.
    const f=await fixture(390),p=f.page;try {
      const intake=p.frameLocator('#intake'),frame=()=>p.frames().find(x=>x.name()==='intake');
      await fill(p);await p.locator('#login [type=submit]').click();await p.locator('#items li.piece').waitFor();
      await p.locator('#new').click();
      const png=await p.evaluate(()=>{const k=document.createElement('canvas');k.width=20;k.height=20;k.getContext('2d').fillRect(0,0,20,20);return k.toDataURL().split(',')[1];});
      await intake.locator('#gallery').setInputFiles([{name:'a.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')}]);
      await intake.locator('#analyse').click();await intake.locator('#step-review').waitFor({state:'visible'});
      // Gemini fills in, also material and fur; each filled step needs one tap on Klopt.
      for(const step of ['wat','bijz','tekst'])assert.match(await intake.locator(`[data-step=${step}] .stepsum`).innerText(),/voorstel · controleer/,step+' waits for Klopt');
      await intake.locator('[data-open=wat]').click();
      assert.equal(await intake.locator('[data-k=materiaal][data-v=Leer]').getAttribute('aria-pressed'),'true','material proposed and filled in');
      await intake.locator('[data-step=wat] .stephead').scrollIntoViewIfNeeded();await p.screenshot({path:'test-results/admin/gemini-klopt-390.png'});
      await intake.locator('[data-aiok=wat]').click();
      assert.doesNotMatch(await intake.locator('[data-step=wat] .stepsum').innerText(),/voorstel · controleer/);
      await intake.locator('[data-open=bijz]').click();
      assert.equal(await intake.locator('[data-k=bijzonderheden][data-v=Bontkraag]').getAttribute('aria-pressed'),'true','filled in, Nikki confirms');
      await intake.locator('[data-k=bijzonderheden][data-v=Bontkraag]').click();
      assert.doesNotMatch(await intake.locator('[data-step=bijz] .stepsum').innerText(),/voorstel · controleer/,'changing a chip also counts as checked');
      await intake.locator('[data-open=tekst]').click();
      assert.match(await intake.locator('[data-step=tekst] .aiok').innerText(),/Gemini noemt in de titel: leren/);
      assert.equal(await intake.locator('#t-titel').inputValue(),'Korte leren jas','title kept');
      assert.match(await intake.locator('#warnings').innerText(),/controleer de bontsoort/);
      await intake.locator('#back-photos').click();await intake.locator('#manual').click();
      assert.match(await intake.locator('#warnings').innerText(),/controleer de bontsoort/,'warning still there after going back');
      await p.waitForFunction(()=>!document.getElementById('intake').contentWindow.NikkiIntake.needsLeaveWarning(),null,{timeout:10000});
      await p.evaluate(()=>window.NikkiApp.openAccount());await p.locator('#logout').click();
      await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Collectie geladen.'));
      assert.equal(await frame().evaluate(()=>new Promise(r=>{const q=indexedDB.open('gsf-intake',1);q.onsuccess=()=>{const g=q.result.transaction('drafts').objectStore('drafts').get('current');g.onsuccess=()=>r(g.result===undefined);};})),true,'logout removed the draft');
      assert.deepEqual(f.state.errors,[]);
    } finally {await f.browser.close();}
  }
  console.log('PASS admin: real Newsreader, 390/320 layout, keyboard, login/logout, auth/refresh failure recovery, wachtwoord vergeten and reset link, save explains what is missing, refresh keeps the screen, drafts survive a refresh, busy renewal guard and missing configuration.');
})().catch(e=>{console.error(e);process.exitCode=1;});

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
      assert.equal(await p.locator('#manage').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(155, 58, 47)');
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
      await f.page.locator('#login-error').filter({hasText:failure==='denyStaff'?'geen beheerrechten':'Log opnieuw in'}).waitFor();
      assert.equal(await f.page.locator('#login').isVisible(),true);
      assert.equal(await f.page.locator('#login-error').evaluate(e=>document.activeElement===e),false);
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
      await f.page.locator('#items li').waitFor();assert.deepEqual(f.state.errors,[]);
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
  console.log('PASS admin: real Newsreader, 390/320 layout, keyboard, login/logout, auth/refresh failure recovery, busy renewal guard and missing configuration.');
})().catch(e=>{console.error(e);process.exitCode=1;});

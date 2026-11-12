const assert=require('node:assert/strict');
const fs=require('node:fs');
const {fixture}=require('./admin-fixture.cjs');
(async()=>{
  fs.mkdirSync('test-results/admin',{recursive:true});
  for(const width of [390,320]) {
    const f=await fixture(width), p=f.page;
    try {
      assert.equal(await p.locator('#manage-title').textContent(),'Welkom terug');
      await p.locator('#password-toggle').click();
      assert.equal(await p.locator('#password').getAttribute('type'),'text');
      await p.locator('#password-toggle').click();
      assert.equal(await p.locator('#password').getAttribute('type'),'password');
      await p.screenshot({path:`test-results/admin/login-${width}.png`});
      await f.login();
      assert.equal(await p.locator('#manage-title').textContent(),'Jouw collectie');
      assert.equal(await p.locator('#password').inputValue(),'');
      assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      for(const box of await p.locator('.app-toolbar button:visible').evaluateAll(es=>es.map(e=>({w:e.offsetWidth,h:e.offsetHeight,label:e.getAttribute('aria-label')})))){
        assert.ok(box.w>=44&&box.h>=44&&box.label);
      }
      await p.screenshot({path:`test-results/admin/collection-${width}.png`});
      assert.deepEqual(f.state.errors,[]);
    } finally {await f.browser.close();}
  }
  console.log('PASS: admin login, navigation, mobile targets and screenshots at 390/320.');
})().catch(e=>{console.error(e);process.exitCode=1;});

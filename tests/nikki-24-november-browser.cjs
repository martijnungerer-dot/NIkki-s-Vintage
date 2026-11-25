// Nikki's feedback of 24 November 2026 (docs/FEEDBACK-OPVOLGING.md) in Nieuw stuk, real app with mocked services:
// the whole screen scrolls (the photo scrolls away), typed text survives a photo change, a long title stays inside
// the card, a long text stands under its heading, and a missing title says how to choose one.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {fixture}=require('./admin-fixture.cjs');
const {answer}=require('./intake-helper.cjs');
(async()=>{
  fs.mkdirSync('test-results/nikki-24-november',{recursive:true});
  for(const [width,height] of [[390,693],[320,568]]){
    const f=await fixture(width),p=f.page;
    try{
      await p.setViewportSize({width,height});await f.login();
      const intake=p.frameLocator('#intake');
      await p.locator('#new').click();await intake.locator('label.camera').waitFor();
      const png=c=>p.evaluate(colour=>{const k=document.createElement('canvas');k.width=300;k.height=400;const x=k.getContext('2d');x.fillStyle=colour;x.fillRect(0,0,300,400);return k.toDataURL().split(',')[1];},c);
      await intake.locator('#files').setInputFiles([{name:'a.png',mimeType:'image/png',buffer:Buffer.from(await png('#5a3b2a'),'base64')},{name:'b.png',mimeType:'image/png',buffer:Buffer.from(await png('#933'),'base64')}]);
      await intake.getByRole('button',{name:'Zelf invullen'}).click();await intake.locator('#question').waitFor();
      // Scrolling down takes the photo along; the header with the back arrow stays.
      const before=await intake.locator('#hero').boundingBox();
      const scrolled=await intake.locator('#app').evaluate(e=>{e.scrollTo(0,e.scrollHeight);return e.scrollTop;});
      const hero=await intake.locator('#hero').boundingBox(),top=await intake.locator('header.top').boundingBox(),frame=await p.locator('#intake').boundingBox();
      assert.ok(scrolled>0,'the screen can scroll');
      assert.ok(Math.abs((before.y-hero.y)-scrolled)<2,'the photo scrolls along instead of staying put');
      assert.ok(Math.abs(top.y-frame.y)<2,'the header stays at the top');
      await p.screenshot({path:`test-results/nikki-24-november/gescrold-${width}.png`});
      // Text typed in the description stays when Nikki looks at another photo.
      const title='Bruin gemêleerde halflange bontjas met platte kraag en een heel lange omschrijving erachter';
      await answer(intake,{titel:title},{stopAt:'beschrijving'});
      await intake.locator('#free').fill('Mijn eigen tekst over deze jas.');
      await intake.locator('#thumbs [data-view]').nth(1).click();
      assert.equal(await intake.locator('#free').inputValue(),'Mijn eigen tekst over deze jas.');
      await intake.locator('#answer [type=submit]').click();
      await answer(intake,{});
      // Overview: the long title stays inside the card; the long text stands under its heading.
      const card=await intake.locator('#summary').evaluate(e=>({sw:e.scrollWidth,cw:e.clientWidth}));
      assert.ok(card.sw<=card.cw+1,'nothing sticks out of the card');
      const row=intake.locator('#summary .kv.stack[data-edit=beschrijving]');
      const [label,value]=await row.locator('span').evaluateAll(spans=>spans.map(s=>s.getBoundingClientRect()));
      assert.ok(value.top>=label.bottom-1,'text under its heading');
      await p.screenshot({path:`test-results/nikki-24-november/overzicht-${width}.png`});
      // Without a title the card says how to choose one.
      await intake.locator('#talk [data-edit=titel]').first().click();await intake.locator('[data-skip]').click();
      assert.match(await intake.locator('#summary').innerText(),/Nog geen titel – tik om er een te kiezen/);
      assert.deepEqual(f.state.errors,[]);
    }finally{await f.browser.close();}
  }
  console.log('PASS Nikki 24 November: whole screen scrolls with sticky header, typed text survives a photo change, long title inside the card, long text under its heading, missing title explained. 390×693 and 320×568, services mocked.');
})().catch(e=>{console.error(e);process.exit(1);});

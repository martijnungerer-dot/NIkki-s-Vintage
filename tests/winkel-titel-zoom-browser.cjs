// Shop for visitors, feedback Nikki 24 November 2026 and decision Martijn 25 November 2026:
// a long title in the info window no longer slides over the text, and one tap on the photo opens it full screen
// with zoom (double tap or pinch), swiping and closing. Real app, services mocked; nothing is saved.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {fixture}=require('./admin-fixture.cjs');
const id='11111111-1111-4111-8111-111111111111';
const photo=c=>id+'/'+c.repeat(64)+'.jpg';
const row={id,display_id:1,status:'published',version:1,data:{title:'Bruin gemêleerde halflange bontjas met platte kraag',
  description:'Een heuplange bontjas in een gemêleerde bruine tint met een lichte onderwol. De jas heeft een platte kraag, zakken en een sluiting met haken.',
  priceMinor:14750,material:'Bont',furClass:'Ja',model:'Sjaalkraag',colour:'Bruin',length:'Heuplang',species:'Nerts',fit:'Recht',era:'Jaren 70',details:['Zakken'],
  measurements:[56,44,60,85],images:[{path:photo('a'),role:'Voorkant',main:true},{path:photo('b'),role:'Achterkant',main:false}]}};
(async()=>{
  fs.mkdirSync('test-results/winkel',{recursive:true});
  for(const [width,height] of [[390,693],[320,568]]){
    const f=await fixture(width,{rows:[row]}),p=f.page;
    try{
      await p.setViewportSize({width,height});
      await p.locator('.app-toolbar button[data-screen=shop]').click();
      const shop=p.frames().find(x=>x.name()==='shop');
      await shop.locator('#track .slide img').first().waitFor();
      // Info window: title, then the text below it, never on top of each other.
      await shop.locator('[data-act=info]').first().click();await shop.locator('#info .ptitle').waitFor();
      await shop.locator('#info').evaluate(el=>Promise.all(el.getAnimations({subtree:true}).map(x=>x.finished)));
      const t=await shop.locator('#info .ptitle').boundingBox(),text=await shop.locator('#info p').first().boundingBox();
      assert.ok(text.y>=t.y+t.height-1,'the text starts below the title ('+(t.y+t.height)+' vs '+text.y+')');
      await p.screenshot({path:`test-results/winkel/info-${width}.png`});
      await shop.locator('#info [data-act=close]').click();
      // One tap: the photo full screen.
      const box=await shop.locator('#photo').boundingBox();
      await p.mouse.click(box.x+box.width/2,box.y+box.height/2);
      await shop.locator('.viewer').waitFor();
      assert.equal(await shop.locator('.viewer-dots').getAttribute('aria-label'),'Foto 1 van 2');
      for(const b of ['close','prev','next']){const r=await shop.locator(`[data-viewer=${b}]`).boundingBox();assert.ok(r.width>=44&&r.height>=44,b+' at least 44 px');}
      await p.screenshot({path:`test-results/winkel/schermvullend-${width}.png`});
      // Keyboard focus stays inside the viewer, and the photo dots sit in the middle between the arrows.
      await shop.locator('[data-viewer=close]').focus();
      await p.keyboard.press('Shift+Tab');
      assert.equal(await shop.evaluate(()=>!!document.activeElement.closest('.viewer')),true,'Shift+Tab stays in the viewer');
      for(let k=0;k<4;k++)await p.keyboard.press('Tab');
      assert.equal(await shop.evaluate(()=>!!document.activeElement.closest('.viewer')),true,'Tab stays in the viewer');
      const pv=await shop.locator('[data-viewer=prev]').boundingBox(),nx=await shop.locator('[data-viewer=next]').boundingBox(),dt=await shop.locator('.viewer-dots').boundingBox();
      assert.ok(Math.abs((dt.x+dt.width/2)-((pv.x+pv.width+nx.x)/2))<2,'dots centred between the arrows');
      // Double tap zooms in, double tap again zooms out.
      const stage=await shop.locator('.viewer-stage').boundingBox(),cx=stage.x+stage.width/2,cy=stage.y+stage.height/2;
      await p.mouse.click(cx,cy);await p.mouse.click(cx,cy);
      assert.match(await shop.locator('.viewer img').evaluate(i=>i.style.transform),/scale\(2\.5\)/);
      await p.screenshot({path:`test-results/winkel/ingezoomd-${width}.png`});
      await p.waitForTimeout(400);await p.mouse.click(cx,cy);await p.mouse.click(cx,cy);
      assert.match(await shop.locator('.viewer img').evaluate(i=>i.style.transform),/scale\(1\)/);
      // Swipe to the next photo, close with Escape; the shop shows the photo that was last seen.
      await p.waitForTimeout(400);
      await p.mouse.move(cx+80,cy);await p.mouse.down();await p.mouse.move(cx-80,cy,{steps:6});await p.mouse.up();
      assert.equal(await shop.locator('.viewer-dots').getAttribute('aria-label'),'Foto 2 van 2');
      await p.keyboard.press('Escape');
      assert.equal(await shop.locator('.viewer').count(),0);
      assert.equal(await shop.locator('#dots').getAttribute('aria-label'),'Foto 2 van 2');
      assert.deepEqual(f.state.errors,[]);
      assert.equal(f.state.saved,undefined,'nothing saved');
    }finally{await f.browser.close();}
  }
  console.log('PASS shop title and zoom: long title stays above the text in the info window; one tap opens the photo full screen with double-tap zoom, swipe, 44px controls and Escape; returns on the last photo seen. 390×693 and 320×568, services mocked.');
})().catch(e=>{console.error(e);process.exit(1);});

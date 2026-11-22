// Before/after screenshots for docs/screenshots/feedback-19-november (npm run build first). Usage: node scripts/screenshots-feedback-19-november.cjs <output folder>
const path=require('node:path').join(__dirname,'../tests/');
const {fixture}=require(path+'admin-fixture.cjs');
const {answer}=require(path+'intake-helper.cjs');
const OUT=process.argv[2];
(async()=>{
 for(const [w,h] of [[390,693],[320,568]]){
  const f=await fixture(w),p=f.page;
  try{
   await p.setViewportSize({width:w,height:h});await f.login();
   const intake=p.frameLocator('#intake');
   await p.locator('#new').click();await intake.locator('label.camera').waitFor();
   await p.waitForTimeout(1500);await p.screenshot({path:`${OUT}/1-leeg-${w}.png`});
   const png=c=>p.evaluate(colour=>{const k=document.createElement('canvas');k.width=300;k.height=400;const x=k.getContext('2d');x.fillStyle='#e9e1d6';x.fillRect(0,0,300,400);x.fillStyle=colour;x.beginPath();x.moveTo(110,40);x.lineTo(190,40);x.lineTo(250,120);x.lineTo(230,380);x.lineTo(70,380);x.lineTo(50,120);x.closePath();x.fill();return k.toDataURL().split(',')[1];},c);
   await intake.locator('#files').setInputFiles([{name:'a.png',mimeType:'image/png',buffer:Buffer.from(await png('#5a3b2a'),'base64')},{name:'b.png',mimeType:'image/png',buffer:Buffer.from(await png('#7a4a33'),'base64')}]);
   await p.waitForTimeout(1500);await p.screenshot({path:`${OUT}/2-fotos-${w}.png`});
   await intake.getByRole('button',{name:'Zelf invullen'}).click();await intake.locator('#question').waitFor();
   await answer(intake,{},{stopAt:'kleur'});
   await p.waitForTimeout(1500);await p.screenshot({path:`${OUT}/3-vraag-${w}.png`});
   await p.waitForTimeout(2600);
   await p.evaluate(()=>window.NikkiApp.openAccount());await p.locator('#items li.piece').first().waitFor();await p.waitForTimeout(300);
   await p.waitForTimeout(1500);await p.screenshot({path:`${OUT}/4-collectie-${w}.png`});
   await p.getByRole('button',{name:/Bewerken: Leren/}).click();await intake.locator('#summary').waitFor();
   await p.waitForTimeout(1500);await p.screenshot({path:`${OUT}/5-bewerken-${w}.png`});
  }finally{await f.browser.close();}
 }
})().catch(e=>{console.error(e);process.exit(1);});

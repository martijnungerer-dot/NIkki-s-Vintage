// Real built app and public fixtures. All HTTP traffic, including fonts, is intercepted.
const {chromium}=require('playwright');
const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');
const names=['Bruine vintage jas','Zwarte wollen jas','Korte leren jas','Lange wollen mantel'];
const colours=['#8A5A3C','#3B3431','#B9A58E','#A08672'];
const id=i=>'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0');
const drawing=c=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420"><rect width="300" height="420" fill="#E9E1D6"/><path d="M120 70 L150 95 L180 70 L222 92 L240 220 L222 228 L214 150 L210 390 L90 390 L86 150 L78 228 L60 220 L78 92 Z" fill="'+c+'"/><path d="M120 70 L150 140 L180 70 M150 140 V390" fill="none" stroke="#d6c6b7" stroke-width="3"/></svg>';
const catalog=()=>names.map((title,i)=>({id:id(i),display_id:i+1,version:1,status:'published',data:{title,description:'Een jas met knopen.',priceMinor:15000+i*1000,material:i===2?'Leer':'Wol',species:null,furClass:'Nee',model:'Autojas',colour:i===0?'Bruin':'Zwart',length:i===2?'Kort':'Lang',fit:null,era:null,details:[],measurements:[50+i*2,null,null,90],images:[{path:i+'-0.jpg',role:'Voorkant',main:true},{path:i+'-1.jpg',role:'Achterkant',main:false}]}}));
async function fixture(width, options={}){
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width,height:width<=320?568:844},reducedMotion:'reduce'});
 const state={rows:catalog(),requests:[],requestHeaders:[],writes:[],errors:[],reply:{source:'ai',filters:{materiaal:'Wol'},ids:[id(0),id(1)],reaction:'Twee stukken gevonden.',question:'Welke kleur zoek je?',buttons:['Bruin','Zwart']},...options};
 if(options.noStorage)await context.addInitScript(()=>{Object.defineProperty(window,'localStorage',{configurable:true,get(){throw Error('Storage blocked');}});});
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.hostname==='fonts.googleapis.com')return route.fulfill({contentType:'text/css',body:"@font-face{font-family:Newsreader;font-style:normal;font-weight:200 800;src:url('https://app.test/__test-newsreader.ttf') format('truetype');font-display:swap}"});
  if(u.hostname==='app.test'){
   if(u.pathname==='/__test-newsreader.ttf')return route.fulfill({contentType:'font/ttf',body:fs.readFileSync(path.join(__dirname,'fixtures/fonts/Newsreader.ttf'))});
   if(u.pathname==='/config.js')return route.fulfill({contentType:'text/javascript',body:"export const config={supabaseUrl:'https://test.supabase.co',supabasePublishableKey:'public-test-key'}"});
   const file=u.pathname==='/reference'?'concept/ontdekken-optie-b.html':u.pathname==='/mock'?'concept/zoeken-gesprek.html':'dist/cloud/'+(u.pathname==='/'?'index.html':u.pathname.slice(1));
   try{return route.fulfill({contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html',body:fs.readFileSync(path.join(root,file))});}catch{return route.fulfill({status:404});}
  }
  if(u.hostname!=='test.supabase.co')return route.abort();
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'};
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
  const json=(data,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(data)});
  if(u.pathname==='/rest/v1/garments')return json([...state.rows].reverse());
  if(u.pathname==='/storage/v1/object/sign/garment-photos')return json(req.postDataJSON().paths.map(p=>({path:p,signedURL:'/object/sign/garment-photos/'+p})));
  if(u.pathname.startsWith('/storage/v1/object/sign/garment-photos/'))return route.fulfill({headers,contentType:'image/svg+xml',body:drawing(colours[Number(u.pathname.split('/').at(-1)[0])])});
  if(u.pathname==='/functions/v1/zoek'){state.requests.push(req.postDataJSON());state.requestHeaders.push(req.headers());if(state.hold)await state.hold;return state.fail?json({error:'UNAVAILABLE'},503):json(state.reply);}
  if(u.pathname==='/functions/v1/personalise')return json({source:'fallback',ranking:[]});
  state.writes.push(req.method()+' '+u.pathname);return json({error:'fixture route unavailable'},500);
 });
 const page=await context.newPage();page.on('pageerror',e=>state.errors.push(e.message));
 const open=async()=>{await page.goto('https://app.test/');await page.waitForFunction(()=>document.getElementById('status').textContent==='Collectie geladen.');const shop=page.frames().find(f=>f.name()==='shop');await shop.evaluate(async()=>{await document.fonts.load('16px Newsreader');await document.fonts.ready;});return shop;};
 return {browser,context,page,state,open};
}
module.exports={fixture,id,names};

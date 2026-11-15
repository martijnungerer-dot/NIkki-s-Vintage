const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const id = '11111111-1111-4111-8111-111111111111';
const photo = id + '/' + 'a'.repeat(64) + '.jpg';
const garment = {id, display_id:1, status:'published', version:1, data:{
  title:'Leren mantel', description:'Een lange mantel met knopen.', priceMinor:12500,
  material:'Leer', furClass:'Nee', model:'Autojas', colour:'Bruin', length:'Lang',
  species:null, fit:null, era:null, details:[], measurements:[54,46,62,98],
  images:[{path:photo,role:'Voorkant',main:true}]
}};
async function fixture(width = 390, options = {}) {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
  const context = await browser.newContext({viewport:{width,height:844}});
  const page = await context.newPage();
  if(options.clock)await page.clock.install();
  if(options.noIndexedDb)await context.addInitScript(()=>{Object.defineProperty(window,'indexedDB',{configurable:true,get(){throw Error('blocked');}});});
  const state = {rows:[structuredClone(garment)],requests:[],errors:[],...options};
  page.on('pageerror', e=>state.errors.push(e.message));
  page.on('dialog', d=>d.accept());
  await context.route('**/*', async route=>{
    const req = route.request(), url = new URL(req.url());
    // Test-only local copy of the real font; production keeps Google Fonts.
    if(url.hostname==='fonts.googleapis.com')return route.fulfill({contentType:'text/css',body:"@font-face{font-family:Newsreader;font-style:normal;font-weight:200 800;src:url('https://app.test/__test-newsreader.ttf') format('truetype');font-display:swap}"});
    if (url.hostname === 'app.test') {
      if(url.pathname==='/__test-newsreader.ttf')return route.fulfill({contentType:'font/ttf',body:fs.readFileSync(path.join(__dirname,'fixtures/fonts/Newsreader.ttf'))});
      if(url.pathname==='/config.js'&&options.unconfigured)return route.fulfill({contentType:'text/javascript',body:"export const config={supabaseUrl:'',supabasePublishableKey:''}"});
      if (url.pathname === '/config.js') return route.fulfill({contentType:'text/javascript',body:"export const config={supabaseUrl:'https://test.supabase.co',supabasePublishableKey:'test-public'}"});
      const file = url.pathname === '/' ? '/index.html' : url.pathname;
      try { return route.fulfill({contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(path.join('dist/cloud',file))}); }
      catch { return route.fulfill({status:404}); }
    }
    if (url.hostname !== 'test.supabase.co') return route.abort();
    const headers = {'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'};
    const json = (data,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(data)});
    if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
    let body=null;try{body=req.postDataJSON();}catch{}state.requests.push({path:url.pathname,body});
    if(url.pathname==='/auth/v1/token'){
      if(state.loginHold)await state.loginHold;
      if(state.failLogin)return json({code:'invalid_credentials',message:'Invalid login credentials'},400);
      return json({access_token:'session',refresh_token:'refresh',expires_at:Date.now()/1000+3600});
    }
    if(url.pathname==='/auth/v1/recover'){state.recoverRedirect=url.searchParams.get('redirect_to');return state.limitRecover?json({code:'over_email_send_rate_limit'},429):json({});}
    if(url.pathname==='/auth/v1/user'&&req.method()==='PUT'){
      state.userAuth=req.headers().authorization;
      if(state.expiredLink)return json({code:'bad_jwt'},401);
      if(state.weakPassword){state.weakPassword=false;return json({code:'weak_password'},422);}
      return json({id:'user'});
    }
    if(url.pathname==='/rest/v1/garment_private')return json([]);
    if(url.pathname==='/functions/v1/analyse')return json({titel:'Korte leren jas',beschrijving:'',controleer:{titel:['leren']},bont:{waarde:'Nee',zekerheid:'middel',waarom:''},materiaal:{waarde:'Leer',zekerheid:'middel',waarom:'Glans'},bijzonderheden:{waarde:['Bontkraag'],zekerheid:'hoog',waarom:'Zichtbaar'},waarschuwingen:['Let op: controleer de bontsoort.'],fotos:[{nr:1,rol:'Voorkant',bruikbaar:true}]});
    if(url.pathname.startsWith('/storage/v1/object/garment-photos/')&&req.method()==='POST')return json({Key:url.pathname});
    if(url.pathname==='/rest/v1/rpc/save_garment_with_private'){const b=req.postDataJSON();state.saved=b;return json({...state.rows[0],data:b.p_data,version:state.rows[0].version+1});}
    if(url.pathname==='/rest/v1/rpc/mark_garment_sold'){
      const row=state.rows.find(r=>r.id===body.p_id);state.soldCalls=(state.soldCalls||0)+1;
      if(state.failSold||!row||row.version!==body.p_version)return json({code:'40001',message:'VERSION_CONFLICT'},500);
      row.status='sold';row.version++;return json(row);
    }
    if(url.pathname==='/rest/v1/rpc/require_staff'&&state.denyStaff)return json({},403);
    if(url.pathname==='/rest/v1/garments'&&state.failList)return json({},503);
    if(url.pathname==='/rest/v1/rpc/require_staff'||url.pathname==='/auth/v1/logout')return json(null);
    if(url.pathname==='/rest/v1/garments'||url.pathname==='/rest/v1/rpc/public_catalog')return json(state.rows);
    if(url.pathname==='/storage/v1/object/sign/garment-photos')return json(req.postDataJSON().paths.filter(p=>!p.includes('missing')).map(p=>({path:p,signedURL:'/object/sign/garment-photos/'+p})));
    if(url.pathname.startsWith('/storage/v1/object/sign/garment-photos/'))return route.fulfill({headers,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect width="400" height="500" fill="#e8dfd2"/><path d="M155 65 105 100 45 285 90 305 120 220 110 460 290 460 280 220 310 305 355 285 295 100 245 65 220 110 180 110Z" fill="#624739"/><path d="m155 65 45 85 45-85M200 150v310" fill="none" stroke="#392a23" stroke-width="6"/><g fill="#b0977b"><circle cx="215" cy="210" r="5"/><circle cx="215" cy="270" r="5"/><circle cx="215" cy="330" r="5"/></g></svg>'});
    if(url.pathname==='/functions/v1/personalise')return json({source:'fallback',ranking:[]});
    return json({error:'fixture route unavailable'},500);
  });
  await page.goto('https://app.test/'+(options.hash||''));
  await page.waitForFunction(unconfigured=>document.getElementById('status').textContent.includes(unconfigured?'niet aangesloten':'Collectie geladen.'),Boolean(options.unconfigured));
  await page.evaluate(()=>window.NikkiApp.openAccount());
  await page.evaluate(async()=>{await document.fonts.load('16px Newsreader');await document.fonts.ready;});
  return {browser,page,state,async login(){
    await page.locator('#email').fill('nikki@example.test');
    await page.locator('#password').fill('test-password');
    await page.locator('#login [type=submit], #login button:not([type])').click();
    await page.waitForFunction(()=>document.getElementById('login').hidden);
    await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Ingelogd.'));
  }};
}
module.exports={fixture,garment};

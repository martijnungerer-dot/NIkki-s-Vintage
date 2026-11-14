import {config} from './config.js';
import {Api} from './api.js';
import {prepareImage} from './images.js';
import {transferPhotos} from './photo-transfer.js';
import {shopSource,intakeSource} from './views.js';
import {createAdmin} from './admin/index.js';
import {startReview} from './admin/review.js'; // temporary review mode, see app/review-kit/README.md
const api=new Api(config);
const $=id=>document.getElementById(id);
document.body.dataset.screen='shop';
function show(screen){
  if(screen==='intake'&&!admin.state.staff)screen='manage';
  document.body.dataset.screen=screen;
  for(const name of ['shop','intake','manage'])$(name).hidden=name!==screen;
  document.querySelectorAll('button[data-screen]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.screen===screen)));
  try{sessionStorage.setItem(SCREEN_KEY,screen);}catch{}
}
// After a refresh, return to the screen you were on (this tab only). An unsaved piece in the
// intake is not kept, so a refresh there returns to Jouw collectie instead of an empty form.
const SCREEN_KEY='gsf-screen';
function lastScreen(){
  let saved=null;try{saved=sessionStorage.getItem(SCREEN_KEY);}catch{}
  return saved==='manage'||saved==='intake'?'manage':null;
}
const returnTo=location.hash?null:lastScreen();
const admin=createAdmin({api,$,show});
function mount(frame,source){return new Promise(resolve=>{frame.addEventListener('load',resolve,{once:true});frame.srcdoc=source;});}
// Latest Gemini proposal for the piece being entered; saved staff-only next to Nikki's final version.
let lastAnalysis=null;
window.NikkiApp={
  forgetAnalysis(){lastAnalysis=null;},
  internalPhotos:id=>api.internalPhotos(id),
  openAccount:()=>show('manage'),
  prepareImage,
  preparePhotos:(photos,primary)=>transferPhotos(photos,primary,{prepareImage}),
  async analyse(files,signal){
    if(!admin.state.staff)throw Error('Log eerst in.');
    try{const result=await api.analyse(files,signal);lastAnalysis=result;return result;}catch(e){if(e.name==='AbortError')throw Object.assign(new Error('Analyse gestopt.'),{code:'cancelled'});throw e;}
  },
  // Taste ranking (docs/SMAAKPROFIEL.md): only the compact profile summary leaves the browser.
  personalise:profile=>api.request('/functions/v1/personalise',{method:'POST',auth:false,body:{profile},signal:AbortSignal.timeout(50000)}),
  async publish(product){
    if(!admin.state.staff)throw Error('Log eerst in.');
    const saved=await api.save(product,admin.state.editVersions.get(product.key)||0,{ai:lastAnalysis});
    lastAnalysis=null;
    admin.state.editVersions.set(product.key,saved.version);
    try{await admin.refresh();show('shop');admin.say(saved.status==='sold'?'Wijziging opgeslagen. Dit stuk blijft verkocht.':product.title+' is opgeslagen en staat in de boetiek.');}
    catch{admin.say('Het stuk is opgeslagen. De collectie kon niet worden vernieuwd; probeer Collectie vernieuwen.','error');}
  }
};
await Promise.all([mount($('shop'),shopSource),mount($('intake'),intakeSource)]);
await admin.start();
// A shared piece or a reset link in the address decides the screen itself.
if(returnTo&&document.body.dataset.screen==='shop')show(returnTo);
startReview({api,admin});

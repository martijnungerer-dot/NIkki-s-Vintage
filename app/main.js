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
history.replaceState({...history.state,screen:'shop'},'');
function show(screen,{fromHistory=false}={}){
  if(screen==='intake'&&!admin.state.staff)screen='manage';
  document.body.dataset.screen=screen;
  for(const name of ['shop','intake','manage'])$(name).hidden=name!==screen;
  document.querySelectorAll('button[data-screen]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.screen===screen)));
  try{sessionStorage.setItem(SCREEN_KEY,screen);}catch{}
  // The phone's back button goes to the previous screen of the app instead of leaving the site.
  if(!fromHistory&&history.state?.screen!==screen)history.pushState({...history.state,screen},'');
}
addEventListener('popstate',event=>{if(event.state?.screen)show(event.state.screen,{fromHistory:true});});
const unsavedIntake=()=>{try{return !!$('intake').contentWindow.NikkiIntake?.needsLeaveWarning();}catch{return false;}};
// Closing, refreshing or leaving the site with an unsaved piece asks first (the browser shows its own text).
addEventListener('beforeunload',event=>{if(unsavedIntake()){event.preventDefault();event.returnValue='';}});
// After a refresh, return to the screen you were on (this tab only). From Nieuw stuk you return
// there only if a saved draft (concept) was put back; otherwise to Jouw collectie.
const SCREEN_KEY='gsf-screen';
function lastScreen(){
  let saved=null;try{saved=sessionStorage.getItem(SCREEN_KEY);}catch{}
  return saved==='manage'||saved==='intake'?saved:null;
}
const returnTo=location.hash?null:lastScreen();
const admin=createAdmin({api,$,show});
function mount(frame,source){return new Promise(resolve=>{frame.addEventListener('load',resolve,{once:true});frame.srcdoc=source;});}
// Latest Gemini proposal for the piece being entered; saved staff-only next to Nikki's final version.
let lastAnalysis=null, analysisToken=0;
window.NikkiApp={
  forgetAnalysis(){lastAnalysis=null;analysisToken++;},
  // Used by drafts (concepten) to keep the Gemini proposal and the edit version across a refresh.
  currentAnalysis:()=>lastAnalysis,
  restoreAnalysis(value){lastAnalysis=value;},
  editVersion:key=>admin.state.editVersions.get(key),
  restoreEditVersion(key,version){if(Number.isInteger(version))admin.state.editVersions.set(key,version);},
  internalPhotos:id=>api.internalPhotos(id),
  openAccount:()=>show('manage'),
  // Called once the user is confirmed as staff: put back an unsaved piece (concept) from this device.
  staffReady(){try{return $('intake').contentWindow.NikkiIntake?.restoreDraft()??Promise.resolve(false);}catch{return Promise.resolve(false);}},
  // Logout removes the unsaved piece from this device (it can include photos only for checking).
  async clearDraft(){try{await $('intake').contentWindow.NikkiIntake?.clearDraft();}catch{}},
  prepareImage,
  preparePhotos:(photos,primary)=>transferPhotos(photos,primary,{prepareImage}),
  async analyse(files,signal,lists){
    if(!admin.state.staff)throw Error('Log eerst in.');
    // An answer that arrives after Nikki moved on to another piece is not kept as that piece's proposal.
    const token=++analysisToken;
    try{const result=await api.analyse(files,signal,lists);if(token===analysisToken)lastAnalysis=result;return result;}catch(e){if(e.name==='AbortError')throw Object.assign(new Error('Analyse gestopt.'),{code:'cancelled'});throw e;}
  },
  // Taste ranking (docs/SMAAKPROFIEL.md): only the compact profile summary leaves the browser.
  personalise:profile=>api.request('/functions/v1/personalise',{method:'POST',auth:false,body:{profile},signal:AbortSignal.timeout(50000)}),
  async publish(product,onProgress){
    if(!admin.state.staff)throw Error('Log eerst in.');
    const version=admin.state.editVersions.get(product.key)||0;
    let saved;
    try{saved=await api.save(product,version,{ai:lastAnalysis,onProgress:typeof onProgress==='function'?onProgress:undefined});}
    catch(error){
      // A new piece whose first save went through but whose answer was lost: it exists already.
      if(version===0&&/elders gewijzigd/.test(error.message)){
        await admin.refresh().catch(()=>{});
        const row=admin.state.rows.find(r=>r.id===product.key);
        if(row){admin.state.editVersions.set(row.id,row.version);throw Error('Dit stuk was al opgeslagen. Je ziet het in Jouw collectie; open het met Bewerken om verder te gaan.');}
      }
      throw error;
    }
    lastAnalysis=null;
    admin.state.editVersions.set(product.key,saved.version);
    try{await admin.refresh();show('shop');try{$('shop').contentWindow.NikkiShop?.api?.show(product.key);}catch{}admin.say(saved.status==='sold'?'Wijziging opgeslagen. Dit stuk blijft verkocht.':product.title+' is opgeslagen en staat in de boetiek.');}
    catch{admin.say('Het stuk is opgeslagen. De collectie kon niet worden vernieuwd; probeer Collectie vernieuwen.','error');}
    // Reset once the intake has finished its own save handling (next task), so Nieuw stuk starts empty.
    setTimeout(()=>{try{$('intake').contentWindow.NikkiIntake?.reset(product.key);}catch{}});
  }
};
await Promise.all([mount($('shop'),shopSource),mount($('intake'),intakeSource)]);
await admin.start();
const draftBack=admin.state.staff?window.NikkiApp.staffReady():Promise.resolve(false);
// A shared piece or a reset link in the address decides the screen itself.
if(returnTo&&document.body.dataset.screen==='shop'){
  // Back to Nieuw stuk only when an unsaved piece was put back; otherwise to Jouw collectie.
  let to='manage';
  if(returnTo==='intake'&&admin.state.staff&&await draftBack)to='intake';
  show(to);
}
startReview({api,admin});

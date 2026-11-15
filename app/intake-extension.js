// Injected inside the existing intake closure by build-cloud.mjs.
// Eight photos per piece, all seen by Gemini; the database allows eight in total (public + internal).
// A function declaration, so the prototype can use it before this code runs (hoisted).
function maxPhotos() { return 8; }
limits = {images:{maxCount:maxPhotos()}};
// Nikki's chip lists (standard plus her own words) go along, so Gemini picks existing chips.
function chipLists() { return Object.fromEntries(['model','kleur','lengte','pasvorm','bijzonderheden'].map(k=>[k,BASE[k].concat(learned[k]||[])])); }
sample = {json:(_prompt, o)=>window.parent.NikkiApp.analyse(o.images, o.signal, chipLists())};
$('ai-off').textContent='Gemini bekijkt alle foto’s, ook die alleen voor controle. Het zijn voorstellen: controleer materiaal en kenmerken zelf.';
$('ai-off').hidden=false;
$('analyse').textContent='Voorstellen met Gemini';
// Internal photos stay visible to Nikki, marked with a dashed outline.
const internalStyle=document.createElement('style');
// Project rules for every screen: tap targets at least 44 px with room between them, text at
// least 16 px (measured shortfalls from the usability review of 15 November 2026).
internalStyle.textContent=[
  '.ph.intern .thumb{outline:2px dashed var(--muted,#6B5A50);outline-offset:-2px}',
  '#publish.incomplete{opacity:.4}',
  '.ph{gap:8px}.ph button.okb,.ph .rolesel{min-height:44px;font-size:1rem}',
  '.chip,.okb,#step-review .btn.ghost,#step-review button:not(.stephead):not(.x){min-height:44px}',
  '.muted,.notice,.why,.check,.learn,.tag,.err,.meas label,.chip,.stepsum{font-size:1rem}',
  '.glabel{font-size:1rem;letter-spacing:.02em;text-transform:none}',
  '.stepsum{white-space:normal;overflow:visible}',
  // "Volgend stuk" is a secondary action, so it no longer looks like the main button.
  '.btn.ghost{background:transparent;color:var(--fg)}',
  // The message about what is missing sits right above the save button, in view.
  '.bar #review-err{margin:0 0 8px;color:#9B3A2F}.bar #review-err:empty{display:none}',
  '.thumb .x{width:44px;height:44px;top:0;right:0}.linkbtn{min-height:44px}'
].join('');
document.head.append(internalStyle);
// The save message (what is missing, saving, saved) belongs next to the save button.
$('publish').before($('review-err'));
// Unsaved input = what is on screen differs from the last saved or opened state.
function snapshot(){
  const filled=o=>Object.fromEntries(Object.entries(o).filter(([,v])=>Array.isArray(v)?v.length:v!==''&&v!=null&&v!==false).sort());
  return JSON.stringify({p:photos.map(x=>[x.url,x.rol,!!x.main,!!x.internal,!!x.ok]),sel:filled(sel),m:filled(m),t:filled(text),sp:speciesChecked});
}
// Review 15 November 2026: generation counter for Gemini answers and the last Gemini warnings.
var analysisGen=0, lastWarnings=[], refusedPhotos=[];
// Only photos the app can process are taken in; the others are named right away.
function usablePhoto(file){
  const ok=['image/jpeg','image/png','image/webp'].includes(file.type)&&file.size<=30*1024*1024;
  if(!ok)refusedPhotos.push(file.name||'foto');
  return ok;
}
for(const id of ['cam','gallery'])$(id).addEventListener('change',()=>{
  if(!refusedPhotos.length)return;
  $('photo-count').textContent=(refusedPhotos.length===1?refusedPhotos[0]+' is':refusedPhotos.length+' foto’s zijn')+' niet gebruikt: kies een JPG-, PNG- of WebP-foto van maximaal 30 MB. '+$('photo-count').textContent;
  refusedPhotos=[];
});
let baseline=snapshot();
function markSaved(){baseline=snapshot();clearDraft();}
// Typed but not yet added values of "+ nieuw", per field (kept when the checklist is redrawn).
var addDraft={};
$('path').addEventListener('input',e=>{if(e.target.id&&e.target.id.indexOf('add-')===0)addDraft[e.target.id.slice(4)]=e.target.value;});
$('again').addEventListener('click',()=>{document.querySelector('.name').textContent='Nieuw stuk';addDraft={};lastWarnings=[];analysisGen++;if(ctl)ctl.abort();$('publish').textContent='Opslaan en tonen in boetiek';$('review-err').textContent='';markSaved();});
function unsavedInput(){return snapshot()!==baseline||Object.values(addDraft).some(v=>v.trim());}
// Every tap redraws the checklist; put the focus back on the same control afterwards, so a
// keyboard or screen-reader user does not land at the top (review 15 November 2026, 1.1).
$('path').addEventListener('click',e=>{
  const control=e.target.closest('button,select,input');if(!control)return;
  const attrs=['data-k','data-v','data-ok','data-main','data-allok','data-open','data-intern','data-add','data-next'].filter(a=>control.hasAttribute(a));
  if(!attrs.length)return;
  const selector=control.tagName.toLowerCase()+attrs.map(a=>'['+a+'="'+CSS.escape(control.getAttribute(a))+'"]').join('');
  setTimeout(()=>{if(document.activeElement&&document.activeElement!==document.body&&document.activeElement.isConnected)return;const again=$('path').querySelector(selector);if(again)again.focus({preventScroll:true});});
},true);
// "Volgend stuk" starts over; ask first if there is input that has not been saved.
document.getElementById('new-draft')?.addEventListener('click',event=>{
  if(unsavedInput()&&!confirm('Wat je hebt ingevuld is nog niet opgeslagen. Toch een nieuw stuk beginnen?')){event.stopImmediatePropagation();}
},true);
// A new piece forgets the Gemini proposal of the previous one.
$('again').addEventListener('click',()=>window.parent.NikkiApp.forgetAnalysis?.());
renderThumbs();
$('review-intro').textContent='Controleer alle gegevens voordat je opslaat.';
// ---------- Concepten bewaren (alleen op dit toestel) ----------
// A half-entered piece, photos included, is kept in IndexedDB every two seconds and when the app
// goes to the background. After logging in as staff it is put back; it is removed after saving,
// after starting over, when a saved piece is opened, at logout, and after 14 days. Photos are stored
// under their own key and only rewritten when the set of photos changes.
const DRAFT_DB='gsf-intake', DRAFT_STORE='drafts', DRAFT_KEY='current', DRAFT_PHOTOS='photos', DRAFT_DAYS=14;
const emptyState=snapshot();
let lastDraft=null, lastPhotoSet=null, draftsOff=false, draftSaving=false;
function draftDb(){
  return new Promise((resolve,reject)=>{
    let request;try{request=indexedDB.open(DRAFT_DB,1);}catch(error){reject(error);return;}
    request.onupgradeneeded=()=>request.result.createObjectStore(DRAFT_STORE);
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
}
async function draftDo(mode,work){
  const db=await draftDb();
  try{return await new Promise((resolve,reject)=>{const tx=db.transaction(DRAFT_STORE,mode),request=work(tx.objectStore(DRAFT_STORE));tx.oncomplete=()=>resolve(request&&request.result);tx.onerror=tx.onabort=()=>reject(tx.error);});}
  finally{db.close();}
}
const draftState=()=>snapshot()+JSON.stringify(addDraft);
async function saveDraft(){
  if(draftsOff||draftSaving)return;
  if(!unsavedInput()||snapshot()===emptyState){if(lastDraft!==null)await clearDraft();return;}
  const state=draftState();if(state===lastDraft)return;
  draftSaving=true;
  try{
    const photoSet=photos.map(p=>p.url).join('|');
    if(photoSet!==lastPhotoSet){await draftDo('readwrite',store=>store.put(photos.map(p=>p.file),DRAFT_PHOTOS));lastPhotoSet=photoSet;}
    const value={v:2,at:Date.now(),draftId:draftId||null,edit:draftId?(window.parent.NikkiApp.editVersion?.(draftId)??null):null,step:$('step-review').hidden?1:3,
      photos:photos.map(p=>({cloudPath:p.cloudPath||null,rol:p.rol||'',main:!!p.main,internal:!!p.internal,ok:!!p.ok,rolByUser:!!p.rolByUser,toelichting:p.toelichting||'',bruikbaar:p.bruikbaar!==false})),
      sel:sel,m:m,text:text,sug:sug,speciesChecked:speciesChecked,addDraft:addDraft,warnings:lastWarnings,ai:window.parent.NikkiApp.currentAnalysis?.()??null};
    await draftDo('readwrite',store=>store.put(value,DRAFT_KEY));lastDraft=state;
  }catch{draftsOff=true;}
  finally{draftSaving=false;}
}
function clearDraft(){lastDraft=null;lastPhotoSet=null;return draftDo('readwrite',store=>{store.delete(DRAFT_PHOTOS);return store.delete(DRAFT_KEY);}).catch(()=>{});}
async function restoreDraft(){
  let d,files;try{d=await draftDo('readonly',store=>store.get(DRAFT_KEY));files=await draftDo('readonly',store=>store.get(DRAFT_PHOTOS));}catch{draftsOff=true;return false;}
  if(!d||d.v!==2||!Array.isArray(d.photos))return false;
  if(Date.now()-d.at>DRAFT_DAYS*24*60*60*1000){await clearDraft();return false;}
  // Something else was opened in the meantime (for example Bewerken): keep that, keep the draft.
  if(snapshot()!==emptyState)return false;
  files=Array.isArray(files)?files:[];
  photos=d.photos.map((p,i)=>({...p,file:files[i]})).filter(p=>p.file instanceof Blob).map(p=>({...p,url:URL.createObjectURL(p.file)}));
  sel=d.sel&&typeof d.sel==='object'?d.sel:{};if(!Array.isArray(sel.bijzonderheden))sel.bijzonderheden=[];
  m={chest:'',shoulder:'',sleeve:'',length:'',...(d.m||{})};text={titel:'',beschrijving:'',prijs:'',...(d.text||{})};
  sug=d.sug||{};speciesChecked=!!d.speciesChecked;addDraft=d.addDraft||{};draftId=d.draftId||null;
  lastWarnings=Array.isArray(d.warnings)?d.warnings:[];
  if(d.draftId&&d.edit!=null)window.parent.NikkiApp.restoreEditVersion?.(d.draftId,d.edit);
  if(d.ai)window.parent.NikkiApp.restoreAnalysis?.(d.ai);
  lastPhotoSet=photos.map(p=>p.url).join('|');lastDraft=draftState();
  renderThumbs();
  const message='Je niet-opgeslagen stuk van '+new Date(d.at).toLocaleString('nl-NL',{weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})+' is teruggezet.';
  if(d.step===3&&photos.length)startReview({},0,message);
  else{step(1);$('photo-count').textContent=message+' '+$('photo-count').textContent;}
  $('publish').textContent=d.edit!=null?'Wijziging opslaan':'Opslaan en tonen in boetiek';
  document.querySelector('.name').textContent=d.edit!=null?'Stuk bewerken':'Nieuw stuk';
  return true;
}
let draftRestored=Promise.resolve(false);
setInterval(saveDraft,2000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveDraft();});
addEventListener('pagehide',()=>{saveDraft();});
window.NikkiIntake = {
  hasUnsavedInput:()=>unsavedInput(),
  // Warn before leaving only if the latest input is not stored on the device yet.
  needsLeaveWarning:()=>unsavedInput()&&(draftsOff||snapshot()+JSON.stringify(addDraft)!==lastDraft),
  // Put a draft back; only called by the app once the user is confirmed as staff.
  restoreDraft(){ draftRestored=restoreDraft(); return draftRestored; },
  get draftRestored(){ return draftRestored; },
  // Remove the draft from this device (logout).
  clearDraft:()=>clearDraft(),
  // After a successful save the next Nieuw stuk starts empty, unless another piece was opened meanwhile.
  reset(savedKey){ if(!savedKey||!draftId||draftId===savedKey)$('again').click(); },
  async load(record) {
    const incoming = [];
    // Internal photos are fetched separately (staff only); saving without them would drop them.
    const internal = await window.parent.NikkiApp.internalPhotos(record.key);
    // All photos are fetched at the same time, in order.
    incoming.push(...await Promise.all([...record.images, ...internal.map(i=>({...i, main:false, internal:true}))].map(async image=>{
      const response = await fetch(image.src); if(!response.ok) throw Error('Een foto kon niet worden geopend.');
      const blob = await response.blob();
      return {file:new File([blob],'foto.jpg',{type:blob.type}),role:image.role,main:image.main,path:image.path,internal:!!image.internal};
    })));
    $('again').click(); draftId=record.key;
    photos=incoming.map(i=>({file:i.file,cloudPath:i.path,url:URL.createObjectURL(i.file),rol:i.role,main:i.main,internal:i.internal,rolByUser:true,toelichting:'',ok:true,bruikbaar:true}));
    sel={bont:record.furClass,materiaal:record.material,bontsoort:record.species||'',model:record.model,kleur:record.colour,lengte:record.length,pasvorm:record.fit,periode:record.era,bijzonderheden:record.details.slice()};
    m=Object.fromEntries(['chest','shoulder','sleeve','length'].map((k,i)=>[k,record.measurements[i]===null?'':String(record.measurements[i])]));
    text={titel:record.title,beschrijving:record.description,prijs:String(record.priceMinor/100)};
    speciesChecked=true; renderThumbs(); startReview({},0,'Opgeslagen stuk. Controleer je wijzigingen.');
    $('publish').textContent='Wijziging opslaan';
    document.querySelector('.name').textContent='Stuk bewerken';
    markSaved();
  }
};

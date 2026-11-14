// Injected inside the existing intake closure by build-cloud.mjs.
// Eight photos per piece, all seen by Gemini; the database allows eight in total (public + internal).
// A function declaration, so the prototype can use it before this code runs (hoisted).
function maxPhotos() { return 8; }
limits = {images:{maxCount:maxPhotos()}};
sample = {json:(_prompt, options)=>window.parent.NikkiApp.analyse(options.images, options.signal)};
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
  '.bar #review-err{margin:0 0 8px;color:#9B3A2F}.bar #review-err:empty{display:none}'
].join('');
document.head.append(internalStyle);
// The save message (what is missing, saving, saved) belongs next to the save button.
$('publish').before($('review-err'));
// Unsaved input = what is on screen differs from the last saved or opened state.
function snapshot(){
  return JSON.stringify({p:photos.map(x=>[x.url,x.rol,!!x.main,!!x.internal,!!x.ok]),sel:sel,m:m,t:text,sp:speciesChecked});
}
let baseline=snapshot();
function markSaved(){baseline=snapshot();}
// Typed but not yet added values of "+ nieuw", per field (kept when the checklist is redrawn).
var addDraft={};
$('path').addEventListener('input',e=>{if(e.target.id&&e.target.id.indexOf('add-')===0)addDraft[e.target.id.slice(4)]=e.target.value;});
$('again').addEventListener('click',()=>{addDraft={};markSaved();});
function unsavedInput(){return snapshot()!==baseline||Object.values(addDraft).some(v=>v.trim());}
// "Volgend stuk" starts over; ask first if there is input that has not been saved.
document.getElementById('new-draft')?.addEventListener('click',event=>{
  if(unsavedInput()&&!confirm('Wat je hebt ingevuld is nog niet opgeslagen. Toch een nieuw stuk beginnen?')){event.stopImmediatePropagation();}
},true);
// A new piece forgets the Gemini proposal of the previous one.
$('again').addEventListener('click',()=>window.parent.NikkiApp.forgetAnalysis?.());
renderThumbs();
$('review-intro').textContent='Controleer alle gegevens voordat je opslaat.';
window.NikkiIntake = {
  hasUnsavedInput:()=>unsavedInput(),
  async load(record) {
    const incoming = [];
    // Internal photos are fetched separately (staff only); saving without them would drop them.
    const internal = await window.parent.NikkiApp.internalPhotos(record.key);
    for(const image of [...record.images, ...internal.map(i=>({...i, main:false, internal:true}))]) {
      const response = await fetch(image.src); if(!response.ok) throw Error('Een foto kon niet worden geopend.');
      const blob = await response.blob();
      incoming.push({file:new File([blob],'foto.jpg',{type:blob.type}),role:image.role,main:image.main,path:image.path,internal:!!image.internal});
    }
    $('again').click(); draftId=record.key;
    photos=incoming.map(i=>({file:i.file,cloudPath:i.path,url:URL.createObjectURL(i.file),rol:i.role,main:i.main,internal:i.internal,rolByUser:true,toelichting:'',ok:true,bruikbaar:true}));
    sel={bont:record.furClass,materiaal:record.material,bontsoort:record.species||'',model:record.model,kleur:record.colour,lengte:record.length,pasvorm:record.fit,periode:record.era,bijzonderheden:record.details.slice()};
    m=Object.fromEntries(['chest','shoulder','sleeve','length'].map((k,i)=>[k,record.measurements[i]===null?'':String(record.measurements[i])]));
    text={titel:record.title,beschrijving:record.description,prijs:String(record.priceMinor/100)};
    speciesChecked=true; renderThumbs(); startReview({},0,'Opgeslagen stuk. Controleer je wijzigingen.');
    $('publish').textContent='Wijziging opslaan';
    markSaved();
  }
};

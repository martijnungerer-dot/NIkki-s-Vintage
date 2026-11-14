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
// True right after a successful save, false again after any change (set in the save patch).
let savedJustNow=false;
for(const id of ['path','cam','gallery','thumbs'])for(const type of ['input','change','click'])$(id).addEventListener(type,()=>{savedJustNow=false;},true);
// "Volgend stuk" starts over; ask first if there is input that has not been saved.
document.getElementById('new-draft')?.addEventListener('click',event=>{
  const unsaved=photos.length>0||!!text.titel.trim()||!!text.prijs.trim()||Object.values(sel).some(v=>Array.isArray(v)?v.length:!!v);
  if(unsaved&&!savedJustNow&&!confirm('Wat je hebt ingevuld is nog niet opgeslagen. Toch een nieuw stuk beginnen?')){event.stopImmediatePropagation();}
},true);
// A new piece forgets the Gemini proposal of the previous one.
$('again').addEventListener('click',()=>window.parent.NikkiApp.forgetAnalysis?.());
renderThumbs();
$('review-intro').textContent='Controleer alle gegevens voordat je opslaat.';
window.NikkiIntake = {
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
  }
};

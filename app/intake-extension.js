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
internalStyle.textContent='.ph.intern .thumb{outline:2px dashed var(--muted,#6B5A50);outline-offset:-2px}';
document.head.append(internalStyle);
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
  }
};

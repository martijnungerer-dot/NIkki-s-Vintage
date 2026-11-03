// Injected inside the existing intake closure by build-cloud.mjs.
limits = {images:{maxCount:4}};
sample = {json:(_prompt, options)=>window.parent.NikkiApp.analyse(options.images, options.signal)};
$('ai-off').textContent='Gemini bekijkt maximaal vier foto’s. Het zijn voorstellen: controleer materiaal en kenmerken zelf.';
$('ai-off').hidden=false;
$('analyse').textContent='Voorstellen met Gemini';
renderThumbs();
$('review-intro').textContent='Controleer alle gegevens voordat je opslaat.';
window.NikkiIntake = {
  async load(record) {
    const incoming = [];
    for(const image of record.images) {
      const response = await fetch(image.src); if(!response.ok) throw Error('Een foto kon niet worden geopend.');
      const blob = await response.blob();
      incoming.push({file:new File([blob],'foto.jpg',{type:blob.type}),role:image.role,main:image.main,path:image.path});
    }
    $('again').click(); draftId=record.key;
    photos=incoming.map(i=>({file:i.file,cloudPath:i.path,url:URL.createObjectURL(i.file),rol:i.role,main:i.main,rolByUser:true,toelichting:'',ok:true,bruikbaar:true}));
    sel={bont:record.furClass,materiaal:record.material,bontsoort:record.species||'',model:record.model,kleur:record.colour,lengte:record.length,pasvorm:record.fit,periode:record.era,bijzonderheden:record.details.slice()};
    m=Object.fromEntries(['chest','shoulder','sleeve','length'].map((k,i)=>[k,record.measurements[i]===null?'':String(record.measurements[i])]));
    text={titel:record.title,beschrijving:record.description,prijs:String(record.priceMinor/100)};
    speciesChecked=true; renderThumbs(); startReview({},0,'Opgeslagen stuk. Controleer je wijzigingen.');
  }
};

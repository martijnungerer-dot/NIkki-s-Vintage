// Runs inside the store closure; this is the only mutation entry point.
function demoPrice(p) { return p.priceMinor == null ? '€ [voorbeeld]' : new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(p.priceMinor/100); }
window.NikkiStore = {
  put(record, reveal = true) {
    let p = PIECES.find(p=>p.demoKey === record.key);
    if (!p) { p={id:Math.max(...PIECES.map(p=>p.id))+1,demoKey:record.key}; PIECES.unshift(p); }
    Object.assign(p, {title:record.title,description:record.description,priceMinor:record.priceMinor,
      mat:record.material,species:record.species,model:record.model,colour:record.colour,
      length:record.length,fit:record.fit,era:record.era==='Onbekend'?null:record.era,
      m:record.measurements,details:record.details,images:record.images,
      shape:'mid',tx:record.material==='Leer'?'leather':record.material==='Shearling'?'shearling':'fur'});
    const primary=record.images.find(i=>i.main)||record.images[0];
    PHOTOS[p.id]={src:primary.src,alt:record.title};
    renderHero();renderAlsoNew();renderBrowse();
    if(reveal){current=p.id;renderProduct();location.hash='home';route();requestAnimationFrame(()=>goToSlide(p.id));}
  }
};
// Fragment links in srcdoc must stay in this document, not resolve against the host URL.
document.addEventListener('click', event => {
  const link=event.target.closest('a[href^="#"]');
  if(link){event.preventDefault();location.hash=link.getAttribute('href');}
}, true);
window.NikkiStore.exportSource = function(){
 const doc=new DOMParser().parseFromString(sourceDocument,'text/html');
 doc.documentElement.setAttribute('data-start-style',STYLES[styleIdx][0]);
 doc.getElementById('photos-data').textContent=JSON.stringify(PHOTOS).replace(/</g,'\\u003c');
 return '<!doctype html>\n'+doc.documentElement.outerHTML;
};
$('save-photos').addEventListener('click',event=>{event.stopImmediatePropagation();window.parent.document.getElementById('download').click();},true);

/* NIKKI:CLOUD_STORE_EXTENSION */

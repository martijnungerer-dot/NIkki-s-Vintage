// Orchestrates two mounted views. Local storage is optional; HTML export is portable.
const originalDocument='<!doctype html>\n'+document.documentElement.outerHTML;
const shop=document.getElementById('shop'), intake=document.getElementById('intake');
const status=document.getElementById('status');
let products=JSON.parse(document.getElementById('saved-products').textContent);
function valid(p){
 if(!p || typeof p.key!=='string' || typeof p.title!=='string' || !p.title.trim() ||
 !Number.isSafeInteger(p.priceMinor)||p.priceMinor<=0 || !Array.isArray(p.measurements)||p.measurements.length!==4 ||
 !p.measurements.every(v=>v===null||(Number.isFinite(v)&&v>0)) || !p.measurements[0]||!p.measurements[3] ||
 !Array.isArray(p.images)||!p.images.length||p.images.length>8 ||
 !p.images.every(i=>i && typeof i.src==='string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(i.src)) ||
 !['description','material','model','colour','length','fit','era'].every(k=>typeof p[k]==='string') ||
 !(p.species===null||typeof p.species==='string') || !Array.isArray(p.details)||!p.details.every(v=>typeof v==='string')) throw Error('Dit kledingstuk heeft ongeldige gegevens. Controleer de invoer.');
}
try { if(!products.length) products=JSON.parse(localStorage.getItem('nikki-connected-demo-v1')||'[]'); }catch{}
try { products.forEach(valid); }catch{products=[];status.textContent='Opgeslagen oefengegevens konden niet worden gelezen.';}
function show(view){shop.hidden=view!=='shop';intake.hidden=view!=='intake';document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.view)));
window.NikkiApp={publish(product){
 valid(product);
 if(!shop.contentWindow.NikkiStore) throw Error('De boetiek is nog aan het laden. Probeer opnieuw.');
 shop.contentWindow.NikkiStore.put(product);
 const at=products.findIndex(p=>p.key===product.key);if(at<0)products.push(product);else products[at]=product;
 let saved=false;try{localStorage.setItem('nikki-connected-demo-v1',JSON.stringify(products));saved=true;}catch{}
 status.textContent=product.title+' staat in de proefwinkel. '+(saved?'Ook bewaard in deze browser.':'Alleen in deze sessie bewaard; download de app om je stuk te bewaren.');
 document.getElementById('count').textContent=products.length+' eigen stuk'+(products.length===1?'':'ken');
 show('shop');
}};
shop.addEventListener('load',()=>{if(!shop.contentWindow.NikkiStore)return;products.forEach(p=>shop.contentWindow.NikkiStore.put(p,false));document.getElementById('count').textContent=products.length+' eigen stukken';});
shop.srcdoc=JSON.parse(document.getElementById('shop-source').textContent);
intake.srcdoc=JSON.parse(document.getElementById('intake-source').textContent);
document.getElementById('download').addEventListener('click',()=>{
 const doc=new DOMParser().parseFromString(originalDocument,'text/html');
 doc.getElementById('shop-source').textContent=JSON.stringify(shop.contentWindow.NikkiStore.exportSource()).replace(/</g,'\\u003c');
 doc.getElementById('saved-products').textContent=JSON.stringify(products).replace(/</g,'\\u003c');
 const url=URL.createObjectURL(new Blob(['<!doctype html>\n'+doc.documentElement.outerHTML],{type:'text/html;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='nikki-proefapp-met-stukken.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
});

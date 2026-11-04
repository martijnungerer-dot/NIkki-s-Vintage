// Runs inside the intake closure. Files become durable data URLs before handoff.
let draftId = null;
let sending = false;
$('again').addEventListener('click', () => { draftId = null; });
$('publish').textContent = 'Toevoegen aan proefwinkel';
$('publish').addEventListener('click', async event => {
  event.stopImmediatePropagation();
  if (sending || !STEPS.every(s => s.done())) return;
  sending = true; $('publish').disabled = true;
  $('review-err').textContent = 'Foto’s voorbereiden…';
  try {
    if (photos.length > 8) throw Error('Gebruik maximaal acht foto’s per oefenstuk.');
/* NIKKI:PHOTO_TRANSFER:START */
    const images = await Promise.all(photos.map(p => new Promise((resolve, reject) => {
      if (!['image/jpeg','image/png','image/webp'].includes(p.file.type) || p.file.size > 8*1024*1024) {
        reject(Error('Gebruik JPG, PNG of WebP van maximaal 8 MB per foto.')); return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(Error('Een foto kon niet worden gelezen.'));
      reader.onload = () => resolve({src:reader.result, role:p.rol || 'Detail', main:p === mainPhoto()});
      reader.readAsDataURL(p.file);
    })));
/* NIKKI:PHOTO_TRANSFER:END */
    draftId ||= 'stuk-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    const product = {
      key:draftId, title:text.titel.trim(), description:text.beschrijving.trim(),
      priceMinor:Math.round(Number(text.prijs)*100), material:sel.materiaal,
      species:needsSpecies()?sel.bontsoort:null, model:sel.model, colour:sel.kleur,
      length:sel.lengte, fit:sel.pasvorm || '', era:sel.periode || '',
      details:sel.bijzonderheden.slice(),
      measurements:[m.chest,m.shoulder,m.sleeve,m.length].map(v=>v===''?null:Number(v)), images
    };
    window.parent.NikkiApp.publish(product);
    $('review-err').textContent = 'Toegevoegd aan de proefwinkel. Pas dit stuk verder aan of kies Volgend stuk.';
    $('publish').textContent = 'Wijziging in proefwinkel bijwerken';
  } catch(error) { $('review-err').textContent = error.message; }
  finally { sending=false; refresh(); }
}, true);
const next = document.createElement('button');
next.type='button'; next.className='btn ghost'; next.textContent='Volgend stuk'; next.id='new-draft';
next.addEventListener('click',()=>{ $('again').click(); $('publish').textContent='Toevoegen aan proefwinkel'; });
$('back-photos').after(next);

/* NIKKI:CLOUD_INTAKE_EXTENSION */

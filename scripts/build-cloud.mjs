import {readFile,writeFile,mkdir,copyFile,readdir} from 'node:fs/promises';
import {intake as intakeSource} from './build-connected-demo.mjs';
import {replaceExactly,replaceRegion,injectAt} from './build-anchors.mjs';
const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');
const {config}=await import(new URL('app/config.js',root));
if(config.supabasePublishableKey){
  const key=config.supabasePublishableKey;
  let legacyAnon=false;
  try{legacyAnon=JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='anon';}catch{}
  if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)&&!legacyAnon)throw Error('config.js mag alleen een Supabase publishable key of legacy anon key bevatten.');
}
const patchIntake=(text,anchor,replacement,count=1)=>replaceExactly(text,anchor,replacement,{file:'cloud intake (concept/intake-prototype.html + demo/intake-bridge.js)',count});
const patchShop=(text,anchor,replacement,count=1)=>replaceExactly(text,anchor,replacement,{file:'cloud store (concept/ontdekken-optie-b.html)',count});
let intake=intakeSource;
intake=patchIntake(intake,"draftId ||= 'stuk-' + Date.now() + '-' + Math.random().toString(36).slice(2);","draftId ||= crypto.randomUUID();");
intake=patchIntake(intake,'window.parent.NikkiApp.publish(product);',"await window.parent.NikkiApp.publish(product, message => { $('review-err').textContent = message; }); markSaved();");
intake=patchIntake(intake,'key:draftId, title:', 'furClass:sel.bont, key:draftId, title:');
intake=replaceRegion(intake,'PHOTO_TRANSFER','    const images = await window.parent.NikkiApp.preparePhotos(photos, mainPhoto());','demo/intake-bridge.js');
intake=patchIntake(intake,'Toevoegen aan proefwinkel','Opslaan en tonen in boetiek',2);
intake=patchIntake(intake,'Wijziging in proefwinkel bijwerken','Wijziging opslaan');
intake=patchIntake(intake,'Toegevoegd aan de proefwinkel.','Opgeslagen.');
intake=patchIntake(intake,'Na jouw controle kun je het stuk in de proefwinkel bekijken.','Na jouw controle sla je dit stuk op in de gezamenlijke collectie.');
// The existing capture listener already intercepts sample publication.
intake=patchIntake(intake,"  sending = true; $('publish').disabled = true;", "  if(!confirm('Zijn foto’s, kenmerken, maten en prijs gecontroleerd? Met opslaan staat dit stuk zo in de boetiek. Een verkocht stuk blijft verkocht.')) return;\n  sending = true; $('publish').disabled = true;");
intake=patchIntake(intake,"}[e && e.code] || 'Er ging iets mis. Probeer het opnieuw of vul zelf in.';", "}[e && e.code] || (e && e.message) || 'Er ging iets mis. Vul zelf in.';");
// Photo analysis uses the same resized images as storage.
intake=patchIntake(intake,"sample.json(prompt(), { images: files, modelTier: 'default', signal: ctl.signal })", "Promise.all(files.map(f=>window.parent.NikkiApp.prepareImage(f))).then(prepared=>sample.json('', { images: prepared, signal: ctl.signal }))");
// Eight photos; a photo can be marked "Alleen voor controle" (internal; never shown to visitors).
// The main photo is always one for the boutique.
intake=patchIntake(intake,"function mainPhoto() { return photos.filter(function (p) { return p.main; })[0] || photos.filter(function (p) { return p.rol === 'Voorkant'; })[0] || null; }",
  "function mainPhoto() { return photos.filter(function (p) { return p.main && !p.internal; })[0] || photos.filter(function (p) { return p.rol === 'Voorkant' && !p.internal; })[0] || null; }");
intake=patchIntake(intake,"Array.from(list || []).forEach(function (f) { photos.push(","Array.from(list || []).slice(0, Math.max(0, maxPhotos() - photos.length)).forEach(function (f) { photos.push(");
intake=patchIntake(intake,"$('photo-count').textContent = n ? n + (n === 1 ? ' foto' : \" foto's\") + ' klaar.' : 'Voeg eerst een foto toe.';",
  "$('photo-count').textContent = n ? n + (n === 1 ? ' foto' : \" foto's\") + ' klaar' + (n >= maxPhotos() ? ', meer kan niet.' : ' (maximaal ' + maxPhotos() + ').') : 'Voeg eerst een foto toe. Maximaal ' + maxPhotos() + \" foto's.\";");
intake=patchIntake(intake,"'</select>' +\n          '<button type=\"button\" class=\"okb\" data-main=\"' + i + '\" aria-pressed=\"' + (mainPhoto() === p) + '\">' + (mainPhoto() === p ? '★ Hoofdfoto' : '☆ Hoofdfoto') + '</button>' +",
  "'</select>' +\n          '<button type=\"button\" class=\"okb\" id=\"intern-' + i + '\" data-intern=\"' + i + '\" aria-pressed=\"' + !!p.internal + '\" aria-label=\"Foto ' + (i + 1) + ' alleen voor controle\">Alleen voor controle</button>' +\n          (p.internal ? '' : '<button type=\"button\" class=\"okb\" data-main=\"' + i + '\" aria-pressed=\"' + (mainPhoto() === p) + '\">' + (mainPhoto() === p ? '★ Hoofdfoto' : '☆ Hoofdfoto') + '</button>') +");
intake=patchIntake(intake,"'<div class=\"ph' + (p.bruikbaar ? '' : ' bad') + '\">","'<div class=\"ph' + (p.bruikbaar ? '' : ' bad') + (p.internal ? ' intern' : '') + '\">");
intake=patchIntake(intake,"    if ((t = e.target.closest('[data-main]'))) {",
  "    if ((t = e.target.closest('[data-intern]'))) { var zi = Number(t.getAttribute('data-intern')), pz = photos[zi]; pz.internal = !pz.internal; if (pz.internal) pz.main = false; renderPath(); var back = $('intern-' + zi); if (back) back.focus(); return; }\n    if ((t = e.target.closest('[data-main]'))) {");
// The save button stays tappable. If something is still open, a tap opens that step and says what
// is missing, instead of a grey button that gives no reason (Martijn on his phone, 15 November 2026).
intake=patchIntake(intake,"    $('publish').disabled = !all;","    $('publish').disabled = false; $('publish').classList.toggle('incomplete', !all);");
intake=patchIntake(intake,"  if (sending || !STEPS.every(s => s.done())) return;",
  "  if (sending) return;\n  const missing = STEPS.filter(s => !s.done());\n  if (missing.length) {\n    open = missing[0].id; adding = null; renderPath();\n    $('review-err').textContent = 'Nog niet af: ' + missing[0].title + ' (' + missing[0].sum() + ')' + (missing.length > 1 ? ', en nog ' + (missing.length - 1) + ' onderdeel' + (missing.length > 2 ? 'en' : '') : '') + '.';\n    const head = document.querySelector('[data-step=\"' + missing[0].id + '\"] .stephead');\n    if (head) { head.scrollIntoView({block:'center'}); head.focus({preventScroll:true}); }\n    return;\n  }");
// Text typed in "+ nieuw" survives a tap on another chip (every tap rebuilds the checklist).
intake=patchIntake(intake,"'\" placeholder=\"Typ en voeg toe\"><button type=\"button\" data-addok=\"'","'\" placeholder=\"Typ en voeg toe\" value=\"' + esc(addDraft[key] || '') + '\"><button type=\"button\" data-addok=\"'");
intake=patchIntake(intake,"    var inp = $('add-' + key); var v = inp ? inp.value.trim() : '';\n    if (!v) return;","    var inp = $('add-' + key); var v = inp ? inp.value.trim() : '';\n    if (!v) return;\n    delete addDraft[key];");
// A photo can also be removed in Controleren, not only in the first step.
intake=patchIntake(intake,"'<button type=\"button\" class=\"okb\" data-ok=\"' + i + '\" aria-pressed=\"' + p.ok + '\">' + (p.ok ? '✓ Goed' : 'Goed') + '</button>' +",
  "'<button type=\"button\" class=\"okb\" data-ok=\"' + i + '\" aria-pressed=\"' + p.ok + '\">' + (p.ok ? '✓ Goed' : 'Goed') + '</button>' +\n          '<button type=\"button\" class=\"okb\" data-delrev=\"' + i + '\" aria-label=\"Foto ' + (i + 1) + ' verwijderen\">Verwijderen</button>' +");
intake=patchIntake(intake,"    if ((t = e.target.closest('[data-intern]'))) {",
  "    if ((t = e.target.closest('[data-delrev]'))) { var di = Number(t.getAttribute('data-delrev')); if (!confirm('Foto ' + (di + 1) + ' verwijderen?')) return; URL.revokeObjectURL(photos[di].url); photos.splice(di, 1); renderThumbs(); renderPath(); return; }\n    if ((t = e.target.closest('[data-intern]'))) {");
// Review 15 November 2026 (Fable):
// - Gemini's proposals are filled in; a step it filled needs one tap on "Klopt" (app/intake-extension.js).
// - A photo role is escaped where it is put into HTML.
intake=patchIntake(intake,"(p.rol ? ', ' + p.rol : '')","(p.rol ? ', ' + esc(p.rol) : '')");
// - A late Gemini answer for an earlier piece is ignored (generation counter, raised on Volgend stuk / Bewerken).
intake=patchIntake(intake,"    ctl = new AbortController();","    ctl = new AbortController(); var gen = ++analysisGen;");
intake=patchIntake(intake,"      .then(function (d) { startReview(d || {}, files.length, ''); })\n      .catch(function (e) {","      .then(function (d) { if (gen !== analysisGen) return; startReview(d || {}, files.length, ''); })\n      .catch(function (e) {\n        if (gen !== analysisGen) return;");
// - Gemini's warnings (for example possible protected fur) stay visible when the checklist is reopened.
intake=patchIntake(intake,"    var warns = Array.isArray(d.waarschuwingen) ? d.waarschuwingen : [];","    var warns = Array.isArray(d.waarschuwingen) ? (lastWarnings = d.waarschuwingen.slice()) : lastWarnings;");
// - Same limits as the database: measurements up to 300 cm, title up to 200 characters.
intake=patchIntake(intake,"      done: function () { return positiveDecimal(m.chest, 1) && positiveDecimal(m.length, 1) && ['shoulder', 'sleeve'].every(function (k) { return m[k] === '' || positiveDecimal(m[k], 1); }); },",
  "      done: function () { return positiveDecimal(m.chest, 1) && positiveDecimal(m.length, 1) && ['shoulder', 'sleeve'].every(function (k) { return m[k] === '' || positiveDecimal(m[k], 1); }) && ['chest', 'shoulder', 'sleeve', 'length'].every(function (k) { return m[k] === '' || Number(m[k]) <= 300; }); },");
intake=patchIntake(intake,"      done: function () { return !!text.titel.trim() && positiveDecimal(text.prijs, 2); },","      done: function () { return !!text.titel.trim() && text.titel.trim().length <= 200 && positiveDecimal(text.prijs, 2); },");
// - Photos the app cannot use are refused when chosen, with a reason, not only at saving.
intake=patchIntake(intake,"Array.from(list || []).slice(0, Math.max(0, maxPhotos() - photos.length)).forEach(","Array.from(list || []).filter(usablePhoto).slice(0, Math.max(0, maxPhotos() - photos.length)).forEach(");
// The cloud intake saves for real: no "oefenscherm" text and no "proef" in the header (review 15 November 2026).
intake=patchIntake(intake,'<p class="muted">Dit is een oefenscherm. Na jouw controle sla je dit stuk op in de gezamenlijke collectie. Eigen keuzewoorden worden wel in deze browser onthouden.</p>','<p class="muted">Na jouw controle sla je dit stuk op in de collectie. Je eigen keuzewoorden worden in deze browser onthouden.</p>');
intake=patchIntake(intake,'<span class="name">Nieuw stuk · proef</span>','<span class="name">Nieuw stuk</span>');
intake=injectAt(intake,'CLOUD_INTAKE_EXTENSION',await read('app/intake-extension.js'),'demo/intake-bridge.js');
// The chosen design supplies the actual markup and CSS, not a second approximation.
let shop=await read('concept/ontdekken-optie-b.html');
const scripts=shop.match(/<script>[\s\S]*?<\/script>/g);
if(scripts?.length!==1)throw Error('[build] concept/ontdekken-optie-b.html: expected one store script');
// Each storefront piece lives in its own file in app/store-screens/ (see docs/FRONTEND-PLAN.md).
const screenFiles=(await readdir(new URL('app/store-screens/',root))).filter(f=>f.endsWith('.js')).sort();
const screens=await Promise.all(screenFiles.map(f=>read('app/store-screens/'+f)));
// Taste profile modules (docs/SMAAKPROFIEL.md) come first; they only define window.NikkiTaste.
const taste=await Promise.all(['profile','aggregate','ranking'].map(f=>read('app/taste/'+f+'.js')));
shop=patchShop(shop,scripts[0],'<script>\n'+[...taste,await read('app/store-extension.js'),...screens].join('\n')+'\n</script>');
shop=patchShop(shop,'<title>Ontdekken – optie B</title>','<title>Guaranteed Secondhand Fur</title>');
// Martijn, 14 november 2026: the shop is called Guaranteed Secondhand Fur (GSF), no longer Nikki’s Boetiek.
shop=patchShop(shop,'<span class="brand">Nikki’s Boetiek</span>','<span class="brand">Guaranteed Secondhand Fur</span>');
// Martijn, 10 november 2026: "Mijn favorieten" in plaats van "Mijn items".
shop=patchShop(shop,'<button type="button" role="menuitem" data-act="menu">Mijn items</button>','<button type="button" role="menuitem" data-act="menu">Mijn favorieten</button>');
// Fourth Shop destination, using the same checked build anchor as Mijn favorieten.
shop=patchShop(shop,'<button type="button" role="menuitem" data-act="cart-open">Winkelmand</button>','<button type="button" role="menuitem" data-act="cart-open">Winkelmand</button>\n    <button type="button" role="menuitem" data-act="menu">Mijn smaak</button>');
shop=patchShop(shop,'<p class="note">Ontdekken, optie B. Ontwerp met voorbeeldgegevens; foto\'s zijn vervangen door tekeningen.</p>','<p class="note" id="catalog-status" role="status">Collectie laden…</p>');
shop=patchShop(shop,'</style>',await read('app/store-layout.css')+'\n</style>');
await mkdir(new URL('dist/cloud/',root),{recursive:true});
for(const file of ['index.html','style.css','config.js','api.js','images.js','photo-transfer.js','main.js','manifest.webmanifest'])await copyFile(new URL('app/'+file,root),new URL('dist/cloud/'+file,root));
// App icon from the GSF brooch (docs/brand/gsf-broche.webp).
await mkdir(new URL('dist/cloud/icons/',root),{recursive:true});
for(const file of await readdir(new URL('app/icons/',root)))if(file.endsWith('.png'))await copyFile(new URL('app/icons/'+file,root),new URL('dist/cloud/icons/'+file,root));
await mkdir(new URL('dist/cloud/admin/',root),{recursive:true});
for(const file of await readdir(new URL('app/admin/',root))) {
  if(/\.(js|css)$/.test(file))await copyFile(new URL('app/admin/'+file,root),new URL('dist/cloud/admin/'+file,root));
}
// Temporary review mode (app/review-kit/README.md); remove with the folder when the app is finished.
await mkdir(new URL('dist/cloud/review-kit/',root),{recursive:true});
await copyFile(new URL('app/review-kit/review-kit.js',root),new URL('dist/cloud/review-kit/review-kit.js',root));
await writeFile(new URL('dist/cloud/views.js',root),'export const shopSource='+JSON.stringify(shop)+';\nexport const intakeSource='+JSON.stringify(intake)+';\n');
console.log('Built dist/cloud. No credentials or live connections needed.');

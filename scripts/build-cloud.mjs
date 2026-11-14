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
intake=patchIntake(intake,'window.parent.NikkiApp.publish(product);','await window.parent.NikkiApp.publish(product);');
intake=patchIntake(intake,'key:draftId, title:', 'furClass:sel.bont, key:draftId, title:');
intake=replaceRegion(intake,'PHOTO_TRANSFER','    const images = await window.parent.NikkiApp.preparePhotos(photos, mainPhoto());','demo/intake-bridge.js');
intake=patchIntake(intake,'Toevoegen aan proefwinkel','Opslaan en tonen in boetiek',2);
intake=patchIntake(intake,'Wijziging in proefwinkel bijwerken','Wijziging opslaan');
intake=patchIntake(intake,'Toegevoegd aan de proefwinkel.','Opgeslagen.');
intake=patchIntake(intake,'Na jouw controle kun je het stuk in de proefwinkel bekijken.','Na jouw controle sla je dit stuk op in de gezamenlijke collectie.');
// The existing capture listener already intercepts sample publication.
intake=patchIntake(intake,"  sending = true; $('publish').disabled = true;", "  if(!confirm('Zijn foto’s, kenmerken, maten en prijs gecontroleerd? Met opslaan wordt een nieuw stuk zichtbaar in de boetiek. Een verkocht stuk blijft verkocht.')) return;\n  sending = true; $('publish').disabled = true;");
intake=patchIntake(intake,"}[e && e.code] || 'Er ging iets mis. Probeer het opnieuw of vul zelf in.';", "}[e && e.code] || (e && e.message) || 'Er ging iets mis. Vul zelf in.';");
// Photo analysis uses the same resized images as storage.
intake=patchIntake(intake,"sample.json(prompt(), { images: files, modelTier: 'default', signal: ctl.signal })", "Promise.all(files.map(f=>window.parent.NikkiApp.prepareImage(f))).then(prepared=>sample.json('', { images: prepared, signal: ctl.signal }))");
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

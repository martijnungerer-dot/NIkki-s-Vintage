import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {shop as shopSource,intake as intakeSource} from './build-connected-demo.mjs';
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
const patchShop=(text,anchor,replacement,count=1)=>replaceExactly(text,anchor,replacement,{file:'cloud store (concept/site-skeleton.html + demo/store-bridge.js)',count});
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
let shop=shopSource;
shop=patchShop(shop,'</style>',await read('app/store-layout.css')+'\n</style>');
shop=patchShop(shop,'Math.max(...PIECES.map(p=>p.id))+1','record.displayId');
shop=patchShop(shop,"    var p = byId(current); if($('condition-example'))", "    var p = byId(current); if(!p) return; if($('condition-example'))");
shop=injectAt(shop,'CLOUD_STORE_EXTENSION',await read('app/store-extension.js'),'demo/store-bridge.js');
await mkdir(new URL('dist/cloud/',root),{recursive:true});
for(const file of ['index.html','style.css','config.js','api.js','images.js','photo-transfer.js','main.js'])await copyFile(new URL('app/'+file,root),new URL('dist/cloud/'+file,root));
await writeFile(new URL('dist/cloud/views.js',root),'export const shopSource='+JSON.stringify(shop)+';\nexport const intakeSource='+JSON.stringify(intake)+';\n');
console.log('Built dist/cloud. No credentials or live connections needed.');

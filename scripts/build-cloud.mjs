import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import './build-connected-demo.mjs';
const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');
const {config}=await import(new URL('app/config.js',root));
if(config.supabasePublishableKey){
  const key=config.supabasePublishableKey;
  let legacyAnon=false;
  try{legacyAnon=JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='anon';}catch{}
  if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)&&!legacyAnon)throw Error('config.js mag alleen een Supabase publishable key of legacy anon key bevatten.');
}
const demo=await read('concept/nikki-proefapp.html');
const extract=id=>JSON.parse(demo.match(new RegExp('<script id="'+id+'" type="application/json">([\\s\\S]*?)</script>'))[1]);
function replaceOnce(text,from,to){if(!text.includes(from))throw Error('Missing integration anchor: '+from.slice(0,70));return text.replace(from,to);}
// RegExp anchors need an explicit check, not String.includes.
function append(html,source){const re=/\}\)\(\);\s*<\/script>/;if(!re.test(html))throw Error('Missing closure');return html.replace(re,()=>source+'\n})();\n</script>');}
let intake=extract('intake-source');
intake=replaceOnce(intake,"draftId ||= 'stuk-' + Date.now() + '-' + Math.random().toString(36).slice(2);","draftId ||= crypto.randomUUID();");
intake=replaceOnce(intake,'window.parent.NikkiApp.publish(product);','await window.parent.NikkiApp.publish(product);');
intake=replaceOnce(intake,'key:draftId, title:', 'furClass:sel.bont, key:draftId, title:');
intake=replaceOnce(intake,'const images = await Promise.all(photos.map(p => new Promise((resolve, reject) => {',
  'const images = await Promise.all(photos.map(async photo => { const p = {...photo,file:await window.parent.NikkiApp.prepareImage(photo.file)}; return new Promise((resolve, reject) => {');
intake=replaceOnce(intake,'main:p === mainPhoto()', 'path:photo.cloudPath, main:photo === mainPhoto()');
intake=replaceOnce(intake,'    })));','    }); }));');
intake=intake.replaceAll('Toevoegen aan proefwinkel','Opslaan en tonen in boetiek').replaceAll('Wijziging in proefwinkel bijwerken','Wijziging opslaan').replaceAll('Toegevoegd aan de proefwinkel.','Opgeslagen.').replaceAll('Na jouw controle kun je het stuk in de proefwinkel bekijken.','Na jouw controle sla je dit stuk op in de gezamenlijke collectie.');
// The existing capture listener already intercepts sample publication.
intake=replaceOnce(intake,"  sending = true; $('publish').disabled = true;", "  if(!confirm('Zijn foto’s, kenmerken, maten en prijs gecontroleerd? Met opslaan wordt een nieuw stuk zichtbaar in de boetiek. Een verkocht stuk blijft verkocht.')) return;\n  sending = true; $('publish').disabled = true;");
intake=replaceOnce(intake,"}[e && e.code] || 'Er ging iets mis. Probeer het opnieuw of vul zelf in.';", "}[e && e.code] || (e && e.message) || 'Er ging iets mis. Vul zelf in.';");
// Photo analysis uses the same resized images as storage.
intake=replaceOnce(intake,"sample.json(prompt(), { images: files, modelTier: 'default', signal: ctl.signal })", "Promise.all(files.map(f=>window.parent.NikkiApp.prepareImage(f))).then(prepared=>sample.json('', { images: prepared, signal: ctl.signal }))");
intake=append(intake,await read('app/intake-extension.js'));
let shop=extract('shop-source');
shop=replaceOnce(shop,'Math.max(...PIECES.map(p=>p.id))+1','Math.max(0,...PIECES.map(p=>p.id))+1');
shop=replaceOnce(shop,"    var p = byId(current); if($('condition-example'))", "    var p = byId(current); if(!p) return; if($('condition-example'))");
shop=append(shop,await read('app/store-extension.js'));
await mkdir(new URL('dist/cloud/',root),{recursive:true});
for(const file of ['index.html','style.css','config.js','api.js','images.js','main.js'])await copyFile(new URL('app/'+file,root),new URL('dist/cloud/'+file,root));
await writeFile(new URL('dist/cloud/views.js',root),'export const shopSource='+JSON.stringify(shop)+';\nexport const intakeSource='+JSON.stringify(intake)+';\n');
console.log('Built dist/cloud. No credentials or live connections needed.');

import {readFile,writeFile,mkdir,copyFile,readdir} from 'node:fs/promises';
import {replaceExactly} from './build-anchors.mjs';
const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');
const {config}=await import(new URL('app/config.js',root));
if(config.supabasePublishableKey){
  const key=config.supabasePublishableKey;
  let legacyAnon=false;
  try{legacyAnon=JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='anon';}catch{}
  if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)&&!legacyAnon)throw Error('config.js mag alleen een Supabase publishable key of legacy anon key bevatten.');
}
const patchShop=(text,anchor,replacement,count=1)=>replaceExactly(text,anchor,replacement,{file:'cloud store (concept/ontdekken-optie-b.html)',count});
// Nieuw stuk is its own source under app/intake/ (Martijn, 12 and 15 November 2026): a conversation
// with one question at a time. The older prototype (concept/intake-prototype.html) is no longer used here.
const part=(text,marker,replacement)=>{
  if(text.split(marker).length!==2)throw Error('[build] app/intake/intake.html: expected one '+marker);
  return text.replace(marker,()=>replacement);
};
let intake=await read('app/intake/intake.html');
intake=part(intake,'/*INTAKE_STYLE*/',await read('app/intake/style.css'));
intake=part(intake,'/*INTAKE_SCRIPT*/',(await Promise.all(['steps','drafts','main'].map(f=>read('app/intake/'+f+'.js')))).join('\n'));
if(/<\/script/i.test(intake.slice(intake.indexOf('<script>')+8,intake.lastIndexOf('</script>'))))throw Error('[build] app/intake: a script may not contain a closing script tag');
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
// Martijn, 15 november 2026: visitors took the person icon for a customer account. The entrance
// for Nikki and the staff moves to the Shop menu as a quiet last line, "Beheer".
shop=patchShop(shop,'\n    <button type="button" class="ic" aria-label="Mijn account"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg></button>','');
shop=patchShop(shop,'<button type="button" role="menuitem" data-act="menu">Mijn smaak</button>','<button type="button" role="menuitem" data-act="menu">Mijn smaak</button>\n    <button type="button" role="menuitem" data-act="staff" class="menu-staff">Beheer</button>');
shop=patchShop(shop,'<p class="note">Ontdekken, optie B. Ontwerp met voorbeeldgegevens; foto\'s zijn vervangen door tekeningen.</p>','<p class="note" id="catalog-status" role="status">Collectie laden…</p>');
// Martijn, 15 november 2026: the title button shows an i-icon instead of only a small arrow, so
// visitors find the information panel (maten, materiaal).
shop=patchShop(shop,'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B5A50" stroke-width="1.6" aria-hidden="true" style="flex:none"><path d="M6 15l6-6 6 6"/></svg>',
  '<svg id="info-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2E2420" stroke-width="1.5" stroke-linecap="round" aria-hidden="true" style="flex:none"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/></svg>');
// Approved search bar B replaces only the header; the rest remains option B.
shop=patchShop(shop,'<header class="top"><span class="brand">Guaranteed Secondhand Fur</span>\n  </header>',await read('app/store-search.html'));
shop=patchShop(shop,'</style>',await read('app/store-layout.css')+'\n'+await read('app/store-search.css')+'\n</style>');
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

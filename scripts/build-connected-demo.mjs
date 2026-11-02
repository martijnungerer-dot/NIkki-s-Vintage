import {readFile,writeFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const inject=(html,js)=>html.replace(/\}\)\(\);\s*<\/script>/,js+'\n})();\n</script>');
let shop=await read('concept/site-skeleton.html');
// Escape editable strings at markup boundaries, while preserving raw data for textContent.
shop=shop.replaceAll("+ p.title +", "+ escapeAttribute(p.title) +")
 .replaceAll("+ t.key +", "+ escapeAttribute(t.key) +")
 .replaceAll("+ t.value +", "+ escapeAttribute(t.value) +")
 .replaceAll("€ [PRICE]</span>", "' + demoPrice(p) + '</span>")
 .replace("' · € [PRICE]</a>'", "' · ' + demoPrice(p) + '</a>'");
shop=shop.replace("document.querySelectorAll('[data-like-tag=\"' + key + '\"]')", "Array.from(document.querySelectorAll('[data-like-tag]')).filter(b=>b.dataset.likeTag===key)");
shop=shop.replace("    $('p-title').textContent = p.title;", "    $('p-title').textContent = p.title; $('p-price').textContent=demoPrice(p); $('p-description').textContent=p.description||'Voorbeeldbeschrijving'; $('p-details').textContent=(p.details||[]).join(', ');");
shop=shop.replace('<div class="measure" id="p-measure">','<p id="p-description"></p><p id="p-details"></p><div class="measure" id="p-measure">');
shop=shop.replace("    $('gal-track').innerHTML =", "    if(p.images) shots=p.images.map(i=>'<img class=\"photo\" src=\"'+escapeAttribute(i.src)+'\" alt=\"'+escapeAttribute(i.role||'Foto')+'\">');\n    $('gal-track').innerHTML =");
// Do not show a fabricated defect on newly entered garments.
shop=shop.replace('<details><summary>Staat', '<details id="condition-example"><summary>Staat');
shop=shop.replace("    var p = byId(current);", "    var p = byId(current); if($('condition-example')) $('condition-example').hidden=!!p.demoKey;");
shop=shop.replace("  function likesOf(id) { return", "  function likesOf(id) { if(byId(id).demoKey) return liked[id]?1:0; return");
shop=shop.replace('.photo-caption {', '.photo-caption { pointer-events:none;');
shop=shop.replace("    var ph = PHOTOS[p.id];", "    var ph = PHOTOS[p.id]; if(p.demoKey && ph) return '<img class=\"photo\" src=\"'+escapeAttribute(ph.src)+'\" alt=\"'+escapeAttribute(p.title)+'\">';");
shop=inject(shop,await read('demo/store-bridge.js'));
let intake=await read('concept/intake-prototype.html');
intake=intake.replace('Je kledingstuk wordt niet bewaard of naar de winkel gestuurd.', 'Na jouw controle kun je het stuk in de proefwinkel bekijken.');
intake=intake.replace(/  if \(!\(window.claude[\s\S]*?\n\}\)\(\);/, "  off('Vul je stuk zelf in. Automatische fotoanalyse is in deze proef niet aangesloten.');\n})();");
intake=inject(intake,await read('demo/intake-bridge.js'));
const json=s=>JSON.stringify(s).replace(/</g,'\\u003c');
const result=`<!doctype html><html lang="nl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nikki — boetiek en invoer</title><style>
*{box-sizing:border-box}body{margin:0;font:15px/1.4 system-ui;background:#faf4ed;color:#39262c}header{padding:10px 16px;border-bottom:1px solid #cbb;display:flex;flex-wrap:wrap;gap:8px;align-items:center}button{font:inherit;padding:10px 14px;cursor:pointer;border:1px solid #713d50;border-radius:8px;color:#713d50;background:white}button[aria-pressed=true]{background:#713d50;color:white}p{margin:6px 16px}iframe{width:100%;height:calc(100dvh - 150px);border:0;min-height:480px}[hidden]{display:none!important}#status{font-size:13px}#count{margin-left:auto}</style>
<header><strong>Nikki’s proefapp</strong><button data-view="shop" aria-pressed="true">Boetiek</button><button data-view="intake" aria-pressed="false">Nieuw stuk</button><button id="download">Bewaar app met foto's</button><span id="count"></span></header><p>Oefen met invoeren → bekijk je stuk in de carrousel. Geen echte verkoop of e-mails.</p><p id="status" role="status">Je kunt lokaal oefenen. Download je app om ingevulde stukken en foto's mee te nemen.</p>
<iframe id="shop" title="Boetiek"></iframe><iframe id="intake" title="Nieuw stuk invoeren" hidden></iframe>
<script id="saved-products" type="application/json">[]</script><script id="shop-source" type="application/json">${json(shop)}</script><script id="intake-source" type="application/json">${json(intake)}</script><script>${await read('demo/host.js')}</script></html>`;
await writeFile(new URL('../concept/nikki-proefapp.html',import.meta.url),result);
await writeFile(new URL('../concept/NIKKI-PROEFAPP-VOOR-GEMINI.txt',import.meta.url),'Maak van onderstaande complete HTML een Canvas-voorbeeld. Voer de bestaande app uit en behoud de code en vijf stijlen. De invoer is handmatig en voegt stukken met foto, prijs en maten toe aan de lokale carrousel. Geen API-sleutel nodig. Behoud beide gemonteerde frames zodat invoer niet verdwijnt. Als Canvas frames of downloads blokkeert, zeg dat eerlijk: het HTML-bestand kan lokaal in een browser worden geopend. Stel na het tonen één vraag tegelijk over Nikki’s ervaring.\n\n'+result);
console.log('Built connected HTML and Gemini text export.');

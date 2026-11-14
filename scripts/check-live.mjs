// Livecontrole na uitrol (docs/LIVEGANG.md). Draai op je eigen computer:
//   npm run check:live            of   node scripts/check-live.mjs --site https://jouw-site
// Gebruikt alleen de publieke gegevens uit app/config.js; er zijn geen geheimen nodig.
// Kost één aanvraag van de daglimiet van de smaakfunctie (en dus hoogstens één Gemini-aanroep).
// Schrijft niets in de catalogus.

export const DEFAULT_SITE='https://nikki-s-vintage.martijnungerer.workers.dev';
// Publieke velden uit het catalogusrecht (supabase/migrations/…_catalog.sql). Al het andere is een lek.
const PUBLIC_FIELDS=['title','description','priceMinor','material','species','model','colour','length','fit','era','details','measurements','furClass','images'];
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Voert alle controles uit en geeft regels terug: {level:'ok'|'warn'|'fail', text}. */
export async function runChecks({config,site=DEFAULT_SITE,fetch:fetcher=fetch}){
  const out=[],ok=t=>out.push({level:'ok',text:t}),warn=t=>out.push({level:'warn',text:t}),fail=t=>out.push({level:'fail',text:t});
  const url=String(config?.supabaseUrl||'').replace(/\/$/,''),key=String(config?.supabasePublishableKey||'');
  const origin=new URL(site).origin;
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||!key){fail('app/config.js bevat geen geldige Supabase-URL en publieke sleutel.');return out;}
  if(/^sb_secret_|service_role/.test(key)){fail('app/config.js bevat een geheime sleutel. Verwijder die meteen en vervang hem.');return out;}
  const call=async(path,opts={})=>{
    try{const r=await fetcher(url+path,{...opts,headers:{apikey:key,...(opts.headers||{})},signal:AbortSignal.timeout(30000)});
      return {status:r.status,headers:r.headers,text:await r.text()};}
    catch(e){return {status:0,headers:new Headers(),text:String(e?.message||e)};}
  };
  const json=t=>{try{return JSON.parse(t);}catch{return null;}};

  // 1. Website
  try{const r=await fetcher(site,{signal:AbortSignal.timeout(30000)});const t=await r.text();
    if(r.ok&&/<script type="module" src="main.js">/.test(t))ok('Website bereikbaar: '+site);else fail('Website antwoordt niet zoals verwacht ('+r.status+'): '+site);}
  catch{fail('Website niet bereikbaar: '+site);}

  // 2. Catalogus: alleen gepubliceerde stukken, alleen publieke velden
  const list=await call('/rest/v1/garments?select=id,status,data&status=eq.published&limit=1000');
  const rows=json(list.text);
  let published=[];
  if(list.status===0){fail('Supabase niet bereikbaar vanaf deze computer ('+url+'). Controleer je internetverbinding en probeer opnieuw.');return out;}
  if(list.status!==200||!Array.isArray(rows))fail('Catalogus niet leesbaar ('+list.status+').');
  else{
    published=rows.map(r=>r.id);
    ok('Catalogus leesbaar: '+rows.length+(rows.length===1?' gepubliceerd stuk.':' gepubliceerde stukken.'));
    const extra=[...new Set(rows.flatMap(r=>Object.keys(r.data||{})).filter(k=>!PUBLIC_FIELDS.includes(k)))];
    if(extra.length)fail('Niet-publieke velden zichtbaar voor bezoekers: '+extra.join(', '));else ok('Alleen publieke velden zichtbaar.');
    if(rows.some(r=>r.status!=='published'))fail('Er komen niet-gepubliceerde stukken mee.');
    if(!rows.length)warn('Er zijn nog geen gepubliceerde stukken; de smaakfunctie heeft dan niets te rangschikken.');
  }
  const hidden=await call('/rest/v1/garments?select=id&status=neq.published&limit=1');
  const drafts=json(hidden.text);
  if(hidden.status!==200||!Array.isArray(drafts))fail('Afscherming van niet-gepubliceerde stukken niet te controleren ('+hidden.status+').');
  else if(drafts.length)fail('Bezoekers kunnen niet-gepubliceerde stukken lezen.');
  else ok('Niet-gepubliceerde stukken zijn afgeschermd.');

  // 3. Smaakfunctie: herkomst, lege aanvraag, echte aanvraag
  const fn='/functions/v1/personalise',post=(body,from=origin)=>call(fn,{method:'POST',headers:{'Content-Type':'application/json',Origin:from},body:JSON.stringify(body)});
  const evil=await post({profile:{v:1,budget_max_minor:null,prefer:{},avoid:{}}},'https://niet-toegestaan.example');
  if(evil.status===0){fail('Smaakfunctie niet bereikbaar.');return out;}
  if(evil.status===404){fail('Smaakfunctie niet gevonden. Rol uit met: npx supabase functions deploy personalise');return out;}
  if(evil.status===403)ok('Smaakfunctie weigert een onbekende website.');else fail('Smaakfunctie accepteert een onbekende website ('+evil.status+').');
  const pre=await call(fn,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST'}});
  if(pre.status===204&&pre.headers.get('access-control-allow-origin')===origin)ok('Smaakfunctie staat '+origin+' toe.');
  else fail('Smaakfunctie staat '+origin+' niet toe ('+pre.status+'). Zet dit adres in ALLOWED_ORIGINS.');
  const empty=await post({profile:{v:1,budget_max_minor:null,prefer:{},avoid:{}}});
  if(empty.status===200&&json(empty.text)?.source==='none')ok('Leeg profiel kost geen aanvraag.');
  else if(empty.status===503&&json(empty.text)?.error==='NOT_CONFIGURED')fail('Smaakfunctie mist SUPABASE_URL of de serversleutel.');
  else fail('Leeg profiel geeft een onverwacht antwoord ('+empty.status+').');
  const real=await post({profile:{v:1,budget_max_minor:null,prefer:{'price:100-200':0.5},avoid:{}},want_rationale:true});
  const answer=json(real.text);
  if(real.status===429)warn('Daglimiet van de smaakfunctie bereikt; probeer morgen opnieuw.');
  else if(real.status!==200||!Array.isArray(answer?.ranking))fail('Smaakfunctie geeft geen volgorde ('+real.status+(answer?.error?': '+answer.error:'')+'). Is de migratie uitgevoerd (npx supabase db push)?');
  else{
    const ids=answer.ranking.map(r=>r.id),known=new Set(published);
    const valid=ids.every(id=>UUID.test(id)&&known.has(id))&&new Set(ids).size===ids.length;
    const clean=answer.ranking.every(r=>Object.keys(r).sort().join()==='id,photoRole,why'&&(r.photoRole===null||typeof r.photoRole==='string')&&r.why===null);
    if(!valid)fail('De volgorde bevat onbekende of dubbele stukken.');
    else if(!clean||/priceMinor|storage|token/i.test(real.text))fail('Het antwoord bevat meer dan volgorde en fotorol.');
    else if(answer.source==='ai')ok('Gemini rangschikt: '+ids.length+' stukken, '+answer.ranking.filter(r=>r.photoRole).length+' met een gekozen foto.');
    else if(answer.source==='fallback')warn('Smaakfunctie werkt, maar zonder Gemini (terugval). Controleer GEMINI_API_KEY en GEMINI_MODEL, of de Gemini-status.');
    else fail('Onbekende bron in het antwoord: '+answer.source);
  }
  return out;
}

import {pathToFileURL} from 'node:url';
const isCli=!!process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(isCli){
  const at=process.argv.indexOf('--site'),site=at>0?process.argv[at+1]:DEFAULT_SITE;
  const {config}=await import(new URL('../app/config.js',import.meta.url));
  const lines=await runChecks({config,site});
  const mark={ok:'OK     ',warn:'LET OP ',fail:'FOUT   '};
  for(const l of lines)console.log(mark[l.level]+l.text);
  const failed=lines.filter(l=>l.level==='fail').length;
  console.log(failed?'\n'+failed+' controle(s) mislukt. Zie docs/LIVEGANG.md.':'\nAlles in orde'+(lines.some(l=>l.level==='warn')?', met aandachtspunten.':'.'));
  process.exitCode=failed?1:0;
}

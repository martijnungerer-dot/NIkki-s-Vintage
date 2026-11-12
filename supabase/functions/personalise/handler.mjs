// Smaakprofiel, server-proxy (docs/SMAAKPROFIEL.md, onderdeel 5).
// Openbaar zonder login, dus: vaste herkomst, kleine body, daglimiet per bezoeker en in totaal,
// catalogus en budgetfilter op de server, en een AI-antwoord dat alleen nog een volgorde, een
// bestaande fotorol en eventueel een korte uitleg kan bevatten (prompt.mjs).
// Faalt de AI, dan volgt de lokale terugval-volgorde (source "fallback"), zodat de winkel altijd werkt.
import {buildRequest,geminiBody,normalizeRanking,sanitizeSummary} from './prompt.mjs';

const MAX_BODY=8*1024;

async function readBody(req){
  if(Number(req.headers.get('content-length'))>MAX_BODY)throw Error('BODY_SIZE');
  const text=await req.text();
  if(new TextEncoder().encode(text).length>MAX_BODY)throw Error('BODY_SIZE');
  return JSON.parse(text);
}

/** Dagelijks wisselende, niet terug te rekenen sleutel per bezoeker. Het IP-adres wordt niet bewaard. */
export async function clientId(req,secret,day){
  let ip=(req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]||'unknown').trim().slice(0,64).toLowerCase();
  // IPv6: één aansluiting heeft meestal een heel /64-blok; tel dat als één bezoeker (review MED-2).
  if(ip.includes(':')&&!ip.includes('.')){
    const [head,tail='']=ip.split('::');const left=head?head.split(':'):[],right=tail?tail.split(':'):[];
    const full=ip.includes('::')?[...left,...Array(Math.max(0,8-left.length-right.length)).fill('0'),...right]:left;
    ip=full.slice(0,4).map(h=>h.replace(/^0+(?=.)/,'')||'0').join(':')+'::/64';
  }
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const mac=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(day+'|'+ip)));
  return [...mac.slice(0,16)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

export function createHandler({env,fetcher,now=()=>new Date()}){return async req=>{
  const origin=req.headers.get('origin');
  const allowed=(env('ALLOWED_ORIGINS')||'').split(',').map(s=>s.trim()).filter(Boolean);
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  if(!origin||!allowed.includes(origin))return new Response('{"error":"ORIGIN_DENIED"}',{status:403,headers});
  headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Headers']='authorization,apikey,content-type';headers['Access-Control-Allow-Methods']='POST,OPTIONS';
  const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return reply(405,{error:'METHOD'});
  let key;try{key=JSON.parse(env('SUPABASE_SECRET_KEYS')||'{}').default;}catch{}
  key ||= env('SUPABASE_SERVICE_ROLE_KEY');
  // PERSONALISE_MODEL: optioneel een goedkoper model voor rangschikken dan voor fotoanalyse (docs/LIVEGANG.md).
  const url=env('SUPABASE_URL'),geminiKey=env('GEMINI_API_KEY'),model=env('PERSONALISE_MODEL')||env('GEMINI_MODEL');
  if(!url||!key)return reply(503,{error:'NOT_CONFIGURED'});
  let body,summary;
  try{body=await readBody(req);summary=sanitizeSummary(body?.profile);}catch{return reply(400,{error:'BAD_INPUT'});}
  // Geen uitleg zolang de winkel die niet toont (review MED-2): de client kan het tokenverbruik niet opdrijven.
  const wantRationale=false;
  // Zonder voorkeuren of budget valt er niets te rangschikken: geen quotum, catalogus of AI (review MED-2).
  if(!Object.keys(summary.prefer).length&&!Object.keys(summary.avoid).length&&!summary.budget_max_minor)return reply(200,{source:'none',ranking:[]});
  const call=(u,opts={})=>fetcher(u,{...opts,signal:AbortSignal.timeout(20000)});
  const serverHeaders={apikey:key,...(key.startsWith('eyJ')?{Authorization:'Bearer '+key}:{}),'Content-Type':'application/json'};
  try{
    const quota=await call(url+'/rest/v1/rpc/consume_personalise',{method:'POST',headers:serverHeaders,
      body:JSON.stringify({p_client:await clientId(req,key,now().toISOString().slice(0,10))})});
    if(!quota.ok){const q=await quota.json().catch(()=>({}));return reply(q.message?.includes('RATE_LIMIT')?429:503,{error:q.message?.includes('RATE_LIMIT')?'RATE_LIMIT':'QUOTA_UNAVAILABLE'});}
    // Only published pieces; the server reads them itself instead of trusting the browser.
    const catalog=await call(url+'/rest/v1/garments?select=id,status,data&status=eq.published&order=created_at.desc,id.asc&limit=500',{headers:serverHeaders});
    if(!catalog.ok)return reply(503,{error:'CATALOG_UNAVAILABLE'});
    const request=buildRequest({summary,rows:await catalog.json(),wantRationale});
    const fallback=()=>reply(200,{source:'fallback',ranking:normalizeRanking(null,request)});
    if(!request.ids.length)return reply(200,{source:'fallback',ranking:normalizeRanking(null,request)});
    if(!geminiKey||!model||!/^gemini-[a-z0-9.-]+$/.test(model))return fallback();
    let raw;
    try{
      const result=await call('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',{
        method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':geminiKey},body:JSON.stringify(geminiBody(request.payload))});
      if(!result.ok)return fallback();
      const text=(await result.json()).candidates?.[0]?.content?.parts?.filter(p=>!p.thought&&typeof p.text==='string').map(p=>p.text).join('');
      raw=JSON.parse(text);
    }catch{return fallback();}
    return reply(200,{source:'ai',ranking:normalizeRanking(raw,{...request,wantRationale})});
  }catch{return reply(503,{error:'UNAVAILABLE'});}
};}

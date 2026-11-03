import {config} from './config.js';
import {Api} from './api.js';
import {prepareImage} from './images.js';
import {shopSource,intakeSource} from './views.js';
const api=new Api(config);
const $=id=>document.getElementById(id);
const editVersions=new Map(); let rows=[],staff=false,busy=false;
const say=message=>{$('status').textContent=message;};
function show(screen){
  if(screen==='intake'&&!staff)screen='manage';
  for(const name of ['shop','intake','manage'])$(name).hidden=name!==screen;
  document.querySelectorAll('[data-screen]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.screen===screen)));
}
function controls(){ $('login').hidden=staff;$('new').hidden=!staff;$('logout').hidden=!api.session; }
function mount(frame,source){return new Promise(resolve=>{frame.addEventListener('load',resolve,{once:true});frame.srcdoc=source;});}
async function hydrate(row){return {...row.data,key:row.id,images:await Promise.all(row.data.images.map(async i=>({...i,src:await api.imageUrl(i.path)})))};}
async function refresh(){
  const next=await api.list();
  const publicRecords=[];
  for(const row of next.filter(r=>r.status==='published')) publicRecords.push(await hydrate(row));
  rows=next;
  $('shop').contentWindow.NikkiStore.replace(publicRecords.reverse());
  $('items').replaceChildren();$('empty').hidden=!staff||rows.length>0;
  if(staff)for(const row of rows){
    const item=document.createElement('li');const label=document.createElement('span');
    label.textContent=row.data.title+' — '+(row.status==='sold'?'Verkocht':'Beschikbaar');item.append(label);
    const edit=document.createElement('button');edit.textContent='Bewerken';
    edit.addEventListener('click',()=>action(async()=>{
      if(!confirm('Dit opent het opgeslagen stuk. Eventuele niet-opgeslagen invoer wordt vervangen. Doorgaan?'))return;
      await $('intake').contentWindow.NikkiIntake.load(await hydrate(row));editVersions.set(row.id,row.version);show('intake');say('Stuk geopend.');
    }));item.append(edit);
    if(row.status==='published'){
      const sold=document.createElement('button');sold.textContent='Markeer verkocht';
      sold.addEventListener('click',()=>action(async()=>{
        if(!confirm('Markeer “'+row.data.title+'” als verkocht? Het verdwijnt uit de beschikbare collectie.'))return;
        await api.sold(row.id,row.version);await refresh();say('Als verkocht opgeslagen.');
      }));item.append(sold);
    }
    $('items').append(item);
  }
}
async function action(task){
  if(busy)return;busy=true;
  try{await task();}catch(error){say(error.message);}finally{busy=false;controls();}
}
window.NikkiApp={
  prepareImage,
  async analyse(files,signal){
    if(!staff)throw Error('Log eerst in.');
    try{return await api.analyse(files,signal);}catch(e){if(e.name==='AbortError')throw Object.assign(new Error('Analyse gestopt.'),{code:'cancelled'});throw e;}
  },
  async publish(product){
    if(!staff)throw Error('Log eerst in.');
    const saved=await api.save(product,editVersions.get(product.key)||0);
    editVersions.set(product.key,saved.version);
    try{await refresh();show('shop');say(saved.status==='sold'?'Wijziging opgeslagen. Dit stuk blijft verkocht.':product.title+' is opgeslagen en staat in de boetiek.');}
    catch{say('Het stuk is opgeslagen. De collectie kon niet worden vernieuwd; probeer Collectie vernieuwen.');}
  }
};
document.querySelectorAll('[data-screen]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.screen)));
$('reload').addEventListener('click',()=>action(async()=>{await refresh();say('Collectie vernieuwd.');}));
$('login').addEventListener('submit',event=>{event.preventDefault();action(async()=>{
  await api.login($('email').value,$('password').value);$('password').value='';staff=true;controls();await refresh();say('Ingelogd. Je kunt nu stukken invoeren.');
});});
$('logout').addEventListener('click',()=>action(async()=>{try{await api.logout();}finally{location.reload();}}));
await Promise.all([mount($('shop'),shopSource),mount($('intake'),intakeSource)]);
if(!api.configured()){
  say('Deze versie moet nog worden verbonden. Volg docs/SUPABASE-START.md in de projectmap.');$('login').querySelector('button').disabled=true;
}else await action(async()=>{
  if(api.session){try{await api.request('/rest/v1/rpc/require_staff',{method:'POST',body:{}});staff=true;}catch{api.keep(null);}}
  controls();await refresh();say('Collectie geladen.');
});
// Renew expiring image URLs; don't overwrite the in-progress intake form.
setInterval(()=>{if(!document.hidden&&!busy)action(refresh);},45*60*1000);

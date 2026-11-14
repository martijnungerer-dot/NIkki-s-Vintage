import {createCollection} from './collection.js';
import {setupLogin,restoreSession} from './login.js';
import {setupHeader,updateControls,syncStoreStyle} from './header.js';

export function createAdmin({api,$,show}) {
  const state={editVersions:new Map(),rows:[],staff:false,busy:false,lastRefresh:0,skipped:0};
  const shopStatus=(message,status='success')=>{
    const photoProblem=status==='success' && state.skipped>0;
    $('shop').contentWindow.NikkiStore?.status(photoProblem?'Sommige foto’s zijn tijdelijk niet bereikbaar.':message,photoProblem?'error':status);
  };
  const say=(message,status='success')=>{
    $('status').textContent=message;
    $('status').hidden=status==='success'&&!state.skipped;
    if(status==='error'&&!state.staff)login.error(message);
    shopStatus(message,status);
  };
  const controls=()=>{updateControls({api,$,state});login.busy(state.busy,api.configured());};
  async function action(task){
    if(state.busy)return;state.busy=true;controls();
    try{await task();}catch(error){say(error.message,'error');}finally{state.busy=false;controls();}
  }
  const loaded=base=>base+(state.staff&&state.skipped?' '+state.skipped+(state.skipped===1?' stuk wordt':' stukken worden')+' niet getoond omdat de foto’s niet bereikbaar zijn.':'');
  const context={api,$,state,show,say,shopStatus,action,controls,loaded};
  const collection=createCollection(context);
  setupHeader({$,show,
    reload:()=>action(async()=>{await collection.refresh();say(loaded('Collectie vernieuwd.'));}),
    logout:()=>action(async()=>{try{await api.logout();}finally{location.reload();}})
  });
  const login=setupLogin({$,submit:()=>action(async()=>{
    login.error('');
    // Only authentication errors belong to the form. A later refresh failure
    // must remain visible after the form has been hidden.
    try{await api.login($('email').value,$('password').value);}
    catch(error){login.error(error.message);return;}
    login.resetPassword();
    state.staff=true;controls();
    await collection.refresh();say('Ingelogd. Je kunt nu stukken invoeren.');
  })});
  async function start(){
    syncStoreStyle($);controls();
    if(!api.configured()){
      say('De boetiek wordt ingericht. Inloggen en opslaan zijn nog niet aangesloten.','error');
    }else await action(async()=>{
      await restoreSession(context);
      controls();await collection.refresh();say(loaded('Collectie geladen.'));
    });
    collection.startRenewal();
  }
  return {state,say,refresh:collection.refresh,start};
}

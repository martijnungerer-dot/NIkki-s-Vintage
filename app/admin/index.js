import {createCollection} from './collection.js';
import {bindLogin,restoreSession} from './login.js';
import {bindHeader,updateControls,syncStoreStyle} from './header.js';

export function createAdmin({api,$,show}) {
  const state={editVersions:new Map(),rows:[],staff:false,busy:false,lastRefresh:0,skipped:0};
  const shopStatus=(message,status='success')=>{
    const photoProblem=status==='success' && state.skipped>0;
    $('shop').contentWindow.NikkiStore?.status(photoProblem?'Sommige foto’s zijn tijdelijk niet bereikbaar.':message,photoProblem?'error':status);
  };
  const say=(message,status='success')=>{$('status').textContent=message;shopStatus(message,status);};
  const controls=()=>updateControls({api,$,state});
  async function action(task){
    if(state.busy)return;state.busy=true;
    try{await task();}catch(error){say(error.message,'error');}finally{state.busy=false;controls();}
  }
  const loaded=base=>base+(state.staff&&state.skipped?' '+state.skipped+(state.skipped===1?' stuk wordt':' stukken worden')+' niet getoond omdat de foto’s niet bereikbaar zijn.':'');
  const context={api,$,state,show,say,shopStatus,action,controls,loaded};
  const collection=createCollection(context);
  const handlers={...context,refresh:collection.refresh};
  bindHeader(handlers);
  bindLogin(handlers);
  async function start(){
    syncStoreStyle($);
    if(!api.configured()){
      say('De boetiek wordt ingericht. Inloggen en opslaan zijn nog niet aangesloten.','error');$('login').querySelector('button').disabled=true;$('reload').disabled=true;
    }else await action(async()=>{
      await restoreSession(context);
      controls();await collection.refresh();say(loaded('Collectie geladen.'));
    });
    collection.startRenewal();
  }
  return {state,say,refresh:collection.refresh,start};
}

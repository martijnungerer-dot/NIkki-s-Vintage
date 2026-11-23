import {createCollection} from './collection.js';
import {setupLogin,restoreSession,takeRecovery,MIN_PASSWORD} from './login.js';
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
    // Unfinished pieces stay on this device unless Nikki chooses to remove them (they can hold photos only for checking).
    logout:()=>action(async()=>{
      // Counts unsaved edits of saved pieces too, not only the red concept cards.
      const count=await collection.draftCount();
      const keep=count>0&&confirm('Je hebt '+count+(count===1?' onafgemaakt stuk of niet-opgeslagen wijziging':' onafgemaakte stukken of niet-opgeslagen wijzigingen')+' op dit toestel. Bewaren voor de volgende keer? Kies Annuleren om '+(count===1?'het':'ze')+' te wissen.');
      try{if(!keep)await window.NikkiApp?.clearDraft?.();await api.logout();}finally{location.reload();}
    })
  });
  const login=setupLogin({$,submit:()=>action(async()=>{
    login.error('');
    // Only authentication errors belong to the form. A later refresh failure
    // must remain visible after the form has been hidden.
    try{await api.login($('email').value,$('password').value);}
    catch(error){login.error(error.message);if(error.badLogin)$('password').focus();return;}
    login.resetPassword();
    state.staff=true;controls();window.NikkiApp?.staffReady?.();
    await collection.refresh();say('Ingelogd. Je kunt nu stukken invoeren.');
  }),
  forgot:()=>action(async()=>{
    const email=$('email').value.trim();
    if(!$('email').checkValidity()||!email){login.error('Vul je e-mailadres in.');return;}
    try{await api.recover(email,location.origin+location.pathname);}
    catch(error){login.error(error.message);return;}
    login.done('Als dit adres bij ons bekend is, staat er zo een e-mail klaar. Open de link op dit toestel om een nieuw wachtwoord te kiezen.');
  }),
  reset:()=>action(async()=>{
    const password=$('password').value;
    if(password.length<MIN_PASSWORD){login.error('Kies een wachtwoord van minstens '+MIN_PASSWORD+' tekens.');return;}
    try{await api.setPassword(recovery,password);}
    catch(error){
      login.error(error.message);
      if(error.expired){recovery=null;login.setMode('forgot');login.error(error.message);}
      return;
    }
    recovery=null;login.resetPassword();login.setMode('login');
    state.staff=true;controls();window.NikkiApp?.staffReady?.();
    await collection.refresh();say('Je nieuwe wachtwoord is opgeslagen. Je bent ingelogd.');
  })});
  let recovery=null;
  async function start(){
    const link=api.configured()?takeRecovery():null;
    syncStoreStyle($);controls();
    if(!api.configured()){
      say('De boetiek wordt ingericht. Inloggen en opslaan zijn nog niet aangesloten.','error');
    }else if(link){
      // Opened from a reset e-mail: ask for the new password before anything else.
      show('manage');
      if(link.session){recovery=link.session;login.setMode('reset');$('password').focus();}
      else{login.setMode('forgot');login.error(link.error);}
      await action(async()=>{await collection.refresh();say(loaded('Collectie geladen.'));});
    }else await action(async()=>{
      await restoreSession(context);
      controls();await collection.refresh();say(loaded('Collectie geladen.'));
    });
    collection.startRenewal();
  }
  return {state,say,refresh:collection.refresh,start};
}

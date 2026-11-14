// One login form with three modes: inloggen, resetlink vragen and nieuw wachtwoord kiezen.
// The same fields and buttons are reused so every mode looks the same.
const MODES={
  login:{intro:'Log in voor jouw collectie.',label:'Wachtwoord',submit:'Inloggen',busy:'Inloggen…',autocomplete:'current-password'},
  forgot:{intro:'Vul je e-mailadres in. Je krijgt een e-mail met een link om een nieuw wachtwoord te kiezen.',submit:'Stuur de link',busy:'Versturen…'},
  reset:{intro:'Kies een nieuw wachtwoord van minstens 8 tekens.',label:'Nieuw wachtwoord',submit:'Wachtwoord opslaan',busy:'Opslaan…',autocomplete:'new-password'}
};
export const MIN_PASSWORD=8;

export function setupLogin({$,submit,forgot,reset}) {
  const form=$('login'), button=form.querySelector('[type=submit]');
  const email=$('email'), password=$('password'), toggle=$('password-toggle'), switcher=$('forgot');
  let mode='login', busyNow=false, configuredNow=true;
  function visibility(visible){
    password.type=visible?'text':'password';
    toggle.textContent=visible?'Verbergen':'Tonen';
    toggle.setAttribute('aria-label',visible?'Wachtwoord verbergen':'Wachtwoord tonen');
  }
  function setMode(next){
    mode=next;const m=MODES[mode];
    form.dataset.mode=mode;
    $('login-intro').textContent=m.intro;
    email.required=mode!=='reset';password.required=mode!=='forgot';
    if(m.label)$('password-label').textContent=m.label;
    if(m.autocomplete)password.autocomplete=m.autocomplete;
    switcher.textContent=mode==='login'?'Wachtwoord vergeten?':'Terug naar inloggen';
    switcher.hidden=mode==='reset';
    $('login-error').textContent='';$('login-done').textContent='';
    paint();
  }
  function paint(){
    const m=MODES[mode];
    button.disabled=busyNow||!configuredNow;
    button.textContent=busyNow?m.busy:m.submit;
    toggle.disabled=busyNow;switcher.disabled=busyNow;
    if(busyNow)form.setAttribute('aria-busy','true');else form.removeAttribute('aria-busy');
  }
  toggle.addEventListener('click',()=>visibility(password.type==='password'));
  switcher.addEventListener('click',()=>{setMode(mode==='login'?'forgot':'login');email.focus();});
  form.addEventListener('submit',event=>{
    event.preventDefault();if(button.disabled)return;
    if(mode==='forgot')forgot();else if(mode==='reset')reset();else submit();
  });
  setMode('login');
  return {
    get mode(){return mode;},
    setMode,
    error:message=>{$('login-done').textContent='';$('login-error').textContent=message;},
    done:message=>{$('login-error').textContent='';$('login-done').textContent=message;},
    resetPassword(){password.value='';visibility(false);},
    busy(busy,configured){busyNow=busy;configuredNow=configured;paint();}
  };
}

// Supabase sends the recovery link back to this page with the session (or an error) in the
// URL fragment. Read it once and remove it straight away, so the token does not stay in the
// address bar, the browser history or a shared link.
export function takeRecovery(win=window) {
  const hash=win.location.hash.replace(/^#/,'');
  if(!hash)return null;
  const p=new URLSearchParams(hash);
  const recovery=p.get('type')==='recovery'&&p.get('access_token');
  const failed=p.get('error')||p.get('error_code');
  if(!recovery&&!failed)return null;
  win.history.replaceState(null,'',win.location.pathname+win.location.search);
  if(failed||!p.get('refresh_token'))return {error:'Deze link is verlopen of al gebruikt. Vraag hieronder een nieuwe aan.'};
  const expiresIn=Number(p.get('expires_in'))||3600;
  return {session:{access_token:p.get('access_token'),refresh_token:p.get('refresh_token'),token_type:'bearer',
    expires_in:expiresIn,expires_at:Number(p.get('expires_at'))||Date.now()/1000+expiresIn}};
}

export async function restoreSession({api,state}) {
  if(api.session){try{await api.request('/rest/v1/rpc/require_staff',{method:'POST',body:{}});state.staff=true;}catch{api.keep(null);}}
}

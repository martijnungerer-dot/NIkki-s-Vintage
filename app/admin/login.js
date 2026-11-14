export function setupLogin({$,submit}) {
  const form=$('login'), button=form.querySelector('[type=submit]');
  const password=$('password'), toggle=$('password-toggle');
  function visibility(visible){
    password.type=visible?'text':'password';
    toggle.textContent=visible?'Verbergen':'Tonen';
    toggle.setAttribute('aria-label',visible?'Wachtwoord verbergen':'Wachtwoord tonen');
  }
  toggle.addEventListener('click',()=>visibility(password.type==='password'));
  form.addEventListener('submit',event=>{
    event.preventDefault();if(!button.disabled)submit();
  });
  return {
    error:message=>{$('login-error').textContent=message;},
    resetPassword(){password.value='';visibility(false);},
    busy(busy,configured){
      button.disabled=busy||!configured;
      button.textContent=busy?'Inloggen…':'Inloggen';
      toggle.disabled=busy;
      if(busy)form.setAttribute('aria-busy','true');else form.removeAttribute('aria-busy');
    }
  };
}

export async function restoreSession({api,state}) {
  if(api.session){try{await api.request('/rest/v1/rpc/require_staff',{method:'POST',body:{}});state.staff=true;}catch{api.keep(null);}}
}

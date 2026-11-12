export function bindLogin({api,$,state,action,controls,refresh,say}) {
  $('login').addEventListener('submit',event=>{event.preventDefault();action(async()=>{
    await api.login($('email').value,$('password').value);$('password').value='';state.staff=true;controls();await refresh();say('Ingelogd. Je kunt nu stukken invoeren.');
  });});
  $('logout').addEventListener('click',()=>action(async()=>{try{await api.logout();}finally{location.reload();}}));
}

export async function restoreSession({api,state}) {
    if(api.session){try{await api.request('/rest/v1/rpc/require_staff',{method:'POST',body:{}});state.staff=true;}catch{api.keep(null);}}
}

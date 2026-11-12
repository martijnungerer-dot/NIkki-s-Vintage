export function setupLogin({login}) {
  const form=document.getElementById('login'), submit=form.querySelector('[type=submit]');
  const password=document.getElementById('password'), toggle=document.getElementById('password-toggle');
  toggle.addEventListener('click',()=>{
    const visible=password.type==='password';password.type=visible?'text':'password';
    toggle.textContent=visible?'Verbergen':'Tonen';toggle.setAttribute('aria-pressed',String(visible));
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(submit.disabled)return;
    const error=document.getElementById('login-error');error.textContent='';
    submit.disabled=true;submit.textContent='Inloggen…';form.setAttribute('aria-busy','true');
    try {await login(document.getElementById('email').value,password.value);password.value='';}
    catch(e) {error.textContent=e.message;error.focus();}
    finally {submit.disabled=false;submit.textContent='Inloggen';form.removeAttribute('aria-busy');}
  });
}

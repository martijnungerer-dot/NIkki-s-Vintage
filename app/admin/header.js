import {icon} from './icons.js';

export function updateControls({api,$,state}) {
  $('manage-title').textContent=state.staff?'Jouw collectie':'Welkom terug';
  $('manage').dataset.auth=state.staff?'staff':'guest';
  $('login').hidden=state.staff;$('trial-note').hidden=state.staff;
  $('manage-actions').hidden=!state.staff;
  $('new').hidden=!state.staff;$('logout').hidden=!api.session;
  for(const id of ['new','reload','logout'])$(id).disabled=state.busy||!api.configured();
  document.querySelectorAll('#items .piece button, #items .piece input').forEach(el=>{
    el.disabled=el.dataset.locked==='true'||(state.busy&&!el.classList.contains('piece-undo'));
  });
}

export function setupHeader({$,show,reload,logout}) {
  document.querySelectorAll('[data-icon]').forEach(el=>el.prepend(icon(el.dataset.icon)));
  document.querySelectorAll('button[data-screen]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.screen)));
  $('reload').addEventListener('click',reload);
  $('logout').addEventListener('click',logout);
}

export function syncStoreStyle($){
  const shopRoot=$('shop').contentDocument.documentElement;
  const style=$('shop').contentWindow.getComputedStyle(shopRoot);
  for(const name of ['bg','fg','muted','line'])document.documentElement.style.setProperty('--'+name,style.getPropertyValue('--'+name));
  document.documentElement.style.colorScheme=style.colorScheme;
}

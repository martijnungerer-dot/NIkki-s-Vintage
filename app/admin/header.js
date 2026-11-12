import {icon} from './icons.js';
export function setupHeader({show,reload,logout}) {
  document.querySelectorAll('[data-icon]').forEach(el=>el.prepend(icon(el.dataset.icon)));
  document.querySelectorAll('button[data-screen]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.screen)));
  document.getElementById('reload').addEventListener('click',reload);
  document.getElementById('logout').addEventListener('click',logout);
}

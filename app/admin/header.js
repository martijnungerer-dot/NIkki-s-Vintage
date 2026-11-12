export function updateControls({api,$,state}) {
    $('login').hidden=state.staff;$('new').hidden=!state.staff;$('logout').hidden=!api.session;
}

export function bindHeader({$,show,action,refresh,say,loaded}) {
  document.querySelectorAll('button[data-screen]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.screen)));
  $('reload').addEventListener('click',()=>action(async()=>{await refresh();say(loaded('Collectie vernieuwd.'));}));
}

export function syncStoreStyle($){
  // The management shell uses the palette of the chosen storefront.
  const shopRoot=$('shop').contentDocument.documentElement;
  const syncStyle=()=>{
    const style=$('shop').contentWindow.getComputedStyle(shopRoot);
    for(const name of ['bg','fg','muted','line'])document.documentElement.style.setProperty('--'+name,style.getPropertyValue('--'+name));
    document.documentElement.style.colorScheme=style.colorScheme;
  };
  syncStyle();
}

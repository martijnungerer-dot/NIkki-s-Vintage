// Losse ontwerpmock: geen verbindingen, inloggegevens, collectie of opslag.
const $ = id => document.getElementById(id);
const state = new URLSearchParams(location.search).get('state');
const signedIn = ['empty', 'menu'].includes(state);
$('login').hidden = signedIn;
$('login-intro').hidden = signedIn;
$('empty').hidden = !signedIn;
$('new').disabled = !signedIn;
$('logout').hidden = !signedIn;
function panel(open, restoreFocus = false) {
  $('account-panel').hidden = !open;
  $('account').setAttribute('aria-expanded', String(open));
  if (restoreFocus) $('account').focus();
}
$('account').addEventListener('click', () => panel($('account-panel').hidden));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') panel(false, !$('account-panel').hidden);
});
document.addEventListener('click', event => {
  if (!event.target.closest('.account-wrap')) panel(false);
});
document.addEventListener('focusin', event => {
  if (!event.target.closest('.account-wrap')) panel(false);
});
document.querySelector('[data-close]').addEventListener('click', () => panel(false, true));
$('logout').addEventListener('click', () => { location.search = ''; });
function loginError() {
  $('login-error').textContent = 'Inloggen is niet gelukt. Controleer je e-mailadres en wachtwoord.';
  $('login-error').hidden = false;
  $('email').setAttribute('aria-describedby', 'login-error');
  $('password').setAttribute('aria-describedby', 'login-error');
}
$('login').addEventListener('submit', event => {
  event.preventDefault();
  loginError();
  $('email').focus();
});
$('reload').addEventListener('click', () => {
  $('status').textContent = 'Collectie vernieuwd.';
  clearTimeout(window.statusTimer);
  window.statusTimer = setTimeout(() => { $('status').textContent = ''; }, 5000);
});
if (state === 'error') loginError();
if (state === 'menu') panel(true);

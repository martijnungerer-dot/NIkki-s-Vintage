// Review kit: let testers mark part of a screen in yellow and leave a remark, change request or question.
// Self-contained, no dependencies, reusable in other apps. See README.md in this folder.
//
//   const kit = createReviewKit({ save, isEnabled, context });
//   save(kind, body, context) -> Promise   stores one note ('opmerking' | 'aanpassing' | 'vraag')
//   isEnabled() -> boolean                 the button shows only while true (checked every second)
//   context() -> object                    extra app information stored with each note (keep it small)
//   place() -> {top,right,bottom,left}     optional: where the button sits (CSS lengths), checked every second
//   kit.destroy()                          removes everything again
//
// Never stored: input or textarea values (so no passwords or typed data), only visible text of the marked element.

const KINDS = [['opmerking', 'Opmerking'], ['aanpassing', 'Aanpassing'], ['vraag', 'Vraag']];
const CSS = `
.rk-host [hidden]{display:none!important}
.rk-fab{position:fixed;left:calc(12px + env(safe-area-inset-left,0px));bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:2147483600;width:52px;height:52px;border-radius:26px;border:1px solid var(--rk-line);background:var(--rk-mark);color:var(--rk-fg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.18);cursor:pointer;padding:0}
.rk-fab:focus-visible,.rk-sheet button:focus-visible,.rk-bar button:focus-visible,.rk-sheet textarea:focus-visible{outline:2px solid var(--rk-fg);outline-offset:2px}
.rk-layer{position:fixed;inset:0;z-index:2147483601;cursor:crosshair;touch-action:none;background:rgba(0,0,0,.08)}
.rk-bar{position:fixed;left:0;right:0;top:0;z-index:2147483603;display:flex;align-items:center;gap:12px;padding:calc(8px + env(safe-area-inset-top,0px)) max(12px,env(safe-area-inset-right,0px)) 8px max(12px,env(safe-area-inset-left,0px));background:var(--rk-bg);color:var(--rk-fg);border-bottom:1px solid var(--rk-line);font:16px/1.4 var(--rk-font)}
.rk-bar{pointer-events:none}.rk-bar button{pointer-events:auto}.rk-bar span{flex:1}
.rk-mark{position:fixed;z-index:2147483602;background:var(--rk-mark-fill);border:2px solid var(--rk-mark-line);border-radius:4px;pointer-events:none}
.rk-sheet{position:fixed;left:0;right:0;bottom:0;z-index:2147483604;background:var(--rk-bg);color:var(--rk-fg);border-top:1px solid var(--rk-line);border-radius:16px 16px 0 0;box-shadow:0 -6px 24px rgba(0,0,0,.15);padding:16px max(16px,env(safe-area-inset-right,0px)) calc(16px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));display:flex;flex-direction:column;gap:12px;font:16px/1.4 var(--rk-font);max-width:560px;margin:0 auto}
.rk-kinds{display:flex;gap:8px;flex-wrap:wrap}
.rk-sheet button,.rk-bar button{min-height:44px;padding:0 16px;border-radius:22px;border:1px solid var(--rk-line);background:transparent;color:var(--rk-fg);font:inherit;cursor:pointer}
.rk-sheet button[aria-pressed=true],.rk-sheet .rk-save{background:var(--rk-fg);color:var(--rk-bg);border-color:var(--rk-fg)}
.rk-sheet textarea{min-height:96px;border:1px solid var(--rk-line);border-radius:10px;padding:10px 12px;font:inherit;background:#fff;color:var(--rk-fg);resize:vertical}
.rk-actions{display:flex;gap:8px;justify-content:flex-end}
.rk-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:2147483605;background:var(--rk-fg);color:var(--rk-bg);padding:10px 16px;border-radius:22px;font:16px/1.4 var(--rk-font);max-width:calc(100% - 32px)}
.rk-host{--rk-bg:#FAF6F0;--rk-fg:#2E2420;--rk-line:#E3DAD0;--rk-mark:#FFE066;--rk-mark-fill:rgba(255,214,0,.35);--rk-mark-line:#D4A800;--rk-font:'Newsreader',Georgia,serif}
@media (prefers-reduced-motion:no-preference){.rk-toast{transition:opacity .3s}}`;
const PEN = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h6"/><path d="M14.5 4.5l5 5L10 19H5v-5z"/></svg>';
const QUEUE = 'review-kit-queue';

export function createReviewKit({save, isEnabled = () => true, context = () => ({}), place = null, win = window} = {}) {
  if (typeof save !== 'function') throw Error('createReviewKit needs a save(kind, body, context) function');
  const doc = win.document, host = doc.createElement('div');
  host.className = 'rk-host';
  host.innerHTML = '<style>' + CSS + '</style><button type="button" class="rk-fab" aria-label="Opmerking maken: markeer iets op het scherm" hidden>' + PEN + '</button>';
  doc.body.appendChild(host);
  const fab = host.querySelector('.rk-fab');
  let open = null, timer = 0, flushing = false;

  const readQueue = () => { try { return JSON.parse(win.localStorage.getItem(QUEUE) || '[]'); } catch { return []; } };
  const writeQueue = list => { try { list.length ? win.localStorage.setItem(QUEUE, JSON.stringify(list)) : win.localStorage.removeItem(QUEUE); return true; } catch { return false; } };
  async function flush() {
    if (flushing || !isEnabled()) return;
    flushing = true;
    try {
      let list = readQueue();
      while (list.length) { const n = list[0]; await save(n.kind, n.body, n.context); list = list.slice(1); writeQueue(list); }
    } catch { /* stays queued; retried later */ } finally { flushing = false; }
  }
  function toast(text) {
    const t = doc.createElement('div'); t.className = 'rk-toast'; t.setAttribute('role', 'status'); t.textContent = text;
    host.appendChild(t); win.setTimeout(() => t.remove(), 3000);
  }
  function position() {
    if (!place) return;
    let p = null; try { p = place(); } catch { p = null; }
    if (!p) return;
    for (const side of ['top', 'right', 'bottom', 'left']) fab.style[side] = p[side] == null ? 'auto' : p[side];
  }
  function check() { const on = !!isEnabled(); fab.hidden = !on || !!open; if (!on && open) close(); if (on) { position(); flush(); } }
  timer = win.setInterval(check, 1000); check();

  // Describes the element under a point, also inside same-origin iframes. Never reads form values.
  function describe(x, y) {
    let d = doc, el = null, frame = null, ox = 0, oy = 0;
    for (let depth = 0; depth < 3; depth++) {
      el = d.elementFromPoint(x - ox, y - oy);
      if (!el || el.tagName !== 'IFRAME') break;
      let inner = null; try { inner = el.contentDocument; } catch { inner = null; }
      if (!inner) break;
      const r = el.getBoundingClientRect(); frame = el.id || el.name || el.title || 'iframe'; ox += r.left; oy += r.top; d = inner;
    }
    if (!el) return {frame};
    const field = el.closest('input,textarea,select');
    const named = el.closest('[aria-label],[id]');
    const text = field ? '' : (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    return {frame, tag: el.tagName.toLowerCase(), id: el.id || undefined, label: (named && named.getAttribute('aria-label')) || undefined,
      near: named && named !== el ? named.id || undefined : undefined, text: text || undefined};
  }

  function close() {
    if (!open) return;
    open.parts.forEach(p => p.remove()); doc.removeEventListener('keydown', open.onKey, true);
    const back = open.back; open = null; check(); if (back && back.focus) back.focus();
  }
  function start() {
    const layer = doc.createElement('div'), bar = doc.createElement('div'), mark = doc.createElement('div');
    layer.className = 'rk-layer'; mark.className = 'rk-mark'; mark.hidden = true; bar.className = 'rk-bar';
    bar.innerHTML = '<span>Sleep over wat je bedoelt, of tik erop.</span><button type="button">Annuleer</button>';
    const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
    open = {parts: [layer, mark, bar], onKey, back: fab};
    host.append(layer, mark, bar); fab.hidden = true;
    doc.addEventListener('keydown', onKey, true);
    bar.querySelector('button').addEventListener('click', close);
    bar.querySelector('button').focus();
    let from = null;
    const box = (a, b) => ({x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y)});
    const show = r => { Object.assign(mark.style, {left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px'}); mark.hidden = false; };
    layer.addEventListener('pointerdown', e => { from = {x: e.clientX, y: e.clientY}; bar.style.visibility = 'hidden'; try { layer.setPointerCapture(e.pointerId); } catch {} });
    layer.addEventListener('pointermove', e => { if (from) show(box(from, {x: e.clientX, y: e.clientY})); });
    layer.addEventListener('pointerup', e => {
      if (!from) return;
      let r = box(from, {x: e.clientX, y: e.clientY}); from = null; bar.style.visibility = '';
      layer.style.pointerEvents = 'none';
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2, target = describe(cx, cy);
      if (r.w < 12 && r.h < 12) r = {x: Math.max(0, cx - 40), y: Math.max(0, cy - 24), w: 80, h: 48};
      show(r); layer.style.pointerEvents = '';
      sheet(r, target);
    });
  }
  function sheet(rect, target) {
    const s = doc.createElement('div'); s.className = 'rk-sheet'; s.setAttribute('role', 'dialog'); s.setAttribute('aria-label', 'Opmerking bij de markering');
    s.innerHTML = '<div class="rk-kinds" role="group" aria-label="Soort">' + KINDS.map(([k, l], i) => '<button type="button" data-kind="' + k + '" aria-pressed="' + (i === 0) + '">' + l + '</button>').join('') +
      '</div><label for="rk-text" style="position:absolute;left:-9999px">Jouw opmerking</label><textarea id="rk-text" placeholder="Wat wil je kwijt?" maxlength="4000"></textarea>' +
      '<div class="rk-actions"><button type="button" class="rk-cancel">Annuleer</button><button type="button" class="rk-save">Bewaar</button></div>';
    host.appendChild(s); open.parts.push(s);
    open.parts[0].style.pointerEvents = 'none'; open.parts[2].hidden = true; // the sheet has its own Annuleer
    let kind = 'opmerking';
    s.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', () => {
      kind = b.dataset.kind; s.querySelectorAll('[data-kind]').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
    }));
    const text = s.querySelector('textarea'); text.focus();
    s.querySelector('.rk-cancel').addEventListener('click', close);
    s.querySelector('.rk-save').addEventListener('click', async () => {
      const body = text.value.trim();
      if (!body) { text.focus(); toast('Typ eerst je opmerking.'); return; }
      let extra = {}; try { extra = context() || {}; } catch {}
      const note = {kind, body, context: {...extra, target, rect: {x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.w), h: Math.round(rect.h)},
        viewport: {w: win.innerWidth, h: win.innerHeight}, page: win.location.pathname + win.location.hash, at: new Date().toISOString()}};
      const btn = s.querySelector('.rk-save'); btn.disabled = true; btn.textContent = 'Bewaren…';
      try { await save(note.kind, note.body, note.context); close(); toast('Bewaard. Dank je!'); }
      catch {
        const queued = writeQueue([...readQueue(), note]);
        close(); toast(queued ? 'Nog niet verstuurd. Hij wordt later vanzelf opnieuw verstuurd.' : 'Bewaren lukte niet. Probeer het opnieuw.');
      }
    });
  }
  fab.addEventListener('click', start);
  return {destroy() { win.clearInterval(timer); close(); host.remove(); }, flush, start};
}

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
  let open = null, timer = 0;

  // Every note is stored on its own under review-kit-queue:<clientId> BEFORE it is sent, so a note added while
  // another one is being sent can never be overwritten. The clientId also makes a repeated send harmless on the server.
  const PREFIX = QUEUE + ':', RETRY_MS = 10000;
  const sending = new Set(), retryAt = new Map();
  let destroyed = false, migrating = false;
  const store = () => { try { return win.localStorage; } catch { return null; } };
  const newId = () => {
    const c = win.crypto;
    if (c && c.randomUUID) return c.randomUUID();
    const b = c.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  };
  // Same old note at the same position always gets the same id, also from another tab or after a partial migration.
  async function legacyId(index, note) {
    const d = new Uint8Array(await win.crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([index, note]))));
    d[6] = (d[6] & 15) | 64; d[8] = (d[8] & 63) | 128;
    const h = [...d.slice(0, 16)].map(x => x.toString(16).padStart(2, '0')).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }
  const validNote = n => n && typeof n === 'object' && KINDS.some(k => k[0] === n.kind) && typeof n.body === 'string' && n.body &&
    n.context && typeof n.context === 'object' && typeof n.context.clientId === 'string';
  const putNote = n => { try { store().setItem(PREFIX + n.context.clientId, JSON.stringify(n)); return true; } catch { return false; } };
  const dropNote = id => { try { store().removeItem(PREFIX + id); } catch {} };
  function queuedNotes() {
    const out = []; let ls = store();
    try {
      for (let i = 0; ls && i < ls.length; i++) {
        const key = ls.key(i);
        if (!key || !key.startsWith(PREFIX)) continue;
        try { const n = JSON.parse(ls.getItem(key)); if (validNote(n) && PREFIX + n.context.clientId === key) out.push(n); } catch {}
      }
    } catch {}
    return out;
  }
  async function migrateLegacy() {
    const ls = store(); if (!ls || migrating) return;
    let raw = null; try { raw = ls.getItem(QUEUE); } catch { return; }
    if (!raw) return;
    let list; try { list = JSON.parse(raw); } catch { return; }
    if (!Array.isArray(list)) return;
    migrating = true;
    try {
      let all = true;
      for (let i = 0; i < list.length; i++) {
        const n = list[i];
        if (!n || typeof n.body !== 'string' || !n.body || !KINDS.some(k => k[0] === n.kind)) continue;
        const id = (n.context && typeof n.context.clientId === 'string') ? n.context.clientId : await legacyId(i, n);
        let have = null; try { have = ls.getItem(PREFIX + id); } catch {}
        if (have) continue;
        if (!putNote({kind: n.kind, body: n.body, context: {...(n.context || {}), clientId: id}})) all = false;
      }
      // Only remove the old array when everything is stored and nobody changed it meanwhile.
      if (all) { try { if (ls.getItem(QUEUE) === raw) ls.removeItem(QUEUE); } catch {} }
    } catch { /* stays in the old array; retried later */ } finally { migrating = false; }
  }
  // Sends one stored note. Never throws; a failure schedules a retry for this note only.
  async function send(n) {
    const id = n.context.clientId;
    if (destroyed || sending.has(id)) return false;
    sending.add(id);
    try { await save(n.kind, n.body, n.context); dropNote(id); retryAt.delete(id); return true; }
    catch { retryAt.set(id, Date.now() + RETRY_MS); return false; }
    finally { sending.delete(id); }
  }
  async function flush() {
    if (destroyed || !isEnabled()) return;
    await migrateLegacy();
    for (const n of queuedNotes()) {
      if (destroyed || !isEnabled()) return;
      if ((retryAt.get(n.context.clientId) || 0) > Date.now()) continue;
      await send(n);
    }
  }
  function toast(text) {
    if (destroyed) return;
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
    const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); if (!(open && open.busy)) close(); } };
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
    const btnSave = s.querySelector('.rk-save'), btnCancel = s.querySelector('.rk-cancel'), kindBtns = [...s.querySelectorAll('[data-kind]')];
    const lock = on => { text.disabled = on; kindBtns.forEach(b => { b.disabled = on; }); btnSave.disabled = on; btnCancel.disabled = on; btnSave.textContent = on ? 'Bewaren…' : 'Bewaar'; };
    const me = open;
    btnCancel.addEventListener('click', () => { if (!me.busy) close(); });
    // After a failed attempt the same text and kind keep the same note (and so the same clientId).
    let attempt = null;
    btnSave.addEventListener('click', async () => {
      if (me.busy || destroyed) return;
      const body = text.value.trim();
      if (!body) { text.focus(); toast('Typ eerst je opmerking.'); return; }
      if (!attempt || attempt.kind !== kind || attempt.body !== body) {
        let extra = {}; try { extra = context() || {}; } catch {}
        attempt = {kind, body, context: {...extra, target, rect: {x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.w), h: Math.round(rect.h)},
          viewport: {w: win.innerWidth, h: win.innerHeight}, page: win.location.pathname + win.location.hash, at: new Date().toISOString(), clientId: newId()}};
      }
      const note = attempt; me.busy = true; lock(true);
      const stored = putNote(note);
      const ok = await send(note);
      me.busy = false;
      if (destroyed) return;
      const current = open === me; // a late answer must not close a form that was opened afterwards
      if (ok || stored) {
        if (current) close();
        toast(ok ? 'Bewaard. Dank je!' : 'Nog niet verstuurd. Hij wordt later vanzelf opnieuw verstuurd.');
      } else if (current) {
        lock(false); text.focus(); toast('Bewaren lukte niet. Probeer het opnieuw.');
      } else toast('Bewaren lukte niet.');
    });
  }
  fab.addEventListener('click', start);
  return {destroy() { destroyed = true; win.clearInterval(timer); if (open) { open.busy = false; close(); } host.remove(); }, flush, start};
}

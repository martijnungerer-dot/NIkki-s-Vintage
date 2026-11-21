// Nieuw stuk als gesprek (Martijn, 15 november 2026). Draait in het invoer-iframe van de app.
// Koppelt het scherm aan het bestaande contract: window.parent.NikkiApp (fotoanalyse, foto-overdracht,
// opslaan) en window.NikkiIntake (bewerken, concepten, verlaten). Vragen en regels: steps.js.
(function () {
  var I = window.GSFIntake, SKIP = I.SKIP, MAX_PHOTOS = 8;
  var app = function () { return window.parent.NikkiApp; };
  var $ = function (id) { return document.getElementById(id); };
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- staat ----------
  // S is alles wat bij dit ene stuk hoort (en in het concept bewaard wordt).
  // seed: bepaalt welke zinnen het scherm bij dit stuk kiest (steps.js); heardDetails: bijzonderheden die
  // Nikki al noemde voordat die vraag kwam, zodat ze daar alvast aanstaan.
  function fresh() { return { A: {}, G: {}, photos: [], warnings: [], phase: 'photos', analysed: '', draftId: null, edit: false, seed: Math.floor(Math.random() * 1e9), heardDetails: [] }; }
  var S = fresh();
  // Eigen keuzewoorden van Nikki, per lijst, in deze browser (zelfde plek als het vorige invoerscherm).
  var learned = (function () { try { var v = JSON.parse(localStorage.getItem('gsf-learned')); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch (e) { return {}; } })();
  // Verkochte stukken voor het prijsvoorstel (alleen beheer, alleen op dit toestel); het stuk zelf telt niet mee.
  var sales = [], salesAt = 0;
  var steps = I.build({ get A() { return S.A; }, get G() { return S.G; }, get learned() { return learned; }, get seed() { return S.seed; },
    get sales() { return sales.filter(function (x) { return x.key !== S.draftId; }); } });
  var editing = null, multi = null, error = '', note = '', view = 0, saved = false;
  // True when the open question was reached with the back button, so the next tap goes one step further back.
  var steppedBack = false;
  var thinking = false, ctl = null, gen = 0, saving = false, status = '', saveError = '';
  var heroKey = '', thumbKey = '', askedKey = '';
  var voice = { on: false, state: 'idle', note: '', said: '', rec: null, hearing: false, timer: null };
  // Een vrije zin die Gemini aan het begrijpen is ({busy}) of begreep ({values, reply}), en de reactie
  // die na "Klopt" één keer boven de volgende vraag staat.
  var heard = null, heardCtl = null, heardGen = 0, reply = '';

  var active = function () { return I.active(steps); };
  var done = function (s) { return S.A[s.id] !== undefined; };
  var missing = function () { return I.missing(steps, S.A, S.photos); };
  function loadSales() {
    if (!app().priceHistory || Date.now() - salesAt < 5 * 60 * 1000) return;
    salesAt = Date.now();
    app().priceHistory().then(function (list) { sales = Array.isArray(list) ? list : []; var step = current(); if (step && step.id === 'prijs' && !heard) render(); }).catch(function () { salesAt = 0; });
  }
  var photoSet = function () { return S.photos.map(function (p) { return p.url; }).join('|'); };
  function mainPhoto() {
    var open = S.photos.filter(function (p) { return !p.internal; });
    return open.filter(function (p) { return p.main; })[0] || open.filter(function (p) { return p.rol === 'Voorkant'; })[0] || open[0] || null;
  }
  function current() {
    if (S.phase !== 'talk' || thinking) return null;
    var list = active();
    return (editing && list.filter(function (s) { return s.id === editing; })[0]) || list.filter(function (s) { return !done(s); })[0] || null;
  }
  function euro(v) { return '€ ' + String(v).replace('.', ','); }
  function shown(s) {
    var v = S.A[s.id];
    if (v === SKIP) return 'Weet ik nog niet';
    if (s.kind === 'multi') return v.length ? v.join(', ') : 'Niets bijzonders';
    if (s.kind === 'cm') return String(v).replace('.', ',') + ' cm';
    if (s.kind === 'euro') return euro(v);
    if (s.kind === 'long') return v ? v : 'Geen tekst';
    if (s.id === 'zie') return v === 'Klopt' ? 'Klopt' : 'Niet helemaal';
    var option = s.id !== 'titel' && s.options && s.options().filter(function (o) { return Array.isArray(o) && o[0] === v; })[0];
    return option ? option[1] : v;
  }
  function coat(back, line) {
    return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 375"><rect width="300" height="375" fill="#E9E1D6"/>' +
      '<path d="M120 50 L150 75 L180 50 L222 72 L240 200 L222 208 L214 130 L210 350 L90 350 L86 130 L78 208 L60 200 L78 72 Z" fill="#4A342A"/>' +
      (back ? '' : '<path d="M120 50 L150 120 L180 50" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="3"/><path d="M150 120 L150 350" stroke="rgba(0,0,0,0.25)" stroke-width="2"/>') +
      '<path d="' + line + '" fill="none" stroke="#FAF6F0" stroke-width="6" stroke-linecap="round"/><path d="' + line + '" fill="none" stroke="#2E2420" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="7 6"/></svg>');
  }
  var MEASURE = { chest: 'M88 140 L212 140', length: 'M150 58 L150 348', shoulder: 'M80 74 L220 74', sleeve: 'M222 76 L232 204' };

  // ---------- foto's ----------
  function addFiles(list) {
    var refused = [], room = MAX_PHOTOS - S.photos.length, first = S.photos.length;
    Array.from(list || []).forEach(function (file) {
      if (['image/jpeg', 'image/png', 'image/webp'].indexOf(file.type) < 0 || file.size > 30 * 1024 * 1024) { refused.push(file.name || 'foto'); return; }
      if (room-- <= 0) return;
      S.photos.push({ file: file, url: URL.createObjectURL(file), cloudPath: null, rol: '', rolByUser: false, main: false, internal: false, toelichting: '', bruikbaar: true });
    });
    note = refused.length ? (refused.length === 1 ? refused[0] + ' is' : refused.length + ' foto’s zijn') + ' niet gebruikt: kies een JPG-, PNG- of WebP-foto van maximaal 30 MB.' : '';
    if (room < 0) note = (note ? note + ' ' : '') + 'Er kunnen maximaal ' + MAX_PHOTOS + ' foto’s bij een stuk.';
    if (S.photos.length > first) view = first;
    S.phase = 'photos'; saved = false; render();
  }
  // Keuzelijsten (standaard plus Nikki's eigen woorden) gaan als data mee, zodat Gemini bestaande keuzes kiest.
  function lists() {
    var out = {};
    ['materiaal', 'model', 'kleur', 'lengte', 'pasvorm', 'periode', 'bontsoort', 'bijzonderheden'].forEach(function (k) { out[k] = (k === 'materiaal' ? ['Bont'] : []).concat(I.LISTS[k], learned[k] || []); });
    return out;
  }
  function analyse() {
    var my = ++gen; ctl = new AbortController(); thinking = true; note = ''; stopVoice(); render();
    // Dezelfde verkleinde foto's (zonder EXIF) als bij opslaan; ook de foto's alleen voor controle.
    Promise.all(S.photos.map(function (p) { return app().prepareImage(p.file); }))
      .then(function (prepared) { return app().analyse(prepared, ctl.signal, lists()); })
      .then(function (d) { if (my === gen) takeProposals(d || {}); })
      // Een laat antwoord voor een eerder stuk wordt genegeerd (my !== gen).
      .catch(function (e) { if (my === gen) note = e && e.code === 'cancelled' ? '' : ((e && e.message) || 'Gemini kon de foto’s niet bekijken.') + ' Je kunt zelf invullen.'; })
      .then(function () { if (my !== gen) return; thinking = false; S.analysed = photoSet(); S.phase = 'talk'; render(); });
  }
  function takeProposals(d) {
    S.G = I.proposals(d);
    S.warnings = Array.isArray(d.waarschuwingen) ? d.waarschuwingen.filter(function (w) { return typeof w === 'string'; }).slice(0, 5) : [];
    S.photos.forEach(function (p, i) {
      var f = Array.isArray(d.fotos) ? d.fotos.filter(function (x) { return x && Number(x.nr) === i + 1; })[0] : null;
      if (!f) return;
      if (!p.rolByUser) p.rol = I.ROLES.indexOf(f.rol) >= 0 ? f.rol : 'Overig';
      p.toelichting = typeof f.toelichting === 'string' ? f.toelichting.slice(0, 200) : ''; p.bruikbaar = f.bruikbaar !== false;
    });
  }

  // ---------- antwoorden ----------
  function learn(key, value) {
    if (I.OWN.indexOf(key) < 0 || typeof value !== 'string' || !I.known(value)) return;
    var all = I.LISTS[key].concat(learned[key] || []);
    if (all.some(function (o) { return o.toLowerCase() === value.toLowerCase(); })) return;
    learned[key] = (learned[key] || []).concat(value).slice(-40);
    try { localStorage.setItem('gsf-learned', JSON.stringify(learned)); } catch (e) {}
  }
  function give(step, value) {
    error = ''; dropHeard(); reply = '';
    S.A[step.id] = value; if (step.set) step.set(value);
    (Array.isArray(value) ? value : [value]).forEach(function (v) { learn(step.id, v); });
    editing = null; multi = null; saved = false; saveError = ''; render();
  }
  // Typen, dicteren en praten komen hier samen: een woord dat al een keuze is, telt als die keuze.
  function freeAnswer(step, raw, ownOnly) {
    var text = String(raw).trim(), low = text.toLowerCase().replace(/[.!?]+$/, '');
    // Wacht het scherm op "Klopt dat?" na een vrije zin, dan telt ja of nee als dat antwoord.
    if (heard && heard.values) {
      if (/^(ja|klopt|goed|precies|prima|yes)\b/.test(low)) return acceptHeard();
      if (/^(nee|niet|fout)\b/.test(low)) return rejectHeard();
      dropHeard();
    }
    if (step.kind === 'long') return give(step, text.slice(0, 4000));
    if (/^(weet ik (nog )?niet|geen idee|sla over|overslaan|later)$/.test(low)) return give(step, SKIP);
    if (step.kind === 'multi' && /^(klaar|dat is alles|niets|nee)$/.test(low)) return give(step, multi.slice());
    // Een hele zin ("het is een lammy met een vossenkraag") gaat eerst naar Gemini, vóór de snelle
    // herkenning van losse woorden hieronder; die is de terugval als Gemini niets herkent of niet bereikbaar is.
    var canUnderstand = !ownOnly && app().understand && I.HEARD.indexOf(step.id === 'zie' ? 'model' : step.id) >= 0;
    if (canUnderstand && text.split(/\s+/).length >= 3) return understand(step, text);
    if (step.say) { var said = Object.keys(step.say).filter(function (k) { return step.say[k].test(low); })[0]; if (said) return give(step, said); }
    if (step.id === 'titel' && /^(ja|goed|prima|klopt)/.test(low)) return give(step, step.proposal());
    if (step.kind === 'cm' || step.kind === 'euro') {
      var digits = text.match(/\d+(?:[.,]\d+)?/), n = digits ? Number(digits[0].replace(',', '.')) : NaN;
      if (!isFinite(n) || n <= 0) { error = step.kind === 'cm' ? 'Vul een getal in, bijvoorbeeld 56.' : 'Vul een bedrag in, bijvoorbeeld 250.'; return render(); }
      if (step.kind === 'cm' && n > 300) { error = 'Dat is meer dan 300 cm. Klopt het getal?'; return render(); }
      if (step.kind === 'euro' && n > 1000000) { error = 'Dat bedrag is te hoog. Klopt het getal?'; return render(); }
      return give(step, Math.round(n * (step.kind === 'cm' ? 10 : 100)) / (step.kind === 'cm' ? 10 : 100));
    }
    if (!text) return;
    var options = (step.options ? step.options() : []).map(function (o) { return Array.isArray(o) ? o[0] : o; });
    var match = options.filter(function (o) { return o.toLowerCase() === low; })[0] ||
      options.filter(function (o) { return (' ' + low + ' ').indexOf(' ' + o.toLowerCase() + ' ') >= 0; }).sort(function (a, b) { return b.length - a.length; })[0];
    // Een kort antwoord dat geen knop is, bij een lijst zonder eigen woorden: Gemini probeert het te begrijpen.
    if (canUnderstand && !match && !step.own) return understand(step, text);
    // Alleen lijsten met eigen woorden nemen een nieuw woord aan; elders moet het een bestaande keuze zijn.
    if (!match && !step.own && step.kind !== 'text') { error = 'Kies een van de knoppen, of tik op Weet ik nog niet.'; return render(); }
    var value = (match || text.charAt(0).toUpperCase() + text.slice(1)).slice(0, step.kind === 'text' ? 200 : 60);
    if (step.kind === 'multi') { if (multi.indexOf(value) < 0 && multi.length < 30) multi.push(value); return render(); }
    give(step, value);
  }

  // ---------- vrije zinnen begrijpen (supabase/functions/begrijp) ----------
  function knownAnswers() {
    var out = {};
    I.HEARD.forEach(function (k) { var v = S.A[k]; if (k === 'bijzonderheden' ? Array.isArray(v) && v.length : I.known(v) && typeof v === 'string') out[k] = v; });
    return out;
  }
  function dropHeard() { heardGen++; if (heardCtl) heardCtl.abort(); heardCtl = null; heard = null; }
  function understand(step, text) {
    dropHeard(); error = '';
    var my = heardGen; heardCtl = new AbortController();
    heard = { busy: true, step: step.id }; render();
    Promise.resolve().then(function () { return app().understand({ step: step.id, text: text.slice(0, 400), lists: lists(), known: knownAnswers() }, heardCtl.signal); })
      .then(function (result) {
        if (my !== heardGen) return;
        var r = I.interpret(result, S.A, learned);
        heard = null; heardCtl = null;
        if (!r.values.length) { freeAnswer(step, text, true); var f = $('free'); if (f) f.focus(); return; }
        heard = { values: r.values, reply: r.reply, step: step.id };
        // Alleen het antwoord op deze vraag (en geen bontsoort): dat geldt meteen, Nikki ziet het in de rij
        // boven de vraag en kan het aantikken. Meer dan dat, of een bontsoort: eerst "Klopt dat?".
        if (r.values.length === 1 && r.values[0][0] === step.id && step.id !== 'bontsoort') return acceptHeard();
        render();
      })
      .catch(function () { if (my !== heardGen) return; heard = null; heardCtl = null; freeAnswer(step, text, true); var f = $('free'); if (f) f.focus(); });
  }
  // Pas na "Klopt" komt wat Gemini hoorde in de antwoorden, in de vaste volgorde (bont eerst).
  function acceptHeard() {
    var got = heard, now = current(); if (!got || !got.values) return;
    dropHeard(); error = ''; reply = got.reply || '';
    got.values.forEach(function (kv) {
      var key = kv[0], value = kv[1];
      if (key === 'bijzonderheden') {
        if (now && now.id === 'bijzonderheden') { multi = multi || []; value.forEach(function (v) { if (multi.indexOf(v) < 0 && multi.length < 30) multi.push(v); learn(key, v); }); }
        else value.forEach(function (v) { if (S.heardDetails.indexOf(v) < 0) S.heardDetails.push(v); learn(key, v); });
        return;
      }
      var target = steps.filter(function (x) { return x.id === key; })[0];
      S.A[key] = value; if (target && target.set) target.set(value); learn(key, value);
    });
    if (!(now && now.id === 'bijzonderheden')) { editing = null; multi = null; }
    saved = false; saveError = ''; render();
  }
  function rejectHeard() { dropHeard(); error = 'Zeg het anders, of kies een knop.'; render(); }

  // ---------- tekenen ----------
  function words(text, from) {
    return String(text).split(' ').map(function (w, i) { return '<span class="w" style="--i:' + (from + i) + '">' + esc(w) + '</span>'; }).join(' ');
  }
  function renderStage(step) {
    var hero = $('hero'), key, h, photos = S.photos, at = Math.max(0, Math.min(view, photos.length - 1)), manage = S.phase === 'photos' && !thinking;
    if (!photos.length) { key = 'camera'; h = '<label class="camera pick"><span class="lens" aria-hidden="true"><svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></span><span>Maak of kies foto’s</span><input type="file" id="files" accept="image/jpeg,image/png,image/webp" multiple aria-label="Foto’s maken of kiezen"></label>'; }
    else if (step && step.kind === 'cm') { key = 'cm-' + step.id; h = '<img class="measure" src="' + coat(step.id === 'length', MEASURE[step.id]) + '" alt="Tekening: zo leg je het meetlint voor de ' + step.label.toLowerCase() + '">'; }
    else { key = 'photo-' + photos[at].url; h = '<img src="' + esc(photos[at].url) + '" alt="Foto ' + (at + 1) + ' van dit stuk">'; }
    if (thinking) { key += '-scan'; h += '<div class="scan" aria-hidden="true"></div>'; }
    if (key !== heroKey) { heroKey = key; hero.innerHTML = h; }
    $('stage').setAttribute('data-state', !photos.length ? 'empty' : thinking ? 'looking' : 'photo');
    var thumbs = $('thumbs'), main = mainPhoto(), shownAt = step && step.kind === 'cm' ? -1 : at, key2 = photoSet() + '|' + manage + '|' + photos.length;
    thumbs.hidden = !photos.length;
    if (key2 !== thumbKey) {
      thumbKey = key2;
      thumbs.innerHTML = photos.map(function (p, i) { return '<button type="button" data-view="' + i + '" style="--i:' + i + '"><img src="' + esc(p.url) + '" alt=""></button>'; }).join('') +
        (manage && photos.length && photos.length < MAX_PHOTOS ? '<label class="add" title="Foto toevoegen"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><input type="file" id="more" accept="image/jpeg,image/png,image/webp" multiple aria-label="Foto toevoegen"></label>' : '');
    }
    Array.prototype.forEach.call(thumbs.querySelectorAll('[data-view]'), function (b, i) {
      var p = photos[i];
      b.setAttribute('aria-pressed', String(i === shownAt)); b.classList.toggle('intern', !!p.internal);
      b.setAttribute('aria-label', 'Foto ' + (i + 1) + (p === main ? ', hoofdfoto' : '') + (p.internal ? ', alleen voor controle' : ''));
    });
    // Per foto: hoofdfoto, alleen voor controle (Gemini ziet hem wel, bezoekers nooit), plek en verwijderen.
    var tools = $('photo-tools'); tools.hidden = !manage || !photos.length;
    if (!tools.hidden) {
      var p = photos[at];
      tools.innerHTML = '<button type="button" class="chip" data-main aria-pressed="' + (p === main) + '"' + (p.internal ? ' disabled' : '') + '>Hoofdfoto</button>' +
        '<button type="button" class="chip" data-intern aria-pressed="' + !!p.internal + '">Alleen voor controle</button>' +
        '<select id="role" aria-label="Wat staat er op foto ' + (at + 1) + '">' + [''].concat(I.ROLES).map(function (r) { return '<option value="' + r + '"' + (r === (p.rol || '') ? ' selected' : '') + '>' + (r || 'Wat is dit?') + '</option>'; }).join('') + '</select>' +
        '<button type="button" class="ic del" data-del aria-label="Foto ' + (at + 1) + ' verwijderen"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button>';
    }
  }
  function summary(list) {
    var rows = '', count = S.photos.length, hidden = S.photos.filter(function (p) { return p.internal; }).length, main = mainPhoto();
    rows += '<button type="button" class="kv" data-photos><span>Foto’s</span><span>' + count + (hidden ? ' (' + hidden + ' alleen voor controle)' : '') + '</span></button>';
    list.forEach(function (s) {
      if (s.id === 'zie') {
        if (S.A.zie === 'Klopt') ['model', 'kleur', 'lengte'].forEach(function (k) { if (I.known(S.A[k]) && !list.some(function (x) { return x.id === k; })) rows += '<button type="button" class="kv" data-edit="zie"><span>' + k.charAt(0).toUpperCase() + k.slice(1) + '</span><span>' + esc(S.A[k]) + '</span></button>'; });
        return;
      }
      if (s.id === 'titel' || s.id === 'prijs' || S.A[s.id] === SKIP || (s.id === 'periode' && S.A.periode === 'Onbekend') || (s.kind === 'long' && !S.A[s.id])) return;
      rows += '<button type="button" class="kv" data-edit="' + s.id + '" aria-label="' + esc(s.label + ': ' + shown(s) + '. Tik om te wijzigen') + '"><span>' + esc(s.label) + '</span><span>' + esc(shown(s)) + '</span></button>';
    });
    return '<div class="card" id="summary"><div class="card-head">' + (main ? '<img src="' + esc(main.url) + '" alt="Hoofdfoto">' : '') +
      '<div><button type="button" class="kv" data-edit="titel" style="border:0;padding:0"><span class="card-title" style="color:var(--fg)">' + esc(I.known(S.A.titel) ? S.A.titel : 'Nog geen titel') + '</span></button>' +
      '<button type="button" class="kv" data-edit="prijs" style="border:0;padding:0"><span style="color:var(--fg)">' + (I.known(S.A.prijs) ? esc(euro(S.A.prijs)) : 'Nog geen prijs') + '</span></button></div></div>' + rows + '</div>';
  }
  function render() {
    var list = active(), step = current(), answered = list.filter(done), talk = $('talk'), h = '', photos = S.photos;
    var overview = S.phase === 'talk' && !thinking && !step;
    $('app').setAttribute('data-mode', overview ? 'overview' : S.phase === 'photos' || thinking ? 'photos' : 'talk');
    $('name').textContent = S.edit ? 'Stuk bewerken' : 'Nieuw stuk';
    $('steps').textContent = S.phase === 'talk' && !thinking ? Math.min(answered.length + (step ? 1 : 0), list.length) + ' van ' + list.length : '';
    $('back').disabled = thinking || saving || S.phase === 'photos';
    $('restart').disabled = saving;
    renderStage(step);
    var warm = '', fresh = false;
    if (thinking) h += '<p class="ai now">' + (photos.length === 1 ? 'Eén foto' : photos.length + ' foto’s') + ', dank je. Ik kijk even.</p><div class="dots" role="img" aria-label="Gemini bekijkt de foto’s"><i></i><i></i><i></i></div>';
    else if (S.phase === 'photos') {
      var p = photos[Math.max(0, Math.min(view, photos.length - 1))];
      h += '<p class="ai now">' + (!photos.length ? 'Hoi Nikki. Laat me het stuk zien.' : photos.length === 1 ? 'Eén foto. Nog meer kanten?' : photos.length + ' foto’s. Zijn dit ze allemaal?') + '</p>';
      if (photos.length) h += '<p class="photo-note">Tik een foto aan om de hoofdfoto te kiezen, of om hem alleen voor controle te houden (label, naden, gebreken). Gemini bekijkt ze allemaal; bezoekers zien die foto’s nooit.</p>';
      if (p && (p.toelichting || p.bruikbaar === false)) h += '<p class="photo-note">' + esc((p.bruikbaar === false ? 'Gemini vindt deze foto minder bruikbaar. ' : '') + (p.toelichting || '')) + '</p>';
      if (photos.length && !mainPhoto()) h += '<p class="err" role="alert">Er is nog geen foto voor de boetiek: zet bij minstens één foto Alleen voor controle uit.</p>';
    } else {
      // Wat al gezegd is, staat als rij knoppen boven de vraag; een tik wijzigt het antwoord.
      var trail = '<button type="button" class="me" data-photos aria-label="' + photos.length + ' foto’s. Tik om te wijzigen"><span>' + (photos.length === 1 ? '1 foto' : photos.length + ' foto’s') + '</span></button>';
      answered.forEach(function (s) {
        if (step && s.id === step.id) return;
        trail += '<button type="button" class="me" data-edit="' + s.id + '" aria-label="' + esc(s.label + ': ' + shown(s) + '. Tik om te wijzigen') + '"><span>' + esc(shown(s)) + '</span></button>';
        warm = S.A[s.id] === SKIP ? I.skipLine(S.seed, s.id) : s.warm ? s.warm(S.A[s.id]) : '';
      });
      // Na een begrepen vrije zin reageert Gemini zelf; bij de eerste vraag opent het scherm het gesprek.
      if (reply) warm = reply;
      else if (!answered.length && !S.edit) warm = I.opening(S.G, S.seed);
      if (step) {
        h += '<div class="trail" id="trail">' + trail + '</div>';
        var said = warm && !editing ? warm : '', ask = step.ask();
        if (heard && heard.values) { said = heard.reply; ask = 'Ik noteer: ' + I.heardText(heard.values) + '. Klopt dat?'; }
        fresh = askedKey !== step.id + ask; askedKey = step.id + ask;
        h += '<p class="ai now' + (fresh ? ' fresh' : '') + '" id="question" data-step="' + step.id + '">' + (said ? '<span class="warm">' + words(said, 0) + '</span>' : '') + words(ask, said ? said.split(' ').length + 2 : 0) + '</p>';
        var guess = step.guess && step.guess(), label = guess && step.options().filter(function (o) { return Array.isArray(o) && o[0] === guess; })[0];
        var hint = heard ? '' : [I.guessLine(step, S.G, label ? label[1] : ''), step.hint ? step.hint() : ''].filter(Boolean).join(' ');
        if (hint) h += '<p class="ai" id="hint" style="color:var(--muted);font-size:16px">' + esc(hint) + '</p>';
        if (heard && heard.busy) h += '<div class="dots" role="img" aria-label="Gemini luistert naar je antwoord"><i></i><i></i><i></i></div>';
        if (step.id === 'prijs') loadSales();
      } else {
        askedKey = '';
        var open = missing();
        h += '<p class="ai now">' + (warm ? '<span class="warm">' + esc(warm) + '</span>' : '') + (open.length ? 'Bijna. Voor de boetiek heb ik dit nog nodig:' : S.edit ? 'Zo staat hij in de boetiek. Tik op een regel om iets te wijzigen.' : 'Dat is alles. Zo komt hij in de boetiek:') + '</p>';
        if (open.length) h += '<div class="card" id="open">' + open.map(function (s) { return '<button type="button" class="kv" ' + (s.id === 'fotos' ? 'data-photos' : 'data-edit="' + s.id + '"') + ' style="border-top:0"><span style="color:var(--fg)">' + esc(s.label) + '</span><span>Nu invullen</span></button>'; }).join('') + '</div><p class="ai">Dit weet ik al:</p>';
        S.warnings.forEach(function (w) { h += '<p class="warn">' + esc(w) + '</p>'; });
        h += summary(list);
      }
    }
    if (note) h += '<p class="note" id="note" role="status">' + esc(note) + '</p>';
    talk.innerHTML = h;
    renderAnswer(step, fresh);
    speakQuestion(step);
    talk.scrollTop = 0;
    var row = $('trail'); if (row) row.scrollLeft = row.scrollWidth;
  }
  var VOICE_ICON = '<svg class="bars" width="30" height="24" viewBox="0 0 30 24" fill="currentColor" aria-hidden="true"><rect x="2" y="2" width="3" height="20" rx="1.5"/><rect x="8" y="2" width="3" height="20" rx="1.5"/><rect x="14" y="2" width="3" height="20" rx="1.5"/><rect x="20" y="2" width="3" height="20" rx="1.5"/><rect x="26" y="2" width="3" height="20" rx="1.5"/></svg>' +
    '<svg class="wave" width="30" height="24" viewBox="0 0 30 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M-16 12 q4 -9 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0"/></svg>';
  var VOICE_LABEL = { idle: 'Praat met de AI', speaking: 'De AI praat. Tik om te stoppen', listening: 'De AI luistert. Tik om te stoppen' };
  var SEND = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  function renderAnswer(step, fresh) {
    var box = $('answer'), h = '', photos = S.photos;
    if (thinking) h = '<div class="chips"><button type="button" class="chip quiet" data-stop>Stop, ik vul zelf in</button></div>';
    else if (S.phase === 'photos') {
      if (photos.length && mainPhoto()) h = '<div class="chips">' + (S.analysed === photoSet()
        ? '<button type="button" class="chip main" data-next>Verder</button>'
        : '<button type="button" class="chip main" data-analyse>Laat Gemini kijken</button><button type="button" class="chip quiet" data-next>Zelf invullen</button>') + '</div>';
    } else if (!step) {
      var open = missing().length;
      if (status) h += '<p class="status" id="status" role="status">' + esc(status) + '</p>';
      if (saveError) h += '<p class="err" id="save-error" role="alert">' + esc(saveError) + '</p>';
      h += '<div class="chips">' + (open
        ? '<button type="button" class="chip main" data-concept>Bewaar als concept</button>'
        : '<button type="button" class="chip main" id="save" data-save' + (saving ? ' disabled' : '') + '>' + (S.edit ? 'Wijziging opslaan' : 'Opslaan en tonen in boetiek') + '</button>') + '</div>';
    } else if (heard && heard.busy) {
      h = '<div class="chips"><button type="button" class="chip quiet" data-heard-stop>Laat maar, ik kies zelf</button></div>';
    } else if (heard && heard.values) {
      h = '<div class="chips' + (fresh ? ' fresh' : '') + '" role="group" aria-labelledby="question"><button type="button" class="chip main" data-heard-yes>Klopt</button><button type="button" class="chip" data-heard-no>Niet helemaal</button></div>' +
        '<div class="free"><button type="button" class="voice" id="voice" data-voice="' + voice.state + '" aria-label="' + VOICE_LABEL[voice.state] + '">' + VOICE_ICON + '</button>' +
        '<input id="free" autocomplete="off" type="text" aria-label="Typ of dicteer je antwoord" placeholder="Of zeg het anders"><button type="submit" class="send" aria-label="Antwoord geven">' + SEND + '</button></div>';
    } else {
      if (step.kind === 'multi' && !multi) multi = (Array.isArray(S.A[step.id]) ? S.A[step.id] : step.start().concat(S.heardDetails.filter(function (v) { return step.start().indexOf(v) < 0; }))).slice();
      var options = step.options ? step.options().map(function (o) { return Array.isArray(o) ? o : [o, o]; }) : [], guess = step.guess && step.guess();
      if (step.kind === 'multi') multi.forEach(function (v) { if (!options.some(function (o) { return o[0] === v; })) options.push([v, v]); });
      // Een voorstel van Gemini is gemarkeerd, maar nooit vooraf gekozen: Nikki tikt het zelf aan.
      if (options.length) h += '<div class="chips' + (fresh ? ' fresh' : '') + '" role="group" aria-labelledby="question">' + options.map(function (o, i) {
        var on = step.kind === 'multi' ? multi.indexOf(o[0]) >= 0 : S.A[step.id] === o[0];
        return '<button type="button" class="chip' + (guess === o[0] ? ' guess' : '') + '" style="--i:' + i + '" data-value="' + esc(o[0]) + '" aria-pressed="' + on + '">' + esc(o[1]) + '</button>';
      }).join('') + '</div>';
      var numeric = step.kind === 'cm' || step.kind === 'euro', had = S.A[step.id];
      if (step.kind === 'long') h += '<textarea class="long" id="free" maxlength="4000" aria-labelledby="question">' + esc(typeof had === 'string' && had !== SKIP ? had : step.proposal()) + '</textarea>' +
        '<div class="free"><button type="button" class="voice" id="voice" data-voice="' + voice.state + '" aria-label="' + VOICE_LABEL[voice.state] + '">' + VOICE_ICON + '</button><button type="submit" class="chip main" style="flex:1">Zo is het goed</button></div>';
      else h += '<div class="free"><button type="button" class="voice" id="voice" data-voice="' + voice.state + '" aria-label="' + VOICE_LABEL[voice.state] + '">' + VOICE_ICON + '</button>' + (step.kind === 'euro' ? '<span class="unit">€</span>' : '') +
        '<input id="free" autocomplete="off" ' + (numeric ? 'inputmode="decimal"' : 'type="text"') + ' aria-label="' + esc(numeric ? step.label : 'Typ of dicteer je antwoord') + '" placeholder="' + esc(numeric ? '' : step.placeholder || (step.kind === 'multi' ? 'Iets anders? Typ of dicteer' : 'Of typ of dicteer je antwoord')) + '"' +
        (numeric && I.known(had) ? ' value="' + esc(String(had).replace('.', ',')) + '"' : '') + '>' + (step.kind === 'cm' ? '<span class="unit">cm</span>' : '') +
        '<button type="submit" class="send" aria-label="' + (step.kind === 'multi' ? 'Toevoegen' : 'Antwoord geven') + '">' + SEND + '</button></div>';
      if (error) h += '<p class="err" role="alert">' + esc(error) + '</p>';
      if (voice.note) h += '<p class="voice-note" role="status">' + esc(voice.note) + '</p>';
      // Elke vraag kan worden overgeslagen; niets houdt het gesprek tegen.
      h += '<div class="chips">' + (step.kind === 'multi' ? '<button type="button" class="chip main" data-ready>Klaar</button>' : '') + '<button type="button" class="chip quiet" data-skip>Weet ik nog niet</button></div>';
    }
    box.innerHTML = h; box.hidden = !h;
    if (saving) box.setAttribute('aria-busy', 'true'); else box.removeAttribute('aria-busy');
  }

  // ---------- praten (alleen na een tik op de golfjes) ----------
  function setVoice(state) {
    voice.state = state; if (state !== 'listening') voice.hearing = false;
    var b = $('voice');
    if (b) { b.setAttribute('data-voice', state); b.setAttribute('aria-label', VOICE_LABEL[state]); }
    clearInterval(voice.timer); voice.timer = null;
    if (state !== 'idle' && !calm) voice.timer = setInterval(moveVoice, 110);
    moveVoice();
  }
  // De golfjes bewegen onregelmatig: rustig zolang de AI wacht, hoog zodra hij Nikki hoort praten.
  function moveVoice() {
    var b = $('voice'); if (!b) return;
    var low = voice.hearing ? .45 : .2, high = voice.hearing ? 1 : .45;
    Array.prototype.forEach.call(b.querySelectorAll('.bars rect'), function (r) { r.style.transform = voice.state === 'listening' && !calm ? 'scaleY(' + (low + Math.random() * (high - low)).toFixed(2) + ')' : ''; });
    b.style.setProperty('--amp', voice.state === 'speaking' && !calm ? (.55 + Math.random() * .6).toFixed(2) : '1');
  }
  function stopVoice() {
    voice.on = false; voice.said = '';
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
    try { voice.rec && voice.rec.abort(); } catch (e) {}
    voice.rec = null; setVoice('idle');
  }
  function listen() {
    var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition, step = current();
    if (!voice.on || !step) return setVoice('idle');
    if (!Recognition) { voice.note = 'Luisteren werkt hier niet. Typ, of dicteer met de microfoon van je toetsenbord.'; voice.on = false; setVoice('idle'); return renderAnswer(step); }
    var rec = voice.rec = new Recognition(), heard = '', started = false, guard = null;
    rec.lang = 'nl-NL'; rec.interimResults = false; rec.maxAlternatives = 1;
    // Veiligheidstijd: start het luisteren niet (bijvoorbeeld een vraag om de microfoon die blijft staan),
    // of hoort het niets, dan stopt het en zegt het scherm dat, in plaats van eindeloos te blijven luisteren.
    var watch = function (ms) { clearTimeout(guard); guard = setTimeout(function () { if (voice.rec !== rec) return; try { rec.abort(); } catch (e) {} rec.onerror({ error: started ? 'no-speech' : 'failed' }); }, ms); };
    rec.onstart = rec.onaudiostart = function () { if (!started) { started = true; watch(10000); } };
    rec.onresult = function (e) { heard = e.results[0][0].transcript; };
    rec.onspeechstart = function () { voice.hearing = true; clearTimeout(guard); };
    rec.onspeechend = function () { voice.hearing = false; };
    rec.onerror = function (e) {
      clearTimeout(guard);
      if (voice.rec !== rec) return; voice.rec = null; voice.on = false; setVoice('idle');
      voice.note = e.error === 'no-speech' ? 'Ik hoorde niets. Tik op de golfjes om het nog eens te proberen.' : 'Luisteren lukt hier niet. Typ, of dicteer met de microfoon van je toetsenbord.';
      renderAnswer(current());
    };
    rec.onend = function () {
      clearTimeout(guard);
      if (voice.rec !== rec) return; voice.rec = null; setVoice('idle');
      var now = current(); if (!heard || !now) return;
      voice.note = '';
      // Bij de lange tekst komt het gesprokene achter wat er al staat; Nikki leest het na en bevestigt zelf.
      if (now.kind === 'long') { var field = $('free'); if (field) field.value = (field.value ? field.value.trim() + ' ' : '') + heard; voice.on = false; return; }
      freeAnswer(now, heard);
    };
    setVoice('listening'); watch(5000);
    try { rec.start(); } catch (e) { rec.onerror({ error: 'failed' }); }
  }
  function speakQuestion(step) {
    if (!voice.on || !step) { if (!step && voice.on) stopVoice(); return; }
    var text = ($('question') || {}).innerText || step.ask();
    // Dezelfde vraag opnieuw getekend: niet opnieuw voorlezen, wel weer luisteren.
    if (voice.said === step.id + text) { if (voice.state === 'idle') listen(); return; }
    voice.said = step.id + text;
    try { voice.rec && voice.rec.abort(); } catch (e) {} voice.rec = null;
    var synth = window.speechSynthesis;
    if (!synth || !window.SpeechSynthesisUtterance) return listen();
    synth.cancel();
    var u = new SpeechSynthesisUtterance(text); u.lang = 'nl-NL';
    // Some browsers report both an error and an end for the same sentence: listen only once.
    var next = false, guard = null;
    u.onend = u.onerror = function () { clearTimeout(guard); if (next) return; next = true; if (voice.on && voice.said === step.id + text) listen(); };
    // Zonder (Nederlandse) stem melden sommige browsers nooit dat de zin klaar is: na de verwachte
    // spreektijd stopt het voorlezen dan alsnog en gaat het scherm luisteren, in plaats van te blijven hangen.
    guard = setTimeout(function () { if (next) return; try { synth.cancel(); } catch (e) {} u.onend(); }, 2000 + text.length * 90);
    setVoice('speaking'); synth.speak(u);
  }

  // ---------- opslaan ----------
  function paintStatus() { var el = $('status'); if (el) el.textContent = status; else renderAnswer(current(), false); }
  async function save() {
    if (saving || missing().length) return;
    if (!confirm('Zijn foto’s, kenmerken, maten en prijs gecontroleerd? Met opslaan staat dit stuk zo in de boetiek. Een verkocht stuk blijft verkocht.')) return;
    saving = true; saveError = ''; status = 'Foto’s voorbereiden…'; render();
    try {
      S.draftId = S.draftId || crypto.randomUUID();
      var images = await app().preparePhotos(S.photos, mainPhoto());
      await app().publish(I.product(S.A, S.draftId, images), function (message) { status = message; paintStatus(); });
      status = 'Opgeslagen.'; S.edit = true; markSaved();
    } catch (e) { status = ''; saveError = (e && e.message) || 'Opslaan is niet gelukt. Je invoer blijft staan; probeer opnieuw.'; }
    finally { saving = false; render(); }
  }

  // ---------- niet-opgeslagen invoer en concepten ----------
  function snapshot() { return JSON.stringify({ p: S.photos.map(function (p) { return [p.url, p.rol, !!p.main, !!p.internal]; }), A: S.A }); }
  var emptyState = snapshot(), baseline = emptyState;
  var lastDraft = null, lastPhotoSet = null, draftsOff = false, draftSaving = false, draftRestored = Promise.resolve(false);
  function unsavedInput() { return snapshot() !== baseline; }
  function clearDraft() { lastDraft = null; lastPhotoSet = null; return I.store.clear().catch(function () {}); }
  function markSaved() { baseline = snapshot(); clearDraft(); }
  async function saveDraft() {
    if (draftsOff || draftSaving || saving) return;
    if (!unsavedInput() || snapshot() === emptyState) { if (lastDraft !== null) await clearDraft(); return; }
    var state = snapshot(); if (state === lastDraft) return;
    draftSaving = true;
    try {
      if (photoSet() !== lastPhotoSet) { await I.store.put(I.store.PHOTOS, S.photos.map(function (p) { return p.file; })); lastPhotoSet = photoSet(); }
      await I.store.put(I.store.KEY, { v: 3, at: Date.now(), draftId: S.draftId, edit: S.edit, version: S.draftId && app().editVersion ? app().editVersion(S.draftId) : null,
        phase: S.phase, analysed: S.analysed === photoSet(), A: S.A, G: S.G, warnings: S.warnings, seed: S.seed, heardDetails: S.heardDetails, ai: app().currentAnalysis ? app().currentAnalysis() : null,
        photos: S.photos.map(function (p) { return { cloudPath: p.cloudPath || null, rol: p.rol || '', rolByUser: !!p.rolByUser, main: !!p.main, internal: !!p.internal, toelichting: p.toelichting || '', bruikbaar: p.bruikbaar !== false }; }) });
      lastDraft = state;
    } catch (e) { draftsOff = true; }
    finally { draftSaving = false; }
  }
  async function restoreDraft() {
    var d, files;
    try { d = await I.store.get(I.store.KEY); files = await I.store.get(I.store.PHOTOS); } catch (e) { draftsOff = true; return false; }
    if (!d || d.v !== 3 || !Array.isArray(d.photos) || !d.A || typeof d.A !== 'object') return false;
    if (Date.now() - d.at > I.store.DAYS * 24 * 60 * 60 * 1000) { await clearDraft(); return false; }
    // Intussen is iets anders geopend (bijvoorbeeld Bewerken): dat blijft staan, het concept ook.
    if (snapshot() !== emptyState) return false;
    files = Array.isArray(files) ? files : [];
    S = fresh();
    S.photos = d.photos.map(function (p, i) { return Object.assign({}, p, { file: files[i] }); }).filter(function (p) { return p.file instanceof Blob; }).map(function (p) { return Object.assign(p, { url: URL.createObjectURL(p.file) }); });
    S.A = d.A; S.G = d.G && typeof d.G === 'object' ? d.G : {}; S.warnings = Array.isArray(d.warnings) ? d.warnings : [];
    if (Number.isInteger(d.seed)) S.seed = d.seed;
    S.heardDetails = Array.isArray(d.heardDetails) ? d.heardDetails.filter(function (v) { return typeof v === 'string'; }).slice(0, 30) : [];
    S.draftId = d.draftId || null; S.edit = !!d.edit; S.phase = d.phase === 'talk' && S.photos.length ? 'talk' : 'photos'; S.analysed = d.analysed ? photoSet() : '';
    if (S.draftId && d.version != null && app().restoreEditVersion) app().restoreEditVersion(S.draftId, d.version);
    if (d.ai && app().restoreAnalysis) app().restoreAnalysis(d.ai);
    lastPhotoSet = photoSet(); lastDraft = snapshot(); view = 0; editing = null; multi = null;
    note = 'Je niet-opgeslagen stuk van ' + new Date(d.at).toLocaleString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) + ' is teruggezet.';
    render();
    return true;
  }
  function startOver() {
    gen++; if (ctl) ctl.abort(); thinking = false; stopVoice();
    S.photos.forEach(function (p) { try { URL.revokeObjectURL(p.url); } catch (e) {} });
    dropHeard(); reply = '';
    S = fresh(); editing = null; multi = null; error = ''; note = ''; view = 0; saved = false; status = ''; saveError = ''; askedKey = '';
    if (app().forgetAnalysis) app().forgetAnalysis();
    markSaved(); render();
  }

  // ---------- bediening ----------
  $('app').addEventListener('change', function (e) {
    if (e.target.type === 'file') { addFiles(e.target.files); e.target.value = ''; }
    if (e.target.id === 'role') { var p = S.photos[view]; if (p) { p.rol = e.target.value; p.rolByUser = true; render(); } }
  });
  $('thumbs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-view]'); if (!b) return;
    view = Number(b.getAttribute('data-view')); render();
    var again = $('thumbs').querySelector('[data-view="' + view + '"]'); if (again) again.focus({ preventScroll: true });
  });
  $('photo-tools').addEventListener('click', function (e) {
    var b = e.target.closest('button'), p = S.photos[view]; if (!b || !p) return;
    var focus = null;
    if (b.hasAttribute('data-main')) { S.photos.forEach(function (x) { x.main = x === p; }); focus = '[data-main]'; }
    else if (b.hasAttribute('data-intern')) { p.internal = !p.internal; if (p.internal) p.main = false; focus = '[data-intern]'; }
    else if (b.hasAttribute('data-del')) {
      if (!confirm('Foto ' + (view + 1) + ' verwijderen?')) return;
      try { URL.revokeObjectURL(p.url); } catch (err) {}
      S.photos.splice(view, 1); view = Math.max(0, Math.min(view, S.photos.length - 1));
    }
    render();
    var again = focus && $('photo-tools').querySelector(focus); if (again) again.focus({ preventScroll: true });
  });
  $('answer').addEventListener('submit', function (e) {
    e.preventDefault(); var step = current(), field = $('free');
    if (step && field) { freeAnswer(step, field.value); var again = $('free'); if (again && (error || step.kind === 'multi')) again.focus(); }
  });
  $('answer').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || b.type === 'submit') return;
    var step = current();
    if (b.id === 'voice') {
      if (voice.state !== 'idle') return stopVoice();
      voice.on = true; voice.note = ''; voice.said = ''; return speakQuestion(step);
    }
    if (b.hasAttribute('data-stop')) { gen++; if (ctl) ctl.abort(); thinking = false; S.analysed = photoSet(); S.phase = 'talk'; return render(); }
    if (b.hasAttribute('data-analyse')) return analyse();
    if (b.hasAttribute('data-next')) { S.analysed = photoSet(); S.phase = 'talk'; note = ''; return render(); }
    if (b.hasAttribute('data-save')) return save();
    if (b.hasAttribute('data-concept')) {
      // Het concept staat al op dit toestel (elke twee seconden bewaard); bewaar nu meteen en zeg dat.
      return saveDraft().then(function () {
        note = draftsOff ? 'Bewaren op dit toestel lukt niet. Laat dit scherm open, of vul de ontbrekende gegevens nu in.' : 'Bewaard als concept op dit toestel. Je maakt hem later af; in de boetiek staat hij nog niet.';
        render();
      });
    }
    if (!step) return;
    if (b.hasAttribute('data-heard-yes')) return acceptHeard();
    if (b.hasAttribute('data-heard-no')) return rejectHeard();
    if (b.hasAttribute('data-heard-stop')) { dropHeard(); return render(); }
    if (b.hasAttribute('data-skip')) return give(step, SKIP);
    if (b.hasAttribute('data-ready')) return give(step, multi.slice());
    if (b.hasAttribute('data-value')) {
      var v = b.getAttribute('data-value');
      if (step.kind === 'euro') return give(step, Number(v));
      if (step.kind !== 'multi') return give(step, v);
      var at = multi.indexOf(v); if (at >= 0) multi.splice(at, 1); else multi.push(v);
      b.setAttribute('aria-pressed', String(at < 0));
    }
  });
  $('talk').addEventListener('click', function (e) {
    if (saving) return;
    var b = e.target.closest('[data-edit],[data-photos]'); if (!b) return;
    multi = null; error = ''; note = ''; dropHeard(); reply = '';
    if (b.hasAttribute('data-photos')) { stopVoice(); S.phase = 'photos'; editing = null; }
    else editing = b.getAttribute('data-edit');
    steppedBack = false; render();
  });
  $('back').addEventListener('click', function () {
    reply = '';
    if (heard) { dropHeard(); error = ''; return render(); }
    // A question opened by tapping a line closes again; otherwise go one answered question further back.
    if (editing && !steppedBack) { editing = null; multi = null; error = ''; return render(); }
    var list = active(), at = editing ? list.map(function (s) { return s.id; }).indexOf(editing) : list.length;
    var before = list.slice(0, at < 0 ? list.length : at).filter(done), last = before[before.length - 1];
    multi = null; error = '';
    if (last) { editing = last.id; steppedBack = true; } else { editing = null; steppedBack = false; stopVoice(); S.phase = 'photos'; }
    render();
  });
  $('restart').addEventListener('click', function () {
    if (unsavedInput() && !confirm('Wat je hebt ingevuld is nog niet opgeslagen. Toch opnieuw beginnen met een leeg stuk?')) return;
    startOver();
  });
  setInterval(saveDraft, 2000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') saveDraft(); });
  addEventListener('pagehide', function () { saveDraft(); });

  // ---------- contract met de app (app/main.js, app/admin/collection.js) ----------
  window.NikkiIntake = {
    hasUnsavedInput: function () { return unsavedInput(); },
    // Unsaved changes to this saved piece are open here: Bewerken continues them instead of replacing them.
    editingUnsaved: function (key) { return !!key && S.edit && S.draftId === key && unsavedInput(); },
    unsavedTitle: function () { return I.known(S.A.titel) ? String(S.A.titel) : ''; },
    // Alleen waarschuwen bij verlaten als de laatste invoer nog niet op het toestel bewaard is.
    needsLeaveWarning: function () { return unsavedInput() && (draftsOff || snapshot() !== lastDraft); },
    // Een concept terugzetten; de app roept dit pas aan als de gebruiker beheerder is.
    restoreDraft: function () { draftRestored = restoreDraft(); return draftRestored; },
    get draftRestored() { return draftRestored; },
    // Het concept van dit toestel verwijderen (uitloggen).
    clearDraft: function () { return clearDraft(); },
    // Na een geslaagde opslag begint Nieuw stuk leeg, tenzij intussen een ander stuk is geopend.
    reset: function (savedKey) { if (!savedKey || !S.draftId || S.draftId === savedKey) startOver(); },
    // Een opgeslagen stuk openen om te bewerken: alle foto's (ook die alleen voor controle) en alle antwoorden.
    load: async function (record) {
      var internal = await app().internalPhotos(record.key);
      var incoming = await Promise.all(record.images.concat(internal.map(function (i) { return Object.assign({}, i, { main: false, internal: true }); })).map(async function (image) {
        var response = await fetch(image.src); if (!response.ok) throw Error('Een foto kon niet worden geopend.');
        var blob = await response.blob();
        return { file: new File([blob], 'foto.jpg', { type: blob.type }), cloudPath: image.path, rol: image.role || '', rolByUser: true, main: !!image.main, internal: !!image.internal, toelichting: '', bruikbaar: true };
      }));
      startOver();
      S.photos = incoming.map(function (p) { return Object.assign(p, { url: URL.createObjectURL(p.file) }); });
      S.A = I.fromRecord(record); S.draftId = record.key; S.edit = true; S.phase = 'talk'; S.analysed = photoSet();
      view = Math.max(0, S.photos.indexOf(mainPhoto()));
      markSaved(); render();
    }
  };
  render();
})();

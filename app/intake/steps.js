// Nieuw stuk als gesprek: de vragen, de keuzelijsten en de vertaling naar het productcontract.
// Zuivere functies zonder DOM of opslag, zodat ze los te testen zijn (tests/intake-steps.test.mjs).
// Regels: de bontsoort komt alleen van Nikki; een voorstel van Gemini is nooit vooraf gekozen;
// maten in cm, een ontbrekende maat is null; complimenten komen niet in de verkooptekst.
(function (root) {
  var SKIP = '—'; // "Weet ik nog niet": het gesprek gaat door, het stuk blijft een concept.
  var LISTS = {
    bont: ['Ja', 'Alleen kraag of rand', 'Nee'],
    materiaal: ['Leer', 'Suède', 'Shearling', 'Wol', 'Anders'],
    model: ['Sjaalkraag', 'Reverskraag', 'Opstaande kraag', 'Capuchon', 'Pilotenjack', 'Autojas', 'Trenchcoat', 'Cape', 'Bolero', 'Kort jack', 'Overslag met ceintuur'],
    kleur: ['Zwart', 'Donkerbruin', 'Bruin', 'Cognac', 'Camel', 'Honing', 'Crème', 'Wit', 'Zilvergrijs', 'Grijs'],
    lengte: ['Kort', 'Heuplang', 'Knielang', 'Lang'],
    pasvorm: ['Recht', 'Getailleerd', 'Boxy', 'Oversized'],
    periode: ['Jaren 50', 'Jaren 60', 'Jaren 70', 'Jaren 80', 'Jaren 90', 'Onbekend'],
    bontsoort: ['Nerts', 'Vos', 'Persianer', 'Konijn', 'Bisam', 'Wasbeer', 'Lam'],
    bijzonderheden: ['Bontkraag', 'Bontmanchetten', 'Ceintuur', 'Opgestikte zakken', 'Origineel label', 'Monogram', 'Zijden voering', 'Voering vernieuwd', 'Reparatie', 'Kale plek', 'Vlek', 'Ontbrekende knoop']
  };
  // Lijsten waar Nikki eigen woorden aan kan toevoegen; die gaan ook mee naar Gemini.
  var OWN = ['materiaal', 'model', 'kleur', 'bontsoort', 'bijzonderheden'];
  var ROLES = ['Voorkant', 'Achterkant', 'Label', 'Detail', 'Gebrek', 'Voering', 'Sluiting', 'Overig'];
  var FLAWS = ['Kale plek', 'Vlek', 'Reparatie', 'Ontbrekende knoop'];
  var WARM = { Nerts: 'O, mooi spul.', Vos: 'Vos, lekker vol.', Persianer: 'Persianer, dat zie je niet vaak.', Shearling: 'Shearling, heerlijk warm.', Leer: 'Mooi, leer.' };
  var PARTS = ['model', 'kleur', 'lengte'];

  function known(v) { return v !== undefined && v !== SKIP && v !== ''; }
  function hasFur(A) { return A.bont === 'Ja' || A.bont === 'Alleen kraag of rand'; }
  function lower(v) { return String(v).toLowerCase(); }
  // Alleen wat Nikki heeft gezegd of bevestigd komt in de titel; wat ze niet weet, blijft eruit.
  function composeTitle(A) {
    var len = { Kort: 'Korte', Heuplang: 'Heuplange', Knielang: 'Knielange', Lang: 'Lange' }[A.lengte] || '';
    var what = A.bont === 'Ja' ? A.bontsoort : A.materiaal;
    var collar = ['Sjaalkraag', 'Reverskraag', 'Opstaande kraag', 'Capuchon'].indexOf(A.model) >= 0 ? ' met ' + lower(A.model) : '';
    var text = (len ? len + ' jas' : 'Jas') + (known(what) && what !== 'Anders' && what !== 'Bont' ? ' van ' + lower(what) : '') + collar +
      (A.bont === 'Alleen kraag of rand' && known(A.bontsoort) ? ', kraag van ' + lower(A.bontsoort) : '');
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  function claimHint(G, field) {
    var words = G.controleer && Array.isArray(G.controleer[field]) ? G.controleer[field].filter(function (w) { return typeof w === 'string'; }).slice(0, 8) : [];
    return words.length ? 'Gemini noemt hierin: ' + words.join(', ') + '. Laat het alleen staan als het klopt.' : '';
  }

  // state = {A: antwoorden per vraag, G: voorstellen van Gemini (of leeg), learned: eigen woorden per lijst}.
  function build(state) {
    var A = function () { return state.A; }, G = function () { return state.G || {}; };
    var list = function (key) { return LISTS[key].concat((state.learned && state.learned[key]) || []); };
    var guess = function (key) { var v = G()[key]; return typeof v === 'string' && v.trim() ? v.trim() : null; };
    var seen = function () { return PARTS.filter(function (k) { return guess(k); }); };
    var part = function (key, ask, label) {
      return { id: key, need: true, label: label, own: OWN.indexOf(key) >= 0, ask: function () { return ask; }, options: function () { return list(key); }, guess: function () { return guess(key); },
        when: function () { return !(A().zie === 'Klopt' && guess(key)); } };
    };
    var cm = function (id, label, need, ask, warm) { return { id: id, need: need, label: label, kind: 'cm', ask: function () { return ask; }, warm: warm }; };
    return [
      { id: 'bont', need: true, label: 'Bont', ask: function () { return 'Is dit stuk van bont?'; },
        options: function () { return [['Ja', 'Ja, helemaal'], ['Alleen kraag of rand', 'Alleen kraag of rand'], ['Nee', 'Nee, geen bont']]; }, guess: function () { return LISTS.bont.indexOf(guess('bont')) >= 0 ? guess('bont') : null; },
        say: { 'Alleen kraag of rand': /kraag|rand/, Ja: /^(ja|helemaal)/, Nee: /^(nee|geen)/ },
        set: function (v) {
          var a = A();
          if (v === 'Ja') { if (!known(a.materiaal)) a.materiaal = 'Bont'; }
          else if (a.materiaal === 'Bont') delete a.materiaal;
          if (v === 'Nee') delete a.bontsoort;
        } },
      { id: 'bontsoort', need: true, label: 'Bontsoort', own: true, when: function () { return hasFur(A()); }, ask: function () { return 'Wat voor bont is dit?'; }, options: function () { return list('bontsoort'); }, guess: function () { return guess('bontsoort'); },
        hint: function () { return 'Jouw antwoord geldt als jouw eigen controle.'; }, warm: function (v) { return WARM[v] || 'Mooi. Die onthoud ik.'; } },
      { id: 'materiaal', need: true, label: 'Materiaal', own: true, when: function () { return A().bont !== 'Ja' || (known(A().materiaal) && A().materiaal !== 'Bont'); },
        ask: function () { return A().bont === 'Alleen kraag of rand' ? 'En de jas zelf, waar is die van gemaakt?' : 'Waar is het van gemaakt?'; }, options: function () { return list('materiaal'); },
        guess: function () { return guess('materiaal') === 'Bont' ? null : guess('materiaal'); }, warm: function (v) { return WARM[v] || ''; } },
      // Wat Gemini op de foto's zag, legt hij in één keer voor. Nikki bevestigt of loopt ze los langs.
      { id: 'zie', label: 'Model, kleur, lengte', when: function () { var a = A(); return a.zie !== undefined || (seen().length >= 2 && PARTS.every(function (k) { return a[k] === undefined; })); },
        ask: function () { var w = seen().map(function (k) { return lower(guess(k)); }); return 'Ik zie: ' + w.slice(0, -1).join(', ') + ' en ' + w[w.length - 1] + '. Klopt dat?'; },
        options: function () { return [['Klopt', 'Klopt'], ['Anders', 'Niet helemaal']]; }, say: { Klopt: /^(ja|klopt|goed|precies)/, Anders: /^(nee|niet)/ },
        set: function (v) {
          var a = A();
          PARTS.forEach(function (k) { if (v === 'Klopt' && guess(k)) a[k] = guess(k); else if (v === SKIP) a[k] = SKIP; else delete a[k]; });
        },
        warm: function (v) { return v === 'Klopt' ? '' : 'Dan lopen we ze even langs.'; } },
      part('model', 'Welk model is het?', 'Model'),
      part('kleur', 'Welke kleur heeft hij?', 'Kleur'),
      part('lengte', 'Hoe lang valt hij?', 'Lengte'),
      { id: 'pasvorm', label: 'Pasvorm', ask: function () { return 'Hoe valt hij?'; }, options: function () { return list('pasvorm'); }, guess: function () { return guess('pasvorm'); } },
      { id: 'periode', label: 'Periode', ask: function () { return 'Weet je uit welke tijd hij komt?'; }, options: function () { return list('periode'); }, guess: function () { return guess('periode'); },
        warm: function (v) { return v === 'Onbekend' ? 'Geen punt, dan laten we dat weg.' : v + ', mooi.'; } },
      { id: 'bijzonderheden', label: 'Bijzonderheden', kind: 'multi', own: true,
        ask: function () { var g = G().bijzonderheden; return (Array.isArray(g) && g.length ? 'Ik zie: ' + g.map(lower).join(', ') + '. ' : '') + 'Wat valt er nog meer op? Ook kleine gebreken.'; },
        options: function () { return list('bijzonderheden'); }, start: function () { var g = G().bijzonderheden; return Array.isArray(g) ? g.slice(0, 30) : []; },
        warm: function (v) { return v.some(function (x) { return FLAWS.indexOf(x) >= 0; }) ? 'Goed dat je het zegt. Dat komt eerlijk in de beschrijving.' : 'Genoteerd.'; } },
      cm('chest', 'Borstbreedte', true, 'Leg hem plat. Hoe breed is de borst, van oksel tot oksel?'),
      cm('length', 'Ruglengte', true, 'En de ruglengte, van de kraagnaad tot de zoom?'),
      cm('shoulder', 'Schouderbreedte', false, 'De schouders, van naad tot naad?'),
      cm('sleeve', 'Mouwlengte', false, 'En de mouw, van schoudernaad tot manchet?', function () { return 'Dat was het meten.'; }),
      { id: 'titel', need: true, label: 'Titel', kind: 'text', proposal: function () { return guess('titel') || composeTitle(A()); },
        ask: function () { return 'Als titel stel ik voor: “' + this.proposal() + '”. Goed zo?'; }, options: function () { return [[this.proposal(), 'Goed zo']]; },
        hint: function () { return guess('titel') ? claimHint(G(), 'titel') : ''; }, placeholder: 'Of typ je eigen titel' },
      { id: 'beschrijving', label: 'Beschrijving', kind: 'long', proposal: function () { return guess('beschrijving') || ''; },
        ask: function () { return guess('beschrijving') ? 'Dit is mijn voorstel voor de tekst in de boetiek. Pas hem aan zoals jij het zou zeggen.' : 'Wil je er nog iets over vertellen? Dit komt als tekst in de boetiek.'; },
        hint: function () { return guess('beschrijving') ? claimHint(G(), 'beschrijving') : ''; } },
      { id: 'prijs', need: true, label: 'Prijs', kind: 'euro', ask: function () { return 'Wat moet hij kosten?'; } }
    ];
  }

  function active(steps) { return steps.filter(function (s) { return !s.when || s.when(); }); }
  // Wat de boetiek nodig heeft en nog niet bekend is; photos: [{internal}].
  function missing(steps, A, photos) {
    var list = active(steps).filter(function (s) { return s.need && !known(A[s.id]); }).map(function (s) { return { id: s.id, label: s.label }; });
    if (!(photos || []).some(function (p) { return !p.internal; })) list.unshift({ id: 'fotos', label: 'Een foto voor de boetiek' });
    return list;
  }
  // Het productcontract van save_garment (docs/DATA-MODEL.md); images komt van de foto-overdracht.
  function product(A, key, images) {
    var text = function (v) { return known(v) ? String(v) : ''; }, n = function (v) { return known(v) ? Number(v) : null; };
    return { furClass: A.bont, key: key, title: text(A.titel).trim(), description: text(A.beschrijving).trim(), priceMinor: Math.round(Number(A.prijs) * 100),
      material: text(A.materiaal), species: hasFur(A) ? text(A.bontsoort) : null, model: text(A.model), colour: text(A.kleur), length: text(A.lengte),
      fit: text(A.pasvorm), era: text(A.periode), details: Array.isArray(A.bijzonderheden) ? A.bijzonderheden.slice(0, 30) : [],
      measurements: [n(A.chest), n(A.shoulder), n(A.sleeve), n(A.length)], images: images };
  }
  // Een opgeslagen stuk terug naar antwoorden, zodat bewerken in het overzicht begint.
  function fromRecord(record) {
    var or = function (v) { return typeof v === 'string' && v.trim() ? v : SKIP; }, m = record.measurements || [];
    var size = function (i) { return typeof m[i] === 'number' ? m[i] : SKIP; };
    var A = { bont: record.furClass, materiaal: or(record.material), model: or(record.model), kleur: or(record.colour), lengte: or(record.length),
      pasvorm: or(record.fit), periode: or(record.era), bijzonderheden: Array.isArray(record.details) ? record.details.slice() : [],
      chest: size(0), shoulder: size(1), sleeve: size(2), length: size(3), titel: or(record.title), beschrijving: typeof record.description === 'string' ? record.description : '',
      prijs: Number.isInteger(record.priceMinor) ? record.priceMinor / 100 : SKIP };
    if (hasFur(A)) A.bontsoort = or(record.species);
    return A;
  }
  // Voorstellen uit de fotoanalyse (supabase/functions/analyse): alleen korte tekst, nooit HTML.
  function proposals(d) {
    var G = {}, short = function (v, max) { return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : ''; };
    if (!d || typeof d !== 'object') return G;
    ['bont', 'materiaal', 'model', 'kleur', 'lengte', 'pasvorm', 'periode', 'bontsoort'].forEach(function (k) { var v = d[k] && short(d[k].waarde, 60); if (v) G[k] = v; });
    var extra = d.bijzonderheden && Array.isArray(d.bijzonderheden.waarde) ? d.bijzonderheden.waarde.map(function (v) { return short(v, 60); }).filter(Boolean).slice(0, 20) : [];
    if (extra.length) G.bijzonderheden = extra;
    if (short(d.titel, 200)) G.titel = short(d.titel, 200);
    if (typeof d.beschrijving === 'string' && d.beschrijving.trim()) G.beschrijving = d.beschrijving.trim().slice(0, 4000);
    if (d.controleer && typeof d.controleer === 'object') G.controleer = d.controleer;
    return G;
  }

  root.GSFIntake = { SKIP: SKIP, LISTS: LISTS, OWN: OWN, ROLES: ROLES, known: known, hasFur: hasFur, composeTitle: composeTitle, build: build, active: active, missing: missing, product: product, fromRecord: fromRecord, proposals: proposals };
})(typeof window !== 'undefined' ? window : globalThis);

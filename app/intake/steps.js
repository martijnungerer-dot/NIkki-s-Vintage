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
  var PARTS = ['model', 'kleur', 'lengte'];

  // ---------- zo praat het scherm ----------
  // Per gelegenheid een paar zinnen. Welke zin komt, hangt af van het stuk (seed), de vraag en het
  // antwoord: zo klinkt elk stuk anders, maar verspringt een zin niet bij opnieuw tekenen.
  // Reacties zijn gesprek met Nikki, geen verkooptekst: ze komen nooit in titel of beschrijving.
  var SAY = {
    skip: ['Geen punt, dat kan later.', 'Prima, dat komt later wel.', 'Laten we dat even laten liggen.', 'Goed, dat vullen we later in.'],
    fur: {
      Nerts: ['O, mooi spul.', 'Nerts. Zacht, hè?', 'Nerts, mooi.'],
      Vos: ['Vos, lekker vol.', 'Vos. Die valt op.', 'Mooi, vos.'],
      Persianer: ['Persianer, dat zie je niet vaak.', 'Persianer. Mooi krullend.', 'O, persianer.'],
      Konijn: ['Konijn, lekker zacht.', 'Konijn. Licht en warm.'],
      Lam: ['Lam, mooi.', 'Lam. Fijn.'],
      Bisam: ['Bisam, die zie je niet vaak meer.', 'Bisam, mooi.'],
      Wasbeer: ['Wasbeer. Lekker vol.', 'Wasbeer, mooi.']
    },
    furOther: ['Mooi. Die onthoud ik.', 'Genoteerd, die zet ik erbij.', 'Die kende ik nog niet. Ik onthoud hem.'],
    material: {
      Leer: ['Mooi, leer.', 'Leer. Dat wordt alleen maar mooier.', 'Leer, fijn.'],
      'Suède': ['Suède, zacht.', 'Mooi, suède.', 'Suède. Fijn.'],
      Shearling: ['Shearling, heerlijk warm.', 'Shearling. Daar kruip je zo in.', 'Mooi, shearling.'],
      Wol: ['Wol, lekker warm.', 'Mooi, wol.', 'Wol. Fijn.']
    },
    seeAll: ['', 'Mooi, dan hoef ik dat niet te vragen.', 'Fijn, dat scheelt.'],
    seeNot: ['Dan lopen we ze even langs.', 'Goed, dan vraag ik het even los.', 'Geen punt, dan doen we ze een voor een.'],
    model: ['{V}, mooi model.', '{V}. Duidelijk.', 'Een {v}, mooi.'],
    colour: ['{V}, mooi.', 'Mooi, {v}.', '{V}. Genoteerd.'],
    colourWith: ['{V} en {m}, mooie combinatie.', '{V} bij {m}, dat staat.'],
    length: ['{V}, genoteerd.', 'Goed, {v}.', '{V}. Duidelijk.'],
    fit: ['Genoteerd.', 'Duidelijk.', 'Goed.'],
    era: ['{V}, mooi.', 'Mooi, {v}.', '{V}, genoteerd.'],
    eraUnknown: ['Geen punt, dan laten we dat weg.', 'Prima, dat hoeft niet.', 'Dan laten we de periode weg.'],
    flaws: ['Goed dat je het zegt. Dat komt eerlijk in de beschrijving.', 'Fijn dat je dat noemt. Eerlijk is het mooist.', 'Goed om te weten. Dat zetten we er eerlijk bij.'],
    details: ['Genoteerd.', 'Mooi, die zet ik erbij.', 'Goed, staat erin.'],
    noDetails: ['Goed, niets bijzonders.', 'Prima.', 'Duidelijk.'],
    cm: ['{V} cm, genoteerd.', 'Oké, {v} cm.', '{V} cm. Staat erin.'],
    measured: ['Dat was het meten.', 'Klaar met meten.', 'Dat waren de maten. Dank je.'],
    title: ['Mooi.', 'Goede titel.', 'Fijn.'],
    text: ['Mooi verwoord.', 'Dank je, die neem ik over.', 'Mooi, zo klinkt het als jij.'],
    // De eerste zin van het gesprek, als Gemini zelf geen openingszin gaf.
    openSeen: ['Ik heb goed gekeken.', 'Dank je. Ik heb ze bekeken.', 'Ik heb de foto’s bekeken.'],
    openSelf: ['Goed, dan vullen we hem samen in.', 'Fijn. We lopen hem samen door.', 'Prima, dan beginnen we.']
  };
  function hash(text) { var h = 2166136261; for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  // Een zin uit de lijst kiezen, vast per stuk en per antwoord; {v} en {V} worden het antwoord, {m} het materiaal.
  function pick(list, key, fill) {
    if (!list || !list.length) return '';
    var line = list[hash(String(key)) % list.length], f = fill || {};
    return line.replace(/\{V\}/g, f.v ? cap(f.v) : '').replace(/\{v\}/g, f.v ? lower(f.v) : '').replace(/\{m\}/g, f.m ? lower(f.m) : '');
  }
  function cap(v) { v = String(v); return v.charAt(0).toUpperCase() + v.slice(1); }

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
    // Vast per stuk: dezelfde vraag met hetzelfde antwoord geeft steeds dezelfde zin.
    var say = function (list, id, v, fill) { return pick(list, (state.seed || 0) + '|' + id + '|' + (Array.isArray(v) ? v.join(',') : v), fill); };
    var mat = function () { var m = A().materiaal; return known(m) && m !== 'Anders' && m !== 'Bont' ? m : ''; };
    var part = function (key, ask, label, warm) {
      return { id: key, need: true, label: label, own: OWN.indexOf(key) >= 0, ask: typeof ask === 'function' ? ask : function () { return ask; }, options: function () { return list(key); }, guess: function () { return guess(key); }, warm: warm,
        when: function () { return !(A().zie === 'Klopt' && guess(key)); } };
    };
    var cm = function (id, label, need, ask, warm) { return { id: id, need: need, label: label, kind: 'cm', ask: function () { return ask; },
      warm: warm || function (v) { return say(SAY.cm, id, v, { v: String(v).replace('.', ',') }); } }; };
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
        hint: function () { return 'Jouw antwoord geldt als jouw eigen controle.'; }, warm: function (v) { return say(SAY.fur[v] || SAY.furOther, 'bontsoort', v); } },
      { id: 'materiaal', need: true, label: 'Materiaal', own: true, when: function () { return A().bont !== 'Ja' || (known(A().materiaal) && A().materiaal !== 'Bont'); },
        ask: function () { return A().bont === 'Alleen kraag of rand' ? 'En de jas zelf, waar is die van gemaakt?' : 'Waar is het van gemaakt?'; }, options: function () { return list('materiaal'); },
        guess: function () { return guess('materiaal') === 'Bont' ? null : guess('materiaal'); }, warm: function (v) { return SAY.material[v] ? say(SAY.material[v], 'materiaal', v) : ''; } },
      // Wat Gemini op de foto's zag, legt hij in één keer voor. Nikki bevestigt of loopt ze los langs.
      { id: 'zie', label: 'Model, kleur, lengte', when: function () { var a = A(); return a.zie !== undefined || (seen().length >= 2 && PARTS.every(function (k) { return a[k] === undefined; })); },
        ask: function () { var w = seen().map(function (k) { return lower(guess(k)); }); return 'Ik zie: ' + w.slice(0, -1).join(', ') + ' en ' + w[w.length - 1] + '. Klopt dat?'; },
        options: function () { return [['Klopt', 'Klopt'], ['Anders', 'Niet helemaal']]; }, say: { Klopt: /^(ja|klopt|goed|precies)/, Anders: /^(nee|niet)/ },
        set: function (v) {
          var a = A();
          PARTS.forEach(function (k) { if (v === 'Klopt' && guess(k)) a[k] = guess(k); else if (v === SKIP) a[k] = SKIP; else delete a[k]; });
        },
        warm: function (v) { return say(v === 'Klopt' ? SAY.seeAll : SAY.seeNot, 'zie', v); } },
      part('model', 'Welk model is het?', 'Model', function (v) { return say(SAY.model, 'model', v, { v: v }); }),
      part('kleur', function () { return known(A().model) ? pick(['En de kleur?', 'Welke kleur heeft hij?'], state.seed + 'kleur') : 'Welke kleur heeft hij?'; }, 'Kleur',
        function (v) { return mat() ? say(SAY.colourWith, 'kleur', v, { v: v, m: mat() }) : say(SAY.colour, 'kleur', v, { v: v }); }),
      part('lengte', function () { return pick(['Hoe lang valt hij?', 'En de lengte? Waar valt hij?', 'Hoe lang is hij?'], state.seed + 'lengte'); }, 'Lengte', function (v) { return say(SAY.length, 'lengte', v, { v: v }); }),
      { id: 'pasvorm', label: 'Pasvorm', ask: function () { return pick(['Hoe valt hij?', 'En de pasvorm?', 'Hoe zit hij, qua pasvorm?'], state.seed + 'pasvorm'); }, options: function () { return list('pasvorm'); }, guess: function () { return guess('pasvorm'); },
        warm: function (v) { return say(SAY.fit, 'pasvorm', v); } },
      { id: 'periode', label: 'Periode', ask: function () { return pick(['Weet je uit welke tijd hij komt?', 'Uit welke tijd komt hij, denk je?', 'Weet je de periode?'], state.seed + 'periode'); }, options: function () { return list('periode'); }, guess: function () { return guess('periode'); },
        warm: function (v) { return v === 'Onbekend' ? say(SAY.eraUnknown, 'periode', v) : say(SAY.era, 'periode', v, { v: v }); } },
      { id: 'bijzonderheden', label: 'Bijzonderheden', kind: 'multi', own: true,
        ask: function () { var g = G().bijzonderheden; return (Array.isArray(g) && g.length ? 'Ik zie: ' + g.map(lower).join(', ') + '. ' : '') + 'Wat valt er nog meer op? Ook kleine gebreken.'; },
        options: function () { return list('bijzonderheden'); }, start: function () { var g = G().bijzonderheden; return Array.isArray(g) ? g.slice(0, 30) : []; },
        warm: function (v) { return say(v.some(function (x) { return FLAWS.indexOf(x) >= 0; }) ? SAY.flaws : v.length ? SAY.details : SAY.noDetails, 'bijzonderheden', v); } },
      cm('chest', 'Borstbreedte', true, 'Leg hem plat. Hoe breed is de borst, van oksel tot oksel?'),
      cm('length', 'Ruglengte', true, 'En de ruglengte, van de kraagnaad tot de zoom?'),
      cm('shoulder', 'Schouderbreedte', false, 'De schouders, van naad tot naad?'),
      cm('sleeve', 'Mouwlengte', false, 'En de mouw, van schoudernaad tot manchet?', function (v) { return say(SAY.measured, 'sleeve', v); }),
      { id: 'titel', need: true, label: 'Titel', kind: 'text', proposal: function () { return guess('titel') || composeTitle(A()); },
        ask: function () { return 'Als titel stel ik voor: “' + this.proposal() + '”. Goed zo?'; }, options: function () { return [[this.proposal(), 'Goed zo']]; },
        hint: function () { return guess('titel') ? claimHint(G(), 'titel') : ''; }, placeholder: 'Of typ je eigen titel', warm: function (v) { return say(SAY.title, 'titel', v); } },
      { id: 'beschrijving', label: 'Beschrijving', kind: 'long', proposal: function () { return guess('beschrijving') || ''; },
        ask: function () { return guess('beschrijving') ? 'Dit is mijn voorstel voor de tekst in de boetiek. Pas hem aan zoals jij het zou zeggen.' : 'Wil je er nog iets over vertellen? Dit komt als tekst in de boetiek.'; },
        hint: function () { return guess('beschrijving') ? claimHint(G(), 'beschrijving') : ''; }, warm: function (v) { return known(v) && String(v).trim() ? say(SAY.text, 'beschrijving', v.length) : ''; } },
      // Het voorstel uit eigen verkopen staat als knop, nooit vooraf gekozen; zonder verkopen alleen de vraag.
      { id: 'prijs', need: true, label: 'Prijs', kind: 'euro',
        ask: function () { var p = priceProposal(A(), state.sales); return p ? p.say + ' Wat moet deze kosten?' : 'Wat moet hij kosten?'; },
        options: function () { var p = priceProposal(A(), state.sales); return p ? [[String(p.proposal), 'Rond € ' + p.proposal]] : []; } }
    ];
  }

  // ---------- voorstellen van Gemini in gewone taal ----------
  // "Gemini denkt: Nerts. Korte, glanzende haren." Met weinig zekerheid zegt hij dat hij twijfelt.
  function guessLine(step, G, label) {
    var g = step.guess && step.guess(); if (!g) return '';
    var why = G && G.why && typeof G.why[step.id] === 'string' ? G.why[step.id].trim() : '', sure = G && G.sure ? G.sure[step.id] : '';
    var head = sure === 'laag' ? 'Gemini twijfelt, misschien ' + lower(label || g) + '.' : 'Gemini denkt: ' + (label || g) + '.';
    return head + (why ? ' ' + cap(why).replace(/[.!]?$/, '.') : '') + ' Tik het aan als het klopt.';
  }
  // De eerste zin van het gesprek: Gemini's eigen zin over dit stuk, of een korte zin van het scherm.
  function opening(G, seed) {
    if (G && typeof G.opening === 'string' && G.opening.trim()) return G.opening.trim();
    var seen = G && Object.keys(G).some(function (k) { return k !== 'controleer' && k !== 'why' && k !== 'sure'; });
    return pick(seen ? SAY.openSeen : SAY.openSelf, (seed || 0) + '|open');
  }

  // ---------- prijsvoorstel uit eigen verkopen ----------
  // sales: [{furClass, species, material, length, priceMinor}] van verkochte stukken (alleen beheer).
  // Vergelijkbaar is: dezelfde bontsoort bij een bontjas, anders hetzelfde materiaal; zijn er
  // genoeg met dezelfde lengte, dan alleen die. Het voorstel is de mediaan, afgerond op € 5.
  var LENGTH_WORD = { Kort: 'korte', Heuplang: 'heuplange', Knielang: 'knielange', Lang: 'lange' };
  function euroText(minor) { var e = minor / 100; return '€ ' + (e % 1 ? e.toFixed(2).replace('.', ',') : String(e)); }
  function priceProposal(A, sales) {
    if (!Array.isArray(sales) || !sales.length || !A) return null;
    var same = function (a, b) { return typeof a === 'string' && typeof b === 'string' && a.trim().toLowerCase() === b.trim().toLowerCase(); };
    var basis, match;
    if (A.bont === 'Ja' && known(A.bontsoort)) { basis = A.bontsoort; match = function (s) { return s.furClass === 'Ja' && same(s.species, A.bontsoort); }; }
    else if (known(A.materiaal) && A.materiaal !== 'Bont' && A.materiaal !== 'Anders') { basis = A.materiaal; match = function (s) { return s.furClass !== 'Ja' && same(s.material, A.materiaal); }; }
    else return null;
    var found = sales.filter(function (s) { return s && Number.isInteger(s.priceMinor) && s.priceMinor > 0 && match(s); });
    var len = '';
    if (known(A.lengte) && LENGTH_WORD[A.lengte]) {
      var sameLength = found.filter(function (s) { return s.length === A.lengte; });
      if (sameLength.length >= 3) { found = sameLength; len = LENGTH_WORD[A.lengte] + ' '; }
    }
    if (!found.length) return null;
    var prices = found.map(function (s) { return s.priceMinor; }).sort(function (a, b) { return a - b; }), n = prices.length;
    var median = n % 2 ? prices[(n - 1) / 2] : (prices[n / 2 - 1] + prices[n / 2]) / 2;
    var proposal = Math.max(5, Math.round(median / 500) * 5), what = len + 'stuk' + (n === 1 ? '' : 'ken') + ' van ' + lower(basis);
    var said = n === 1 ? 'Van je eigen verkopen: één ' + what + ' ging voor ' + euroText(prices[0]) + '.'
      : prices[0] === prices[n - 1] ? 'Van je eigen verkopen: ' + n + ' ' + what + ' gingen allemaal voor ' + euroText(prices[0]) + '.'
      : 'Van je eigen verkopen: ' + n + ' ' + what + ' gingen voor ' + euroText(prices[0]) + ' tot ' + euroText(prices[n - 1]) + '.';
    return { count: n, low: prices[0], high: prices[n - 1], proposal: proposal, say: said };
  }

  // ---------- vrije zinnen (supabase/functions/begrijp) ----------
  // Wat Gemini uit Nikki's eigen woorden haalde, terug naar antwoorden. Alleen bekende velden; lijsten
  // zonder eigen woorden moeten een bestaande keuze zijn; een bontsoort alleen bij bont. Niets wordt
  // ingevuld voordat Nikki "Klopt" zegt (app/intake/main.js).
  var HEARD = ['bont', 'materiaal', 'bontsoort', 'model', 'kleur', 'lengte', 'pasvorm', 'periode', 'bijzonderheden'];
  function interpret(result, A, learned) {
    var out = { values: [], reply: '' };
    if (!result || typeof result !== 'object') return out;
    var fields = result.velden && typeof result.velden === 'object' ? result.velden : {};
    // Te lang of te veel woorden is geen keuzewoord maar een zin: dat valt weg.
    var clean = function (v) { v = typeof v === 'string' ? v.replace(/[\u0000-\u001f<>{}]/g, '').replace(/\s+/g, ' ').trim() : ''; return v.length <= 40 && v.split(' ').length <= 4 ? v : ''; };
    var fit = function (key, v) {
      v = clean(v); if (!v) return '';
      var options = (key === 'bont' ? LISTS.bont : LISTS[key].concat((learned && learned[key]) || []));
      var hit = options.filter(function (o) { return o.toLowerCase() === v.toLowerCase(); })[0];
      if (hit) return hit;
      return OWN.indexOf(key) >= 0 && /^[\p{L}][\p{L} '’-]*$/u.test(v) ? cap(v) : '';
    };
    var bont = fit('bont', fields.bont), fur = bont ? bont !== 'Nee' : hasFur(A || {});
    HEARD.forEach(function (key) {
      if (key === 'bijzonderheden') {
        var list = Array.isArray(fields.bijzonderheden) ? fields.bijzonderheden.map(function (v) { return fit(key, v); }).filter(Boolean).slice(0, 10) : [];
        if (list.length) out.values.push([key, list]);
        return;
      }
      var v = key === 'bont' ? bont : fit(key, fields[key]);
      if (!v || (key === 'bontsoort' && !fur) || (key === 'materiaal' && v === 'Bont')) return;
      out.values.push([key, v]);
    });
    if (typeof result.reactie === 'string') out.reply = result.reactie.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 160);
    return out;
  }
  // "materiaal shearling, bontsoort vos" voor de vraag of het klopt.
  var HEARD_LABEL = { bont: 'bont', materiaal: 'materiaal', bontsoort: 'bontsoort', model: 'model', kleur: 'kleur', lengte: 'lengte', pasvorm: 'pasvorm', periode: 'periode', bijzonderheden: 'bijzonderheden' };
  function heardText(values) {
    var BONT = { Ja: 'helemaal bont', 'Alleen kraag of rand': 'bont alleen aan kraag of rand', Nee: 'geen bont' };
    return values.map(function (kv) { return kv[0] === 'bont' ? BONT[kv[1]] : HEARD_LABEL[kv[0]] + ' ' + (Array.isArray(kv[1]) ? kv[1].map(lower).join(' en ') : lower(kv[1])); }).join(', ');
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
    ['bont', 'materiaal', 'model', 'kleur', 'lengte', 'pasvorm', 'periode', 'bontsoort'].forEach(function (k) {
      var v = d[k] && short(d[k].waarde, 60); if (!v) return;
      G[k] = v;
      // Waarom en hoe zeker: zo kan het scherm zeggen "Gemini denkt …, omdat …" of "Gemini twijfelt".
      var why = short(d[k].waarom, 140); if (why) (G.why = G.why || {})[k] = why;
      if (['laag', 'middel', 'hoog'].indexOf(d[k].zekerheid) >= 0) (G.sure = G.sure || {})[k] = d[k].zekerheid;
    });
    if (short(d.opening, 160)) G.opening = short(d.opening, 160);
    var extra = d.bijzonderheden && Array.isArray(d.bijzonderheden.waarde) ? d.bijzonderheden.waarde.map(function (v) { return short(v, 60); }).filter(Boolean).slice(0, 20) : [];
    if (extra.length) G.bijzonderheden = extra;
    if (short(d.titel, 200)) G.titel = short(d.titel, 200);
    if (typeof d.beschrijving === 'string' && d.beschrijving.trim()) G.beschrijving = d.beschrijving.trim().slice(0, 4000);
    if (d.controleer && typeof d.controleer === 'object') G.controleer = d.controleer;
    return G;
  }

  function skipLine(seed, id) { return pick(SAY.skip, (seed || 0) + '|skip|' + id); }

  root.GSFIntake = { SKIP: SKIP, LISTS: LISTS, OWN: OWN, ROLES: ROLES, known: known, hasFur: hasFur, composeTitle: composeTitle, build: build, active: active, missing: missing, product: product, fromRecord: fromRecord, proposals: proposals,
    guessLine: guessLine, opening: opening, skipLine: skipLine, priceProposal: priceProposal, interpret: interpret, heardText: heardText, HEARD: HEARD };
})(typeof window !== 'undefined' ? window : globalThis);

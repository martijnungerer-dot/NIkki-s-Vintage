// Concepten: onafgemaakte stukken, foto's inbegrepen, blijven op dit toestel bewaard (IndexedDB).
// Er kunnen meerdere concepten tegelijk zijn (Martijn, 22 november 2026): elk stuk onder zijn eigen sleutel,
// zodat het openen van een ander stuk of een nieuw stuk een concept nooit meer wist.
// Niets hiervan gaat naar de server. Verder werken op een ander apparaat staat als idee in docs/PLAN.md.
(function (root) {
  var DB = 'gsf-intake', STORE = 'drafts', CONCEPT = 'concept:', PHOTOS = 'photos:';
  function open() {
    return new Promise(function (resolve, reject) {
      var request; try { request = indexedDB.open(DB, 1); } catch (error) { reject(error); return; }
      request.onupgradeneeded = function () { request.result.createObjectStore(STORE); };
      request.onsuccess = function () { resolve(request.result); }; request.onerror = function () { reject(request.error); };
    });
  }
  function run(mode, work) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, mode), request = work(tx.objectStore(STORE));
        tx.oncomplete = function () { resolve(request && request.result); }; tx.onerror = tx.onabort = function () { reject(tx.error); };
      }).finally(function () { db.close(); });
    });
  }
  function all() {
    return run('readonly', function (s) { return s.getAllKeys(); }).then(function (keys) {
      return Promise.all(keys.map(function (k) { return run('readonly', function (s) { return s.get(k); }).then(function (v) { return [k, v]; }); }));
    });
  }
  // Het ene concept van vóór 22 november 2026 ('current' en 'photos') krijgt een eigen sleutel; er gaat niets verloren.
  var migrated = null;
  function migrate() {
    if (!migrated) migrated = run('readonly', function (s) { return s.get('current'); }).then(function (old) {
      if (!old) return;
      return run('readonly', function (s) { return s.get('photos'); }).then(function (files) {
        var id = typeof old.draftId === 'string' && old.draftId ? old.draftId : 'oud-' + (old.at || Date.now());
        old.draftId = id;
        return run('readwrite', function (s) { s.put(old, CONCEPT + id); s.put(Array.isArray(files) ? files : [], PHOTOS + id); s.delete('photos'); return s.delete('current'); });
      });
    });
    return migrated;
  }
  root.GSFIntake.store = {
    DAYS: 14,
    // Alle concepten, nieuwste eerst, met hun foto's.
    list: function () {
      return migrate().then(all).then(function (pairs) {
        var files = {};
        pairs.forEach(function (p) { if (String(p[0]).indexOf(PHOTOS) === 0) files[p[0].slice(PHOTOS.length)] = p[1]; });
        return pairs.filter(function (p) { return String(p[0]).indexOf(CONCEPT) === 0 && p[1] && typeof p[1] === 'object'; })
          .map(function (p) { var id = p[0].slice(CONCEPT.length); return { id: id, draft: p[1], files: Array.isArray(files[id]) ? files[id] : [] }; })
          .sort(function (a, b) { return (b.draft.at || 0) - (a.draft.at || 0); });
      });
    },
    get: function (id) {
      return migrate().then(function () {
        return run('readonly', function (s) { return s.get(CONCEPT + id); }).then(function (draft) {
          if (!draft) return null;
          return run('readonly', function (s) { return s.get(PHOTOS + id); }).then(function (files) { return { id: id, draft: draft, files: Array.isArray(files) ? files : [] }; });
        });
      });
    },
    // files weglaten: de foto's van dit concept blijven zoals ze waren (ze veranderen minder vaak dan de antwoorden).
    put: function (id, draft, files) {
      return migrate().then(function () { return run('readwrite', function (s) { if (files) s.put(files, PHOTOS + id); return s.put(draft, CONCEPT + id); }); });
    },
    remove: function (id) {
      return migrate().then(function () { return run('readwrite', function (s) { s.delete(PHOTOS + id); return s.delete(CONCEPT + id); }); });
    },
    clear: function () { return run('readwrite', function (s) { return s.clear(); }); }
  };
})(window);

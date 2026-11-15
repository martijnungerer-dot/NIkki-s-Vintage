// Concepten: een half ingevoerd stuk, foto's inbegrepen, blijft op dit toestel bewaard (IndexedDB).
// Er is één concept tegelijk. Niets hiervan gaat naar de server. Zie docs/BEHEER-PLAN.md, fase 2.
(function (root) {
  var DB = 'gsf-intake', STORE = 'drafts';
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
  root.GSFIntake.store = {
    KEY: 'current', PHOTOS: 'photos', DAYS: 14,
    get: function (key) { return run('readonly', function (s) { return s.get(key); }); },
    put: function (key, value) { return run('readwrite', function (s) { return s.put(value, key); }); },
    clear: function () { return run('readwrite', function (s) { s.delete('photos'); return s.delete('current'); }); }
  };
})(window);

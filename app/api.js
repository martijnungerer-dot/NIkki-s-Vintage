// Small REST adapter; secrets and staff authorization live on the server.
export class Api {
  constructor(config, fetcher = fetch, storage = sessionStorage) {
    this.url = config.supabaseUrl.replace(/\/$/, '');
    this.key = config.supabasePublishableKey;
    this.fetch = (...args) => fetcher(...args); this.storage = storage;
    this.sessionKey = 'nikki-session:' + this.url;
    try { this.session = JSON.parse(storage.getItem(this.sessionKey) || 'null'); } catch { this.session = null; }
  }
  configured() { return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(this.url) && !!this.key; }
  keep(session) {
    this.session = session;
    if (session) this.storage.setItem(this.sessionKey, JSON.stringify(session));
    else this.storage.removeItem(this.sessionKey);
  }
  async request(path, {method = 'GET', body, auth = true, headers = {}, signal} = {}) {
    if (!this.configured()) throw Error('De verbinding is nog niet ingesteld. Zie de starthandleiding.');
    if (auth && this.session && this.session.expires_at * 1000 < Date.now() + 60000) await this.refresh();
    const response = await this.fetch(this.url + path, {
      method, signal: signal || AbortSignal.timeout(45000),
      headers: {apikey: this.key, ...(auth && this.session ? {Authorization: 'Bearer ' + this.session.access_token} : {}), ...headers,
        ...(body && !(body instanceof Blob) ? {'Content-Type': 'application/json'} : {})},
      body: body instanceof Blob ? body : body ? JSON.stringify(body) : undefined
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const error = Error(response.status === 409 || data?.message?.includes('VERSION_CONFLICT') ? 'Dit stuk is elders gewijzigd. Vernieuw de collectie en open het opnieuw.' :
        data?.message?.includes('INVALID_PRODUCT') ? 'Dit stuk is niet opgeslagen. Controleer naam, materiaal, model, kleur, lengte, prijs, borstbreedte, ruglengte, de bontsoort bij bont en één hoofdfoto.' :
        data?.message?.includes('PHOTO_NOT_UPLOADED') ? 'Een foto is nog niet goed geüpload. Sla opnieuw op; je invoer blijft staan.' :
        response.status === 401 ? 'Log opnieuw in om verder te gaan.' :
        response.status === 429 ? 'De analyselimiet is bereikt. Vul zelf in of probeer morgen opnieuw.' :
        response.status === 403 ? 'Dit account heeft geen beheerrechten.' :
        data?.error === 'NOT_CONFIGURED' ? 'Fotoanalyse is nog niet ingesteld. Je kunt zelf invullen.' :
        data?.error === 'GEMINI_BUSY' ? 'Gemini is even te druk. Wacht een minuut en probeer opnieuw, of vul zelf in.' :
        data?.error === 'ANALYSIS_TIMEOUT' ? 'Gemini deed er te lang over. Probeer het nog eens of vul zelf in.' :
        data?.error === 'BAD_IMAGES' ? 'Een foto is niet geschikt voor analyse. Kies een andere foto of vul zelf in.' :
        'De handeling is niet afgerond. Je invoer blijft staan; probeer opnieuw.');
      error.status = response.status; error.code = data?.error || data?.code; throw error;
    }
    return data;
  }
  async refresh() {
    if (!this.refreshing) this.refreshing = this.request('/auth/v1/token?grant_type=refresh_token', {method: 'POST', auth: false,
      body: {refresh_token: this.session?.refresh_token}}).then(s => this.keep({...s, expires_at: s.expires_at || Date.now()/1000 + s.expires_in}))
      .catch(e => {this.keep(null); throw e;}).finally(() => {this.refreshing = null;});
    return this.refreshing;
  }
  async login(email, password) {
    let s;
    try { s = await this.request('/auth/v1/token?grant_type=password', {method:'POST', auth:false, body:{email,password}}); }
    catch(e) {
      // Supabase answers a wrong address or password with 400 invalid_credentials.
      if(e.status === 400 || e.status === 401) { e.message = 'E-mailadres of wachtwoord klopt niet.'; e.badLogin = true; }
      throw e;
    }
    this.keep({...s, expires_at:s.expires_at || Date.now()/1000+s.expires_in});
    try { await this.request('/rest/v1/rpc/require_staff', {method:'POST', body:{}}); }
    catch(e) {
      // Not staff (or check failed): also end the session on the server, not only in this browser.
      try { await this.request('/auth/v1/logout', {method:'POST'}); } catch {}
      this.keep(null); throw e;
    }
  }
  // Asks Supabase to e-mail a reset link. The answer never says whether the address exists.
  async recover(email, redirectTo) {
    try { await this.request('/auth/v1/recover?redirect_to=' + encodeURIComponent(redirectTo), {method:'POST', auth:false, body:{email}}); }
    catch(e) {
      if (e.status === 429) e.message = 'Er is net al een link gevraagd. Kijk in je mail of probeer het over een uur opnieuw.';
      throw e;
    }
  }
  // Sets a new password with the short-lived session from the reset link. That session stays
  // in memory only; it is stored like a normal login once the password is saved and the
  // account has been confirmed as staff.
  async setPassword(session, password) {
    this.session = session;
    try {
      await this.request('/auth/v1/user', {method:'PUT', body:{password}});
    } catch(e) {
      this.session = null;
      if (e.status === 401 || e.status === 403) { e.expired = true; e.message = 'Deze link is verlopen of al gebruikt. Vraag hieronder een nieuwe aan.'; }
      else if (e.status === 422) e.message = e.code === 'same_password' ? 'Kies een ander wachtwoord dan je vorige.' : 'Kies een sterker wachtwoord van minstens 8 tekens.';
      throw e;
    }
    try { await this.request('/rest/v1/rpc/require_staff', {method:'POST', body:{}}); }
    catch(e) { try { await this.request('/auth/v1/logout', {method:'POST'}); } catch {} this.session = null; throw e; }
    this.keep(this.session);
  }
  async logout() {
    try {if(this.session) await this.request('/auth/v1/logout', {method:'POST'});} finally {this.keep(null);}
  }
  async list() {
    let rows = [], offset = 0;
    for (;;) {
      const batch = await this.request('/rest/v1/garments?select=id,data,status,version,display_id&order=created_at.desc,id.asc&limit=100&offset=' + offset);
      rows.push(...batch); if(batch.length < 100) break; offset += batch.length;
    }
    return rows;
  }
  // Signs many photos in one request. Paths that cannot be signed are left out of the result,
  // so one missing photo never blocks the rest of the collection.
  async imageUrls(paths) {
    const urls = new Map();
    for (let i = 0; i < paths.length; i += 100) {
      const part = paths.slice(i, i + 100);
      const list = await this.request('/storage/v1/object/sign/garment-photos', {method:'POST', body:{expiresIn:3600, paths:part}});
      for (const item of Array.isArray(list) ? list : [])
        if (item && !item.error && typeof item.signedURL === 'string' && part.includes(item.path)) urls.set(item.path, this.url + '/storage/v1' + item.signedURL);
    }
    return urls;
  }
  async upload(id, image) {
    if(image.path && new RegExp('^'+id+'/[a-f0-9]{64}\\.(jpg|png|webp)$').test(image.path)) return {path:image.path,role:image.role,main:image.main};
    const blob = await (await this.fetch(image.src)).blob();
    const bytes = await blob.arrayBuffer();
    if(bytes.byteLength > 2*1024*1024) throw Error('Deze foto is te groot na verkleinen. Kies een andere foto.');
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
    const ext = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[blob.type];
    if(!ext) throw Error('Gebruik JPG, PNG of WebP.');
    const path = id + '/' + hash + '.' + ext;
    try {await this.request('/storage/v1/object/garment-photos/' + path, {method:'POST',body:blob,headers:{'Content-Type':blob.type,'x-upsert':'false'}});}
    catch(e) {if(e.status !== 409 && e.code !== 'Duplicate') throw e;}
    return {path,role:image.role,main:image.main};
  }
  // Public photos go into the catalogue; photos "Alleen voor controle" (internal) only into the
  // staff-only table garment_private, so visitors can never see them. The latest Gemini proposal
  // is stored next to them for later comparison (never in the browser of a visitor).
  async save(product, version, {ai = null, onProgress = () => {}} = {}) {
    // Upload up to three photos at a time (much faster on a phone than one by one), keeping order.
    const stored = new Array(product.images.length); let next = 0, done = 0, failed = false;
    const total = product.images.length;
    onProgress(total === 1 ? 'Foto opslaan…' : 'Foto’s opslaan: 0 van ' + total + '…');
    const worker = async () => {
      // After one failure the others stop, so the error stays on screen instead of a stuck counter.
      while(next < total && !failed) {
        const index = next++;
        try { stored[index] = await this.upload(product.key, product.images[index]); }
        catch(e) { failed = true; throw e; }
        done++; if(total > 1 && !failed) onProgress('Foto’s opslaan: ' + done + ' van ' + total + '…');
      }
    };
    await Promise.all(Array.from({length: Math.min(3, total)}, worker));
    onProgress('Stuk opslaan…');
    // The same photo chosen twice gets the same storage path (content hash). Keep it once, as a
    // boutique photo if either copy was one, so a duplicate never blocks saving.
    const byPath = new Map();
    product.images.forEach((image, index) => {
      const path = stored[index].path, seen = byPath.get(path);
      if(!seen) byPath.set(path, {path, role:stored[index].role, main:!!image.main && !image.internal, internal:!!image.internal});
      else { if(!image.internal) seen.internal = false; if(image.main && !image.internal) seen.main = true; }
    });
    const images = [], internal = [];
    for(const photo of byPath.values()) {
      if(photo.internal) internal.push({path:photo.path, role:photo.role});
      else images.push({path:photo.path, role:photo.role, main:photo.main});
    }
    // Explicit public allowlist: no session, private notes, cost or model output.
    const data = Object.fromEntries(['title','description','priceMinor','material','species','model','colour','length','fit','era','details','measurements','furClass'].map(k=>[k,product[k]]));
    data.images = images;
    // The only save route: the older save_garment is closed for direct calls (see the migration
    // close_save_garment), so there is no fallback that could skip the internal photos.
    try { return await this.request('/rest/v1/rpc/save_garment_with_private', {method:'POST',body:{p_id:product.key,p_data:data,p_version:version,p_internal:internal,p_ai:ai}}); }
    catch(e) { if(e.status === 404) e.message = 'Dit stuk is niet opgeslagen: de database is niet bijgewerkt. Je invoer blijft staan; vraag Martijn om hulp.'; throw e; }
  }
  // Internal photos of one piece, with short-lived signed links. Staff only (RLS).
  async internalPhotos(id) {
    // No fallback to "no photos": a failed read must stop the edit, otherwise saving would drop them.
    let rows;
    try { rows = await this.request('/rest/v1/garment_private?select=internal_images&id=eq.' + encodeURIComponent(id)); }
    catch(e) { if(e.status === 404) e.message = 'De foto’s alleen voor controle konden niet worden geladen: de database is niet bijgewerkt. Dit stuk kan nu niet worden bewerkt.'; throw e; }
    const list = Array.isArray(rows?.[0]?.internal_images) ? rows[0].internal_images : [];
    if(!list.length) return [];
    const urls = await this.imageUrls(list.map(i=>i.path));
    if(list.some(i=>!urls.has(i.path))) throw Error('Niet alle foto’s van dit stuk konden worden geopend. Probeer het later opnieuw.');
    return list.map(i=>({path:i.path, role:i.role, src:urls.get(i.path)}));
  }
  // Marks a piece as sold and records what it was sold for (staff-only table garment_sales).
  // No fallback to the older function: the sale price would then be lost without anyone noticing.
  async sold(id, version, priceMinor) {
    try { return await this.request('/rest/v1/rpc/mark_garment_sold_with_price',{method:'POST',body:{p_id:id,p_version:version,p_price_minor:priceMinor}}); }
    catch(e) {
      if(e.status === 404) e.message = 'Niet als verkocht opgeslagen: de database is niet bijgewerkt. Het stuk staat nog te koop; vraag Martijn om hulp.';
      else if(e.code === '22023' || /INVALID_PRICE/.test(e.message)) e.message = 'Niet als verkocht opgeslagen: controleer het bedrag.';
      throw e;
    }
  }
  // Sale prices for the staff grid. Staff only (RLS); before the migration there are none.
  async sales() {
    let rows;
    try { rows = await this.request('/rest/v1/garment_sales?select=id,sold_price_minor,sold_at'); }
    catch(e) { if(e.status === 404) return []; throw e; }
    return Array.isArray(rows) ? rows : [];
  }
  async analyse(files, signal, lists) {
    const images = await Promise.all(files.map(file=>new Promise((resolve,reject)=>{
      if(file.size>2*1024*1024) {reject(Error('Foto te groot voor analyse.'));return;}
      const reader = new FileReader(); reader.onerror=()=>reject(Error('Foto onleesbaar.'));
      reader.onload=()=>resolve({mimeType:file.type,data:reader.result.split(',')[1]}); reader.readAsDataURL(file);
    })));
    // Stop button and a time limit just above the server's own 90 seconds.
    const limit = AbortSignal.timeout(120000);
    const both = signal && AbortSignal.any ? AbortSignal.any([signal, limit]) : signal || limit;
    return this.request('/functions/v1/analyse',{method:'POST',body:lists ? {images, lists} : {images},signal:both});
  }
}

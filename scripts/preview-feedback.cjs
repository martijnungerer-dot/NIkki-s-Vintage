// Ontwerpvoorstellen voor de bovenbalk van de winkel (feedback 2-4, docs/FEEDBACK-OPVOLGING.md).
// Wijzigt alleen tijdelijke browserpagina's van de bestaande testfixture; de winkelbron blijft ongemoeid.
//   npm run build && CHROMIUM_PATH=... node scripts/preview-feedback.cjs
// A: gecentreerd woordmerk op twee regels, zoekbalk eronder.  B: bestaand GSF-appembleem links naast de naam, zelfde zoekbalk.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {fixture} = require('../tests/admin-fixture.cjs');
const out = path.join(__dirname, '../docs/screenshots/feedback');
fs.mkdirSync(out, {recursive: true});
const emblem = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(__dirname, '../app/icons/gsf-kantrand.svg')).toString('base64');

// Runs inside the shop frame: rebuild only the header and add a search bar that uses the existing Collectie search.
function apply({variant, emblemSrc}) {
  const top = document.querySelector('.top');
  const css = document.createElement('style');
  css.textContent = `
    .top{flex:none;display:block;padding:calc(10px + env(safe-area-inset-top,0px)) 16px 10px}
    .pv-brand{display:flex;align-items:center;gap:10px;font-size:max(18px,min(22px,5.4vw));line-height:1.1;white-space:nowrap}
    .pv-brand.a{flex-direction:column;align-items:center;text-align:center;gap:0;letter-spacing:.02em}
    .pv-brand.a span:first-child{font-size:.8em;letter-spacing:.18em;text-transform:uppercase}
    .pv-brand img{width:44px;height:44px;border-radius:10px;flex:none}
    .pv-brand.b span{display:flex;flex-direction:column}
    .pv-search{display:flex;align-items:center;gap:8px;margin-top:10px;min-height:44px;border:1px solid var(--line,#E3DAD0);border-radius:22px;padding:0 14px;background:transparent}
    .pv-search input{flex:1;min-width:0;border:0;background:transparent;font:inherit;font-size:16px;min-height:44px;outline:none;color:inherit}
    .pv-search svg{flex:none}`;
  document.head.append(css);
  const name = variant === 'a' ? '<span>Guaranteed</span><span>Secondhand Fur</span>' : '<img alt="" src="' + emblemSrc + '"><span><span>Guaranteed</span><span>Secondhand Fur</span></span>';
  top.innerHTML = '<div class="pv-brand ' + variant + '" role="img" aria-label="Guaranteed Secondhand Fur">' + name + '</div>' +
    '<form class="pv-search" role="search"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>' +
    '<input type="search" id="pv-q" aria-label="Zoek een stuk" placeholder="Wat zoek je?" autocomplete="off"></form>';
  // The search bar does not search by itself: it opens Collectie and fills its existing search field.
  top.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    const q = top.querySelector('#pv-q').value;
    document.querySelector('.shop').click();
    document.querySelector('.menu [data-screen="Collectie"]').click();
    const field = document.getElementById('catalog-search');
    field.value = q; field.dispatchEvent(new Event('input', {bubbles: true}));
  });
}

(async () => {
  const sizes = [[320, 700], [390, 844], [1024, 768], [320, 568]];
  for (const variant of ['a', 'b']) {
    for (const [width, height] of sizes) {
      const f = await fixture(width);
      try {
        const page = f.page;
        await page.setViewportSize({width, height});
        await page.locator('.app-toolbar [data-screen=shop]').click();
        const shop = page.frames().find(x => x.name() === 'shop');
        await shop.waitForSelector('.top');
        await shop.evaluate(apply, {variant, emblemSrc: emblem});
        // Checks: no overflow, no text over the photo, 44px targets, 16px text.
        const m = await shop.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth,
          input: document.querySelector('#pv-q').getBoundingClientRect().height,
          font: parseFloat(getComputedStyle(document.querySelector('#pv-q')).fontSize),
          topBottom: document.querySelector('.top').getBoundingClientRect().bottom
        }));
        assert.equal(m.overflow, false, variant + ' ' + width + ': no horizontal scroll');
        assert.ok(m.input >= 44 && m.font >= 16, variant + ' ' + width + ': search bar 44px / 16px');
        const name = `voorstel-${variant}-${width}x${height}.png`;
        await page.screenshot({path: path.join(out, name)});
        if (width === 390 && height === 844) {
          // The search bar reuses the existing Collectie search: it opens Collectie with the typed words.
          await shop.fill('#pv-q', 'mantel');
          await shop.press('#pv-q', 'Enter');
          await shop.waitForSelector('#catalog-search');
          assert.equal(await shop.inputValue('#catalog-search'), 'mantel');
          await shop.waitForFunction(() => document.querySelectorAll('#catalog-results li').length === 1, null, {timeout: 3000});
          await shop.fill('#catalog-search', 'zzz');
          await shop.waitForFunction(() => document.getElementById('catalog-count').textContent === '0 stukken', null, {timeout: 3000});
        }
        assert.deepEqual(f.state.errors, []);
        console.log('ok', name);
      } finally { await f.browser.close(); }
    }
  }
  console.log('PASS preview feedback: voorstel A en B op 320, 390, 1024 en 320x568; zoekbalk gebruikt de Collectie-zoekfunctie.');
})().catch(e => { console.error(e); process.exitCode = 1; });

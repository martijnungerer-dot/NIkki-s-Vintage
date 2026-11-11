// Verifieert uitsluitend de ontwerpmock. Geen productiegedrag of echte diensten.
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const output = path.join(root, 'docs/screenshots/beheer-stap-1');
const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.ttf':'font/ttf', '.png':'image/png'};
(async () => {
  fs.mkdirSync(output, {recursive:true});
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH, args:['--no-sandbox']});
  try {
    for (const width of [390, 320, 1440]) {
      const context = await browser.newContext({viewport:{width, height:900}, reducedMotion:'reduce'});
      const errors = [];
      context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
      await context.route('**/*', async route => {
        const u = new URL(route.request().url());
        if (u.hostname === 'mock.test') {
          const file = path.join(root, 'concept/beheer-stap-1', u.pathname === '/' ? 'index.html' : u.pathname.slice(1));
          return route.fulfill({contentType:types[path.extname(file)] || 'text/plain', body:fs.readFileSync(file)});
        }
        if (u.hostname === 'app.test') {
          if (u.pathname === '/config.js') return route.fulfill({contentType:'text/javascript', body:"export const config={supabaseUrl:'https://test.supabase.co',supabasePublishableKey:'public-test-key'}"});
          const file = path.join(root, 'dist/cloud', u.pathname === '/' ? 'index.html' : u.pathname.slice(1));
          return route.fulfill({contentType:types[path.extname(file)] || 'text/plain', body:fs.readFileSync(file)});
        }
        if (u.hostname === 'test.supabase.co') {
          const headers = {'access-control-allow-origin':'*', 'access-control-allow-headers':'*', 'access-control-allow-methods':'*'};
          if (route.request().method() === 'OPTIONS') return route.fulfill({status:204, headers});
          const body = u.pathname === '/auth/v1/token' ? {access_token:'test-session', refresh_token:'test-refresh', expires_at:Date.now()/1000+3600} : [];
          return route.fulfill({headers, contentType:'application/json', body:JSON.stringify(body)});
        }
        return route.abort();
      });
      const current = await context.newPage();
      await current.goto('https://app.test');
      await current.waitForFunction(() => document.getElementById('status').textContent === 'Collectie geladen.');
      await current.evaluate(() => window.NikkiApp.openAccount());
      await current.screenshot({path:path.join(output, `huidig-${width}.png`)});
      const page = await context.newPage();
      await page.goto('https://mock.test');
      await page.evaluate(() => document.fonts.ready);
      assert.ok(await page.evaluate(() => document.fonts.check('18px Newsreader')), 'Newsreader beschikbaar');
      await page.screenshot({path:path.join(output, `voorstel-${width}.png`)});
      async function layout() {
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'geen horizontale overflow');
        // Meet elke zichtbare tekstnode, inclusief labels, status, menu en foutmelding.
        assert.deepEqual(await page.evaluate(() => {
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), small = [];
          while (walker.nextNode()) {
            const node = walker.currentNode;
            if (!node.textContent.trim() || ['SCRIPT','STYLE'].includes(node.parentElement.tagName)) continue;
            const range = document.createRange(); range.selectNode(node);
            if ([...range.getClientRects()].some(r => r.width && r.height) && parseFloat(getComputedStyle(node.parentElement).fontSize) < 16) small.push(node.textContent);
          }
          return small;
        }), [], 'alle zichtbare tekst minstens 16 px');
        for (const button of await page.locator('button:visible, input:visible').all()) {
          const rect = await button.boundingBox();
          assert.ok(rect.width >= 44 && rect.height >= 44, 'minstens 44 × 44 px');
          assert.ok(rect.x >= 0 && rect.x + rect.width <= width, 'bediening past op scherm');
        }
        for (const button of await page.locator('button.icon').all()) assert.ok(await button.getAttribute('aria-label'));
      }
      await layout();
      await page.keyboard.press('Tab');
      assert.equal(await page.locator('.skip').evaluate(el => el === document.activeElement), true);
      await page.keyboard.press('Tab');
      assert.equal(await page.locator('#account').evaluate(el => el === document.activeElement), true);
      assert.equal(await page.locator('#account').evaluate(el => getComputedStyle(el).outlineStyle), 'solid');
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#account').getAttribute('aria-expanded'), 'true');
      await page.keyboard.press('Tab');
      assert.equal(await page.locator('#account-panel button').first().evaluate(el => el === document.activeElement), true);
      await page.keyboard.press('Escape');
      assert.ok(await page.locator('#account-panel').isHidden());
      assert.equal(await page.locator('#account').evaluate(el => el === document.activeElement), true);
      await page.locator('#email').fill('nikki@example.test');
      await page.locator('#password').fill('synthetisch');
      await page.locator('#login button').click();
      assert.ok(await page.locator('#login-error').isVisible());
      assert.equal(await page.locator('#email').evaluate(el => el === document.activeElement), true);
      await layout();
      await page.locator('#email').fill('');
      await page.locator('#password').fill('');
      await page.locator('h1').click();
      await page.screenshot({path:path.join(output, `fout-${width}.png`)});
      // Vergelijk vaste posities vóór en na inloggen, ook voor de uitgeschakelde plus.
      const positions = await page.locator('.icon').evaluateAll(nodes => nodes.map(n => {const r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height];}));
      await page.goto('https://mock.test/?state=empty');
      await page.evaluate(() => document.fonts.ready);
      assert.deepEqual(await page.locator('.icon').evaluateAll(nodes => nodes.map(n => {const r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height];})), positions);
      assert.ok(await page.locator('#empty').isVisible());
      assert.ok(await page.locator('#login').isHidden());
      assert.ok(await page.locator('#new').isEnabled());
      await layout();
      await page.screenshot({path:path.join(output, `leeg-${width}.png`)});
      await page.locator('#account').click();
      await layout();
      await page.screenshot({path:path.join(output, `menu-${width}.png`)});
      await page.keyboard.press('Escape');
      await page.clock.install();
      await page.locator('#reload').click();
      assert.equal(await page.locator('#status').textContent(), 'Collectie vernieuwd.');
      await page.clock.fastForward(5100);
      assert.equal(await page.locator('#status').textContent(), '');
      // Huidige ingelogde lege staat als tweede vergelijking.
      await current.locator('#email').fill('nikki@example.test');
      await current.locator('#password').fill('synthetisch');
      await current.locator('#login button').click();
      await current.locator('#empty').waitFor({state:'visible'});
      await current.screenshot({path:path.join(output, `huidig-leeg-${width}.png`)});
      // Twee echte viewportopnamen naast elkaar; labels horen bij het reviewblad.
      for (const [name, left, right] of [['vergelijking','huidig','voorstel'], ['vergelijking-menu','huidig-leeg','menu']]) {
        const compare = await context.newPage();
        await compare.setViewportSize({width:width*2+64, height:964});
        const data = key => 'data:image/png;base64,' + fs.readFileSync(path.join(output, `${key}-${width}.png`)).toString('base64');
        await compare.setContent(`<html lang="nl"><style>*{box-sizing:border-box}body{margin:0;padding:16px;display:flex;gap:32px;background:#E3DAD0;font:18px Georgia;color:#2E2420}figure{margin:0}figcaption{height:48px;padding:8px 0}img{display:block;width:${width}px;height:900px}</style><figure><figcaption>Huidige main · ${width} px</figcaption><img alt="Huidige versie" src="${data(left)}"></figure><figure><figcaption>Voorstel · ${width} px</figcaption><img alt="Ontwerpmock" src="${data(right)}"></figure></html>`);
        await compare.screenshot({path:path.join(output, `${name}-${width}.png`)});
        await compare.close();
      }
      assert.deepEqual(errors, [], 'geen browserfouten');
      await context.close();
    }
    console.log('PASS ontwerpmock: 390/320/1440 px, 16 px tekst, 44 px bediening, focus, menu/Escape, fout, lege staat, vaste icoonposities, tijdelijke status. Geen camera of echte login gebouwd.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

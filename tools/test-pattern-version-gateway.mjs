import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const gatewaySource = await fs.readFile(
  new URL('../webflow/pattern.com/scripts/runtime/pattern-version-gateway.js', import.meta.url),
  'utf8',
);
const videoPopupSource = await fs.readFile(
  new URL('../webflow/pattern.com/scripts/media/video-popup.js', import.meta.url),
  'utf8',
);
const gatewayEmbed = await fs.readFile(
  new URL(
    '../webflow/pattern.com/scripts/runtime/pattern-version-gateway-embed.html',
    import.meta.url,
  ),
  'utf8',
);
const toSRI = (source) =>
  `sha384-${crypto.createHash('sha384').update(source).digest('base64')}`;

const browser = await chromium.launch({ headless: true });

async function createScenario({ html, config = {}, routes = [] }) {
  const page = await browser.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const route of routes) {
    await page.route(route.url, async (request) => {
      await request.fulfill({
        status: route.status || 200,
        contentType: route.contentType || 'text/javascript',
        body: route.body || '',
        headers: {
          'access-control-allow-origin': '*',
          ...(route.headers || {}),
        },
      });
    });
  }

  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.evaluate((value) => {
    window.PatternVersionGatewayConfig = value;
  }, {
    mode: 'observe',
    baseUrl: 'https://pvg.test/webflow/pattern.com/scripts/runtime/',
    ...config,
  });
  await page.addScriptTag({ content: gatewaySource });
  await page.waitForFunction(() => window.PatternVersionGateway?.version === '0.1.0');
  await page.waitForTimeout(25);

  return page;
}

async function inspectScenario(options) {
  const page = await createScenario(options);
  const result = await page.evaluate(() => ({
    ...window.PatternVersionGateway.inspect(),
    managedAssets: document.querySelectorAll('[data-pattern-pvg-asset]').length,
  }));
  await page.close();
  return result;
}

try {
  assert.ok(gatewayEmbed.includes(toSRI(gatewaySource)));
  assert.match(gatewayEmbed, /pattern@[0-9a-f]{40}\/webflow\/pattern\.com\/scripts\/runtime/);
  assert.ok(!gatewayEmbed.includes('PVG_COMMIT_SHA'));
  assert.ok(gatewaySource.includes(toSRI(videoPopupSource)));

  const v1 = await inspectScenario({
    html: '<main class="page_main cc-v1"><nav class="nav_wrap"></nav></main>',
  });
  assert.equal(v1.detection.version, 'v1');
  assert.equal(v1.detection.safe, true);
  assert.equal(v1.activation.reason, 'observe-mode');
  assert.ok(v1.plan.some((module) => module.id === 'legacy-nav'));

  const v2 = await inspectScenario({
    html: '<main class="page_main cc-v2"></main>',
  });
  assert.equal(v2.detection.version, 'v2');
  assert.equal(v2.detection.safe, true);

  const v2l = await inspectScenario({
    html: '<main class="page_main cc-v2l"></main>',
  });
  assert.equal(v2l.detection.version, 'v2l');
  assert.equal(v2l.detection.family, 'v2');

  const inferredV2 = await inspectScenario({
    html: '<main class="page_main"></main>',
    config: { mode: 'active', legacyPolicy: 'gateway' },
  });
  assert.equal(inferredV2.detection.version, 'v2');
  assert.equal(inferredV2.detection.safe, false);
  assert.equal(inferredV2.activation.reason, 'unresolved-version');

  const v3Observe = await inspectScenario({
    html: `
      <main class="page_main_v3">
        <div class="pattern-library-v3--video_player_wrap">
          <button data-video-player-open>Play</button>
          <dialog data-video-player-dialog>
            <iframe data-video-src="https://vimeo.com/1146670446"></iframe>
          </dialog>
        </div>
      </main>
    `,
  });
  assert.equal(v3Observe.detection.version, 'v3');
  assert.ok(v3Observe.plan.some((module) => module.id === 'v3-video-popup'));
  assert.equal(v3Observe.managedAssets, 0);

  const v3WithLegacyMarkup = await inspectScenario({
    html: `
      <main class="page_main_v3">
        <div fc-video-popup="component"><button fc-video-popup="open"></button></div>
      </main>
    `,
  });
  assert.equal(v3WithLegacyMarkup.detection.version, 'v3');
  assert.ok(!v3WithLegacyMarkup.plan.some((module) => module.id === 'legacy-video-popup'));
  assert.ok(!v3WithLegacyMarkup.plan.some((module) => module.id === 'v3-video-popup'));

  const legacyPreserved = await inspectScenario({
    html: '<main class="page_main cc-v1"><nav class="nav_wrap"></nav></main>',
    config: { mode: 'active' },
  });
  assert.equal(legacyPreserved.activation.reason, 'legacy-preserved');
  assert.equal(
    legacyPreserved.modules.find((module) => module.id === 'legacy-nav').status,
    'preserved',
  );

  const conflict = await inspectScenario({
    html: '<main class="page_main cc-v1 page_main_v3"></main>',
    config: { mode: 'active', legacyPolicy: 'gateway' },
  });
  assert.equal(conflict.detection.safe, false);
  assert.deepEqual(conflict.detection.conflicts, ['v1']);
  assert.equal(conflict.activation.reason, 'conflicting-version-markers');

  const unknown = await inspectScenario({
    html: '<main></main>',
    config: { mode: 'active', legacyPolicy: 'gateway' },
  });
  assert.equal(unknown.detection.version, 'unknown');
  assert.equal(unknown.activation.reason, 'unresolved-version');
  assert.equal(unknown.managedAssets, 0);

  const activeLegacyPage = await createScenario({
    html: `
      <main class="page_main cc-v1">
        <div class="splide"></div>
        <div class="splide"></div>
      </main>
    `,
    config: { mode: 'active', legacyPolicy: 'gateway' },
    routes: [
      {
        url: '**/@splidejs/splide@4.1.4/dist/css/splide.min.css',
        contentType: 'text/css',
        body: '.splide { display: block; }',
      },
      {
        url: '**/@splidejs/splide@4.1.4/dist/js/splide.min.js',
        body: 'window.Splide = function Splide() {};',
      },
    ],
  });
  await activeLegacyPage.waitForFunction(
    () =>
      window.PatternVersionGateway.inspect().modules.find((module) => module.id === 'splide')
        ?.status === 'ready',
  );
  const activeLegacy = await activeLegacyPage.evaluate(() => ({
    activation: window.PatternVersionGateway.inspect().activation,
    managedScripts: document.querySelectorAll(
      'script[data-pattern-pvg-asset="dependency:splide:script"]',
    ).length,
    managedStyles: document.querySelectorAll(
      'link[data-pattern-pvg-asset="dependency:splide:style"]',
    ).length,
  }));
  assert.equal(activeLegacy.activation.allowed, true);
  assert.equal(activeLegacy.managedScripts, 1);
  assert.equal(activeLegacy.managedStyles, 1);
  await activeLegacyPage.close();

  const activeV3Page = await createScenario({
    html: `
      <main class="page_main_v3">
        <div class="pattern-library-v3--video_player_wrap">
          <button data-video-player-open>Play</button>
          <dialog data-video-player-dialog>
            <iframe data-video-src="https://vimeo.com/1146670446"></iframe>
          </dialog>
        </div>
      </main>
    `,
    config: { mode: 'active' },
    routes: [
      {
        url: '**/scripts/media/video-popup.js',
        body: videoPopupSource,
      },
    ],
  });
  await activeV3Page.waitForFunction(
    () =>
      document
        .querySelector('[class*="video_player_wrap"]')
        ?.hasAttribute('data-video-player-popup-initialized'),
  );
  await activeV3Page.click('[data-video-player-open]');
  const activeV3 = await activeV3Page.evaluate(() => ({
    inspect: window.PatternVersionGateway.inspect(),
    initialized: document
      .querySelector('[class*="video_player_wrap"]')
      .hasAttribute('data-video-player-popup-initialized'),
    dialogOpen: document.querySelector('dialog[data-video-player-dialog]').open,
    iframeSource: document.querySelector('dialog[data-video-player-dialog] iframe').src,
    managedScripts: document.querySelectorAll('script[data-pattern-pvg-asset]').length,
  }));
  assert.equal(activeV3.initialized, true);
  assert.equal(activeV3.dialogOpen, true);
  assert.match(activeV3.iframeSource, /^https:\/\/player\.vimeo\.com\/video\/1146670446/);
  assert.equal(activeV3.managedScripts, 1);
  assert.equal(
    activeV3.inspect.modules.find((module) => module.id === 'v3-video-popup').status,
    'ready',
  );
  await activeV3Page.close();

  const consentGatedPage = await createScenario({
    html: `
      <main class="page_main_v3">
        <div class="pattern-library-v3--video_player_wrap">
          <button data-video-player-open>Play</button>
          <dialog data-video-player-dialog data-consent-category="personalization">
            <iframe data-video-src="https://vimeo.com/1146670446"></iframe>
          </dialog>
        </div>
      </main>
    `,
    config: { mode: 'active' },
    routes: [
      {
        url: '**/scripts/media/video-popup.js',
        body: videoPopupSource,
      },
    ],
  });
  await consentGatedPage.waitForFunction(
    () =>
      document
        .querySelector('[class*="video_player_wrap"]')
        ?.hasAttribute('data-video-player-popup-initialized'),
  );
  await consentGatedPage.evaluate(() => {
    window.__pvgConsentState = { personalization: false };
    window.FinsweetConsentPro = {
      consents: {
        get: () => window.__pvgConsentState,
      },
      on(name, callback) {
        if (name === 'consent-updated') window.__pvgConsentUpdated = callback;
      },
    };
  });
  await consentGatedPage.click('[data-video-player-open]');
  assert.equal(
    await consentGatedPage.$eval('dialog[data-video-player-dialog]', (dialog) => dialog.open),
    false,
  );
  await consentGatedPage.evaluate(() => {
    window.__pvgConsentState = { personalization: true };
    window.__pvgConsentUpdated(
      new CustomEvent('consent-updated', {
        detail: {
          source: 'consent-pro',
        },
      }),
    );
  });
  await consentGatedPage.waitForFunction(
    () => document.querySelector('dialog[data-video-player-dialog]')?.open === true,
  );
  assert.equal(await consentGatedPage.evaluate(() => window.PatternVideoPopup.version), '1.1.2');
  await consentGatedPage.close();

  const failedModulePage = await createScenario({
    html: `
      <main class="page_main_v3">
        <p id="authored-content">Authored content remains readable.</p>
        <div class="pattern-library-v3--video_player_wrap">
          <button data-video-player-open>Play</button>
          <dialog data-video-player-dialog></dialog>
        </div>
      </main>
    `,
    config: { mode: 'active' },
    routes: [
      {
        url: '**/scripts/media/video-popup.js',
        status: 500,
        body: '',
      },
    ],
  });
  await failedModulePage.waitForFunction(
    () =>
      window.PatternVersionGateway.inspect().modules.find(
        (module) => module.id === 'v3-video-popup',
      )?.status === 'error',
  );
  const failureState = await failedModulePage.evaluate(() => ({
    content: document.querySelector('#authored-content').textContent,
    module: window.PatternVersionGateway
      .inspect()
      .modules.find((candidate) => candidate.id === 'v3-video-popup'),
  }));
  assert.equal(failureState.content, 'Authored content remains readable.');
  assert.equal(failureState.module.status, 'error');
  await failedModulePage.close();

  console.log('Pattern Version Gateway: all tests passed.');
} finally {
  await browser.close();
}

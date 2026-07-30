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
const headingRevealSource = await fs.readFile(
  new URL(
    '../webflow/pattern.com/scripts/interaction/v3-heading-text-reveal.js',
    import.meta.url,
  ),
  'utf8',
);
const gatewayLocalAssetSources = await Promise.all(
  [
    '../webflow/pattern.com/scripts/interaction/marquee.js',
    '../webflow/pattern.com/styles/marquee.css',
    '../webflow/pattern.com/scripts/nav/home-anchor-nav.js',
    '../webflow/pattern.com/styles/home-anchor-nav.css',
    '../webflow/pattern.com/scripts/interaction/v3-heading-text-reveal.js',
    '../webflow/pattern.com/scripts/content/case-study-cms-slider.js',
    '../webflow/pattern.com/scripts/interaction/accordion.js',
    '../webflow/pattern.com/scripts/media/video-popup.js',
  ].map((path) => fs.readFile(new URL(path, import.meta.url), 'utf8')),
);
const gatewayEmbed = await fs.readFile(
  new URL(
    '../webflow/pattern.com/scripts/runtime/pattern-version-gateway-embed.html',
    import.meta.url,
  ),
  'utf8',
);
const gatewayV3ActiveEmbed = await fs.readFile(
  new URL(
    '../webflow/pattern.com/scripts/runtime/pattern-version-gateway-v3-active-embed.html',
    import.meta.url,
  ),
  'utf8',
);
const toSRI = (source) =>
  `sha384-${crypto.createHash('sha384').update(source).digest('base64')}`;
const getInlineScript = (embed) => {
  const match = embed.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, 'Expected one inline script in the embed.');
  return match[1];
};

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
  await page.waitForFunction(() => window.PatternVersionGateway?.version === '0.2.1');
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

async function inspectEmbedScenario({ html, embed, routes = [] }) {
  const page = await browser.newPage();

  await page.route('**/scripts/runtime/pattern-version-gateway.js', async (request) => {
    await request.fulfill({
      status: 200,
      contentType: 'text/javascript',
      body: gatewaySource,
      headers: {
        'access-control-allow-origin': '*',
      },
    });
  });

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
  await page.addScriptTag({ content: getInlineScript(embed) });
  await page.waitForFunction(() => window.PatternVersionGateway?.version === '0.2.1');
  await page.waitForTimeout(25);

  const result = await page.evaluate(() => ({
    ...window.PatternVersionGateway.inspect(),
    managedAssets: document.querySelectorAll('[data-pattern-pvg-asset]').length,
    loaderMode: document.querySelector('[data-pattern-pvg-loader]')?.dataset.pvgMode,
    loaderLegacyPolicy:
      document.querySelector('[data-pattern-pvg-loader]')?.dataset.pvgLegacyPolicy,
    dynamicYear: document.querySelector('[data-dynamic-year]')?.textContent,
  }));
  await page.close();
  return result;
}

try {
  assert.ok(gatewayEmbed.includes(toSRI(gatewaySource)));
  assert.ok(gatewayV3ActiveEmbed.includes(toSRI(gatewaySource)));
  assert.match(gatewayEmbed, /pattern@[0-9a-f]{40}\/webflow\/pattern\.com\/scripts\/runtime/);
  assert.match(
    gatewayV3ActiveEmbed,
    /pattern@[0-9a-f]{40}\/webflow\/pattern\.com\/scripts\/runtime/,
  );
  assert.ok(!gatewayEmbed.includes('PVG_COMMIT_SHA'));
  assert.ok(!gatewayV3ActiveEmbed.includes('PVG_COMMIT_SHA'));
  assert.match(gatewayEmbed, /script\.dataset\.pvgMode = 'observe'/);
  assert.match(gatewayV3ActiveEmbed, /script\.dataset\.pvgMode = 'active'/);
  assert.match(gatewayV3ActiveEmbed, /script\.dataset\.pvgLegacyPolicy = 'preserve'/);
  assert.ok(gatewaySource.includes(toSRI(videoPopupSource)));
  assert.ok(gatewaySource.includes(toSRI(headingRevealSource)));
  gatewayLocalAssetSources.forEach((source) => {
    assert.ok(gatewaySource.includes(toSRI(source)));
  });
  assert.ok(
    gatewaySource.includes(
      'https://cdn.prod.website-files.com/gsap/3.15.0/gsap.min.js',
    ),
  );
  assert.ok(!gatewaySource.includes('gsap@3.13.0'));

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

  const observedEmbedV3 = await inspectEmbedScenario({
    html: '<main class="page_main_v3"><span data-dynamic-year>2000</span></main>',
    embed: gatewayEmbed,
  });
  assert.equal(observedEmbedV3.mode, 'observe');
  assert.equal(observedEmbedV3.activation.reason, 'observe-mode');
  assert.equal(observedEmbedV3.loaderMode, 'observe');
  assert.equal(observedEmbedV3.managedAssets, 0);
  assert.equal(observedEmbedV3.dynamicYear, '2000');

  const activeEmbedV3 = await inspectEmbedScenario({
    html: '<main class="page_main_v3"><span data-dynamic-year>2000</span></main>',
    embed: gatewayV3ActiveEmbed,
  });
  assert.equal(activeEmbedV3.mode, 'active');
  assert.equal(activeEmbedV3.activation.reason, 'active');
  assert.equal(activeEmbedV3.loaderMode, 'active');
  assert.equal(activeEmbedV3.loaderLegacyPolicy, 'preserve');
  assert.equal(activeEmbedV3.dynamicYear, String(new Date().getFullYear()));

  const rollbackPage = await browser.newPage();
  await rollbackPage.route(
    '**/scripts/runtime/pattern-version-gateway.js',
    async (request) => {
      await request.fulfill({
        status: 200,
        contentType: 'text/javascript',
        body: gatewaySource,
        headers: {
          'access-control-allow-origin': '*',
        },
      });
    },
  );
  await rollbackPage.setContent('<main class="page_main_v3"></main>', {
    waitUntil: 'domcontentloaded',
  });
  await rollbackPage.addScriptTag({
    content: getInlineScript(gatewayV3ActiveEmbed),
  });
  await rollbackPage.waitForFunction(
    () => window.PatternVersionGateway?.inspect().mode === 'active',
  );
  await rollbackPage.addScriptTag({
    content: getInlineScript(gatewayEmbed),
  });
  await rollbackPage.waitForFunction(
    () => window.PatternVersionGateway?.inspect().mode === 'observe',
  );
  await rollbackPage.evaluate(() => {
    document.querySelector('.page_main_v3').insertAdjacentHTML(
      'beforeend',
      `
        <div class="pattern-library-v3--video_player_wrap">
          <button data-video-player-open>Play</button>
          <dialog data-video-player-dialog></dialog>
        </div>
      `,
    );
  });
  await rollbackPage.waitForTimeout(50);
  const rollback = await rollbackPage.evaluate(() => ({
    inspection: window.PatternVersionGateway.inspect(),
    initialized: document
      .querySelector('[class*="video_player_wrap"]')
      .hasAttribute('data-video-player-popup-initialized'),
    managedAssets: document.querySelectorAll('[data-pattern-pvg-asset]').length,
  }));
  assert.equal(rollback.inspection.mode, 'observe');
  assert.equal(rollback.inspection.activation.reason, 'observe-mode');
  assert.equal(rollback.initialized, false);
  assert.equal(rollback.managedAssets, 0);
  await rollbackPage.close();

  const activeEmbedV1 = await inspectEmbedScenario({
    html: `
      <main class="page_main cc-v1">
        <nav class="nav_wrap"></nav>
        <span data-dynamic-year>2000</span>
      </main>
    `,
    embed: gatewayV3ActiveEmbed,
  });
  assert.equal(activeEmbedV1.detection.version, 'v1');
  assert.equal(activeEmbedV1.activation.reason, 'legacy-preserved');
  assert.equal(activeEmbedV1.loaderLegacyPolicy, 'preserve');
  assert.equal(activeEmbedV1.managedAssets, 0);
  assert.equal(activeEmbedV1.dynamicYear, '2000');

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

  const v3HeadingObserve = await inspectScenario({
    html: `
      <main class="page_main_v3">
        <div
          data-heading-reveal="true"
          data-wf--pattern-library-v3--typography-heading--font-style="h1"
        >
          <h1>Observed H1</h1>
        </div>
      </main>
    `,
  });
  assert.ok(
    v3HeadingObserve.plan.some((module) => module.id === 'v3-heading-text-reveal'),
  );
  assert.equal(v3HeadingObserve.managedAssets, 0);

  const v3NonH1HeadingObserve = await inspectScenario({
    html: `
      <main class="page_main_v3">
        <div
          data-heading-reveal="true"
          data-wf--pattern-library-v3--typography-heading--font-style="h2"
        >
          <h2>Unanimated H2</h2>
        </div>
      </main>
    `,
  });
  assert.ok(
    !v3NonH1HeadingObserve.plan.some(
      (module) => module.id === 'v3-heading-text-reveal',
    ),
  );

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

  const configuredConflict = await inspectScenario({
    html: '<main class="page_main cc-v1"></main>',
    config: { mode: 'active', legacyPolicy: 'gateway', version: 'v3' },
  });
  assert.equal(configuredConflict.detection.version, 'v1');
  assert.equal(configuredConflict.detection.safe, false);
  assert.deepEqual(configuredConflict.detection.conflicts, ['v3']);
  assert.equal(configuredConflict.activation.reason, 'conflicting-version-markers');
  assert.equal(configuredConflict.managedAssets, 0);

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

  const activeV2LPage = await createScenario({
    html: `
      <script>
        window.pageFunctions = {
          added: true,
          executed: {},
          functions: {},
          addFunction(id, fn) {
            if (!this.functions[id]) this.functions[id] = fn;
          },
        };
      </script>
      <main class="page_main cc-v2l">
        <span data-dynamic-year>2000</span>
        <nav class="nav_wrap"></nav>
        <div class="splide"></div>
        <div class="splide"></div>
        <div card-grid>
          <article card-load="count-up"><span stat-count-up>123</span></article>
        </div>
      </main>
    `,
    config: { mode: 'active', legacyPolicy: 'gateway' },
    routes: [
      {
        url: '**/pattern@v1.0.8/webflow/pattern.com/styles/nav.css',
        contentType: 'text/css',
        body: '.nav_wrap { display: block; }',
      },
      {
        url: '**/pattern@v1.0.8/webflow/pattern.com/scripts/nav/nav.js',
        body: `
          window.__pvgV2LNavLoads = (window.__pvgV2LNavLoads || 0) + 1;
          window.pageFunctions.addFunction('nav', () => {
            document.querySelectorAll('.nav_wrap').forEach((nav) => {
              nav.setAttribute('data-pattern-nav-ready', 'true');
            });
          });
        `,
      },
      {
        url: '**/pattern@v1.0.8/webflow/pattern.com/scripts/interaction/card-load-animations-v10.js',
        body: 'window.__pvgV2LCardLoads = (window.__pvgV2LCardLoads || 0) + 1;',
      },
      {
        url: '**/gsap/3.15.0/gsap.min.js',
        body: 'window.gsap = { registerPlugin() {} };',
      },
      {
        url: '**/gsap/3.15.0/ScrollTrigger.min.js',
        body: 'window.ScrollTrigger = {};',
      },
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
  await activeV2LPage.waitForFunction(() => {
    const modules = window.PatternVersionGateway.inspect().modules;
    return ['dynamic-year', 'legacy-nav', 'card-load-animations', 'splide'].every(
      (id) => modules.find((module) => module.id === id)?.status === 'ready',
    );
  });
  const activeV2L = await activeV2LPage.evaluate(() => {
    const inspection = window.PatternVersionGateway.inspect();
    return {
      inspection,
      year: document.querySelector('[data-dynamic-year]').textContent,
      navReady: document
        .querySelector('.nav_wrap')
        .hasAttribute('data-pattern-nav-ready'),
      navLoads: window.__pvgV2LNavLoads,
      cardLoads: window.__pvgV2LCardLoads,
      navRegistryExecuted: window.pageFunctions.executed.nav,
      managedAssetIds: [...document.querySelectorAll('[data-pattern-pvg-asset]')].map(
        (asset) => asset.dataset.patternPvgAsset,
      ),
    };
  });
  assert.equal(activeV2L.inspection.detection.version, 'v2l');
  assert.equal(activeV2L.inspection.detection.family, 'v2');
  assert.equal(activeV2L.inspection.activation.allowed, true);
  assert.equal(activeV2L.year, String(new Date().getFullYear()));
  assert.equal(activeV2L.navReady, true);
  assert.equal(activeV2L.navLoads, 1);
  assert.equal(activeV2L.cardLoads, 1);
  assert.equal(activeV2L.navRegistryExecuted, true);
  assert.equal(
    activeV2L.managedAssetIds.filter((id) => id === 'dependency:splide:script').length,
    1,
  );
  assert.equal(
    activeV2L.managedAssetIds.filter((id) => id === 'dependency:splide:style').length,
    1,
  );
  assert.equal(
    activeV2L.inspection.modules.find((module) => module.id === 'v3-video-popup').matched,
    false,
  );
  await activeV2LPage.close();

  const activeV3HeadingPage = await createScenario({
    html: `
      <main class="page_main_v3">
        <div
          data-heading-reveal="true"
          data-wf--pattern-library-v3--typography-heading--font-style="h1"
        >
          <h1>Active H1</h1>
        </div>
      </main>
    `,
    config: { mode: 'active' },
    routes: [
      {
        url: '**/gsap/3.15.0/gsap.min.js',
        body: 'window.gsap = { registerPlugin() {} };',
      },
      {
        url: '**/gsap/3.15.0/ScrollTrigger.min.js',
        body: 'window.ScrollTrigger = {};',
      },
      {
        url: '**/gsap/3.15.0/SplitText.min.js',
        body: 'window.SplitText = {};',
      },
      {
        url: '**/scripts/interaction/v3-heading-text-reveal.js',
        body: headingRevealSource,
      },
    ],
  });
  await activeV3HeadingPage.waitForFunction(
    () =>
      document
        .querySelector('[data-heading-reveal="true"]')
        ?.getAttribute('data-pattern-heading-reveal-initialized') === 'reduced-motion',
  );
  const activeV3Heading = await activeV3HeadingPage.evaluate(() => ({
    module: window.PatternVersionGateway
      .inspect()
      .modules.find((candidate) => candidate.id === 'v3-heading-text-reveal'),
    initialized: document
      .querySelector('[data-heading-reveal="true"]')
      .getAttribute('data-pattern-heading-reveal-initialized'),
    dependencyScripts: document.querySelectorAll(
      'script[data-pattern-pvg-asset^="dependency:"]',
    ).length,
    moduleScripts: document.querySelectorAll(
      'script[data-pattern-pvg-asset="module:v3-heading-text-reveal:script"]',
    ).length,
  }));
  assert.equal(activeV3Heading.module.status, 'ready');
  assert.equal(activeV3Heading.initialized, 'reduced-motion');
  assert.equal(activeV3Heading.dependencyScripts, 3);
  assert.equal(activeV3Heading.moduleScripts, 1);
  await activeV3HeadingPage.close();

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

  const existingRuntimePage = await createScenario({
    html: `
      <script>
        window.__pvgExistingRuntimeInitCalls = 0;
        window.PatternRuntime = { version: '0.3.0' };
        window.PatternVideoPopup = {
          version: '1.1.2',
          init() {
            window.__pvgExistingRuntimeInitCalls += 1;
          },
        };
      </script>
      <main class="page_main_v3">
        <div class="pattern-library-v3--video_player_wrap">
          <button data-video-player-open>Play</button>
          <dialog data-video-player-dialog></dialog>
        </div>
      </main>
    `,
    config: { mode: 'active' },
  });
  await existingRuntimePage.waitForFunction(
    () =>
      window.PatternVersionGateway
        .inspect()
        .modules.find((module) => module.id === 'v3-video-popup')?.status === 'ready',
  );
  const existingRuntime = await existingRuntimePage.evaluate(() => ({
    initCalls: window.__pvgExistingRuntimeInitCalls,
    managedModuleScripts: document.querySelectorAll(
      'script[data-pattern-pvg-asset="module:v3-video-popup:script"]',
    ).length,
    runtimeVersion: window.PatternRuntime.version,
  }));
  assert.equal(existingRuntime.initCalls, 1);
  assert.equal(existingRuntime.managedModuleScripts, 0);
  assert.equal(existingRuntime.runtimeVersion, '0.3.0');
  await existingRuntimePage.close();

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

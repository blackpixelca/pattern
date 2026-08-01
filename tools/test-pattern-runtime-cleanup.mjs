import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const read = (path) => fs.readFile(new URL(path, import.meta.url), 'utf8');
const consumerSource = await read(
  '../webflow/pattern.com/scripts/runtime/pattern-runtime-consumer-0.2.1.js',
);
const gatewaySource = await read(
  '../webflow/pattern.com/scripts/runtime/pattern-version-gateway.js',
);
const runtimeSource = await read('../webflow/pattern.com/scripts/runtime/pattern-runtime.js');
const marqueeCss = await read('../webflow/pattern.com/styles/marquee.css');
const anchorCss = await read('../webflow/pattern.com/styles/home-anchor-nav.css');

const browser = await chromium.launch({ headless: true });
const standaloneRoutes = [
  'https://www.pattern.com/catalog-offer',
  'https://www.pattern.com/resources/prep-calculator',
];

const verifyStandalone = async ({ source, globalName, version, configName }) => {
  for (const url of standaloneRoutes) {
    const page = await browser.newPage();
    await page.route(url, (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<main><span data-dynamic-year>2000</span><div data-marquee></div></main>',
      }),
    );
    await page.goto(url);
    await page.evaluate(({ name, value }) => {
      window[name] = value;
    }, {
      name: configName,
      value: {
        mode: 'active',
        legacyPolicy: 'gateway',
        baseUrl: 'https://runtime.test/webflow/pattern.com/scripts/runtime/',
      },
    });
    await page.addScriptTag({ content: source });
    await page.waitForFunction(
      ({ name, expected }) => window[name]?.version === expected,
      { name: globalName, expected: version },
    );

    const state = await page.evaluate((name) => {
      const inspection = window[name].inspect();
      return {
        detection: inspection.detection,
        activation: inspection.activation,
        managedAssets: document.querySelectorAll(
          '[data-pattern-runtime-asset], [data-pattern-pvg-asset]',
        ).length,
        year: document.querySelector('[data-dynamic-year]')?.textContent,
      };
    }, globalName);

    assert.equal(state.detection.version, 'standalone');
    assert.equal(state.detection.source, 'route-registry');
    assert.equal(state.detection.safe, true);
    assert.equal(state.activation.allowed, false);
    assert.equal(state.activation.reason, 'standalone-page');
    assert.equal(state.managedAssets, 0);
    assert.equal(state.year, '2000');
    await page.close();
  }
};

try {
  await verifyStandalone({
    source: runtimeSource,
    globalName: 'PatternRuntime',
    version: '1.0.0',
    configName: 'PatternRuntimeConfig',
  });
  await verifyStandalone({
    source: gatewaySource,
    globalName: 'PatternVersionGateway',
    version: '0.2.5',
    configName: 'PatternVersionGatewayConfig',
  });

  const page = await browser.newPage();
  const styleRequests = [];
  page.on('request', (request) => {
    if (/\/(?:marquee|home-anchor-nav)\.css$/.test(request.url())) {
      styleRequests.push(request.url());
    }
  });
  await page.route('**/styles/marquee.css', (route) =>
    route.fulfill({
      contentType: 'text/css',
      headers: { 'access-control-allow-origin': '*' },
      body: marqueeCss,
    }),
  );
  await page.route('**/styles/home-anchor-nav.css', (route) =>
    route.fulfill({
      contentType: 'text/css',
      headers: { 'access-control-allow-origin': '*' },
      body: anchorCss,
    }),
  );
  await page.setContent(`
    <main class="page_main_v3">
      <div data-marquee></div>
      <nav data-home-anchor-nav></nav>
    </main>
  `);
  await page.evaluate(() => {
    window.PatternMarquee = { init() {} };
    window.PatternHomeAnchorNav = { init() {} };
    window.PatternRuntimeConfig = {
      baseUrl: 'https://consumer.test/webflow/pattern.com/scripts/runtime/',
    };
  });
  await page.addScriptTag({ content: consumerSource });
  await page.waitForFunction(() => {
    const modules = window.PatternRuntime?.inspect().modules || [];
    return ['marquee', 'home-anchor-nav'].every(
      (id) => modules.find((module) => module.id === id)?.status === 'ready',
    );
  });
  await page.evaluate(() => {
    window.PatternVersionGatewayConfig = {
      mode: 'active',
      legacyPolicy: 'gateway',
      baseUrl: 'https://gateway.test/webflow/pattern.com/scripts/runtime/',
    };
  });
  await page.addScriptTag({ content: gatewaySource });
  await page.waitForFunction(() => {
    const modules = window.PatternVersionGateway?.inspect().modules || [];
    return ['marquee', 'home-anchor-nav'].every(
      (id) => modules.find((module) => module.id === id)?.status === 'ready',
    );
  });

  const styleState = await page.evaluate(() => ({
    marquee: [...document.querySelectorAll('link[rel="stylesheet"]')].filter((link) =>
      link.href.endsWith('/styles/marquee.css'),
    ).length,
    anchor: [...document.querySelectorAll('link[rel="stylesheet"]')].filter((link) =>
      link.href.endsWith('/styles/home-anchor-nav.css'),
    ).length,
    integrityCount: new Set(
      [...document.querySelectorAll('link[rel="stylesheet"][integrity]')].map(
        (link) => link.integrity,
      ),
    ).size,
  }));

  assert.equal(styleState.marquee, 1);
  assert.equal(styleState.anchor, 1);
  assert.equal(styleState.integrityCount, 2);
  assert.equal(styleRequests.length, 2);
  assert.ok(styleRequests.every((url) => url.startsWith('https://consumer.test/')));
  await page.close();

  console.log('PASS runtime cleanup');
} finally {
  await browser.close();
}

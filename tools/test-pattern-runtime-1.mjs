import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtimePath = path.join(
  projectRoot,
  'webflow/pattern.com/scripts/runtime/pattern-runtime.js',
);
const loaderPath = path.join(
  projectRoot,
  'webflow/pattern.com/scripts/runtime/pattern-runtime-loader.js',
);
const gatewayPath = path.join(
  projectRoot,
  'webflow/pattern.com/scripts/runtime/pattern-version-gateway.js',
);
const videoPopupPath = path.join(
  projectRoot,
  'webflow/pattern.com/scripts/media/video-popup.js',
);
const runtimeSource = await fs.readFile(runtimePath, 'utf8');
const loaderSource = await fs.readFile(loaderPath, 'utf8');
const gatewaySource = await fs.readFile(gatewayPath, 'utf8');
const videoPopupSource = await fs.readFile(videoPopupPath, 'utf8');
const runtimeSRI = `sha384-${crypto
  .createHash('sha384')
  .update(runtimeSource)
  .digest('base64')}`;

const browser = await chromium.launch({ headless: true });
const results = [];

const run = async (name, task) => {
  try {
    await task();
    results.push({ name, status: 'passed' });
  } catch (error) {
    results.push({
      name,
      status: 'failed',
      error: error.stack || error.message,
    });
  }
};

const createRuntimePage = async ({
  html = '<main></main>',
  config = {},
  beforeRuntime,
} = {}) => {
  const page = await browser.newPage();
  await page.setContent(html);
  await page.evaluate((value) => {
    window.PatternRuntimeConfig = value;
  }, {
    mode: 'active',
    legacyPolicy: 'gateway',
    disableDefaults: true,
    observeMutations: true,
    baseUrl: 'https://runtime.test/webflow/pattern.com/scripts/runtime/',
    ...config,
  });
  if (beforeRuntime) await beforeRuntime(page);
  await page.addScriptTag({ content: runtimeSource });
  await page.waitForFunction(() => window.PatternRuntime?.version === '1.0.0');
  return page;
};

const markerFixtures = [
  {
    version: 'v1',
    html: '<main class="page_main cc-v1"></main>',
  },
  {
    version: 'v2',
    html: '<main class="page_main cc-v2"></main>',
  },
  {
    version: 'v2l',
    html: '<main class="page_main cc-v2l"></main>',
  },
  {
    version: 'v3',
    html: '<main class="page_main_v3"></main>',
  },
];

await run('Library profile treats every page as V3', async () => {
  const page = await createRuntimePage({
    html: '<main class="page_main"></main>',
    config: { profile: 'library-v3' },
  });
  const inspection = await page.evaluate(() => window.PatternRuntime.inspect());
  assert.equal(inspection.profile, 'library-v3');
  assert.equal(inspection.detection.version, 'v3');
  assert.equal(inspection.detection.source, 'library-v3-profile');
  assert.equal(inspection.activation.allowed, true);
  await page.close();
});

await run('Consumer profile detects V1, V2, V2L, and V3 markers', async () => {
  for (const fixture of markerFixtures) {
    const page = await createRuntimePage({
      html: fixture.html,
      config: { profile: 'consumer' },
    });
    const inspection = await page.evaluate(() => window.PatternRuntime.inspect());
    assert.equal(inspection.detection.version, fixture.version);
    assert.equal(inspection.detection.safe, true);
    assert.equal(inspection.activation.allowed, true);
    await page.close();
  }
});

await run('Unknown and conflicting consumer pages fail closed', async () => {
  const unknownPage = await createRuntimePage({
    html: '<main class="page_main"></main>',
    config: { profile: 'consumer' },
  });
  const unknown = await unknownPage.evaluate(() => window.PatternRuntime.inspect());
  assert.equal(unknown.detection.safe, false);
  assert.equal(unknown.activation.allowed, false);
  assert.equal(unknown.activation.reason, 'unresolved-version');
  await unknownPage.close();

  const conflictPage = await createRuntimePage({
    html: '<main class="page_main cc-v1 cc-v2"></main>',
    config: { profile: 'consumer' },
  });
  const conflict = await conflictPage.evaluate(() => window.PatternRuntime.inspect());
  assert.equal(conflict.detection.safe, false);
  assert.equal(conflict.activation.allowed, false);
  assert.equal(conflict.activation.reason, 'conflicting-version-markers');
  await conflictPage.close();
});

await run('Observe mode creates a plan without loading assets', async () => {
  const page = await createRuntimePage({
    html: '<main class="page_main_v3"><div data-example></div></main>',
    config: {
      profile: 'consumer',
      mode: 'observe',
      disableDefaults: false,
    },
  });
  await page.evaluate(() => {
    window.PatternRuntime.register({
      id: 'example',
      versions: ['v3'],
      selector: '[data-example]',
      script: { src: '../example.js' },
    });
  });
  await page.waitForFunction(
    () =>
      window.PatternRuntime
        .inspect()
        .modules.find((module) => module.id === 'example')?.status === 'planned',
  );
  const state = await page.evaluate(() => ({
    inspection: window.PatternRuntime.inspect(),
    requested: [...document.scripts].some((script) => script.src.endsWith('/example.js')),
  }));
  assert.equal(state.inspection.activation.reason, 'observe-mode');
  assert.equal(state.requested, false);
  await page.close();
});

await run('A matched module script is requested once and reused', async () => {
  const page = await createRuntimePage({
    html: '<main class="page_main_v3"><div data-example></div></main>',
    config: {
      profile: 'consumer',
    },
  });
  let requests = 0;
  await page.route('https://runtime.test/webflow/pattern.com/scripts/example.js', (route) => {
    requests += 1;
    return route.fulfill({
      contentType: 'application/javascript',
      body: `
        window.PatternExample = window.PatternExample || {
          version: '1.0.0',
          init(scope) {
            scope.querySelectorAll('[data-example]').forEach((element) => {
              element.dataset.exampleReady = 'true';
            });
          }
        };
      `,
    });
  });
  await page.evaluate(() => {
    window.PatternRuntime.register({
      id: 'example',
      versions: ['v3'],
      selector: '[data-example]',
      global: 'PatternExample',
      script: { src: '../example.js' },
    });
  });
  await page.waitForFunction(
    () => document.querySelector('[data-example]')?.dataset.exampleReady === 'true',
  );
  await page.evaluate(async () => {
    await window.PatternRuntime.scan(document);
    await window.PatternRuntime.scan(document);
  });
  assert.equal(requests, 1);
  await page.close();
});

await run('Mutation observation initializes late component markup', async () => {
  const page = await createRuntimePage({
    html: '<main class="page_main_v3"></main>',
    config: { profile: 'consumer' },
    beforeRuntime: async (target) => {
      await target.evaluate(() => {
        window.PatternLateModule = {
          version: '1.0.0',
          init(scope) {
            const element =
              scope.matches?.('[data-late]') ? scope : scope.querySelector?.('[data-late]');
            if (element) element.dataset.ready = 'true';
          },
        };
      });
    },
  });
  await page.evaluate(() => {
    window.PatternRuntime.register({
      id: 'late',
      versions: ['v3'],
      selector: '[data-late]',
      global: 'PatternLateModule',
    });
    const element = document.createElement('div');
    element.setAttribute('data-late', '');
    document.querySelector('main').appendChild(element);
  });
  await page.waitForFunction(
    () => document.querySelector('[data-late]')?.dataset.ready === 'true',
  );
  await page.close();
});

await run('Consumer pageFunctions bridge parks Runtime-owned callbacks', async () => {
  const page = await createRuntimePage({
    html: '<main class="page_main cc-v2"></main>',
    config: {
      profile: 'consumer',
      pageFunctions: ['nav', 'splideSlider'],
    },
    beforeRuntime: async (target) => {
      await target.evaluate(() => {
        window.__pageFunctionCalls = [];
        window.pageFunctions = {
          functions: {
            nav: () => window.__pageFunctionCalls.push('nav'),
            splideSlider: () => window.__pageFunctionCalls.push('splideSlider'),
            other: () => window.__pageFunctionCalls.push('other'),
          },
          executed: {},
          executeFunctions() {
            Object.entries(this.functions).forEach(([id, fn]) => {
              fn();
              this.executed[id] = true;
            });
          },
        };
      });
    },
  });
  const calls = await page.evaluate(() => {
    window.pageFunctions.executeFunctions();
    return window.__pageFunctionCalls;
  });
  assert.deepEqual(calls, ['other']);
  await page.close();
});

await run('Library V3 popup uses one Runtime module and no legacy popup', async () => {
  const page = await createRuntimePage({
    html: `
      <main class="page_main">
        <div class="pattern-library-v3--video_player_wrap">
          <button data-video-player-open></button>
          <dialog data-video-player-dialog></dialog>
        </div>
      </main>
    `,
    config: {
      profile: 'library-v3',
      disableDefaults: false,
    },
    beforeRuntime: async (target) => {
      await target.evaluate(() => {
        window.PatternVideoPopup = {
          version: '1.1.2',
          init() {
            document.documentElement.dataset.popupInitialized = 'true';
          },
        };
      });
    },
  });
  await page.waitForFunction(
    () => document.documentElement.dataset.popupInitialized === 'true',
  );
  const plan = await page.evaluate(() => window.PatternRuntime.plan().map((item) => item.id));
  assert.equal(plan.includes('v3-video-popup'), true);
  assert.equal(plan.includes('legacy-video-popup'), false);
  await page.close();
});

await run('V3 video popup preserves explicit consent and resumes after approval', async () => {
  const page = await browser.newPage();
  await page.route(
    'https://runtime.test/webflow/pattern.com/scripts/media/video-popup.js',
    (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        headers: { 'access-control-allow-origin': '*' },
        body: videoPopupSource,
      }),
  );
  await page.setContent(`
    <main class="page_main">
      <div class="pattern-library-v3--video_player_wrap">
        <button data-video-player-open>Play</button>
        <dialog data-video-player-dialog data-consent-category="personalization">
          <iframe data-video-src="https://www.youtube.com/watch?v=K4TOrB7at0Y"></iframe>
          <button data-video-player-close>Close</button>
        </dialog>
      </div>
    </main>
  `);
  await page.evaluate(() => {
    const listeners = new Map();
    const consentState = { personalization: false };
    window.__consentFixture = {
      consentState,
      listeners,
      approve() {
        consentState.personalization = true;
        listeners.get('consent-updated')?.forEach((listener) =>
          listener({ consents: consentState }),
        );
      },
    };
    window.FinsweetConsentPro = {
      consents: {
        get: () => consentState,
      },
      on(name, listener) {
        if (!listeners.has(name)) listeners.set(name, []);
        listeners.get(name).push(listener);
      },
    };
    window.PatternRuntimeConfig = {
      profile: 'library-v3',
      mode: 'active',
      legacyPolicy: 'gateway',
      baseUrl: 'https://runtime.test/webflow/pattern.com/scripts/runtime/',
    };
  });
  await page.addScriptTag({ content: runtimeSource });
  await page.waitForFunction(() => window.PatternVideoPopup?.version === '1.1.2');
  await page.locator('[data-video-player-open]').click();
  let state = await page.evaluate(() => {
    const dialog = document.querySelector('dialog');
    return {
      open: dialog.open,
      src: dialog.querySelector('iframe').getAttribute('src'),
    };
  });
  assert.equal(state.open, false);
  assert.equal(state.src, null);

  await page.evaluate(() => window.__consentFixture.approve());
  await page.waitForFunction(() => document.querySelector('dialog')?.open === true);
  state = await page.evaluate(() => {
    const dialog = document.querySelector('dialog');
    return {
      open: dialog.open,
      src: dialog.querySelector('iframe').getAttribute('src'),
    };
  });
  assert.equal(state.open, true);
  assert.match(state.src, /^https:\/\/www\.youtube\.com\/embed\/K4TOrB7at0Y\?/);
  await page.close();
});

await run('Consumer V3 preserves authored fc-video-popup markup during migration', async () => {
  const page = await createRuntimePage({
    html: `
      <main class="page_main_v3">
        <div fc-video-popup="open"></div>
        <div fc-video-popup="component"></div>
      </main>
    `,
    config: {
      profile: 'consumer',
      mode: 'observe',
      disableDefaults: false,
    },
  });
  const plan = await page.evaluate(() =>
    window.PatternRuntime.plan().map((item) => item.id),
  );
  assert(plan.includes('legacy-video-popup'));
  assert(!plan.includes('v3-video-popup'));
  await page.close();
});

await run('Unified Runtime preserves the PVG module plan for consumer fixtures', async () => {
  const fixtures = [
    {
      version: 'v1',
      html: `
        <main class="page_main cc-v1">
          <nav class="nav_wrap"></nav>
          <div fc-video-popup="open"></div>
          <img src="about:blank">
          <div class="splide"></div>
        </main>
      `,
    },
    {
      version: 'v2',
      html: `
        <main class="page_main cc-v2">
          <div class="faq_card"></div>
          <img src="about:blank">
          <div class="w-pagination-next"></div>
        </main>
      `,
    },
    {
      version: 'v2l',
      html: `
        <main class="page_main cc-v2l">
          <nav class="nav_wrap"></nav>
          <div card-grid><div card-load></div></div>
        </main>
      `,
    },
    {
      version: 'v3',
      html: `
        <main class="page_main_v3">
          <div data-marquee></div>
          <div data-home-anchor-nav></div>
          <div class="pattern-library-v3--accordion_wrap"></div>
        </main>
      `,
    },
  ];

  for (const fixture of fixtures) {
    const oldPage = await browser.newPage();
    await oldPage.setContent(fixture.html);
    await oldPage.evaluate(() => {
      window.PatternVersionGatewayConfig = {
        mode: 'observe',
        legacyPolicy: 'gateway',
      };
    });
    await oldPage.addScriptTag({ content: gatewaySource });
    await oldPage.waitForFunction(() => window.PatternVersionGateway?.version === '0.2.4');
    const oldPlan = await oldPage.evaluate(() =>
      window.PatternVersionGateway.plan().map((item) => item.id).sort(),
    );

    const newPage = await createRuntimePage({
      html: fixture.html,
      config: {
        profile: 'consumer',
        mode: 'observe',
        disableDefaults: false,
      },
    });
    const newPlan = await newPage.evaluate(() =>
      window.PatternRuntime.plan().map((item) => item.id).sort(),
    );
    assert.deepEqual(newPlan, oldPlan, `Plan mismatch for ${fixture.version}`);
    await oldPage.close();
    await newPage.close();
  }
});

await run('Permanent bootstrap loads an integrity-checked Runtime manifest', async () => {
  const page = await browser.newPage();
  await page.route('https://assets.test/runtime/loader.js', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: loaderSource,
    }),
  );
  await page.route('https://assets.test/runtime/stable.json', (route) =>
    route.fulfill({
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        schemaVersion: 1,
        channel: 'stable',
        enabled: true,
        runtime: {
          version: '1.0.0',
          src: 'https://assets.test/runtime/pattern-runtime.js',
          integrity: runtimeSRI,
        },
      }),
    }),
  );
  await page.route('https://assets.test/runtime/pattern-runtime.js', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      headers: { 'access-control-allow-origin': '*' },
      body: runtimeSource,
    }),
  );
  await page.setContent(`
    <main class="page_main"></main>
    <script
      src="https://assets.test/runtime/loader.js"
      data-pattern-runtime-profile="library-v3"
      data-pattern-runtime-channel="stable"
      data-pattern-runtime-manifest="https://assets.test/runtime/stable.json"
    ></script>
  `);
  await page.waitForFunction(() => window.PatternRuntime?.version === '1.0.0');
  const inspection = await page.evaluate(() => window.PatternRuntime.inspect());
  assert.equal(inspection.profile, 'library-v3');
  assert.equal(inspection.manifestVersion, '1.0.0');
  await page.close();
});

await run('Disabled central manifest loads no Runtime', async () => {
  const page = await browser.newPage();
  await page.route('https://assets.test/runtime/loader.js', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: loaderSource,
    }),
  );
  await page.route('https://assets.test/runtime/stable.json', (route) =>
    route.fulfill({
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        schemaVersion: 1,
        channel: 'stable',
        enabled: false,
      }),
    }),
  );
  await page.setContent(`
    <main class="page_main"></main>
    <script
      src="https://assets.test/runtime/loader.js"
      data-pattern-runtime-profile="library-v3"
      data-pattern-runtime-channel="stable"
      data-pattern-runtime-manifest="https://assets.test/runtime/stable.json"
    ></script>
  `);
  await page.waitForFunction(() => window.__patternRuntimeLoaderPromise);
  await page.evaluate(() => window.__patternRuntimeLoaderPromise);
  const state = await page.evaluate(() => ({
    runtime: window.PatternRuntime?.version || null,
    payloads: document.querySelectorAll('[data-pattern-runtime-payload]').length,
  }));
  assert.equal(state.runtime, null);
  assert.equal(state.payloads, 0);
  await page.close();
});

await browser.close();

const failed = results.filter((result) => result.status === 'failed');
console.log(JSON.stringify({ runtimeSRI, results }, null, 2));

if (failed.length) process.exitCode = 1;

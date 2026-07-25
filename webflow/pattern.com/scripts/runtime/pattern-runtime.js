(() => {
  'use strict';

  const GLOBAL_NAME = 'PatternRuntime';
  const VERSION = '0.1.1';
  const EVENT_PREFIX = 'pattern:runtime';
  const DYNAMIC_YEAR_SELECTOR = '[data-dynamic-year]';
  const currentScript = document.currentScript;
  const existingRuntime = window[GLOBAL_NAME];

  if (existingRuntime?.version) {
    existingRuntime.scan(document);
    return;
  }

  const config = {
    debug:
      currentScript?.hasAttribute('data-pattern-runtime-debug') ||
      new URLSearchParams(window.location.search).has('pattern-runtime-debug'),
    observe: true,
    disableDefaults: false,
    ...(window.PatternRuntimeConfig || {}),
  };

  const baseUrl = config.baseUrl || (currentScript?.src ? new URL('.', currentScript.src).href : '');
  const modules = new Map();
  const moduleStates = new Map();
  const dependencies = new Map();
  const dependencyPromises = new Map();
  const scriptPromises = new Map();
  const stylePromises = new Map();
  const queuedScopes = new Set();
  let observer = null;
  let scanFrame = 0;
  let booted = false;

  const debug = (...args) => {
    if (config.debug) console.info('[Pattern Runtime]', ...args);
  };

  const warn = (...args) => {
    console.warn('[Pattern Runtime]', ...args);
  };

  const emit = (name, detail) => {
    document.dispatchEvent(
      new CustomEvent(`${EVENT_PREFIX}:${name}`, {
        detail,
      }),
    );
  };

  const resolveUrl = (value) => {
    if (!value) return '';

    try {
      return new URL(value, baseUrl || window.location.href).href;
    } catch (error) {
      warn('Invalid asset URL:', value, error);
      return '';
    }
  };

  const getGlobal = (path) => {
    if (!path) return null;

    return String(path)
      .split('.')
      .reduce((value, key) => value?.[key], window);
  };

  const hasMatch = (scope, selector) => {
    if (!scope || !selector) return false;
    if (scope.nodeType === Node.ELEMENT_NODE && scope.matches?.(selector)) return true;
    return Boolean(scope.querySelector?.(selector));
  };

  const updateDynamicYears = (scope = document) => {
    const year = String(new Date().getFullYear());
    const elements = [];

    if (scope.nodeType === Node.ELEMENT_NODE && scope.matches?.(DYNAMIC_YEAR_SELECTOR)) {
      elements.push(scope);
    }

    scope.querySelectorAll?.(DYNAMIC_YEAR_SELECTOR).forEach((element) => {
      elements.push(element);
    });

    elements.forEach((element) => {
      if (element.textContent !== year) element.textContent = year;
    });
  };

  const setAssetAttributes = (element, options = {}) => {
    element.setAttribute('data-pattern-runtime-asset', options.id || '');

    if (options.integrity) {
      element.integrity = options.integrity;
      element.crossOrigin = options.crossOrigin || 'anonymous';
    } else if (options.crossOrigin) {
      element.crossOrigin = options.crossOrigin;
    }

    if (options.referrerPolicy) element.referrerPolicy = options.referrerPolicy;
  };

  const loadScript = (source, options = {}) => {
    const url = resolveUrl(source);
    if (!url) return Promise.reject(new Error(`Invalid script URL: ${source}`));
    if (scriptPromises.has(url)) return scriptPromises.get(url);

    const promise = new Promise((resolve, reject) => {
      const existing = [...document.scripts].find((script) => script.src === url);

      if (existing?.dataset.patternRuntimeLoaded === 'true') {
        resolve(existing);
        return;
      }

      const script = existing || document.createElement('script');
      const finish = () => {
        script.dataset.patternRuntimeLoaded = 'true';
        resolve(script);
      };
      const fail = () => reject(new Error(`Failed to load script: ${url}`));

      script.addEventListener('load', finish, { once: true });
      script.addEventListener('error', fail, { once: true });

      if (existing) return;

      script.src = url;
      script.async = true;
      setAssetAttributes(script, options);
      document.head.appendChild(script);
    });

    scriptPromises.set(url, promise);
    return promise;
  };

  const loadStyle = (source, options = {}) => {
    const url = resolveUrl(source);
    if (!url) return Promise.reject(new Error(`Invalid stylesheet URL: ${source}`));
    if (stylePromises.has(url)) return stylePromises.get(url);

    const promise = new Promise((resolve, reject) => {
      const existing = [...document.querySelectorAll('link[rel="stylesheet"]')].find(
        (link) => link.href === url,
      );

      if (existing?.dataset.patternRuntimeLoaded === 'true' || existing?.sheet) {
        resolve(existing);
        return;
      }

      const link = existing || document.createElement('link');
      const finish = () => {
        link.dataset.patternRuntimeLoaded = 'true';
        resolve(link);
      };
      const fail = () => reject(new Error(`Failed to load stylesheet: ${url}`));

      link.addEventListener('load', finish, { once: true });
      link.addEventListener('error', fail, { once: true });

      if (existing) return;

      link.rel = 'stylesheet';
      link.href = url;
      setAssetAttributes(link, options);
      document.head.appendChild(link);
    });

    stylePromises.set(url, promise);
    return promise;
  };

  const registerDependency = (definition) => {
    if (!definition?.id) throw new Error('A dependency id is required.');
    dependencies.set(definition.id, { ...definition });
  };

  const loadDependency = (id) => {
    if (dependencyPromises.has(id)) return dependencyPromises.get(id);

    const definition = dependencies.get(id);
    if (!definition) return Promise.reject(new Error(`Unknown dependency: ${id}`));

    const promise = (async () => {
      if (definition.global && getGlobal(definition.global)) {
        debug(`Dependency "${id}" already exists.`);
        return getGlobal(definition.global);
      }

      await Promise.all(
        (definition.styles || []).map((style) =>
          loadStyle(style.src || style, {
            ...style,
            id: `${id}:style`,
          }),
        ),
      );

      for (const script of definition.scripts || []) {
        await loadScript(script.src || script, {
          ...script,
          id: `${id}:script`,
        });
      }

      const value = definition.global ? getGlobal(definition.global) : true;
      if (!value) throw new Error(`Dependency "${id}" loaded without ${definition.global}.`);

      debug(`Dependency "${id}" is ready.`);
      return value;
    })().catch((error) => {
      dependencyPromises.delete(id);
      emit('dependency-error', { dependency: id, error });
      throw error;
    });

    dependencyPromises.set(id, promise);
    return promise;
  };

  const normalizeModule = (definition) => {
    if (!definition?.id) throw new Error('A module id is required.');
    if (!definition.selector) throw new Error(`Module "${definition.id}" needs a selector.`);

    return {
      dependencies: [],
      styles: [],
      initMethod: 'init',
      destroyMethod: 'destroy',
      initScope: 'scope',
      ...definition,
    };
  };

  const register = (definition) => {
    const normalized = normalizeModule(definition);
    modules.set(normalized.id, normalized);

    if (!moduleStates.has(normalized.id)) {
      moduleStates.set(normalized.id, {
        status: 'idle',
        error: null,
        promise: null,
      });
    }

    if (booted) void scan(document);
    return api;
  };

  const resolveModuleApi = (definition) =>
    definition.api || getGlobal(definition.global);

  const ensureModule = (definition) => {
    const state = moduleStates.get(definition.id);
    if (state.promise) return state.promise;

    state.status = 'loading';
    state.error = null;
    emit('module-loading', { module: definition.id });

    state.promise = (async () => {
      await Promise.all(definition.dependencies.map(loadDependency));
      await Promise.all(
        definition.styles.map((style) =>
          loadStyle(style.src || style, {
            ...style,
            id: `${definition.id}:style`,
          }),
        ),
      );

      if (definition.script && !resolveModuleApi(definition)) {
        await loadScript(definition.script.src || definition.script, {
          ...definition.script,
          id: `${definition.id}:script`,
        });
      }

      const moduleApi = resolveModuleApi(definition);
      if (definition.global && !moduleApi) {
        throw new Error(`Module "${definition.id}" loaded without ${definition.global}.`);
      }

      state.status = 'ready';
      emit('module-ready', { module: definition.id });
      debug(`Module "${definition.id}" is ready.`);
      return moduleApi;
    })().catch((error) => {
      state.status = 'error';
      state.error = error;
      state.promise = null;
      emit('module-error', { module: definition.id, error });
      warn(`Module "${definition.id}" failed. Static content remains available.`, error);
      throw error;
    });

    return state.promise;
  };

  const initializeModule = async (definition, scope) => {
    const moduleApi = await ensureModule(definition);
    const init = definition.init || moduleApi?.[definition.initMethod];
    if (typeof init !== 'function') return;

    const initScope = definition.initScope === 'document' ? document : scope;
    await init(initScope, api);
  };

  const cleanupModule = (definition, scope) => {
    const state = moduleStates.get(definition.id);
    if (state?.status !== 'ready') return;

    const moduleApi = resolveModuleApi(definition);
    const destroy = definition.destroy || moduleApi?.[definition.destroyMethod];
    if (typeof destroy !== 'function') return;

    try {
      destroy(scope, api);
    } catch (error) {
      warn(`Module "${definition.id}" cleanup failed.`, error);
    }
  };

  const scan = async (scope = document) => {
    const jobs = [];

    modules.forEach((definition) => {
      if (!hasMatch(scope, definition.selector)) return;
      jobs.push(initializeModule(definition, scope));
    });

    const results = await Promise.allSettled(jobs);
    emit('scan-complete', { scope, matched: jobs.length });
    return results;
  };

  const flushQueuedScopes = () => {
    scanFrame = 0;
    const scopes = [...queuedScopes];
    queuedScopes.clear();
    scopes.forEach((scope) => void scan(scope));
  };

  const queueScan = (scope) => {
    if (!scope || scope.nodeType !== Node.ELEMENT_NODE) return;
    queuedScopes.add(scope);
    if (!scanFrame) scanFrame = window.requestAnimationFrame(flushQueuedScopes);
  };

  const observe = () => {
    if (!config.observe || observer || !document.body) return;

    observer = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach(queueScan);
        record.removedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          modules.forEach((definition) => {
            if (hasMatch(node, definition.selector)) cleanupModule(definition, node);
          });
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  };

  const destroy = (scope = document) => {
    modules.forEach((definition) => cleanupModule(definition, scope));

    if (scope === document) {
      observer?.disconnect();
      observer = null;
      if (scanFrame) window.cancelAnimationFrame(scanFrame);
      scanFrame = 0;
      queuedScopes.clear();
    }
  };

  const inspect = () => ({
    version: VERSION,
    baseUrl,
    observing: Boolean(observer),
    modules: [...modules.values()].map((definition) => {
      const state = moduleStates.get(definition.id);
      return {
        id: definition.id,
        selector: definition.selector,
        status: state?.status || 'idle',
        matched: hasMatch(document, definition.selector),
        dependencies: [...definition.dependencies],
        error: state?.error?.message || null,
      };
    }),
    dependencies: [...dependencies.keys()].map((id) => ({
      id,
      status: dependencyPromises.has(id) ? 'requested' : 'idle',
    })),
  });

  const api = {
    version: VERSION,
    managed: true,
    config,
    register,
    registerDependency,
    loadDependency,
    loadScript,
    loadStyle,
    scan,
    destroy,
    inspect,
  };

  window[GLOBAL_NAME] = api;

  registerDependency({
    id: 'gsap',
    global: 'gsap',
    scripts: [
      {
        src: 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js',
        crossOrigin: 'anonymous',
      },
    ],
  });

  registerDependency({
    id: 'swiper',
    global: 'Swiper',
    styles: [
      {
        src: 'https://cdn.jsdelivr.net/npm/swiper@8.4.7/swiper-bundle.min.css',
        crossOrigin: 'anonymous',
      },
    ],
    scripts: [
      {
        src: 'https://cdn.jsdelivr.net/npm/swiper@8.4.7/swiper-bundle.min.js',
        crossOrigin: 'anonymous',
      },
    ],
  });

  if (!config.disableDefaults) {
    register({
      id: 'dynamic-year',
      selector: DYNAMIC_YEAR_SELECTOR,
      api: {
        init: updateDynamicYears,
      },
    });

    register({
      id: 'marquee',
      selector: '[data-marquee]',
      global: 'PatternMarquee',
      script: {
        src: '../interaction/marquee.js',
        integrity: 'sha384-CUDP6vv0eZ3XQQvD0Wn6Osr4Tm6vKXZNq7DnCtlsWYpDkvfJFWHbcTO06d8AtPPT',
      },
      styles: [
        {
          src: '../../styles/marquee.css',
          integrity: 'sha384-AmEK1fi+66pyjxnbxtHuCV0BHx0uBH5U2fBj8aFVKE8ut+PH6qVBGom9170D2Wbn',
        },
      ],
    });

    register({
      id: 'case-study',
      selector: '[data-case-study-slider], .case-study_slider_wrap',
      global: 'PatternCaseStudyCMS',
      script: {
        src: '../content/case-study-cms-slider.js',
        integrity: 'sha384-xLKxabZMf1T16Aq+EfF0ynmW7Uiryfkof+duCRRs3XTQe1dejgPuCdTIggt4bX+b',
      },
      dependencies: ['swiper', 'gsap'],
      initScope: 'document',
    });

    register({
      id: 'accordion',
      selector: '[data-accordion], [class*="accordion_wrap"]',
      global: 'PatternAccordion',
      script: {
        src: '../interaction/accordion.js',
        integrity: 'sha384-EFg0P5l1NeVQxGzun6SnQdALBCSs680cLLhYUFbMXZJqRr7T+8tGuiemc7KwQOBG',
      },
      dependencies: ['gsap'],
    });

    register({
      id: 'video-popup',
      selector: '.video_player_wrap',
      global: 'PatternVideoPopup',
      script: {
        src: '../media/video-popup.js',
        integrity: 'sha384-DDstu5sehfzRF8Q5vas7D9gM22r6dbpdz2D/E/97eZEmLk6T3SqtSkYjC57anqc2',
      },
    });
  }

  const boot = () => {
    if (booted) return;
    booted = true;
    void scan(document);
    observe();
    emit('ready', { runtime: api });
    debug('Ready.', inspect());
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();

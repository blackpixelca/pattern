/*
 * Pattern UK version split — Phase 4 pilot loader
 * Runs only on an explicitly marked pilot root.
 */
(function (global, document) {
  "use strict";

  var pilotRoot = document.querySelector(
    '[data-pattern-asset-pilot="phase4"][data-pattern-version]'
  );
  if (!pilotRoot) return;

  var version = pilotRoot.getAttribute("data-pattern-version");
  if (version !== "v1" && version !== "v2") return;

  var currentScript = document.currentScript;
  if (!currentScript || !currentScript.src) return;

  var packageRoot = new URL("../", currentScript.src);
  var state = global.__patternVersionSplit = global.__patternVersionSplit || {
    phase: 4,
    version: version,
    loaded: [],
    skipped: [],
    failed: []
  };

  function normalizedUrl(url) {
    return new URL(url, document.baseURI).href;
  }

  function hasScript(url) {
    var expected = normalizedUrl(url);
    return Array.prototype.some.call(
      document.querySelectorAll("script[src]"),
      function (script) {
        return normalizedUrl(script.src) === expected;
      }
    );
  }

  function loadScript(id, url) {
    return new Promise(function (resolve) {
      if (hasScript(url)) {
        state.skipped.push(id);
        resolve();
        return;
      }

      var script = document.createElement("script");
      script.src = url;
      script.defer = true;
      script.dataset.patternSplitAsset = id;
      script.addEventListener("load", function () {
        state.loaded.push(id);
        resolve();
      }, { once: true });
      script.addEventListener("error", function () {
        state.failed.push(id);
        resolve();
      }, { once: true });
      document.body.appendChild(script);
    });
  }

  var featureScripts = [
  {
    "id": "splide-js",
    "selector": ".splide",
    "url": "https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/js/splide.min.js"
  },
  {
    "id": "pagination-js",
    "selector": "[class*='pagination']",
    "url": "https://cdn.jsdelivr.net/gh/specterstudio/pattern@v1.0.8/webflow/pattern.com/scripts/interaction/pagination-fix.js"
  },
  {
    "id": "video-popup",
    "selector": "[class*='video_popup'], [data-video-popup]",
    "url": "https://cdn.jsdelivr.net/gh/specterstudio/pattern@v1.0.8/webflow/pattern.com/scripts/media/video-popup.js"
  },
  {
    "id": "logos",
    "selector": "[class*='logo']",
    "url": "https://cdn.jsdelivr.net/gh/specterstudio/pattern@v1.0.8/webflow/pattern.com/scripts/content/logos.js"
  },
  {
    "id": "rich-text-heading-conversion",
    "selector": ".w-richtext",
    "url": "https://cdn.jsdelivr.net/gh/specterstudio/pattern@v1.0.8/webflow/pattern.com/scripts/content/rich-text-heading-conversion.js"
  },
  {
    "id": "faq-schema",
    "selector": "[class*='faq']",
    "url": "https://cdn.jsdelivr.net/gh/specterstudio/pattern@v1.0.8/webflow/pattern.com/scripts/schema/faq-schema-generator.js"
  },
  {
    "id": "accordion",
    "selector": "[class*='accordion']",
    "url": "https://cdn.jsdelivr.net/gh/specterstudio/pattern@v1.0.8/webflow/pattern.com/scripts/interaction/accordion.js"
  },
  {
    "id": "lazy-load",
    "selector": "[loading='lazy'], [data-src]",
    "url": "https://cdn.jsdelivr.net/gh/specterstudio/pattern@v1.0.8/webflow/pattern.com/scripts/interaction/lazy-load.js"
  },
  {
    "id": "cta-inject",
    "selector": "[data-cta-inject], [class*='cta']",
    "url": "https://cdn.jsdelivr.net/gh/specterstudio/pattern@v1.0.8/webflow/pattern.com/scripts/content/cta-inject.js"
  },
  {
    "id": "iframe-popup",
    "selector": "[data-iframe-popup], [class*='iframe_popup']",
    "url": "https://cdn.jsdelivr.net/gh/specterstudio/pattern@v1.0.2/webflow/pattern.com/scripts/media/iframe-popup.js"
  },
  {
    "id": "card-load-animations",
    "selector": "[class*='card']",
    "url": "https://cdn.jsdelivr.net/gh/specterstudio/pattern@v1.0.8/webflow/pattern.com/scripts/interaction/card-load-animations-v10.js"
  }
];

  loadScript("shared-runtime", new URL("js/shared.js", packageRoot).href)
    .then(function () {
      return loadScript(
        version + "-runtime",
        new URL("js/" + version + ".js", packageRoot).href
      );
    })
    .then(function () {
      return featureScripts.reduce(function (promise, feature) {
        if (!document.querySelector(feature.selector)) return promise;
        return promise.then(function () {
          return loadScript(feature.id, feature.url);
        });
      }, Promise.resolve());
    })
    .then(function () {
      if (
        global.pageFunctions &&
        typeof global.pageFunctions.executeFunctions === "function"
      ) {
        global.pageFunctions.executeFunctions();
      }

      document.dispatchEvent(new CustomEvent("pattern:version-split-ready", {
        detail: {
          phase: 4,
          version: version,
          loaded: state.loaded.slice(),
          skipped: state.skipped.slice(),
          failed: state.failed.slice()
        }
      }));
    });
})(window, document);

# Pattern Runtime

`pattern-runtime.js` is the shared delivery layer for Pattern-owned Webflow
behaviors. It detects supported component selectors, loads only their required
styles/scripts and third-party dependencies, and calls each module's idempotent
`init(scope)` API.

## Component embed

The Webflow `• Global / Runtime` component contains only a small bootloader that
injects the commit-pinned Runtime asset once per page. The Runtime and component
modules remain hosted in this repository and are delivered through jsDelivr.

## Default modules

| Module | Detection selector | Dependencies |
| --- | --- | --- |
| Marquee | `[data-marquee]` | Marquee CSS |
| Case Study | `[data-case-study-slider], .case-study_slider_wrap` | Swiper 8, GSAP 3 |
| Accordion | `[data-accordion], [class*="accordion_wrap"]` | GSAP 3 |
| Video Popup | `.video_player_wrap` | None |

## Runtime contract

Each behavior module should expose a namespaced global with:

```js
window.PatternExample = {
  version: '1.0.0',
  init(scope = document) {},
  destroy(scope = document) {},
};
```

`init` must be idempotent and support multiple component roots. Use a
`WeakMap`/`WeakSet` per root rather than a page-wide initialized flag.
`destroy` is optional but recommended for listeners, observers, timers, and
third-party instances.

## Adding a module

Register modules before or after Runtime boot:

```js
window.PatternRuntime.register({
  id: 'example',
  selector: '[data-example]',
  global: 'PatternExample',
  script: { src: 'https://example.com/example.js' },
  dependencies: ['gsap'],
});
```

Runtime deduplicates scripts, styles, and dependencies by resolved URL. A single
MutationObserver batches added nodes and rescans only the added scopes.

## Diagnostics

Add `?pattern-runtime-debug` to a page URL or
`data-pattern-runtime-debug` to the Runtime script. Then inspect:

```js
window.PatternRuntime.inspect();
```

The Runtime also emits `pattern:runtime:*` document events for readiness,
module loading, errors, and completed scans.

## Content contract

Runtime enhances Webflow-rendered HTML. Critical text, headings, links,
metadata, structured data, layout CSS, and LCP resources must not depend on
Runtime execution.

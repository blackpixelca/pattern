# Pattern UK Version Split

Phase 4 pilot package for separating Shared, V1, V2, and feature-specific assets.

The hosted package is intended only for the two explicitly marked Phase 4 pilot
pages. The loader remains inactive unless the page contains both
`data-pattern-asset-pilot="phase4"` and a valid `data-pattern-version` marker.

## Architecture

| Layer | Source | Purpose |
|---|---|---|
| Shared CSS | `css/shared.css` | Current Lumos foundation plus generic helpers required by both page versions and shared Header/Footer components |
| V1 CSS | `css/v1.css` | V1 compatibility and production-fidelity rules scoped through `data-pattern-version="v1"` |
| V2 CSS | `css/v2.css` | V2 Content Wrapper alignment behavior scoped through `data-pattern-version="v2"` |
| Feature bundle | `css/features.css` | Concatenated feature CSS for the isolated two-page pilot |
| Feature CSS | `css/features/*.css` | Marketo, icons, cards, buttons, gradients, accordions, sliders, navigation, modal, lightbox, marquee, grid media, and rich text |
| Pilot loader | `js/loader.js` | Loads Shared and matching version runtimes only on explicitly marked pilot pages; feature scripts are selector-driven and duplicate-safe |
| Shared JS | `js/shared.js` | Current `pageFunctions` registry and one-time DOM-ready execution |
| V1 JS | `js/v1.js` | Intentionally empty because the audit found no V1-exclusive JavaScript |
| V2 JS | `js/v2.js` | Intentionally empty because the audit found no V2-exclusive JavaScript |

`external-assets.json` inventories current hosted assets and candidate DOM
selectors. Its JavaScript feature entries are compiled into the loader at build
time.

## Important decisions

- `.page_code_wrap` is not a version signal anywhere in the generated V1 source.
- V1 accepts all three mapped marker locations: Body, `.page_main`, and `.page_wrap`.
- The unsuffixed `--grid-1` through `--grid-12` aliases remain Shared because
  the global Header and Footer consume them.
- Marketo is a shared feature, not a V1 or V2 asset.
- The shared Header and Footer use unsuffixed utility classes, so their shared
  container tokens and compatibility foundation remain in Shared rather than V1.
- Conditional Visibility may later select component markup, but it must not load CSS or JavaScript.

## Build and verification

Run:

```bash
node webflow/uk.pattern.com/version-split/build.mjs
```

The build reads the exact Phase 1 rollback captures, regenerates the source files, and writes hashes and structural checks to `validation.json`.

Current validation:

- 24 generated files
- 18 CSS files
- 4 JavaScript files
- 48 of 48 structural checks passed
- 18 of 18 CSS files parsed in Chromium
- 468 CSSOM rules parsed
- Shared container-token and grid-alias behavior plus V1-only type aliases verified
- V2 Content Wrapper alignment verified only with a V2 marker
- V1 and V2 pilot runtime selection verified
- Loader inactivity without the explicit Phase 4 pilot marker verified

Run the browser verification:

```bash
node webflow/uk.pattern.com/version-split/verify-phase4.mjs
```

## Pilot boundary

The pilot is limited to Pattern Intelligence and Our Story. It does not
authorize Webflow publishing or broader page rollout.

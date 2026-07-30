# Pattern US staging PVG 0.2.4 validation

Status: **Awaiting one corrective staging-only republish**

Production domains were not published.

## Publish evidence

- Target: `pattern-us.webflow.io` only
- Webflow publish result: `customDomains: []`
- Live staging timestamp: `2026-07-30T16:54:46Z`
- Live loader: PVG `0.2.4`
- Runtime commit:
  `7bb2b6f2fc7ae258285fbafcd643e717b64009e1`
- Runtime SRI:
  `sha384-HBYB8fSqocEljJAPTrEeai0HbLKdhRDfgFfu/4cslT7DnF6MRKxYcbVu/U0Z8sBp`
- Mode: `active`
- Legacy policy: `gateway`

## Representative browser gate

The corrected read-only browser matrix passed:

- 23 of 23 representative V1, V2, and V3 routes returned HTTP 200.
- 23 of 23 resolved to the expected explicit version.
- 23 of 23 activated PVG 0.2.4.
- No PVG module, console, or request failures were found.
- No unmanaged or duplicate PVG-owned assets were found.
- 24 count-up cards across five routes initialized horizontally and animated.
- Portal Studio Splide initialized once, produced one track/list, and moved.

Evidence:
`2026-07-30-us-staging-pvg-0.2.4-browser-matrix.json`

## Full sitemap/source gate

The crawl inspected all 1,124 sitemap URLs at concurrency four without a 429.

- 1,122 routes returned HTTP 200 during the crawl.
- Two blog routes returned transient HTTP 500 responses during the crawl; both
  returned HTTP 200 on immediate sequential recheck.
- 1,006 routes were explicit V2, 111 were explicit V1, and one was explicit
  V3.
- The only inferred route was International Expansion Videos.
- Prep Calculator, Consent Pro, and Catalog Offer are approved utility
  exclusions and are not PVG content-page blockers.
- No removed site-level legacy asset remained in the HTML source.

Raw evidence:
`2026-07-30-us-staging-pvg-0.2.4-route-crawl.json`

## Corrective saved change

The crawl proved that International Expansion Videos was still live and
included in the sitemap despite the earlier unpublish attempt.

The saved Webflow state is now verified as:

- `draft: true`
- `includeInSitemap: false`

This correction is not live yet. It requires a new publish to
`pattern-us.webflow.io` only, followed by:

1. Confirm the route no longer returns a published page.
2. Confirm the route is absent from `sitemap.xml`.
3. Re-run the focused loader/version check.
4. Re-run the representative browser matrix if the compiled site timestamp
   changes as expected.

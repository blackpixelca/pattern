# Pattern Version Gateway Implementation

## Objective

Deliver one Pattern-owned runtime that:

1. detects whether the current page is V1, V2, V2L, or V3;
2. detects which supported components are present;
3. loads only the scripts, styles, and third-party dependencies required by
   that version/component combination; and
4. preserves the existing published behavior until each version is explicitly
   cleared for cutover.

The V3 video popup is an acceptance test of this architecture. It is not a
standalone footer-script replacement.

## Runtime safety contract

- PVG defaults to `observe` and makes no page changes.
- Conflicting or unknown version markers cannot activate.
- Unmarked `.page_main` pages are reported as probable V2 but are not safe to
  activate without an explicit marker or route-registry entry.
- V1, V2, and V2L default to `legacyPolicy: "preserve"`.
- Existing production footer assets stay installed throughout observation and
  the first V3 activation.
- A failed PVG observation loader leaves the existing production runtime intact.
- All hosted releases must use a commit-pinned URL and matching SRI.

## Version detection

| Version | Primary marker | Compatibility handling |
| --- | --- | --- |
| V1 | `.page_main.cc-v1` or `data-pattern-version="v1"` | Explicit marker required for legacy cutover |
| V2 | `.page_main.cc-v2` or `data-pattern-version="v2"` | Unmarked `.page_main` is detected but activation is refused |
| V2L | `.page_main.cc-v2l` or `data-pattern-version="v2l"` | Uses the V2 family manifest |
| V3 | `.page_main_v3`, `.cc-v3`, or `data-pattern-version="v3"` | May be activated independently after staging verification |

An exact route registry can identify pages that cannot immediately receive an
authored version marker.

## Delivery phases

### Phase A — Background foundation

- Build the PVG loader and manifest.
- Verify detection and component planning locally.
- Keep all production surfaces unchanged.

### Phase B — Shadow observation

- Install a commit-pinned `mode="observe"` loader on a safe staging surface.
- Compare `PatternVersionGateway.inspect()` against the published DOM and
  network inventory.
- Confirm that observation mode adds no component assets.

### Phase C — V3 activation

- Activate PVG only on an explicitly marked V3 staging page.
- Keep the current legacy footer assets installed.
- Verify the Home V3 video popup, accordion, marquee, Home anchor navigation,
  case studies, dynamic year, and dependency deduplication.
- Verify representative V1, V2, and V2L pages remain unchanged.

### Phase D — Legacy gateway pilot

- Finish explicit V2 marking or route-registry coverage.
- Make every legacy module safe when loaded after DOM readiness.
- Run the complete V1/V2/V2L interaction matrix with
  `legacyPolicy: "gateway"` on staging.
- Pilot one low-risk route with a pinned rollback release.

### Phase E — Footer cutover

- Replace version-owned global scripts with the pinned PVG loader.
- Keep Consent Pro and approved universal analytics infrastructure global.
- Remove a legacy asset only after its gateway-owned replacement has passed
  representative-page regression.

### Phase F — Variable collection rename

- Resolve `Button Style-2` ownership and the remaining V1 alias defects.
- Split mixed Pre-V3 styles into version-owned modules.
- Introduce compatibility aliases.
- Rename collections to their approved V1, V2, and V3 namespaces in a
  reversible pilot.
- Complete representative V1/V2/V2L/V3 validation before widening the rename.

## Current acceptance criteria

- [x] V1 marker resolves to V1.
- [x] V2 marker resolves to V2.
- [x] V2L marker resolves to V2L with V2 family ownership.
- [x] V3 marker resolves to V3.
- [x] Unmarked `.page_main` is reported as unsafe inferred V2.
- [x] Conflicting markers refuse activation.
- [x] Unknown pages refuse activation.
- [x] Observation mode injects no component assets.
- [x] Legacy pages remain preserved unless `legacyPolicy: "gateway"` is explicit.
- [x] V3 video markup selects the V3 popup module.
- [x] Legacy popup markup never selects the V3 popup module.
- [x] An unlabelled V3 video opens without waiting on an unrelated consent category.
- [x] An explicitly consent-gated V3 video waits until that category is allowed.
- [x] Dependencies and component assets load at most once.
- [x] Module failure leaves authored Webflow content available.

## Integrity audit finding

The current Runtime `0.2.0` manifest contains stale SRI values for the current
Case Study and V3 Video Popup module bytes. A selector-only video change would
therefore still fail when the browser enforced integrity. PVG records the
verified hashes from the current source files and treats hash verification as a
release requirement for every module.

The V3 Video Popup module also previously treated an unlabelled video as
`personalization` content. Module `1.1.2` now treats an empty category as
intentionally ungated while continuing to wait for explicit
`data-consent-category` or `fs-consent-categories` values. It also re-reads the
Consent Pro API when a wrapped `consent-updated` event arrives, so a queued Play
action resumes immediately after the required category is accepted.

## Live observation matrix — 2026-07-29

PVG was injected only into isolated browser sessions. No page, component,
custom code, or publish state was saved.

| Surface | Live detection | Safety result | Matched plan |
| --- | --- | --- | --- |
| V1 — `/products/pxm/pim` | V1 from `.page_main.cc-v1` | Explicit and safe; observe only | Dynamic year, legacy nav, FAQ schema, legacy lazy load, Splide |
| V2 — `/resources/partner-success-stories` | Inferred V2 from untagged `.page_main` | Correctly refused activation | Dynamic year, legacy nav, legacy lazy load, pagination |
| Former V2L representative — `/` | V2 from `.page_main.cc-v2` | Explicit and safe as V2 | Dynamic year, legacy nav, legacy video, legacy lazy load, card animations, accordion |
| V3 — Webflow Home V3 | V3 from `.page_main_v3` | Explicit and safe; isolated active test passed | Dynamic year, marquee, Home anchor nav, case study, V3 video |

Every observation-only run injected zero managed component assets.

The Phase 5 Notion record classifies the production homepage as V2L with
`.cc-v2l`. The current published DOM instead contains exactly
`page_main cc-v2` and no `.cc-v2l`. PVG follows the live marker and does not
override it with the older classification. V2L detection remains implemented
and locally tested as part of the V2 family, but a current live V2L
representative is still required before V2L cutover can be cleared.

The isolated active Home V3 test loaded Video Popup `1.1.2`. Play remained
closed while `personalization` was false, then the pending action opened
automatically after consent became true. The dialog rendered as `flex` and the
iframe source became:

`https://player.vimeo.com/video/1146670446?autoplay=1&dnt=1`

## Production release boundary

This repository implementation is not authorization to publish Pattern
Production, replace the global footer, publish the Pattern Library, or rename
variable collections. Each delivery layer requires separate verification and
an explicit handoff.

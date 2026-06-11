# Webflow Footer Code Candidate

Do not paste this into production until the `v1.0.0` jsDelivr URLs have been tested on a safe Webflow page or staging environment.

Keep consent-gated vendor scripts unchanged. Replace only the listed Flowdrive support files.

## Replacement Support Assets

```html
<!-- Pattern support assets served from GitHub release v1.0.0 through jsDelivr -->
<script src="https://cdn.jsdelivr.net/gh/blackpixelca/pattern@v1.0.0/webflow/pattern.com/scripts/media/video-popup.js"></script> <!-- Video Popup JS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/blackpixelca/pattern@v1.0.0/webflow/pattern.com/styles/pagination-fix.css"> <!-- Pagination Fix CSS -->
<script src="https://cdn.jsdelivr.net/gh/blackpixelca/pattern@v1.0.0/webflow/pattern.com/scripts/nav/v1-nav-desktop.js" defer></script> <!-- v1 Nav Desktop -->
<script src="https://cdn.jsdelivr.net/gh/blackpixelca/pattern@v1.0.0/webflow/pattern.com/scripts/nav/v1-nav-mobile.js" defer></script> <!-- v1 Nav Mobile -->
<script src="https://cdn.jsdelivr.net/gh/blackpixelca/pattern@v1.0.0/webflow/pattern.com/scripts/nav/v1-nav-mobile-block.js" defer></script> <!-- v1 Nav Mobile Block -->
<script src="https://cdn.jsdelivr.net/gh/blackpixelca/pattern@v1.0.0/webflow/pattern.com/scripts/content/logos.js" defer></script> <!-- Logos JS -->
<script src="https://cdn.jsdelivr.net/gh/blackpixelca/pattern@v1.0.0/webflow/pattern.com/scripts/content/rich-text-heading-conversion.js" defer></script> <!-- Rich Text Heading Conversion -->
<script src="https://cdn.jsdelivr.net/gh/blackpixelca/pattern@v1.0.0/webflow/pattern.com/scripts/schema/faq-schema-generator.js" defer></script> <!-- FAQ Schema Generator -->
<script src="https://cdn.jsdelivr.net/gh/blackpixelca/pattern@v1.0.0/webflow/pattern.com/scripts/interaction/accordion.js" defer></script> <!-- Accordion JS -->
<script src="https://cdn.jsdelivr.net/gh/blackpixelca/pattern@v1.0.0/webflow/pattern.com/scripts/interaction/lazy-load.js" defer></script> <!-- Lazy Load -->
<script src="https://cdn.jsdelivr.net/gh/blackpixelca/pattern@v1.0.0/webflow/pattern.com/scripts/content/cta-inject.js" defer></script> <!-- CTA Inject -->
<script src="https://cdn.jsdelivr.net/gh/blackpixelca/pattern@v1.0.0/webflow/pattern.com/scripts/content/toc.js" defer></script> <!-- TOC -->
```

## Existing Vendor Scripts To Keep

```html
<!-- Autopilot SDK - gated until Marketing consent -->
<script
  type="fs-consent"
  fs-consent-categories="marketing"
  src="//cdn.bc0a.com/autopilot/f00000000324090/autopilot_sdk.js"
  defer
></script>

<!-- Splide Script -->
<script src="https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/js/splide.min.js" defer></script>

<!-- Storylane JS - gated until Analytics consent -->
<script
  type="fs-consent"
  fs-consent-categories="analytics"
  src="https://js.storylane.io/js/v2/storylane.js"
  async
></script>
```

## Validation Checklist

- Nav desktop and mobile open/close behavior.
- Mobile nav block behavior.
- Logo rendering behavior.
- Rich text heading conversion.
- FAQ schema output.
- Accordions.
- Lazy loading.
- CTA injection.
- TOC generation.
- Video popup.
- Pagination styling.

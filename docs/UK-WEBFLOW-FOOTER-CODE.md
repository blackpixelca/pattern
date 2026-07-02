# UK Webflow Footer Code Candidate

This mirrors the current `pattern-uk.webflow.io` footer support scripts into the established `blackpixelca/pattern` GitHub/jsDelivr delivery flow.

Default to the same production dependencies as the US site, pinned to `@v1.0.1`. Use `@v1.0.3` for the FAQ schema generator after that release is published. Only use UK-specific script paths when the UK site needs different behavior; content differences should live in Webflow markup.

No `fs-consent` is needed for these scripts. They support navigation, sliders, and content formatting rather than analytics or marketing.

## Source Mapping

| Purpose | Current UK URL | Repo Path | Bytes | SHA-256 |
| --- | --- | --- | ---: | --- |
| Nav Desktop | US production shared nav | `webflow/pattern.com/scripts/nav/v1-nav-desktop.js` | 6249 | `2160e8ed6d21517a3d4ce7fbf7cec90db60e6502ee67371c60b701d58c732899` |
| Nav Mobile | US production shared nav | `webflow/pattern.com/scripts/nav/v1-nav-mobile.js` | 9174 | `161c81595eaca68d55a7d2e8bf81b4c4756ad9402238ec6381b8cc75899f672b` |
| Nav Mobile Block | US production shared nav | `webflow/pattern.com/scripts/nav/v1-nav-mobile-block.js` | 1031 | `05ea4ebee568a3a68873e5b0e145476b2318e3b1cf50d0405eb945dc6efaced2` |
| Rich Text Heading Conversion | US production shared helper | `webflow/pattern.com/scripts/content/rich-text-heading-conversion.js` | 954 | `3b50622e6ba6c1c54ffdfc253fa363cc71d7eb156fb625309677e6a0254573bb` |
| FAQ Schema Generator | US production shared helper | `webflow/pattern.com/scripts/schema/faq-schema-generator.js` | 9333 | `c7c390defc566c34d015db6eb095b2aa41aaec5358d2382b1599747836cb49a5` |

Splide stays on the pinned npm/jsDelivr package.

## Production Footer Code

```html
<!-- Nav Desktop -->
<script src="https://cdn.jsdelivr.net/gh/blackpixelca/pattern@v1.0.1/webflow/pattern.com/scripts/nav/v1-nav-desktop.js" defer></script>

<!-- Nav Mobile -->
<script src="https://cdn.jsdelivr.net/gh/blackpixelca/pattern@v1.0.1/webflow/pattern.com/scripts/nav/v1-nav-mobile.js" defer></script>

<!-- Nav Mobile Block -->
<script src="https://cdn.jsdelivr.net/gh/blackpixelca/pattern@v1.0.1/webflow/pattern.com/scripts/nav/v1-nav-mobile-block.js" defer></script>

<!-- Splide Script -->
<script src="https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/js/splide.min.js" defer></script>

<!-- Rich Text Heading Conversion -->
<script src="https://cdn.jsdelivr.net/gh/blackpixelca/pattern@v1.0.1/webflow/pattern.com/scripts/content/rich-text-heading-conversion.js" defer></script>

<!-- FAQ Schema -->
<script src="https://cdn.jsdelivr.net/gh/blackpixelca/pattern@v1.0.3/webflow/pattern.com/scripts/schema/faq-schema-generator.js" defer></script>

<!-- Execute Functions -->
<script>
  function runPageFunctions() {
    if (typeof pageFunctions?.executeFunctions === 'function') {
      pageFunctions.executeFunctions();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runPageFunctions);
  } else {
    runPageFunctions();
  }
</script>
```

## UK-Specific Dependencies

No UK-specific dependencies are needed in this footer block right now.

For FAQ schema, render the FAQ questions and answers on the page using either the legacy `.faq_card` structure or the Pattern Library v2 accordion/toggle structure inside an FAQ-labeled section. For a generic accordion, add `data-faq-schema="true"` or a nearby "Frequently Asked Questions" heading so the schema generator can safely identify it as FAQ content.

<script>
document.addEventListener("DOMContentLoaded", function () {
  // Wildcard selectors so this works when classes are namespaced/duplicated in Webflow libraries
  // (e.g. "pc_popup_bottom", "pc_popup_bottom is-variant", "pc_popup_bottom--v2", etc.)
  const bottomSelector = '[class*="pc_popup_bottom"]';
  const textSelector = '[class*="pc_popup_text"]';
  const maskSelector = '[class*="pc_popup_mask"]';
  const componentSelector = '[class*="pc_popup"]';

  function evaluateMask(bottom, mask) {
    if (!mask || !bottom) return;
    const maxScrollTop = bottom.scrollHeight - bottom.clientHeight;
    // Ignore tiny/fractional "overflows" caused by rounding (common in Webflow layouts)
    if (maxScrollTop <= 1) {
      mask.style.opacity = "0";
      mask.style.pointerEvents = "none";
      return;
    }
    // Use an epsilon to handle fractional layout rounding.
    // Prefer scrollTop+clientHeight>=scrollHeight; scrollTop often never equals maxScrollTop exactly.
    const epsilon = 2;
    const atBottom = bottom.scrollTop + bottom.clientHeight >= bottom.scrollHeight - epsilon;
    // Explicitly set visible state so the result doesn't depend on default CSS.
    mask.style.opacity = atBottom ? "0" : "1";
    mask.style.pointerEvents = atBottom ? "none" : "auto";
  }

  function initForComponent(component) {
    if (!component) return;
    if (component.dataset.scriptInitialized) return;
    component.dataset.scriptInitialized = "true";

    const mask = component.querySelector(maskSelector);
    if (!mask) return;

    // In the live UI, the scroll container is typically the text region.
    // Fall back to the bottom container if needed.
    const scrollEl = component.querySelector(textSelector) || component.querySelector(bottomSelector);
    if (!scrollEl) return;

    const run = () => evaluateMask(scrollEl, mask);
    scrollEl.addEventListener("scroll", run, { passive: true });
    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(run).observe(scrollEl);
    }
    run();
  }

  function initFromMask(maskEl) {
    const component = maskEl.closest(componentSelector) || maskEl.parentElement;
    initForComponent(component);
  }

  // Prefer initializing from masks to ensure correct pairing of mask + scroll container.
  document.querySelectorAll(maskSelector).forEach(initFromMask);

  // Webflow sites can inject/modify DOM after DOMContentLoaded (IX2, components, CMS).
  // Re-run once after initial paint to catch late-mounted instances.
  setTimeout(() => {
    document.querySelectorAll(maskSelector).forEach(initFromMask);
  }, 0);
});
</script>
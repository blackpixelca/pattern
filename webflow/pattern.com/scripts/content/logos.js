// Logo animation script - optimized version with flash prevention
(function () {
  // Track if protection is already set up to avoid duplicate observers
  let protectionSetup = false;

  // IMMEDIATELY inject CSS to hide 2nd and 3rd logos before any rendering
  // This prevents the flash on page load
  (function injectHideCSS() {
    const style = document.createElement('style');
    style.textContent = `
      /* Hide all logos by default except the first one in each group */
      [brand-logo]:not([brand-logo$="a"]) {
        opacity: 0 !important;
        pointer-events: none !important;
        transition: none !important;
      }
      /* Ensure first logos are visible */
      [brand-logo$="a"] {
        opacity: 1 !important;
        pointer-events: auto !important;
        transition: none !important;
      }
    `;
    // Insert at the very beginning of head, or body if head doesn't exist yet
    if (document.head) {
      document.head.insertBefore(style, document.head.firstChild);
    } else if (document.body) {
      document.body.insertBefore(style, document.body.firstChild);
    } else {
      // If neither exists, wait a tiny bit and try again
      setTimeout(injectHideCSS, 0);
      return;
    }
  })();

  // Use MutationObserver to intercept and fix style changes from old script
  // Only set up once per logo to avoid duplicate observers
  function protectLogoTransitions() {
    if (protectionSetup) return; // Already protected

    const logos = document.querySelectorAll('[brand-logo]');
    if (logos.length === 0) return;

    logos.forEach(logo => {
      // Skip if already has observer
      if (logo.dataset.observerSetup) return;
      logo.dataset.observerSetup = 'true';

      // Watch for style attribute changes
      const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const transition = logo.style.transition || '';

            // Block old script's 0.6s transitions, but allow our 0.2s linear transitions
            if (transition.includes('0.6s') || transition.includes('cubic-bezier(0.77')) {
              if (!transition.includes('0.2s') && transition !== 'none') {
                logo.style.setProperty("transition", "none", "important");
              }
            }
          }
        });
      });

      observer.observe(logo, {
        attributes: true,
        attributeFilter: ['style']
      });
    });

    protectionSetup = true;
  }

  // Initialize logo animation for all groups
  function initLogoAnimation() {
    // Protect logos from old script transitions
    protectLogoTransitions();
    // Helper for random float in [min, max]
    function randomInterval(min, max) {
      return Math.random() * (max - min) + min;
    }

    // Process 6 groups, each with logos identified by [brand-logo] attribute
    // Group 1: 1a, 1b, 1c | Group 2: 2a, 2b, 2c | ... | Group 6: 6a, 6b, 6c
    // Each group operates completely independently with its own state and timing
    // On page load: show "a" for 7-18 seconds, then cycle through a → b → c → a
    const MIN_LOGOS_TO_ROTATE_PER_GROUP = 2; // If fewer are present, freeze on first available logo
    const TRANSITION_TOTAL_MS = 400; // Total transition time: 400ms (200ms fade out + 200ms fade in)
    const TRANSITION_HALF_MS = TRANSITION_TOTAL_MS / 2; // 200ms for each half
    const TRANSITION_HALF_S = TRANSITION_HALF_MS / 1000; // 0.2 seconds
    const VISIBLE_DURATION_MIN = 7; // Minimum visible duration in seconds
    const VISIBLE_DURATION_MAX = 18; // Maximum visible duration in seconds

    for (let groupNumber = 1; groupNumber <= 6; groupNumber++) {
      // Wrap each group in an IIFE to ensure complete isolation
      (function (groupNum) {
        // Select logos for this specific group by attribute
        const children = [
          document.querySelector(`[brand-logo="${groupNum}a"]`),
          document.querySelector(`[brand-logo="${groupNum}b"]`),
          document.querySelector(`[brand-logo="${groupNum}c"]`)
        ].filter(Boolean); // Remove any null values if logo not found

        // Skip this group if no logos exist for it
        if (children.length === 0) return;
        const canRotate = children.length >= MIN_LOGOS_TO_ROTATE_PER_GROUP;

        // Initialize: Set first logo visible, others hidden
        // This function now reinforces the CSS rules and ensures correct state
        function initializeGroup() {
          children.forEach((el, index) => {
            el.style.setProperty("transition", "none", "important");

            if (index === 0) {
              // First child (Xa) starts at 100% opacity on page load
              el.style.setProperty("opacity", "1", "important");
              el.style.pointerEvents = "auto";
            } else {
              // Other children (Xb, Xc) start at 0% opacity
              // Apply immediately and synchronously to prevent flash
              el.style.setProperty("opacity", "0", "important");
              el.style.pointerEvents = "none";
            }
          });
          children[0].offsetHeight; // Force reflow
        }

        // Initialize group state immediately
        initializeGroup();
        // If there aren't enough logos for the intended rotation, freeze this group.
        if (!canRotate) return;

        // Track current visible logo index for THIS group only
        // Sequence: a (index 0) → b (index 1) → c (index 2) → a (index 0) → ...
        let currentIndex = 0;

        // This function operates only on THIS group's logos
        // Cycles through: a → b → c → a (loops back)
        function cycleToNext() {
          const currentLogo = children[currentIndex];
          // Move to next logo (cycle: a → b → c → a → ...)
          currentIndex = (currentIndex + 1) % children.length;
          const nextLogo = children[currentIndex];

          // Calculate visible duration BEFORE transition starts to ensure consistency
          const visibleDuration = randomInterval(VISIBLE_DURATION_MIN, VISIBLE_DURATION_MAX);

          // Ensure all logos are in correct state before transition
          children.forEach((el) => {
            el.style.setProperty("transition", "none", "important");
            if (el === currentLogo) {
              // Current logo (about to fade out) - ensure it's at 100%
              el.style.setProperty("opacity", "1", "important");
              el.style.pointerEvents = "auto";
            } else {
              // All others at 0%
              el.style.setProperty("opacity", "0", "important");
              el.style.pointerEvents = "none";
            }
          });

          // Force reflow
          currentLogo.offsetHeight;

          // Step 1: Fade out current logo (200ms linear) - part 1 of 400ms total transition
          currentLogo.style.setProperty("transition", `opacity ${TRANSITION_HALF_S}s linear`, "important");
          currentLogo.style.setProperty("opacity", "0", "important");
          currentLogo.style.pointerEvents = "none";

          // Step 2: After fade-out completes (200ms), fade in next logo (200ms)
          setTimeout(() => {
            // Lock current logo at 0%
            currentLogo.style.setProperty("transition", "none", "important");
            currentLogo.style.setProperty("opacity", "0", "important");

            // Fade in next logo (200ms linear) - part 2 of 400ms total transition
            nextLogo.offsetHeight; // Force reflow
            nextLogo.style.setProperty("transition", `opacity ${TRANSITION_HALF_S}s linear`, "important");
            nextLogo.style.setProperty("opacity", "1", "important");
            nextLogo.style.pointerEvents = "auto";

            // Step 3: After fade-in completes (200ms), lock final state and start visible duration timer
            setTimeout(() => {
              nextLogo.style.setProperty("transition", "none", "important");
              nextLogo.style.setProperty("opacity", "1", "important");

              // Ensure all others remain hidden
              children.forEach((el) => {
                if (el !== nextLogo) {
                  el.style.setProperty("opacity", "0", "important");
                  el.style.pointerEvents = "none";
                }
              });

              // Logo is now at 100% opacity - start visible duration timer (7-18 seconds)
              // Timer starts AFTER fade-in completes, ensuring full visible duration
              setTimeout(() => {
                cycleToNext();
              }, visibleDuration * 1000);
            }, TRANSITION_HALF_MS);
          }, TRANSITION_HALF_MS);
        }

        // Start cycling after initial visible duration (7-18 seconds)
        // On page load, "a" shows first, then stays for 7-18 seconds before transitioning to "b"
        // Each group starts independently with its own random timing
        const initialVisibleDuration = randomInterval(VISIBLE_DURATION_MIN, VISIBLE_DURATION_MAX);
        setTimeout(() => {
          cycleToNext();
        }, initialVisibleDuration * 1000);
      })(groupNumber); // Immediately invoke with the current group number
    }
  }

  // Lightweight monitor to catch any old script interference (reduced frequency)
  function monitorAndFix() {
    const logos = document.querySelectorAll('[brand-logo]');
    logos.forEach(logo => {
      const transition = logo.style.transition || '';

      // Only fix if it's the old 0.6s transition - don't touch our 0.2s transitions
      if ((transition.includes('0.6s') || transition.includes('cubic-bezier(0.77')) &&
        !transition.includes('0.2s') && transition !== 'none') {
        logo.style.setProperty("transition", "none", "important");
      }
    });
  }

  // Initialize animation system
  function initialize() {
    protectLogoTransitions();
    initLogoAnimation();
  }

  // Initialize when DOM is ready, but also try immediately
  // Use requestAnimationFrame to ensure it happens before paint
  function runInit() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initialize);
    } else {
      // DOM is ready, but use requestAnimationFrame to ensure it happens before paint
      requestAnimationFrame(initialize);
    }
  }

  // Try to initialize immediately
  runInit();

  // Light monitoring for old script interference (reduced to 200ms)
  setInterval(monitorAndFix, 200);
})();

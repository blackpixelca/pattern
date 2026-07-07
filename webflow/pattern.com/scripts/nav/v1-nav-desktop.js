pageFunctions.addFunction('navDesktop', function () {
  gsap.matchMedia().add("(min-width: 992px)", () => {
    // Cache DOM elements
    const navWrap = document.querySelectorAll('.nav_menu_contain, .nav_panels');
    const navWrapTarget = document.querySelector('.nav_wrap');
    const navBottom = document.querySelector('.nav_bottom');
    const navOverlay = document.querySelector('.nav_overlay');
    const desktopNavLinks = document.querySelectorAll('.nav_bottom [linkName]');
    const desktopNavWrapper = document.querySelector('.nav_bottom');

    // ============================================
    // TIMING - adjust these to control speed
    // ============================================
    const OVERLAY_DURATION = 0.4;
    const DROPDOWN_DURATION = 0.4;

    // Store references for cleanup
    const listeners = [];
    const timelines = [];

    function addListener(el, event, handler, options) {
      el.addEventListener(event, handler, options);
      listeners.push({ el, event, handler, options });
    }

    // ============================================
    // NAV OVERLAY FUNCTIONALITY
    // ============================================
    if (navWrap.length > 0 && navWrapTarget && navOverlay) {
      navWrap.forEach(element => {
        addListener(element, 'mouseenter', () => {
          gsap.to(navOverlay, {
            visibility: 'visible',
            opacity: 1,
            duration: OVERLAY_DURATION,
            ease: 'power2.out'
          });
        });

        addListener(element, 'mouseleave', () => {
          gsap.to(navOverlay, {
            visibility: 'hidden',
            opacity: 0,
            duration: OVERLAY_DURATION,
            ease: 'power2.out'
          });
        });
      });
    }

    // ============================================
    // DROPDOWN MENU FUNCTIONALITY (nav_bottom system)
    // ============================================
    if (desktopNavLinks.length > 0 && desktopNavWrapper) {
      let desktopCurrentTimeline = null;

      desktopNavLinks.forEach(link => {
        const linkValue = link.getAttribute('linkName');
        const targetMenu = document.querySelector(`[menuName="${linkValue}"]`);
        const linkLine = link.querySelector('.nav_underline');

        if (targetMenu) {
          const desktopTl = gsap.timeline({ paused: true });
          timelines.push(desktopTl);

          desktopTl.set(targetMenu, {
            display: 'flex'
          })
            .fromTo(targetMenu, {
              opacity: 0,
              pointerEvents: 'none'
            }, {
              opacity: 1,
              pointerEvents: 'auto',
              duration: DROPDOWN_DURATION,
              ease: 'power2.out'
            })
          if (linkLine) {
            desktopTl.fromTo(linkLine, {
              width: '0%'
            }, {
              width: '100%',
              duration: DROPDOWN_DURATION,
              ease: 'power2.out'
            }, '<');
          }

          addListener(link, 'mouseenter', () => {
            if (desktopCurrentTimeline && desktopCurrentTimeline !== desktopTl) {
              desktopCurrentTimeline.reverse();
            }
            desktopCurrentTimeline = desktopTl;
            desktopTl.play();
          });

          addListener(targetMenu, 'mouseenter', () => {
            desktopCurrentTimeline = desktopTl;
          });
        }
      });

      addListener(desktopNavWrapper, 'mouseleave', () => {
        if (desktopCurrentTimeline) {
          desktopCurrentTimeline.progress(0).pause();
          desktopCurrentTimeline = null;
        }
      });
    }

    // ============================================
    // CLEANUP
    // ============================================
    return () => {
      listeners.forEach(({ el, event, handler, options }) => {
        el.removeEventListener(event, handler, options);
      });

      timelines.forEach(tl => {
        tl.progress(0).pause().kill();
      });

      if (navWrapTarget) {
        gsap.killTweensOf(navWrapTarget);
        gsap.set(navWrapTarget, { clearProps: 'backgroundColor' });
      }
      if (navBottom) {
        gsap.killTweensOf(navBottom);
        gsap.set(navBottom, { clearProps: 'webkitTextFillColor' });
      }
      if (navOverlay) {
        gsap.killTweensOf(navOverlay);
        gsap.set(navOverlay, { clearProps: 'visibility,opacity' });
      }

      document.querySelectorAll('[menuName]').forEach(menu => {
        gsap.killTweensOf(menu);
        gsap.set(menu, { clearProps: 'all' });
      });
      document.querySelectorAll('.nav_underline').forEach(line => {
        gsap.set(line, { clearProps: 'width' });
      });
    };
  });
});

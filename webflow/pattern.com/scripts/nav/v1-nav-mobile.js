pageFunctions.addFunction('navMobile', function () {
  gsap.matchMedia().add("(max-width: 991px)", () => {
    // Store references for cleanup
    const listeners = [];
    const timelines = [];

    function addListener(el, event, handler, options) {
      el.addEventListener(event, handler, options);
      listeners.push({ el, event, handler, options });
    }

    function addActivationListener(el, handler) {
      const activationEvent = window.PointerEvent ? 'pointerup' : 'click';

      if (!el.hasAttribute('role')) {
        el.setAttribute('role', 'button');
      }
      if (!el.hasAttribute('tabindex')) {
        el.setAttribute('tabindex', '0');
      }

      addListener(el, activationEvent, handler);
      addListener(el, 'keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        handler(e);
      });
    }

    // ============================================
    // MOBILE DROPDOWN FUNCTIONALITY (nav_bottom system)
    // ============================================
    const mobileNavLinks = document.querySelectorAll('.nav_bottom [linkName]');
    const mobileNavWrapper = document.querySelector('.nav_bottom');

    if (mobileNavLinks.length > 0 && mobileNavWrapper) {
      let mobileCurrentTimeline = null;
      let currentOpenLink = null;
      let currentOpenIcon = null;
      let currentOpenMenu = null;
      const linkStates = new Map();

      const closeCurrentDropdown = () => {
        if (mobileCurrentTimeline) {
          mobileCurrentTimeline.progress(0).pause();
          mobileCurrentTimeline = null;
        }
        if (currentOpenIcon) {
          gsap.to(currentOpenIcon, {
            rotation: 0,
            duration: 0.3,
            ease: 'power2.out'
          });
          currentOpenIcon = null;
        }
        if (currentOpenMenu) {
          gsap.set(currentOpenMenu, { height: 0 });
          currentOpenMenu = null;
        }
        if (currentOpenLink) {
          currentOpenLink.setAttribute('aria-expanded', 'false');
          linkStates.set(currentOpenLink, false);
          currentOpenLink = null;
        }
      };

      mobileNavLinks.forEach(link => {
        const linkValue = link.getAttribute('linkName');
        const targetMenu = document.querySelector(`[menuDropdown="${linkValue}"]`);
        const targetPanel = targetMenu?.querySelector('.nav_panel_contain');
        const linkIcon = link.querySelector('.nav_link_icon');

        linkStates.set(link, false);
        link.setAttribute('aria-expanded', 'false');

        if (targetMenu && targetPanel) {
          const mobileTl = gsap.timeline({ paused: true });
          timelines.push(mobileTl);

          mobileTl.set(targetMenu, {
            height: 'auto'
          })
            .fromTo(targetMenu, {
              height: 0
            }, {
              height: 'auto',
              duration: 0.001,
              ease: 'power2.out'
            })
            .fromTo(targetPanel, {
              y: '-1rem'
            }, {
              y: 0,
              duration: 0.4,
              ease: 'power2.out'
            }, '<')
            .to(linkIcon, {
              rotation: 180,
              duration: 0.3,
              ease: 'power2.out'
            }, '<');

          addActivationListener(link, (e) => {
            if (e.cancelable) {
              e.preventDefault();
            }
            e.stopPropagation();

            const isOpen = linkStates.get(link);

            if (isOpen && currentOpenLink === link) {
              closeCurrentDropdown();
              return;
            }

            if (mobileCurrentTimeline) {
              if (mobileCurrentTimeline !== mobileTl) {
                closeCurrentDropdown();
              } else {
                mobileCurrentTimeline.progress(0).pause();
              }
            }

            mobileTl.progress(0);

            mobileCurrentTimeline = mobileTl;
            currentOpenLink = link;
            currentOpenIcon = linkIcon;
            currentOpenMenu = targetMenu;
            linkStates.set(link, true);
            link.setAttribute('aria-expanded', 'true');
            mobileTl.play();
          });
        }
      });

      const handleOutsideClick = (e) => {
        if (e.target.closest('[linkName]') || mobileNavWrapper.contains(e.target)) {
          return;
        }
        if (mobileCurrentTimeline) {
          closeCurrentDropdown();
        }
      };

      addListener(document, 'click', handleOutsideClick, false);

      addListener(mobileNavWrapper, 'click', (e) => {
        const clickedLink = e.target.closest('[linkName]');
        if (!clickedLink && mobileCurrentTimeline) {
          closeCurrentDropdown();
        }
      });
    }

    // ============================================
    // CLEANUP — runs when breakpoint no longer matches
    // ============================================
    return () => {
      // Remove all event listeners
      listeners.forEach(({ el, event, handler, options }) => {
        el.removeEventListener(event, handler, options);
      });

      // Kill all timelines
      timelines.forEach(tl => {
        tl.progress(0).pause().kill();
      });

      // Clear inline styles from dropdown elements
      document.querySelectorAll('[menuDropdown]').forEach(menu => {
        gsap.killTweensOf(menu);
        gsap.set(menu, { clearProps: 'all' });
      });
      document.querySelectorAll('.nav_panel_contain').forEach(panel => {
        gsap.set(panel, { clearProps: 'y' });
      });
      document.querySelectorAll('.nav_link_icon').forEach(icon => {
        gsap.set(icon, { clearProps: 'rotation' });
      });

      // Clear mobile nav accessibility attributes
      document.querySelectorAll('.nav_bottom [linkName]').forEach(link => {
        link.removeAttribute('role');
        link.removeAttribute('tabindex');
        link.removeAttribute('aria-expanded');
      });
    };
  });
});

pageFunctions.addFunction('navMobile', function () {
  gsap.matchMedia().add("(max-width: 991px)", () => {
    // Store references for cleanup
    const listeners = [];
    const timelines = [];

    function addListener(el, event, handler, options) {
      el.addEventListener(event, handler, options);
      listeners.push({ el, event, handler, options });
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

          addListener(link, 'click', (e) => {
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
    // MOBILE NAVIGATION MENU (navbar_wrap system - legacy)
    // ============================================
    const burger = document.querySelector('.navbar_burger');
    const navLinks = document.querySelector('.navbar_links');
    const panelBkg = document.querySelector('.navbar_panel_bkg');
    const navMenus = document.querySelectorAll('.navbar_menu');
    const dropdownLinks = document.querySelectorAll('.navbar_wrap [linkName]');

    if (burger && navLinks && panelBkg && navMenus.length > 0) {
      let currentTimeline = null;

      const tl = gsap.timeline({ paused: true });
      timelines.push(tl);

      gsap.set(navLinks, { display: 'none' });
      gsap.set(panelBkg, { opacity: 0 });
      gsap.set(navMenus, { x: '100%' });

      tl.to(navLinks, {
        display: 'flex',
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out'
      });
      tl.to(panelBkg, {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out'
      }, "<");

      addListener(burger, 'click', () => {
        if (tl.reversed() || tl.paused()) {
          tl.play();
        } else {
          tl.reverse();

          if (currentTimeline) {
            currentTimeline.reverse();
            currentTimeline = null;
          }

          gsap.to(navMenus, {
            x: '100%',
            duration: 0.3,
            ease: 'power2.out'
          });
        }
      });

      let currentOpenDropdownLink = null;
      const dropdownLinkStates = new Map();

      const closeCurrentDropdownMenu = () => {
        if (currentTimeline) {
          currentTimeline.progress(0).pause();
          currentTimeline = null;
        }
        if (currentOpenDropdownLink) {
          const prevLinkValue = currentOpenDropdownLink.getAttribute('linkName');
          const prevTargetMenu = document.querySelector(`[menuName="${prevLinkValue}"]`);
          if (prevTargetMenu) {
            gsap.set(prevTargetMenu, { x: '100%', opacity: 0 });
          }
          dropdownLinkStates.set(currentOpenDropdownLink, false);
          currentOpenDropdownLink = null;
        }
      };

      dropdownLinks.forEach(link => {
        const linkValue = link.getAttribute('linkName');
        const targetMenu = document.querySelector(`[menuName="${linkValue}"]`);

        dropdownLinkStates.set(link, false);

        if (targetMenu) {
          const dropdownTl = gsap.timeline({ paused: true });
          timelines.push(dropdownTl);

          dropdownTl.to(targetMenu, {
            x: '0%',
            duration: 0.3,
            opacity: 1,
            ease: 'power2.out'
          });
          dropdownTl.to('.navbar_links', {
            opacity: 0,
            duration: 0.3,
            ease: 'power2.out'
          }, "<");

          addListener(link, 'click', (e) => {
            e.stopPropagation();

            const isOpen = dropdownLinkStates.get(link);

            if (isOpen && currentOpenDropdownLink === link) {
              closeCurrentDropdownMenu();
              return;
            }

            if (currentTimeline) {
              if (currentTimeline !== dropdownTl) {
                closeCurrentDropdownMenu();
              } else {
                currentTimeline.progress(0).pause();
              }
            }

            dropdownTl.progress(0);

            currentTimeline = dropdownTl;
            currentOpenDropdownLink = link;
            dropdownLinkStates.set(link, true);
            dropdownTl.play();
          });

          const backButton = targetMenu.querySelector('.navbar_back');
          if (backButton) {
            addListener(backButton, 'click', () => {
              closeCurrentDropdownMenu();
            });
          }
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

      // Clear legacy nav inline styles
      const navLinks = document.querySelector('.navbar_links');
      const panelBkg = document.querySelector('.navbar_panel_bkg');
      const navMenus = document.querySelectorAll('.navbar_menu');
      if (navLinks) gsap.set(navLinks, { clearProps: 'all' });
      if (panelBkg) gsap.set(panelBkg, { clearProps: 'all' });
      navMenus.forEach(menu => gsap.set(menu, { clearProps: 'all' }));
    };
  });
});

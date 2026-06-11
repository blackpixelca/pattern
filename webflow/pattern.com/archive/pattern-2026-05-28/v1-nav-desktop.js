pageFunctions.addFunction('navDesktop', function() {
    gsap.matchMedia().add("(min-width: 992px)", () => {
        // Cache DOM elements
        const navWrap = document.querySelectorAll('.nav_menu_contain, .nav_panels');
        const navWrapTarget = document.querySelector('.nav_wrap');
        const navOverlay = document.querySelector('.nav_overlay');
        const heroSection = document.querySelector('.section_hero_wrap') 
            || document.querySelector('section[class*="home_hero_wrap"]');
        const desktopNavLinks = document.querySelectorAll('.nav_bottom [linkName]');
        const desktopNavWrapper = document.querySelector('.nav_bottom');

        // Scrolled / hover state colors (from CSS variables)
        const rootStyles = getComputedStyle(document.documentElement);
        const LIGHT_BG = rootStyles.getPropertyValue('--_swatches---light--light').trim() || 'whitesmoke';
        const DARK_TEXT = rootStyles.getPropertyValue('--_swatches---dark--dark').trim() || '#090a0f';

        // State
        let hasScrolled = false;

        // Store references for cleanup
        const listeners = [];
        const timelines = [];

        function addListener(el, event, handler, options) {
            el.addEventListener(event, handler, options);
            listeners.push({ el, event, handler, options });
        }

        // ============================================
        // HELPER FUNCTIONS
        // ============================================
        function isHomePage() {
            const pathname = window.location.pathname;
            return pathname === '/' || pathname === '/index.html' || pathname === '';
        }

        function isAtTopOfHomePage() {
            if (!isHomePage() || !heroSection) return false;
            const heroRect = heroSection.getBoundingClientRect();
            return heroRect.bottom >= window.innerHeight * 0.5;
        }

        // Apply the scrolled/hover state (light bg, dark text)
        function applyScrolledState(duration) {
            if (!navWrapTarget) return;
            gsap.to(navWrapTarget, {
                backgroundColor: LIGHT_BG,
                webkitTextFillColor: DARK_TEXT,
                duration: duration,
                ease: 'power2.out',
                overwrite: true
            });
        }

        // Revert to the CSS default (clear all inline overrides, let Webflow variant take over)
        function applyDefaultState(duration) {
            if (!navWrapTarget) return;
            if (duration <= 0) {
                gsap.killTweensOf(navWrapTarget);
                gsap.set(navWrapTarget, { clearProps: 'backgroundColor,webkitTextFillColor' });
            } else {
                // Animate to transparent bg and white text, then clear props at the end
                gsap.to(navWrapTarget, {
                    backgroundColor: 'transparent',
                    webkitTextFillColor: getComputedStyle(navWrapTarget).getPropertyValue('--_theme---text').trim() || 'white',
                    duration: duration,
                    ease: 'power2.out',
                    overwrite: true,
                    onComplete: () => {
                        gsap.set(navWrapTarget, { clearProps: 'backgroundColor,webkitTextFillColor' });
                    }
                });
            }
        }

        // ============================================
        // SCROLL-BASED NAV STATE
        // ============================================
        if (navWrapTarget) {
            const handleScroll = () => {
                const atTop = isAtTopOfHomePage();
                const wasScrolled = hasScrolled;
                hasScrolled = !atTop;

                if (wasScrolled !== hasScrolled) {
                    if (hasScrolled) {
                        applyScrolledState(0.3);
                    } else {
                        applyDefaultState(0.3);
                    }
                }
            };

            addListener(window, 'scroll', handleScroll, { passive: true });

            // Set initial state — no inline styles needed, Webflow variant handles it
        }

        // ============================================
        // NAV OVERLAY FUNCTIONALITY
        // ============================================
        if (navWrap.length > 0 && navWrapTarget && navOverlay) {
            navWrap.forEach(element => {
                addListener(element, 'mouseenter', () => {
                    applyScrolledState(0.3);

                    gsap.to(navOverlay, {
                        visibility: 'visible',
                        opacity: 1,
                        duration: 0.3,
                        ease: 'power2.out'
                    });
                });

                addListener(element, 'mouseleave', () => {
                    if (isAtTopOfHomePage() && !hasScrolled) {
                        applyDefaultState(0.3);
                    } else {
                        applyScrolledState(0.3);
                    }

                    gsap.to(navOverlay, {
                        visibility: 'hidden',
                        opacity: 0,
                        duration: 0.3,
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
                        duration: 0.3,
                        ease: 'power2.out'
                    })
                    .fromTo(linkLine, {
                        width: '0%'
                    }, {
                        width: '100%',
                        duration: 0.3,
                        ease: 'power2.out'
                    }, '<');

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
        // DROPDOWN MENU FUNCTIONALITY (navbar_wrap system - legacy)
        // ============================================
        const navWrapper = document.querySelector('.navbar_wrap');
        if (navWrapper) {
            const navLinks = document.querySelectorAll('.navbar_wrap [linkName]');
            let currentTimeline = null;

            navLinks.forEach(link => {
                const linkValue = link.getAttribute('linkName');
                const targetMenu = document.querySelector(`[menuName="${linkValue}"]`);
                const linkLine = link.querySelector('.nav_link_line');

                if (targetMenu) {
                    const tl = gsap.timeline({ paused: true });
                    timelines.push(tl);

                    tl.to(targetMenu, {
                        display: 'flex',
                        duration: 0.3,
                        opacity: 1,
                        ease: 'power2.out'
                    })
                    .to(linkLine, {
                        width: '80%',
                        duration: 0.3,
                        ease: 'power2.out'
                    }, '<');

                    addListener(link, 'mouseenter', () => {
                        if (currentTimeline && currentTimeline !== tl) {
                            currentTimeline.reverse();
                        }
                        currentTimeline = tl;
                        tl.play();
                    });

                    addListener(targetMenu, 'mouseenter', () => {
                        currentTimeline = tl;
                    });
                }
            });

            addListener(navWrapper, 'mouseleave', () => {
                if (currentTimeline) {
                    currentTimeline.reverse();
                    currentTimeline = null;
                }
            });
        }

        // ============================================
        // CLEANUP — runs when breakpoint no longer matches
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
                gsap.set(navWrapTarget, { clearProps: 'backgroundColor,webkitTextFillColor' });
            }
            if (navOverlay) {
                gsap.killTweensOf(navOverlay);
                gsap.set(navOverlay, { clearProps: 'visibility,opacity' });
            }

            document.querySelectorAll('[menuName]').forEach(menu => {
                gsap.killTweensOf(menu);
                gsap.set(menu, { clearProps: 'all' });
            });
            document.querySelectorAll('.nav_underline, .nav_link_line').forEach(line => {
                gsap.set(line, { clearProps: 'width' });
            });
        };
    });
});

// Complete Navigation Script (No pageFunctions needed)
function initializeNavigation() {
    // Check if GSAP is available
    if (typeof gsap === 'undefined') {
        console.warn('GSAP not yet loaded, waiting...');
        // Retry after a short delay
        setTimeout(initializeNavigation, 100);
        return;
    }

    // Detect script source and log
    const currentScript = document.currentScript;
    const isExternalScript = currentScript && currentScript.src && currentScript.src.includes('github');
    const isWebflowLocal = currentScript && (!currentScript.src || currentScript.src.includes('webflow'));
    
    if (isExternalScript) {
        console.log('🚀 Navigation: Using external GitHub script');
    } else if (isWebflowLocal) {
        console.log('🏠 Navigation: Using local Webflow fallback');
    } else {
        console.log('📄 Navigation: Using inline script');
    }

    // Desktop Navigation (min-width: 992px)
    gsap.matchMedia().add("(min-width: 992px)", () => {
        // Navigation Dropdown Logic
        const desktopNavLinks = document.querySelectorAll('[linkName]');
        let desktopCurrentTimeline = null;
        const desktopNavWrapper = document.querySelector('.nav_bottom');
        
        if (desktopNavWrapper) {
            desktopNavLinks.forEach(link => {
                const linkValue = link.getAttribute('linkName');
                const targetMenu = document.querySelector(`[menuName="${linkValue}"]`);
                const linkLine = link.querySelector('.nav_underline');
                
                if (targetMenu) {
                    const desktopTl = gsap.timeline({ paused: true });
                    
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

                    link.addEventListener('mouseenter', () => {
                        if (desktopCurrentTimeline && desktopCurrentTimeline !== desktopTl) {
                            desktopCurrentTimeline.reverse();
                        }
                        desktopCurrentTimeline = desktopTl;
                        desktopTl.play();
                    });

                    targetMenu.addEventListener('mouseenter', () => {
                        desktopCurrentTimeline = desktopTl;
                    });
                }
            });

            desktopNavWrapper.addEventListener('mouseleave', () => {
                if (desktopCurrentTimeline) {
                    desktopCurrentTimeline.progress(0).pause();
                    desktopCurrentTimeline = null;
                }
            });
        }

        // Navigation Overlay Logic
        const navWrap = document.querySelectorAll('.nav_menu_contain, .nav_panels');
        const navWrapTarget = document.querySelector('.nav_wrap');
        const navOverlay = document.querySelector('.nav_overlay');
        
        if (navWrapTarget && navOverlay) {
            let navHoverTl = gsap.timeline({ paused: true });
            
            navHoverTl
                .set(navOverlay, {
                    visibility: 'hidden',
                    opacity: 0
                })
                .to(navOverlay, {
                    visibility: 'visible',
                    opacity: 1,
                    duration: 0.3,
                    ease: 'power2.out'
                })
                .to(navWrapTarget, {
                    backgroundColor: 'white',
                    color: '#5B5D61',
                    duration: 0.3,
                    ease: 'power2.out'
                }, '<');

            navWrap.forEach(element => {
                element.addEventListener('mouseenter', () => {
                    navHoverTl.play();
                });

                element.addEventListener('mouseleave', () => {
                    navHoverTl.reverse();
                });
            });
        }
    });

    // Mobile Navigation (max-width: 991px)
    gsap.matchMedia().add("(max-width: 991px)", () => {
        const mobileNavLinks = document.querySelectorAll('[linkName]');
        let mobileCurrentTimeline = null;
        const mobileNavWrapper = document.querySelector('.nav_bottom');
        
        if (mobileNavWrapper) {
            mobileNavLinks.forEach(link => {
                const linkValue = link.getAttribute('linkName');
                const targetMenu = document.querySelector(`[menuDropdown="${linkValue}"]`);
                const targetPanel = targetMenu?.querySelector('.nav_panel_contain');
                const linkIcon = link.querySelector('.nav_link_icon');
                let isOpen = false;
                
                if (targetMenu && targetPanel) {
                    const mobileTl = gsap.timeline({ paused: true });
                    
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

                    link.addEventListener('click', () => {
                        if (mobileCurrentTimeline && mobileCurrentTimeline !== mobileTl) {
                            mobileCurrentTimeline.reverse();
                        }
                        
                        if (!isOpen) {
                            mobileCurrentTimeline = mobileTl;
                            mobileTl.play();
                            isOpen = true;
                        } else {
                            mobileTl.reverse();
                            isOpen = false;
                        }
                    });
                }
            });

            mobileNavWrapper.addEventListener('click', (e) => {
                if (e.target === mobileNavWrapper && mobileCurrentTimeline) {
                    mobileCurrentTimeline.progress(0).pause();
                    mobileCurrentTimeline = null;
                }
            });
        }
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeNavigation);

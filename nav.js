<script>
pageFunctions.addFunction('nav2', function() {
    // Cache DOM elements once
    const navWrapper = document.querySelector('.nav_bottom');
    const allNavLinks = document.querySelectorAll('[linkName]');
    
    // Debounce function for performance
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Desktop navigation
    gsap.matchMedia().add("(min-width: 992px)", () => {
        let desktopCurrentTimeline = null;
        const desktopNavData = new Map(); // Cache for better performance
        
        // Pre-cache all desktop navigation data
        allNavLinks.forEach(link => {
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

                desktopNavData.set(link, { timeline: desktopTl, targetMenu });
            }
        });

        // Optimized event handlers with debouncing
        const handleDesktopMouseEnter = debounce((link) => {
            const navData = desktopNavData.get(link);
            if (!navData) return;
            
            if (desktopCurrentTimeline && desktopCurrentTimeline !== navData.timeline) {
                desktopCurrentTimeline.reverse();
            }
            desktopCurrentTimeline = navData.timeline;
            navData.timeline.play();
        }, 16); // ~60fps

        const handleDesktopMouseLeave = debounce(() => {
            if (desktopCurrentTimeline) {
                desktopCurrentTimeline.progress(0).pause();
                desktopCurrentTimeline = null;
            }
        }, 16);

        // Add event listeners
        allNavLinks.forEach(link => {
            const navData = desktopNavData.get(link);
            if (navData) {
                link.addEventListener('mouseenter', () => handleDesktopMouseEnter(link));
                navData.targetMenu.addEventListener('mouseenter', () => {
                    desktopCurrentTimeline = navData.timeline;
                });
            }
        });

        navWrapper.addEventListener('mouseleave', handleDesktopMouseLeave);
    });

    // Mobile navigation
    gsap.matchMedia().add("(max-width: 991px)", () => {
        let mobileCurrentTimeline = null;
        const mobileNavData = new Map(); // Cache for better performance
        
        // Pre-cache all mobile navigation data
        allNavLinks.forEach(link => {
            const linkValue = link.getAttribute('linkName');
            const targetMenu = document.querySelector(`[menuDropdown="${linkValue}"]`);
            const targetPanel = targetMenu?.querySelector('.nav_panel_contain');
            const linkIcon = link.querySelector('.nav_link_icon');
            
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

                mobileNavData.set(link, { 
                    timeline: mobileTl, 
                    isOpen: false 
                });
            }
        });

        // Optimized click handler
        const handleMobileClick = (link) => {
            const navData = mobileNavData.get(link);
            if (!navData) return;
            
            if (mobileCurrentTimeline && mobileCurrentTimeline !== navData.timeline) {
                mobileCurrentTimeline.reverse();
            }
            
            if (!navData.isOpen) {
                mobileCurrentTimeline = navData.timeline;
                navData.timeline.play();
                navData.isOpen = true;
            } else {
                navData.timeline.reverse();
                navData.isOpen = false;
            }
        };

        // Add event listeners
        allNavLinks.forEach(link => {
            if (mobileNavData.has(link)) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    handleMobileClick(link);
                });
            }
        });

        navWrapper.addEventListener('click', (e) => {
            if (e.target === navWrapper && mobileCurrentTimeline) {
                mobileCurrentTimeline.progress(0).pause();
                mobileCurrentTimeline = null;
            }
        });
    });
});
</script>
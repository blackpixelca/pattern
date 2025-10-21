<script>
pageFunctions.addFunction('nav2overlay', function() {
    gsap.matchMedia().add("(min-width: 992px)", () => {
        // Cache DOM elements once for better performance
        const navWrap = document.querySelectorAll('.nav_menu_contain, .nav_panels');
        const navWrapTarget = document.querySelector('.nav_wrap');
        const navOverlay = document.querySelector('.nav_overlay');
        
        // Early return if required elements don't exist
        if (!navWrapTarget || !navOverlay || navWrap.length === 0) {
            console.warn('nav2overlay: Required elements not found');
            return;
        }
        
        // Create timeline with optimized settings
        let navHoverTl = gsap.timeline({ 
            paused: true,
            defaults: { ease: 'power2.out' } // Set default ease for all animations
        });
        
        // Optimize timeline creation
        navHoverTl
            .set(navOverlay, {
                visibility: 'hidden',
                opacity: 0
            })
            .to(navOverlay, {
                visibility: 'visible',
                opacity: 1,
                duration: 0.3
            })
            .to(navWrapTarget, {
                backgroundColor: 'white',
                color: '#5B5D61',
                duration: 0.3
            }, '<');

        // Debounce function for performance optimization
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

        // Optimized event handlers with debouncing
        const handleMouseEnter = debounce(() => {
            navHoverTl.play();
        }, 16); // ~60fps debounce

        const handleMouseLeave = debounce(() => {
            navHoverTl.reverse();
        }, 16);

        // Use event delegation for better performance
        const navContainer = navWrapTarget.closest('.nav_wrap') || document.body;
        
        // Add event listeners with optimized handlers
        navWrap.forEach(element => {
            element.addEventListener('mouseenter', handleMouseEnter, { passive: true });
            element.addEventListener('mouseleave', handleMouseLeave, { passive: true });
        });

        // Add cleanup function for memory management
        return function cleanup() {
            navWrap.forEach(element => {
                element.removeEventListener('mouseenter', handleMouseEnter);
                element.removeEventListener('mouseleave', handleMouseLeave);
            });
        };
    });
});
</script>

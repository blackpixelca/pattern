pageFunctions.addFunction('disableMobileNavClose', function() {
    // Only apply on mobile breakpoint
    gsap.matchMedia().add("(max-width: 991px)", () => {
        const navOverlay = document.querySelector('.w-nav-overlay');
        const navButton = document.querySelector('.w-nav-button');
        
        if (navOverlay && navButton) {
            // Prevent overlay click from closing the menu
            navOverlay.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }, true); // Use capture phase to intercept early
            
            // Also prevent any click events on the overlay
            navOverlay.style.pointerEvents = 'none';
            
            // Re-enable pointer events on the menu itself so links still work
            const navMenu = document.querySelector('.w-nav-menu');
            if (navMenu) {
                navMenu.style.pointerEvents = 'auto';
            }
        }
    });
});
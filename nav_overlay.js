 <script>
pageFunctions.addFunction('nav2overlay', function() {
    gsap.matchMedia().add("(min-width: 992px)", () => {
        const navWrap = document.querySelectorAll('.nav_menu_contain, .nav_panels');
        const navWrapTarget = document.querySelector('.nav_wrap');
        const navOverlay = document.querySelector('.nav_overlay');
        
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

        // Since querySelectorAll returns NodeList, we need to loop through elements
        navWrap.forEach(element => {
            element.addEventListener('mouseenter', () => {
                navHoverTl.play();
            });

            element.addEventListener('mouseleave', () => {
                navHoverTl.reverse();
            });
        });
    });
});
</script>

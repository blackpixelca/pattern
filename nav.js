<script>
pageFunctions.addFunction('nav2', function() {
   
   gsap.matchMedia().add("(min-width: 992px)", () => {
    const desktopNavLinks = document.querySelectorAll('[linkName]');
    let desktopCurrentTimeline = null;
    const desktopNavWrapper = document.querySelector('.nav_bottom');
    
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

            // Add event listeners to both the link and its target menu
            targetMenu.addEventListener('mouseenter', () => {
                desktopCurrentTimeline = desktopTl;
            });
        }
    });

    // Only reverse animation when mouse leaves navbar wrapper
    desktopNavWrapper.addEventListener('mouseleave', () => {
        if (desktopCurrentTimeline) {
            desktopCurrentTimeline.progress(0).pause();
            desktopCurrentTimeline = null;
        }
    });
   });

   gsap.matchMedia().add("(max-width: 991px)", () => {
    const mobileNavLinks = document.querySelectorAll('[linkName]');
    let mobileCurrentTimeline = null;
    const mobileNavWrapper = document.querySelector('.nav_bottom');
    
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
   });
});
</script> 

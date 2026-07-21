(() => {
  const selectors = {
    wrap: '[class*="accordion_wrap"]',
    list: '[class*="accordion_list"]',
    card: '[class*="accordion_component"]',
    button: '[class*="accordion_toggle_button"]',
    heading: '[class*="accordion_toggle_heading"]',
    contentWrap: '[class*="accordion_content_wrap"]',
    content: '[class*="accordion_content"]',
    buttonBar: '[class*="u-btn-bar"][class*="cc-vertical"]',
    buttonWrap: '[class*="accordion_toggle_btn_wrap"]',
  };

  const activeClasses = ['is-active', 'pattern-library-v2--is-active'];
  const hasClassFragment = (element, fragment) =>
    Boolean(element && [...element.classList].some((className) => className.includes(fragment)));
  const isActive = (card) => activeClasses.some((className) => card.classList.contains(className));
  const setActive = (card, active) => {
    activeClasses.forEach((className) => card.classList.toggle(className, active));
  };

  function initAccordions() {
    document.querySelectorAll(selectors.wrap).forEach((component, listIndex) => {
      if (component.dataset.scriptInitialized) return;

      const list = component.querySelector(selectors.list);
      if (!list) {
        console.warn('Accordion list not found:', component);
        return;
      }
      if (typeof gsap === 'undefined') {
        console.warn('GSAP is required for accordions:', component);
        return;
      }

      component.dataset.scriptInitialized = 'true';

      const closePrevious = component.getAttribute('data-close-previous') !== 'false';
      const closeOnSecondClick = component.getAttribute('data-close-on-second-click') !== 'false';
      const openOnHover = component.getAttribute('data-open-on-hover') === 'true';
      const openByDefaultValue = component.getAttribute('data-open-by-default');
      const openByDefault =
        openByDefaultValue !== null && !Number.isNaN(Number(openByDefaultValue))
          ? Number(openByDefaultValue)
          : false;
      let previousIndex = null;
      const closeFunctions = [];

      function flattenDisplayContents(slot) {
        let child = slot.firstElementChild;
        while (child && hasClassFragment(child, 'u-display-contents')) {
          while (child.firstChild) slot.insertBefore(child.firstChild, child);
          child.remove();
          child = slot.firstElementChild;
        }
      }

      function removeCMSList(slot) {
        const dynList = [...slot.children].find((child) => child.classList.contains('w-dyn-list'));
        if (!dynList) return;

        const nestedItems = dynList.querySelector('.w-dyn-items')?.children;
        if (!nestedItems) return;

        const staticWrapper = [...slot.children];
        [...nestedItems].forEach((item) => {
          const visibleChild = [...item.children].find(
            (child) => !child.classList.contains('w-condition-invisible'),
          );
          if (visibleChild) slot.appendChild(visibleChild);
        });
        staticWrapper.forEach((element) => element.remove());
      }

      flattenDisplayContents(list);
      removeCMSList(list);

      component.querySelectorAll(selectors.card).forEach((card, cardIndex) => {
        let button = card.querySelector(selectors.button);
        if (!button) {
          const heading = card.querySelector(selectors.heading);
          if (heading) {
            button = heading;
            if (heading.tagName !== 'BUTTON') {
              heading.style.cursor = 'pointer';
              heading.setAttribute('role', 'button');
              heading.setAttribute('tabindex', '0');
            }
          }
        }

        let content = card.querySelector(selectors.contentWrap);
        if (!content) content = card.querySelector(selectors.content);
        if (!content) {
          const headingOrButton = card.querySelector(`${selectors.heading}, ${selectors.button}`);
          let nextSibling = headingOrButton?.nextElementSibling;
          while (nextSibling && hasClassFragment(nextSibling, 'u-display-contents')) {
            nextSibling = nextSibling.nextElementSibling;
          }
          if (nextSibling) content = nextSibling;
        }

        if (!button || !content) {
          console.warn('Accordion is missing a button or content element:', card);
          return;
        }

        const buttonBars = card.querySelectorAll(selectors.buttonBar);
        const buttonWraps = card.querySelectorAll(selectors.buttonWrap);

        button.setAttribute('aria-expanded', 'false');
        button.id = `accordion_button_${listIndex}_${cardIndex}`;
        content.id = `accordion_content_${listIndex}_${cardIndex}`;
        button.setAttribute('aria-controls', content.id);
        content.setAttribute('aria-labelledby', button.id);
        content.style.display = 'none';

        const refresh = () => {
          timeline.invalidate();
          if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
        };
        const timeline = gsap.timeline({
          paused: true,
          defaults: { duration: 0.3, ease: 'power1.inOut' },
          onComplete: refresh,
          onReverseComplete: refresh,
        });
        timeline.set(content, { display: 'block' });
        timeline.fromTo(content, { height: 0 }, { height: 'auto' });

        const closeAccordion = () => {
          if (!isActive(card)) return;

          setActive(card, false);
          timeline.reverse();
          button.setAttribute('aria-expanded', 'false');
          buttonBars.forEach((bar) => {
            bar.style.opacity = '';
            bar.style.display = '';
          });
          buttonWraps.forEach((wrap) => {
            wrap.style.pointerEvents = '';
          });
        };
        closeFunctions[cardIndex] = closeAccordion;

        const openAccordion = (instant = false) => {
          if (closePrevious && previousIndex !== null && previousIndex !== cardIndex) {
            closeFunctions[previousIndex]?.();
          }
          previousIndex = cardIndex;
          button.setAttribute('aria-expanded', 'true');
          setActive(card, true);
          buttonBars.forEach((bar) => {
            bar.style.opacity = '0';
          });
          buttonWraps.forEach((wrap) => {
            wrap.style.pointerEvents = 'none';
          });
          instant ? timeline.progress(1) : timeline.play();
        };

        if (openByDefault === cardIndex + 1) openAccordion(true);

        const handleToggle = () => {
          if (isActive(card) && closeOnSecondClick) {
            closeAccordion();
            previousIndex = null;
          } else {
            openAccordion();
          }
        };

        button.addEventListener('click', handleToggle);
        if (hasClassFragment(button, 'accordion_toggle_heading')) {
          button.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleToggle();
            }
          });
        }
        if (openOnHover) button.addEventListener('mouseenter', () => openAccordion());
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccordions, { once: true });
  } else {
    initAccordions();
  }
})();

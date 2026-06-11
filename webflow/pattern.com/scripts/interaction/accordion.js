document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".pattern-library-v2--accordion_wrap").forEach((component, listIndex) => {
    if (component.dataset.scriptInitialized) return;
    component.dataset.scriptInitialized = "true";

    const closePrevious = component.getAttribute("data-close-previous") !== "false";
    const closeOnSecondClick = component.getAttribute("data-close-on-second-click") !== "false";
    const openOnHover = component.getAttribute("data-open-on-hover") === "true";
    const openByDefault = component.getAttribute("data-open-by-default") !== null && !isNaN(+component.getAttribute("data-open-by-default")) ? +component.getAttribute("data-open-by-default") : false;
    const list = component.querySelector(".pattern-library-v2--accordion_list");
    let previousIndex = null,
      closeFunctions = [];

    function flattenDisplayContents(slot) {
      if (!slot) return;
      let child = slot.firstElementChild;
      while (child && child.classList.contains("u-display-contents")) {
        while (child.firstChild) {
          slot.insertBefore(child.firstChild, child);
        }
        slot.removeChild(child);
        child = slot.firstElementChild;
      }
    }
    flattenDisplayContents(list);

    function removeCMSList(slot) {
      const dynList = Array.from(slot.children).find((child) => child.classList.contains("w-dyn-list"));
      if (!dynList) return;
      const nestedItems = dynList?.querySelector(".w-dyn-items")?.children;
      if (!nestedItems) return;
      const staticWrapper = [...slot.children];
      [...nestedItems].forEach(el => { const c = [...el.children].find(c => !c.classList.contains('w-condition-invisible')); c && slot.appendChild(c); });
      staticWrapper.forEach((el) => el.remove());
    }
    removeCMSList(list);

    component.querySelectorAll(".pattern-library-v2--accordion_component").forEach((card, cardIndex) => {
      // Try to find button - check for both button and heading variants
      let button = card.querySelector(".pattern-library-v2--accordion_toggle_button");
      if (!button) {
        const heading = card.querySelector(".pattern-library-v2--accordion_toggle_heading");
        if (heading) {
          // If heading exists, use it as the button (make it clickable)
          button = heading;
          if (heading.tagName !== "BUTTON") {
            heading.style.cursor = "pointer";
            heading.setAttribute("role", "button");
            heading.setAttribute("tabindex", "0");
          }
        }
      }

      // Try to find content wrapper - check multiple possible class names
      let content = card.querySelector(".pattern-library-v2--accordion_content_wrap");
      if (!content) {
        content = card.querySelector(".pattern-library-v2--accordion_content");
      }
      if (!content) {
        // Look for any element that might be the content (after the heading/button)
        const headingOrButton = card.querySelector(".pattern-library-v2--accordion_toggle_heading, .pattern-library-v2--accordion_toggle_button");
        if (headingOrButton) {
          let nextSibling = headingOrButton.nextElementSibling;
          while (nextSibling && nextSibling.classList.contains("u-display-contents")) {
            nextSibling = nextSibling.nextElementSibling;
          }
          if (nextSibling) content = nextSibling;
        }
      }

      if (!button || !content) return console.warn("Missing elements:", card);

      // Find .u-btn-bar.cc-vertical elements within the card
      const btnBars = card.querySelectorAll(".pattern-library-v2--u-btn-bar.pattern-library-v2--cc-vertical");

      // Find .accordion_toggle_btn_wrap elements within the card
      const btnWraps = card.querySelectorAll(".pattern-library-v2--accordion_toggle_btn_wrap");

      button.setAttribute("aria-expanded", "false");
      button.setAttribute("id", "accordion_button_" + listIndex + "_" + cardIndex);
      content.setAttribute("id", "accordion_content_" + listIndex + "_" + cardIndex);
      button.setAttribute("aria-controls", content.id);
      content.setAttribute("aria-labelledby", button.id);
      content.style.display = "none";

      const refresh = () => {
        tl.invalidate();
        if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
      };
      const tl = gsap.timeline({ paused: true, defaults: { duration: 0.3, ease: "power1.inOut" }, onComplete: refresh, onReverseComplete: refresh });
      tl.set(content, { display: "block" });
      tl.fromTo(content, { height: 0 }, { height: "auto" });

      const closeAccordion = () => {
        if (card.classList.contains("pattern-library-v2--is-active")) {
          card.classList.remove("pattern-library-v2--is-active");
          tl.reverse();
          button.setAttribute("aria-expanded", "false");
          // Show .u-btn-bar.cc-vertical elements when closing
          btnBars.forEach(bar => {
            bar.style.opacity = "";
            bar.style.display = "";
          });
          // Re-enable hover state for .accordion_toggle_btn_wrap when closing
          btnWraps.forEach(wrap => {
            wrap.style.pointerEvents = "";
          });
        }
      };
      closeFunctions[cardIndex] = closeAccordion;

      const openAccordion = (instant = false) => {
        if (closePrevious && previousIndex !== null && previousIndex !== cardIndex) closeFunctions[previousIndex]?.();
        previousIndex = cardIndex;
        button.setAttribute("aria-expanded", "true");
        card.classList.add("pattern-library-v2--is-active");
        // Hide .u-btn-bar.cc-vertical elements when opening
        btnBars.forEach(bar => {
          bar.style.opacity = "0";
        });
        // Disable hover state for .accordion_toggle_btn_wrap when opening
        btnWraps.forEach(wrap => {
          wrap.style.pointerEvents = "none";
        });
        instant ? tl.progress(1) : tl.play();
      };
      if (openByDefault === cardIndex + 1) openAccordion(true);

      const handleToggle = () => (card.classList.contains("pattern-library-v2--is-active") && closeOnSecondClick ? (closeAccordion(), (previousIndex = null)) : openAccordion());

      button.addEventListener("click", handleToggle);

      // Add keyboard support if heading is used as button
      if (button.classList.contains("pattern-library-v2--accordion_toggle_heading")) {
        button.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggle();
          }
        });
      }

      if (openOnHover) button.addEventListener("mouseenter", () => openAccordion());
    });
  });
});
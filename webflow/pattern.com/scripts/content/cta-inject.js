/**
 * Enhanced Custom fs-inject script
 * Positions [fs-inject-element=element] above the 3rd H2 within 
 * the rich-text field marked [fs-inject-element=target]
 * 
 * Based on Finsweet's fs-inject functionality but customized for specific positioning
 */

(function() {
  'use strict';

  let hasRun = false;

  /**
   * Initialize the custom inject functionality
   */
  function initCustomInject() {
    // Prevent multiple executions
    if (hasRun) {
      return;
    }

    // Find the target rich-text field
    const target = document.querySelector('[fs-inject-element="target"]');
    
    if (!target) {
      console.warn('Custom fs-inject: Target element not found');
      return;
    }

    // Find the element to inject
    const elementToInject = document.querySelector('[fs-inject-element="element"]');
    
    if (!elementToInject) {
      console.warn('Custom fs-inject: Element to inject not found');
      return;
    }

    // Check if element is already injected or hidden (prevent duplicates)
    if (target.contains(elementToInject) || elementToInject.hasAttribute('data-fs-inject-hidden')) {
      console.log('Custom fs-inject: Element already injected, skipping');
      return;
    }

    // Find all H2 elements within the target
    const h2Elements = Array.from(target.querySelectorAll('h2'));
    
    if (h2Elements.length < 3) {
      console.warn(`Custom fs-inject: Found ${h2Elements.length} H2 elements, need at least 3`);
      return;
    }

    // Get the 3rd H2 (index 2, since arrays are 0-indexed)
    const thirdH2 = h2Elements[2];
    
    // Ensure the third H2 has a parent node
    if (!thirdH2.parentNode) {
      console.error('Custom fs-inject: Third H2 has no parent node');
      return;
    }

    // Clone the element to inject (in case it's used elsewhere or needs to be preserved)
    const clonedElement = elementToInject.cloneNode(true);
    
    // Add a data attribute to mark it as injected
    clonedElement.setAttribute('data-custom-injected', 'true');
    
    // Create a wrapper div to isolate styles from the rich-text container
    // This prevents rich-text CSS selectors like .w-richtext > * from affecting the element
    // The wrapper breaks the direct child selector chain while preserving the element's own styles
    const styleIsolationWrapper = document.createElement('div');
    styleIsolationWrapper.setAttribute('data-fs-inject-wrapper', 'true');
    styleIsolationWrapper.setAttribute('class', 'fs-inject-style-isolation');
    
    // Set wrapper styles to be minimal and non-interfering
    // This breaks CSS selector chains like .w-richtext > * while preserving element styles
    styleIsolationWrapper.style.cssText = 'display: block; margin: 0; padding: 0;';
    
    // Wrap the cloned element (which already has its original classes and styles)
    styleIsolationWrapper.appendChild(clonedElement);
    
    // Insert the wrapped element before the 3rd H2
    thirdH2.parentNode.insertBefore(styleIsolationWrapper, thirdH2);
    
    // Hide the original element to prevent duplicate display
    // Using display: none instead of remove() to preserve any event listeners or references
    elementToInject.style.display = 'none';
    elementToInject.setAttribute('data-fs-inject-hidden', 'true');
    
    hasRun = true;
    console.log('Custom fs-inject: Successfully positioned element above 3rd H2 and hid original');
  }

  /**
   * Wait for element to be available using MutationObserver
   */
  function waitForElements() {
    const target = document.querySelector('[fs-inject-element="target"]');
    const elementToInject = document.querySelector('[fs-inject-element="element"]');
    
    if (target && elementToInject) {
      initCustomInject();
      return true;
    }
    return false;
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      if (!waitForElements()) {
        // Use MutationObserver to watch for dynamically added content
        const observer = new MutationObserver(function(mutations, obs) {
          if (waitForElements()) {
            obs.disconnect();
          }
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        
        // Fallback timeout
        setTimeout(function() {
          observer.disconnect();
          initCustomInject();
        }, 5000);
      }
    });
  } else {
    // DOM is already ready
    if (!waitForElements()) {
      // Use MutationObserver for dynamically loaded content
      const observer = new MutationObserver(function(mutations, obs) {
        if (waitForElements()) {
          obs.disconnect();
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Fallback timeout
      setTimeout(function() {
        observer.disconnect();
        initCustomInject();
      }, 5000);
    }
  }
})();

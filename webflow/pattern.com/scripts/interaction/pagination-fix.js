// Fix: Prevent Finsweet race condition where NEXT href changes before Safari navigates
document.addEventListener('click', function(e) {
  var link = e.target.closest('.w-pagination-next, .w-pagination-previous');
  if (!link) return;
  
  // Capture the original href BEFORE Finsweet can change it
  var originalHref = link.getAttribute('href');
  
  // If the link is disabled, block the click entirely
  if (link.classList.contains('is-list-pagination-disabled') || link.getAttribute('aria-disabled') === 'true') {
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  
  // Freeze the href — prevent Finsweet from changing it during the click
  var descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'setAttribute') || 
                   Object.getOwnPropertyDescriptor(Element.prototype, 'setAttribute');
  var origSetAttribute = link.setAttribute;
  
  link.setAttribute = function(name, value) {
    if (name === 'href') {
      // Block href changes during this click cycle
      return;
    }
    return origSetAttribute.call(this, name, value);
  };
  
  // Also freeze via property
  Object.defineProperty(link, 'href', {
    get: function() { return originalHref; },
    set: function() { /* blocked */ },
    configurable: true
  });
  
  // Restore after the click event cycle completes
  setTimeout(function() {
    link.setAttribute = origSetAttribute;
    delete link.href; // remove the property override, restoring prototype behavior
  }, 0);
  
}, true); // capture phase — runs BEFORE Finsweet's handler


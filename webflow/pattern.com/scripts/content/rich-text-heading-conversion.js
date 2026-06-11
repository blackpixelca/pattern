function convertH1s() {
    // Get all h1s currently in the document
    const h1s = Array.from(document.querySelectorAll('h1'));
    // If there are no h1s, nothing to do
    if (h1s.length === 0) return;
    // The first h1 should be skipped
    const firstH1 = h1s[0];
    // All other h1s should be converted to h2
    h1s.slice(1).forEach(h1 => {
      // Don't convert if it's already been converted (shouldn't happen, but safe)
      if (h1 === firstH1) return;
      const h2 = document.createElement('h2');
      for (const attr of h1.attributes) h2.setAttribute(attr.name, attr.value);
      h2.innerHTML = h1.innerHTML;
      h1.parentNode.replaceChild(h2, h1);
    });
  }
  
  document.addEventListener('DOMContentLoaded', function() {
    convertH1s();
  
    // Watch for new h1s added dynamically
    const observer = new MutationObserver(() => convertH1s());
    observer.observe(document.body, { childList: true, subtree: true });
  });
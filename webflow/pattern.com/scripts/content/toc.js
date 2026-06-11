(function() {

  const init = () => {
    const article = document.getElementById("single-article");
    const tocContainer = document.getElementById("toc");

    if (!tocContainer || !article) return;

    const headings = article.querySelectorAll("h2");
    if (headings.length === 0) return;

    const tocFragment = document.createDocumentFragment();
    headings.forEach((heading) => {
      const title = heading.textContent.trim();
      const anchorId = `toc-${title.toLowerCase().replace(/\s+/g, '-')}`;
      heading.id = anchorId;
      const li = document.createElement("li");
      const anchor = document.createElement("a");
      anchor.textContent = title;
      anchor.href = `#${anchorId}`;
      li.appendChild(anchor);
      tocFragment.appendChild(li);
    });
    const ul = document.createElement("ul");
    ul.appendChild(tocFragment);
    tocContainer.appendChild(ul);

    const tocItems = tocContainer.querySelectorAll('a');

    function setActiveItem(targetId) {
      tocItems.forEach(function(item) {
        if (item.getAttribute('href') === '#' + targetId) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    }

    tocItems.forEach(function(item) {
      item.addEventListener('click', function(event) {
        event.preventDefault();
        var targetId = this.getAttribute('href').substring(1);
        setActiveItem(targetId);
        document.getElementById(targetId).scrollIntoView();
      });
    });

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");
          setActiveItem(id);
        }
      });
    }, { rootMargin: '0px 0px -50% 0px' });

    headings.forEach(function(heading) {
      observer.observe(heading);
    });

    function offsetAnchor() {
      if (location.hash.length !== 0) {
        const targetId = location.hash.substring(1);
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          const offset = targetElement.getBoundingClientRect().top - 100;
          window.scrollTo(window.scrollX, window.scrollY + offset);
        }
      }
    }
    window.addEventListener("hashchange", offsetAnchor);
    window.setTimeout(offsetAnchor, 1);
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(init);
  } else {
    setTimeout(init, 200);
  }

})();
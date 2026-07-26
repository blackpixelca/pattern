(function() {
  function initArticleTOC() {
    const tocContainer = document.getElementById('toc');
    if (!tocContainer || tocContainer.dataset.tocInitialized === 'true') return;

    function findTOCShell() {
      return (
        tocContainer.closest('.entry_sidebar_contain, .pattern-library-v2--entry_sidebar_wrap, #sidebar') ||
        document.querySelector('.entry_sidebar_contain, .pattern-library-v2--entry_sidebar_wrap') ||
        document.getElementById('sidebar') ||
        tocContainer
      );
    }

    const tocShell = findTOCShell();

    function hideTOC() {
      tocShell.style.display = 'none';
      tocShell.setAttribute('aria-hidden', 'true');
    }

    function findArticle() {
      const selectors = [
        '#single-article',
        '.entry_main_rt',
        '.article-rich-text',
        '.pattern-library-v2--u-rich-text',
        '.pattern-library-v2--u-text.w-richtext.u-rich-text',
        '.u-text.w-richtext.u-rich-text'
      ];

      for (let i = 0; i < selectors.length; i += 1) {
        const matches = Array.prototype.slice.call(document.querySelectorAll(selectors[i]));
        const article = matches.find(function(element) {
          return element.querySelector('h2');
        });

        if (article) return article;
      }

      return null;
    }

    function slugify(text) {
      return text
        .trim()
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }

    function getUniqueId(baseId, heading) {
      let id = baseId || 'section';
      let uniqueId = id;
      let count = 2;

      while (document.getElementById(uniqueId) && document.getElementById(uniqueId) !== heading) {
        uniqueId = id + '-' + count;
        count += 1;
      }

      return uniqueId;
    }

    const article = findArticle();

    if (!article) {
      tocContainer.dataset.tocInitialized = 'true';
      hideTOC();
      return;
    }

    const headings = Array.prototype.slice.call(article.querySelectorAll('h2')).filter(function(heading) {
      return heading.textContent.trim();
    });

    if (!headings.length) {
      tocContainer.dataset.tocInitialized = 'true';
      hideTOC();
      return;
    }

    tocContainer.dataset.tocInitialized = 'true';
    tocContainer.innerHTML = '';

    const ul = document.createElement('ul');

    headings.forEach(function(heading) {
      const title = heading.textContent.trim();
      const anchorId = getUniqueId('toc-' + slugify(title), heading);

      heading.id = anchorId;

      const li = document.createElement('li');
      const anchor = document.createElement('a');

      anchor.textContent = title;
      anchor.href = '#' + anchorId;

      li.appendChild(anchor);
      ul.appendChild(li);
    });

    tocContainer.appendChild(ul);

    const tocItems = tocContainer.querySelectorAll('a');

    function setActiveItem(targetId) {
      tocItems.forEach(function(item) {
        item.classList.toggle('active', item.getAttribute('href') === '#' + targetId);
      });
    }

    tocItems.forEach(function(item) {
      item.addEventListener('click', function(event) {
        event.preventDefault();

        const targetId = this.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        if (!targetElement) return;

        setActiveItem(targetId);

        const offset = targetElement.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: offset, behavior: 'smooth' });
      });
    });

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (!entry.isIntersecting) return;
          setActiveItem(entry.target.id);
        });
      }, { rootMargin: '0px 0px -50% 0px' });

      headings.forEach(function(heading) {
        observer.observe(heading);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initArticleTOC);
  } else {
    initArticleTOC();
  }
})();

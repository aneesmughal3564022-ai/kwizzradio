// KWIZZ Radio Uninterrupted Client-Side PJAX Navigation
// Ensures audio stream plays continuously while visitors navigate between pages

(function () {
  const contentContainer = document.getElementById('main-content');
  if (!contentContainer) return;

  function shouldIntercept(anchor) {
    if (!anchor || anchor.tagName !== 'A') return false;
    const href = anchor.getAttribute('href');
    if (!href) return false;

    // Do not intercept external links, special protocols, downloads or admin area
    if (
      anchor.target === '_blank' ||
      href.startsWith('http://') ||
      href.startsWith('https://') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('#') ||
      href.startsWith('/admin') ||
      href.startsWith('/api') ||
      anchor.hasAttribute('download')
    ) {
      return false;
    }

    return true;
  }

  async function navigateTo(url, push = true) {
    try {
      contentContainer.classList.add('loading');

      const response = await fetch(url, {
        headers: {
          'X-PJAX': 'true',
          'Accept': 'text/html'
        }
      });

      if (!response.ok) {
        window.location.href = url;
        return;
      }

      const html = await response.text();

      // Extract new title if present in response or meta
      const tempDoc = document.createElement('div');
      tempDoc.innerHTML = html;
      const titleTag = tempDoc.querySelector('title');
      if (titleTag) {
        document.title = titleTag.textContent;
      }

      // Smoothly replace the main content
      contentContainer.innerHTML = html;
      window.scrollTo(0, 0);

      if (push) {
        window.history.pushState({ pjax: true, url }, '', url);
      }

      // Update active navigation link styles in header
      updateActiveNavLinks(window.location.pathname);

      // Execute any inline or page scripts in the newly inserted HTML
      executeScripts(contentContainer);

      // If page has a dynamic track showcase, sync it with current player track
      if (window.player && window.player.currentTrack) {
        window.player.updateMetadata(window.player.currentTrack);
      }

      // Dispatch custom page_navigated event for analytics & page initializers
      document.dispatchEvent(new CustomEvent('kwizz:navigated', { detail: { path: window.location.pathname } }));
    } catch (err) {
      console.warn('PJAX navigation failed, falling back to full reload:', err);
      window.location.href = url;
    } finally {
      contentContainer.classList.remove('loading');
    }
  }

  function updateActiveNavLinks(currentPath) {
    document.querySelectorAll('.nav-link').forEach((link) => {
      const href = link.getAttribute('href');
      if (href === currentPath || (href !== '/' && currentPath.startsWith(href))) {
        link.classList.add('text-amber-400', 'font-bold', 'bg-amber-400/10', 'border', 'border-amber-400/20');
        link.classList.remove('text-zinc-400');
      } else {
        link.classList.remove('text-amber-400', 'font-bold', 'bg-amber-400/10', 'border', 'border-amber-400/20', 'text-yellow-400', 'bg-zinc-800/50');
        link.classList.add('text-zinc-400');
      }
    });

    // Close mobile menu if open
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
      mobileMenu.classList.add('hidden');
    }
  }

  function executeScripts(container) {
    const scripts = container.querySelectorAll('script');
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
      newScript.appendChild(document.createTextNode(oldScript.innerHTML));
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
  }

  // Intercept click on document
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a');
    if (shouldIntercept(anchor)) {
      e.preventDefault();
      const href = anchor.getAttribute('href');
      navigateTo(href, true);
    }
  });

  // Handle browser back/forward buttons
  window.addEventListener('popstate', (e) => {
    navigateTo(window.location.pathname, false);
  });
})();


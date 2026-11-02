// KWIZZ Radio Theme Controller
// Supports Light & Dark Themes with instant switching and persistence
(function () {
  const THEME_KEY = 'kwizz_radio_theme';

  function getSavedTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (e) {
      return null;
    }
  }

  function setSavedTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {}
  }

  function getPreferredTheme() {
    const saved = getSavedTheme();
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    // Respect user's OS / browser color scheme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark'; // KWIZZ Radio signature aesthetic
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    const body = document.body;

    root.setAttribute('data-theme', theme);
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.style.colorScheme = theme;

    if (body) {
      body.setAttribute('data-theme', theme);
      body.classList.remove('light', 'dark');
      body.classList.add(theme);
      body.style.backgroundColor = theme === 'dark' ? '#08080a' : '#f8fafc';
      body.style.color = theme === 'dark' ? '#ffffff' : '#0f172a';
    }

    // Update browser theme-color for mobile address bar
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#08080a' : '#f8fafc');
    }

    // Update all theme toggle buttons across the UI (desktop & mobile)
    const toggleBtns = document.querySelectorAll('#theme-toggle-btn, .theme-toggle-btn');
    toggleBtns.forEach((btn) => {
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
      btn.setAttribute('title', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
      const icon = btn.querySelector('.theme-icon');
      if (icon) {
        icon.innerHTML = theme === 'dark'
          ? '<svg class="w-4 h-4 text-amber-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>'
          : '<svg class="w-4 h-4 text-amber-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>';
      }
    });

    try {
      window.dispatchEvent(new CustomEvent('kwizz:themechanged', { detail: { theme } }));
    } catch (e) {}
  }

  window.toggleTheme = function () {
    const current = document.documentElement.getAttribute('data-theme') || (document.documentElement.classList.contains('light') ? 'light' : 'dark');
    const next = current === 'dark' ? 'light' : 'dark';
    setSavedTheme(next);
    applyTheme(next);
  };

  window.applyTheme = applyTheme;

  // Immediately apply preferred theme
  const initialTheme = getPreferredTheme();
  applyTheme(initialTheme);

  // Re-apply when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      applyTheme(getPreferredTheme());
    });
  } else {
    applyTheme(getPreferredTheme());
  }

  // Delegated click listener on document for high reliability
  document.addEventListener('click', (event) => {
    const btn = event.target.closest('#theme-toggle-btn, .theme-toggle-btn');
    if (btn) {
      event.preventDefault();
      event.stopPropagation();
      window.toggleTheme();
    }
  });

  // Listen to OS system color-scheme changes if no explicit user override is saved
  if (window.matchMedia) {
    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleMediaChange = (e) => {
        if (!getSavedTheme()) {
          applyTheme(e.matches ? 'dark' : 'light');
        }
      };
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleMediaChange);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleMediaChange);
      }
    } catch (e) {}
  }

  // Re-apply when PJAX page navigation occurs
  document.addEventListener('kwizz:navigated', () => {
    applyTheme(getPreferredTheme());
  });
})();

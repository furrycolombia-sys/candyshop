/**
 * Blocking script to prevent theme flash on page load.
 * This script runs before React hydration to set the correct theme class.
 *
 * Reads from cookie first (persists across apps), then localStorage fallback.
 * Must be placed inside <head> or at the start of <body> in the root layout.
 */

const themeScript = `
(function() {
  var STORAGE_KEY = 'theme-preference';
  var COOKIE_NAME = 'theme-preference';

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getTheme() {
    try {
      var fromCookie = getCookie(COOKIE_NAME);
      if (fromCookie === 'light' || fromCookie === 'dark') return fromCookie;
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch(e) {}
    return getSystemTheme();
  }

  var theme = getTheme();
  document.documentElement.classList.toggle('dark', theme === 'dark');
})();
`;

export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: themeScript }}
      suppressHydrationWarning
    />
  );
}

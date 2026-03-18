/**
 * Blocking script to prevent theme flash on page load.
 * This script runs before React hydration to set the correct theme class.
 *
 * Must be placed inside <head> or at the start of <body> in the root layout.
 */

const themeScript = `
(function() {
  const STORAGE_KEY = 'theme-preference';

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getTheme() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch {}
    return getSystemTheme();
  }

  const theme = getTheme();
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

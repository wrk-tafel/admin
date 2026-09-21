// Puts the dark theme on <html> before anything is painted, so a returning visitor who chose it (or
// whose system prefers it) does not get a white flash while Angular starts. `ThemeService` takes over
// once the app is running and keeps this in step; the key is the one it stores the choice under.
// A separate file rather than an inline script because the Content-Security-Policy allows none.
(function () {
  try {
    var preference = localStorage.getItem('tafel-theme');
    var dark = preference === 'DARK'
      || (preference !== 'LIGHT' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.style.colorScheme = 'dark';
    }
  } catch (e) {
    // storage unavailable: the light default stands until ThemeService runs
  }
})();

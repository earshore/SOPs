/**
 * Pre-paint color-mode bootstrap (T1-2 FOUC).
 * Blocking sync script in <head> — must stay free of imports / async.
 * Reads StorageService-compatible values: JSON-stringified or plain.
 */
(function () {
  var KEY = 'app-color-mode';
  var root = document.documentElement;
  try {
    root.setAttribute('data-theme-ready', '0');
  } catch (_) {}

  function readMode() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw == null || raw === '') return 'light';
      try {
        var parsed = JSON.parse(raw);
        if (parsed === 'light' || parsed === 'dark' || parsed === 'system') return parsed;
      } catch (_) {
        /* plain string */
      }
      if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
      // JSON-stringified string without full parse success path already handled
      if (raw === '"light"' || raw === '"dark"' || raw === '"system"') {
        return raw.slice(1, -1);
      }
    } catch (_) {
      /* private mode / blocked storage */
    }
    return 'light';
  }

  function resolve(mode) {
    if (mode === 'dark') return 'dark';
    if (mode === 'light') return 'light';
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (_) {}
    return 'light';
  }

  var mode = readMode();
  var resolved = resolve(mode);

  try {
    root.setAttribute('data-color-mode', mode);
    root.setAttribute('data-color-mode-resolved', resolved);
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.style.colorScheme = resolved;
  } catch (_) {}
})();

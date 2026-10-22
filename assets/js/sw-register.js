function registerOfflineServiceWorker() {
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
}

if ('serviceWorker' in navigator) addEventListener('load', registerOfflineServiceWorker);

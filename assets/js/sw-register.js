// Mode hors ligne : enregistre le service worker (sw.js, à la racine du site)
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).catch(()=>{}))

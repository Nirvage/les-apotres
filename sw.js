const CACHE_NAME = 'apotres-v2';
const LAST_FULL_COPY_KEY = '__sw_meta__/derniere-copie';
const FULL_COPY_MAX_AGE_MS = 6 * 3600 * 1000;
const SLOW_NETWORK_DELAY_MS = 4000;
const QUOTED_SITE_FILE = /(?:^|[\s'"(=,])((?:\.\/)?[\w.\/-]+\.(?:html|json|js|css))(\?v=[\w.-]*)?(?=['")\s>])/g;

const siteRootUrl = new URL('./', self.location).href;

const isSiteUrl = url => url.startsWith(siteRootUrl) && !url.includes('/__sw_meta__/');
const isVersionedUrl = url => /[?&]v=/.test(url);
const isJsonUrl = url => /\.json$/.test(new URL(url).pathname);

async function storeResponse(cache, request, response) {
  if (!response || !response.ok || response.redirected || response.type !== 'basic') return;
  await cache.delete(request, { ignoreSearch: true });
  await cache.put(request, response);
}

function siteFilesQuotedIn(text) {
  return [...text.matchAll(QUOTED_SITE_FILE)]
    .map(([, path, version]) => new URL(path + (version || ''), siteRootUrl).href)
    .filter(isSiteUrl);
}

async function fetchForFullCopy(url) {
  try {
    const response = await fetch(url, { cache: isVersionedUrl(url) ? 'default' : 'no-cache' });
    return response.ok ? response : null;
  } catch (error) {
    return null;
  }
}

async function copyWholeSite() {
  const cache = await caches.open(CACHE_NAME);
  const visitedUrls = new Set();
  const urlsToVisit = [siteRootUrl];
  while (urlsToVisit.length) {
    const url = urlsToVisit.shift();
    if (visitedUrls.has(url)) continue;
    visitedUrls.add(url);
    const response = await fetchForFullCopy(url);
    if (!response) continue;
    await storeResponse(cache, url, response.clone());
    if (isJsonUrl(url)) continue;
    const linkedUrls = siteFilesQuotedIn(await response.text());
    urlsToVisit.push(...linkedUrls.filter(linkedUrl => !visitedUrls.has(linkedUrl)));
  }
  await cache.put(LAST_FULL_COPY_KEY, new Response(String(Date.now())));
}

async function copyWholeSiteIfOutdated() {
  const cache = await caches.open(CACHE_NAME);
  const lastCopy = await cache.match(LAST_FULL_COPY_KEY);
  const lastCopyTime = lastCopy ? Number(await lastCopy.text()) : 0;
  if (Date.now() - lastCopyTime > FULL_COPY_MAX_AGE_MS) await copyWholeSite();
}

async function deleteOutdatedCaches() {
  for (const cacheName of await caches.keys()) {
    if (cacheName.startsWith('apotres-') && cacheName !== CACHE_NAME) await caches.delete(cacheName);
  }
}

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(copyWholeSite().catch(() => {}));
});

self.addEventListener('activate', event => {
  event.waitUntil(deleteOutdatedCaches().then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !isSiteUrl(request.url)) return;
  event.respondWith(respondNetworkFirst(event, request));
  if (request.mode === 'navigate') event.waitUntil(copyWholeSiteIfOutdated().catch(() => {}));
});

function offlinePageResponse(homePageIsCached) {
  const backHomeLink = homePageIsCached ? '<p><a href="./">Retour à l’accueil</a></p>' : '';
  return new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Hors ligne</title><body style="font-family:system-ui,sans-serif;max-width:32em;margin:3em auto;padding:0 1em">' +
    '<h1>Hors ligne</h1><p>Cette page n’a pas encore été enregistrée sur cet appareil. Elle le sera à la prochaine ouverture avec du réseau.</p>' +
    backHomeLink,
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

const wait = delayMs => new Promise(resolve => setTimeout(resolve, delayMs));

async function respondNetworkFirst(event, request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedCopy = () => cache.match(request).then(copy => copy || cache.match(request, { ignoreSearch: true }));
  const networkResponse = fetch(request, isVersionedUrl(request.url) ? undefined : { cache: 'no-cache' })
    .then(async response => {
      await storeResponse(cache, request, response.clone());
      return response;
    });
  event.waitUntil(networkResponse.catch(() => {}));
  const cachedCopyWhenNetworkIsSlow = wait(SLOW_NETWORK_DELAY_MS).then(cachedCopy).then(copy => copy || networkResponse);
  try {
    return await Promise.race([networkResponse, cachedCopyWhenNetworkIsSlow]);
  } catch (networkError) {
    const copy = await cachedCopy();
    if (copy) return copy;
    if (request.mode === 'navigate') return offlinePageResponse(Boolean(await cache.match(siteRootUrl)));
    throw networkError;
  }
}

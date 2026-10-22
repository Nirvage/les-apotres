// Mode hors ligne : le site reste utilisable sans réseau une fois ouvert.
// Stratégie « réseau d'abord » : avec du réseau, chaque requête part sur le serveur
// (les mises à jour arrivent tout de suite) et la réponse est rangée dans le cache ;
// sans réseau, on sert la dernière copie enregistrée.
// Les pages et données sont découvertes en parcourant les liens depuis l'accueil :
// pas de liste de fichiers à tenir à jour quand une page est ajoutée.
const CACHE = 'apotres-v2';
const META = '__sw_meta__/derniere-copie';
const RECOPIE = 6 * 3600 * 1000;   // nouvelle copie complète au plus toutes les 6 h
const DELAI = 4000;               // réseau trop lent : on sert la copie au bout de 4 s
const FICHIER = /(?:^|[\s'"(=,])((?:\.\/)?[\w.\/-]+\.(?:html|json|js|css))(\?v=[\w.-]*)?(?=['")\s>])/g;

const base = new URL('./', self.location).href;
const local = u => u.startsWith(base) && !u.includes('/__sw_meta__/');
const versionne = u => /[?&]v=/.test(u);

async function ranger(cache, req, res) {
  if (!res || !res.ok || res.redirected || res.type !== 'basic') return;
  // une seule copie par fichier : l'ancienne version ?v= est remplacée
  await cache.delete(req, { ignoreSearch: true });
  await cache.put(req, res);
}

// Copie complète du site : accueil, puis chaque page, script (assets/js), feuille de style (assets/css)
// et fichier JSON (assets/json/vf, assets/json/vo) cité
async function copier() {
  const cache = await caches.open(CACHE);
  const vus = new Set(), file = [base];
  while (file.length) {
    const url = file.shift();
    if (vus.has(url)) continue;
    vus.add(url);
    let res;
    try { res = await fetch(url, { cache: versionne(url) ? 'default' : 'no-cache' }); } catch (e) { continue; }
    if (!res.ok) continue;
    await ranger(cache, url, res.clone());
    if (!/\.(json)$/.test(new URL(url).pathname)) {
      const txt = await res.text();
      for (const m of txt.matchAll(FICHIER)) {
        // chemins relatifs à la racine du site : toutes les pages y sont, et les scripts
        // (assets/js/…) citent leurs fichiers par rapport à la page qui les charge
        const u = new URL(m[1] + (m[2] || ''), base).href;
        if (local(u) && !vus.has(u)) file.push(u);
      }
    }
  }
  await cache.put(META, new Response(String(Date.now())));
}

async function copierSiAncienne() {
  const cache = await caches.open(CACHE);
  const r = await cache.match(META);
  const t = r ? Number(await r.text()) : 0;
  if (Date.now() - t > RECOPIE) await copier();
}

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(copier().catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('apotres-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !local(req.url)) return;
  e.respondWith(reseauDAbord(e, req));
  if (req.mode === 'navigate') e.waitUntil(copierSiAncienne().catch(() => {}));
});

async function reseauDAbord(e, req) {
  const cache = await caches.open(CACHE);
  const copie = () => cache.match(req).then(r => r || cache.match(req, { ignoreSearch: true }));
  const reseau = fetch(req, versionne(req.url) ? undefined : { cache: 'no-cache' }).then(async res => {
    await ranger(cache, req, res.clone());
    return res;
  });
  e.waitUntil(reseau.catch(() => {}));
  // Réseau lent : on sert la copie en attendant, la réponse du serveur mettra le cache à jour
  const lent = new Promise(ok => setTimeout(ok, DELAI)).then(copie).then(r => r || reseau);
  try {
    return await Promise.race([reseau, lent]);
  } catch (err) {
    const r = await copie();
    if (r) return r;
    if (req.mode === 'navigate') {
      const accueil = await cache.match(base);
      return new Response(
        '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>Hors ligne</title><body style="font-family:system-ui,sans-serif;max-width:32em;margin:3em auto;padding:0 1em">' +
        '<h1>Hors ligne</h1><p>Cette page n’a pas encore été enregistrée sur cet appareil. Elle le sera à la prochaine ouverture avec du réseau.</p>' +
        (accueil ? '<p><a href="./">Retour à l’accueil</a></p>' : ''),
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    throw err;
  }
}

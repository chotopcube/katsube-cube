/* KATSUBE CUBE Service Worker — オフライン対応
   方針：HTML(ナビゲーション)はネット優先＝再デプロイ時に必ず最新を取得。オフライン時のみキャッシュ。
        アイコン等の静的アセットはcache-first。 */
const CACHE = 'katsube-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png',
  './favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // HTMLドキュメント：ネット優先（最新を確実に反映）。失敗時のみキャッシュへフォールバック。
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  // その他（アイコン/manifest等）：cache-first。
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      try {
        const u = new URL(req.url);
        if (u.origin === location.origin && res.ok) {
          const cp = res.clone();
          caches.open(CACHE).then(c => c.put(req, cp));
        }
      } catch (_) {}
      return res;
    }))
  );
});

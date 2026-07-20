// ====== 缓存版本 ======
const CACHE_VERSION = 'v2.0.0';
const CACHE_NAME = 'pwa-cache-' + CACHE_VERSION;

const HOSTNAME_WHITELIST = [
    self.location.hostname,
    'fonts.gstatic.com',
    'fonts.googleapis.com',
    'cdn.jsdelivr.net'
];

const getFixedUrl = (req) => {
    var now = Date.now();
    var url = new URL(req.url);
    url.protocol = self.location.protocol;
    if (url.hostname === self.location.hostname) {
        url.search += (url.search ? '&' : '?') + 'cache-bust=' + now;
    }
    return url.href;
};

// ====== Install ======
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll([]);
        }).then(function() {
            return self.skipWaiting();
        })
    );
});

// ====== Activate ======
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(keyList) {
            return Promise.all(keyList.map(function(key) {
                if (key !== CACHE_NAME && key.startsWith('pwa-cache')) {
                    return caches.delete(key);
                }
            }));
        }).then(function() {
            return self.clients.claim();
        })
    );
});

// ====== Fetch ======
self.addEventListener('fetch', function(event) {
    if (HOSTNAME_WHITELIST.indexOf(new URL(event.request.url).hostname) > -1) {
        const cached = caches.match(event.request);
        const fixedUrl = getFixedUrl(event.request);
        const fetched = fetch(fixedUrl, { cache: 'no-store' });
        const fetchedCopy = fetched.then(function(resp) { return resp.clone(); });

        event.respondWith(
            Promise.race([fetched.catch(function() { return cached; }), cached])
                .then(function(resp) { return resp || fetched; })
                .catch(function() { /* eat any errors */ })
        );

        event.waitUntil(
            Promise.all([fetchedCopy, caches.open(CACHE_NAME)])
                .then(function([response, cache]) {
                    if (response && response.ok) {
                        cache.put(event.request, response);
                    }
                })
                .catch(function() { /* eat any errors */ })
        );
    }
});

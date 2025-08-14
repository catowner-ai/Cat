const CACHE = 'pulsepoll-v2';
const ASSETS = [
	'/static/app.js',
	'/static/manifest.webmanifest',
	'/static/logo.svg',
	'/offline'
];
self.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
	);
});
self.addEventListener('fetch', (event) => {
	const req = event.request;
	event.respondWith(
		caches.match(req).then(res => res || fetch(req).then(netRes => {
			const copy = netRes.clone();
			if (req.method === 'GET' && (req.url.includes('/static/') || req.headers.get('accept')?.includes('text/html'))) {
				caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => {});
			}
			return netRes;
		}).catch(() => {
			if (req.headers.get('accept')?.includes('text/html')) {
				return caches.match('/offline');
			}
			return new Response('', { status: 502 });
		}))
	);
});
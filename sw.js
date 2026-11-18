// COMBATREADY (eigen repo) - service worker voor de marinier-pagina, de instructeurs-pagina en het dashboard (pc): alle drie werken offline.
// VERSIE verhogen als de bestandenlijst hieronder verandert; voor alleen nieuwe inhoud hoeft het niet (de update komt bij de 2e keer openen).
const VERSIE = "mptapp-v3";
const BESTANDEN = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./instructeur/", "./instructeur/index.html", "./instructeur/manifest.webmanifest", "./dashboard/", "./dashboard/index.html", "./dashboard/manifest.webmanifest"];

self.addEventListener("install", e => {
  // altijd vers ophalen bij installeren (niet uit de browsercache)
  e.waitUntil(caches.open(VERSIE).then(c => c.addAll(BESTANDEN.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  // Alleen eigen oude caches wissen: de live MPT-apps (mpt-v*, mpti-*) staan op hetzelfde adres en moeten blijven.
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("mptapp-") && k !== VERSIE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const MAP = new URL("./", self.location).href;                         // eigen map: .../mpt-app/
const EIGEN = new Set(BESTANDEN.map(u => new URL(u, self.location).href));
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  // Alleen de eigen map; al het andere (ook de andere MPT-apps) gaat ongemoeid door.
  if (req.method !== "GET" || !url.href.startsWith(MAP)) return;
  const adres = url.origin + url.pathname;                             // zonder ?query: cache groeit niet
  // Map zonder afsluitende / (bijv. .../instructeur): doorsturen naar de map, anders opent de verkeerde pagina.
  if (req.mode === "navigate" && EIGEN.has(adres + "/")) return e.respondWith(Response.redirect(adres + "/" + url.search, 302));
  e.respondWith(caches.open(VERSIE).then(async cache => {
    const hit = await cache.match(adres) || (req.mode === "navigate" ? await cache.match(MAP + "index.html") : null);
    // Alleen de eigen bestanden uit de lijst komen in de cache; geen redirects of fouten.
    const net = fetch(req, { cache: "no-cache" }).then(res => { if (EIGEN.has(adres) && res && res.ok && !res.redirected) cache.put(adres, res.clone()); return res; }).catch(() => null);
    return hit || (await net) || new Response("Offline", { status: 503 });
  }));
});

// Als de cache door iets anders is gewist: bij elk online bezoek opnieuw vullen.
self.addEventListener("message", e => {
  if (e.data === "recache") e.waitUntil(caches.open(VERSIE).then(c => c.addAll(BESTANDEN.map(u => new Request(u, { cache: "no-cache" })))).catch(() => {}));
});

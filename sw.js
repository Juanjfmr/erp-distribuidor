// Service Worker — Stoqio PWA
// Cache de assets estáticos (HTML/CSS/JS). Dados sempre do Firestore (online-first).
const CACHE = 'stoqio-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/js/app.js',
  '/js/core/state.js',
  '/js/core/nav.js',
  '/js/core/firebase.js',
  '/js/core/fiscalStatus.js',
  '/js/modules/dashboard.js',
  '/js/modules/produtos.js',
  '/js/modules/clientes.js',
  '/js/modules/fornecedores.js',
  '/js/modules/pedidos.js',
  '/js/modules/compras.js',
  '/js/modules/notas.js',
  '/js/modules/contas.js',
  '/js/modules/caixa.js',
  '/js/modules/devolucoes.js',
  '/js/modules/relatorios.js',
  '/js/modules/config.js',
  '/js/modules/usuarios.js',
  '/js/modules/onboarding.js',
  '/js/services/invoiceService.js',
  '/js/services/asaasService.js',
  '/js/services/csvImport.js',
  '/js/core/print.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => 
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Só cacheia GET de assets estáticos — dados da API/Firebase passam direto
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetched = fetch(e.request).then(resp => {
        if (resp.ok && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});

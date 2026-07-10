// Service Worker — 정적/네비게이션 캐싱 및 PWA 오프라인 로딩
// 캐시 버전을 올리면 activate 단계에서 이전 버전 캐시(무한 누적분 포함)가 정리된다.
const CACHE_NAME = 'badminton-manager-v2';
const STATIC_CACHE = 'static-v1';
const RUNTIME_MAX_ITEMS = 80; // 런타임 캐시 최대 항목 수 (무한 증가 방지)

// 캐시할 정적 리소스
const STATIC_ASSETS = [
  '/',
  '/game',
  '/attendance',
  '/settings',
  '/manifest.json'
];

// 런타임 캐시가 상한을 넘으면 오래된 항목부터 제거한다.
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxItems) return;
  for (let i = 0; i < keys.length - maxItems; i++) {
    await cache.delete(keys[i]);
  }
}

// 설치 이벤트
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 활성화 이벤트 — 현재 버전 외 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
            return caches.delete(cacheName);
          }
        })
      ))
      .then(() => self.clients.claim())
  );
});

// 네트워크 요청 가로채기
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API/Supabase 요청: Network-First, 실패 시 오프라인 응답 (실시간 데이터는 캐시하지 않음)
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({ error: 'offline', message: '오프라인 상태입니다.' }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
          }
        )
      )
    );
    return;
  }

  // 네비게이션(HTML) 요청은 Network First: 항상 최신 페이지를 제공하고
  // 오프라인일 때만 캐시로 폴백한다. (배포 후 구버전 페이지 고착 방지)
  if (request.method === 'GET' && request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
              trimCache(CACHE_NAME, RUNTIME_MAX_ITEMS);
            });
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/'))
        )
    );
    return;
  }

  // 그 외 정적 리소스: Cache First + 런타임 캐시 크기 제한
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(request)
          .then((response) => {
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
                trimCache(CACHE_NAME, RUNTIME_MAX_ITEMS);
              });
            }
            return response;
          })
          .catch(() =>
            new Response('오프라인 상태입니다.', {
              status: 503,
              statusText: 'Service Unavailable'
            })
          );
      })
    );
  }
});

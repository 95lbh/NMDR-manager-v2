// Service Worker for offline functionality
const CACHE_NAME = 'badminton-manager-v1';
const STATIC_CACHE = 'static-v1';

// 캐시할 정적 리소스
const STATIC_ASSETS = [
  '/',
  '/game',
  '/attendance',
  '/settings',
  '/manifest.json'
];

// 설치 이벤트
self.addEventListener('install', (event) => {
  console.log('Service Worker 설치 중...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('정적 리소스 캐싱 중...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker 설치 완료');
        return self.skipWaiting();
      })
  );
});

// 활성화 이벤트
self.addEventListener('activate', (event) => {
  console.log('Service Worker 활성화 중...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
              console.log('오래된 캐시 삭제:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker 활성화 완료');
        return self.clients.claim();
      })
  );
});

// 네트워크 요청 가로채기
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API 요청 처리
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 성공적인 응답은 캐시하지 않음 (실시간 데이터)
          return response;
        })
        .catch(() => {
          // 네트워크 실패 시 오프라인 응답
          return new Response(
            JSON.stringify({ 
              error: 'offline', 
              message: '오프라인 상태입니다. 로컬 데이터를 사용합니다.' 
            }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // 정적 리소스 처리 (Cache First 전략)
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(request)
            .then((response) => {
              // 성공적인 응답만 캐시
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
              }
              return response;
            })
            .catch(() => {
              // 네트워크 실패 시 기본 오프라인 페이지
              if (request.mode === 'navigate') {
                return caches.match('/');
              }
              return new Response('오프라인 상태입니다.', {
                status: 503,
                statusText: 'Service Unavailable'
              });
            });
        })
    );
  }
});

// 백그라운드 동기화 (향후 확장용)
self.addEventListener('sync', (event) => {
  console.log('백그라운드 동기화:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // 오프라인 저장소의 대기 중인 데이터 동기화
      syncOfflineData()
    );
  }
});

// 오프라인 데이터 동기화 함수
async function syncOfflineData() {
  try {
    console.log('오프라인 데이터 동기화 시작...');
    
    // 실제 동기화 로직은 메인 스레드에서 처리
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_OFFLINE_DATA'
      });
    });
    
    console.log('오프라인 데이터 동기화 완료');
  } catch (error) {
    console.error('오프라인 데이터 동기화 실패:', error);
  }
}

// 푸시 알림 (향후 확장용)
self.addEventListener('push', (event) => {
  console.log('푸시 알림 수신:', event);
  
  const options = {
    body: '새로운 알림이 있습니다.',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('배드민턴 매니저', options)
  );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  console.log('알림 클릭:', event);
  
  event.notification.close();
  
  event.waitUntil(
    self.clients.openWindow('/')
  );
});

'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerSW = async () => {
        try {
          console.log('Service Worker 등록 시도...');
          
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
          });

          console.log('Service Worker 등록 성공:', registration);

          // 업데이트 확인
          registration.addEventListener('updatefound', () => {
            console.log('Service Worker 업데이트 발견');
            const newWorker = registration.installing;
            
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('새로운 Service Worker 설치됨. 페이지 새로고침 권장.');
                  
                  // 사용자에게 새로고침 알림 (선택사항)
                  if (confirm('새로운 버전이 설치되었습니다. 페이지를 새로고침하시겠습니까?')) {
                    window.location.reload();
                  }
                }
              });
            }
          });

          // Service Worker 메시지 수신
          navigator.serviceWorker.addEventListener('message', (event) => {
            console.log('Service Worker 메시지 수신:', event.data);
            
            if (event.data.type === 'SYNC_OFFLINE_DATA') {
              // 오프라인 데이터 동기화 트리거
              console.log('오프라인 데이터 동기화 요청됨');
              // 실제 동기화 로직은 여기에 구현
            }
          });

          // 백그라운드 동기화 등록 (지원되는 경우)
          if ('sync' in window.ServiceWorkerRegistration.prototype) {
            try {
              await registration.sync.register('background-sync');
              console.log('백그라운드 동기화 등록됨');
            } catch (error) {
              console.log('백그라운드 동기화 등록 실패:', error);
            }
          }

        } catch (error) {
          console.error('Service Worker 등록 실패:', error);
        }
      };

      // 페이지 로드 후 등록
      if (document.readyState === 'loading') {
        window.addEventListener('load', registerSW);
      } else {
        registerSW();
      }

      // 온라인/오프라인 상태 변경 감지
      const handleOnline = () => {
        console.log('온라인 상태로 변경됨');
        // 오프라인 저장소 동기화 트리거
        window.dispatchEvent(new CustomEvent('online-status-changed', { detail: { online: true } }));
      };

      const handleOffline = () => {
        console.log('오프라인 상태로 변경됨');
        window.dispatchEvent(new CustomEvent('online-status-changed', { detail: { online: false } }));
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  return null; // 이 컴포넌트는 UI를 렌더링하지 않음
}

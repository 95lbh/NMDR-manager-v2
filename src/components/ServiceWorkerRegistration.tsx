'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        // 새 버전 배포 시 새로고침 유도
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              if (
                confirm('새로운 버전이 설치되었습니다. 페이지를 새로고침하시겠습니까?')
              ) {
                window.location.reload();
              }
            }
          });
        });
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
  }, []);

  return null; // 이 컴포넌트는 UI를 렌더링하지 않음
}

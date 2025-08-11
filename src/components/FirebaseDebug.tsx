'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function FirebaseDebug() {
  const [status, setStatus] = useState<{
    config: boolean;
    connection: boolean;
    error?: string;
  }>({
    config: false,
    connection: false,
  });

  useEffect(() => {
    const checkFirebase = async () => {
      try {
        // 환경변수 확인
        const configCheck = !!(
          process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        );

        setStatus(prev => ({ ...prev, config: configCheck }));

        if (!configCheck) {
          setStatus(prev => ({ 
            ...prev, 
            error: '환경변수가 설정되지 않았습니다.' 
          }));
          return;
        }

        // Firestore 연결 테스트
        const testCollection = collection(db, 'test');
        await getDocs(testCollection);
        
        setStatus(prev => ({ ...prev, connection: true }));
      } catch (error) {
        console.error('Firebase 연결 오류:', error);
        setStatus(prev => ({ 
          ...prev, 
          connection: false,
          error: error instanceof Error ? error.message : '알 수 없는 오류'
        }));
      }
    };

    checkFirebase();
  }, []);

  // 개발 환경에서만 표시
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 bg-gray-900 text-white p-4 rounded-lg text-sm max-w-sm z-50">
      <h3 className="font-bold mb-2">🔥 Firebase 상태</h3>
      
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className={status.config ? '✅' : '❌'}></span>
          <span>환경변수: {status.config ? '설정됨' : '누락'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={status.connection ? '✅' : '❌'}></span>
          <span>Firestore: {status.connection ? '연결됨' : '연결 실패'}</span>
        </div>
      </div>

      {status.error && (
        <div className="mt-2 p-2 bg-red-900 rounded text-xs">
          <strong>오류:</strong> {status.error}
        </div>
      )}

      <div className="mt-2 text-xs opacity-75">
        <div>API Key: {process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '설정됨' : '누락'}</div>
        <div>Project ID: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '누락'}</div>
      </div>
    </div>
  );
}

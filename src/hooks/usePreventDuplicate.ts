'use client';

import { useState, useCallback } from 'react';

// 중복 요청 방지 훅
// 같은 key의 비동기 작업이 진행 중이면 중복 실행을 차단한다.
export function usePreventDuplicate() {
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());

  const executeOnce = useCallback(async <T>(
    key: string,
    asyncFunction: () => Promise<T>
  ): Promise<T | null> => {
    if (pendingRequests.has(key)) {
      console.warn(`중복 요청 방지: ${key}`);
      return null;
    }

    setPendingRequests(prev => new Set(prev).add(key));

    try {
      const result = await asyncFunction();
      return result;
    } finally {
      setPendingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  }, [pendingRequests]);

  return { executeOnce, pendingRequests };
}

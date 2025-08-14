'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Court,
  Team,
  Player,
  GameStateData,
  SyncStatus,
  OfflineAction
} from '@/types/game';

const GAME_STATE_KEY = 'nmdr-game-state';
const OFFLINE_ACTIONS_KEY = 'nmdr-offline-actions';
const DEVICE_ID_KEY = 'nmdr-device-id';
const SYNC_INTERVAL = 15000; // 15초마다 동기화
const MAX_RETRY_COUNT = 3;

// 디바이스 ID 생성
function generateDeviceId(): string {
  return `device-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// 디바이스 ID 가져오기
function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export function useGameState() {
  const [gameState, setGameState] = useState<GameStateData | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncTime: null,
    pendingChanges: 0,
    conflicts: []
  });
  const [offlineActions, setOfflineActions] = useState<OfflineAction[]>([]);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 서버와 동기화 (먼저 선언)
  const syncWithServer = useCallback(async () => {
    // 상태 체크를 함수형으로 처리
    let canSync = false;
    setSyncStatus(prev => {
      canSync = prev.isOnline && !prev.isSyncing;
      return canSync ? { ...prev, isSyncing: true } : prev;
    });

    if (!canSync) return;

    try {
      // 1. 오프라인 액션 재시도
      if (offlineActions.length > 0) {
        const successfulActions: string[] = [];
        const failedActions: OfflineAction[] = [];

        for (const action of offlineActions) {
          try {
            // 실제 서버 API 호출 시뮬레이션
            console.log('오프라인 액션 재시도 성공:', action);
            successfulActions.push(action.id);
          } catch (error) {
            console.error('오프라인 액션 재시도 실패:', action, error);
            if (action.retryCount < MAX_RETRY_COUNT) {
              failedActions.push({
                ...action,
                retryCount: action.retryCount + 1
              });
            }
          }
        }

        // 성공한 액션들 제거, 실패한 액션들 업데이트
        const remainingActions = failedActions;
        setOfflineActions(remainingActions);
        localStorage.setItem(OFFLINE_ACTIONS_KEY, JSON.stringify(remainingActions));
        setSyncStatus(prev => ({ ...prev, pendingChanges: remainingActions.length }));
      }

      // 2. 서버에서 최신 상태 가져오기 (실제 구현 시)
      // const serverState = await fetchGameStateFromServer();
      // if (serverState && gameState) {
      //   // 버전 비교로 충돌 감지
      //   if (serverState.version !== gameState.version) {
      //     const conflict: ConflictData = {
      //       id: `conflict-${Date.now()}`,
      //       type: 'court',
      //       localData: gameState,
      //       serverData: serverState,
      //       timestamp: new Date().toISOString()
      //     };
      //     setSyncStatus(prev => ({
      //       ...prev,
      //       conflicts: [...prev.conflicts, conflict]
      //     }));
      //   }
      // }

      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date()
      }));
    } catch (error) {
      console.error('서버 동기화 실패:', error);
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, [offlineActions]);

  // 온라인/오프라인 상태 감지
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true }));
      // 온라인 복구 시 즉시 동기화
      syncWithServer();
    };

    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncWithServer]);

  // 오프라인 액션 로드
  const loadOfflineActions = useCallback(() => {
    try {
      const saved = localStorage.getItem(OFFLINE_ACTIONS_KEY);
      if (saved) {
        const actions = JSON.parse(saved);
        setOfflineActions(actions);
        setSyncStatus(prev => ({ ...prev, pendingChanges: actions.length }));
      }
    } catch (error) {
      console.error('오프라인 액션 로드 실패:', error);
    }
  }, []);

  // 오프라인 액션 저장
  const saveOfflineAction = useCallback((action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>) => {
    const newAction: OfflineAction = {
      ...action,
      id: `action-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toISOString(),
      retryCount: 0
    };

    setOfflineActions(prev => {
      const updated = [...prev, newAction];
      localStorage.setItem(OFFLINE_ACTIONS_KEY, JSON.stringify(updated));
      return updated;
    });

    setSyncStatus(prev => ({ ...prev, pendingChanges: prev.pendingChanges + 1 }));
  }, []);

  // 로컬 스토리지에서 게임 상태 로드
  const loadGameState = useCallback(() => {
    try {
      const saved = localStorage.getItem(GAME_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // 2시간 이내의 데이터만 유효
        const savedTime = new Date(parsed.lastUpdated);
        const now = new Date();
        const hoursDiff = (now.getTime() - savedTime.getTime()) / (1000 * 60 * 60);

        if (hoursDiff < 2) {
          setGameState(parsed);
          return parsed;
        } else {
          // 오래된 데이터는 삭제
          localStorage.removeItem(GAME_STATE_KEY);
        }
      }
    } catch (error) {
      console.error('게임 상태 로드 실패:', error);
      localStorage.removeItem(GAME_STATE_KEY);
    }
    return null;
  }, []);

  // 로컬 스토리지에 게임 상태 저장
  const saveGameState = useCallback((courts: Court[], teams: Team[], availablePlayers: Player[]) => {
    try {
      setGameState(prevState => {
        const currentState = prevState || { version: 0, deviceId: getDeviceId() };
        const stateData: GameStateData = {
          courts,
          teams,
          availablePlayers,
          lastUpdated: new Date().toISOString(),
          version: currentState.version + 1,
          deviceId: getDeviceId()
        };
        localStorage.setItem(GAME_STATE_KEY, JSON.stringify(stateData));

        // 오프라인 상태면 액션 큐에 추가
        setSyncStatus(prev => {
          if (!prev.isOnline) {
            saveOfflineAction({
              type: 'UPDATE_GAME_STATE',
              data: stateData
            });
          }
          return prev;
        });

        return stateData;
      });
    } catch (error) {
      console.error('게임 상태 저장 실패:', error);
    }
  }, [saveOfflineAction]);

  // 게임 상태 클리어
  const clearGameState = useCallback(() => {
    localStorage.removeItem(GAME_STATE_KEY);
    setGameState(null);
  }, []);





  // 충돌 해결
  const resolveConflict = useCallback((conflictId: string, resolution: 'local' | 'server') => {
    setSyncStatus(prev => ({
      ...prev,
      conflicts: prev.conflicts.filter(c => c.id !== conflictId)
    }));

    // 해결된 충돌에 따라 상태 업데이트
    const conflict = syncStatus.conflicts.find(c => c.id === conflictId);
    if (conflict && resolution === 'server') {
      // 서버 데이터로 덮어쓰기 (전체 게임 상태 업데이트)
      setGameState(prevState => {
        if (prevState && conflict.serverData) {
          const updatedGameState = { ...prevState };
          // 실제 구현에서는 conflict.type에 따라 적절한 부분만 업데이트
          localStorage.setItem(GAME_STATE_KEY, JSON.stringify(updatedGameState));
          return updatedGameState;
        }
        return prevState;
      });
    }
    // 로컬 데이터 유지는 별도 처리 불필요 (이미 로컬에 있음)
  }, [syncStatus.conflicts]);

  // 주기적 동기화 설정
  useEffect(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    const scheduleSync = () => {
      syncTimeoutRef.current = setTimeout(() => {
        syncWithServer().finally(() => {
          scheduleSync(); // 다음 동기화 예약
        });
      }, SYNC_INTERVAL);
    };

    scheduleSync();

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [syncWithServer]);

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    loadGameState();
    loadOfflineActions();
  }, [loadGameState, loadOfflineActions]);

  return {
    gameState,
    syncStatus,
    offlineActions,
    loadGameState,
    saveGameState,
    clearGameState,
    syncWithServer,
    resolveConflict,
    saveOfflineAction
  };
}

// 디바운스 훅 (중복 요청 방지)
export function useDebounce<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      const timer = setTimeout(() => {
        callback(...args);
      }, delay);

      setDebounceTimer(timer);
    },
    [callback, delay, debounceTimer]
  ) as T;

  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return debouncedCallback;
}

// 중복 요청 방지 훅
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

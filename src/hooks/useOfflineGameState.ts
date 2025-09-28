'use client';

import { useState, useEffect, useCallback } from 'react';
import { Skill, Gender } from '@/types/db';
import OfflineStorage from '@/lib/offline-storage';

// 타입 정의 (game/page.tsx와 동일)
interface Player {
  id: string;
  name: string;
  skill: Skill;
  gender: Gender;
  gamesPlayedToday: number;
  isGuest: boolean;
}

interface Team {
  id: string;
  players: Player[];
  createdAt: Date;
}

interface Court {
  id: number;
  status: "idle" | "playing" | "finished";
  team?: Team;
  startedAt?: Date;
  duration?: number; // 분 단위
}

interface UseOfflineGameStateReturn {
  courts: Court[];
  teams: Team[];
  availablePlayers: Player[];
  isOnline: boolean;
  pendingSyncCount: number;
  loading: boolean;
  
  // 즉시 반응 액션들
  updateCourtsInstant: (courts: Court[]) => void;
  updateTeamsInstant: (teams: Team[]) => void;
  updatePlayersInstant: (players: Player[]) => void;
  updateGameStateInstant: (courts: Court[], teams: Team[], players: Player[]) => void;
  
  // 동기화 관련
  forceSync: () => Promise<void>;
  clearPendingSync: () => void;
}

export function useOfflineGameState(): UseOfflineGameStateReturn {
  const [courts, setCourts] = useState<Court[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const offlineStorage = typeof window !== 'undefined' ? OfflineStorage.getInstance() : null;

  // 초기 데이터 로드
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // 클라이언트 사이드에서만 로컬 데이터 로드
        if (offlineStorage) {
          const localState = await offlineStorage.loadGameState();

          if (localState) {
            setCourts(localState.courts);
            setTeams(localState.teams);
            setAvailablePlayers(localState.availablePlayers);
            console.log('📂 로컬 데이터 로드 완료');
          }

          // 온라인 상태 업데이트
          setIsOnline(offlineStorage.getOnlineStatus());
          setPendingSyncCount(offlineStorage.getPendingSyncCount());
        }
        
      } catch (error) {
        console.error('❌ 초기 데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [offlineStorage]);

  // 온라인 상태 모니터링
  useEffect(() => {
    if (!offlineStorage) return;

    const updateOnlineStatus = () => {
      const online = offlineStorage.getOnlineStatus();
      setIsOnline(online);
      setPendingSyncCount(offlineStorage.getPendingSyncCount());
    };

    // 주기적으로 상태 업데이트
    const interval = setInterval(updateOnlineStatus, 1000);

    return () => clearInterval(interval);
  }, [offlineStorage]);

  // 코트 상태 즉시 업데이트
  const updateCourtsInstant = useCallback((newCourts: Court[]) => {
    setCourts(newCourts);

    // 백그라운드에서 저장 (비동기, 논블로킹)
    if (offlineStorage) {
      setTimeout(() => {
        offlineStorage.saveGameStateInstant(newCourts, teams, availablePlayers);
      }, 0);
    }

    console.log('⚡ 코트 상태 즉시 업데이트');
  }, [teams, availablePlayers, offlineStorage]);

  // 팀 상태 즉시 업데이트
  const updateTeamsInstant = useCallback((newTeams: Team[]) => {
    setTeams(newTeams);

    // 백그라운드에서 저장 (비동기, 논블로킹)
    if (offlineStorage) {
      setTimeout(() => {
        offlineStorage.saveGameStateInstant(courts, newTeams, availablePlayers);
      }, 0);
    }

    console.log('⚡ 팀 상태 즉시 업데이트');
  }, [courts, availablePlayers, offlineStorage]);

  // 플레이어 상태 즉시 업데이트
  const updatePlayersInstant = useCallback((newPlayers: Player[]) => {
    setAvailablePlayers(newPlayers);

    // 백그라운드에서 저장 (비동기, 논블로킹)
    if (offlineStorage) {
      setTimeout(() => {
        offlineStorage.saveGameStateInstant(courts, teams, newPlayers);
      }, 0);
    }

    console.log('⚡ 플레이어 상태 즉시 업데이트');
  }, [courts, teams, offlineStorage]);

  // 전체 게임 상태 즉시 업데이트
  const updateGameStateInstant = useCallback((newCourts: Court[], newTeams: Team[], newPlayers: Player[]) => {
    setCourts(newCourts);
    setTeams(newTeams);
    setAvailablePlayers(newPlayers);

    // 백그라운드에서 저장 (비동기, 논블로킹)
    if (offlineStorage) {
      setTimeout(() => {
        offlineStorage.saveGameStateInstant(newCourts, newTeams, newPlayers);
      }, 0);
    }

    console.log('⚡ 전체 게임 상태 즉시 업데이트');
  }, [offlineStorage]);

  // 강제 동기화
  const forceSync = useCallback(async () => {
    if (!offlineStorage) return;

    try {
      await offlineStorage.forcSync();
      setPendingSyncCount(offlineStorage.getPendingSyncCount());
      console.log('🔄 강제 동기화 완료');
    } catch (error) {
      console.error('❌ 강제 동기화 실패:', error);
    }
  }, [offlineStorage]);

  // 대기 중인 동기화 클리어
  const clearPendingSync = useCallback(() => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem('sync_queue');
    setPendingSyncCount(0);
    console.log('🗑️ 대기 중인 동기화 클리어');
  }, []);

  return {
    courts,
    teams,
    availablePlayers,
    isOnline,
    pendingSyncCount,
    loading,
    
    updateCourtsInstant,
    updateTeamsInstant,
    updatePlayersInstant,
    updateGameStateInstant,
    
    forceSync,
    clearPendingSync
  };
}

'use client';

import { Skill, Gender } from '@/types/db';

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

// 오프라인 저장소 인터페이스
interface OfflineGameState {
  courts: Court[];
  teams: Team[];
  availablePlayers: Player[];
  lastUpdated: number;
  pendingSync: boolean;
}

// 동기화 큐 아이템
interface SyncQueueItem {
  id: string;
  type: 'courts' | 'teams' | 'players';
  action: 'create' | 'update' | 'delete';
  data: unknown;
  timestamp: number;
  retryCount: number;
}

class OfflineStorage {
  private static instance: OfflineStorage;
  private syncQueue: SyncQueueItem[] = [];
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;

  static getInstance(): OfflineStorage {
    if (!OfflineStorage.instance) {
      OfflineStorage.instance = new OfflineStorage();
    }
    return OfflineStorage.instance;
  }

  constructor() {
    // 클라이언트 사이드에서만 초기화
    if (typeof window !== 'undefined') {
      this.initializeOnlineStatus();
      this.loadSyncQueue();
    }
  }

  // 온라인 상태 모니터링
  private initializeOnlineStatus() {
    if (typeof window === 'undefined') return;

    this.isOnline = navigator.onLine;

    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('🌐 온라인 상태로 변경됨');
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📱 오프라인 상태로 변경됨');
    });
  }

  // 게임 상태 즉시 로컬 저장
  async saveGameStateInstant(courts: Court[], teams: Team[], availablePlayers: Player[]): Promise<void> {
    if (typeof window === 'undefined') return;

    const gameState: OfflineGameState = {
      courts,
      teams,
      availablePlayers,
      lastUpdated: Date.now(),
      pendingSync: !this.isOnline
    };

    try {
      localStorage.setItem('offline_game_state', JSON.stringify(gameState));
      console.log('💾 게임 상태 로컬 저장 완료');

      // 온라인이면 백그라운드에서 동기화
      if (this.isOnline && !this.syncInProgress) {
        this.queueForSync('courts', 'update', courts);
        this.queueForSync('teams', 'update', teams);
        this.processSyncQueue();
      }
    } catch (error) {
      console.error('❌ 로컬 저장 실패:', error);
    }
  }

  // 로컬 게임 상태 로드
  async loadGameState(): Promise<OfflineGameState | null> {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem('offline_game_state');
      if (stored) {
        const gameState = JSON.parse(stored) as OfflineGameState;
        console.log('📂 로컬 게임 상태 로드 완료');
        return gameState;
      }
    } catch (error) {
      console.error('❌ 로컬 로드 실패:', error);
    }
    return null;
  }

  // 동기화 큐에 추가
  private queueForSync(type: SyncQueueItem['type'], action: SyncQueueItem['action'], data: unknown) {
    const item: SyncQueueItem = {
      id: `${type}_${action}_${Date.now()}`,
      type,
      action,
      data,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.syncQueue.push(item);
    this.saveSyncQueue();
  }

  // 동기화 큐 저장
  private saveSyncQueue() {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('❌ 동기화 큐 저장 실패:', error);
    }
  }

  // 동기화 큐 로드
  private loadSyncQueue() {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('sync_queue');
      if (stored) {
        this.syncQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('❌ 동기화 큐 로드 실패:', error);
      this.syncQueue = [];
    }
  }

  // 동기화 큐 처리
  private async processSyncQueue() {
    if (!this.isOnline || this.syncInProgress || this.syncQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    console.log(`🔄 동기화 시작 (${this.syncQueue.length}개 항목)`);

    const itemsToProcess = [...this.syncQueue];
    
    for (const item of itemsToProcess) {
      try {
        await this.syncItem(item);
        // 성공하면 큐에서 제거
        this.syncQueue = this.syncQueue.filter(q => q.id !== item.id);
      } catch (error) {
        console.error(`❌ 동기화 실패 (${item.id}):`, error);
        
        // 재시도 횟수 증가
        const queueItem = this.syncQueue.find(q => q.id === item.id);
        if (queueItem) {
          queueItem.retryCount++;
          
          // 최대 재시도 횟수 초과시 제거
          if (queueItem.retryCount > 3) {
            console.warn(`⚠️ 최대 재시도 초과, 항목 제거: ${item.id}`);
            this.syncQueue = this.syncQueue.filter(q => q.id !== item.id);
          }
        }
      }
    }

    this.saveSyncQueue();
    this.syncInProgress = false;
    
    console.log(`✅ 동기화 완료 (남은 항목: ${this.syncQueue.length}개)`);
  }

  // 개별 항목 동기화
  private async syncItem(item: SyncQueueItem): Promise<void> {
    // 실제 Supabase 동기화 로직은 여기에 구현
    // 현재는 시뮬레이션
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`🔄 동기화 완료: ${item.type} ${item.action}`);
        resolve();
      }, 100);
    });
  }

  // 온라인 상태 확인
  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  // 대기 중인 동기화 항목 수
  getPendingSyncCount(): number {
    return this.syncQueue.length;
  }

  // 강제 동기화
  async forcSync(): Promise<void> {
    if (this.isOnline) {
      await this.processSyncQueue();
    }
  }
}

export default OfflineStorage;

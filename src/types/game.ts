// 공통 게임 타입 정의

export interface Player {
  id: string;
  name: string;
  skill: string;
  gender: 'M' | 'F';
  isGuest: boolean;
  gamesPlayedToday: number;
}

export interface Team {
  id: string;
  players: Player[];
  createdAt: Date;
}

export interface Court {
  id: number;
  status: 'idle' | 'playing' | 'finished';
  team?: Team;
  startedAt?: Date;
  duration?: number;
}

export interface GameStateData {
  courts: Court[];
  teams: Team[];
  availablePlayers: Player[];
  lastUpdated: string;
  version: number;
  deviceId: string;
}

export interface ConflictData {
  id: string;
  type: 'court' | 'team' | 'player';
  localData: Court | Team | Player;
  serverData: Court | Team | Player;
  timestamp: string;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingChanges: number;
  conflicts: ConflictData[];
}

export interface OfflineAction {
  id: string;
  type: string;
  data: GameStateData | Court | Team | Player;
  timestamp: string;
  retryCount: number;
}

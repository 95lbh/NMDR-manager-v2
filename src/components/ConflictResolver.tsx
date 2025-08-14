'use client';

import React from 'react';
import type { Court, Team, Player, ConflictData, SyncStatus } from '@/types/game';

interface ConflictResolverProps {
  conflicts: ConflictData[];
  onResolve: (conflictId: string, resolution: 'local' | 'server') => void;
  onClose: () => void;
}

export function ConflictResolver({ conflicts, onResolve, onClose }: ConflictResolverProps) {
  if (conflicts.length === 0) return null;

  const formatData = (data: Court | Team | Player, type: string) => {
    switch (type) {
      case 'court':
        const courtData = data as Court;
        return `코트 ${courtData.id}: ${courtData.status} ${courtData.team ? `(팀: ${courtData.team.players.map(p => p.name).join(', ')})` : '(빈 코트)'}`;
      case 'team':
        const teamData = data as Team;
        return `팀 ${teamData.id}: ${teamData.players.map(p => p.name).join(', ')}`;
      case 'player':
        const playerData = data as Player;
        return `${playerData.name} (${playerData.skill}급, ${playerData.gender === 'M' ? '남' : '여'})`;
      default:
        return JSON.stringify(data, null, 2);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-red-600">⚠️ 데이터 충돌 감지</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ✕
          </button>
        </div>

        <p className="text-gray-600 mb-6">
          로컬 데이터와 서버 데이터가 다릅니다. 어떤 데이터를 사용할지 선택해주세요.
        </p>

        <div className="space-y-6">
          {conflicts.map((conflict) => (
            <div key={conflict.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">
                  {conflict.type === 'court' && '🏸 코트 상태'}
                  {conflict.type === 'team' && '👥 팀 구성'}
                  {conflict.type === 'player' && '🏃 플레이어 정보'}
                </h3>
                <span className="text-sm text-gray-500">
                  {new Date(conflict.timestamp).toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* 로컬 데이터 */}
                <div className="border border-blue-200 rounded p-3 bg-blue-50">
                  <h4 className="font-medium text-blue-800 mb-2">📱 로컬 데이터 (현재 기기)</h4>
                  <div className="text-sm text-blue-700 bg-white p-2 rounded">
                    {formatData(conflict.localData, conflict.type)}
                  </div>
                </div>

                {/* 서버 데이터 */}
                <div className="border border-green-200 rounded p-3 bg-green-50">
                  <h4 className="font-medium text-green-800 mb-2">☁️ 서버 데이터 (다른 기기)</h4>
                  <div className="text-sm text-green-700 bg-white p-2 rounded">
                    {formatData(conflict.serverData, conflict.type)}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => onResolve(conflict.id, 'local')}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  📱 로컬 데이터 사용
                </button>
                <button
                  onClick={() => onResolve(conflict.id, 'server')}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                  ☁️ 서버 데이터 사용
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h4 className="font-medium text-yellow-800 mb-2">💡 선택 가이드</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• <strong>로컬 데이터</strong>: 현재 기기에서 작업한 최신 내용을 유지</li>
            <li>• <strong>서버 데이터</strong>: 다른 기기나 사용자의 변경사항을 적용</li>
            <li>• 확실하지 않다면 최신 시간의 데이터를 선택하는 것을 권장합니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// 동기화 상태 표시 컴포넌트
interface SyncStatusProps {
  syncStatus: SyncStatus;
  onSync: () => void;
}

export function SyncStatusIndicator({ syncStatus, onSync }: SyncStatusProps) {
  const getStatusColor = () => {
    if (!syncStatus.isOnline) return 'bg-red-500';
    if (syncStatus.isSyncing) return 'bg-yellow-500';
    if (syncStatus.conflicts.length > 0) return 'bg-orange-500';
    if (syncStatus.pendingChanges > 0) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!syncStatus.isOnline) return '오프라인';
    if (syncStatus.isSyncing) return '동기화 중...';
    if (syncStatus.conflicts.length > 0) return `충돌 ${syncStatus.conflicts.length}개`;
    if (syncStatus.pendingChanges > 0) return `대기 중 ${syncStatus.pendingChanges}개`;
    return '동기화됨';
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div 
        className={`${getStatusColor()} text-white px-3 py-2 rounded-full shadow-lg flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity`}
        onClick={onSync}
      >
        <div className={`w-2 h-2 rounded-full bg-white ${syncStatus.isSyncing ? 'animate-pulse' : ''}`}></div>
        <span className="text-sm font-medium">{getStatusText()}</span>
        {syncStatus.lastSyncTime && (
          <span className="text-xs opacity-75">
            {syncStatus.lastSyncTime.toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}

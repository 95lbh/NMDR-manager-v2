'use client';

import { useState, useEffect } from 'react';

interface OnlineStatusIndicatorProps {
  isOnline: boolean;
  pendingSyncCount: number;
  onForceSync?: () => void;
  className?: string;
}

export default function OnlineStatusIndicator({ 
  isOnline, 
  pendingSyncCount, 
  onForceSync,
  className = ""
}: OnlineStatusIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // 동기화 완료 시 시간 업데이트
  useEffect(() => {
    if (isOnline && pendingSyncCount === 0) {
      setLastSyncTime(new Date());
    }
  }, [isOnline, pendingSyncCount]);

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (pendingSyncCount > 0) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!isOnline) return '오프라인';
    if (pendingSyncCount > 0) return `동기화 대기 (${pendingSyncCount})`;
    return '온라인';
  };

  const getStatusIcon = () => {
    if (!isOnline) return '📱';
    if (pendingSyncCount > 0) return '🔄';
    return '🌐';
  };

  const formatLastSyncTime = () => {
    if (!lastSyncTime) return '동기화 기록 없음';
    
    const now = new Date();
    const diff = now.getTime() - lastSyncTime.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    
    return lastSyncTime.toLocaleDateString();
  };

  return (
    <div className={`relative ${className}`}>
      {/* 메인 상태 표시 */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-medium transition-all duration-200 hover:scale-105 ${
          isOnline ? 'hover:shadow-lg' : ''
        }`}
        style={{
          backgroundColor: isOnline 
            ? pendingSyncCount > 0 
              ? '#f59e0b' 
              : '#10b981'
            : '#ef4444'
        }}
      >
        <span className="text-xs">{getStatusIcon()}</span>
        <span className="hidden sm:inline">{getStatusText()}</span>
        <span className="sm:hidden">
          {!isOnline ? '오프라인' : pendingSyncCount > 0 ? `${pendingSyncCount}` : '온라인'}
        </span>
        
        {/* 동기화 애니메이션 */}
        {pendingSyncCount > 0 && (
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        )}
      </button>

      {/* 상세 정보 팝오버 */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
          <div className="space-y-3">
            {/* 상태 정보 */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">연결 상태</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
                <span className="text-sm text-gray-600">{getStatusText()}</span>
              </div>
            </div>

            {/* 마지막 동기화 시간 */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">마지막 동기화</span>
              <span className="text-sm text-gray-600">{formatLastSyncTime()}</span>
            </div>

            {/* 대기 중인 변경사항 */}
            {pendingSyncCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">대기 중인 변경</span>
                <span className="text-sm text-orange-600 font-medium">{pendingSyncCount}개</span>
              </div>
            )}

            {/* 액션 버튼들 */}
            <div className="pt-2 border-t border-gray-100 space-y-2">
              {isOnline && pendingSyncCount > 0 && onForceSync && (
                <button
                  onClick={() => {
                    onForceSync();
                    setShowDetails(false);
                  }}
                  className="w-full px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                >
                  지금 동기화
                </button>
              )}
              
              <button
                onClick={() => setShowDetails(false)}
                className="w-full px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
              >
                닫기
              </button>
            </div>

            {/* 오프라인 모드 안내 */}
            {!isOnline && (
              <div className="pt-2 border-t border-gray-100">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-red-500 text-sm">⚠️</span>
                    <div className="text-xs text-red-700">
                      <p className="font-medium mb-1">오프라인 모드</p>
                      <p>모든 변경사항이 로컬에 저장됩니다. 인터넷 연결 시 자동으로 동기화됩니다.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 배경 클릭 시 닫기 */}
      {showDetails && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDetails(false)}
        />
      )}
    </div>
  );
}

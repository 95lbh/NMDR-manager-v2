'use client';

import { useFullscreen } from '@/hooks/useFullscreen';

export default function FullscreenButton() {
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  return (
    <button
      onClick={toggleFullscreen}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
      title={isFullscreen ? '전체화면 해제' : '전체화면'}
    >
      {isFullscreen ? (
        // 전체화면 해제 아이콘
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white"
        >
          <path d="M8 3v3a2 2 0 0 1-2 2H3"/>
          <path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
          <path d="M3 16h3a2 2 0 0 1 2 2v3"/>
          <path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
        </svg>
      ) : (
        // 전체화면 아이콘
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white"
        >
          <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
          <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
          <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
          <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
        </svg>
      )}
      <span className="text-sm font-medium">
        {isFullscreen ? '전체화면 해제' : '전체화면'}
      </span>
    </button>
  );
}

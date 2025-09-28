'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function PageNavigation() {
  const pathname = usePathname();
  
  // 각 페이지별로 다른 버튼 표시
  const getNavigationButton = () => {
    switch (pathname) {
      case '/attendance':
        return (
          <Link
            href="/game"
            className="flex items-center gap-1 sm:gap-2 px-2 py-2 sm:px-4 sm:py-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            aria-label="게임"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white sm:w-[18px] sm:h-[18px]">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
            </svg>
            <span className="text-xs sm:text-sm font-medium hidden xs:inline">게임판으로 이동</span>
            <span className="text-xs sm:text-sm font-medium xs:hidden">게임판</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white sm:w-4 sm:h-4">
              <path d="M5 12h14m-7-7 7 7-7 7"/>
            </svg>
          </Link>
        );
      case '/game':
        return (
          <Link
            href="/attendance"
            className="flex items-center gap-1 sm:gap-2 px-2 py-2 sm:px-4 sm:py-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            aria-label="출석"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white sm:w-[18px] sm:h-[18px]">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs sm:text-sm font-medium hidden xs:inline">출석 페이지로 이동</span>
            <span className="text-xs sm:text-sm font-medium xs:hidden">출석</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white sm:w-4 sm:h-4">
              <path d="M5 12h14m-7-7 7 7-7 7"/>
            </svg>
          </Link>
        );
      case '/settings':
        return (
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
            <Link
              href="/attendance"
              className="flex items-center gap-1 sm:gap-2 px-2 py-2 sm:px-3 lg:px-4 sm:py-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              aria-label="출석"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white sm:w-4 sm:h-4">
                <path d="M19 12H5m7-7-7 7 7 7"/>
              </svg>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white sm:w-[18px] sm:h-[18px]">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs sm:text-sm font-medium hidden sm:inline">출석 페이지</span>
              <span className="text-xs font-medium sm:hidden">출석</span>
            </Link>
            <Link
              href="/game"
              className="flex items-center gap-1 sm:gap-2 px-2 py-2 sm:px-3 lg:px-4 sm:py-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              aria-label="게임판"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white sm:w-[18px] sm:h-[18px]">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
              </svg>
              <span className="text-xs sm:text-sm font-medium hidden sm:inline">게임판</span>
              <span className="text-xs font-medium sm:hidden">게임</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white sm:w-4 sm:h-4">
                <path d="M5 12h14m-7-7 7 7-7 7"/>
              </svg>
            </Link>
          </div>
        );
      default:
        return null;
    }
  };

  const navigationButton = getNavigationButton();
  
  if (!navigationButton) {
    return null;
  }

  return navigationButton;
}

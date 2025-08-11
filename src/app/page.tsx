import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen flex items-start justify-center pt-20 p-8" style={{backgroundColor: 'var(--notion-bg-secondary)'}}>
      <div className="flex flex-col items-center gap-8 w-full max-w-4xl">
        {/* 로고 섹션 */}
        <div className="flex flex-col items-center gap-6">
          <Image
            src="/icons/logo.png"
            alt="N.M.D.R Logo"
            width={350}
            height={300}
            className="rounded-2xl shadow-lg"
          />
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight mb-2" style={{color: 'var(--notion-text)'}}>Team. N.M.D.R</h1>
            <p className="text-lg" style={{color: 'var(--notion-text-light)'}}>내맘대로 클럽 매니저</p>
          </div>
        </div>

        {/* 메인 버튼 섹션 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
          <Link
            href="/attendance"
            className="notion-card group h-58 flex flex-col items-center justify-center text-center cursor-pointer hover:scale-[1.02] transition-all duration-200"
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 notion-badge-blue relative overflow-hidden">
              {/* 배경 그라데이션 효과 */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 opacity-20 group-hover:opacity-30 transition-opacity"></div>

              {/* 출석부 아이콘 */}
              <svg className="w-8 h-8 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                <circle cx="5.5" cy="8.5" r="1.5" fill="currentColor"/>
                <circle cx="5.5" cy="12.5" r="1.5" fill="currentColor"/>
                <circle cx="5.5" cy="16.5" r="1.5" fill="currentColor"/>
              </svg>
            </div>
            <h2 className="text-3xl font-semibold mb-2" style={{color: 'var(--notion-text)'}}>출석</h2>
            <p className="text-sm" style={{color: 'var(--notion-text-light)'}}>회원과 게스트의 출석을 기록하고 관리합니다</p>
          </Link>

          <Link
            href="/game"
            className="notion-card group h-58 flex flex-col items-center justify-center text-center cursor-pointer hover:scale-[1.02] transition-all duration-200"
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 notion-badge-green relative overflow-hidden">
              {/* 배경 그라데이션 효과 */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-600 opacity-20 group-hover:opacity-30 transition-opacity"></div>

              {/* 배드민턴 라켓 아이콘 */}
              <svg className="w-8 h-8 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                {/* 라켓 헤드 */}
                <ellipse cx="12" cy="8" rx="5" ry="6" fill="none" stroke="currentColor" strokeWidth="2"/>
                {/* 라켓 손잡이 */}
                <rect x="11" y="14" width="2" height="8" fill="currentColor"/>
                {/* 라켓 그립 끝 */}
                <rect x="10.5" y="21" width="3" height="1.5" rx="0.75" fill="currentColor"/>
                {/* 라켓 스트링 (가로) */}
                <line x1="8" y1="6" x2="16" y2="6" stroke="currentColor" strokeWidth="0.5"/>
                <line x1="8" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="0.5"/>
                <line x1="8" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="0.5"/>
                {/* 라켓 스트링 (세로) */}
                <line x1="10" y1="3" x2="10" y2="13" stroke="currentColor" strokeWidth="0.5"/>
                <line x1="12" y1="2.5" x2="12" y2="13.5" stroke="currentColor" strokeWidth="0.5"/>
                <line x1="14" y1="3" x2="14" y2="13" stroke="currentColor" strokeWidth="0.5"/>
                {/* 셔틀콕 */}
                <circle cx="18" cy="5" r="1.5" fill="currentColor" opacity="0.7"/>
                <path d="M18 3.5 L19 2 L17 2 Z" fill="currentColor" opacity="0.7"/>
              </svg>
            </div>
            <h2 className="text-3xl font-semibold mb-2" style={{color: 'var(--notion-text)'}}>게임</h2>
            <p className="text-sm" style={{color: 'var(--notion-text-light)'}}>게임을 구성하고 결과를 기록합니다</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

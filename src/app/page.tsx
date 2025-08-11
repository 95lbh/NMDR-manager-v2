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
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 notion-badge-blue">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-semibold mb-2" style={{color: 'var(--notion-text)'}}>출석</h2>
            <p className="text-sm" style={{color: 'var(--notion-text-light)'}}>회원과 게스트의 출석을 기록하고 관리합니다</p>
          </Link>

          <Link
            href="/game"
            className="notion-card group h-58 flex flex-col items-center justify-center text-center cursor-pointer hover:scale-[1.02] transition-all duration-200"
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 notion-badge-green">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
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

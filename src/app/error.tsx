"use client";

import { useEffect } from "react";

// 페이지 세그먼트 에러 바운더리 (상단 네비게이션은 유지된 채 폴백 UI 표시).
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("페이지 오류:", error);
  }, [error]);

  return (
    <main
      className="min-h-screen flex items-center justify-center p-8"
      style={{ backgroundColor: "var(--notion-bg-secondary)" }}
    >
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">⚠️</div>
        <h2
          className="text-xl font-bold mb-2"
          style={{ color: "var(--notion-text)" }}
        >
          문제가 발생했습니다
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--notion-text-light)" }}>
          일시적인 오류일 수 있습니다. 다시 시도해 주세요.
        </p>
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-lg text-white font-medium shadow-md hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#10b981" }}
        >
          다시 시도
        </button>
      </div>
    </main>
  );
}

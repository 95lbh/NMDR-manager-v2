"use client";

// 루트 레이아웃 자체가 실패했을 때의 최종 폴백.
// (여기서는 globals.css가 적용되지 않을 수 있어 인라인 스타일을 쓴다.)
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            backgroundColor: "#f7f7f5",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: "28rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                marginBottom: "0.5rem",
                color: "#37352f",
              }}
            >
              앱을 불러오지 못했습니다
            </h2>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#787066",
                marginBottom: "1.5rem",
              }}
            >
              페이지를 새로고침하거나 다시 시도해 주세요.
              {error?.digest ? ` (${error.digest})` : ""}
            </p>
            <button
              onClick={reset}
              style={{
                padding: "0.625rem 1.25rem",
                borderRadius: "0.5rem",
                color: "white",
                fontWeight: 500,
                backgroundColor: "#10b981",
                border: "none",
                cursor: "pointer",
              }}
            >
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

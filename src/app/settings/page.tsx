export default function SettingsPage() {
  return (
    <main className="min-h-screen p-8 space-y-6">
      <h2 className="text-2xl font-semibold">설정</h2>
      <section className="border rounded-lg p-4">
        <h3 className="font-medium mb-2">회원 목록 관리</h3>
        <div className="text-sm opacity-70">수정/삭제 UI (구현 예정)</div>
      </section>
      <section className="border rounded-lg p-4">
        <h3 className="font-medium mb-2">코트 설정</h3>
        <div className="text-sm opacity-70">코트 수/배치 설정 (구현 예정)</div>
      </section>
      <section className="border rounded-lg p-4">
        <h3 className="font-medium mb-2">초기화</h3>
        <div className="text-sm opacity-70">회원 목록/통계 초기화 (구현 예정)</div>
      </section>
      <section className="border rounded-lg p-4">
        <h3 className="font-medium mb-2">통계</h3>
        <div className="text-sm opacity-70">출석/총 게임 횟수 등 (구현 예정)</div>
      </section>
    </main>
  );
}


export default function GamePage() {
  return (
    <main className="min-h-screen p-8 flex flex-col gap-6">
      <h2 className="text-2xl font-semibold">게임</h2>
      <section className="border rounded-lg p-4">
        <h3 className="font-medium mb-2">게임 참가 대기 팀</h3>
        <div className="text-sm opacity-70">4명 묶음 대기열 UI (구현 예정)</div>
      </section>
      <section className="border rounded-lg p-4">
        <h3 className="font-medium mb-2">코트</h3>
        <div className="text-sm opacity-70">코트별 현재 게임 현황 + 드래그/할당 (구현 예정)</div>
      </section>
    </main>
  );
}


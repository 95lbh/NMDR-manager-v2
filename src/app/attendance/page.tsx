export default function AttendancePage() {
  return (
    <main className="min-h-screen p-8">
      <h2 className="text-2xl font-semibold mb-6">출석</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="p-4 border rounded-lg">
          <h3 className="font-medium mb-3">회원 추가</h3>
          <div className="text-sm opacity-70">이름/출생년도/성별/실력 등급(S~F) 입력 폼 (구현 예정)</div>
        </section>
        <section className="p-4 border rounded-lg">
          <h3 className="font-medium mb-3">게스트 추가</h3>
          <div className="text-sm opacity-70">오늘만 활동하는 게스트 입력 폼 (구현 예정)</div>
        </section>
        <section className="p-4 border rounded-lg">
          <h3 className="font-medium mb-3">출석하기</h3>
          <div className="text-sm opacity-70">회원 카드 리스트 + 셔틀콕 개수 선택 (구현 예정)</div>
        </section>
      </div>
    </main>
  );
}


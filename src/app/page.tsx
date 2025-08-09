import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-8 w-full max-w-[960px]">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">N.M.D.R</h1>
        <p className="text-base sm:text-lg opacity-80">배드민턴 매니저</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
          <Link
            href="/attendance"
            className="w-full h-40 sm:h-56 flex items-center justify-center rounded-xl border border-foreground/20 hover:bg-foreground/10 text-2xl font-semibold transition"
          >
            출석
          </Link>
          <Link
            href="/game"
            className="w-full h-40 sm:h-56 flex items-center justify-center rounded-xl border border-foreground/20 hover:bg-foreground/10 text-2xl font-semibold transition"
          >
            게임
          </Link>
        </div>
      </div>
    </main>
  );
}

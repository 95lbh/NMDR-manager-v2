import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "N.M.D.R",
  description: "배드민턴 매니저 - N.M.D.R",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {/* 우측 상단 고정 설정 버튼 */}
        <div className="fixed top-4 right-4 z-50">
          <Link
            href="/settings"
            className="text-xs sm:text-sm px-3 py-2 rounded-md border border-foreground/20 hover:bg-foreground/10 transition"
            aria-label="설정"
          >
            설정
          </Link>
        </div>
        <div className="min-h-screen w-full min-w-[1024px] flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}

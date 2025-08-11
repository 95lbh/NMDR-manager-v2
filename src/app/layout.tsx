import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PageNavigation from "@/components/PageNavigation";
import { AlertProvider } from "@/components/CustomAlert";
import FullscreenButton from "@/components/FullscreenButton";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "N.M.D.R - 배드민턴 매니저",
  description: "배드민턴 클럽 출석 관리 및 게임 매칭 시스템",
  keywords: "배드민턴, 클럽관리, 출석관리, 게임관리, PWA",
  authors: [{ name: "N.M.D.R Team" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-167x167.png", sizes: "167x167", type: "image/png" },
      { url: "/icons/icon-180x180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "N.M.D.R",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "N.M.D.R",
    title: "N.M.D.R - 배드민턴 매니저",
    description: "배드민턴 클럽 출석 관리 및 게임 매칭 시스템",
  },
  twitter: {
    card: "summary",
    title: "N.M.D.R - 배드민턴 매니저",
    description: "배드민턴 클럽 출석 관리 및 게임 매칭 시스템",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <AlertProvider>
          {/* 상단 네비게이션 */}
          <div className="fixed top-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-200">
            <div className="flex items-center justify-between px-6 py-3">
              {/* 로고 */}
              <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <Image
                  src="/icons/logo.png"
                  alt="N.M.D.R Logo"
                  width={32}
                  height={32}
                  className="rounded-lg"
                />
                <span className="text-lg font-semibold text-gray-900">N.M.D.R</span>
              </Link>

              {/* 페이지 네비게이션 */}
              <PageNavigation />

              {/* 우측 버튼들 */}
              <div className="flex items-center gap-3">
                {/* 설정 버튼 */}
                <Link
                  href="/settings"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  aria-label="설정"
                >
                  {/* <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m11-7a4 4 0 0 0-8 0m8 0a4 4 0 0 0 8 0m-8 14a4 4 0 0 0-8 0m8 0a4 4 0 0 0 8 0"/>
                  </svg> */}
                  <span className="text-sm font-medium">설정</span>
                </Link>

                {/* 전체화면 버튼 */}
                <FullscreenButton />
              </div>
            </div>
          </div>

          <div className="min-h-screen pt-16">
            {children}
          </div>

          {/* PWA 설치 프롬프트 */}
          <PWAInstallPrompt />
        </AlertProvider>
      </body>
    </html>
  );
}

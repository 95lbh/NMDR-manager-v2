/** @type {import('next').NextConfig} */
const nextConfig = {
  // 프로덕션 빌드에서 console.* 제거 (console.error는 유지)
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },

  // 개발 서버에서 접속을 허용할 origin (LAN IP 등)
  // Next.js 15부터 최상위 옵션으로 승격됨 (기존 experimental 위치 경고 해소)
  allowedDevOrigins: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://172.30.1.7:3000', // 서버의 LAN IP로 접속할 때
    // 필요하면 https도 추가: 'https://172.30.1.7:3000'
  ],

  // 정적 파일 최적화
  images: {
    formats: ['image/webp', 'image/avif'],
  },

  // 압축 활성화
  compress: true,

  // 성능 최적화
  poweredByHeader: false,

  // 보안 헤더
  async headers() {
    return [
      {
        // 전역 보안 헤더 (클릭재킹·MIME 스니핑·리퍼러 과다 노출 방지)
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [{ key: 'Content-Type', value: 'application/manifest+json' }],
      },
      {
        source: '/icons/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // PWA 지원을 위한 설정
  experimental: {
    // ⬇️ 여기에 추가
    allowedDevOrigins: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://172.30.1.7:3000', // 서버의 LAN IP로 접속할 때
      // 필요하면 https도 추가: 'https://172.30.1.7:3000'
    ],
  },

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

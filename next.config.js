/** @type {import('next').NextConfig} */
const nextConfig = {
  // PWA 지원을 위한 설정
  experimental: {
    // 필요한 경우 추가 실험적 기능
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
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
      {
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

# N.M.D.R 배드민턴 관리 시스템 배포 가이드

## 🚀 배포 준비 완료 사항

### ✅ PWA (Progressive Web App) 지원
- **다양한 크기의 아이콘 생성 완료**
  - 16x16, 32x32, 72x72, 96x96, 128x128, 144x144, 152x152, 167x167, 180x180, 192x192, 384x384, 512x512
- **manifest.json 설정 완료**
- **PWA 설치 프롬프트 구현**
- **favicon.ico 생성 완료**

### ✅ SEO 최적화
- **robots.txt 생성**
- **sitemap.xml 생성**
- **메타데이터 최적화**
- **Open Graph 태그 설정**

### ✅ 성능 최적화
- **이미지 최적화 (WebP, AVIF 지원)**
- **압축 활성화**
- **캐시 헤더 설정**
- **정적 파일 최적화**

## 📦 배포 명령어

### 개발 환경
```bash
npm run dev
```

### 프로덕션 빌드 (아이콘 생성 포함)
```bash
npm run build-production
```

### 일반 빌드
```bash
npm run build
```

### 프로덕션 서버 시작
```bash
npm run start
```

### 아이콘만 재생성
```bash
npm run generate-icons
```

## 🌐 배포 플랫폼별 가이드

### Vercel 배포
1. GitHub에 코드 푸시
2. Vercel에서 프로젝트 연결
3. 자동 배포 완료

### Netlify 배포
1. GitHub에 코드 푸시
2. Netlify에서 프로젝트 연결
3. Build command: `npm run build-production`
4. Publish directory: `.next`

### 일반 서버 배포
1. 서버에 Node.js 설치
2. 프로젝트 파일 업로드
3. 의존성 설치: `npm install`
4. 빌드: `npm run build-production`
5. 서버 시작: `npm run start`

## 📱 PWA 기능

### 설치 가능
- 브라우저에서 "앱으로 설치" 프롬프트 표시
- 홈 화면에 앱 아이콘 추가 가능
- 네이티브 앱과 유사한 경험 제공

### 오프라인 지원 (향후 추가 예정)
- 서비스 워커 구현
- 캐시 전략 설정
- 오프라인 페이지 제공

## 🔧 환경 변수 설정

### 필수 환경 변수
```env
# .env.local 파일에 추가
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 선택적 환경 변수
```env
# 분석 도구
NEXT_PUBLIC_GA_ID=your-google-analytics-id
```

## 📊 성능 모니터링

### 빌드 분석
```bash
npm run analyze
```

### Lighthouse 점수 목표
- Performance: 90+
- Accessibility: 95+
- Best Practices: 90+
- SEO: 95+
- PWA: 90+

## 🔒 보안 설정

### 헤더 보안
- CSP (Content Security Policy) 설정
- HTTPS 강제 리다이렉트
- 보안 헤더 추가

### 데이터 보안
- 로컬 스토리지 암호화
- 민감한 데이터 보호
- XSS 방지

## 📝 배포 체크리스트

### 배포 전 확인사항
- [ ] 모든 테스트 통과
- [ ] 빌드 에러 없음
- [ ] 환경 변수 설정
- [ ] 도메인 설정
- [ ] SSL 인증서 설정

### 배포 후 확인사항
- [ ] 사이트 정상 접속
- [ ] PWA 설치 가능
- [ ] 모든 페이지 동작 확인
- [ ] 모바일 반응형 확인
- [ ] 성능 점수 확인

## 🚨 문제 해결

### 일반적인 문제
1. **빌드 실패**: 의존성 재설치 `npm ci`
2. **아이콘 생성 실패**: Sharp 패키지 재설치
3. **PWA 설치 안됨**: HTTPS 확인
4. **성능 저하**: 이미지 최적화 확인

### 지원 및 문의
- 개발팀: N.M.D.R Team
- 이슈 리포트: GitHub Issues
- 문서: README.md

---

## 🎉 배포 완료!

N.M.D.R 배드민턴 관리 시스템이 성공적으로 배포 준비되었습니다.
PWA 기능을 통해 사용자들이 앱처럼 사용할 수 있으며,
모든 디바이스에서 최적화된 경험을 제공합니다.

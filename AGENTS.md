# N.M.D.R 배드민턴 매니저 - AI Agent 참조 문서

> 이 문서는 다른 AI 에이전트가 프로젝트를 이해하고 작업할 수 있도록 작성된 완전한 기술 참조 문서입니다.

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | N.M.D.R 배드민턴 매니저 |
| 목적 | 배드민턴 클럽 출석 관리 및 게임 매칭/진행 시스템 |
| 배포 | Vercel (GitHub 95lbh/NMDR-manager-v2, main 브랜치 자동 배포) |
| 로컬 개발 | `npm run dev` |
| 빌드 | `npm run build` |

---

## 2. 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Next.js 15.4.6 (App Router) |
| 언어 | TypeScript (strict 모드) |
| 스타일링 | Tailwind CSS |
| 백엔드/DB | Supabase (PostgreSQL + 실시간 구독) |
| 패키지 매니저 | npm |
| PWA | Service Worker + Web App Manifest |

---

## 3. 디렉토리 구조

```
src/
├── app/
│   ├── layout.tsx          # 루트 레이아웃 (상단 네비게이션, PWA, SW 등록)
│   ├── page.tsx            # 메인 홈 페이지
│   ├── game/
│   │   └── page.tsx        # 게임 관리 페이지 (핵심, ~2182줄)
│   ├── attendance/
│   │   └── page.tsx        # 출석 관리 페이지 (~723줄)
│   └── settings/
│       └── page.tsx        # 설정 페이지 (~1283줄)
├── components/
│   ├── ConfirmModal.tsx    # 확인 모달 (글래스모피즘)
│   ├── CustomAlert.tsx     # 커스텀 알림 (AlertProvider)
│   ├── FullscreenButton.tsx # 전체화면 버튼
│   ├── OnlineStatusIndicator.tsx # 온라인 상태 표시
│   ├── PWAInstallPrompt.tsx # PWA 설치 유도
│   ├── ServiceWorkerRegistration.tsx # SW 등록
│   ├── SupabaseDebug.tsx   # 개발용 Supabase 디버그
│   └── PageNavigation.tsx  # 상단 페이지 네비게이션
├── hooks/
│   ├── useGameState.ts     # 로컬스토리지 기반 게임 상태 훅
│   ├── useOfflineGameState.ts # 오프라인 우선 게임 상태 훅
│   └── useFullscreen.ts    # 전체화면 API 훅
├── lib/
│   ├── supabase.ts         # Supabase 클라이언트 초기화
│   ├── supabase-db.ts      # DB 함수 모음 (회원/출석/게임/설정)
│   └── offline-storage.ts  # 오프라인 저장소 (Singleton)
├── types/
│   ├── db.ts               # DB 관련 타입 (Member, Skill, Gender 등)
│   ├── game.ts             # 게임 관련 타입 (Player, Team, Court 등)
│   └── settings.ts         # 설정 타입 (AppSettings, CourtPosition)
public/
├── manifest.json           # PWA 매니페스트
├── sw.js                   # Service Worker
└── icons/                  # 앱 아이콘 (여러 크기)
```

---

## 4. 타입 정의 주의사항 ⚠️

### 핵심 주의사항
- `Player`, `Team`, `Court` 타입은 **`@/types/db.ts`에 존재하지 않음**
- `game/page.tsx` **내부에 로컬로 정의**되어 있음
- 다른 파일(훅, 라이브러리)에서 사용 시 **직접 재정의 필요**
- `Skill`, `Gender` 타입만 `@/types/db`에서 import 가능

### 각 파일별 타입 정의 위치
```typescript
// @/types/db.ts에서 import 가능
import { Skill, Gender } from '@/types/db';
// Member, AttendanceParticipant, PlayerGameStats, Attendance, GameState도 여기서 import

// game/page.tsx, offline-storage.ts, useOfflineGameState.ts 에서 로컬 정의
interface Player {
  id: string;
  name: string;
  skill: Skill;
  gender: Gender;
  gamesPlayedToday: number;
  isGuest: boolean;
}
interface Team { id: string; players: Player[]; createdAt: Date; }
interface Court { id: number; status: "idle"|"playing"|"finished"; team?: Team; startedAt?: Date; duration?: number; }
```

---

## 5. Supabase 데이터베이스 스키마

### 5.1 환경 변수
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 5.2 테이블 구조

#### `members` - 회원 정보
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | text (PK) | Base64(이름)+생년+성별+타임스탬프 |
| name | text | 이름 |
| name_lower | text | 소문자 이름 (정렬/검색용) |
| birth_year | integer | 출생년도 |
| gender | text | 'M' 또는 'F' |
| skill | text | 'S'~'F' (스킬 등급) |
| deleted | boolean | 소프트 삭제 플래그 |
| created_at | timestamptz | 생성일시 |

#### `attendances` - 출석 날짜
| 컬럼 | 타입 | 설명 |
|------|------|------|
| date | text (PK) | YYYY-MM-DD 형식 |

#### `attendance_participants` - 출석 참가자
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | bigint (PK) | 자동증가 |
| attendance_date | text | 날짜 (attendances.date 참조) |
| participant_type | text | 'member' 또는 'guest' |
| member_id | text (nullable) | 회원 ID (회원인 경우) |
| name | text | 이름 |
| birth_year | integer (nullable) | 출생년도 (게스트인 경우) |
| gender | text (nullable) | 성별 (게스트인 경우) |
| skill | text | 스킬 등급 |
| shuttles | integer | 셔틀콕 수 (0~5) |

#### `game_stats` - 게임 통계
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | text (PK) | `{playerId}_{date}` 형식 |
| player_id | text | 플레이어 ID |
| player_name | text | 플레이어 이름 |
| player_type | text | 'member' 또는 'guest' |
| date | text | YYYY-MM-DD 형식 |
| games_played_today | integer | 오늘 게임 수 |
| total_games_played | integer | 총 게임 수 |
| last_updated | timestamptz | 마지막 업데이트 |

#### `game_states` - 게임 상태 (실시간 동기화)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| date | text (PK) | YYYY-MM-DD 형식 |
| teams | jsonb | 대기열 팀 배열 |
| courts | jsonb | 코트 상태 배열 |
| updated_at | timestamptz | 마지막 업데이트 |

#### `app_settings` - 앱 설정
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | text (PK) | 항상 'app' |
| courts_count | integer | 코트 수 (기본 4) |
| court_layout | text | 'grid' 또는 'list' |
| court_location | text | 경기장 이름 |
| court_positions | jsonb | 코트 배치 정보 배열 |
| grid_rows | integer | 그리드 행 수 (기본 3) |
| grid_cols | integer | 그리드 열 수 (기본 4) |

---

## 6. DB 함수 (`src/lib/supabase-db.ts`)

### 회원 관리
```typescript
toMemberId(name, birthYear, gender)        // ID 생성: Base64(이름)+생년+성별+타임스탬프
ensureMemberUnique(name, birthYear, gender) // 중복 확인
createMember({ name, birthYear, gender, skill }) // 회원 생성
listMembers()                              // 전체 회원 목록 (deleted=false)
deleteMember(memberId)                     // 소프트 삭제 (deleted=true)
updateMemberSkill(memberId, skill)         // 스킬만 업데이트
updateMember(memberId, { name, birthYear, gender, skill }) // 전체 정보 업데이트
```

### 출석 관리
```typescript
markAttendance({ participant, shuttles })  // 출석 처리 (중복 체크 포함)
getTodayAttendance()                       // 오늘 출석 목록
removeAttendance(participantId, type)      // 출석 취소 (게스트는 이름으로 식별)
```

### 게임 통계
```typescript
getTodayPlayerStats(playerId, name, type)  // 오늘 통계 조회 (없으면 생성)
updatePlayerGameStats(playerId, name, type) // 게임 수 +1
getTotalGamesCount()                       // 전체 게임 수
getTotalShuttlesCount()                    // 전체 셔틀콕 수
```

### 게임 상태
```typescript
saveGameState({ teams, courts })           // upsert (date가 PK)
loadGameState()                            // 오늘 날짜 상태 로드
subscribeToGameState(callback)             // 실시간 구독 (반환값: unsubscribe 함수)
```

### 설정
```typescript
getAppSettings()                           // 설정 로드 (없으면 DEFAULT_SETTINGS)
saveAppSettings(settings)                  // upsert
```

### 데이터 초기화
```typescript
resetStatisticsData()  // game_stats, attendance_participants, attendances, game_states 전체 삭제
resetMembersData()     // attendance_participants, game_stats, members 전체 삭제 (순서 중요!)
```

### 유틸리티
```typescript
todayKey()  // 'YYYY-MM-DD' 형식 오늘 날짜
```

---

## 7. 게임 관리 페이지 (`src/app/game/page.tsx`)

### 7.1 핵심 상태 변수
```typescript
const [courts, setCourts] = useState<Court[]>([]);         // 코트 상태 배열
const [teams, setTeams] = useState<Team[]>([]);             // 대기열 팀 배열
const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]); // 선택 가능한 플레이어
const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]); // 현재 선택된 플레이어
const [playerStates, setPlayerStates] = useState<Record<string, 'home' | 'lesson'>>({});
const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false); // 초기 로드 완료 여부
const [editingTeam, setEditingTeam] = useState<Team | null>(null);  // 수정 중인 팀
```

### 7.2 게임 상태 동기화 알고리즘
1. **초기 로드**: 컴포넌트 마운트 시 `loadGameState()`로 Supabase에서 오늘 날짜 상태 복원
2. **`hasInitiallyLoaded` 플래그**: `true`가 되기 전에는 Supabase 저장 안 함 (초기화 시 삭제 방지)
3. **500ms 디바운싱**: `teams` 또는 `courts` 변경 시 500ms 후 Supabase에 저장
4. **실시간 구독**: `subscribeToGameState()`로 다른 기기의 변경사항 실시간 반영

```typescript
// 디바운싱 저장 패턴 (useEffect 내부)
const timer = setTimeout(async () => {
  if (hasInitiallyLoaded) {
    await saveCurrentGameState();
  }
}, 500);
return () => clearTimeout(timer);
```

### 7.3 플레이어 상태 판단 (`getPlayerStatus`)
```typescript
// 반환값: 'available' | 'waiting' | 'playing' | 'home' | 'lesson'
function getPlayerStatus(player: Player): string {
  // 1. home/lesson 상태 체크 (playerStates 맵)
  if (playerStates[player.id] === 'home') return 'home';
  if (playerStates[player.id] === 'lesson') return 'lesson';

  // 2. 코트에서 플레이 중인지 체크
  if (courts.some(c => c.team?.players.some(p => p.id === player.id))) return 'playing';

  // 3. 대기열에 있는지 체크 (수정 모드 시 현재 수정 중인 팀은 제외)
  const inQueue = teams
    .filter(t => editingTeam ? t.id !== editingTeam.id : true)
    .some(t => t.players.some(p => p.id === player.id));
  if (inQueue) return 'waiting';

  return 'available';
}
```

### 7.4 자동 매칭 알고리즘
```typescript
// 스킬 점수: S=5, A=4, B=3, C=2, D/E/F=1
function getSkillScore(skill: Skill): number { ... }

// 완전 랜덤 섞기 후 필요한 수만큼 선택
function selectPlayersBySkill(players: Player[], count: number): Player[] {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// 자동 매칭 종류
autoMatchMale()   // 남복: 남성 4명 선택 → 팀 생성
autoMatchFemale() // 여복: 여성 4명 선택 → 팀 생성
autoMatchMixed()  // 혼복: 남성 2명 + 여성 2명 → 팀 생성
```

### 7.5 게임 종료/취소 차이점
| 동작 | `finishGame()` | `cancelGame()` |
|------|---------------|---------------|
| 게임 통계 업데이트 | ✅ (+1) | ❌ (카운트 안 됨) |
| 코트 초기화 | ✅ | ✅ |
| 팀 대기열 복귀 여부 | 설정에 따름 | 코트만 초기화 |
| 확인 모달 | ConfirmModal (warning) | ConfirmModal (danger) |

### 7.6 팀 수정 플로우
```
수정 버튼 클릭
  → setEditingTeam(team) 설정
  → 플레이어 선택 모달 오픈
  → selectedPlayers에 기존 팀원 미리 선택
  → getPlayerStatus에서 editingTeam 팀원은 'available'로 표시
  → 플레이어 선택/해제
  → updateTeamAndCloseModal() 호출
  → 팀 업데이트 + editingTeam 초기화
```

---

## 8. 출석 관리 페이지 (`src/app/attendance/page.tsx`)

### 8.1 주요 기능
- 오늘 출석한 회원/게스트 목록 표시
- 미출석 회원 목록 (검색 기능 포함)
- 출석 처리: 회원 클릭 → 셔틀콕 수 선택 → 출석 등록
- 게스트 출석: 이름/성별/출생연도/스킬/셔틀콕 입력
- 출석 취소: 출석한 참가자 클릭 → 취소

### 8.2 초성 분류 및 정렬
- 한글 초성 기준으로 회원을 분류 (ㄱ, ㄴ, ㄷ...)
- 전화번호부 스타일 스크롤 바 (우측 초성 네비게이션)
- 영문/숫자는 별도 그룹

### 8.3 성별 색상 시스템
- 남성 (M): 파란색 계열 (`text-blue-600`, `bg-blue-50`)
- 여성 (F): 분홍색 계열 (`text-pink-600`, `bg-pink-50`)

### 8.4 검색 기능
```typescript
const [searchQuery, setSearchQuery] = useState('');
// 미출석 회원 필터링: member.name.includes(searchQuery)
```

---

## 9. 설정 페이지 (`src/app/settings/page.tsx`)

### 9.1 탭 구조
| 탭 | 내용 |
|----|------|
| court | 코트 수, 배치 방식(grid/list), 그리드 크기, 코트 위치 |
| members | 회원 목록, 검색, 추가/삭제/수정 |
| data | 통계 초기화, 회원 데이터 초기화 |
| system | 앱 정보, PWA 설치 |

### 9.2 회원 검색
```typescript
const [memberSearchQuery, setMemberSearchQuery] = useState('');
// 회원 필터링: member.name.toLowerCase().includes(memberSearchQuery.toLowerCase())
```

### 9.3 코트 배치 (grid 모드)
- `gridRows × gridCols` 크기의 그리드
- 각 셀에 코트를 배치하거나 비워둘 수 있음
- `courtPositions` 배열: `{ id, active, row, col }`

---

## 10. 루트 레이아웃 (`src/app/layout.tsx`)

### 10.1 메타데이터
- 제목: `N.M.D.R - 배드민턴 매니저`
- 뷰포트 테마 색상: `#10b981` (에메랄드 그린)
- PWA `manifest.json` 연결
- Apple Web App 지원 (`appleWebApp.capable: true`)
- 줌 비활성화 (`userScalable: false`)

### 10.2 상단 네비게이션 구조
```
[로고] [PageNavigation] [설정 버튼] [FullscreenButton]
```
- 고정 위치: `fixed top-0 left-0 right-0 z-30`
- 배경: `bg-white/80 backdrop-blur-sm`
- 컨텐츠 영역: `pt-16` (네비게이션 높이만큼 패딩)

### 10.3 전역 컴포넌트
- `AlertProvider`: 커스텀 토스트 알림 전체 감싸기
- `PWAInstallPrompt`: PWA 설치 배너
- `ServiceWorkerRegistration`: SW 등록 (클라이언트 사이드)
- `SupabaseDebug`: 개발 환경에서만 표시

---

## 11. 컴포넌트 상세

### 11.1 ConfirmModal (`src/components/ConfirmModal.tsx`)
```typescript
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;   // 기본값: '확인'
  cancelText?: string;    // 기본값: '취소'
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'warning' | 'danger' | 'info';  // 기본값: 'warning'
}
```
- **배경**: `bg-white/20 backdrop-blur-md` (글래스모피즘, 전체화면 모드 지원)
- **모달**: `bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl`
- **danger**: 빨간 확인 버튼 (`bg-red-500`)
- **warning**: 노란 확인 버튼 (`bg-yellow-500`)
- **info**: 파란 확인 버튼 (`bg-blue-500`)
- 배경 클릭 시 `onCancel` 호출

### 11.2 OnlineStatusIndicator (`src/components/OnlineStatusIndicator.tsx`)
```typescript
interface OnlineStatusIndicatorProps {
  isOnline: boolean;
  pendingSyncCount: number;
  onForceSync?: () => void;
  className?: string;
}
```
- 상태 색상: 온라인=초록, 동기화대기=노랑, 오프라인=빨강
- 클릭 시 상세 팝오버 표시 (마지막 동기화 시간, 대기 항목 수, 강제 동기화 버튼)
- 배경 클릭 시 팝오버 닫힘

### 11.3 CustomAlert (`src/components/CustomAlert.tsx`)
- `AlertProvider`로 전체 앱 감싸기
- `useAlert()` 훅으로 어디서든 알림 표시 가능
- 네이티브 `alert()` 대체 (전체화면 모드에서도 정상 동작)

### 11.4 FullscreenButton (`src/components/FullscreenButton.tsx`)
- `useFullscreen` 훅 사용
- 전체화면 진입/종료 토글 버튼
- Fullscreen API 미지원 시 버튼 숨김

---

## 12. 오프라인 우선 아키텍처

### 12.1 OfflineStorage 클래스 (`src/lib/offline-storage.ts`)
- **Singleton 패턴**: `OfflineStorage.getInstance()`
- **SSR 호환**: 생성자에서 `typeof window !== 'undefined'` 체크
- **localStorage 키**: `offline_game_state`, `sync_queue`

```typescript
// 주요 메서드
saveGameStateInstant(courts, teams, players)  // 로컬 즉시 저장 + 동기화 큐 추가
loadGameState()                               // 로컬 상태 로드
getOnlineStatus(): boolean                    // 현재 온라인 여부
getPendingSyncCount(): number                 // 대기 동기화 항목 수
forcSync(): Promise<void>                     // 강제 동기화 시도
```

### 12.2 동기화 큐 알고리즘
```typescript
interface SyncQueueItem {
  id: string;           // `{type}_{action}_{timestamp}`
  type: 'courts' | 'teams' | 'players';
  action: 'create' | 'update' | 'delete';
  data: unknown;
  timestamp: number;
  retryCount: number;   // 최대 3회, 초과 시 큐에서 제거
}
```
- 온라인 복귀 시 `window 'online'` 이벤트로 자동 동기화
- `syncInProgress` 플래그로 중복 실행 방지

### 12.3 useOfflineGameState 훅 (`src/hooks/useOfflineGameState.ts`)
- `OfflineStorage` 인스턴스를 조건부 생성 (SSR 안전)
- 1초마다 온라인 상태 폴링 (`setInterval`)
- Optimistic UI: 즉시 React 상태 업데이트 → 백그라운드 저장

```typescript
// 반환 인터페이스
{
  courts, teams, availablePlayers,
  isOnline, pendingSyncCount, loading,
  updateCourtsInstant, updateTeamsInstant,
  updatePlayersInstant, updateGameStateInstant,
  forceSync, clearPendingSync
}
```

---

## 13. PWA 설정

### 13.1 manifest.json (`public/manifest.json`)
- `display: "standalone"` - 네이티브 앱처럼 표시
- `theme_color: "#10b981"` - 에메랄드 그린
- 아이콘: 16, 32, 96, 152, 167, 180, 192, 512px

### 13.2 Service Worker (`public/sw.js`)
- 캐시 전략: Cache-First (정적 자산) + Network-First (API)
- 오프라인 폴백 페이지 제공
- 백그라운드 동기화 (`sync` 이벤트)
- 앱 업데이트 시 새 SW 즉시 활성화

### 13.3 ServiceWorkerRegistration (`src/components/ServiceWorkerRegistration.tsx`)
- `'use client'` 지시어 필수
- 마운트 시 `/sw.js` 등록
- Background Sync API 등록 (타입 단언 사용):
```typescript
await (registration as ServiceWorkerRegistration & {
  sync: { register: (tag: string) => Promise<void> }
}).sync.register('background-sync');
```

---

## 14. 디자인 시스템

### 14.1 색상 체계
| 용도 | 색상 클래스 |
|------|------------|
| 주요 테마 | `emerald` 계열 (`#10b981`) |
| 남성 | `blue` 계열 (`text-blue-600`, `bg-blue-50`) |
| 여성 | `pink` 계열 (`text-pink-600`, `bg-pink-50`) |
| 위험 작업 | `red` 계열 |
| 경고 | `yellow` 계열 |
| 정보 | `blue` 계열 |

### 14.2 글래스모피즘 패턴
```css
/* 모달 배경 */
bg-white/20 backdrop-blur-md

/* 모달 본체 */
bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-white/20

/* 네비게이션 바 */
bg-white/80 backdrop-blur-sm border-b border-gray-200
```

### 14.3 반응형 브레이크포인트
- `xs`: 커스텀 (약 375px)
- `sm`: 640px
- `lg`: 1024px
- 주로 `hidden xs:inline` 패턴으로 모바일 최적화

### 14.4 스킬 등급 표시
| 등급 | 색상 |
|------|------|
| S | 보라 (`purple`) |
| A | 파랑 (`blue`) |
| B | 초록 (`green`) |
| C | 노랑 (`yellow`) |
| D, E, F | 회색 (`gray`) |

---

## 15. 알려진 주의사항 및 패턴

### 15.1 SSR/CSR 패턴
```typescript
// window 객체 접근 시 항상 체크
if (typeof window !== 'undefined') {
  // 클라이언트 전용 코드
}

// 조건부 인스턴스 생성
const storage = typeof window !== 'undefined' ? OfflineStorage.getInstance() : null;
```

### 15.2 useCallback 의존성 배열
- `saveCurrentGameState`: `[teams, courts]` 의존
- `autoMatchMale/Female/Mixed`: `availablePlayers` 의존
- 의존성 누락 시 ESLint `react-hooks/exhaustive-deps` 오류

### 15.3 게임 상태 저장 타이밍 주의
```typescript
// hasInitiallyLoaded가 true가 된 후에만 저장
// false 상태에서 저장하면 초기 로드 시 빈 배열로 덮어쓰는 버그 발생
if (hasInitiallyLoaded) {
  await saveCurrentGameState();
}
```

### 15.4 출석 취소 시 게스트 식별
- 회원: `member_id`로 식별
- 게스트: `name`으로 식별 (같은 날 동명이인 게스트는 첫 번째가 삭제됨)

### 15.5 resetStatisticsData 삭제 순서
```
game_stats → attendance_participants → attendances → game_states
(외래키 제약으로 인해 자식 테이블부터 삭제)
```

### 15.6 resetMembersData 삭제 순서
```
attendance_participants → game_stats → members
(members를 참조하는 테이블 먼저 삭제)
```


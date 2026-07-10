// 공용 상수

export const SKILLS = ["S", "A", "B", "C", "D", "E", "F"] as const;

// 출생연도 선택 옵션 — 현재 연도 기준으로 동적 생성한다.
// (기존에는 2005년 상한이 하드코딩되어 그 이후 출생자를 등록할 수 없었다.)
// 만 6세 ~ 만 80세 범위.
const currentYear = new Date().getFullYear();
export const BIRTH_YEARS: number[] = Array.from(
  { length: 75 },
  (_, i) => currentYear - 6 - i
);

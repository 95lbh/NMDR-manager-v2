export interface CourtPosition {
  id: number;
  active: boolean;
  row: number;
  col: number;
}

export interface AppSettings {
  courtsCount: number; // 코트 수 (기본 4)
  courtLayout?: 'grid' | 'list'; // 코트 배치 방식 (기본 grid)
  courtLocation?: string; // 코트 위치 (경기장 이름)
  courtPositions: CourtPosition[]; // 코트 배치 정보
  gridRows: number; // 그리드 행 수
  gridCols: number; // 그리드 열 수
}

export const DEFAULT_SETTINGS: AppSettings = {
  courtsCount: 4,
  courtLayout: 'grid',
  courtLocation: '',
  courtPositions: [
    { id: 1, active: true, row: 0, col: 0 },
    { id: 2, active: true, row: 0, col: 1 },
    { id: 3, active: true, row: 0, col: 2 },
    { id: 4, active: true, row: 1, col: 0 },
  ],
  gridRows: 3,
  gridCols: 4,
};

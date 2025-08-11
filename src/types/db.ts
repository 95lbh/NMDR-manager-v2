export type Skill = "S" | "A" | "B" | "C" | "D" | "E" | "F";
export type Gender = "M" | "F";

export interface Member {
  id: string; // slugified unique id (name+birthYear+gender)
  name: string;
  nameLower: string;
  birthYear: number;
  gender: Gender;
  skill: Skill;
  createdAt?: unknown;
  deleted?: boolean; // 소프트 삭제 플래그
}

export interface AttendanceParticipantBase {
  type: "member" | "guest";
  shuttles: number; // 0..5
  skill: Skill;
  name: string;
}

export interface AttendanceMember extends AttendanceParticipantBase {
  type: "member";
  memberId: string;
}

export interface AttendanceGuest extends AttendanceParticipantBase {
  type: "guest";
  birthYear: number;
  gender: Gender;
}

export type AttendanceParticipant = AttendanceMember | AttendanceGuest;

// 플레이어 게임 통계
export interface PlayerGameStats {
  playerId: string; // member ID 또는 guest 식별자
  playerName: string;
  playerType: "member" | "guest";
  date: string; // YYYY-MM-DD 형식
  gamesPlayedToday: number; // 오늘 플레이한 게임 수
  totalGamesPlayed: number; // 총 게임 수 (누적)
  lastUpdated: string; // ISO 날짜 문자열
}

export interface Attendance {
  date: string;
  participants: AttendanceParticipant[];
}

// 게임 플레이어 인터페이스
export interface GamePlayer {
  id: string;
  name: string;
  skill: Skill;
  gender: Gender;
  isGuest: boolean;
}

// 게임 팀 인터페이스
export interface GameTeam {
  id: string;
  players: GamePlayer[];
}

// 게임 상태 인터페이스
export interface GameState {
  teams: GameTeam[];
}


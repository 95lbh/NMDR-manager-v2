import { getFirebaseApp } from "./firebase";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import type { Member, Gender, Skill, AttendanceParticipant, Attendance, PlayerGameStats } from "@/types/db";
import type { AppSettings } from "@/types/settings";

export function db() {
  return getFirestore(getFirebaseApp());
}

export function membersCol() {
  return collection(db(), "members");
}

export function attendancesCol() {
  return collection(db(), "attendances");
}

export function toMemberId(name: string, birthYear: number, gender: Gender) {
  // 한글 이름을 Base64로 인코딩하여 고유성 보장
  const nameEncoded = btoa(encodeURIComponent(name.trim()));
  const timestamp = Date.now().toString(36); // 추가 고유성을 위한 타임스탬프
  return `${nameEncoded}-${birthYear}-${gender}-${timestamp}`;
}

export async function ensureMemberUnique(
  name: string,
  birthYear: number,
  gender: Gender
) {
  const id = toMemberId(name, birthYear, gender);
  const ref = doc(membersCol(), id);
  const snap = await getDoc(ref);
  return { id, exists: snap.exists() };
}

export async function createMember(input: {
  name: string;
  birthYear: number;
  gender: Gender;
  skill: Skill;
}): Promise<Member> {
  const { id, exists } = await ensureMemberUnique(
    input.name,
    input.birthYear,
    input.gender
  );
  if (exists) throw new Error("이미 동일한 회원이 존재합니다.");

  const ref = doc(membersCol(), id);
  const data: Member = {
    id,
    name: input.name.trim(),
    nameLower: input.name.trim().toLowerCase(),
    birthYear: input.birthYear,
    gender: input.gender,
    skill: input.skill,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, data);
  return data;
}

export async function listMembers() {
  const q = query(membersCol(), orderBy("nameLower", "asc"));
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => d.data() as Member).filter(m => !m.deleted);
}


export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function markAttendance(input: {
  participant:
    | { type: 'member'; memberId: string; name: string; skill: Skill }
    | { type: 'guest'; name: string; birthYear: number; gender: Gender; skill: Skill };
  shuttles: number; // 0..5
}): Promise<Attendance> {
  const dateKey = todayKey();
  const ref = doc(attendancesCol(), dateKey);
  const snap = await getDoc(ref);
  const existing: Attendance = snap.exists()
    ? (snap.data() as Attendance)
    : { date: dateKey, participants: [] };

  // 중복 방지: 같은 날 동일 회원/게스트 중복 출석 불가
  const dup = existing.participants.some((p) => {
    if (p.type === 'member' && input.participant.type === 'member') {
      return (p as Extract<AttendanceParticipant, {type:'member'}>).memberId === input.participant.memberId;
    }
    if (p.type === 'guest' && input.participant.type === 'guest') {
      const g = p as Extract<AttendanceParticipant, {type:'guest'}>;
      return g.name === input.participant.name && g.birthYear === input.participant.birthYear && g.gender === input.participant.gender;
    }
    return false;
  });
  if (dup) throw new Error('이미 오늘 출석 처리되었습니다.');

  existing.participants.push({ ...input.participant, shuttles: input.shuttles } as AttendanceParticipant);
  existing.participants.sort((a, b) => a.name.localeCompare(b.name));

  await setDoc(ref, existing);
  return existing;
}

export async function getTodayAttendance(): Promise<{ date: string; participants: AttendanceParticipant[] }> {
  const ref = doc(attendancesCol(), todayKey());
  const snap = await getDoc(ref);
  return snap.exists()
    ? (snap.data() as { date: string; participants: AttendanceParticipant[] })
    : { date: todayKey(), participants: [] };
}

export function settingsCol() {
  return collection(db(), "settings");
}

export async function getAppSettings(): Promise<AppSettings> {
  const ref = doc(settingsCol(), "app");
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data() as AppSettings;
  }
  const { DEFAULT_SETTINGS } = await import("@/types/settings");
  return DEFAULT_SETTINGS;
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  const ref = doc(settingsCol(), "app");
  await setDoc(ref, settings);
}

export async function deleteMember(memberId: string): Promise<void> {
  const ref = doc(membersCol(), memberId);
  await setDoc(ref, { deleted: true }, { merge: true });
}

export async function updateMemberSkill(memberId: string, skill: Skill): Promise<void> {
  const ref = doc(membersCol(), memberId);
  await setDoc(ref, { skill }, { merge: true });
}

export async function removeAttendance(participantId: string, participantType: 'member' | 'guest'): Promise<Attendance> {
  const dateKey = todayKey();
  const ref = doc(attendancesCol(), dateKey);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error('출석 기록이 없습니다.');
  }

  const existing: Attendance = snap.data() as Attendance;

  // 해당 참가자 제거
  existing.participants = existing.participants.filter((p) => {
    if (p.type === 'member' && participantType === 'member') {
      return (p as Extract<AttendanceParticipant, {type:'member'}>).memberId !== participantId;
    }
    if (p.type === 'guest' && participantType === 'guest') {
      return p.name !== participantId; // 게스트는 이름으로 식별
    }
    return true;
  });

  await setDoc(ref, existing);
  return existing;
}

// 게임 통계 관련 함수들
export function gameStatsCol() {
  return collection(db(), "gameStats");
}

// 플레이어의 오늘 게임 통계 가져오기
export async function getTodayPlayerStats(playerId: string, playerName: string, playerType: "member" | "guest"): Promise<PlayerGameStats> {
  const today = todayKey();
  const statsId = `${playerId}_${today}`;
  const ref = doc(gameStatsCol(), statsId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return snap.data() as PlayerGameStats;
  } else {
    // 새로운 통계 생성
    const newStats: PlayerGameStats = {
      playerId,
      playerName,
      playerType,
      date: today,
      gamesPlayedToday: 0,
      totalGamesPlayed: await getTotalGamesPlayed(playerId),
      lastUpdated: new Date().toISOString()
    };
    await setDoc(ref, newStats);
    return newStats;
  }
}

// 플레이어의 총 게임 수 가져오기 (모든 날짜 합계)
export async function getTotalGamesPlayed(playerId: string): Promise<number> {
  const q = query(gameStatsCol(), where("playerId", "==", playerId));
  const querySnapshot = await getDocs(q);

  let total = 0;
  querySnapshot.forEach((doc) => {
    const stats = doc.data() as PlayerGameStats;
    total += stats.gamesPlayedToday;
  });

  return total;
}

// 게임 완료 시 플레이어 통계 업데이트
export async function updatePlayerGameStats(playerId: string, playerName: string, playerType: "member" | "guest"): Promise<void> {
  const today = todayKey();
  const statsId = `${playerId}_${today}`;
  const ref = doc(gameStatsCol(), statsId);

  // 현재 통계 가져오기
  const currentStats = await getTodayPlayerStats(playerId, playerName, playerType);

  // 게임 수 증가
  const updatedStats: PlayerGameStats = {
    ...currentStats,
    gamesPlayedToday: currentStats.gamesPlayedToday + 1,
    totalGamesPlayed: currentStats.totalGamesPlayed + 1,
    lastUpdated: new Date().toISOString()
  };

  await setDoc(ref, updatedStats);
}

// 모든 플레이어의 총 게임 수 합계 가져오기
export async function getTotalGamesCount(): Promise<number> {
  const querySnapshot = await getDocs(gameStatsCol());

  let total = 0;
  querySnapshot.forEach((doc) => {
    const stats = doc.data() as PlayerGameStats;
    total += stats.gamesPlayedToday;
  });

  return total;
}

// 누적 소모된 셔틀콕 총 개수 가져오기 (모든 출석 데이터)
export async function getTotalShuttlesCount(): Promise<number> {
  const querySnapshot = await getDocs(attendancesCol());

  let total = 0;
  querySnapshot.forEach((doc) => {
    const attendance = doc.data() as Attendance;
    attendance.participants.forEach((participant) => {
      total += participant.shuttles;
    });
  });

  return total;
}

// 통계 데이터 초기화 (게임 통계, 출석 데이터)
export async function resetStatisticsData(): Promise<void> {
  const batch = writeBatch(db());

  // 게임 통계 초기화
  const gameStatsSnapshot = await getDocs(gameStatsCol());
  gameStatsSnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });

  // 출석 데이터 초기화
  const attendanceSnapshot = await getDocs(attendancesCol());
  attendanceSnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}

// 회원 목록 초기화
export async function resetMembersData(): Promise<void> {
  const batch = writeBatch(db());

  const membersSnapshot = await getDocs(membersCol());
  membersSnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}

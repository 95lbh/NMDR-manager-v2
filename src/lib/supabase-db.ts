import { supabase } from './supabase';
import type { Member, Gender, Skill, AttendanceParticipant, Attendance, PlayerGameStats, GameState } from "@/types/db";
import type { AppSettings } from "@/types/settings";

// ===== 회원 관리 함수들 =====

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
  
  const { data, error } = await supabase
    .from('members')
    .select('id')
    .eq('id', id)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error(`회원 중복 확인 실패: ${error.message}`);
  }
  
  return { id, exists: !!data };
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

  const memberData = {
    id,
    name: input.name.trim(),
    name_lower: input.name.trim().toLowerCase(),
    birth_year: input.birthYear,
    gender: input.gender,
    skill: input.skill,
    deleted: false
  };

  const { data, error } = await supabase
    .from('members')
    .insert(memberData)
    .select()
    .single();

  if (error) {
    throw new Error(`회원 생성 실패: ${error.message}`);
  }

  // 반환 데이터를 기존 인터페이스 형식으로 변환
  return {
    id: data.id,
    name: data.name,
    nameLower: data.name_lower,
    birthYear: data.birth_year,
    gender: data.gender,
    skill: data.skill,
    createdAt: data.created_at,
    deleted: data.deleted
  };
}

export async function listMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('deleted', false)
    .order('name_lower', { ascending: true });

  if (error) {
    throw new Error(`회원 목록 조회 실패: ${error.message}`);
  }

  // 데이터를 기존 인터페이스 형식으로 변환
  return data.map(member => ({
    id: member.id,
    name: member.name,
    nameLower: member.name_lower,
    birthYear: member.birth_year,
    gender: member.gender,
    skill: member.skill,
    createdAt: member.created_at,
    deleted: member.deleted
  }));
}

export async function deleteMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('members')
    .update({ deleted: true })
    .eq('id', memberId);

  if (error) {
    throw new Error(`회원 삭제 실패: ${error.message}`);
  }
}

export async function updateMemberSkill(memberId: string, skill: Skill): Promise<void> {
  const { error } = await supabase
    .from('members')
    .update({ skill })
    .eq('id', memberId);

  if (error) {
    throw new Error(`회원 스킬 업데이트 실패: ${error.message}`);
  }
}

export async function updateMember(memberId: string, updates: {
  name?: string;
  birthYear?: number;
  gender?: Gender;
  skill?: Skill;
}): Promise<Member> {
  // 업데이트할 데이터 준비
  const updateData: {
    name?: string;
    name_lower?: string;
    birth_year?: number;
    gender?: Gender;
    skill?: Skill;
  } = {};

  if (updates.name !== undefined) {
    updateData.name = updates.name.trim();
    updateData.name_lower = updates.name.trim().toLowerCase();
  }
  if (updates.birthYear !== undefined) {
    updateData.birth_year = updates.birthYear;
  }
  if (updates.gender !== undefined) {
    updateData.gender = updates.gender;
  }
  if (updates.skill !== undefined) {
    updateData.skill = updates.skill;
  }

  const { data, error } = await supabase
    .from('members')
    .update(updateData)
    .eq('id', memberId)
    .select()
    .single();

  if (error) {
    throw new Error(`회원 정보 업데이트 실패: ${error.message}`);
  }

  // 반환 데이터를 기존 인터페이스 형식으로 변환
  return {
    id: data.id,
    name: data.name,
    nameLower: data.name_lower,
    birthYear: data.birth_year,
    gender: data.gender,
    skill: data.skill,
    createdAt: data.created_at,
    deleted: data.deleted
  };
}

// ===== 출석 관리 함수들 =====

export async function markAttendance(input: {
  participant:
    | { type: 'member'; memberId: string; name: string; skill: Skill }
    | { type: 'guest'; name: string; birthYear: number; gender: Gender; skill: Skill };
  shuttles: number; // 0..5
}): Promise<Attendance> {
  const dateKey = todayKey();

  // 먼저 해당 날짜의 출석 기록이 있는지 확인하고 없으면 생성
  const { error: attendanceError } = await supabase
    .from('attendances')
    .upsert({ date: dateKey }, { onConflict: 'date' });

  if (attendanceError) {
    throw new Error(`출석 기록 생성 실패: ${attendanceError.message}`);
  }

  // 중복 출석 확인
  let duplicateQuery = supabase
    .from('attendance_participants')
    .select('id')
    .eq('attendance_date', dateKey)
    .eq('name', input.participant.name);

  if (input.participant.type === 'member') {
    duplicateQuery = duplicateQuery.eq('member_id', input.participant.memberId);
  } else {
    duplicateQuery = duplicateQuery
      .eq('birth_year', input.participant.birthYear)
      .eq('gender', input.participant.gender);
  }

  const { data: duplicateData } = await duplicateQuery.single();

  if (duplicateData) {
    throw new Error('이미 오늘 출석 처리되었습니다.');
  }

  // 출석 참가자 추가
  const participantData = {
    attendance_date: dateKey,
    participant_type: input.participant.type,
    member_id: input.participant.type === 'member' ? input.participant.memberId : null,
    name: input.participant.name,
    birth_year: input.participant.type === 'guest' ? input.participant.birthYear : null,
    gender: input.participant.type === 'guest' ? input.participant.gender : null,
    skill: input.participant.skill,
    shuttles: input.shuttles
  };

  const { error: participantError } = await supabase
    .from('attendance_participants')
    .insert(participantData);

  if (participantError) {
    throw new Error(`출석 참가자 추가 실패: ${participantError.message}`);
  }

  // 업데이트된 출석 정보 반환
  return await getTodayAttendance();
}

export async function getTodayAttendance(): Promise<{ date: string; participants: AttendanceParticipant[] }> {
  const dateKey = todayKey();

  const { data, error } = await supabase
    .from('attendance_participants')
    .select('*')
    .eq('attendance_date', dateKey)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`출석 정보 조회 실패: ${error.message}`);
  }

  // 데이터를 기존 인터페이스 형식으로 변환
  const participants: AttendanceParticipant[] = data.map(p => {
    if (p.participant_type === 'member') {
      return {
        type: 'member',
        memberId: p.member_id!,
        name: p.name,
        skill: p.skill,
        shuttles: p.shuttles
      };
    } else {
      return {
        type: 'guest',
        name: p.name,
        birthYear: p.birth_year!,
        gender: p.gender!,
        skill: p.skill,
        shuttles: p.shuttles
      };
    }
  });

  return { date: dateKey, participants };
}

export async function removeAttendance(participantId: string, participantType: 'member' | 'guest'): Promise<Attendance> {
  const dateKey = todayKey();

  if (participantType === 'member') {
    // 회원은 member_id가 고유하므로 그대로 삭제 (하루 1회 중복 방지됨)
    const { error } = await supabase
      .from('attendance_participants')
      .delete()
      .eq('attendance_date', dateKey)
      .eq('member_id', participantId);

    if (error) {
      throw new Error(`출석 취소 실패: ${error.message}`);
    }
  } else {
    // 게스트는 고유 식별자가 없어 이름으로 찾되, 동명이인이 있어도
    // 전부 삭제되지 않도록 매칭되는 첫 행의 PK(id) 하나만 삭제한다.
    const { data: rows, error: findError } = await supabase
      .from('attendance_participants')
      .select('id')
      .eq('attendance_date', dateKey)
      .eq('participant_type', 'guest')
      .eq('name', participantId)
      .order('id', { ascending: true })
      .limit(1);

    if (findError) {
      throw new Error(`출석 취소 실패: ${findError.message}`);
    }

    if (rows && rows.length > 0) {
      const { error } = await supabase
        .from('attendance_participants')
        .delete()
        .eq('id', rows[0].id);

      if (error) {
        throw new Error(`출석 취소 실패: ${error.message}`);
      }
    }
  }

  // 업데이트된 출석 정보 반환
  return await getTodayAttendance();
}

// ===== 게임 통계 함수들 =====

// 여러 플레이어의 오늘 통계를 한 번에 조회한다 (N+1 방지).
// 오늘 통계 행이 없는 플레이어는 누적 총게임수를 배치로 계산해 upsert로 한꺼번에 생성한다.
export async function getTodayPlayerStatsBatch(
  players: { id: string; name: string; type: "member" | "guest" }[]
): Promise<Record<string, PlayerGameStats>> {
  const today = todayKey();
  const result: Record<string, PlayerGameStats> = {};
  if (players.length === 0) return result;

  const statsIds = players.map((p) => `${p.id}_${today}`);

  // 1. 오늘 통계 배치 조회 (1 쿼리)
  const { data: existing, error } = await supabase
    .from('game_stats')
    .select('*')
    .in('id', statsIds);

  if (error) {
    throw new Error(`게임 통계 배치 조회 실패: ${error.message}`);
  }

  const existingMap = new Map((existing || []).map((r) => [r.id as string, r]));

  // 2. 오늘 통계가 없는(cold) 플레이어만 추림
  const missing = players.filter((p) => !existingMap.has(`${p.id}_${today}`));

  // 3. 누락 플레이어의 누적 총게임수를 배치로 조회 (최대 1 쿼리)
  const totalsMap = new Map<string, number>();
  if (missing.length > 0) {
    const missingIds = missing.map((p) => p.id);
    const { data: totals, error: totalsError } = await supabase
      .from('game_stats')
      .select('player_id, total_games_played, last_updated')
      .in('player_id', missingIds)
      .order('last_updated', { ascending: false });

    if (totalsError) {
      throw new Error(`총 게임 수 배치 조회 실패: ${totalsError.message}`);
    }

    // player_id별 최신 행의 total만 사용
    for (const row of totals || []) {
      if (!totalsMap.has(row.player_id)) {
        totalsMap.set(row.player_id, row.total_games_played || 0);
      }
    }
  }

  // 4. 누락분 오늘 통계 행을 배치 생성 (최대 1 쿼리)
  const nowIso = new Date().toISOString();
  if (missing.length > 0) {
    const rows = missing.map((p) => ({
      id: `${p.id}_${today}`,
      player_id: p.id,
      player_name: p.name,
      player_type: p.type,
      date: today,
      games_played_today: 0,
      total_games_played: totalsMap.get(p.id) || 0,
      last_updated: nowIso,
    }));

    const { error: upsertError } = await supabase
      .from('game_stats')
      .upsert(rows, { onConflict: 'id' });

    if (upsertError) {
      throw new Error(`게임 통계 배치 생성 실패: ${upsertError.message}`);
    }
  }

  // 5. 결과 조립
  for (const p of players) {
    const row = existingMap.get(`${p.id}_${today}`);
    result[p.id] = row
      ? {
          playerId: row.player_id,
          playerName: row.player_name,
          playerType: row.player_type,
          date: row.date,
          gamesPlayedToday: row.games_played_today,
          totalGamesPlayed: row.total_games_played,
          lastUpdated: row.last_updated,
        }
      : {
          playerId: p.id,
          playerName: p.name,
          playerType: p.type,
          date: today,
          gamesPlayedToday: 0,
          totalGamesPlayed: totalsMap.get(p.id) || 0,
          lastUpdated: nowIso,
        };
  }

  return result;
}

// 여러 플레이어의 오늘/누적 게임 수를 한 번에 +1 한다 (게임 종료 시 4명 순차 업데이트 대체).
export async function updatePlayerGameStatsBatch(
  players: { id: string; name: string; type: "member" | "guest" }[]
): Promise<void> {
  const today = todayKey();
  if (players.length === 0) return;

  // 현재 값을 배치로 확보(없으면 생성됨)
  const statsMap = await getTodayPlayerStatsBatch(players);

  const nowIso = new Date().toISOString();
  const rows = players.map((p) => {
    const cur = statsMap[p.id];
    return {
      id: `${p.id}_${today}`,
      player_id: p.id,
      player_name: p.name,
      player_type: p.type,
      date: today,
      games_played_today: cur.gamesPlayedToday + 1,
      total_games_played: cur.totalGamesPlayed + 1,
      last_updated: nowIso,
    };
  });

  const { error } = await supabase
    .from('game_stats')
    .upsert(rows, { onConflict: 'id' });

  if (error) {
    throw new Error(`게임 통계 배치 업데이트 실패: ${error.message}`);
  }
}

// ===== 설정 관리 함수들 =====

export async function getAppSettings(): Promise<AppSettings> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', 'app')
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`설정 조회 실패: ${error.message}`);
  }

  if (data) {
    return {
      courtsCount: data.courts_count,
      courtLayout: data.court_layout,
      courtLocation: data.court_location,
      courtPositions: data.court_positions,
      gridRows: data.grid_rows,
      gridCols: data.grid_cols
    };
  } else {
    const { DEFAULT_SETTINGS } = await import("@/types/settings");
    return DEFAULT_SETTINGS;
  }
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  const { error } = await supabase
    .from('app_settings')
    .upsert({
      id: 'app',
      courts_count: settings.courtsCount,
      court_layout: settings.courtLayout,
      court_location: settings.courtLocation,
      court_positions: settings.courtPositions,
      grid_rows: settings.gridRows,
      grid_cols: settings.gridCols
    }, { onConflict: 'id' });

  if (error) {
    throw new Error(`설정 저장 실패: ${error.message}`);
  }
}

// ===== 통계 관련 함수들 =====

export async function getTotalGamesCount(): Promise<number> {
  const { data, error } = await supabase
    .from('game_stats')
    .select('games_played_today');

  if (error) {
    throw new Error(`총 게임 수 조회 실패: ${error.message}`);
  }

  return data.reduce((total, stats) => total + stats.games_played_today, 0);
}

export async function getTotalShuttlesCount(): Promise<number> {
  const { data, error } = await supabase
    .from('attendance_participants')
    .select('shuttles');

  if (error) {
    throw new Error(`총 셔틀콕 수 조회 실패: ${error.message}`);
  }

  return data.reduce((total, participant) => total + participant.shuttles, 0);
}

export async function resetStatisticsData(): Promise<void> {
  // 게임 통계 초기화 (문자열 ID 사용)
  const { error: gameStatsError } = await supabase
    .from('game_stats')
    .delete()
    .neq('player_id', ''); // 모든 행 삭제 (player_id는 문자열)

  if (gameStatsError) {
    throw new Error(`게임 통계 초기화 실패: ${gameStatsError.message}`);
  }

  // 출석 데이터 초기화 (참조되는 테이블부터 먼저 삭제)
  const { error: attendanceError } = await supabase
    .from('attendance_participants')
    .delete()
    .neq('member_id', ''); // 모든 행 삭제 (member_id는 문자열)

  if (attendanceError) {
    throw new Error(`출석 데이터 초기화 실패: ${attendanceError.message}`);
  }

  // 출석 테이블도 초기화
  const { error: attendancesError } = await supabase
    .from('attendances')
    .delete()
    .neq('date', ''); // 모든 행 삭제 (date는 문자열)

  if (attendancesError) {
    throw new Error(`출석 테이블 초기화 실패: ${attendancesError.message}`);
  }

  // 게임 상태 초기화
  const { error: gameStatesError } = await supabase
    .from('game_states')
    .delete()
    .neq('date', ''); // 모든 행 삭제 (date는 문자열)

  if (gameStatesError) {
    throw new Error(`게임 상태 초기화 실패: ${gameStatesError.message}`);
  }
}

export async function resetMembersData(): Promise<void> {
  // 먼저 참조하는 테이블들을 삭제해야 함

  // 1. 출석 참가자 데이터 삭제
  const { error: attendanceParticipantsError } = await supabase
    .from('attendance_participants')
    .delete()
    .neq('member_id', ''); // 모든 행 삭제

  if (attendanceParticipantsError) {
    throw new Error(`출석 참가자 데이터 초기화 실패: ${attendanceParticipantsError.message}`);
  }

  // 2. 게임 통계 데이터 삭제
  const { error: gameStatsError } = await supabase
    .from('game_stats')
    .delete()
    .neq('player_id', ''); // 모든 행 삭제

  if (gameStatsError) {
    throw new Error(`게임 통계 데이터 초기화 실패: ${gameStatsError.message}`);
  }

  // 3. 마지막으로 회원 데이터 삭제
  const { error } = await supabase
    .from('members')
    .delete()
    .neq('name', ''); // 모든 행 삭제 (name은 문자열이므로 빈 문자열과 비교 가능)

  if (error) {
    throw new Error(`회원 데이터 초기화 실패: ${error.message}`);
  }
}

// ===== 게임 상태 관리 함수들 =====

export async function saveGameState(gameState: GameState): Promise<void> {
  const today = todayKey();

  const { error } = await supabase
    .from('game_states')
    .upsert({
      date: today,
      teams: gameState.teams,
      courts: gameState.courts || [], // 코트 정보도 저장
      updated_at: new Date().toISOString()
    }, { onConflict: 'date' });

  if (error) {
    throw new Error(`게임 상태 저장 실패: ${error.message}`);
  }
}

export async function loadGameState(): Promise<GameState | null> {
  const today = todayKey();

  const { data, error } = await supabase
    .from('game_states')
    .select('*')
    .eq('date', today)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error(`게임 상태 로드 실패: ${error.message}`);
  }

  return data ? {
    teams: data.teams || [],
    courts: data.courts || []
  } : null;
}


// ===== 유틸리티 함수들 =====

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

"use client";

import { useEffect, useState, useCallback, useRef, useMemo, memo } from "react";
import {
  getAppSettings,
  listMembers,
  getTodayAttendance,
  updatePlayerGameStatsBatch,
  getTodayPlayerStatsBatch,
  loadGameState,
  saveGameState,
} from "@/lib/supabase-db";
import type { AppSettings } from "@/types/settings";
import type { Skill, Gender } from "@/types/db";
import { useAlert } from "@/components/CustomAlert";
import OnlineStatusIndicator from "@/components/OnlineStatusIndicator";
import ConfirmModal from "@/components/ConfirmModal";
interface Player {
  id: string;
  name: string;
  skill: Skill;
  gender: Gender;
  gamesPlayedToday: number;
  isGuest: boolean;
}

interface Team {
  id: string;
  players: Player[];
  createdAt: Date;
}

interface Court {
  id: number;
  status: "idle" | "playing" | "finished";
  team?: Team;
  startedAt?: Date;
  duration?: number; // 분 단위
}

// 진행 중인 코트의 경과 시간만 1초마다 갱신하는 독립 컴포넌트.
// 게임판 전체가 매초 리렌더되는 것을 막는다.
function CourtTimer({ startedAt }: { startedAt: Date }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const diffMs = now - startedAt.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  return <>{`${diffMinutes}:${diffSeconds.toString().padStart(2, "0")}`}</>;
}

// 성별에 따라 광범위하게 다른 반응형 스타일을 명시적으로 분리 (디자인 그대로 보존).
const CARD_STYLE = {
  M: {
    outer:
      "p-1.5 sm:p-2 lg:p-3 rounded-lg sm:rounded-xl border-2 transition-all duration-200 min-h-[60px] sm:min-h-[70px] lg:min-h-[90px]",
    selected:
      "bg-blue-50 border-blue-600 cursor-pointer shadow-md transform scale-105",
    statusRow: "flex justify-center h-4 sm:h-5 mb-1",
    statusBadge:
      "w-full text-center text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full font-medium",
    infoRow: "flex items-center justify-between mb-1 h-4 sm:h-5",
    dot: "w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-blue-500",
    name: "font-bold text-xs sm:text-sm lg:text-lg truncate flex-1 text-center px-1",
    skill:
      "px-1 py-0.5 sm:px-1.5 sm:py-0.5 lg:px-2 lg:py-1 rounded text-xs font-medium",
  },
  F: {
    outer:
      "p-2 sm:p-3 rounded-xl border-2 transition-all duration-200 min-h-[70px] sm:min-h-[90px]",
    selected:
      "bg-pink-50 border-pink-600 cursor-pointer shadow-md transform scale-105",
    statusRow: "flex justify-center h-5 mb-1",
    statusBadge: "w-full text-center text-xs px-2 py-1 rounded-full font-medium",
    infoRow: "flex items-center justify-between mb-1 h-5",
    dot: "w-4 h-4 rounded-full bg-pink-500",
    name: "font-bold text-sm sm:text-lg truncate flex-1 text-center",
    skill: "px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-xs font-medium",
  },
} as const;

function skillBadgeColor(skill: Skill): string {
  return skill === "S"
    ? "bg-red-100 text-red-700"
    : skill === "A"
    ? "bg-orange-100 text-orange-700"
    : skill === "B"
    ? "bg-yellow-100 text-yellow-700"
    : skill === "C"
    ? "bg-green-100 text-green-700"
    : "bg-blue-100 text-blue-700";
}

// 플레이어 선택 카드. memo로 감싸 selectedPlayers 변경 시 isSelected가
// 바뀐 카드만 리렌더되도록 격리한다 (핸들러는 useCallback으로 안정화).
const PlayerCard = memo(function PlayerCard({
  player,
  status,
  isSelectable,
  isSelected,
  onSelect,
  onLongPress,
  longPressTimerRef,
}: {
  player: Player;
  status: "available" | "waiting" | "playing" | "home" | "lesson";
  isSelectable: boolean;
  isSelected: boolean;
  onSelect: (player: Player) => void;
  onLongPress: (player: Player) => void;
  longPressTimerRef: { current: ReturnType<typeof setTimeout> | null };
}) {
  const s = CARD_STYLE[player.gender];
  const showBadge =
    status === "playing" ||
    status === "waiting" ||
    status === "home" ||
    status === "lesson";

  return (
    <div
      onClick={() => isSelectable && onSelect(player)}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress(player);
      }}
      onTouchStart={() => {
        longPressTimerRef.current = setTimeout(() => onLongPress(player), 500);
      }}
      onTouchEnd={() => {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      }}
      onTouchMove={() => {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      }}
      className={`${s.outer} ${
        !isSelectable
          ? "opacity-50 cursor-not-allowed bg-gray-50 border-gray-200"
          : isSelected
          ? s.selected
          : status === "playing"
          ? "bg-green-50 border-green-300 cursor-pointer hover:border-green-400 hover:shadow-md"
          : status === "home"
          ? "bg-gray-50 border-gray-300 cursor-pointer hover:border-gray-400 hover:shadow-md"
          : status === "lesson"
          ? "bg-orange-50 border-orange-300 cursor-pointer hover:border-orange-400 hover:shadow-md"
          : "bg-white border-gray-400 hover:border-gray-300 cursor-pointer hover:shadow-md"
      }`}
    >
      {/* 1행: 중앙 상단 게임 상태 */}
      <div className={s.statusRow}>
        {showBadge && (
          <span
            className={`${s.statusBadge} ${
              status === "playing"
                ? "bg-green-100 text-green-700"
                : status === "home"
                ? "bg-gray-100 text-gray-700"
                : status === "lesson"
                ? "bg-orange-100 text-orange-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {status === "playing"
              ? "게임중"
              : status === "home"
              ? "집에 감"
              : status === "lesson"
              ? "레슨 중"
              : "대기중"}
          </span>
        )}
      </div>

      {/* 2행: 성별 점 + 이름 + 등급 */}
      <div className={s.infoRow}>
        <div className={s.dot}></div>
        <span
          className={s.name}
          style={{ color: "var(--notion-text)" }}
          title={`${player.isGuest ? "(G) " : ""}${player.name}`}
        >
          {player.isGuest ? "(G) " : ""}
          {player.name}
        </span>
        <span className={`${s.skill} ${skillBadgeColor(player.skill)}`}>
          {player.skill}
        </span>
      </div>

      {/* 3행: 중앙 게임 수 */}
      <div className="flex justify-center">
        <span className="text-xs text-center text-gray-600 font-bold">
          오늘 {player.gamesPlayedToday} 게임 함
        </span>
      </div>
    </div>
  );
});

export default function GamePage() {
  const { showAlert } = useAlert();

  // 온라인 상태 (상단 표시기용) — navigator.onLine 기반
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [finishingGames, setFinishingGames] = useState<Set<number>>(new Set());
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  // 롱프레스(길게 눌러 상태 지정) 타이머. DOM 리스너 누적 없이 관리한다.
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 플레이어 상태 관리 (집에 감, 레슨 중)
  const [playerStates, setPlayerStates] = useState<
    Record<string, "home" | "lesson" | null>
  >(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("playerStates");
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });
  const [showPlayerStateModal, setShowPlayerStateModal] = useState(false);
  const [selectedPlayerForState, setSelectedPlayerForState] =
    useState<Player | null>(null);

  // 게임 취소 확인 모달
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelCourtId, setCancelCourtId] = useState<number | null>(null);

  // 오늘 출석 참가자(회원+게스트)를 통계와 함께 배치로 로드한다.
  // 초기 로드/새로고침/통계 갱신에서 공통 사용. (기존 플레이어별 N+1 순차 조회 제거)
  const loadPlayersWithStats = useCallback(async (): Promise<Player[]> => {
    const [members, attendance] = await Promise.all([
      listMembers(),
      getTodayAttendance(),
    ]);

    type Entry = {
      id: string;
      name: string;
      type: "member" | "guest";
      skill: Skill;
      gender: Gender;
      isGuest: boolean;
    };
    const entries: Entry[] = [];

    // 회원 먼저
    for (const p of attendance.participants) {
      if (p.type === "member") {
        const member = members.find((m) => m.id === p.memberId);
        if (member) {
          entries.push({
            id: member.id,
            name: member.name,
            type: "member",
            skill: member.skill,
            gender: member.gender,
            isGuest: false,
          });
        }
      }
    }
    // 게스트 (guest-index 규칙 유지)
    let guestIndex = 0;
    for (const p of attendance.participants) {
      if (p.type === "guest") {
        entries.push({
          id: `guest-${guestIndex++}`,
          name: p.name,
          type: "guest",
          skill: p.skill,
          gender: p.gender,
          isGuest: true,
        });
      }
    }

    // 통계 배치 조회 (N+1 → 최대 3쿼리)
    const statsMap = await getTodayPlayerStatsBatch(
      entries.map((e) => ({ id: e.id, name: e.name, type: e.type }))
    );

    const players: Player[] = entries.map((e) => ({
      id: e.id,
      name: e.name,
      skill: e.skill,
      gender: e.gender,
      isGuest: e.isGuest,
      gamesPlayedToday: statsMap[e.id]?.gamesPlayedToday ?? 0,
    }));

    return players.sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // 게임 상태를 Supabase에 저장
  const saveCurrentGameState = useCallback(async () => {
    try {
      // 팀 데이터를 GameTeam 형식으로 변환
      const gameTeams = teams.map((team) => ({
        id: team.id,
        players: team.players.map((player) => ({
          id: player.id,
          name: player.name,
          skill: player.skill,
          gender: player.gender,
          isGuest: player.isGuest,
        })),
      }));

      // 코트 데이터를 GameCourt 형식으로 변환
      const gameCourts = courts.map((court) => ({
        id: court.id,
        status: court.status,
        team: court.team
          ? {
              id: court.team.id,
              players: court.team.players.map((player) => ({
                id: player.id,
                name: player.name,
                skill: player.skill,
                gender: player.gender,
                isGuest: player.isGuest,
              })),
            }
          : undefined,
        startedAt: court.startedAt ? court.startedAt.toISOString() : undefined,
        duration: court.duration,
      }));

      await saveGameState({ teams: gameTeams, courts: gameCourts });
    } catch (error) {
      console.error("게임 상태 저장 실패:", error);
    }
  }, [teams, courts]);

  // 게임 상태를 Supabase에서 불러오기. 저장된 상태가 있었는지 여부를 반환한다.
  const loadGameStateFromDB = useCallback(async (): Promise<boolean> => {
    try {
      const gameState = await loadGameState();
      if (!gameState) return false;

      // 서버에서 불러온 팀들을 현재 상태에 설정 (타입 변환)
      const restoredTeams: Team[] =
        gameState.teams && gameState.teams.length > 0
          ? gameState.teams.map((team) => ({
              id: team.id,
              players: team.players.map((player) => ({
                id: player.id,
                name: player.name,
                skill: player.skill as Skill,
                gender: player.gender as Gender,
                isGuest: player.isGuest,
                gamesPlayedToday: 0, // 서버에서는 이 정보가 없으므로 0으로 초기화
              })),
              createdAt: new Date(),
            }))
          : [];

      // 서버에서 불러온 코트들을 현재 상태에 설정 (타입 변환)
      const restoredCourts: Court[] =
        gameState.courts && gameState.courts.length > 0
          ? gameState.courts.map((court) => ({
              id: court.id,
              status: court.status as "idle" | "playing" | "finished",
              team: court.team
                ? {
                    id: court.team.id,
                    players: court.team.players.map((player) => ({
                      id: player.id,
                      name: player.name,
                      skill: player.skill as Skill,
                      gender: player.gender as Gender,
                      isGuest: player.isGuest,
                      gamesPlayedToday: 0,
                    })),
                    createdAt: new Date(),
                  }
                : undefined,
              startedAt: court.startedAt
                ? new Date(court.startedAt)
                : undefined,
              duration: court.duration,
            }))
          : [];

      if (restoredTeams.length > 0) setTeams(restoredTeams);
      if (restoredCourts.length > 0) setCourts(restoredCourts);
      return true;
    } catch (error) {
      console.error("게임 상태 불러오기 실패:", error);
      return false;
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // 서로 독립적인 초기 로드를 병렬 실행 (순차 waterfall 제거 → 왕복 절반으로 단축)
        // - getAppSettings: 코트 설정
        // - loadPlayersWithStats: 출석 플레이어 + 통계(배치)
        // - loadGameStateFromDB: 저장된 게임판 복원 (반환값으로 중복 조회 제거)
        const [appSettings, players, hadState] = await Promise.all([
          getAppSettings(),
          loadPlayersWithStats(),
          loadGameStateFromDB(),
        ]);
        setSettings(appSettings);
        setAvailablePlayers(players);

        if (!hadState) {
          // 저장된 게임 상태가 없으면 초기 코트 상태 생성
          const initialCourts: Court[] = Array.from(
            { length: appSettings.courtsCount },
            (_, i) => ({
              id: i + 1,
              status: "idle",
            })
          );
          setCourts(initialCourts);
        }

      } catch (e) {
        console.error("게임 페이지 초기화 실패:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadPlayersWithStats, loadGameStateFromDB]);

  // 게임 상태 변경 시 자동 저장 (디바운싱)
  // 단일 기기 운영이라 실시간 구독이 없어 저장↔구독 루프가 발생하지 않는다.
  // 저장은 새로고침/재시작 시 게임판 복원을 위한 것.
  useEffect(() => {
    if (loading || (courts.length === 0 && teams.length === 0)) return;

    const timeoutId = setTimeout(() => {
      saveCurrentGameState();
    }, 500); // 500ms 디바운싱

    return () => clearTimeout(timeoutId);
  }, [courts, teams, loading, saveCurrentGameState]);

  // 설정 변경 시 코트 수 동기화
  useEffect(() => {
    if (settings && settings.courtsCount !== courts.length) {
      const newCourts: Court[] = [];
      for (let i = 1; i <= settings.courtsCount; i++) {
        const existingCourt = courts.find((c) => c.id === i);
        if (existingCourt) {
          newCourts.push(existingCourt);
        } else {
          newCourts.push({
            id: i,
            status: "idle",
          });
        }
      }
      setCourts(newCourts);
    }
  }, [settings, courts]);

  // 플레이어 선택/해제
  const togglePlayerSelection = useCallback((player: Player) => {
    setSelectedPlayers((prev) => {
      if (prev.find((p) => p.id === player.id)) {
        return prev.filter((p) => p.id !== player.id);
      }
      if (prev.length < 4) {
        return [...prev, player];
      }
      return prev;
    });
  }, []);

  // 팀 수정 시작
  const startEditTeam = (team: Team) => {
    setEditingTeam(team);
    setSelectedPlayers([...team.players]);
    setShowPlayerModal(true);
  };

  // 팀 수정 완료
  const updateTeamAndCloseModal = async () => {
    if (selectedPlayers.length === 4 && editingTeam) {
      const updatedTeams = teams.map((team) =>
        team.id === editingTeam.id
          ? { ...team, players: selectedPlayers }
          : team
      );
      // 오프라인 최적화: 즉시 UI 업데이트
      setTeams(updatedTeams);
      setSelectedPlayers([]);
      setShowPlayerModal(false);
      setEditingTeam(null);

      // Supabase 저장은 자동저장 useEffect(디바운스)가 일괄 처리한다.
    }
  };

  // 팀 삭제
  const deleteTeam = async (teamId: string) => {
    const updatedTeams = teams.filter((t) => t.id !== teamId);

    // 오프라인 최적화: 즉시 UI 업데이트
    setTeams(updatedTeams);
    if (selectedTeam?.id === teamId) {
      setSelectedTeam(null);
    }

    // Supabase 저장은 자동저장 useEffect(디바운스)가 일괄 처리한다.
  };

  // 팀이 게임 가능한지 확인 (게임 중인 플레이어가 있으면 불가)
  const canTeamPlay = (team: Team): boolean => {
    return team.players.every(
      (player) => getPlayerStatus(player.id) !== "playing"
    );
  };

  // 코트에 팀 배정
  const assignTeamToCourt = async (courtId: number, team: Team) => {
    if (!canTeamPlay(team)) {
      showAlert(
        "게임 중인 플레이어가 포함된 팀은 매칭할 수 없습니다.",
        "warning"
      );
      return;
    }

    const updatedCourts = courts.map((court) =>
      court.id === courtId
        ? { ...court, status: "playing" as const, team, startedAt: new Date() }
        : court
    );
    const updatedTeams = teams.filter((t) => t.id !== team.id);

    // 오프라인 최적화: 즉시 UI 업데이트
    setCourts(updatedCourts);
    setTeams(updatedTeams);
    setSelectedTeam(null);

    // Supabase 저장은 자동저장 useEffect(디바운스)가 일괄 처리한다.
  };

  // 게임 종료
  const finishGame = async (courtId: number) => {
    // 중복 클릭 방지
    if (finishingGames.has(courtId)) return;

    setFinishingGames((prev) => new Set(prev).add(courtId));

    try {
      const court = courts.find((c) => c.id === courtId);
      if (court && court.team) {
        // 낙관적 업데이트: 팀원들의 오늘 게임 수 +1 (즉시 반영)
        const teamPlayerIds = new Set(court.team.players.map((p) => p.id));
        setAvailablePlayers((prev) =>
          prev.map((player) =>
            teamPlayerIds.has(player.id)
              ? { ...player, gamesPlayedToday: player.gamesPlayedToday + 1 }
              : player
          )
        );

        // DB에 게임 통계 배치 업데이트 (4명 순차 → upsert 1회).
        // 낙관적 반영이 끝났으므로 전체 재조회(N+1)는 생략한다.
        try {
          await updatePlayerGameStatsBatch(
            court.team.players.map(
              (p): { id: string; name: string; type: "member" | "guest" } => ({
                id: p.id,
                name: p.name,
                type: p.isGuest ? "guest" : "member",
              })
            )
          );
        } catch (error) {
          console.error("게임 통계 업데이트 실패:", error);
        }
      }
    } finally {
      setFinishingGames((prev) => {
        const newSet = new Set(prev);
        newSet.delete(courtId);
        return newSet;
      });
    }

    const updatedCourts = courts.map((court) =>
      court.id === courtId
        ? {
            ...court,
            status: "idle" as const,
            team: undefined,
            startedAt: undefined,
          }
        : court
    );

    // 오프라인 최적화: 즉시 UI 업데이트
    setCourts(updatedCourts);

    // Supabase 저장은 자동저장 useEffect(디바운스)가 일괄 처리한다.
  };

  // 게임 취소 (게임 횟수에 카운트되지 않음)
  const cancelGame = async (courtId: number) => {
    // 중복 클릭 방지
    if (finishingGames.has(courtId)) return;

    setFinishingGames((prev) => new Set(prev).add(courtId));

    try {
      const court = courts.find((c) => c.id === courtId);
      if (!court || !court.team) return;

      // 코트 상태만 초기화 (게임 통계 업데이트 없음)
      const updatedCourts = courts.map((court) =>
        court.id === courtId
          ? {
              ...court,
              status: "idle" as const,
              team: undefined,
              startedAt: undefined,
            }
          : court
      );

      // 오프라인 최적화: 즉시 UI 업데이트
      setCourts(updatedCourts);

      // Supabase 저장은 자동저장 useEffect(디바운스)가 일괄 처리한다.
    } catch (error) {
      console.error("게임 취소 실패:", error);
      showAlert("게임 취소에 실패했습니다.", "error");
    } finally {
      setFinishingGames((prev) => {
        const newSet = new Set(prev);
        newSet.delete(courtId);
        return newSet;
      });
    }
  };

  // 게임 취소 확인 모달 관련 함수들
  const handleCancelGameClick = (courtId: number) => {
    setCancelCourtId(courtId);
    setShowCancelConfirm(true);
  };

  const handleCancelConfirm = () => {
    if (cancelCourtId !== null) {
      cancelGame(cancelCourtId);
    }
    setShowCancelConfirm(false);
    setCancelCourtId(null);
  };

  const handleCancelCancel = () => {
    setShowCancelConfirm(false);
    setCancelCourtId(null);
  };

  // 플레이어 상태 관리 함수들
  const handlePlayerLongPress = useCallback((player: Player) => {
    setSelectedPlayerForState(player);
    setShowPlayerStateModal(true);
  }, []);

  const setPlayerState = (
    playerId: string,
    state: "home" | "lesson" | null
  ) => {
    const newStates = {
      ...playerStates,
      [playerId]: state,
    };
    setPlayerStates(newStates);

    // 로컬 스토리지에 저장
    if (typeof window !== "undefined") {
      localStorage.setItem("playerStates", JSON.stringify(newStates));
    }

    setShowPlayerStateModal(false);
    setSelectedPlayerForState(null);
  };

  // 코트에서 게임 중인 플레이어 id 집합 (렌더당 1회 계산, O(1) 조회)
  const playersInCourtsSet = useMemo(() => {
    const s = new Set<string>();
    courts.forEach((c) => c.team?.players.forEach((p) => s.add(p.id)));
    return s;
  }, [courts]);

  // 대기열에 있는 플레이어 id 집합 (수정 중인 팀은 제외)
  const playersInTeamsSet = useMemo(() => {
    const s = new Set<string>();
    teams.forEach((t) => {
      if (editingTeam && t.id === editingTeam.id) return;
      t.players.forEach((p) => s.add(p.id));
    });
    return s;
  }, [teams, editingTeam]);

  // 플레이어 상태 확인 (확장된 상태 포함)
  const getPlayerStatus = useCallback(
    (
      playerId: string
    ): "available" | "waiting" | "playing" | "home" | "lesson" => {
      // 먼저 특별 상태 확인
      const specialState = playerStates[playerId];
      if (specialState) return specialState;

      if (playersInCourtsSet.has(playerId)) return "playing";
      if (playersInTeamsSet.has(playerId)) return "waiting";
      return "available";
    },
    [playerStates, playersInCourtsSet, playersInTeamsSet]
  );

  // 플레이어 정렬 (남자-이름순, 여자-이름순) - 모든 플레이어 표시
  const sortedPlayers = useMemo(() => {
    // 모든 출석한 플레이어를 표시 (상태와 관계없이)
    const males = availablePlayers
      .filter((p) => p.gender === "M")
      .sort((a, b) => a.name.localeCompare(b.name));
    const females = availablePlayers
      .filter((p) => p.gender === "F")
      .sort((a, b) => a.name.localeCompare(b.name));

    return [...males, ...females];
  }, [availablePlayers]);

  // 실력 기반 랜덤 선택 (골고루 분포)
  const selectPlayersBySkill = (players: Player[], count: number): Player[] => {
    if (players.length <= count) {
      return [...players];
    }

    // 전체 플레이어를 완전 랜덤으로 섞기
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);

    // 섞인 플레이어 중에서 필요한 수만큼 선택
    return shuffledPlayers.slice(0, count);
  };

  // 자동 매칭 - 남복 (남자 4명) - 게임 중인 플레이어도 포함
  const autoMatchMale = () => {
    const selectablePlayers = availablePlayers.filter((player) => {
      const status = getPlayerStatus(player.id);
      return status !== "waiting" && status !== "home" && status !== "lesson";
    });
    const males = selectablePlayers.filter((p) => p.gender === "M");

    if (males.length < 4) {
      showAlert("선택 가능한 남자 플레이어가 4명 미만입니다.", "warning");
      return;
    }

    const selectedTeam = selectPlayersBySkill(males, 4);
    setSelectedPlayers(selectedTeam);
  };

  // 자동 매칭 - 여복 (여자 4명) - 게임 중인 플레이어도 포함
  const autoMatchFemale = () => {
    const selectablePlayers = availablePlayers.filter((player) => {
      const status = getPlayerStatus(player.id);
      return status !== "waiting" && status !== "home" && status !== "lesson";
    });
    const females = selectablePlayers.filter((p) => p.gender === "F");

    if (females.length < 4) {
      showAlert("선택 가능한 여자 플레이어가 4명 미만입니다.", "warning");
      return;
    }

    const selectedTeam = selectPlayersBySkill(females, 4);
    setSelectedPlayers(selectedTeam);
  };

  // 자동 매칭 - 혼복 (남자 2명 + 여자 2명) - 게임 중인 플레이어도 포함
  const autoMatchMixed = () => {
    const selectablePlayers = availablePlayers.filter((player) => {
      const status = getPlayerStatus(player.id);
      return status !== "waiting" && status !== "home" && status !== "lesson";
    });
    const males = selectablePlayers.filter((p) => p.gender === "M");
    const females = selectablePlayers.filter((p) => p.gender === "F");

    if (males.length < 2 || females.length < 2) {
      showAlert("혼복을 위해서는 남자 2명, 여자 2명이 필요합니다.", "warning");
      return;
    }

    const selectedMales = selectPlayersBySkill(males, 2);
    const selectedFemales = selectPlayersBySkill(females, 2);

    const selectedTeam = [...selectedMales, ...selectedFemales];
    setSelectedPlayers(selectedTeam);
  };

  // 팀 생성 및 모달 닫기
  const createTeamAndCloseModal = async () => {
    if (selectedPlayers.length === 4) {
      const newTeam: Team = {
        id: `team-${Date.now()}`,
        players: selectedPlayers,
        createdAt: new Date(),
      };
      const updatedTeams = [...teams, newTeam];

      // 오프라인 최적화: 즉시 UI 업데이트
      setTeams(updatedTeams);
      setSelectedPlayers([]);
      setShowPlayerModal(false);

      // Supabase 저장은 자동저장 useEffect(디바운스)가 일괄 처리한다.
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen p-8 flex items-center justify-center"
        style={{ backgroundColor: "var(--notion-bg-secondary)" }}
      >
        <div className="text-center">
          <div className="spinner h-8 w-8 mx-auto mb-2"></div>
          <span style={{ color: "var(--notion-text-light)" }}>
            불러오는 중...
          </span>
        </div>
      </div>
    );
  }

  return (
    <main
      className="min-h-screen p-2 sm:p-4 lg:p-8"
      style={{ backgroundColor: "var(--notion-bg-secondary)" }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1
            className="text-3xl font-bold"
            style={{ color: "var(--notion-text)" }}
          >
            게임판
          </h1>

          {/* 온라인 상태 표시기 */}
          <OnlineStatusIndicator
            isOnline={isOnline}
            pendingSyncCount={0}
            className="ml-4"
          />
        </div>

        {/* 다음 대기팀 - 컴팩트 디자인 */}
        {(() => {
          const playableTeams = teams.filter((team) => canTeamPlay(team));
          const firstTeam = playableTeams[0];
          return firstTeam ? (
            <div className="mb-4">
              <div
                onClick={() =>
                  setSelectedTeam(
                    selectedTeam?.id === firstTeam.id ? null : firstTeam
                  )
                }
                className={`golden-rotating-border rounded-xl p-4 cursor-pointer transition-all duration-300 ${
                  selectedTeam?.id === firstTeam.id ? "shadow-2xl" : "shadow-xl"
                }`}
                style={{
                  background:
                    selectedTeam?.id === firstTeam.id
                      ? "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)"
                      : "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)",
                }}
              >
                <div className="flex items-center justify-between relative z-10">
                  {/* 제목 */}
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏸</span>
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                      다음 대기팀
                    </h3>
                  </div>

                  {/* 플레이어 목록 - 중앙 배치 */}
                  <div className="flex items-center gap-4">
                    {firstTeam.players.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center gap-2 px-7 py-4 bg-white/80 backdrop-blur-sm rounded-lg shadow-md border border-gray-600/50"
                      >
                        <div
                          className={`w-3 h-3 rounded-full shadow-sm ${
                            player.gender === "M"
                              ? "bg-gradient-to-r from-blue-500 to-blue-600"
                              : "bg-gradient-to-r from-pink-500 to-pink-600"
                          }`}
                        ></div>
                        <span className="text-xl font-bold text-gray-800">
                          {player.isGuest ? "(G) " : ""}
                          {player.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 우측 버튼들 */}
                  <div className="flex items-center gap-2">
                    <span className="px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-l font-medium rounded-full shadow-md">
                      클릭 후 코트 선택
                    </span>
                    {selectedTeam?.id === firstTeam.id && (
                      <span className="px-2 py-1 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-medium rounded-full shadow-md animate-pulse">
                        ✓ 선택됨
                      </span>
                    )}
                  </div>
                </div>

                {selectedTeam?.id === firstTeam.id && (
                  <div className="mt-3 text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 text-xs font-medium rounded-full border border-green-200">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      사용 가능한 코트를 클릭하여 게임을 시작하세요
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null;
        })()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {/* 왼쪽: 코트 현황 */}
          <div className="lg:col-span-2">
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2
                  className="text-lg font-semibold"
                  style={{ color: "var(--notion-text)" }}
                >
                  코트 현황
                </h2>
                <span className="notion-badge notion-badge-blue">
                  {settings?.courtsCount}개
                </span>
                <button
                  onClick={async () => {
                    try {
                      // DB에서 최신 설정 + 플레이어 통계 + 게임 상태를 병렬 동기화
                      const [appSettings, players] = await Promise.all([
                        getAppSettings(),
                        loadPlayersWithStats(),
                        loadGameStateFromDB(),
                      ]);
                      setSettings(appSettings);
                      setAvailablePlayers(players);
                    } catch (error) {
                      console.error("동기화 실패:", error);
                      showAlert(
                        "동기화에 실패했습니다. 다시 시도해주세요.",
                        "error"
                      );
                    }
                  }}
                  className="notion-btn notion-btn-secondary px-3 py-1 text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 ml-2"
                >
                  🔄 새로고침
                </button>
                {selectedTeam && (
                  <span
                    className={`text-xl ml-4 font-bold ${
                      canTeamPlay(selectedTeam)
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {canTeamPlay(selectedTeam)
                      ? "팀을 선택했습니다. 코트를 클릭하여 게임을 시작하세요."
                      : "선택된 팀은 게임 중인 플레이어가 있어 매칭할 수 없습니다."}
                  </span>
                )}
              </div>
              <div
                className="space-y-2"
                style={{ height: `${Math.max(400, courts.length * 80)}px` }}
              >
                {courts.map((court) => (
                  <div
                    key={court.id}
                    onClick={() => {
                      if (
                        selectedTeam &&
                        court.status === "idle" &&
                        canTeamPlay(selectedTeam)
                      ) {
                        assignTeamToCourt(court.id, selectedTeam);
                      }
                    }}
                    className={`relative border-2 rounded-lg p-4 transition-all duration-200 ${
                      court.status === "playing"
                        ? "bg-green-50 border-green-400"
                        : "bg-white border-gray-200"
                    } ${
                      selectedTeam &&
                      court.status === "idle" &&
                      canTeamPlay(selectedTeam)
                        ? "cursor-pointer hover:shadow-md border-green-300 court-sparkle"
                        : selectedTeam &&
                          court.status === "idle" &&
                          !canTeamPlay(selectedTeam)
                        ? "cursor-not-allowed border-red-300"
                        : ""
                    }`}
                    style={{
                      minHeight: "80px",
                    }}
                  >
                    {/* 타이머 - 상단 중앙 */}
                    {court.status === "playing" && court.startedAt && (
                      <div className="absolute top-1 left-1/2 transform -translate-x-1/2">
                        <div className="flex items-center justify-center bg-green-100 text-green-900 font-bold px-8 py-1 rounded-lg shadow-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-900 rounded-full animate-bounce"></div>
                            <span className="text-lg font-bold font-mono tracking-wider">
                              <CourtTimer startedAt={court.startedAt} />
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 상태 배지 - 우측 상단 */}
                    <div className="flex absolute top-2 right-2">
                      <span
                        className={`notion-badge text-xs ${
                          court.status === "playing"
                            ? "notion-badge-green"
                            : "notion-badge-gray"
                        }`}
                      >
                        {court.status === "playing" ? "게임 중" : "대기"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-6">
                      {/* 왼쪽: 코트 번호 */}
                      <div
                        className={`px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg font-bold text-lg sm:text-xl ${
                          court.status === "playing"
                            ? "bg-green-500 text-white shadow-lg"
                            : "bg-gray-100 text-gray-700 shadow-md"
                        }`}
                      >
                        코트 {court.id}
                      </div>

                      {/* 중앙: 플레이어 정보 */}
                      {court.status === "playing" && court.team ? (
                        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 flex-1 justify-center px-2">
                          {court.team.players.map((player, index) => (
                            <div
                              key={player.id}
                              className="flex items-center gap-1"
                            >
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  player.gender === "M"
                                    ? "bg-blue-500"
                                    : "bg-pink-500"
                                }`}
                              ></div>
                              <span
                                className="font-bold text-base sm:text-lg lg:text-xl"
                                style={{ color: "var(--notion-text)" }}
                                title={player.name}
                              >
                                {player.name}
                              </span>
                              <span className="notion-badge notion-badge-orange text-xs">
                                {player.skill}
                              </span>
                              {index < (court.team?.players.length || 0) - 1 && (
                                <span className="text-gray-400 mx-1">|</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex-1 text-center px-2">
                          <span className="text-gray-500 text-lg sm:text-xl font-bold">
                            {selectedTeam && court.status === "idle"
                              ? canTeamPlay(selectedTeam)
                                ? "클릭하여 게임 시작"
                                : "매칭 불가 (게임중 플레이어 포함)"
                              : "게임 대기 중"}
                          </span>
                        </div>
                      )}

                      {/* 오른쪽: 버튼들 (세로 배치) */}
                      {court.status === "playing" && (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              finishGame(court.id);
                            }}
                            disabled={finishingGames.has(court.id)}
                            className="px-2 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {finishingGames.has(court.id) ? "처리중" : "게임 종료"}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelGameClick(court.id);
                            }}
                            disabled={finishingGames.has(court.id)}
                            className="px-2 py-1 bg-gray-500 text-white rounded text-xs font-medium hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            게임 취소
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* 오른쪽: 대기 팀 목록 */}
          <div className="lg:col-span-1">
            <section>
              <div className={`flex ${courts.length <= 3 ? 'flex-col sm:flex-row sm:items-center sm:justify-between' : 'flex-col'} mb-4 gap-3 sm:gap-4`}>
                <h2
                  className="text-xl sm:text-2xl font-semibold"
                  style={{ color: "var(--notion-text)" }}
                >
                  대기 팀 ({teams.length})
                </h2>
                <button
                  onClick={() => setShowPlayerModal(true)}
                  className={`notion-btn w-full ${courts.length <= 3 ? 'sm:w-auto sm:min-w-[200px]' : 'sm:w-full'} ${courts.length <= 2 ? 'h-12 sm:h-16 lg:h-20' : courts.length <= 4 ? 'h-10 sm:h-12 lg:h-16' : 'h-10 sm:h-12'} notion-btn-primary px-4 py-2 sm:px-6 sm:py-3 font-bold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center animate-gentle-pulse ${courts.length <= 2 ? 'text-base sm:text-lg lg:text-2xl' : courts.length <= 4 ? 'text-sm sm:text-base lg:text-lg' : 'text-sm sm:text-base'}`}
                >
                  팀 구성하기
                </button>
              </div>
              <div className="notion-card p-4 max-h-96 overflow-y-auto">
                <div className="space-y-3">
                  {teams.map((team, index) => {
                    const teamCanPlay = canTeamPlay(team);
                    return (
                      <div
                        key={team.id}
                        onClick={() =>
                          setSelectedTeam(
                            selectedTeam?.id === team.id ? null : team
                          )
                        }
                        className={`p-2 rounded-lg border cursor-pointer transition-all duration-200 ${
                          !teamCanPlay
                            ? "bg-red-50 border-red-200 opacity-75"
                            : selectedTeam?.id === team.id
                            ? "bg-green-50 border-green-300"
                            : "bg-white border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-medium text-sm"
                              style={{ color: "var(--notion-text)" }}
                            >
                              대기열 {index + 1}
                            </span>
                            {!teamCanPlay && (
                              <span className="notion-badge notion-badge-red text-xs">
                                매칭불가
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditTeam(team);
                              }}
                              className="text-blue-500 hover:text-blue-700 text-xs px-2 py-1 rounded"
                            >
                              수정
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTeam(team.id);
                              }}
                              className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                          {team.players.map((player) => {
                            const playerStatus = getPlayerStatus(player.id);
                            return (
                              <div
                                key={player.id}
                                className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 text-xs"
                              >
                                <div
                                  className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                                    player.gender === "M"
                                      ? "bg-blue-500"
                                      : "bg-pink-500"
                                  }`}
                                ></div>
                                <span className="flex-1 truncate font-bold text-xs sm:text-sm" title={player.name}>
                                  {player.name}
                                </span>
                                <span className="notion-badge notion-badge-orange text-xs px-1 py-0.5">
                                  {player.skill}
                                </span>
                                {playerStatus === "playing" && (
                                  <span className="notion-badge notion-badge-green text-xs">
                                    게임중
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {teams.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <div className="mb-2">대기 중인 팀이 없습니다</div>
                      <div className="text-xs">
                        팀짜기 버튼을 눌러 팀을 만들어보세요
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* 플레이어 선택 모달 */}
        {showPlayerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-2 lg:p-4">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => {
                setShowPlayerModal(false);
                setSelectedPlayers([]);
                setEditingTeam(null);
              }}
            />
            <div
              className="notion-card relative w-full max-w-sm sm:max-w-4xl lg:max-w-7xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden"
              style={{ boxShadow: "var(--notion-shadow-hover)" }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 sm:p-3 lg:p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <h3
                    className="text-lg sm:text-xl font-bold truncate"
                    style={{ color: "var(--notion-text)" }}
                  >
                    🏸 {editingTeam ? "팀 수정" : "플레이어 선택"} (
                    {selectedPlayers.length}/4)
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 hidden sm:block">
                    {editingTeam
                      ? "팀 구성을 수정하세요"
                      : "4명을 선택하여 팀을 만드세요"}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2 lg:gap-3">
                  <button
                    onClick={autoMatchMale}
                    className="notion-btn notion-btn-primary px-2 py-1.5 sm:px-3 sm:py-2 lg:px-4 lg:py-3 text-xs sm:text-sm font-semibold"
                  >
                    <span className="hidden sm:inline">🎯 자동 매칭-남복</span>
                    <span className="sm:hidden">🎯 남복</span>
                  </button>
                  <button
                    onClick={autoMatchFemale}
                    className="notion-btn notion-btn-primary px-2 py-1.5 sm:px-3 sm:py-2 lg:px-4 lg:py-3 text-xs sm:text-sm font-semibold"
                  >
                    <span className="hidden sm:inline">🎯 자동 매칭-여복</span>
                    <span className="sm:hidden">🎯 여복</span>
                  </button>
                  <button
                    onClick={autoMatchMixed}
                    className="notion-btn notion-btn-primary px-2 py-1.5 sm:px-3 sm:py-2 lg:px-4 lg:py-3 text-xs sm:text-sm font-semibold"
                  >
                    <span className="hidden sm:inline">🎯 자동 매칭-혼복</span>
                    <span className="sm:hidden">🎯 혼복</span>
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowPlayerModal(false);
                    setSelectedPlayers([]);
                    setEditingTeam(null);
                  }}
                  className="text-xl sm:text-2xl opacity-70 hover:opacity-100 px-2 py-2 sm:px-4 sm:py-3 rounded-lg hover:bg-gray-100 transition-all duration-200 self-end sm:self-auto"
                  style={{ color: "var(--notion-text-light)" }}
                >
                  ✕
                </button>
              </div>

              <div
                className="p-4 overflow-y-auto"
                style={{ maxHeight: "calc(90vh - 150px)" }}
              >
                {availablePlayers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-xl mb-2">
                      출석한 플레이어가 없습니다
                    </div>
                    <div className="text-sm">
                      출석 관리에서 출석을 체크해주세요
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    {/* 남자 플레이어 섹션 */}
                    <div className="flex-1">
                      <div className="flex items-center justify-center mb-3 sm:mb-4 pb-2 border-b-2 border-blue-200">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-blue-500 mr-2"></div>
                        <h3 className="text-sm font-bold text-blue-700">남</h3>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-2 lg:gap-3">
                        {sortedPlayers
                          .filter((player) => player.gender === "M")
                          .map((player) => {
                            const status = getPlayerStatus(player.id);
                            // 수정 모드일 때는 게임 중, 집에 간, 레슨 중이 아닌 플레이어 선택 가능
                            const isSelectable = editingTeam
                              ? !["playing", "home", "lesson"].includes(status)
                              : !["waiting", "home", "lesson"].includes(status);
                            return (
                              <PlayerCard
                                key={player.id}
                                player={player}
                                status={status}
                                isSelectable={isSelectable}
                                isSelected={
                                  !!selectedPlayers.find(
                                    (p) => p.id === player.id
                                  )
                                }
                                onSelect={togglePlayerSelection}
                                onLongPress={handlePlayerLongPress}
                                longPressTimerRef={longPressTimerRef}
                              />
                            );
                          })}
                      </div>
                    </div>

                    {/* 구분선 */}
                    <div className="w-px bg-gray-300 hidden sm:block"></div>
                    <div className="h-px bg-gray-300 sm:hidden my-3"></div>

                    {/* 여자 플레이어 섹션 */}
                    <div className="flex-1">
                      <div className="flex items-center justify-center mb-3 sm:mb-4 pb-2 border-b-2 border-pink-200">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-pink-500 mr-2"></div>
                        <h3 className="text-sm font-bold text-pink-700">여</h3>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-2 lg:gap-3">
                        {sortedPlayers
                          .filter((player) => player.gender === "F")
                          .map((player) => {
                            const status = getPlayerStatus(player.id);
                            // 수정 모드일 때는 게임 중, 집에 간, 레슨 중이 아닌 플레이어 선택 가능
                            const isSelectable = editingTeam
                              ? !["playing", "home", "lesson"].includes(status)
                              : !["waiting", "home", "lesson"].includes(status);
                            return (
                              <PlayerCard
                                key={player.id}
                                player={player}
                                status={status}
                                isSelectable={isSelectable}
                                isSelected={
                                  !!selectedPlayers.find(
                                    (p) => p.id === player.id
                                  )
                                }
                                onSelect={togglePlayerSelection}
                                onLongPress={handlePlayerLongPress}
                                longPressTimerRef={longPressTimerRef}
                              />
                            );
                          })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 팀 생성/수정 버튼 (모달 바깥) */}
        {showPlayerModal && selectedPlayers.length === 4 && (
          <div className="fixed bottom-2 sm:bottom-4 lg:bottom-8 left-1/2 transform -translate-x-1/2 z-[60] px-2 sm:px-4 w-full max-w-xs sm:max-w-sm lg:max-w-none lg:w-auto">
            <button
              onClick={
                editingTeam ? updateTeamAndCloseModal : createTeamAndCloseModal
              }
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 sm:py-4 sm:px-8 lg:py-8 lg:px-24 rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-300 text-lg sm:text-xl lg:text-3xl w-full lg:w-auto"
              style={{
                background: editingTeam
                  ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                  : "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                boxShadow: editingTeam
                  ? "0 20px 40px rgba(16, 185, 129, 0.3)"
                  : "0 20px 40px rgba(59, 130, 246, 0.3)",
              }}
            >
              {editingTeam ? "팀 수정" : "팀 생성"}
            </button>
          </div>
        )}
      </div>

      {/* 플레이어 상태 선택 모달 */}
      {showPlayerStateModal && selectedPlayerForState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setShowPlayerStateModal(false);
              setSelectedPlayerForState(null);
            }}
          />
          <div
            className="notion-card relative w-full max-w-md"
            style={{ boxShadow: "var(--notion-shadow-hover)" }}
          >
            <div className="p-6">
              <div className="text-center mb-6">
                <h3
                  className="text-xl font-bold mb-2"
                  style={{ color: "var(--notion-text)" }}
                >
                  {selectedPlayerForState.name} 상태 변경
                </h3>
                <p className="text-sm text-gray-600">
                  플레이어의 상태를 선택하세요
                </p>
              </div>

              <div className="space-y-3">
                {/* 집에 감 버튼 */}
                <button
                  onClick={() => {
                    const currentState =
                      playerStates[selectedPlayerForState.id];
                    setPlayerState(
                      selectedPlayerForState.id,
                      currentState === "home" ? null : "home"
                    );
                  }}
                  className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
                    playerStates[selectedPlayerForState.id] === "home"
                      ? "bg-gray-100 border-gray-500 text-gray-700"
                      : "bg-white border-gray-300 hover:border-gray-400 text-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">🏠</span>
                    <span className="font-medium">
                      {playerStates[selectedPlayerForState.id] === "home"
                        ? "집에 감 해제"
                        : "집에 감"}
                    </span>
                  </div>
                </button>

                {/* 레슨 중 버튼 */}
                <button
                  onClick={() => {
                    const currentState =
                      playerStates[selectedPlayerForState.id];
                    setPlayerState(
                      selectedPlayerForState.id,
                      currentState === "lesson" ? null : "lesson"
                    );
                  }}
                  className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
                    playerStates[selectedPlayerForState.id] === "lesson"
                      ? "bg-orange-100 border-orange-500 text-orange-700"
                      : "bg-white border-gray-300 hover:border-gray-400 text-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">💸</span>
                    <span className="font-medium">
                      {playerStates[selectedPlayerForState.id] === "lesson"
                        ? "레슨 중 해제"
                        : "레슨 중"}
                    </span>
                  </div>
                </button>

                {/* 취소 버튼 */}
                <button
                  onClick={() => {
                    setShowPlayerStateModal(false);
                    setSelectedPlayerForState(null);
                  }}
                  className="w-full p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-all duration-200"
                >
                  창 닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 게임 취소 확인 모달 */}
      <ConfirmModal
        isOpen={showCancelConfirm}
        title="게임 취소"
        message="게임을 취소하시겠습니까? 게임 횟수에 카운트되지 않습니다."
        confirmText="취소하기"
        cancelText="돌아가기"
        onConfirm={handleCancelConfirm}
        onCancel={handleCancelCancel}
        type="warning"
      />
    </main>
  );
}

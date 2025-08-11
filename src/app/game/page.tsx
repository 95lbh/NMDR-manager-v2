'use client';

import { useEffect, useState } from 'react';
import { getAppSettings, listMembers, getTodayAttendance, updatePlayerGameStats, getTodayPlayerStats } from '@/lib/firestore';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppSettings } from '@/types/settings';
import type { Skill, Gender } from '@/types/db';
import { useAlert } from '@/components/CustomAlert';
interface Player {
  id: string;
  name: string;
  skill: Skill;
  gender: Gender;
  gamesPlayedToday: number;
  isGuest?: boolean;
}

interface Team {
  id: string;
  players: Player[];
  createdAt: Date;
}

interface Court {
  id: number;
  status: 'idle' | 'playing' | 'finished';
  team?: Team;
  startedAt?: Date;
  duration?: number; // 분 단위
}

interface SerializedCourt {
  id: number;
  status: 'idle' | 'playing' | 'finished';
  team?: Team;
  startedAt?: string;
  duration?: number;
}

interface SerializedTeam {
  id: string;
  players: Player[];
  createdAt: string;
}

interface GameState {
  date: string; // YYYY-MM-DD 형식
  courts: SerializedCourt[];
  teams: SerializedTeam[];
}

export default function GamePage() {
  const { showAlert } = useAlert();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // 플레이어 통계 새로고침
  const refreshPlayerStats = async () => {
    try {
      const [members, attendance] = await Promise.all([
        listMembers(),
        getTodayAttendance()
      ]);

      const players: Player[] = [];

      // 회원 처리
      const memberParticipants = attendance.participants.filter(p => p.type === 'member');
      for (const participant of memberParticipants) {
        if (participant.type === 'member') {
          const member = members.find(m => m.id === participant.memberId);
          if (member) {
            const stats = await getTodayPlayerStats(member.id, member.name, 'member');
            players.push({
              id: member.id,
              name: member.name,
              skill: member.skill,
              gender: member.gender,
              gamesPlayedToday: stats.gamesPlayedToday,
              isGuest: false
            });
          }
        }
      }

      // 게스트 처리
      const guestParticipants = attendance.participants.filter(p => p.type === 'guest');
      for (const [index, participant] of guestParticipants.entries()) {
        if (participant.type === 'guest') {
          const guestId = `guest-${index}`;
          const stats = await getTodayPlayerStats(guestId, participant.name, 'guest');
          players.push({
            id: guestId,
            name: participant.name,
            skill: participant.skill,
            gender: participant.gender,
            gamesPlayedToday: stats.gamesPlayedToday,
            isGuest: true
          });
        }
      }

      setAvailablePlayers(players.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('플레이어 통계 새로고침 실패:', error);
    }
  };

  // 게임 상태를 Firestore에 저장
  const saveGameState = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const gameState: GameState = {
        date: today,
        courts: courts.map(court => {
          const serializedCourt: SerializedCourt = {
            id: court.id,
            status: court.status,
            ...(court.team && { team: court.team }),
            ...(court.startedAt && { startedAt: court.startedAt.toISOString() }),
            ...(court.duration && { duration: court.duration })
          };
          return serializedCourt;
        }),
        teams: teams.map(team => ({
          ...team,
          createdAt: team.createdAt.toISOString()
        }))
      };

      await setDoc(doc(db, 'gameStates', today), gameState);
    } catch (error) {
      console.error('게임 상태 저장 실패:', error);
    }
  };

  // 게임 상태를 Firestore에서 불러오기
  const loadGameState = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const docRef = doc(db, 'gameStates', today);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const gameState = docSnap.data() as GameState;
        setCourts(gameState.courts.map(court => ({
          id: court.id,
          status: court.status,
          team: court.team,
          startedAt: court.startedAt ? new Date(court.startedAt) : undefined,
          duration: court.duration
        })));
        setTeams(gameState.teams.map(team => ({
          ...team,
          createdAt: new Date(team.createdAt)
        })));
      }
    } catch (error) {
      console.error('게임 상태 불러오기 실패:', error);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [appSettings, members, attendance] = await Promise.all([
          getAppSettings(),
          listMembers(),
          getTodayAttendance()
        ]);

        setSettings(appSettings);

        // 오늘 출석한 회원들과 게스트들을 플레이어로 변환
        const players: Player[] = [];

        // 회원 처리
        const memberParticipants = attendance.participants.filter(p => p.type === 'member');
        for (const participant of memberParticipants) {
          if (participant.type === 'member') {
            const member = members.find(m => m.id === participant.memberId);
            if (member) {
              // 오늘의 게임 통계 가져오기
              const stats = await getTodayPlayerStats(member.id, member.name, 'member');
              players.push({
                id: member.id,
                name: member.name,
                skill: member.skill,
                gender: member.gender,
                gamesPlayedToday: stats.gamesPlayedToday,
                isGuest: false
              });
            }
          }
        }

        // 게스트 처리
        const guestParticipants = attendance.participants.filter(p => p.type === 'guest');
        for (const [index, participant] of guestParticipants.entries()) {
          if (participant.type === 'guest') {
            const guestId = `guest-${index}`;
            // 오늘의 게임 통계 가져오기
            const stats = await getTodayPlayerStats(guestId, participant.name, 'guest');
            players.push({
              id: guestId,
              name: participant.name,
              skill: participant.skill,
              gender: participant.gender,
              gamesPlayedToday: stats.gamesPlayedToday,
              isGuest: true
            });
          }
        }

        setAvailablePlayers(players.sort((a, b) => a.name.localeCompare(b.name)));

        // 저장된 게임 상태 불러오기
        await loadGameState();

        // 게임 상태 불러오기 후 코트 수 확인 및 초기화
        const todayKey = new Date().toISOString().split('T')[0];
        const docRef = doc(db, 'gameStates', todayKey);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          // 저장된 게임 상태가 없으면 초기 코트 상태 생성
          const initialCourts: Court[] = Array.from({ length: appSettings.courtsCount }, (_, i) => ({
            id: i + 1,
            status: 'idle',
          }));
          setCourts(initialCourts);
        }

        // 실시간 동기화 설정
        const unsubscribe = onSnapshot(doc(db, 'gameStates', todayKey), (doc) => {
          if (doc.exists()) {
            const gameState = doc.data() as GameState;
            setCourts(gameState.courts.map(court => ({
              id: court.id,
              status: court.status,
              team: court.team,
              startedAt: court.startedAt ? new Date(court.startedAt) : undefined,
              duration: court.duration
            })));
            setTeams(gameState.teams.map(team => ({
              ...team,
              createdAt: new Date(team.createdAt)
            })));
          }
        });

        return () => unsubscribe();
      } catch (e) {
        console.error('게임 페이지 초기화 실패:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 게임 상태 변경 시 자동 저장
  useEffect(() => {
    if (!loading && (courts.length > 0 || teams.length > 0)) {
      saveGameState();
    }
  }, [courts, teams, loading, saveGameState]);

  // 실시간 타이머 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 설정 변경 시 코트 수 동기화
  useEffect(() => {
    if (settings && settings.courtsCount !== courts.length) {
      const newCourts: Court[] = [];
      for (let i = 1; i <= settings.courtsCount; i++) {
        const existingCourt = courts.find(c => c.id === i);
        if (existingCourt) {
          newCourts.push(existingCourt);
        } else {
          newCourts.push({
            id: i,
            status: 'idle'
          });
        }
      }
      setCourts(newCourts);
    }
  }, [settings, courts]);

  // 플레이어 선택/해제
  const togglePlayerSelection = (player: Player) => {
    if (selectedPlayers.find(p => p.id === player.id)) {
      setSelectedPlayers(selectedPlayers.filter(p => p.id !== player.id));
    } else if (selectedPlayers.length < 4) {
      setSelectedPlayers([...selectedPlayers, player]);
    }
  };

  // 팀 생성
  const createTeam = () => {
    if (selectedPlayers.length === 4) {
      const newTeam: Team = {
        id: `team-${Date.now()}`,
        players: selectedPlayers,
        createdAt: new Date()
      };
      setTeams([...teams, newTeam]);
      setSelectedPlayers([]);
    }
  };

  // 팀 삭제
  const deleteTeam = (teamId: string) => {
    setTeams(teams.filter(t => t.id !== teamId));
    if (selectedTeam?.id === teamId) {
      setSelectedTeam(null);
    }
  };

  // 팀이 게임 가능한지 확인 (게임 중인 플레이어가 있으면 불가)
  const canTeamPlay = (team: Team): boolean => {
    return team.players.every(player => getPlayerStatus(player.id) !== 'playing');
  };

  // 코트에 팀 배정
  const assignTeamToCourt = (courtId: number, team: Team) => {
    if (!canTeamPlay(team)) {
      showAlert('게임 중인 플레이어가 포함된 팀은 매칭할 수 없습니다.', 'warning');
      return;
    }

    setCourts(courts.map(court =>
      court.id === courtId
        ? { ...court, status: 'playing', team, startedAt: new Date() }
        : court
    ));
    setTeams(teams.filter(t => t.id !== team.id));
    setSelectedTeam(null);
  };

  // 게임 종료
  const finishGame = async (courtId: number) => {
    const court = courts.find(c => c.id === courtId);
    if (court && court.team) {
      // 플레이어들의 게임 수 증가 (로컬 상태)
      const updatedPlayers = availablePlayers.map(player => {
        const isInTeam = court.team!.players.some(teamPlayer => teamPlayer.id === player.id);
        return isInTeam
          ? { ...player, gamesPlayedToday: player.gamesPlayedToday + 1 }
          : player;
      });
      setAvailablePlayers(updatedPlayers);

      // 데이터베이스에 게임 통계 업데이트
      try {
        for (const player of court.team.players) {
          await updatePlayerGameStats(
            player.id,
            player.name,
            player.isGuest ? 'guest' : 'member'
          );
        }
      } catch (error) {
        console.error('게임 통계 업데이트 실패:', error);
      }

      // 플레이어 통계 새로고침
      await refreshPlayerStats();
    }

    setCourts(courts.map(court =>
      court.id === courtId
        ? { ...court, status: 'idle', team: undefined, startedAt: undefined }
        : court
    ));
  };

  // 플레이어 상태 확인
  const getPlayerStatus = (playerId: string): 'available' | 'waiting' | 'playing' => {
    const playersInTeams = teams.flatMap(team => team.players.map(p => p.id));
    const playersInCourts = courts.filter(c => c.team).flatMap(c => c.team!.players.map(p => p.id));

    if (playersInCourts.includes(playerId)) return 'playing';
    if (playersInTeams.includes(playerId)) return 'waiting';
    return 'available';
  };

  // 사용 가능한 플레이어 필터링 (대기열과 게임 중이 아닌 플레이어)
  const getAvailablePlayersForSelection = () => {
    return availablePlayers.filter(player => getPlayerStatus(player.id) === 'available');
  };

  // 게임 진행 시간 계산 (분:초 형태)
  const getGameDuration = (startedAt: Date): string => {
    const diffMs = currentTime.getTime() - startedAt.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    return `${diffMinutes}:${diffSeconds.toString().padStart(2, '0')}`;
  };

  // 플레이어 정렬 (남자-이름순, 여자-이름순)
  const getSortedPlayers = () => {
    const availableForSelection = availablePlayers.filter(player => getPlayerStatus(player.id) === 'available');

    const males = availableForSelection.filter(p => p.gender === 'M').sort((a, b) => a.name.localeCompare(b.name));
    const females = availableForSelection.filter(p => p.gender === 'F').sort((a, b) => a.name.localeCompare(b.name));

    return [...males, ...females];
  };

  // 실력 점수 계산 (S=5, A=4, B=3, C=2, D=1, E=1, F=1)
  const getSkillScore = (skill: Skill): number => {
    const scores: Record<Skill, number> = { 'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'E': 1, 'F': 1 };
    return scores[skill] || 1;
  };



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

  // 자동 매칭 - 남복 (남자 4명)
  const autoMatchMale = () => {
    const availableForSelection = availablePlayers.filter(player => getPlayerStatus(player.id) === 'available');
    const males = availableForSelection.filter(p => p.gender === 'M');

    if (males.length < 4) {
      alert('사용 가능한 남자 플레이어가 4명 미만입니다.');
      return;
    }

    const selectedTeam = selectPlayersBySkill(males, 4);
    setSelectedPlayers(selectedTeam);
  };

  // 자동 매칭 - 여복 (여자 4명)
  const autoMatchFemale = () => {
    const availableForSelection = availablePlayers.filter(player => getPlayerStatus(player.id) === 'available');
    const females = availableForSelection.filter(p => p.gender === 'F');

    if (females.length < 4) {
      alert('사용 가능한 여자 플레이어가 4명 미만입니다.');
      return;
    }

    const selectedTeam = selectPlayersBySkill(females, 4);
    setSelectedPlayers(selectedTeam);
  };

  // 자동 매칭 - 혼복 (남자 2명 + 여자 2명)
  const autoMatchMixed = () => {
    const availableForSelection = availablePlayers.filter(player => getPlayerStatus(player.id) === 'available');
    const males = availableForSelection.filter(p => p.gender === 'M');
    const females = availableForSelection.filter(p => p.gender === 'F');

    if (males.length < 2 || females.length < 2) {
      alert('혼복을 위해서는 남자 2명, 여자 2명이 필요합니다.');
      return;
    }

    const selectedMales = selectPlayersBySkill(males, 2);
    const selectedFemales = selectPlayersBySkill(females, 2);

    const selectedTeam = [...selectedMales, ...selectedFemales];
    setSelectedPlayers(selectedTeam);
  };

  // 팀 생성 및 모달 닫기
  const createTeamAndCloseModal = () => {
    if (selectedPlayers.length === 4) {
      const newTeam: Team = {
        id: `team-${Date.now()}`,
        players: selectedPlayers,
        createdAt: new Date()
      };
      setTeams([...teams, newTeam]);
      setSelectedPlayers([]);
      setShowPlayerModal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center" style={{backgroundColor: 'var(--notion-bg-secondary)'}}>
        <div className="text-center">
          <div className="spinner h-8 w-8 mx-auto mb-2"></div>
          <span style={{color: 'var(--notion-text-light)'}}>불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4" style={{backgroundColor: 'var(--notion-bg-secondary)'}}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold" style={{color: 'var(--notion-text)'}}>게임판</h1>
        </div>

        {/* 다음 대기팀 - 컴팩트 디자인 */}
        {(() => {
          const playableTeams = teams.filter(team => canTeamPlay(team));
          const firstTeam = playableTeams[0];
          return firstTeam ? (
            <div className="mb-4">
              <div
                onClick={() => setSelectedTeam(selectedTeam?.id === firstTeam.id ? null : firstTeam)}
                className={`golden-rotating-border rounded-xl p-4 cursor-pointer transition-all duration-300 ${
                  selectedTeam?.id === firstTeam.id
                    ? 'shadow-2xl'
                    : 'shadow-xl'
                }`}
                style={{
                  background: selectedTeam?.id === firstTeam.id
                    ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
                    : 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)'
                }}
              >
                <div className="flex items-center justify-between relative z-10">
                  {/* 제목 */}
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏸</span>
                    <h3 className="text-lg font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                      다음 대기팀
                    </h3>
                  </div>

                  {/* 플레이어 목록 - 중앙 배치 */}
                  <div className="flex items-center gap-3">
                    {firstTeam.players.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur-sm rounded-lg shadow-md border border-gray-200/50"
                      >
                        <div className={`w-3 h-3 rounded-full shadow-sm ${
                          player.gender === 'M' ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-pink-500 to-pink-600'
                        }`}></div>
                        <span className="text-sm font-bold text-gray-800">
                          {player.isGuest ? '(G) ' : ''}{player.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 우측 버튼들 */}
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium rounded-full shadow-md">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 코트 현황 */}
          <div className="lg:col-span-2">
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold" style={{color: 'var(--notion-text)'}}>코트 현황</h2>
                <span className="notion-badge notion-badge-blue">{settings?.courtsCount}개</span>
                <button
                  onClick={async () => {
                    try {
                      // DB에서 최신 데이터 동기화 (페이지 새로고침 없이)
                      await loadGameState();

                      // 출석 데이터와 회원 정보도 다시 로드
                      const [appSettings, members, attendance] = await Promise.all([
                        getAppSettings(),
                        listMembers(),
                        getTodayAttendance()
                      ]);

                      setSettings(appSettings);

                      // 오늘 출석한 회원들과 게스트들을 플레이어로 변환
                      const players: Player[] = [];

                      // 회원 처리
                      const memberParticipants = attendance.participants.filter(p => p.type === 'member');
                      for (const participant of memberParticipants) {
                        if (participant.type === 'member') {
                          const member = members.find(m => m.id === participant.memberId);
                          if (member) {
                            const stats = await getTodayPlayerStats(member.id, member.name, 'member');
                            players.push({
                              id: member.id,
                              name: member.name,
                              skill: member.skill,
                              gender: member.gender,
                              gamesPlayedToday: stats.gamesPlayedToday,
                              isGuest: false
                            });
                          }
                        }
                      }

                      // 게스트 처리
                      const guestParticipants = attendance.participants.filter(p => p.type === 'guest');
                      for (const [index, participant] of guestParticipants.entries()) {
                        if (participant.type === 'guest') {
                          const guestId = `guest-${index}`;
                          // 오늘의 게임 통계 가져오기
                          const stats = await getTodayPlayerStats(guestId, participant.name, 'guest');
                          players.push({
                            id: guestId,
                            name: participant.name,
                            skill: participant.skill,
                            gender: participant.gender,
                            gamesPlayedToday: stats.gamesPlayedToday,
                            isGuest: true
                          });
                        }
                      }

                      setAvailablePlayers(players.sort((a, b) => a.name.localeCompare(b.name)));
                    } catch (error) {
                      console.error('동기화 실패:', error);
                      showAlert('동기화에 실패했습니다. 다시 시도해주세요.', 'error');
                    }
                  }}
                  className="notion-btn notion-btn-secondary px-3 py-1 text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 ml-2"
                >
                  🔄 새로고침
                </button>
                {selectedTeam && (
                  <span className={`text-xl ml-4 font-bold ${
                    canTeamPlay(selectedTeam) ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {canTeamPlay(selectedTeam)
                      ? '팀을 선택했습니다. 코트를 클릭하여 게임을 시작하세요.'
                      : '선택된 팀은 게임 중인 플레이어가 있어 매칭할 수 없습니다.'
                    }
                  </span>
                )}
              </div>
              <div className="space-y-2" style={{ height: `${Math.max(400, courts.length * 80)}px` }}>
                {courts.map(court => (
                  <div
                    key={court.id}
                    onClick={() => {
                      if (selectedTeam && court.status === 'idle' && canTeamPlay(selectedTeam)) {
                        assignTeamToCourt(court.id, selectedTeam);
                      }
                    }}
                    className={`relative border-2 rounded-lg p-4 transition-all duration-200 ${
                      court.status === 'playing'
                        ? 'bg-green-50 border-green-400'
                        : 'bg-white border-gray-200'
                    } ${
                      selectedTeam && court.status === 'idle' && canTeamPlay(selectedTeam)
                        ? 'cursor-pointer hover:shadow-md border-green-300 court-sparkle'
                        : selectedTeam && court.status === 'idle' && !canTeamPlay(selectedTeam)
                          ? 'cursor-not-allowed border-red-300'
                          : ''
                    }`}
                    style={{
                      minHeight: court.status === 'playing' && court.team ?
                        `${Math.max(90, 60 + (court.team.players.length * 8))}px` :
                        '80px'
                    }}
                  >
                    {/* 타이머 - 상단 중앙 */}
                    {court.status === 'playing' && court.startedAt && (
                      <div className="absolute top-1 left-1/2 transform -translate-x-1/2">
                        <div className="flex items-center justify-center bg-green-100 text-green-900 font-bold px-8 py-1 rounded-lg shadow-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-900 rounded-full animate-bounce"></div>
                            <span className="text-lg font-bold font-mono tracking-wider">
                              {getGameDuration(court.startedAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 상태 배지 - 우측 상단 */}
                    <div className="flex absolute top-2 right-2">
                      <span className={`notion-badge text-xs ${
                        court.status === 'playing' ? 'notion-badge-green' : 'notion-badge-gray'
                      }`}>
                        {court.status === 'playing' ? '게임 중' : '대기'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-6">
                      {/* 왼쪽: 코트 번호 (크게) */}
                      <div className="flex items-center">
                        <div className={`px-3 py-3 rounded-lg font-bold text-2xl ${
                          court.status === 'playing'
                            ? 'bg-green-500 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-700 shadow-md'
                        }`}>
                          코트 {court.id}
                        </div>
                      </div>

                      {/* 중앙: 플레이어 정보 */}
                      {court.status === 'playing' && court.team ? (
                        <div className="flex items-center gap-3 flex-1 justify-center">
                          {court.team.players.map((player, index) => (
                            <div key={player.id} className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${
                                player.gender === 'M' ? 'bg-blue-500' : 'bg-pink-500'
                              }`}></div>
                              <span className="font-bold text-2xl whitespace-nowrap" style={{color: 'var(--notion-text)'}}>{player.name}</span>
                              <span className="notion-badge notion-badge-orange text-xs">{player.skill}</span>
                              {index < (court.team?.players.length || 0) - 1 && (
                                <span className="text-gray-400 mx-1">|</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex-1 text-center">
                          <span className="text-gray-500 text-2xl font-bold">
                            {selectedTeam && court.status === 'idle'
                              ? canTeamPlay(selectedTeam)
                                ? '클릭하여 게임 시작'
                                : '매칭 불가 (게임중 플레이어 포함)'
                              : '게임 대기 중'
                            }
                          </span>
                        </div>
                      )}

                      {/* 오른쪽: 종료 버튼 */}
                      <div className="flex items-center">
                        {court.status === 'playing' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              finishGame(court.id);
                            }}
                            className="px-3 py-3 bg-red-500 text-white rounded-md hover:bg-red-600 font-medium text-m"
                          >
                            게임 종료
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* 오른쪽: 대기 팀 목록 */}
          <div className="lg:col-span-1">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold" style={{color: 'var(--notion-text)'}}>
                  대기 팀 ({teams.length})
                </h2>
                <button
                  onClick={() => setShowPlayerModal(true)}
                  className="notion-btn w-50 h-20 notion-btn-primary px-6 py-3 font-bold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center animate-gentle-pulse"
                  style={{ fontSize: '2rem' }}
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
                        onClick={() => setSelectedTeam(selectedTeam?.id === team.id ? null : team)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                          !teamCanPlay
                            ? 'bg-red-50 border-red-200 opacity-75'
                            : selectedTeam?.id === team.id
                              ? 'bg-green-50 border-green-300'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm" style={{color: 'var(--notion-text)'}}>
                              대기열{index + 1}
                            </span>
                            {!teamCanPlay && (
                              <span className="notion-badge notion-badge-red text-xs">매칭불가</span>
                            )}
                          </div>
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
                        <div className="grid grid-cols-1 gap-1">
                          {team.players.map(player => {
                            const playerStatus = getPlayerStatus(player.id);
                            return (
                              <div key={player.id} className="flex items-center gap-2 text-xs">
                                <div className={`w-2 h-2 rounded-full ${
                                  player.gender === 'M' ? 'bg-blue-500' : 'bg-pink-500'
                                }`}></div>
                                <span className="flex-1 truncate">{player.name}</span>
                                <span className="notion-badge notion-badge-orange text-xs">{player.skill}</span>
                                {playerStatus === 'playing' && (
                                  <span className="notion-badge notion-badge-green text-xs">게임중</span>
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
                      <div className="text-xs">팀짜기 버튼을 눌러 팀을 만들어보세요</div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* 플레이어 선택 모달 */}
        {showPlayerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowPlayerModal(false)} />
            <div className="notion-card relative w-full max-w-7xl max-h-[90vh] overflow-hidden" style={{boxShadow: 'var(--notion-shadow-hover)'}}>
              <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <div>
                  <h3 className="text-xl font-bold" style={{color: 'var(--notion-text)'}}>
                    🏸 플레이어 선택 ({selectedPlayers.length}/4)
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">4명을 선택하여 팀을 만드세요</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={autoMatchMale}
                    className="notion-btn notion-btn-primary px-3 py-2 text-xs font-medium"
                  >
                    🎯 자동 매칭-남복
                  </button>
                  <button
                    onClick={autoMatchFemale}
                    className="notion-btn notion-btn-primary px-3 py-2 text-xs font-medium"
                  >
                    🎯 자동 매칭-여복
                  </button>
                  <button
                    onClick={autoMatchMixed}
                    className="notion-btn notion-btn-primary px-3 py-2 text-xs font-medium"
                  >
                    🎯 자동 매칭-혼복
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowPlayerModal(false);
                    setSelectedPlayers([]);
                  }}
                  className="text-2xl opacity-70 hover:opacity-100 px-4 py-3 rounded-lg hover:bg-gray-100 transition-all duration-200"
                  style={{color: 'var(--notion-text-light)'}}
                >
                  ✕
                </button>
              </div>

              <div className="p-4 overflow-y-auto" style={{maxHeight: 'calc(90vh - 150px)'}}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {getSortedPlayers().map(player => {
                    const status = getPlayerStatus(player.id);
                    const isSelectable = status === 'available' || status === 'playing'; // 게임중인 플레이어도 선택 가능
                    const isSelected = selectedPlayers.find(p => p.id === player.id);

                    return (
                      <div
                        key={player.id}
                        onClick={() => isSelectable && togglePlayerSelection(player)}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 min-h-[90px] ${
                          status === 'waiting'
                            ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200'
                            : isSelected
                              ? 'bg-blue-50 border-blue-600 cursor-pointer shadow-md transform scale-105'
                              : 'bg-white border-gray-400 hover:border-gray-300 cursor-pointer hover:shadow-md'
                        }`}
                      >
                        {/* 1행: 중앙 상단 게임 상태 */}
                        <div className="flex justify-center h-5 mb-2">
                          {status !== 'available' && (
                            <span className={`w-full text-center text-xs px-2 py-1 rounded-full font-medium ${
                              status === 'playing' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {status === 'playing' ? '게임중' : '대기중'}
                            </span>
                          )}
                        </div>

                        {/* 2행: 성별 점 + 이름 + 등급 (균일한 간격) */}
                        <div className="flex items-center justify-between mb-2">
                          <div className={`w-3 h-3 rounded-full ${
                            player.gender === 'M' ? 'bg-blue-500' : 'bg-pink-500'
                          }`}></div>
                          <span className="font-semibold text-sm truncate flex-1 text-center" style={{color: 'var(--notion-text)'}} title={`${player.isGuest ? '(G) ' : ''}${player.name}`}>
                            {player.isGuest ? '(G) ' : ''}{player.name}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            player.skill === 'S' ? 'bg-red-100 text-red-700' :
                            player.skill === 'A' ? 'bg-orange-100 text-orange-700' :
                            player.skill === 'B' ? 'bg-yellow-100 text-yellow-700' :
                            player.skill === 'C' ? 'bg-green-100 text-green-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {player.skill}
                          </span>
                        </div>

                        {/* 3행: 중앙 게임 수 */}
                        <div className="flex justify-center">
                          <span className="text-xs text-gray-600">{player.gamesPlayedToday} 게임</span>
                        </div>
                      </div>
                    );
                  })}
                  {availablePlayers.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500">
                      <div className="text-xl mb-2">출석한 플레이어가 없습니다</div>
                      <div className="text-sm">출석 관리에서 출석을 체크해주세요</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 팀 생성 버튼 (모달 바깥) */}
        {showPlayerModal && selectedPlayers.length === 4 && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[60]">
            <button
              onClick={createTeamAndCloseModal}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-8 px-24 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-300 text-3xl"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                boxShadow: '0 20px 40px rgba(59, 130, 246, 0.3)'
              }}
            >
              팀 생성
            </button>
          </div>
        )}
      </div>
    </main>
  );
}


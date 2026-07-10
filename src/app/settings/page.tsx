"use client";

import { useEffect, useState } from "react";
import {
  getAppSettings,
  saveAppSettings,
  listMembers,
  deleteMember,
  updateMember,
  getTotalGamesCount,
  getTotalShuttlesCount,
  resetStatisticsData,
  resetMembersData,
} from "@/lib/supabase-db";
import type { AppSettings } from "@/types/settings";
import type { Member, Skill, Gender } from "@/types/db";
import { useAlert } from "@/components/CustomAlert";
import ConfirmModal from "@/components/ConfirmModal";

const SKILLS: Skill[] = ["S", "A", "B", "C", "D", "E", "F"];

type TabType = "court" | "members" | "data" | "system";

export default function SettingsPage() {
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState<TabType>("court");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [totalGamesCount, setTotalGamesCount] = useState<number>(0);
  const [totalShuttlesCount, setTotalShuttlesCount] = useState<number>(0);

  // 확인 모달 상태
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmData, setConfirmData] = useState<{title: string, message: string, type?: 'warning' | 'danger' | 'info'}>({title: '', message: ''});

  // 데이터 새로고침 함수
  const refreshData = async () => {
    setLoading(true);
    try {
      const [appSettings, allMembers, gamesCount, shuttlesCount] = await Promise.all([
        getAppSettings(),
        listMembers(),
        getTotalGamesCount(),
        getTotalShuttlesCount(),
      ]);
      setSettings(appSettings);
      setMembers(allMembers);
      setTotalGamesCount(gamesCount);
      setTotalShuttlesCount(shuttlesCount);
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      await saveAppSettings(settings);
      showAlert("설정이 저장되었습니다.", 'success');
    } catch {
      showAlert("설정 저장에 실패했습니다.", 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = (member: Member) => {
    setConfirmData({
      title: '회원 삭제',
      message: `${member.name} 회원을 삭제하시겠습니까?`,
      type: 'danger'
    });
    setConfirmAction(() => async () => {
      try {
        await deleteMember(member.id);
        // 전체 재조회 대신 로컬 상태만 갱신 (전체 페이지 스피너/4쿼리 방지)
        setMembers((prev) => prev.filter((m) => m.id !== member.id));
        showAlert("회원이 삭제되었습니다.", 'success');
      } catch {
        showAlert("회원 삭제에 실패했습니다.", 'error');
      }
      setShowConfirmModal(false);
    });
    setShowConfirmModal(true);
  };

  const handleUpdateMember = async (updatedMember: Member) => {
    try {
      const saved = await updateMember(updatedMember.id, {
        name: updatedMember.name,
        birthYear: updatedMember.birthYear,
        gender: updatedMember.gender,
        skill: updatedMember.skill
      });
      // 전체 재조회 대신 로컬 상태만 갱신
      setMembers((prev) => prev.map((m) => (m.id === saved.id ? saved : m)));
      showAlert("회원 정보가 수정되었습니다.", 'success');
    } catch {
      showAlert("회원 정보 수정에 실패했습니다.", 'error');
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

  const tabs = [
    { id: "court" as TabType, name: "코트 설정", icon: "🏸" },
    { id: "members" as TabType, name: "회원 관리", icon: "📖" },
    { id: "data" as TabType, name: "데이터 관리", icon: "📊" },
    { id: "system" as TabType, name: "시스템 정보", icon: "⚙️" },
  ];

  return (
    <main
      className="min-h-screen p-2 sm:p-4 lg:p-8"
      style={{ backgroundColor: "var(--notion-bg-secondary)" }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-2">
          {/* <h1
            className="text-3xl font-bold mb-4"
            style={{ color: "var(--notion-text)" }}
          >
            설정
          </h1> */}
          {/* <p
            className="text-base mb-6"
            style={{ color: "var(--notion-text-light)" }}
          >
            시스템 설정 및 관리
          </p> */}
        </div>

        {/* 탭 네비게이션 */}
        <div className="mb-2">
          <div
            className="flex bg-white rounded-lg p-1 shadow-sm border w-full"
            style={{ borderColor: "var(--notion-border)" }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-blue-500 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="notion-card">
          {activeTab === "court" && (
            <CourtSettings
              settings={settings}
              setSettings={setSettings}
              saving={saving}
              onSave={handleSaveSettings}
            />
          )}
          {activeTab === "members" && (
            <MemberManagement
              members={members}
              onDeleteMember={handleDeleteMember}
              onUpdateMember={handleUpdateMember}
            />
          )}
          {activeTab === "data" && <DataManagement members={members} loading={loading} totalGamesCount={totalGamesCount} totalShuttlesCount={totalShuttlesCount} onRefresh={refreshData} />}
          {activeTab === "system" && <SystemInfo />}
        </div>

        {/* 확인 모달 */}
        <ConfirmModal
          isOpen={showConfirmModal}
          title={confirmData.title}
          message={confirmData.message}
          confirmText="확인"
          cancelText="취소"
          type={confirmData.type || 'warning'}
          onConfirm={() => {
            if (confirmAction) {
              confirmAction();
            }
          }}
          onCancel={() => {
            setShowConfirmModal(false);
            setConfirmAction(null);
          }}
        />
      </div>
    </main>
  );
}

// 코트 설정 컴포넌트
function CourtSettings({
  settings,
  setSettings,
  saving,
  onSave,
}: {
  settings: AppSettings | null;
  setSettings: (settings: AppSettings) => void;
  saving: boolean;
  onSave: () => void;
}) {
  const toggleCourt = async (row: number, col: number) => {
    if (!settings) return;

    const existingCourtIndex = settings.courtPositions.findIndex(
      (court) => court.row === row && court.col === col
    );

    const newPositions = [...settings.courtPositions];

    if (existingCourtIndex >= 0) {
      // 기존 코트가 있으면 제거
      newPositions.splice(existingCourtIndex, 1);
    } else {
      // 새로운 코트 추가
      newPositions.push({
        id: 0, // 임시 ID, 나중에 재정렬
        active: true,
        row,
        col,
      });
    }

    // 활성화된 코트들을 위치 순서대로 정렬하고 번호 재부여
    const activeCourts = newPositions
      .filter((court) => court.active)
      .sort((a, b) => {
        if (a.row !== b.row) return a.row - b.row;
        return a.col - b.col;
      })
      .map((court, index) => ({
        ...court,
        id: index + 1,
      }));

    // 비활성화된 코트들도 포함
    const inactiveCourts = newPositions.filter((court) => !court.active);

    const newSettings = {
      ...settings,
      courtPositions: [...activeCourts, ...inactiveCourts],
      courtsCount: activeCourts.length,
    };

    setSettings(newSettings);

    // 자동 저장
    try {
      await saveAppSettings(newSettings);
    } catch (e) {
      console.error("코트 설정 저장 실패:", e);
    }
  };

  const getCourtAtPosition = (row: number, col: number) => {
    return settings?.courtPositions.find(
      (court) => court.row === row && court.col === col
    );
  };

  const resetCourts = async () => {
    if (!settings) return;
    const newSettings = {
      ...settings,
      courtPositions: [],
      courtsCount: 0,
    };
    setSettings(newSettings);

    // 자동 저장
    try {
      await saveAppSettings(newSettings);
    } catch (e) {
      console.error("코트 설정 저장 실패:", e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏸</span>
          <h2
            className="text-2xl font-bold"
            style={{ color: "var(--notion-text)" }}
          >
            코트 설정
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={resetCourts}
            className="notion-btn notion-btn-secondary px-8 py-4 text-lg font-semibold"
          >
            초기화
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="notion-btn notion-btn-primary disabled:opacity-50 px-10 py-4 text-lg font-semibold"
          >
            {saving ? "저장 중..." : "설정 저장"}
          </button>
        </div>
      </div>

      {settings && (
        <div className="space-y-6">
          {/* 경기장 이름
          <div>
            <label className="block text-sm font-medium mb-2" style={{color: 'var(--notion-text)'}}>경기장 이름</label>
            <input
              type="text"
              value={settings.courtLocation || ''}
              onChange={e => setSettings({ ...settings, courtLocation: e.target.value })}
              className="notion-input w-full max-w-md"
              placeholder="예: 강남구민체육관"
            />
            <p className="text-xs mt-1" style={{color: 'var(--notion-text-light)'}}>경기가 열리는 체육관 이름</p>
          </div> */}

          {/* 코트 배치 그리드 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3
                  className="text-lg font-bold"
                  style={{ color: "var(--notion-text)" }}
                >
                  코트 배치
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full border border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-700 font-semibold text-sm">
                    활성화된 코트
                  </span>
                  <span className="text-green-800 text-xl font-bold">
                    {settings?.courtPositions.filter((c) => c.active).length || 0}
                  </span>
                  <span className="text-green-600 text-sm font-medium">개</span>
                </div>
              </div>
              <p
                className="text-sm"
                style={{ color: "var(--notion-text-light)" }}
              >
                코트를 클릭하여 활성화/비활성화하세요
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed border-gray-300">
              <div
                className="grid gap-3"
                style={{
                  gridTemplateRows: `repeat(${settings.gridRows}, 1fr)`,
                  gridTemplateColumns: `repeat(${settings.gridCols}, 1fr)`,
                }}
              >
                {Array.from({ length: settings.gridRows }, (_, row) =>
                  Array.from({ length: settings.gridCols }, (_, col) => {
                    const court = getCourtAtPosition(row, col);
                    const isActive = court?.active || false;
                    const courtNumber = court?.id;

                    return (
                      <button
                        key={`${row}-${col}`}
                        onClick={() => toggleCourt(row, col)}
                        className={`
                          aspect-[3/2] rounded-lg border-2 transition-all duration-200 flex items-center justify-center font-bold text-lg
                          ${
                            isActive
                              ? "border-green-500 bg-green-100 text-green-700 hover:bg-green-200"
                              : "border-gray-300 bg-white text-gray-400 hover:border-gray-400 hover:bg-gray-50"
                          }
                        `}
                      >
                        {isActive ? (
                          `코트 ${courtNumber}`
                        ) : (
                          <span className="text-black text-m font-normal opacity-40">
                            비활성
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-green-500 bg-green-100 rounded"></div>
                <span style={{ color: "var(--notion-text)" }}>
                  활성화된 코트
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-300 bg-white rounded"></div>
                <span style={{ color: "var(--notion-text)" }}>
                  비활성화된 코트
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 회원 관리 컴포넌트
function MemberManagement({
  members,
  onDeleteMember,
  onUpdateMember,
}: {
  members: Member[];
  onDeleteMember: (member: Member) => void;
  onUpdateMember: (member: Member) => void;
}) {
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'age' | 'skill' | 'gender'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  // 검색 및 정렬된 회원 목록
  const filteredAndSortedMembers = [...members]
    .filter(member => searchQuery === '' || member.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'age':
        comparison = b.birthYear - a.birthYear; // 나이는 출생년도 역순 (최신년도가 어린 나이)
        break;
      case 'skill':
        const skillOrder = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];
        comparison = skillOrder.indexOf(a.skill) - skillOrder.indexOf(b.skill);
        break;
      case 'gender':
        comparison = a.gender.localeCompare(b.gender);
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSortChange = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      // 같은 기준이면 순서 토글
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // 다른 기준이면 새로운 기준으로 오름차순
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📖</span>
          <h2
            className="text-2xl font-bold"
            style={{ color: "var(--notion-text)" }}
          >
            회원 관리
          </h2>
        </div>
        <div className="flex items-center gap-4">
          {/* 검색 입력 필드 */}
          <div className="relative">
            <input
              type="text"
              placeholder="회원 이름 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-5 py-3 border border-gray-500 rounded-lg text-m focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              style={{minWidth: '200px'}}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          <span className="bg-blue-100 text-blue-700 px-5 py-2 rounded-full text-lg font-medium">
            총 {members.length}명
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-blue-600 text-sm font-medium">남성 회원</div>
            <div className="text-2xl font-bold text-blue-700">
              {members.filter((m) => m.gender === "M").length}명
            </div>
          </div>
          <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
            <div className="text-pink-600 text-sm font-medium">여성 회원</div>
            <div className="text-2xl font-bold text-pink-700">
              {members.filter((m) => m.gender === "F").length}명
            </div>
          </div>

        </div>

        <div
          className="bg-white rounded-lg border"
          style={{ borderColor: "var(--notion-border)" }}
        >
          <div
            className="p-4 border-b flex items-center justify-between"
            style={{ borderColor: "var(--notion-border)" }}
          >
            <h3 className="font-medium" style={{ color: "var(--notion-text)" }}>
              회원 목록
            </h3>

            {/* 정렬 옵션 */}
            <div className="flex items-center gap-2">
              <span className="text-m font-medium" style={{ color: "var(--notion-text)" }}>
                정렬 기준 |
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSortChange('name')}
                  className={`px-3 py-1 rounded text-s font-medium transition-colors font-semibold ${
                    sortBy === 'name'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  이름 {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSortChange('age')}
                  className={`px-3 py-1 rounded text-s font-medium transition-colors font-semibold ${
                    sortBy === 'age'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  나이 {sortBy === 'age' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSortChange('skill')}
                  className={`px-3 py-1 rounded text-s font-medium transition-colors font-semibold ${
                    sortBy === 'skill'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  급수 {sortBy === 'skill' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSortChange('gender')}
                  className={`px-3 py-1 rounded text-s font-medium transition-colors font-semibold ${
                    sortBy === 'gender'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  성별 {sortBy === 'gender' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            </div>
          </div>
          <div className="max-h-96 overflow-auto">
            {filteredAndSortedMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 border-b last:border-b-0"
                style={{ borderColor: "var(--notion-border)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold ${
                      member.gender === "M"
                        ? "border-blue-400 bg-blue-100 text-blue-700"
                        : "border-pink-400 bg-pink-100 text-pink-700"
                    }`}
                  >
                    {member.skill}
                  </div>
                  <div>
                    <div
                      className="font-medium"
                      style={{ color: "var(--notion-text)" }}
                    >
                      {member.name}
                    </div>
                    <div
                      className="text-sm"
                      style={{ color: "var(--notion-text-light)" }}
                    >
                      {member.birthYear}년 •{" "}
                      {member.gender === "M" ? "남성" : "여성"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingMember(member)}
                    className="notion-btn notion-btn-secondary text-sm px-3 py-1 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => onDeleteMember(member)}
                    className="notion-btn notion-btn-secondary text-sm px-3 py-1 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
            {filteredAndSortedMembers.length === 0 && (
              <div
                className="text-center py-12"
                style={{ color: "var(--notion-text-light)" }}
              >
                <div className="text-4xl mb-2">🤷‍♂️</div>
                <div>
                  {searchQuery ? `"${searchQuery}"에 해당하는 회원이 없습니다` : '등록된 회원이 없습니다'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 회원 수정 모달 */}
      {editingMember && (
        <EditMemberModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSave={(updatedMember) => {
            onUpdateMember(updatedMember);
            setEditingMember(null);
          }}
        />
      )}
    </div>
  );
}

// 회원 수정 모달 컴포넌트
function EditMemberModal({ member, onClose, onSave }: {
  member: Member;
  onClose: () => void;
  onSave: (member: Member) => void;
}) {
  const [name, setName] = useState(member.name);
  const [birthYear, setBirthYear] = useState(member.birthYear);
  const [gender, setGender] = useState(member.gender);
  const [skill, setSkill] = useState(member.skill);

  const handleSave = () => {
    onSave({
      ...member,
      name,
      birthYear,
      gender,
      skill
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="notion-card relative w-full max-w-md" style={{boxShadow: 'var(--notion-shadow-hover)'}}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold" style={{color: 'var(--notion-text)'}}>회원 정보 수정</h3>
          <button
            onClick={onClose}
            className="text-lg opacity-70 hover:opacity-100 px-3 py-2 rounded hover:bg-gray-100"
            style={{color: 'var(--notion-text-light)'}}
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{color: 'var(--notion-text)'}}>이름</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="notion-input w-full"
              placeholder="이름을 입력하세요"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{color: 'var(--notion-text)'}}>출생년도</label>
            <select value={birthYear} onChange={e => setBirthYear(Number(e.target.value))} className="notion-input w-full">
              <option value="">출생년도 선택</option>
              {Array.from({length: 26}, (_, i) => 2005 - i).map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{color: 'var(--notion-text)'}}>성별</label>
            <select value={gender} onChange={e => setGender(e.target.value as Gender)} className="notion-input w-full">
              <option value="">성별 선택</option>
              <option value="M">남성</option>
              <option value="F">여성</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{color: 'var(--notion-text)'}}>등급</label>
            <select value={skill} onChange={e => setSkill(e.target.value as Skill)} className="notion-input w-full">
              <option value="">등급 선택</option>
              {SKILLS.map(s => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={onClose}
              className="notion-btn notion-btn-secondary"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={!name || !birthYear || !gender || !skill}
              className="notion-btn notion-btn-primary disabled:opacity-50"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 데이터 관리 컴포넌트
function DataManagement({
  members,
  loading,
  totalGamesCount,
  totalShuttlesCount,
  onRefresh
}: {
  members: Member[];
  loading: boolean;
  totalGamesCount: number;
  totalShuttlesCount: number;
  onRefresh: () => Promise<void>;
}) {
  const { showAlert } = useAlert();
  const [isResetting, setIsResetting] = useState(false);

  // 확인 모달 상태
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmData, setConfirmData] = useState<{title: string, message: string, type?: 'warning' | 'danger' | 'info'}>({title: '', message: ''});

  const handleResetStatistics = () => {
    setConfirmData({
      title: '통계 데이터 초기화',
      message: '통계 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      type: 'danger'
    });
    setConfirmAction(() => async () => {
      setIsResetting(true);
      try {
        await resetStatisticsData();
        showAlert('통계 데이터가 초기화되었습니다.', 'success');
        await onRefresh(); // 데이터 새로고침
      } catch (error) {
        console.error('통계 데이터 초기화 실패:', error);
        showAlert('통계 데이터 초기화에 실패했습니다.', 'error');
      } finally {
        setIsResetting(false);
      }
      setShowConfirmModal(false);
    });
    setShowConfirmModal(true);
  };

  const handleResetMembers = () => {
    setConfirmData({
      title: '회원 목록 초기화',
      message: '회원 목록을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      type: 'danger'
    });
    setConfirmAction(() => async () => {
      setIsResetting(true);
      try {
        await resetMembersData();
        showAlert('회원 목록이 초기화되었습니다.', 'success');
        await onRefresh(); // 데이터 새로고침
      } catch (error) {
        console.error('회원 목록 초기화 실패:', error);
        showAlert('회원 목록 초기화에 실패했습니다.', 'error');
      } finally {
        setIsResetting(false);
      }
      setShowConfirmModal(false);
    });
    setShowConfirmModal(true);
  };
  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
            <span className="text-white text-xl">📊</span>
          </div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--notion-text)" }}>
            데이터 관리
          </h2>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center gap-2 shadow-sm"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              새로고침 중...
            </>
          ) : (
            <>
              🔄 새로고침
            </>
          )}
        </button>
      </div>

      {/* 1. 데이터 통계 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--notion-text)" }}>
          <span className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center text-sm">📈</span>
          데이터 통계
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-blue-600 text-sm font-medium mb-1">우리 총 몇 명임?</div>
                <div className="text-2xl font-bold text-blue-700">{members.length}</div>
                <div className="text-blue-500 text-xs">명</div>
              </div>
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">👥</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl border border-green-200 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-green-600 text-sm font-medium mb-1">지금까지 몇 게임 함?</div>
                <div className="text-2xl font-bold text-green-700">
                  {loading ? '...' : Math.floor((totalGamesCount || 0) / 4).toLocaleString()}
                </div>
                <div className="text-green-500 text-xs">게임</div>
              </div>
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">🏸</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-5 rounded-xl border border-orange-200 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-orange-600 text-sm font-medium mb-1">지금까지 콕 몇개 썼음?</div>
                <div className="text-2xl font-bold text-orange-700">
                  {loading ? '...' : (totalShuttlesCount || 0).toLocaleString()}
                </div>
                <div className="text-orange-500 text-xs">개 (누적)</div>
              </div>
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">🏸</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 분포 현황 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--notion-text)" }}>
          <span className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center text-sm">📊</span>
          분포 현황
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-xs">🎯</span>
                </div>
                <h4 className="text-lg font-semibold" style={{ color: "var(--notion-text)" }}>등급별 분포</h4>
              </div>
              <div className="space-y-3">
                {SKILLS.map((skill, index) => {
                  const count = members.filter((m) => m.skill === skill).length;
                  const percentage = members.length > 0 ? (count / members.length) * 100 : 0;
                  const colors = [
                    'from-red-400 to-red-500',
                    'from-orange-400 to-orange-500',
                    'from-yellow-400 to-yellow-500',
                    'from-green-400 to-green-500',
                    'from-blue-400 to-blue-500',
                    'from-indigo-400 to-indigo-500',
                    'from-purple-400 to-purple-500'
                  ];
                  return (
                    <div key={skill} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-16">
                        <span className="w-3 h-3 rounded-full bg-gradient-to-r" style={{background: `linear-gradient(to right, ${colors[index]?.replace('from-', '').replace('to-', '').replace('-400', '').replace('-500', '')})`}}></span>
                        <span className="text-sm font-semibold text-gray-700">{skill} 조</span>
                      </div>
                      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-3 rounded-full bg-gradient-to-r ${colors[index]} transition-all duration-500 ease-out`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="text-right w-16">
                        <div className="text-sm font-bold text-gray-800">{count}명</div>
                        <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-6 h-6 bg-gradient-to-r from-pink-500 to-purple-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-xs">⚧</span>
                </div>
                <h4 className="text-lg font-semibold" style={{ color: "var(--notion-text)" }}>성별 분포</h4>
              </div>

              <div className="space-y-6">
                {/* 남성 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"></div>
                      <span className="text-sm font-semibold text-blue-700">남성</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-700">{members.filter((m) => m.gender === "M").length}명</div>
                      <div className="text-xs text-blue-500">
                        {members.length > 0 ? ((members.filter((m) => m.gender === "M").length / members.length) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-400 to-blue-600 h-4 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${members.length > 0 ? (members.filter((m) => m.gender === "M").length / members.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* 여성 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gradient-to-r from-pink-400 to-pink-600 rounded-full"></div>
                      <span className="text-sm font-semibold text-pink-700">여성</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-pink-700">{members.filter((m) => m.gender === "F").length}명</div>
                      <div className="text-xs text-pink-500">
                        {members.length > 0 ? ((members.filter((m) => m.gender === "F").length / members.length) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-pink-400 to-pink-600 h-4 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${members.length > 0 ? (members.filter((m) => m.gender === "F").length / members.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* 3. 데이터 초기화 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--notion-text)" }}>
          <span className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center text-sm">🗑️</span>
          데이터 초기화
        </h3>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-600 text-sm">⚠️</span>
            <span className="text-amber-800 font-medium text-sm">주의사항</span>
          </div>
          <p className="text-amber-700 text-sm">
            데이터 초기화는 되돌릴 수 없는 작업입니다. 신중하게 선택해주세요.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-xl border border-red-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-bold text-red-700 mb-1">통계 데이터 초기화</h4>
                <p className="text-red-600 text-sm">게임 수, 출석 데이터, 셔틀콕 통계 등을 모두 삭제합니다.</p>
              </div>
              <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">📊</span>
              </div>
            </div>
            <button
              onClick={handleResetStatistics}
              disabled={isResetting}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-lg transition-colors duration-200"
            >
              {isResetting ? '초기화 중...' : '통계 데이터 초기화'}
            </button>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-5 rounded-xl border border-orange-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-bold text-orange-700 mb-1">회원 목록 초기화</h4>
                <p className="text-orange-600 text-sm">등록된 모든 회원 정보를 삭제합니다.</p>
              </div>
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">👥</span>
              </div>
            </div>
            <button
              onClick={handleResetMembers}
              disabled={isResetting}
              className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-medium rounded-lg transition-colors duration-200"
            >
              {isResetting ? '초기화 중...' : '회원 목록 초기화'}
            </button>
          </div>
        </div>
      </div>

      {/* 확인 모달 */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title={confirmData.title}
        message={confirmData.message}
        confirmText="확인"
        cancelText="취소"
        type={confirmData.type || 'warning'}
        onConfirm={() => {
          if (confirmAction) {
            confirmAction();
          }
        }}
        onCancel={() => {
          setShowConfirmModal(false);
          setConfirmAction(null);
        }}
      />
    </div>
  );
}

// 시스템 정보 컴포넌트
function SystemInfo() {
  const [serverStatus, setServerStatus] = useState<
    "online" | "offline" | "checking"
  >("checking");

  useEffect(() => {
    // 서버 상태 체크 시뮬레이션
    setTimeout(() => {
      setServerStatus("online");
    }, 1000);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">⚙️</span>
        <h2
          className="text-2xl font-bold"
          style={{ color: "var(--notion-text)" }}
        >
          시스템 정보
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 앱 정보 */}
        <div className="space-y-4">
          <h3
            className="text-lg font-semibold"
            style={{ color: "var(--notion-text)" }}
          >
            앱 정보
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span style={{ color: "var(--notion-text)" }}>앱 이름</span>
              <span className="font-medium">내맘대로 배드민턴</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span style={{ color: "var(--notion-text)" }}>버전</span>
              <span className="font-medium">v2.1.0</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span style={{ color: "var(--notion-text)" }}>
                마지막 업데이트
              </span>
              <span className="font-medium">
                {new Date().toLocaleDateString("ko-KR")}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span style={{ color: "var(--notion-text)" }}>개발자</span>
              <span className="font-medium">Lee Byeong Heon</span>
            </div>
          </div>
        </div>

        {/* 시스템 상태 */}
        <div className="space-y-4">
          <h3
            className="text-lg font-semibold"
            style={{ color: "var(--notion-text)" }}
          >
            시스템 상태
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span style={{ color: "var(--notion-text)" }}>서버 상태</span>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    serverStatus === "online"
                      ? "bg-green-500"
                      : serverStatus === "offline"
                      ? "bg-red-500"
                      : "bg-yellow-500"
                  }`}
                ></div>
                <span className="font-medium">
                  {serverStatus === "online"
                    ? "정상"
                    : serverStatus === "offline"
                    ? "오프라인"
                    : "확인 중..."}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span style={{ color: "var(--notion-text)" }}>데이터베이스</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="font-medium">연결됨</span>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span style={{ color: "var(--notion-text)" }}>마지막 백업</span>
              <span className="font-medium">오늘</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span style={{ color: "var(--notion-text)" }}>브라우저</span>
              <span className="font-medium">
                {navigator.userAgent.split(" ")[0]}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 기술 정보 */}
      {/* <div className="space-y-4">
        <h3
          className="text-lg font-semibold"
          style={{ color: "var(--notion-text)" }}
        >
          기술 스택
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl mb-2">⚛️</div>
            <div className="font-medium text-blue-700">React</div>
            <div className="text-sm text-blue-600">Frontend</div>
          </div>
          <div className="text-center p-4 bg-black text-white rounded-lg">
            <div className="text-2xl mb-2">▲</div>
            <div className="font-medium">Next.js</div>
            <div className="text-sm opacity-80">Framework</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="text-2xl mb-2">🔥</div>
            <div className="font-medium text-orange-700">Firebase</div>
            <div className="text-sm text-orange-600">Database</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl mb-2">🎨</div>
            <div className="font-medium text-blue-700">Tailwind</div>
            <div className="text-sm text-blue-600">Styling</div>
          </div>
        </div>
      </div> */}
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { createMember, listMembers, markAttendance, getTodayAttendance, removeAttendance } from '@/lib/supabase-db';
import type { Gender, Skill, Member, AttendanceParticipant } from '@/types/db';
import { useAlert } from '@/components/CustomAlert';
import { usePreventDuplicate } from '@/hooks/useGameState';
import ConfirmModal from '@/components/ConfirmModal';
const SKILLS: Skill[] = ['S','A','B','C','D','E','F'];

// 초성 계산 유틸
const CHOSEONG_LIST = [
  'ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'
] as const;

// 전화번호부 스타일 정렬 순서(쌍자음은 기본자음으로 합침)
const GROUP_ORDER = ['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ','#'] as const;

// 쌍자음 → 기본자음 매핑
const MERGE_DOUBLE: Record<string, string> = {
  'ㄲ':'ㄱ','ㄸ':'ㄷ','ㅃ':'ㅂ','ㅆ':'ㅅ','ㅉ':'ㅈ'
};

function getInitialConsonant(name: string): string {
  const ch = (name ?? '').trim().charAt(0);
  if (!ch) return '#';
  const code = ch.charCodeAt(0);

  // 한글 음절 범위
  if (code >= 0xAC00 && code <= 0xD7A3) {
    const idx = Math.floor((code - 0xAC00) / (21 * 28)); // 초성 인덱스
    let cho = CHOSEONG_LIST[idx] as string;
    if (MERGE_DOUBLE[cho]) cho = MERGE_DOUBLE[cho];
    return cho;
  }
  return '#';
}

// 등급별 색상 시스템
// const getSkillColor = (skill: Skill) => {
const getSkillColor = (skill: Gender) => {
  switch (skill) {
    // case 'S': return 'border-purple-500 bg-purple-100 text-purple-700';
    // case 'A': return 'border-red-500 bg-red-100 text-red-700';
    // case 'B': return 'border-orange-500 bg-orange-100 text-orange-700';
    // case 'C': return 'border-yellow-500 bg-yellow-100 text-yellow-700';
    // case 'D': return 'border-green-500 bg-green-100 text-green-700';
    // case 'E': return 'border-blue-500 bg-blue-100 text-blue-700';
    // case 'F': return 'border-gray-500 bg-gray-100 text-gray-700';     
    case 'M': return 'border-blue-400 bg-blue-100 text-blue-700';
    default : return 'border-pink-400 bg-pink-100 text-pink-700';
  }
};

export default function AttendancePage() {
  const { showAlert } = useAlert();
  const { executeOnce } = usePreventDuplicate();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayParticipants, setTodayParticipants] = useState<AttendanceParticipant[]>([]);

  // 모달 상태
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showShuttleModal, setShowShuttleModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedShuttles, setSelectedShuttles] = useState(0);
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);

  // 확인 모달 상태
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmData, setConfirmData] = useState<{title: string, message: string}>({title: '', message: ''});

  // 회원 추가 폼 상태
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState<number | ''>('');
  const [gender, setGender] = useState<Gender>('M');
  const [skill, setSkill] = useState<Skill>('C');

  // 게스트 추가 폼 상태(게스트는 출석까지 동시에 처리)
  const [gName, setGName] = useState('');
  const [gBirthYear, setGBirthYear] = useState<number | ''>('');
  const [gGender, setGGender] = useState<Gender>('M');

  // 검색 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [gSkill, setGSkill] = useState<Skill>('C');
  const [gShuttles, setGShuttles] = useState(0);



  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [allMembers, today] = await Promise.all([listMembers(), getTodayAttendance()]);
        setMembers(allMembers);
        setTodayParticipants(today.participants);
      } catch (e) {
        const msg = e instanceof Error ? e.message : '불러오기에 실패했습니다.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const canSubmitMember = useMemo(() => {
    return (
      name.trim().length > 0 &&
      typeof birthYear === 'number' &&
      birthYear >= 1900 && birthYear <= new Date().getFullYear() &&
      SKILLS.includes(skill)
    );
  }, [name, birthYear, skill]);

  const canSubmitGuest = useMemo(() => {
    return (
      gName.trim().length > 0 &&
      typeof gBirthYear === 'number' &&
      gBirthYear >= 1900 && gBirthYear <= new Date().getFullYear() &&
      SKILLS.includes(gSkill) &&
      gShuttles >= 0 && gShuttles <= 5
    );
  }, [gName, gBirthYear, gSkill, gShuttles]);

  // 중복 이름 확인 및 처리
  const checkDuplicateName = (inputName: string): string => {
    const existingNames = members.map(m => m.name.toLowerCase());
    const lowerInputName = inputName.toLowerCase();

    if (!existingNames.includes(lowerInputName)) {
      return inputName; // 중복 없음
    }

    // 중복이 있는 경우 숫자를 붙여서 고유한 이름 생성
    let counter = 2;
    let newName = `${inputName} ${counter}`;

    while (existingNames.includes(newName.toLowerCase())) {
      counter++;
      newName = `${inputName} ${counter}`;
    }

    return newName;
  };

  const handleCreateMember = async () => {
    try {
      setError(null);

      // 중복 이름 확인
      const originalName = name.trim();
      const finalName = checkDuplicateName(originalName);

      // 중복이 있었다면 알림 표시
      if (finalName !== originalName) {
        showAlert(`이미 "${originalName}" 이름이 존재합니다. "${finalName}"으로 등록됩니다.`, 'warning');
      }

      const member = await createMember({
        name: finalName,
        birthYear: birthYear as number,
        gender,
        skill,
      });
      setMembers((prev) => [...prev, member].sort((a,b) => a.nameLower.localeCompare(b.nameLower)));
      setName('');
      setBirthYear('');
      setGender('M');
      setSkill('C');
      setShowMemberModal(false);
      showAlert('회원이 추가되었습니다.', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '회원 추가 실패';
      setError(msg);
      showAlert(msg, 'error');
    }
  };

  const handleCreateGuestAndAttend = async () => {
    try {
      await markAttendance({
        participant: { type: 'guest', name: gName.trim(), birthYear: gBirthYear as number, gender: gGender, skill: gSkill },
        shuttles: gShuttles,
      });
      const today = await getTodayAttendance();
      setTodayParticipants(today.participants);
      setGName('');
      setGBirthYear('');
      setGGender('M');
      setGSkill('C');
      setGShuttles(0);
      setShowGuestModal(false);
      showAlert('게스트 출석이 완료되었습니다.', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '게스트 출석 실패';
      showAlert(msg, 'error');
    }
  };

  const handleRemoveAttendance = (participantId: string, participantType: 'member' | 'guest') => {
    setConfirmData({
      title: '출석 취소',
      message: '정말로 출석을 취소하시겠습니까?'
    });
    setConfirmAction(() => async () => {
      try {
        await removeAttendance(participantId, participantType);
        const today = await getTodayAttendance();
        setTodayParticipants(today.participants);
        showAlert('출석이 취소되었습니다.', 'success');
      } catch (e) {
        const msg = e instanceof Error ? e.message : '출석 취소 실패';
        showAlert(msg, 'error');
      }
      setShowConfirmModal(false);
    });
    setShowConfirmModal(true);
  };

  return (
    <>
      <main className="min-h-screen p-8" style={{backgroundColor: 'var(--notion-bg-secondary)'}}>
        <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-black">
          <h1 className="text-2xl font-bold" style={{color: 'var(--notion-text)'}}>출석부</h1>
          <div className="flex gap-3">
            <button
              onClick={()=>setShowMemberModal(true)}
              className="px-4 py-2 border-2 border-green-500 text-green-600 font-medium rounded hover:bg-green-50"
            >
              + 회원추가
            </button>
            <button
              onClick={()=>setShowGuestModal(true)}
              className="px-4 py-2 border-2 border-blue-500 text-blue-600 font-medium rounded hover:bg-blue-50"
            >
              + 게스트추가
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="spinner h-8 w-8 mx-auto mb-2"></div>
            <span style={{color: 'var(--notion-text-light)'}}>불러오는 중...</span>
          </div>
        ) : (
          <div className="flex gap-6 h-full">
            {/* 좌측: 미출석 회원 (2/3 비율) */}
            <div className="flex-[2]">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold" style={{color: 'var(--notion-text)'}}>미출석 회원</h2>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                        {members.filter(m => !todayParticipants.some((tp): tp is Extract<AttendanceParticipant, {type:'member'}> => tp.type==='member' && tp.memberId === m.id)).length}명
                      </span>
                    </div>
                  </div>
                  {/* 검색 입력 필드 */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="이름 검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="px-7 py-3 border-3 border-yellow-600 rounded-lg text-m focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                </div>
              </div>
              {(() => {
                // 필터 + 검색 + 정렬(이름 가나다순)
                const filteredMembers = members
                  .filter(m => !todayParticipants.some(
                    (tp): tp is Extract<AttendanceParticipant, {type:'member'}> =>
                      tp.type === 'member' && tp.memberId === m.id
                  ))
                  .filter(m => searchQuery === '' || m.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

                // 초성별 그룹화
                const groups = filteredMembers.reduce((acc: Record<string, typeof members>, m) => {
                  const key = getInitialConsonant(m.name);
                  (acc[key] ||= []).push(m);
                  return acc;
                }, {});

                return (
                  <div className="space-y-1">
                    {GROUP_ORDER.map((key) => {
                      const list = groups[key];
                      if (!list || list.length === 0) return null;

                      return (
                        <section key={key}>
                          {/* 섹션 헤더 */}
                          <div className="flex items-center gap-2 mb-1">
                            <div className="text-lg font-extrabold tracking-widest">{key}</div>
                            <div className="h-px flex-1 bg-gray-500" />
                          </div>

                          {/* 카드 그리드 */}
                          <div className="grid grid-cols-4 gap-2">
                            {list.map((m) => (
                              <div
                                key={m.id}
                                className={`border-2 rounded-lg p-2 cursor-pointer hover:shadow-md transition-all duration-200 ${
                                  m.gender === 'M'
                                    ? 'border-blue-300 bg-blue-50 hover:border-blue-400'
                                    : 'border-red-300 bg-red-50 hover:border-red-400'
                                }`}
                                onClick={() => {
                                  setSelectedMember(m);
                                  setSelectedShuttles(0);
                                  setShowShuttleModal(true);
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  {/* 아바타(등급/성별 색상) */}
                                  {/* <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${getSkillColor(m.skill)}`}> */}
                                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${getSkillColor(m.gender)}`}>
                                    {m.skill}
                                  </div>

                                  {/* 이름 */}
                                  <div className="flex-1 min-w-0">
                                    <div className="text-base font-bold truncate" style={{ color: 'var(--notion-text)' }}>
                                      {m.name}
                                    </div>
                                  </div>

                                  {/* 성별 배지 */}
                                  <div className={`px-2 py-1 rounded text-xs font-semibold ${
                                    m.gender === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {m.gender === 'M' ? '남' : '여'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* 중앙 구분선 */}
            <div className="w-px bg-black"></div>

            {/* 우측: 출석 회원/게스트 (1/3 비율) */}
            <div className="flex-1">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-lg font-semibold" style={{color: 'var(--notion-text)'}}>출석 회원(+게스트)</h2>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                      {todayParticipants.length}명
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    <span>회원 {todayParticipants.filter(p => p.type === 'member').length}명</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                    <span>게 {todayParticipants.filter(p => p.type === 'guest').length}명</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {/* 출석 회원 */}
                {todayParticipants.filter((p): p is Extract<AttendanceParticipant, {type:'member'}> => p.type==='member')
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((p, idx) => {
                  const member = members.find(m => m.id === p.memberId);
                  return (
                    <div
                      key={`${p.type}-${p.memberId}-${idx}`}
                      className={`border-2 rounded-lg p-2 cursor-pointer hover:shadow-md transition-all duration-200 group ${
                        member?.gender === 'M'
                          ? 'border-blue-300 bg-blue-50 hover:border-blue-400'
                          : 'border-red-300 bg-red-50 hover:border-red-400'
                      }`}
                      onClick={() => handleRemoveAttendance(p.memberId, 'member')}
                    >
                      <div className="flex items-center gap-3">
                        {/* 아바타 (등급별 색상) - 크기 축소 */}
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                          // member?.skill ? getSkillColor(member.skill) : 'border-gray-500 bg-gray-100 text-gray-700'
                          member?.skill ? getSkillColor(member.gender) : 'border-gray-500 bg-gray-100 text-gray-700'
                        }`}>
                          {member?.skill}
                        </div>

                        {/* 이름 - 크기 증가 및 굵게 */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold break-words" style={{color: 'var(--notion-text)'}}>{p.name}</div>
                          {/* <div className="text-xs text-gray-600">셔틀콕 {p.shuttles}개</div> */}
                        </div>

                        {/* 성별 배지와 삭제 버튼 */}
                        <div className="flex items-center gap-1">
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            member?.gender === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {member?.gender === 'M' ? '남성' : '여성'}
                          </div>
                          <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity text-red-500">
                            ✕
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* 출석 게스트 */}
                {todayParticipants.filter((p): p is Extract<AttendanceParticipant, {type:'guest'}> => p.type==='guest')
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((p, idx) => (
                  <div
                    key={`${p.type}-${p.name}-${idx}`}
                    className={`border-2 rounded-lg p-2 cursor-pointer hover:shadow-md transition-all duration-200 group ${
                      p.gender === 'M'
                        ? 'border-blue-300 bg-blue-50 hover:border-blue-400'
                        : 'border-red-300 bg-red-50 hover:border-red-400'
                    }`}
                    onClick={() => handleRemoveAttendance(p.name, 'guest')}
                  >
                    <div className="flex items-center gap-3">
                      {/* 아바타 (등급별 색상) - 크기 축소 */}
                      {/* <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${getSkillColor(p.skill)}`}> */}
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${getSkillColor(p.gender)}`}>
                        {p.skill}
                      </div>

                      {/* 이름 - 크기 증가 및 굵게 */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold break-words" style={{color: 'var(--notion-text)'}}>{p.name}</div>
                        {/* <div className="text-xs text-gray-600">셔틀콕 {p.shuttles}개</div> */}
                      </div>

                      {/* 게스트 배지와 성별, 삭제 버튼 */}
                      <div className="flex items-center gap-1">
                        <div className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          G
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          p.gender === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {p.gender === 'M' ? '남성' : '여성'}
                        </div>
                        <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity text-red-500">
                          ✕
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </main>

    {/* 회원 추가 모달 */}
    {showMemberModal && (
      <Modal onClose={()=>setShowMemberModal(false)} title="회원 추가">
        <div className="flex flex-col gap-3">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="이름" className="notion-input" />
          <select value={birthYear} onChange={e=>setBirthYear(e.target.value ? Number(e.target.value) : '')} className="notion-input">
              <option value="">출생년도 선택</option>
              {Array.from({length: 26}, (_, i) => 2005 - i).map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
          <div className="flex gap-2">
            <select value={gender} onChange={e=>setGender(e.target.value as Gender)} className="notion-input">
              <option value="M">남성</option>
              <option value="F">여성</option>
            </select>
            <select value={skill} onChange={e=>setSkill(e.target.value as Skill)} className="notion-input">
              <option value="">등급 선택</option>
              {SKILLS.map(s => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
          {error && <p className="text-sm" style={{color: 'var(--notion-red)'}}>{error}</p>}
          <div className="flex justify-end gap-2 mt-4">
            {/* <button onClick={()=>setShowMemberModal(false)} className="notion-btn notion-btn-secondary">취소</button> */}
            <button disabled={!canSubmitMember} onClick={handleCreateMember} className="w-full notion-btn notion-btn-primary disabled:opacity-50">추가</button>
          </div>
        </div>
      </Modal>
    )}

    {/* 게스트 추가 모달 */}
    {showGuestModal && (
      <Modal onClose={()=>setShowGuestModal(false)} title="게스트 추가">
        <div className="flex flex-col gap-3">
          <input value={gName} onChange={e=>setGName(e.target.value)} placeholder="이름" className="notion-input" />
          <select value={gBirthYear} onChange={e=>setGBirthYear(e.target.value ? Number(e.target.value) : '')} className="notion-input">
              <option value="">출생년도 선택</option>
              {Array.from({length: 26}, (_, i) => 2005 - i).map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
          <div className="flex gap-2">
            <select value={gGender} onChange={e=>setGGender(e.target.value as Gender)} className="notion-input">
              <option value="M">남성</option>
              <option value="F">여성</option>
            </select>
            <select value={gSkill} onChange={e=>setGSkill(e.target.value as Skill)} className="notion-input">
              <option value="">등급 선택</option>
              {SKILLS.map(s => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
          <div>
            <div className="text-sm font-medium mb-3" style={{color: 'var(--notion-text)'}}>셔틀콕 개수</div>
            <div className="grid grid-cols-3 gap-2">
              {[0,1,2,3,4,5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={()=>setGShuttles(n)}
                  className={`p-3 rounded-lg border-2 text-base font-bold transition-all ${
                    gShuttles===n
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  {n}개
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            {/* <button onClick={()=>setShowGuestModal(false)} className="notion-btn notion-btn-secondary">취소</button> */}
            <button disabled={!canSubmitGuest} onClick={handleCreateGuestAndAttend} className=" w-full notion-btn notion-btn-primary disabled:opacity-50">출석</button>
          </div>
        </div>
      </Modal>
    )}

    {/* 셔틀콕 개수 선택 모달 */}
    {showShuttleModal && selectedMember && (
      <Modal onClose={()=>setShowShuttleModal(false)} title={`${selectedMember.name} 출석`}>
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <div className="text-lg font-medium mb-4">셔틀콕 개수를 선택하세요</div>
            <div className="grid grid-cols-3 gap-3">
              {[0,1,2,3,4,5].map(n => (
                <button
                  key={n}
                  onClick={()=>setSelectedShuttles(n)}
                  className={`p-4 rounded-lg border-2 text-lg font-bold transition-all ${
                    selectedShuttles===n
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  {n}개
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-center mt-4">
            <button
              onClick={async ()=>{
                if (isSubmittingAttendance) return; // 중복 클릭 방지

                const result = await executeOnce(`attendance-${selectedMember.id}`, async () => {
                  setIsSubmittingAttendance(true);
                  try {
                    await markAttendance({
                      participant: {
                        type: 'member',
                        memberId: selectedMember.id,
                        name: selectedMember.name,
                        skill: selectedMember.skill
                      },
                      shuttles: selectedShuttles,
                    });
                    setShowShuttleModal(false);
                    setSelectedMember(null);
                    const today = await getTodayAttendance();
                    setTodayParticipants(today.participants);
                    return true;
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : '출석 처리 실패';
                    showAlert(msg, 'error');
                    throw e;
                  } finally {
                    setIsSubmittingAttendance(false);
                  }
                });

                if (!result) {
                  showAlert('이미 처리 중인 요청입니다.', 'warning');
                }
              }}
              disabled={isSubmittingAttendance}
              className="w-full h-20 notion-btn notion-btn-success px-8 py-6 !text-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmittingAttendance ? '처리 중...' : '출석 완료'}
            </button>
          </div>
        </div>
      </Modal>
    )}

    {/* 확인 모달 */}
    <ConfirmModal
      isOpen={showConfirmModal}
      title={confirmData.title}
      message={confirmData.message}
      confirmText="확인"
      cancelText="취소"
      type="warning"
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
    </>
  );
}



function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="notion-card relative w-full max-w-lg" style={{boxShadow: 'var(--notion-shadow-hover)'}}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold" style={{color: 'var(--notion-text)'}}>{title}</h3>
          <button
            onClick={onClose}
            className="text-lg opacity-70 hover:opacity-100 px-3 py-2 rounded hover:bg-gray-100"
            style={{color: 'var(--notion-text-light)'}}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}


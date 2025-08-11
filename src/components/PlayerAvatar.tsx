import React from 'react';
import type { Gender, Skill } from '@/types/db';

interface PlayerAvatarProps {
  name: string;
  gender: Gender;
  skill: Skill;
  isGuest?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSkillBadge?: boolean;
  className?: string;
}

const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  name,
  gender,
  skill,
  isGuest = false,
  size = 'md',
  showSkillBadge = true,
  className = ''
}) => {
  // 크기별 설정
  const sizeConfig = {
    sm: {
      container: 'w-8 h-8',
      text: 'text-xs',
      badge: 'text-xs px-1.5 py-0.5',
      icon: 'w-3 h-3'
    },
    md: {
      container: 'w-10 h-10',
      text: 'text-sm',
      badge: 'text-xs px-2 py-1',
      icon: 'w-4 h-4'
    },
    lg: {
      container: 'w-12 h-12',
      text: 'text-base',
      badge: 'text-sm px-2 py-1',
      icon: 'w-5 h-5'
    },
    xl: {
      container: 'w-16 h-16',
      text: 'text-lg',
      badge: 'text-sm px-3 py-1',
      icon: 'w-6 h-6'
    }
  };

  // 성별별 색상과 이모지
  const genderConfig = {
    M: {
      gradient: 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600',
      border: 'border-blue-300',
      emoji: '👨',
      shadow: 'shadow-blue-200'
    },
    F: {
      gradient: 'bg-gradient-to-br from-pink-400 via-pink-500 to-pink-600',
      border: 'border-pink-300',
      emoji: '👩',
      shadow: 'shadow-pink-200'
    }
  };

  // 실력별 색상
  const skillConfig = {
    S: { bg: 'bg-red-500', text: 'text-white', badgeColor: 'bg-red-100 text-red-700' },
    A: { bg: 'bg-orange-500', text: 'text-white', badgeColor: 'bg-orange-100 text-orange-700' },
    B: { bg: 'bg-yellow-500', text: 'text-white', badgeColor: 'bg-yellow-100 text-yellow-700' },
    C: { bg: 'bg-green-500', text: 'text-white', badgeColor: 'bg-green-100 text-green-700' },
    D: { bg: 'bg-blue-500', text: 'text-white', badgeColor: 'bg-blue-100 text-blue-700' },
    E: { bg: 'bg-indigo-500', text: 'text-white', badgeColor: 'bg-indigo-100 text-indigo-700' },
    F: { bg: 'bg-purple-500', text: 'text-white', badgeColor: 'bg-purple-100 text-purple-700' }
  };

  const currentSize = sizeConfig[size];
  const currentGender = genderConfig[gender];
  const currentSkill = skillConfig[skill];

  // 이름의 첫 글자 추출
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {/* 메인 아바타 */}
      <div className={`
        ${currentSize.container}
        ${currentGender.gradient}
        ${currentGender.border}
        ${currentGender.shadow}
        rounded-full
        border-2
        flex
        items-center
        justify-center
        font-bold
        text-white
        shadow-lg
        transform
        transition-all
        duration-200
        hover:scale-105
        hover:shadow-xl
        relative
        overflow-hidden
      `}>
        {/* 배경 패턴 */}
        <div className="absolute inset-0 bg-white/10 rounded-full"></div>
        
        {/* 이름 첫 글자 또는 이모지 */}
        <span className={`${currentSize.text} font-bold relative z-10`}>
          {size === 'xl' ? currentGender.emoji : initial}
        </span>

        {/* 게스트 표시 */}
        {isGuest && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full border-2 border-white flex items-center justify-center">
            <span className="text-xs text-white font-bold">G</span>
          </div>
        )}

        {/* 실력 등급 표시 (작은 배지) */}
        {showSkillBadge && size !== 'sm' && (
          <div className={`
            absolute -bottom-1 -right-1 
            ${currentSkill.bg}
            ${currentSkill.text}
            rounded-full
            border-2 border-white
            flex items-center justify-center
            min-w-[18px] h-[18px]
            text-xs font-bold
            shadow-md
          `}>
            {skill}
          </div>
        )}
      </div>

      {/* 실력 등급 배지 (옆에 표시) */}
      {showSkillBadge && size === 'sm' && (
        <span className={`
          ml-1
          ${currentSize.badge}
          ${currentSkill.badgeColor}
          rounded-full
          font-medium
        `}>
          {skill}
        </span>
      )}
    </div>
  );
};

export default PlayerAvatar;

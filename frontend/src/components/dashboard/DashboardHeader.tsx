'use client';

import React from 'react';
import { UserProfile } from '@/types/auth';

export type DashboardRole = 'EMPLOYEE' | 'DEPT_MGR' | 'DIV_MGR' | 'CEO' | 'ADMIN';

export const ROLE_LABELS: Record<DashboardRole, { title: string; badge: string }> = {
  EMPLOYEE: { title: 'พนักงาน', badge: 'พนักงานทั่วไป' },
  DEPT_MGR: { title: 'หัวหน้าแผนก', badge: 'ผู้จัดการแผนก (Department Head)' },
  DIV_MGR: { title: 'หัวหน้าฝ่าย', badge: 'ผู้จัดการฝ่าย (Division Head)' },
  CEO: { title: 'CEO', badge: 'ผู้บริหารสูงสุด (CEO)' },
  ADMIN: { title: 'แอดมิน', badge: 'ผู้ดูแลระบบ (Admin)' },
};

interface RoleSwitcherBarProps {
  activeRole: DashboardRole;
  onRoleChange: (role: DashboardRole) => void;
}

export const RoleSwitcherBar: React.FC<RoleSwitcherBarProps> = ({
  activeRole,
  onRoleChange,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          มุมมองแดชบอร์ด:
        </span>
        <span className="text-xs font-bold text-[#0B2046] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
          {ROLE_LABELS[activeRole].badge}
        </span>
      </div>

      {/* Quick Role Switcher Buttons */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
        {(Object.keys(ROLE_LABELS) as DashboardRole[]).map((role) => {
          const isActive = activeRole === role;
          return (
            <button
              key={role}
              type="button"
              onClick={() => onRoleChange(role)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#0B2046] text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 dark:hover:text-slate-100 dark:text-slate-100 hover:bg-white dark:bg-slate-800/60'
              }`}
            >
              {ROLE_LABELS[role].title}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const GreetingBanner: React.FC<{
  displayName: string;
  activeRole?: DashboardRole;
  allowedRoles?: DashboardRole[];
  onRoleChange?: (role: DashboardRole) => void;
}> = ({ displayName, activeRole, allowedRoles, onRoleChange }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#0B2046] p-7 text-white shadow-md flex flex-wrap items-center justify-between gap-4 min-h-[96px] shrink-0">
      <div className="relative z-10">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          สวัสดี <span className="underline decoration-2 underline-offset-4">{displayName}</span>, หวังว่าจะเป็นวันที่ดี !
        </h1>
      </div>

      {allowedRoles && allowedRoles.length > 1 && activeRole && onRoleChange && (
        <div className="relative z-10 flex items-center gap-1 bg-white/10 backdrop-blur-xs p-1 rounded-xl border border-white/15 text-xs">
          {allowedRoles.map((role) => {
            const isActive = activeRole === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => onRoleChange(role)}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-[#0B2046] shadow-xs font-bold'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {ROLE_LABELS[role].title}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface DashboardHeaderProps {
  user: UserProfile | null;
  activeRole: DashboardRole;
  onRoleChange: (role: DashboardRole) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  user,
  activeRole,
  onRoleChange,
}) => {
  const displayName =
    activeRole === 'EMPLOYEE'
      ? (user?.fullName || 'สมชาย')
      : (user?.fullName || 'แอดมิน');

  return (
    <div className="space-y-3">
      <RoleSwitcherBar activeRole={activeRole} onRoleChange={onRoleChange} />
      <GreetingBanner displayName={displayName} />
    </div>
  );
};

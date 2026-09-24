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
        <span className="text-xs font-semibold text-slate-500">
          มุมมองแดชบอร์ด:
        </span>
        <span className="text-xs font-bold text-[#0B2046] bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
          {ROLE_LABELS[activeRole].badge}
        </span>
      </div>

      {/* Quick Role Switcher Buttons */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
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
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
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

export const GreetingBanner: React.FC<{ displayName: string }> = ({ displayName }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#0B2046] p-7 text-white shadow-md flex items-center min-h-[90px]">
      <div className="relative z-10">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          สวัสดี <span className="underline decoration-2 underline-offset-4">{displayName}</span>, หวังว่าจะเป็นวันที่ดี !
        </h1>
      </div>
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

'use client';

import React from 'react';
import { Users, Landmark, Layers, ShieldCheck } from 'lucide-react';

export type PayrollViewMode = 'ALL' | 'HR' | 'FINANCE';

interface PayrollViewSwitcherProps {
  currentMode: PayrollViewMode;
  onModeChange: (mode: PayrollViewMode) => void;
  isHR: boolean;
  isFinance: boolean;
  userRoles?: string[];
}

export const PayrollViewSwitcher: React.FC<PayrollViewSwitcherProps> = ({
  currentMode,
  onModeChange,
  isHR,
  isFinance,
  userRoles = [],
}) => {
  const isCombined = isHR && isFinance;

  // Render role badge text
  const getRoleBadge = () => {
    if (userRoles.includes('ADMIN')) return 'ผู้ดูแลระบบ (Admin)';
    if (userRoles.includes('CEO')) return 'ผู้บริหารสูงสุด (CEO)';
    if (isCombined) return 'HR + ฝ่ายการเงิน (Combined Role)';
    if (isFinance) return 'ฝ่ายการเงิน / บัญชี (Finance)';
    if (isHR) return 'ฝ่ายทรัพยากรบุคคล (HR)';
    return 'ผู้ใช้งานระบบ';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-medium">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              สิทธิ์และมุมมองการทำงาน:
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              {getRoleBadge()}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentMode === 'ALL' && 'แสดงผลข้อมูลรวมทั้งงาน HR (สวัสดิการ/คำนวณ) และงานการเงิน (โอนเงิน/ภาษี)'}
            {currentMode === 'HR' && 'แสดงเฉพาะรายการสวัสดิการ รายได้ รายหัก คำนวณเงินเดือน และ E-Payslip'}
            {currentMode === 'FINANCE' && 'แสดงเฉพาะสรุปยอดโอน การส่งออกไฟล์ธนาคาร ภาษี ประกันสังคม และสลิปการโอน'}
          </p>
        </div>
      </div>

      {(isCombined || userRoles.includes('ADMIN') || userRoles.includes('CEO')) && (
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => onModeChange('ALL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              currentMode === 'ALL'
                ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            มุมมองรวม (Combined)
          </button>
          <button
            type="button"
            onClick={() => onModeChange('HR')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              currentMode === 'HR'
                ? 'bg-white text-blue-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            เฉพาะ HR
          </button>
          <button
            type="button"
            onClick={() => onModeChange('FINANCE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              currentMode === 'FINANCE'
                ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            เฉพาะการเงิน (Finance)
          </button>
        </div>
      )}
    </div>
  );
};

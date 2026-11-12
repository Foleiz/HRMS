'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause } from 'lucide-react';
import { DashboardRole, ROLE_LABELS } from './DashboardHeader';
import { EmployeeStatCards } from './employee/EmployeeStatCards';
import { ManagerStatCards } from './manager/ManagerStatCards';

interface StatCardsBannerProps {
  roles: DashboardRole[];
  /** ระยะเวลาในการเลื่อนอัตโนมัติ (มิลลิวินาที) ค่าเริ่มต้น 7000 ms (7 วินาที) */
  intervalMs?: number;
}

const DEFAULT_INTERVAL_MS = 7000;

const getCleanRoleLabel = (role: DashboardRole) =>
  ROLE_LABELS[role].badge.replace(/\s*\([^)]*\)\s*$/, '').trim();

export const StatCardsBanner: React.FC<StatCardsBannerProps> = ({
  roles,
  intervalMs = DEFAULT_INTERVAL_MS,
}) => {
  const uniqueRoles = useMemo<DashboardRole[]>(() => {
    const seen = new Set<DashboardRole>();
    const list: DashboardRole[] = [];
    for (const r of roles) {
      if (!seen.has(r)) {
        seen.add(r);
        list.push(r);
      }
    }
    return list.length > 0 ? list : ['EMPLOYEE'];
  }, [roles]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const totalSlides = uniqueRoles.length;
  const safeIndex = activeIndex < totalSlides ? activeIndex : 0;
  const currentRole = uniqueRoles[safeIndex] ?? 'EMPLOYEE';

  // รีเซ็ตกลับสไลด์แรกเมื่อชุด Role ของผู้ใช้เปลี่ยน (เช่น ล็อกอินสลับบัญชี)
  const rolesKey = uniqueRoles.join('|');
  useEffect(() => {
    setActiveIndex(0);
  }, [rolesKey]);

  // เลื่อนสไลด์อัตโนมัติตามเวลา และหยุดชั่วคราวเมื่อชี้เมาส์หรือมีเพียง 1 Role
  useEffect(() => {
    if (totalSlides <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % totalSlides);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [totalSlides, isPaused, intervalMs, safeIndex]);

  // กรณีมีเพียง 1 Role แสดงการ์ดชุดเดียวตามปกติโดยไม่ต้องมีแถบสไลด์
  if (totalSlides <= 1) {
    return currentRole === 'EMPLOYEE' ? (
      <EmployeeStatCards />
    ) : (
      <ManagerStatCards role={currentRole} />
    );
  }

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % totalSlides);
  };

  return (
    <div
      className="flex flex-col h-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="สรุปสถิติตามบทบาท"
    >
      {/* กรอบสไลด์การ์ด 6 ใบ — Mount ทุก Role ครั้งเดียวเพื่อให้เปลี่ยนสไลด์ได้ลื่นและไม่โหลดซ้ำ */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div
          className="flex h-full transition-transform duration-500 ease-in-out will-change-transform"
          style={{ transform: `translateX(-${safeIndex * 100}%)` }}
        >
          {uniqueRoles.map((role, idx) => {
            const isActive = idx === safeIndex;
            return (
              <div
                key={role}
                className="w-full shrink-0 h-full p-0.5"
                aria-hidden={!isActive}
              >
                {role === 'EMPLOYEE' ? (
                  <EmployeeStatCards />
                ) : (
                  <ManagerStatCards role={role} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* แถบ Indicator ด้านล่างแบบแคปซูล + ป้ายชื่อ Role ปัจจุบัน */}
      <div className="mt-2.5 flex items-center justify-between gap-2 px-1 shrink-0">
        {/* ซ้าย: ชื่อบทบาทที่กำลังแสดง */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 truncate max-w-[200px] sm:max-w-none">
            <span className="w-1.5 h-1.5 rounded-full bg-primary dark:bg-blue-400 shrink-0" />
            <span className="truncate">{getCleanRoleLabel(currentRole)}</span>
          </span>
          {isPaused && (
            <span
              className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 dark:text-slate-500"
              title="หยุดเลื่อนอัตโนมัติชั่วคราวขณะชี้เมาส์"
            >
              <Pause className="w-2.5 h-2.5" />
              หยุดชั่วคราว
            </span>
          )}
        </div>

        {/* กลาง: จุดแคปซูลบอกตำแหน่งสไลด์ (• ▬▬) */}
        <div className="flex items-center gap-1.5" role="tablist" aria-label="เลือกมุมมองบทบาท">
          {uniqueRoles.map((role, idx) => {
            const isActive = idx === safeIndex;
            const label = getCleanRoleLabel(role);
            return (
              <button
                key={role}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`มุมมอง ${label}`}
                title={label}
                onClick={() => setActiveIndex(idx)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'w-7 bg-primary dark:bg-blue-400'
                    : 'w-2 bg-slate-300 dark:bg-slate-600 hover:bg-primary/50 dark:hover:bg-blue-400/50'
                }`}
              />
            );
          })}
        </div>

        {/* ขวา: ปุ่มเลื่อนซ้าย/ขวา และตัวเลขลำดับ */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="มุมมองก่อนหน้า"
            title="มุมมองก่อนหน้า"
            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums min-w-[28px] text-center">
            {safeIndex + 1}/{totalSlides}
          </span>
          <button
            type="button"
            onClick={handleNext}
            aria-label="มุมมองถัดไป"
            title="มุมมองถัดไป"
            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

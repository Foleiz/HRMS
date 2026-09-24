'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { leaveService } from '@/services/leaveService';
import { LeaveBalance } from '@/types/leave';

interface LeaveStatsState {
  sickUsed: number;
  sickQuota: number;
  businessUsed: number;
  businessQuota: number;
  vacationUsed: number;
  vacationQuota: number;
  specialUsed: number;
  specialQuota: number;
  otherUsed: number;
  totalUsed: number;
}

const INITIAL_STATS: LeaveStatsState = {
  sickUsed: 0,
  sickQuota: 30,
  businessUsed: 0,
  businessQuota: 3,
  vacationUsed: 0,
  vacationQuota: 6,
  specialUsed: 0,
  specialQuota: 10,
  otherUsed: 0,
  totalUsed: 0,
};

export const EmployeeStatCards: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<LeaveStatsState>(INITIAL_STATS);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const fetchBalances = async () => {
      setLoading(true);
      const currentYear = new Date().getFullYear();

      try {
        // 1. ดึงสรุปยอดวันลาของพนักงานปัจจุบันจาก backend (คำนวณจาก Leave Balances + คำขอลาที่อนุมัติจริง)
        const summary = await leaveService.getMyLeaveSummary({
          year: currentYear,
          employeeId: user?.employeeId,
        });

        if (summary) {
          const sickU = Number(summary.sickLeave?.usedDays ?? 0);
          const sickQ = Number(summary.sickLeave?.quotaDays ?? 30);

          const bizU = Number(summary.personalLeave?.usedDays ?? 0);
          const bizQ = Number(summary.personalLeave?.quotaDays ?? 3);

          const vacU = Number(summary.annualLeave?.usedDays ?? 0);
          const vacQ = Number(summary.annualLeave?.quotaDays ?? 6);

          const specU = Number(summary.specialLeave?.usedDays ?? 0);
          const specQ = Number(summary.specialLeave?.quotaDays ?? 10);

          // คำนวณวันลาประเภทอื่นๆ จาก allBalances (เช่น ลาคลอด, ลาทำหมัน, ลาบวช, ฯลฯ)
          const standardCodes = ['SICK', 'PERSONAL', 'ANNUAL', 'SPECIAL', 'TRAVEL'];
          let othU = 0;
          let allUsedSum = 0;

          if (Array.isArray(summary.allBalances) && summary.allBalances.length > 0) {
            summary.allBalances.forEach((b: LeaveBalance) => {
              const code = (b.leaveTypeCode || '').toUpperCase();
              const name = b.leaveTypeName || '';
              const used = Number(b.usedDays) || 0;
              allUsedSum += used;

              const isStandard =
                standardCodes.some((sc) => code.includes(sc)) ||
                name.includes('ป่วย') ||
                name.includes('กิจ') ||
                name.includes('พักร้อน') ||
                name.includes('พิเศษ');

              if (!isStandard) {
                othU += used;
              }
            });
          } else {
            allUsedSum = sickU + bizU + vacU + specU;
          }

          if (isMounted) {
            setStats({
              sickUsed: sickU,
              sickQuota: sickQ,
              businessUsed: bizU,
              businessQuota: bizQ,
              vacationUsed: vacU,
              vacationQuota: vacQ,
              specialUsed: specU,
              specialQuota: specQ,
              otherUsed: othU,
              totalUsed: allUsedSum,
            });
          }
          return;
        }
      } catch (err) {
        console.warn('getMyLeaveSummary failed, trying getLeaveBalances fallback:', err);
      }

      // 2. Fallback: ดึงจากรายการ leave balances โดยตรงตาม employeeId ของผู้ใช้
      try {
        const balances = await leaveService.getLeaveBalances({
          employeeId: user?.employeeId,
          year: currentYear,
        });

        if (balances && Array.isArray(balances) && balances.length > 0) {
          let sickU = 0, sickQ = 30;
          let bizU = 0, bizQ = 3;
          let vacU = 0, vacQ = 6;
          let specU = 0, specQ = 10;
          let othU = 0;
          let totU = 0;

          balances.forEach((b: LeaveBalance) => {
            const code = (b.leaveTypeCode || '').toUpperCase();
            const name = b.leaveTypeName || '';
            const used = Number(b.usedDays) || 0;
            const quota = Number(b.annualQuotaDays) || 0;
            totU += used;

            if (code.includes('SICK') || name.includes('ป่วย')) {
              sickU = used;
              if (quota > 0) sickQ = quota;
            } else if (code.includes('PERSONAL') || code.includes('BUSINESS') || name.includes('กิจ')) {
              bizU = used;
              if (quota > 0) bizQ = quota;
            } else if (code.includes('ANNUAL') || code.includes('VACATION') || name.includes('พักร้อน')) {
              vacU = used;
              if (quota > 0) vacQ = quota;
            } else if (code.includes('SPECIAL') || code.includes('TRAVEL') || name.includes('พิเศษ') || name.includes('เที่ยว')) {
              specU = used;
              if (quota > 0) specQ = quota;
            } else {
              othU += used;
            }
          });

          if (isMounted) {
            setStats({
              sickUsed: sickU,
              sickQuota: sickQ,
              businessUsed: bizU,
              businessQuota: bizQ,
              vacationUsed: vacU,
              vacationQuota: vacQ,
              specialUsed: specU,
              specialQuota: specQ,
              otherUsed: othU,
              totalUsed: totU,
            });
          }
        }
      } catch (err2) {
        console.error('Failed to load employee leave balances:', err2);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchBalances();

    return () => {
      isMounted = false;
    };
  }, [user?.employeeId]);

  const isOverVacation = stats.vacationQuota > 0 && stats.vacationUsed > stats.vacationQuota;
  const overDays = stats.vacationUsed - stats.vacationQuota;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
      {/* 1. ลาป่วย (Yellow) */}
      <div className="bg-[#FEF6D8] border border-[#F6E5A6] rounded-2xl p-4 flex flex-col justify-between shadow-xs min-h-[90px]">
        <span className="text-xs font-bold text-slate-700">ลา ป่วย ไปแล้ว</span>
        <div className="flex items-baseline justify-center gap-1.5 my-1">
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            {stats.sickUsed}/{stats.sickQuota}
          </span>
          <span className="text-xs font-semibold text-slate-600">วัน</span>
        </div>
      </div>

      {/* 2. ลากิจ (Pink) */}
      <div className="bg-[#FDE2E4] border border-[#F9C3C8] rounded-2xl p-4 flex flex-col justify-between shadow-xs min-h-[90px]">
        <span className="text-xs font-bold text-slate-700">ลา กิจ ไปแล้ว</span>
        <div className="flex items-baseline justify-center gap-1.5 my-1">
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            {stats.businessUsed}/{stats.businessQuota}
          </span>
          <span className="text-xs font-semibold text-slate-600">วัน</span>
        </div>
      </div>

      {/* 3. ลาพักร้อน (Green พร้อมเตือนตัวแดงเมื่อเกินสิทธิ) */}
      <div className="bg-[#D8F3DC] border border-[#B7E4C7] rounded-2xl p-4 flex flex-col justify-between shadow-xs min-h-[90px] relative">
        <span className="text-xs font-bold text-slate-700">ลา พักร้อน ไปแล้ว</span>
        <div className="flex items-baseline justify-center gap-1.5 my-1">
          <span
            className={`text-2xl font-black tracking-tight ${
              isOverVacation ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {stats.vacationUsed}/{stats.vacationQuota}
          </span>
          <span className="text-xs font-semibold text-slate-600">วัน</span>
        </div>
        {isOverVacation && (
          <p className="text-[10px] text-rose-600 font-semibold text-center mt-auto leading-tight">
            ** คุณใช้เกินสิทธิไป {overDays} วัน
          </p>
        )}
      </div>

      {/* 4. ลาพิเศษ (Blue) */}
      <div className="bg-[#D9EAFD] border border-[#BFDBFE] rounded-2xl p-4 flex flex-col justify-between shadow-xs min-h-[90px]">
        <span className="text-xs font-bold text-slate-700">ลา พิเศษ ไปแล้ว</span>
        <div className="flex items-baseline justify-center gap-1.5 my-1">
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            {stats.specialUsed}/{stats.specialQuota}
          </span>
          <span className="text-xs font-semibold text-slate-600">วัน</span>
        </div>
      </div>

      {/* 5. ลาอื่นๆ ไปแล้วรวม (Light Green) */}
      <div className="bg-[#D7F9D9] border border-[#BCE7BF] rounded-2xl p-4 flex flex-col justify-between shadow-xs min-h-[90px]">
        <span className="text-xs font-bold text-slate-700">ลา อื่นๆ ไปแล้วรวม</span>
        <div className="flex items-baseline justify-center gap-1.5 my-1">
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            {stats.otherUsed}
          </span>
          <span className="text-xs font-semibold text-slate-600">วัน</span>
        </div>
      </div>

      {/* 6. ลาไปแล้วทั้งหมด (Peach / Orange) */}
      <div className="bg-[#FFE5D9] border border-[#FCD2BE] rounded-2xl p-4 flex flex-col justify-between shadow-xs min-h-[90px]">
        <span className="text-xs font-bold text-slate-700">ลาไปแล้วทั้งหมด</span>
        <div className="flex items-baseline justify-center gap-1.5 my-1">
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            {stats.totalUsed}
          </span>
          <span className="text-xs font-semibold text-slate-600">วัน</span>
        </div>
      </div>
    </div>
  );
};

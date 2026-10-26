'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { leaveService } from '@/services/leaveService';
import { essAttendanceService } from '@/services/essAttendanceService';
import { certificateService } from '@/services/certificateService';
import { LeaveBalance } from '@/types/leave';

interface EmployeeDashboardStats {
  presentDays: number;
  totalWorkDays: number;
  lateCount: number;
  otHours: number;
  vacationRemaining: number;
  vacationQuota: number;
  sickRemaining: number;
  sickQuota: number;
  pendingRequestsCount: number;
}

const INITIAL_STATS: EmployeeDashboardStats = {
  presentDays: 0,
  totalWorkDays: 22,
  lateCount: 0,
  otHours: 0,
  vacationRemaining: 6,
  vacationQuota: 6,
  sickRemaining: 30,
  sickQuota: 30,
  pendingRequestsCount: 0,
};

export const EmployeeStatCards: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<EmployeeDashboardStats>(INITIAL_STATS);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const fetchEmployeeStats = async () => {
      setLoading(true);
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      try {
        const [
          attSummaryRes,
          attHistoryRes,
          leaveSummaryRes,
          leaveBalancesRes,
          myLeavesRes,
          myCertsRes,
          myAdjustmentsRes,
        ] = await Promise.allSettled([
          essAttendanceService.getMySummary(currentYear, currentMonth),
          essAttendanceService.getMyHistory(currentYear, currentMonth),
          leaveService.getMyLeaveSummary({ year: currentYear, employeeId: user?.employeeId }),
          leaveService.getLeaveBalances({ employeeId: user?.employeeId, year: currentYear }),
          leaveService.getMyLeaveRequests({ pageSize: 100 }),
          certificateService.getMyRequests(),
          essAttendanceService.getMyAdjustments(1, 50),
        ]);

        // 1. เวลาทำงานและมาสายเดือนนี้
        let presentDays = 0;
        let totalWorkDays = 22;
        let lateCount = 0;
        let otHours = 0;

        if (attSummaryRes.status === 'fulfilled' && attSummaryRes.value) {
          const s = attSummaryRes.value;
          presentDays = Number(s.presentCount ?? 0);
          totalWorkDays = Number(s.totalWorkDays ?? 22) || 22;
          lateCount = Number(s.lateCount ?? 0);
        }

        // คำนวณชั่วโมงทำงานล่วงเวลา (OT) จากประวัติลงเวลารายวัน (เกิน 8 ชม./วัน)
        if (attHistoryRes.status === 'fulfilled' && Array.isArray(attHistoryRes.value)) {
          let extraMinutes = 0;
          attHistoryRes.value.forEach((rec) => {
            if (rec.workedMinutes && rec.workedMinutes > 480) {
              extraMinutes += rec.workedMinutes - 480;
            }
          });
          otHours = Math.round((extraMinutes / 60) * 10) / 10;
        }

        // 2. สิทธิ์ลาพักร้อนและลาป่วยคงเหลือ
        let vacUsed = 0;
        let vacQuota = 6;
        let sickUsed = 0;
        let sickQuota = 30;

        if (leaveSummaryRes.status === 'fulfilled' && leaveSummaryRes.value) {
          const ls = leaveSummaryRes.value;
          vacUsed = Number(ls.annualLeave?.usedDays ?? 0);
          vacQuota = Number(ls.annualLeave?.quotaDays ?? 6);
          sickUsed = Number(ls.sickLeave?.usedDays ?? 0);
          sickQuota = Number(ls.sickLeave?.quotaDays ?? 30);
        } else if (
          leaveBalancesRes.status === 'fulfilled' &&
          Array.isArray(leaveBalancesRes.value) &&
          leaveBalancesRes.value.length > 0
        ) {
          leaveBalancesRes.value.forEach((b: LeaveBalance) => {
            const code = (b.leaveTypeCode || '').toUpperCase();
            const name = b.leaveTypeName || '';
            const used = Number(b.usedDays) || 0;
            const quota = Number(b.annualQuotaDays) || 0;

            if (code.includes('ANNUAL') || code.includes('VACATION') || name.includes('พักร้อน')) {
              vacUsed = used;
              if (quota > 0) vacQuota = quota;
            } else if (code.includes('SICK') || name.includes('ป่วย')) {
              sickUsed = used;
              if (quota > 0) sickQuota = quota;
            }
          });
        }

        const vacationRemaining = Math.max(0, Math.round((vacQuota - vacUsed) * 10) / 10);
        const sickRemaining = Math.max(0, Math.round((sickQuota - sickUsed) * 10) / 10);

        // 3. เอกสารของฉันที่รออนุมัติ (ใบลา + หนังสือรับรอง + ปรับปรุงเวลา)
        let pendingCount = 0;
        if (myLeavesRes.status === 'fulfilled' && Array.isArray(myLeavesRes.value)) {
          pendingCount += myLeavesRes.value.filter(
            (r) => (r.status || '').toUpperCase() === 'PENDING'
          ).length;
        }
        if (myCertsRes.status === 'fulfilled' && Array.isArray(myCertsRes.value)) {
          pendingCount += myCertsRes.value.filter(
            (c) => (c.status || '').toUpperCase() === 'PENDING'
          ).length;
        }
        if (
          myAdjustmentsRes.status === 'fulfilled' &&
          myAdjustmentsRes.value &&
          Array.isArray(myAdjustmentsRes.value.items)
        ) {
          pendingCount += myAdjustmentsRes.value.items.filter(
            (a) => (a.status || '').toUpperCase() === 'PENDING'
          ).length;
        }

        if (isMounted) {
          setStats({
            presentDays,
            totalWorkDays,
            lateCount,
            otHours,
            vacationRemaining,
            vacationQuota: vacQuota,
            sickRemaining,
            sickQuota,
            pendingRequestsCount: pendingCount,
          });
        }
      } catch (err) {
        console.error('Failed to load employee dashboard stats:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchEmployeeStats();

    return () => {
      isMounted = false;
    };
  }, [user?.employeeId]);

  const show = (val: string | number) => (loading ? '–' : val);

  const cards = [
    {
      title: 'มาทำงานเดือนนี้',
      value: `${show(stats.presentDays)}/${show(stats.totalWorkDays)}`,
      unit: 'วัน',
      bgClass: 'bg-[#FEF6D8]',
      borderClass: 'border-[#F6E5A6]',
    },
    {
      title: 'มาสายเดือนนี้',
      value: show(stats.lateCount),
      unit: 'ครั้ง',
      bgClass: 'bg-[#FDE2E4]',
      borderClass: 'border-[#F9C3C8]',
    },
    {
      title: 'ชั่วโมง OT เดือนนี้',
      value: show(stats.otHours),
      unit: 'ชม.',
      bgClass: 'bg-[#D8F3DC]',
      borderClass: 'border-[#B7E4C7]',
    },
    {
      title: 'สิทธิ์ลาพักร้อนคงเหลือ',
      value: `${show(stats.vacationRemaining)}/${show(stats.vacationQuota)}`,
      unit: 'วัน',
      bgClass: 'bg-[#D9EAFD]',
      borderClass: 'border-[#BFDBFE]',
    },
    {
      title: 'สิทธิ์ลาป่วยคงเหลือ',
      value: `${show(stats.sickRemaining)}/${show(stats.sickQuota)}`,
      unit: 'วัน',
      bgClass: 'bg-[#D7F9D9]',
      borderClass: 'border-[#BCE7BF]',
    },
    {
      title: 'เอกสารของฉันรออนุมัติ',
      value: show(stats.pendingRequestsCount),
      unit: 'รายการ',
      bgClass: 'bg-[#FFE5D9]',
      borderClass: 'border-[#FCD2BE]',
    },
  ];

  return (
    <div
      data-stat-card
      className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 h-full auto-rows-fr"
    >
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`${card.bgClass} border ${card.borderClass} rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-xs min-h-[90px] h-full transition-all`}
        >
          <span className="text-[11px] sm:text-xs font-bold text-slate-700 leading-snug">
            {card.title}
          </span>
          <div className="flex items-baseline justify-center gap-1 sm:gap-1.5 my-1">
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {card.value}
            </span>
            {card.unit && (
              <span className="text-[11px] sm:text-xs font-semibold text-slate-600">
                {card.unit}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};


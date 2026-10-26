'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { leaveService } from '@/services/leaveService';
import { essAttendanceService } from '@/services/essAttendanceService';
import { certificateService } from '@/services/certificateService';
import { LeaveBalance } from '@/types/leave';

interface EmployeeDashboardStats {
  vacationRemaining: number;
  vacationQuota: number;
  sickRemaining: number;
  sickQuota: number;
  businessRemaining: number;
  businessQuota: number;
  specialRemaining: number;
  specialQuota: number;
  totalLeaveUsed: number;
  pendingRequestsCount: number;
}

const INITIAL_STATS: EmployeeDashboardStats = {
  vacationRemaining: 6,
  vacationQuota: 6,
  sickRemaining: 30,
  sickQuota: 30,
  businessRemaining: 3,
  businessQuota: 3,
  specialRemaining: 10,
  specialQuota: 10,
  totalLeaveUsed: 0,
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
      const currentYear = new Date().getFullYear();

      try {
        const [
          leaveSummaryRes,
          leaveBalancesRes,
          myLeavesRes,
          myCertsRes,
          myAdjustmentsRes,
        ] = await Promise.allSettled([
          leaveService.getMyLeaveSummary({ year: currentYear, employeeId: user?.employeeId }),
          leaveService.getLeaveBalances({ employeeId: user?.employeeId, year: currentYear }),
          leaveService.getMyLeaveRequests({ pageSize: 100 }),
          certificateService.getMyRequests(),
          essAttendanceService.getMyAdjustments(1, 50),
        ]);

        let vacUsed = 0, vacQuota = 6;
        let sickUsed = 0, sickQuota = 30;
        let bizUsed = 0, bizQuota = 3;
        let specUsed = 0, specQuota = 10;
        let totalUsed = 0;

        if (leaveSummaryRes.status === 'fulfilled' && leaveSummaryRes.value) {
          const ls = leaveSummaryRes.value;
          vacUsed = Number(ls.annualLeave?.usedDays ?? 0);
          vacQuota = Number(ls.annualLeave?.quotaDays ?? 6);
          sickUsed = Number(ls.sickLeave?.usedDays ?? 0);
          sickQuota = Number(ls.sickLeave?.quotaDays ?? 30);
          bizUsed = Number(ls.personalLeave?.usedDays ?? 0);
          bizQuota = Number(ls.personalLeave?.quotaDays ?? 3);
          specUsed = Number(ls.specialLeave?.usedDays ?? 0);
          specQuota = Number(ls.specialLeave?.quotaDays ?? 10);

          if (Array.isArray(ls.allBalances) && ls.allBalances.length > 0) {
            totalUsed = ls.allBalances.reduce((acc, b) => acc + (Number(b.usedDays) || 0), 0);
          } else {
            totalUsed = vacUsed + sickUsed + bizUsed + specUsed;
          }
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
            totalUsed += used;

            if (code.includes('ANNUAL') || code.includes('VACATION') || name.includes('พักร้อน')) {
              vacUsed = used;
              if (quota > 0) vacQuota = quota;
            } else if (code.includes('SICK') || name.includes('ป่วย')) {
              sickUsed = used;
              if (quota > 0) sickQuota = quota;
            } else if (code.includes('PERSONAL') || code.includes('BUSINESS') || name.includes('กิจ')) {
              bizUsed = used;
              if (quota > 0) bizQuota = quota;
            } else if (code.includes('SPECIAL') || code.includes('TRAVEL') || name.includes('พิเศษ')) {
              specUsed = used;
              if (quota > 0) specQuota = quota;
            }
          });
        }

        // เอกสารของฉันที่รออนุมัติ (ใบลา + หนังสือรับรอง + ปรับปรุงเวลา)
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
            vacationRemaining: Math.max(0, Math.round((vacQuota - vacUsed) * 10) / 10),
            vacationQuota: vacQuota,
            sickRemaining: Math.max(0, Math.round((sickQuota - sickUsed) * 10) / 10),
            sickQuota,
            businessRemaining: Math.max(0, Math.round((bizQuota - bizUsed) * 10) / 10),
            businessQuota: bizQuota,
            specialRemaining: Math.max(0, Math.round((specQuota - specUsed) * 10) / 10),
            specialQuota: specQuota,
            totalLeaveUsed: Math.round(totalUsed * 10) / 10,
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
      title: 'สิทธิ์ลาพักร้อนคงเหลือ',
      value: `${show(stats.vacationRemaining)}/${show(stats.vacationQuota)}`,
      unit: 'วัน',
      bgClass: 'bg-[#FEF6D8]',
      borderClass: 'border-[#F6E5A6]',
    },
    {
      title: 'สิทธิ์ลาป่วยคงเหลือ',
      value: `${show(stats.sickRemaining)}/${show(stats.sickQuota)}`,
      unit: 'วัน',
      bgClass: 'bg-[#FDE2E4]',
      borderClass: 'border-[#F9C3C8]',
    },
    {
      title: 'สิทธิ์ลากิจคงเหลือ',
      value: `${show(stats.businessRemaining)}/${show(stats.businessQuota)}`,
      unit: 'วัน',
      bgClass: 'bg-[#D8F3DC]',
      borderClass: 'border-[#B7E4C7]',
    },
    {
      title: 'สิทธิ์ลาพิเศษคงเหลือ',
      value: `${show(stats.specialRemaining)}/${show(stats.specialQuota)}`,
      unit: 'วัน',
      bgClass: 'bg-[#D9EAFD]',
      borderClass: 'border-[#BFDBFE]',
    },
    {
      title: 'วันลาที่ใช้ไปปีนี้',
      value: show(stats.totalLeaveUsed),
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



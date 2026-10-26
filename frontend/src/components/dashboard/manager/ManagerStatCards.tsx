'use client';

import React, { useEffect, useState } from 'react';
import { DashboardRole } from '../DashboardHeader';
import { useAuth } from '@/context/AuthContext';
import { reportService } from '@/services/reportService';
import { leaveService } from '@/services/leaveService';
import { employeeService } from '@/services/employeeService';
import { contractService } from '@/services/contractService';
import { certificateService } from '@/services/certificateService';
import { salaryService } from '@/services/salaryService';
import { commissionService } from '@/services/commissionService';
import { attendanceService } from '@/services/attendanceService';
import { DailyHeadcountSummary } from '@/types/reports';
import { LeaveRequest, LeaveStats } from '@/types/leave';

interface ManagerStatCardsProps {
  role: DashboardRole;
}

interface StatConfig {
  title: string;
  value: string | number;
  unit: string;
  bgClass: string;
  borderClass: string;
}

function formatCompactCurrency(amount: number): string {
  if (!amount || amount <= 0) return '0';
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(2).replace(/\.00$/, '')}M`;
  }
  if (amount >= 10_000) {
    return `${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return amount.toLocaleString('th-TH');
}

export const ManagerStatCards: React.FC<ManagerStatCardsProps> = ({ role }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    headcount: 0,
    present: 0,
    onLeave: 0,
    lateOrAbsent: 0,
    attendanceRate: 0,
    pendingDocs: 0,
    submittedToday: 0,
    otHoursMonth: 0,
    probationExpiring7Days: 0,
    contractExpiring30Days: 0,
    latestPayrollStatus: 'รอคำนวณ',
    latestPayrollTotal: 0,
    commissionAndOtTotal: 0,
    joinedThisMonth: 0,
    resignedThisMonth: 0,
  });

  useEffect(() => {
    let isMounted = true;

    const loadRealData = async () => {
      setLoading(true);
      try {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;
        const todayStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        // ดึงข้อมูลจริงจาก backend พร้อมกัน
        const [
          headcountRes,
          leaveStatsRes,
          leaveRequestsRes,
          empProfileRes,
          contractStatsRes,
          activeContractsRes,
          certRequestsRes,
          payrollOverviewRes,
          payrollPeriodsRes,
          commissionRes,
          turnoverRes,
          monthlyAttRes,
        ] = await Promise.allSettled([
          reportService.getDailyHeadcount(),
          leaveService.getLeaveStats(),
          leaveService.getLeaveRequests({ pageSize: 100 }),
          user?.employeeId ? employeeService.getById(user.employeeId) : Promise.resolve(null),
          contractService.getStats(),
          contractService.getAll({ status: 'ACTIVE' }),
          certificateService.getAllRequests('PENDING'),
          salaryService.getOverview(),
          salaryService.getPayrollPeriods(),
          commissionService.getCommissionPeriod(currentYear, currentMonth),
          reportService.getMonthlyTurnover(currentYear, currentMonth),
          attendanceService.getMonthlyAttendanceSummary(currentYear, currentMonth),
        ]);

        const headcount: DailyHeadcountSummary | null =
          headcountRes.status === 'fulfilled' ? headcountRes.value : null;
        const leaveStats: LeaveStats | null =
          leaveStatsRes.status === 'fulfilled' ? leaveStatsRes.value : null;
        const allRequests: LeaveRequest[] =
          leaveRequestsRes.status === 'fulfilled' && Array.isArray(leaveRequestsRes.value)
            ? leaveRequestsRes.value
            : [];
        const empProfile =
          empProfileRes.status === 'fulfilled' ? empProfileRes.value : null;
        const contractStats =
          contractStatsRes.status === 'fulfilled' ? contractStatsRes.value : null;
        const activeContracts =
          activeContractsRes.status === 'fulfilled' && Array.isArray(activeContractsRes.value)
            ? activeContractsRes.value
            : [];
        const pendingCerts =
          certRequestsRes.status === 'fulfilled' && Array.isArray(certRequestsRes.value)
            ? certRequestsRes.value
            : [];
        const payrollOverview =
          payrollOverviewRes.status === 'fulfilled' ? payrollOverviewRes.value : null;
        const payrollPeriods =
          payrollPeriodsRes.status === 'fulfilled' && Array.isArray(payrollPeriodsRes.value)
            ? payrollPeriodsRes.value
            : [];
        const commissionSummary =
          commissionRes.status === 'fulfilled' ? commissionRes.value : null;
        const turnoverSummary =
          turnoverRes.status === 'fulfilled' ? turnoverRes.value : null;
        const monthlyAtt =
          monthlyAttRes.status === 'fulfilled' ? monthlyAttRes.value : null;

        const userDeptName = empProfile?.departmentName || '';
        const userDivName = empProfile?.divisionName || '';

        // กรองคำร้องขอลาวันนี้
        const activeLeavesToday = allRequests.filter((r) => {
          if (r.status !== 'APPROVED') return false;
          const start = r.startDatetime ? r.startDatetime.substring(0, 10) : '';
          const end = r.endDatetime ? r.endDatetime.substring(0, 10) : '';
          return todayStr >= start && todayStr <= end;
        });

        const submittedTodayRequests = allRequests.filter((r) => {
          const subDate = (r.submittedAt || (r as any).createdAt || '').substring(0, 10);
          return subDate === todayStr;
        });

        const pendingRequests = allRequests.filter((r) => r.status === 'PENDING');

        // สัญญาจ้างใกล้หมดใน 30 วัน & ทดลองงานใกล้ครบใน 7 วัน
        const in30Days = new Date();
        in30Days.setDate(today.getDate() + 30);
        const in7Days = new Date();
        in7Days.setDate(today.getDate() + 7);

        let targetHeadcount = 0;
        let targetPresent = 0;
        let targetOnLeave = 0;
        let targetLateOrAbsent = 0;
        let targetAttendanceRate = 0;
        let targetPendingDocs = 0;
        let targetSubmittedToday = 0;
        let targetOtHours = 0;
        let targetProbation7Days = contractStats?.probationExpiring7DaysCount ?? 0;

        const expiringContracts30 = activeContracts.filter((c) => {
          if (!c.contractEndDate) return false;
          const end = new Date(c.contractEndDate);
          return end >= today && end <= in30Days;
        });

        if (role === 'DEPT_MGR') {
          const dept =
            headcount?.departments?.find(
              (d) =>
                (userDeptName && d.departmentName.includes(userDeptName)) ||
                d.departmentCode === 'DEPT_SW' ||
                d.totalHeadcount > 0
            ) || headcount?.departments?.[0];

          targetHeadcount = dept?.totalHeadcount ?? 0;
          targetPresent = dept?.presentCount ?? 0;
          targetLateOrAbsent = (dept?.lateCount ?? 0) + (dept?.absentCount ?? 0);

          const deptLeaveToday = activeLeavesToday.filter(
            (r) => !dept || r.departmentName?.includes(dept.departmentName)
          );
          targetOnLeave = dept?.leaveCount ?? deptLeaveToday.length;

          const deptPending = pendingRequests.filter(
            (r) => !dept || r.departmentName?.includes(dept.departmentName)
          );
          targetPendingDocs = deptPending.length;

          const deptSubToday = submittedTodayRequests.filter(
            (r) => !dept || r.departmentName?.includes(dept.departmentName)
          );
          targetSubmittedToday = deptSubToday.length;

          // ลูกทีมใกล้พ้นทดลองงานในแผนก
          const deptProbation = activeContracts.filter((c) => {
            if (!c.probationEndDate) return false;
            if (dept && c.departmentName && !c.departmentName.includes(dept.departmentName)) {
              return false;
            }
            const pEnd = new Date(c.probationEndDate);
            return pEnd >= today && pEnd <= in7Days;
          });
          targetProbation7Days = deptProbation.length;

          // คำนวณชั่วโมงทำงานพิเศษ/จำนวนวันทำงานของแผนก
          if (monthlyAtt && Array.isArray(monthlyAtt.employees)) {
            const deptEmps = monthlyAtt.employees.filter(
              (e) => !dept || e.departmentName?.includes(dept.departmentName)
            );
            targetOtHours = deptEmps.reduce((sum, e) => sum + (e.actualWorkDays || 0), 0);
          }
        } else if (role === 'DIV_MGR') {
          const divDepts = (headcount?.departments || []).filter(
            (d) =>
              !userDivName ||
              d.divisionName.includes(userDivName) ||
              d.divisionName.includes('เทคโนโลยี')
          );

          targetHeadcount =
            divDepts.reduce((acc, d) => acc + d.totalHeadcount, 0) ||
            headcount?.totalEmployees ||
            0;
          targetPresent =
            divDepts.reduce((acc, d) => acc + d.presentCount, 0) ||
            headcount?.totalPresent ||
            0;
          targetLateOrAbsent = divDepts.reduce(
            (acc, d) => acc + (d.lateCount || 0) + (d.absentCount || 0),
            0
          );

          const divDeptNames = divDepts.map((d) => d.departmentName);
          const divLeaveToday = activeLeavesToday.filter(
            (r) =>
              divDeptNames.length === 0 ||
              divDeptNames.some((dn) => r.departmentName?.includes(dn))
          );
          targetOnLeave = divLeaveToday.length;

          const divPending = pendingRequests.filter(
            (r) =>
              divDeptNames.length === 0 ||
              divDeptNames.some((dn) => r.departmentName?.includes(dn))
          );
          targetPendingDocs = divPending.length;

          const divSubToday = submittedTodayRequests.filter(
            (r) =>
              divDeptNames.length === 0 ||
              divDeptNames.some((dn) => r.departmentName?.includes(dn))
          );
          targetSubmittedToday = divSubToday.length;
        } else {
          // ระดับองค์กร (ADMIN / CEO)
          targetHeadcount = headcount?.totalEmployees ?? 0;
          targetPresent = headcount?.totalPresent ?? 0;
          targetOnLeave = headcount?.totalLeave ?? activeLeavesToday.length;
          targetLateOrAbsent = (headcount?.totalLate ?? 0) + (headcount?.totalAbsent ?? 0);
          targetAttendanceRate =
            headcount?.overallAttendanceRate ??
            (targetHeadcount > 0
              ? Math.round((targetPresent / targetHeadcount) * 1000) / 10
              : 0);
          targetPendingDocs =
            (leaveStats?.pendingRequestsCount ?? pendingRequests.length) +
            pendingCerts.length;
          targetSubmittedToday = submittedTodayRequests.length;
        }

        // ข้อมูลงวดเงินเดือนล่าสุด & คอมมิชชั่น (สำหรับ ADMIN / CEO)
        const latestPeriod = payrollPeriods[0];
        let latestStatusLabel = 'ยังไม่มีงวด';
        let latestPayrollTotal = payrollOverview?.currentMonthTotal ?? 0;

        if (latestPeriod) {
          if (latestPeriod.totalNetSalary > 0) {
            latestPayrollTotal = latestPeriod.totalNetSalary;
          }
          const st = (latestPeriod.status || '').toUpperCase();
          if (st === 'PAID' || st === 'CLOSED') latestStatusLabel = 'จ่ายแล้ว';
          else if (st === 'APPROVED') latestStatusLabel = 'อนุมัติแล้ว';
          else if (st === 'DRAFT' || st === 'REVIEW') latestStatusLabel = 'รอปิดงวด';
          else latestStatusLabel = latestPeriod.statusText || latestPeriod.status;
        }

        const totalComm =
          commissionSummary?.totalCommissionAmount ??
          commissionSummary?.totalCommission ??
          0;

        const joinedCount = turnoverSummary?.totalJoinedCount ?? 0;
        const resignedCount = turnoverSummary?.totalResignedCount ?? 0;

        if (isMounted) {
          setStatsData({
            headcount: targetHeadcount,
            present: targetPresent,
            onLeave: targetOnLeave,
            lateOrAbsent: targetLateOrAbsent,
            attendanceRate: targetAttendanceRate,
            pendingDocs: targetPendingDocs,
            submittedToday: targetSubmittedToday,
            otHoursMonth: targetOtHours,
            probationExpiring7Days: targetProbation7Days,
            contractExpiring30Days: expiringContracts30.length,
            latestPayrollStatus: latestStatusLabel,
            latestPayrollTotal,
            commissionAndOtTotal: totalComm,
            joinedThisMonth: joinedCount,
            resignedThisMonth: resignedCount,
          });
        }
      } catch (err) {
        console.error('Failed to load manager dashboard stats:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRealData();

    return () => {
      isMounted = false;
    };
  }, [role, user?.employeeId]);

  const show = (val: string | number) => (loading ? '–' : val);

  const getCardsConfig = (): StatConfig[] => {
    switch (role) {
      case 'DEPT_MGR':
        return [
          {
            title: 'พนักงานในแผนกมาวันนี้',
            value: `${show(statsData.present)}/${show(statsData.headcount)}`,
            unit: 'คน',
            bgClass: 'bg-[#FEF6D8]',
            borderClass: 'border-[#F6E5A6]',
          },
          {
            title: 'คนในแผนกลาวันนี้',
            value: show(statsData.onLeave),
            unit: 'คน',
            bgClass: 'bg-[#FDE2E4]',
            borderClass: 'border-[#F9C3C8]',
          },
          {
            title: 'มาสาย / ขาดงานวันนี้',
            value: show(statsData.lateOrAbsent),
            unit: 'คน',
            bgClass: 'bg-[#D8F3DC]',
            borderClass: 'border-[#B7E4C7]',
          },
          {
            title: 'ใบลาในแผนกรออนุมัติ',
            value: show(statsData.pendingDocs),
            unit: 'เอกสาร',
            bgClass: 'bg-[#D9EAFD]',
            borderClass: 'border-[#BFDBFE]',
          },
          {
            title: 'เอกสารยื่นใหม่วันนี้',
            value: show(statsData.submittedToday),
            unit: 'เอกสาร',
            bgClass: 'bg-[#D7F9D9]',
            borderClass: 'border-[#BCE7BF]',
          },
          {
            title: 'ลูกทีมใกล้พ้นทดลองงาน',
            value: show(statsData.probationExpiring7Days),
            unit: 'คน',
            bgClass: 'bg-[#FFE5D9]',
            borderClass: 'border-[#FCD2BE]',
          },
        ];

      case 'DIV_MGR':
        return [
          {
            title: 'พนักงานในฝ่ายมาวันนี้',
            value: `${show(statsData.present)}/${show(statsData.headcount)}`,
            unit: 'คน',
            bgClass: 'bg-[#FEF6D8]',
            borderClass: 'border-[#F6E5A6]',
          },
          {
            title: 'คนในฝ่ายลาวันนี้',
            value: show(statsData.onLeave),
            unit: 'คน',
            bgClass: 'bg-[#FDE2E4]',
            borderClass: 'border-[#F9C3C8]',
          },
          {
            title: 'มาสาย / ขาดงานวันนี้',
            value: show(statsData.lateOrAbsent),
            unit: 'คน',
            bgClass: 'bg-[#D8F3DC]',
            borderClass: 'border-[#B7E4C7]',
          },
          {
            title: 'ใบลาในฝ่ายรออนุมัติ',
            value: show(statsData.pendingDocs),
            unit: 'เอกสาร',
            bgClass: 'bg-[#D9EAFD]',
            borderClass: 'border-[#BFDBFE]',
          },
          {
            title: 'เอกสารยื่นใหม่วันนี้',
            value: show(statsData.submittedToday),
            unit: 'เอกสาร',
            bgClass: 'bg-[#D7F9D9]',
            borderClass: 'border-[#BCE7BF]',
          },
          {
            title: 'ใกล้ครบกำหนดทดลองงาน',
            value: show(statsData.probationExpiring7Days),
            unit: 'คน',
            bgClass: 'bg-[#FFE5D9]',
            borderClass: 'border-[#FCD2BE]',
          },
        ];

      case 'CEO':
        return [
          {
            title: 'พนักงานทั้งหมดในองค์กร',
            value: show(statsData.headcount),
            unit: 'คน',
            bgClass: 'bg-[#FEF6D8]',
            borderClass: 'border-[#F6E5A6]',
          },
          {
            title: 'อัตราการมาทำงานวันนี้',
            value: show(statsData.attendanceRate),
            unit: '%',
            bgClass: 'bg-[#FDE2E4]',
            borderClass: 'border-[#F9C3C8]',
          },
          {
            title: 'ยอดเงินเดือนงวดล่าสุด',
            value: loading ? '–' : formatCompactCurrency(statsData.latestPayrollTotal),
            unit: 'บาท',
            bgClass: 'bg-[#D8F3DC]',
            borderClass: 'border-[#B7E4C7]',
          },
          {
            title: 'ยอดคอมมิชชั่นเดือนนี้',
            value: loading ? '–' : formatCompactCurrency(statsData.commissionAndOtTotal),
            unit: 'บาท',
            bgClass: 'bg-[#D9EAFD]',
            borderClass: 'border-[#BFDBFE]',
          },
          {
            title: 'เข้าใหม่ / ลาออกเดือนนี้',
            value: loading
              ? '–'
              : `+${statsData.joinedThisMonth} / -${statsData.resignedThisMonth}`,
            unit: 'คน',
            bgClass: 'bg-[#D7F9D9]',
            borderClass: 'border-[#BCE7BF]',
          },
          {
            title: 'เอกสารรออนุมัติทั้งหมด',
            value: show(statsData.pendingDocs),
            unit: 'เอกสาร',
            bgClass: 'bg-[#FFE5D9]',
            borderClass: 'border-[#FCD2BE]',
          },
        ];

      case 'ADMIN':
      default:
        return [
          {
            title: 'พนักงานมาทำงานวันนี้',
            value: `${show(statsData.present)}/${show(statsData.headcount)}`,
            unit: 'คน',
            bgClass: 'bg-[#FEF6D8]',
            borderClass: 'border-[#F6E5A6]',
          },
          {
            title: 'พนักงานลา / มาสายวันนี้',
            value: show(statsData.onLeave + statsData.lateOrAbsent),
            unit: 'คน',
            bgClass: 'bg-[#FDE2E4]',
            borderClass: 'border-[#F9C3C8]',
          },
          {
            title: 'ใบลาและรับรองรออนุมัติ',
            value: show(statsData.pendingDocs),
            unit: 'เอกสาร',
            bgClass: 'bg-[#D8F3DC]',
            borderClass: 'border-[#B7E4C7]',
          },
          {
            title: 'สัญญาจ้างใกล้หมด (30 วัน)',
            value: show(statsData.contractExpiring30Days),
            unit: 'สัญญา',
            bgClass: 'bg-[#D9EAFD]',
            borderClass: 'border-[#BFDBFE]',
          },
          {
            title: 'ครบกำหนดทดลองงาน (7 วัน)',
            value: show(statsData.probationExpiring7Days),
            unit: 'คน',
            bgClass: 'bg-[#D7F9D9]',
            borderClass: 'border-[#BCE7BF]',
          },
          {
            title: 'สถานะงวดเงินเดือนล่าสุด',
            value: show(statsData.latestPayrollStatus),
            unit: '',
            bgClass: 'bg-[#FFE5D9]',
            borderClass: 'border-[#FCD2BE]',
          },
        ];
    }
  };

  const cards = getCardsConfig();

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


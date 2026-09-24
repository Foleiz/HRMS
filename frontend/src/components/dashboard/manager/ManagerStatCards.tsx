'use client';

import React, { useEffect, useState } from 'react';
import { DashboardRole } from '../DashboardHeader';
import { useAuth } from '@/context/AuthContext';
import { reportService } from '@/services/reportService';
import { leaveService } from '@/services/leaveService';
import { employeeService } from '@/services/employeeService';
import { DailyHeadcountSummary } from '@/types/reports';
import { LeaveRequest, LeaveStats } from '@/types/leave';

interface ManagerStatCardsProps {
  role: DashboardRole;
}

interface StatConfig {
  title: string;
  value: number;
  unit: string;
  bgClass: string;
  borderClass: string;
}

export const ManagerStatCards: React.FC<ManagerStatCardsProps> = ({ role }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    headcount: 0,
    present: 0,
    onLeave: 0,
    pending: 0,
    submittedToday: 0,
    approved: 0,
  });

  useEffect(() => {
    let isMounted = true;

    const loadRealData = async () => {
      setLoading(true);
      try {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        // 1. ดึงข้อมูลจาก backend พร้อมกัน
        const [headcountRes, leaveStatsRes, leaveRequestsRes, empProfileRes] = await Promise.allSettled([
          reportService.getDailyHeadcount(),
          leaveService.getLeaveStats(),
          leaveService.getLeaveRequests({ pageSize: 100 }),
          user?.employeeId ? employeeService.getById(user.employeeId) : Promise.resolve(null),
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

        // ระบุสังกัดของ User
        const userDeptName = empProfile?.departmentName || '';
        const userDivName = empProfile?.divisionName || '';

        // 2. คำนวณตาม Scope ของแต่ละ Role
        let targetHeadcount = 0;
        let targetPresent = 0;
        let targetOnLeave = 0;
        let targetPending = 0;
        let targetSubmittedToday = 0;
        let targetApproved = 0;

        // กรองคำร้องขอลา
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

        const approvedRequests = allRequests.filter((r) => r.status === 'APPROVED');
        const pendingRequests = allRequests.filter((r) => r.status === 'PENDING');

        if (role === 'DEPT_MGR') {
          // --- ระดับแผนก (Department Head) ---
          const dept = headcount?.departments?.find(
            (d) =>
              (userDeptName && d.departmentName.includes(userDeptName)) ||
              d.departmentCode === 'DEPT_SW' ||
              d.totalHeadcount > 0
          ) || headcount?.departments?.[0];

          targetHeadcount = dept?.totalHeadcount ?? 0;
          targetPresent = dept?.presentCount ?? 0;

          // คำขอลาของแผนก
          const deptLeaveToday = activeLeavesToday.filter(
            (r) => !dept || r.departmentName?.includes(dept.departmentName)
          );
          targetOnLeave = deptLeaveToday.length;

          const deptPending = pendingRequests.filter(
            (r) => !dept || r.departmentName?.includes(dept.departmentName)
          );
          targetPending = deptPending.length;

          const deptSubToday = submittedTodayRequests.filter(
            (r) => !dept || r.departmentName?.includes(dept.departmentName)
          );
          targetSubmittedToday = deptSubToday.length;

          const deptApp = approvedRequests.filter(
            (r) => !dept || r.departmentName?.includes(dept.departmentName)
          );
          targetApproved = deptApp.length;

        } else if (role === 'DIV_MGR') {
          // --- ระดับฝ่าย (Division Head) ---
          const divDepts = (headcount?.departments || []).filter(
            (d) =>
              !userDivName ||
              d.divisionName.includes(userDivName) ||
              d.divisionName.includes('เทคโนโลยี')
          );

          targetHeadcount = divDepts.reduce((acc, d) => acc + d.totalHeadcount, 0) || headcount?.totalEmployees || 0;
          targetPresent = divDepts.reduce((acc, d) => acc + d.presentCount, 0) || headcount?.totalPresent || 0;

          const divDeptNames = divDepts.map((d) => d.departmentName);
          const divLeaveToday = activeLeavesToday.filter(
            (r) => divDeptNames.length === 0 || divDeptNames.some((dn) => r.departmentName?.includes(dn))
          );
          targetOnLeave = divLeaveToday.length;

          const divPending = pendingRequests.filter(
            (r) => divDeptNames.length === 0 || divDeptNames.some((dn) => r.departmentName?.includes(dn))
          );
          targetPending = divPending.length;

          const divSubToday = submittedTodayRequests.filter(
            (r) => divDeptNames.length === 0 || divDeptNames.some((dn) => r.departmentName?.includes(dn))
          );
          targetSubmittedToday = divSubToday.length;

          const divApp = approvedRequests.filter(
            (r) => divDeptNames.length === 0 || divDeptNames.some((dn) => r.departmentName?.includes(dn))
          );
          targetApproved = divApp.length;

        } else {
          // --- ระดับองค์กร (CEO / ADMIN) ---
          targetHeadcount = headcount?.totalEmployees ?? 0;
          targetPresent = headcount?.totalPresent ?? 0;
          targetOnLeave = activeLeavesToday.length;
          targetPending = leaveStats?.pendingRequestsCount ?? pendingRequests.length;
          targetSubmittedToday = submittedTodayRequests.length;
          targetApproved = leaveStats?.approvedThisMonthCount ?? approvedRequests.length;
        }

        if (isMounted) {
          setStatsData({
            headcount: targetHeadcount,
            present: targetPresent,
            onLeave: targetOnLeave,
            pending: targetPending,
            submittedToday: targetSubmittedToday,
            approved: targetApproved,
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

  // กำหนดชื่อหัวข้อและหน่วยตาม Role
  const getCardsConfig = (): StatConfig[] => {
    switch (role) {
      case 'DEPT_MGR':
        return [
          {
            title: 'จำนวนพนักงานในแผนก',
            value: statsData.headcount,
            unit: 'คน',
            bgClass: 'bg-[#FEF6D8]',
            borderClass: 'border-[#F6E5A6]',
          },
          {
            title: 'พนักงานในแผนกที่มาวันนี้',
            value: statsData.present,
            unit: 'คน',
            bgClass: 'bg-[#FDE2E4]',
            borderClass: 'border-[#F9C3C8]',
          },
          {
            title: 'พนักงานที่ลาวันนี้',
            value: statsData.onLeave,
            unit: 'คน',
            bgClass: 'bg-[#D8F3DC]',
            borderClass: 'border-[#B7E4C7]',
          },
          {
            title: 'เอกสารที่รออนุมัติ',
            value: statsData.pending,
            unit: 'เอกสาร',
            bgClass: 'bg-[#D9EAFD]',
            borderClass: 'border-[#BFDBFE]',
          },
          {
            title: 'เอกสารที่พนักงานยื่นวันนี้',
            value: statsData.submittedToday,
            unit: 'เอกสาร',
            bgClass: 'bg-[#D7F9D9]',
            borderClass: 'border-[#BCE7BF]',
          },
          {
            title: 'เอกสารที่อนุมัติแล้ว',
            value: statsData.approved,
            unit: 'เอกสาร',
            bgClass: 'bg-[#FFE5D9]',
            borderClass: 'border-[#FCD2BE]',
          },
        ];

      case 'DIV_MGR':
        return [
          {
            title: 'จำนวนพนักงานในฝ่ายทั้งหมด',
            value: statsData.headcount,
            unit: 'คน',
            bgClass: 'bg-[#FEF6D8]',
            borderClass: 'border-[#F6E5A6]',
          },
          {
            title: 'พนักงานในฝ่ายที่มาวันนี้',
            value: statsData.present,
            unit: 'คน',
            bgClass: 'bg-[#FDE2E4]',
            borderClass: 'border-[#F9C3C8]',
          },
          {
            title: 'พนักงานที่ลาวันนี้',
            value: statsData.onLeave,
            unit: 'คน',
            bgClass: 'bg-[#D8F3DC]',
            borderClass: 'border-[#B7E4C7]',
          },
          {
            title: 'เอกสารที่รออนุมัติ',
            value: statsData.pending,
            unit: 'เอกสาร',
            bgClass: 'bg-[#D9EAFD]',
            borderClass: 'border-[#BFDBFE]',
          },
          {
            title: 'เอกสารที่พนักงานยื่นวันนี้',
            value: statsData.submittedToday,
            unit: 'เอกสาร',
            bgClass: 'bg-[#D7F9D9]',
            borderClass: 'border-[#BCE7BF]',
          },
          {
            title: 'เอกสารที่อนุมัติแล้ว',
            value: statsData.approved,
            unit: 'เอกสาร',
            bgClass: 'bg-[#FFE5D9]',
            borderClass: 'border-[#FCD2BE]',
          },
        ];

      case 'CEO':
      case 'ADMIN':
      default:
        return [
          {
            title: 'จำนวนพนักงานทั้งหมด',
            value: statsData.headcount,
            unit: 'คน',
            bgClass: 'bg-[#FEF6D8]',
            borderClass: 'border-[#F6E5A6]',
          },
          {
            title: 'พนักงานที่มาวันนี้',
            value: statsData.present,
            unit: 'คน',
            bgClass: 'bg-[#FDE2E4]',
            borderClass: 'border-[#F9C3C8]',
          },
          {
            title: 'พนักงานที่ลาวันนี้',
            value: statsData.onLeave,
            unit: 'คน',
            bgClass: 'bg-[#D8F3DC]',
            borderClass: 'border-[#B7E4C7]',
          },
          {
            title: 'เอกสารที่รออนุมัติ',
            value: statsData.pending,
            unit: 'เอกสาร',
            bgClass: 'bg-[#D9EAFD]',
            borderClass: 'border-[#BFDBFE]',
          },
          {
            title: 'เอกสารที่พนักงานยื่นวันนี้',
            value: statsData.submittedToday,
            unit: 'เอกสาร',
            bgClass: 'bg-[#D7F9D9]',
            borderClass: 'border-[#BCE7BF]',
          },
          {
            title: 'เอกสารที่อนุมัติแล้ว',
            value: statsData.approved,
            unit: 'เอกสาร',
            bgClass: 'bg-[#FFE5D9]',
            borderClass: 'border-[#FCD2BE]',
          },
        ];
    }
  };

  const cards = getCardsConfig();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`${card.bgClass} border ${card.borderClass} rounded-2xl p-4 flex flex-col justify-between shadow-xs min-h-[90px] transition-all`}
        >
          <span className="text-xs font-bold text-slate-700">{card.title}</span>
          <div className="flex items-baseline justify-center gap-1.5 my-1">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? '-' : card.value}
            </span>
            <span className="text-xs font-semibold text-slate-600">{card.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

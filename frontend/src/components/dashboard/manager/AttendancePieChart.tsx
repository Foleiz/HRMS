'use client';

import React, { useEffect, useState } from 'react';
import { DashboardRole } from '../DashboardHeader';
import { useAuth } from '@/context/AuthContext';
import { reportService } from '@/services/reportService';
import { leaveService } from '@/services/leaveService';
import { employeeService } from '@/services/employeeService';
import { DailyHeadcountSummary } from '@/types/reports';
import { LeaveRequest } from '@/types/leave';

interface AttendancePieChartProps {
  role: DashboardRole;
}

interface AttendanceSlice {
  label: string;
  count: number;
  color: string;
  percentage: number;
}

export const AttendancePieChart: React.FC<AttendancePieChartProps> = ({ role }) => {
  const { user } = useAuth();
  const [data, setData] = useState<AttendanceSlice[]>([
    { label: 'มาทำงานปกติ', count: 0, color: '#3B82F6', percentage: 0 },
    { label: 'ลางาน/นอกสถานที่', count: 0, color: '#22C55E', percentage: 0 },
    { label: 'มาสาย/ยังไม่ลงเวลา', count: 0, color: '#EAB308', percentage: 0 },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadAttendanceStats = async () => {
      setLoading(true);
      try {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const [headcountRes, leaveRequestsRes, empProfileRes] = await Promise.allSettled([
          reportService.getDailyHeadcount(),
          leaveService.getLeaveRequests({ status: 'APPROVED', pageSize: 100 }),
          user?.employeeId ? employeeService.getById(user.employeeId) : Promise.resolve(null),
        ]);

        const headcount: DailyHeadcountSummary | null =
          headcountRes.status === 'fulfilled' ? headcountRes.value : null;
        const leaves: LeaveRequest[] =
          leaveRequestsRes.status === 'fulfilled' && Array.isArray(leaveRequestsRes.value)
            ? leaveRequestsRes.value
            : [];
        const empProfile =
          empProfileRes.status === 'fulfilled' ? empProfileRes.value : null;

        const userDeptName = empProfile?.departmentName || '';
        const userDivName = empProfile?.divisionName || '';

        // กรองคนที่ลาวันนี้
        const activeLeavesToday = leaves.filter((r) => {
          const start = r.startDatetime ? r.startDatetime.substring(0, 10) : '';
          const end = r.endDatetime ? r.endDatetime.substring(0, 10) : '';
          return todayStr >= start && todayStr <= end;
        });

        let present = 0;
        let onLeave = 0;
        let lateOrAbsent = 0;
        let total = 0;

        if (role === 'DEPT_MGR') {
          // ระดับแผนก
          const dept = headcount?.departments?.find(
            (d) =>
              (userDeptName && d.departmentName.includes(userDeptName)) ||
              d.departmentCode === 'DEPT_SW' ||
              d.totalHeadcount > 0
          ) || headcount?.departments?.[0];

          total = dept?.totalHeadcount ?? 0;
          present = dept?.presentCount ?? 0;
          const deptLeaves = activeLeavesToday.filter(
            (r) => !dept || r.departmentName?.includes(dept.departmentName)
          );
          onLeave = deptLeaves.length;
          lateOrAbsent = Math.max(0, total - present - onLeave);

        } else if (role === 'DIV_MGR') {
          // ระดับฝ่าย
          const divDepts = (headcount?.departments || []).filter(
            (d) =>
              !userDivName ||
              d.divisionName.includes(userDivName) ||
              d.divisionName.includes('เทคโนโลยี')
          );
          total = divDepts.reduce((acc, d) => acc + d.totalHeadcount, 0) || headcount?.totalEmployees || 0;
          present = divDepts.reduce((acc, d) => acc + d.presentCount, 0) || headcount?.totalPresent || 0;
          const divDeptNames = divDepts.map((d) => d.departmentName);
          const divLeaves = activeLeavesToday.filter(
            (r) => divDeptNames.length === 0 || divDeptNames.some((dn) => r.departmentName?.includes(dn))
          );
          onLeave = divLeaves.length;
          lateOrAbsent = Math.max(0, total - present - onLeave);

        } else {
          // ระดับองค์กร (CEO / ADMIN)
          total = headcount?.totalEmployees ?? 0;
          present = headcount?.totalPresent ?? 0;
          onLeave = activeLeavesToday.length;
          lateOrAbsent = Math.max(0, total - present - onLeave);
        }

        const denom = total > 0 ? total : (present + onLeave + lateOrAbsent || 1);
        const pPct = Math.round((present / denom) * 1000) / 10;
        const lPct = Math.round((onLeave / denom) * 1000) / 10;
        const aPct = Math.max(0, Math.round((100 - pPct - lPct) * 10) / 10);

        if (isMounted) {
          setData([
            { label: 'มาทำงานปกติ', count: present, color: '#3B82F6', percentage: pPct },
            { label: 'ลางาน/นอกสถานที่', count: onLeave, color: '#22C55E', percentage: lPct },
            { label: 'มาสาย/ยังไม่ลงเวลา', count: lateOrAbsent, color: '#EAB308', percentage: aPct },
          ]);
        }
      } catch (err) {
        console.error('Failed to load attendance pie chart data:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadAttendanceStats();

    return () => {
      isMounted = false;
    };
  }, [role, user?.employeeId]);

  const total = data.reduce((acc, curr) => acc + curr.count, 0) || 1;

  // วาด SVG Pie Chart โดยคำนวณ Path coordinates
  let cumulativeAngle = 0;
  const radius = 64;
  const centerX = 80;
  const centerY = 80;

  const slices = data
    .map((item) => {
      const fraction = item.count / total;
      if (fraction <= 0) return null;

      const startAngle = cumulativeAngle;
      const angle = fraction * 2 * Math.PI;
      const endAngle = startAngle + angle;
      cumulativeAngle = endAngle;

      // SVG arc path
      const x1 = centerX + radius * Math.cos(startAngle - Math.PI / 2);
      const y1 = centerY + radius * Math.sin(startAngle - Math.PI / 2);
      const x2 = centerX + radius * Math.cos(endAngle - Math.PI / 2);
      const y2 = centerY + radius * Math.sin(endAngle - Math.PI / 2);

      const largeArcFlag = angle > Math.PI ? 1 : 0;
      const pathData =
        fraction >= 0.999
          ? `M ${centerX} ${centerY - radius} A ${radius} ${radius} 0 1 1 ${centerX - 0.01} ${centerY - radius} Z`
          : `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

      return {
        ...item,
        pathData,
      };
    })
    .filter(Boolean);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col items-center justify-between flex-1 h-full min-h-[220px]">
      <div className="w-full text-left shrink-0">
        <h4 className="text-xs font-bold text-slate-800">
          สถานะการเข้าทำงานวันนี้
        </h4>
      </div>

      {/* SVG Pie Chart */}
      <div className="my-auto py-3 relative flex items-center justify-center">
        {loading ? (
          <div className="w-32 h-32 rounded-full border-4 border-slate-100 border-t-[#0B2046] animate-spin" />
        ) : slices.length === 0 ? (
          <div className="w-32 h-32 rounded-full border-4 border-slate-200 flex items-center justify-center text-[10px] text-slate-400 text-center px-2">
            ยังไม่มีข้อมูลลงเวลา
          </div>
        ) : (
          <svg width="160" height="160" viewBox="0 0 160 160" className="transform -rotate-90">
            {slices.map((s, idx) => (
              <path
                key={idx}
                d={s!.pathData}
                fill={s!.color}
                className="transition-all hover:opacity-90 hover:scale-105 origin-center cursor-pointer"
              >
                <title>{`${s!.label}: ${s!.count} คน (${s!.percentage}%)`}</title>
              </path>
            ))}
          </svg>
        )}
      </div>

      {/* Color Legend */}
      <div className="w-full space-y-1.5 pt-3 border-t border-slate-100 text-[11px] mt-auto shrink-0">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-slate-600">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium">{item.label}</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <span>{loading ? '-' : `${item.count} คน`}</span>
              <span className="text-slate-400 font-normal">
                ({loading ? '-' : `${item.percentage}%`})
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

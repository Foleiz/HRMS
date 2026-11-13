'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  ChevronRight,
  RefreshCw,
  RotateCcw,
  Search,
  Target,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { reportService } from '@/services/reportService';
import { organizationService } from '@/services/organizationService';
import type { Department, Division } from '@/types/organization';
import type { DepartmentEmployees, EmployeesByDepartmentReport, NameCount } from '@/types/reports';
import { ChartCard, DonutChart, HorizontalBarChart, VIZ, toSegments } from './ReportCharts';
import ExportMenu, { ReportExportFormat } from './ExportMenu';
import DepartmentRosterDrawer from './DepartmentRosterDrawer';
import {
  filterDepartmentByQuery,
  getEmployeeTypeBadgeClass,
  getGenderBadgeClass,
  getHeadcountPlanBadge,
} from './departmentReportUtils';
import {
  AvatarName,
  CountBadge,
  RefreshIndicator,
  SegmentedControl,
  TablePagination,
} from '@/components/ui';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useLoadPhase } from '@/hooks/useLoadPhase';
import { useAuth } from '@/context/AuthContext';
import { formatThaiDate, toBuddhistYear } from '@/lib/thaiDate';
import { printReport } from '@/lib/printReport';

type SortMode = 'count_desc' | 'division';
type ViewMode = 'summary' | 'employees';

interface AggregatedSummary {
  totalEmployees: number;
  totalDepartments: number;
  totalHeadcountPlan: number | null;
  maleCount: number;
  femaleCount: number;
  otherGenderCount: number;
  newHiresThisYear: number;
  byEmployeeType: NameCount[];
}

function aggregateFilteredSummary(
  report: EmployeesByDepartmentReport,
  filteredDepartments: DepartmentEmployees[],
  isSearchActive: boolean
): AggregatedSummary {
  if (!isSearchActive) {
    return {
      totalEmployees: report.totalEmployees,
      totalDepartments: report.totalDepartments,
      totalHeadcountPlan: report.totalHeadcountPlan ?? null,
      maleCount: report.maleCount,
      femaleCount: report.femaleCount,
      otherGenderCount: report.otherGenderCount,
      newHiresThisYear: report.newHiresThisYear,
      byEmployeeType: report.byEmployeeType,
    };
  }

  let totalEmployees = 0;
  let maleCount = 0;
  let femaleCount = 0;
  let otherGenderCount = 0;
  let newHiresThisYear = 0;
  let plannedSum = 0;
  let hasAnyPlan = false;
  const typeMap = new Map<string, number>();

  filteredDepartments.forEach((dept) => {
    totalEmployees += dept.employeeCount;
    maleCount += dept.maleCount;
    femaleCount += dept.femaleCount;
    otherGenderCount += dept.otherGenderCount;
    newHiresThisYear += dept.newHiresThisYear;
    if (dept.headcountPlan != null) {
      plannedSum += dept.headcountPlan;
      hasAnyPlan = true;
    }
    dept.byEmployeeType.forEach((item) => {
      typeMap.set(item.name, (typeMap.get(item.name) ?? 0) + item.count);
    });
  });

  const byEmployeeType: NameCount[] = Array.from(typeMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalEmployees,
    totalDepartments: filteredDepartments.length,
    totalHeadcountPlan: hasAnyPlan ? plannedSum : null,
    maleCount,
    femaleCount,
    otherGenderCount,
    newHiresThisYear,
    byEmployeeType,
  };
}

export default function EmployeesByDepartmentTab({
  canExport,
  onError,
}: {
  canExport: boolean;
  onError: (msg: string) => void;
}) {
  const { hasPermission, hasRole } = useAuth();
  const canManagePositions = hasRole('ADMIN') || hasPermission('ORG_POS_VIEW');
  const canViewEmployeeProfile = hasRole('ADMIN') || hasPermission('EMP_PROFILE_VIEW');

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisionId, setDivisionId] = useState<number | 'ALL'>('ALL');
  const [departmentId, setDepartmentId] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [data, setData] = useState<EmployeesByDepartmentReport | null>(null);
  const [loading, setLoading] = useState(false);
  const { initialLoading, refreshing } = useLoadPhase(loading);

  const [sortMode, setSortMode] = useState<SortMode>('count_desc');
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [empPage, setEmpPage] = useState(1);
  const [empPageSize, setEmpPageSize] = useState(15);
  const [drawerDeptId, setDrawerDeptId] = useState<number | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    organizationService.getDivisions().then(setDivisions).catch(() => {});
  }, []);

  useEffect(() => {
    organizationService
      .getDepartments(divisionId === 'ALL' ? undefined : divisionId)
      .then(setDepartments)
      .catch(() => {});
  }, [divisionId]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      return await reportService.getEmployeesByDepartment(
        divisionId === 'ALL' ? undefined : divisionId,
        departmentId === 'ALL' ? undefined : departmentId
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : 'ไม่สามารถโหลดรายงานพนักงานแยกตามแผนกได้');
      return null;
    } finally {
      setLoading(false);
    }
  }, [divisionId, departmentId, onError]);

  const loadReport = useCallback(async () => {
    const res = await fetchReport();
    if (res) setData(res);
  }, [fetchReport]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(async () => {
      if (cancelled) return;
      const res = await fetchReport();
      if (!cancelled && res) setData(res);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchReport]);

  const handleDivisionChange = (val: string | number) => {
    setDivisionId(val === 'ALL' ? 'ALL' : Number(val));
    setDepartmentId('ALL');
    setEmpPage(1);
    setDrawerDeptId(null);
  };

  const handleDepartmentChange = (val: string | number) => {
    setDepartmentId(val === 'ALL' ? 'ALL' : Number(val));
    setEmpPage(1);
    setDrawerDeptId(null);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setEmpPage(1);
  };

  const handleResetFilters = () => {
    setDivisionId('ALL');
    setDepartmentId('ALL');
    setSearchQuery('');
    setEmpPage(1);
    setDrawerDeptId(null);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setEmpPage(1);
  };

  const trimmedSearch = searchQuery.trim();
  const hasActiveFilters = divisionId !== 'ALL' || departmentId !== 'ALL' || trimmedSearch.length > 0;

  const filteredDepartments = useMemo(() => {
    if (!data) return [];
    const base = trimmedSearch
      ? data.departments
          .map((dept) => filterDepartmentByQuery(dept, trimmedSearch))
          .filter((dept): dept is DepartmentEmployees => dept !== null)
      : data.departments;

    return [...base].sort((a, b) => {
      if (sortMode === 'division') {
        const divCmp = a.divisionName.localeCompare(b.divisionName, 'th');
        if (divCmp !== 0) return divCmp;
      }
      const countCmp = b.employeeCount - a.employeeCount;
      return countCmp !== 0 ? countCmp : a.departmentName.localeCompare(b.departmentName, 'th');
    });
  }, [data, trimmedSearch, sortMode]);

  const summary = useMemo(() => {
    if (!data) return null;
    return aggregateFilteredSummary(data, filteredDepartments, trimmedSearch.length > 0);
  }, [data, filteredDepartments, trimmedSearch.length]);

  const allEmployees = useMemo(
    () =>
      filteredDepartments.flatMap((dept) =>
        dept.employees.map((emp) => ({
          ...emp,
          departmentId: dept.departmentId,
          departmentCode: dept.departmentCode,
          departmentName: dept.departmentName,
          divisionName: dept.divisionName,
        }))
      ),
    [filteredDepartments]
  );

  const pagedEmployees = useMemo(() => {
    const start = (empPage - 1) * empPageSize;
    return allEmployees.slice(start, start + empPageSize);
  }, [allEmployees, empPage, empPageSize]);

  const drawerIndex = useMemo(
    () =>
      drawerDeptId == null ? -1 : filteredDepartments.findIndex((d) => d.departmentId === drawerDeptId),
    [drawerDeptId, filteredDepartments]
  );
  const drawerDepartment = drawerIndex >= 0 ? filteredDepartments[drawerIndex] : null;

  const handleStepDepartment = useCallback(
    (delta: -1 | 1) => {
      if (drawerIndex < 0) return;
      const nextIdx = drawerIndex + delta;
      if (nextIdx >= 0 && nextIdx < filteredDepartments.length) {
        setDrawerDeptId(filteredDepartments[nextIdx].departmentId);
      }
    },
    [drawerIndex, filteredDepartments]
  );

  const handleExport = async (format: ReportExportFormat) => {
    if (format === 'pdf') {
      const div = divisions.find((d) => d.id === divisionId)?.divisionName;
      const dept = departments.find((d) => d.id === departmentId)?.departmentName;
      printReport(printRef.current, {
        title: 'รายงานพนักงานแยกตามแผนก',
        subtitle: [
          div ? `ฝ่าย: ${div}` : 'ทุกฝ่าย',
          dept ? `แผนก: ${dept}` : 'ทุกแผนก',
          trimmedSearch ? `คำค้น: "${trimmedSearch}"` : '',
          data ? `ณ วันที่ ${formatThaiDate(data.asOfDate)}` : '',
        ]
          .filter(Boolean)
          .join(' · '),
      });
      return;
    }

    try {
      await reportService.downloadEmployeesByDepartment(
        divisionId === 'ALL' ? undefined : divisionId,
        departmentId === 'ALL' ? undefined : departmentId,
        format
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : 'ส่งออกรายงานไม่สำเร็จ');
    }
  };

  const chartItems = useMemo(
    () =>
      filteredDepartments.map((d) => ({
        id: d.departmentId,
        label: d.departmentName,
        sub: d.divisionName,
        value: d.employeeCount,
        target: d.headcountPlan ?? undefined,
      })),
    [filteredDepartments]
  );

  const genderSegments = useMemo(() => {
    if (!summary) return [];
    return [
      { key: 'male', label: 'ชาย', value: summary.maleCount, color: VIZ.s1 },
      { key: 'female', label: 'หญิง', value: summary.femaleCount, color: VIZ.s2 },
      { key: 'other', label: 'ไม่ระบุ', value: summary.otherGenderCount, color: VIZ.neutral },
    ];
  }, [summary]);

  const empTypeSegments = useMemo(() => {
    if (!summary) return [];
    return toSegments(summary.byEmployeeType);
  }, [summary]);

  const currentBuddhistYear = toBuddhistYear(new Date().getFullYear());

  // สถิติคำนวณเสริมสำหรับ KPI
  const totalCount = summary?.totalEmployees ?? 0;
  const avgPerDept =
    summary && summary.totalDepartments > 0
      ? (summary.totalEmployees / summary.totalDepartments).toFixed(1)
      : '0';
  const malePct = totalCount > 0 ? Math.round(((summary?.maleCount ?? 0) / totalCount) * 100) : 0;
  const femalePct = totalCount > 0 ? Math.round(((summary?.femaleCount ?? 0) / totalCount) * 100) : 0;
  const otherPct = Math.max(0, 100 - malePct - femalePct);
  const hirePct = totalCount > 0 ? Math.round(((summary?.newHiresThisYear ?? 0) / totalCount) * 100) : 0;

  const planTotal = summary?.totalHeadcountPlan ?? null;
  const planVacancy = planTotal != null ? planTotal - totalCount : null;
  const planFillPct =
    planTotal != null && planTotal > 0 ? Math.min(100, Math.round((totalCount / planTotal) * 100)) : 0;

  const divisionOptions = useMemo(
    () => [
      { value: 'ALL', label: 'ทุกฝ่าย' },
      ...divisions.map((d) => ({ value: d.id, label: d.divisionName })),
    ],
    [divisions]
  );

  const departmentOptions = useMemo(
    () => [
      { value: 'ALL', label: 'ทุกแผนก' },
      ...departments.map((d) => ({ value: d.id, label: d.departmentName })),
    ],
    [departments]
  );

  return (
    <div className="space-y-5 relative">
      {/* แถบตัวกรองและปุ่มคำสั่ง */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          {/* ช่องค้นหาด่วน */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัส, ตำแหน่ง, แผนก..."
              aria-label="ค้นหาพนักงานหรือแผนก"
              className="w-full h-9 pl-9 pr-8 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                title="ล้างคำค้น"
                aria-label="ล้างคำค้นหา"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="w-full sm:w-44">
            <CustomSelect
              size="sm"
              numbered={false}
              value={divisionId}
              onChange={handleDivisionChange}
              options={divisionOptions}
              placeholder="ทุกฝ่าย"
            />
          </div>

          <div className="w-full sm:w-48">
            <CustomSelect
              size="sm"
              numbered={false}
              value={departmentId}
              onChange={handleDepartmentChange}
              options={departmentOptions}
              placeholder="ทุกแผนก"
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ล้างตัวกรอง</span>
            </button>
          )}

          <button
            type="button"
            onClick={loadReport}
            disabled={loading}
            title="รีเฟรชข้อมูล"
            aria-label="รีเฟรชข้อมูลรายงาน"
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-primary hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-auto">
          {data?.asOfDate && (
            <span className="text-xs text-slate-500 whitespace-nowrap">
              ข้อมูล ณ {formatThaiDate(data.asOfDate)}
            </span>
          )}
          {canExport && <ExportMenu onExport={handleExport} disabled={!data || loading} />}
        </div>
      </div>

      {/* แถบสถานะรีเฟรชไม่บังสายตา */}
      <RefreshIndicator active={refreshing} />

      {/* Skeleton ขณะโหลดครั้งแรก */}
      {initialLoading && !data ? (
        <div className="space-y-5 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 h-32">
                <div className="flex items-center justify-between">
                  <div className="h-3.5 w-24 bg-slate-200 rounded" />
                  <div className="w-8 h-8 rounded-xl bg-slate-100" />
                </div>
                <div className="h-8 w-20 bg-slate-200 rounded mt-3" />
                <div className="h-3 w-36 bg-slate-100 rounded mt-3" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <div className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl h-80" />
            <div className="xl:col-span-5 space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl h-38" />
              <div className="bg-white border border-slate-200 rounded-2xl h-38" />
            </div>
          </div>
        </div>
      ) : !data || !summary ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
          <p className="text-sm text-slate-500">ไม่พบข้อมูลรายงานสำหรับแสดงผล</p>
          <button
            type="button"
            onClick={loadReport}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            ลองโหลดใหม่
          </button>
        </div>
      ) : (
        <div ref={printRef} className="space-y-5">
          {/* KPI Summary Cards (4 ใบสะอาดตา โครงสร้างขาว-เทาตามระบบหลัก) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* KPI 1: พนักงานทั้งหมด */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-slate-500">พนักงานทั้งหมด</p>
                  <div className="flex items-baseline gap-1.5 mt-1.5">
                    <span className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
                      {summary.totalEmployees.toLocaleString('th-TH')}
                    </span>
                    <span className="text-xs font-medium text-slate-500">คน</span>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Users className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {summary.totalDepartments.toLocaleString('th-TH')} แผนก
                </span>
                <span className="tabular-nums">เฉลี่ย {avgPerDept} คน/แผนก</span>
              </div>
            </div>

            {/* KPI 2: สัดส่วน ชาย / หญิง */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-slate-500">ชาย / หญิง</p>
                  <div className="flex items-baseline gap-1.5 mt-1.5 tabular-nums">
                    <span className="text-2xl sm:text-3xl font-bold text-slate-900">
                      {summary.maleCount.toLocaleString('th-TH')}
                    </span>
                    <span className="text-lg font-medium text-slate-400">/</span>
                    <span className="text-2xl sm:text-3xl font-bold text-orange-600">
                      {summary.femaleCount.toLocaleString('th-TH')}
                    </span>
                    <span className="text-xs font-medium text-slate-500">คน</span>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden flex">
                  {malePct > 0 && (
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${malePct}%` }}
                    />
                  )}
                  {femalePct > 0 && (
                    <div
                      className="h-full bg-orange-500 transition-all duration-300"
                      style={{ width: `${femalePct}%` }}
                    />
                  )}
                  {summary.otherGenderCount > 0 && otherPct > 0 && (
                    <div
                      className="h-full bg-slate-300 transition-all duration-300"
                      style={{ width: `${otherPct}%` }}
                    />
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 tabular-nums">
                  <span>ชาย {malePct}% · หญิง {femalePct}%</span>
                  {summary.otherGenderCount > 0 && (
                    <span>ไม่ระบุ {summary.otherGenderCount}</span>
                  )}
                </div>
              </div>
            </div>

            {/* KPI 3: เข้าใหม่ปีนี้ */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-slate-500">เข้าใหม่ปีนี้</p>
                  <div className="flex items-baseline gap-1.5 mt-1.5">
                    <span className="text-2xl sm:text-3xl font-bold text-emerald-700 tabular-nums">
                      {summary.newHiresThisYear > 0 ? `+${summary.newHiresThisYear.toLocaleString('th-TH')}` : '0'}
                    </span>
                    <span className="text-xs font-medium text-slate-500">คน</span>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <UserPlus className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500">พ.ศ. {currentBuddhistYear}</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 tabular-nums">
                  {hirePct}% ของทั้งหมด
                </span>
              </div>
            </div>

            {/* KPI 4: ตำแหน่งว่าง (ตามแผน) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">ตำแหน่งว่าง (ตามแผน)</p>
                  {planVacancy != null && planTotal != null ? (
                    <div className="flex items-baseline gap-1.5 mt-1.5">
                      <span
                        className={`text-2xl sm:text-3xl font-bold tabular-nums ${
                          planVacancy < 0
                            ? 'text-rose-600'
                            : planVacancy === 0
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {planVacancy < 0
                          ? `เกิน ${Math.abs(planVacancy).toLocaleString('th-TH')}`
                          : planVacancy.toLocaleString('th-TH')}
                      </span>
                      <span className="text-xs font-medium text-slate-500">อัตรา</span>
                    </div>
                  ) : (
                    <p className="text-base font-semibold text-slate-700 mt-2">ยังไม่ระบุแผน</p>
                  )}
                </div>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Target className="w-4.5 h-4.5" />
                </div>
              </div>

              {planTotal != null ? (
                <div className="space-y-1.5 pt-1">
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        totalCount > planTotal
                          ? 'bg-rose-500'
                          : totalCount === planTotal
                          ? 'bg-emerald-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${planFillPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 tabular-nums">
                    <span>บรรจุแล้ว {totalCount}/{planTotal} คน</span>
                    <span className="font-medium text-slate-700">{planFillPct}%</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <span className="truncate">ยังไม่มีแผนอัตรากำลัง</span>
                  {canManagePositions && (
                    <Link
                      href="/organization?tab=positions"
                      data-print-hide
                      className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline shrink-0"
                    >
                      <span>ตั้งค่า</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bento Analytics Grid: ซ้าย HorizontalBarChart · ขวา 2 Compact Donuts */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
            <div className="xl:col-span-7 flex">
              <ChartCard
                className="w-full"
                title="จำนวนพนักงานแต่ละแผนก"
                subtitle="คลิกที่แท่งกราฟเพื่อดูรายชื่อพนักงานในแผนก"
                legend={
                  <div
                    data-print-hide
                    className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200/80 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => setSortMode('count_desc')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                        sortMode === 'count_desc'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      มาก → น้อย
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortMode('division')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                        sortMode === 'division'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ตามฝ่าย
                    </button>
                  </div>
                }
              >
                <HorizontalBarChart
                  items={chartItems}
                  unit="คน"
                  targetLabel="ตามแผน"
                  onItemClick={(item) => setDrawerDeptId(Number(item.id))}
                />
              </ChartCard>
            </div>

            <div className="xl:col-span-5 flex flex-col gap-4">
              <ChartCard className="flex-1" title="สัดส่วนเพศ">
                <DonutChart
                  size={116}
                  segments={genderSegments}
                  centerLabel="ทั้งหมด"
                  unit="คน"
                />
              </ChartCard>

              <ChartCard className="flex-1" title="ประเภทพนักงาน">
                <DonutChart
                  size={116}
                  segments={empTypeSegments}
                  centerLabel="ทั้งหมด"
                  unit="คน"
                />
              </ChartCard>
            </div>
          </div>

          {/* Details Section: สรุปตามแผนก vs รายชื่อทั้งหมด */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-sm sm:text-base font-semibold text-slate-900">
                  {viewMode === 'summary' ? 'รายละเอียดรายแผนก' : 'รายชื่อพนักงานทั้งหมด'}
                </h2>
                <CountBadge
                  count={viewMode === 'summary' ? filteredDepartments.length : allEmployees.length}
                />
                {viewMode === 'summary' && filteredDepartments.length > 0 && (
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    · คลิกที่แถวแผนกเพื่อเปิดดูรายชื่อพนักงาน
                  </span>
                )}
              </div>

              <div data-print-hide>
                <SegmentedControl<ViewMode>
                  value={viewMode}
                  onChange={handleViewModeChange}
                  options={[
                    { value: 'summary', label: `สรุปตามแผนก (${filteredDepartments.length})` },
                    { value: 'employees', label: `รายชื่อทั้งหมด (${allEmployees.length})` },
                  ]}
                />
              </div>
            </div>

            {filteredDepartments.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <p className="text-sm font-medium text-slate-600">
                  ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    ล้างตัวกรองทั้งหมด
                  </button>
                )}
              </div>
            ) : viewMode === 'summary' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm table-standard">
                  <thead>
                    <tr>
                      <th className="text-left">แผนก</th>
                      <th className="text-left">ฝ่าย</th>
                      <th className="text-right">พนักงาน</th>
                      <th className="text-center">อัตรากำลังตามแผน</th>
                      <th className="text-left min-w-[140px]">สัดส่วน ช / ญ</th>
                      <th className="text-center">เข้าใหม่ปีนี้</th>
                      <th className="text-left">ประเภทพนักงาน</th>
                      <th className="text-right" data-print-hide>
                        รายชื่อ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDepartments.map((dept) => {
                      const planBadge = getHeadcountPlanBadge(dept.employeeCount, dept.headcountPlan);
                      const deptMalePct =
                        dept.employeeCount > 0 ? Math.round((dept.maleCount / dept.employeeCount) * 100) : 0;
                      const deptFemalePct =
                        dept.employeeCount > 0 ? Math.round((dept.femaleCount / dept.employeeCount) * 100) : 0;
                      const isSelected = drawerDeptId === dept.departmentId;

                      return (
                        <tr
                          key={dept.departmentId}
                          onClick={() => setDrawerDeptId(dept.departmentId)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50/70'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td>
                            <div className="font-medium text-slate-900">{dept.departmentName}</div>
                            <span className="inline-block mt-0.5 text-[11px] font-mono text-slate-400">
                              {dept.departmentCode}
                            </span>
                          </td>
                          <td className="text-slate-600">{dept.divisionName}</td>
                          <td className="text-right tabular-nums font-semibold text-slate-900">
                            {dept.employeeCount.toLocaleString('th-TH')}
                          </td>
                          <td className="text-center">
                            {planBadge ? (
                              <span
                                title={planBadge.title}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border tabular-nums ${planBadge.badgeClass}`}
                              >
                                {dept.employeeCount}/{dept.headcountPlan} ({planBadge.suffix})
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td>
                            {dept.employeeCount > 0 ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs text-slate-600 tabular-nums">
                                  <span>ช {dept.maleCount}</span>
                                  <span>ญ {dept.femaleCount}</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden flex">
                                  {deptMalePct > 0 && (
                                    <div
                                      className="h-full bg-blue-600"
                                      style={{ width: `${deptMalePct}%` }}
                                    />
                                  )}
                                  {deptFemalePct > 0 && (
                                    <div
                                      className="h-full bg-orange-500"
                                      style={{ width: `${deptFemalePct}%` }}
                                    />
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                          <td className="text-center tabular-nums">
                            {dept.newHiresThisYear > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                +{dept.newHiresThisYear}
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td>
                            {dept.byEmployeeType.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {dept.byEmployeeType.map((t) => (
                                  <span
                                    key={t.name}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${getEmployeeTypeBadgeClass(t.name)}`}
                                  >
                                    {t.name} {t.count}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                          <td className="text-right" data-print-hide>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDrawerDeptId(dept.departmentId);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-primary hover:bg-blue-50 transition-colors cursor-pointer"
                            >
                              <span>ดู ({dept.employeeCount})</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-semibold text-slate-800 border-t border-slate-200">
                      <td colSpan={2}>รวมทั้งสิ้น ({summary.totalDepartments} แผนก)</td>
                      <td className="text-right tabular-nums">
                        {summary.totalEmployees.toLocaleString('th-TH')}
                      </td>
                      <td className="text-center tabular-nums">
                        {summary.totalHeadcountPlan != null
                          ? summary.totalHeadcountPlan.toLocaleString('th-TH')
                          : '-'}
                      </td>
                      <td className="tabular-nums text-xs">
                        ช {summary.maleCount} / ญ {summary.femaleCount}
                      </td>
                      <td className="text-center tabular-nums text-emerald-700">
                        {summary.newHiresThisYear > 0 ? `+${summary.newHiresThisYear}` : '0'}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-standard">
                    <thead>
                      <tr>
                        <th className="w-12 text-center">#</th>
                        <th className="text-left">รหัส</th>
                        <th className="text-left">ชื่อ - นามสกุล</th>
                        <th className="text-left">แผนก / ฝ่าย</th>
                        <th className="text-left">ตำแหน่ง</th>
                        <th className="text-left">ประเภท</th>
                        <th className="text-left">ระดับ</th>
                        <th className="text-center">เพศ</th>
                        <th className="text-right">วันเริ่มงาน</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedEmployees.map((emp, idx) => {
                        const rowNumber = (empPage - 1) * empPageSize + idx + 1;
                        return (
                          <tr key={`${emp.departmentId}-${emp.employeeId}`} className="hover:bg-slate-50/80">
                            <td className="text-center text-xs text-slate-400 tabular-nums">
                              {rowNumber}
                            </td>
                            <td className="font-mono text-xs text-slate-600">{emp.employeeCode}</td>
                            <td>
                              {canViewEmployeeProfile ? (
                                <Link
                                  href={`/employees/${emp.employeeId}`}
                                  className="inline-flex items-center group"
                                >
                                  <AvatarName id={emp.employeeId} name={emp.employeeName} />
                                </Link>
                              ) : (
                                <AvatarName id={emp.employeeId} name={emp.employeeName} />
                              )}
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => setDrawerDeptId(emp.departmentId)}
                                title="คลิกเพื่อเปิดดูรายชื่อทั้งแผนก"
                                className="text-left group cursor-pointer"
                              >
                                <div className="font-medium text-slate-800 group-hover:text-primary transition-colors">
                                  {emp.departmentName}
                                </div>
                                <div className="text-xs text-slate-400">{emp.divisionName}</div>
                              </button>
                            </td>
                            <td className="text-slate-700">{emp.positionName || '-'}</td>
                            <td>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getEmployeeTypeBadgeClass(emp.employeeTypeName)}`}
                              >
                                {emp.employeeTypeName || '-'}
                              </span>
                            </td>
                            <td className="text-slate-600">{emp.levelName || '-'}</td>
                            <td className="text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getGenderBadgeClass(emp.gender)}`}
                              >
                                {emp.gender || '-'}
                              </span>
                            </td>
                            <td className="text-right text-slate-600 tabular-nums whitespace-nowrap">
                              {emp.startDate ? formatThaiDate(emp.startDate) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div data-print-hide className="p-4 border-t border-slate-100">
                  <TablePagination
                    total={allEmployees.length}
                    page={empPage}
                    pageSize={empPageSize}
                    onPageChange={setEmpPage}
                    onPageSizeChange={(size) => {
                      setEmpPageSize(size);
                      setEmpPage(1);
                    }}
                    totalLabel="คน"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide-over Drawer รายชื่อพนักงานในแผนก */}
      <DepartmentRosterDrawer
        department={drawerDepartment}
        canViewEmployeeProfile={canViewEmployeeProfile}
        onClose={() => setDrawerDeptId(null)}
        onStepDepartment={handleStepDepartment}
        currentIndex={drawerIndex >= 0 ? drawerIndex : undefined}
        totalDepartments={filteredDepartments.length}
      />
    </div>
  );
}

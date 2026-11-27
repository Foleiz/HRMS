'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarX2,
  CheckCircle2,
  Clock,
  RefreshCw,
  Users,
} from 'lucide-react';
import { useLoadPhase } from '@/hooks/useLoadPhase';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';
import { useToast } from '@/context/ToastContext';
import { reportService } from '@/services/reportService';
import { organizationService } from '@/services/organizationService';
import type { DailyHeadcountSummary, MonthlyLatenessReport } from '@/types/reports';
import type { Department, Division } from '@/types/organization';
import { getSmartYearRange } from '@/lib/yearUtils';
import { TH_MONTHS, formatThaiDate as fmtThaiDate } from '@/lib/thaiDate';
import { printReport } from '@/lib/printReport';
import ExportMenu, { ReportExportFormat } from './ExportMenu';
import {
  AvatarName,
  IconButton,
  KpiCard,
  KpiGrid,
  ReportEmpty,
  ReportFilterBar,
  ReportLoading,
  ReportTableCard,
  TableEmpty,
} from './ReportShell';

export interface AttendanceReportTabProps {
  canViewDaily: boolean;
  canViewMonthly: boolean;
  canExportDaily: boolean;
  canExportMonthly: boolean;
  initialMode?: 'daily' | 'monthly' | 'yearly';
}

const formatThaiDate = (dateStr: string) => fmtThaiDate(dateStr, 'numeric');

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const monthsUpTo = (year: number) => {
  const now = new Date();
  const last = year < now.getFullYear() ? 12 : year === now.getFullYear() ? now.getMonth() + 1 : 0;
  return Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => m <= last);
};

/** รายงานการเข้าออกงาน: รวมมุมมองรายวัน รายเดือน และรายปีในหน้าเดียว */
export default function AttendanceReportTab({
  canViewDaily,
  canViewMonthly,
  canExportDaily,
  canExportMonthly,
  initialMode = 'daily',
}: AttendanceReportTabProps) {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [mode, setMode] = useState<'daily' | 'monthly' | 'yearly'>(() => {
    if ((initialMode === 'monthly' || initialMode === 'yearly') && canViewMonthly) return initialMode;
    if (canViewDaily) return 'daily';
    return 'monthly';
  });

  useEffect(() => {
    if ((initialMode === 'monthly' || initialMode === 'yearly') && canViewMonthly) setMode(initialMode);
    else if (initialMode === 'daily' && canViewDaily) setMode('daily');
  }, [initialMode, canViewDaily, canViewMonthly]);

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  // Daily State
  const [selectedDate, setSelectedDate] = useState<string>(localToday);
  const [selectedDivision, setSelectedDivision] = useState<number | 'ALL'>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<number | 'ALL'>('ALL');
  const [dailySearch, setDailySearch] = useState<string>('');
  const [headcountData, setHeadcountData] = useState<DailyHeadcountSummary | null>(null);
  const [headcountPage, setHeadcountPage] = useState(1);
  const [headcountPageSize, setHeadcountPageSize] = useState(10);
  const [isLoadingHeadcount, setIsLoadingHeadcount] = useState(false);
  const headcountPhase = useLoadPhase(isLoadingHeadcount);
  const [isExportingHeadcount, setIsExportingHeadcount] = useState(false);

  // Monthly State
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [latenessDepartment, setLatenessDepartment] = useState<number | 'ALL'>('ALL');
  const [latenessSearch, setLatenessSearch] = useState<string>('');
  const [latenessData, setLatenessData] = useState<MonthlyLatenessReport | null>(null);
  const [, setPrevLatenessData] = useState<MonthlyLatenessReport | null>(null);
  const [latenessPage, setLatenessPage] = useState(1);
  const [latenessPageSize, setLatenessPageSize] = useState(10);
  const [isLoadingLateness, setIsLoadingLateness] = useState(false);
  const latenessPhase = useLoadPhase(isLoadingLateness);
  const [isExportingLateness, setIsExportingLateness] = useState(false);

  // Yearly State
  const [yearlySearch, setYearlySearch] = useState<string>('');
  const [yearlyPage, setYearlyPage] = useState(1);
  const [yearlyPageSize, setYearlyPageSize] = useState(10);
  const [isLoadingYearly, setIsLoadingYearly] = useState(false);
  const yearlyPhase = useLoadPhase(isLoadingYearly);
  const [yearlyData, setYearlyData] = useState<{
    totalAuditedEmployees: number;
    overallAttendanceRate: number;
    totalLateOccurrences: number;
    totalLateMinutes: number;
    monthlyLate: (number | null)[];
    monthlyAbsent: (number | null)[];
    items: MonthlyLatenessReport['items'];
  } | null>(null);

  useEffect(() => {
    Promise.all([organizationService.getDivisions(), organizationService.getDepartments()])
      .then(([divs, depts]) => {
        setDivisions(divs);
        setDepartments(depts);
      })
      .catch(() => undefined);
  }, []);

  const loadDailyHeadcount = useCallback(async () => {
    if (!canViewDaily) return;
    try {
      setIsLoadingHeadcount(true);
      const divId = selectedDivision === 'ALL' ? undefined : Number(selectedDivision);
      const deptId = selectedDepartment === 'ALL' ? undefined : Number(selectedDepartment);
      const data = await reportService.getDailyHeadcount(selectedDate, divId, deptId);
      setHeadcountData(data);
      setHeadcountPage(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถโหลดรายงานการเข้าออกงานรายวันได้';
      toastRef.current.error(msg);
    } finally {
      setIsLoadingHeadcount(false);
    }
  }, [canViewDaily, selectedDate, selectedDivision, selectedDepartment]);

  const loadMonthlyLateness = useCallback(async () => {
    if (!canViewMonthly) return;
    try {
      setIsLoadingLateness(true);
      const deptId = latenessDepartment === 'ALL' ? undefined : Number(latenessDepartment);
      const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
      const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;

      const [curr, prev] = await Promise.allSettled([
        reportService.getMonthlyLateness(selectedYear, selectedMonth, deptId),
        reportService.getMonthlyLateness(prevYear, prevMonth, deptId),
      ]);

      if (curr.status === 'fulfilled') {
        setLatenessData(curr.value);
        setLatenessPage(1);
      } else {
        throw curr.reason;
      }
      setPrevLatenessData(prev.status === 'fulfilled' ? prev.value : null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถโหลดรายงานการเข้าออกงานรายเดือนได้';
      toastRef.current.error(msg);
    } finally {
      setIsLoadingLateness(false);
    }
  }, [canViewMonthly, selectedYear, selectedMonth, latenessDepartment]);

  const loadYearlyLateness = useCallback(async () => {
    if (!canViewMonthly) return;
    try {
      setIsLoadingYearly(true);
      const deptId = latenessDepartment === 'ALL' ? undefined : Number(latenessDepartment);
      const months = monthsUpTo(selectedYear);
      const results = await Promise.allSettled(
        months.map((m) => reportService.getMonthlyLateness(selectedYear, m, deptId))
      );

      const monthlyLate: (number | null)[] = Array(12).fill(null);
      const monthlyAbsent: (number | null)[] = Array(12).fill(null);
      const empMap = new Map<number, MonthlyLatenessReport['items'][number]>();

      results.forEach((res, idx) => {
        if (res.status !== 'fulfilled') return;
        const mIdx = months[idx] - 1;
        monthlyLate[mIdx] = res.value.totalLateOccurrences;
        monthlyAbsent[mIdx] = res.value.items.reduce((s, it) => s + (it.absentDays || 0), 0);

        for (const it of res.value.items) {
          const prev = empMap.get(it.employeeId);
          if (!prev) {
            empMap.set(it.employeeId, { ...it });
          } else {
            const totalWorkDays = prev.totalWorkDays + it.totalWorkDays;
            const presentDays = prev.presentDays + it.presentDays;
            empMap.set(it.employeeId, {
              ...prev,
              departmentName: it.departmentName || prev.departmentName,
              positionName: it.positionName || prev.positionName,
              totalWorkDays,
              presentDays,
              lateDays: prev.lateDays + it.lateDays,
              totalLateMinutes: prev.totalLateMinutes + it.totalLateMinutes,
              earlyLeaveDays: prev.earlyLeaveDays + it.earlyLeaveDays,
              totalEarlyLeaveMinutes: prev.totalEarlyLeaveMinutes + it.totalEarlyLeaveMinutes,
              absentDays: prev.absentDays + it.absentDays,
              attendanceRate: totalWorkDays > 0 ? Math.round((presentDays / totalWorkDays) * 1000) / 10 : 0,
            });
          }
        }
      });

      const items = Array.from(empMap.values()).sort(
        (a, b) => b.lateDays - a.lateDays || b.totalLateMinutes - a.totalLateMinutes
      );
      const totalWorkSum = items.reduce((s, i) => s + i.totalWorkDays, 0);
      const totalPresentSum = items.reduce((s, i) => s + i.presentDays, 0);
      const totalLateOccurrences = items.reduce((s, i) => s + i.lateDays, 0);
      const totalLateMinutes = items.reduce((s, i) => s + i.totalLateMinutes, 0);
      const overallAttendanceRate =
        totalWorkSum > 0 ? Math.round((totalPresentSum / totalWorkSum) * 1000) / 10 : 0;

      setYearlyData({
        totalAuditedEmployees: items.length,
        overallAttendanceRate,
        totalLateOccurrences,
        totalLateMinutes,
        monthlyLate,
        monthlyAbsent,
        items,
      });
      setYearlyPage(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถโหลดรายงานการเข้าออกงานรายปีได้';
      toastRef.current.error(msg);
    } finally {
      setIsLoadingYearly(false);
    }
  }, [canViewMonthly, selectedYear, latenessDepartment]);

  useEffect(() => {
    if (mode === 'daily' && canViewDaily) loadDailyHeadcount();
    else if (mode === 'monthly' && canViewMonthly) loadMonthlyLateness();
    else if (mode === 'yearly' && canViewMonthly) loadYearlyLateness();
  }, [mode, canViewDaily, canViewMonthly, loadDailyHeadcount, loadMonthlyLateness, loadYearlyLateness]);

  const handleExportDaily = async (format: ReportExportFormat = 'csv') => {
    if (format === 'pdf') {
      printReport(printRef.current, {
        title: 'รายงานการเข้าออกงาน (รายวัน)',
        subtitle: `วันที่ ${formatThaiDate(selectedDate)}`,
      });
      return;
    }
    try {
      setIsExportingHeadcount(true);
      const divId = selectedDivision === 'ALL' ? undefined : selectedDivision;
      const deptId = selectedDepartment === 'ALL' ? undefined : selectedDepartment;
      await reportService.downloadDailyHeadcountCsv(selectedDate, divId, deptId, format);
      toast.success('ดาวน์โหลดรายงานการเข้าออกงาน (รายวัน) สำเร็จ');
    } catch {
      toast.error('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์');
    } finally {
      setIsExportingHeadcount(false);
    }
  };

  const handleExportMonthly = async (format: ReportExportFormat = 'csv') => {
    if (format === 'pdf') {
      printReport(printRef.current, {
        title: 'รายงานการเข้าออกงาน (รายเดือน)',
        subtitle: `เดือน ${TH_MONTHS[selectedMonth - 1]} พ.ศ. ${selectedYear + 543}`,
      });
      return;
    }
    try {
      setIsExportingLateness(true);
      const deptId = latenessDepartment === 'ALL' ? undefined : latenessDepartment;
      await reportService.downloadMonthlyLatenessCsv(
        selectedYear,
        selectedMonth,
        deptId,
        latenessSearch.trim() || undefined,
        format
      );
      toast.success('ดาวน์โหลดรายงานการเข้าออกงาน (รายเดือน) สำเร็จ');
    } catch {
      toast.error('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์');
    } finally {
      setIsExportingLateness(false);
    }
  };

  const filteredHeadcountDepts = useMemo(() => {
    if (!headcountData?.departments) return [];
    const q = dailySearch.trim().toLowerCase();
    if (!q) return headcountData.departments;
    return headcountData.departments.filter(
      (d) =>
        d.departmentName.toLowerCase().includes(q) ||
        d.departmentCode.toLowerCase().includes(q) ||
        d.divisionName.toLowerCase().includes(q)
    );
  }, [headcountData?.departments, dailySearch]);

  const pagedHeadcountDepts = useMemo(() => {
    const start = (headcountPage - 1) * headcountPageSize;
    return filteredHeadcountDepts.slice(start, start + headcountPageSize);
  }, [filteredHeadcountDepts, headcountPage, headcountPageSize]);

  const filteredLatenessItems = useMemo(() => {
    if (!latenessData?.items) return [];
    const q = latenessSearch.trim().toLowerCase();
    if (!q) return latenessData.items;
    return latenessData.items.filter(
      (i) =>
        i.employeeName.toLowerCase().includes(q) ||
        i.employeeCode.toLowerCase().includes(q) ||
        i.departmentName.toLowerCase().includes(q) ||
        i.positionName.toLowerCase().includes(q)
    );
  }, [latenessData?.items, latenessSearch]);

  const pagedLatenessItems = useMemo(() => {
    const start = (latenessPage - 1) * latenessPageSize;
    return filteredLatenessItems.slice(start, start + latenessPageSize);
  }, [filteredLatenessItems, latenessPage, latenessPageSize]);

  const filteredYearlyItems = useMemo(() => {
    if (!yearlyData?.items) return [];
    const q = yearlySearch.trim().toLowerCase();
    if (!q) return yearlyData.items;
    return yearlyData.items.filter(
      (i) =>
        i.employeeName.toLowerCase().includes(q) ||
        i.employeeCode.toLowerCase().includes(q) ||
        i.departmentName.toLowerCase().includes(q) ||
        i.positionName.toLowerCase().includes(q)
    );
  }, [yearlyData?.items, yearlySearch]);

  const pagedYearlyItems = useMemo(() => {
    const start = (yearlyPage - 1) * yearlyPageSize;
    return filteredYearlyItems.slice(start, start + yearlyPageSize);
  }, [filteredYearlyItems, yearlyPage, yearlyPageSize]);

  const handleExportYearly = (format: ReportExportFormat = 'csv') => {
    if (format === 'pdf') {
      printReport(printRef.current, {
        title: 'รายงานการเข้าออกงาน (รายปี)',
        subtitle: `ปี พ.ศ. ${selectedYear + 543}`,
      });
      return;
    }
    if (!yearlyData || filteredYearlyItems.length === 0) return;
    const headers = [
      'รหัสพนักงาน',
      'ชื่อ-นามสกุล',
      'แผนก',
      'ตำแหน่ง',
      'วันทำงานทั้งปี',
      'วันมาทำงาน',
      'มาสาย (ครั้ง)',
      'เวลาสายรวม (นาที)',
      'ออกก่อน (ครั้ง)',
      'เวลาออกก่อนรวม (นาที)',
      'ขาดงาน (วัน)',
      'อัตราการเข้างาน (%)',
    ];
    const rows = filteredYearlyItems.map((it) => [
      it.employeeCode,
      it.employeeName,
      it.departmentName,
      it.positionName,
      it.totalWorkDays,
      it.presentDays,
      it.lateDays,
      it.totalLateMinutes,
      it.earlyLeaveDays,
      it.totalEarlyLeaveMinutes,
      it.absentDays,
      it.attendanceRate,
    ]);
    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const href = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.setAttribute('download', `Yearly_Attendance_${selectedYear + 543}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(href);
    toast.success('ดาวน์โหลดรายงานการเข้าออกงาน (รายปี) สำเร็จ');
  };

  const modeSwitch =
    canViewDaily || canViewMonthly ? (
      <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-900">
        {canViewDaily && (
          <button
            type="button"
            onClick={() => setMode('daily')}
            className={`rounded-lg px-3.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
              mode === 'daily'
                ? 'bg-primary text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            รายวัน
          </button>
        )}
        {canViewMonthly && (
          <>
            <button
              type="button"
              onClick={() => setMode('monthly')}
              className={`rounded-lg px-3.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                mode === 'monthly'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              รายเดือน
            </button>
            <button
              type="button"
              onClick={() => setMode('yearly')}
              className={`rounded-lg px-3.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                mode === 'yearly'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              รายปี
            </button>
          </>
        )}
      </div>
    ) : null;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {mode === 'daily' && canViewDaily && (
        <>
          <ReportFilterBar
            loading={isLoadingHeadcount}
            right={
              canExportDaily ? (
                <ExportMenu onExport={handleExportDaily} disabled={isExportingHeadcount || !headcountData} />
              ) : undefined
            }
          >
            {modeSwitch}
            <ThaiDatePicker
              value={selectedDate}
              onChange={setSelectedDate}
              className="w-[140px] shrink-0"
              buttonClassName="h-9 !py-0 !px-3 !text-xs !rounded-xl shadow-2xs"
            />

            <CustomSelect
              value={selectedDivision}
              onChange={(val) => {
                const parsed = String(val) === 'ALL' ? 'ALL' : Number(val);
                setSelectedDivision(parsed);
                setSelectedDepartment('ALL');
              }}
              placeholder="ทุกฝ่าย"
              className="min-w-[160px]"
              options={[
                { value: 'ALL', label: 'ทุกฝ่าย' },
                ...divisions.map((div) => ({ value: div.id, label: div.divisionName })),
              ]}
            />

            <CustomSelect
              value={selectedDepartment}
              onChange={(val) => {
                const parsed = String(val) === 'ALL' ? 'ALL' : Number(val);
                setSelectedDepartment(parsed);
              }}
              placeholder="ทุกแผนก"
              className="min-w-[160px]"
              options={[
                { value: 'ALL', label: 'ทุกแผนก' },
                ...departments
                  .filter((dept) => selectedDivision === 'ALL' || dept.divisionId === selectedDivision)
                  .map((dept) => ({ value: dept.id, label: dept.departmentName })),
              ]}
            />

            <IconButton onClick={loadDailyHeadcount} title="รีเฟรช">
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingHeadcount ? 'animate-spin' : ''}`} />
            </IconButton>
          </ReportFilterBar>

          {headcountPhase.initialLoading && !headcountData ? (
            <ReportLoading text="กำลังโหลดข้อมูลอัตรากำลังคนประจำวัน..." />
          ) : !headcountData || headcountData.departments.length === 0 ? (
            <ReportEmpty text="ไม่พบข้อมูลแผนกตามตัวกรองที่เลือก" />
          ) : (
            <div ref={printRef} className="space-y-5">
              {/* 5 KPI Cards */}
              <KpiGrid cols={5}>
                <KpiCard
                  icon={Users}
                  tone="blue"
                  label="พนักงานทั้งหมด"
                  value={headcountData.totalEmployees}
                  unit="คน"
                  tooltip={`จำนวนพนักงานที่ทำงานอยู่ทั้งหมด (ต้องมาทำงานวันนี้ ${headcountData.totalExpected ?? headcountData.totalEmployees} คน)`}
                />
                <KpiCard
                  icon={CheckCircle2}
                  tone="emerald"
                  label="มาปฏิบัติงาน"
                  value={headcountData.totalPresent}
                  unit="คน"
                  tooltip="คนที่ลงเวลาเข้างานวันนี้ (รวมคนมาสายแล้ว)"
                />
                <KpiCard
                  icon={Clock}
                  tone="amber"
                  label="มาสาย"
                  value={headcountData.totalLate}
                  unit="คน"
                  tooltip="คนที่ลงเวลาเข้างานช้ากว่าเวลาเริ่มกะ"
                />
                <KpiCard
                  icon={AlertTriangle}
                  tone="rose"
                  label="ขาด / ยังไม่ลงเวลา"
                  value={headcountData.totalAbsent}
                  unit="คน"
                  tooltip="ต้องมาทำงานวันนี้ − มาปฏิบัติงาน − ลาที่อนุมัติแล้ว"
                />
                <KpiCard
                  icon={CalendarX2}
                  tone="violet"
                  label="ลา / วันหยุด"
                  value={(headcountData.totalLeave ?? 0) + (headcountData.totalOff ?? 0)}
                  unit="คน"
                  tooltip={`คนที่ลาอนุมัติแล้ว (${headcountData.totalLeave ?? 0}) + วันหยุดประจำกะ (${headcountData.totalOff ?? 0})`}
                />
              </KpiGrid>

              {/* Department Table */}
              <ReportTableCard
                searchValue={dailySearch}
                onSearchChange={(val) => {
                  setDailySearch(val);
                  setHeadcountPage(1);
                }}
                searchPlaceholder="ค้นหาชื่อแผนก หรือรหัสแผนก..."
                refreshing={headcountPhase.refreshing}
                minWidthClassName="min-w-[960px]"
                pagination={{
                  total: filteredHeadcountDepts.length,
                  page: headcountPage,
                  pageSize: headcountPageSize,
                  onPageChange: setHeadcountPage,
                  onPageSizeChange: (newSize) => {
                    setHeadcountPageSize(newSize);
                    setHeadcountPage(1);
                  },
                  pageSizeOptions: [10, 20, 50, 100],
                  totalLabel: 'แผนก',
                }}
              >
                <thead className="bg-primary text-white font-semibold">
                  <tr className="whitespace-nowrap">
                    <th className="py-3.5 px-4 whitespace-nowrap">แผนก / ฝ่าย</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">พนักงานทั้งหมด</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">มาทำงาน</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">มาสาย</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">ออกก่อน</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">ลา</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">วันหยุด</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">ขาดงาน</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap" style={{ minWidth: 150 }}>
                      อัตราการเข้างาน
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700/60 dark:bg-slate-900">
                  {pagedHeadcountDepts.length === 0 ? (
                    <TableEmpty colSpan={9} text="ไม่พบข้อมูลแผนกที่ค้นหา" />
                  ) : (
                    pagedHeadcountDepts.map((dept) => {
                      const rate = Math.min(100, Math.max(0, dept.attendanceRate));
                      return (
                        <tr
                          key={dept.departmentId}
                          className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/40"
                        >
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {dept.departmentName}
                              <span className="ml-1.5 font-mono text-[11px] font-normal text-slate-400">
                                ({dept.departmentCode})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400">{dept.divisionName}</div>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {dept.totalHeadcount}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-emerald-600 whitespace-nowrap">
                            {dept.presentCount}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-amber-600 whitespace-nowrap">
                            {dept.lateCount}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-orange-600 whitespace-nowrap">
                            {dept.earlyLeaveCount}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-violet-600 whitespace-nowrap">
                            {dept.leaveCount ?? 0}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-500 whitespace-nowrap">
                            {dept.offCount ?? 0}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-rose-600 whitespace-nowrap">
                            {dept.absentCount}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                <div
                                  className={`h-full rounded-full ${
                                    rate >= 90 ? 'bg-emerald-500' : rate >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${rate}%` }}
                                />
                              </div>
                              <span className="w-11 text-right font-extrabold text-slate-900 dark:text-slate-100">
                                {rate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </ReportTableCard>
            </div>
          )}
        </>
      )}

      {mode === 'monthly' && canViewMonthly && (
        <>
          <ReportFilterBar
            loading={isLoadingLateness}
            right={
              canExportMonthly ? (
                <ExportMenu onExport={handleExportMonthly} disabled={isExportingLateness || !latenessData} />
              ) : undefined
            }
          >
            {modeSwitch}

            <CustomSelect
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="min-w-[140px]"
            >
              {TH_MONTHS.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m}
                </option>
              ))}
            </CustomSelect>

            <CustomSelect
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="min-w-[130px]"
            >
              {getSmartYearRange({ forwardYears: 1, backYears: 5, selectedYear }).map((y) => (
                <option key={y} value={y}>
                  พ.ศ. {y + 543}
                </option>
              ))}
            </CustomSelect>

            <CustomSelect
              value={latenessDepartment}
              onChange={(val) => {
                const parsed = String(val) === 'ALL' ? 'ALL' : Number(val);
                setLatenessDepartment(parsed);
              }}
              placeholder="ทุกแผนก"
              className="min-w-[160px]"
              options={[
                { value: 'ALL', label: 'ทุกแผนก' },
                ...departments.map((dept) => ({ value: dept.id, label: dept.departmentName })),
              ]}
            />

            <IconButton onClick={loadMonthlyLateness} title="รีเฟรช">
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingLateness ? 'animate-spin' : ''}`} />
            </IconButton>
          </ReportFilterBar>

          {latenessPhase.initialLoading && !latenessData ? (
            <ReportLoading text="กำลังโหลดรายงานการเข้าออกงานรายเดือน..." />
          ) : !latenessData || latenessData.items.length === 0 ? (
            <ReportEmpty text="ไม่พบข้อมูลพนักงานตามเงื่อนไขที่เลือก" />
          ) : (
            <div ref={printRef} className="space-y-5">
              {/* 4 KPI Cards with Deltas */}
              <KpiGrid cols={4}>
                <KpiCard
                  icon={Users}
                  tone="blue"
                  label="พนักงานที่ตรวจสอบ"
                  value={latenessData.totalAuditedEmployees}
                  unit="คน"
                  tooltip="จำนวนพนักงานที่นำมาคิดเวลาทำงานในเดือนนี้"
                />

                <KpiCard
                  icon={CheckCircle2}
                  tone="emerald"
                  label="อัตราการเข้างานเฉลี่ย"
                  value={Math.min(100, Math.max(0, latenessData.overallAttendanceRate))}
                  unit="%"
                  tooltip="(วันมาทำงานจริงรวม ÷ วันทำงานทั้งหมดรวม) × 100"
                />

                <KpiCard
                  icon={Clock}
                  tone="amber"
                  label="มาสายรวม"
                  value={latenessData.totalLateOccurrences}
                  unit="ครั้ง"
                  tooltip="จำนวนครั้งที่เข้างานสายรวมทุกคนในเดือนนี้"
                />

                <KpiCard
                  icon={AlertTriangle}
                  tone="rose"
                  label="เวลาสายสะสม"
                  value={latenessData.totalLateMinutes.toLocaleString('th-TH')}
                  unit="นาที"
                  tooltip="จำนวนนาทีที่สายรวมกันทั้งหมดในเดือนนี้"
                />
              </KpiGrid>

              {/* Detailed Table per Employee */}
              <ReportTableCard
                searchValue={latenessSearch}
                onSearchChange={(val) => {
                  setLatenessSearch(val);
                  setLatenessPage(1);
                }}
                searchPlaceholder="ค้นหาชื่อ หรือรหัสพนักงาน..."
                refreshing={latenessPhase.refreshing}
                minWidthClassName="min-w-[880px]"
                pagination={{
                  total: filteredLatenessItems.length,
                  page: latenessPage,
                  pageSize: latenessPageSize,
                  onPageChange: setLatenessPage,
                  onPageSizeChange: (newSize) => {
                    setLatenessPageSize(newSize);
                    setLatenessPage(1);
                  },
                  pageSizeOptions: [10, 20, 50, 100],
                }}
              >
                <thead className="bg-primary text-white font-semibold">
                  <tr className="whitespace-nowrap">
                    <th className="py-3.5 px-4 whitespace-nowrap">พนักงาน</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">รหัสพนักงาน</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">แผนก / ตำแหน่ง</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">วันทำงาน</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">มาทำงาน</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">มาสาย</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">ออกก่อน</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">ขาดงาน</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap" style={{ minWidth: 150 }}>
                      อัตราการเข้างาน
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700/60 dark:bg-slate-900">
                  {pagedLatenessItems.length === 0 ? (
                    <TableEmpty colSpan={9} text="ไม่พบข้อมูลพนักงานที่ค้นหา" />
                  ) : (
                    pagedLatenessItems.map((item) => {
                      const rate = Math.min(100, Math.max(0, item.attendanceRate));
                      return (
                        <tr
                          key={item.employeeId}
                          className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/40"
                        >
                          <td className="py-3 px-4 whitespace-nowrap">
                            <AvatarName id={item.employeeId} name={item.employeeName} />
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {item.employeeCode}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {item.departmentName}
                            </div>
                            <div className="text-[11px] text-slate-400">{item.positionName}</div>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {item.totalWorkDays} วัน
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-emerald-600 whitespace-nowrap">
                            {item.presentDays} วัน
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {item.lateDays > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                {item.lateDays} ครั้ง / {item.totalLateMinutes} น.
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {item.earlyLeaveDays > 0 ? (
                              <span className="font-semibold text-orange-600">
                                {item.earlyLeaveDays} ครั้ง ({item.totalEarlyLeaveMinutes} น.)
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {item.absentDays > 0 ? (
                              <span className="rounded-lg bg-rose-50 px-2 py-0.5 font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                                {item.absentDays} วัน
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                <div
                                  className={`h-full rounded-full ${
                                    rate >= 95 ? 'bg-emerald-500' : rate >= 80 ? 'bg-amber-500' : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${rate}%` }}
                                />
                              </div>
                              <span className="w-11 text-right font-extrabold text-slate-900 dark:text-slate-100">
                                {rate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </ReportTableCard>
            </div>
          )}
        </>
      )}

      {mode === 'yearly' && canViewMonthly && (
        <>
          <ReportFilterBar
            loading={isLoadingYearly}
            right={
              canExportMonthly ? (
                <ExportMenu
                  formats={['csv', 'pdf']}
                  onExport={handleExportYearly}
                  disabled={isLoadingYearly || !yearlyData || yearlyData.items.length === 0}
                />
              ) : undefined
            }
          >
            {modeSwitch}

            <CustomSelect
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="min-w-[130px]"
            >
              {getSmartYearRange({ forwardYears: 1, backYears: 5, selectedYear }).map((y) => (
                <option key={y} value={y}>
                  พ.ศ. {y + 543}
                </option>
              ))}
            </CustomSelect>

            <CustomSelect
              value={latenessDepartment}
              onChange={(val) => {
                const parsed = String(val) === 'ALL' ? 'ALL' : Number(val);
                setLatenessDepartment(parsed);
              }}
              placeholder="ทุกแผนก"
              className="min-w-[160px]"
              options={[
                { value: 'ALL', label: 'ทุกแผนก' },
                ...departments.map((dept) => ({ value: dept.id, label: dept.departmentName })),
              ]}
            />

            <IconButton onClick={loadYearlyLateness} title="รีเฟรช">
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingYearly ? 'animate-spin' : ''}`} />
            </IconButton>
          </ReportFilterBar>

          {yearlyPhase.initialLoading && !yearlyData ? (
            <ReportLoading text="กำลังโหลดรายงานการเข้าออกงานรายปี..." />
          ) : !yearlyData || yearlyData.items.length === 0 ? (
            <ReportEmpty text="ไม่พบข้อมูลพนักงานในปีที่เลือก" />
          ) : (
            <div ref={printRef} className="space-y-5">
              {/* 4 KPI Cards */}
              <KpiGrid cols={4}>
                <KpiCard
                  icon={Users}
                  tone="blue"
                  label="พนักงานที่ตรวจสอบ"
                  value={yearlyData.totalAuditedEmployees}
                  unit="คน"
                  tooltip="จำนวนพนักงานทั้งหมดที่นำมาคิดเวลาทำงานในปีนี้"
                />

                <KpiCard
                  icon={CheckCircle2}
                  tone="emerald"
                  label="อัตราการเข้างานเฉลี่ยทั้งปี"
                  value={Math.min(100, Math.max(0, yearlyData.overallAttendanceRate))}
                  unit="%"
                  tooltip="(วันมาทำงานจริงรวมทั้งปี ÷ วันทำงานรวมทั้งปี) × 100"
                />

                <KpiCard
                  icon={Clock}
                  tone="amber"
                  label="มาสายสะสมทั้งปี"
                  value={yearlyData.totalLateOccurrences.toLocaleString('th-TH')}
                  unit="ครั้ง"
                  tooltip="จำนวนครั้งที่เข้างานสายรวมทุกคนตลอดทั้งปี"
                />

                <KpiCard
                  icon={AlertTriangle}
                  tone="rose"
                  label="เวลาสายสะสมทั้งปี"
                  value={yearlyData.totalLateMinutes.toLocaleString('th-TH')}
                  unit="นาที"
                  tooltip="จำนวนนาทีที่สายรวมกันทั้งหมดตลอดทั้งปี"
                />
              </KpiGrid>

              {/* Yearly Table per Employee */}
              <ReportTableCard
                searchValue={yearlySearch}
                onSearchChange={(val) => {
                  setYearlySearch(val);
                  setYearlyPage(1);
                }}
                searchPlaceholder="ค้นหาชื่อ หรือรหัสพนักงาน..."
                refreshing={yearlyPhase.refreshing}
                minWidthClassName="min-w-[880px]"
                pagination={{
                  total: filteredYearlyItems.length,
                  page: yearlyPage,
                  pageSize: yearlyPageSize,
                  onPageChange: setYearlyPage,
                  onPageSizeChange: (newSize) => {
                    setYearlyPageSize(newSize);
                    setYearlyPage(1);
                  },
                  pageSizeOptions: [10, 20, 50, 100],
                }}
              >
                <thead className="bg-primary text-white font-semibold">
                  <tr className="whitespace-nowrap">
                    <th className="py-3.5 px-4 whitespace-nowrap">พนักงาน</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">รหัสพนักงาน</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">แผนก / ตำแหน่ง</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">วันทำงานทั้งปี</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">มาทำงาน</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">มาสายสะสม</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">ออกก่อนสะสม</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">ขาดงานสะสม</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap" style={{ minWidth: 150 }}>
                      อัตราการเข้างาน
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700/60 dark:bg-slate-900">
                  {pagedYearlyItems.length === 0 ? (
                    <TableEmpty colSpan={9} text="ไม่พบข้อมูลพนักงานที่ค้นหา" />
                  ) : (
                    pagedYearlyItems.map((item) => {
                      const rate = Math.min(100, Math.max(0, item.attendanceRate));
                      return (
                        <tr
                          key={item.employeeId}
                          className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/40"
                        >
                          <td className="py-3 px-4 whitespace-nowrap">
                            <AvatarName id={item.employeeId} name={item.employeeName} />
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {item.employeeCode}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {item.departmentName}
                            </div>
                            <div className="text-[11px] text-slate-400">{item.positionName}</div>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {item.totalWorkDays} วัน
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-emerald-600 whitespace-nowrap">
                            {item.presentDays} วัน
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {item.lateDays > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                {item.lateDays} ครั้ง / {item.totalLateMinutes.toLocaleString('th-TH')} น.
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {item.earlyLeaveDays > 0 ? (
                              <span className="font-semibold text-orange-600">
                                {item.earlyLeaveDays} ครั้ง ({item.totalEarlyLeaveMinutes.toLocaleString('th-TH')} น.)
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {item.absentDays > 0 ? (
                              <span className="rounded-lg bg-rose-50 px-2 py-0.5 font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                                {item.absentDays} วัน
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                <div
                                  className={`h-full rounded-full ${
                                    rate >= 95 ? 'bg-emerald-500' : rate >= 80 ? 'bg-amber-500' : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${rate}%` }}
                                />
                              </div>
                              <span className="w-11 text-right font-extrabold text-slate-900 dark:text-slate-100">
                                {rate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </ReportTableCard>
            </div>
          )}
        </>
      )}
    </div>
  );
}

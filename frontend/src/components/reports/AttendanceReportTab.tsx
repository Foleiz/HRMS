'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarX2,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import { useLoadPhase } from '@/hooks/useLoadPhase';
import { RefreshIndicator } from '@/components/ui/RefreshIndicator';
import { CountBadge, TablePagination } from '@/components/ui';
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
import { ColumnChart, DonutChart, VIZ } from './ReportCharts';
import {
  BarList,
  DeltaBadge,
  FilterChip,
  HeroSwitch,
  IconButton,
  InsightBox,
  KpiCard,
  KpiGrid,
  ReportAvatar,
  ReportEmpty,
  ReportFilterBar,
  ReportHero,
  ReportLoading,
  ReportPanel,
} from './ReportShell';

export interface AttendanceReportTabProps {
  canViewDaily: boolean;
  canViewMonthly: boolean;
  canExportDaily: boolean;
  canExportMonthly: boolean;
  initialMode?: 'daily' | 'monthly';
}

const formatThaiDate = (dateStr: string) => fmtThaiDate(dateStr, 'numeric');

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** รายงานการเข้าออกงาน: รวมมุมมองรายวันและรายเดือนในหน้าเดียว */
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

  const [mode, setMode] = useState<'daily' | 'monthly'>(() => {
    if (initialMode === 'monthly' && canViewMonthly) return 'monthly';
    if (canViewDaily) return 'daily';
    return 'monthly';
  });

  useEffect(() => {
    if (initialMode === 'monthly' && canViewMonthly) setMode('monthly');
    else if (initialMode === 'daily' && canViewDaily) setMode('daily');
  }, [initialMode, canViewDaily, canViewMonthly]);

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  // Daily State
  const [selectedDate, setSelectedDate] = useState<string>(localToday);
  const [selectedDivision, setSelectedDivision] = useState<number | 'ALL'>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<number | 'ALL'>('ALL');
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
  const [prevLatenessData, setPrevLatenessData] = useState<MonthlyLatenessReport | null>(null);
  const [latenessPage, setLatenessPage] = useState(1);
  const [latenessPageSize, setLatenessPageSize] = useState(10);
  const [isLoadingLateness, setIsLoadingLateness] = useState(false);
  const latenessPhase = useLoadPhase(isLoadingLateness);
  const [isExportingLateness, setIsExportingLateness] = useState(false);

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
        reportService.getMonthlyLateness(selectedYear, selectedMonth, deptId, latenessSearch.trim() || undefined),
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
  }, [canViewMonthly, selectedYear, selectedMonth, latenessDepartment, latenessSearch]);

  useEffect(() => {
    if (mode === 'daily' && canViewDaily) loadDailyHeadcount();
    else if (mode === 'monthly' && canViewMonthly) loadMonthlyLateness();
  }, [mode, canViewDaily, canViewMonthly, loadDailyHeadcount, loadMonthlyLateness]);

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

  const pagedHeadcountDepts = useMemo(() => {
    if (!headcountData?.departments) return [];
    const start = (headcountPage - 1) * headcountPageSize;
    return headcountData.departments.slice(start, start + headcountPageSize);
  }, [headcountData?.departments, headcountPage, headcountPageSize]);

  const pagedLatenessItems = useMemo(() => {
    if (!latenessData?.items) return [];
    const start = (latenessPage - 1) * latenessPageSize;
    return latenessData.items.slice(start, start + latenessPageSize);
  }, [latenessData?.items, latenessPage, latenessPageSize]);

  // ข้อสังเกตรายวัน
  const dailyInsights = useMemo(() => {
    if (!headcountData) return [];
    const list: React.ReactNode[] = [];
    const rate = Math.min(100, Math.max(0, headcountData.overallAttendanceRate));
    const expected = headcountData.totalExpected ?? headcountData.totalEmployees;
    list.push(
      <>
        อัตราการมาปฏิบัติงานรวมวันนี้ <b>{rate}%</b> (มาทำงาน <b>{headcountData.totalPresent}</b> จากที่ต้องมา{' '}
        <b>{expected} คน</b>)
      </>
    );
    if (headcountData.totalLate > 0) {
      list.push(
        <>
          มีพนักงานมาสาย <b>{headcountData.totalLate} คน</b> และออกก่อนเวลา <b>{headcountData.totalEarlyLeave} คน</b>
        </>
      );
    }
    if (headcountData.totalAbsent > 0) {
      list.push(
        <>
          มีพนักงานขาดงานหรือยังไม่ลงเวลา <b>{headcountData.totalAbsent} คน</b> ควรติดตามตรวจสอบ
        </>
      );
    } else {
      list.push(
        <>
          ไม่มีพนักงานขาดงานในวันที่เลือก (ลาอนุมัติแล้ว <b>{headcountData.totalLeave ?? 0} คน</b>)
        </>
      );
    }
    return list.slice(0, 3);
  }, [headcountData]);

  // ข้อสังเกตรายเดือน
  const monthlyInsights = useMemo(() => {
    if (!latenessData) return [];
    const list: React.ReactNode[] = [];
    const rate = Math.min(100, Math.max(0, latenessData.overallAttendanceRate));
    list.push(
      <>
        อัตราการมาทำงานเฉลี่ยทั้งเดือน <b>{rate}%</b> จากพนักงานที่ตรวจสอบทั้งหมด{' '}
        <b>{latenessData.totalAuditedEmployees} คน</b>
      </>
    );
    const latePeople = latenessData.items.filter((i) => i.lateDays > 0);
    if (latePeople.length > 0) {
      const frequent = latePeople.filter((i) => i.lateDays >= 3);
      list.push(
        <>
          มีพนักงานมาสายรวม <b>{latePeople.length} คน</b> ({latenessData.totalLateOccurrences} ครั้ง) โดยมาสายตั้งแต่ 3 ครั้งขึ้นไป{' '}
          <b>{frequent.length} คน</b>
        </>
      );
    } else {
      list.push(<>ไม่มีประวัติพนักงานมาสายในเดือนที่เลือก</>);
    }
    const absentPeople = latenessData.items.filter((i) => i.absentDays > 0);
    if (absentPeople.length > 0) {
      const totalAbsentDays = absentPeople.reduce((s, x) => s + x.absentDays, 0);
      list.push(
        <>
          พบรายการขาดงานรวม <b>{totalAbsentDays} วัน</b> จากพนักงาน <b>{absentPeople.length} คน</b>
        </>
      );
    }
    return list.slice(0, 3);
  }, [latenessData]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <ReportHero
        theme="attendance"
        icon={CalendarCheck}
        title="รายงานการเข้าออกงาน"
        description={
          mode === 'daily'
            ? 'ติดตามสถานะการมาทำงาน มาสาย ขาดงาน และวันลาของแต่ละแผนกแบบรายวัน'
            : 'สรุปสถิติเวลาทำงาน การมาสาย ออกก่อน และขาดงานรายบุคคลตลอดทั้งเดือน'
        }
        actions={
          canViewDaily && canViewMonthly ? (
            <HeroSwitch
              value={mode}
              onChange={setMode}
              options={[
                { value: 'daily', label: 'รายวัน' },
                { value: 'monthly', label: 'รายเดือน' },
              ]}
            />
          ) : undefined
        }
      />

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
            <FilterChip icon={Calendar} label="วันที่:">
              <ThaiDatePicker
                value={selectedDate}
                onChange={setSelectedDate}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none dark:text-slate-200"
              />
            </FilterChip>

            <FilterChip icon={Building2} label="ฝ่าย:">
              <CustomSelect
                value={selectedDivision}
                onChange={(val) => {
                  const parsed = String(val) === 'ALL' ? 'ALL' : Number(val);
                  setSelectedDivision(parsed);
                  setSelectedDepartment('ALL');
                }}
                placeholder="ฝ่ายทั้งหมด"
                className="min-w-[145px] bg-transparent text-xs font-semibold text-slate-700 focus:outline-none dark:text-slate-200"
                options={[
                  { value: 'ALL', label: 'ฝ่ายทั้งหมด' },
                  ...divisions.map((div) => ({ value: div.id, label: div.divisionName })),
                ]}
              />
            </FilterChip>

            <FilterChip label="แผนก:">
              <CustomSelect
                value={selectedDepartment}
                onChange={(val) => {
                  const parsed = String(val) === 'ALL' ? 'ALL' : Number(val);
                  setSelectedDepartment(parsed);
                }}
                placeholder="แผนกทั้งหมด"
                className="min-w-[145px] bg-transparent text-xs font-semibold text-slate-700 focus:outline-none dark:text-slate-200"
                options={[
                  { value: 'ALL', label: 'แผนกทั้งหมด' },
                  ...departments
                    .filter((dept) => selectedDivision === 'ALL' || dept.divisionId === selectedDivision)
                    .map((dept) => ({ value: dept.id, label: dept.departmentName })),
                ]}
              />
            </FilterChip>

            <IconButton onClick={loadDailyHeadcount} title="รีเฟรชข้อมูล">
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
                  note={`ต้องมาทำงาน ${headcountData.totalExpected ?? headcountData.totalEmployees} คน`}
                />
                <KpiCard
                  icon={CheckCircle2}
                  tone="emerald"
                  label="มาปฏิบัติงาน"
                  value={headcountData.totalPresent}
                  unit="คน"
                  delta={
                    <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                      {Math.min(100, Math.max(0, headcountData.overallAttendanceRate))}%
                    </span>
                  }
                  note={`สาย ${headcountData.totalLate} · ออกก่อน ${headcountData.totalEarlyLeave}`}
                />
                <KpiCard
                  icon={Clock}
                  tone="amber"
                  label="มาสาย"
                  value={headcountData.totalLate}
                  unit="คน"
                  note="นับรวมในมาปฏิบัติงาน"
                />
                <KpiCard
                  icon={AlertTriangle}
                  tone="rose"
                  label="ขาด / ยังไม่ลงเวลา"
                  value={headcountData.totalAbsent}
                  unit="คน"
                  note={headcountData.totalAbsent > 0 ? 'ควรตรวจสอบรายชื่อ' : 'ครบถ้วน'}
                />
                <KpiCard
                  icon={CalendarX2}
                  tone="violet"
                  label="ลา / วันหยุด"
                  value={(headcountData.totalLeave ?? 0) + (headcountData.totalOff ?? 0)}
                  unit="คน"
                  note={`ลา ${headcountData.totalLeave ?? 0} · หยุด ${headcountData.totalOff ?? 0}`}
                />
              </KpiGrid>

              {/* แจ้งเตือนเมื่อยังไม่มีใครลงเวลา */}
              {headcountData.totalPresent === 0 &&
                (headcountData.totalExpected ?? headcountData.totalEmployees) > 0 && (
                  <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    วันที่ {formatThaiDate(selectedDate)} ยังไม่มีการลงเวลาทำงานในระบบ — หากเป็นวันที่ผ่านมาแล้ว โปรดตรวจสอบการนำเข้าข้อมูลเวลาสแกนนิ้ว
                  </div>
                )}

              <InsightBox theme="attendance" items={dailyInsights} />

              {/* Chart Row: 100% Stacked Bars per Dept + Overall Donut */}
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <ReportPanel
                  title="สัดส่วนสถานะการมาทำงานแต่ละแผนก"
                  subtitle="แถบสี 100% แสดงสัดส่วน มาปกติ · มาสาย · ขาด · ลา/วันหยุด ของแต่ละแผนก"
                  className="xl:col-span-2"
                >
                  <div className="mb-3 flex flex-wrap gap-4 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    {[
                      ['มาปกติ', '#10b981'],
                      ['มาสาย', '#f59e0b'],
                      ['ขาดงาน', '#ef4444'],
                      ['ลา / วันหยุด', '#a78bfa'],
                    ].map((lg) => (
                      <span key={lg[0]} className="inline-flex items-center gap-1.5">
                        <i className="h-2.5 w-2.5 rounded-full" style={{ background: lg[1] }} />
                        {lg[0]}
                      </span>
                    ))}
                  </div>
                  <div className="space-y-3.5">
                    {headcountData.departments.map((d) => {
                      const tot = Math.max(d.totalHeadcount, 1);
                      const onTime = Math.max(0, d.presentCount - d.lateCount);
                      const leaveOff = (d.leaveCount ?? 0) + (d.offCount ?? 0);
                      const rate = Math.min(100, Math.max(0, d.attendanceRate));
                      return (
                        <div key={d.departmentId}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                              {d.departmentName}
                              <span className="ml-1.5 font-normal text-slate-400">({d.totalHeadcount} คน)</span>
                            </span>
                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{rate}%</span>
                          </div>
                          <div className="flex h-3.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                            {[
                              { val: onTime, color: '#10b981', label: `มาปกติ ${onTime} คน` },
                              { val: d.lateCount, color: '#f59e0b', label: `มาสาย ${d.lateCount} คน` },
                              { val: d.absentCount, color: '#ef4444', label: `ขาดงาน ${d.absentCount} คน` },
                              { val: leaveOff, color: '#a78bfa', label: `ลา/วันหยุด ${leaveOff} คน` },
                            ].map((seg) =>
                              seg.val > 0 ? (
                                <div
                                  key={seg.label}
                                  title={`${d.departmentName} · ${seg.label}`}
                                  className="h-full transition-all duration-500"
                                  style={{ width: `${(seg.val / tot) * 100}%`, background: seg.color }}
                                />
                              ) : null
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ReportPanel>

                <ReportPanel title="ภาพรวมสถานะวันนี้" subtitle="สัดส่วนพนักงานทั้งหมดในวันที่เลือก">
                  <DonutChart
                    size={150}
                    centerLabel="มาทำงาน"
                    segments={[
                      {
                        key: 'ok',
                        label: 'มาปกติ',
                        value: Math.max(0, headcountData.totalPresent - headcountData.totalLate),
                        color: '#10b981',
                      },
                      { key: 'late', label: 'มาสาย', value: headcountData.totalLate, color: '#f59e0b' },
                      { key: 'absent', label: 'ขาดงาน', value: headcountData.totalAbsent, color: '#ef4444' },
                      {
                        key: 'leave',
                        label: 'ลา / วันหยุด',
                        value: (headcountData.totalLeave ?? 0) + (headcountData.totalOff ?? 0),
                        color: '#a78bfa',
                      },
                    ]}
                  />
                </ReportPanel>
              </div>

              {/* Department Table */}
              <ReportPanel
                title="ตารางสรุปอัตรากำลังคนจำแนกตามแผนก"
                subtitle={`ข้อมูลประจำวันที่ ${formatThaiDate(selectedDate)}`}
                right={<CountBadge count={headcountData.departments.length} />}
              >
                <RefreshIndicator active={headcountPhase.refreshing} />
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full min-w-[960px] text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 font-bold text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
                      <tr>
                        <th className="py-3 px-4">แผนก / ฝ่าย</th>
                        <th className="py-3 px-4 text-center">พนักงานทั้งหมด</th>
                        <th className="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400">มาทำงาน</th>
                        <th className="py-3 px-4 text-center text-amber-600 dark:text-amber-400">มาสาย</th>
                        <th className="py-3 px-4 text-center text-orange-600 dark:text-orange-400">ออกก่อน</th>
                        <th className="py-3 px-4 text-center text-violet-600 dark:text-violet-400">ลา</th>
                        <th className="py-3 px-4 text-center">วันหยุด</th>
                        <th className="py-3 px-4 text-center text-rose-600 dark:text-rose-400">ขาดงาน</th>
                        <th className="py-3 px-4 text-right" style={{ minWidth: 150 }}>
                          อัตราการเข้างาน
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {pagedHeadcountDepts.map((dept) => {
                        const rate = Math.min(100, Math.max(0, dept.attendanceRate));
                        return (
                          <tr key={dept.departmentId} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900 dark:text-slate-100">
                                {dept.departmentName}
                                <span className="ml-1.5 font-mono text-[11px] font-normal text-slate-400">
                                  ({dept.departmentCode})
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400">{dept.divisionName}</div>
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                              {dept.totalHeadcount}
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-emerald-600">{dept.presentCount}</td>
                            <td className="py-3 px-4 text-center font-semibold text-amber-600">{dept.lateCount}</td>
                            <td className="py-3 px-4 text-center font-semibold text-orange-600">
                              {dept.earlyLeaveCount}
                            </td>
                            <td className="py-3 px-4 text-center font-semibold text-violet-600">
                              {dept.leaveCount ?? 0}
                            </td>
                            <td className="py-3 px-4 text-center text-slate-500">{dept.offCount ?? 0}</td>
                            <td className="py-3 px-4 text-center font-semibold text-rose-600">{dept.absentCount}</td>
                            <td className="py-3 px-4">
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
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4">
                  <TablePagination
                    total={headcountData.departments.length}
                    page={headcountPage}
                    pageSize={headcountPageSize}
                    onPageChange={setHeadcountPage}
                    onPageSizeChange={(newSize) => {
                      setHeadcountPageSize(newSize);
                      setHeadcountPage(1);
                    }}
                    pageSizeOptions={[10, 20, 50, 100]}
                  />
                </div>
              </ReportPanel>
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
            <div className="relative w-full sm:w-60">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ หรือรหัสพนักงาน..."
                value={latenessSearch}
                onChange={(e) => setLatenessSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:border-primary focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <FilterChip icon={Calendar} label="เดือน:">
              <CustomSelect
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none dark:text-slate-200"
              >
                {TH_MONTHS.map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </CustomSelect>
            </FilterChip>

            <FilterChip label="ปี:">
              <CustomSelect
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none dark:text-slate-200"
              >
                {getSmartYearRange({ forwardYears: 1, backYears: 5, selectedYear }).map((y) => (
                  <option key={y} value={y}>
                    พ.ศ. {y + 543}
                  </option>
                ))}
              </CustomSelect>
            </FilterChip>

            <FilterChip icon={Building2} label="แผนก:">
              <CustomSelect
                value={latenessDepartment}
                onChange={(val) => {
                  const parsed = String(val) === 'ALL' ? 'ALL' : Number(val);
                  setLatenessDepartment(parsed);
                }}
                placeholder="แผนกทั้งหมด"
                className="min-w-[145px] bg-transparent text-xs font-semibold text-slate-700 focus:outline-none dark:text-slate-200"
                options={[
                  { value: 'ALL', label: 'แผนกทั้งหมด' },
                  ...departments.map((dept) => ({ value: dept.id, label: dept.departmentName })),
                ]}
              />
            </FilterChip>

            <IconButton onClick={loadMonthlyLateness} title="รีเฟรชข้อมูล">
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
                  note={`เดือน${TH_MONTHS[selectedMonth - 1]} ${selectedYear + 543}`}
                />

                <KpiCard
                  icon={CheckCircle2}
                  tone="emerald"
                  label="อัตราการเข้างานเฉลี่ย"
                  value={Math.min(100, Math.max(0, latenessData.overallAttendanceRate))}
                  unit="%"
                  delta={
                    prevLatenessData && prevLatenessData.totalAuditedEmployees > 0 ? (
                      <DeltaBadge
                        delta={latenessData.overallAttendanceRate - prevLatenessData.overallAttendanceRate}
                        unit="%"
                      />
                    ) : undefined
                  }
                  note={prevLatenessData ? 'เทียบเดือนก่อนหน้า' : 'ค่าเฉลี่ยทั้งเดือน'}
                />

                <KpiCard
                  icon={Clock}
                  tone="amber"
                  label="มาสายรวม"
                  value={latenessData.totalLateOccurrences}
                  unit="ครั้ง"
                  delta={
                    prevLatenessData && prevLatenessData.totalAuditedEmployees > 0 ? (
                      <DeltaBadge
                        delta={latenessData.totalLateOccurrences - prevLatenessData.totalLateOccurrences}
                        unit=" ครั้ง"
                        invert
                      />
                    ) : undefined
                  }
                  note={prevLatenessData ? 'เทียบเดือนก่อนหน้า' : 'รวมทุกแผนก'}
                />

                <KpiCard
                  icon={AlertTriangle}
                  tone="rose"
                  label="เวลาสายสะสม"
                  value={latenessData.totalLateMinutes.toLocaleString('th-TH')}
                  unit="นาที"
                  note={
                    latenessData.totalLateOccurrences > 0
                      ? `เฉลี่ย ${Math.round(latenessData.totalLateMinutes / latenessData.totalLateOccurrences)} นาที/ครั้ง`
                      : 'ไม่มีเวลาสายสะสม'
                  }
                />
              </KpiGrid>

              <InsightBox theme="attendance" items={monthlyInsights} />

              {/* Chart Row: Top 10 ColumnChart + Top 5 BarList */}
              {latenessData.items.some((i) => i.lateDays > 0) && (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  <ReportPanel
                    title="10 อันดับพนักงานที่มาสายบ่อยที่สุด"
                    subtitle="เรียงตามจำนวนครั้ง แล้วตามนาทีรวม · ชี้เพื่อดูรายละเอียด"
                    className="xl:col-span-2"
                  >
                    <ColumnChart
                      color={VIZ.s2}
                      unit="ครั้ง"
                      items={[...latenessData.items]
                        .filter((i) => i.lateDays > 0)
                        .sort((a, b) => b.lateDays - a.lateDays || b.totalLateMinutes - a.totalLateMinutes)
                        .slice(0, 10)
                        .map((i) => ({
                          id: i.employeeId,
                          label: i.employeeName.replace(/^(นาย|นางสาว|นาง|น\.ส\.)\s*/, ''),
                          sub: i.departmentName,
                          value: i.lateDays,
                          valueLabel: `${i.lateDays} ครั้ง`,
                          tip: (
                            <div>
                              <div className="font-semibold text-slate-900">{i.employeeName}</div>
                              <div className="text-slate-500">
                                {i.departmentName} · {i.positionName}
                              </div>
                              <div className="mt-1">
                                มาสาย {i.lateDays} ครั้ง รวม {i.totalLateMinutes} นาที
                              </div>
                              <div>
                                ขาดงาน {i.absentDays} วัน · ออกก่อน {i.earlyLeaveDays} ครั้ง
                              </div>
                            </div>
                          ),
                        }))}
                    />
                  </ReportPanel>

                  <ReportPanel title="Top 5 เวลาสายสะสมสูงสุด" subtitle="เรียงตามจำนวนนาทีที่สายรวมในเดือนนี้">
                    <BarList
                      color="#f59e0b"
                      items={[...latenessData.items]
                        .filter((i) => i.totalLateMinutes > 0)
                        .sort((a, b) => b.totalLateMinutes - a.totalLateMinutes)
                        .slice(0, 5)
                        .map((i) => ({
                          label: i.employeeName.replace(/^(นาย|นางสาว|นาง|น\.ส\.)\s*/, ''),
                          sub: `(${i.lateDays} ครั้ง)`,
                          value: i.totalLateMinutes,
                          display: `${i.totalLateMinutes} นาที`,
                        }))}
                    />
                  </ReportPanel>
                </div>
              )}

              {/* Detailed Table per Employee */}
              <ReportPanel
                title="ตารางสรุปเวลาทำงานและการมาสายรายบุคคล"
                subtitle={`ประจำเดือน${TH_MONTHS[selectedMonth - 1]} พ.ศ. ${selectedYear + 543}`}
                right={<CountBadge count={latenessData.items.length} />}
              >
                <RefreshIndicator active={latenessPhase.refreshing} />
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full min-w-[860px] text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 font-bold text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
                      <tr>
                        <th className="py-3 px-4">พนักงาน</th>
                        <th className="py-3 px-4">แผนก / ตำแหน่ง</th>
                        <th className="py-3 px-4 text-center">วันทำงาน</th>
                        <th className="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400">มาทำงาน</th>
                        <th className="py-3 px-4 text-center text-amber-600 dark:text-amber-400">มาสาย</th>
                        <th className="py-3 px-4 text-center text-orange-600 dark:text-orange-400">ออกก่อน</th>
                        <th className="py-3 px-4 text-center text-rose-600 dark:text-rose-400">ขาดงาน</th>
                        <th className="py-3 px-4 text-right" style={{ minWidth: 150 }}>
                          อัตราการเข้างาน
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {pagedLatenessItems.map((item) => {
                        const rate = Math.min(100, Math.max(0, item.attendanceRate));
                        return (
                          <tr key={item.employeeId} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <ReportAvatar name={item.employeeName} size={28} />
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-slate-100">{item.employeeName}</div>
                                  <div className="font-mono text-[11px] text-slate-400">รหัส {item.employeeCode}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {item.departmentName}
                              </div>
                              <div className="text-[11px] text-slate-400">{item.positionName}</div>
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                              {item.totalWorkDays} วัน
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-emerald-600">{item.presentDays} วัน</td>
                            <td className="py-3 px-4 text-center">
                              {item.lateDays > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                  {item.lateDays} ครั้ง / {item.totalLateMinutes} น.
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {item.earlyLeaveDays > 0 ? (
                                <span className="font-semibold text-orange-600">
                                  {item.earlyLeaveDays} ครั้ง ({item.totalEarlyLeaveMinutes} น.)
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {item.absentDays > 0 ? (
                                <span className="rounded-lg bg-rose-50 px-2 py-0.5 font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                                  {item.absentDays} วัน
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
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
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4">
                  <TablePagination
                    total={latenessData.items.length}
                    page={latenessPage}
                    pageSize={latenessPageSize}
                    onPageChange={setLatenessPage}
                    onPageSizeChange={(newSize) => {
                      setLatenessPageSize(newSize);
                      setLatenessPage(1);
                    }}
                    pageSizeOptions={[10, 20, 50, 100]}
                  />
                </div>
              </ReportPanel>
            </div>
          )}
        </>
      )}
    </div>
  );
}

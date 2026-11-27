'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  FileSpreadsheet,
  RefreshCw,
  Users,
} from 'lucide-react';
import { leaveInsightsService } from '@/services/leaveInsightsService';
import { reportService } from '@/services/reportService';
import { organizationService } from '@/services/organizationService';
import { Department } from '@/types/organization';
import { LeaveCalendarItem } from '@/types/leaveInsights';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';
import { getSmartYearRange } from '@/lib/yearUtils';
import { TH_MONTHS, formatThaiDate as fmtThaiDate } from '@/lib/thaiDate';
import ExportMenu, { ReportExportFormat } from './ExportMenu';
import { printReport } from '@/lib/printReport';
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

interface Props {
  canExport: boolean;
  onError: (message: string) => void;
}

interface EmployeeLeaveSummaryRow {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  positionName: string;
  approvedRequests: number;
  pendingRequests: number;
  approvedDays: number;
  byTypeText: string;
}

const fmt = (n: number) => n.toLocaleString('th-TH', { maximumFractionDigits: 2 });

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const pad2 = (n: number) => String(n).padStart(2, '0');

/** แท็บรายงานการลา: แสดงเฉพาะแดชบอร์ดและตารางข้อมูลพนักงานทั้งหมดตามแผนกที่เลือก */
export default function LeaveSummaryReportTab({ canExport, onError }: Props) {
  const now = new Date();
  const [mode, setMode] = useState<'daily' | 'monthly' | 'yearly'>('yearly');
  const [selectedDate, setSelectedDate] = useState<string>(localToday);
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [summaryStats, setSummaryStats] = useState<{
    totalDays: number;
    totalRequests: number;
    employeesOnLeave: number;
    pendingRequests: number;
    employees: EmployeeLeaveSummaryRow[];
  } | null>(null);

  const [empSearch, setEmpSearch] = useState('');
  const [empPage, setEmpPage] = useState(1);
  const [empPageSize, setEmpPageSize] = useState(10);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    organizationService
      .getDepartments()
      .then((d) => active && setDepartments(d))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const deptParam = departmentId === '' ? undefined : departmentId;
      let from = `${year}-01-01`;
      let to = `${year}-12-31`;

      if (mode === 'daily') {
        from = selectedDate;
        to = selectedDate;
      } else if (mode === 'monthly') {
        const lastDay = new Date(year, month, 0).getDate();
        from = `${year}-${pad2(month)}-01`;
        to = `${year}-${pad2(month)}-${pad2(lastDay)}`;
      }

      const [deptReport, calResult] = await Promise.all([
        reportService.getEmployeesByDepartment(undefined, deptParam),
        leaveInsightsService.getCalendar({
          from,
          to,
          departmentId: deptParam,
          includePending: true,
        }),
      ]);

      const leaveItems: LeaveCalendarItem[] = calResult.items ?? [];
      const approvedItems = leaveItems.filter((i) => i.status === 'APPROVED');
      const pendingItems = leaveItems.filter((i) => i.status !== 'APPROVED');

      const totalDays = approvedItems.reduce((s, i) => s + (Number(i.leaveDays) || 0), 0);
      const totalRequests = approvedItems.length;
      const employeesOnLeave = new Set(approvedItems.map((i) => i.employeeId)).size;
      const pendingRequests = pendingItems.length;

      // รวบรวมรายชื่อพนักงานทั้งหมดจากแผนกที่เลือก
      const empMap = new Map<
        number,
        {
          employeeId: number;
          employeeCode: string;
          employeeName: string;
          departmentName: string;
          positionName: string;
          approvedRequests: number;
          pendingRequests: number;
          approvedDays: number;
          typeDays: Map<string, number>;
        }
      >();

      for (const dept of deptReport.departments) {
        for (const emp of dept.employees) {
          empMap.set(emp.employeeId, {
            employeeId: emp.employeeId,
            employeeCode: emp.employeeCode,
            employeeName: emp.employeeName,
            departmentName: dept.departmentName,
            positionName: emp.positionName || '-',
            approvedRequests: 0,
            pendingRequests: 0,
            approvedDays: 0,
            typeDays: new Map<string, number>(),
          });
        }
      }

      // เติมข้อมูลการลาของพนักงานแต่ละคน
      for (const it of leaveItems) {
        let rec = empMap.get(it.employeeId);
        if (!rec) {
          rec = {
            employeeId: it.employeeId,
            employeeCode: it.employeeCode,
            employeeName: it.employeeName,
            departmentName: it.departmentName || 'ไม่ระบุแผนก',
            positionName: '-',
            approvedRequests: 0,
            pendingRequests: 0,
            approvedDays: 0,
            typeDays: new Map<string, number>(),
          };
          empMap.set(it.employeeId, rec);
        }

        if (it.status === 'APPROVED') {
          const d = Number(it.leaveDays) || 0;
          rec.approvedRequests += 1;
          rec.approvedDays += d;
          const tName = it.leaveTypeName || 'อื่นๆ';
          rec.typeDays.set(tName, (rec.typeDays.get(tName) ?? 0) + d);
        } else {
          rec.pendingRequests += 1;
        }
      }

      const employees: EmployeeLeaveSummaryRow[] = Array.from(empMap.values())
        .map((r) => ({
          employeeId: r.employeeId,
          employeeCode: r.employeeCode,
          employeeName: r.employeeName,
          departmentName: r.departmentName,
          positionName: r.positionName,
          approvedRequests: r.approvedRequests,
          pendingRequests: r.pendingRequests,
          approvedDays: r.approvedDays,
          byTypeText:
            r.typeDays.size > 0
              ? Array.from(r.typeDays.entries())
                  .map(([k, v]) => `${k} ${fmt(v)} วัน`)
                  .join(' · ')
              : '-',
        }))
        .sort((a, b) => b.approvedDays - a.approvedDays || a.employeeCode.localeCompare(b.employeeCode, 'th'));

      setSummaryStats({
        totalDays,
        totalRequests,
        employeesOnLeave,
        pendingRequests,
        employees,
      });
      setEmpPage(1);
    } catch (e: unknown) {
      setFailed(true);
      onError((e as { message?: string })?.message || 'โหลดรายงานการลาไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [mode, selectedDate, month, year, departmentId, onError]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredEmployees = useMemo(() => {
    if (!summaryStats) return [];
    const q = empSearch.trim().toLowerCase();
    if (!q) return summaryStats.employees;
    return summaryStats.employees.filter(
      (e) =>
        e.employeeName.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        e.departmentName.toLowerCase().includes(q) ||
        e.positionName.toLowerCase().includes(q) ||
        e.byTypeText.toLowerCase().includes(q)
    );
  }, [summaryStats, empSearch]);

  const pagedEmployees = useMemo(() => {
    const start = (empPage - 1) * empPageSize;
    return filteredEmployees.slice(start, start + empPageSize);
  }, [filteredEmployees, empPage, empPageSize]);

  const periodSubtitle =
    mode === 'daily'
      ? `วันที่ ${fmtThaiDate(selectedDate, 'numeric')}`
      : mode === 'monthly'
        ? `เดือน ${TH_MONTHS[month - 1]} พ.ศ. ${year + 543}`
        : `ปี พ.ศ. ${year + 543}`;

  const handleExport = async (format: ReportExportFormat = 'csv') => {
    if (format === 'pdf') {
      printReport(rootRef.current, { title: 'รายงานการลา', subtitle: periodSubtitle });
      return;
    }
    if (!summaryStats) return;
    setExporting(true);
    try {
      const headers = [
        'รหัสพนักงาน',
        'ชื่อ-นามสกุล',
        'แผนก',
        'ตำแหน่ง',
        'รายละเอียดประเภทการลา',
        'ใบลาอนุมัติ (ใบ)',
        'รออนุมัติ (ใบ)',
        'วันลารวม (วัน)',
      ];
      const rows = filteredEmployees.map((e) => [
        e.employeeCode,
        e.employeeName,
        e.departmentName,
        e.positionName,
        e.byTypeText,
        e.approvedRequests,
        e.pendingRequests,
        e.approvedDays,
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
      link.setAttribute(
        'download',
        mode === 'daily'
          ? `Leave_Daily_${selectedDate}.csv`
          : mode === 'monthly'
            ? `Leave_Monthly_${year + 543}_${pad2(month)}.csv`
            : `Leave_Yearly_${year + 543}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(href);
    } finally {
      setExporting(false);
    }
  };

  const modeSwitch = (
    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-900">
      {(
        [
          { key: 'daily', label: 'รายวัน' },
          { key: 'monthly', label: 'รายเดือน' },
          { key: 'yearly', label: 'รายปี' },
        ] as const
      ).map((m) => (
        <button
          key={m.key}
          type="button"
          onClick={() => setMode(m.key)}
          className={`rounded-lg px-3.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
            mode === m.key
              ? 'bg-primary text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <ReportFilterBar
        loading={loading}
        right={
          canExport ? (
            <ExportMenu
              formats={['csv', 'pdf']}
              onExport={handleExport}
              disabled={exporting || !summaryStats || summaryStats.employees.length === 0}
            />
          ) : undefined
        }
      >
        {modeSwitch}

        {mode === 'daily' && (
          <ThaiDatePicker
            value={selectedDate}
            onChange={setSelectedDate}
            className="w-[140px] shrink-0"
            buttonClassName="h-9 !py-0 !px-3 !text-xs !rounded-xl shadow-2xs"
          />
        )}

        {mode === 'monthly' && (
          <CustomSelect
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="min-w-[140px]"
          >
            {TH_MONTHS.map((m, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {m}
              </option>
            ))}
          </CustomSelect>
        )}

        {(mode === 'monthly' || mode === 'yearly') && (
          <CustomSelect
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="min-w-[130px]"
          >
            {getSmartYearRange({ forwardYears: 1, backYears: 5, selectedYear: year }).map((y) => (
              <option key={y} value={y}>
                พ.ศ. {y + 543}
              </option>
            ))}
          </CustomSelect>
        )}

        <CustomSelect
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value === '' ? '' : Number(e.target.value))}
          className="min-w-[160px]"
        >
          <option value="">ทุกแผนก</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.departmentName}
            </option>
          ))}
        </CustomSelect>

        <IconButton onClick={load} title="รีเฟรช">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </IconButton>
      </ReportFilterBar>

      {loading && !summaryStats ? (
        <ReportLoading />
      ) : !summaryStats ? (
        <ReportEmpty
          text={
            failed
              ? 'คุณไม่มีสิทธิ์เข้าถึงรายงานการลา หรือโหลดข้อมูลไม่สำเร็จ'
              : 'ไม่มีข้อมูลรายงานการลาในช่วงเวลาที่เลือก'
          }
        />
      ) : (
        <div ref={rootRef} className="space-y-5">
          {/* KPI Cards */}
          <KpiGrid cols={4}>
            <KpiCard
              icon={CalendarDays}
              tone="violet"
              label="วันลารวม (อนุมัติแล้ว)"
              value={fmt(summaryStats.totalDays)}
              unit="วัน"
              tooltip="ผลรวมวันลาจากใบลาที่อนุมัติแล้วในช่วงที่เลือก"
            />

            <KpiCard
              icon={FileSpreadsheet}
              tone="blue"
              label="จำนวนใบลา"
              value={fmt(summaryStats.totalRequests)}
              unit="ใบ"
              tooltip="จำนวนใบลาที่อนุมัติแล้วทั้งหมดในช่วงที่เลือก"
            />

            <KpiCard
              icon={Users}
              tone="emerald"
              label="พนักงานที่ลา"
              value={fmt(summaryStats.employeesOnLeave)}
              unit="คน"
              tooltip="จำนวนพนักงานที่มีการลาในช่วงที่เลือก (นับไม่ซ้ำคน)"
            />

            <KpiCard
              icon={AlertTriangle}
              tone="amber"
              label="รออนุมัติ"
              value={fmt(summaryStats.pendingRequests)}
              unit="ใบ"
              tooltip="จำนวนใบลาที่ยังรอหัวหน้างานอนุมัติ"
            />
          </KpiGrid>

          {/* All Employees Leave Table */}
          <ReportTableCard
            searchValue={empSearch}
            onSearchChange={(val) => {
              setEmpSearch(val);
              setEmpPage(1);
            }}
            searchPlaceholder="ค้นหาชื่อ รหัสพนักงาน แผนก หรือประเภทการลา..."
            refreshing={loading}
            minWidthClassName="min-w-[880px]"
            pagination={{
              total: filteredEmployees.length,
              page: empPage,
              pageSize: empPageSize,
              onPageChange: setEmpPage,
              onPageSizeChange: (newSize) => {
                setEmpPageSize(newSize);
                setEmpPage(1);
              },
              pageSizeOptions: [10, 20, 50, 100],
            }}
          >
            <thead className="bg-primary text-white font-semibold">
              <tr className="whitespace-nowrap">
                <th className="py-3.5 px-4 text-left whitespace-nowrap">พนักงาน</th>
                <th className="py-3.5 px-4 text-left whitespace-nowrap">รหัสพนักงาน</th>
                <th className="py-3.5 px-4 text-left whitespace-nowrap">แผนก / ตำแหน่ง</th>
                <th className="py-3.5 px-4 text-left whitespace-nowrap">ประเภทการลาที่ใช้</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">ใบลาอนุมัติ</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">รออนุมัติ</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap" style={{ minWidth: 160 }}>
                  วันลารวม
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700/60 dark:bg-slate-900">
              {pagedEmployees.length === 0 ? (
                <TableEmpty colSpan={7} text="ไม่พบข้อมูลพนักงานตามตัวกรองที่เลือก" />
              ) : (
                (() => {
                  const maxEmpDays = Math.max(...summaryStats.employees.map((x) => x.approvedDays), 1);
                  return pagedEmployees.map((e) => (
                    <tr
                      key={e.employeeId}
                      className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/40"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <AvatarName id={e.employeeId} name={e.employeeName} />
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {e.employeeCode}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{e.departmentName}</div>
                        <div className="text-[11px] text-slate-400">{e.positionName}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {e.byTypeText}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {e.approvedRequests > 0 ? `${e.approvedRequests} ใบ` : '-'}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {e.pendingRequests > 0 ? (
                          <span className="inline-flex rounded-lg bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                            {e.pendingRequests} ใบ
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2.5">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                            <div
                              className="h-full rounded-full bg-violet-600"
                              style={{ width: `${e.approvedDays > 0 ? (e.approvedDays / maxEmpDays) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="w-14 text-right font-extrabold text-slate-900 dark:text-slate-100">
                            {fmt(e.approvedDays)} วัน
                          </span>
                        </div>
                      </td>
                    </tr>
                  ));
                })()
              )}
            </tbody>
          </ReportTableCard>
        </div>
      )}
    </div>
  );
}

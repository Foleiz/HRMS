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
import { organizationService } from '@/services/organizationService';
import { Department } from '@/types/organization';
import { LeaveCalendarItem, LeaveReportCell, LeaveReportRow, LeaveReportTopEmployee, LeaveSummaryReport } from '@/types/leaveInsights';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';
import { getSmartYearRange } from '@/lib/yearUtils';
import { TH_MONTHS, formatThaiDate as fmtThaiDate } from '@/lib/thaiDate';
import ExportMenu, { ReportExportFormat } from './ExportMenu';
import { DonutChart, toSegments } from './ReportCharts';
import { printReport } from '@/lib/printReport';
import {
  AvatarName,
  BarList,
  IconButton,
  KpiCard,
  KpiGrid,
  MiniColumns,
  ReportEmpty,
  ReportFilterBar,
  ReportLoading,
  ReportPanel,
  ReportTableCard,
  TableEmpty,
} from './ReportShell';

interface Props {
  canExport: boolean;
  onError: (message: string) => void;
}

const fmt = (n: number) => n.toLocaleString('th-TH', { maximumFractionDigits: 2 });

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const pad2 = (n: number) => String(n).padStart(2, '0');

function buildSummaryFromCalendar(items: LeaveCalendarItem[], year: number): LeaveSummaryReport {
  const approved = items.filter((i) => i.status === 'APPROVED');
  const pendingRequests = items.filter((i) => i.status !== 'APPROVED').length;
  const totalDays = approved.reduce((s, i) => s + (Number(i.leaveDays) || 0), 0);
  const totalRequests = approved.length;
  const employeesOnLeave = new Set(approved.map((i) => i.employeeId)).size;

  const typeMap = new Map<string, { days: number; requests: number; empSet: Set<number> }>();
  const deptMap = new Map<string, { days: number; requests: number; empSet: Set<number> }>();
  const cellMap = new Map<string, number>();
  const empMap = new Map<number, LeaveReportTopEmployee>();

  for (const it of approved) {
    const days = Number(it.leaveDays) || 0;
    const tName = it.leaveTypeName || 'อื่นๆ';
    const dName = it.departmentName || 'ไม่ระบุแผนก';

    const tRec = typeMap.get(tName) ?? { days: 0, requests: 0, empSet: new Set<number>() };
    tRec.days += days;
    tRec.requests += 1;
    tRec.empSet.add(it.employeeId);
    typeMap.set(tName, tRec);

    const dRec = deptMap.get(dName) ?? { days: 0, requests: 0, empSet: new Set<number>() };
    dRec.days += days;
    dRec.requests += 1;
    dRec.empSet.add(it.employeeId);
    deptMap.set(dName, dRec);

    const cellKey = `${dName}|${tName}`;
    cellMap.set(cellKey, (cellMap.get(cellKey) ?? 0) + days);

    const eRec = empMap.get(it.employeeId) ?? {
      employeeId: it.employeeId,
      employeeCode: it.employeeCode,
      employeeName: it.employeeName,
      departmentName: dName,
      days: 0,
      requests: 0,
    };
    eRec.days += days;
    eRec.requests += 1;
    empMap.set(it.employeeId, eRec);
  }

  const byType: LeaveReportRow[] = Array.from(typeMap.entries()).map(([label, v]) => ({
    key: label,
    label,
    days: v.days,
    requests: v.requests,
    employees: v.empSet.size,
  }));

  const byDepartment: LeaveReportRow[] = Array.from(deptMap.entries()).map(([label, v]) => ({
    key: label,
    label,
    days: v.days,
    requests: v.requests,
    employees: v.empSet.size,
  }));

  const departmentByType: LeaveReportCell[] = Array.from(cellMap.entries()).map(([k, days]) => {
    const [departmentName, leaveTypeName] = k.split('|');
    return { departmentName, leaveTypeName, days };
  });

  const topEmployees: LeaveReportTopEmployee[] = Array.from(empMap.values()).sort(
    (a, b) => b.days - a.days || b.requests - a.requests
  );

  return {
    year,
    totalDays,
    totalRequests,
    employeesOnLeave,
    pendingRequests,
    byType,
    byDepartment,
    byMonth: [],
    departmentByType,
    topEmployees,
  };
}

/** แท็บรายงานการลา: รองรับ 3 มุมมอง [รายวัน | รายเดือน | รายปี] */
export default function LeaveSummaryReportTab({ canExport, onError }: Props) {
  const now = new Date();
  const [mode, setMode] = useState<'daily' | 'monthly' | 'yearly'>('yearly');
  const [selectedDate, setSelectedDate] = useState<string>(localToday);
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [data, setData] = useState<LeaveSummaryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [matrixSearch, setMatrixSearch] = useState('');
  const [matrixPage, setMatrixPage] = useState(1);
  const [matrixPageSize, setMatrixPageSize] = useState(10);
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
      if (mode === 'yearly') {
        const res = await leaveInsightsService.getSummary(year, deptParam);
        setData(res);
      } else if (mode === 'monthly') {
        const lastDay = new Date(year, month, 0).getDate();
        const from = `${year}-${pad2(month)}-01`;
        const to = `${year}-${pad2(month)}-${pad2(lastDay)}`;
        const cal = await leaveInsightsService.getCalendar({
          from,
          to,
          departmentId: deptParam,
          includePending: true,
        });
        setData(buildSummaryFromCalendar(cal.items ?? [], year));
      } else {
        const cal = await leaveInsightsService.getCalendar({
          from: selectedDate,
          to: selectedDate,
          departmentId: deptParam,
          includePending: true,
        });
        const y = Number(selectedDate.slice(0, 4)) || year;
        setData(buildSummaryFromCalendar(cal.items ?? [], y));
      }
      setMatrixPage(1);
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

  // ตาราง แผนก × ประเภท
  const matrix = useMemo(() => {
    if (!data) return { types: [] as string[], depts: [] as string[], cell: new Map<string, number>() };
    const types = data.byType.map((t) => t.label);
    const depts = data.byDepartment.map((d) => d.label);
    const cell = new Map<string, number>();
    data.departmentByType.forEach((c) => cell.set(`${c.departmentName}|${c.leaveTypeName}`, c.days));
    return { types, depts, cell };
  }, [data]);

  const filteredMatrixDepts = useMemo(() => {
    if (!data) return [];
    const q = matrixSearch.trim().toLowerCase();
    if (!q) return data.byDepartment;
    return data.byDepartment.filter((d) => d.label.toLowerCase().includes(q));
  }, [data, matrixSearch]);

  const pagedMatrixDepts = useMemo(() => {
    const start = (matrixPage - 1) * matrixPageSize;
    return filteredMatrixDepts.slice(start, start + matrixPageSize);
  }, [filteredMatrixDepts, matrixPage, matrixPageSize]);

  const filteredTopEmployees = useMemo(() => {
    if (!data) return [];
    const q = empSearch.trim().toLowerCase();
    if (!q) return data.topEmployees;
    return data.topEmployees.filter(
      (e) =>
        e.employeeName.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        (e.departmentName || '').toLowerCase().includes(q)
    );
  }, [data, empSearch]);

  const pagedTopEmployees = useMemo(() => {
    const start = (empPage - 1) * empPageSize;
    return filteredTopEmployees.slice(start, start + empPageSize);
  }, [filteredTopEmployees, empPage, empPageSize]);

  const peakMonthIdx = useMemo(() => {
    if (!data || data.byMonth.length === 0) return -1;
    const maxVal = Math.max(...data.byMonth.map((m) => m.days), 0);
    return maxVal > 0 ? data.byMonth.findIndex((m) => m.days === maxVal) : -1;
  }, [data]);

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
    if (mode === 'yearly') {
      setExporting(true);
      try {
        await leaveInsightsService.downloadSummaryCsv(year, departmentId === '' ? undefined : departmentId, format);
      } catch (e: unknown) {
        onError((e as { message?: string })?.message || 'ส่งออกไฟล์ไม่สำเร็จ');
      } finally {
        setExporting(false);
      }
      return;
    }
    if (!data) return;
    const headers = ['รหัสพนักงาน', 'ชื่อ-นามสกุล', 'แผนก', 'จำนวนใบลา', 'วันลารวม'];
    const rows = data.topEmployees.map((e) => [
      e.employeeCode,
      e.employeeName,
      e.departmentName || '-',
      e.requests,
      e.days,
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
      mode === 'daily' ? `Leave_Daily_${selectedDate}.csv` : `Leave_Monthly_${year + 543}_${pad2(month)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(href);
  };

  const typeColors = ['#8b5cf6', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#ec4899'];

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
              formats={mode === 'yearly' ? ['xlsx', 'csv', 'pdf'] : ['csv', 'pdf']}
              onExport={handleExport}
              disabled={exporting || !data}
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

        <IconButton onClick={load} title="โหลดข้อมูลใหม่">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </IconButton>
      </ReportFilterBar>

      {loading && !data ? (
        <ReportLoading />
      ) : !data ? (
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
              value={fmt(data.totalDays)}
              unit="วัน"
              spark={data.byMonth.length > 1 ? data.byMonth.map((m) => m.days) : undefined}
              tooltip="ผลรวมวันลาจากใบลาที่อนุมัติแล้วในช่วงที่เลือก"
            />

            <KpiCard
              icon={FileSpreadsheet}
              tone="blue"
              label="จำนวนใบลา"
              value={fmt(data.totalRequests)}
              unit="ใบ"
              tooltip="จำนวนใบลาที่อนุมัติแล้วทั้งหมดในช่วงที่เลือก"
            />

            <KpiCard
              icon={Users}
              tone="emerald"
              label="พนักงานที่ลา"
              value={fmt(data.employeesOnLeave)}
              unit="คน"
              tooltip="จำนวนพนักงานที่มีการลาในช่วงที่เลือก (นับไม่ซ้ำคน)"
            />

            <KpiCard
              icon={AlertTriangle}
              tone="amber"
              label="รออนุมัติ"
              value={fmt(data.pendingRequests)}
              unit="ใบ"
              tooltip="จำนวนใบลาที่ยังรอหัวหน้างานอนุมัติ"
            />
          </KpiGrid>

          {/* Chart Row 1: Monthly Trend (เฉพาะโหมดรายปี) + By Type Donut */}
          {mode === 'yearly' && data.byMonth.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <ReportPanel
                title="แนวโน้มวันลารายเดือน"
                subtitle="จำนวนวันลารวมในแต่ละเดือนของปีที่เลือก (แท่งสีเข้ม = เดือนที่ลาสูงสุด)"
                className="xl:col-span-2"
              >
                <MiniColumns
                  items={data.byMonth.map((m) => ({ label: m.label, value: Number(m.days.toFixed(1)) }))}
                  color="#c4b5fd"
                  highlightIndex={peakMonthIdx}
                  highlightColor="#7c3aed"
                  height={185}
                />
              </ReportPanel>

              <ReportPanel title="สัดส่วนตามประเภทการลา" subtitle="เปรียบเทียบจำนวนวันลาแยกตามประเภท">
                {data.byType.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400">ไม่มีข้อมูล</div>
                ) : (
                  <DonutChart
                    unit="วัน"
                    centerLabel="วันลารวม"
                    size={145}
                    segments={toSegments(data.byType.map((t) => ({ name: t.label, count: t.days })))}
                  />
                )}
              </ReportPanel>
            </div>
          ) : null}

          {/* Chart Row 2: By Department + By Leave Type Details */}
          <div className={`grid grid-cols-1 gap-4 ${mode === 'yearly' ? 'xl:grid-cols-2' : 'xl:grid-cols-3'}`}>
            <ReportPanel title="วันลาแยกตามแผนก" subtitle="เรียงตามจำนวนวันลารวม (อนุมัติแล้ว)">
              <BarList
                items={[...data.byDepartment]
                  .sort((a, b) => b.days - a.days)
                  .map((d) => ({
                    label: d.label,
                    value: d.days,
                    display: `${fmt(d.days)} วัน (${d.requests} ใบ)`,
                    color: '#7c3aed',
                  }))}
              />
            </ReportPanel>

            <ReportPanel title="รายละเอียดตามประเภทการลา" subtitle="จำนวนวันและจำนวนใบลาของแต่ละประเภท">
              <BarList
                items={[...data.byType]
                  .sort((a, b) => b.days - a.days)
                  .map((t, i) => ({
                    label: t.label,
                    value: t.days,
                    display: `${fmt(t.days)} วัน · ${t.requests} ใบ`,
                    color: typeColors[i % typeColors.length],
                  }))}
              />
            </ReportPanel>

            {mode !== 'yearly' && (
              <ReportPanel title="สัดส่วนตามประเภทการลา" subtitle="เปรียบเทียบจำนวนวันลาแยกตามประเภท">
                {data.byType.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400">ไม่มีข้อมูล</div>
                ) : (
                  <DonutChart
                    unit="วัน"
                    centerLabel="วันลารวม"
                    size={145}
                    segments={toSegments(data.byType.map((t) => ({ name: t.label, count: t.days })))}
                  />
                )}
              </ReportPanel>
            )}
          </div>

          {/* Matrix Table: Department x Leave Type */}
          <ReportTableCard
            searchValue={matrixSearch}
            onSearchChange={(val) => {
              setMatrixSearch(val);
              setMatrixPage(1);
            }}
            searchPlaceholder="ค้นหาชื่อแผนก..."
            minWidthClassName="min-w-[680px]"
            pagination={{
              total: filteredMatrixDepts.length,
              page: matrixPage,
              pageSize: matrixPageSize,
              onPageChange: setMatrixPage,
              onPageSizeChange: (newSize) => {
                setMatrixPageSize(newSize);
                setMatrixPage(1);
              },
              totalLabel: 'แผนก',
            }}
          >
            <thead className="bg-primary text-white font-semibold">
              <tr className="whitespace-nowrap">
                <th className="py-3.5 px-4 text-left whitespace-nowrap">แผนก</th>
                {matrix.types.map((t) => (
                  <th key={t} className="py-3.5 px-4 text-right whitespace-nowrap">
                    {t}
                  </th>
                ))}
                <th className="py-3.5 px-4 text-right whitespace-nowrap">รวม (วัน)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700/60 dark:bg-slate-900">
              {pagedMatrixDepts.length === 0 ? (
                <TableEmpty colSpan={matrix.types.length + 2} text="ไม่พบข้อมูลวันลาแยกแผนก" />
              ) : (
                pagedMatrixDepts.map((d) => (
                  <tr key={d.key} className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {d.label}
                    </td>
                    {matrix.types.map((t) => {
                      const v = matrix.cell.get(`${d.label}|${t}`) ?? 0;
                      return (
                        <td
                          key={t}
                          title={`${d.label} · ${t}: ${fmt(v)} วัน`}
                          className={`py-3 px-4 text-right tabular-nums whitespace-nowrap ${
                            v > 0
                              ? 'font-semibold text-slate-800 dark:text-slate-200'
                              : 'text-slate-300 dark:text-slate-600'
                          }`}
                        >
                          {fmt(v)}
                        </td>
                      );
                    })}
                    <td className="py-3 px-4 text-right font-extrabold text-violet-700 dark:text-violet-300 whitespace-nowrap">
                      {fmt(d.days)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </ReportTableCard>

          {/* Top Employees on Leave */}
          <ReportTableCard
            searchValue={empSearch}
            onSearchChange={(val) => {
              setEmpSearch(val);
              setEmpPage(1);
            }}
            searchPlaceholder="ค้นหาชื่อ หรือรหัสพนักงาน..."
            minWidthClassName="min-w-[680px]"
            pagination={{
              total: filteredTopEmployees.length,
              page: empPage,
              pageSize: empPageSize,
              onPageChange: setEmpPage,
              onPageSizeChange: (newSize) => {
                setEmpPageSize(newSize);
                setEmpPage(1);
              },
            }}
          >
            <thead className="bg-primary text-white font-semibold">
              <tr className="whitespace-nowrap">
                <th className="w-12 py-3.5 px-4 text-center whitespace-nowrap">อันดับ</th>
                <th className="py-3.5 px-4 text-left whitespace-nowrap">พนักงาน</th>
                <th className="py-3.5 px-4 text-left whitespace-nowrap">รหัสพนักงาน</th>
                <th className="py-3.5 px-4 text-left whitespace-nowrap">แผนก</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">จำนวนใบลา</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap" style={{ minWidth: 160 }}>
                  วันลารวม
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700/60 dark:bg-slate-900">
              {pagedTopEmployees.length === 0 ? (
                <TableEmpty colSpan={6} text="ไม่พบข้อมูลการลาของพนักงาน" />
              ) : (
                (() => {
                  const maxEmpDays = Math.max(...data.topEmployees.map((x) => x.days), 1);
                  return pagedTopEmployees.map((e, i) => {
                    const rank = (empPage - 1) * empPageSize + i + 1;
                    return (
                      <tr key={e.employeeId} className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 text-center font-bold text-slate-400 whitespace-nowrap">#{rank}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <AvatarName id={e.employeeId} name={e.employeeName} />
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {e.employeeCode}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {e.departmentName || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {e.requests} ใบ
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2.5">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                              <div
                                className="h-full rounded-full bg-violet-600"
                                style={{ width: `${(e.days / maxEmpDays) * 100}%` }}
                              />
                            </div>
                            <span className="w-14 text-right font-extrabold text-slate-900 dark:text-slate-100">
                              {fmt(e.days)} วัน
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()
              )}
            </tbody>
          </ReportTableCard>
        </div>
      )}
    </div>
  );
}

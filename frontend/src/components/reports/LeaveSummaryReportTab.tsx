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
import { LeaveSummaryReport } from '@/types/leaveInsights';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { getSmartYearRange } from '@/lib/yearUtils';
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

/** แท็บรายงานการลา (Redesign ตามมาตรฐาน Report Shell) */
export default function LeaveSummaryReportTab({ canExport, onError }: Props) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
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
      const res = await leaveInsightsService.getSummary(year, departmentId === '' ? undefined : departmentId);
      setData(res);
    } catch (e: unknown) {
      setFailed(true);
      onError((e as { message?: string })?.message || 'โหลดรายงานการลาไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [year, departmentId, onError]);

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

  const handleExport = async (format: ReportExportFormat = 'csv') => {
    if (format === 'pdf') {
      printReport(rootRef.current, { title: 'รายงานการลา', subtitle: `ปี พ.ศ. ${year + 543}` });
      return;
    }
    setExporting(true);
    try {
      await leaveInsightsService.downloadSummaryCsv(year, departmentId === '' ? undefined : departmentId, format);
    } catch (e: unknown) {
      onError((e as { message?: string })?.message || 'ส่งออกไฟล์ไม่สำเร็จ');
    } finally {
      setExporting(false);
    }
  };

  const typeColors = ['#8b5cf6', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#ec4899'];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <ReportFilterBar
        loading={loading}
        right={canExport ? <ExportMenu onExport={handleExport} disabled={exporting || !data} /> : undefined}
      >
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
              spark={data.byMonth.map((m) => m.days)}
              source="รายการใบลาที่มีสถานะอนุมัติแล้ว (APPROVED) ในปีและแผนกที่เลือก"
              formula="วันลารวม = ผลรวมจำนวนวันลา (Total Days) ของใบลาที่อนุมัติแล้วทั้งหมดในปีที่เลือก"
              note={`ปี พ.ศ. ${year + 543}`}
            />

            <KpiCard
              icon={FileSpreadsheet}
              tone="blue"
              label="จำนวนใบลา"
              value={fmt(data.totalRequests)}
              unit="ใบ"
              source="ระบบคำขอใบลา (Leave Requests) ที่ได้รับอนุมัติแล้วในปีที่เลือก"
              formula="นับจำนวนรายการคำขอใบลาสถานะ APPROVED ทั้งหมด · เฉลี่ยต่อคน = จำนวนใบลา ÷ จำนวนพนักงานที่ลา"
              note={
                data.employeesOnLeave > 0
                  ? `เฉลี่ย ${(data.totalRequests / data.employeesOnLeave).toFixed(1)} ใบ/คนที่ลา`
                  : 'ใบลาที่อนุมัติแล้ว'
              }
            />

            <KpiCard
              icon={Users}
              tone="emerald"
              label="พนักงานที่ลา"
              value={fmt(data.employeesOnLeave)}
              unit="คน"
              source="รายชื่อพนักงานที่มีใบลาอนุมัติแล้วอย่างน้อย 1 รายการในปีที่เลือก"
              formula="นับจำนวนพนักงานแบบไม่ซ้ำคน (Distinct Employees) ที่มีการลา · วันลาเฉลี่ย = วันลารวม ÷ พนักงานที่ลา"
              note={
                data.employeesOnLeave > 0
                  ? `เฉลี่ย ${(data.totalDays / data.employeesOnLeave).toFixed(1)} วัน/คน`
                  : 'ไม่มีประวัติการลา'
              }
            />

            <KpiCard
              icon={AlertTriangle}
              tone="amber"
              label="รออนุมัติ"
              value={fmt(data.pendingRequests)}
              unit="ใบ"
              source="รายการคำขอใบลาที่อยู่ระหว่างรออนุมัติตามสายบังคับบัญชา"
              formula="นับจำนวนใบลาที่มีสถานะรออนุมัติ (PENDING / IN_PROGRESS) ในปีที่เลือก"
              note={data.pendingRequests > 0 ? 'รอดำเนินการอนุมัติ' : 'อนุมัติครบทุกรายการ'}
            />
          </KpiGrid>

          {/* Chart Row 1: Monthly Trend + By Type Donut */}
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

          {/* Chart Row 2: By Department + By Leave Type Details */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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

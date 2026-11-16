'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
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
  BarList,
  FilterChip,
  IconButton,
  KpiCard,
  KpiGrid,
  MiniColumns,
  ReportAvatar,
  ReportEmpty,
  ReportFilterBar,
  ReportLoading,
  ReportPanel,
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
        <FilterChip icon={Calendar} label="ปี:">
          <CustomSelect
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none dark:text-slate-200"
          >
            {getSmartYearRange({ forwardYears: 1, backYears: 5, selectedYear: year }).map((y) => (
              <option key={y} value={y}>
                พ.ศ. {y + 543}
              </option>
            ))}
          </CustomSelect>
        </FilterChip>

        <FilterChip icon={Building2} label="แผนก:">
          <CustomSelect
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value === '' ? '' : Number(e.target.value))}
            className="min-w-[150px] bg-transparent text-xs font-semibold text-slate-700 focus:outline-none dark:text-slate-200"
          >
            <option value="">ทุกแผนก</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.departmentName}
              </option>
            ))}
          </CustomSelect>
        </FilterChip>

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
              note={`ปี พ.ศ. ${year + 543}`}
            />

            <KpiCard
              icon={FileSpreadsheet}
              tone="blue"
              label="จำนวนใบลา"
              value={fmt(data.totalRequests)}
              unit="ใบ"
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
          <ReportPanel
            title="ตารางสรุปวันลาแยกแผนก × ประเภทการลา"
            subtitle="หน่วย: วันทำงาน (เฉพาะใบลาที่อนุมัติแล้ว)"
          >
            {matrix.depts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">ไม่มีข้อมูล</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full min-w-[640px] text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 font-bold text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
                    <tr>
                      <th className="py-3 px-4 text-left">แผนก</th>
                      {matrix.types.map((t) => (
                        <th key={t} className="py-3 px-4 text-right">
                          {t}
                        </th>
                      ))}
                      <th className="py-3 px-4 text-right">รวม (วัน)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {data.byDepartment.map((d) => (
                      <tr key={d.key} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30">
                        <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-100">{d.label}</td>
                        {matrix.types.map((t) => {
                          const v = matrix.cell.get(`${d.label}|${t}`) ?? 0;
                          return (
                            <td
                              key={t}
                              title={`${d.label} · ${t}: ${fmt(v)} วัน`}
                              className={`py-2.5 px-4 text-right tabular-nums ${
                                v > 0
                                  ? 'font-semibold text-slate-800 dark:text-slate-200'
                                  : 'text-slate-300 dark:text-slate-600'
                              }`}
                            >
                              {fmt(v)}
                            </td>
                          );
                        })}
                        <td className="py-2.5 px-4 text-right font-extrabold text-violet-700 dark:text-violet-300">
                          {fmt(d.days)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ReportPanel>

          {/* Top 10 Employees */}
          <ReportPanel
            title="พนักงานที่ลามากที่สุด 10 อันดับ"
            subtitle="เรียงลำดับตามจำนวนวันลารวมที่อนุมัติแล้วในปีที่เลือก"
          >
            {data.topEmployees.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">ไม่มีข้อมูลการลาของพนักงาน</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full min-w-[560px] text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 font-bold text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
                    <tr>
                      <th className="w-12 py-3 px-4 text-center">อันดับ</th>
                      <th className="py-3 px-4 text-left">พนักงาน</th>
                      <th className="py-3 px-4 text-left">แผนก</th>
                      <th className="py-3 px-4 text-right">จำนวนใบลา</th>
                      <th className="py-3 px-4 text-right" style={{ minWidth: 160 }}>
                        วันลารวม
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {(() => {
                      const maxEmpDays = Math.max(...data.topEmployees.map((x) => x.days), 1);
                      return data.topEmployees.map((e, i) => (
                        <tr key={e.employeeId} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30">
                          <td className="py-2.5 px-4 text-center font-bold text-slate-400">#{i + 1}</td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <ReportAvatar name={e.employeeName} size={28} />
                              <div>
                                <div className="font-bold text-slate-800 dark:text-slate-100">{e.employeeName}</div>
                                <div className="font-mono text-[11px] text-slate-400">{e.employeeCode}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">{e.departmentName || '-'}</td>
                          <td className="py-2.5 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                            {e.requests} ใบ
                          </td>
                          <td className="py-2.5 px-4">
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
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </ReportPanel>
        </div>
      )}
    </div>
  );
}

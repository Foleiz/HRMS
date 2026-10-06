'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Calendar, CalendarDays, FileSpreadsheet, Loader2, Users } from 'lucide-react';
import { leaveInsightsService } from '@/services/leaveInsightsService';
import { organizationService } from '@/services/organizationService';
import { Department } from '@/types/organization';
import { LeaveSummaryReport } from '@/types/leaveInsights';

interface Props {
  canExport: boolean;
  onError: (message: string) => void;
}

const fmt = (n: number) => n.toLocaleString('th-TH', { maximumFractionDigits: 2 });

/** แท็บรายงานการลา: วันลาแยกประเภท × แผนก × เดือน, พนักงานที่ลามากสุด, ส่งออก CSV */
export default function LeaveSummaryReportTab({ canExport, onError }: Props) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [report, setReport] = useState<{ key: string; data: LeaveSummaryReport } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const key = `${year}|${departmentId}`;

  useEffect(() => {
    let active = true;
    organizationService.getDepartments().then((d) => active && setDepartments(d)).catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    leaveInsightsService
      .getSummary(year, departmentId === '' ? undefined : departmentId)
      .then((data) => active && setReport({ key, data }))
      .catch((e: unknown) => {
        if (!active) return;
        setFailedKey(key);
        onError((e as { message?: string })?.message || 'โหลดรายงานการลาไม่สำเร็จ');
      });
    return () => {
      active = false;
    };
  }, [year, departmentId, key, onError]);

  const data = report?.key === key ? report.data : null;
  const loading = !data && failedKey !== key;

  // ตาราง แผนก × ประเภท
  const matrix = useMemo(() => {
    if (!data) return { types: [] as string[], depts: [] as string[], cell: new Map<string, number>() };
    const types = data.byType.map((t) => t.label);
    const depts = data.byDepartment.map((d) => d.label);
    const cell = new Map<string, number>();
    data.departmentByType.forEach((c) => cell.set(`${c.departmentName}|${c.leaveTypeName}`, c.days));
    return { types, depts, cell };
  }, [data]);

  const maxMonth = Math.max(1, ...(data?.byMonth.map((m) => m.days) ?? [0]));
  const maxType = Math.max(1, ...(data?.byType.map((m) => m.days) ?? [0]));
  const heatMax = Math.max(1, ...(data?.departmentByType.map((c) => c.days) ?? [0]));

  const handleExport = async () => {
    setExporting(true);
    try {
      await leaveInsightsService.downloadSummaryCsv(year, departmentId === '' ? undefined : departmentId);
    } catch (e: unknown) {
      onError((e as { message?: string })?.message || 'ส่งออกไฟล์ไม่สำเร็จ');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
            <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">ปี:</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              {[0, 1, 2, 3].map((i) => (
                <option key={i} value={currentYear - i}>
                  {currentYear - i + 543}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
            <Building2 className="w-4 h-4 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value === '' ? '' : Number(e.target.value))}
              className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="">ทุกแผนก</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.departmentName}
                </option>
              ))}
            </select>
          </div>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400 dark:text-slate-500 dark:text-slate-400" />}
        </div>
        {canExport && (
          <button
            onClick={handleExport}
            disabled={exporting || !data}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} ส่งออก CSV
          </button>
        )}
      </div>

      {data && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'วันลารวม (อนุมัติแล้ว)', value: fmt(data.totalDays), icon: CalendarDays, color: 'text-blue-600 bg-blue-50' },
              { label: 'จำนวนใบลา', value: fmt(data.totalRequests), icon: FileSpreadsheet, color: 'text-violet-600 bg-violet-50' },
              { label: 'พนักงานที่ลา', value: fmt(data.employeesOnLeave), icon: Users, color: 'text-emerald-600 bg-emerald-50' },
              { label: 'รออนุมัติ', value: fmt(data.pendingRequests), icon: Loader2, color: 'text-amber-600 bg-amber-50' },
            ].map((k) => (
              <div key={k.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.color}`}>
                  <k.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{k.label}</div>
                  <div className="text-xl font-bold text-slate-800 dark:text-slate-200">{k.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly trend */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">แนวโน้มวันลารายเดือน (วัน)</h3>
              <div className="flex items-end gap-2 h-44">
                {data.byMonth.map((m) => (
                  <div key={m.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end" title={`${m.label}: ${fmt(m.days)} วัน / ${m.requests} ใบ`}>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{m.days > 0 ? fmt(m.days) : ''}</span>
                    <div
                      className="w-full rounded-t-md bg-[#0B2046]/80"
                      style={{ height: `${(m.days / maxMonth) * 100}%`, minHeight: m.days > 0 ? 4 : 0 }}
                    />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By type */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">แยกตามประเภทการลา</h3>
              {data.byType.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400">ไม่มีข้อมูล</p>
              ) : (
                <div className="space-y-3">
                  {data.byType.map((t) => (
                    <div key={t.key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{t.label}</span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {fmt(t.days)} วัน · {t.requests} ใบ · {t.employees} คน
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-2 rounded-full bg-blue-500" style={{ width: `${(t.days / maxType) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Department x Type */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">วันลาแยกแผนก × ประเภทการลา (วัน)</h3>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                น้อย
                <span className="inline-flex h-2.5 w-24 rounded-sm" style={{ background: 'linear-gradient(to right, color-mix(in srgb, var(--viz-s1) 8%, transparent), color-mix(in srgb, var(--viz-s1) 60%, transparent))' }} />
                มาก
              </span>
            </div>
            {matrix.depts.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400">ไม่มีข้อมูล</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm whitespace-nowrap">
                  <thead>
                    <tr className="text-xs text-slate-500 bg-slate-50 whitespace-nowrap">
                      <th className="text-left py-2 px-3">แผนก</th>
                      {matrix.types.map((t) => (
                        <th key={t} className="text-right py-2 px-3 whitespace-nowrap">
                          {t}
                        </th>
                      ))}
                      <th className="text-right py-2 px-3">รวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byDepartment.map((d) => (
                      <tr key={d.key} className="border-t border-slate-100 dark:border-slate-700/60">
                        <td className="py-2 px-3 font-medium text-slate-700 dark:text-slate-300">{d.label}</td>
                        {matrix.types.map((t) => {
                          const v = matrix.cell.get(`${d.label}|${t}`) ?? 0;
                          // ช่องสีตามความเข้ม (ฟ้าอ่อน → เข้ม) ตัวเลขยังอ่านได้ด้วยสีตัวอักษรปกติ
                          const pct = v > 0 ? Math.round(8 + (v / heatMax) * 52) : 0;
                          return (
                            <td
                              key={t}
                              title={`${d.label} · ${t}: ${fmt(v)} วัน`}
                              className={`py-2 px-3 text-right tabular-nums ${v > 0 ? 'text-slate-800 font-medium' : 'text-slate-300'}`}
                              style={v > 0 ? { background: `color-mix(in srgb, var(--viz-s1) ${pct}%, transparent)` } : undefined}
                            >
                              {fmt(v)}
                            </td>
                          );
                        })}
                        <td className="py-2 px-3 text-right font-semibold text-slate-800 dark:text-slate-200">{fmt(d.days)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top employees */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">พนักงานที่ลามากที่สุด 10 อันดับ</h3>
            {data.topEmployees.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400">ไม่มีข้อมูล</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-sm whitespace-nowrap">
                  <thead>
                    <tr className="text-xs text-slate-500 bg-slate-50 whitespace-nowrap">
                      <th className="text-left py-2 px-3 w-10">#</th>
                      <th className="text-left py-2 px-3">พนักงาน</th>
                      <th className="text-left py-2 px-3">แผนก</th>
                      <th className="text-right py-2 px-3">วันลา</th>
                      <th className="text-right py-2 px-3">ใบลา</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topEmployees.map((e, i) => (
                    <tr key={e.employeeId} className="border-t border-slate-100">
                      <td className="py-2 px-3 text-slate-400">{i + 1}</td>
                      <td className="py-2 px-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{e.employeeName}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">{e.employeeCode}</div>
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{e.departmentName || '-'}</td>
                      <td className="py-2 px-3 text-right font-semibold">{fmt(e.days)}</td>
                      <td className="py-2 px-3 text-right">{e.requests}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

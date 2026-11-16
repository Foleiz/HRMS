'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  ChevronDown,
  ChevronRight,
  Clock,
  RefreshCw,
  Search,
  Target,
  Users,
} from 'lucide-react';
import { reportService } from '@/services/reportService';
import { organizationService } from '@/services/organizationService';
import type { Department, Division } from '@/types/organization';
import type { EmployeesByDepartmentReport } from '@/types/reports';
import { ColumnChart, DonutChart, VIZ, toSegments } from './ReportCharts';
import ExportMenu, { ReportExportFormat } from './ExportMenu';
import { printReport } from '@/lib/printReport';
import { CustomSelect } from '@/components/ui/CustomSelect';
import {
  BarList,
  DeltaBadge,
  FilterChip,
  IconButton,
  InsightBox,
  KpiCard,
  KpiGrid,
  MiniColumns,
  ReportAvatar,
  ReportEmpty,
  ReportFilterBar,
  ReportLoading,
  ReportPanel,
} from './ReportShell';

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

/** รายงานพนักงานแยกตามแผนก (Redesign ตามมาตรฐาน Report Shell) */
export default function EmployeesByDepartmentTab({
  canExport,
  onError,
}: {
  canExport: boolean;
  onError: (msg: string) => void;
}) {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisionId, setDivisionId] = useState<number | 'ALL'>('ALL');
  const [departmentId, setDepartmentId] = useState<number | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<EmployeesByDepartmentReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([organizationService.getDivisions(), organizationService.getDepartments()])
      .then(([divs, depts]) => {
        setDivisions(divs);
        setDepartments(depts);
      })
      .catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(
        await reportService.getEmployeesByDepartment(
          divisionId === 'ALL' ? undefined : divisionId,
          departmentId === 'ALL' ? undefined : departmentId
        )
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : 'ไม่สามารถโหลดรายงานพนักงานแยกตามแผนกได้');
    } finally {
      setLoading(false);
    }
  }, [divisionId, departmentId, onError]);

  useEffect(() => {
    load();
  }, [load]);

  const deptOptions = useMemo(
    () => departments.filter((d) => divisionId === 'ALL' || d.divisionId === divisionId),
    [departments, divisionId]
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
          data ? `ณ วันที่ ${fmtDate(data.asOfDate)}` : '',
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

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // คำนวณอายุงานจาก startDate ของพนักงานทุกคนในรายงาน
  const tenureStats = useMemo(() => {
    if (!data) {
      return {
        avgYears: 0,
        minLabel: '-',
        maxLabel: '-',
        buckets: [
          { label: '<1 ปี', value: 0 },
          { label: '1–3 ปี', value: 0 },
          { label: '3–5 ปี', value: 0 },
          { label: '5–10 ปี', value: 0 },
          { label: '>10 ปี', value: 0 },
        ],
        peakBucketIdx: 0,
      };
    }
    const refDate = data.asOfDate ? new Date(data.asOfDate) : new Date();
    const yearsList: number[] = [];
    const counts = [0, 0, 0, 0, 0];

    for (const d of data.departments) {
      for (const emp of d.employees) {
        if (!emp.startDate) continue;
        const st = new Date(emp.startDate);
        if (isNaN(st.getTime())) continue;
        const diffYears = Math.max(0, (refDate.getTime() - st.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
        yearsList.push(diffYears);
        if (diffYears < 1) counts[0]++;
        else if (diffYears < 3) counts[1]++;
        else if (diffYears < 5) counts[2]++;
        else if (diffYears <= 10) counts[3]++;
        else counts[4]++;
      }
    }

    const avgYears = yearsList.length > 0 ? yearsList.reduce((a, b) => a + b, 0) / yearsList.length : 0;
    const minY = yearsList.length > 0 ? Math.min(...yearsList) : 0;
    const maxY = yearsList.length > 0 ? Math.max(...yearsList) : 0;

    const fmtSpan = (y: number) => {
      if (y < 1) {
        const m = Math.max(1, Math.round(y * 12));
        return `${m} เดือน`;
      }
      return `${y.toFixed(1)} ปี`;
    };

    const labels = ['<1 ปี', '1–3 ปี', '3–5 ปี', '5–10 ปี', '>10 ปี'];
    const buckets = labels.map((label, i) => ({ label, value: counts[i] }));
    const maxBucketVal = Math.max(...counts, 0);
    const peakBucketIdx = maxBucketVal > 0 ? counts.indexOf(maxBucketVal) : 0;

    return {
      avgYears,
      minLabel: yearsList.length > 0 ? fmtSpan(minY) : '-',
      maxLabel: yearsList.length > 0 ? fmtSpan(maxY) : '-',
      buckets,
      peakBucketIdx,
    };
  }, [data]);

  // สร้างข้อสังเกตอัตโนมัติจากข้อมูลจริง
  const insights = useMemo(() => {
    if (!data || data.departments.length === 0) return [];
    const list: React.ReactNode[] = [];
    const sorted = [...data.departments].sort((a, b) => b.employeeCount - a.employeeCount);
    const top = sorted[0];
    if (top && data.totalEmployees > 0) {
      const pct = Math.round((top.employeeCount / data.totalEmployees) * 100);
      list.push(
        <>
          แผนก <b>{top.departmentName}</b> มีพนักงานมากที่สุด <b>{top.employeeCount} คน</b> คิดเป็น <b>{pct}%</b> ของกำลังคนทั้งหมด
        </>
      );
    }

    const emptyDepts = data.departments.filter((d) => d.employeeCount === 0);
    const underDepts = data.departments.filter((d) => d.headcountPlan != null && d.employeeCount < d.headcountPlan);
    if (underDepts.length > 0) {
      const totalShort = underDepts.reduce((acc, d) => acc + Math.max(0, (d.headcountPlan ?? 0) - d.employeeCount), 0);
      list.push(
        <>
          มี <b>{underDepts.length} แผนก</b> ที่ยังมีอัตราว่างรวม <b>{totalShort} อัตรา</b> ตามแผนอัตรากำลังที่ตั้งไว้
        </>
      );
    } else if (emptyDepts.length > 0) {
      list.push(
        <>
          มี <b>{emptyDepts.length} แผนก</b> ที่ยังไม่มีพนักงานบรรจุในปัจจุบัน ({emptyDepts.map((d) => d.departmentName).slice(0, 2).join(', ')})
        </>
      );
    }

    if (data.totalEmployees > 0) {
      const mPct = Math.round((data.maleCount / data.totalEmployees) * 100);
      const fPct = Math.round((data.femaleCount / data.totalEmployees) * 100);
      list.push(
        <>
          สัดส่วนชาย <b>{mPct}%</b> ต่อหญิง <b>{fPct}%</b> และมีพนักงานเข้าใหม่ในปีนี้รวม <b>{data.newHiresThisYear} คน</b>
        </>
      );
    }
    return list.slice(0, 3);
  }, [data]);

  const filteredDepartments = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.departments;
    return data.departments.filter(
      (d) =>
        d.departmentName.toLowerCase().includes(q) ||
        d.departmentCode.toLowerCase().includes(q) ||
        d.divisionName.toLowerCase().includes(q) ||
        d.employees.some((e) => e.employeeName.toLowerCase().includes(q) || e.employeeCode.toLowerCase().includes(q))
    );
  }, [data, search]);

  const allExpanded =
    filteredDepartments.length > 0 && filteredDepartments.every((d) => expanded.has(d.departmentId));

  const levelPalette = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#3b82f6'];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <ReportFilterBar
        loading={loading}
        right={canExport ? <ExportMenu onExport={handleExport} disabled={!data || data.totalEmployees === 0} /> : undefined}
      >
        <FilterChip icon={Building2} label="ฝ่าย:">
          <CustomSelect
            value={divisionId}
            onChange={(e) => {
              setDivisionId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value));
              setDepartmentId('ALL');
            }}
            className="min-w-[150px] bg-transparent text-xs font-semibold text-slate-700 focus:outline-none dark:text-slate-200"
          >
            <option value="ALL">ทุกฝ่าย</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.divisionName}
              </option>
            ))}
          </CustomSelect>
        </FilterChip>

        <FilterChip label="แผนก:">
          <CustomSelect
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="min-w-[150px] bg-transparent text-xs font-semibold text-slate-700 focus:outline-none dark:text-slate-200"
          >
            <option value="ALL">ทุกแผนก</option>
            {deptOptions.map((d) => (
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
      ) : !data || data.departments.length === 0 ? (
        <ReportEmpty text="ไม่พบแผนกตามตัวกรองที่เลือก" />
      ) : (
        <div ref={printRef} className="space-y-5">
          {/* KPI Cards */}
          <KpiGrid cols={4}>
            <KpiCard
              icon={Users}
              tone="blue"
              label="พนักงานทั้งหมด"
              value={data.totalEmployees.toLocaleString('th-TH')}
              unit="คน"
              delta={data.newHiresThisYear > 0 ? <DeltaBadge delta={data.newHiresThisYear} unit=" เข้าใหม่ปีนี้" good /> : undefined}
              note={`${data.totalDepartments} แผนก${data.totalHeadcountPlan ? ` · แผนรวม ${data.totalHeadcountPlan} คน` : ''}`}
            />

            <KpiCard
              icon={Users}
              tone="violet"
              label="ชาย / หญิง"
              value={`${data.maleCount} / ${data.femaleCount}`}
              unit="คน"
              note={
                data.totalEmployees > 0
                  ? `${Math.round((data.maleCount / data.totalEmployees) * 100)}% / ${Math.round((data.femaleCount / data.totalEmployees) * 100)}% · ไม่ระบุ ${data.otherGenderCount} คน`
                  : `ไม่ระบุ ${data.otherGenderCount} คน`
              }
            />

            {data.totalHeadcountPlan ? (
              <KpiCard
                icon={Target}
                tone="amber"
                label="ตำแหน่งที่ยังว่าง (ตามแผน)"
                value={Math.max(0, data.totalHeadcountPlan - data.totalEmployees).toLocaleString('th-TH')}
                unit="อัตรา"
                note={`อัตรากำลังตามแผน ${data.totalHeadcountPlan} − พนักงานจริง ${data.totalEmployees}`}
              />
            ) : (
              <div className="flex flex-col justify-between rounded-2xl border border-dashed border-amber-300 bg-amber-50/40 p-4 dark:border-amber-700/60 dark:bg-amber-950/20">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <div className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-300">ตำแหน่งที่ยังว่าง (ตามแผน)</div>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">ยังไม่ได้กำหนดอัตรากำลังของตำแหน่งงาน</div>
                  <Link
                    href="/organization?tab=positions"
                    data-print-hide
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:underline dark:text-amber-300"
                  >
                    ไปกำหนดอัตรากำลัง <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )}

            <KpiCard
              icon={Clock}
              tone="emerald"
              label="อายุงานเฉลี่ย"
              value={tenureStats.avgYears.toFixed(1)}
              unit="ปี"
              note={`ต่ำสุด ${tenureStats.minLabel} · สูงสุด ${tenureStats.maxLabel}`}
            />
          </KpiGrid>

          {/* Auto Insights */}
          <InsightBox theme="dept" items={insights} />

          {/* Chart Row 1: Department Headcount + Gender */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <ReportPanel
              title="จำนวนพนักงานแต่ละแผนก"
              subtitle="แท่ง = พนักงานจริง · เส้นประ = อัตรากำลังตามแผน · ชี้เพื่อดูรายละเอียด"
              className="xl:col-span-2"
            >
              <ColumnChart
                color={VIZ.s1}
                height={230}
                items={[...data.departments]
                  .sort((a, b) => b.employeeCount - a.employeeCount)
                  .map((d) => ({
                    id: d.departmentId,
                    label: d.departmentName,
                    sub: d.divisionName,
                    value: d.employeeCount,
                    target: d.headcountPlan ?? null,
                  }))}
              />
            </ReportPanel>

            <ReportPanel title="สัดส่วนเพศ" subtitle="จำแนกตามเพศของพนักงานที่ปฏิบัติงานอยู่">
              <DonutChart
                size={145}
                segments={[
                  { key: 'm', label: 'ชาย', value: data.maleCount, color: '#3b82f6' },
                  { key: 'f', label: 'หญิง', value: data.femaleCount, color: '#f97316' },
                  { key: 'o', label: 'ไม่ระบุ', value: data.otherGenderCount, color: '#cbd5e1' },
                ]}
              />
            </ReportPanel>
          </div>

          {/* Chart Row 2: Employee Type + Level + Tenure Distribution */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <ReportPanel title="ประเภทพนักงาน" subtitle="สัดส่วนตามประเภทการจ้างงาน">
              <DonutChart size={135} segments={toSegments(data.byEmployeeType)} />
            </ReportPanel>

            <ReportPanel title="ระดับตำแหน่ง" subtitle="จำนวนพนักงานแยกตามระดับ">
              <BarList
                items={data.byLevel.map((lv, i) => ({
                  label: lv.name,
                  value: lv.count,
                  display: `${lv.count} คน`,
                  color: levelPalette[i % levelPalette.length],
                }))}
              />
            </ReportPanel>

            <ReportPanel title="การกระจายตามอายุงาน" subtitle="จำนวนพนักงานในแต่ละช่วงอายุงาน (คำนวณจากวันเริ่มงาน)">
              <MiniColumns
                items={tenureStats.buckets}
                color="#38bdf8"
                highlightIndex={tenureStats.peakBucketIdx}
                highlightColor="#2563eb"
                height={155}
              />
            </ReportPanel>
          </div>

          {/* Detail Table */}
          <ReportPanel
            title="รายชื่อแผนกและพนักงาน"
            subtitle="คลิกแถวแผนกเพื่อดูรายชื่อพนักงานภายในแผนก"
            right={
              <div data-print-hide className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ค้นหาแผนก / พนักงาน..."
                    className="rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-700 focus:border-primary focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setExpanded(allExpanded ? new Set() : new Set(filteredDepartments.map((d) => d.departmentId)))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  {allExpanded ? 'ซ่อนรายชื่อทั้งหมด' : 'แสดงรายชื่อทั้งหมด'}
                </button>
              </div>
            }
          >
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full min-w-[880px] text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 font-bold text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
                  <tr>
                    <th className="py-3 px-4">แผนก / ฝ่าย</th>
                    <th className="py-3 px-4" style={{ minWidth: 170 }}>
                      พนักงานจริง
                    </th>
                    <th className="py-3 px-4 text-center">อัตรากำลังตามแผน</th>
                    <th className="py-3 px-4 text-center">ชาย</th>
                    <th className="py-3 px-4 text-center">หญิง</th>
                    <th className="py-3 px-4 text-center">เข้าใหม่ปีนี้</th>
                    <th className="py-3 px-4">ประเภทพนักงาน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredDepartments.map((d) => {
                    const open = expanded.has(d.departmentId);
                    const under = d.headcountPlan != null && d.employeeCount < d.headcountPlan;
                    const over = d.headcountPlan != null && d.employeeCount > d.headcountPlan;
                    const maxCount = Math.max(...data.departments.map((x) => x.employeeCount), 1);

                    return (
                      <React.Fragment key={d.departmentId}>
                        <tr
                          className="cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/40"
                          onClick={() => toggle(d.departmentId)}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {open ? (
                                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                              )}
                              <div>
                                <div className="font-bold text-slate-900 dark:text-slate-100">
                                  {d.departmentName}
                                  <span className="ml-1.5 font-mono text-[11px] font-normal text-slate-400">
                                    ({d.departmentCode})
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400">{d.divisionName}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                <div
                                  className="h-full rounded-full bg-blue-600 transition-all duration-500"
                                  style={{ width: `${(d.employeeCount / maxCount) * 100}%` }}
                                />
                              </div>
                              <span className="w-7 text-right font-extrabold text-slate-900 dark:text-slate-100">
                                {d.employeeCount}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {d.headcountPlan == null ? (
                              <span className="text-slate-300 dark:text-slate-600">ไม่กำหนด</span>
                            ) : (
                              <span
                                className={`inline-flex rounded-lg border px-2 py-0.5 text-[11px] font-bold ${
                                  under
                                    ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                    : over
                                      ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                }`}
                              >
                                {d.headcountPlan}{' '}
                                {under
                                  ? `(ขาด ${d.headcountPlan - d.employeeCount})`
                                  : over
                                    ? `(เกิน ${d.employeeCount - d.headcountPlan})`
                                    : '(ครบ)'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-300">
                            {d.maleCount}
                          </td>
                          <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-300">
                            {d.femaleCount}
                          </td>
                          <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-300">
                            {d.newHiresThisYear}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                            {d.byEmployeeType.map((t) => `${t.name} ${t.count}`).join(' · ') || '-'}
                          </td>
                        </tr>
                        {open && (
                          <tr>
                            <td colSpan={7} className="bg-slate-50/80 px-6 py-3.5 dark:bg-slate-900/50">
                              {d.employees.length === 0 ? (
                                <div className="text-xs text-slate-400">ยังไม่มีพนักงานในแผนกนี้</div>
                              ) : (
                                <table className="w-full text-xs">
                                  <thead className="text-slate-500 dark:text-slate-400">
                                    <tr>
                                      <th className="py-1.5 pr-3 text-left font-semibold">พนักงาน</th>
                                      <th className="py-1.5 pr-3 text-left font-semibold">รหัส</th>
                                      <th className="py-1.5 pr-3 text-left font-semibold">ตำแหน่ง</th>
                                      <th className="py-1.5 pr-3 text-left font-semibold">ประเภท</th>
                                      <th className="py-1.5 pr-3 text-left font-semibold">ระดับ</th>
                                      <th className="py-1.5 pr-3 text-left font-semibold">เพศ</th>
                                      <th className="py-1.5 text-left font-semibold">วันเริ่มงาน</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200/70 dark:divide-slate-700/60">
                                    {d.employees.map((e) => (
                                      <tr key={e.employeeId}>
                                        <td className="py-2 pr-3 font-semibold text-slate-800 dark:text-slate-100">
                                          <span className="inline-flex items-center gap-2">
                                            <ReportAvatar name={e.employeeName} size={24} />
                                            {e.employeeName}
                                          </span>
                                        </td>
                                        <td className="py-2 pr-3 font-mono text-slate-500">{e.employeeCode}</td>
                                        <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">{e.positionName}</td>
                                        <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">{e.employeeTypeName}</td>
                                        <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">{e.levelName}</td>
                                        <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">{e.gender}</td>
                                        <td className="py-2 text-slate-600 dark:text-slate-300">{fmtDate(e.startDate)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50 text-xs font-extrabold text-slate-800 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100">
                  <tr>
                    <td className="py-3 px-4">รวมทั้งสิ้น ({data.totalDepartments} แผนก)</td>
                    <td className="py-3 px-4 text-right">{data.totalEmployees} คน</td>
                    <td className="py-3 px-4 text-center">{data.totalHeadcountPlan ?? '-'}</td>
                    <td className="py-3 px-4 text-center">{data.maleCount}</td>
                    <td className="py-3 px-4 text-center">{data.femaleCount}</td>
                    <td className="py-3 px-4 text-center">{data.newHiresThisYear}</td>
                    <td className="py-3 px-4" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </ReportPanel>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Clock,
  RefreshCw,
  Target,
  Users,
} from 'lucide-react';
import { reportService } from '@/services/reportService';
import { organizationService } from '@/services/organizationService';
import type { Department, Division, Position } from '@/types/organization';
import type { DepartmentEmployees, EmployeesByDepartmentReport } from '@/types/reports';
import { ColumnChart, DonutChart, VIZ, toSegments } from './ReportCharts';
import ExportMenu, { ReportExportFormat } from './ExportMenu';
import { printReport } from '@/lib/printReport';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { TablePagination, TableToolbar } from '@/components/ui';
import {
  AvatarName,
  BarList,
  DeltaBadge,
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
  const [positions, setPositions] = useState<Position[]>([]);
  const [divisionId, setDivisionId] = useState<number | 'ALL'>('ALL');
  const [departmentId, setDepartmentId] = useState<number | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [deptPage, setDeptPage] = useState(1);
  const [deptPageSize, setDeptPageSize] = useState(10);
  const [data, setData] = useState<EmployeesByDepartmentReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      organizationService.getDivisions(),
      organizationService.getDepartments(),
      organizationService.getPositions(),
    ])
      .then(([divs, depts, posList]) => {
        setDivisions(divs);
        setDepartments(depts);
        setPositions(posList);
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

  // Map ตำแหน่ง -> ระดับ (จากเมนูโครงสร้างองค์กร > ตำแหน่งงาน)
  const posLevelMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of positions) {
      if (p.levelName) {
        m.set(`${p.departmentId}|${p.positionName.trim()}`, p.levelName);
        if (!m.has(p.positionName.trim())) {
          m.set(p.positionName.trim(), p.levelName);
        }
      }
    }
    return m;
  }, [positions]);

  const resolveLevelName = useCallback(
    (deptId: number, posName: string, rawLevel?: string | null) => {
      if (rawLevel && rawLevel !== '-') return rawLevel;
      const key = (posName || '').trim();
      return posLevelMap.get(`${deptId}|${key}`) ?? posLevelMap.get(key) ?? '-';
    },
    [posLevelMap]
  );

  const resolvedByLevel = useMemo(() => {
    if (!data) return [];
    const counts = new Map<string, number>();
    for (const d of data.departments) {
      for (const e of d.employees) {
        const lv = resolveLevelName(d.departmentId, e.positionName, e.levelName);
        const label = lv === '-' ? 'ไม่ระบุระดับ' : lv;
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [data, resolveLevelName]);

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

  const pagedDepartments = useMemo(() => {
    const start = (deptPage - 1) * deptPageSize;
    return filteredDepartments.slice(start, start + deptPageSize);
  }, [filteredDepartments, deptPage, deptPageSize]);

  const allExpanded =
    filteredDepartments.length > 0 && filteredDepartments.every((d) => expanded.has(d.departmentId));

  const levelPalette = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#3b82f6'];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <ReportFilterBar
        loading={loading}
        right={canExport ? <ExportMenu onExport={handleExport} disabled={!data || data.totalEmployees === 0} /> : undefined}
      >
        <CustomSelect
          value={divisionId}
          onChange={(e) => {
            setDivisionId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value));
            setDepartmentId('ALL');
          }}
          className="min-w-[160px]"
        >
          <option value="ALL">ทุกฝ่าย</option>
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.divisionName}
            </option>
          ))}
        </CustomSelect>

        <CustomSelect
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
          className="min-w-[160px]"
        >
          <option value="ALL">ทุกแผนก</option>
          {deptOptions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.departmentName}
            </option>
          ))}
        </CustomSelect>

        <IconButton onClick={load} title="รีเฟรช">
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
              tooltip="นับพนักงานที่ทำงานอยู่ทั้งหมดในแผนกที่เลือก"
            />

            <KpiCard
              icon={Users}
              tone="violet"
              label="ชาย / หญิง"
              value={`${data.maleCount} / ${data.femaleCount}`}
              unit="คน"
              tooltip="จำนวนพนักงานชาย เทียบกับ พนักงานหญิง"
            />

            {data.totalHeadcountPlan ? (
              <KpiCard
                icon={Target}
                tone="amber"
                label="ตำแหน่งที่ยังว่าง (ตามแผน)"
                value={Math.max(0, data.totalHeadcountPlan - data.totalEmployees).toLocaleString('th-TH')}
                unit="อัตรา"
                tooltip={`อัตรากำลังตามแผน (${data.totalHeadcountPlan}) − พนักงานจริง (${data.totalEmployees})`}
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
              tooltip="ผลรวมอายุงานของทุกคน ÷ จำนวนพนักงาน"
            />
          </KpiGrid>

          {/* Chart Row 1: Department Headcount */}
          <ReportPanel
            title="จำนวนพนักงานแต่ละแผนก"
            subtitle="แท่ง = พนักงานจริง · เส้นประ = อัตรากำลังตามแผน · ชี้เพื่อดูรายละเอียด"
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

          {/* Chart Row 2: Employee Type + Level + Tenure Distribution */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <ReportPanel title="ประเภทพนักงาน" subtitle="สัดส่วนตามประเภทการจ้างงาน">
              <DonutChart
                size={135}
                segments={toSegments(
                  data.byEmployeeType.map((t) => ({
                    name: !t.name || t.name === '-' ? 'ไม่ระบุ' : t.name,
                    count: t.count,
                  }))
                )}
              />
            </ReportPanel>

            <ReportPanel title="ระดับตำแหน่ง" subtitle="จำนวนพนักงานแยกตามระดับ">
              <BarList
                items={resolvedByLevel.map((lv, i) => ({
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
          <ReportTableCard
            searchValue={search}
            onSearchChange={(val) => {
              setSearch(val);
              setDeptPage(1);
            }}
            searchPlaceholder="ค้นหาชื่อแผนก รหัสแผนก หรือชื่อพนักงาน..."
            actions={
              <button
                type="button"
                onClick={() =>
                  setExpanded(allExpanded ? new Set() : new Set(filteredDepartments.map((d) => d.departmentId)))
                }
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
              >
                {allExpanded ? 'ซ่อนรายชื่อทั้งหมด' : 'แสดงรายชื่อทั้งหมด'}
              </button>
            }
            minWidthClassName="min-w-[880px]"
            pagination={{
              total: filteredDepartments.length,
              page: deptPage,
              pageSize: deptPageSize,
              onPageChange: setDeptPage,
              onPageSizeChange: (newSize) => {
                setDeptPageSize(newSize);
                setDeptPage(1);
              },
              totalLabel: 'แผนก',
            }}
          >
            <thead className="bg-primary text-white font-semibold">
              <tr className="whitespace-nowrap">
                <th className="py-3.5 px-4 whitespace-nowrap">แผนก</th>
                <th className="py-3.5 px-4 whitespace-nowrap">ฝ่าย</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">อัตรากำลังตามแผน</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">ชาย</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">หญิง</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">เข้าใหม่ปีนี้</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700/60 dark:bg-slate-900">
              {pagedDepartments.length === 0 ? (
                <TableEmpty colSpan={6} text="ไม่พบข้อมูลแผนกหรือพนักงานที่ค้นหา" />
              ) : (
                pagedDepartments.map((d) => {
                  const open = expanded.has(d.departmentId);
                  const under = d.headcountPlan != null && d.employeeCount < d.headcountPlan;
                  const over = d.headcountPlan != null && d.employeeCount > d.headcountPlan;

                  return (
                    <React.Fragment key={d.departmentId}>
                      <tr
                        className="cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                        onClick={() => toggle(d.departmentId)}
                      >
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {open ? (
                              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                            )}
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {d.departmentName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {d.divisionName}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {d.headcountPlan == null ? (
                            <span className="text-xs text-slate-400 dark:text-slate-500">ยังไม่ได้ระบุ</span>
                          ) : (
                            <span
                              className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                                under
                                  ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                  : over
                                    ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              }`}
                            >
                              {d.employeeCount} / {d.headcountPlan}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {d.maleCount}
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {d.femaleCount}
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {d.newHiresThisYear}
                        </td>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={6} className="bg-slate-50/80 px-4 py-3 sm:px-6 sm:py-4 dark:bg-slate-900/50">
                            {d.employees.length === 0 ? (
                              <div className="py-4 text-center text-xs text-slate-400">ยังไม่มีพนักงานในแผนกนี้</div>
                            ) : (
                              <DepartmentEmployeesSubTable
                                department={d}
                                resolveLevelName={resolveLevelName}
                              />
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
            <tfoot className="border-t border-slate-200 bg-slate-50 text-xs font-extrabold text-slate-800 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100">
              <tr>
                <td className="py-3 px-4">รวมทั้งสิ้น ({data.totalDepartments} แผนก)</td>
                <td className="py-3 px-4" />
                <td className="py-3 px-4 text-center">
                  {data.totalEmployees} / {data.totalHeadcountPlan ?? '-'}
                </td>
                <td className="py-3 px-4 text-center">{data.maleCount}</td>
                <td className="py-3 px-4 text-center">{data.femaleCount}</td>
                <td className="py-3 px-4 text-center">{data.newHiresThisYear}</td>
              </tr>
            </tfoot>
          </ReportTableCard>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ตารางย่อยรายชื่อพนักงานในแผนก (พร้อมค้นหา, ตัวกรองประเภท/ระดับ/เพศ, และ Row Per Page)
// ---------------------------------------------------------------------------
interface DepartmentEmployeesSubTableProps {
  department: DepartmentEmployees;
  resolveLevelName: (deptId: number, posName: string, rawLevel?: string | null) => string;
}

function DepartmentEmployeesSubTable({
  department,
  resolveLevelName,
}: DepartmentEmployeesSubTableProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ตัวเลือกประเภทพนักงานที่มีจริงในแผนกนี้
  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of department.employees) {
      const t = !e.employeeTypeName || e.employeeTypeName === '-' ? 'ไม่ระบุ' : e.employeeTypeName;
      set.add(t);
    }
    return Array.from(set).sort();
  }, [department.employees]);

  // ตัวเลือกระดับที่มีจริงในแผนกนี้
  const levelOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of department.employees) {
      const lv = resolveLevelName(department.departmentId, e.positionName, e.levelName);
      set.add(lv === '-' ? 'ไม่ระบุ' : lv);
    }
    return Array.from(set).sort();
  }, [department, resolveLevelName]);

  // ตัวเลือกเพศ (แสดง ชาย / หญิง เสมอ)
  const genderOptions = useMemo(() => {
    const set = new Set<string>(['ชาย', 'หญิง']);
    for (const e of department.employees) {
      if (e.gender) set.add(e.gender);
    }
    return Array.from(set);
  }, [department.employees]);

  // กรองรายชื่อพนักงานตามเงื่อนไขค้นหาและฟิลเตอร์
  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return department.employees.filter((e) => {
      // ค้นหาจากชื่อ รหัส หรือตำแหน่ง
      if (
        q &&
        !e.employeeName.toLowerCase().includes(q) &&
        !e.employeeCode.toLowerCase().includes(q) &&
        !e.positionName.toLowerCase().includes(q)
      ) {
        return false;
      }

      // กรองตามประเภท
      if (typeFilter !== 'ALL') {
        const t = !e.employeeTypeName || e.employeeTypeName === '-' ? 'ไม่ระบุ' : e.employeeTypeName;
        if (t !== typeFilter) return false;
      }

      // กรองตามระดับ
      if (levelFilter !== 'ALL') {
        const lv = resolveLevelName(department.departmentId, e.positionName, e.levelName);
        const resolved = lv === '-' ? 'ไม่ระบุ' : lv;
        if (resolved !== levelFilter) return false;
      }

      // กรองตามเพศ
      if (genderFilter !== 'ALL') {
        if (e.gender !== genderFilter) return false;
      }

      return true;
    });
  }, [department, search, typeFilter, levelFilter, genderFilter, resolveLevelName]);

  // ตัดข้อมูลตามหน้าและจำนวนต่อหน้า (Pagination)
  const pagedEmployees = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, page, pageSize]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {/* แถบค้นหาและตัวกรอง */}
      <TableToolbar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="ค้นหาชื่อ, รหัส, ตำแหน่ง..."
        searchContainerClassName="w-full sm:w-64"
        className="mb-3"
        filters={
          <div className="flex flex-wrap items-center gap-2">
            <CustomSelect
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              size="sm"
              className="w-36"
            >
              <option value="ALL">ทุกประเภท</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </CustomSelect>

            <CustomSelect
              value={levelFilter}
              onChange={(e) => {
                setLevelFilter(e.target.value);
                setPage(1);
              }}
              size="sm"
              className="w-40"
            >
              <option value="ALL">ทุกระดับ</option>
              {levelOptions.map((lv) => (
                <option key={lv} value={lv}>
                  {lv}
                </option>
              ))}
            </CustomSelect>

            <CustomSelect
              value={genderFilter}
              onChange={(e) => {
                setGenderFilter(e.target.value);
                setPage(1);
              }}
              size="sm"
              className="w-28"
            >
              <option value="ALL">ทุกเพศ</option>
              {genderOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </CustomSelect>
          </div>
        }
      />

      {/* ตารางข้อมูลพนักงาน */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="table-standard w-full text-left text-xs border-collapse whitespace-nowrap">
          <thead className="bg-primary text-white font-semibold">
            <tr className="whitespace-nowrap">
              <th className="py-3 px-4 whitespace-nowrap">พนักงาน</th>
              <th className="py-3 px-4 whitespace-nowrap">รหัสพนักงาน</th>
              <th className="py-3 px-4 whitespace-nowrap">ตำแหน่ง</th>
              <th className="py-3 px-4 whitespace-nowrap">ประเภท</th>
              <th className="py-3 px-4 whitespace-nowrap">ระดับ</th>
              <th className="py-3 px-4 whitespace-nowrap">เพศ</th>
              <th className="py-3 px-4 whitespace-nowrap">วันเริ่มงาน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700/60 dark:bg-slate-900">
            {pagedEmployees.length === 0 ? (
              <TableEmpty colSpan={7} text="ไม่พบข้อมูลพนักงานตามเงื่อนไขที่ค้นหา" />
            ) : (
              pagedEmployees.map((e) => (
                <tr
                  key={e.employeeId}
                  className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/40"
                >
                  <td className="py-3 px-4 whitespace-nowrap">
                    <AvatarName
                      id={e.employeeId}
                      name={e.employeeName}
                      avatarUrl={e.avatarUrl}
                    />
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {e.employeeCode}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {e.positionName}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {e.employeeTypeName === '-' || !e.employeeTypeName ? 'ไม่ระบุ' : e.employeeTypeName}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {resolveLevelName(department.departmentId, e.positionName, e.levelName)}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {e.gender}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {fmtDate(e.startDate)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* แถบแบ่งหน้า + กำหนดจำนวนแถวต่อหน้า (Row Per Page) */}
      <TablePagination
        total={filteredEmployees.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
        pageSizeOptions={[5, 10, 20, 50]}
        totalLabel="คน"
        className="border-t border-slate-100 pt-3 dark:border-slate-800"
      />
    </div>
  );
}

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Building2, ChevronDown, ChevronRight, Loader2, RefreshCw, UserPlus, Users } from 'lucide-react';
import { reportService } from '@/services/reportService';
import { organizationService } from '@/services/organizationService';
import type { Department, Division } from '@/types/organization';
import type { EmployeesByDepartmentReport } from '@/types/reports';
import { ChartCard, Legend, ProportionBars, RankBars, VIZ } from './ReportCharts';
import ExportMenu, { ReportExportFormat } from './ExportMenu';
import { printReport } from '@/lib/printReport';

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

/** รายงานพนักงานแยกตามแผนก (ตามขอบเขต "รายงานพนักงานแยกตามแผนก") */
export default function EmployeesByDepartmentTab({ canExport, onError }: { canExport: boolean; onError: (msg: string) => void }) {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisionId, setDivisionId] = useState<number | 'ALL'>('ALL');
  const [departmentId, setDepartmentId] = useState<number | 'ALL'>('ALL');
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
        subtitle: [div ? `ฝ่าย: ${div}` : 'ทุกฝ่าย', dept ? `แผนก: ${dept}` : 'ทุกแผนก', data ? `ณ วันที่ ${fmtDate(data.asOfDate)}` : '']
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

  const allExpanded = !!data && data.departments.length > 0 && data.departments.every((d) => expanded.has(d.departmentId));
  const selectCls =
    'px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20';

  return (
    <div className="space-y-4">
      {/* ตัวกรอง */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400" />
          <select
            value={divisionId}
            onChange={(e) => {
              setDivisionId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value));
              setDepartmentId('ALL');
            }}
            className={selectCls}
          >
            <option value="ALL">ทุกฝ่าย</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.divisionName}
              </option>
            ))}
          </select>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className={selectCls}
          >
            <option value="ALL">ทุกแผนก</option>
            {deptOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.departmentName}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={load}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
            title="โหลดข้อมูลใหม่"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {canExport && <ExportMenu onExport={handleExport} disabled={!data || data.totalEmployees === 0} />}
      </div>

      {loading && !data ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#0B2046]" />
          กำลังโหลดรายงาน...
        </div>
      ) : !data || data.departments.length === 0 ? (
        <div className="p-12 text-center text-sm text-slate-400 bg-white rounded-2xl border border-slate-200">ไม่พบแผนกตามตัวกรองที่เลือก</div>
      ) : (
        <div ref={printRef} className="space-y-4">
          {/* การ์ดสรุป */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Users className="w-3.5 h-3.5" /> พนักงานทั้งหมด
              </span>
              <div className="text-2xl font-extrabold text-slate-900">
                {data.totalEmployees} <span className="text-xs font-normal text-slate-400">คน</span>
              </div>
              <div className="text-[11px] text-slate-400">
                {data.totalDepartments} แผนก
                {data.totalHeadcountPlan ? ` · อัตรากำลังตามแผน ${data.totalHeadcountPlan} คน` : ''}
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs text-slate-500">ชาย / หญิง</span>
              <div className="text-2xl font-extrabold text-slate-900">
                {data.maleCount} <span className="text-base font-semibold text-slate-400">/</span> {data.femaleCount}
              </div>
              <div className="text-[11px] text-slate-400">ไม่ระบุ {data.otherGenderCount} คน</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <UserPlus className="w-3.5 h-3.5" /> เข้าใหม่ปีนี้
              </span>
              <div className="text-2xl font-extrabold text-slate-900">
                {data.newHiresThisYear} <span className="text-xs font-normal text-slate-400">คน</span>
              </div>
              <div className="text-[11px] text-slate-400">นับจากวันเริ่มงานในสัญญาจ้าง</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs text-slate-500">ตำแหน่งที่ยังว่าง (ตามแผน)</span>
              <div className="text-2xl font-extrabold text-slate-900">
                {data.totalHeadcountPlan ? Math.max(0, data.totalHeadcountPlan - data.totalEmployees) : '-'}{' '}
                <span className="text-xs font-normal text-slate-400">{data.totalHeadcountPlan ? 'คน' : ''}</span>
              </div>
              <div className="text-[11px] text-slate-400">{data.totalHeadcountPlan ? 'อัตรากำลังตามแผน − พนักงานจริง' : 'ยังไม่ได้กำหนดอัตรากำลังของตำแหน่ง'}</div>
            </div>
          </div>

          {/* กราฟ */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <ChartCard title="จำนวนพนักงานแต่ละแผนก" subtitle="ตัวเลขหลัง / = อัตรากำลังตามแผน" className="xl:col-span-2">
              <RankBars
                color={VIZ.s1}
                items={[...data.departments]
                  .sort((a, b) => b.employeeCount - a.employeeCount)
                  .map((d) => ({
                    id: d.departmentId,
                    label: d.departmentName,
                    sub: d.divisionName,
                    value: d.employeeCount,
                    valueLabel: d.headcountPlan ? `${d.employeeCount} / ${d.headcountPlan} คน` : `${d.employeeCount} คน`,
                  }))}
              />
            </ChartCard>
            <div className="space-y-4">
              <ChartCard title="สัดส่วนเพศ" legend={<Legend items={[{ label: 'ชาย', color: VIZ.s1 }, { label: 'หญิง', color: VIZ.s2 }, { label: 'ไม่ระบุ', color: VIZ.neutral }]} />}>
                <ProportionBars
                  rows={[
                    {
                      id: 'all',
                      label: 'ทั้งหมด',
                      segments: [
                        { key: 'm', label: 'ชาย', value: data.maleCount, color: VIZ.s1 },
                        { key: 'f', label: 'หญิง', value: data.femaleCount, color: VIZ.s2 },
                        { key: 'o', label: 'ไม่ระบุ', value: data.otherGenderCount, color: VIZ.neutral },
                      ],
                    },
                  ]}
                />
              </ChartCard>
              <ChartCard title="ประเภทพนักงาน">
                <RankBars
                  color={VIZ.s3}
                  items={data.byEmployeeType.map((t) => ({ id: t.name, label: t.name, value: t.count, valueLabel: `${t.count} คน` }))}
                />
              </ChartCard>
            </div>
          </div>

          {/* ตาราง */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">รายละเอียดรายแผนก</h3>
              <button
                type="button"
                data-print-hide
                onClick={() => setExpanded(allExpanded ? new Set() : new Set(data.departments.map((d) => d.departmentId)))}
                className="text-xs font-medium text-[#0B2046] hover:underline print:hidden"
              >
                {allExpanded ? 'ซ่อนรายชื่อทั้งหมด' : 'แสดงรายชื่อทั้งหมด'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 sticky left-0 bg-slate-50 z-[1]">แผนก</th>
                    <th className="py-3 px-4">ฝ่าย</th>
                    <th className="py-3 px-4 text-center">พนักงาน</th>
                    <th className="py-3 px-4 text-center">อัตรากำลังตามแผน</th>
                    <th className="py-3 px-4 text-center">ชาย</th>
                    <th className="py-3 px-4 text-center">หญิง</th>
                    <th className="py-3 px-4 text-center">เข้าใหม่ปีนี้</th>
                    <th className="py-3 px-4">ประเภทพนักงาน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.departments.map((d) => {
                    const open = expanded.has(d.departmentId);
                    const under = d.headcountPlan != null && d.employeeCount < d.headcountPlan;
                    const over = d.headcountPlan != null && d.employeeCount > d.headcountPlan;
                    return (
                      <React.Fragment key={d.departmentId}>
                        <tr className="hover:bg-slate-50/60 cursor-pointer" onClick={() => toggle(d.departmentId)}>
                          <td className="py-3 px-4 sticky left-0 bg-white z-[1]">
                            <span className="inline-flex items-center gap-1.5 font-medium text-slate-900">
                              {open ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                              {d.departmentName}
                            </span>
                            <span className="ml-5 block text-[11px] font-mono text-slate-400">{d.departmentCode}</span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">{d.divisionName}</td>
                          <td className="py-3 px-4 text-center font-bold text-slate-900">{d.employeeCount}</td>
                          <td className="py-3 px-4 text-center">
                            {d.headcountPlan == null ? (
                              <span className="text-slate-300">-</span>
                            ) : (
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                  under
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : over
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                                title={under ? 'ยังรับคนไม่ครบตามแผน' : over ? 'คนเกินอัตรากำลังตามแผน' : 'ครบตามแผน'}
                              >
                                {d.headcountPlan} {under ? `(ขาด ${d.headcountPlan - d.employeeCount})` : over ? `(เกิน ${d.employeeCount - d.headcountPlan})` : '(ครบ)'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-700">{d.maleCount}</td>
                          <td className="py-3 px-4 text-center text-slate-700">{d.femaleCount}</td>
                          <td className="py-3 px-4 text-center text-slate-700">{d.newHiresThisYear}</td>
                          <td className="py-3 px-4 text-xs text-slate-500">
                            {d.byEmployeeType.map((t) => `${t.name} ${t.count}`).join(' · ') || '-'}
                          </td>
                        </tr>
                        {open && (
                          <tr>
                            <td colSpan={8} className="bg-slate-50 px-4 py-3">
                              {d.employees.length === 0 ? (
                                <div className="text-xs text-slate-400">ยังไม่มีพนักงานในแผนกนี้</div>
                              ) : (
                                <table className="w-full text-xs">
                                  <thead className="text-slate-500">
                                    <tr>
                                      <th className="py-1.5 pr-3 text-left font-semibold">รหัส</th>
                                      <th className="py-1.5 pr-3 text-left font-semibold">ชื่อ-นามสกุล</th>
                                      <th className="py-1.5 pr-3 text-left font-semibold">ตำแหน่ง</th>
                                      <th className="py-1.5 pr-3 text-left font-semibold">ประเภท</th>
                                      <th className="py-1.5 pr-3 text-left font-semibold">ระดับ</th>
                                      <th className="py-1.5 pr-3 text-left font-semibold">เพศ</th>
                                      <th className="py-1.5 text-left font-semibold">วันเริ่มงาน</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {d.employees.map((e) => (
                                      <tr key={e.employeeId} className="border-t border-slate-200">
                                        <td className="py-1.5 pr-3 font-mono text-slate-500">{e.employeeCode}</td>
                                        <td className="py-1.5 pr-3 font-medium text-slate-800">{e.employeeName}</td>
                                        <td className="py-1.5 pr-3 text-slate-600">{e.positionName}</td>
                                        <td className="py-1.5 pr-3 text-slate-600">{e.employeeTypeName}</td>
                                        <td className="py-1.5 pr-3 text-slate-600">{e.levelName}</td>
                                        <td className="py-1.5 pr-3 text-slate-600">{e.gender}</td>
                                        <td className="py-1.5 text-slate-600">{fmtDate(e.startDate)}</td>
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
                <tfoot className="bg-slate-50 text-xs font-semibold text-slate-700 border-t border-slate-200">
                  <tr>
                    <td className="py-3 px-4 sticky left-0 bg-slate-50 z-[1]">รวมทั้งสิ้น</td>
                    <td className="py-3 px-4" />
                    <td className="py-3 px-4 text-center">{data.totalEmployees}</td>
                    <td className="py-3 px-4 text-center">{data.totalHeadcountPlan ?? '-'}</td>
                    <td className="py-3 px-4 text-center">{data.maleCount}</td>
                    <td className="py-3 px-4 text-center">{data.femaleCount}</td>
                    <td className="py-3 px-4 text-center">{data.newHiresThisYear}</td>
                    <td className="py-3 px-4" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

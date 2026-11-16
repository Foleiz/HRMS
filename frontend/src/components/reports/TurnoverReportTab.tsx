'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import { useLoadPhase } from '@/hooks/useLoadPhase';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useToast } from '@/context/ToastContext';
import { reportService } from '@/services/reportService';
import { organizationService } from '@/services/organizationService';
import type { MonthlyTurnoverSummary } from '@/types/reports';
import type { Department, Division } from '@/types/organization';
import { getSmartYearRange } from '@/lib/yearUtils';
import { TH_MONTHS } from '@/lib/thaiDate';
import { printReport } from '@/lib/printReport';
import ExportMenu, { ReportExportFormat } from './ExportMenu';
import { Legend, MonthlyColumns, fmtNumber } from './ReportCharts';
import {
  AvatarName,
  BarList,
  DeltaBadge,
  IconButton,
  KpiCard,
  KpiGrid,
  ReportEmpty,
  ReportFilterBar,
  ReportLoading,
  ReportPanel,
  ReportTableCard,
  TableEmpty,
} from './ReportShell';

export interface TurnoverReportTabProps {
  canExport: boolean;
}

const monthsUpTo = (year: number) => {
  const now = new Date();
  const last = year < now.getFullYear() ? 12 : year === now.getFullYear() ? now.getMonth() + 1 : 0;
  return Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => m <= last);
};

/** รายงานอัตราการลาออก (Redesign ตามมาตรฐาน Report Shell) */
export default function TurnoverReportTab({ canExport }: TurnoverReportTabProps) {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [turnoverYear, setTurnoverYear] = useState<number>(new Date().getFullYear());
  const [turnoverMonth, setTurnoverMonth] = useState<number>(new Date().getMonth() + 1);
  const [turnoverDivision, setTurnoverDivision] = useState<number | 'ALL'>('ALL');
  const [turnoverDepartment, setTurnoverDepartment] = useState<number | 'ALL'>('ALL');
  const [turnoverData, setTurnoverData] = useState<MonthlyTurnoverSummary | null>(null);
  const [deptSearch, setDeptSearch] = useState('');
  const [deptPage, setDeptPage] = useState(1);
  const [deptPageSize, setDeptPageSize] = useState(10);
  const [logSearch, setLogSearch] = useState('');
  const [turnoverPage, setTurnoverPage] = useState(1);
  const [turnoverPageSize, setTurnoverPageSize] = useState(10);
  const [isLoadingTurnover, setIsLoadingTurnover] = useState(false);
  const turnoverPhase = useLoadPhase(isLoadingTurnover);
  const [isExportingTurnover, setIsExportingTurnover] = useState(false);
  const [turnoverTrend, setTurnoverTrend] = useState<{
    rate: (number | null)[];
    joined: (number | null)[];
    resigned: (number | null)[];
  } | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([organizationService.getDivisions(), organizationService.getDepartments()])
      .then(([divs, depts]) => {
        setDivisions(divs);
        setDepartments(depts);
      })
      .catch(() => undefined);
  }, []);

  const loadTurnover = useCallback(async () => {
    try {
      setIsLoadingTurnover(true);
      const divId = turnoverDivision === 'ALL' ? undefined : Number(turnoverDivision);
      const deptId = turnoverDepartment === 'ALL' ? undefined : Number(turnoverDepartment);
      const data = await reportService.getMonthlyTurnover(turnoverYear, turnoverMonth, divId, deptId);
      setTurnoverData(data);
      setTurnoverPage(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถโหลดรายงานอัตราการเข้า-ออกของพนักงานได้';
      toastRef.current.error(msg);
    } finally {
      setIsLoadingTurnover(false);
    }
  }, [turnoverYear, turnoverMonth, turnoverDivision, turnoverDepartment]);

  useEffect(() => {
    loadTurnover();
  }, [loadTurnover]);

  useEffect(() => {
    let cancelled = false;
    const divId = turnoverDivision === 'ALL' ? undefined : Number(turnoverDivision);
    const deptId = turnoverDepartment === 'ALL' ? undefined : Number(turnoverDepartment);
    const months = monthsUpTo(turnoverYear);
    Promise.allSettled(months.map((m) => reportService.getMonthlyTurnover(turnoverYear, m, divId, deptId))).then(
      (res) => {
        if (cancelled) return;
        const rate: (number | null)[] = Array(12).fill(null);
        const joined: (number | null)[] = Array(12).fill(null);
        const resigned: (number | null)[] = Array(12).fill(null);
        res.forEach((r, i) => {
          if (r.status === 'fulfilled') {
            rate[months[i] - 1] = r.value.overallTurnoverRate;
            joined[months[i] - 1] = r.value.totalJoinedCount;
            resigned[months[i] - 1] = r.value.totalResignedCount;
          }
        });
        setTurnoverTrend({ rate, joined, resigned });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [turnoverYear, turnoverDivision, turnoverDepartment]);

  const handleExportTurnover = async (format: ReportExportFormat = 'csv') => {
    if (format === 'pdf') {
      printReport(printRef.current, {
        title: 'รายงานอัตราการลาออก',
        subtitle: `เดือน ${TH_MONTHS[turnoverMonth - 1]} พ.ศ. ${turnoverYear + 543}`,
      });
      return;
    }
    try {
      setIsExportingTurnover(true);
      const divId = turnoverDivision === 'ALL' ? undefined : turnoverDivision;
      const deptId = turnoverDepartment === 'ALL' ? undefined : turnoverDepartment;
      await reportService.downloadMonthlyTurnoverCsv(turnoverYear, turnoverMonth, divId, deptId, format);
      toast.success('ดาวน์โหลดรายงานอัตราการลาออกสำเร็จ');
    } catch {
      toast.error('เกิดข้อผิดพลาดในการดาวน์โหลดรายงานอัตราการลาออก');
    } finally {
      setIsExportingTurnover(false);
    }
  };

  // คำนวณยอดสะสมทั้งปีจาก trend
  const ytdTotals = useMemo(() => {
    if (!turnoverTrend) return { resignedYtd: turnoverData?.totalResignedCount ?? 0, joinedYtd: turnoverData?.totalJoinedCount ?? 0 };
    const resignedYtd = turnoverTrend.resigned.reduce<number>((s, v) => s + (v ?? 0), 0);
    const joinedYtd = turnoverTrend.joined.reduce<number>((s, v) => s + (v ?? 0), 0);
    return { resignedYtd, joinedYtd };
  }, [turnoverTrend, turnoverData]);

  // เปรียบเทียบกับเดือนก่อนหน้าในชุด trend
  const prevMonthRateDelta = useMemo(() => {
    if (!turnoverTrend || turnoverMonth <= 1) return null;
    const curr = turnoverTrend.rate[turnoverMonth - 1];
    const prev = turnoverTrend.rate[turnoverMonth - 2];
    if (curr == null || prev == null) return null;
    return curr - prev;
  }, [turnoverTrend, turnoverMonth]);

  // สรุปเหตุผลการลาออกจาก eventLogs
  const resignationReasons = useMemo(() => {
    if (!turnoverData) return [];
    const map = new Map<string, number>();
    for (const ev of turnoverData.eventLogs) {
      if (ev.eventType === 'JOINED') continue;
      const r = (ev.reason || 'ไม่ระบุเหตุผล').trim();
      map.set(r, (map.get(r) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value, display: `${value} คน` }))
      .sort((a, b) => b.value - a.value);
  }, [turnoverData]);

  const filteredTurnoverDepts = useMemo(() => {
    if (!turnoverData?.departmentTurnovers) return [];
    const q = deptSearch.trim().toLowerCase();
    if (!q) return turnoverData.departmentTurnovers;
    return turnoverData.departmentTurnovers.filter(
      (d) =>
        d.departmentName.toLowerCase().includes(q) ||
        d.departmentCode.toLowerCase().includes(q) ||
        d.divisionName.toLowerCase().includes(q)
    );
  }, [turnoverData?.departmentTurnovers, deptSearch]);

  const pagedTurnoverDepts = useMemo(() => {
    const start = (deptPage - 1) * deptPageSize;
    return filteredTurnoverDepts.slice(start, start + deptPageSize);
  }, [filteredTurnoverDepts, deptPage, deptPageSize]);

  const filteredTurnoverLogs = useMemo(() => {
    if (!turnoverData?.eventLogs) return [];
    const q = logSearch.trim().toLowerCase();
    if (!q) return turnoverData.eventLogs;
    return turnoverData.eventLogs.filter(
      (ev) =>
        ev.employeeName.toLowerCase().includes(q) ||
        ev.employeeCode.toLowerCase().includes(q) ||
        ev.departmentName.toLowerCase().includes(q) ||
        ev.positionName.toLowerCase().includes(q) ||
        (ev.reason || '').toLowerCase().includes(q)
    );
  }, [turnoverData?.eventLogs, logSearch]);

  const pagedTurnoverLogs = useMemo(() => {
    const start = (turnoverPage - 1) * turnoverPageSize;
    return filteredTurnoverLogs.slice(start, start + turnoverPageSize);
  }, [filteredTurnoverLogs, turnoverPage, turnoverPageSize]);

  const sparkRates = useMemo(
    () => (turnoverTrend ? turnoverTrend.rate.filter((v): v is number => v != null) : []),
    [turnoverTrend]
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <ReportFilterBar
        loading={isLoadingTurnover}
        right={
          canExport ? (
            <ExportMenu onExport={handleExportTurnover} disabled={isExportingTurnover || !turnoverData} />
          ) : undefined
        }
      >
        <CustomSelect
          value={turnoverMonth}
          onChange={(e) => setTurnoverMonth(Number(e.target.value))}
          className="min-w-[140px]"
        >
          {TH_MONTHS.map((m, idx) => (
            <option key={idx + 1} value={idx + 1}>
              {m}
            </option>
          ))}
        </CustomSelect>

        <CustomSelect
          value={turnoverYear}
          onChange={(e) => setTurnoverYear(Number(e.target.value))}
          className="min-w-[130px]"
        >
          {getSmartYearRange({ forwardYears: 1, backYears: 5, selectedYear: turnoverYear }).map((y) => (
            <option key={y} value={y}>
              พ.ศ. {y + 543}
            </option>
          ))}
        </CustomSelect>

        <CustomSelect
          value={turnoverDivision}
          onChange={(val) => {
            const parsed = String(val) === 'ALL' ? 'ALL' : Number(val);
            setTurnoverDivision(parsed);
            setTurnoverDepartment('ALL');
          }}
          placeholder="ทุกฝ่าย"
          className="min-w-[160px]"
          options={[
            { value: 'ALL', label: 'ทุกฝ่าย' },
            ...divisions.map((div) => ({ value: div.id, label: div.divisionName })),
          ]}
        />

        <CustomSelect
          value={turnoverDepartment}
          onChange={(val) => {
            const parsed = String(val) === 'ALL' ? 'ALL' : Number(val);
            setTurnoverDepartment(parsed);
          }}
          placeholder="ทุกแผนก"
          className="min-w-[160px]"
          options={[
            { value: 'ALL', label: 'ทุกแผนก' },
            ...departments
              .filter((dept) => turnoverDivision === 'ALL' || dept.divisionId === turnoverDivision)
              .map((dept) => ({ value: dept.id, label: dept.departmentName })),
          ]}
        />

        <IconButton onClick={loadTurnover} title="รีเฟรชข้อมูล">
          <RefreshCw className={`h-3.5 w-3.5 ${isLoadingTurnover ? 'animate-spin' : ''}`} />
        </IconButton>
      </ReportFilterBar>

      {turnoverPhase.initialLoading && !turnoverData ? (
        <ReportLoading text="กำลังโหลดรายงานอัตราการเข้า-ออกของพนักงาน..." />
      ) : !turnoverData ? (
        <ReportEmpty text="ไม่พบข้อมูลรายงานอัตราการลาออกตามเงื่อนไขที่เลือก" />
      ) : (
        <div ref={printRef} className="space-y-5">
          {/* 5 KPI Cards */}
          <KpiGrid cols={5}>
            <KpiCard
              icon={UserMinus}
              tone="rose"
              label="อัตราลาออก (เดือนนี้)"
              value={turnoverData.overallTurnoverRate}
              unit="%"
              spark={sparkRates}
              tooltip="(คนลาออก ÷ พนักงานเฉลี่ยต้น-สิ้นเดือน) × 100"
            />

            <KpiCard
              icon={CheckCircle2}
              tone="emerald"
              label="อัตราคงอยู่"
              value={turnoverData.overallRetentionRate}
              unit="%"
              tooltip="100% − อัตราลาออกของเดือนนี้"
            />

            <KpiCard
              icon={TrendingUp}
              tone="amber"
              label="ลาออกสะสมปีนี้"
              value={ytdTotals.resignedYtd}
              unit="คน"
              tooltip="จำนวนคนลาออกรวมตั้งแต่ต้นปีถึงปัจจุบัน"
            />

            <KpiCard
              icon={UserPlus}
              tone="blue"
              label="เข้าใหม่ / ลาออก"
              value={`${turnoverData.totalJoinedCount} / ${turnoverData.totalResignedCount}`}
              unit="คน"
              tooltip="คนเริ่มงานใหม่ เทียบกับ คนลาออกในเดือนนี้"
            />

            <KpiCard
              icon={Users}
              tone="violet"
              label="ต้นงวด → สิ้นงวด"
              value={`${turnoverData.totalBeginningHeadcount} → ${turnoverData.totalEndingHeadcount}`}
              unit="คน"
              tooltip="คนต้นเดือน + คนเข้าใหม่ − คนลาออก = คนสิ้นเดือน"
            />
          </KpiGrid>

          {/* Chart Row 1: 12-Month Trend + Resignation Reasons */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <ReportPanel
              title={`แนวโน้มพนักงานเข้าใหม่และลาออก ปี พ.ศ. ${turnoverYear + 543}`}
              subtitle="เปรียบเทียบจำนวนคนเข้าใหม่และลาออกในแต่ละเดือน · แถบไฮไลต์ = เดือนที่เลือก"
              className="xl:col-span-2"
              right={
                <Legend
                  items={[
                    { label: 'เข้าใหม่', color: '#10b981' },
                    { label: 'ลาออก', color: '#f43f5e' },
                  ]}
                />
              }
            >
              {turnoverTrend &&
              (turnoverTrend.joined.some((v) => v != null) || turnoverTrend.resigned.some((v) => v != null)) ? (
                <MonthlyColumns
                  highlightMonth={turnoverMonth}
                  minMax={4}
                  format={fmtNumber}
                  tipFormat={(v) => `${fmtNumber(v)} คน`}
                  series={[
                    { key: 'joined', label: 'เข้าใหม่', color: '#10b981', values: turnoverTrend.joined },
                    { key: 'resigned', label: 'ลาออก', color: '#f43f5e', values: turnoverTrend.resigned },
                  ]}
                />
              ) : (
                <div className="py-10 text-center text-xs text-slate-400">กำลังโหลดแนวโน้มรายเดือน...</div>
              )}
            </ReportPanel>

            <ReportPanel title="เหตุผลการลาออก / พ้นสภาพ" subtitle="สรุปจากรายการพ้นสภาพในงวดเดือนที่เลือก">
              <BarList
                color="#f43f5e"
                items={resignationReasons}
                emptyText="ไม่มีรายการพนักงานลาออกในเดือนนี้"
              />
            </ReportPanel>
          </div>

          {/* Chart Row 2: Department Heatmap List + Recent Movements */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ReportPanel
              title="อัตราการลาออกแยกตามแผนก"
              subtitle="ความเข้มของแถบสีแสดงระดับอัตราการลาออกของแต่ละแผนกในเดือนที่เลือก"
            >
              <div className="space-y-2.5">
                {turnoverData.departmentTurnovers.map((d) => {
                  const intensity = Math.min(d.turnoverRate / 25, 1) * 0.85 + 0.08;
                  return (
                    <div key={d.departmentId} className="flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-800 dark:text-slate-100">{d.departmentName}</span>
                        <span className="ml-1.5 text-[11px] text-slate-400">({d.divisionName})</span>
                      </div>
                      <span
                        className="w-16 rounded-lg px-2 py-1 text-center font-extrabold"
                        style={{
                          background: `rgba(225, 29, 72, ${intensity})`,
                          color: d.turnoverRate > 12 ? '#ffffff' : '#9f1239',
                        }}
                      >
                        {d.turnoverRate}%
                      </span>
                      <span className="w-24 text-right text-slate-500 dark:text-slate-400">
                        เข้า {d.joinedCount} · ออก {d.resignedCount}
                      </span>
                    </div>
                  );
                })}
              </div>
            </ReportPanel>

            <ReportPanel title="ความเคลื่อนไหวพนักงานในเดือนนี้" subtitle="รายการเริ่มงานใหม่และพ้นสภาพล่าสุด">
              {turnoverData.eventLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">ไม่มีรายการเคลื่อนไหวในเดือนที่เลือก</div>
              ) : (
                <div className="relative space-y-3 before:absolute before:bottom-2 before:left-[13px] before:top-2 before:w-px before:bg-slate-200 dark:before:bg-slate-700">
                  {turnoverData.eventLogs.slice(0, 6).map((ev, i) => {
                    const isJoin = ev.eventType === 'JOINED';
                    return (
                      <div key={i} className="relative flex items-center gap-3">
                        <span
                          className={`z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white ${
                            isJoin ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        >
                          {isJoin ? '+' : '−'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{ev.employeeName}</div>
                          <div className="truncate text-[11px] text-slate-400">
                            {isJoin ? 'เริ่มงานใหม่' : ev.eventType === 'TERMINATED' ? 'เลิกจ้าง' : 'ลาออก'} ·{' '}
                            {ev.departmentName} ({ev.positionName})
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-[11px] text-slate-400">{ev.eventDate}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </ReportPanel>
          </div>

          {/* Department Breakdown Table */}
          <ReportTableCard
            searchValue={deptSearch}
            onSearchChange={(val) => {
              setDeptSearch(val);
              setDeptPage(1);
            }}
            searchPlaceholder="ค้นหาชื่อแผนก หรือรหัสแผนก..."
            refreshing={turnoverPhase.refreshing}
            minWidthClassName="min-w-[880px]"
            pagination={{
              total: filteredTurnoverDepts.length,
              page: deptPage,
              pageSize: deptPageSize,
              onPageChange: setDeptPage,
              onPageSizeChange: (newSize) => {
                setDeptPageSize(newSize);
                setDeptPage(1);
              },
              pageSizeOptions: [10, 20, 50, 100],
              totalLabel: 'แผนก',
            }}
          >
            <thead className="bg-primary text-white font-semibold">
              <tr className="whitespace-nowrap">
                <th className="py-3.5 px-4 whitespace-nowrap">แผนก / ฝ่าย</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">ต้นงวด (คน)</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">เข้าใหม่</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">ลาออก</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">สิ้นงวด (คน)</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">อัตราลาออก (%)</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">อัตราคงอยู่ (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700/60 dark:bg-slate-900">
              {pagedTurnoverDepts.length === 0 ? (
                <TableEmpty colSpan={7} text="ไม่พบข้อมูลแผนกที่ค้นหา" />
              ) : (
                pagedTurnoverDepts.map((dept) => (
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
                    <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {dept.beginningHeadcount}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-600 whitespace-nowrap">
                      {dept.joinedCount > 0 ? `+${dept.joinedCount}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-rose-600 whitespace-nowrap">
                      {dept.resignedCount > 0 ? `-${dept.resignedCount}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-center font-extrabold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {dept.endingHeadcount}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                          dept.turnoverRate === 0
                            ? 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                            : dept.turnoverRate <= 5
                              ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                              : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                        }`}
                      >
                        {dept.turnoverRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                          dept.retentionRate >= 95
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : dept.retentionRate >= 80
                              ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                              : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                        }`}
                      >
                        {dept.retentionRate}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </ReportTableCard>

          {/* Event Logs Table */}
          <ReportTableCard
            searchValue={logSearch}
            onSearchChange={(val) => {
              setLogSearch(val);
              setTurnoverPage(1);
            }}
            searchPlaceholder="ค้นหาชื่อพนักงาน รหัส หรือแผนก..."
            minWidthClassName="min-w-[850px]"
            pagination={{
              total: filteredTurnoverLogs.length,
              page: turnoverPage,
              pageSize: turnoverPageSize,
              onPageChange: setTurnoverPage,
              onPageSizeChange: (newSize) => {
                setTurnoverPageSize(newSize);
                setTurnoverPage(1);
              },
              pageSizeOptions: [10, 20, 50, 100],
            }}
          >
            <thead className="bg-primary text-white font-semibold">
              <tr className="whitespace-nowrap">
                <th className="py-3.5 px-4 whitespace-nowrap">วันที่</th>
                <th className="py-3.5 px-4 whitespace-nowrap">พนักงาน</th>
                <th className="py-3.5 px-4 whitespace-nowrap">รหัสพนักงาน</th>
                <th className="py-3.5 px-4 whitespace-nowrap">แผนก / ตำแหน่ง</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">ประเภทเหตุการณ์</th>
                <th className="py-3.5 px-4 whitespace-nowrap">เหตุผล / หมายเหตุ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700/60 dark:bg-slate-900">
              {pagedTurnoverLogs.length === 0 ? (
                <TableEmpty colSpan={6} text="ไม่มีประวัติความเคลื่อนไหวพนักงานในเดือนที่เลือก" />
              ) : (
                pagedTurnoverLogs.map((ev, idx) => (
                  <tr
                    key={`${ev.employeeId}-${idx}`}
                    className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/40"
                  >
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {ev.eventDate}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <AvatarName id={ev.employeeId} name={ev.employeeName} />
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {ev.employeeCode}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{ev.departmentName}</div>
                      <div className="text-[11px] text-slate-400">{ev.positionName}</div>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {ev.eventType === 'JOINED' ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <UserPlus className="h-3 w-3" /> เริ่มงานใหม่
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                          <UserMinus className="h-3 w-3" /> {ev.eventType === 'TERMINATED' ? 'เลิกจ้าง' : 'ลาออก'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {ev.reason || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </ReportTableCard>
        </div>
      )}
    </div>
  );
}

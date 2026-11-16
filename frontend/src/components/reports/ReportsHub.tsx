'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CalendarCheck, CalendarX2, PieChart, Receipt, UserMinus, type LucideIcon } from 'lucide-react';
import { reportService } from '@/services/reportService';
import { leaveInsightsService } from '@/services/leaveInsightsService';
import { TH_MONTHS } from '@/lib/thaiDate';
import { REPORT_THEMES, Sparkline, type ReportThemeKey } from './ReportShell';

export type ReportTabKey = 'department' | 'attendance' | 'leave' | 'turnover' | 'tax';

interface HubProps {
  canDept: boolean;
  canAttendance: boolean;
  canLeave: boolean;
  canTurnover: boolean;
  canTax: boolean;
}

interface Card {
  tab: ReportTabKey;
  theme: ReportThemeKey;
  icon: LucideIcon;
  title: string;
  description: string;
  value: string;
  unit: string;
  note: string;
  spark?: number[];
}

const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** หน้าภาพรวมรายงาน: การ์ดสรุปรายงานหลักทั้ง 4 + รายงานเสริม */
export default function ReportsHub({ canDept, canAttendance, canLeave, canTurnover, canTax }: HubProps) {
  const router = useRouter();
  const [stats, setStats] = useState({
    employees: null as number | null,
    newHires: 0,
    present: null as number | null,
    expected: 0,
    late: 0,
    rate: null as number | null,
    pending: null as number | null,
    leaveDays: 0,
    leaveByMonth: [] as number[],
    turnoverRate: null as number | null,
    resignedMonth: 0,
    joinedMonth: 0,
  });

  useEffect(() => {
    let active = true;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    Promise.allSettled([
      canDept ? reportService.getEmployeesByDepartment() : Promise.reject(),
      canAttendance ? reportService.getDailyHeadcount(localDate()) : Promise.reject(),
      canLeave ? leaveInsightsService.getSummary(year) : Promise.reject(),
      canTurnover ? reportService.getMonthlyTurnover(year, month) : Promise.reject(),
    ]).then(([dept, att, leave, turn]) => {
      if (!active) return;
      setStats((s) => ({
        ...s,
        ...(dept.status === 'fulfilled' ? { employees: dept.value.totalEmployees, newHires: dept.value.newHiresThisYear } : {}),
        ...(att.status === 'fulfilled'
          ? { present: att.value.totalPresent, expected: att.value.totalExpected ?? att.value.totalEmployees, late: att.value.totalLate, rate: att.value.overallAttendanceRate }
          : {}),
        ...(leave.status === 'fulfilled'
          ? { pending: leave.value.pendingRequests, leaveDays: leave.value.totalDays, leaveByMonth: leave.value.byMonth.map((m) => m.days) }
          : {}),
        ...(turn.status === 'fulfilled'
          ? { turnoverRate: turn.value.overallTurnoverRate, resignedMonth: turn.value.totalResignedCount, joinedMonth: turn.value.totalJoinedCount }
          : {}),
      }));
    });
    return () => {
      active = false;
    };
  }, [canDept, canAttendance, canLeave, canTurnover]);

  const fmt = (n: number | null, digits = 0) => (n == null ? '–' : n.toLocaleString('th-TH', { maximumFractionDigits: digits }));
  const monthName = TH_MONTHS[new Date().getMonth()];

  const cards: (Card & { show: boolean })[] = [
    {
      show: canDept,
      tab: 'department',
      theme: 'dept',
      icon: PieChart,
      title: 'พนักงานแยกตามแผนก',
      description: 'โครงสร้างกำลังคน เพศ ประเภทพนักงาน ระดับ อายุงาน และอัตรากำลังตามแผน',
      value: fmt(stats.employees),
      unit: 'คน',
      note: `เข้าใหม่ปีนี้ ${fmt(stats.newHires)} คน`,
    },
    {
      show: canAttendance,
      tab: 'attendance',
      theme: 'attendance',
      icon: CalendarCheck,
      title: 'การเข้าออกงาน',
      description: 'สถานะมาทำงาน มาสาย ขาดงาน แบบรายวัน และสรุปรายเดือนรายบุคคล',
      value: stats.rate == null ? '–' : `${fmt(Math.min(100, Math.max(0, stats.rate)), 1)}`,
      unit: '% วันนี้',
      note: `มาทำงาน ${fmt(stats.present)}/${fmt(stats.expected)} · สาย ${fmt(stats.late)} คน`,
    },
    {
      show: canLeave,
      tab: 'leave',
      theme: 'leave',
      icon: CalendarX2,
      title: 'การลา',
      description: 'สถิติวันลา ประเภทการลา แนวโน้มรายเดือน แยกตามแผนกและพนักงาน',
      value: fmt(stats.pending),
      unit: 'ใบรออนุมัติ',
      note: `วันลารวมปีนี้ ${fmt(stats.leaveDays, 1)} วัน`,
      spark: stats.leaveByMonth,
    },
    {
      show: canTurnover,
      tab: 'turnover',
      theme: 'turnover',
      icon: UserMinus,
      title: 'อัตราการลาออก',
      description: 'อัตราเข้า-ออก อัตราคงอยู่ เหตุผลการลาออก แยกตามแผนก',
      value: fmt(stats.turnoverRate, 1),
      unit: `% เดือน${monthName}`,
      note: `ลาออก ${fmt(stats.resignedMonth)} · เข้าใหม่ ${fmt(stats.joinedMonth)} คน`,
    },
  ];

  const open = (tab: ReportTabKey) => router.push(`/reports?tab=${tab}`);
  const visible = cards.filter((c) => c.show);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-[22px] p-6 text-white md:p-8" style={{ background: 'linear-gradient(120deg,#0f172a,#312e81 55%,#7c3aed)' }}>
        <div className="pointer-events-none absolute -right-12 -top-16 h-72 w-72 rounded-full bg-white/5" />
        <div className="relative">
          <div className="text-xs font-bold text-indigo-200">HR ANALYTICS</div>
          <h2 className="mt-1 text-2xl font-extrabold md:text-3xl">รายงานและสถิติ</h2>
          <p className="mt-1 max-w-xl text-sm text-indigo-100/80">ศูนย์รวมรายงานกำลังคน เวลาทำงาน การลา และการลาออก — เลือกรายงานเพื่อดูภาพรวม เจาะลึก และส่งออก</p>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              canDept && ['พนักงานทำงานอยู่', `${fmt(stats.employees)} คน`],
              canAttendance && ['มาทำงานวันนี้', `${fmt(stats.present)}/${fmt(stats.expected)} คน`],
              canLeave && ['ใบลารออนุมัติ', `${fmt(stats.pending)} ใบ`],
              canTurnover && [`ลาออกเดือน${monthName}`, `${fmt(stats.resignedMonth)} คน`],
            ]
              .filter((x): x is string[] => Array.isArray(x))
              .map((a) => (
                <div key={a[0]} className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                  <div className="text-[11px] text-indigo-200">{a[0]}</div>
                  <div className="text-xl font-extrabold">{a[1]}</div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="font-extrabold text-slate-900 dark:text-slate-100">รายงานหลัก</div>
        <span className="text-xs text-slate-400">คลิกการ์ดเพื่อเปิดรายงาน</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((c) => {
          const t = REPORT_THEMES[c.theme];
          const Icon = c.icon;
          return (
            <button
              key={c.tab}
              type="button"
              onClick={() => open(c.tab)}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="relative h-20" style={{ background: t.gradient }}>
                <div className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full bg-white/10" />
                <div className="absolute -bottom-6 left-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow dark:bg-slate-700" style={{ color: t.hex }}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <div className="p-5 pt-8">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-900 dark:text-slate-100">{c.title}</div>
                    <div className="mt-0.5 max-w-sm text-xs text-slate-500 dark:text-slate-400">{c.description}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-2xl font-extrabold" style={{ color: t.hex }}>
                      {c.value}
                      <span className="ml-1 text-xs font-semibold text-slate-400">{c.unit}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {c.spark && c.spark.length > 1 && <Sparkline values={c.spark} color={t.hex} width={110} height={32} />}
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{c.note}</span>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-bold" style={{ color: t.hex }}>
                    เปิดรายงาน <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {canTax && (
        <button
          type="button"
          onClick={() => open('tax')}
          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">ภาษีและประกันสังคม</div>
              <div className="text-xs text-slate-400">ภ.ง.ด.1 / สปส. 1-10 — รายงานเสริมสำหรับผู้มีสิทธิ์ด้านเงินเดือนและการเงิน</div>
            </div>
          </div>
          <span className="flex items-center gap-1 text-xs font-bold text-slate-500">
            เปิด <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </button>
      )}

      {visible.length === 0 && !canTax && <div className="py-12 text-center text-sm text-slate-400">คุณยังไม่มีสิทธิ์เข้าถึงรายงานใด</div>}
    </div>
  );
}

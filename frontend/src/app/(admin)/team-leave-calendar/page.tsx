'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { leaveInsightsService } from '@/services/leaveInsightsService';
import { organizationService } from '@/services/organizationService';
import { Department, Division } from '@/types/organization';
import { LeaveCalendarItem, LeaveCalendarResult } from '@/types/leaveInsights';
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Loader2, Users, X } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { ModalShell } from '@/components/ui/ModalShell';
import { Button } from '@/components/ui/Button';
import { TH_MONTHS, TH_MONTHS_SHORT, formatThaiDate } from '@/lib/thaiDate';

type ViewMode = 'month' | 'week';

const THAI_MONTHS = TH_MONTHS;
const THAI_MONTHS_SHORT = TH_MONTHS_SHORT;
const WEEK_DAYS = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];

/** สีตามประเภทการลา (วนตามลำดับประเภทที่พบ) */
const PALETTE = [
  { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-400', dot: 'bg-sky-500' },
  { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-400', dot: 'bg-rose-500' },
  { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-400', dot: 'bg-amber-500' },
  { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-400', dot: 'bg-emerald-500' },
  { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-400', dot: 'bg-violet-500' },
  { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-400', dot: 'bg-orange-500' },
  { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-400', dot: 'bg-teal-500' },
  { bg: 'bg-fuchsia-100', text: 'text-fuchsia-800', border: 'border-fuchsia-400', dot: 'bg-fuchsia-500' },
  { bg: 'bg-lime-100', text: 'text-lime-800', border: 'border-lime-400', dot: 'bg-lime-500' },
  { bg: 'bg-slate-200', text: 'text-slate-800 dark:text-slate-200', border: 'border-slate-400', dot: 'bg-slate-500' },
];

const SCOPE_LABEL: Record<string, string> = {
  ORG: 'ทั้งบริษัท',
  DIVISION: 'ทั้งฝ่ายของคุณ',
  DEPARTMENT: 'แผนกของคุณ',
};

// ── วันที่แบบ yyyy-MM-dd (ไม่ขึ้นกับ timezone) ──
function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() + n);
  return r;
}
/** วันจันทร์ของสัปดาห์ */
function startOfWeek(d: Date): Date {
  const dow = (d.getDay() + 6) % 7; // จันทร์ = 0
  return addDays(d, -dow);
}
function thaiDate(s: string): string {
  return formatThaiDate(s);
}

export default function TeamLeaveCalendarPage() {
  const { setBreadcrumb } = useBreadcrumb();
  const [view, setView] = useState<ViewMode>('month');
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [includePending, setIncludePending] = useState(true);
  const [divisionId, setDivisionId] = useState<number | ''>('');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [data, setData] = useState<{ key: string; result: LeaveCalendarResult } | null>(null);
  const [errorState, setErrorState] = useState<{ key: string; message: string } | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    setBreadcrumb({ section: 'การลา', page: 'ปฏิทินการลาของทีม' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  // ปิดป๊อปอัปเมื่อกดปุ่ม Escape
  useEffect(() => {
    if (!selectedDay) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedDay(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedDay]);

  // ช่วงวันที่ที่แสดง
  const { days, from, to, title } = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(anchor);
      const list = Array.from({ length: 7 }, (_, i) => addDays(start, i));
      const end = list[6];
      return {
        days: list,
        from: ymd(start),
        to: ymd(end),
        title: `${start.getDate()} ${THAI_MONTHS[start.getMonth()]} – ${end.getDate()} ${THAI_MONTHS[end.getMonth()]} ${end.getFullYear() + 543}`,
      };
    }
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    const start = startOfWeek(first);
    const end = addDays(startOfWeek(last), 6);
    const count = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    return {
      days: Array.from({ length: count }, (_, i) => addDays(start, i)),
      from: ymd(start),
      to: ymd(end),
      title: `${THAI_MONTHS[anchor.getMonth()]} ${anchor.getFullYear() + 543}`,
    };
  }, [view, anchor]);

  const requestKey = `${from}|${to}|${divisionId}|${departmentId}|${includePending}`;

  useEffect(() => {
    let active = true;
    leaveInsightsService
      .getCalendar({
        from,
        to,
        divisionId: divisionId === '' ? undefined : divisionId,
        departmentId: departmentId === '' ? undefined : departmentId,
        includePending,
      })
      .then((result) => {
        if (active) setData({ key: requestKey, result });
      })
      .catch((e: unknown) => {
        if (active) {
          const message = (e as { message?: string })?.message || 'โหลดปฏิทินการลาไม่สำเร็จ';
          setErrorState({ key: requestKey, message });
        }
      });
    return () => {
      active = false;
    };
  }, [from, to, divisionId, departmentId, includePending, requestKey]);

  const scope = data?.result.scope;
  const loading = data?.key !== requestKey && errorState?.key !== requestKey;
  const error = errorState?.key === requestKey ? errorState.message : null;

  // ตัวกรองฝ่าย/แผนก: โหลดเมื่อรู้ขอบเขตแล้ว
  useEffect(() => {
    if (scope !== 'ORG') return;
    let active = true;
    organizationService.getDivisions().then((d) => active && setDivisions(d)).catch(() => {});
    return () => {
      active = false;
    };
  }, [scope]);

  useEffect(() => {
    if (!scope || scope === 'DEPARTMENT') return;
    let active = true;
    organizationService
      .getDepartments(divisionId === '' ? undefined : divisionId)
      .then((d) => active && setDepartments(d))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [scope, divisionId]);

  const items = useMemo(() => data?.result.items ?? [], [data]);

  const colorOf = useMemo(() => {
    const types = Array.from(new Map(items.map((i) => [i.leaveTypeId, i.leaveTypeName])).entries()).sort(
      (a, b) => a[0] - b[0]
    );
    const map = new Map<number, (typeof PALETTE)[number]>();
    types.forEach(([id], idx) => map.set(id, PALETTE[idx % PALETTE.length]));
    return { map, types };
  }, [items]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, LeaveCalendarItem[]>();
    for (const d of days) {
      const key = ymd(d);
      map.set(
        key,
        items.filter((i) => i.startDate <= key && i.endDate >= key)
      );
    }
    return map;
  }, [days, items]);

  const move = (dir: -1 | 1) => {
    setSelectedDay(null);
    setAnchor((a) =>
      view === 'week' ? addDays(a, dir * 7) : new Date(a.getFullYear(), a.getMonth() + dir, 1)
    );
  };

  const todayKey = ymd(new Date());
  const employeesOnLeave = new Set(items.filter((i) => i.status === 'APPROVED').map((i) => i.employeeId)).size;
  // นับเป็นจำนวนคนที่มีใบลารออนุมัติ (คนเดียวอาจมีหลายใบ/หลายช่วง)
  const pendingCount = new Set(items.filter((i) => i.status === 'PENDING').map((i) => i.employeeId)).size;

  const Chip = ({ item, compact }: { item: LeaveCalendarItem; compact?: boolean }) => {
    const c = colorOf.map.get(item.leaveTypeId) ?? PALETTE[PALETTE.length - 1];
    const pending = item.status === 'PENDING';
    return (
      <div
        title={`${item.employeeName} — ${item.leaveTypeName}${pending ? ' (รออนุมัติ)' : ''}\n${thaiDate(item.startDate)} – ${thaiDate(item.endDate)} (${item.leaveDays} วัน)`}
        className={`truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium border ${c.bg} ${c.text} ${
          pending ? `border-dashed ${c.border} opacity-70` : 'border-transparent'
        }`}
      >
        {compact ? item.employeeName.replace(/^(นาย|นางสาว|นาง)\s*/, '') : item.employeeName}
        {!compact && <span className="font-normal"> · {item.leaveTypeName}</span>}
        {pending && <span className="font-normal"> (รอ)</span>}
      </div>
    );
  };

  const selectedItems = selectedDay ? itemsByDay.get(selectedDay) ?? [] : [];

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-200">ปฏิทินการลาของทีม</h1>
          </div>
          {scope && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs text-blue-700">
              <Users className="w-3.5 h-3.5" /> {SCOPE_LABEL[scope] ?? scope}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {scope === 'ORG' && (
            <CustomSelect
              value={divisionId}
              onChange={(val) => {
                setDivisionId(String(val) === '' ? '' : Number(val));
                setDepartmentId('');
              }}
              placeholder="ทุกฝ่าย"
              className="min-w-[140px]"
              options={[
                { value: '', label: 'ทุกฝ่าย' },
                ...divisions.map((d) => ({ value: d.id, label: d.divisionName })),
              ]}
            />
          )}
          {(scope === 'ORG' || scope === 'DIVISION') && (
            <CustomSelect
              value={departmentId}
              onChange={(val) => setDepartmentId(String(val) === '' ? '' : Number(val))}
              placeholder="ทุกแผนก"
              className="min-w-[140px]"
              options={[
                { value: '', label: 'ทุกแผนก' },
                ...departments.map((d) => ({ value: d.id, label: d.departmentName })),
              ]}
            />
          )}
          <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 cursor-pointer">
            <input type="checkbox" checked={includePending} onChange={(e) => setIncludePending(e.target.checked)} />
            แสดงใบลารออนุมัติ
          </label>
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-800">
            {(['month', 'week'] as ViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setView(m);
                  setSelectedDay(null);
                }}
                className={`px-3 py-1 text-xs font-medium rounded-lg ${
                  view === m ? 'bg-white dark:bg-slate-700 shadow-sm text-primary dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {m === 'month' ? 'รายเดือน' : 'รายสัปดาห์'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation + summary */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => move(-1)} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setAnchor(new Date());
              setSelectedDay(null);
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium hover:bg-slate-50"
          >
            วันนี้
          </button>
          <button onClick={() => move(1)} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="ml-2 text-sm font-bold text-slate-800 dark:text-slate-200">{title}</span>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          ลาในช่วงนี้ {employeesOnLeave} คน{includePending && pendingCount > 0 ? ` · รออนุมัติ ${pendingCount} คน` : ''}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {/* Legend */}
      {colorOf.types.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
          {colorOf.types.map(([id, name]) => (
            <span key={id} className="inline-flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${colorOf.map.get(id)?.dot}`} /> {name}
            </span>
          ))}
          {includePending && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-2.5 rounded border border-dashed border-slate-400" /> รออนุมัติ
            </span>
          )}
        </div>
      )}

      {/* Calendar grid */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
              {WEEK_DAYS.map((d, i) => (
                <div key={d} className={`py-2 text-center text-xs font-semibold ${i >= 5 ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((d) => {
                const key = ymd(d);
                const list = itemsByDay.get(key) ?? [];
                const outside = view === 'month' && d.getMonth() !== anchor.getMonth();
                const max = view === 'month' ? 3 : 50;
                return (
                  <div
                    role="button"
                    tabIndex={0}
                    key={key}
                    onClick={() => setSelectedDay(key)}
                    className={`text-left border-b border-r border-slate-100 dark:border-slate-700/60 p-1.5 align-top flex flex-col gap-1 cursor-pointer transition-colors ${
                      view === 'month' ? 'min-h-[104px]' : 'min-h-[320px]'
                    } ${outside ? 'bg-slate-50/60 dark:bg-slate-900/40' : 'bg-white dark:bg-slate-800'} ${
                      key === selectedDay ? 'ring-2 ring-inset ring-blue-400 dark:ring-blue-500' : 'hover:bg-blue-50/40 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <span
                      className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                        key === todayKey ? 'bg-primary text-white' : outside ? 'text-slate-300 dark:text-slate-600' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {d.getDate()}
                    </span>
                    {list.slice(0, max).map((it) => (
                      <Chip key={`${it.id}-${key}`} item={it} compact={view === 'month'} />
                    ))}
                    {list.length > max && (
                      <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">+{list.length - max} คน</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Pop-up Modal แสดงรายการลาประจำวัน */}
      {selectedDay && (
        <ModalShell
          className="z-50 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
          innerClassName="items-center justify-center p-4"
          onBackdropClick={() => setSelectedDay(null)}
        >
          <div className="relative w-full max-w-lg max-h-[85vh] my-auto flex flex-col animate-in zoom-in-95 duration-200">
            {/* ปุ่มกากบาทที่มุมขวาบน */}
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              aria-label="ปิดหน้าต่าง"
              className="absolute -top-3 -right-3 z-50 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:scale-105 transition-all cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full flex-1 flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between shrink-0 bg-slate-50/60 dark:bg-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-primary dark:text-blue-400 shrink-0">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                      รายการลาประจำวัน
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {formatThaiDate(selectedDay, 'long')}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
                  {selectedItems.length} คน
                </span>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto max-h-[calc(85vh-135px)]">
                {selectedItems.length === 0 ? (
                  <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center text-slate-400">
                      <CalendarDays className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      ไม่มีพนักงานลาในวันที่นี้
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedItems.map((it) => {
                      const c = colorOf.map.get(it.leaveTypeId) ?? PALETTE[PALETTE.length - 1];
                      const pending = it.status === 'PENDING';
                      return (
                        <div
                          key={it.id}
                          className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors flex flex-col gap-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`w-3 h-3 rounded-full shrink-0 ${c.dot}`} />
                              <div className="min-w-0">
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate block">
                                  {it.employeeName}
                                </span>
                                {it.employeeCode && (
                                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
                                    รหัสพนักงาน: {it.employeeCode}
                                  </span>
                                )}
                              </div>
                            </div>
                            {pending ? (
                              <span className="shrink-0 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                                รออนุมัติ
                              </span>
                            ) : (
                              <span className="shrink-0 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                                อนุมัติแล้ว
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                            <div>
                              <span className="text-slate-400 dark:text-slate-500 block text-[11px]">ประเภทการลา</span>
                              <span className={`font-semibold ${c.text}`}>{it.leaveTypeName}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 dark:text-slate-500 block text-[11px]">แผนก</span>
                              <span className="text-slate-700 dark:text-slate-300 font-medium">
                                {it.departmentName || '-'}
                              </span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-slate-400 dark:text-slate-500 block text-[11px]">ช่วงเวลาที่ลา</span>
                              <span className="text-slate-700 dark:text-slate-300 font-medium">
                                {formatThaiDate(it.startDate)} {it.endDate !== it.startDate ? `– ${formatThaiDate(it.endDate)}` : ''} ({it.leaveDays} วัน)
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3.5 bg-slate-50/70 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700/60 flex justify-end shrink-0">
                <Button variant="secondary" onClick={() => setSelectedDay(null)}>
                  ปิด
                </Button>
              </div>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}


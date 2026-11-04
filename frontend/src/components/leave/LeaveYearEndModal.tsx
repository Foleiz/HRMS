'use client';
import { ModalHeader } from '@/components/ui/ModalHeader';

import { ModalShell } from '@/components/ui/ModalShell';
import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  Lock,
  Search,
  Users,
} from 'lucide-react';
import { leaveInsightsService } from '@/services/leaveInsightsService';
import { LeaveYearEndPreview, LeaveYearEndRow } from '@/types/leaveInsights';
import { Button, inputClass } from '@/components/ui';
import { leaveColorVars, resolveLeaveColor } from '@/lib/leaveColors';

interface Props {
  isOpen: boolean;
  /** ปี ค.ศ. ที่จะปิดยอด */
  year: number;
  onClose: () => void;
  onClosed: (result: LeaveYearEndPreview) => void;
  /** สีของประเภทการลา (ให้ตรงกับหน้ายอดวันลา) */
  colorOfType?: (leaveTypeId: number) => string;
}

function LeaveTypeChip({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="leave-chip inline-flex items-center gap-2 rounded-full font-semibold px-2.5 py-0.5 text-xs"
      style={leaveColorVars(color) as React.CSSProperties}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {name}
    </span>
  );
}

interface EmployeeGroup {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  rows: LeaveYearEndRow[];
  remaining: number;
  carry: number;
  overCap: number;
}

type FilterKey = 'carry' | 'overCap' | 'reset' | 'all';

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const fmt = (n: number) => n.toLocaleString('th-TH', { maximumFractionDigits: 2 });
const thaiDate = (s?: string | null) => {
  if (!s) return '-';
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return `${d} ${TH_MONTHS[m - 1]} ${y + 543}`;
};
/** ปี ค.ศ. ปัจจุบันตามเวลาไทย */
const thaiCurrentYear = () => new Date(Date.now() + 7 * 3600_000).getUTCFullYear();

const isOverCap = (r: LeaveYearEndRow) => r.carryForwardAllowed && r.forfeitDays > 0;
const matchFilter = (r: LeaveYearEndRow, f: FilterKey) =>
  f === 'all' ? true : f === 'carry' ? r.carryDays > 0 : f === 'overCap' ? isOverCap(r) : !r.carryForwardAllowed;

/**
 * ปิดยอดวันลาสิ้นปี — ดูตัวอย่างก่อน แล้วค่อยยืนยัน
 * คงเหลือยกไปปีหน้าตามเพดานในสิทธิ์การลา ส่วนที่เกินเพดานถูกตัด
 * ประเภทที่ไม่อนุญาตยกยอด (ลาป่วย ลาคลอด ฯลฯ) แค่เริ่มสิทธิ์ใหม่ในปีหน้า
 */
export const LeaveYearEndModal: React.FC<Props> = ({ isOpen, year, onClose, onClosed, colorOfType }) => {
  const [preview, setPreview] = useState<{ year: number; data: LeaveYearEndPreview } | null>(null);
  const [loadError, setLoadError] = useState<{ year: number; message: string } | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    leaveInsightsService
      .previewYearEnd(year)
      .then((data) => active && setPreview({ year, data }))
      .catch((e: unknown) => {
        if (active) setLoadError({ year, message: (e as { message?: string })?.message || 'โหลดตัวอย่างการปิดยอดไม่สำเร็จ' });
      });
    return () => {
      active = false;
    };
  }, [isOpen, year]);

  const data = preview?.year === year ? preview.data : null;
  const error = loadError?.year === year ? loadError.message : null;
  const loading = !data && !error;

  const summary = useMemo(() => {
    const all = data?.rows ?? [];
    const sum = (list: LeaveYearEndRow[], pick: (r: LeaveYearEndRow) => number) => list.reduce((a, r) => a + pick(r), 0);
    return {
      employees: new Set(all.map((r) => r.employeeId)).size,
      carryDays: sum(all, (r) => r.carryDays),
      overCapDays: sum(all.filter(isOverCap), (r) => r.forfeitDays),
      resetDays: sum(all.filter((r) => !r.carryForwardAllowed), (r) => r.forfeitDays),
      counts: {
        carry: all.filter((r) => matchFilter(r, 'carry')).length,
        overCap: all.filter((r) => matchFilter(r, 'overCap')).length,
        reset: all.filter((r) => matchFilter(r, 'reset')).length,
        all: all.length,
      } as Record<FilterKey, number>,
    };
  }, [data]);

  // ค่าเริ่มต้น: แสดงเฉพาะรายการที่ยกยอด (ถ้าไม่มีเลยแสดงทั้งหมด)
  const activeFilter: FilterKey = filter ?? (summary.counts.carry > 0 ? 'carry' : 'all');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.rows ?? []).filter(
      (r) =>
        matchFilter(r, activeFilter) &&
        (!q ||
          r.employeeName.toLowerCase().includes(q) ||
          r.employeeCode.toLowerCase().includes(q) ||
          r.leaveTypeName.toLowerCase().includes(q))
    );
  }, [data, search, activeFilter]);

  const groups = useMemo(() => {
    const map = new Map<number, EmployeeGroup>();
    for (const r of rows) {
      let g = map.get(r.employeeId);
      if (!g) {
        g = { employeeId: r.employeeId, employeeCode: r.employeeCode, employeeName: r.employeeName, rows: [], remaining: 0, carry: 0, overCap: 0 };
        map.set(r.employeeId, g);
      }
      g.rows.push(r);
      g.remaining += r.remainingDays;
      g.carry += r.carryDays;
      if (isOverCap(r)) g.overCap += r.forfeitDays;
    }
    return [...map.values()];
  }, [rows]);

  if (!isOpen) return null;

  const handleClose = () => {
    setConfirming(false);
    setSubmitError(null);
    onClose();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await leaveInsightsService.closeYearEnd(year, note.trim() || undefined);
      setPreview({ year, data: result });
      setConfirming(false);
      onClosed(result);
    } catch (e: unknown) {
      setSubmitError((e as { message?: string })?.message || 'ปิดยอดไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  const thYear = year + 543;
  const blockers: string[] = [];
  if (thaiCurrentYear() <= year) blockers.push(`ปิดยอดได้ตั้งแต่ 1 ม.ค. ${thYear + 1}`);
  if ((data?.pendingRequests ?? 0) > 0) blockers.push(`มีใบลารออนุมัติ ${data?.pendingRequests} ใบ`);
  const typeColor = (id: number) => colorOfType?.(id) ?? resolveLeaveColor(null, id);
  const allExpanded = groups.length > 0 && groups.every((g) => expanded.has(g.employeeId));
  const toggleGroup = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'carry', label: 'ยกยอด' },
    { key: 'overCap', label: 'เกินเพดาน' },
    { key: 'reset', label: 'ไม่ยกยอด' },
    { key: 'all', label: 'ทั้งหมด' },
  ];
  const emptyText: Record<FilterKey, string> = {
    carry: 'ไม่มีรายการที่ยกยอดไปปีหน้า',
    overCap: 'ไม่มีรายการที่เกินเพดานยกยอด',
    reset: 'ไม่มีรายการประเภทที่ไม่ยกยอด',
    all: 'ไม่มียอดคงเหลือที่ต้องปิด',
  };

  const cards = data?.isClosed
    ? [
        { label: 'รายการที่ปิดยอด', value: fmt(data.balanceCount), tone: 'slate' },
        { label: `ยกไปปี ${thYear + 1} (วัน)`, value: fmt(data.totalCarriedDays), tone: 'emerald' },
        { label: 'ตัด / เริ่มใหม่ (วัน)', value: fmt(data.totalForfeitedDays), tone: 'gray' },
      ]
    : [
        { label: 'พนักงาน (คน)', value: fmt(summary.employees), tone: 'slate' },
        { label: `ยกไปปี ${thYear + 1} (วัน)`, value: fmt(summary.carryDays), tone: 'emerald' },
        { label: 'เกินเพดาน ถูกตัด (วัน)', value: fmt(summary.overCapDays), tone: 'rose' },
        { label: 'ไม่ยกยอด · เริ่มใหม่ (วัน)', value: fmt(summary.resetDays), tone: 'gray' },
      ];
  const toneClass: Record<string, string> = {
    slate: 'border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300',
    rose: 'border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300',
    gray: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
  };

  return (
    <ModalShell className="z-50 bg-black/40 backdrop-blur-sm" innerClassName="items-center justify-center p-4">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <ModalHeader
          icon={Lock}
          title={<>ปิดยอดวันลาสิ้นปี {thYear}</>}
          onClose={handleClose}
        />

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading && (
            <div className="py-16 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> กำลังคำนวณตัวอย่าง...
            </div>
          )}
          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

          {data && (
            <>
              {data.isClosed && (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <div>
                    ปิดยอดปี {thYear} แล้ว
                    {data.closedAt && ` เมื่อ ${new Date(data.closedAt).toLocaleString('th-TH')}`}
                    {data.closedByName && ` โดย ${data.closedByName}`}
                  </div>
                </div>
              )}

              <div className={`grid grid-cols-2 gap-3 ${cards.length === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
                {cards.map((c) => (
                  <div key={c.label} className={`rounded-xl border p-3 ${toneClass[c.tone]}`}>
                    <div className="text-xs font-medium">{c.label}</div>
                    <div className="text-lg font-bold">{c.value}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="กรองรายการ">
                  {filters.map((f) => {
                    const on = f.key === activeFilter;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        role="tab"
                        aria-selected={on}
                        onClick={() => setFilter(f.key)}
                        className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                          on
                            ? 'bg-primary border-primary text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        {f.label}
                        <span className={`px-1.5 rounded-full text-[10px] ${on ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                          {summary.counts[f.key].toLocaleString('th-TH')}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ค้นหาชื่อ, รหัส, ประเภทการลา..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-700 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                <div className="flex items-center gap-1.5 font-medium">
                  <Users className="w-4 h-4 text-slate-400" />
                  แสดงพนักงาน {groups.length.toLocaleString('th-TH')} คน ({rows.length.toLocaleString('th-TH')} รายการ)
                </div>
                {groups.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setExpanded(allExpanded ? new Set() : new Set(groups.map((g) => g.employeeId)))}
                    className="font-semibold text-primary hover:underline cursor-pointer dark:text-blue-300"
                  >
                    {allExpanded ? 'ย่อทั้งหมด' : 'ขยายทั้งหมด'}
                  </button>
                )}
              </div>

              {groups.length === 0 ? (
                <div className="py-12 text-center text-slate-400 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm">
                  {search.trim() ? 'ไม่พบรายการที่ค้นหา' : emptyText[activeFilter]}
                </div>
              ) : (
                <div className="space-y-3">
                  {groups.map((g) => {
                    const isOpen = expanded.has(g.employeeId);
                    return (
                      <div
                        key={g.employeeId}
                        className={`rounded-2xl border transition-all overflow-hidden bg-white dark:bg-slate-800 ${
                          isOpen
                            ? 'border-blue-200 dark:border-blue-700 shadow-sm'
                            : 'border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          aria-expanded={isOpen}
                          onClick={() => toggleGroup(g.employeeId)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleGroup(g.employeeId);
                            }
                          }}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <ChevronRight
                              className={`w-5 h-5 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-90 text-blue-600' : ''}`}
                            />
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-bold flex items-center justify-center text-sm shrink-0">
                              {g.employeeName.replace(/^(นาย|นางสาว|นาง)\s*/, '').trim().slice(0, 2) || 'EM'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{g.employeeName}</span>
                                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                                  {g.employeeCode}
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">{g.rows.length} ประเภทการลา</div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 sm:gap-6 pl-8 sm:pl-0">
                            <div className="text-left sm:text-right">
                              <span className="text-[11px] text-slate-400 block">คงเหลือรวม</span>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{fmt(g.remaining)} วัน</span>
                            </div>
                            <div className="text-left sm:text-right">
                              <span className="text-[11px] text-slate-400 block">ยกไป</span>
                              <span className={`text-sm font-black ${g.carry > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{fmt(g.carry)} วัน</span>
                            </div>
                            <div className="text-left sm:text-right pr-2">
                              <span className="text-[11px] text-slate-400 block">เกินเพดาน</span>
                              <span className={`text-sm font-black ${g.overCap > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{fmt(g.overCap)} วัน</span>
                            </div>
                          </div>
                        </div>

                        {isOpen && (
                          <div className="px-4 pb-4 pt-1 bg-slate-50/70 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700">
                            <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800">
                              <table className="table-standard w-full min-w-[600px] text-left border-collapse text-xs whitespace-nowrap">
                                <thead>
                                  <tr className="whitespace-nowrap">
                                    <th className="py-2.5 px-4">ประเภทการลา</th>
                                    <th className="py-2.5 px-3 text-center">คงเหลือ</th>
                                    <th className="py-2.5 px-3 text-center">เพดานยกยอด</th>
                                    <th className="py-2.5 px-3 text-center">ยกไป</th>
                                    <th className="py-2.5 px-3 text-center">ตัดทิ้ง</th>
                                    <th className="py-2.5 px-3 text-center">ใช้ได้ถึง</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                  {g.rows.map((r) => (
                                    <tr key={r.balanceId}>
                                      <td className="py-3 px-4">
                                        <LeaveTypeChip name={r.leaveTypeName} color={typeColor(r.leaveTypeId)} />
                                      </td>
                                      <td className="py-3 px-3 text-center font-bold text-blue-600 dark:text-blue-400">{fmt(r.remainingDays)} วัน</td>
                                      <td className="py-3 px-3 text-center text-slate-500 dark:text-slate-400">
                                        {r.carryForwardAllowed ? `${fmt(r.carryForwardMaxDays ?? 0)} วัน` : 'ไม่ยกยอด'}
                                      </td>
                                      <td className={`py-3 px-3 text-center ${r.carryDays > 0 ? 'font-bold text-emerald-600' : 'text-slate-400'}`}>
                                        {r.carryForwardAllowed ? `${fmt(r.carryDays)} วัน` : '-'}
                                      </td>
                                      <td className="py-3 px-3 text-center">
                                        {!r.carryForwardAllowed ? (
                                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-[11px] text-slate-500 dark:text-slate-400">
                                            เริ่มใหม่
                                          </span>
                                        ) : r.forfeitDays > 0 ? (
                                          <span className="font-bold text-rose-600">{fmt(r.forfeitDays)} วัน</span>
                                        ) : (
                                          <span className="text-slate-400">0 วัน</span>
                                        )}
                                      </td>
                                      <td className="py-3 px-3 text-center text-slate-500 dark:text-slate-400">{thaiDate(r.carryForwardExpiry)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {confirming && data.canClose && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <div className="text-sm font-semibold text-amber-800">
                    ยืนยันปิดยอดปี {thYear}? ยกไป {fmt(summary.carryDays)} วัน · เกินเพดานถูกตัด {fmt(summary.overCapDays)} วัน — ย้อนกลับไม่ได้ และหลังปิดจะยื่น/อนุมัติใบลาของปีนี้ไม่ได้
                  </div>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="หมายเหตุ (ถ้ามี)"
                    className={inputClass}
                  />
                </div>
              )}
              {submitError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{submitError}</div>
              )}
            </>
          )}
        </div>

        {data && !data.isClosed && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-amber-700 dark:text-amber-400">
              {!data.canClose && (blockers.length ? blockers.join(' · ') : data.blockReason)}
            </span>
            <div className="flex justify-end gap-2">
              {confirming && data.canClose ? (
                <>
                  <Button variant="secondary" onClick={() => setConfirming(false)} disabled={submitting}>
                    ยกเลิก
                  </Button>
                  <Button variant="danger" onClick={handleSubmit} loading={submitting}>
                    ยืนยันปิดยอด
                  </Button>
                </>
              ) : (
                <Button onClick={() => setConfirming(true)} disabled={!data.canClose}>
                  ปิดยอดปี {thYear}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
};

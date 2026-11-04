'use client';
import { ModalHeader } from '@/components/ui/ModalHeader';

import { ModalShell } from '@/components/ui/ModalShell';
import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Info,
  Loader2,
  Lock,
  Search,
} from 'lucide-react';
import { leaveInsightsService } from '@/services/leaveInsightsService';
import { LeaveYearEndPreview, LeaveYearEndRow } from '@/types/leaveInsights';
import { Button, inputClass } from '@/components/ui';

interface Props {
  isOpen: boolean;
  /** ปี ค.ศ. ที่จะปิดยอด */
  year: number;
  onClose: () => void;
  onClosed: (result: LeaveYearEndPreview) => void;
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
export const LeaveYearEndModal: React.FC<Props> = ({ isOpen, year, onClose, onClosed }) => {
  const [preview, setPreview] = useState<{ year: number; data: LeaveYearEndPreview } | null>(null);
  const [loadError, setLoadError] = useState<{ year: number; message: string } | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey | null>(null);
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
  const yearEnded = thaiCurrentYear() > year;
  const noPending = (data?.pendingRequests ?? 0) === 0;
  const checks = [
    {
      ok: yearEnded,
      label: yearEnded ? `สิ้นปี ${thYear} แล้ว` : `ยังไม่สิ้นปี ${thYear} — ปิดยอดได้ตั้งแต่ 1 ม.ค. ${thYear + 1}`,
    },
    {
      ok: noPending,
      label: noPending
        ? `ไม่มีใบลาของปี ${thYear} ค้างอนุมัติ`
        : `ยังมีใบลาของปี ${thYear} รออนุมัติ ${data?.pendingRequests} ใบ — อนุมัติหรือปฏิเสธให้หมดก่อน`,
    },
  ];

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
              {data.isClosed ? (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <div>
                    ปิดยอดปี {thYear} แล้ว
                    {data.closedAt && ` เมื่อ ${new Date(data.closedAt).toLocaleString('th-TH')}`}
                    {data.closedByName && ` โดย ${data.closedByName}`}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 space-y-2">
                  <div className={`text-sm font-semibold ${data.canClose ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>
                    {data.canClose ? 'พร้อมปิดยอดแล้ว' : 'ยังปิดยอดไม่ได้ — ตอนนี้ดูตัวอย่างได้อย่างเดียว'}
                  </div>
                  <ul className="space-y-1">
                    {checks.map((c) => (
                      <li key={c.label} className={`flex items-center gap-2 text-sm ${c.ok ? 'text-slate-600 dark:text-slate-300' : 'text-amber-700 dark:text-amber-400'}`}>
                        {c.ok ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                        ) : (
                          <Circle className="w-4 h-4 shrink-0 text-amber-500" />
                        )}
                        {c.label}
                      </li>
                    ))}
                  </ul>
                  <p className="flex items-start gap-2 pt-1 text-xs text-slate-500 dark:text-slate-400">
                    <Info className="w-4 h-4 shrink-0 text-slate-400" />
                    <span>
                      คงเหลือจะยกไปปี {thYear + 1} ตามเพดานในสิทธิ์การลา ส่วนประเภทที่ไม่ยกยอดจะเริ่มสิทธิ์ใหม่ · ปิดได้ครั้งเดียว และหลังปิดจะยื่น/อนุมัติใบลาของปีนี้ไม่ได้
                    </span>
                  </p>
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

              <div className="border border-slate-100 dark:border-slate-700 rounded-xl overflow-x-auto">
                <table className="table-standard w-full min-w-[650px] text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr className="whitespace-nowrap">
                      <th className="text-left px-3 py-2">พนักงาน</th>
                      <th className="text-left px-3 py-2">ประเภทการลา</th>
                      <th className="text-right px-3 py-2">คงเหลือ</th>
                      <th className="text-right px-3 py-2">เพดานยกยอด</th>
                      <th className="text-right px-3 py-2">ยกไป</th>
                      <th className="text-right px-3 py-2">ตัดทิ้ง</th>
                      <th className="text-left px-3 py-2">ใช้ได้ถึง</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center text-slate-400 py-8">
                          {search.trim() ? 'ไม่พบรายการที่ค้นหา' : emptyText[activeFilter]}
                        </td>
                      </tr>
                    )}
                    {rows.map((r) => (
                      <tr key={r.balanceId} className="border-t border-slate-50 dark:border-slate-700/60">
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{r.employeeName}</div>
                          <div className="text-xs text-slate-400">{r.employeeCode}</div>
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{r.leaveTypeName}</td>
                        <td className="px-3 py-2 text-right">{fmt(r.remainingDays)}</td>
                        <td className="px-3 py-2 text-right text-slate-500 dark:text-slate-400">
                          {r.carryForwardAllowed ? fmt(r.carryForwardMaxDays ?? 0) : 'ไม่ยกยอด'}
                        </td>
                        <td className={`px-3 py-2 text-right ${r.carryDays > 0 ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {r.carryForwardAllowed ? fmt(r.carryDays) : '-'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {!r.carryForwardAllowed ? (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-[11px] text-slate-500 dark:text-slate-400">
                              เริ่มใหม่
                            </span>
                          ) : r.forfeitDays > 0 ? (
                            <span className="font-semibold text-rose-600">{fmt(r.forfeitDays)}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{thaiDate(r.carryForwardExpiry)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {confirming && data.canClose && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <div className="text-sm font-semibold text-amber-800">
                    ยืนยันปิดยอดปี {thYear}? ยกไป {fmt(summary.carryDays)} วัน · เกินเพดานถูกตัด {fmt(summary.overCapDays)} วัน — ย้อนกลับไม่ได้
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

        {data?.canClose && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700/60 flex justify-end gap-2">
            {confirming ? (
              <>
                <Button variant="secondary" onClick={() => setConfirming(false)} disabled={submitting}>
                  ยกเลิก
                </Button>
                <Button variant="danger" onClick={handleSubmit} loading={submitting}>
                  ยืนยันปิดยอด
                </Button>
              </>
            ) : (
              <Button onClick={() => setConfirming(true)}>ปิดยอดปี {thYear}</Button>
            )}
          </div>
        )}
      </div>
    </ModalShell>
  );
};

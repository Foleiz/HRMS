'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Lock, Search, X } from 'lucide-react';
import { leaveInsightsService } from '@/services/leaveInsightsService';
import { LeaveYearEndPreview } from '@/types/leaveInsights';

interface Props {
  isOpen: boolean;
  /** ปี ค.ศ. ที่จะปิดยอด */
  year: number;
  onClose: () => void;
  onClosed: (result: LeaveYearEndPreview) => void;
}

const fmt = (n: number) => n.toLocaleString('th-TH', { maximumFractionDigits: 2 });
const thaiDate = (s?: string | null) => {
  if (!s) return '-';
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return `${d}/${m}/${y + 543}`;
};

/**
 * ปิดยอดวันลาสิ้นปี — ดูตัวอย่างก่อน แล้วค่อยยืนยัน
 * คงเหลือยกไปปีหน้าตามเพดานในสิทธิ์การลา ส่วนเกิน/ประเภทที่ไม่อนุญาตยกยอดถูกตัดทิ้ง
 */
export const LeaveYearEndModal: React.FC<Props> = ({ isOpen, year, onClose, onClosed }) => {
  const [preview, setPreview] = useState<{ year: number; data: LeaveYearEndPreview } | null>(null);
  const [loadError, setLoadError] = useState<{ year: number; message: string } | null>(null);
  const [search, setSearch] = useState('');
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

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data?.rows ?? [];
    if (!q) return list;
    return list.filter(
      (r) =>
        r.employeeName.toLowerCase().includes(q) ||
        r.employeeCode.toLowerCase().includes(q) ||
        r.leaveTypeName.toLowerCase().includes(q)
    );
  }, [data, search]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#0B2046]" />
            <h3 className="text-base font-semibold text-gray-800 dark:text-slate-200">ปิดยอดวันลาสิ้นปี {year + 543}</h3>
          </div>
          <button onClick={handleClose} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading && (
            <div className="py-16 text-center text-gray-400 dark:text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> กำลังคำนวณตัวอย่าง...
            </div>
          )}
          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

          {data && (
            <>
              {data.isClosed ? (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <div>
                    ปิดยอดปี {year + 543} แล้ว
                    {data.closedAt && ` เมื่อ ${new Date(data.closedAt).toLocaleString('th-TH')}`}
                    {data.closedByName && ` โดย ${data.closedByName}`}
                  </div>
                </div>
              ) : data.blockReason ? (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div>{data.blockReason}</div>
                </div>
              ) : (
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  คงเหลือของแต่ละคนจะยกไปปี {year + 1 + 543} ตามเพดานในสิทธิ์การลา ส่วนที่เกินหรือประเภทที่ไม่อนุญาตยกยอดจะถูกตัดทิ้ง
                  ยอดที่ยกไปต้องใช้ภายในวันหมดอายุ ไม่งั้นระบบจะตัดอัตโนมัติ — ปิดยอดได้ครั้งเดียวต่อปี และหลังปิดแล้วจะยื่น/อนุมัติใบลาของปีนี้ไม่ได้
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl border border-gray-100 dark:border-slate-700/60 bg-gray-50 dark:bg-slate-950 p-3">
                  <div className="text-xs text-gray-500 dark:text-slate-400">รายการยอดที่มีคงเหลือ</div>
                  <div className="text-lg font-bold text-gray-800 dark:text-slate-200">{data.balanceCount}</div>
                </div>
                <div className="rounded-xl border border-gray-100 dark:border-slate-700/60 bg-gray-50 dark:bg-slate-950 p-3">
                  <div className="text-xs text-gray-500 dark:text-slate-400">คงเหลือรวม (วัน)</div>
                  <div className="text-lg font-bold text-gray-800 dark:text-slate-200">{fmt(data.totalRemainingDays)}</div>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                  <div className="text-xs text-emerald-700">ยกไปปีหน้า (วัน)</div>
                  <div className="text-lg font-bold text-emerald-700">{fmt(data.totalCarriedDays)}</div>
                </div>
                <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                  <div className="text-xs text-rose-700">ถูกตัดทิ้ง (วัน)</div>
                  <div className="text-lg font-bold text-rose-700">{fmt(data.totalForfeitedDays)}</div>
                </div>
              </div>

              <div className="relative w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหาชื่อ, รหัส, ประเภทการลา..."
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-700 text-sm"
                />
              </div>

              <div className="border border-gray-100 dark:border-slate-700/60 rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-950 text-xs text-gray-500 dark:text-slate-400">
                    <tr>
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
                        <td colSpan={7} className="text-center text-gray-400 dark:text-slate-500 py-8">
                          ไม่มียอดคงเหลือที่ต้องปิด
                        </td>
                      </tr>
                    )}
                    {rows.map((r) => (
                      <tr key={r.balanceId} className="border-t border-gray-50">
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-800 dark:text-slate-200">{r.employeeName}</div>
                          <div className="text-xs text-gray-400 dark:text-slate-500">{r.employeeCode}</div>
                        </td>
                        <td className="px-3 py-2 text-gray-700 dark:text-slate-300">{r.leaveTypeName}</td>
                        <td className="px-3 py-2 text-right">{fmt(r.remainingDays)}</td>
                        <td className="px-3 py-2 text-right text-gray-500 dark:text-slate-400">
                          {r.carryForwardAllowed ? fmt(r.carryForwardMaxDays ?? 0) : 'ไม่ยกยอด'}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-emerald-700">{fmt(r.carryDays)}</td>
                        <td className={`px-3 py-2 text-right ${r.forfeitDays > 0 ? 'font-semibold text-rose-600' : 'text-gray-400 dark:text-slate-500'}`}>
                          {fmt(r.forfeitDays)}
                        </td>
                        <td className="px-3 py-2 text-gray-500 dark:text-slate-400">{thaiDate(r.carryForwardExpiry)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {confirming && data.canClose && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <div className="text-sm font-semibold text-amber-800">
                    ยืนยันปิดยอดปี {year + 543}? ยกไป {fmt(data.totalCarriedDays)} วัน / ตัดทิ้ง {fmt(data.totalForfeitedDays)} วัน — ย้อนกลับไม่ได้
                  </div>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="หมายเหตุ (ถ้ามี)"
                    className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white dark:bg-slate-900 text-sm"
                  />
                </div>
              )}
              {submitError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{submitError}</div>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700/60 flex justify-end gap-2">
          <button onClick={handleClose} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-900">
            ปิดหน้าต่าง
          </button>
          {data?.canClose && !confirming && (
            <button
              onClick={() => setConfirming(true)}
              className="px-4 py-2 rounded-xl bg-[#0B2046] text-white text-sm font-medium hover:opacity-90"
            >
              ปิดยอดปี {year + 543}
            </button>
          )}
          {data?.canClose && confirming && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 disabled:opacity-60 flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} ยืนยันปิดยอด
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

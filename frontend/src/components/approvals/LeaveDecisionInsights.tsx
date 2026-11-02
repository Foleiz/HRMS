'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Wallet, History } from 'lucide-react';
import { leaveService } from '@/services/leaveService';
import { LeaveBalance, LeaveRequest } from '@/types/leave';
import { useAuth } from '@/context/AuthContext';
import { RequestSummaryCard } from '@/components/approvals/ReviewInfoPanels';

// ─── Helpers ──────────────────────────────────────────────────

const toDateOnly = (d?: string | null): Date | null => {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
};

const formatThaiDate = (d?: string | null) => {
  const dt = toDateOnly(d);
  if (!dt) return '-';
  return dt.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatShortThaiDate = (d?: string | null) => {
  const dt = toDateOnly(d);
  if (!dt) return '-';
  return dt.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
};

const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const dayDiff = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 86_400_000);

const fmtDays = (n?: number | null) => {
  if (n === null || n === undefined || isNaN(n)) return '-';
  return Number.isInteger(n) ? `${n}` : n.toFixed(1);
};

const startOf = (r: LeaveRequest) => r.startDate ?? r.startDatetime;
const endOf = (r: LeaveRequest) => r.endDate ?? r.endDatetime;
const daysOf = (r: LeaveRequest) => Number(r.leaveDays ?? r.totalDays ?? 0);

export type InsightLevel = 'danger' | 'warning' | 'info';
export interface InsightWarning {
  key: 'INSUFFICIENT_BALANCE' | 'TEAM_OVERLAP' | 'SHORT_NOTICE' | 'BACKDATED' | 'NO_DOCUMENT' | 'FREQUENT';
  level: InsightLevel;
  text: string;
}

export interface LeaveDecisionData {
  loading: boolean;
  balance: LeaveBalance | null;
  /** สิทธิ์วันลาทุกประเภทของปีที่ลา */
  balances: LeaveBalance[];
  balanceAvailable: boolean;
  /** ปีของใบลา (ค.ศ.) */
  year: number;
  /** วันลาที่อนุมัติแล้วรายเดือน (ทุกประเภท ไม่รวมใบนี้) index 0 = ม.ค. */
  monthlyDays: number[];
  /** วันลาของใบนี้แยกตามเดือน */
  requestMonthlyDays: number[];
  remainingAfter: number | null;
  noticeDays: number | null; // + = ยื่นล่วงหน้า, - = ยื่นย้อนหลัง
  overlaps: LeaveRequest[];
  sameTypeThisYear: { count: number; days: number };
  allTypesThisYear: { count: number; days: number };
  rejectedThisYear: number;
  warnings: InsightWarning[];
}

// ─── Hook: รวบรวมข้อมูลประกอบการตัดสินใจสำหรับคำขอลา ─────────────

export function useLeaveDecisionData(
  request: LeaveRequest | null,
  pendingRequests: LeaveRequest[] = []
): LeaveDecisionData {
  const { hasPermission, hasRole } = useAuth();
  const canViewBalance =
    hasRole('ADMIN') || hasRole('SYSTEM_SUPER') || hasPermission('LEAVE_BALANCE_VIEW') || hasPermission('LEAVE_BALANCE');

  const [loading, setLoading] = useState(false);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [approvedAll, setApprovedAll] = useState<LeaveRequest[]>([]);

  const requestId = request?.id;
  useEffect(() => {
    if (!request) return;
    let cancelled = false;
    const year = toDateOnly(startOf(request))?.getFullYear() ?? new Date().getFullYear();

    setLoading(true);
    setBalances([]);
    setHistory([]);
    setApprovedAll([]);

    Promise.all([
      // เรียกเฉพาะผู้มีสิทธิ์ — ถ้าไม่มีสิทธิ์ API จะตอบ 403 และทำให้ขึ้น dialog สิทธิ์ถูกเปลี่ยน
      canViewBalance
        ? leaveService
            .getLeaveBalances({ employeeId: request.employeeId, year })
            .catch(() => [] as LeaveBalance[])
        : Promise.resolve([] as LeaveBalance[]),
      leaveService.getLeaveRequests({ employeeId: request.employeeId, pageSize: 200 }).catch(() => [] as LeaveRequest[]),
      leaveService.getLeaveRequests({ status: 'APPROVED', pageSize: 500 }).catch(() => [] as LeaveRequest[]),
    ]).then(([balances, hist, approved]) => {
      if (cancelled) return;
      setBalances(balances);
      setHistory(hist);
      setApprovedAll(approved);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, canViewBalance]);

  return useMemo<LeaveDecisionData>(() => {
    const empty: LeaveDecisionData = {
      loading,
      balance: null,
      balances: [],
      balanceAvailable: canViewBalance,
      year: new Date().getFullYear(),
      monthlyDays: Array(12).fill(0),
      requestMonthlyDays: Array(12).fill(0),
      remainingAfter: null,
      noticeDays: null,
      overlaps: [],
      sameTypeThisYear: { count: 0, days: 0 },
      allTypesThisYear: { count: 0, days: 0 },
      rejectedThisYear: 0,
      warnings: [],
    };
    if (!request) return empty;

    const reqStart = toDateOnly(startOf(request));
    const reqEnd = toDateOnly(endOf(request)) ?? reqStart;
    const year = reqStart?.getFullYear() ?? new Date().getFullYear();
    const reqDays = daysOf(request);
    const balance = balances.find((b) => b.leaveTypeId === request.leaveTypeId) ?? null;

    // ยอดคงเหลือหลังอนุมัติ (ยอดคงเหลือของ backend ยังไม่ได้หักใบที่รออนุมัติ)
    const remainingAfter = balance ? balance.netRemainingLeaveDays - reqDays : null;

    // ยื่นล่วงหน้ากี่วัน
    const submitted = toDateOnly(request.submittedAt ?? request.createdAt);
    const noticeDays = submitted && reqStart ? dayDiff(reqStart, submitted) : null;

    // ประวัติการลาปีนี้ (ไม่รวมใบนี้)
    const histThisYear = history.filter(
      (h) => h.id !== request.id && toDateOnly(startOf(h))?.getFullYear() === year
    );
    const approvedThisYear = histThisYear.filter((h) => h.status === 'APPROVED');
    const sameType = approvedThisYear.filter((h) => h.leaveTypeId === request.leaveTypeId);
    const sum = (arr: LeaveRequest[]) => arr.reduce((s, r) => s + daysOf(r), 0);

    // วันลารายเดือน — กระจายจำนวนวันลาตามสัดส่วนวันในแต่ละเดือนของช่วงที่ลา
    const spreadByMonth = (r: LeaveRequest, into: number[]) => {
      const s = toDateOnly(startOf(r));
      const e = toDateOnly(endOf(r)) ?? s;
      if (!s || !e) return;
      const total = Math.max(1, dayDiff(e, s) + 1);
      const perDay = daysOf(r) / total;
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === year) into[d.getMonth()] += perDay;
      }
    };
    const monthlyDays: number[] = Array(12).fill(0);
    approvedThisYear.forEach((r) => spreadByMonth(r, monthlyDays));
    const requestMonthlyDays: number[] = Array(12).fill(0);
    spreadByMonth(request, requestMonthlyDays);

    // คนในแผนกเดียวกันที่ลาช่วงเดียวกัน (อนุมัติแล้ว + รออนุมัติ)
    const pool = new Map<number, LeaveRequest>();
    [...approvedAll, ...pendingRequests.filter((p) => p.status === 'PENDING')].forEach((r) => pool.set(r.id, r));
    const overlaps =
      reqStart && reqEnd
        ? Array.from(pool.values()).filter((r) => {
            if (r.id === request.id || r.employeeId === request.employeeId) return false;
            if (!request.departmentName || r.departmentName !== request.departmentName) return false;
            const s = toDateOnly(startOf(r));
            const e = toDateOnly(endOf(r)) ?? s;
            return !!s && !!e && s <= reqEnd && e >= reqStart;
          })
        : [];

    const warnings: InsightWarning[] = [];
    if (remainingAfter !== null && remainingAfter < 0) {
      warnings.push({
        key: 'INSUFFICIENT_BALANCE',
        level: 'danger',
        text: `สิทธิ์คงเหลือไม่พอ (ขาด ${fmtDays(Math.abs(remainingAfter))} วัน)`,
      });
    }
    if (overlaps.length > 0) {
      warnings.push({
        key: 'TEAM_OVERLAP',
        level: overlaps.length >= 2 ? 'danger' : 'warning',
        text: `มีคนในแผนกลาช่วงเดียวกัน ${overlaps.length} คน`,
      });
    }
    if (noticeDays !== null && noticeDays < 0) {
      warnings.push({ key: 'BACKDATED', level: 'warning', text: `ยื่นย้อนหลัง ${Math.abs(noticeDays)} วัน` });
    } else if (noticeDays !== null && noticeDays < 3 && !/ป่วย|sick/i.test(request.leaveTypeName ?? '')) {
      warnings.push({
        key: 'SHORT_NOTICE',
        level: 'warning',
        text: noticeDays === 0 ? 'ยื่นในวันที่เริ่มลา' : `ยื่นล่วงหน้าเพียง ${noticeDays} วัน`,
      });
    }
    if (/ป่วย|sick/i.test(request.leaveTypeName ?? '') && reqDays >= 3 && !(request.documents?.length)) {
      warnings.push({ key: 'NO_DOCUMENT', level: 'warning', text: 'ลาป่วยตั้งแต่ 3 วันแต่ไม่มีใบรับรองแพทย์แนบ' });
    }
    if (sameType.length >= 5) {
      warnings.push({ key: 'FREQUENT', level: 'info', text: `ลาประเภทนี้มาแล้ว ${sameType.length} ครั้งในปีนี้` });
    }

    return {
      loading,
      balance,
      balances,
      balanceAvailable: canViewBalance,
      year,
      monthlyDays,
      requestMonthlyDays,
      remainingAfter,
      noticeDays,
      overlaps,
      sameTypeThisYear: { count: sameType.length, days: sum(sameType) },
      allTypesThisYear: { count: approvedThisYear.length, days: sum(approvedThisYear) },
      rejectedThisYear: histThisYear.filter((h) => h.status === 'REJECTED').length,
      warnings,
    };
  }, [request, balances, history, approvedAll, pendingRequests, loading, canViewBalance]);
}

// ─── Stylings ─────────────────────────────────────────────────


// ─── 1. Leave Decision Panel ──────────────────────────────────

interface LeavePanelProps {
  request: LeaveRequest;
  data: LeaveDecisionData;
  compact?: boolean;
}

export function LeaveDecisionInsightsPanel({ request, data, compact = false }: LeavePanelProps) {
  const reqDays = daysOf(request);
  const { balances, remainingAfter, noticeDays, overlaps, loading, monthlyDays, requestMonthlyDays } = data;
  const thYear = data.year + 543;
  const roundDays = (n: number) => Math.round(n * 2) / 2;
  const typeBalances = balances.filter((b) => b.leaveTypeId === request.leaveTypeId);
  // เดือนของใบลานี้ (ใช้เดือนที่เริ่มลา)
  const reqStartDate = toDateOnly(startOf(request));
  const monthIdx = reqStartDate?.getMonth() ?? new Date().getMonth();
  const monthLabel = `${MONTHS_TH[monthIdx]} ${(reqStartDate?.getFullYear() ?? data.year) + 543}`;
  const monthUsed = roundDays(monthlyDays[monthIdx] ?? 0);
  const monthThis = roundDays(requestMonthlyDays[monthIdx] ?? 0);

  const cardCls = 'p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800';
  const titleCls = 'flex items-center gap-1.5 text-[13px] font-bold text-slate-800 dark:text-slate-100 mb-2.5';
  const rowCls = 'flex justify-between gap-3';
  const labelCls = 'text-slate-500 dark:text-slate-400 shrink-0';
  const valueCls = 'font-semibold text-slate-800 dark:text-slate-200 text-right';

  return (
    <div className="space-y-3 text-xs">
      {/* 1.1 ข้อมูลพนักงาน + รายละเอียดการลา (การ์ดเดียว) */}
      <RequestSummaryCard
        employeeId={request.employeeId}
        employeeName={request.employeeName}
        departmentName={request.departmentName}
        divisionName={request.divisionName}
        rows={[
          { label: 'ประเภทการลา', value: request.leaveTypeName },
          {
            label: 'ช่วงเวลาลา',
            value: (
              <>
                {formatThaiDate(startOf(request))} - {formatThaiDate(endOf(request))}{' '}
                <span className="text-primary dark:text-blue-300">({fmtDays(reqDays)} วัน)</span>
              </>
            ),
          },
          {
            label: 'ยื่นคำขอเมื่อ',
            value: (
              <>
                {formatThaiDate(request.submittedAt ?? request.createdAt)}
                {noticeDays !== null && (
                  <span className={`ml-1 font-normal ${noticeDays < 0 ? 'text-amber-600' : 'text-slate-500 dark:text-slate-400'}`}>
                    ({noticeDays < 0 ? `ย้อนหลัง ${Math.abs(noticeDays)} วัน` : noticeDays === 0 ? 'วันเดียวกับวันลา' : `ล่วงหน้า ${noticeDays} วัน`})
                  </span>
                )}
              </>
            ),
          },
          ...(request.documents && request.documents.length > 0
            ? [{ label: 'เอกสารแนบ', value: `${request.documents.length} ไฟล์` }]
            : []),
        ]}
        noteLabel="เหตุผลการลา"
        note={request.reason}
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-4 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>กำลังโหลดข้อมูลประกอบการตัดสินใจ...</span>
        </div>
      ) : (
        <>
          {/* 1.3 สิทธิ์การลาคงเหลือ แยกตามประเภท */}
          <div className={cardCls}>
            <div className={titleCls}>
              <Wallet className="w-3.5 h-3.5 text-slate-500" /> สิทธิ์{request.leaveTypeName}คงเหลือ ปี {thYear}
            </div>
            {typeBalances.length === 0 ? (
              <p className="text-[11px] text-slate-400">
                {data.balanceAvailable ? 'ไม่พบยอดสิทธิ์การลาของปีนี้' : 'ไม่มีสิทธิ์ดูยอดวันลาคงเหลือ'}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="text-right font-medium px-3 py-2">สิทธิ์ทั้งปี</th>
                      <th className="text-right font-medium px-3 py-2">ใช้ไปแล้ว</th>
                      <th className="text-right font-medium px-3 py-2">ลาครั้งนี้</th>
                      <th className="text-right font-medium px-3 py-2">คงเหลือ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {typeBalances.map((b) => {
                      const isThis = b.leaveTypeId === request.leaveTypeId;
                      const left = isThis && remainingAfter !== null ? remainingAfter : b.netRemainingLeaveDays;
                      return (
                        <tr key={b.leaveTypeId}>
                          <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">{fmtDays(b.netRemainingLeaveDays + b.usedDays)}</td>
                          <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">{fmtDays(b.usedDays)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-amber-700 dark:text-amber-300">{isThis ? fmtDays(reqDays) : '-'}</td>
                          <td
                            className={`px-3 py-2 text-right font-bold ${
                              left < 0 ? 'text-rose-600' : isThis ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {fmtDays(left)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {typeBalances.length > 0 && (
              <p className="mt-1.5 text-[11px] text-slate-400">คงเหลือหักวันลาครั้งนี้แล้ว</p>
            )}
          </div>

          {/* 1.4 วันลารวมของเดือนที่ลา (ทุกประเภท) */}
          <div className={cardCls}>
            <div className={titleCls}>
              <History className="w-3.5 h-3.5 text-slate-500" /> วันลารวมของเดือน {monthLabel}
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="text-right font-medium px-3 py-2">ลาไปแล้ว (อนุมัติ)</th>
                    <th className="text-right font-medium px-3 py-2">ลาครั้งนี้</th>
                    <th className="text-right font-medium px-3 py-2">รวมหลังอนุมัติ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">{fmtDays(monthUsed)} วัน</td>
                    <td className="px-3 py-2 text-right font-semibold text-amber-700 dark:text-amber-300">{fmtDays(monthThis)} วัน</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-slate-100">{fmtDays(roundDays(monthUsed + monthThis))} วัน</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </>
      )}
    </div>
  );
}

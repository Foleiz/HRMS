'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Wallet } from 'lucide-react';
import { leaveService } from '@/services/leaveService';
import { LeaveBalance, LeaveRequest } from '@/types/leave';
import { useAuth } from '@/context/AuthContext';
import { RequestSummaryCard } from '@/components/approvals/ReviewInfoPanels';
import { DocumentDueBadge } from '@/components/leave/DocumentDueBadge';
import { TH_MONTHS_SHORT } from '@/lib/thaiDate';

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

const MONTHS_TH = TH_MONTHS_SHORT;

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
  /** ใบนี้ถูกหักสิทธิ์ไปแล้ว (อนุมัติแล้ว) — แสดงยอดตามจริงโดยไม่หักซ้ำ */
  applied?: boolean;
}

export function LeaveDecisionInsightsPanel({ request, data, compact = false, applied = false }: LeavePanelProps) {
  const reqDays = daysOf(request);
  const { balances, remainingAfter, noticeDays, overlaps, loading } = data;
  const thYear = data.year + 543;
  const typeBalances = balances.filter((b) => b.leaveTypeId === request.leaveTypeId);

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
            : request.documentStatus
              ? [{ label: 'เอกสารแนบ', value: <DocumentDueBadge leave={request} className="" /> }]
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
          {/* 1.3 สิทธิ์การลาคงเหลือ (การ์ด 4 ช่องตามแบบดีไซน์หน้ากรอบการลา) */}
          <div className="p-3.5 rounded-2xl border border-blue-200/80 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-900/40">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-blue-950 dark:text-blue-200 mb-3">
              <div className="w-5 h-5 rounded-full border-[1.5px] border-blue-700 dark:border-blue-400 flex items-center justify-center shrink-0">
                <span className="text-2xs font-bold text-blue-700 dark:text-blue-400 leading-none">i</span>
              </div>
              <h4>สิทธิ์{request.leaveTypeName}คงเหลือ ปี {thYear}</h4>
            </div>
            {typeBalances.length === 0 ? (
              <p className="text-[11px] text-slate-400">
                {data.balanceAvailable ? 'ไม่พบยอดสิทธิ์การลาของปีนี้' : 'ไม่มีสิทธิ์ดูยอดวันลาคงเหลือ'}
              </p>
            ) : (
              <div>
                {typeBalances.map((b) => {
                  const isThis = b.leaveTypeId === request.leaveTypeId;
                  const left = isThis && remainingAfter !== null && !applied ? remainingAfter : b.netRemainingLeaveDays;
                  const usedBefore = applied && isThis ? Math.max(0, b.usedDays - reqDays) : b.usedDays;
                  const quota =
                    b.annualQuotaDays +
                    (b.activeCarriedForwardDays || 0) +
                    (b.adjustedDays || 0) ||
                    b.netRemainingLeaveDays + b.usedDays;

                  return (
                    <div key={b.leaveTypeId} className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                      {/* กล่อง 1: สิทธิ์ต่อปี */}
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-blue-100/90 dark:border-blue-900/40 p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between">
                        <span className="text-2xs text-slate-500 dark:text-slate-400 font-medium">สิทธิ์ต่อปี</span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                          {fmtDays(quota)} วัน
                        </span>
                      </div>

                      {/* กล่อง 2: ลาไปแล้ว */}
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-blue-100/90 dark:border-blue-900/40 p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between">
                        <span className="text-2xs text-slate-500 dark:text-slate-400 font-medium">ลาไปแล้ว</span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                          {fmtDays(usedBefore)} วัน
                        </span>
                      </div>

                      {/* กล่อง 3: ลาครั้งนี้ */}
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-blue-100/90 dark:border-blue-900/40 p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between">
                        <span className="text-2xs text-slate-500 dark:text-slate-400 font-medium">ลาครั้งนี้</span>
                        <span className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 mt-1">
                          {isThis ? `${fmtDays(reqDays)} วัน` : '-'}
                        </span>
                      </div>

                      {/* กล่อง 4: สิทธิ์คงเหลือ */}
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-blue-100/90 dark:border-blue-900/40 p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between">
                        <span className="text-2xs text-slate-500 dark:text-slate-400 font-medium">สิทธิ์คงเหลือ</span>
                        <span
                          className={`text-xs sm:text-sm font-bold mt-1 ${
                            left < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {fmtDays(left)} วัน
                        </span>
                      </div>
                    </div>
                  );
                })}
                {typeBalances.length > 0 && (
                  <p className="mt-2 text-2xs text-slate-500 dark:text-slate-400">คงเหลือหักวันลาครั้งนี้แล้ว</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

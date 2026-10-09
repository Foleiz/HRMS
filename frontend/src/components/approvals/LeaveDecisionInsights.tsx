'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  MessageSquareQuote,
  Paperclip,
  Users,
  Wallet,
  History,
  Eye,
  Download,
  AlertCircle,
  Briefcase,
  Building2,
  User,
  Info,
} from 'lucide-react';
import { leaveService } from '@/services/leaveService';
import { LeaveBalance, LeaveRequest } from '@/types/leave';
import { CertificateRequest } from '@/types/certificates';
import { ResignationRequest } from '@/types/resignation';
import { GeneralDocumentRequest } from '@/types/generalDocument';
import { useAuth } from '@/context/AuthContext';

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
  balanceAvailable: boolean;
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
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [approvedAll, setApprovedAll] = useState<LeaveRequest[]>([]);

  const requestId = request?.id;
  useEffect(() => {
    if (!request) return;
    let cancelled = false;
    const year = toDateOnly(startOf(request))?.getFullYear() ?? new Date().getFullYear();

    setLoading(true);
    setBalance(null);
    setHistory([]);
    setApprovedAll([]);

    Promise.all([
      // เรียกเฉพาะผู้มีสิทธิ์ — ถ้าไม่มีสิทธิ์ API จะตอบ 403 และทำให้ขึ้น dialog สิทธิ์ถูกเปลี่ยน
      canViewBalance
        ? leaveService
            .getLeaveBalances({ employeeId: request.employeeId, year, leaveTypeId: request.leaveTypeId })
            .catch(() => [] as LeaveBalance[])
        : Promise.resolve([] as LeaveBalance[]),
      leaveService.getLeaveRequests({ employeeId: request.employeeId, pageSize: 200 }).catch(() => [] as LeaveRequest[]),
      leaveService.getLeaveRequests({ status: 'APPROVED', pageSize: 500 }).catch(() => [] as LeaveRequest[]),
    ]).then(([balances, hist, approved]) => {
      if (cancelled) return;
      setBalance(balances.find((b) => b.leaveTypeId === request.leaveTypeId) ?? balances[0] ?? null);
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
      balanceAvailable: canViewBalance,
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
      balanceAvailable: canViewBalance,
      remainingAfter,
      noticeDays,
      overlaps,
      sameTypeThisYear: { count: sameType.length, days: sum(sameType) },
      allTypesThisYear: { count: approvedThisYear.length, days: sum(approvedThisYear) },
      rejectedThisYear: histThisYear.filter((h) => h.status === 'REJECTED').length,
      warnings,
    };
  }, [request, balance, history, approvedAll, pendingRequests, loading, canViewBalance]);
}

// ─── Stylings ─────────────────────────────────────────────────

const LEVEL_STYLE: Record<InsightLevel, string> = {
  danger: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/50',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50',
  info: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900/50',
};

// ─── 1. Leave Decision Panel ──────────────────────────────────

interface LeavePanelProps {
  request: LeaveRequest;
  data: LeaveDecisionData;
  compact?: boolean;
}

export function LeaveDecisionInsightsPanel({ request, data, compact = false }: LeavePanelProps) {
  const reqDays = daysOf(request);
  const { balance, remainingAfter, noticeDays, overlaps, warnings, loading } = data;

  return (
    <div className="space-y-3 text-xs">
      {/* 1.1 สรุปคำขอลา */}
      <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-2">
        <div className="flex justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400 shrink-0">พนักงาน</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
            {request.employeeName}
            {request.departmentName ? ` (${request.departmentName})` : ''}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400 shrink-0">ประเภทการลา</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">{request.leaveTypeName}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" /> ช่วงเวลาลา
          </span>
          <span className="font-medium text-slate-800 dark:text-slate-200 text-right">
            {formatThaiDate(startOf(request))} - {formatThaiDate(endOf(request))}{' '}
            <span className="font-bold text-[#0B2046] dark:text-blue-300">({fmtDays(reqDays)} วัน)</span>
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> ยื่นคำขอเมื่อ
          </span>
          <span className="text-slate-800 dark:text-slate-200 text-right">
            {formatThaiDate(request.submittedAt ?? request.createdAt)}
            {noticeDays !== null && (
              <span className={`ml-1 ${noticeDays < 0 ? 'text-amber-600 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                ({noticeDays < 0 ? `ย้อนหลัง ${Math.abs(noticeDays)} วัน` : noticeDays === 0 ? 'วันเดียวกับวันลา' : `ล่วงหน้า ${noticeDays} วัน`})
              </span>
            )}
          </span>
        </div>
        {request.documents && request.documents.length > 0 && (
          <div className="flex justify-between gap-3">
            <span className="text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
              <Paperclip className="w-3.5 h-3.5" /> เอกสารแนบ
            </span>
            <span className="text-slate-800 dark:text-slate-200 text-right truncate">
              {request.documents.length} ไฟล์
            </span>
          </div>
        )}
        {request.reason && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
              <MessageSquareQuote className="w-3.5 h-3.5" /> เหตุผลการลา
            </span>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line line-clamp-3">
              “{request.reason}”
            </p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-4 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>กำลังโหลดข้อมูลประกอบการตัดสินใจ...</span>
        </div>
      ) : (
        <>
          {/* 1.2 ข้อควรพิจารณา / ป้ายเตือน */}
          {warnings.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {warnings.map((w) => (
                <span
                  key={w.key}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${LEVEL_STYLE[w.level]}`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  {w.text}
                </span>
              ))}
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50">
              <CheckCircle2 className="w-3 h-3" />
              ไม่พบประเด็นที่ต้องระวัง สิทธิ์และช่วงเวลาเป็นไปตามเกณฑ์
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {/* 1.3 สิทธิ์วันลา */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 mb-1.5">
                <Wallet className="w-3.5 h-3.5" /> สิทธิ์{request.leaveTypeName}
              </div>
              {balance ? (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      {fmtDays(balance.netRemainingLeaveDays)}
                    </span>
                    <span className="text-slate-400">→</span>
                    <span
                      className={`text-lg font-bold ${remainingAfter !== null && remainingAfter < 0 ? 'text-rose-600' : 'text-emerald-600'}`}
                    >
                      {fmtDays(remainingAfter)}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">วัน</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    คงเหลือ → หลังอนุมัติ · ใช้ไป {fmtDays(balance.usedDays)}/
                    {fmtDays(balance.annualQuotaDays + (balance.activeCarriedForwardDays ?? 0) + (balance.adjustedDays ?? 0))}
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {data.balanceAvailable ? 'ไม่พบยอดสิทธิ์ของปีนี้' : 'ไม่มีสิทธิ์ดูยอดวันลาคงเหลือ'}
                </p>
              )}
            </div>

            {/* 1.4 ประวัติการลาปีนี้ */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 mb-1.5">
                <History className="w-3.5 h-3.5" /> ลาไปแล้วปีนี้
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {fmtDays(data.allTypesThisYear.days)}
                </span>
                <span className="text-slate-500 dark:text-slate-400">วัน ({data.allTypesThisYear.count} ครั้ง)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                ประเภทนี้ {fmtDays(data.sameTypeThisYear.days)} วัน ({data.sameTypeThisYear.count} ครั้ง)
                {data.rejectedThisYear > 0 && ` · ถูกปฏิเสธ ${data.rejectedThisYear} ครั้ง`}
              </p>
            </div>
          </div>

          {/* 1.5 คนในแผนกที่ลาช่วงเดียวกัน */}
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <Users className="w-3.5 h-3.5" /> คนในแผนก{request.departmentName ? ` ${request.departmentName}` : ''} ที่ลาช่วงเดียวกัน
              </span>
              <span className={`font-bold ${overlaps.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {overlaps.length} คน
              </span>
            </div>
            {overlaps.length === 0 ? (
              <p className="text-[11px] text-slate-400">ไม่มีคนในแผนกลาซ้อนในช่วงนี้ (ไม่กระทบกำลังพล)</p>
            ) : (
              <ul className="space-y-1">
                {overlaps.slice(0, compact ? 2 : 4).map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-slate-700 dark:text-slate-300 truncate">
                      {o.employeeName} <span className="text-slate-400">· {o.leaveTypeName}</span>
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 shrink-0">
                      {formatShortThaiDate(startOf(o))}–{formatShortThaiDate(endOf(o))}
                      {o.status === 'PENDING' && <span className="ml-1 text-amber-600 font-medium">(รออนุมัติ)</span>}
                    </span>
                  </li>
                ))}
                {overlaps.length > (compact ? 2 : 4) && (
                  <li className="text-[11px] text-slate-400">และอีก {overlaps.length - (compact ? 2 : 4)} คน</li>
                )}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── 1.6 เหตุผลปฏิเสธคำขอลาแบบเลือกเร็ว ──────────────────────────

const LEAVE_REJECT_REASONS: { text: string; relatedTo?: InsightWarning['key'] }[] = [
  { text: 'สิทธิ์วันลาคงเหลือไม่เพียงพอ', relatedTo: 'INSUFFICIENT_BALANCE' },
  { text: 'มีบุคลากรในทีมลาช่วงเดียวกันหลายคน กระทบการปฏิบัติงาน', relatedTo: 'TEAM_OVERLAP' },
  { text: 'ยื่นล่วงหน้าไม่เป็นไปตามระเบียบบริษัท', relatedTo: 'SHORT_NOTICE' },
  { text: 'ยื่นย้อนหลังเกินระยะเวลาที่กำหนด', relatedTo: 'BACKDATED' },
  { text: 'เอกสารประกอบการลาไม่ครบถ้วน กรุณาแนบเอกสารและยื่นใหม่', relatedTo: 'NO_DOCUMENT' },
  { text: 'ช่วงเวลาดังกล่าวมีงานเร่งด่วนหรือภารกิจสำคัญ กรุณาเลื่อนวันลา' },
];

interface LeaveRejectChipsProps {
  warnings: InsightWarning[];
  value: string;
  onChange: (value: string) => void;
}

export function LeaveRejectReasonChips({ warnings, value, onChange }: LeaveRejectChipsProps) {
  const warnKeys = new Set(warnings.map((w) => w.key));
  const sorted = [...LEAVE_REJECT_REASONS].sort(
    (a, b) => Number(!!b.relatedTo && warnKeys.has(b.relatedTo)) - Number(!!a.relatedTo && warnKeys.has(a.relatedTo))
  );

  const toggle = (text: string) => {
    const lines = value.split('\n').map((l) => l.trim()).filter(Boolean);
    const next = lines.includes(text) ? lines.filter((l) => l !== text) : [...lines, text];
    onChange(next.join('\n'));
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {sorted.map((r) => {
        const selected = value.split('\n').map((l) => l.trim()).includes(r.text);
        const suggested = !!r.relatedTo && warnKeys.has(r.relatedTo);
        return (
          <button
            key={r.text}
            type="button"
            onClick={() => toggle(r.text)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer text-left ${
              selected
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : suggested
                  ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            }`}
            title={suggested ? 'แนะนำจากข้อมูลประกอบการตัดสินใจ' : undefined}
          >
            {suggested && !selected && <FileText className="w-3 h-3 inline mr-1 -mt-0.5 text-rose-600" />}
            {r.text}
          </button>
        );
      })}
    </div>
  );
}

// ─── 2. Certificate Decision Panel & Reject Chips ─────────────

interface CertPanelProps {
  request: CertificateRequest;
  onPreview?: () => void;
  compact?: boolean;
}

export function CertDecisionInsightsPanel({ request, onPreview, compact = false }: CertPanelProps) {
  return (
    <div className="space-y-3 text-xs">
      <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-2">
        <div className="flex justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400 shrink-0">พนักงาน</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
            {request.employeeName}
            {request.employeeCode ? ` (${request.employeeCode})` : ''}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400 shrink-0">สังกัด / ตำแหน่ง</span>
          <span className="text-slate-700 dark:text-slate-300 text-right">
            {request.departmentName || '-'} · {request.positionName || '-'}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400 shrink-0">ประเภทหนังสือรับรอง</span>
          <span className="font-bold text-[#0B2046] dark:text-blue-300 text-right">{request.certificateName}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400 shrink-0">วัตถุประสงค์การขอ</span>
          <span className="font-medium text-slate-800 dark:text-slate-200 text-right">{request.purpose || '-'}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> วันที่ยื่นคำขอ
          </span>
          <span className="text-slate-800 dark:text-slate-200 text-right">
            {formatThaiDate(request.requestedAt)}
          </span>
        </div>
      </div>

      {!compact && (
        <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-[11px]">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>กรุณาตรวจสอบความถูกต้องของข้อมูลในหนังสือรับรองก่อนอนุมัติ</span>
          </div>
          {onPreview && (
            <button
              type="button"
              onClick={onPreview}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold shrink-0 cursor-pointer shadow-2xs"
            >
              <Eye className="w-3.5 h-3.5" />
              ดูตัวอย่างเอกสาร
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const CERT_REJECT_REASONS = [
  'วัตถุประสงค์ในการขอไม่ชัดเจน กรุณาระบุรายละเอียดเพิ่มเติม',
  'ข้อมูลพนักงานในระบบอยู่ระหว่างการปรับปรุง กรุณาติดต่อฝ่ายบุคคล',
  'มีคำขอหนังสือรับรองที่ได้รับอนุมัติไปแล้วในช่วงเวลาใกล้เคียง',
  'เอกสารประกอบหรือข้อมูลไม่ตรงกับระเบียบบริษัท',
  'กรุณาติดต่อฝ่ายบุคคล (HR) เพื่อยืนยันรายละเอียดก่อนยื่นคำขอใหม่',
];

export function CertRejectReasonChips({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const toggle = (text: string) => {
    const lines = value.split('\n').map((l) => l.trim()).filter(Boolean);
    const next = lines.includes(text) ? lines.filter((l) => l !== text) : [...lines, text];
    onChange(next.join('\n'));
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {CERT_REJECT_REASONS.map((text) => {
        const selected = value.split('\n').map((l) => l.trim()).includes(text);
        return (
          <button
            key={text}
            type="button"
            onClick={() => toggle(text)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer text-left ${
              selected
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            }`}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

// ─── 3. Resignation Decision Panel & Reject Chips ─────────────

interface ResignPanelProps {
  request: ResignationRequest;
  onPreview?: () => void;
  compact?: boolean;
}

export function ResignDecisionInsightsPanel({ request, onPreview, compact = false }: ResignPanelProps) {
  const isShortNotice = request.noticePeriodDays < 30;

  return (
    <div className="space-y-3 text-xs">
      {/* 3.1 สรุปคำขอลาออก */}
      <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-2">
        <div className="flex justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400 shrink-0">พนักงาน</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
            {request.employeeName}
            {request.employeeCode ? ` (${request.employeeCode})` : ''}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400 shrink-0">สังกัด / ตำแหน่ง</span>
          <span className="text-slate-700 dark:text-slate-300 text-right">
            {request.departmentName || '-'} · {request.positionName || '-'}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" /> วันทำงานสุดท้าย
          </span>
          <span className="font-bold text-[#0B2046] dark:text-blue-300 text-right">
            {formatThaiDate(request.requestedLastWorkingDate)}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> ระยะเวลาบอกล่วงหน้า
          </span>
          <span className="text-right">
            <span className={`font-bold ${isShortNotice ? 'text-amber-600' : 'text-emerald-600'}`}>
              {request.noticePeriodDays} วัน
            </span>
            <span className="text-slate-500 dark:text-slate-400 ml-1">
              ({isShortNotice ? 'น้อยกว่าเกณฑ์ 30 วัน' : 'เป็นไปตามเกณฑ์ 30 วัน'})
            </span>
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400 shrink-0">เหตุผลการลาออก</span>
          <span className="font-medium text-slate-800 dark:text-slate-200 text-right">
            {request.reasonCategory || request.reason || '-'}
          </span>
        </div>
        {request.handoverNotes && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
              <Briefcase className="w-3.5 h-3.5" /> บันทึกการส่งมอบงาน
            </span>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line line-clamp-2">
              {request.handoverNotes}
            </p>
          </div>
        )}
        {request.contactAfterResignation && (
          <div className="flex justify-between gap-3 pt-1 border-t border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400 shrink-0">ข้อมูลติดต่อหลังลาออก</span>
            <span className="text-slate-700 dark:text-slate-300 text-right truncate">
              {request.contactAfterResignation}
            </span>
          </div>
        )}
      </div>

      {/* 3.2 ป้ายเตือนข้อพิจารณา */}
      {isShortNotice ? (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50 w-full">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>แจ้งล่วงหน้า {request.noticePeriodDays} วัน ซึ่งน้อยกว่าเกณฑ์ระเบียบบริษัท (30 วัน)</span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50 w-full">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
          <span>แจ้งล่วงหน้าตามระเบียบบริษัทเรียบร้อย (30 วันขึ้นไป)</span>
        </div>
      )}

      {!compact && onPreview && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onPreview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-all"
          >
            <Eye className="w-3.5 h-3.5" />
            ดูตัวอย่างหนังสือขอลาออกทางการ
          </button>
        </div>
      )}
    </div>
  );
}

const RESIGN_REJECT_REASONS = [
  'ระยะเวลาบอกกล่าวล่วงหน้าน้อยกว่าระเบียบบริษัท (30 วัน)',
  'ยังไม่ได้สรุปแผนการส่งมอบงานและการถ่ายทอดความรู้ กรุณาประสานงานหัวหน้างาน',
  'อยู่ระหว่างภารกิจหรือโครงการสำคัญ กรุณาประสานงานเพื่อกำหนดวันทำงานสุดท้ายใหม่',
  'ข้อมูลการติดต่อหรือเอกสารประกอบการลาออกยังไม่สมบูรณ์',
  'กรุณาเข้าพบฝ่ายบุคคลและหัวหน้างานเพื่อหารือแนวทางร่วมกัน',
];

export function ResignRejectReasonChips({
  isShortNotice,
  value,
  onChange,
}: {
  isShortNotice?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const toggle = (text: string) => {
    const lines = value.split('\n').map((l) => l.trim()).filter(Boolean);
    const next = lines.includes(text) ? lines.filter((l) => l !== text) : [...lines, text];
    onChange(next.join('\n'));
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {RESIGN_REJECT_REASONS.map((text) => {
        const selected = value.split('\n').map((l) => l.trim()).includes(text);
        const suggested = isShortNotice && text.includes('30 วัน');
        return (
          <button
            key={text}
            type="button"
            onClick={() => toggle(text)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer text-left ${
              selected
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : suggested
                  ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            }`}
          >
            {suggested && !selected && <FileText className="w-3 h-3 inline mr-1 -mt-0.5 text-rose-600" />}
            {text}
          </button>
        );
      })}
    </div>
  );
}

// ─── 4. General Document Decision Panel & Reject Chips ────────

interface GeneralPanelProps {
  request: GeneralDocumentRequest;
  onDownloadAttachment?: () => void;
  compact?: boolean;
}

export function GeneralDecisionInsightsPanel({
  request,
  onDownloadAttachment,
  compact = false,
}: GeneralPanelProps) {
  return (
    <div className="space-y-3 text-xs">
      <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-2">
        <div className="flex justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400 shrink-0">พนักงาน</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
            {request.employeeName}
            {request.employeeCode ? ` (${request.employeeCode})` : ''}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400 shrink-0">สังกัด / ตำแหน่ง</span>
          <span className="text-slate-700 dark:text-slate-300 text-right">
            {request.departmentName || '-'} · {request.positionName || '-'}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400 shrink-0">ประเภทเอกสาร</span>
          <span className="font-bold text-[#0B2046] dark:text-blue-300 text-right">{request.documentType}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400 shrink-0">วัตถุประสงค์</span>
          <span className="font-medium text-slate-800 dark:text-slate-200 text-right">{request.purpose || '-'}</span>
        </div>
        {(request.issueDate || request.expiryDate) && (
          <div className="flex justify-between gap-3">
            <span className="text-slate-500 dark:text-slate-400 shrink-0">วันที่มีผล / หมดอายุ</span>
            <span className="text-slate-700 dark:text-slate-300 text-right">
              {formatThaiDate(request.issueDate)} {request.expiryDate ? `ถึง ${formatThaiDate(request.expiryDate)}` : '(ไม่มีวันหมดอายุ)'}
            </span>
          </div>
        )}
        {request.fileName && (
          <div className="flex justify-between gap-3 pt-1 border-t border-slate-200 dark:border-slate-700 items-center">
            <span className="text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
              <Paperclip className="w-3.5 h-3.5" /> ไฟล์แนบ
            </span>
            {onDownloadAttachment ? (
              <button
                type="button"
                onClick={onDownloadAttachment}
                className="font-medium text-blue-600 hover:underline truncate max-w-48 cursor-pointer flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                {request.fileName}
              </button>
            ) : (
              <span className="text-slate-700 dark:text-slate-300 truncate max-w-48">{request.fileName}</span>
            )}
          </div>
        )}
        {request.notes && (
          <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400 block mb-0.5">บันทึกเพิ่มเติม:</span>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{request.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const GENERAL_REJECT_REASONS = [
  'เอกสารแนบไม่ครบถ้วนหรือไม่ชัดเจน กรุณาแนบไฟล์และยื่นใหม่',
  'วัตถุประสงค์ไม่สอดคล้องกับระเบียบปฏิบัติของบริษัท',
  'ข้อมูลที่ระบุไม่ถูกต้อง กรุณาตรวจสอบข้อมูลและยื่นใหม่',
  'โปรดระบุรายละเอียดวัตถุประสงค์เพิ่มเติม',
  'กรุณาติดต่อฝ่ายบุคคลเพื่อยืนยันข้อมูลก่อนยื่นคำขอใหม่',
];

export function GeneralRejectReasonChips({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const toggle = (text: string) => {
    const lines = value.split('\n').map((l) => l.trim()).filter(Boolean);
    const next = lines.includes(text) ? lines.filter((l) => l !== text) : [...lines, text];
    onChange(next.join('\n'));
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {GENERAL_REJECT_REASONS.map((text) => {
        const selected = value.split('\n').map((l) => l.trim()).includes(text);
        return (
          <button
            key={text}
            type="button"
            onClick={() => toggle(text)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer text-left ${
              selected
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            }`}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

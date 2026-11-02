'use client';

import React, { useEffect, useState } from 'react';
import { ClipboardList, Clock, Wallet, MessageSquareQuote } from 'lucide-react';
import { employeeService } from '@/services/employeeService';
import type { AttendanceAdjustment } from '@/types/attendanceAdjustment';
import type { BenefitClaimRequest } from '@/types/benefit';
import type { CertificateRequest } from '@/types/certificates';
import type { ResignationRequest } from '@/types/resignation';
import type { GeneralDocumentRequest } from '@/types/generalDocument';

/** ข้อมูลประกอบการพิจารณา (ฝั่งซ้ายของหน้าตรวจสอบ) — ใช้ร่วมกันทุกประเภทเอกสาร */

export const reviewCardCls = 'p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800';
export const reviewTitleCls = 'flex items-center gap-1.5 text-[13px] font-bold text-slate-800 dark:text-slate-100 mb-2.5';

const thaiDate = (d?: string | null) => {
  if (!d) return '-';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  const dt = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
};

const thaiTime = (d?: string | null) => {
  if (!d) return '-';
  const t = new Date(d);
  if (isNaN(t.getTime())) return d;
  return t.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const money = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ฝ่ายของพนักงาน (คำขอส่วนใหญ่ไม่ได้ส่งฝ่ายมา — ดึงจากข้อมูลพนักงานครั้งเดียวต่อคน) */
const divisionCache = new Map<number, Promise<string | null>>();
const loadDivision = (id: number) => {
  let p = divisionCache.get(id);
  if (!p) {
    p = employeeService
      .getById(id)
      .then((e) => e?.divisionName || null)
      .catch(() => {
        divisionCache.delete(id);
        return null;
      });
    divisionCache.set(id, p);
  }
  return p;
};

function useDivisionName(employeeId?: number | null, known?: string | null) {
  const [loaded, setLoaded] = useState<{ id: number; name: string | null } | null>(null);
  useEffect(() => {
    if (known || !employeeId) return;
    let alive = true;
    loadDivision(employeeId).then((name) => alive && setLoaded({ id: employeeId, name }));
    return () => {
      alive = false;
    };
  }, [employeeId, known]);
  if (known) return known;
  return loaded && loaded.id === employeeId ? loaded.name : null;
}

export interface SummaryRow {
  label: string;
  value: React.ReactNode;
}

interface RequestSummaryCardProps {
  employeeId?: number | null;
  employeeName: string;
  departmentName?: string | null;
  /** ฝ่าย ถ้าคำขอมีมาแล้ว (ไม่มี = ดึงจากข้อมูลพนักงาน) */
  divisionName?: string | null;
  rows: SummaryRow[];
  noteLabel?: string;
  note?: string | null;
}

function SummaryRowItem({ r }: { r: SummaryRow }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="text-slate-500 dark:text-slate-400 shrink-0">{r.label}</dt>
      <dd className="m-0 font-semibold text-slate-800 dark:text-slate-200 text-right min-w-0 break-words">{r.value}</dd>
    </div>
  );
}

/** การ์ดเดียว: ข้อมูลพนักงาน + รายละเอียดคำขอ + เหตุผล (ข้อความยาวเต็มความกว้างด้านล่าง) */
export function RequestSummaryCard({
  employeeId,
  employeeName,
  departmentName,
  divisionName,
  rows,
  noteLabel = 'เหตุผล',
  note,
}: RequestSummaryCardProps) {
  const division = useDivisionName(employeeId, divisionName);
  const people: SummaryRow[] = [
    { label: 'ชื่อ-นามสกุล', value: employeeName },
    { label: 'ฝ่าย', value: division || '-' },
    { label: 'แผนก', value: departmentName || '-' },
  ];
  return (
    <div className={reviewCardCls}>
      <div className={reviewTitleCls}>
        <ClipboardList className="w-3.5 h-3.5 text-slate-500" /> รายละเอียดคำขอ
      </div>
      <dl className="m-0 divide-y divide-slate-100 dark:divide-slate-700/60">
        {people.map((r) => (
          <SummaryRowItem key={r.label} r={r} />
        ))}
      </dl>
      {rows.length > 0 && (
        <dl className="m-0 mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/60">
          {rows.map((r) => (
            <SummaryRowItem key={r.label} r={r} />
          ))}
        </dl>
      )}
      {note && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
            <MessageSquareQuote className="w-3.5 h-3.5" /> {noteLabel}
          </span>
          <p className="m-0 text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line break-words max-h-40 overflow-y-auto">
            {note}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── หนังสือรับรอง ─────────────────────────────────────────────

export function CertificateReviewInfo({ request }: { request: CertificateRequest }) {
  return (
    <div className="space-y-3 text-xs">
      <RequestSummaryCard
        employeeId={request.employeeId}
        employeeName={request.employeeName}
        departmentName={request.departmentName}
        rows={[
          { label: 'ประเภทหนังสือรับรอง', value: <span className="text-primary dark:text-blue-300">{request.certificateName}</span> },
          { label: 'ยื่นคำขอเมื่อ', value: thaiDate(request.requestedAt) },
        ]}
        noteLabel="วัตถุประสงค์การขอ"
        note={request.purpose}
      />
      <p className="text-[11px] text-slate-400">ตรวจข้อมูลที่จะพิมพ์ในหนังสือรับรองได้จากปุ่ม “ดูตัวอย่างหนังสือรับรอง” ด้านล่างขวา</p>
    </div>
  );
}

// ─── ใบลาออก ───────────────────────────────────────────────────

export function ResignationReviewInfo({ request }: { request: ResignationRequest }) {
  const isShortNotice = request.noticePeriodDays < 30;
  const notes = [request.reasonDetail || request.reason, request.handoverNotes ? `การส่งมอบงาน: ${request.handoverNotes}` : null]
    .filter(Boolean)
    .join('\n\n');
  return (
    <div className="space-y-3 text-xs">
      <RequestSummaryCard
        employeeId={request.employeeId}
        employeeName={request.employeeName}
        departmentName={request.departmentName}
        rows={[
          { label: 'วันทำงานสุดท้าย', value: <span className="text-primary dark:text-blue-300">{thaiDate(request.requestedLastWorkingDate)}</span> },
          {
            label: 'แจ้งล่วงหน้า',
            value: (
              <span className={isShortNotice ? 'text-amber-600' : 'text-emerald-600'}>
                {request.noticePeriodDays} วัน {isShortNotice ? '(น้อยกว่าเกณฑ์ 30 วัน)' : ''}
              </span>
            ),
          },
          ...(request.reasonCategory ? [{ label: 'สาเหตุ', value: request.reasonCategory }] : []),
          ...(request.contactAfterResignation ? [{ label: 'ติดต่อหลังลาออก', value: request.contactAfterResignation }] : []),
          { label: 'ยื่นคำขอเมื่อ', value: thaiDate(request.submittedAt) },
        ]}
        noteLabel="เหตุผลการลาออก"
        note={notes || null}
      />
    </div>
  );
}

// ─── คำร้องทั่วไป ───────────────────────────────────────────────

export function GeneralReviewInfo({ request }: { request: GeneralDocumentRequest }) {
  const note = [request.purpose, request.notes ? `บันทึกเพิ่มเติม: ${request.notes}` : null].filter(Boolean).join('\n\n');
  return (
    <div className="space-y-3 text-xs">
      <RequestSummaryCard
        employeeId={request.employeeId}
        employeeName={request.employeeName}
        departmentName={request.departmentName}
        rows={[
          { label: 'ประเภทเอกสาร', value: <span className="text-primary dark:text-blue-300">{request.documentType}</span> },
          ...(request.issueDate || request.expiryDate
            ? [
                {
                  label: 'วันที่มีผล / หมดอายุ',
                  value: `${thaiDate(request.issueDate)}${request.expiryDate ? ` – ${thaiDate(request.expiryDate)}` : ''}`,
                },
              ]
            : []),
          { label: 'ยื่นคำขอเมื่อ', value: thaiDate(request.submittedAt) },
        ]}
        noteLabel="วัตถุประสงค์"
        note={note || null}
      />
    </div>
  );
}

// ─── คำขอปรับเวลาเข้า-ออก ─────────────────────────────────────

export function TimeAdjustReviewInfo({ adj }: { adj: AttendanceAdjustment }) {
  const rows: { label: string; before: string | null; after: string | null }[] = [
    { label: 'เวลาเข้า', before: adj.originalClockIn, after: adj.adjustedClockIn },
    { label: 'เวลาออก', before: adj.originalClockOut, after: adj.adjustedClockOut },
  ];
  return (
    <div className="space-y-3 text-xs">
      <RequestSummaryCard
        employeeId={adj.employeeId}
        employeeName={adj.employeeName}
        departmentName={adj.departmentName}
        rows={[
          { label: 'วันที่ทำงาน', value: thaiDate(adj.workDate) },
          { label: 'กะงาน', value: adj.shiftName || '-' },
          { label: 'ยื่นคำขอเมื่อ', value: `${thaiDate(adj.createdAt)} ${thaiTime(adj.createdAt)} น.` },
        ]}
        noteLabel="เหตุผลในการขอปรับ"
        note={adj.reason}
      />

      <div className={reviewCardCls}>
        <div className={reviewTitleCls}>
          <Clock className="w-3.5 h-3.5 text-slate-500" /> เวลาที่ขอปรับ
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-left font-medium px-3 py-2">รายการ</th>
                <th className="text-right font-medium px-3 py-2">เวลาเดิม (สแกน)</th>
                <th className="text-right font-medium px-3 py-2">ขอปรับเป็น</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {rows.map((r) => {
                const changed = thaiTime(r.before) !== thaiTime(r.after);
                return (
                  <tr key={r.label}>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{r.label}</td>
                    <td className="px-3 py-2 text-right text-slate-500 dark:text-slate-400">
                      {r.before ? `${thaiTime(r.before)} น.` : 'ไม่มีบันทึก'}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-bold ${
                        changed ? 'text-amber-700 dark:text-amber-300' : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {r.after ? `${thaiTime(r.after)} น.` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400">อนุมัติแล้ว ระบบคำนวณเวลาทำงานของวันนั้นใหม่อัตโนมัติ</p>
      </div>
    </div>
  );
}

// ─── คำขอเบิกสวัสดิการ ─────────────────────────────────────────

export function BenefitReviewInfo({ claim, applied = false }: { claim: BenefitClaimRequest; applied?: boolean }) {
  const hasQuota = claim.quotaAmount > 0;
  // อนุมัติแล้ว: ยอดใช้ไปแล้วรวมใบนี้อยู่ — หักออกเพื่อแสดงก่อน/หลังให้ถูก
  const usedBefore = applied ? Math.max(0, claim.approvedUsedAmount - claim.amount) : claim.approvedUsedAmount;
  const remainingBefore = hasQuota ? Math.max(0, claim.quotaAmount - usedBefore) : null;
  const remainingAfter = remainingBefore !== null ? remainingBefore - claim.amount : null;
  const overQuota = remainingAfter !== null && remainingAfter < 0;

  return (
    <div className="space-y-3 text-xs">
      <RequestSummaryCard
        employeeId={claim.employeeId}
        employeeName={claim.employeeName}
        departmentName={claim.departmentName}
        rows={[
          { label: 'สวัสดิการ', value: claim.benefitName },
          { label: 'จำนวนเงินที่ขอเบิก', value: <span className="text-primary dark:text-blue-300">{money(claim.amount)} บาท</span> },
          { label: 'วันที่ใช้สิทธิ์', value: thaiDate(claim.claimDate) },
          ...(claim.serviceProvider ? [{ label: 'ผู้ให้บริการ', value: claim.serviceProvider }] : []),
          ...(claim.receiptNumber ? [{ label: 'เลขที่ใบเสร็จ', value: claim.receiptNumber }] : []),
          { label: 'ยื่นคำขอเมื่อ', value: thaiDate(claim.submittedAt) },
        ]}
        noteLabel="รายละเอียดเพิ่มเติม"
        note={claim.remarks}
      />

      <div className={reviewCardCls}>
        <div className={reviewTitleCls}>
          <Wallet className="w-3.5 h-3.5 text-slate-500" /> วงเงินสวัสดิการ ปี {claim.claimYear + 543}
        </div>
        {hasQuota ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="rounded-xl border border-sky-200 bg-sky-50/70 dark:border-sky-900/60 dark:bg-sky-950/30 px-2 py-3">
                <div className="text-xs font-semibold text-sky-600 dark:text-sky-400">วงเงิน</div>
                <div className="mt-1 text-base font-bold font-mono text-sky-700 dark:text-sky-300 truncate">{money(claim.quotaAmount)}</div>
                <div className="text-[11px] text-sky-600/80 dark:text-sky-400/80">บ./ปี</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30 px-2 py-3">
                <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">ใช้ไปแล้ว</div>
                <div className="mt-1 text-base font-bold font-mono text-amber-700 dark:text-amber-300 truncate">{money(usedBefore)}</div>
                <div className="text-[11px] text-amber-600/80 dark:text-amber-400/80">บาท</div>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 dark:border-indigo-900/60 dark:bg-indigo-950/30 px-2 py-3">
                <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">เบิกครั้งนี้</div>
                <div className="mt-1 text-base font-bold font-mono text-indigo-700 dark:text-indigo-300 truncate">{money(claim.amount)}</div>
                <div className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80">บาท</div>
              </div>
              <div
                className={`rounded-xl border px-2 py-3 ${
                  overQuota
                    ? 'border-rose-200 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/30'
                    : 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/30'
                }`}
              >
                <div className={`text-xs font-semibold ${overQuota ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>คงเหลือหลังอนุมัติ</div>
                <div className={`mt-1 text-base font-bold font-mono truncate ${overQuota ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                  {money(remainingAfter ?? 0)}
                </div>
                <div className={`text-[11px] ${overQuota ? 'text-rose-600/80 dark:text-rose-400/80' : 'text-emerald-600/80 dark:text-emerald-400/80'}`}>บาท</div>
              </div>
            </div>
          </>
        ) : (
          <p className="text-[11px] text-slate-400">สวัสดิการนี้ไม่ได้กำหนดวงเงินต่อปี</p>
        )}
        {remainingAfter !== null && remainingAfter < 0 && (
          <p className="mt-1.5 text-[11px] font-semibold text-rose-600">ยอดที่ขอเบิกเกินวงเงินคงเหลือ {money(Math.abs(remainingAfter))} บาท</p>
        )}
      </div>
    </div>
  );
}

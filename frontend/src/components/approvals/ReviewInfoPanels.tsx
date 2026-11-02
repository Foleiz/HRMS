'use client';

import React from 'react';
import { User, Clock, Gift, Wallet, MessageSquareQuote } from 'lucide-react';
import type { AttendanceAdjustment } from '@/types/attendanceAdjustment';
import type { BenefitClaimRequest } from '@/types/benefit';

/** ข้อมูลประกอบการพิจารณาของ "คำขอปรับเวลา" และ "เบิกสวัสดิการ" (ฝั่งซ้ายของหน้าตรวจสอบ) */

const cardCls = 'p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800';
const titleCls = 'flex items-center gap-1.5 text-[13px] font-bold text-slate-800 dark:text-slate-100 mb-2.5';
const rowCls = 'flex justify-between gap-3';
const labelCls = 'text-slate-500 dark:text-slate-400 shrink-0';
const valueCls = 'font-semibold text-slate-800 dark:text-slate-200 text-right';

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

function EmployeeCard({ name, department, position }: { name: string; department?: string | null; position?: string | null }) {
  return (
    <div className={cardCls}>
      <div className={titleCls}>
        <User className="w-3.5 h-3.5 text-slate-500" /> ข้อมูลพนักงาน
      </div>
      <div className="space-y-2">
        <div className={rowCls}>
          <span className={labelCls}>ชื่อ-นามสกุล</span>
          <span className={valueCls}>{name}</span>
        </div>
        <div className={rowCls}>
          <span className={labelCls}>แผนก</span>
          <span className={valueCls}>{department || '-'}</span>
        </div>
        <div className={rowCls}>
          <span className={labelCls}>ตำแหน่ง</span>
          <span className={valueCls}>{position || '-'}</span>
        </div>
      </div>
    </div>
  );
}

function Reason({ text, label }: { text?: string | null; label: string }) {
  if (!text) return null;
  return (
    <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700">
      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
        <MessageSquareQuote className="w-3.5 h-3.5" /> {label}
      </span>
      <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line line-clamp-4">“{text}”</p>
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
      <div className="grid gap-3 lg:grid-cols-2">
        <EmployeeCard name={adj.employeeName} department={adj.departmentName} position={adj.positionName} />
        <div className={cardCls}>
          <div className={titleCls}>
            <Clock className="w-3.5 h-3.5 text-slate-500" /> รายละเอียดคำขอ
          </div>
          <div className="space-y-2">
            <div className={rowCls}>
              <span className={labelCls}>วันที่ทำงาน</span>
              <span className={valueCls}>{thaiDate(adj.workDate)}</span>
            </div>
            <div className={rowCls}>
              <span className={labelCls}>กะงาน</span>
              <span className={valueCls}>{adj.shiftName || '-'}</span>
            </div>
            <div className={rowCls}>
              <span className={labelCls}>ยื่นคำขอเมื่อ</span>
              <span className="text-slate-800 dark:text-slate-200 text-right">
                {thaiDate(adj.createdAt)} {thaiTime(adj.createdAt)} น.
              </span>
            </div>
          </div>
          <Reason text={adj.reason} label="เหตุผลในการขอปรับ" />
        </div>
      </div>

      <div className={cardCls}>
        <div className={titleCls}>
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

export function BenefitReviewInfo({ claim }: { claim: BenefitClaimRequest }) {
  const hasQuota = claim.quotaAmount > 0;
  const remainingBefore = hasQuota ? Math.max(0, claim.quotaAmount - claim.approvedUsedAmount) : null;
  const remainingAfter = remainingBefore !== null ? remainingBefore - claim.amount : null;

  return (
    <div className="space-y-3 text-xs">
      <div className="grid gap-3 lg:grid-cols-2">
        <EmployeeCard name={claim.employeeName} department={claim.departmentName} position={claim.positionName} />
        <div className={cardCls}>
          <div className={titleCls}>
            <Gift className="w-3.5 h-3.5 text-slate-500" /> รายละเอียดการเบิก
          </div>
          <div className="space-y-2">
            <div className={rowCls}>
              <span className={labelCls}>สวัสดิการ</span>
              <span className={valueCls}>{claim.benefitName}</span>
            </div>
            <div className={rowCls}>
              <span className={labelCls}>จำนวนเงินที่ขอเบิก</span>
              <span className="font-bold text-primary dark:text-blue-300 text-right">{money(claim.amount)} บาท</span>
            </div>
            <div className={rowCls}>
              <span className={labelCls}>วันที่ใช้สิทธิ์</span>
              <span className={valueCls}>{thaiDate(claim.claimDate)}</span>
            </div>
            {claim.serviceProvider && (
              <div className={rowCls}>
                <span className={labelCls}>ผู้ให้บริการ / สถานพยาบาล</span>
                <span className={valueCls}>{claim.serviceProvider}</span>
              </div>
            )}
            {claim.receiptNumber && (
              <div className={rowCls}>
                <span className={labelCls}>เลขที่ใบเสร็จ</span>
                <span className={valueCls}>{claim.receiptNumber}</span>
              </div>
            )}
            <div className={rowCls}>
              <span className={labelCls}>ยื่นคำขอเมื่อ</span>
              <span className="text-slate-800 dark:text-slate-200 text-right">{thaiDate(claim.submittedAt)}</span>
            </div>
          </div>
          <Reason text={claim.remarks} label="รายละเอียดเพิ่มเติม" />
        </div>
      </div>

      <div className={cardCls}>
        <div className={titleCls}>
          <Wallet className="w-3.5 h-3.5 text-slate-500" /> วงเงินสวัสดิการ ปี {claim.claimYear + 543}
        </div>
        {hasQuota ? (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="text-right font-medium px-3 py-2">วงเงินทั้งปี</th>
                  <th className="text-right font-medium px-3 py-2">ใช้ไปแล้ว</th>
                  <th className="text-right font-medium px-3 py-2">เบิกครั้งนี้</th>
                  <th className="text-right font-medium px-3 py-2">คงเหลือหลังอนุมัติ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">{money(claim.quotaAmount)}</td>
                  <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">{money(claim.approvedUsedAmount)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-amber-700 dark:text-amber-300">{money(claim.amount)}</td>
                  <td
                    className={`px-3 py-2 text-right font-bold ${
                      remainingAfter !== null && remainingAfter < 0 ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {remainingAfter !== null ? money(remainingAfter) : '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
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

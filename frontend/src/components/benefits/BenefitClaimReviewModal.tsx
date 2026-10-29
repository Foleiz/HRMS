'use client';

import React, { useState } from 'react';
import { BenefitClaimRequest } from '@/types/benefit';
import { benefitService } from '@/services/benefitService';
import { AlertCircle } from 'lucide-react';
import { ApprovalActionModal, ApprovalDetailRow } from '@/components/approvals/ApprovalActionModal';

export type BenefitClaimReviewMode = 'approve' | 'reject' | 'view';

interface BenefitClaimReviewModalProps {
  claim: BenefitClaimRequest | null;
  mode: BenefitClaimReviewMode;
  onClose: () => void;
  /** เรียกหลังอนุมัติ/ไม่อนุมัติสำเร็จ */
  onDone: (message: string) => void;
}

// 'YYYY-MM-DD' → '26 ต.ค. 2569' (parse แบบ local เพื่อไม่ให้วันเลื่อนตาม timezone)
const thaiDate = (d?: string | null) => {
  if (!d) return '-';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  const dt = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
};
const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'รออนุมัติ',
  APPROVED: 'อนุมัติแล้ว',
  REJECTED: 'ไม่อนุมัติ',
  CANCELLED: 'ยกเลิกแล้ว',
};

/** ดูรายละเอียด / อนุมัติ / ไม่อนุมัติ คำขอเบิกสวัสดิการ */
export const BenefitClaimReviewModal: React.FC<BenefitClaimReviewModalProps> = ({ claim, mode, onClose, onDone }) => {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!claim) return null;

  const hasQuota = claim.quotaAmount > 0;
  const remainingBefore = hasQuota ? Math.max(0, claim.quotaAmount - claim.approvedUsedAmount) : null;
  const overQuota = remainingBefore !== null && claim.amount > remainingBefore;

  const handleDownload = async () => {
    try {
      const blob = await benefitService.downloadClaimAttachment(claim.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = claim.fileName || 'receipt';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('ดาวน์โหลดไฟล์แนบไม่สำเร็จ');
    }
  };

  const handleSubmit = async () => {
    if (mode === 'reject' && !comment.trim()) {
      setError('กรุณาระบุเหตุผลที่ไม่อนุมัติ');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'approve') {
        await benefitService.approveClaimRequest(claim.id, comment.trim() || undefined);
        onDone('อนุมัติคำขอเบิกสวัสดิการสำเร็จ');
      } else {
        await benefitService.rejectClaimRequest(claim.id, comment.trim());
        onDone('ไม่อนุมัติคำขอเบิกสวัสดิการแล้ว');
      }
      setComment('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || 'ดำเนินการไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    mode === 'approve'
      ? 'อนุมัติคำขอเบิกสวัสดิการ'
      : mode === 'reject'
        ? 'ไม่อนุมัติคำขอเบิกสวัสดิการ'
        : 'คำขอเบิกสวัสดิการ';

  const detailRows: ApprovalDetailRow[] = [
    { label: 'วันที่ใช้สิทธิ์', value: thaiDate(claim.claimDate) },
    ...(claim.serviceProvider ? [{ label: 'ผู้ให้บริการ / สถานพยาบาล', value: claim.serviceProvider }] : []),
    ...(claim.receiptNumber ? [{ label: 'เลขที่ใบเสร็จ', value: claim.receiptNumber }] : []),
    ...(claim.remarks ? [{ label: 'รายละเอียด', value: claim.remarks }] : []),
    {
      label: 'แผนก / ตำแหน่ง',
      value: `${claim.departmentName || '-'}${claim.positionName ? ` · ${claim.positionName}` : ''}`,
    },
    ...(mode === 'view' ? [{ label: 'สถานะ', value: STATUS_LABEL[claim.status] ?? claim.status }] : []),
    ...(claim.rejectReason ? [{ label: 'เหตุผลที่ไม่อนุมัติ', value: claim.rejectReason }] : []),
  ];

  return (
    <ApprovalActionModal
      isOpen={!!claim}
      onClose={onClose}
      iconType="benefit"
      title={title}
      code={claim.requestNo}
      requesterName={`${claim.employeeName}${claim.employeeCode ? ` (${claim.employeeCode})` : ''}`}
      categoryLabel="จำนวนเงินที่ขอเบิก"
      heroTitle={`${money(claim.amount)} บาท`}
      heroSubtitle={claim.benefitName}
      detailRows={detailRows}
      attachments={claim.fileName ? [{ name: claim.fileName, onOpen: handleDownload }] : undefined}
      comment={comment}
      onCommentChange={setComment}
      commentLabel={mode === 'reject' ? 'เหตุผลที่ไม่อนุมัติ' : 'ความคิดเห็นผู้อนุมัติ (ไม่บังคับ)'}
      commentPlaceholder={mode === 'reject' ? 'ระบุเหตุผลในการไม่อนุมัติคำขอ...' : 'ระบุความเห็นหรือบันทึกเพิ่มเติม (ถ้ามี)'}
      commentRequired={mode === 'reject'}
      onSubmit={mode !== 'view' ? handleSubmit : undefined}
      isSubmitting={submitting}
      submitText={mode === 'reject' ? 'ไม่อนุมัติ' : 'อนุมัติ'}
      cancelText={mode === 'view' ? 'ปิด' : 'ยกเลิก'}
      variant={mode === 'reject' ? 'reject' : mode === 'view' ? 'view' : 'approve'}
      errorMessage={error}
    >
      {/* สรุปวงเงิน 3 ช่อง (วงเงิน / ใช้แล้ว / คงเหลือ) ถ้ามีการกำหนดโควตา */}
      {hasQuota && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            {/* 1. วงเงิน */}
            <div className="p-2.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/60 flex flex-col justify-center">
              <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">วงเงิน</span>
              <span className="text-xs sm:text-sm font-bold font-mono text-sky-700 dark:text-sky-300 mt-0.5 truncate" title={`${money(claim.quotaAmount)} บ./ปี`}>
                {money(claim.quotaAmount)}
              </span>
              <span className="text-[10px] text-sky-600/70 dark:text-sky-400/70">บ./ปี</span>
            </div>

            {/* 2. ใช้แล้ว / อนุมัติไปแล้ว */}
            <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex flex-col justify-center">
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">ใช้ไปแล้ว</span>
              <span className="text-xs sm:text-sm font-bold font-mono text-amber-700 dark:text-amber-300 mt-0.5 truncate" title={`${money(claim.approvedUsedAmount)} บ.`}>
                {money(claim.approvedUsedAmount)}
              </span>
              <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70">บาท</span>
            </div>

            {/* 3. คงเหลือ */}
            <div
              className={`p-2.5 rounded-xl border flex flex-col justify-center ${
                overQuota
                  ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400'
                  : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400'
              }`}
            >
              <span className={`text-[11px] font-semibold ${overQuota ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                คงเหลือ
              </span>
              <span className="text-xs sm:text-sm font-bold font-mono mt-0.5 truncate" title={`${money(remainingBefore ?? 0)} บ.`}>
                {money(remainingBefore ?? 0)}
              </span>
              <span className="text-[10px] opacity-80">บาท</span>
            </div>
          </div>

          {overQuota && (
            <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-lg py-1.5 px-2.5 text-center flex items-center justify-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>ยอดขอเบิกเกินวงเงินคงเหลือ</span>
            </div>
          )}
        </div>
      )}
    </ApprovalActionModal>
  );
};

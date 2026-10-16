'use client';

import React, { useState } from 'react';
import { BenefitClaimRequest } from '@/types/benefit';
import { benefitService } from '@/services/benefitService';
import { X, Gift, Paperclip, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export type BenefitClaimReviewMode = 'approve' | 'reject' | 'view';

interface BenefitClaimReviewModalProps {
  claim: BenefitClaimRequest | null;
  mode: BenefitClaimReviewMode;
  onClose: () => void;
  /** เรียกหลังอนุมัติ/ไม่อนุมัติสำเร็จ */
  onDone: (message: string) => void;
}

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
  const [downloading, setDownloading] = useState(false);

  if (!claim) return null;

  const hasQuota = claim.quotaAmount > 0;
  const remainingBefore = hasQuota ? Math.max(0, claim.quotaAmount - claim.approvedUsedAmount) : null;
  const overQuota = remainingBefore !== null && claim.amount > remainingBefore;

  const handleDownload = async () => {
    setDownloading(true);
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
    } finally {
      setDownloading(false);
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

  const title = mode === 'approve' ? 'อนุมัติคำขอเบิกสวัสดิการ' : mode === 'reject' ? 'ไม่อนุมัติคำขอเบิกสวัสดิการ' : 'คำขอเบิกสวัสดิการ';

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-4 py-1.5 text-xs">
      <span className="text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
      <span className="font-medium text-slate-800 dark:text-slate-200 text-right break-words">{value || '-'}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {claim.requestNo} • {claim.employeeName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3">
          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            <Row label="สวัสดิการ" value={claim.benefitName} />
            <Row label="จำนวนเงินที่ขอเบิก" value={<span className="font-mono font-bold">{money(claim.amount)} บ.</span>} />
            <Row label="วันที่ใช้สิทธิ์" value={claim.claimDate} />
            <Row label="ผู้ให้บริการ / สถานพยาบาล" value={claim.serviceProvider} />
            <Row label="เลขที่ใบเสร็จ" value={claim.receiptNumber} />
            <Row label="รายละเอียด" value={claim.remarks} />
            <Row label="แผนก / ตำแหน่ง" value={`${claim.departmentName} / ${claim.positionName}`} />
            <Row label="สถานะ" value={STATUS_LABEL[claim.status] ?? claim.status} />
            {claim.status === 'PENDING' && claim.currentApproverDisplay && (
              <Row
                label="รอพิจารณาโดย"
                value={`${claim.currentApproverDisplay.replace(/\s*\([A-Za-z0-9_.\s/-]+\)$/, '')}${claim.totalSteps > 0 ? ` (ขั้น ${claim.currentStepNo}/${claim.totalSteps})` : ''}`}
              />
            )}
            {claim.rejectReason && <Row label="เหตุผลที่ไม่อนุมัติ" value={claim.rejectReason} />}
          </div>

          {/* สรุปวงเงิน 3 ช่อง (วงเงิน / ใช้แล้ว / คงเหลือ) */}
          {hasQuota ? (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                {/* 1. วงเงิน */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-center">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">วงเงิน</span>
                  <span className="text-xs sm:text-sm font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5 truncate" title={`${money(claim.quotaAmount)} บ./ปี`}>
                    {money(claim.quotaAmount)}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">บ./ปี</span>
                </div>

                {/* 2. ใช้แล้ว / อนุมัติไปแล้ว */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-center">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">ใช้ไปแล้ว</span>
                  <span className="text-xs sm:text-sm font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5 truncate" title={`${money(claim.approvedUsedAmount)} บ.`}>
                    {money(claim.approvedUsedAmount)}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">บาท</span>
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
          ) : (
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-600 dark:text-slate-300 text-center">
              สวัสดิการนี้ไม่ได้กำหนดวงเงิน (เบิกตามจริง)
            </div>
          )}

          {claim.fileName ? (
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-blue-700 dark:text-blue-300 hover:bg-slate-50 dark:hover:bg-slate-700/40"
            >
              {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
              <span className="truncate">{claim.fileName}</span>
            </button>
          ) : (
            <p className="text-[11px] text-slate-400">ไม่มีไฟล์แนบ</p>
          )}

          {mode !== 'view' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {mode === 'reject' ? (
                  <>
                    เหตุผลที่ไม่อนุมัติ <span className="text-rose-500">*</span>
                  </>
                ) : (
                  'ความเห็น (ไม่บังคับ)'
                )}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046] resize-none"
              />
            </div>
          )}

          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700/60 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            {mode === 'view' ? 'ปิด' : 'ยกเลิก'}
          </button>
          {mode !== 'view' && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className={`px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 disabled:opacity-50 ${mode === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : mode === 'approve' ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              {mode === 'approve' ? 'อนุมัติ' : 'ไม่อนุมัติ'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

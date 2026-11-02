'use client';

import React, { useEffect, useState } from 'react';
import { Check, X, FileText, Info, Loader2, Paperclip, ExternalLink, ClipboardList } from 'lucide-react';
import { ModalShell } from '@/components/ui/ModalShell';
import { employeeService } from '@/services/employeeService';
import { getAvatarUrl } from '@/lib/api-client';

export type ReviewDecision = 'approve' | 'reject';

export interface ApprovalReviewAttachment {
  name: string;
  onOpen?: () => void;
}

export interface ApprovalReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** เช่น "ตรวจสอบคำขอลา" */
  title: string;
  /** ป้ายประเภท เช่น "ลาพักร้อน" */
  typeLabel?: string;
  code: string;
  employeeId?: number | null;
  employeeName: string;
  /** บรรทัดรอง เช่น ตำแหน่ง · แผนก · ยื่นเมื่อ */
  meta?: string;
  /** ข้อมูลประกอบการพิจารณา (ฝั่งซ้าย) */
  children: React.ReactNode;
  decision: ReviewDecision;
  onDecisionChange: (d: ReviewDecision) => void;
  comment: string;
  onCommentChange: (v: string) => void;
  onViewDocument?: () => void;
  documentLabel?: string;
  attachments?: ApprovalReviewAttachment[];
  /** ข้อความอธิบายสิ่งที่เกิดขึ้นเมื่อยืนยันอนุมัติ */
  approveNote?: string;
  /** ปิดช่องความเห็นตอนอนุมัติ (API ไม่รับความเห็น) */
  approveCommentDisabled?: boolean;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

/** รูปโปรไฟล์ผู้ยื่น (โหลดครั้งเดียวต่อพนักงาน) */
const avatarCache = new Map<number, Promise<string | null>>();
const loadAvatar = (id: number) => {
  let p = avatarCache.get(id);
  if (!p) {
    p = employeeService
      .getById(id)
      .then((e) => (e?.avatarUrl ? getAvatarUrl(e.avatarUrl) : null))
      .catch(() => {
        avatarCache.delete(id);
        return null;
      });
    avatarCache.set(id, p);
  }
  return p;
};

/**
 * หน้าตรวจสอบคำขอแบบ 2 ฝั่ง — ซ้าย: ข้อมูลประกอบการพิจารณา / ขวา: บันทึกผล (อนุมัติ หรือ ปฏิเสธ)
 * ใช้ร่วมกันทุกประเภทเอกสาร ส่วนข้อมูลฝั่งซ้ายส่งเข้ามาเป็น children
 */
export function ApprovalReviewModal({
  isOpen,
  onClose,
  title,
  typeLabel,
  code,
  employeeId,
  employeeName,
  meta,
  children,
  decision,
  onDecisionChange,
  comment,
  onCommentChange,
  onViewDocument,
  documentLabel = 'ดูเอกสาร',
  attachments,
  approveNote = 'เมื่อยืนยัน ระบบบันทึกผลพร้อมลายเซ็นของคุณลงในเอกสาร และส่งต่อขั้นถัดไปให้อัตโนมัติ',
  approveCommentDisabled = false,
  onSubmit,
  isSubmitting = false,
}: ApprovalReviewModalProps) {
  const [avatar, setAvatar] = useState<{ id: number; src: string | null } | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    if (!isOpen || !employeeId) return;
    let alive = true;
    loadAvatar(employeeId).then((src) => alive && setAvatar({ id: employeeId, src }));
    return () => {
      alive = false;
    };
  }, [isOpen, employeeId]);

  if (!isOpen) return null;

  const isReject = decision === 'reject';
  const avatarSrc = !avatarFailed && avatar?.id === employeeId ? avatar?.src : null;
  const initial = employeeName.replace(/^(นาย|นางสาว|นาง|Mr\.?|Mrs\.?|Ms\.?)\s*/i, '').trim().charAt(0) || '?';
  const canSubmit = !isSubmitting && (!isReject || comment.trim().length > 0);
  const showComment = isReject || !approveCommentDisabled;

  const choiceCls = (on: boolean, tone: 'approve' | 'reject') =>
    `h-12 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
      on
        ? tone === 'approve'
          ? 'border-2 border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500'
          : 'border-2 border-rose-600 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-500'
        : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
    }`;

  return (
    <ModalShell
      className="z-50 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      innerClassName="items-center justify-center p-2 sm:p-4"
      portal={false}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${title} ${code}`}
        className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-6xl h-[92vh] shadow-2xl border border-slate-200/90 dark:border-slate-700 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── หัว: ผู้ยื่น + เลขที่เอกสาร ─── */}
        <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt=""
                onError={() => setAvatarFailed(true)}
                className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
              />
            ) : (
              <span
                aria-hidden="true"
                className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-700 text-primary dark:text-slate-100 text-base font-bold inline-flex items-center justify-center uppercase shrink-0"
              >
                {initial}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h2 className="text-base sm:text-lg font-bold text-primary dark:text-slate-100 leading-snug">
                  {title}
                </h2>
                {typeLabel && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-semibold">
                    {typeLabel}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {code}
                {meta ? ` · ${meta}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="w-10 h-10 rounded-xl border border-slate-300 dark:border-slate-600 text-primary dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 inline-flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_380px] overflow-y-auto md:overflow-hidden">
          {/* ─── ซ้าย: ข้อมูลประกอบการพิจารณา ─── */}
          <section
            aria-label="ข้อมูลประกอบการพิจารณา"
            className="md:min-h-0 md:overflow-y-auto bg-slate-50/70 dark:bg-slate-900/40 md:border-r border-slate-200 dark:border-slate-700 px-5 sm:px-6 py-5 space-y-4"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-primary dark:text-blue-300 flex items-center justify-center shrink-0">
                <ClipboardList className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">ข้อมูลประกอบการพิจารณา</h3>
            </div>
            {children}
          </section>

          {/* ─── ขวา: บันทึกผลการตรวจสอบ ─── */}
          <aside aria-label="บันทึกผลการตรวจสอบ" className="md:min-h-0 flex flex-col bg-white dark:bg-slate-800">
            <div className="flex-1 md:min-h-0 md:overflow-y-auto px-5 py-5 space-y-4">
              <h3 className="text-base font-bold text-primary dark:text-slate-100">บันทึกผลการตรวจสอบ</h3>

              <div role="radiogroup" aria-label="ผลการพิจารณา" className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  role="radio"
                  aria-checked={!isReject}
                  onClick={() => onDecisionChange('approve')}
                  className={choiceCls(!isReject, 'approve')}
                >
                  <Check className="w-4.5 h-4.5" strokeWidth={2.5} />
                  อนุมัติ
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isReject}
                  onClick={() => onDecisionChange('reject')}
                  className={choiceCls(isReject, 'reject')}
                >
                  <X className="w-4.5 h-4.5" strokeWidth={2.5} />
                  ปฏิเสธ
                </button>
              </div>

              {showComment && (
                <label className="block space-y-1.5">
                  <span
                    className={`block text-xs font-semibold ${
                      isReject ? 'text-rose-700 dark:text-rose-300' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {isReject ? 'เหตุผลที่ปฏิเสธ' : 'ความเห็นผู้ตรวจสอบ (ไม่บังคับ)'}
                    {isReject && <span className="text-rose-500 ml-1">*</span>}
                  </span>
                  <textarea
                    value={comment}
                    onChange={(e) => onCommentChange(e.target.value)}
                    rows={4}
                    placeholder={
                      isReject ? 'อธิบายเหตุผลให้ผู้ยื่นเข้าใจ และแก้ไขหรือยื่นใหม่ได้' : 'ระบุความเห็นหรือข้อสังเกต (ถ้ามี)'
                    }
                    className={`w-full text-xs p-3 bg-white dark:bg-slate-900 border rounded-xl outline-none resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 ${
                      isReject
                        ? 'border-rose-300 dark:border-rose-800 focus:ring-rose-500/20 focus:border-rose-500'
                        : 'border-slate-300 dark:border-slate-600 focus:ring-primary/15 focus:border-primary'
                    }`}
                  />
                </label>
              )}

              {attachments && attachments.length > 0 && (
                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">ไฟล์แนบ</span>
                  {attachments.map((att, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={att.onOpen}
                      disabled={!att.onOpen}
                      className="w-full flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer disabled:cursor-default"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate font-medium text-slate-700 dark:text-slate-200">{att.name}</span>
                      </span>
                      {att.onOpen && <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2 rounded-xl bg-slate-50 dark:bg-slate-900/40 p-3 text-xs text-slate-600 dark:text-slate-400">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                <span>
                  {isReject
                    ? 'เมื่อยืนยัน ระบบแจ้งผลพร้อมเหตุผลให้ผู้ยื่นทราบ และปิดคำขอนี้'
                    : approveNote}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 px-5 py-4 space-y-2.5 shrink-0">
              <button
                type="button"
                onClick={onSubmit}
                disabled={!canSubmit}
                className={`w-full h-12 rounded-xl text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isReject ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary hover:bg-primary-hover dark:bg-blue-600 dark:hover:bg-blue-500'
                }`}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isReject ? 'ยืนยันปฏิเสธคำขอ' : 'ยืนยันอนุมัติคำขอ'}
              </button>
              <div className={`grid gap-2.5 ${onViewDocument ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {onViewDocument && (
                  <button
                    type="button"
                    onClick={onViewDocument}
                    className="h-12 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-primary dark:text-slate-100 text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer"
                  >
                    <FileText className="w-4.5 h-4.5" />
                    {documentLabel}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="h-12 rounded-xl border border-primary dark:border-slate-500 text-primary dark:text-slate-100 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer disabled:opacity-50"
                >
                  ปิด
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </ModalShell>
  );
}

export default ApprovalReviewModal;

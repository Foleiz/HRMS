'use client';

import React from 'react';
import {
  Calendar,
  FileText,
  Gift,
  Clock,
  LogOut,
  X,
  Paperclip,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { ModalShell } from '@/components/ui/ModalShell';

export interface ApprovalDetailRow {
  label: string;
  value: React.ReactNode;
}

export interface ApprovalAttachment {
  name: string;
  onOpen?: () => void;
}

export interface ApprovalActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  icon?: React.ReactNode;
  iconType?: 'leave' | 'certificate' | 'benefit' | 'resignation' | 'general' | 'time_adjust';
  title: string;
  code: string;
  requesterName: string;
  categoryLabel: string;
  heroTitle: React.ReactNode;
  heroSubtitle?: React.ReactNode;
  detailRows: ApprovalDetailRow[];
  attachments?: ApprovalAttachment[];
  comment?: string;
  onCommentChange?: (val: string) => void;
  commentLabel?: string;
  commentPlaceholder?: string;
  commentRequired?: boolean;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  submitText?: string;
  cancelText?: string;
  variant?: 'approve' | 'reject' | 'view';
  quickRejectSlot?: React.ReactNode;
  errorMessage?: string | null;
  children?: React.ReactNode;
}

export const toDateOnly = (d?: string | null): Date | null => {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
};

export const formatThaiDate = (d?: string | null) => {
  const dt = toDateOnly(d);
  if (!dt) return '-';
  return dt.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatThaiDateRange = (startDateStr?: string | null, endDateStr?: string | null) => {
  const start = toDateOnly(startDateStr);
  const end = toDateOnly(endDateStr);
  if (!start) return '-';
  if (!end || start.getTime() === end.getTime()) {
    return formatThaiDate(startDateStr);
  }

  const thMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const sDay = start.getDate();
  const eDay = end.getDate();
  const sMonth = start.getMonth();
  const eMonth = end.getMonth();
  const sYear = start.getFullYear() + 543;
  const eYear = end.getFullYear() + 543;

  if (sYear === eYear && sMonth === eMonth) {
    return `${sDay} – ${eDay} ${thMonths[sMonth]} ${sYear}`;
  }
  if (sYear === eYear) {
    return `${sDay} ${thMonths[sMonth]} – ${eDay} ${thMonths[eMonth]} ${sYear}`;
  }
  return `${sDay} ${thMonths[sMonth]} ${sYear} – ${eDay} ${thMonths[eMonth]} ${eYear}`;
};

export const getNoticeDaysText = (startDateStr?: string | null, submittedDateStr?: string | null) => {
  const start = toDateOnly(startDateStr);
  const submitted = toDateOnly(submittedDateStr);
  if (!start || !submitted) return '';
  const diff = Math.round((start.getTime() - submitted.getTime()) / 86_400_000);
  if (diff > 0) return ` · ล่วงหน้า ${diff} วัน`;
  if (diff < 0) return ` · ย้อนหลัง ${Math.abs(diff)} วัน`;
  return ` · วันเดียวกับวันลา`;
};

const getDefaultIcon = (iconType?: ApprovalActionModalProps['iconType']) => {
  switch (iconType) {
    case 'leave':
      return <Calendar className="w-4.5 h-4.5" />;
    case 'certificate':
      return <FileText className="w-4.5 h-4.5" />;
    case 'benefit':
      return <Gift className="w-4.5 h-4.5" />;
    case 'resignation':
      return <LogOut className="w-4.5 h-4.5" />;
    case 'time_adjust':
      return <Clock className="w-4.5 h-4.5" />;
    case 'general':
    default:
      return <FileText className="w-4.5 h-4.5" />;
  }
};

export const ApprovalActionModal: React.FC<ApprovalActionModalProps> = ({
  isOpen,
  onClose,
  icon,
  iconType = 'leave',
  title,
  code,
  requesterName,
  categoryLabel,
  heroTitle,
  heroSubtitle,
  detailRows,
  attachments,
  comment,
  onCommentChange,
  commentLabel,
  commentPlaceholder,
  commentRequired = false,
  onSubmit,
  isSubmitting = false,
  submitText,
  cancelText = 'ยกเลิก',
  variant = 'approve',
  quickRejectSlot,
  errorMessage,
  children,
}) => {
  if (!isOpen) return null;

  const isReject = variant === 'reject';
  const isView = variant === 'view';
  const defaultSubmitText = isReject ? 'ปฏิเสธ' : 'อนุมัติ';
  const finalSubmitText = submitText ?? defaultSubmitText;

  const defaultCommentLabel = isReject
    ? 'เหตุผลในการปฏิเสธ'
    : 'ความคิดเห็นผู้อนุมัติ (ไม่บังคับ)';
  const finalCommentLabel = commentLabel ?? defaultCommentLabel;

  const defaultCommentPlaceholder = isReject
    ? 'ระบุเหตุผลในการปฏิเสธคำขอ...'
    : 'ระบุความเห็นหรือบันทึกเพิ่มเติม (ถ้ามี)';
  const finalCommentPlaceholder = commentPlaceholder ?? defaultCommentPlaceholder;

  const renderIcon = icon ?? getDefaultIcon(iconType);

  return (
    <ModalShell
      className="z-50 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      innerClassName="items-center justify-center p-4"
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200/90 dark:border-slate-700 space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Modal Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isReject
                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200'
              }`}
            >
              {renderIcon}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                {title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {code} · {requesterName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
            aria-label="ปิด"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Main Content Card */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-700 p-4 space-y-3 bg-white dark:bg-slate-800/50">
          <div>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">
              {categoryLabel}
            </span>
            <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 tracking-tight">
              {heroTitle}
            </h4>
            {heroSubtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {heroSubtitle}
              </p>
            )}
          </div>

          {detailRows.length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-700/60 pt-2.5 space-y-2">
              {detailRows.map((row, idx) => (
                <div key={idx} className="flex items-start justify-between gap-4 text-xs py-0.5">
                  <span className="text-slate-500 dark:text-slate-400 shrink-0 font-normal">
                    {row.label}
                  </span>
                  <span className="text-slate-800 dark:text-slate-200 text-right font-medium break-words">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Custom children (e.g. Quota badge, etc.) */}
        {children}

        {/* 3. Attachments Section (if any) */}
        {attachments && attachments.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              ไฟล์แนบ
            </span>
            <div className="space-y-1.5">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-700 dark:text-slate-200 truncate font-medium">
                      {att.name}
                    </span>
                  </div>
                  {att.onOpen && (
                    <button
                      type="button"
                      onClick={att.onOpen}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-primary hover:underline px-2 py-0.5 rounded transition-colors cursor-pointer shrink-0 group"
                      title="เปิดดูในแท็บใหม่"
                    >
                      <span>เปิดดู</span>
                      <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-primary transition-colors" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 4. Quick reject chips (if reject mode) */}
        {quickRejectSlot}

        {/* 5. Comment / Reason textarea (if not view mode) */}
        {!isView && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {finalCommentLabel}
              {commentRequired && <span className="text-rose-500 ml-1">*</span>}
            </label>
            <textarea
              value={comment ?? ''}
              onChange={(e) => onCommentChange?.(e.target.value)}
              placeholder={finalCommentPlaceholder}
              rows={3}
              className={`w-full text-xs p-3 bg-white dark:bg-slate-900 border rounded-xl outline-none resize-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                isReject
                  ? 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
                  : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-600/20 focus:border-[#007052]'
              }`}
            />
          </div>
        )}

        {/* 6. Action Footer Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {isView ? 'ปิด' : cancelText}
          </button>
          {!isView && onSubmit && (
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting || (commentRequired && !(comment ?? '').trim())}
              className={`px-5 py-2.5 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50 ${
                isReject
                  ? 'bg-rose-600 hover:bg-rose-700 active:scale-98'
                  : 'bg-[#007052] hover:bg-[#005a42] active:scale-98'
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isReject ? (
                <XCircle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{finalSubmitText}</span>
            </button>
          )}
        </div>
      </div>
    </ModalShell>
  );
};

'use client';

import React from 'react';
import { Download, FileText } from 'lucide-react';
import { ModalShell } from '@/components/ui';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { reviewCardCls, reviewTitleCls } from '@/components/approvals/ReviewInfoPanels';
import type { EmployeeTransfer } from '@/types/transfer';
import { TransferTypeBadges, parseTransferTypes } from './TransferTypeBadges';

interface TransferDetailModalProps {
  transfer: EmployeeTransfer | null;
  onClose: () => void;
  onDownload: (t: EmployeeTransfer) => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-slate-500 dark:text-slate-400 shrink-0">{label}</dt>
      <dd className="m-0 font-semibold text-slate-800 dark:text-slate-200 text-right min-w-0 break-words">{children}</dd>
    </div>
  );
}

export default function TransferDetailModal({ transfer, onClose, onDownload }: TransferDetailModalProps) {
  if (!transfer) return null;
  const t = transfer;
  const types = parseTransferTypes(t.transferType, t.transferTypes);

  const side = (title: string, div?: string, dept?: string, pos?: string, highlight = false) => (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className={`text-xs font-bold ${highlight ? 'text-primary dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}>{title}</div>
      <div
        className={`flex-1 p-4 rounded-xl bg-white dark:bg-slate-800 text-sm ${
          highlight ? 'border-[1.5px] border-primary/70 dark:border-blue-400/60' : 'border border-slate-200 dark:border-slate-700'
        }`}
      >
        <dl className="m-0 divide-y divide-slate-100 dark:divide-slate-700/60">
          <Row label="ฝ่าย">{div || '-'}</Row>
          <Row label="แผนก">{dept || '-'}</Row>
          <Row label="ตำแหน่ง">{pos || '-'}</Row>
        </dl>
      </div>
    </div>
  );

  return (
    <ModalShell className="z-50 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200" innerClassName="items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-700 w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        <ModalHeader title="รายละเอียดคำสั่งโยกย้าย" onClose={onClose} />

        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 space-y-4 bg-slate-50/70 dark:bg-slate-900/40">
          <div className={`${reviewCardCls} text-sm`}>
            <dl className="m-0 divide-y divide-slate-100 dark:divide-slate-700/60">
              <Row label="ชื่อ-นามสกุล">
                {t.employeeName} <span className="font-medium text-slate-500 dark:text-slate-400">({t.employeeCode})</span>
              </Row>
              <Row label="ประเภทการปรับเปลี่ยน">
                <div className="flex justify-end">
                  <TransferTypeBadges types={types} />
                </div>
              </Row>
              <Row label="วันที่มีผล">
                <span className="text-primary dark:text-blue-300">{t.effectiveDateDisplay}</span>
              </Row>
            </dl>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 items-stretch">
            {side('ก่อน', t.fromDivisionName, t.fromDepartmentName, t.fromPositionName)}
            <div className="flex items-center justify-center md:pt-6 text-sm font-semibold text-primary dark:text-blue-300">
              ไปยัง
            </div>
            {side('หลัง', t.toDivisionName, t.toDepartmentName, t.toPositionName, true)}
          </div>

          {t.reason && (
            <div className={`${reviewCardCls} text-sm`}>
              <div className={reviewTitleCls}>เหตุผล / หมายเหตุ</div>
              <p className="m-0 text-slate-700 dark:text-slate-300 whitespace-pre-line break-words">{t.reason}</p>
            </div>
          )}

          <div className={`${reviewCardCls} text-sm`}>
            <div className={reviewTitleCls}>ไฟล์คำสั่งแต่งตั้ง/โยกย้าย</div>
            {t.hasDocument ? (
              <div className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </span>
                <span className="flex-1 min-w-0 font-semibold text-slate-800 dark:text-slate-200 truncate">{t.documentName || 'เอกสารคำสั่ง'}</span>
                <button
                  type="button"
                  onClick={() => onDownload(t)}
                  className="h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-semibold text-primary dark:text-slate-200 inline-flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> ดาวน์โหลด
                </button>
              </div>
            ) : (
              <p className="m-0 text-xs text-slate-400">ไม่มีไฟล์แนบ</p>
            )}
          </div>
        </div>

        <div className="flex justify-end px-5 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, FileText, Download, Paperclip } from 'lucide-react';
import { leaveService } from '@/services/leaveService';
import { employeeService } from '@/services/employeeService';
import {
  sarabun,
  Fill,
  ApprovalSignatureTable,
  DocumentLogoHeader,
  DocumentAddressFooter,
  SignatureLine,
  useCompanyDocumentInfo,
  useEmployeeSignature,
  useApprovalSlots,
  type ApprovalSlot,
  toThaiShortDate,
  extractPrefixAndName,
} from './documentFormParts';
import type { ApprovalTimeline } from '@/types/leave';

/** หมวดการลาตามช่องติ๊กในแบบฟอร์ม */
export type LeaveCategory = 'SICK' | 'PERSONAL' | 'VACATION' | 'SPECIAL';

const LEAVE_CATEGORIES: Array<{ key: LeaveCategory; label: string }> = [
  { key: 'SICK', label: 'ป่วย' },
  { key: 'PERSONAL', label: 'กิจส่วนตัว' },
  { key: 'VACATION', label: 'ลาพักร้อน' },
  { key: 'SPECIAL', label: 'ลาพิเศษ' },
];

/** จับคู่ประเภทการลาในระบบ → ช่องติ๊กในแบบฟอร์ม (ประเภทอื่น ๆ นับเป็น "ลาพิเศษ") */
export const toLeaveCategory = (code?: string | null, name?: string | null): LeaveCategory | null => {
  const c = (code || '').toUpperCase();
  const n = name || '';
  if (!c && !n) return null;
  if (c.includes('SICK') || n.includes('ป่วย')) return 'SICK';
  if (c.includes('PERSONAL') || c.includes('BUSINESS') || n.includes('กิจ')) return 'PERSONAL';
  if (c.includes('ANNUAL') || c.includes('VACATION') || n.includes('พักร้อน') || n.includes('พักผ่อน')) return 'VACATION';
  return 'SPECIAL';
};

export interface LeavePreviewData {
  employeeId?: number | null;
  employeeName: string;
  employeePrefix?: string | null;
  positionTitle?: string | null;
  leaveTypeCode?: string | null;
  leaveTypeName?: string | null;
  /** หมวดแบบฟอร์มที่ตั้งไว้ในประเภทการลา (ถ้ามี ใช้แทนการเดาจากรหัส/ชื่อ) */
  leaveFormCategory?: string | null;
  reason?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  leaveDays?: number | null;
  isHalfDay?: boolean;
  contactDuringLeave?: string | null;
  /** วันที่เขียนใบลา (ค่าเริ่มต้น = วันนี้) */
  submissionDate?: string | null;
  /** การลาครั้งสุดท้ายที่ได้รับอนุมัติ */
  lastLeave?: {
    leaveTypeCode?: string | null;
    leaveTypeName?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    leaveDays?: number | null;
  } | null;
  addressedTo?: string;
  timeline?: ApprovalTimeline | null;
  canApproveCurrentStep?: boolean;
  requestId?: number | null;
  departmentName?: string | null;
  documents?: {
    id: number;
    leaveRequestId: number;
    fileName?: string | null;
    uploadedAt?: string;
  }[];
}

export interface LeavePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: LeavePreviewData | null;
}

const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const parseDate = (value?: string | null): Date | null => {
  if (!value) return null;
  // "YYYY-MM-DD" → ตีความเป็นวันที่ท้องถิ่น (ไม่ให้เลื่อนวันจาก timezone)
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const formatDays = (days?: number | null, isHalfDay?: boolean) => {
  if (!days || days <= 0) return '';
  if (isHalfDay || days === 0.5) return '½ (ครึ่งวัน)';
  return Number.isInteger(days) ? String(days) : days.toFixed(1);
};

/** ช่องติ๊ก ( ) หน้าหมวดการลา */
const CheckItem: React.FC<{ checked: boolean; label: string }> = ({ checked, label }) => (
  <span style={{ whiteSpace: 'nowrap', marginRight: '1.8mm' }}>
    (
    <span style={{ position: 'relative', display: 'inline-block', width: '4.5mm', height: '1em', verticalAlign: 'baseline' }}>
      {checked && (
        <svg
          viewBox="0 0 16 16"
          aria-label="เลือก"
          style={{ position: 'absolute', left: '0.5mm', bottom: '-0.4mm', width: '3.6mm', height: '3.6mm' }}
        >
          <path d="M2 8.5 L6.2 12.5 L14 3.5" fill="none" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
    )&nbsp;{label}
  </span>
);

const CategoryChecks: React.FC<{ selected: LeaveCategory | null }> = ({ selected }) => (
  <>
    {LEAVE_CATEGORIES.map((c) => (
      <CheckItem key={c.key} checked={selected === c.key} label={c.label} />
    ))}
  </>
);

/** หนึ่งบรรทัดของแบบฟอร์ม (ไม่ตัดบรรทัด ช่องกรอกที่เหลือยืดเต็มบรรทัด) */
const Row: React.FC<{ indent?: boolean; children: React.ReactNode }> = ({ indent, children }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', whiteSpace: 'nowrap', paddingLeft: indent ? '12.5mm' : 0, marginTop: '0.6mm' }}>
    {children}
  </div>
);

/** ช่องกรอกเส้นประที่ยืดเต็มพื้นที่ที่เหลือของบรรทัด */
const GrowFill: React.FC<{ value?: React.ReactNode; align?: 'center' | 'left'; minWidth?: string }> = ({
  value,
  align = 'center',
  minWidth = '10mm',
}) => (
  <span
    style={{
      flex: 1,
      minWidth,
      borderBottom: '1px dotted #000',
      lineHeight: 1.15,
      textAlign: align,
      padding: '0 1.5mm',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}
  >
    {value || '\u00A0'}
  </span>
);

/** แบ่งข้อความยาวเป็นหลายบรรทัดตามจำนวนตัวอักษรโดยประมาณ (ตัดที่ช่องว่างถ้าทำได้) */
const splitText = (text: string | null | undefined, limits: number[]): string[] => {
  let rest = (text || '').trim();
  return limits.map((limit, i) => {
    if (!rest) return '';
    if (i === limits.length - 1 || rest.length <= limit) {
      const out = rest;
      rest = '';
      return out;
    }
    let cut = rest.lastIndexOf(' ', limit);
    if (cut < limit * 0.5) cut = limit;
    const out = rest.slice(0, cut).trim();
    rest = rest.slice(cut).trim();
    return out;
  });
};

interface LeavePaperProps {
  data: LeavePreviewData;
  companyLogo: string | null;
  companyAddress: string;
  signatureSrc: string | null;
  onSignatureError: () => void;
  approvalSlots: ApprovalSlot[];
  employeePrefix?: string | null;
}

const LeavePaper: React.FC<LeavePaperProps> = ({
  data,
  companyLogo,
  companyAddress,
  signatureSrc,
  onSignatureError,
  approvalSlots,
  employeePrefix,
}) => {
  const submission = parseDate(data.submissionDate) || new Date();
  const category =
    (LEAVE_CATEGORIES.some((c) => c.key === data.leaveFormCategory) ? (data.leaveFormCategory as LeaveCategory) : null) ??
    toLeaveCategory(data.leaveTypeCode, data.leaveTypeName);
  const last = data.lastLeave;
  const lastCategory = last ? toLeaveCategory(last.leaveTypeCode, last.leaveTypeName) : null;
  const subject = data.leaveTypeName ? `ขอ${data.leaveTypeName.startsWith('ลา') ? '' : 'ลา'}${data.leaveTypeName}` : 'ขอลา';
  // ข้อความยาวต่อบรรทัดถัดไปตามต้นฉบับ
  const reasonLines = splitText(data.reason, [40, 34]);
  const contactLines = splitText(data.contactDuringLeave, [16, 95, 95]);
  const dd = String(submission.getDate()).padStart(2, '0');
  const mm = String(submission.getMonth() + 1).padStart(2, '0');
  const yyyy = String(submission.getFullYear() + 543);

  // คำนวณชื่อผู้ยื่น:
  // 1) ช่องลายเซ็น (บนเส้นประ): ถ้าไม่มีลายเซ็นให้แสดง "ชื่อ-นามสกุล"
  // 2) บรรทัดข้างล่าง (ในวงเล็บ): แสดง "คำนำหน้า + ชื่อ-นามสกุล" เสมอ
  const { prefix: detectedPrefix, displayName: pureName } = extractPrefixAndName(data.employeeName, employeePrefix || data.employeePrefix);
  const finalPrefix = employeePrefix || data.employeePrefix || detectedPrefix || '';
  const fullNameWithPrefix = finalPrefix && pureName
    ? `${finalPrefix} ${pureName}`
    : (finalPrefix ? `${finalPrefix} ${data.employeeName}` : data.employeeName);
  const signatureFallbackName = pureName || data.employeeName || '';

  return (
    <div
      className={`leave-paper ${sarabun.className}`}
      style={{
        position: 'relative',
        width: '210mm',
        height: '297mm',
        overflow: 'hidden',
        boxSizing: 'border-box',
        padding: '26mm 23mm 20mm 25mm',
        background: '#fff',
        color: '#000',
        fontSize: '10.5pt',
        lineHeight: 1.68,
      }}
    >
      <DocumentLogoHeader companyLogo={companyLogo} />

      {/* ===== ชื่อเอกสาร ===== */}
      <div style={{ textAlign: 'center', fontSize: '16pt', fontWeight: 700, marginBottom: '6mm' }}>
        แบบใบลาป่วย ลาคลอดบุตร ลากิจส่วนตัว
      </div>

      {/* ===== เขียนที่ / วันที่ (ชิดขวา) ===== */}
      <div style={{ marginLeft: '88mm', marginBottom: '5mm', whiteSpace: 'nowrap' }}>
        <div>เขียนที่<Fill value="บริษัท ไซอโคว จำกัด" minWidth="50mm" /></div>
        <div>
          วันที่<Fill value={String(submission.getDate())} minWidth="8mm" />
          เดือน<Fill value={THAI_MONTH_NAMES[submission.getMonth()]} minWidth="20mm" />
          พ.ศ.<Fill value={yyyy} minWidth="12mm" />
        </div>
      </div>

      {/* ===== เรื่อง / เรียน ===== */}
      <div style={{ marginBottom: '4mm' }}>
        <div>เรื่อง<Fill value={subject} minWidth="60mm" align="left" /></div>
        <div>เรียน<Fill value={data.addressedTo || 'กรรมการผู้จัดการ'} minWidth="60mm" align="left" /></div>
      </div>

      {/* ===== เนื้อความ (จัดบรรทัดตามต้นฉบับ) ===== */}
      <Row indent>
        ข้าพเจ้า<GrowFill value={fullNameWithPrefix} />
        ตำแหน่ง<GrowFill value={data.positionTitle || ''} />
      </Row>
      <Row>
        ขอลา&nbsp;<CategoryChecks selected={category} />
        เนื่องจาก<GrowFill value={reasonLines[0]} align="left" />
      </Row>
      <Row>
        <GrowFill value={reasonLines[1]} align="left" />
        ตั้งแต่วันที่<Fill value={toThaiShortDate(data.startDate)} minWidth="24mm" />
        ถึงวันที่<Fill value={toThaiShortDate(data.endDate)} minWidth="24mm" />
        มีกำหนด<Fill value={formatDays(data.leaveDays, data.isHalfDay)} minWidth="14mm" />วัน
      </Row>
      <Row>
        ข้าพเจ้าได้ลา&nbsp;<CategoryChecks selected={lastCategory} />
        ครั้งสุดท้ายตั้งแต่วันที่<GrowFill value={toThaiShortDate(last?.startDate)} minWidth="20mm" />
      </Row>
      <Row>
        ถึงวันที่<Fill value={toThaiShortDate(last?.endDate)} minWidth="26mm" />
        มีกำหนด<Fill value={formatDays(last?.leaveDays)} minWidth="12mm" />วัน ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่
        <GrowFill value={contactLines[0]} align="left" />
      </Row>
      <Row>
        <GrowFill value={contactLines[1]} align="left" />
      </Row>
      <Row>
        <GrowFill value={contactLines[2]} align="left" />
      </Row>

      <p style={{ textIndent: '12.5mm', margin: '3mm 0 0 0' }}>จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ</p>

      {/* ===== ลงนามผู้ลา (ชิดขวา) — รูปแบบเดียวกับใบลาออก ===== */}
      <div style={{ marginLeft: '88mm', width: '74mm', textAlign: 'center', marginTop: '5mm', whiteSpace: 'nowrap' }}>
        <div>ขอแสดงความนับถือ</div>
        <div style={{ marginTop: '9mm' }}>
          (ลงชื่อ)
          <SignatureLine
            src={signatureSrc}
            onError={onSignatureError}
            alt="ลายเซ็นผู้ลา"
            fallbackText={signatureFallbackName}
          />
          ผู้ลา
        </div>
        <div>
          (<Fill value={fullNameWithPrefix} minWidth="50mm" />)
        </div>
        <div>
          วันที่<Fill value={dd} minWidth="12mm" />/
          <Fill value={mm} minWidth="12mm" />/
          <Fill value={yyyy} minWidth="14mm" />
        </div>
      </div>

      {/* ===== ผลการพิจารณา ===== */}
      <div style={{ textAlign: 'center', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: '3px', marginTop: '6mm' }}>
        ผลการพิจารณา
      </div>
      <ApprovalSignatureTable slots={approvalSlots} />

      <DocumentAddressFooter address={companyAddress} />
    </div>
  );
};

/** ตัวอย่างเอกสารใบลา (ป่วย / กิจ / พักร้อน / พิเศษ) พร้อมพิมพ์เต็มหน้า A4 */
export const LeavePreviewModal: React.FC<LeavePreviewModalProps> = ({ isOpen, onClose, data }) => {
  const { companyLogo, companyAddress } = useCompanyDocumentInfo(isOpen);
  const signature = useEmployeeSignature(isOpen, data?.employeeId);
  const [resolvedPrefix, setResolvedPrefix] = useState<string | null>(data?.employeePrefix || null);

  useEffect(() => {
    if (data?.employeePrefix) {
      setResolvedPrefix(data.employeePrefix);
      return;
    }
    if (isOpen && data?.employeeId) {
      employeeService.getById(data.employeeId)
        .then((emp) => {
          if (emp?.prefix) {
            setResolvedPrefix(emp.prefix);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, data?.employeeId, data?.employeePrefix]);

  const approvalSlots = useApprovalSlots({
    isOpen,
    documentType: 'LEAVE_REQUEST',
    employeeId: data?.employeeId,
    timeline: data?.timeline,
    canApproveCurrentStep: data?.canApproveCurrentStep,
  });

  if (!isOpen || !data) return null;

  const paper = (
    <LeavePaper
      data={data}
      companyLogo={companyLogo}
      companyAddress={companyAddress}
      signatureSrc={signature.src}
      onSignatureError={signature.clear}
      approvalSlots={approvalSlots}
      employeePrefix={resolvedPrefix}
    />
  );

  return (
    <>
      <div className="leave-modal no-print fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="relative bg-white rounded-2xl w-full max-w-[900px] max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white dark:bg-slate-800">
            <div className="flex items-center gap-2 text-slate-800">
              <FileText className="w-5 h-5 text-[#0B2046]" />
              <h3 className="text-base font-bold">ตัวอย่างแบบฟอร์มใบลา</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-auto bg-slate-200/70 py-6 px-4">
            <div className="mx-auto w-fit shadow-md border border-gray-300">{paper}</div>
          </div>

          <div className="flex items-center justify-between gap-3 px-6 py-4 bg-white border-t border-gray-100 flex-wrap">
            {data.documents && data.documents.length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5" />
                  เอกสารแนบ:
                </span>
                {data.documents.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={async () => {
                      try {
                        const blob = await leaveService.downloadLeaveDocument(doc.leaveRequestId || data.requestId || 0, doc.id);
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = doc.fileName || 'document';
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch {
                        // ignore
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span className="max-w-[150px] truncate">{doc.fileName || 'ไฟล์แนบ'}</span>
                  </button>
                ))}
              </div>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                พิมพ์เอกสาร
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-[#0B2046] hover:bg-[#0B2046]/90 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* สำเนาสำหรับพิมพ์ใต้ <body> โดยตรง เพื่อให้พิมพ์ได้เต็มหน้า A4 */}
      {typeof document !== 'undefined' && createPortal(<div className="leave-print-root">{paper}</div>, document.body)}

      <style jsx global>{`
        .leave-print-root {
          display: none;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            min-height: 0 !important;
            height: auto !important;
          }

          body > *:not(.leave-print-root) {
            display: none !important;
          }

          .leave-print-root {
            display: block !important;
          }

          .leave-print-root .leave-paper {
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            break-inside: avoid;
            page-break-after: avoid;
          }

          .leave-print-root * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  );
};

export default LeavePreviewModal;


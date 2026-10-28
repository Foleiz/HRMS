'use client';

import { Button } from '@/components/ui';
import { ModalShell } from '@/components/ui/ModalShell';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, FileText, Loader2 } from 'lucide-react';
import { CertificateDocument } from '@/types/certificates';
import { certificateService } from '@/services/certificateService';
import {
  sarabun,
  Fill,
  extractPrefixAndName,
  ApprovalSignatureTable,
  DocumentLogoHeader,
  DocumentAddressFooter,
  SignatureLine,
  useApprovalSlots,
  useCompanyDocumentInfo,
  useEmployeeSignature,
  type ApprovalSlot,
} from './documentFormParts';

interface CertificatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** เปิดเอกสารของคำขอที่ยื่นแล้ว */
  requestId?: number | null;
  /** ตัวอย่างก่อนยื่นคำขอ (ดึงข้อมูลจริงของผู้ใช้ปัจจุบัน) */
  previewParams?: { certificateTypeId: number; purpose: string } | null;
  /** ข้อมูลเอกสารที่เตรียมไว้แล้ว (ไม่ต้องดึงจาก API) */
  initialDoc?: CertificateDocument | null;
  /** ผู้ใช้ถึงคิวอนุมัติ → แสดงลายเซ็นของผู้ใช้ในช่องที่รออนุมัติล่วงหน้า (แบบเดียวกับใบลา) */
  canApproveCurrentStep?: boolean;
}

const fmtMoney = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

/** วันที่ออกหนังสือ → วัน / เดือน / พ.ศ. (เวลาไทย) */
const issueDateParts = (value?: string | null) => {
  const m = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : value ? new Date(value) : new Date();
  const date = isNaN(d.getTime()) ? new Date() : d;
  return {
    day: String(date.getDate()),
    dd: String(date.getDate()).padStart(2, '0'),
    month: THAI_MONTHS[date.getMonth()],
    mm: String(date.getMonth() + 1).padStart(2, '0'),
    year: String(date.getFullYear() + 543),
  };
};

/** ข้อความที่กรอก — เส้นประใต้ข้อความ ตัดบรรทัดตามคำได้ (แบบเดียวกับคำร้องทั่วไป) */
const filledStyle: React.CSSProperties = {
  textDecorationLine: 'underline',
  textDecorationStyle: 'dotted',
  textDecorationThickness: '1px',
  textUnderlineOffset: '4px',
  padding: '0 1.5mm',
};
const V: React.FC<{ children?: React.ReactNode }> = ({ children }) => <span style={filledStyle}>{children || '-'}</span>;

/**
 * หน้ากระดาษ A4 ของหนังสือรับรอง — แบบฟอร์มเดียวกับใบลา / ใบลาออก / คำร้องทั่วไป
 * หัวกระดาษโลโก้ · ชื่อหนังสือ · เลขที่/เขียนที่/วันที่ (ชิดขวา) · ข้าพเจ้า (ผู้รับรอง) · ขอรับรองว่า (พนักงาน)
 * · ขอรับรองว่าข้อความข้างต้นเป็นความจริง · ลงชื่อผู้รับรอง (ชิดขวา) · หมายเหตุ · ที่อยู่บริษัทท้ายกระดาษ
 */
const CertificatePaper: React.FC<{
  doc: CertificateDocument;
  companyLogo: string | null;
  companyAddress: string;
  approvalSlots: ApprovalSlot[];
  /** ลายเซ็นของผู้ยื่นเรื่อง (พนักงานเจ้าของคำขอ) */
  requesterSignatureSrc: string | null;
  onRequesterSignatureError: () => void;
  /** ฉบับพิมพ์ (ซ่อนอยู่ วัดขนาดไม่ได้) ใช้ค่าย่อที่วัดจากฉบับบนจอ */
  fixedZoom?: number;
  onZoom?: (z: number) => void;
}> = ({ doc, companyLogo, companyAddress, approvalSlots, requesterSignatureSrc, onRequesterSignatureError, fixedZoom, onZoom }) => {
  const [sealFailed, setSealFailed] = useState(false);
  // เนื้อหาต้องจบก่อนหมายเหตุท้ายหน้า — ถ้าล้นย่อเนื้อหาลงพอดีหน้า
  const bodyRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  useLayoutEffect(() => {
    if (fixedZoom != null) return;
    const body = bodyRef.current;
    const note = noteRef.current;
    if (!body || !note) return;
    const fit = () => {
      body.style.zoom = '1'; // วัดขนาดจริงก่อนย่อ
      const bodyRect = body.getBoundingClientRect();
      const noteTop = note.getBoundingClientRect().top;
      if (!bodyRect.height) return;
      const mm = bodyRect.width / 162; // ความกว้างเนื้อหา 162 มม. → px ต่อ มม.
      const available = noteTop - bodyRect.top - 3 * mm; // เว้นช่องไฟเหนือหมายเหตุ 3 มม.
      const z = bodyRect.height > available ? Math.max(0.75, Math.floor((available / bodyRect.height) * 1000) / 1000) : 1;
      body.style.zoom = String(z);
      setZoom(z);
      onZoom?.(z);
    };
    fit();
    document.fonts?.ready.then(fit).catch(() => undefined);
    const ro = new ResizeObserver(() => fit());
    ro.observe(body);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, fixedZoom]);
  const appliedZoom = fixedZoom ?? zoom;

  const includeSalary = doc.includeSalary ?? doc.baseSalary != null;
  const salary = doc.baseSalary ?? null;
  const purpose = (doc.purpose || '').trim().replace(/^เพื่อ\s*/, '');
  const position = (doc.positionName || '').replace(/^ตำแหน่ง\s*/, '');
  const date = issueDateParts(doc.issueDate);
  const { prefix, displayName } = extractPrefixAndName(doc.fullName);
  const requesterName = prefix && displayName ? `${prefix} ${displayName}` : doc.fullName;
  // วันที่ในช่องผู้ยื่นเรื่อง = วันที่ยื่นคำขอ (ตัวอย่างก่อนยื่น = วันนี้)
  const requestDate = issueDateParts(doc.requestedAt || null);
  const companyAddr = doc.companyAddress?.trim() || companyAddress;
  const footer = [companyAddr, doc.companyPhone && `Tel. ${doc.companyPhone}`, doc.companyEmail].filter(Boolean).join('  ');
  const stillEmployed = !/พ้นสภาพ|ไม่ได้ปฏิบัติงาน/.test(doc.employmentStatusText || '');

  const para: React.CSSProperties = { textIndent: '12.5mm', textAlign: 'justify', margin: 0 };
  const strike = (p: 'นาย' | 'นาง' | 'นางสาว'): React.CSSProperties | undefined =>
    prefix && prefix !== p ? { textDecoration: 'line-through', textDecorationThickness: '1.5px' } : undefined;

  return (
    <div
      className={`cert-paper theme-light ${sarabun.className}`}
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
      <DocumentLogoHeader companyLogo={doc.companyLogoBase64 || companyLogo} />

      <div ref={bodyRef} style={{ zoom: appliedZoom }}>
        {/* ===== ชื่อหนังสือ ===== */}
        <div style={{ textAlign: 'center', fontSize: '16pt', fontWeight: 700, marginBottom: '6mm' }}>
          {doc.certificateTitle || 'หนังสือรับรองการทำงาน'}
        </div>

        {/* ===== เลขที่ / เขียนที่ / วันที่ (ชิดขวา) ===== */}
        <div style={{ marginLeft: '88mm', marginBottom: '5mm', whiteSpace: 'nowrap' }}>
          <div>เลขที่<Fill value={doc.documentNumber} minWidth="50mm" /></div>
          <div>เขียนที่<Fill value={doc.companyName} minWidth="50mm" /></div>
          <div>
            วันที่<Fill value={date.day} minWidth="8mm" />
            เดือน<Fill value={date.month} minWidth="20mm" />
            พ.ศ.<Fill value={date.year} minWidth="12mm" />
          </div>
        </div>

        {/* ===== ผู้รับรอง ===== */}
        <p style={para}>
          ข้าพเจ้า <V>{doc.signatoryName}</V> ตำแหน่ง <V>{doc.signatoryPosition}</V> ของ<V>{doc.companyName}</V>
          {companyAddr ? <> ตั้งอยู่เลขที่ <V>{companyAddr}</V></> : null}
          {doc.companyPhone ? <> เบอร์โทรศัพท์ <V>{doc.companyPhone}</V></> : null}
        </p>

        {/* ===== พนักงานที่ได้รับการรับรอง ===== */}
        <p style={{ ...para, marginTop: '1mm' }}>
          ขอรับรองว่า <span style={strike('นาย')}>นาย</span> / <span style={strike('นางสาว')}>นางสาว</span> /{' '}
          <span style={strike('นาง')}>นาง</span> <V>{displayName || doc.fullName}</V>
          {doc.citizenIdMasked ? <> เลขประจำตัวประชาชน <V>{doc.citizenIdMasked}</V></> : null} รหัสพนักงาน{' '}
          <V>{doc.employeeCode}</V> ได้ปฏิบัติงานในตำแหน่ง <V>{position}</V> สังกัด <V>{doc.departmentName}</V>
          {doc.employmentTypeName ? <> ประเภทการจ้างงาน <V>{doc.employmentTypeName}</V></> : null} ตั้งแต่วันที่{' '}
          <V>{doc.startDateText}</V> {stillEmployed ? 'จนถึงปัจจุบัน' : 'และปัจจุบันพ้นสภาพการเป็นพนักงานแล้ว'}
          {doc.serviceDurationText ? <> รวมระยะเวลา <V>{doc.serviceDurationText}</V></> : null}
          {includeSalary && salary != null ? (
            <>
              {' '}ปัจจุบันได้รับเงินเดือนเดือนละ <V>{fmtMoney(salary)}</V> บาท
              {doc.positionAllowance ? <> ค่าตำแหน่งเดือนละ <V>{fmtMoney(doc.positionAllowance)}</V> บาท</> : null}
              {' '}รวมรายได้เดือนละ <V>{fmtMoney(doc.totalIncome ?? salary)}</V> บาท (<V>{doc.totalIncomeText || doc.salaryText}</V>)
              {' '}ไม่รวมค่าล่วงเวลาและเงินพิเศษอื่น
            </>
          ) : null}
        </p>

        <p style={{ ...para, marginTop: '1mm' }}>
          หนังสือรับรองฉบับนี้ออกให้เพื่อ <V>{purpose || 'เป็นหลักฐานแสดงการทำงาน'}</V> เท่านั้น
        </p>

        <p style={{ ...para, marginTop: '4mm' }}>ขอรับรองว่าข้อความข้างต้นเป็นความจริงทุกประการ</p>

        {/* ===== ลงนามผู้รับรอง (ชิดขวา) — รูปแบบเดียวกับเอกสารอื่น ===== */}
        <div style={{ position: 'relative', marginLeft: '88mm', width: '74mm', textAlign: 'center', marginTop: '12mm', whiteSpace: 'nowrap' }}>
          {/* ตราประทับบริษัท — รูปจากข้อมูลบริษัท หรือวงกลมเว้นไว้ประทับตราจริงหลังพิมพ์ */}
          {doc.companySealBase64 && !sealFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={doc.companySealBase64}
              alt="ตราประทับบริษัท"
              onError={() => setSealFailed(true)}
              style={{
                position: 'absolute',
                left: '-62mm',
                top: '-4mm',
                width: '36mm',
                height: '36mm',
                objectFit: 'contain',
                mixBlendMode: 'multiply', // พื้นขาวของรูปโปร่งใส เหมือนประทับตราจริง
              }}
            />
          ) : (
            <div
              aria-hidden
              style={{
                position: 'absolute',
                left: '-60mm',
                top: '-2mm',
                width: '32mm',
                height: '32mm',
                borderRadius: '50%',
                border: '1px dashed #9ca3af',
                color: '#9ca3af',
                fontSize: '9.5pt',
                lineHeight: 1.3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              ตราประทับ
              <br />
              บริษัท
            </div>
          )}
          <div>
            (ลงชื่อ)
            <SignatureLine
              src={requesterSignatureSrc}
              onError={onRequesterSignatureError}
              minWidth="44mm"
              alt="ลายเซ็นผู้ยื่นเรื่อง"
              fallbackText={displayName || doc.fullName}
            />
            ผู้ยื่นเรื่อง
          </div>
          <div>
            (<Fill value={requesterName} minWidth="50mm" />)
          </div>
          <div>
            ตำแหน่ง<Fill value={position} minWidth="48mm" />
          </div>
          <div>
            วันที่<Fill value={requestDate.dd} minWidth="12mm" />/
            <Fill value={requestDate.mm} minWidth="12mm" />/
            <Fill value={requestDate.year} minWidth="14mm" />
          </div>
        </div>

        {/* ===== ผลการพิจารณา — ช่องลงนามตามสายอนุมัติ (แบบเดียวกับใบลา/ใบลาออก/คำร้องทั่วไป) ===== */}
        <div style={{ textAlign: 'center', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: '3px', marginTop: '6mm' }}>
          ผลการพิจารณา
        </div>
        <ApprovalSignatureTable slots={approvalSlots} />
      </div>

      {/* ===== หมายเหตุท้ายหนังสือ ===== */}
      <div
        ref={noteRef}
        style={{
          position: 'absolute',
          left: '25mm',
          right: '23mm',
          bottom: '18mm',
          fontSize: '10pt',
          lineHeight: 1.6,
          textAlign: 'justify',
        }}
      >
        <span style={{ fontWeight: 700, marginRight: '6mm' }}>หมายเหตุ</span>
        {doc.validityMonths
          ? `หนังสือรับรองฉบับนี้มีอายุ ${doc.validityMonths} เดือน นับจากวันที่ออก${doc.expiryDateText ? ` (ใช้ได้ถึงวันที่ ${doc.expiryDateText})` : ''}`
          : 'หนังสือรับรองฉบับนี้รับรองข้อมูล ณ วันที่ออกหนังสือ'}{' '}
        ตรวจสอบความถูกต้องโดยอ้างอิงเลขที่หนังสือ ได้ที่ฝ่ายบุคคล
        {doc.companyPhone ? <> โทร. <span style={{ whiteSpace: 'nowrap' }}>{doc.companyPhone}</span></> : null}
        {doc.companyEmail ? <> อีเมล <span style={{ whiteSpace: 'nowrap' }}>{doc.companyEmail}</span></> : null}
      </div>

      <DocumentAddressFooter address={footer} />

      {/* ลายน้ำ "ตัวอย่าง" อยู่ชั้นบนสุด (โปร่งใส ไม่บังข้อความ) เพื่อไม่ให้รูปตราประทับ/ลายเซ็นทับ */}
      {doc.isPreview && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            zIndex: 5,
            transform: 'translate(-50%, -50%) rotate(-30deg)',
            fontSize: '72pt',
            fontWeight: 700,
            color: 'rgba(15, 23, 42, 0.07)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          ตัวอย่าง
        </div>
      )}
    </div>
  );
};

/** ตัวอย่างหนังสือรับรอง (การทำงาน / เงินเดือน) พร้อมพิมพ์เต็มหน้า A4 — รูปแบบเดียวกับใบลาและใบลาออก */
export const CertificatePreviewModal: React.FC<CertificatePreviewModalProps> = ({
  isOpen,
  onClose,
  requestId,
  previewParams,
  initialDoc,
  canApproveCurrentStep,
}) => {
  const { companyLogo, companyAddress } = useCompanyDocumentInfo(isOpen);
  const [doc, setDoc] = useState<CertificateDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [paperZoom, setPaperZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const previewTypeId = previewParams?.certificateTypeId;
  const previewPurpose = previewParams?.purpose ?? '';

  useEffect(() => {
    if (!isOpen) {
      setDoc(null);
      setError(null);
      return;
    }
    let active = true;
    const load = async () => {
      if (requestId) return certificateService.getDocument(requestId, 'TH');
      if (previewTypeId) return certificateService.previewDocument(previewTypeId, previewPurpose, 'TH');
      return initialDoc ?? null;
    };
    setLoading(true);
    setError(null);
    load()
      .then((d) => active && setDoc(d))
      .catch((err) => {
        console.error('Failed to load certificate document:', err);
        if (active) setError(err?.response?.data?.message || 'ไม่สามารถโหลดเอกสารหนังสือรับรองได้');
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [isOpen, requestId, previewTypeId, previewPurpose, initialDoc]);

  // ช่องลงนาม: คำขอที่ยื่นแล้วใช้ขั้นตอนจริงจาก timeline, ตัวอย่างก่อนยื่นจำลองจากสายอนุมัติของพนักงาน
  const approvalSlots = useApprovalSlots({
    isOpen: isOpen && !!doc,
    documentType: 'CERTIFICATE_REQUEST',
    employeeId: doc?.employeeId,
    timeline: doc?.approvalTimeline,
    canApproveCurrentStep,
    isExistingDocument: !!requestId,
  });

  const requesterSignature = useEmployeeSignature(isOpen && !!doc, doc?.employeeId);

  if (!isOpen) return null;

  const paper = doc ? (
    <CertificatePaper
      doc={doc}
      companyLogo={companyLogo}
      companyAddress={companyAddress}
      approvalSlots={approvalSlots}
      requesterSignatureSrc={requesterSignature.src}
      onRequesterSignatureError={requesterSignature.clear}
      onZoom={setPaperZoom}
    />
  ) : null;

  return (
    <>
      <ModalShell className="cert-modal no-print z-50 bg-slate-900/60 backdrop-blur-xs" innerClassName="items-center justify-center p-2 sm:p-4" portal={false}>
        <div className="relative bg-white rounded-2xl w-full max-w-[900px] max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white dark:bg-slate-800">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <FileText className="w-5 h-5 text-primary dark:text-blue-400" />
              <h3 className="text-base font-bold">ตัวอย่างหนังสือรับรอง</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-slate-400 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-auto bg-slate-200/70 py-6 px-4">
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary dark:text-blue-400" />
                <p className="text-xs">กำลังจัดเตรียมหนังสือรับรอง...</p>
              </div>
            ) : error ? (
              <div className="py-16 text-center text-rose-600 text-sm">{error}</div>
            ) : paper ? (
              <div className="mx-auto w-fit shadow-md border border-gray-300">{paper}</div>
            ) : (
              <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm">ไม่มีข้อมูลเอกสาร</div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-white border-t border-gray-100 flex-wrap">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => window.print()}
                icon={<Printer className="w-4 h-4" />}
              >
                พิมพ์เอกสาร
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={onClose}
              >
                ปิดหน้าต่าง
              </Button>
            </div>
          </div>
        </div>
      </ModalShell>

      {/* สำเนาสำหรับพิมพ์ใต้ <body> โดยตรง เพื่อให้พิมพ์ได้เต็มหน้า A4 */}
      {paper && typeof document !== 'undefined' && createPortal(
          <div className="cert-print-root">
            <CertificatePaper
              doc={doc!}
              companyLogo={companyLogo}
              companyAddress={companyAddress}
              approvalSlots={approvalSlots}
              requesterSignatureSrc={requesterSignature.src}
              onRequesterSignatureError={requesterSignature.clear}
              fixedZoom={paperZoom}
            />
          </div>,
          document.body
        )}

      <style jsx global>{`
        .cert-print-root {
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

          body > *:not(.cert-print-root) {
            display: none !important;
          }

          .cert-print-root {
            display: block !important;
          }

          .cert-print-root .cert-paper {
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            break-inside: avoid;
            page-break-after: avoid;
          }

          .cert-print-root * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  );
};

export default CertificatePreviewModal;


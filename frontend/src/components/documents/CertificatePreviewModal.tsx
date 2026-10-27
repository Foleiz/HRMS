'use client';

import { Button } from '@/components/ui';
import { ModalShell } from '@/components/ui/ModalShell';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, FileText, Loader2 } from 'lucide-react';
import { CertificateDocument } from '@/types/certificates';
import { certificateService } from '@/services/certificateService';
import {
  sarabun,
  DocumentLogoHeader,
  DocumentAddressFooter,
  SignatureLine,
  useCompanyDocumentInfo,
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
}

const fmtMoney = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * หน้ากระดาษ A4 ของหนังสือรับรอง (ภาษาไทย) — รูปแบบหนังสือบริษัทที่นิยมใช้
 * หัวกระดาษโลโก้ · ชื่อหนังสือ · ที่/วันที่ · เรื่อง/เรียน · เนื้อความรับรอง · วัตถุประสงค์ · ให้ไว้ ณ วันที่
 * · ผู้มีอำนาจลงนาม (ชิดขวา) · หมายเหตุอายุหนังสือ/ติดต่อตรวจสอบ · ที่อยู่บริษัทท้ายกระดาษ
 */
const CertificatePaper: React.FC<{
  doc: CertificateDocument;
  companyLogo: string | null;
  companyAddress: string;
}> = ({ doc, companyLogo, companyAddress }) => {
  const [signatureFailed, setSignatureFailed] = useState(false);
  const includeSalary = doc.includeSalary ?? doc.baseSalary != null;
  const purpose = (doc.purpose || '').trim().replace(/^เพื่อ\s*/, '');
  const salary = doc.baseSalary ?? null;
  const position = (doc.positionName || '-').replace(/^ตำแหน่ง\s*/, '');
  const department = doc.departmentName || '-';
  const footer = [doc.companyAddress?.trim() || companyAddress, doc.companyPhone && `Tel. ${doc.companyPhone}`, doc.companyEmail]
    .filter(Boolean)
    .join('  ');
  const para: React.CSSProperties = { margin: '0 0 3mm', textIndent: '12.5mm', textAlign: 'justify' };
  const b: React.CSSProperties = { fontWeight: 700 };

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
        fontSize: '12pt',
        lineHeight: 1.7,
      }}
    >
      <DocumentLogoHeader companyLogo={doc.companyLogoBase64 || companyLogo} />

      {doc.isPreview && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-30deg)',
            fontSize: '72pt',
            fontWeight: 700,
            color: 'rgba(15, 23, 42, 0.06)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          ตัวอย่าง
        </div>
      )}

      {/* ===== ชื่อหนังสือ ===== */}
      <div style={{ textAlign: 'center', fontSize: '16pt', fontWeight: 700, marginBottom: '6mm' }}>
        {doc.certificateTitle || 'หนังสือรับรอง'}
      </div>

      {/* ===== ที่ (ซ้าย) / วันที่ (ขวา) ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5mm' }}>
        <div>ที่ {doc.documentNumber}</div>
        <div>วันที่ {doc.issueDateText || doc.issueDate}</div>
      </div>

      {/* ===== เรื่อง / เรียน ===== */}
      <div style={{ marginBottom: '4mm' }}>
        <div style={{ display: 'flex' }}>
          <span style={{ width: '13mm', flexShrink: 0 }}>เรื่อง</span>
          <span>{includeSalary ? 'รับรองการทำงานและเงินเดือน' : 'รับรองการทำงาน'}</span>
        </div>
        <div style={{ display: 'flex' }}>
          <span style={{ width: '13mm', flexShrink: 0 }}>เรียน</span>
          <span>ผู้ที่เกี่ยวข้อง</span>
        </div>
      </div>

      {/* ===== เนื้อความรับรอง ===== */}
      <p style={para}>
        หนังสือฉบับนี้ให้ไว้เพื่อรับรองว่า <span style={b}>{doc.fullName}</span>
        {doc.citizenIdMasked ? (
          <>
            {' '}เลขประจำตัวประชาชน <span style={{ whiteSpace: 'nowrap' }}>{doc.citizenIdMasked}</span>
          </>
        ) : null} รหัสพนักงาน {doc.employeeCode}{' '}
        เป็นพนักงานประจำของ{doc.companyName} โดยเริ่มปฏิบัติงานตั้งแต่วันที่ {doc.startDateText} จนถึงปัจจุบัน
        รวมอายุงาน {doc.serviceDurationText} ปัจจุบันดำรงตำแหน่ง {position} สังกัด{department}
      </p>

      {includeSalary && salary != null && (
        <p style={para}>
          ปัจจุบันได้รับเงินเดือนในอัตราเดือนละ <span style={b}>{fmtMoney(salary)}</span> บาท ({doc.salaryText})
          ทั้งนี้ไม่รวมค่าตอบแทน ค่าล่วงเวลา และสวัสดิการอื่น
        </p>
      )}

      <p style={para}>
        หนังสือรับรองฉบับนี้ออกให้เพื่อ{purpose || 'เป็นหลักฐานแสดงการเป็นพนักงาน'}เท่านั้น
        บริษัทฯ ขอรับรองว่าข้อความข้างต้นเป็นความจริงทุกประการ
      </p>

      <p style={para}>ให้ไว้ ณ วันที่ {doc.issueDateText}</p>

      {/* ===== ผู้มีอำนาจลงนาม (ชิดขวา) ===== */}
      <div style={{ marginLeft: '88mm', width: '74mm', textAlign: 'center', marginTop: '8mm', whiteSpace: 'nowrap' }}>
        <div>ขอแสดงความนับถือ</div>
        <div style={{ marginTop: '12mm' }}>
          <SignatureLine
            src={signatureFailed ? null : doc.signatureBase64 || null}
            onError={() => setSignatureFailed(true)}
            minWidth="60mm"
            alt="ลายเซ็นผู้มีอำนาจลงนาม"
          />
        </div>
        <div>({doc.signatoryName || ' '.repeat(40)})</div>
        <div>{doc.signatoryPosition}</div>
        <div>{doc.companyName}</div>
      </div>

      {/* ===== หมายเหตุท้ายหนังสือ: อายุหนังสือ + ติดต่อตรวจสอบ ===== */}
      <div
        style={{
          position: 'absolute',
          left: '25mm',
          right: '23mm',
          bottom: '20mm',
          fontSize: '10pt',
          lineHeight: 1.5,
          borderTop: '1px dotted #6b7280',
          paddingTop: '2mm',
        }}
      >
        <div>
          <span style={b}>หมายเหตุ</span>{' '}
          {doc.validityMonths
            ? `หนังสือรับรองฉบับนี้มีอายุ ${doc.validityMonths} เดือน นับจากวันที่ออก${doc.expiryDateText ? ` (ใช้ได้ถึงวันที่ ${doc.expiryDateText})` : ''}`
            : 'หนังสือรับรองฉบับนี้รับรองข้อมูล ณ วันที่ออกหนังสือ'}
        </div>
        <div>
          ตรวจสอบความถูกต้องได้ที่ฝ่ายทรัพยากรบุคคล
          {doc.companyPhone ? <> โทร. <span style={{ whiteSpace: 'nowrap' }}>{doc.companyPhone}</span></> : null}
          {doc.companyEmail ? <> อีเมล <span style={{ whiteSpace: 'nowrap' }}>{doc.companyEmail}</span></> : null} (อ้างอิงเลขที่หนังสือ)
        </div>
      </div>

      <DocumentAddressFooter address={footer} />
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
}) => {
  const { companyLogo, companyAddress } = useCompanyDocumentInfo(isOpen);
  const [doc, setDoc] = useState<CertificateDocument | null>(null);
  const [loading, setLoading] = useState(false);
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

  if (!isOpen) return null;

  const paper = doc ? (
    <CertificatePaper doc={doc} companyLogo={companyLogo} companyAddress={companyAddress} />
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
      {paper && typeof document !== 'undefined' && createPortal(<div className="cert-print-root">{paper}</div>, document.body)}

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


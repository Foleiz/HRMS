'use client';

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

type Lang = 'TH' | 'EN';

interface CertificatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** เปิดเอกสารของคำขอที่ยื่นแล้ว */
  requestId?: number | null;
  /** ตัวอย่างก่อนยื่นคำขอ (ดึงข้อมูลจริงของผู้ใช้ปัจจุบัน) */
  previewParams?: { certificateTypeId: number; purpose: string } | null;
  /** ข้อมูลเอกสารที่เตรียมไว้แล้ว (ไม่ต้องดึงจาก API) */
  initialDoc?: CertificateDocument | null;
  initialLang?: Lang;
}

const fmtMoney = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ย่อหน้าแบบหนังสือราชการ/บริษัท: เยื้องบรรทัดแรก จัดชิดสองข้าง */
const Para: React.FC<{ children: React.ReactNode; indent?: boolean; style?: React.CSSProperties }> = ({
  children,
  indent = true,
  style,
}) => (
  <p style={{ margin: '0 0 3.5mm', textIndent: indent ? '25mm' : 0, textAlign: 'justify', ...style }}>{children}</p>
);

/** หน้ากระดาษ A4 ของหนังสือรับรอง (รูปแบบเดียวกับใบลา/ใบลาออก) */
const CertificatePaper: React.FC<{
  doc: CertificateDocument;
  lang: Lang;
  companyLogo: string | null;
  companyAddress: string;
}> = ({ doc, lang, companyLogo, companyAddress }) => {
  const [signatureFailed, setSignatureFailed] = useState(false);
  const isTh = lang === 'TH';
  const includeSalary = doc.includeSalary ?? doc.baseSalary != null;
  const purpose = (doc.purpose || '').trim();
  const salary = doc.baseSalary ?? null;
  const footer = [doc.companyAddress?.trim() || companyAddress, doc.companyPhone && `Tel. ${doc.companyPhone}`, doc.companyEmail]
    .filter(Boolean)
    .join('  ');

  return (
    <div
      className={`cert-paper ${sarabun.className}`}
      style={{
        position: 'relative',
        width: '210mm',
        height: '297mm',
        overflow: 'hidden',
        boxSizing: 'border-box',
        padding: '32mm 25mm 22mm 30mm',
        background: '#fff',
        color: '#000',
        fontSize: '14pt',
        lineHeight: 1.55,
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
          {isTh ? 'ตัวอย่าง' : 'SAMPLE'}
        </div>
      )}

      {/* ===== ที่ / วันที่ ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8mm' }}>
        <div>
          {isTh ? 'ที่' : 'Ref. No.'} {doc.documentNumber}
        </div>
        <div>
          {isTh ? 'วันที่' : 'Date:'} {doc.issueDateText || doc.issueDate}
        </div>
      </div>

      {/* ===== ชื่อเรื่อง ===== */}
      <div style={{ textAlign: 'center', fontSize: '18pt', fontWeight: 700, marginBottom: '8mm' }}>
        {isTh
          ? doc.certificateTitle
          : includeSalary
            ? 'SALARY CERTIFICATE'
            : 'EMPLOYMENT CERTIFICATE'}
      </div>

      {isTh ? (
        <>
          <Para>
            หนังสือฉบับนี้ให้ไว้เพื่อรับรองว่า <b>{doc.fullName}</b> รหัสพนักงาน {doc.employeeCode} เป็นพนักงานของ
            {doc.companyName} ตำแหน่ง {doc.positionName} สังกัด{doc.departmentName} โดยเริ่มปฏิบัติงานตั้งแต่วันที่{' '}
            {doc.startDateText} จนถึงปัจจุบัน รวมระยะเวลา {doc.serviceDurationText}
            {includeSalary && salary != null && (
              <>
                {' '}
                ได้รับอัตราเงินเดือนเดือนละ <b>{fmtMoney(salary)}</b> บาท ({doc.salaryText}) ซึ่งอัตรานี้ไม่รวมค่าตอบแทนและเงินพิเศษอื่นๆ
              </>
            )}
          </Para>
          {purpose && (
            <Para>
              หนังสือรับรองฉบับนี้ออกให้{purpose.startsWith('เพื่อ') ? '' : 'เพื่อ'}
              {purpose} เท่านั้น
            </Para>
          )}
          <Para>บริษัทฯ ขอรับรองว่าข้อความข้างต้นเป็นความจริงทุกประการ</Para>
          <Para>ให้ไว้ ณ วันที่ {doc.issueDateText}</Para>
        </>
      ) : (
        <>
          <Para indent={false} style={{ marginBottom: '5mm' }}>
            To Whom It May Concern,
          </Para>
          <Para>
            This is to certify that <b>{doc.fullName}</b> (Employee ID {doc.employeeCode}) has been employed by{' '}
            {doc.companyName} since {doc.startDateText} to the present ({doc.serviceDurationText}), currently holding the
            position of {doc.positionName}, {doc.departmentName}
            {includeSalary && salary != null ? (
              <>
                , and receives a monthly salary of <b>THB {fmtMoney(salary)}</b>, excluding other allowances and benefits.
              </>
            ) : (
              '.'
            )}
          </Para>
          {purpose && <Para>This certificate is issued upon the employee&apos;s request for the purpose of: {purpose}.</Para>}
          <Para>Issued on {doc.issueDateText}.</Para>
        </>
      )}

      {/* ===== ผู้ลงนาม ===== */}
      <div style={{ marginLeft: '80mm', marginTop: '14mm', textAlign: 'center', whiteSpace: 'nowrap' }}>
        <div>{isTh ? 'ขอแสดงความนับถือ' : 'Sincerely yours,'}</div>
        <div style={{ marginTop: '14mm' }}>
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
  initialLang = 'TH',
}) => {
  const { companyLogo, companyAddress } = useCompanyDocumentInfo(isOpen);
  const [lang, setLang] = useState<Lang>(initialLang);
  const [doc, setDoc] = useState<CertificateDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewTypeId = previewParams?.certificateTypeId;
  const previewPurpose = previewParams?.purpose ?? '';

  useEffect(() => {
    if (isOpen) setLang(initialLang);
  }, [isOpen, initialLang]);

  useEffect(() => {
    if (!isOpen) {
      setDoc(null);
      setError(null);
      return;
    }
    let active = true;
    const load = async () => {
      if (requestId) return certificateService.getDocument(requestId, lang);
      if (previewTypeId) return certificateService.previewDocument(previewTypeId, previewPurpose, lang);
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
  }, [isOpen, requestId, previewTypeId, previewPurpose, initialDoc, lang]);

  if (!isOpen) return null;

  const paper = doc ? (
    <CertificatePaper doc={doc} lang={lang} companyLogo={companyLogo} companyAddress={companyAddress} />
  ) : null;

  return (
    <>
      <div className="cert-modal no-print fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="relative bg-white rounded-2xl w-full max-w-[900px] max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white dark:bg-slate-800">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <FileText className="w-5 h-5 text-[#0B2046]" />
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
                <Loader2 className="w-8 h-8 animate-spin text-[#0B2046]" />
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

          <div className="flex items-center justify-between gap-3 px-6 py-4 bg-white border-t border-gray-100 flex-wrap">
            <div className="flex items-center bg-slate-100 rounded-xl p-1 text-xs">
              {(['TH', 'EN'] as Lang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    lang === l ? 'bg-white text-[#0B2046] shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {l === 'TH' ? 'ภาษาไทย' : 'English'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                disabled={!doc || loading}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
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


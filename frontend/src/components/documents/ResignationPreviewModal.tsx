'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sarabun } from 'next/font/google';
import { X, Printer, FileText } from 'lucide-react';
import { organizationService } from '@/services/organizationService';
import { getAvatarUrl } from '@/lib/api-client';

// ฟอนต์เอกสารราชการ/ฟอร์มบริษัท ให้ใกล้เคียงต้นฉบับ Word (TH Sarabun)
const sarabun = Sarabun({
  weight: ['400', '500', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
});

// ที่อยู่บริษัทตามต้นฉบับเอกสาร (ใช้เมื่อยังไม่ได้ตั้งค่าที่อยู่ในหน้าข้อมูลบริษัท)
const DEFAULT_COMPANY_ADDRESS = '451/14 M.Pantiya Suwinthawong 11, Saensab, Minburi, Bangkok 10510';

export interface ResignationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    employeeName: string;
    /** รหัสพนักงานผู้ลาออก ใช้ดึงรูปลายเซ็นจากบัญชี (GET /api/employees/{id}/signature) */
    employeeId?: number | null;
    /** URL รูปลายเซ็น (ถ้ามี จะใช้แทนการดึงจาก employeeId) */
    signatureUrl?: string | null;
    titlePrefix?: string;
    companyLogo?: string | null;
    companyName?: string;
    employeeCode?: string;
    positionTitle?: string;
    departmentName?: string;
    submissionDate?: string;
    requestedLastWorkingDate?: string;
    reasonCategoryLabel?: string;
    reasonDetail?: string;
    handoverNotes?: string;
    contactAfterResignation?: string;
    noticeDays?: number;
    addressedTo?: string;
    companyAddress?: string | null;
    // Approvers (Optional)
    supervisorName?: string;
    supervisorPosition?: string;
    supervisorApprovedAt?: string;
    hrName?: string;
    hrPosition?: string;
    hrApprovedAt?: string;
    managerName?: string;
    managerPosition?: string;
    managerApprovedAt?: string;
  } | null;
}

const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

interface ThaiDateParts {
  day: string;
  month: string;
  monthNum: string;
  year: string;
  formatted: string;
}

const parseThaiDateParts = (dateInput?: string): ThaiDateParts => {
  if (!dateInput || dateInput === '-' || dateInput.trim() === '') {
    return {
      day: '.......',
      month: '...........................',
      monthNum: '.......',
      year: '...................',
      formatted: '......./......./.......',
    };
  }

  const clean = dateInput.trim();

  // Case 1: DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
    const [dStr, mStr, yStr] = clean.split('/');
    const d = parseInt(dStr, 10);
    const m = parseInt(mStr, 10);
    let y = parseInt(yStr, 10);
    if (y < 2400) y += 543;
    const monthName = THAI_MONTH_NAMES[m - 1] || mStr;
    const paddedM = String(m).padStart(2, '0');
    return {
      day: String(d),
      month: monthName,
      monthNum: paddedM,
      year: String(y),
      formatted: `${String(d).padStart(2, '0')}/${paddedM}/${y}`,
    };
  }

  // Case 2: YYYY-MM-DD or ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    const parts = clean.split('T')[0].split('-');
    let y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (y < 2400) y += 543;
    const monthName = THAI_MONTH_NAMES[m - 1] || String(m);
    const paddedM = String(m).padStart(2, '0');
    return {
      day: String(d),
      month: monthName,
      monthNum: paddedM,
      year: String(y),
      formatted: `${String(d).padStart(2, '0')}/${paddedM}/${y}`,
    };
  }

  // Fallback: Date object
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const d = parsed.getDate();
    const m = parsed.getMonth();
    let y = parsed.getFullYear();
    if (y < 2400) y += 543;
    const paddedM = String(m + 1).padStart(2, '0');
    return {
      day: String(d),
      month: THAI_MONTH_NAMES[m],
      monthNum: paddedM,
      year: String(y),
      formatted: `${String(d).padStart(2, '0')}/${paddedM}/${y}`,
    };
  }

  return {
    day: '.......',
    month: '...........................',
    monthNum: '.......',
    year: '...................',
    formatted: clean,
  };
};

interface ExtractedPrefixInfo {
  prefix: 'นาย' | 'นาง' | 'นางสาว' | null;
  displayName: string;
}

const extractPrefixAndName = (fullName?: string, explicitPrefix?: string): ExtractedPrefixInfo => {
  if (!fullName || fullName.trim() === '') {
    if (explicitPrefix === 'นาย' || explicitPrefix === 'นาง' || explicitPrefix === 'นางสาว') {
      return { prefix: explicitPrefix, displayName: '' };
    }
    return { prefix: null, displayName: '' };
  }

  const trimmed = fullName.trim();

  // 1. If explicit prefix was given and valid
  if (explicitPrefix === 'นาย' || explicitPrefix === 'นาง' || explicitPrefix === 'นางสาว') {
    let clean = trimmed;
    if (clean.startsWith(explicitPrefix)) {
      clean = clean.slice(explicitPrefix.length).trim();
    }
    clean = clean.replace(/^(นาย|นางสาว|นาง)\s*/, '');
    return {
      prefix: explicitPrefix,
      displayName: clean,
    };
  }

  // 2. Auto-detect from fullName (Note: check 'นางสาว' before 'นาง')
  if (trimmed.startsWith('นางสาว')) {
    const clean = trimmed.slice('นางสาว'.length).trim().replace(/^(นาย|นางสาว|นาง)\s*/, '');
    return { prefix: 'นางสาว', displayName: clean };
  }
  if (trimmed.startsWith('นาง')) {
    const clean = trimmed.slice('นาง'.length).trim().replace(/^(นาย|นางสาว|นาง)\s*/, '');
    return { prefix: 'นาง', displayName: clean };
  }
  if (trimmed.startsWith('นาย')) {
    const clean = trimmed.slice('นาย'.length).trim().replace(/^(นาย|นางสาว|นาง)\s*/, '');
    return { prefix: 'นาย', displayName: clean };
  }

  return {
    prefix: null,
    displayName: trimmed,
  };
};

type ResignationData = NonNullable<ResignationPreviewModalProps['data']>;

/** ช่องกรอกแบบเส้นประ (เหมือนจุดไข่ปลาในต้นฉบับ) พร้อมข้อความที่กรอกอยู่ด้านบนเส้น */
const Fill: React.FC<{ value?: React.ReactNode; minWidth: string; align?: 'center' | 'left' }> = ({
  value,
  minWidth,
  align = 'center',
}) => (
  <span
    style={{
      display: 'inline-block',
      minWidth,
      borderBottom: '1px dotted #000',
      lineHeight: 1.15,
      textAlign: align,
      padding: '0 1.5mm',
      verticalAlign: 'baseline',
    }}
  >
    {value || ' '}
  </span>
);

/** กล่องลงนามในตารางผลการพิจารณา */
const SignatureCell: React.FC<{ title: string; name?: string; position?: string; positionPlaceholder?: string; date?: string }> = ({
  title,
  name,
  position,
  positionPlaceholder,
  date,
}) => (
  <td style={{ width: '50%', border: '1px solid #000', verticalAlign: 'top', padding: 0 }}>
    <div style={{ textAlign: 'center', borderBottom: '1px solid #000', padding: '0.8mm 0' }}>{title}</div>
    <div style={{ padding: '4mm 2mm 1mm 2mm' }}>
      <div>ลงชื่อ<Fill value={name} minWidth="58mm" /></div>
      <div>ตำแหน่ง<Fill value={position || positionPlaceholder} minWidth="54.5mm" /></div>
      <div>วันที่<Fill value={date} minWidth="60mm" /></div>
    </div>
  </td>
);

/**
 * หน้ากระดาษ A4 (210 x 297 มม.) ของใบลาออก — จัดวางตามต้นฉบับ "ใบลาออก-2025-Rev 1.pdf"
 * - หัวกระดาษ: โลโก้กึ่งกลาง มีเส้นคั่นซ้าย/ขวา
 * - ท้ายกระดาษ: เส้นคั่นเต็มความกว้าง + ที่อยู่บริษัท (สีฟ้า) ชิดขอบล่างของหน้า
 */
const ResignationPaper: React.FC<{
  data: ResignationData;
  companyLogo: string | null;
  companyAddress: string;
  signatureSrc: string | null;
  onSignatureError?: () => void;
}> = ({ data, companyLogo, companyAddress, signatureSrc, onSignatureError }) => {
  const submissionParts = parseThaiDateParts(data.submissionDate);
  const lastWorkingParts = parseThaiDateParts(data.requestedLastWorkingDate);
  const { prefix, displayName } = extractPrefixAndName(data.employeeName, data.titlePrefix);
  const fullEmployeeNameForSignature = prefix && displayName ? `${prefix} ${displayName}` : data.employeeName || '';
  const has = (v: string) => !v.startsWith('.');

  const getReasonText = () => {
    const detail = data.reasonDetail?.trim();
    const label = data.reasonCategoryLabel?.trim();
    if (detail && detail !== 'ยังไม่ได้ระบุรายละเอียด' && detail !== '-') return detail;
    return label || 'ความจำเป็นส่วนบุคคล';
  };

  const strike = (p: 'นาย' | 'นาง' | 'นางสาว') =>
    prefix && prefix !== p ? { textDecoration: 'line-through', textDecorationThickness: '1.5px' } : undefined;

  return (
    <div
      className={`resignation-paper ${sarabun.className}`}
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
      {/* ===== หัวกระดาษ: โลโก้กึ่งกลาง + เส้นซ้าย/ขวา ===== */}
      <div
        style={{
          position: 'absolute',
          top: '6mm',
          left: '6mm',
          right: '5mm',
          height: '15mm',
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ flex: 1, borderTop: '1px solid #000', marginBottom: '3.3mm' }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={companyLogo || '/syaco-logo.png'}
          alt="Company Logo"
          style={{ height: '15mm', width: 'auto', objectFit: 'contain', margin: '0 2mm' }}
        />
        <div style={{ flex: 1, borderTop: '1px solid #000', marginBottom: '3.3mm' }} />
      </div>

      {/* ===== ชื่อเอกสาร ===== */}
      <div style={{ textAlign: 'center', fontSize: '16pt', fontWeight: 700, marginBottom: '6mm' }}>ใบลาออก</div>

      {/* ===== เขียนที่ / วันที่ (ชิดขวา) ===== */}
      <div style={{ marginLeft: '88mm', marginBottom: '5mm', whiteSpace: 'nowrap' }}>
        <div>เขียนที่<Fill value="บริษัท ไซอโคว จำกัด" minWidth="50mm" /></div>
        <div>
          วันที่<Fill value={has(submissionParts.day) ? submissionParts.day : ''} minWidth="8mm" />
          เดือน<Fill value={has(submissionParts.month) ? submissionParts.month : ''} minWidth="20mm" />
          พ.ศ.<Fill value={has(submissionParts.year) ? submissionParts.year : ''} minWidth="12mm" />
        </div>
      </div>

      {/* ===== เรื่อง / เรียน ===== */}
      <div style={{ marginBottom: '4mm' }}>
        <div style={{ display: 'flex' }}>
          <span style={{ width: '13mm' }}>เรื่อง</span>
          <span>ขอลาออก</span>
        </div>
        <div style={{ display: 'flex' }}>
          <span style={{ width: '13mm' }}>เรียน</span>
          <span>{data.addressedTo || 'กรรมการผู้จัดการบริษัท ไซอโคว จำกัด'}</span>
        </div>
      </div>

      {/* ===== เนื้อความ ===== */}
      <p style={{ textIndent: '12.5mm', margin: 0 }}>
        ข้าพเจ้า <span style={strike('นาย')}>นาย</span>/ <span style={strike('นาง')}>นาง</span>/{' '}
        <span style={strike('นางสาว')}>นางสาว</span>
        <Fill value={displayName} minWidth="48mm" /> พนักงานตำแหน่ง
        <Fill value={data.positionTitle} minWidth="36mm" />
        {data.departmentName ? (
          <>
            {' '}สังกัด<Fill value={data.departmentName} minWidth="20mm" />
          </>
        ) : null}{' '}
        ของบริษัท ไซอโคว จำกัด มีความประสงค์ขอลาออกจากการเป็นพนักงาน ของบริษัทฯ เนื่องด้วยเหตุผล
        <Fill value={getReasonText()} minWidth="40mm" align="left" />
      </p>
      <p style={{ textIndent: '12.5mm', margin: 0 }}>
        จึงขอสิ้นสุดการทำงานตั้งแต่วันที่<Fill value={has(lastWorkingParts.day) ? lastWorkingParts.day : ''} minWidth="14mm" />
        เดือน<Fill value={has(lastWorkingParts.month) ? lastWorkingParts.month : ''} minWidth="30mm" />
        พ.ศ.<Fill value={has(lastWorkingParts.year) ? lastWorkingParts.year : ''} minWidth="18mm" />
      </p>

      <p style={{ textIndent: '12.5mm', textAlign: 'justify', margin: '3mm 0 0 0' }}>
        การลาออกนี้ ข้าพเจ้าออกด้วยความสมัครใจมิได้ถูกบังคับ ขู่เข็ญ หรือสั่งให้ออก ในกรณีที่ทรัพย์สินของบริษัทที่ข้าพเจ้าครอบครอง
        และยังไม่ได้ส่งคืนให้บริษัทโดยครบถ้วน และบรรดาหนี้สินที่ข้าพเจ้ามีต่อบริษัทฯ ข้าพเจ้ายินยอมให้บริษัทเลือกที่จะยึดหน่วง บรรดาค่าจ้าง
        หรือผลประโยชน์อย่างอื่น หรือเลือกที่จะหักเอาจากค่าจ้าง หรือผลประโยชน์อย่างอื่นที่บริษัทฯ จะจ่ายให้กับข้าพเจ้า อย่างใดอย่างหนึ่งตามที่บริษัทฯ
        เห็นสมควร และสิทธิอื่นใดอันพึงได้มีมาก่อนหน้านี้ให้เป็นอันระงับสิ้นสุดไป โดยข้าพเจ้าตกลงจะไม่ใช้สิทธิเรียกร้องใดๆ ต่อบริษัทอีกทั้งสิ้น
      </p>

      <p style={{ textIndent: '12.5mm', margin: '3mm 0 0 0' }}>จึงเรียนมาเพื่อทราบและโปรดพิจารณาอนุมัติ</p>

      {/* ===== ลงนามผู้ลาออก (ชิดขวา) ===== */}
      <div style={{ marginLeft: '88mm', width: '74mm', textAlign: 'center', marginTop: '5mm', whiteSpace: 'nowrap' }}>
        <div>ขอแสดงความนับถือ</div>
        <div style={{ marginTop: '9mm' }}>
          (ลงชื่อ)
          {/* ช่องลงชื่อ: วางรูปลายเซ็นของผู้ลาออกไว้เหนือเส้นประ โดยไม่ดันระยะบรรทัด */}
          <span
            style={{
              position: 'relative',
              display: 'inline-block',
              minWidth: '42mm',
              borderBottom: '1px dotted #000',
              lineHeight: 1.15,
              verticalAlign: 'baseline',
            }}
          >
            {'\u00A0'}
            {signatureSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signatureSrc}
                alt="ลายเซ็นผู้ลาออก"
                onError={onSignatureError}
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: '0.3mm',
                  transform: 'translateX(-50%)',
                  height: '12mm',
                  maxWidth: '44mm',
                  objectFit: 'contain',
                  pointerEvents: 'none',
                }}
              />
            )}
          </span>
          ผู้ลาออก
        </div>
        <div>
          (<Fill value={fullEmployeeNameForSignature} minWidth="50mm" />)
        </div>
        <div>
          วันที่<Fill value={has(submissionParts.day) ? submissionParts.day : ''} minWidth="12mm" />/
          <Fill value={has(submissionParts.monthNum) ? submissionParts.monthNum : ''} minWidth="12mm" />/
          <Fill value={has(submissionParts.year) ? submissionParts.year : ''} minWidth="14mm" />
        </div>
      </div>

      {/* ===== ผลการพิจารณา ===== */}
      <div style={{ textAlign: 'center', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: '3px', marginTop: '6mm' }}>
        ผลการพิจารณา
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', lineHeight: 1.55, tableLayout: 'fixed' }}>
        <tbody>
          <tr>
            <SignatureCell
              title="ผู้บังคับบัญชาพิจารณาเห็นชอบ"
              name={data.supervisorName}
              position={data.supervisorPosition}
              date={data.supervisorApprovedAt}
            />
            {/* ช่องขวาบนว่างและไม่มีเส้นขอบ ตามต้นฉบับ */}
            <td style={{ width: '50%', border: 'none', borderLeft: '1px solid #000', borderBottom: '1px solid #000', padding: 0 }} />
          </tr>
          <tr>
            <SignatureCell
              title="ฝ่ายบุคคลรับทราบเพื่อดำเนินการ"
              name={data.hrName}
              position={data.hrPosition}
              date={data.hrApprovedAt}
            />
            <SignatureCell
              title="อนุมัติโดยกรรมการผู้จัดการ"
              name={data.managerName}
              position={data.managerPosition}
              positionPlaceholder="กรรมการผู้จัดการ"
              date={data.managerApprovedAt}
            />
          </tr>
        </tbody>
      </table>

      {/* ===== ท้ายกระดาษ: เส้นคั่น + ที่อยู่บริษัท (ชิดขอบล่างของหน้าเสมอ) ===== */}
      <div style={{ position: 'absolute', left: '6mm', right: '2mm', top: '284mm' }}>
        <div style={{ borderTop: '1px solid #1f2937' }} />
        <div style={{ fontSize: '8.5pt', lineHeight: 1.4, color: '#2E75B6', marginTop: '1mm', fontFamily: 'Arial, Helvetica, sans-serif' }}>
          {companyAddress}
        </div>
      </div>
    </div>
  );
};

export const ResignationPreviewModal: React.FC<ResignationPreviewModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const [companyLogo, setCompanyLogo] = useState<string | null>(data?.companyLogo || null);
  const [companyAddress, setCompanyAddress] = useState<string | null>(data?.companyAddress || null);
  const [signatureSrc, setSignatureSrc] = useState<string | null>(null);

  // รูปลายเซ็นของบัญชีผู้ลาออก (ดึงใหม่ทุกครั้งที่เปิด เพื่อให้ได้ลายเซ็นล่าสุด)
  useEffect(() => {
    if (!isOpen) {
      setSignatureSrc(null);
      return;
    }
    if (data?.signatureUrl) {
      setSignatureSrc(getAvatarUrl(data.signatureUrl));
    } else if (data?.employeeId) {
      setSignatureSrc(getAvatarUrl(`/api/employees/${data.employeeId}/signature?v=${Date.now()}`));
    } else {
      setSignatureSrc(null);
    }
  }, [isOpen, data?.employeeId, data?.signatureUrl]);

  useEffect(() => {
    if (!isOpen) return;
    if (data?.companyLogo) setCompanyLogo(data.companyLogo);
    if (data?.companyAddress) setCompanyAddress(data.companyAddress);
    if (data?.companyLogo && data?.companyAddress) return;

    let isMounted = true;
    organizationService
      .getCompany()
      .then((comp) => {
        if (!isMounted || !comp) return;
        if (!data?.companyLogo && comp.logoData) {
          setCompanyLogo(comp.logoData.startsWith('data:') ? comp.logoData : `data:image/png;base64,${comp.logoData}`);
        }
        if (!data?.companyAddress && comp.address?.trim()) {
          setCompanyAddress(comp.address.trim());
        }
      })
      .catch((err) => {
        console.error('Failed to load company info for resignation preview:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, data?.companyLogo, data?.companyAddress]);

  if (!isOpen || !data) return null;

  const address = companyAddress || DEFAULT_COMPANY_ADDRESS;

  return (
    <>
      <div className="resignation-modal no-print fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="relative bg-white rounded-2xl w-full max-w-[900px] max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-2 text-slate-800">
              <FileText className="w-5 h-5 text-[#0B2046]" />
              <h3 className="text-base font-bold">ตัวอย่างแบบฟอร์มใบลาออก (ต้นฉบับ PDF)</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* พื้นที่แสดงกระดาษ A4 เต็มหน้า (เลื่อนดูได้) */}
          <div className="flex-1 overflow-auto bg-slate-200/70 py-6 px-4">
            <div className="mx-auto w-fit shadow-md border border-gray-300">
              <ResignationPaper
                data={data}
                companyLogo={companyLogo}
                companyAddress={address}
                signatureSrc={signatureSrc}
                onSignatureError={() => setSignatureSrc(null)}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-white border-t border-gray-100">
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

      {/* สำเนาสำหรับพิมพ์: แยกออกมาไว้ใต้ <body> โดยตรง เพื่อให้พิมพ์ได้เต็มหน้า A4 ไม่ติดกรอบ modal / sidebar */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="resignation-print-root">
            <ResignationPaper
                data={data}
                companyLogo={companyLogo}
                companyAddress={address}
                signatureSrc={signatureSrc}
                onSignatureError={() => setSignatureSrc(null)}
              />
          </div>,
          document.body
        )}

      <style jsx global>{`
        .resignation-print-root {
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

          /* ซ่อนทุกอย่างในหน้า ยกเว้นสำเนาเอกสาร */
          body > *:not(.resignation-print-root) {
            display: none !important;
          }

          .resignation-print-root {
            display: block !important;
          }

          .resignation-print-root .resignation-paper {
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            break-inside: avoid;
            page-break-after: avoid;
          }

          .resignation-print-root * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  );
};

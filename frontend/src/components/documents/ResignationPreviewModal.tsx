'use client';

import React, { useState, useEffect } from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { organizationService } from '@/services/organizationService';

export interface ResignationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    employeeName: string;
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

export const ResignationPreviewModal: React.FC<ResignationPreviewModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const [companyLogo, setCompanyLogo] = useState<string | null>(data?.companyLogo || null);

  useEffect(() => {
    if (!isOpen) return;
    if (data?.companyLogo) {
      setCompanyLogo(data.companyLogo);
      return;
    }
    let isMounted = true;
    organizationService
      .getCompany()
      .then((comp) => {
        if (isMounted && comp?.logoData) {
          const src = comp.logoData.startsWith('data:')
            ? comp.logoData
            : `data:image/png;base64,${comp.logoData}`;
          setCompanyLogo(src);
        }
      })
      .catch((err) => {
        console.error('Failed to load company logo for resignation preview:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, data?.companyLogo]);

  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const submissionParts = parseThaiDateParts(data.submissionDate);
  const lastWorkingParts = parseThaiDateParts(data.requestedLastWorkingDate);

  const { prefix, displayName } = extractPrefixAndName(data.employeeName, data.titlePrefix);

  const fullEmployeeNameForSignature = prefix && displayName
    ? `${prefix} ${displayName}`
    : (data.employeeName || '...................................................');

  const getReasonText = () => {
    if (!data) return '';
    const detail = data.reasonDetail?.trim();
    const label = data.reasonCategoryLabel?.trim();
    if (detail && detail !== 'ยังไม่ได้ระบุรายละเอียด' && detail !== '-') {
      return detail;
    }
    return label || 'ความจำเป็นส่วนบุคคล';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      {/* Modal Dialog */}
      <div className="relative bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 z-10 animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header Actions (no-print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
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

        {/* Paper Document Preview Area (Scrollable in modal) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/80">
          <div
            id="resignation-print-area"
            className="bg-white mx-auto w-full max-w-[210mm] min-h-[297mm] px-8 sm:px-14 pt-4 pb-8 sm:pb-14 text-black text-[13.5px] leading-relaxed shadow-sm border border-gray-200 select-text"
            style={{ fontFamily: "'Prompt', 'Sarabun', 'TH Sarabun New', sans-serif" }}
          >
            {/* Company Logo Header */}
            <div className="flex flex-col items-center justify-center pb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={companyLogo || '/syaco-logo.png'}
                alt="Company Logo"
                className="h-16 w-auto object-contain"
              />
            </div>

            {/* Header Divider Line */}
            <div className="border-b border-black w-full mb-6 mt-1" />

            {/* Title: ใบลาออก */}
            <h1 className="text-center text-xl font-bold text-black mb-6 tracking-wide">
              ใบลาออก
            </h1>

            {/* Top Right: Location & Submission Date */}
            <div className="flex justify-end mb-6">
              <div className="space-y-1.5 text-right sm:text-left text-sm">
                <p>
                  เขียนที่ <span className="font-medium">บริษัท ไซอโคว จำกัด</span>
                </p>
                <p>
                  วันที่ <span className="font-medium underline decoration-dotted underline-offset-4 px-1">{submissionParts.day}</span>{' '}
                  เดือน <span className="font-medium underline decoration-dotted underline-offset-4 px-1">{submissionParts.month}</span>{' '}
                  พ.ศ. <span className="font-medium underline decoration-dotted underline-offset-4 px-1">{submissionParts.year}</span>
                </p>
              </div>
            </div>

            {/* Subject & Addressee */}
            <div className="space-y-2 mb-6 text-sm">
              <div className="flex items-baseline">
                <span className="w-16 font-normal">เรื่อง</span>
                <span className="font-medium">ขอลาออก</span>
              </div>
              <div className="flex items-baseline">
                <span className="w-16 font-normal">เรียน</span>
                <span className="font-medium">{data.addressedTo || 'กรรมการผู้จัดการบริษัท ไซอโคว จำกัด'}</span>
              </div>
            </div>

            {/* Paragraph 1: Employee info with Prefix Strikethrough & Reason */}
            <div className="space-y-4 mb-6 text-sm leading-relaxed">
              <p className="text-justify indent-12">
                ข้าพเจ้า{' '}
                <span className={prefix && prefix !== 'นาย' ? 'line-through decoration-black decoration-[1.5px]' : ''}>นาย</span>
                /{' '}
                <span className={prefix && prefix !== 'นาง' ? 'line-through decoration-black decoration-[1.5px]' : ''}>นาง</span>
                /{' '}
                <span className={prefix && prefix !== 'นางสาว' ? 'line-through decoration-black decoration-[1.5px]' : ''}>นางสาว</span>{' '}
                <span className="font-medium underline decoration-dotted underline-offset-4 px-1">
                  {displayName || '............................................................'}
                </span>{' '}
                พนักงานตำแหน่ง{' '}
                <span className="font-medium underline decoration-dotted underline-offset-4 px-1">
                  {data.positionTitle || '.........................................'}
                </span>{' '}
                {data.departmentName && (
                  <>สังกัด <span className="font-medium underline decoration-dotted underline-offset-4 px-1">{data.departmentName}</span>{' '}</>
                )}
                ของบริษัท ไซอโคว จำกัด มีความประสงค์ขอลาออกจากการเป็นพนักงาน ของบริษัทฯ เนื่องด้วยเหตุผล{' '}
                <span className="font-medium underline decoration-dotted underline-offset-4 px-1">{getReasonText()}</span>
              </p>

              {/* Paragraph 2: Effective Date */}
              <p className="text-justify indent-12">
                จึงขอสิ้นสุดการทำงานตั้งแต่วันที่ <span className="font-medium underline decoration-dotted underline-offset-4 px-1">{lastWorkingParts.day}</span>{' '}
                เดือน <span className="font-medium underline decoration-dotted underline-offset-4 px-1">{lastWorkingParts.month}</span>{' '}
                พ.ศ. <span className="font-medium underline decoration-dotted underline-offset-4 px-1">{lastWorkingParts.year}</span>
              </p>

              {/* Paragraph 3: Syaco Legal Clause */}
              <p className="text-justify indent-12 leading-relaxed">
                การลาออกนี้ ข้าพเจ้าออกด้วยความสมัครใจมิได้ถูกบังคับ ขู่เข็ญ หรือสั่งให้ออก ในกรณีที่ทรัพย์สินของบริษัทที่ข้าพเจ้าครอบครอง และยังไม่ได้ส่งคืนให้บริษัทโดยครบถ้วน และบรรดาหนี้สินที่ข้าพเจ้ามีต่อบริษัทฯ ข้าพเจ้ายินยอมให้บริษัทเลือกที่จะยึดหน่วง บรรดาค่าจ้าง หรือผลประโยชน์อย่างอื่น หรือเลือกที่จะหักเอาจากค่าจ้าง หรือผลประโยชน์อย่างอื่นที่บริษัทฯ จะจ่ายให้กับข้าพเจ้า อย่างใดอย่างหนึ่งตามที่บริษัทฯ เห็นสมควร และสิทธิอื่นใดอันพึงได้มีมาก่อนหน้านี้ให้เป็นอันระงับสิ้นสุดไป โดยข้าพเจ้าตกลงจะไม่ใช้สิทธิเรียกร้องใดๆ ต่อบริษัทอีกทั้งสิ้น
              </p>

              {/* Closing Statement */}
              <p className="text-justify indent-12">
                จึงเรียนมาเพื่อทราบและโปรดพิจารณาอนุมัติ
              </p>
            </div>

            {/* Sign-off Block (Right-aligned) */}
            <div className="flex justify-end my-8 text-sm">
              <div className="w-80 text-center space-y-3">
                <p>ขอแสดงความนับถือ</p>
                <div className="pt-6 space-y-1.5">
                  <p className="whitespace-nowrap">
                    (ลงชื่อ)...................................................ผู้ลาออก
                  </p>
                  <p className="text-black font-medium">
                    ( {fullEmployeeNameForSignature} )
                  </p>
                  <p className="text-black">
                    วันที่.......{submissionParts.day !== '.......' ? submissionParts.day : '.......'}......./.......{submissionParts.monthNum !== '.......' ? submissionParts.monthNum : '.......'}......./.......{submissionParts.year !== '...................' ? submissionParts.year : '.......'}.......
                  </p>
                </div>
              </div>
            </div>

            {/* Approval Section: ผลการพิจารณา */}
            <div className="mt-8 mb-6">
              <div className="text-center mb-2">
                <span className="font-bold text-sm text-black underline decoration-black underline-offset-4 tracking-wide">
                  ผลการพิจารณา
                </span>
              </div>
              <table className="w-full border-collapse text-xs text-black" style={{ borderSpacing: 0 }}>
                <tbody>
                  {/* Row 1: ผู้บังคับบัญชาพิจารณาเห็นชอบ (Left 50%), Top-Right is EMPTY */}
                  <tr>
                    <td className="w-1/2 border border-black align-top p-0">
                      <div className="text-center font-bold py-1.5 border-b border-black">
                        ผู้บังคับบัญชาพิจารณาเห็นชอบ
                      </div>
                      <div className="p-3.5 space-y-3.5 text-left">
                        <p className="whitespace-nowrap overflow-hidden">
                          ลงชื่อ{data.supervisorName ? <span className="font-medium underline decoration-dotted px-2">{data.supervisorName}</span> : '.............................................................................'}
                        </p>
                        <p className="whitespace-nowrap overflow-hidden">
                          ตำแหน่ง{data.supervisorPosition ? <span className="font-medium underline decoration-dotted px-2">{data.supervisorPosition}</span> : '.........................................................................'}
                        </p>
                        <p className="whitespace-nowrap overflow-hidden">
                          วันที่{data.supervisorApprovedAt ? <span className="font-medium underline decoration-dotted px-2">{data.supervisorApprovedAt}</span> : '...............................................................................'}
                        </p>
                      </div>
                    </td>
                    <td className="w-1/2 border-none bg-transparent p-0" />
                  </tr>

                  {/* Row 2: ฝ่ายบุคคล (Left 50%) & อนุมัติโดยกรรมการผู้จัดการ (Right 50%) */}
                  <tr>
                    {/* Col 1: ฝ่ายบุคคล */}
                    <td className="w-1/2 border border-black align-top p-0">
                      <div className="text-center font-bold py-1.5 border-b border-black">
                        ฝ่ายบุคคลรับทราบเพื่อดำเนินการ
                      </div>
                      <div className="p-3.5 space-y-3.5 text-left">
                        <p className="whitespace-nowrap overflow-hidden">
                          ลงชื่อ{data.hrName ? <span className="font-medium underline decoration-dotted px-2">{data.hrName}</span> : '.............................................................................'}
                        </p>
                        <p className="whitespace-nowrap overflow-hidden">
                          ตำแหน่ง{data.hrPosition ? <span className="font-medium underline decoration-dotted px-2">{data.hrPosition}</span> : '.........................................................................'}
                        </p>
                        <p className="whitespace-nowrap overflow-hidden">
                          วันที่{data.hrApprovedAt ? <span className="font-medium underline decoration-dotted px-2">{data.hrApprovedAt}</span> : '...............................................................................'}
                        </p>
                      </div>
                    </td>

                    {/* Col 2: กรรมการผู้จัดการ */}
                    <td className="w-1/2 border border-black align-top p-0">
                      <div className="text-center font-bold py-1.5 border-b border-black">
                        อนุมัติโดยกรรมการผู้จัดการ
                      </div>
                      <div className="p-3.5 space-y-3.5 text-left">
                        <p className="whitespace-nowrap overflow-hidden">
                          ลงชื่อ{data.managerName ? <span className="font-medium underline decoration-dotted px-2">{data.managerName}</span> : '.............................................................................'}
                        </p>
                        <p className="whitespace-nowrap overflow-hidden">
                          ตำแหน่ง{data.managerPosition ? <span className="font-medium underline decoration-dotted px-2">{data.managerPosition}</span> : '...............กรรมการผู้จัดการ.............................'}
                        </p>
                        <p className="whitespace-nowrap overflow-hidden">
                          วันที่{data.managerApprovedAt ? <span className="font-medium underline decoration-dotted px-2">{data.managerApprovedAt}</span> : '...............................................................................'}
                        </p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer Divider & Address */}
            <div className="mt-10 pt-2">
              <div className="border-b border-[#0099DA] mb-2" />
              <div className="text-[11px] text-[#0099DA] font-normal tracking-wide">
                451/14 M.Pantiya Suwinthawong 11, Saensab, Minburi, Bangkok 10510
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer (no-print) */}
        <div className="no-print flex items-center justify-end gap-3 px-6 py-4 bg-white border-t border-gray-100">
          <button
            type="button"
            onClick={handlePrint}
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

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 15mm;
          }
          body * {
            visibility: hidden !important;
          }
          #resignation-print-area,
          #resignation-print-area * {
            visibility: visible !important;
          }
          #resignation-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

'use client';

import React, { useState, useEffect } from 'react';
import { X, Printer, Globe, Building2, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { CertificateDocument } from '@/types/certificates';
import { certificateService } from '@/services/certificateService';

interface CertificatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId?: number | null;
  initialDoc?: CertificateDocument | null;
}

export const CertificatePreviewModal: React.FC<CertificatePreviewModalProps> = ({
  isOpen,
  onClose,
  requestId,
  initialDoc,
}) => {
  const [doc, setDoc] = useState<CertificateDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLang, setCurrentLang] = useState<'TH' | 'EN'>('TH');

  useEffect(() => {
    if (!isOpen) {
      setDoc(null);
      setError(null);
      return;
    }

    if (initialDoc && !requestId) {
      setDoc(initialDoc);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (!requestId) {
      setDoc(null);
      return;
    }

    const fetchDocument = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await certificateService.getDocument(requestId, currentLang);
        setDoc(data);
      } catch (err: any) {
        console.error('Error fetching certificate document:', err);
        setError(err?.response?.data?.message || 'ไม่สามารถโหลดข้อมูลเอกสารหนังสือรับรองได้');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocument();
  }, [isOpen, requestId, currentLang]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatThaiDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const months = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
      ];
      const thaiYear = d.getFullYear() + 543;
      return `${d.getDate()} ${months[d.getMonth()]} พ.ศ. ${thaiYear}`;
    } catch {
      return isoString;
    }
  };

  const formatEnglishDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 print:p-0 print:static print:overflow-visible">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity print:hidden"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none print:w-full print:max-w-none">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0B2046]/10 text-[#0B2046] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                ตัวอย่างเอกสารหนังสือรับรองทางการ
              </h3>
              <p className="text-2xs text-slate-500">
                พร้อมลายเซ็นดิจิทัลและตราประทับรับรอง
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switch */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setCurrentLang('TH')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  currentLang === 'TH'
                    ? 'bg-[#0B2046] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ภาษาไทย
              </button>
              <button
                type="button"
                onClick={() => setCurrentLang('EN')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  currentLang === 'EN'
                    ? 'bg-[#0B2046] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ฉบับสากล
              </button>
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isLoading || !doc}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0B2046] hover:bg-[#0B2046]/90 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              พิมพ์เอกสาร
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Certificate Paper Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-100/60 print:p-0 print:bg-white print:overflow-visible flex justify-center">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#0B2046]" />
              <p className="text-xs">กำลังจัดเตรียมเอกสารหนังสือรับรอง...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-rose-600 text-xs">{error}</div>
          ) : doc ? (
            /* A4 Sheet Container */
            <div className="bg-white rounded-xl shadow-lg border border-slate-200/80 w-full max-w-[650px] p-8 sm:p-12 text-slate-800 relative print:shadow-none print:border-none print:p-6 print:max-w-none">
              {/* Watermark Logo in Background */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                <Building2 className="w-96 h-96 text-slate-900" />
              </div>

              {/* Company Letterhead */}
              <div className="border-b-2 border-[#0B2046] pb-5 mb-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {doc.companyLogoBase64 ? (
                      <img
                        src={doc.companyLogoBase64}
                        alt="Company Logo"
                        className="w-14 h-14 object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-[#0B2046] text-white flex items-center justify-center font-bold text-xl shrink-0">
                        <Building2 className="w-7 h-7" />
                      </div>
                    )}
                    <div>
                      <h1 className="text-lg sm:text-xl font-bold text-[#0B2046] tracking-tight">
                        {doc.companyName}
                      </h1>
                      <p className="text-2xs text-slate-500 mt-1 leading-relaxed max-w-sm">
                        {doc.companyAddress}
                      </p>
                      <p className="text-2xs text-slate-400 mt-0.5">
                        โทรศัพท์: {doc.companyPhone} • อีเมล: {doc.companyEmail}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="inline-block px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-2xs font-bold rounded-lg mb-1">
                      เอกสารรับรองทางการ
                    </span>
                    <p className="font-mono text-2xs text-slate-400">
                      เลขที่: {doc.documentNumber}
                    </p>
                  </div>
                </div>
              </div>

              {/* Document Date */}
              <div className="text-right mb-6">
                <p className="text-xs font-medium text-slate-600">
                  {currentLang === 'TH' ? 'วันที่ออกเอกสาร:' : 'Date:'}{' '}
                  <span className="font-semibold text-slate-800">
                    {currentLang === 'TH'
                      ? formatThaiDate(doc.issueDate)
                      : formatEnglishDate(doc.issueDate)}
                  </span>
                </p>
              </div>

              {/* Document Title */}
              <div className="text-center my-6">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-wide underline underline-offset-8 decoration-slate-300">
                  {currentLang === 'TH'
                    ? doc.certificateTitle
                    : doc.certificateCode === 'CERT_SALARY'
                    ? 'CERTIFICATE OF SALARY'
                    : 'CERTIFICATE OF EMPLOYMENT'}
                </h2>
              </div>

              {/* Certification Body Text */}
              <div className="space-y-4 my-8 text-xs sm:text-sm leading-relaxed text-slate-700 indent-8 text-justify">
                <p>
                  {currentLang === 'TH'
                    ? doc.certificationBodyTh
                    : doc.certificationBodyEn}
                </p>
                <p>
                  {currentLang === 'TH'
                    ? `หนังสือรับรองฉบับนี้ออกให้ตามความประสงค์ของพนักงาน เพื่อ "${doc.purpose}" และให้มีผลใช้ได้ตามกฎหมาย`
                    : `This certificate is issued upon the employee's request for the purpose of "${doc.purpose}" and is deemed valid accordingly.`}
                </p>
              </div>

              {/* Employee Summary Card Box */}
              <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-200/70 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-2xs">
                    {currentLang === 'TH' ? 'ชื่อ-นามสกุล:' : 'Full Name:'}
                  </span>
                  <span className="font-semibold text-slate-800">{doc.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-2xs">
                    {currentLang === 'TH' ? 'รหัสพนักงาน:' : 'Employee Code:'}
                  </span>
                  <span className="font-mono font-semibold text-slate-800">
                    {doc.employeeCode}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-2xs">
                    {currentLang === 'TH' ? 'ตำแหน่งงาน:' : 'Position:'}
                  </span>
                  <span className="font-semibold text-slate-800">{doc.positionName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-2xs">
                    {currentLang === 'TH' ? 'แผนก/ฝ่าย:' : 'Department:'}
                  </span>
                  <span className="font-semibold text-slate-800">{doc.departmentName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-2xs">
                    {currentLang === 'TH' ? 'วันที่เริ่มงาน:' : 'Commencement Date:'}
                  </span>
                  <span className="font-semibold text-slate-800">
                    {currentLang === 'TH'
                      ? formatThaiDate(doc.startDate)
                      : formatEnglishDate(doc.startDate)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-2xs">
                    {currentLang === 'TH' ? 'อายุงาน:' : 'Service Duration:'}
                  </span>
                  <span className="font-semibold text-slate-800">
                    {doc.serviceDurationText}
                  </span>
                </div>
                {doc.salaryText && (
                  <div className="col-span-2 pt-2 border-t border-slate-200/60 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">
                      {currentLang === 'TH'
                        ? 'อัตราเงินเดือนประจำ:'
                        : 'Current Monthly Gross Salary:'}
                    </span>
                    <span className="font-bold text-emerald-700 text-sm">
                      {doc.salaryText}
                    </span>
                  </div>
                )}
              </div>

              {/* Signatory & Signature Section */}
              <div className="mt-12 pt-6 flex justify-end">
                <div className="text-center w-64 space-y-2">
                  <p className="text-xs text-slate-500 mb-1">
                    {currentLang === 'TH' ? 'ขอแสดงความนับถือ' : 'Sincerely yours,'}
                  </p>

                  {/* Digital Signature Image */}
                  <div className="h-20 flex items-center justify-center relative">
                    {doc.signatureBase64 ? (
                      <img
                        src={doc.signatureBase64}
                        alt="Signature"
                        className="max-h-16 max-w-full object-contain"
                      />
                    ) : (
                      <div className="border-b border-dashed border-slate-400 w-44 mt-10" />
                    )}

                    {/* Verified Digital Stamp Badge */}
                    <div className="absolute right-0 bottom-0 opacity-80 pointer-events-none">
                      <div className="w-14 h-14 rounded-full border-2 border-emerald-600/40 flex flex-col items-center justify-center text-emerald-600 rotate-[-12deg] p-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-[7px] font-bold uppercase tracking-tighter text-center">
                          VERIFIED
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-300 pt-2">
                    <p className="font-bold text-xs text-slate-900">
                      ({doc.signatoryName})
                    </p>
                    <p className="text-2xs text-slate-500 mt-0.5">
                      {doc.signatoryPosition}
                    </p>
                    <p className="text-2xs text-slate-400 mt-0.5">
                      {doc.companyName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="mt-14 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
                เอกสารนี้ได้รับการรับรองด้วยลายเซ็นดิจิทัลผ่านระบบบริหารทรัพยากรบุคคล
                (เลขที่อ้างอิง: {doc.documentNumber})
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

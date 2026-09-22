'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronDown,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useAuth } from '@/context/AuthContext';
import { CertificateType, CertificateDocument } from '@/types/certificates';
import { certificateService } from '@/services/certificateService';
import { CertificatePreviewModal } from '@/components/documents/CertificatePreviewModal';
import { DocumentsSubNav } from '@/components/documents/DocumentsSubNav';

export default function CertificatePage() {
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();
  const { user } = useAuth();

  // Form Fields
  const employeeName = user?.fullName || 'วรเมธ รัตนเสถียร';
  const [types, setTypes] = useState<CertificateType[]>([
    { id: 1, certificateCode: 'CERT_SALARY', certificateName: 'หนังสือรับรองเงินเดือน' },
    { id: 2, certificateCode: 'CERT_WORK', certificateName: 'หนังสือรับรองการทำงาน' },
    { id: 3, certificateCode: 'CERT_VISA', certificateName: 'หนังสือรับรองการทำงานเพื่อขอวีซ่า' },
  ]);
  const [selectedTypeId, setSelectedTypeId] = useState<number>(1);
  const [purpose, setPurpose] = useState('');
  const [issueDate, setIssueDate] = useState('22/09/2026');
  const [expiryDate, setExpiryDate] = useState('21/12/2026');

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<CertificateDocument | null>(null);

  // Initialize dates and breadcrumb
  useEffect(() => {
    setBreadcrumb({ section: 'ยื่นเอกสาร', page: 'ขอหนังสือรับรอง' });

    // Set today and +90 days
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear() + 543;
    setIssueDate(`${d}/${m}/${y}`);

    const exp = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const expD = String(exp.getDate()).padStart(2, '0');
    const expM = String(exp.getMonth() + 1).padStart(2, '0');
    const expY = exp.getFullYear() + 543;
    setExpiryDate(`${expD}/${expM}/${expY}`);

    // Load saved draft if present
    try {
      const savedDraft = localStorage.getItem('hrms_cert_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.purpose) setPurpose(parsed.purpose);
        if (parsed.selectedTypeId) setSelectedTypeId(parsed.selectedTypeId);
      }
    } catch {
      // Ignore
    }

    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  // Load types from server
  const loadTypes = useCallback(async () => {
    try {
      const typeList = await certificateService.getCertificateTypes();
      if (typeList && typeList.length > 0) {
        setTypes(typeList);
      }
    } catch (err) {
      console.error('Error loading certificate types:', err);
    }
  }, []);

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  // Show Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Action 1: ดูตัวอย่าง (Preview)
  const handlePreview = () => {
    const currentType = types.find((t) => t.id === Number(selectedTypeId)) || types[0];
    const previewData: CertificateDocument = {
      requestId: 0,
      documentNumber: 'CERT-ตัวอย่างแบบร่าง',
      issueDate: new Date().toISOString(),
      language: 'TH',
      certificateCode: currentType?.certificateCode || 'CERT_SALARY',
      certificateTitle: currentType?.certificateName || 'หนังสือรับรองเงินเดือน',
      companyName: 'บริษัท ฟิวเจอร์ เทค คอร์ปอเรชั่น จำกัด (มหาชน)',
      companyAddress: 'เลขที่ 123 อาคารซอฟต์แวร์ปาร์ค ชั้น 15 ถนนแจ้งวัฒนะ ตำบลคลองเกลือ อำเภอปากเกร็ด จังหวัดนนทบุรี 11120',
      companyPhone: '02-999-8888',
      companyEmail: 'hr@futuretech.co.th',
      employeeId: user?.employeeId || 1,
      employeeCode: user?.employeeCode || 'EMP001',
      fullName: employeeName,
      citizenIdMasked: '1-1002-XXXXX-XX-1',
      positionName: 'วิศวกรซอฟต์แวร์อาวุโส (Senior Software Engineer)',
      departmentName: 'ฝ่ายเทคโนโลยีสารสนเทศและนวัตกรรม',
      startDate: '2023-01-16T00:00:00Z',
      serviceDurationText: '3 ปี 8 เดือน',
      baseSalary: 65000,
      salaryText: 'หกหมื่นห้าพันบาทถ้วน',
      purpose: purpose.trim() || 'เพื่อใช้เป็นหลักฐานแสดงการทำงานและรายได้',
      certificationBodyTh: 'บริษัทขอรับรองว่าบุคคลดังกล่าวข้างต้น เป็นพนักงานประจำของบริษัทจริง และปฏิบัติงานด้วยความเรียบร้อย สุจริต ขยันหมั่นเพียรมาโดยตลอด',
      certificationBodyEn: 'This certificate is issued to certify that the above-named person is a permanent employee of our company and has performed duties with diligence and integrity.',
      signatoryName: 'คุณสมศักดิ์ มั่นคง',
      signatoryPosition: 'ผู้อำนวยการฝ่ายทรัพยากรบุคคล (HR Director)',
    };

    setPreviewDoc(previewData);
    setIsPreviewOpen(true);
  };

  // Action 2: บันทึกแบบร่าง (Save Draft)
  const handleSaveDraft = () => {
    if (!purpose.trim()) {
      setFormError('กรุณากรอกวัตถุประสงค์ในการขอเอกสารก่อนบันทึกแบบร่าง');
      return;
    }
    try {
      localStorage.setItem(
        'hrms_cert_draft',
        JSON.stringify({
          purpose: purpose.trim(),
          selectedTypeId,
          savedAt: new Date().toISOString(),
        })
      );
      setFormError(null);
      showToast('บันทึกแบบร่างเรียบร้อยแล้ว ข้อมูลจะถูกเก็บไว้ในเครื่องของคุณ');
    } catch {
      showToast('ไม่สามารถบันทึกแบบร่างได้');
    }
  };

  // Action 3: ถัดไป (Submit Request)
  const handleSubmit = async () => {
    if (!purpose.trim()) {
      setFormError('กรุณาระบุวัตถุประสงค์ในการขอเอกสาร (เอกสารนี้ใช้สำหรับ *)');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      await certificateService.createRequest({
        certificateTypeId: Number(selectedTypeId),
        purpose: purpose.trim(),
        language: 'TH',
        notes: `วันหมดอายุเอกสาร: ${expiryDate}`,
      });

      // Clear draft
      localStorage.removeItem('hrms_cert_draft');
      setPurpose('');
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error('Error submitting certificate request:', err);
      setFormError(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการส่งคำขอหนังสือรับรอง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* เมนูย่อยในตัว — สลับไปมาระหว่าง "รายการเอกสาร" กับ "ประวัติเอกสาร" คงรูปแบบเดียวกับเอกสารการลา */}
      <DocumentsSubNav />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar with Back Button & Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          href="/documents"
          className="w-8 h-8 rounded-full bg-[#0B2046] hover:bg-[#0B2046]/85 text-white flex items-center justify-center shadow-xs transition-colors shrink-0"
          title="ย้อนกลับ"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Link href="/documents" className="hover:text-slate-600 transition-colors">
            ยื่นเอกสาร
          </Link>
          <span>/</span>
          <span className="text-slate-600 font-medium">ขอหนังสือรับรอง</span>
        </div>
      </div>

      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ขอหนังสือรับรอง</h1>
      </div>

      {/* Main Form (Exact Match with Mockup) */}
      <div className="space-y-6 animate-in fade-in duration-200">
        {formError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 flex items-start gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {/* 2-Card Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Card: ข้อมูลทั่วไป */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-xs space-y-6">
            <h2 className="text-sm font-bold text-slate-900">ข้อมูลทั่วไป</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {/* Row 1 Left: ชื่อพนักงาน */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ชื่อพนักงาน <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={employeeName}
                    placeholder="กรอกอัตโนมัติ"
                    className="w-full pl-3.5 pr-9 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none cursor-default font-medium"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Row 1 Right: วันที่ออก */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  วันที่ออก
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    placeholder="dd/mm/yyyy"
                    className="w-full pl-3.5 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] font-mono"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Row 2 Left: ประเภทหนังสือรับรอง */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ประเภทหนังสือรับรอง
                </label>
                <div className="relative">
                  <select
                    value={selectedTypeId}
                    onChange={(e) => setSelectedTypeId(Number(e.target.value))}
                    className="w-full pl-3.5 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] appearance-none font-medium cursor-pointer"
                  >
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.certificateName}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Row 2 Right: วันหมดอายุ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  วันหมดอายุ
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    placeholder="dd/mm/yyyy"
                    className="w-full pl-3.5 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] font-mono"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Card: วัตถุประสงค์ในการขอเอกสาร */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-xs space-y-6">
            <h2 className="text-sm font-bold text-slate-900">วัตถุประสงค์ในการขอเอกสาร</h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                เอกสารนี้ใช้สำหรับ <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={purpose}
                onChange={(e) => {
                  if (e.target.value.length <= 160) {
                    setPurpose(e.target.value);
                  }
                }}
                rows={5}
                placeholder="กรอกเหตุผล"
                className="w-full px-3.5 py-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] resize-none leading-relaxed"
              />
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-2xs font-mono text-slate-400">
                  {purpose.length}/160
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Centered Bottom Action Bar */}
        <div className="flex items-center justify-center gap-3 pt-10 pb-6">
          <button
            type="button"
            onClick={handlePreview}
            className="px-6 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            ดูตัวอย่าง
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            className="px-6 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            บันทึกแบบร่าง
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-8 py-2 bg-[#0B2046] hover:bg-[#0B2046]/90 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'กำลังส่งข้อมูล...' : 'ถัดไป'}
          </button>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setShowSuccessModal(false)}
          />

          <div className="relative bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-100 z-10 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              ยื่นคำขอหนังสือรับรองสำเร็จ!
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              คำขอของคุณถูกส่งไปยังฝ่ายทรัพยากรบุคคลเพื่อพิจารณาอนุมัติเรียบร้อยแล้ว คุณสามารถติดตามสถานะหรือพิมพ์เอกสารได้ในเมนูประวัติเอกสาร
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push('/documents/history');
                }}
                className="flex-1 py-2.5 bg-[#0B2046] hover:bg-[#0B2046]/90 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                ไปที่ประวัติเอกสาร
              </button>
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Preview Modal */}
      <CertificatePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewDoc(null);
        }}
        initialDoc={previewDoc}
      />
    </div>
  );
}

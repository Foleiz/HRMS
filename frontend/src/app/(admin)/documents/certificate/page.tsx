'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronDown,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  FileCheck2,
  FileText,
  Printer,
  History,
  Search,
  Loader2,
} from 'lucide-react';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useAuth } from '@/context/AuthContext';
import { CertificateRequest, CertificateType, CertificateDocument } from '@/types/certificates';
import { certificateService } from '@/services/certificateService';
import { CertificatePreviewModal } from '@/components/documents/CertificatePreviewModal';

const PURPOSE_SUGGESTIONS = [
  'เพื่อใช้ยื่นขอสินเชื่อที่อยู่อาศัยกับสถาบันการเงิน',
  'เพื่อใช้ประกอบการขอวีซ่าเดินทางต่างประเทศ',
  'เพื่อใช้สมัครเข้าศึกษาต่อในระดับอุดมศึกษา',
  'เพื่อใช้เป็นหลักฐานแสดงการทำงานและรายได้',
];

export default function CertificatePage() {
  const { setBreadcrumb } = useBreadcrumb();
  const { user } = useAuth();

  // View Mode: 'form' (default matching mockup) or 'history'
  const [viewMode, setViewMode] = useState<'form' | 'history'>('form');

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

  // Requests Data
  const [requests, setRequests] = useState<CertificateRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // History filtering & search
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'CANCELLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewRequestId, setPreviewRequestId] = useState<number | null>(null);
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

  // Load types and requests from server
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [typeList, reqList] = await Promise.all([
        certificateService.getCertificateTypes(),
        certificateService.getMyRequests(),
      ]);
      if (typeList && typeList.length > 0) {
        setTypes(typeList);
      }
      setRequests(reqList || []);
    } catch (err) {
      console.error('Error loading certificate data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    setPreviewRequestId(null);
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
      await loadData();
    } catch (err: any) {
      console.error('Error submitting certificate request:', err);
      setFormError(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการส่งคำขอหนังสือรับรอง');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel past request
  const handleCancel = async (id: number) => {
    if (!confirm('คุณต้องการยกเลิกคำขอหนังสือรับรองฉบับนี้ใช่หรือไม่?')) return;
    try {
      setCancellingId(id);
      await certificateService.cancelRequest(id);
      showToast('ยกเลิกคำขอเรียบร้อยแล้ว');
      await loadData();
    } catch (err) {
      console.error('Error cancelling certificate request:', err);
      alert('ไม่สามารถยกเลิกคำขอได้');
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const months = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
      ];
      const thaiYear = d.getFullYear() + 543;
      return `${d.getDate()} ${months[d.getMonth()]} ${thaiYear}`;
    } catch {
      return isoString;
    }
  };

  // Stats
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED' || r.status === 'ISSUED').length;
  const cancelledCount = requests.filter((r) => r.status === 'CANCELLED' || r.status === 'REJECTED').length;

  // Filtered requests in history mode
  const filteredRequests = requests.filter((r) => {
    if (activeFilter === 'PENDING' && r.status !== 'PENDING') return false;
    if (activeFilter === 'APPROVED' && r.status !== 'APPROVED' && r.status !== 'ISSUED') return false;
    if (activeFilter === 'CANCELLED' && r.status !== 'CANCELLED' && r.status !== 'REJECTED') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchType = r.certificateName?.toLowerCase().includes(q);
      const matchPurpose = r.purpose?.toLowerCase().includes(q);
      return matchType || matchPurpose;
    }
    return true;
  });

  return (
    <div className="space-y-5 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar with Back Button & Breadcrumb */}
      <div className="flex items-center justify-between">
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

        {/* View Toggle: Form vs History */}
        <button
          type="button"
          onClick={() => {
            setViewMode(viewMode === 'form' ? 'history' : 'form');
            setFormError(null);
          }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-all cursor-pointer"
        >
          {viewMode === 'form' ? (
            <>
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span>ประวัติคำขอ ({totalCount})</span>
            </>
          ) : (
            <>
              <FileCheck2 className="w-3.5 h-3.5 text-[#0B2046]" />
              <span>กลับสู่หน้าฟอร์มยื่นคำขอ</span>
            </>
          )}
        </button>
      </div>

      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ขอหนังสือรับรอง</h1>
      </div>

      {/* Mode 1: Main Form (Exact Match with Mockup) */}
      {viewMode === 'form' && (
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

                {/* Quick purpose suggestions */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {PURPOSE_SUGGESTIONS.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPurpose(s)}
                      className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-2xs text-slate-600 transition-colors cursor-pointer border border-slate-100"
                    >
                      + {s}
                    </button>
                  ))}
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
      )}

      {/* Mode 2: Request History & Printing */}
      {viewMode === 'history' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-2xs text-slate-400 block">คำขอทั้งหมด</span>
                <span className="text-base font-bold text-slate-900">{totalCount} รายการ</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-2xs text-slate-400 block">รอดำเนินการ</span>
                <span className="text-base font-bold text-amber-600">{pendingCount} รายการ</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-2xs text-slate-400 block">อนุมัติแล้ว</span>
                <span className="text-base font-bold text-emerald-600">{approvedCount} รายการ</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-2xs text-slate-400 block">ยกเลิกหรือปฏิเสธ</span>
                <span className="text-base font-bold text-slate-600">{cancelledCount} รายการ</span>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Filter Tabs */}
              <div className="flex items-center bg-slate-100/70 p-1 rounded-2xl text-xs gap-1">
                <button
                  type="button"
                  onClick={() => setActiveFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                    activeFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  ทั้งหมด ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('PENDING')}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                    activeFilter === 'PENDING'
                      ? 'bg-white text-amber-700 shadow-xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  รอดำเนินการ ({pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('APPROVED')}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                    activeFilter === 'APPROVED'
                      ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  อนุมัติแล้ว ({approvedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('CANCELLED')}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                    activeFilter === 'CANCELLED'
                      ? 'bg-white text-slate-700 shadow-xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  ยกเลิก ({cancelledCount})
                </button>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาตามวัตถุประสงค์..."
                  className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0B2046]" />
                  <p className="text-xs">กำลังโหลดรายการคำขอ...</p>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <FileCheck2 className="w-10 h-10 text-slate-300" />
                  <p className="text-xs">ไม่พบรายการคำขอหนังสือรับรอง</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold">
                      <th className="py-3 px-5">วันที่ยื่นคำขอ</th>
                      <th className="py-3 px-5">ประเภทหนังสือรับรอง</th>
                      <th className="py-3 px-5">วัตถุประสงค์</th>
                      <th className="py-3 px-5">สถานะ</th>
                      <th className="py-3 px-5">วันที่ออกเอกสาร</th>
                      <th className="py-3 px-5 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredRequests.map((req) => {
                      const isApproved = req.status === 'APPROVED' || req.status === 'ISSUED';
                      const isPending = req.status === 'PENDING';
                      const isCancelled = req.status === 'CANCELLED';
                      const isRejected = req.status === 'REJECTED';

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-5 font-mono text-slate-600">
                            {formatDate(req.requestedAt)}
                          </td>
                          <td className="py-3.5 px-5">
                            <span className="font-semibold text-slate-900 block">
                              {req.certificateName}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 max-w-xs">
                            <span className="text-slate-600 block truncate" title={req.purpose}>
                              {req.purpose || '-'}
                            </span>
                          </td>
                          <td className="py-3.5 px-5">
                            {isApproved ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                อนุมัติแล้ว
                              </span>
                            ) : isPending ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3" />
                                รอดำเนินการ
                              </span>
                            ) : isRejected ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3 h-3" />
                                ไม่อนุมัติ
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold bg-slate-100 text-slate-600">
                                ยกเลิกแล้ว
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-slate-500 font-mono">
                            {req.issuedAt ? formatDate(req.issuedAt) : '-'}
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <div className="inline-flex items-center gap-2">
                              {isApproved && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreviewDoc(null);
                                    setPreviewRequestId(req.id);
                                    setIsPreviewOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-2xs font-semibold shadow-xs transition-colors cursor-pointer"
                                >
                                  <Printer className="w-3 h-3" />
                                  ดูเอกสารและพิมพ์
                                </button>
                              )}

                              {req.canCancel && (
                                <button
                                  type="button"
                                  onClick={() => handleCancel(req.id)}
                                  disabled={cancellingId === req.id}
                                  className="px-2.5 py-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-2xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {cancellingId === req.id ? 'กำลังยกเลิก...' : 'ยกเลิกคำขอ'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

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
              คำขอของคุณถูกส่งไปยังฝ่ายทรัพยากรบุคคลเพื่อพิจารณาอนุมัติแล้ว คุณสามารถติดตามสถานะหรือพิมพ์เอกสารได้ในเมนูประวัติคำขอ
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  setViewMode('history');
                }}
                className="flex-1 py-2.5 bg-[#0B2046] hover:bg-[#0B2046]/90 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                ดูประวัติคำขอ
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
          setPreviewRequestId(null);
          setPreviewDoc(null);
        }}
        requestId={previewRequestId}
        initialDoc={previewDoc}
      />
    </div>
  );
}

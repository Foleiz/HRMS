'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Save,
  Eye,
  Loader2,
} from 'lucide-react';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useAuth } from '@/context/AuthContext';
import { CertificateType, CertificateDocument } from '@/types/certificates';
import { certificateService } from '@/services/certificateService';
import { leaveService } from '@/services/leaveService';
import { CertificatePreviewModal } from '@/components/documents/CertificatePreviewModal';
import { DocumentsSubNav } from '@/components/documents/DocumentsSubNav';
import { LeaveDateRangePicker } from '@/components/leave/LeaveDateRangePicker';

const REASON_MAX_LENGTH = 160;
const NOTES_MAX_LENGTH = 225;

// แปลง Date -> string 'YYYY-MM-DD' ตามเวลาท้องถิ่น
const toInputDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// แปลง 'YYYY-MM-DD' -> แสดงผล 'dd/mm/yyyy' (พ.ศ.)
const formatThaiShort = (s: string): string => {
  if (!s) return '-';
  const parts = s.split('-');
  if (parts.length !== 3) return s;
  const [y, m, d] = parts.map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

export default function CertificatePage() {
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();
  const { user } = useAuth();

  // Employee Profile
  const [profile, setProfile] = useState({
    fullName: user?.fullName || 'วรเมธ รัตนเสถียร',
    positionTitle: 'วิศวกรซอฟต์แวร์อาวุโส',
    departmentName: 'แผนกพัฒนาซอฟต์แวร์',
  });

  // Form Fields
  const [types, setTypes] = useState<CertificateType[]>([
    { id: 1, certificateCode: 'CERT_SALARY', certificateName: 'หนังสือรับรองเงินเดือน' },
    { id: 2, certificateCode: 'CERT_WORK', certificateName: 'หนังสือรับรองการทำงาน' },
    { id: 3, certificateCode: 'CERT_VISA', certificateName: 'หนังสือรับรองการทำงานเพื่อขอวีซ่า' },
  ]);
  const [selectedTypeId, setSelectedTypeId] = useState<number | ''>('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'TH' | 'EN'>('TH');

  // Dates in 'YYYY-MM-DD' format (compatible with LeaveDateRangePicker)
  const [issueDate, setIssueDate] = useState(() => toInputDate(new Date()));
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return toInputDate(d);
  });

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<CertificateDocument | null>(null);

  // Initialize breadcrumb & load saved draft
  useEffect(() => {
    setBreadcrumb({ section: 'ยื่นเอกสาร', page: 'ขอหนังสือรับรอง' });

    try {
      const savedDraft = localStorage.getItem('hrms_cert_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.purpose) setPurpose(parsed.purpose);
        if (parsed.selectedTypeId) setSelectedTypeId(parsed.selectedTypeId);
        if (parsed.notes) setNotes(parsed.notes);
        if (parsed.language) setSelectedLanguage(parsed.language);
        if (parsed.issueDate) setIssueDate(parsed.issueDate);
        if (parsed.expiryDate) setExpiryDate(parsed.expiryDate);
      }
    } catch {
      // Ignore
    }

    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  // Load types & profile
  const loadInitialData = useCallback(async () => {
    try {
      const [typeList, balances] = await Promise.allSettled([
        certificateService.getCertificateTypes(),
        user?.employeeId
          ? leaveService.getLeaveBalances({ employeeId: user.employeeId, year: new Date().getFullYear() })
          : Promise.resolve([]),
      ]);

      if (typeList.status === 'fulfilled' && typeList.value.length > 0) {
        setTypes(typeList.value);
        if (!selectedTypeId) {
          setSelectedTypeId(typeList.value[0].id);
        }
      }

      if (balances.status === 'fulfilled' && balances.value.length > 0) {
        setProfile({
          fullName: user?.fullName || 'วรเมธ รัตนเสถียร',
          positionTitle: balances.value[0]?.positionTitle || 'วิศวกรซอฟต์แวร์อาวุโส',
          departmentName: balances.value[0]?.departmentName || 'แผนกพัฒนาซอฟต์แวร์',
        });
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  }, [user?.employeeId, user?.fullName, selectedTypeId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Show Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Reset form
  const handleResetForm = () => {
    setPurpose('');
    setNotes('');
    if (types.length > 0) setSelectedTypeId(types[0].id);
    setSelectedLanguage('TH');
    setIssueDate(toInputDate(new Date()));
    const d = new Date();
    d.setDate(d.getDate() + 90);
    setExpiryDate(toInputDate(d));
    setFormError(null);
    localStorage.removeItem('hrms_cert_draft');
    showToast('ล้างข้อมูลในแบบฟอร์มเรียบร้อยแล้ว');
  };

  // Action 1: ดูตัวอย่าง (Preview)
  const handlePreview = () => {
    const currentType = types.find((t) => t.id === Number(selectedTypeId)) || types[0];
    const previewData: CertificateDocument = {
      requestId: 0,
      documentNumber: 'CERT-ตัวอย่างแบบร่าง',
      issueDate: issueDate ? new Date(issueDate).toISOString() : new Date().toISOString(),
      language: selectedLanguage,
      certificateCode: currentType?.certificateCode || 'CERT_SALARY',
      certificateTitle: currentType?.certificateName || 'หนังสือรับรองเงินเดือน',
      companyName: 'บริษัท ฟิวเจอร์ เทค คอร์ปอเรชั่น จำกัด (มหาชน)',
      companyAddress: 'เลขที่ 123 อาคารซอฟต์แวร์ปาร์ค ชั้น 15 ถนนแจ้งวัฒนะ ตำบลคลองเกลือ อำเภอปากเกร็ด จังหวัดนนทบุรี 11120',
      companyPhone: '02-999-8888',
      companyEmail: 'hr@futuretech.co.th',
      employeeId: user?.employeeId || 1,
      employeeCode: user?.employeeCode || 'EMP001',
      fullName: profile.fullName,
      citizenIdMasked: '1-1002-XXXXX-XX-1',
      positionName: profile.positionTitle,
      departmentName: profile.departmentName,
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
  const handleSaveDraft = async () => {
    if (!purpose.trim()) {
      setFormError('กรุณากรอกวัตถุประสงค์ในการขอเอกสารก่อนบันทึกแบบร่าง');
      return;
    }
    setSavingDraft(true);
    try {
      localStorage.setItem(
        'hrms_cert_draft',
        JSON.stringify({
          purpose: purpose.trim(),
          selectedTypeId,
          notes: notes.trim(),
          language: selectedLanguage,
          issueDate,
          expiryDate,
          savedAt: new Date().toISOString(),
        })
      );
      setFormError(null);
      showToast('บันทึกแบบร่างสำเร็จ');
    } catch {
      showToast('ไม่สามารถบันทึกแบบร่างได้');
    } finally {
      setSavingDraft(false);
    }
  };

  // Action 3: ยื่นคำขอ (Submit Request)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTypeId) {
      setFormError('กรุณาเลือกประเภทหนังสือรับรอง');
      return;
    }
    if (!purpose.trim()) {
      setFormError('กรุณาระบุวัตถุประสงค์ในการขอเอกสาร (เอกสารนี้ใช้สำหรับ *)');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      const remarks = [
        notes.trim() ? `หมายเหตุ: ${notes.trim()}` : null,
        `วันหมดอายุเอกสาร: ${formatThaiShort(expiryDate)}`,
      ].filter(Boolean).join(' | ');

      await certificateService.createRequest({
        certificateTypeId: Number(selectedTypeId),
        purpose: purpose.trim(),
        language: selectedLanguage,
        notes: remarks || undefined,
      });

      // Clear draft
      localStorage.removeItem('hrms_cert_draft');
      setPurpose('');
      setNotes('');
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

      {/* Page Header (เหมือนหน้าเอกสารการลา) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">ขอหนังสือรับรอง</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            กรอกแบบฟอร์มยื่นขอหนังสือรับรองเงินเดือนและการทำงาน ติดตามสถานะได้ที่หน้าประวัติเอกสาร
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetForm}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl text-sm font-medium transition-all shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          ล้างฟอร์ม
        </button>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 text-white rounded-xl text-sm shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Form Card (รูปแบบและพื้นหลังเหมือน MyLeaveRequestForm) */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-7">
        {formError && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
          {/* ─── คอลัมน์ซ้าย: ข้อมูลทั่วไป & ประเภทหนังสือรับรอง ─── */}
          <div className="space-y-5">
            {/* กล่องข้อมูลทั่วไป 4 ช่อง */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">ข้อมูลทั่วไป</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">วันที่ยื่น</label>
                  <input
                    type="text"
                    readOnly
                    value={formatThaiShort(issueDate)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600 cursor-not-allowed font-mono"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">ชื่อ-นามสกุล</label>
                  <input
                    type="text"
                    readOnly
                    value={profile.fullName}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">ตำแหน่ง</label>
                  <input
                    type="text"
                    readOnly
                    value={profile.positionTitle || '-'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">แผนก/สังกัด</label>
                  <input
                    type="text"
                    readOnly
                    value={profile.departmentName || '-'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* ประเภทหนังสือรับรอง */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                ประสงค์ขอรับรอง *
              </label>
              <select
                value={selectedTypeId}
                onChange={(e) => setSelectedTypeId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                required
              >
                <option value="">-- เลือกประเภทหนังสือรับรอง --</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.certificateName}
                  </option>
                ))}
              </select>
            </div>

            {/* วัตถุประสงค์ในการขอเอกสาร (เหตุผล) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  วัตถุประสงค์ในการขอเอกสาร *
                </label>
                <span className="text-2xs text-gray-400 font-mono">
                  {purpose.length}/{REASON_MAX_LENGTH}
                </span>
              </div>
              <textarea
                value={purpose}
                maxLength={REASON_MAX_LENGTH}
                onChange={(e) => setPurpose(e.target.value)}
                rows={3}
                placeholder="ระบุวัตถุประสงค์ในการขอเอกสาร (เช่น เพื่อใช้ยื่นขอสินเชื่อที่อยู่อาศัย...)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                required
              />
            </div>
          </div>

          {/* ─── คอลัมน์ขวา: วันที่ออก, วันหมดอายุ, ภาษา, หมายเหตุ ─── */}
          <div className="space-y-5">
            {/* วันที่ออก & รูปแบบภาษา (ใช้ LeaveDateRangePicker เหมือนหน้ายื่นการลา) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">วันที่ออก *</label>
                <LeaveDateRangePicker
                  mode="single"
                  className="w-full"
                  startDate={issueDate}
                  endDate={issueDate}
                  onChange={(d) => {
                    setIssueDate(d);
                    if (d) {
                      const [y, m, day] = d.split('-').map(Number);
                      const nextExp = new Date(y, m - 1, day + 90);
                      setExpiryDate(toInputDate(nextExp));
                    }
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">รูปแบบภาษา</label>
                <div className="inline-flex rounded-xl border border-gray-200 p-1 bg-gray-50 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedLanguage('TH')}
                    className={`flex-1 sm:flex-initial inline-flex items-center justify-center px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      selectedLanguage === 'TH'
                        ? 'bg-[#0B2046] text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    ภาษาไทย
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLanguage('EN')}
                    className={`flex-1 sm:flex-initial inline-flex items-center justify-center px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      selectedLanguage === 'EN'
                        ? 'bg-[#0B2046] text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    ฉบับสากล (EN)
                  </button>
                </div>
              </div>
            </div>

            {/* วันหมดอายุ (ใช้ LeaveDateRangePicker เหมือนหน้ายื่นการลา) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                วันหมดอายุ (มีผลบังคับใช้)
              </label>
              <LeaveDateRangePicker
                mode="single"
                className="w-full"
                startDate={expiryDate}
                endDate={expiryDate}
                onChange={(d) => setExpiryDate(d)}
              />
            </div>

            {/* หมายเหตุเพิ่มเติม (โครงสร้างเดียวกับ ระหว่างลาจะติดต่อข้าพเจ้าได้ที่) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  หมายเหตุเพิ่มเติม (ถ้ามี)
                </label>
                <span className="text-2xs text-gray-400 font-mono">
                  {notes.length}/{NOTES_MAX_LENGTH}
                </span>
              </div>
              <textarea
                value={notes}
                maxLength={NOTES_MAX_LENGTH}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="ระบุข้อมูลเพิ่มเติมถึงฝ่ายบุคคล..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
              />
            </div>
          </div>
        </div>

        {/* ─── Actions (ชิดขวาตามแบบฟอร์มเอกสารการลา) ─── */}
        <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={handlePreview}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            ดูตัวอย่าง
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || isSubmitting}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            {savingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            บันทึกแบบร่าง
          </button>
          <button
            type="submit"
            disabled={isSubmitting || savingDraft}
            className="px-6 py-2.5 text-sm font-medium text-white bg-[#0B2046] hover:bg-[#0B2046]/90 rounded-xl transition-colors flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            ยื่นขอหนังสือรับรอง
          </button>
        </div>
      </form>

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

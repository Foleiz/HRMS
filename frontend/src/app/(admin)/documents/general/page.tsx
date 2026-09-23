'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Save,
  Eye,
  Loader2,
  Paperclip,
  Upload,
  X,
  FileText,
  Send,
} from 'lucide-react';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useAuth } from '@/context/AuthContext';
import { DocumentsSubNav } from '@/components/documents/DocumentsSubNav';
import { LeaveDateRangePicker } from '@/components/leave/LeaveDateRangePicker';
import { leaveService } from '@/services/leaveService';
import { generalDocumentService } from '@/services/generalDocumentService';
import { COMMON_DOCUMENT_TYPES } from '@/types/generalDocument';
import { GeneralDocumentPreviewModal } from '@/components/documents/GeneralDocumentPreviewModal';
import { toast } from '@/context/ToastContext';

const REASON_MAX_LENGTH = 160;
const NOTES_MAX_LENGTH = 200;

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

export default function GeneralDocumentPage() {
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Employee Profile
  const [profile, setProfile] = useState({
    fullName: user?.fullName || 'วรเมธ รัตนเสถียร',
    employeeCode: user?.employeeCode || 'EMP001',
    positionTitle: 'วิศวกรซอฟต์แวร์อาวุโส',
    departmentName: 'แผนกพัฒนาซอฟต์แวร์',
  });

  // Form Fields (ตาม Figma)
  const [issueDate, setIssueDate] = useState(() => toInputDate(new Date()));
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return toInputDate(d);
  });
  const [documentType, setDocumentType] = useState<string>(COMMON_DOCUMENT_TYPES[0]);
  const [customDocumentType, setCustomDocumentType] = useState('');
  const [isCustomType, setIsCustomType] = useState(false);

  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');

  // ไฟล์แนบ (แนบเอกสาร ตามกล่องสีเหลืองใน Figma)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Sync breadcrumb & Load saved draft
  useEffect(() => {
    setBreadcrumb({ section: 'ยื่นเอกสาร', page: 'เอกสารทั่วไป' });

    try {
      const savedDraft = localStorage.getItem('hrms_general_doc_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.documentType) {
          setDocumentType(parsed.documentType);
          if (!COMMON_DOCUMENT_TYPES.includes(parsed.documentType as any)) {
            setIsCustomType(true);
            setCustomDocumentType(parsed.documentType);
          }
        }
        if (parsed.purpose) setPurpose(parsed.purpose);
        if (parsed.notes) setNotes(parsed.notes);
        if (parsed.issueDate) setIssueDate(parsed.issueDate);
        if (parsed.expiryDate) setExpiryDate(parsed.expiryDate);
      }
    } catch {
      // Ignore
    }

    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  // โหลดข้อมูลโปรไฟล์พนักงาน
  const loadInitialData = useCallback(async () => {
    try {
      if (user?.employeeId) {
        const balances = await leaveService.getLeaveBalances({
          employeeId: user.employeeId,
          year: new Date().getFullYear(),
        });
        if (balances && balances.length > 0) {
          setProfile({
            fullName: user?.fullName || 'วรเมธ รัตนเสถียร',
            employeeCode: user?.employeeCode || 'EMP001',
            positionTitle: balances[0]?.positionTitle || 'วิศวกรซอฟต์แวร์อาวุโส',
            departmentName: balances[0]?.departmentName || 'แผนกพัฒนาซอฟต์แวร์',
          });
        }
      }
    } catch (err) {
      console.error('Error loading employee profile:', err);
    }
  }, [user?.employeeId, user?.fullName, user?.employeeCode]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Toast Notification Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // จัดการการเลือกไฟล์
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setFormError('ขนาดไฟล์ต้องไม่เกิน 10 MB');
        return;
      }
      setSelectedFile(file);
      setFormError(null);
      showToast(`เลือกไฟล์ "${file.name}" เรียบร้อยแล้ว`);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ล้างฟอร์ม
  const handleResetForm = () => {
    setDocumentType(COMMON_DOCUMENT_TYPES[0]);
    setCustomDocumentType('');
    setIsCustomType(false);
    setPurpose('');
    setNotes('');
    setIssueDate(toInputDate(new Date()));
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    setExpiryDate(toInputDate(d));
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFormError(null);
    localStorage.removeItem('hrms_general_doc_draft');
    showToast('ล้างข้อมูลในแบบฟอร์มเรียบร้อยแล้ว');
  };

  // บันทึกแบบร่าง
  const handleSaveDraft = async () => {
    if (!purpose.trim()) {
      setFormError('กรุณากรอกเหตุผลหรือวัตถุประสงค์ก่อนบันทึกแบบร่าง');
      return;
    }
    setSavingDraft(true);
    try {
      const finalDocType = isCustomType ? customDocumentType.trim() || 'เอกสารทั่วไป' : documentType;
      localStorage.setItem(
        'hrms_general_doc_draft',
        JSON.stringify({
          documentType: finalDocType,
          purpose: purpose.trim(),
          notes: notes.trim(),
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

  // ยื่นคำร้องเอกสารทั่วไป
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalDocType = isCustomType ? customDocumentType.trim() : documentType;
    if (!finalDocType) {
      setFormError('กรุณาระบุประเภทเอกสาร');
      return;
    }
    if (!purpose.trim()) {
      setFormError('กรุณาระบุวัตถุประสงค์ (เอกสารนี้ใช้สำหรับ *)');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      await generalDocumentService.createRequest(
        {
          documentType: finalDocType,
          issueDate,
          expiryDate: expiryDate || undefined,
          purpose: purpose.trim(),
          notes: notes.trim() || undefined,
          fileName: selectedFile?.name,
        },
        {
          id: user?.employeeId || 1,
          name: profile.fullName,
          code: profile.employeeCode,
          dept: profile.departmentName,
          pos: profile.positionTitle,
        }
      );

      // Clear draft
      localStorage.removeItem('hrms_general_doc_draft');
      setPurpose('');
      setNotes('');
      setSelectedFile(null);
      toast.success('ยื่นคำร้องเอกสารทั่วไปสำเร็จ ติดตามสถานะได้ที่หน้านี้');
      router.push('/documents/history');
    } catch (err: any) {
      console.error('Error submitting general document request:', err);
      setFormError(err?.message || 'เกิดข้อผิดพลาดในการยื่นคำร้องเอกสารทั่วไป');
    } finally {
      setIsSubmitting(false);
    }
  };

  const finalDocumentTypeDisplay = isCustomType
    ? customDocumentType || 'เอกสารทั่วไป'
    : documentType;

  return (
    <div className="space-y-6 pb-12">
      {/* เมนูย่อยในตัว — สลับไปมาระหว่าง "รายการเอกสาร" กับ "ประวัติเอกสาร" คงรูปแบบเดียวกับระบบทั้งหมด */}
      <DocumentsSubNav />

      {/* Page Header (รูปแบบเดียวกับเมนูอื่นๆ) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">เอกสารทั่วไป</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            กรอกแบบฟอร์มยื่นคำร้องขอเอกสารทั่วไปและแนบหลักฐานประกอบ ติดตามสถานะได้ที่หน้าประวัติเอกสาร
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

      {/* Main Form (ออกแบบตาม Figma เป๊ะๆ: ข้อมูลทั่วไป + แนบเอกสารสีเหลืองอ่อนทางซ้าย, รายละเอียดทางขวา) */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {formError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ─── ฝั่งซ้าย: ข้อมูลทั่วไป & กล่องแนบเอกสาร (ตาม Figma) ─── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h3 className="text-sm font-bold text-gray-900">ข้อมูลทั่วไป</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* ชื่อพนักงาน * (กรอกอัตโนมัติตาม Figma) */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">ชื่อพนักงาน *</label>
                <input
                  type="text"
                  readOnly
                  value={profile.fullName}
                  placeholder="กรอกอัตโนมัติ"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-100/70 text-sm text-gray-700 cursor-not-allowed font-medium"
                />
              </div>

              {/* วันที่ออก (ใช้ปฏิทิน LeaveDateRangePicker ตามคำสั่งผู้ใช้) */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">วันที่ออก</label>
                <LeaveDateRangePicker
                  mode="single"
                  className="w-full"
                  startDate={issueDate}
                  endDate={issueDate}
                  onChange={(d) => setIssueDate(d)}
                />
              </div>

              {/* ประเภทเอกสาร (เช่น สำเนาบัตรประชาชน ตาม Figma) */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">ประเภทเอกสาร *</label>
                {!isCustomType ? (
                  <select
                    value={documentType}
                    onChange={(e) => {
                      if (e.target.value === 'CUSTOM') {
                        setIsCustomType(true);
                      } else {
                        setDocumentType(e.target.value);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                  >
                    {COMMON_DOCUMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                    <option value="CUSTOM">+ ระบุประเภทอื่น ๆ ด้วยตนเอง</option>
                  </select>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={customDocumentType}
                      onChange={(e) => setCustomDocumentType(e.target.value)}
                      placeholder="เช่น สำเนาบัตรประชาชน"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setIsCustomType(false)}
                      className="px-2.5 py-2.5 text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded-xl"
                      title="เลือกจากรายการเดิม"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* วันหมดอายุ */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">วันหมดอายุ</label>
                <LeaveDateRangePicker
                  mode="single"
                  className="w-full"
                  startDate={expiryDate}
                  endDate={expiryDate}
                  onChange={(d) => setExpiryDate(d)}
                />
              </div>
            </div>

            {/* กล่องแนบเอกสาร (สีเหลืองอ่อนพาสเทลตาม Figma: bg-amber-50 / bg-[#FEF9C3]) */}
            <div className="bg-[#FEF9C3]/80 border border-[#FDE047] rounded-2xl p-5 space-y-3">
              <div>
                <h4 className="text-sm font-bold text-gray-900">แนบเอกสาร</h4>
                <p className="text-xs text-gray-600 mt-0.5">กรุณาแนบเอกสารด้านล่างนี้</p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-white p-2 rounded-xl border border-amber-200">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  เลือกไฟล์
                </button>
                <div className="flex-1 px-2 py-1 text-xs text-gray-500 truncate flex items-center justify-between">
                  <span className="truncate">
                    {selectedFile ? (
                      <span className="text-gray-800 font-medium flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-blue-500" />
                        {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                      </span>
                    ) : (
                      'ยังไม่มีไฟล์ที่ถูกเลือก'
                    )}
                  </span>
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={handleClearFile}
                      className="p-1 text-gray-400 hover:text-rose-500 rounded-md"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-2xs text-gray-500">รองรับไฟล์ PDF, JPG, PNG ขนาดไม่เกิน 10MB</p>
            </div>
          </div>

          {/* ─── ฝั่งขวา: รายละเอียดของเอกสาร (ตาม Figma) ─── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900">รายละเอียดของเอกสาร</h3>

              {/* เอกสารนี้ใช้สำหรับ * (Textarea ตาม Figma พร้อม counter 0/160) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    เอกสารนี้ใช้สำหรับ *
                  </label>
                  <span className="text-2xs text-gray-400 font-mono">
                    {purpose.length}/{REASON_MAX_LENGTH}
                  </span>
                </div>
                <textarea
                  value={purpose}
                  maxLength={REASON_MAX_LENGTH}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={5}
                  placeholder="กรอกเหตุผล..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                  required
                />
              </div>

              {/* หมายเหตุเพิ่มเติม */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-gray-500">
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
                  placeholder="ระบุข้อมูลเพิ่มเติมถึงเจ้าหน้าที่ฝ่ายบุคคล..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ─── แถบปุ่มสั่งการด้านล่าง (ตาม Figma และตามสไตล์เมนูอื่นๆ: ดูตัวอย่าง / บันทึกแบบร่าง / ถัดไป-ยื่นคำขอ) ─── */}
        <div className="flex items-center justify-center sm:justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            <Eye className="w-4 h-4 text-gray-500" />
            ดูตัวอย่าง
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || isSubmitting}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {savingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-gray-500" />}
            บันทึกแบบร่าง
          </button>
          <button
            type="submit"
            disabled={isSubmitting || savingDraft}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-[#0B2046] hover:bg-[#0B2046]/90 rounded-xl transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            ถัดไป (ยื่นคำร้องเอกสารทั่วไป)
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
              ยื่นคำร้องเอกสารทั่วไปสำเร็จ!
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              คำร้องขอเอกสารของคุณถูกบันทึกและส่งต่อไปยังฝ่ายบุคคลเรียบร้อยแล้ว คุณสามารถติดตามสถานะได้ในเมนูประวัติเอกสาร
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

      {/* General Document Preview Modal */}
      <GeneralDocumentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        data={{
          employeeName: profile.fullName,
          employeeCode: profile.employeeCode,
          positionTitle: profile.positionTitle,
          departmentName: profile.departmentName,
          issueDate: formatThaiShort(issueDate),
          expiryDate: expiryDate ? formatThaiShort(expiryDate) : undefined,
          documentType: finalDocumentTypeDisplay,
          purpose: purpose || 'ยังไม่ได้ระบุวัตถุประสงค์',
          notes: notes || undefined,
          fileName: selectedFile?.name,
        }}
      />
    </div>
  );
}

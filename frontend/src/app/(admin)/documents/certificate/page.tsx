'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Save,
  Eye,
  Loader2,
} from 'lucide-react';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useAuth } from '@/context/AuthContext';
import { CertificateType } from '@/types/certificates';
import { certificateService } from '@/services/certificateService';
import { leaveService } from '@/services/leaveService';
import { CertificatePreviewModal } from '@/components/documents/CertificatePreviewModal';
import { DocumentsSubNav } from '@/components/documents/DocumentsSubNav';
import { LeaveDateRangePicker } from '@/components/leave/LeaveDateRangePicker';
import { toast } from '@/context/ToastContext';

const REASON_MAX_LENGTH = 160;
const NOTES_MAX_LENGTH = 225;
const CARD = 'bg-white rounded-2xl border border-gray-100 shadow-sm p-6';
const READONLY_INPUT =
  'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600 cursor-not-allowed';
const TEXTAREA =
  'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none whitespace-pre-wrap break-words [overflow-wrap:anywhere] overflow-x-hidden';

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
    fullName: user?.fullName || '',
    positionTitle: '',
    departmentName: '',
  });

  // Form Fields
  const [types, setTypes] = useState<CertificateType[]>([]);
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
          fullName: user?.fullName || '',
          positionTitle: balances.value[0]?.positionTitle || '',
          departmentName: balances.value[0]?.departmentName || '',
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

  const selectedType = types.find((t) => t.id === Number(selectedTypeId));
  const includeSalary = !!selectedType?.certificateCode?.toUpperCase().includes('SALARY');
  const validDays = (() => {
    if (!issueDate || !expiryDate) return null;
    const diff = Math.round((new Date(expiryDate).getTime() - new Date(issueDate).getTime()) / 86400000);
    return diff >= 0 ? diff : null;
  })();

  // Action 1: ดูตัวอย่าง (Preview) — ดึงหนังสือรับรองจริงของผู้ใช้จาก API (ยังไม่บันทึกลงระบบ)
  const handlePreview = () => {
    if (!selectedTypeId) {
      setFormError('กรุณาเลือกประเภทหนังสือรับรองก่อนดูตัวอย่าง');
      return;
    }
    setFormError(null);
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
      toast.success('ยื่นขอหนังสือรับรองสำเร็จ ติดตามสถานะได้ที่หน้านี้');
      router.push('/documents/history');
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

      {/* Main Form — การ์ดแยกซ้าย/ขวา กว้างและสูงเท่ากัน (รูปแบบเดียวกับฟอร์มยื่นใบลา) */}
      <form onSubmit={handleSubmit}>
        {formError && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          {/* ─── คอลัมน์ซ้าย ─── */}
          <div className="flex flex-col gap-5">
            <div className={CARD}>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">ข้อมูลทั่วไป</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">วันที่ยื่น</label>
                  <input type="text" readOnly value={formatThaiShort(toInputDate(new Date()))} className={READONLY_INPUT} />
                </div>
              </div>
            </div>

            <div className={CARD}>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">ข้อมูลพนักงาน</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">ชื่อ-นามสกุล</label>
                  <input type="text" readOnly value={profile.fullName || '-'} className={READONLY_INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">ตำแหน่ง</label>
                  <input type="text" readOnly value={profile.positionTitle || '-'} className={READONLY_INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">แผนก/สังกัด</label>
                  <input type="text" readOnly value={profile.departmentName || '-'} className={READONLY_INPUT} />
                </div>
              </div>
            </div>

            <div className={`${CARD} flex-1 space-y-5`}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ประสงค์ขอรับรอง *</label>
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

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">วัตถุประสงค์ในการขอเอกสาร *</label>
                  <span className="text-2xs text-gray-400 font-mono">
                    {purpose.length}/{REASON_MAX_LENGTH}
                  </span>
                </div>
                <textarea
                  value={purpose}
                  maxLength={REASON_MAX_LENGTH}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={3}
                  placeholder="เช่น เพื่อใช้ประกอบการขอสินเชื่อที่อยู่อาศัย, เพื่อใช้ประกอบการขอวีซ่า"
                  className={TEXTAREA}
                  required
                />
                <p className="mt-1 text-2xs text-gray-400">ข้อความนี้จะแสดงในหนังสือรับรอง: “หนังสือรับรองฉบับนี้ออกให้เพื่อ...”</p>
              </div>
            </div>
          </div>

          {/* ─── คอลัมน์ขวา ─── */}
          <div className={`${CARD} h-full flex flex-col gap-5`}>
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
                <div className="flex rounded-xl border border-gray-200 p-1 bg-gray-50 w-full">
                  {(['TH', 'EN'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setSelectedLanguage(l)}
                      className={`flex-1 inline-flex items-center justify-center px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        selectedLanguage === l ? 'bg-[#0B2046] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      {l === 'TH' ? 'ภาษาไทย' : 'ฉบับสากล (EN)'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">วันหมดอายุ (มีผลบังคับใช้)</label>
              <LeaveDateRangePicker
                mode="single"
                className="w-full"
                startDate={expiryDate}
                endDate={expiryDate}
                onChange={(d) => setExpiryDate(d)}
              />
            </div>

            {/* สรุปสิ่งที่จะปรากฏในหนังสือรับรอง (รูปแบบเดียวกับกล่องสถิติโควตาในหน้าการลา) */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <p className="text-xs font-semibold text-blue-700 mb-3">
                ข้อมูลในหนังสือรับรอง{selectedType ? ` (${selectedType.certificateName})` : ''}
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white rounded-lg py-2.5 border border-blue-100/70">
                  <div className="text-[11px] text-gray-400">ภาษา</div>
                  <div className="text-sm font-bold text-gray-800">{selectedLanguage === 'TH' ? 'ไทย' : 'อังกฤษ'}</div>
                </div>
                <div className="bg-white rounded-lg py-2.5 border border-blue-100/70">
                  <div className="text-[11px] text-gray-400">อัตราเงินเดือน</div>
                  <div className="text-sm font-bold text-gray-800">{selectedType ? (includeSalary ? 'แสดง' : 'ไม่แสดง') : '-'}</div>
                </div>
                <div className="bg-white rounded-lg py-2.5 border border-blue-100/70">
                  <div className="text-[11px] text-gray-400">อายุเอกสาร</div>
                  <div className="text-sm font-bold text-gray-800">{validDays != null ? `${validDays} วัน` : '-'}</div>
                </div>
              </div>
              <p className="mt-3 text-xs text-blue-700/80">
                ชื่อ ตำแหน่ง วันที่เริ่มงาน อายุงาน{includeSalary ? ' และเงินเดือน' : ''} ดึงจากระบบอัตโนมัติ — กด “ดูตัวอย่าง” เพื่อตรวจสอบก่อนยื่น
              </p>
            </div>

            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">หมายเหตุเพิ่มเติม (ถ้ามี)</label>
                <span className="text-2xs text-gray-400 font-mono">
                  {notes.length}/{NOTES_MAX_LENGTH}
                </span>
              </div>
              <textarea
                value={notes}
                maxLength={NOTES_MAX_LENGTH}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="ระบุข้อมูลเพิ่มเติมถึงฝ่ายบุคคล เช่น ต้องการ 2 ฉบับ"
                className={`${TEXTAREA} flex-1 min-h-[72px]`}
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
        onClose={() => setIsPreviewOpen(false)}
        previewParams={selectedTypeId ? { certificateTypeId: Number(selectedTypeId), purpose: purpose.trim() } : null}
        initialLang={selectedLanguage}
      />
    </div>
  );
}

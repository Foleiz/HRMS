'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Save,
  Eye,
  Loader2,
  Clock,
  Building2,
  User,
  Calendar,
  Send,
} from 'lucide-react';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useAuth } from '@/context/AuthContext';
import { DocumentsSubNav } from '@/components/documents/DocumentsSubNav';
import { LeaveDateRangePicker } from '@/components/leave/LeaveDateRangePicker';
import { leaveService } from '@/services/leaveService';
import { resignationService } from '@/services/resignationService';
import { RESIGNATION_REASON_CATEGORIES } from '@/types/resignation';
import { ResignationPreviewModal } from '@/components/documents/ResignationPreviewModal';

const REASON_MAX_LENGTH = 160;
const HANDOVER_MAX_LENGTH = 250;
const CONTACT_MAX_LENGTH = 150;

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

export default function ResignationPage() {
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();
  const { user } = useAuth();

  // Employee Profile
  const [profile, setProfile] = useState({
    fullName: user?.fullName || 'วรเมธ รัตนเสถียร',
    employeeCode: user?.employeeCode || 'EMP001',
    positionTitle: 'วิศวกรซอฟต์แวร์อาวุโส',
    departmentName: 'แผนกพัฒนาซอฟต์แวร์',
  });

  // วันที่ยื่นคำขอ (วันนี้)
  const [submissionDate, setSubmissionDate] = useState(() => toInputDate(new Date()));

  // ช่อง "เรียน" ตาม Figma
  const [addressedTo, setAddressedTo] = useState('กรรมการผู้จัดการบริษัท ไฮอโค่ว จำกัด');

  // คำนำหน้า (นาย / นาง / นางสาว) ตาม Figma
  const [titlePrefix, setTitlePrefix] = useState<'นาย' | 'นาง' | 'นางสาว'>('นาย');

  // Form Fields
  const [reasonCategory, setReasonCategory] = useState<string>(RESIGNATION_REASON_CATEGORIES[0].value);
  const [reasonDetail, setReasonDetail] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [contactAfterResignation, setContactAfterResignation] = useState('');

  // วันที่ทำงานวันสุดท้าย (เริ่มต้นแนะนำ 30 วันนับจากวันนี้)
  const [requestedLastWorkingDate, setRequestedLastWorkingDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return toInputDate(d);
  });

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // คำนวณจำนวนวันบอกกล่าวล่วงหน้า
  const noticeDays = useMemo(() => {
    if (!requestedLastWorkingDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = requestedLastWorkingDate.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }, [requestedLastWorkingDate]);

  // Sync breadcrumb & Load saved draft
  useEffect(() => {
    setBreadcrumb({ section: 'ยื่นเอกสาร', page: 'เอกสารขอลาออก' });

    try {
      const savedDraft = localStorage.getItem('hrms_resignation_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.addressedTo) setAddressedTo(parsed.addressedTo);
        if (parsed.titlePrefix) setTitlePrefix(parsed.titlePrefix);
        if (parsed.reasonCategory) setReasonCategory(parsed.reasonCategory);
        if (parsed.reasonDetail) setReasonDetail(parsed.reasonDetail);
        if (parsed.handoverNotes) setHandoverNotes(parsed.handoverNotes);
        if (parsed.contactAfterResignation) setContactAfterResignation(parsed.contactAfterResignation);
        if (parsed.requestedLastWorkingDate) setRequestedLastWorkingDate(parsed.requestedLastWorkingDate);
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

  // ล้างฟอร์ม
  const handleResetForm = () => {
    setAddressedTo('กรรมการผู้จัดการบริษัท ไฮอโค่ว จำกัด');
    setTitlePrefix('นาย');
    setReasonCategory(RESIGNATION_REASON_CATEGORIES[0].value);
    setReasonDetail('');
    setHandoverNotes('');
    setContactAfterResignation('');
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setRequestedLastWorkingDate(toInputDate(d));
    setFormError(null);
    localStorage.removeItem('hrms_resignation_draft');
    showToast('ล้างข้อมูลในแบบฟอร์มเรียบร้อยแล้ว');
  };

  // บันทึกแบบร่าง
  const handleSaveDraft = async () => {
    if (!reasonDetail.trim()) {
      setFormError('กรุณากรอกเหตุผลการลาออกก่อนบันทึกแบบร่าง');
      return;
    }
    setSavingDraft(true);
    try {
      localStorage.setItem(
        'hrms_resignation_draft',
        JSON.stringify({
          addressedTo,
          titlePrefix,
          reasonCategory,
          reasonDetail: reasonDetail.trim(),
          handoverNotes: handoverNotes.trim(),
          contactAfterResignation: contactAfterResignation.trim(),
          requestedLastWorkingDate,
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

  // ยื่นคำขอลาออก
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasonDetail.trim()) {
      setFormError('กรุณาระบุเหตุผลการลาออก *');
      return;
    }
    if (!requestedLastWorkingDate) {
      setFormError('กรุณาระบุวันที่มีผลลาออก (วันทำงานวันสุดท้าย) *');
      return;
    }
    if (noticeDays <= 0) {
      setFormError('วันที่มีผลลาออกต้องเป็นวันหลังจากวันนี้เป็นต้นไป');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      const categoryObj = RESIGNATION_REASON_CATEGORIES.find((c) => c.value === reasonCategory);
      const categoryLabel = categoryObj ? categoryObj.label : reasonCategory;

      await resignationService.createRequest({
        requestedLastWorkingDate,
        reasonCategory: categoryLabel,
        reason: reasonDetail.trim(),
        handoverNotes: handoverNotes.trim() || undefined,
        contactAfterResignation: contactAfterResignation.trim() || undefined,
      });

      // Clear draft
      localStorage.removeItem('hrms_resignation_draft');
      setReasonDetail('');
      setHandoverNotes('');
      setContactAfterResignation('');
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error('Error submitting resignation request:', err);
      setFormError(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการยื่นคำขอลาออก');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategoryObj = RESIGNATION_REASON_CATEGORIES.find((c) => c.value === reasonCategory);
  const selectedCategoryLabel = selectedCategoryObj ? selectedCategoryObj.label : reasonCategory;

  return (
    <div className="space-y-6 pb-12">
      {/* เมนูย่อยในตัว — สลับไปมาระหว่าง "รายการเอกสาร" กับ "ประวัติเอกสาร" คงรูปแบบเดียวกับระบบทั้งหมด */}
      <DocumentsSubNav />

      {/* Page Header (รูปแบบเดียวกับเมนูอื่นๆ) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">เอกสารขอลาออก</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            กรอกแบบฟอร์มแสดงความประสงค์ขอลาออกจากงานและส่งต่อสายการอนุมัติ
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

      {/* Main Form (ออกแบบตาม Figma แบบ 2 ฝั่ง แต่คุม Theme และความประณีตระดับ Enterprise) */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {formError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ─── ฝั่งซ้าย: ข้อมูลทั่วไป + ข้อมูลพนักงาน (ตาม Figma) ─── */}
          <div className="space-y-6">
            {/* การ์ดที่ 1: ข้อมูลทั่วไป */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-900">ข้อมูลทั่วไป</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">วันที่ *</label>
                  <LeaveDateRangePicker
                    mode="single"
                    className="w-full"
                    startDate={submissionDate}
                    endDate={submissionDate}
                    onChange={(d) => setSubmissionDate(d)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">เรียน</label>
                  <input
                    type="text"
                    value={addressedTo}
                    onChange={(e) => setAddressedTo(e.target.value)}
                    placeholder="เช่น กรรมการผู้จัดการบริษัท ไฮอโค่ว จำกัด"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                  />
                </div>
              </div>
            </div>

            {/* การ์ดที่ 2: ข้อมูลพนักงาน */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-900">ข้อมูลพนักงาน</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">คำนำหน้า</label>
                  <select
                    value={titlePrefix}
                    onChange={(e) => setTitlePrefix(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                  >
                    <option value="นาย">นาย</option>
                    <option value="นาง">นาง</option>
                    <option value="นางสาว">นางสาว</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">ชื่อ-นามสกุล *</label>
                  <input
                    type="text"
                    readOnly
                    value={profile.fullName}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-100/70 text-sm text-gray-700 cursor-not-allowed font-medium"
                  />
                </div>
                <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">ตำแหน่ง</label>
                    <input
                      type="text"
                      readOnly
                      value={profile.positionTitle || '-'}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-100/70 text-sm text-gray-700 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">แผนก / สังกัด</label>
                    <input
                      type="text"
                      readOnly
                      value={profile.departmentName || '-'}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-100/70 text-sm text-gray-700 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── ฝั่งขวา: รายละเอียดการขอลาออก (ตาม Figma) ─── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900">รายละเอียดการขอลาออก</h3>

              {/* วันที่มีผลลาออก (วันทำงานวันสุดท้าย) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  วันที่มีผลลาออก ( วันทำงานวันสุดท้าย ) *
                </label>
                <LeaveDateRangePicker
                  mode="single"
                  className="w-full"
                  startDate={requestedLastWorkingDate}
                  endDate={requestedLastWorkingDate}
                  onChange={(start) => setRequestedLastWorkingDate(start)}
                />
              </div>

              {/* กล่องสรุปสถานะการแจ้งล่วงหน้า */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  noticeDays >= 30
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50/70 border-amber-200 text-amber-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>บอกกล่าวล่วงหน้า: <strong>{noticeDays} วัน</strong></span>
                </div>
                <span className="font-medium">
                  {noticeDays >= 30 ? '✓ ครบตามเกณฑ์ 30 วัน' : '⚠ น้อยกว่าเกณฑ์ 30 วัน'}
                </span>
              </div>

              {/* สาเหตุการลาออก (หมวดหมู่) */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  หมวดหมู่สาเหตุการลาออก
                </label>
                <select
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                >
                  {RESIGNATION_REASON_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* เหตุผลการลาออก (Textarea พร้อมตัวนับตาม Figma: สถานที่/เบอร์ติดต่อระหว่างลา หรือเหตุผล) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    เหตุผลการลาออก *
                  </label>
                  <span className="text-2xs text-gray-400 font-mono">
                    {reasonDetail.length}/{REASON_MAX_LENGTH}
                  </span>
                </div>
                <textarea
                  value={reasonDetail}
                  maxLength={REASON_MAX_LENGTH}
                  onChange={(e) => setReasonDetail(e.target.value)}
                  rows={4}
                  placeholder="ระบุเหตุผลการลาออก และสถานที่หรือเบอร์ติดต่อระหว่างลา..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                  required
                />
              </div>

              {/* แผนการส่งมอบงาน & ข้อมูลติดต่อเพิ่มเติม */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-2xs font-medium text-gray-500">แผนส่งมอบงาน (ถ้ามี)</label>
                    <span className="text-2xs text-gray-400 font-mono">{handoverNotes.length}/{HANDOVER_MAX_LENGTH}</span>
                  </div>
                  <input
                    type="text"
                    value={handoverNotes}
                    maxLength={HANDOVER_MAX_LENGTH}
                    onChange={(e) => setHandoverNotes(e.target.value)}
                    placeholder="เช่น ส่งมอบโปรเจกต์ให้ทีมงาน"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-2xs font-medium text-gray-500">ข้อมูลติดต่อหลังลาออก</label>
                    <span className="text-2xs text-gray-400 font-mono">{contactAfterResignation.length}/{CONTACT_MAX_LENGTH}</span>
                  </div>
                  <input
                    type="text"
                    value={contactAfterResignation}
                    maxLength={CONTACT_MAX_LENGTH}
                    onChange={(e) => setContactAfterResignation(e.target.value)}
                    placeholder="เช่น 081-xxx-xxxx, email@..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
            ถัดไป (ยื่นคำขอลาออก)
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
              ยื่นคำขอลาออกสำเร็จ!
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              คำขอของคุณถูกส่งเข้าสู่สายการอนุมัติเรียบร้อยแล้ว คุณสามารถติดตามสถานะการพิจารณาได้ที่เมนูประวัติเอกสาร
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

      {/* Resignation Preview Modal */}
      <ResignationPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        data={{
          employeeName: `${titlePrefix} ${profile.fullName}`,
          employeeCode: profile.employeeCode,
          positionTitle: profile.positionTitle,
          departmentName: profile.departmentName,
          submissionDate: formatThaiShort(submissionDate),
          requestedLastWorkingDate: formatThaiShort(requestedLastWorkingDate),
          reasonCategoryLabel: selectedCategoryLabel,
          reasonDetail: reasonDetail || 'ยังไม่ได้ระบุรายละเอียด',
          handoverNotes: handoverNotes || undefined,
          contactAfterResignation: contactAfterResignation || undefined,
          noticeDays,
        }}
      />
    </div>
  );
}

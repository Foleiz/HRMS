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
  Info,
} from 'lucide-react';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useAuth } from '@/context/AuthContext';
import { DocumentsSubNav } from '@/components/documents/DocumentsSubNav';
import { LeaveDateRangePicker } from '@/components/leave/LeaveDateRangePicker';
import { leaveService } from '@/services/leaveService';
import { resignationService } from '@/services/resignationService';
import { RESIGNATION_REASON_CATEGORIES } from '@/types/resignation';
import { ResignationPreviewModal } from '@/components/documents/ResignationPreviewModal';

const REASON_MAX_LENGTH = 300;
const HANDOVER_MAX_LENGTH = 300;
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
  const submissionDate = useMemo(() => toInputDate(new Date()), []);

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
    setBreadcrumb({ section: 'ยื่นเอกสาร', page: 'ยื่นคำขอลาออก' });

    try {
      const savedDraft = localStorage.getItem('hrms_resignation_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
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
      setFormError('กรุณากรอกรายละเอียดเหตุผลการลาออกก่อนบันทึกแบบร่าง');
      return;
    }
    setSavingDraft(true);
    try {
      localStorage.setItem(
        'hrms_resignation_draft',
        JSON.stringify({
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
      setFormError('กรุณาระบุรายละเอียดเหตุผลการลาออก');
      return;
    }
    if (!requestedLastWorkingDate) {
      setFormError('กรุณาระบุวันที่ต้องการทำงานวันสุดท้าย');
      return;
    }
    if (noticeDays <= 0) {
      setFormError('วันที่ต้องการทำงานวันสุดท้ายต้องเป็นวันหลังจากวันนี้เป็นต้นไป');
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
      {/* เมนูย่อยในตัว — สลับไปมาระหว่าง "รายการเอกสาร" กับ "ประวัติเอกสาร" */}
      <DocumentsSubNav />

      {/* Page Header (มาตรฐานเดียวกับเอกสารการลาและหนังสือรับรอง) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">ยื่นคำขอลาออก</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            แบบฟอร์มแสดงความประสงค์ขอลาออกจากงานและส่งต่อสายการอนุมัติ ติดตามสถานะได้ที่หน้าประวัติเอกสาร
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

      {/* Main Form Card (Single Card 2-Column Standard) */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-7">
        {formError && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
          {/* ─── คอลัมน์ซ้าย: ข้อมูลทั่วไป & สาเหตุการลาออก ─── */}
          <div className="space-y-5">
            {/* กล่องข้อมูลทั่วไป 4 ช่อง */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">ข้อมูลทั่วไป</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">วันที่ยื่นคำขอ</label>
                  <input
                    type="text"
                    readOnly
                    value={formatThaiShort(submissionDate)}
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

            {/* หมวดหมู่สาเหตุการลาออก */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                สาเหตุการลาออก *
              </label>
              <select
                value={reasonCategory}
                onChange={(e) => setReasonCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                required
              >
                {RESIGNATION_REASON_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* รายละเอียดเหตุผลการลาออก */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  รายละเอียดเหตุผลการลาออก *
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
                placeholder="ระบุเหตุผลและคำชี้แจงความประสงค์ในการขอลาออกโดยสังเขป..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                required
              />
            </div>
          </div>

          {/* ─── คอลัมน์ขวา: วันที่ทำงานวันสุดท้าย, การบอกกล่าวล่วงหน้า, การส่งมอบงาน ─── */}
          <div className="space-y-5">
            {/* วันที่ต้องการทำงานวันสุดท้าย (ใช้ LeaveDateRangePicker เหมือนหน้ายื่นการลา) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                วันที่ต้องการทำงานวันสุดท้าย *
              </label>
              <LeaveDateRangePicker
                mode="single"
                className="w-full"
                startDate={requestedLastWorkingDate}
                endDate={requestedLastWorkingDate}
                onChange={(start) => setRequestedLastWorkingDate(start)}
              />
            </div>

            {/* Notice Period Alert Card */}
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs leading-relaxed ${
                noticeDays >= 30
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50/70 border-amber-200 text-amber-800'
              }`}
            >
              <Clock className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  ระยะเวลาบอกกล่าวล่วงหน้า: {noticeDays} วัน
                </p>
                {noticeDays >= 30 ? (
                  <p className="text-emerald-700 mt-0.5">
                    ครบถ้วนตามระเบียบบริษัท (ต้องบอกกล่าวล่วงหน้าอย่างน้อย 30 วันก่อนวันมีผล)
                  </p>
                ) : (
                  <p className="text-amber-700 mt-0.5">
                    น้อยกว่าเกณฑ์ 30 วันตามระเบียบ — การอนุมัติจะต้องได้รับการพิจารณาเป็นกรณีพิเศษจากหัวหน้างานและฝ่ายบุคคล
                  </p>
                )}
              </div>
            </div>

            {/* แผนและรายละเอียดการส่งมอบงาน */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  แผนการส่งมอบงานและทรัพย์สินบริษัท
                </label>
                <span className="text-2xs text-gray-400 font-mono">
                  {handoverNotes.length}/{HANDOVER_MAX_LENGTH}
                </span>
              </div>
              <textarea
                value={handoverNotes}
                maxLength={HANDOVER_MAX_LENGTH}
                onChange={(e) => setHandoverNotes(e.target.value)}
                rows={3}
                placeholder="ระบุรายชื่อผู้รับมอบงาน รายการโปรเจกต์ หรือทรัพย์สินที่ต้องส่งมอบ..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
              />
            </div>

            {/* ข้อมูลติดต่อหลังพ้นสภาพพนักงาน */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  ข้อมูลติดต่อหลังพ้นสภาพพนักงาน (เบอร์โทรศัพท์ / อีเมลส่วนตัว)
                </label>
                <span className="text-2xs text-gray-400 font-mono">
                  {contactAfterResignation.length}/{CONTACT_MAX_LENGTH}
                </span>
              </div>
              <input
                type="text"
                value={contactAfterResignation}
                maxLength={CONTACT_MAX_LENGTH}
                onChange={(e) => setContactAfterResignation(e.target.value)}
                placeholder="เช่น 081-234-5678, personal.email@gmail.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>

        {/* ─── Actions (ชิดขวาตามแบบฟอร์มมาตรฐาน) ─── */}
        <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
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
            ยื่นคำขอลาออก
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
          employeeName: profile.fullName,
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

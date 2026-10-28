'use client';

import { ModalShell } from '@/components/ui/ModalShell';
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
import { employeeService } from '@/services/employeeService';
import { resignationService } from '@/services/resignationService';
import { RESIGNATION_REASON_CATEGORIES } from '@/types/resignation';
import { ResignationPreviewModal } from '@/components/documents/ResignationPreviewModal';
import { toast } from '@/context/ToastContext';
import { Button } from '@/components/ui';
import { RichSelect } from '@/components/ui/RichSelect';
import { RequesterSummary } from '@/components/documents/RequesterSummary';
import { FormActionBar } from '@/components/documents/FormActionBar';

const REASON_MAX_LENGTH = 190;
const LABEL = 'block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2';
const INPUT =
  'w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]';
const TEXTAREA =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] resize-none whitespace-pre-wrap break-words [overflow-wrap:anywhere]';

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
    fullName: user?.fullName || '',
    employeeCode: user?.employeeCode || '',
    positionTitle: '',
    departmentName: '',
  });

  // วันที่ยื่นคำขอ (วันนี้)
  // วันที่ในหนังสือ = วันที่กดยื่นจริง (ระยะแจ้งล่วงหน้านับจากวันนี้) — ไม่ให้เลือกเอง
  const submissionDate = toInputDate(new Date());

  // ช่อง "เรียน" ตาม Figma
  const [addressedTo, setAddressedTo] = useState('กรรมการผู้จัดการบริษัท ไซอโคว จำกัด');

  // คำนำหน้า (นาย / นาง / นางสาว) ตาม Figma
  // คำนำหน้า: ดึงจากข้อมูลพนักงาน — เลือกเองได้เฉพาะเมื่อข้อมูลพนักงานยังไม่มีคำนำหน้า
  const [prefixFromProfile, setPrefixFromProfile] = useState(false);
  // ยังไม่รู้ว่าข้อมูลพนักงานมีคำนำหน้าไหม → ยังไม่แสดงตัวเลือก (กันกระพริบโผล่แล้วหาย)
  const [prefixChecked, setPrefixChecked] = useState(false);
  const [titlePrefix, setTitlePrefix] = useState<'นาย' | 'นาง' | 'นางสาว'>(() => {
    const fn = user?.fullName || '';
    if (fn.startsWith('นางสาว')) return 'นางสาว';
    if (fn.startsWith('นาง')) return 'นาง';
    return 'นาย';
  });

  // Form Fields
  const [reasonCategory, setReasonCategory] = useState<string>(RESIGNATION_REASON_CATEGORIES[0].value);
  const [reasonDetail, setReasonDetail] = useState('');

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
        if (parsed.reasonCategory) setReasonCategory(parsed.reasonCategory);
        if (parsed.reasonDetail) setReasonDetail(parsed.reasonDetail);
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
        const [balRes, empRes] = await Promise.allSettled([
          leaveService.getLeaveBalances({ employeeId: user.employeeId, year: new Date().getFullYear() }),
          employeeService.getById(user.employeeId),
        ]);
        const balances = balRes.status === 'fulfilled' ? balRes.value : [];
        if (balances && balances.length > 0) {
          setProfile({
            fullName: user?.fullName || '',
            employeeCode: user?.employeeCode || '',
            positionTitle: balances[0]?.positionTitle || '',
            departmentName: balances[0]?.departmentName || '',
          });
        }
        const rawPrefix = empRes.status === 'fulfilled' ? (empRes.value?.prefix || '').trim() : '';
        const mapped =
          rawPrefix === 'นางสาว' || /^(miss|ms)\.?$/i.test(rawPrefix)
            ? 'นางสาว'
            : rawPrefix === 'นาง' || /^mrs\.?$/i.test(rawPrefix)
              ? 'นาง'
              : rawPrefix === 'นาย' || /^mr\.?$/i.test(rawPrefix)
                ? 'นาย'
                : null;
        if (mapped) {
          setTitlePrefix(mapped);
          setPrefixFromProfile(true);
        }
        setPrefixChecked(true);
      }
    } catch (err) {
      console.error('Error loading employee profile:', err);
    } finally {
      setPrefixChecked(true);
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
    setAddressedTo('กรรมการผู้จัดการบริษัท ไซอโคว จำกัด');
    setReasonCategory(RESIGNATION_REASON_CATEGORIES[0].value);
    setReasonDetail('');
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
          reasonCategory,
          reasonDetail: reasonDetail.trim(),
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
      });

      // Clear draft
      localStorage.removeItem('hrms_resignation_draft');
      setReasonDetail('');
      toast.success('ยื่นคำขอลาออกสำเร็จ ติดตามสถานะได้ที่หน้านี้');
      router.push('/documents/history');
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

      {/* หัวข้ออยู่ใน breadcrumb แล้ว — เก็บ h1 ไว้ให้โปรแกรมอ่านหน้าจอ */}
      <h1 className="sr-only">ยื่นคำขอลาออก</h1>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 text-white rounded-xl text-sm shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ฟอร์มกระชับ — รูปแบบเดียวกับหน้ายื่นคำขอลา */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <RequesterSummary
          fullName={profile.fullName || '-'}
          positionTitle={profile.positionTitle}
          departmentName={profile.departmentName}
          action={
            <Button variant="secondary" type="button" onClick={handleResetForm} icon={<RotateCcw className="w-4 h-4" />}>
              ล้างฟอร์ม
            </Button>
          }
        />

        {formError && (
          <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-6">
          {/* ซ้าย: วันสุดท้าย + สาเหตุ */}
          <div className="space-y-6 min-w-0">
            <div>
              <span className={LABEL}>
                วันทำงานวันสุดท้าย <span className="text-rose-600">*</span>
              </span>
              <div className="max-w-sm">
                <LeaveDateRangePicker
                  mode="single"
                  className="w-full"
                  startDate={requestedLastWorkingDate}
                  endDate={requestedLastWorkingDate}
                  onChange={(start) => setRequestedLastWorkingDate(start)}
                />
              </div>
              <p
                aria-live="polite"
                className={`mt-2 text-sm font-semibold ${noticeDays >= 30 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}
              >
                แจ้งล่วงหน้า {noticeDays} วัน · {noticeDays >= 30 ? 'ครบตามเกณฑ์ 30 วัน' : 'น้อยกว่าเกณฑ์ 30 วัน'}
              </p>
            </div>

            <div>
              <label htmlFor="res-category" className={LABEL}>
                สาเหตุการลาออก
              </label>
              <RichSelect<string>
                id="res-category"
                value={reasonCategory}
                onChange={(v) => {
                  setReasonCategory(v);
                  // เลือกหมวดแล้วเติมลงช่องเหตุผลให้ (แก้ต่อได้) — ไม่ทับข้อความที่พิมพ์เอง
                  const label = RESIGNATION_REASON_CATEGORIES.find((c) => c.value === v)?.label ?? '';
                  const isAuto = !reasonDetail.trim() || RESIGNATION_REASON_CATEGORIES.some((c) => c.label === reasonDetail.trim());
                  if (!isAuto) return;
                  if (/อื่น/.test(label)) {
                    setReasonDetail('');
                    setTimeout(() => document.getElementById('res-reason')?.focus(), 0);
                  } else {
                    setReasonDetail(label.slice(0, REASON_MAX_LENGTH));
                  }
                }}
                options={RESIGNATION_REASON_CATEGORIES.map((c) => ({ value: c.value, label: c.label, description: c.description }))}
                placeholder="เลือกสาเหตุ"
                placement="top"
              />
            </div>

          </div>

          {/* ขวา: ผู้รับหนังสือ + เหตุผล (วันที่และคำนำหน้าระบบใส่ให้ในหนังสือ) */}
          <div className="space-y-6 min-w-0">
            <div>
              <label htmlFor="res-to" className={LABEL}>
                เรียน
              </label>
              <input
                id="res-to"
                type="text"
                value={addressedTo}
                onChange={(e) => setAddressedTo(e.target.value)}
                placeholder="เช่น กรรมการผู้จัดการ"
                className={INPUT}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="res-reason" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  เหตุผลการลาออก <span className="text-rose-600">*</span>
                </label>
                <span className="text-xs text-slate-400">{reasonDetail.length}/{REASON_MAX_LENGTH}</span>
              </div>
              <textarea
                id="res-reason"
                value={reasonDetail}
                maxLength={REASON_MAX_LENGTH}
                onChange={(e) => setReasonDetail(e.target.value)}
                rows={4}
                placeholder="เลือกสาเหตุด้านซ้าย หรือพิมพ์เหตุผลเอง"
                className={TEXTAREA}
                required
              />
            </div>
            {prefixChecked && !prefixFromProfile && (
              <fieldset>
                <legend className={LABEL}>คำนำหน้าในหนังสือ</legend>
                <div role="radiogroup" aria-label="คำนำหน้า" className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-900">
                  {(['นาย', 'นาง', 'นางสาว'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      role="radio"
                      aria-checked={titlePrefix === p}
                      onClick={() => setTitlePrefix(p)}
                      className={`h-9 px-4 rounded-lg text-sm transition-all cursor-pointer ${
                        titlePrefix === p
                          ? 'bg-white dark:bg-slate-700 text-[#0B2046] dark:text-white font-semibold shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 font-medium'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
        </div>

        <FormActionBar>
          <Button variant="secondary" type="button" onClick={() => setIsPreviewOpen(true)} icon={<Eye className="w-3.5 h-3.5" />}>
            ดูตัวอย่างเอกสาร
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={handleSaveDraft}
            loading={savingDraft}
            disabled={isSubmitting}
            icon={<Save className="w-3.5 h-3.5" />}
          >
            บันทึกแบบร่าง
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={savingDraft}>
            ยื่นคำขอลาออก
          </Button>
        </FormActionBar>
      </form>

      {/* Success Modal */}
      {showSuccessModal && (
        <ModalShell className="z-50" innerClassName="items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setShowSuccessModal(false)}
          />

          <div className="relative bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-100 z-10 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              ยื่นคำขอลาออกสำเร็จ!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              ติดตามสถานะได้ที่เมนู ประวัติเอกสาร
            </p>
            <div className="flex items-center gap-2">
              <Button
                fullWidth
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push('/documents/history');
                }}
              >
                ไปที่ประวัติเอกสาร
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setShowSuccessModal(false)}
              >
                ปิดหน้าต่าง
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Resignation Preview Modal */}
      <ResignationPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        data={{
          employeeName: profile.fullName.startsWith(titlePrefix)
            ? profile.fullName
            : `${titlePrefix} ${profile.fullName.replace(/^(นาย|นางสาว|นาง)\s*/, '')}`,
          titlePrefix,
          employeeId: user?.employeeId ?? null,
          employeeCode: profile.employeeCode,
          positionTitle: profile.positionTitle,
          departmentName: profile.departmentName,
          submissionDate: formatThaiShort(submissionDate),
          requestedLastWorkingDate: formatThaiShort(requestedLastWorkingDate),
          reasonCategoryLabel: selectedCategoryLabel,
          reasonDetail: reasonDetail || 'ยังไม่ได้ระบุรายละเอียด',
          noticeDays,
          addressedTo,
        }}
      />
    </div>
  );
}


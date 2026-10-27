'use client';

import { ModalShell } from '@/components/ui/ModalShell';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Save,
  Eye,
  Loader2,
  CalendarCheck,
  Clock3,
  Languages,
  PenLine,
} from 'lucide-react';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useAuth } from '@/context/AuthContext';
import { CertificateType } from '@/types/certificates';
import { certificateService } from '@/services/certificateService';
import { leaveService } from '@/services/leaveService';
import { CertificatePreviewModal } from '@/components/documents/CertificatePreviewModal';
import { DocumentsSubNav } from '@/components/documents/DocumentsSubNav';
import { toast } from '@/context/ToastContext';
import { Button } from '@/components/ui';
import { RichSelect } from '@/components/ui/RichSelect';
import { RequesterSummary } from '@/components/documents/RequesterSummary';
import { FormActionBar } from '@/components/documents/FormActionBar';

const REASON_MAX_LENGTH = 160;
const NOTES_MAX_LENGTH = 225;
const TEXTAREA =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] resize-none whitespace-pre-wrap break-words [overflow-wrap:anywhere]';
const LABEL = 'block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2';


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

  // วันที่ออก = วันที่อนุมัติ, อายุหนังสือมาจากข้อมูลหลัก — ผู้ใช้ไม่ต้องกรอกเอง
  // ช่องข้อความยืด/หดตามเนื้อหา
  const purposeRef = useRef<HTMLTextAreaElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    [purposeRef.current, notesRef.current].forEach((el) => {
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight + (el.offsetHeight - el.clientHeight)}px`;
    });
  }, [purpose, notes]);

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
    setFormError(null);
    localStorage.removeItem('hrms_cert_draft');
    showToast('ล้างข้อมูลในแบบฟอร์มเรียบร้อยแล้ว');
  };

  const selectedType = types.find((t) => t.id === Number(selectedTypeId));
  const includeSalary = !!selectedType?.certificateCode?.toUpperCase().includes('SALARY');
  const validityMonths = selectedType?.validityMonths ?? null;

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

      const remarks = notes.trim() ? `หมายเหตุ: ${notes.trim()}` : '';

      await certificateService.createRequest({
        certificateTypeId: Number(selectedTypeId),
        purpose: purpose.trim(),
        language: 'TH',
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

      {/* หัวข้ออยู่ใน breadcrumb แล้ว — เก็บ h1 ไว้ให้โปรแกรมอ่านหน้าจอ */}
      <h1 className="sr-only">ขอหนังสือรับรอง</h1>

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
          {/* ซ้าย: ประเภท + วัตถุประสงค์ + หมายเหตุ */}
          <div className="space-y-6 min-w-0">
            <div>
              <label htmlFor="cert-type" className={LABEL}>
                ประเภทหนังสือรับรอง <span className="text-rose-600">*</span>
              </label>
              <RichSelect<number>
                id="cert-type"
                value={selectedTypeId}
                onChange={(v) => setSelectedTypeId(v)}
                options={types.map((t) => {
                  const salary = !!t.certificateCode?.toUpperCase().includes('SALARY');
                  return {
                    value: t.id,
                    label: t.certificateName,
                    description: salary ? 'ระบุอัตราเงินเดือนในเอกสาร' : 'ไม่ระบุเงินเดือน',
                  };
                })}
                placeholder="เลือกประเภทหนังสือรับรอง"
                emptyText="ยังไม่มีประเภทหนังสือรับรอง"
                aria-describedby="cert-type-help"
              />
              <p id="cert-type-help" className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {selectedType
                  ? `ชื่อ ตำแหน่ง วันที่เริ่มงาน อายุงาน${includeSalary ? ' และเงินเดือน' : ''} ดึงจากระบบอัตโนมัติ`
                  : 'เลือกแล้วจะเห็นว่าเอกสารแสดงข้อมูลอะไรบ้าง'}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="cert-purpose" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  วัตถุประสงค์ <span className="text-rose-600">*</span>
                </label>
                <span className="text-xs text-slate-400">{purpose.length}/{REASON_MAX_LENGTH}</span>
              </div>
              <textarea
                id="cert-purpose"
                value={purpose}
                maxLength={REASON_MAX_LENGTH}
                ref={purposeRef}
                onChange={(e) => setPurpose(e.target.value)}
                rows={2}
                placeholder="เช่น เพื่อใช้ประกอบการขอสินเชื่อที่อยู่อาศัย"
                className={`${TEXTAREA} block overflow-hidden`}
                required
                aria-describedby="cert-purpose-help"
              />
              <p id="cert-purpose-help" className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                แสดงในเอกสารว่า “หนังสือรับรองฉบับนี้ออกให้เพื่อ...”
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="cert-notes" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  หมายเหตุถึงฝ่ายบุคคล <span className="font-normal text-slate-500 dark:text-slate-400">(ไม่บังคับ)</span>
                </label>
                <span className="text-xs text-slate-400">{notes.length}/{NOTES_MAX_LENGTH}</span>
              </div>
              <textarea
                id="cert-notes"
                value={notes}
                maxLength={NOTES_MAX_LENGTH}
                ref={notesRef}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="เช่น ต้องการ 2 ฉบับ"
                className={`${TEXTAREA} block overflow-hidden`}
              />
            </div>
          </div>

          {/* ขวา: ข้อมูลเอกสารที่ระบบกำหนดให้ (ไม่ต้องกรอก) */}
          <div className="min-w-0">
            <span className={LABEL}>รายละเอียดเอกสาร</span>
            <dl className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/60 text-sm">
              {[
                { icon: Languages, k: 'ภาษา', v: 'ภาษาไทย' },
                { icon: CalendarCheck, k: 'วันที่ออก', v: 'วันที่ได้รับอนุมัติ' },
                {
                  icon: Clock3,
                  k: 'อายุหนังสือ',
                  v: !selectedType
                    ? 'เลือกประเภทหนังสือรับรองก่อน'
                    : validityMonths
                      ? `${validityMonths} เดือน นับจากวันที่ออก`
                      : 'ไม่กำหนดวันหมดอายุ',
                },
                { icon: PenLine, k: 'ผู้ลงนาม', v: 'ผู้อนุมัติขั้นสุดท้าย พร้อมลายเซ็นดิจิทัล' },
              ].map(({ icon: Icon, k, v }) => (
                <div key={k} className="flex items-start gap-3 px-4 py-3">
                  <Icon className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                  <dt className="w-24 shrink-0 text-slate-500 dark:text-slate-400">{k}</dt>
                  <dd className="font-medium text-slate-800 dark:text-slate-200">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              อายุหนังสือกำหนดโดยฝ่ายบุคคลที่เมนูข้อมูลหลัก &gt; ประเภทหนังสือรับรอง
            </p>
          </div>
        </div>

        <FormActionBar>
          <Button variant="secondary" type="button" onClick={handlePreview} icon={<Eye className="w-3.5 h-3.5" />}>
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
            ยื่นขอหนังสือรับรอง
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
              ยื่นคำขอหนังสือรับรองสำเร็จ!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              ติดตามสถานะและพิมพ์เอกสารได้ที่เมนู ประวัติเอกสาร
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

      {/* Certificate Preview Modal */}
      <CertificatePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        previewParams={selectedTypeId ? { certificateTypeId: Number(selectedTypeId), purpose: purpose.trim() } : null}
      />
    </div>
  );
}


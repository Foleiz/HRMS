'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Briefcase, Wallet, Maximize2, Clock3 } from 'lucide-react';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useAuth } from '@/context/AuthContext';
import { CertificateType } from '@/types/certificates';
import { certificateService } from '@/services/certificateService';
import { leaveService } from '@/services/leaveService';
import { CertificatePreviewModal, CertificateInlinePreview } from '@/components/documents/CertificatePreviewModal';
import { DocumentsSubNav } from '@/components/documents/DocumentsSubNav';
import { useApprovalSlots, getSlotHeading } from '@/components/documents/documentFormParts';
import { toast } from '@/context/ToastContext';
import { Button } from '@/components/ui';
import { RequesterSummary } from '@/components/documents/RequesterSummary';
import { FormActionBar } from '@/components/documents/FormActionBar';

const isSalaryType = (t?: CertificateType | null) => !!t?.certificateCode?.toUpperCase().includes('SALARY');

/** คำอธิบายสั้น ๆ ใต้ชื่อประเภท — ช่วยให้เลือกถูกโดยไม่ต้องเปิดตัวอย่าง */
const typeDescription = (t: CertificateType) =>
  isSalaryType(t) ? 'ใช้ยื่นขอสินเชื่อ ขอวีซ่า หรือเช่าที่พัก' : 'ยืนยันการเป็นพนักงาน ตำแหน่ง และอายุงาน';

/**
 * ขอหนังสือรับรอง — เลือกประเภทอย่างเดียว ข้อมูลในหนังสือดึงจากระบบทั้งหมด
 * ซ้าย: การ์ดประเภท + อายุหนังสือ + ผู้อนุมัติ · ขวา: ตัวอย่างหนังสือจริงของผู้ใช้ (เปลี่ยนตามประเภททันที)
 */
export default function CertificatePage() {
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();
  const { user } = useAuth();

  const [profile, setProfile] = useState({ positionTitle: '', departmentName: '' });
  const [types, setTypes] = useState<CertificateType[]>([]);
  const [typesLoaded, setTypesLoaded] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    setBreadcrumb({ section: 'ยื่นเอกสาร', page: 'ขอหนังสือรับรอง' });
    // แบบร่างเดิม (มีวัตถุประสงค์) ไม่ใช้แล้ว
    try {
      localStorage.removeItem('hrms_cert_draft');
    } catch {
      // ignore
    }
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  const loadInitialData = useCallback(async () => {
    const [typeList, balances] = await Promise.allSettled([
      certificateService.getCertificateTypes(),
      user?.employeeId
        ? leaveService.getLeaveBalances({ employeeId: user.employeeId, year: new Date().getFullYear() })
        : Promise.resolve([]),
    ]);
    if (typeList.status === 'fulfilled') {
      setTypes(typeList.value);
      setSelectedTypeId((cur) => cur ?? typeList.value[0]?.id ?? null);
    }
    setTypesLoaded(true);
    if (balances.status === 'fulfilled' && balances.value.length > 0) {
      setProfile({
        positionTitle: balances.value[0]?.positionTitle || '',
        departmentName: balances.value[0]?.departmentName || '',
      });
    }
  }, [user?.employeeId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const selectedType = types.find((t) => t.id === selectedTypeId) ?? null;
  const validityMonths = selectedType?.validityMonths ?? null;

  // ผู้อนุมัติตามสายอนุมัติ "คำขอหนังสือรับรอง" ของผู้ใช้ (จำลองจากหน้าตั้งค่า)
  const approvalSlots = useApprovalSlots({
    isOpen: true,
    documentType: 'CERTIFICATE_REQUEST',
    employeeId: user?.employeeId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTypeId) {
      setFormError('กรุณาเลือกประเภทหนังสือรับรอง');
      return;
    }
    try {
      setIsSubmitting(true);
      setFormError(null);
      await certificateService.createRequest({ certificateTypeId: selectedTypeId, purpose: '', language: 'TH' });
      toast.success('ยื่นขอหนังสือรับรองสำเร็จ ติดตามสถานะได้ที่ประวัติเอกสาร');
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
      <DocumentsSubNav />
      <h1 className="sr-only">ขอหนังสือรับรอง</h1>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <RequesterSummary
          fullName={user?.fullName || '-'}
          positionTitle={profile.positionTitle}
          departmentName={profile.departmentName}
        />

        {formError && (
          <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] gap-4 items-start">
          {/* ===== ซ้าย: ประเภท + สรุปคำขอ ===== */}
          <div className="space-y-4 min-w-0">
            <fieldset className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm p-5 sm:p-6">
              <legend className="sr-only">ประเภทหนังสือรับรอง</legend>
              <p aria-hidden="true" className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                เลือกประเภทหนังสือรับรอง
              </p>
              <div className="space-y-3">
                {types.map((t) => {
                  const active = t.id === selectedTypeId;
                  const Icon = isSalaryType(t) ? Wallet : Briefcase;
                  return (
                    <label
                      key={t.id}
                      className={`flex items-center gap-3.5 rounded-xl px-4 py-3.5 cursor-pointer transition-colors ${
                        active
                          ? 'border-2 border-[#0B2046] bg-indigo-50/60 dark:border-blue-400 dark:bg-slate-700/50'
                          : 'border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/30 m-px'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${
                          active ? 'bg-[#0B2046] text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{t.certificateName}</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{typeDescription(t)}</span>
                      </span>
                      <input
                        type="radio"
                        name="certificate-type"
                        value={t.id}
                        checked={active}
                        onChange={() => setSelectedTypeId(t.id)}
                        className="w-4 h-4 shrink-0 accent-[#0B2046]"
                      />
                    </label>
                  );
                })}
                {typesLoaded && types.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    ยังไม่มีประเภทหนังสือรับรอง กรุณาติดต่อฝ่ายบุคคล
                  </div>
                )}
              </div>
            </fieldset>

            <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm p-5 sm:p-6 space-y-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Clock3 className="w-4 h-4" aria-hidden="true" />
                  อายุหนังสือ
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                  {validityMonths ? `${validityMonths} เดือน นับจากวันที่อนุมัติ` : 'ไม่กำหนดวันหมดอายุ'}
                </span>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-700/60 pt-4">
                <p className="text-slate-500 dark:text-slate-400 mb-3">ผู้อนุมัติ</p>
                <ol className="space-y-0">
                  {approvalSlots.map((slot, i) => (
                    <li key={`${slot.stepNo}-${i}`} className="relative flex items-start gap-3 pb-3 last:pb-0">
                      {i < approvalSlots.length - 1 && (
                        <span aria-hidden="true" className="absolute left-[13px] top-7 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-600" />
                      )}
                      <span className="w-7 h-7 shrink-0 rounded-full bg-[#0B2046] dark:bg-blue-500 text-white text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="min-w-0 pt-0.5">
                        <span className="block font-medium text-slate-800 dark:text-slate-200">{getSlotHeading(slot)}</span>
                        {slot.positionHint && (
                          <span className="block text-xs text-slate-500 dark:text-slate-400">{slot.positionHint}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <p className="border-t border-slate-100 dark:border-slate-700/60 pt-4 text-xs text-slate-500 dark:text-slate-400">
                ข้อมูลในหนังสือดึงจากระบบอัตโนมัติ ถ้าไม่ถูกต้องให้แจ้งฝ่ายบุคคลก่อนยื่น
              </p>
            </section>
          </div>

          {/* ===== ขวา: ตัวอย่างหนังสือจริงของผู้ใช้ ===== */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm p-4 sm:p-5 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                ตัวอย่างหนังสือ <span className="font-normal text-slate-500 dark:text-slate-400">· ข้อมูลจริงของคุณ</span>
              </h2>
              <Button
                variant="secondary"
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                disabled={!selectedTypeId}
                icon={<Maximize2 className="w-3.5 h-3.5" />}
              >
                ขยายเต็มจอ
              </Button>
            </div>
            <div className="rounded-xl bg-slate-200/70 dark:bg-slate-900/60 p-3 sm:p-5">
              <CertificateInlinePreview certificateTypeId={selectedTypeId} />
            </div>
          </section>
        </div>

        <FormActionBar>
          <Button type="submit" loading={isSubmitting} disabled={!selectedTypeId}>
            ยื่นขอ{selectedType?.certificateName || 'หนังสือรับรอง'}
          </Button>
        </FormActionBar>
      </form>

      <CertificatePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        previewParams={selectedTypeId ? { certificateTypeId: selectedTypeId, purpose: '' } : null}
      />
    </div>
  );
}

'use client';

import { ModalShell } from '@/components/ui/ModalShell';
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
import { masterDataService } from '@/services/masterDataService';
import { DocumentTypeItem } from '@/types/master';
import { GeneralDocumentPreviewModal } from '@/components/documents/GeneralDocumentPreviewModal';
import { toast } from '@/context/ToastContext';
import { Button } from '@/components/ui';
import { RichSelect } from '@/components/ui/RichSelect';
import { RequesterSummary } from '@/components/documents/RequesterSummary';
import { FormActionBar } from '@/components/documents/FormActionBar';
import { FileDropzone } from '@/components/ui/FileDropzone';

const REASON_MAX_LENGTH = 160;
const NOTES_MAX_LENGTH = 200;
const CUSTOM_TYPE = '__CUSTOM__';
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

const isAttachmentMandatory = (docType: string): boolean => {
  if (!docType) return false;
  const t = docType.trim().toLowerCase();
  return (
    t.includes('สำเนา') ||
    t.includes('บัตรประจำตัวประชาชน') ||
    t.includes('บัตรประชาชน') ||
    t.includes('ใบรับรองแพทย์') ||
    t.includes('ทะเบียนบ้าน') ||
    t.includes('สมุดบัญชี') ||
    t.includes('วุฒิการศึกษา') ||
    t.includes('ทรานสคริปต์') ||
    t.includes('50 ทวิ')
  );
};

export default function GeneralDocumentPage() {
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Employee Profile
  const [profile, setProfile] = useState({
    fullName: user?.fullName || '',
    employeeCode: user?.employeeCode || '',
    positionTitle: '',
    departmentName: '',
  });

  // Form Fields (ตาม Figma)
  const [issueDate, setIssueDate] = useState(() => toInputDate(new Date()));
  // วันหมดอายุ: ไม่เติมให้เอง — ถ้าประเภทเอกสารกำหนดอายุไว้ (Master) จะคำนวณจากวันที่ออกจนกว่าผู้ใช้จะแก้เอง
  const [expiryDate, setExpiryDate] = useState('');
  const [expiryTouched, setExpiryTouched] = useState(false);
  const [documentType, setDocumentType] = useState<string>('');
  // ประเภทเอกสารจาก Master (ตั้งค่า > ข้อมูลหลัก > ประเภทเอกสาร) — โหลดไม่ได้จะใช้รายการสำรองเดิม
  const [masterTypes, setMasterTypes] = useState<DocumentTypeItem[]>([]);
  const [typesLoaded, setTypesLoaded] = useState(false);
  const typeOptions = useMemo<string[]>(
    () => (masterTypes.length > 0 ? masterTypes.map((t) => t.documentName) : [...COMMON_DOCUMENT_TYPES]),
    [masterTypes],
  );
  const selectedMasterType = masterTypes.find((t) => t.documentName === documentType);
  const [customDocumentType, setCustomDocumentType] = useState('');
  const [isCustomType, setIsCustomType] = useState(false);
  const validityMonths = !isCustomType ? selectedMasterType?.validityMonths ?? null : null;
  const autoExpiry = useMemo(() => {
    if (!validityMonths || !issueDate) return '';
    const [y, m, d] = issueDate.split('-').map(Number);
    const date = new Date(y, m - 1 + validityMonths, d);
    return toInputDate(date);
  }, [validityMonths, issueDate]);
  const effectiveExpiry = expiryTouched ? expiryDate : autoExpiry;
  const expiryRequired = !isCustomType && !!selectedMasterType?.isExpiryRequired;

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
        // ตรวจว่าตรงกับรายการหรือไม่หลังโหลดประเภทเอกสารเสร็จ (ดู useEffect ถัดไป)
        if (parsed.documentType) setDocumentType(parsed.documentType);
        if (parsed.purpose) setPurpose(parsed.purpose);
        if (parsed.notes) setNotes(parsed.notes);
        if (parsed.issueDate) setIssueDate(parsed.issueDate);
        if (parsed.expiryDate) {
          setExpiryDate(parsed.expiryDate);
          setExpiryTouched(true);
        }
      }
    } catch {
      // Ignore
    }

    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  // โหลดประเภทเอกสารจาก Master
  useEffect(() => {
    let cancelled = false;
    masterDataService
      .getDocumentTypes('ACTIVE')
      .then((items) => {
        if (!cancelled) setMasterTypes(items.filter((t) => t.status === 'ACTIVE'));
      })
      .catch((err) => console.error('Error loading document types:', err))
      .finally(() => {
        if (!cancelled) setTypesLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // เลือกค่าเริ่มต้น / แบบร่างที่ไม่อยู่ในรายการ → โหมดระบุประเภทเอง
  useEffect(() => {
    if (!typesLoaded || isCustomType) return;
    if (!documentType) {
      setDocumentType(typeOptions[0] ?? '');
    } else if (!typeOptions.includes(documentType)) {
      setIsCustomType(true);
      setCustomDocumentType(documentType);
      setDocumentType(typeOptions[0] ?? '');
    }
  }, [typesLoaded, typeOptions, documentType, isCustomType]);

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
            fullName: user?.fullName || '',
            employeeCode: user?.employeeCode || '',
            positionTitle: balances[0]?.positionTitle || '',
            departmentName: balances[0]?.departmentName || '',
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
      if (file.size > 5 * 1024 * 1024) {
        setFormError('ขนาดไฟล์ต้องไม่เกิน 5 MB');
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
    setDocumentType(typeOptions[0] ?? '');
    setCustomDocumentType('');
    setIsCustomType(false);
    setPurpose('');
    setNotes('');
    setIssueDate(toInputDate(new Date()));
    setExpiryDate('');
    setExpiryTouched(false);
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
          expiryDate: effectiveExpiry,
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

  const isFileRequired = isAttachmentMandatory(isCustomType ? customDocumentType : documentType);

  // ยื่นคำร้องเอกสารทั่วไป
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalDocType = isCustomType ? customDocumentType.trim() : documentType;
    if (!finalDocType) {
      setFormError('กรุณาระบุประเภทเอกสาร');
      toast.error('กรุณาระบุประเภทเอกสาร');
      return;
    }
    if (!purpose.trim()) {
      setFormError('กรุณาระบุรายละเอียดของคำขอ');
      toast.error('กรุณาระบุรายละเอียดของคำขอ');
      return;
    }
    if (expiryRequired && !effectiveExpiry) {
      setFormError('เอกสารประเภทนี้ต้องระบุวันหมดอายุ');
      toast.error('เอกสารประเภทนี้ต้องระบุวันหมดอายุ');
      return;
    }
    if (isFileRequired && !selectedFile) {
      const msg = `เอกสารประเภท "${finalDocType}" จำเป็นต้องแนบไฟล์เอกสารประกอบ`;
      setFormError(msg);
      toast.error(msg);
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      // แนบไฟล์เป็น base64 (data URL) ส่งไปเก็บที่ backend
      const fileData = selectedFile
        ? await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์แนบได้'));
            reader.readAsDataURL(selectedFile);
          })
        : undefined;

      await generalDocumentService.createRequest({
        documentType: finalDocType,
        documentTypeId: !isCustomType ? selectedMasterType?.id : undefined,
        issueDate,
        expiryDate: effectiveExpiry || undefined,
        purpose: purpose.trim(),
        notes: notes.trim() || undefined,
        fileName: selectedFile?.name,
        fileData,
      });

      // Clear draft
      localStorage.removeItem('hrms_general_doc_draft');
      setPurpose('');
      setNotes('');
      setSelectedFile(null);
      toast.success('ยื่นคำร้องเอกสารทั่วไปสำเร็จ ติดตามสถานะได้ที่หน้านี้');
      router.push('/documents/history');
    } catch (err: any) {
      console.error('Error submitting general document request:', err);
      setFormError(err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการยื่นคำขอ');
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

      {/* หัวข้ออยู่ใน breadcrumb แล้ว — เก็บ h1 ไว้ให้โปรแกรมอ่านหน้าจอ */}
      <h1 className="sr-only">ยื่นคำขอเอกสารทั่วไป</h1>

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
          {/* ซ้าย: ประเภท + วันที่ + ใช้สำหรับ */}
          <div className="space-y-6 min-w-0">
            <div>
              <label htmlFor="gen-type" className={LABEL}>
                ประเภทเอกสาร <span className="text-rose-600">*</span>
              </label>
              {!isCustomType ? (
                <RichSelect<string>
                  id="gen-type"
                  value={documentType}
                  onChange={(v) => {
                    if (v === CUSTOM_TYPE) {
                      setIsCustomType(true);
                    } else {
                      setDocumentType(v);
                    }
                  }}
                  options={[
                    ...typeOptions.map((name) => {
                      const m = masterTypes.find((t) => t.documentName === name);
                      const notes = [
                        m?.validityMonths ? `อายุ ${m.validityMonths} เดือน` : null,
                        m?.isExpiryRequired ? 'ต้องระบุวันหมดอายุ' : null,
                        isAttachmentMandatory(name) ? 'ต้องแนบไฟล์' : null,
                      ].filter(Boolean);
                      return { value: name, label: name, description: notes.join(' · ') || undefined };
                    }),
                    { value: CUSTOM_TYPE, label: '+ ระบุประเภทอื่นเอง', description: 'ไม่มีในรายการ' },
                  ]}
                  placeholder={typesLoaded ? 'เลือกประเภทเอกสาร' : 'กำลังโหลดประเภทเอกสาร...'}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    id="gen-type"
                    type="text"
                    value={customDocumentType}
                    onChange={(e) => setCustomDocumentType(e.target.value)}
                    placeholder="เช่น สำเนาบัตรประชาชน"
                    className={INPUT}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setIsCustomType(false)}
                    aria-label="กลับไปเลือกจากรายการ"
                    className="h-11 w-11 shrink-0 inline-flex items-center justify-center text-slate-500 hover:text-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className={LABEL}>วันที่ออก</span>
                <LeaveDateRangePicker mode="single" className="w-full" startDate={issueDate} endDate={issueDate} onChange={(d) => setIssueDate(d)} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    วันหมดอายุ{' '}
                    {expiryRequired ? <span className="text-rose-600">*</span> : <span className="font-normal text-slate-500 dark:text-slate-400">(ถ้ามี)</span>}
                  </span>
                  {effectiveExpiry && (
                    <button
                      type="button"
                      onClick={() => {
                        setExpiryDate('');
                        setExpiryTouched(true);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                    >
                      ล้างวันที่
                    </button>
                  )}
                </div>
                <LeaveDateRangePicker
                  mode="single"
                  className="w-full"
                  startDate={effectiveExpiry}
                  endDate={effectiveExpiry}
                  onChange={(d) => {
                    setExpiryDate(d);
                    setExpiryTouched(true);
                  }}
                />
              </div>
            </div>
            {!expiryTouched && validityMonths ? (
              <p className="-mt-3 text-xs text-slate-500 dark:text-slate-400">วันหมดอายุคำนวณจากอายุเอกสาร {validityMonths} เดือน</p>
            ) : null}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="gen-purpose" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  เอกสารนี้ใช้สำหรับ <span className="text-rose-600">*</span>
                </label>
                <span className="text-xs text-slate-400">{purpose.length}/{REASON_MAX_LENGTH}</span>
              </div>
              <textarea
                id="gen-purpose"
                value={purpose}
                maxLength={REASON_MAX_LENGTH}
                onChange={(e) => setPurpose(e.target.value)}
                rows={4}
                placeholder="เช่น ขอเปลี่ยนที่อยู่เป็น... / ขอสลิปเงินเดือนเดือน..."
                className={TEXTAREA}
                required
              />
            </div>
          </div>

          {/* ขวา: หมายเหตุ + ไฟล์แนบ */}
          <div className="flex flex-col gap-6 min-w-0">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="gen-notes" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  หมายเหตุถึงฝ่ายบุคคล <span className="font-normal text-slate-500 dark:text-slate-400">(ไม่บังคับ)</span>
                </label>
                <span className="text-xs text-slate-400">{notes.length}/{NOTES_MAX_LENGTH}</span>
              </div>
              <input
                id="gen-notes"
                value={notes}
                maxLength={NOTES_MAX_LENGTH}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ระบุข้อมูลเพิ่มเติม (ถ้ามี)"
                className={INPUT}
              />
            </div>

            <div className="flex-1 flex flex-col">
              <span id="gen-attachment-label" className={`${LABEL} flex items-center gap-1`}>
                ไฟล์แนบ{' '}
                {isFileRequired ? (
                  <span className="text-rose-600">*</span>
                ) : (
                  <span className="font-normal text-slate-500 dark:text-slate-400">(ไม่บังคับ)</span>
                )}
              </span>
              <FileDropzone
                className="flex-1"
                file={selectedFile}
                onChange={(f) => {
                  setSelectedFile(f);
                  setFormError(null);
                }}
                accept={['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']}
                required={isFileRequired}
                aria-labelledby="gen-attachment-label"
              />
              {isFileRequired && (
                <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400">เอกสารประเภทนี้ต้องแนบไฟล์ประกอบคำขอ</p>
              )}
            </div>
          </div>
        </div>

        <FormActionBar>
          <Button
            variant="secondary"
            type="button"
            onClick={() => {
              setFormError(null);
              setIsPreviewOpen(true);
            }}
            icon={<Eye className="w-3.5 h-3.5" />}
          >
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
            ยื่นคำขอ
          </Button>
        </FormActionBar>
      </form>

      {/* Success Modal */}
      {showSuccessModal && (
        <ModalShell className="z-50" innerClassName="items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => {
              setFormError(null);
              setShowSuccessModal(false);
            }}
          />

          <div className="relative bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-100 z-10 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              ยื่นคำร้องเอกสารทั่วไปสำเร็จ!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              ติดตามสถานะได้ที่เมนู ประวัติเอกสาร
            </p>
            <div className="flex items-center gap-2">
              <Button
                fullWidth
                onClick={() => {
                  setFormError(null);
                  setShowSuccessModal(false);
                  router.push('/documents/history');
                }}
              >
                ไปที่ประวัติเอกสาร
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setFormError(null);
                  setShowSuccessModal(false);
                }}
              >
                ปิดหน้าต่าง
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* General Document Preview Modal */}
      <GeneralDocumentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setFormError(null);
          setIsPreviewOpen(false);
        }}
        data={{
          employeeName: profile.fullName,
          employeeCode: profile.employeeCode,
          positionTitle: profile.positionTitle,
          departmentName: profile.departmentName,
          issueDate: formatThaiShort(issueDate),
          expiryDate: effectiveExpiry ? formatThaiShort(effectiveExpiry) : undefined,
          documentType: finalDocumentTypeDisplay,
          purpose: purpose || 'ยังไม่ได้ระบุวัตถุประสงค์',
          notes: notes || undefined,
          fileName: selectedFile?.name,
        }}
      />
    </div>
  );
}


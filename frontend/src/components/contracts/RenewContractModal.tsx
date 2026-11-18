'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarClock,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Upload,
  Trash2,
  FileText,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { ModalShell, Button, AvatarName } from '@/components/ui';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { EmploymentContract, RenewContractRequest, ContractSettings } from '@/types/contract';
import { EmployeeType } from '@/types/employeeType';
import { employeeTypeService } from '@/services/employeeTypeService';
import { contractService } from '@/services/contractService';
import { useToast } from '@/context/ToastContext';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { formatThaiDate, parseDate } from '@/lib/thaiDate';

interface RenewContractModalProps {
  contract: EmploymentContract | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (contractId: number, data: RenewContractRequest) => Promise<void>;
  contractSettings?: ContractSettings;
}

export default function RenewContractModal({
  contract,
  isOpen,
  onClose,
  onSubmit,
  contractSettings,
}: RenewContractModalProps) {
  const toast = useToast();
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeType[]>([]);
  const [contractType, setContractType] = useState<string>('FIXED_TERM');
  const [employeeTypeId, setEmployeeTypeId] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // File Upload States
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);

  const activeSettings = contractSettings || contractService.getSettings();

  const calculateAutoEndDate = (baseStart: string, type: string): string => {
    if (!baseStart || type === 'PERMANENT') return '';
    const parsed = parseDate(baseStart);
    if (!parsed) return '';
    if (type === 'PROBATION') {
      parsed.setDate(parsed.getDate() + activeSettings.probationDays);
    } else {
      parsed.setDate(parsed.getDate() + activeSettings.fixedTermDays - 1);
    }
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const calculateDaysDifference = (start: string, end: string): number => {
    const d1 = parseDate(start);
    const d2 = parseDate(end);
    if (!d1 || !d2) return 0;
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 0;
  };

  // Load employee types
  useEffect(() => {
    if (isOpen) {
      employeeTypeService
        .getAll()
        .then((types) => setEmployeeTypes(types.filter((t) => t.status === 'ACTIVE')))
        .catch((err) => console.error('Failed to load employee types:', err));
    }
  }, [isOpen]);

  // Initialize form when contract changes
  useEffect(() => {
    if (isOpen && contract) {
      setErrorMessage(null);
      setFileData(null);
      setFileName(null);
      setFileSize(null);
      setNotes('');

      // กำหนดประเภทสัญญาเริ่มต้น: สำหรับการต่ออายุสัญญาให้เริ่มต้นที่สัญญาจ้าง (มีกำหนดระยะเวลา)
      setContractType('FIXED_TERM');

      // วันที่เริ่มต้นสัญญาใหม่: หากมีวันสิ้นสุดเดิม ให้ใช้วันถัดจากวันสิ้นสุดเดิม หากไม่มีให้ใช้วันนี้
      let defStartDate = '';
      const baseEnd = contract.contractEndDate || contract.probationEndDate;
      if (baseEnd) {
        const parsed = parseDate(baseEnd);
        if (parsed) {
          parsed.setDate(parsed.getDate() + 1);
          const y = parsed.getFullYear();
          const m = String(parsed.getMonth() + 1).padStart(2, '0');
          const d = String(parsed.getDate()).padStart(2, '0');
          defStartDate = `${y}-${m}-${d}`;
        } else {
          defStartDate = new Date().toISOString().split('T')[0];
        }
      } else {
        defStartDate = new Date().toISOString().split('T')[0];
      }
      setStartDate(defStartDate);

      // วันที่สิ้นสุดสัญญาใหม่: เริ่มต้นคำนวณตามการตั้งค่าสัญญาจ้าง
      setEndDate(calculateAutoEndDate(defStartDate, 'FIXED_TERM'));

      if (contract.employeeTypeId) {
        setEmployeeTypeId(contract.employeeTypeId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, contract]);

  // ตรวจสอบความถูกต้องของวันที่ (Validation)
  const validationErrors = useMemo(() => {
    const errors: { startDate?: string; endDate?: string } = {};

    if (startDate && contract) {
      const origStart = contract.startDate ? contract.startDate.split('T')[0] : '';
      if (origStart && startDate < origStart) {
        errors.startDate = `วันเริ่มต้นสัญญาใหม่ต้องไม่อยู่ก่อนวันเริ่มสัญญาเดิม (${formatThaiDate(origStart)})`;
      } else {
        const baseEnd = contract.contractEndDate || contract.probationEndDate;
        const origEnd = baseEnd ? baseEnd.split('T')[0] : '';
        if (origEnd && startDate <= origEnd) {
          errors.startDate = `วันเริ่มต้นสัญญาใหม่ทับซ้อนกับระยะเวลาของสัญญาเดิม (สิ้นสุด ${formatThaiDate(origEnd)})`;
        }
      }
    }

    if (contractType !== 'PERMANENT') {
      if (startDate && endDate && endDate <= startDate) {
        errors.endDate = 'วันสิ้นสุดสัญญาต้องอยู่หลังวันเริ่มต้นสัญญา';
      }
    }

    return errors;
  }, [startDate, endDate, contractType, contract]);

  // จัดการอัปโหลดไฟล์
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('ไฟล์มีขนาดเกิน 10 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFileData(reader.result as string);
      setFileName(file.name);
      setFileSize(file.size);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setFileData(null);
    setFileName(null);
    setFileSize(null);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;

    if (!startDate) {
      toast.warning('กรุณาระบุวันเริ่มต้นสัญญาใหม่');
      return;
    }

    if (validationErrors.startDate) {
      toast.warning(validationErrors.startDate);
      return;
    }

    if (contractType !== 'PERMANENT') {
      if (!endDate) {
        toast.warning('กรุณาระบุวันสิ้นสุดสัญญาใหม่');
        return;
      }
      if (validationErrors.endDate) {
        toast.warning(validationErrors.endDate);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      await onSubmit(contract.id, {
        contractType,
        employeeTypeId,
        wageType: contract.wageType || 'MONTHLY',
        startDate,
        endDate: contractType === 'PERMANENT' ? undefined : (endDate || undefined),
        notes: notes.trim() || undefined,
        documentFileName: fileName || undefined,
        documentFileData: fileData || undefined,
      });

      onClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = error.response?.data?.message || error.message || 'ไม่สามารถต่ออายุสัญญาจ้างงานได้';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !contract) return null;

  // ตรวจสอบวันสิ้นสุดสัญญาเดิม ถ้าไม่มีหรือเป็น "-" ให้ระบุเป็น "ไม่มีกำหนด"
  const originalEndDateDisplay =
    contract.effectiveEndDateDisplay && contract.effectiveEndDateDisplay !== '-'
      ? contract.effectiveEndDateDisplay
      : contract.contractEndDateDisplay && contract.contractEndDateDisplay !== '-'
      ? contract.contractEndDateDisplay
      : 'ไม่มีกำหนด';

  // ตรวจสอบกรณีเปลี่ยนจาก พนักงานประจำ เป็นสัญญาที่มีกำหนดระยะเวลา (ปรับลดสถานะ)
  const isOriginalPermanent = contract.contractType === 'PERMANENT';
  const isDowngrading = isOriginalPermanent && (contractType === 'FIXED_TERM' || contractType === 'PROBATION');

  return (
    <ModalShell className="z-50 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200 font-sans" innerClassName="items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700/60 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header (Sticky Top) */}
        <ModalHeader
          icon={CalendarClock}
          title="ต่ออายุสัญญาจ้างงาน"
          subtitle={`ดำเนินการต่อสัญญาฉบับใหม่สำหรับ ${contract.employeeName}`}
          onClose={onClose}
        />

        {/* Form with Sticky Footer Architecture */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
            {errorMessage && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2.5 text-rose-800 dark:text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 1. สรุปข้อมูลพนักงาน & สัญญาเดิม */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center gap-3">
                <AvatarName
                  id={contract.employeeId}
                  name={contract.employeeName}
                  prefix={contract.employeePrefix}
                  avatarUrl={contract.avatarUrl}
                  hideName
                  className="w-10 h-10 text-xs"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                    {contract.employeePrefix ? `${contract.employeePrefix} ` : ''}{contract.employeeName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    รหัส: <span className="font-mono font-medium">{contract.employeeCode}</span>
                    {contract.positionTitle && ` • ${contract.positionTitle}`}
                    {contract.departmentName && ` (${contract.departmentName})`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">ประเภทสัญญาเดิม:</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                    {contract.employeeTypeName || contract.contractTypeDisplay}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">วันสิ้นสุดสัญญาเดิม:</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                    {originalEndDateDisplay}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. ประเภทสัญญาใหม่ */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                ประเภทสัญญาฉบับต่ออายุ <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                value={contractType}
                onChange={(val) => {
                  const nextType = String(val);
                  setContractType(nextType);
                  if (nextType === 'PERMANENT') {
                    setEndDate('');
                  } else if (startDate) {
                    setEndDate(calculateAutoEndDate(startDate, nextType));
                  }
                }}
                options={[
                  { value: 'FIXED_TERM', label: '1. สัญญาจ้าง (มีกำหนดระยะเวลา - ระบุวันสิ้นสุด)' },
                  { value: 'PROBATION', label: '2. ขยายระยะเวลาทดลองงาน (ระบุวันสิ้นสุด)' },
                  { value: 'PERMANENT', label: '3. บรรจุเป็นพนักงานประจำ (ไม่มีกำหนดวันสิ้นสุดสัญญา)' },
                  { value: 'OTHER', label: '4. อื่นๆ / ฝึกงาน' },
                ]}
                className="w-full"
              />
            </div>

            {/* แจ้งเตือนเมื่อเป็นการปรับเปลี่ยนลดสถานะจากพนักงานประจำ */}
            {isDowngrading && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-2.5 text-amber-800 dark:text-amber-300 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">ข้อควรระวัง (การปรับลดประเภทสัญญา):</span>
                  <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400/90 leading-relaxed">
                    สัญญาเดิมของพนักงานเป็น &ldquo;พนักงานประจำ&rdquo; การเปลี่ยนเป็นสัญญาจ้างมีกำหนดระยะเวลาหรือทดลองงานถือเป็นการปรับเปลี่ยนสถานะสัญญา โปรดตรวจสอบข้อตกลงและนโยบายขององค์กรก่อนดำเนินการ
                  </p>
                </div>
              </div>
            )}

            {/* 3. ช่วงเวลาสัญญาใหม่ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  วันเริ่มต้นสัญญาใหม่ <span className="text-rose-500">*</span>
                </label>
                <ThaiDatePicker
                  value={startDate}
                  onChange={(val) => {
                    setStartDate(val);
                    if (contractType !== 'PERMANENT' && val) {
                      setEndDate(calculateAutoEndDate(val, contractType));
                    }
                  }}
                  placeholder="เลือกวันเริ่มสัญญาใหม่"
                />
                {validationErrors.startDate ? (
                  <p className="mt-1 text-[11px] text-rose-500 dark:text-rose-400 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{validationErrors.startDate}</span>
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                    {contract.contractEndDate || contract.probationEndDate
                      ? 'เริ่มต้นถัดจากวันสิ้นสุดสัญญาเดิมอัตโนมัติ'
                      : 'ค่าเริ่มต้นเป็นวันที่ปัจจุบัน (สามารถคลิกเปลี่ยนวันที่ได้)'}
                  </p>
                )}
              </div>

              {contractType !== 'PERMANENT' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    วันสิ้นสุดสัญญาใหม่ <span className="text-rose-500">*</span>
                  </label>
                  <ThaiDatePicker
                    value={endDate}
                    onChange={(val) => setEndDate(val)}
                    placeholder="เลือกวันสิ้นสุดสัญญาใหม่"
                  />
                  {validationErrors.endDate ? (
                    <p className="mt-1 text-[11px] text-rose-500 dark:text-rose-400 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{validationErrors.endDate}</span>
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                      {contractType === 'PROBATION'
                        ? `คำนวณเริ่มต้น +${activeSettings.probationDays} วันตามเกณฑ์ (สามารถคลิกเปลี่ยนวันที่ได้)`
                        : `คำนวณเริ่มต้น +${activeSettings.fixedTermDays} วันตามเกณฑ์ (สามารถคลิกเปลี่ยนวันที่ได้)`}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mr-2" />
                  <span className="text-xs">บรรจุเป็นพนักงานประจำ (ไม่มีกำหนดวันสิ้นสุดสัญญา)</span>
                </div>
              )}
            </div>

            {/* 4. แนบเอกสารสัญญาฉบับต่ออายุ */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                แนบเอกสารสัญญาฉบับต่ออายุ (PDF หรือรูปภาพ)
              </label>
              {!fileData ? (
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-emerald-500 rounded-xl cursor-pointer bg-slate-50/50 dark:bg-slate-800/40 hover:bg-emerald-50/20 transition-all group">
                  <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-500 mb-1.5 transition-colors" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    คลิกเพื่อเลือกไฟล์สัญญาฉบับใหม่ หรือลากไฟล์มาวาง
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    รองรับ PDF, PNG, JPG, DOCX (สูงสุด 10 MB)
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{fileName}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {fileSize ? (fileSize / (1024 * 1024) >= 1 ? (fileSize / (1024 * 1024)).toFixed(2) + ' MB' : (fileSize / 1024).toFixed(0) + ' KB') : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    aria-label="ลบไฟล์แนบ"
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors cursor-pointer"
                    title="ลบไฟล์แนบ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* 5. หมายเหตุการต่อสัญญา */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                หมายเหตุ / บันทึกการต่อสัญญา (ถ้ามี)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="เช่น ต่อสัญญาจ้างรอบปี 2570 ตามผลการประเมินงาน..."
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            {/* 6. กล่องสรุปสัญญาใหม่ก่อนกดยืนยัน (ลดการกดผิดพลาด) */}
            {startDate && !validationErrors.startDate && !validationErrors.endDate && (
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">สรุปสัญญาใหม่:</span>
                </div>
                <span className="font-bold text-emerald-800 dark:text-emerald-300">
                  {contractType === 'PERMANENT'
                    ? `เริ่ม ${formatThaiDate(startDate)} (ไม่มีกำหนดวันสิ้นสุด)`
                    : endDate
                    ? `${formatThaiDate(startDate)} – ${formatThaiDate(endDate)} (${calculateDaysDifference(startDate, endDate)} วัน)`
                    : `เริ่ม ${formatThaiDate(startDate)}`}
                </span>
              </div>
            )}
          </div>

          {/* Sticky Footer Actions */}
          <div className="px-6 py-3.5 bg-slate-50/80 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-2.5 shrink-0">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || Boolean(validationErrors.startDate || validationErrors.endDate)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <CalendarClock className="w-4 h-4 mr-1.5" />
                  ยืนยันต่ออายุสัญญา
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </ModalShell>
  );
}

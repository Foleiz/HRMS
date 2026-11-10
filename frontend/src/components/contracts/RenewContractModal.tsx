'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  CalendarClock,
  Loader2,
  AlertCircle,
  Upload,
  Trash2,
  FileText,
  User,
  ArrowRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { ModalShell, Button, AvatarName } from '@/components/ui';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { EmploymentContract, RenewContractRequest } from '@/types/contract';
import { EmployeeType } from '@/types/employeeType';
import { employeeTypeService } from '@/services/employeeTypeService';
import { useToast } from '@/context/ToastContext';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface RenewContractModalProps {
  contract: EmploymentContract | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (contractId: number, data: RenewContractRequest) => Promise<void>;
}

export default function RenewContractModal({
  contract,
  isOpen,
  onClose,
  onSubmit,
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

      // กำหนดประเภทสัญญาเริ่มต้น: สำหรับการต่ออายุสัญญาให้เริ่มต้นที่สัญญาจ้าง (มีกำหนดระยะเวลา) เพื่อให้มีวันสิ้นสุดสัญญา
      setContractType('FIXED_TERM');

      // วันที่เริ่มต้นสัญญาใหม่: หากมีวันสิ้นสุดเดิม ให้ใช้วันถัดจากวันสิ้นสุดเดิม หากไม่มีให้ใช้วันนี้
      let defStartDate = '';
      const baseEnd = contract.contractEndDate || contract.probationEndDate;
      if (baseEnd) {
        const d = new Date(baseEnd);
        d.setDate(d.getDate() + 1);
        defStartDate = d.toISOString().split('T')[0];
      } else {
        defStartDate = new Date().toISOString().split('T')[0];
      }
      setStartDate(defStartDate);

      // วันที่สิ้นสุดสัญญาใหม่: เริ่มต้นคำนวณ +1 ปีให้ทันที
      const endD = new Date(defStartDate);
      endD.setFullYear(endD.getFullYear() + 1);
      endD.setDate(endD.getDate() - 1); // เช่น 10/11/2569 ถึง 09/11/2570
      setEndDate(endD.toISOString().split('T')[0]);

      if (contract.employeeTypeId) {
        setEmployeeTypeId(contract.employeeTypeId);
      }
    }
  }, [isOpen, contract]);

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

    if (contractType === 'FIXED_TERM') {
      if (!endDate) {
        toast.warning('กรุณาระบุวันสิ้นสุดสัญญาใหม่');
        return;
      }
      if (new Date(endDate) <= new Date(startDate)) {
        toast.warning('วันสิ้นสุดสัญญาต้องอยู่หลังวันเริ่มต้นสัญญา');
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

  return (
    <ModalShell className="z-50 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200 font-sans" innerClassName="items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700/60 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <ModalHeader
          icon={CalendarClock}
          title="ต่ออายุสัญญาจ้างงาน"
          subtitle={`ดำเนินการต่อสัญญาฉบับใหม่สำหรับ ${contract.employeeName}`}
          onClose={onClose}
        />

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
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
              />
              <div className="min-w-0">
                <p className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{contract.employeeName}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  รหัส: <span className="font-mono font-medium">{contract.employeeCode}</span>
                  {contract.positionTitle && ` • ${contract.positionTitle}`}
                  {contract.departmentName && ` (${contract.departmentName})`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
              <div>
                <span className="text-slate-400 dark:text-slate-500">ประเภทสัญญาเดิม:</span>
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  {contract.employeeTypeName || contract.contractTypeDisplay}
                </p>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500">วันสิ้นสุดสัญญาเดิม:</span>
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  {contract.effectiveEndDateDisplay || contract.contractEndDateDisplay || 'ไม่มีกำหนด'}
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
                } else if (!endDate && startDate) {
                  const endD = new Date(startDate);
                  endD.setFullYear(endD.getFullYear() + 1);
                  setEndDate(endD.toISOString().split('T')[0]);
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

          {/* 3. ช่วงเวลาสัญญาใหม่ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                วันเริ่มต้นสัญญาใหม่ <span className="text-rose-500">*</span>
              </label>
              <ThaiDatePicker
                value={startDate}
                onChange={(val) => setStartDate(val)}
                placeholder="เลือกวันเริ่มสัญญาใหม่"
              />
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
                <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
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
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      {fileSize ? (fileSize / (1024 * 1024) >= 1 ? (fileSize / (1024 * 1024)).toFixed(2) + ' MB' : (fileSize / 1024).toFixed(0) + ' KB') : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
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
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-700/60">
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
              disabled={isSubmitting}
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

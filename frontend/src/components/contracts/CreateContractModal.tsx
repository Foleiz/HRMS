'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Calendar, Loader2, AlertCircle, ExternalLink, Upload, Trash2, FileText } from 'lucide-react';
import { Employee } from '@/types/employee';
import { CreateContractRequest } from '@/types/contract';
import { EmployeeType } from '@/types/employeeType';
import { employeeTypeService } from '@/services/employeeTypeService';
import { EmployeeSelect } from '@/components/ui/EmployeeSelect';
import { useToast } from '@/context/ToastContext';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface CreateContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateContractRequest) => Promise<void>;
  employees: Employee[];
}

export default function CreateContractModal({
  isOpen,
  onClose,
  onSubmit,
  employees,
}: CreateContractModalProps) {
  const toast = useToast();
  const [employeeId, setEmployeeId] = useState<number | ''>('');
  const [contractType, setContractType] = useState<string>('PROBATION');
  const [employeeTypeId, setEmployeeTypeId] = useState<number | undefined>(undefined);
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeType[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);

  // โหลดรายการประเภทสัญญา/การจ้างงานแบบไดนามิกจากระบบ
  useEffect(() => {
    if (isOpen) {
      setEmployeeId(employees.length > 0 ? employees[0].id : '');
      const todayStr = new Date().toISOString().split('T')[0];
      setStartDate(todayStr);

      // คำนวณวันสิ้นสุดทดลองงาน 119 วันตามเกณฑ์กฎหมายแรงงานเริ่มต้น
      const d = new Date();
      d.setDate(d.getDate() + 119);
      setEndDate(d.toISOString().split('T')[0]);
      setErrorMessage(null);
      setFileData(null);
      setFileName(null);
      setFileSize(null);

      // โหลดประเภทการจ้างงาน/สัญญาจ้าง
      employeeTypeService
        .getAll({ status: 'ACTIVE' })
        .then((data) => {
          setEmployeeTypes(data);
          // หาประเภททดลองงานเป็นค่าเริ่มต้น
          const probType = data.find((t) => t.typeCode === 'PROB') || data[0];
          if (probType) {
            setEmployeeTypeId(probType.id);
            setContractType('PROBATION');
          }
        })
        .catch((err) => {
          console.error('Failed to load employee types for modal:', err);
        });
    }
  }, [isOpen, employees]);

  // คำนวณวันสิ้นสุดอัตโนมัติเมื่อเปลี่ยนวันเริ่มสัญญา หรือเปลี่ยนประเภทสัญญา
  const handleTypeSelectChange = (selectedTypeIdStr: string) => {
    const selectedId = Number(selectedTypeIdStr);
    setEmployeeTypeId(selectedId);

    const typeObj = employeeTypes.find((t) => t.id === selectedId);
    let mappedContractType = 'FIXED_TERM';

    if (typeObj) {
      const code = typeObj.typeCode.toUpperCase();
      if (code.includes('PROB')) {
        mappedContractType = 'PROBATION';
      } else if (code.includes('PERM')) {
        mappedContractType = 'PERMANENT';
      } else if (code.includes('CONT') || code.includes('FIXED')) {
        mappedContractType = 'FIXED_TERM';
      } else {
        mappedContractType = 'OTHER';
      }
    }

    setContractType(mappedContractType);

    if (mappedContractType === 'PROBATION' && startDate) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + 119);
      setEndDate(d.toISOString().split('T')[0]);
    } else if (mappedContractType === 'PERMANENT') {
      setEndDate('');
    } else if (startDate) {
      // ค่าเริ่มต้นสัญญาจ้าง 1 ปี
      const d = new Date(startDate);
      d.setFullYear(d.getFullYear() + 1);
      setEndDate(d.toISOString().split('T')[0]);
    }
  };

  // ค่าเริ่มต้นของช่องประเภท = ประเภทปัจจุบันของพนักงานที่เลือก (แก้ได้)
  useEffect(() => {
    if (!isOpen || !employeeId || employeeTypes.length === 0) return;
    const emp = employees.find((e) => e.id === employeeId);
    const current =
      employeeTypes.find((t) => t.id === emp?.employeeTypeId) ||
      employeeTypes.find((t) => t.typeName === emp?.employeeType);
    if (current) handleTypeSelectChange(String(current.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, employeeId, employeeTypes]);

  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    if (contractType === 'PROBATION' && newStart) {
      const d = new Date(newStart);
      d.setDate(d.getDate() + 119);
      setEndDate(d.toISOString().split('T')[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('ไฟล์มีขนาดเกิน 10 MB กรุณาเลือกไฟล์ใหม่');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      toast.warning('กรุณาเลือกพนักงาน');
      return;
    }
    if (!startDate) {
      toast.warning('กรุณาระบุวันที่เริ่มสัญญา');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        employeeId: Number(employeeId),
        contractType,
        employeeTypeId,
        startDate,
        endDate: endDate || undefined,
        status: 'ACTIVE',
        documentFileName: fileName || undefined,
        documentFileData: fileData || undefined,
      });
      onClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = error.response?.data?.message || error.message || 'ไม่สามารถสร้างสัญญาจ้างงานได้';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200 font-sans">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700/60 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="pt-6 pb-2 text-center relative px-6 shrink-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">สร้างสัญญาจ้างใหม่</h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 my-2 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          {/* 1. พนักงาน * */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              พนักงาน <span className="text-rose-500">*</span>
            </label>
            <EmployeeSelect
              employees={employees}
              value={employeeId}
              onChange={(newEmpId) => setEmployeeId(newEmpId)}
              placeholder="เลือกพนักงาน หรือพิมพ์ค้นหา..."
              required
            />
          </div>

          {/* 2. ประเภทสัญญา / การจ้างงาน * */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                ประเภทสัญญา / การจ้างงาน <span className="text-rose-500">*</span>
              </label>
              <Link
                href="/employees/types"
                target="_blank"
                className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium hover:underline"
              >
                <span>จัดการประเภทสัญญา</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <CustomSelect
              value={employeeTypeId || ''}
              onChange={(e) => handleTypeSelectChange(e.target.value)}
              required
              className="w-full h-11 px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 dark:focus:ring-blue-500/20 focus:border-[#0B2046] dark:focus:border-blue-500 transition-all"
            >
              {employeeTypes.length > 0 ? (
                employeeTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.typeName} ({t.typeCode})
                  </option>
                ))
              ) : (
                <>
                  <option value="2">ทดลองงาน</option>
                  <option value="1">ประจำ</option>
                  <option value="3">สัญญาจ้าง</option>
                </>
              )}
            </CustomSelect>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              เมื่อถึงวันเริ่มสัญญา ระบบจะอัปเดตประเภทพนักงานของพนักงานคนนี้ตามสัญญาให้อัตโนมัติ
            </p>
          </div>

          {/* 3. วันที่เริ่มสัญญา * */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              วันที่เริ่มสัญญา <span className="text-rose-500">*</span>
            </label>
            <ThaiDatePicker
              value={startDate}
              onChange={(val) => handleStartDateChange(val)}
              required
            />
          </div>

          {/* 4. วันที่สิ้นสุด / */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              วันที่สิ้นสุด / ครบทดลองงาน
            </label>
            <ThaiDatePicker
              value={endDate}
              minDate={startDate || undefined}
              onChange={(val) => setEndDate(val)}
            />
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 font-normal">
              เว้นว่างได้หากเป็นสัญญาไม่มีกำหนด
            </p>
          </div>

          {/* 5. แนบเอกสารสัญญาจ้างงาน */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              แนบเอกสารสัญญาจ้าง (ไม่บังคับ)
            </label>
            {!fileData ? (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#0B2046] dark:hover:border-blue-500 rounded-xl cursor-pointer bg-slate-50/50 dark:bg-slate-800/40 hover:bg-blue-50/20 transition-all group">
                <Upload className="w-6 h-6 text-slate-400 group-hover:text-[#0B2046] dark:group-hover:text-blue-400 mb-1.5 transition-colors" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  คลิกเพื่อเลือกไฟล์สัญญา หรือลากไฟล์มาวาง
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
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
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

          {/* Buttons Footer */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-700/60">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-200/80 hover:bg-slate-300 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-7 py-2.5 rounded-xl text-sm font-medium text-white bg-[#0B2046] hover:bg-[#07152d] transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <span>บันทึก</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

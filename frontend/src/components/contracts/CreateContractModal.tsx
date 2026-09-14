'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Calendar, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { Employee } from '@/types/employee';
import { CreateContractRequest } from '@/types/contract';
import { EmployeeType } from '@/types/employeeType';
import { employeeTypeService } from '@/services/employeeTypeService';
import { EmployeeSelect } from '@/components/ui/EmployeeSelect';
import { useToast } from '@/context/ToastContext';

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

  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    if (contractType === 'PROBATION' && newStart) {
      const d = new Date(newStart);
      d.setDate(d.getDate() + 119);
      setEndDate(d.toISOString().split('T')[0]);
    }
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
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="pt-6 pb-2 text-center relative px-6">
          <h2 className="text-xl font-bold text-slate-800">สร้างสัญญาจ้างใหม่</h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 my-2 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Form Body ตรงตาม Mockup */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* 1. พนักงาน * */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
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
              <label className="block text-sm font-medium text-slate-700">
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

            <select
              value={employeeTypeId || ''}
              onChange={(e) => handleTypeSelectChange(e.target.value)}
              required
              className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] transition-all"
            >
              {employeeTypes.length > 0 ? (
                employeeTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.typeName} ({t.typeCode})
                  </option>
                ))
              ) : (
                <>
                  <option value="1">ทดลองงาน (PROB)</option>
                  <option value="2">ประจำ (PERM)</option>
                  <option value="3">สัญญาจ้าง (CONT)</option>
                </>
              )}
            </select>
          </div>

          {/* 3. วันที่เริ่มสัญญา * */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              วันที่เริ่มสัญญา <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                required
                className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] transition-all pr-10"
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 4. วันที่สิ้นสุด / */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              วันที่สิ้นสุด / ครบทดลองงาน
            </label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] transition-all pr-10"
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="mt-1 text-xs text-slate-400 font-normal">
              เว้นว่างได้หากเป็นสัญญาไม่มีกำหนด
            </p>
          </div>

          {/* Buttons Footer */}
          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl text-sm font-medium text-slate-700 bg-slate-200/80 hover:bg-slate-300 transition-colors cursor-pointer"
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

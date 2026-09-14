'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import {
  EmployeeType,
  CreateEmployeeTypePayload,
  UpdateEmployeeTypePayload,
} from '@/types/employeeType';

interface CreateEmployeeTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEmployeeTypePayload | UpdateEmployeeTypePayload) => Promise<void>;
  initialData?: EmployeeType | null;
}

export const CreateEmployeeTypeModal: React.FC<CreateEmployeeTypeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [typeCode, setTypeCode] = useState('');
  const [typeName, setTypeName] = useState('');
  const [wageType, setWageType] = useState('MONTHLY');
  const [hasSocialSecurity, setHasSocialSecurity] = useState(true);
  const [hasLeaveEntitlement, setHasLeaveEntitlement] = useState(true);
  const [hasOvertime, setHasOvertime] = useState(true);
  const [hasProvidentFund, setHasProvidentFund] = useState(false);
  const [status, setStatus] = useState('ACTIVE');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (initialData) {
      setTypeCode(initialData.typeCode || '');
      setTypeName(initialData.typeName || '');
      setWageType(initialData.wageType || 'MONTHLY');
      setHasSocialSecurity(initialData.hasSocialSecurity ?? true);
      setHasLeaveEntitlement(initialData.hasLeaveEntitlement ?? true);
      setHasOvertime(initialData.hasOvertime ?? true);
      setHasProvidentFund(initialData.hasProvidentFund ?? false);
      setStatus(initialData.status || 'ACTIVE');
    } else {
      setTypeCode('');
      setTypeName('');
      setWageType('MONTHLY');
      setHasSocialSecurity(true);
      setHasLeaveEntitlement(true);
      setHasOvertime(true);
      setHasProvidentFund(false);
      setStatus('ACTIVE');
    }
    setErrorMessage(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEdit && !typeCode.trim()) {
      setErrorMessage('กรุณาระบุรหัสประเภท (Type Code)');
      return;
    }
    if (!typeName.trim()) {
      setErrorMessage('กรุณาระบุชื่อประเภทสัญญา/การจ้างงาน');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      if (isEdit) {
        await onSubmit({
          typeName: typeName.trim(),
          wageType,
          hasSocialSecurity,
          hasLeaveEntitlement,
          hasOvertime,
          hasProvidentFund,
          status,
        });
      } else {
        await onSubmit({
          typeCode: typeCode.trim().toUpperCase(),
          typeName: typeName.trim(),
          wageType,
          hasSocialSecurity,
          hasLeaveEntitlement,
          hasOvertime,
          hasProvidentFund,
          status,
        });
      }
      onClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { errors?: string[]; message?: string } }; message?: string };
      const apiErrors = error.response?.data?.errors;
      const msg =
        (Array.isArray(apiErrors) && apiErrors.length > 0 ? apiErrors[0] : null) ||
        error.response?.data?.message ||
        error.message ||
        'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0B2046] flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4 text-[#0B2046]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {isEdit ? 'แก้ไขประเภทสัญญา/การจ้างงาน' : 'เพิ่มประเภทสัญญา/การจ้างงานใหม่'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEdit
                  ? `รหัสประเภท: ${initialData?.typeCode}`
                  : 'กำหนดชื่อ รูปแบบค่าตอบแทน และสิทธิประโยชน์ของประเภทการจ้างงาน'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs shadow-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 overflow-y-auto">
          {/* 1. รหัสประเภท (Type Code) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              รหัสประเภท (Type Code) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="เช่น OUTSOURCE, FREELANCE, PROJECT"
              value={typeCode}
              onChange={(e) => setTypeCode(e.target.value.toUpperCase())}
              disabled={isEdit}
              required
              className={`w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] transition-all ${
                isEdit ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
              }`}
            />
            {!isEdit && (
              <p className="text-[11px] text-slate-400 mt-1">
                ใช้ตัวอักษรภาษาอังกฤษตัวพิมพ์ใหญ่และเครื่องหมายขีดล่าง (_) เท่านั้น
              </p>
            )}
          </div>

          {/* 2. ชื่อประเภทสัญญา/การจ้างงาน */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ชื่อประเภทสัญญา/การจ้างงาน <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="เช่น พนักงานสัญญาจ้างโครงการ, ผู้รับเหมาบริการภายนอก"
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              required
              className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] transition-all"
            />
          </div>

          {/* 3. รูปแบบค่าตอบแทน (Wage Type) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                รูปแบบค่าตอบแทน <span className="text-rose-500">*</span>
              </label>
              <select
                value={wageType}
                onChange={(e) => setWageType(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] transition-all"
              >
                <option value="MONTHLY">รายเดือน (Monthly)</option>
                <option value="DAILY">รายวัน (Daily)</option>
                <option value="HOURLY">รายชั่วโมง (Hourly)</option>
                <option value="STIPEND">เบี้ยเลี้ยง / ค่าตอบแทนพิเศษ (Stipend)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                สถานะการใช้งาน
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] transition-all"
              >
                <option value="ACTIVE">เปิดใช้งาน (Active)</option>
                <option value="INACTIVE">ปิดการใช้งาน (Inactive)</option>
              </select>
            </div>
          </div>

          {/* 4. สิทธิ์และสวัสดิการ (Benefits Checkboxes) */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5">
            <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0B2046]" />
              สิทธิประโยชน์และสวัสดิการตามประเภทสัญญา
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-white rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={hasSocialSecurity}
                  onChange={(e) => setHasSocialSecurity(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0B2046] border-slate-300 focus:ring-[#0B2046]"
                />
                <span className="text-slate-700 font-medium">มีสิทธิ์ประกันสังคม</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-white rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={hasLeaveEntitlement}
                  onChange={(e) => setHasLeaveEntitlement(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0B2046] border-slate-300 focus:ring-[#0B2046]"
                />
                <span className="text-slate-700 font-medium">มีสิทธิ์วันลาตามกฎหมาย</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-white rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={hasOvertime}
                  onChange={(e) => setHasOvertime(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0B2046] border-slate-300 focus:ring-[#0B2046]"
                />
                <span className="text-slate-700 font-medium">คิดคำนวณค่าล่วงเวลา (OT)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-white rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={hasProvidentFund}
                  onChange={(e) => setHasProvidentFund(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0B2046] border-slate-300 focus:ring-[#0B2046]"
                />
                <span className="text-slate-700 font-medium">กองทุนสำรองเลี้ยงชีพ</span>
              </label>
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#0B2046] hover:bg-[#07152d] rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEdit ? 'บันทึกการแก้ไข' : 'สร้างประเภทสัญญา'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

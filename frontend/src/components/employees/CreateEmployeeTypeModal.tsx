'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, AlertCircle, Loader2, ShieldCheck, Sparkles, Gift } from 'lucide-react';
import {
  EmployeeType,
  CreateEmployeeTypePayload,
  UpdateEmployeeTypePayload,
} from '@/types/employeeType';
import { BenefitItem } from '@/types/benefit';
import { benefitService } from '@/services/benefitService';

interface CreateEmployeeTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEmployeeTypePayload | UpdateEmployeeTypePayload) => Promise<void>;
  initialData?: EmployeeType | null;
  onOpenManageBenefits?: () => void;
}

export const CreateEmployeeTypeModal: React.FC<CreateEmployeeTypeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  onOpenManageBenefits,
}) => {
  const [typeCode, setTypeCode] = useState('');
  const [typeName, setTypeName] = useState('');
  const [wageType, setWageType] = useState('MONTHLY');
  const [status, setStatus] = useState('ACTIVE');

  // Dynamic Benefits
  const [availableBenefits, setAvailableBenefits] = useState<BenefitItem[]>([]);
  const [selectedBenefitIds, setSelectedBenefitIds] = useState<number[]>([]);
  const [loadingBenefits, setLoadingBenefits] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEdit = Boolean(initialData);

  // Load available active benefits
  useEffect(() => {
    if (isOpen) {
      loadBenefits();
    }
  }, [isOpen]);

  const loadBenefits = async () => {
    try {
      setLoadingBenefits(true);
      const data = await benefitService.getAll({ status: 'ACTIVE' });
      setAvailableBenefits(data);
    } catch {
      // Fallback
    } finally {
      setLoadingBenefits(false);
    }
  };

  useEffect(() => {
    if (initialData) {
      setTypeCode(initialData.typeCode || '');
      setTypeName(initialData.typeName || '');
      setWageType(initialData.wageType || 'MONTHLY');
      setStatus(initialData.status || 'ACTIVE');

      // Initialize selected benefit IDs
      if (initialData.benefits && initialData.benefits.length > 0) {
        setSelectedBenefitIds(initialData.benefits.map((b) => b.id));
      } else {
        // Fallback to statutory flags if benefits array empty
        const ids: number[] = [];
        availableBenefits.forEach((b) => {
          if (b.benefitCode === 'SSO' && initialData.hasSocialSecurity) ids.push(b.id);
          if (b.benefitCode === 'LEAVE' && initialData.hasLeaveEntitlement) ids.push(b.id);
          if (b.benefitCode === 'OT' && initialData.hasOvertime) ids.push(b.id);
          if (b.benefitCode === 'PVD' && initialData.hasProvidentFund) ids.push(b.id);
        });
        setSelectedBenefitIds(ids);
      }
    } else {
      setTypeCode('');
      setTypeName('');
      setWageType('MONTHLY');
      setStatus('ACTIVE');

      // For new type, pre-check standard statutory benefits
      const defaultIds = availableBenefits
        .filter((b) => ['SSO', 'LEAVE', 'OT'].includes(b.benefitCode))
        .map((b) => b.id);
      setSelectedBenefitIds(defaultIds);
    }
    setErrorMessage(null);
  }, [initialData, isOpen, availableBenefits.length]);

  if (!isOpen) return null;

  const toggleBenefit = (id: number) => {
    setSelectedBenefitIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

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

    // Check which statutory codes are selected to keep boolean flags synced
    const selectedCodes = availableBenefits
      .filter((b) => selectedBenefitIds.includes(b.id))
      .map((b) => b.benefitCode);

    const hasSSO = selectedCodes.includes('SSO');
    const hasLeave = selectedCodes.includes('LEAVE');
    const hasOT = selectedCodes.includes('OT');
    const hasPVD = selectedCodes.includes('PVD');

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      if (isEdit) {
        await onSubmit({
          typeName: typeName.trim(),
          wageType,
          hasSocialSecurity: hasSSO,
          hasLeaveEntitlement: hasLeave,
          hasOvertime: hasOT,
          hasProvidentFund: hasPVD,
          status,
          benefitItemIds: selectedBenefitIds,
        });
      } else {
        await onSubmit({
          typeCode: typeCode.trim().toUpperCase(),
          typeName: typeName.trim(),
          wageType,
          hasSocialSecurity: hasSSO,
          hasLeaveEntitlement: hasLeave,
          hasOvertime: hasOT,
          hasProvidentFund: hasPVD,
          status,
          benefitItemIds: selectedBenefitIds,
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
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#0B2046] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Sparkles className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-sm font-bold">
                {isEdit ? 'แก้ไขประเภทสัญญา/การจ้างงาน' : 'เพิ่มประเภทสัญญา/การจ้างงานใหม่'}
              </h2>
              <p className="text-[11px] text-slate-300">
                กำหนดชื่อ รูปแบบค่าตอบแทน และสิทธิประโยชน์ของประเภทการจ้างงาน
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* 1. รหัสประเภท (Type Code) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              รหัสประเภท (Type Code) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isEdit}
              value={typeCode}
              onChange={(e) => setTypeCode(e.target.value.toUpperCase())}
              placeholder="เช่น OUTSOURCE, FREELANCE, PROJECT"
              className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] disabled:bg-slate-50 disabled:text-slate-500 transition-all font-mono"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              ใช้ตัวอักษรภาษาอังกฤษตัวพิมพ์ใหญ่และเครื่องหมายขีดล่าง (_) เท่านั้น
            </span>
          </div>

          {/* 2. ชื่อประเภทสัญญา (Type Name) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ชื่อประเภทสัญญา/การจ้างงาน <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              placeholder="เช่น พนักงานสัญญาจ้างโครงการ, ผู้รับเหมาบริการภายนอก"
              className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] transition-all"
            />
          </div>

          {/* 3. รูปแบบค่าตอบแทน & สถานะ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          {/* 4. สิทธิประโยชน์และสวัสดิการแบบ Dynamic */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#0B2046]" />
                สิทธิประโยชน์และสวัสดิการที่ได้รับ
                <span className="text-[11px] font-normal text-slate-500">
                  ({selectedBenefitIds.length} รายการที่เลือก)
                </span>
              </label>

              <Link
                href="/organization?tab=benefits"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[#0B2046] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                title="เปิดหน้าจัดการสวัสดิการในโครงสร้างองค์กร (แท็บใหม่)"
              >
                <Gift className="w-3.5 h-3.5 text-[#0B2046]" />
                ตั้งค่าสวัสดิการกลาง ↗
              </Link>
            </div>

            {loadingBenefits ? (
              <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#0B2046]" />
                กำลังโหลดรายการสวัสดิการ...
              </div>
            ) : availableBenefits.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">ไม่พบสิทธิประโยชน์ในระบบ</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 max-h-48 overflow-y-auto">
                {availableBenefits.map((b) => {
                  const isChecked = selectedBenefitIds.includes(b.id);
                  return (
                    <label
                      key={b.id}
                      className={`flex items-start gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-white border-[#0B2046]/30 shadow-2xs'
                          : 'bg-white/60 border-slate-200/70 hover:bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleBenefit(b.id)}
                        className="w-4 h-4 mt-0.5 rounded text-[#0B2046] border-slate-300 focus:ring-[#0B2046]"
                      />
                      <div className="flex-1">
                        <span className="text-slate-800 font-medium block leading-tight">
                          {b.benefitName}
                        </span>
                        {b.description && (
                          <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                            {b.description}
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
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

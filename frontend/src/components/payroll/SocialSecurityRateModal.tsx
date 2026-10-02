'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Save,
  HelpCircle,
  Info,
  Sparkles,
  Calculator,
  ArrowRight
} from 'lucide-react';
import { SocialSecurityRate, UpdateSocialSecurityRatePayload } from '@/types/payroll';

interface SocialSecurityRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  rate: SocialSecurityRate | null;
  onSave: (payload: UpdateSocialSecurityRatePayload, id?: number) => Promise<void>;
  onResetDefault: () => Promise<void>;
  isLoading?: boolean;
}

export const SocialSecurityRateModal: React.FC<SocialSecurityRateModalProps> = ({
  isOpen,
  onClose,
  rate,
  onSave,
  onResetDefault,
  isLoading = false,
}) => {
  const [rateName, setRateName] = useState<string>('');
  const [employeePercent, setEmployeePercent] = useState<number>(5.0);
  const [employerPercent, setEmployerPercent] = useState<number>(5.0);
  const [minWageBase, setMinWageBase] = useState<number>(1650);
  const [maxWageBase, setMaxWageBase] = useState<number>(17500);
  const [effectiveFrom, setEffectiveFrom] = useState<string>('2024-01-01');
  const [effectiveTo, setEffectiveTo] = useState<string>('');
  const [status, setStatus] = useState<string>('ACTIVE');

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (rate) {
        setRateName(rate.rateName || 'อัตราเงินสมทบกองทุนประกันสังคม (มาตรา 33)');
        setEmployeePercent(
          Number(rate.employeeContributionPercent) <= 1.0
            ? Math.round(Number(rate.employeeContributionPercent) * 1000) / 10
            : Number(rate.employeeContributionPercent)
        );
        setEmployerPercent(
          Number(rate.employerContributionPercent) <= 1.0
            ? Math.round(Number(rate.employerContributionPercent) * 1000) / 10
            : Number(rate.employerContributionPercent)
        );
        setMinWageBase(Number(rate.minWageBaseAmount) || 1650);
        setMaxWageBase(Number(rate.maxWageBaseAmount) || 17500);
        setEffectiveFrom(rate.effectiveFrom || '2024-01-01');
        setEffectiveTo(rate.effectiveTo || '');
        setStatus(rate.status || 'ACTIVE');
      } else {
        // Defaults
        setRateName('อัตราเงินสมทบกองทุนประกันสังคม (มาตรา 33)');
        setEmployeePercent(5.0);
        setEmployerPercent(5.0);
        setMinWageBase(1650);
        setMaxWageBase(17500);
        setEffectiveFrom(new Date().toISOString().slice(0, 10));
        setEffectiveTo('');
        setStatus('ACTIVE');
      }
      setShowConfirmReset(false);
    }
  }, [isOpen, rate]);

  // Validation
  useEffect(() => {
    const errors: string[] = [];
    if (!rateName.trim()) {
      errors.push('กรุณาระบุชื่อเกณฑ์ประกันสังคม');
    }
    if (isNaN(employeePercent) || employeePercent < 0 || employeePercent > 100) {
      errors.push('อัตราเงินสมทบฝ่ายลูกจ้างต้องอยู่ระหว่าง 0% ถึง 100%');
    }
    if (isNaN(employerPercent) || employerPercent < 0 || employerPercent > 100) {
      errors.push('อัตราเงินสมทบฝ่ายนายจ้างต้องอยู่ระหว่าง 0% ถึง 100%');
    }
    if (isNaN(minWageBase) || minWageBase < 0) {
      errors.push('ฐานค่าจ้างขั้นต่ำต้องเป็นตัวเลขที่ไม่ติดลบ');
    }
    if (isNaN(maxWageBase) || maxWageBase < minWageBase) {
      errors.push('เพดานค่าจ้างสูงสุดต้องมากกว่าหรือเท่ากับฐานค่าจ้างขั้นต่ำ');
    }
    if (!effectiveFrom) {
      errors.push('กรุณาระบุวันที่มีผลบังคับใช้');
    }
    setValidationErrors(errors);
  }, [rateName, employeePercent, employerPercent, minWageBase, maxWageBase, effectiveFrom]);

  if (!isOpen) return null;

  // Real-time calculation previews
  const safeEmpPercent = Math.max(0, employeePercent || 0) / 100;
  const safeCompPercent = Math.max(0, employerPercent || 0) / 100;
  const maxEmpDeduction = Math.round(maxWageBase * safeEmpPercent * 100) / 100;
  const maxCompContribution = Math.round(maxWageBase * safeCompPercent * 100) / 100;
  const minEmpDeduction = Math.round(minWageBase * safeEmpPercent * 100) / 100;
  const totalMaxContribution = Math.round((maxEmpDeduction + maxCompContribution) * 100) / 100;

  const handleApplyPreset = (empP: number, compP: number, maxW: number, minW: number = 1650) => {
    setEmployeePercent(empP);
    setEmployerPercent(compP);
    setMaxWageBase(maxW);
    setMinWageBase(minW);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validationErrors.length > 0) return;

    const payload: UpdateSocialSecurityRatePayload = {
      rateName: rateName.trim(),
      employeeContributionPercent: safeEmpPercent,
      employerContributionPercent: safeCompPercent,
      minWageBaseAmount: minWageBase,
      maxWageBaseAmount: maxWageBase,
      effectiveFrom,
      effectiveTo: effectiveTo ? effectiveTo : null,
      status,
    };

    await onSave(payload, rate?.id);
  };

  const handleConfirmReset = async () => {
    await onResetDefault();
    setShowConfirmReset(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{rate ? 'แก้ไขเกณฑ์และอัตราเงินสมทบประกันสังคม' : 'เพิ่มเกณฑ์อัตราเงินสมทบประกันสังคม'}</span>
                <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  {status === 'ACTIVE' ? 'เปิดใช้งาน' : 'ระงับการใช้'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ปรับปรุงอัตราเงินสมทบฝ่ายลูกจ้าง/นายจ้าง และฐานเพดานค่าจ้างที่ใช้คำนวณหักเงินเดือน
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Quick Presets Bar */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>เทมเพลตอัตรากฎหมายประกันสังคม (Quick Presets):</span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleApplyPreset(5.0, 5.0, 15000, 1650)}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-purple-50 border border-slate-200 dark:border-slate-700 hover:border-purple-300 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:text-purple-700 transition-colors shadow-2xs cursor-pointer"
              >
                มาตรฐาน 5% (เพดาน 15,000 / สูงสุด 750 บ.)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(5.0, 5.0, 17500, 1650)}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-purple-50 border border-slate-200 dark:border-slate-700 hover:border-purple-300 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:text-purple-700 transition-colors shadow-2xs cursor-pointer"
              >
                ปรับเพดานใหม่ 17,500 บ. (สูงสุด 875 บ.)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(3.0, 3.0, 15000, 1650)}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-purple-50 border border-slate-200 dark:border-slate-700 hover:border-purple-300 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:text-purple-700 transition-colors shadow-2xs cursor-pointer"
              >
                ลดหย่อนชั่วคราว 3% (สูงสุด 450 บ.)
              </button>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Rate Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ชื่อเกณฑ์ประกันสังคม <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={rateName}
                onChange={(e) => setRateName(e.target.value)}
                placeholder="เช่น อัตราเงินสมทบกองทุนประกันสังคม (มาตรา 33)"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            {/* Employee Contribution Percent */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                สมทบฝ่ายผู้ประกันตน / ลูกจ้าง (%) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={employeePercent}
                  onChange={(e) => setEmployeePercent(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-purple-900 pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500">
                  %
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">อัตราที่หักออกจากเงินเดือนลูกจ้าง (มาตรฐาน 5%)</p>
            </div>

            {/* Employer Contribution Percent */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                สมทบฝ่ายนายจ้าง / บริษัท (%) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={employerPercent}
                  onChange={(e) => setEmployerPercent(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-purple-900 pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500">
                  %
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">อัตราที่บริษัทสมทบเพิ่มให้อีกส่วน (มาตรฐาน 5%)</p>
            </div>

            {/* Min Wage Base */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ฐานค่าจ้างขั้นต่ำ (บาท) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-slate-500">฿</span>
                <input
                  type="number"
                  step="50"
                  min="0"
                  value={minWageBase}
                  onChange={(e) => setMinWageBase(parseFloat(e.target.value) || 0)}
                  className="w-full pl-7 pr-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">ฐานคิดต่ำสุดตามกฎหมาย (ปกติ 1,650 บาท)</p>
            </div>

            {/* Max Wage Base */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                เพดานค่าจ้างสูงสุด (บาท) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-slate-500">฿</span>
                <input
                  type="number"
                  step="500"
                  min="0"
                  value={maxWageBase}
                  onChange={(e) => setMaxWageBase(parseFloat(e.target.value) || 0)}
                  className="w-full pl-7 pr-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">เพดานสูงสุดที่ใช้คำนวณ (ปกติ 15,000 หรือ 17,500 บาท)</p>
            </div>

            {/* Effective From */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                วันที่มีผลบังคับใช้ <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            {/* Effective To */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                วันสิ้นสุดผลบังคับใช้ (ไม่ระบุ = มีผลต่อเนื่อง)
              </label>
              <input
                type="date"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            {/* Status */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                สถานะการใช้งาน
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer"
              >
                <option value="ACTIVE">เปิดใช้งาน (ACTIVE) — นำไปใช้คำนวณในรอบเงินเดือน</option>
                <option value="INACTIVE">ระงับการใช้งาน (INACTIVE)</option>
              </select>
            </div>
          </div>

          {/* Real-time Calculation Summary Card */}
          <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
              <Calculator className="w-4 h-4 text-purple-700" />
              <span>สรุปผลการคำนวณยอดเงินสมทบจริง (Live Preview):</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-purple-100 shadow-2xs">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">เพดานหักลูกจ้างสูงสุด</span>
                <span className="text-sm font-bold text-purple-900 font-mono mt-0.5 block">
                  ฿{maxEmpDeduction.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                  ({maxWageBase.toLocaleString()} × {employeePercent}%)
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-purple-100 shadow-2xs">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">นายจ้างสมทบสูงสุด</span>
                <span className="text-sm font-bold text-purple-900 font-mono mt-0.5 block">
                  ฿{maxCompContribution.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                  ({maxWageBase.toLocaleString()} × {employerPercent}%)
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-purple-100 shadow-2xs">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">ยอดรวมนำส่งสูงสุด</span>
                <span className="text-sm font-bold text-purple-900 font-mono mt-0.5 block">
                  ฿{totalMaxContribution.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">(ลูกจ้าง + นายจ้าง)</span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-purple-100 shadow-2xs">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">หักขั้นต่ำ (ฐาน ฿{minWageBase.toLocaleString()})</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 font-mono mt-0.5 block">
                  ฿{minEmpDeduction.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">บาท/เดือน</span>
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">ข้อมูลไม่ถูกต้อง:</span>
                <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-[11px]">
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950 shrink-0">
          <div>
            <button
              type="button"
              onClick={() => setShowConfirmReset(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>รีเซ็ตเป็นค่ามาตรฐานกฎหมาย</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || validationErrors.length > 0}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#0B2046] hover:bg-[#112d5e] disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isLoading ? 'กำลังบันทึก...' : 'บันทึกอัตราประกันสังคม'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Reset Defaults Modal */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4 border border-slate-100 dark:border-slate-700/60">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">ยืนยันรีเซ็ตค่ามาตรฐาน?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">คืนค่าเป็นอัตรา 5% ตามกฎหมาย (เพดาน 17,500 บาท ตั้งแต่ปี 2569)</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              ระบบจะรีเซ็ตอัตราสมทบผู้ประกันตน 5% นายจ้าง 5% โดยเก็บประวัติ 2 ช่วง: ฐานค่าจ้าง 1,650 - 15,000 บาท (สูงสุด 750 บาท) ถึง 31 ธ.ค. 2568 และ 1,650 - 17,500 บาท (สูงสุด 875 บาท) ตั้งแต่ 1 ม.ค. 2569
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setShowConfirmReset(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={isLoading}
                className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'กำลังรีเซ็ต...' : 'ยืนยันรีเซ็ต'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

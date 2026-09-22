'use client';

import React, { useState } from 'react';
import { X, ShieldCheck, Lock, FileText, Archive, Loader2, Key, Check } from 'lucide-react';
import { salaryService } from '@/services/salaryService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: 'single' | 'batch';
  payrollId?: number;
  periodId?: number;
  titleName?: string;
  subtitle?: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export const PayslipPasswordModal: React.FC<Props> = ({
  isOpen,
  onClose,
  mode,
  payrollId,
  periodId,
  titleName = '',
  subtitle = '',
  onSuccess,
  onError,
}) => {
  const [selectedOption, setSelectedOption] = useState<'CITIZEN_ID_LAST4' | 'BIRTH_DATE' | 'CUSTOM' | 'NONE'>('CITIZEN_ID_LAST4');
  const [customPassword, setCustomPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      if (mode === 'single') {
        if (!payrollId) {
          onError?.('ไม่พบรหัสรายการเงินเดือน');
          return;
        }

        let effectivePassword: string | undefined = undefined;
        if (selectedOption === 'CUSTOM') {
          if (!customPassword.trim()) {
            onError?.('กรุณากรอกรหัสผ่านที่ต้องการ');
            setIsDownloading(false);
            return;
          }
          effectivePassword = customPassword.trim();
        } else if (selectedOption === 'NONE') {
          effectivePassword = '';
        }
        // CITIZEN_ID_LAST4 passes undefined to backend to auto-extract last 4 digits of citizen ID

        const blob = await salaryService.downloadPayslipPdf(payrollId, effectivePassword);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const cleanName = titleName.replace(/\s+/g, '_');
        a.download = `สลิปเงินเดือน_${cleanName || payrollId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        onSuccess?.('ดาวน์โหลดใบแจ้งเงินเดือนสำเร็จ');
        onClose();
      } else {
        // Batch mode
        if (!periodId) {
          onError?.('ไม่พบรหัสรอบเงินเดือน');
          return;
        }

        const passwordType = selectedOption === 'NONE' ? 'NONE' : (selectedOption === 'BIRTH_DATE' ? 'BIRTH_DATE' : 'CITIZEN_ID_LAST4');
        const blob = await salaryService.downloadPeriodPayslipsZip(periodId, passwordType);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const cleanName = titleName.replace(/\s+/g, '_');
        a.download = `ชุดสลิปเงินเดือน_${cleanName || periodId}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        onSuccess?.('ดาวน์โหลดชุดสลิปเงินเดือนทั้งหมดสำเร็จ');
        onClose();
      }
    } catch (err: any) {
      console.error('Payslip download failed:', err);
      onError?.(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการสร้างไฟล์เอกสาร');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-linear-to-r from-[#0B2046] to-[#153466] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-xs">
              {mode === 'single' ? <FileText className="w-5 h-5 text-blue-200" /> : <Archive className="w-5 h-5 text-emerald-200" />}
            </div>
            <div>
              <h3 className="font-bold text-base">
                {mode === 'single' ? 'ดาวน์โหลดใบแจ้งเงินเดือน' : 'ดาวน์โหลดสลิปเงินเดือนทั้งรอบ'}
              </h3>
              <p className="text-xs text-blue-200 mt-0.5">
                {titleName ? `${titleName} ${subtitle ? `— ${subtitle}` : ''}` : 'กำหนดการรักษาความปลอดภัยของไฟล์'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDownloading}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Security Banner */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200/70 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 leading-relaxed">
              <span className="font-semibold">ระบบคุ้มครองข้อมูลส่วนบุคคล: </span>
              ไฟล์เอกสารจะถูกเข้ารหัสด้วยมาตรฐานความปลอดภัยระดับสูง ผู้เปิดอ่านต้องป้อนรหัสผ่านก่อนดูข้อมูลเงินเดือน
            </div>
          </div>

          {/* Option Selector */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 block">
              เลือกรหัสผ่านสำหรับเปิดไฟล์:
            </label>

            {/* Option 1: Last 4 digits of Citizen ID */}
            <div
              onClick={() => setSelectedOption('CITIZEN_ID_LAST4')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                selectedOption === 'CITIZEN_ID_LAST4'
                  ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/10'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center transition-all ${
                    selectedOption === 'CITIZEN_ID_LAST4' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                  }`}
                >
                  {selectedOption === 'CITIZEN_ID_LAST4' && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span>เลข 4 ตัวท้ายบัตรประชาชน</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
                      แนะนำสำหรับองค์กร
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {mode === 'single'
                      ? 'ใช้เลข 4 หลักสุดท้ายของบัตรประจำตัวประชาชนพนักงานคนนี้'
                      : 'ระบบจะตั้งรหัสผ่านแยกตามเลข 4 หลักท้ายบัตรประชาชนของพนักงานแต่ละคน'}
                  </p>
                </div>
              </div>
              <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            </div>

            {/* Option 2: Birth Date */}
            {mode === 'batch' && (
              <div
                onClick={() => setSelectedOption('BIRTH_DATE')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                  selectedOption === 'BIRTH_DATE'
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/10'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center transition-all ${
                      selectedOption === 'BIRTH_DATE' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                    }`}
                  >
                    {selectedOption === 'BIRTH_DATE' && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      วันเดือนปีเกิดของพนักงาน
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      ตัวเลข 8 หลัก เช่น เกิดวันที่ 15 มกราคม 2535 ให้กรอก 15012535
                    </p>
                  </div>
                </div>
                <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              </div>
            )}

            {/* Option 3: Custom Password (Single mode only) */}
            {mode === 'single' && (
              <div
                onClick={() => setSelectedOption('CUSTOM')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-2.5 ${
                  selectedOption === 'CUSTOM'
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/10'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center transition-all ${
                        selectedOption === 'CUSTOM' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                      }`}
                    >
                      {selectedOption === 'CUSTOM' && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">ระบุรหัสผ่านเอง</div>
                      <p className="text-[11px] text-slate-500 mt-0.5">กำหนดรหัสผ่านเฉพาะสำหรับไฟล์เอกสารนี้</p>
                    </div>
                  </div>
                  <Key className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                </div>

                {selectedOption === 'CUSTOM' && (
                  <div className="pt-2">
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={customPassword}
                        onChange={(e) => setCustomPassword(e.target.value)}
                        placeholder="กรอกรหัสผ่านที่ต้องการ (อย่างน้อย 4 ตัวอักษร)"
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPassword(!showPassword);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-500 hover:text-slate-700"
                      >
                        {showPassword ? 'ซ่อน' : 'แสดง'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Option 4: No password */}
            <div
              onClick={() => setSelectedOption('NONE')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                selectedOption === 'NONE'
                  ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/10'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center transition-all ${
                    selectedOption === 'NONE' ? 'border-amber-600 bg-amber-600' : 'border-slate-300'
                  }`}
                >
                  {selectedOption === 'NONE' && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span>ไม่ใส่รหัสผ่าน</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                      ไม่แนะนำ
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ไฟล์จะสามารถเปิดอ่านได้ทันทีโดยไม่ต้องป้อนรหัสผ่าน
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDownloading}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="px-5 py-2.5 bg-[#0B2046] hover:bg-[#112d5e] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังสร้างไฟล์เอกสาร...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>สร้างและดาวน์โหลดเอกสาร</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

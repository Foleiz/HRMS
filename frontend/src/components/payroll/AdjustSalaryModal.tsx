'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, ArrowUpRight, ArrowDownRight, User, Building2, Briefcase } from 'lucide-react';
import { EmployeeSalaryOverview, AdjustEmployeeSalaryPayload } from '@/types/payroll';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeSalaryOverview | null;
  onSubmit: (employeeId: number, payload: AdjustEmployeeSalaryPayload) => Promise<void>;
}

export const AdjustSalaryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  employee,
  onSubmit,
}) => {
  const [baseSalary, setBaseSalary] = useState<string>('');
  const [effectiveFrom, setEffectiveFrom] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (employee) {
      setBaseSalary(employee.currentSalary ? String(employee.currentSalary) : '');
      // Default to 1st of next month or today
      const today = new Date();
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      setEffectiveFrom(nextMonth.toISOString().split('T')[0]);
      setReason('');
    }
    setError(null);
  }, [employee, isOpen]);

  if (!isOpen || !employee) return null;

  const newSalaryNum = parseFloat(baseSalary);
  const currentSalaryNum = employee.currentSalary || 0;
  const diff = !isNaN(newSalaryNum) ? newSalaryNum - currentSalaryNum : 0;
  const percentChange = currentSalaryNum > 0 && !isNaN(newSalaryNum)
    ? ((diff / currentSalaryNum) * 100).toFixed(1)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isNaN(newSalaryNum) || newSalaryNum <= 0) {
      setError('กรุณากรอกจำนวนเงินเดือนที่ถูกต้อง (> 0 บาท)');
      return;
    }
    if (!effectiveFrom) {
      setError('กรุณาระบุวันที่มีผลบังคับใช้');
      return;
    }

    if (employee.currentEffectiveFrom && effectiveFrom <= employee.currentEffectiveFrom) {
      setError(`วันที่มีผล (${effectiveFrom}) ต้องมากกว่าวันที่มีผลของเงินเดือนปัจจุบัน (${employee.currentEffectiveFrom})`);
      return;
    }

    try {
      setLoading(true);
      const payload: AdjustEmployeeSalaryPayload = {
        baseSalary: newSalaryNum,
        effectiveFrom,
        reason: reason.trim() || undefined,
      };

      await onSubmit(employee.employeeId, payload);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการปรับเงินเดือน');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div>
            <h3 className="text-lg font-bold text-slate-800">ปรับฐานเงินเดือนพนักงาน</h3>
            <p className="text-xs text-slate-500 mt-0.5">บันทึกอัตราเงินเดือนใหม่พร้อมวันที่มีผล</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Employee Summary Card */}
        <div className="mx-6 mt-5 p-4 bg-slate-50/80 border border-slate-200/70 rounded-2xl space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0B2046]/10 text-[#0B2046] flex items-center justify-center font-bold text-sm">
              {employee.employeeCode.slice(-3)}
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">{employee.employeeName}</h4>
              <p className="text-xs text-slate-500 font-mono">{employee.employeeCode}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate">{employee.departmentName || 'ไม่ระบุแผนก'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate">{employee.positionName || 'ไม่ระบุตำแหน่ง'}</span>
            </div>
          </div>

          {/* Reference Structure Banner */}
          {(employee.salaryStructureMin != null || employee.salaryStructureMax != null) && (
            <div className="text-[11px] text-slate-500 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center justify-between">
              <span>กรอบเงินเดือนตามตำแหน่ง:</span>
              <span className="font-semibold text-slate-700">
                ฿{employee.salaryStructureMin?.toLocaleString()} - ฿{employee.salaryStructureMax?.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current vs New Salary */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">เงินเดือนปัจจุบัน</label>
              <div className="px-3.5 py-2.5 bg-slate-100 rounded-xl text-sm font-semibold text-slate-700">
                {currentSalaryNum > 0 ? `฿${currentSalaryNum.toLocaleString()}` : 'ยังไม่มีข้อมูล'}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                เงินเดือนใหม่ <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="500"
                  required
                  placeholder="เช่น 35000"
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(e.target.value)}
                  className="w-full text-sm pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] focus:bg-white transition-all font-semibold text-slate-900"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400">฿</span>
              </div>
            </div>
          </div>

          {/* Diff Indicator */}
          {diff !== 0 && !isNaN(diff) && (
            <div
              className={`p-2.5 rounded-xl text-xs flex items-center justify-between ${
                diff > 0
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              <div className="flex items-center gap-1.5 font-medium">
                {diff > 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-amber-600" />
                )}
                <span>{diff > 0 ? 'ปรับขึ้น' : 'ปรับลง'}: {Math.abs(diff).toLocaleString()} บาท</span>
              </div>
              {percentChange && <span className="font-bold">{diff > 0 ? `+${percentChange}%` : `${percentChange}%`}</span>}
            </div>
          )}

          {/* Effective Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              วันที่มีผลบังคับใช้ <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] focus:bg-white transition-all text-slate-800"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              ระบบจะปิดการใช้งานเงินเดือนเดิมในวันก่อนหน้าวันที่มีผลนี้ให้อัตโนมัติ
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              เหตุผลหรือบันทึกการปรับเงินเดือน
            </label>
            <textarea
              rows={2}
              placeholder="เช่น ปรับประจำปี, ผ่านการทดลองงาน, เลื่อนตำแหน่ง..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-sm px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] focus:bg-white transition-all text-slate-800 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B2046] hover:bg-[#0B2046]/90 text-white rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                'ยืนยันปรับเงินเดือน'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

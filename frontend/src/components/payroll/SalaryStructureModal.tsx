'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { SalaryStructure, CreateSalaryStructurePayload, UpdateSalaryStructurePayload } from '@/types/payroll';
import { Position, EmployeeLevel } from '@/types/organization';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  structure: SalaryStructure | null;
  positions: Position[];
  levels: EmployeeLevel[];
  onSubmit: (payload: CreateSalaryStructurePayload | UpdateSalaryStructurePayload, id?: number) => Promise<void>;
}

export const SalaryStructureModal: React.FC<Props> = ({
  isOpen,
  onClose,
  structure,
  positions,
  levels,
  onSubmit,
}) => {
  const [positionId, setPositionId] = useState<string>('');
  const [employeeLevelId, setEmployeeLevelId] = useState<string>('');
  const [minSalary, setMinSalary] = useState<string>('');
  const [maxSalary, setMaxSalary] = useState<string>('');
  const [defaultSalary, setDefaultSalary] = useState<string>('');
  const [approvalLimit, setApprovalLimit] = useState<string>('');
  const [effectiveFrom, setEffectiveFrom] = useState<string>('');
  const [effectiveTo, setEffectiveTo] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (structure) {
      setPositionId(structure.positionId ? String(structure.positionId) : '');
      setEmployeeLevelId(structure.employeeLevelId ? String(structure.employeeLevelId) : '');
      setMinSalary(String(structure.minSalary || ''));
      setMaxSalary(String(structure.maxSalary || ''));
      setDefaultSalary(structure.defaultSalary != null ? String(structure.defaultSalary) : '');
      setApprovalLimit(structure.approvalLimit != null ? String(structure.approvalLimit) : '');
      setEffectiveFrom(structure.effectiveFrom || '');
      setEffectiveTo(structure.effectiveTo || '');
    } else {
      setPositionId('');
      setEmployeeLevelId('');
      setMinSalary('');
      setMaxSalary('');
      setDefaultSalary('');
      setApprovalLimit('');
      setEffectiveFrom(new Date().toISOString().split('T')[0]);
      setEffectiveTo('');
    }
    setError(null);
  }, [structure, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const min = parseFloat(minSalary);
    const max = parseFloat(maxSalary);
    const def = defaultSalary ? parseFloat(defaultSalary) : undefined;
    const limit = approvalLimit ? parseFloat(approvalLimit) : undefined;

    if (isNaN(min) || min < 0) {
      setError('กรุณาระบุเงินเดือนขั้นต่ำที่ถูกต้อง (>= 0)');
      return;
    }
    if (isNaN(max) || max < min) {
      setError('เงินเดือนเพดานสูงสุดต้องมากกว่าหรือเท่ากับเงินเดือนขั้นต่ำ');
      return;
    }
    if (def !== undefined && (def < min || def > max)) {
      setError(`เงินเดือนเริ่มต้นต้องอยู่ระหว่าง ${min.toLocaleString()} ถึง ${max.toLocaleString()} บาท`);
      return;
    }
    if (!effectiveFrom) {
      setError('กรุณาระบุวันที่มีผลบังคับใช้');
      return;
    }

    try {
      setLoading(true);
      const payload: CreateSalaryStructurePayload = {
        positionId: positionId ? parseInt(positionId) : null,
        employeeLevelId: employeeLevelId ? parseInt(employeeLevelId) : null,
        minSalary: min,
        maxSalary: max,
        defaultSalary: def,
        approvalLimit: limit,
        effectiveFrom,
        effectiveTo: effectiveTo || null,
      };

      await onSubmit(payload, structure?.id);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {structure ? 'แก้ไขโครงสร้างกรอบเงินเดือน' : 'กำหนดโครงสร้างกรอบเงินเดือนใหม่'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              กำหนดอัตราเงินเดือนขั้นต่ำ เพดานสูงสุด และค่าเริ่มต้นสำหรับตำแหน่งงาน
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Position & Level Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">ตำแหน่งงาน</label>
              <select
                value={positionId}
                onChange={(e) => setPositionId(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] focus:bg-white transition-all text-slate-800"
              >
                <option value="">-- ใช้กับทุกตำแหน่ง --</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.positionName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">ระดับตำแหน่ง (Level)</label>
              <select
                value={employeeLevelId}
                onChange={(e) => setEmployeeLevelId(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] focus:bg-white transition-all text-slate-800"
              >
                <option value="">-- ใช้กับทุกระดับ --</option>
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.levelName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Min & Max Salary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                เงินเดือนขั้นต่ำ (Min Salary) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  placeholder="เช่น 15000"
                  value={minSalary}
                  onChange={(e) => setMinSalary(e.target.value)}
                  className="w-full text-sm pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] focus:bg-white transition-all text-slate-800"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400">฿</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                เพดานสูงสุด (Max Salary) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  placeholder="เช่น 35000"
                  value={maxSalary}
                  onChange={(e) => setMaxSalary(e.target.value)}
                  className="w-full text-sm pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] focus:bg-white transition-all text-slate-800"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400">฿</span>
              </div>
            </div>
          </div>

          {/* Default Salary & Approval Limit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">เงินเดือนเริ่มต้น (Mid / Default)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="เช่น 20000"
                  value={defaultSalary}
                  onChange={(e) => setDefaultSalary(e.target.value)}
                  className="w-full text-sm pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] focus:bg-white transition-all text-slate-800"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400">฿</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">เพดานอำนาจอนุมัติ (Approval Limit)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="10000"
                  placeholder="เช่น 50000"
                  value={approvalLimit}
                  onChange={(e) => setApprovalLimit(e.target.value)}
                  className="w-full text-sm pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] focus:bg-white transition-all text-slate-800"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400">฿</span>
              </div>
            </div>
          </div>

          {/* Effective Period */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                วันที่มีผลเริ่มต้น <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] focus:bg-white transition-all text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">วันที่มีผลสิ้นสุด (เว้นว่างได้)</label>
              <input
                type="date"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] focus:bg-white transition-all text-slate-800"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
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
                'บันทึกโครงสร้างเงินเดือน'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

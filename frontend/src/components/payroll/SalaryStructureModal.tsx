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
  levels,
  onSubmit,
}) => {
  const [employeeLevelId, setEmployeeLevelId] = useState<string>('');
  const [minSalary, setMinSalary] = useState<string>('');
  const [maxSalary, setMaxSalary] = useState<string>('');
  const [positionAllowance, setPositionAllowance] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (structure) {
      setEmployeeLevelId(structure.employeeLevelId ? String(structure.employeeLevelId) : '');
      setMinSalary(structure.minSalary ? String(structure.minSalary) : '');
      setMaxSalary(structure.maxSalary ? String(structure.maxSalary) : '');
      setPositionAllowance(structure.positionAllowance != null ? String(structure.positionAllowance) : '0');
      setIsActive(structure.status ? structure.status.toUpperCase() === 'ACTIVE' : true);
    } else {
      setEmployeeLevelId('');
      setMinSalary('');
      setMaxSalary('');
      setPositionAllowance('');
      setIsActive(true);
    }
    setError(null);
  }, [structure, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const min = parseFloat(minSalary);
    const max = parseFloat(maxSalary);
    const allowance = positionAllowance ? parseFloat(positionAllowance) : 0;

    if (!employeeLevelId) {
      setError('กรุณาเลือกระดับพนักงาน');
      return;
    }
    if (isNaN(min) || min < 0) {
      setError('กรุณาระบุเงินเดือนขั้นต่ำที่ถูกต้อง (>= 0)');
      return;
    }
    if (isNaN(max) || max < min) {
      setError('เงินเดือนขั้นสูงต้องมากกว่าหรือเท่ากับเงินเดือนขั้นต่ำ');
      return;
    }
    if (isNaN(allowance) || allowance < 0) {
      setError('ค่าตำแหน่งต้องไม่น้อยกว่า 0');
      return;
    }

    try {
      setLoading(true);
      // Default salary is halfway or equal to min to pass database constraint
      const defSalary = min;
      const today = new Date().toISOString().split('T')[0];

      const payload: CreateSalaryStructurePayload = {
        employeeLevelId: parseInt(employeeLevelId),
        positionId: structure?.positionId || null,
        minSalary: min,
        maxSalary: max,
        defaultSalary: defSalary,
        positionAllowance: allowance,
        status: isActive ? 'ACTIVE' : 'INACTIVE',
        effectiveFrom: structure?.effectiveFrom || today,
        effectiveTo: structure?.effectiveTo || null,
        approvalLimit: structure?.approvalLimit || 0,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        {/* Header - Centered title matching mockup */}
        <div className="relative px-6 pt-6 pb-4 text-center">
          <h3 className="text-lg font-bold text-slate-900">
            {structure ? 'แก้ไขโครงสร้างเงินเดือน' : 'เพิ่มโครงสร้างเงินเดือน'}
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ระดับพนักงาน */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">ระดับพนักงาน</label>
            <select
              value={employeeLevelId}
              onChange={(e) => setEmployeeLevelId(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] transition-all text-slate-800"
              required
            >
              <option value="">เลือกระดับพนักงาน</option>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.levelCode ? `${l.levelCode} - ` : ''}{l.levelName}
                </option>
              ))}
            </select>
          </div>

          {/* เงินเดือนขั้นต่ำ */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">เงินเดือนขั้นต่ำ</label>
            <input
              type="number"
              min="0"
              step="100"
              placeholder="0.00"
              value={minSalary}
              onChange={(e) => setMinSalary(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] transition-all text-slate-800 placeholder-slate-400"
              required
            />
          </div>

          {/* เงินเดือนขั้นสูง */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">เงินเดือนขั้นสูง</label>
            <input
              type="number"
              min="0"
              step="100"
              placeholder="0.00"
              value={maxSalary}
              onChange={(e) => setMaxSalary(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] transition-all text-slate-800 placeholder-slate-400"
              required
            />
          </div>

          {/* ค่าตำแหน่ง */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">ค่าตำแหน่ง</label>
            <input
              type="number"
              min="0"
              step="100"
              placeholder="0.00"
              value={positionAllowance}
              onChange={(e) => setPositionAllowance(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046] transition-all text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* เปิดการใช้งานตำแหน่งนี้ (Toggle Switch) */}
          <div className="flex items-center justify-between pt-2 pb-1">
            <span className="text-xs font-medium text-slate-800">เปิดการใช้งานตำแหน่งนี้</span>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isActive ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Action Buttons: ยกเลิก / บันทึก */}
          <div className="grid grid-cols-2 gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer text-center"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-xl text-xs font-medium shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                'บันทึก'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


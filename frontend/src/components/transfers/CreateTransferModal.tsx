'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Calendar, AlertCircle } from 'lucide-react';
import { employeeService } from '@/services/employeeService';
import { organizationService } from '@/services/organizationService';
import { transferService } from '@/services/transferService';
import { Employee } from '@/types/employee';
import { Department, Position } from '@/types/organization';
import { EmployeeSelect } from '@/components/ui/EmployeeSelect';

interface CreateTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTransferModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateTransferModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [transferType, setTransferType] = useState<string>('DEPARTMENT_TRANSFER');
  const [fromDisplay, setFromDisplay] = useState<string>('');
  const [toDepartmentId, setToDepartmentId] = useState<string>('');
  const [toPositionId, setToPositionId] = useState<string>('');
  const [toManagerId, setToManagerId] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [orderNo, setOrderNo] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [autoApprove, setAutoApprove] = useState<boolean>(false);

  // Load master data on open
  useEffect(() => {
    if (isOpen) {
      const loadOptions = async () => {
        try {
          setLoadingData(true);
          setError(null);
          const [emps, depts, poss] = await Promise.all([
            employeeService.getAll(),
            organizationService.getDepartments(),
            organizationService.getPositions(),
          ]);
          setEmployees(emps || []);
          setDepartments(depts || []);
          setPositions(poss || []);
        } catch (err: any) {
          console.error('Failed to load modal master data:', err);
          setError(err.message || 'ไม่สามารถโหลดข้อมูลพนักงานและแผนกได้');
        } finally {
          setLoadingData(false);
        }
      };
      loadOptions();
    }
  }, [isOpen]);

  // When selected employee changes, update "จากตำแหน่ง/แผนกเดิม"
  useEffect(() => {
    if (!selectedEmployeeId) {
      setFromDisplay('');
      return;
    }
    const emp = employees.find((e) => e.id === Number(selectedEmployeeId));
    if (emp) {
      const dept = emp.departmentName || '';
      const pos = emp.positionName || '';
      if (dept && pos) {
        setFromDisplay(`${dept} (${pos})`);
      } else if (dept) {
        setFromDisplay(dept);
      } else if (pos) {
        setFromDisplay(pos);
      } else {
        setFromDisplay('ยังไม่มีข้อมูลสังกัดเดิม');
      }
    }
  }, [selectedEmployeeId, employees]);

  // Filter positions by selected department
  const filteredPositions = toDepartmentId
    ? positions.filter((p) => p.departmentId === Number(toDepartmentId))
    : positions;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      setError('กรุณาเลือกพนักงาน');
      return;
    }
    if (!toDepartmentId) {
      setError('กรุณาเลือกแผนกเป้าหมาย');
      return;
    }
    if (!toPositionId) {
      setError('กรุณาเลือกตำแหน่งเป้าหมาย');
      return;
    }
    if (!effectiveDate) {
      setError('กรุณาระบุวันที่มีผล');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const targetDept = departments.find((d) => d.id === Number(toDepartmentId));

      await transferService.create({
        employeeId: Number(selectedEmployeeId),
        transferType,
        toDivisionId: targetDept?.divisionId,
        toDepartmentId: Number(toDepartmentId),
        toPositionId: Number(toPositionId),
        toManagerId: toManagerId ? Number(toManagerId) : undefined,
        effectiveDate,
        orderNo: orderNo.trim() || undefined,
        reason: reason.trim() || undefined,
        autoApprove,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create transfer request:', err);
      setError(err.response?.data?.message || err.message || 'ไม่สามารถสร้างคำขอย้ายได้');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header ตรงตาม Mockup */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800 tracking-tight">
            สร้างคำขอย้าย / เลื่อนตำแหน่ง
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form ตรงตาม Mockup 100% */}
        <form onSubmit={handleSubmit} className="p-7 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. พนักงาน * (Searchable Combobox) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 block">
              พนักงาน <span className="text-rose-500">*</span>
            </label>
            <EmployeeSelect
              employees={employees}
              value={selectedEmployeeId ? Number(selectedEmployeeId) : ''}
              onChange={(empId) => setSelectedEmployeeId(empId ? String(empId) : '')}
              placeholder="เลือกพนักงาน หรือพิมพ์ค้นหา..."
              disabled={loadingData}
              required
            />
          </div>

          {/* 2. ประเภทคำขอ * */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 block">
              ประเภทคำขอ <span className="text-rose-500">*</span>
            </label>
            <select
              value={transferType}
              onChange={(e) => setTransferType(e.target.value)}
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
              required
            >
              <option value="DEPARTMENT_TRANSFER">ย้ายแผนก</option>
              <option value="PROMOTION">เลื่อนตำแหน่ง</option>
              <option value="TRANSFER_AND_PROMOTION">โอนย้ายและเลื่อนตำแหน่ง</option>
              <option value="PROMOTION_AND_SUPERVISOR">เลื่อนตำแหน่ง + เปลี่ยนหัวหน้างาน</option>
            </select>
          </div>

          {/* 3. จากตำแหน่ง/แผนกเดิม (Auto-filled read-only) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 block">
              จากตำแหน่ง/แผนกเดิม
            </label>
            <input
              type="text"
              readOnly
              value={fromDisplay}
              placeholder="เช่น ฝ่ายขาย"
              className="w-full h-10 px-3.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none cursor-not-allowed"
            />
          </div>

          {/* 4. ไปยัง * (แผนก + ตำแหน่งเป้าหมาย) */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700 block">
              ไปยัง <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <select
                value={toDepartmentId}
                onChange={(e) => {
                  setToDepartmentId(e.target.value);
                  setToPositionId('');
                }}
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                required
              >
                <option value="">เลือกแผนกเป้าหมาย...</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.departmentName}
                  </option>
                ))}
              </select>

              <select
                value={toPositionId}
                onChange={(e) => setToPositionId(e.target.value)}
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                required
              >
                <option value="">เลือกตำแหน่งเป้าหมาย...</option>
                {filteredPositions.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.positionName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. วันที่มีผล */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 block">
              วันที่มีผล <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full h-10 pl-3.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                required
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 6. หัวหน้างานสายตรงเป้าหมาย (ถ้ามี) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 block">
              หัวหน้างานสายตรงใหม่ (ถ้ามี)
            </label>
            <EmployeeSelect
              employees={employees.filter((emp) => emp.id !== Number(selectedEmployeeId))}
              value={toManagerId ? Number(toManagerId) : ''}
              onChange={(empId) => setToManagerId(empId ? String(empId) : '')}
              placeholder="ไม่ระบุ / คงเดิม (พิมพ์ค้นหา...)"
              disabled={loadingData}
              required={false}
            />
          </div>

          {/* 7. ตัวเลือกมีผลทันที */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="autoApprove"
              checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
              className="w-4 h-4 text-[#0B2046] border-slate-300 rounded focus:ring-[#0B2046]"
            />
            <label htmlFor="autoApprove" className="text-xs text-slate-600 cursor-pointer">
              อนุมัติและปรับปรุงประวัติตำแหน่งงานทันที (Auto-Approve)
            </label>
          </div>

          {/* Footer Buttons ตรงตาม Mockup (ยกเลิก / บันทึก) */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-xs font-medium text-slate-600 bg-slate-200/70 hover:bg-slate-200 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl text-xs font-medium text-white bg-[#0B2046] hover:bg-[#081836] transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>บันทึก</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

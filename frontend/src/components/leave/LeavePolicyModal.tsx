'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, ChevronDown } from 'lucide-react';
import { LeaveType, LeavePolicy, CreateLeavePolicyPayload, UpdateLeavePolicyPayload } from '@/types/leave';

interface EmployeeLevelOption {
  id: number;
  levelName: string;
}

interface LeavePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  policyToEdit?: LeavePolicy | null;
  leaveTypes: LeaveType[];
  employeeLevels: EmployeeLevelOption[];
  onSubmitCreate: (data: CreateLeavePolicyPayload) => Promise<void>;
  onSubmitUpdate: (id: number, data: UpdateLeavePolicyPayload) => Promise<void>;
}

export const LeavePolicyModal: React.FC<LeavePolicyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  policyToEdit,
  leaveTypes,
  employeeLevels,
  onSubmitCreate,
  onSubmitUpdate,
}) => {
  const isEditing = !!policyToEdit;

  // Section 1: ประเภทการลาและกลุ่มเป้าหมาย
  const [leaveTypeId, setLeaveTypeId] = useState<number>(0);
  const [employeeLevelId, setEmployeeLevelId] = useState<number | ''>('');

  // Section 2: โควต้าสิทธิ์และเกณฑ์อายุงาน
  const [entitlementDays, setEntitlementDays] = useState<number | ''>(10);
  const [minimumServiceDays, setMinimumServiceDays] = useState<number | ''>(365);
  const [isAllowedDuringProbation, setIsAllowedDuringProbation] = useState(false);

  // Section 3: เงื่อนไขการยืนยันคำขอและเอกสารแนบ
  const [advanceRequestDays, setAdvanceRequestDays] = useState<number | ''>(3);
  const [docCondition, setDocCondition] = useState<string>('NONE'); // NONE, ALWAYS, AFTER_3, AFTER_2, AFTER_5

  // Section 4: นโยบายการยกยอดวันลาข้ามปี
  const [maxCarryDays, setMaxCarryDays] = useState<number | ''>(10);
  const [expiryDays, setExpiryDays] = useState<number | ''>(180);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (policyToEdit) {
      setLeaveTypeId(policyToEdit.leaveTypeId);
      setEmployeeLevelId(policyToEdit.employeeLevelId ?? '');
      setEntitlementDays(policyToEdit.entitlementDays);
      setMinimumServiceDays(policyToEdit.minimumServiceDays);
      setIsAllowedDuringProbation(policyToEdit.isAllowedDuringProbation);
      setAdvanceRequestDays(policyToEdit.advanceRequestDays);

      // Map document requirement
      if (!policyToEdit.isDocumentRequired) {
        setDocCondition('NONE');
      } else if (policyToEdit.documentRequiredAfterDays === 0 || policyToEdit.documentRequiredAfterDays === null) {
        setDocCondition('ALWAYS');
      } else if (policyToEdit.documentRequiredAfterDays === 2) {
        setDocCondition('AFTER_2');
      } else if (policyToEdit.documentRequiredAfterDays === 3) {
        setDocCondition('AFTER_3');
      } else if (policyToEdit.documentRequiredAfterDays === 5) {
        setDocCondition('AFTER_5');
      } else {
        setDocCondition('AFTER_3');
      }

      // Map carry forward
      if (policyToEdit.isCarryForwardAllowed) {
        setMaxCarryDays(policyToEdit.carryForwardMaxMonths || policyToEdit.entitlementDays);
        setExpiryDays(policyToEdit.carryForwardExpiryMonths ? policyToEdit.carryForwardExpiryMonths * 30 : 180);
      } else {
        setMaxCarryDays('');
        setExpiryDays('');
      }
    } else {
      setLeaveTypeId(leaveTypes[0]?.id || 0);
      setEmployeeLevelId('');
      setEntitlementDays(10);
      setMinimumServiceDays(365);
      setIsAllowedDuringProbation(false);
      setAdvanceRequestDays(3);
      setDocCondition('NONE');
      setMaxCarryDays(10);
      setExpiryDays(180);
    }
    setError(null);
  }, [policyToEdit, leaveTypes, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveTypeId) {
      setError('กรุณาเลือกประเภทการลา');
      return;
    }
    if (entitlementDays === '' || Number(entitlementDays) < 0) {
      setError('กรุณาระบุจำนวนวันลาที่ได้รับต่อปี');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Document condition resolution
      let isDocReq = false;
      let docAfterDays: number | null = null;
      if (docCondition === 'ALWAYS') {
        isDocReq = true;
        docAfterDays = 0;
      } else if (docCondition === 'AFTER_2') {
        isDocReq = true;
        docAfterDays = 2;
      } else if (docCondition === 'AFTER_3') {
        isDocReq = true;
        docAfterDays = 3;
      } else if (docCondition === 'AFTER_5') {
        isDocReq = true;
        docAfterDays = 5;
      }

      // Carry forward resolution
      const hasCarry = maxCarryDays !== '' && Number(maxCarryDays) > 0;
      const expiryMonths = expiryDays !== '' && Number(expiryDays) > 0 ? Math.round(Number(expiryDays) / 30) : null;
      const carryMax = hasCarry ? Number(maxCarryDays) : null;

      const payload = {
        employeeTypeId: 1, // Full-Time Permanent default
        employeeLevelId: employeeLevelId === '' ? null : Number(employeeLevelId),
        entitlementDays: Number(entitlementDays),
        minimumServiceDays: minimumServiceDays === '' ? 0 : Number(minimumServiceDays),
        advanceRequestDays: advanceRequestDays === '' ? 0 : Number(advanceRequestDays),
        isDocumentRequired: isDocReq,
        documentRequiredAfterDays: docAfterDays,
        isCarryForwardAllowed: hasCarry,
        carryForwardMaxMonths: carryMax,
        carryForwardExpiryMonths: expiryMonths,
        isAllowedDuringProbation,
        effectiveFrom: new Date().toISOString().split('T')[0],
      };

      if (isEditing && policyToEdit) {
        await onSubmitUpdate(policyToEdit.id, payload);
      } else {
        await onSubmitCreate({
          leaveTypeId,
          ...payload,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col border border-gray-100">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-800 text-center flex-1">
            {isEditing ? 'แก้ไขสิทธิ์การลา' : 'เพิ่มสิทธิ์การลา'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* 1. ประเภทการลาและกลุ่มเป้าหมาย */}
          <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-100 space-y-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              1. ประเภทการลาและกลุ่มเป้าหมาย
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* ประเภทการลา */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  ประเภทการลา
                </label>
                <div className="relative">
                  <select
                    disabled={isEditing}
                    value={leaveTypeId}
                    onChange={(e) => setLeaveTypeId(Number(e.target.value))}
                    className={`w-full appearance-none pl-3.5 pr-9 py-2.5 rounded-xl border ${
                      isEditing ? 'bg-gray-100 text-gray-500' : 'bg-white'
                    } border-gray-200 text-xs font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 shadow-sm`}
                    required
                  >
                    {leaveTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.leaveName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* กลุ่มเป้าหมายที่บังคับใช้ */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  กลุ่มเป้าหมายที่บังคับใช้
                </label>
                <div className="relative">
                  <select
                    value={employeeLevelId}
                    onChange={(e) => setEmployeeLevelId(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full appearance-none pl-3.5 pr-9 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 shadow-sm"
                  >
                    <option value="">ทุกระดับ</option>
                    {employeeLevels.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>
                        {lvl.levelName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* 2. โควต้าสิทธิ์และเกณฑ์อายุงาน */}
          <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-100 space-y-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              2. โควต้าสิทธิ์และเกณฑ์อายุงาน
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* จำนวนวันลาที่ได้รับต่อปี */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  จำนวนวันลาที่ได้รับต่อปี
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="10"
                    value={entitlementDays}
                    onChange={(e) => setEntitlementDays(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full pl-3.5 pr-14 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 shadow-sm"
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                    วัน/ปี
                  </span>
                </div>
              </div>

              {/* อายุงานขั้นต่ำที่เริ่มใช้สิทธิ์ได้ */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  อายุงานขั้นต่ำที่เริ่มใช้สิทธิ์ได้
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    placeholder="365"
                    value={minimumServiceDays}
                    onChange={(e) => setMinimumServiceDays(e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="w-full pl-3.5 pr-12 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                    วัน
                  </span>
                </div>
              </div>
            </div>

            {/* Checkbox: อนุญาตให้ใช้สิทธิ์ได้ในระหว่างทดลองงาน */}
            <div className="pt-1">
              <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAllowedDuringProbation}
                  onChange={(e) => setIsAllowedDuringProbation(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-700 font-medium">
                  อนุญาตให้ใช้สิทธิ์ได้ในระหว่างทดลองงาน
                </span>
              </label>
            </div>
          </div>

          {/* 3. เงื่อนไขการยืนยันคำขอและเอกสารแนบ */}
          <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-100 space-y-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              3. เงื่อนไขการยืนยันคำขอและเอกสารแนบ
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* ต้องยื่นคำขอล่วงหน้าอย่างน้อย */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  ต้องยื่นคำขอล่วงหน้าอย่างน้อย
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    placeholder="3"
                    value={advanceRequestDays}
                    onChange={(e) => setAdvanceRequestDays(e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="w-full pl-3.5 pr-12 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                    วัน
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">ใส่ 0 หากยื่นวันเดียวกันได้</p>
              </div>

              {/* เงื่อนไขการแนบเอกสารรับรอง */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  เงื่อนไขการแนบเอกสารรับรอง
                </label>
                <div className="relative">
                  <select
                    value={docCondition}
                    onChange={(e) => setDocCondition(e.target.value)}
                    className="w-full appearance-none pl-3.5 pr-9 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 shadow-sm"
                  >
                    <option value="NONE">ไม่ต้องแนบเอกสาร</option>
                    <option value="ALWAYS">ต้องแนบเอกสารทุกครั้ง</option>
                    <option value="AFTER_2">แนบเอกสารเมื่อลาติดต่อกัน 2 วันขึ้นไป</option>
                    <option value="AFTER_3">แนบเอกสารเมื่อลาติดต่อกัน 3 วันขึ้นไป</option>
                    <option value="AFTER_5">แนบเอกสารเมื่อลาติดต่อกัน 5 วันขึ้นไป</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* 4. นโยบายการยกยอดวันลาข้ามปี */}
          <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-100 space-y-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              4. นโยบายการยกยอดวันลาข้ามปี
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* ยกยอดไปปีถัดไปได้สูงสุด */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  ยกยอดไปปีถัดไปได้สูงสุด
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    placeholder="10"
                    value={maxCarryDays}
                    onChange={(e) => setMaxCarryDays(e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="w-full pl-3.5 pr-12 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                    วัน
                  </span>
                </div>
              </div>

              {/* เวลาที่ยกยอดจะมีอายุการใช้งาน */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  เวลาที่ยกยอดจะมีอายุการใช้งาน
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    placeholder="180"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="w-full pl-3.5 pr-12 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                    วัน
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">เช่น 180 วัน = ต้องใช้ให้หมดใน 6 เดือนแรกของปี</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-xs font-medium text-gray-700 bg-gray-200/80 hover:bg-gray-300 rounded-xl transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-7 py-2.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

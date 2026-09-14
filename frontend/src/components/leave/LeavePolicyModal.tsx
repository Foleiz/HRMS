'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
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

  const [leaveTypeId, setLeaveTypeId] = useState<number>(0);
  const [employeeLevelId, setEmployeeLevelId] = useState<number | ''>('');
  const [entitlementDays, setEntitlementDays] = useState<number>(0);
  const [minimumServiceDays, setMinimumServiceDays] = useState<number>(0);
  const [advanceRequestDays, setAdvanceRequestDays] = useState<number>(0);

  const [isDocumentRequired, setIsDocumentRequired] = useState(false);
  const [documentRequiredAfterDays, setDocumentRequiredAfterDays] = useState<number | ''>('');

  const [isCarryForwardAllowed, setIsCarryForwardAllowed] = useState(false);
  const [carryForwardMaxMonths, setCarryForwardMaxMonths] = useState<number | ''>('');
  const [carryForwardExpiryMonths, setCarryForwardExpiryMonths] = useState<number | ''>('');

  const [isAllowedDuringProbation, setIsAllowedDuringProbation] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (policyToEdit) {
      setLeaveTypeId(policyToEdit.leaveTypeId);
      setEmployeeLevelId(policyToEdit.employeeLevelId ?? '');
      setEntitlementDays(policyToEdit.entitlementDays);
      setMinimumServiceDays(policyToEdit.minimumServiceDays);
      setAdvanceRequestDays(policyToEdit.advanceRequestDays);
      setIsDocumentRequired(policyToEdit.isDocumentRequired);
      setDocumentRequiredAfterDays(policyToEdit.documentRequiredAfterDays ?? '');
      setIsCarryForwardAllowed(policyToEdit.isCarryForwardAllowed);
      setCarryForwardMaxMonths(policyToEdit.carryForwardMaxMonths ?? '');
      setCarryForwardExpiryMonths(policyToEdit.carryForwardExpiryMonths ?? '');
      setIsAllowedDuringProbation(policyToEdit.isAllowedDuringProbation);
    } else {
      setLeaveTypeId(leaveTypes[0]?.id || 0);
      setEmployeeLevelId('');
      setEntitlementDays(6);
      setMinimumServiceDays(0);
      setAdvanceRequestDays(0);
      setIsDocumentRequired(false);
      setDocumentRequiredAfterDays('');
      setIsCarryForwardAllowed(false);
      setCarryForwardMaxMonths('');
      setCarryForwardExpiryMonths('');
      setIsAllowedDuringProbation(false);
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
    if (entitlementDays < 0) {
      setError('สิทธิ์วันลาต้องมากกว่าหรือเท่ากับ 0');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        employeeTypeId: 1, // Full-time default
        employeeLevelId: employeeLevelId === '' ? null : Number(employeeLevelId),
        entitlementDays: Number(entitlementDays),
        minimumServiceDays: Number(minimumServiceDays) || 0,
        advanceRequestDays: Number(advanceRequestDays) || 0,
        isDocumentRequired,
        documentRequiredAfterDays: isDocumentRequired && documentRequiredAfterDays !== '' ? Number(documentRequiredAfterDays) : null,
        isCarryForwardAllowed,
        carryForwardMaxMonths: isCarryForwardAllowed && carryForwardMaxMonths !== '' ? Number(carryForwardMaxMonths) : null,
        carryForwardExpiryMonths: isCarryForwardAllowed && carryForwardExpiryMonths !== '' ? Number(carryForwardExpiryMonths) : null,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 text-center flex-1">
            {isEditing ? 'แก้ไขสิทธิ์การลา' : 'เพิ่มสิทธิ์การลา'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
              {error}
            </div>
          )}

          {/* ประเภทการลา */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              ประเภทการลา
            </label>
            <select
              disabled={isEditing}
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(Number(e.target.value))}
              className={`w-full px-3.5 py-2.5 rounded-xl border ${
                isEditing ? 'bg-gray-50 text-gray-500' : 'bg-white'
              } border-gray-200 text-sm focus:ring-2 focus:ring-blue-500`}
              required
            >
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.leaveName} ({t.leaveCode})
                </option>
              ))}
            </select>
          </div>

          {/* ใช้กับระดับพนักงาน */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              ใช้กับระดับพนักงาน
            </label>
            <select
              value={employeeLevelId}
              onChange={(e) => setEmployeeLevelId(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">ทุกระดับ (ค่าเริ่มต้น)</option>
              {employeeLevels.map((lvl) => (
                <option key={lvl.id} value={lvl.id}>
                  {lvl.levelName}
                </option>
              ))}
            </select>
          </div>

          {/* Grid: สิทธิ์/ปี, ทำงานครบ, ยื่นล่วงหน้า */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                สิทธิ์/ปี (วัน)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={entitlementDays}
                onChange={(e) => setEntitlementDays(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                ทำงานครบ (วัน)
              </label>
              <input
                type="number"
                min="0"
                placeholder="0 = ไม่กำหนด"
                value={minimumServiceDays}
                onChange={(e) => setMinimumServiceDays(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                ยื่นล่วงหน้า (วัน)
              </label>
              <input
                type="number"
                min="0"
                placeholder="0 = ไม่กำหนด"
                value={advanceRequestDays}
                onChange={(e) => setAdvanceRequestDays(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Section: แนบเอกสาร */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-800 block">บังคับแนบเอกสาร</span>
                <span className="text-xs text-gray-400">ต้องแนบใบรับรองแพทย์หรือเอกสารอ้างอิง</span>
              </div>
              <button
                type="button"
                onClick={() => setIsDocumentRequired(!isDocumentRequired)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  isDocumentRequired ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {isDocumentRequired && (
              <div className="pt-2 border-t border-gray-200/60 flex items-center gap-3">
                <span className="text-xs text-gray-600 whitespace-nowrap">เมื่อลาติดต่อกันตั้งแต่:</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="เช่น 3"
                  value={documentRequiredAfterDays}
                  onChange={(e) => setDocumentRequiredAfterDays(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-24 px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm bg-white"
                />
                <span className="text-xs text-gray-600">วันขึ้นไป (ใส่ 0 คือทุกกรณี)</span>
              </div>
            )}
          </div>

          {/* Section: ยกยอดสะสม */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-800 block">อนุญาตให้ยกยอดสะสม</span>
                <span className="text-xs text-gray-400">ยกยอดคงเหลือไปใช้ในปีถัดไป</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCarryForwardAllowed(!isCarryForwardAllowed)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  isCarryForwardAllowed ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {isCarryForwardAllowed && (
              <div className="pt-2 border-t border-gray-200/60 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">ยกยอดสูงสุด (วัน/เดือน)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="เช่น 6"
                    value={carryForwardMaxMonths}
                    onChange={(e) => setCarryForwardMaxMonths(e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">หมดอายุภายใน (เดือน)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="เช่น 3 (มี.ค.)"
                    value={carryForwardExpiryMonths}
                    onChange={(e) => setCarryForwardExpiryMonths(e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section: ระหว่างทดลองงาน */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-800 block">อนุญาตระหว่างทดลองงาน</span>
              <span className="text-xs text-gray-400">พนักงานที่ยังไม่ผ่านโปรสามารถใช้สิทธิ์นี้ได้</span>
            </div>
            <button
              type="button"
              onClick={() => setIsAllowedDuringProbation(!isAllowedDuringProbation)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                isAllowedDuringProbation ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

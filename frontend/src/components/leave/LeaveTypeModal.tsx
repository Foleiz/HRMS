'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { LeaveType, CreateLeaveTypePayload, UpdateLeaveTypePayload } from '@/types/leave';

interface LeaveTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  leaveTypeToEdit?: LeaveType | null;
  onSubmitCreate: (data: CreateLeaveTypePayload) => Promise<void>;
  onSubmitUpdate: (id: number, data: UpdateLeaveTypePayload) => Promise<void>;
}

export const LeaveTypeModal: React.FC<LeaveTypeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  leaveTypeToEdit,
  onSubmitCreate,
  onSubmitUpdate,
}) => {
  const isEditing = !!leaveTypeToEdit;

  const [leaveCode, setLeaveCode] = useState('');
  const [leaveName, setLeaveName] = useState('');
  const [quotaUnit, setQuotaUnit] = useState<'HOUR' | 'DAY' | 'MONTH'>('DAY');
  const [documentDescription, setDocumentDescription] = useState('');
  const [isPaidLeave, setIsPaidLeave] = useState(true);
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (leaveTypeToEdit) {
      setLeaveCode(leaveTypeToEdit.leaveCode);
      setLeaveName(leaveTypeToEdit.leaveName);
      setQuotaUnit(
        leaveTypeToEdit.quotaUnit === 'HOUR' ? 'HOUR' :
        leaveTypeToEdit.quotaUnit === 'MONTH' ? 'MONTH' : 'DAY'
      );
      setDocumentDescription(leaveTypeToEdit.documentDescription || '');
      setIsPaidLeave(leaveTypeToEdit.isPaidLeave);
      setIsActive(leaveTypeToEdit.status === 'ACTIVE');
    } else {
      setLeaveCode('');
      setLeaveName('');
      setQuotaUnit('DAY');
      setDocumentDescription('');
      setIsPaidLeave(true);
      setIsActive(true);
    }
    setError(null);
  }, [leaveTypeToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveCode.trim() && !isEditing) {
      setError('กรุณาระบุรหัสประเภทการลา');
      return;
    }
    if (!leaveName.trim()) {
      setError('กรุณาระบุชื่อประเภทการลา');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditing && leaveTypeToEdit) {
        await onSubmitUpdate(leaveTypeToEdit.id, {
          leaveName: leaveName.trim(),
          quotaUnit,
          isPaidLeave,
          documentDescription: documentDescription.trim() || undefined,
          status: isActive ? 'ACTIVE' : 'INACTIVE',
        });
      } else {
        await onSubmitCreate({
          leaveCode: leaveCode.trim().toUpperCase(),
          leaveName: leaveName.trim(),
          quotaUnit,
          isPaidLeave,
          documentDescription: documentDescription.trim() || undefined,
          status: isActive ? 'ACTIVE' : 'INACTIVE',
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
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 text-center flex-1">
            {isEditing ? 'แก้ไขประเภทการลา' : 'เพิ่มประเภทการลา'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
              {error}
            </div>
          )}

          {/* รหัสประเภท (leave_code) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              รหัสประเภท (leave_code)
            </label>
            <input
              type="text"
              disabled={isEditing}
              placeholder="เช่น SICK, ANNUAL, PERSONAL"
              value={leaveCode}
              onChange={(e) => setLeaveCode(e.target.value.toUpperCase())}
              className={`w-full px-3.5 py-2.5 rounded-xl border ${
                isEditing ? 'bg-gray-50 text-gray-500 border-gray-200' : 'border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              } text-sm`}
              required
            />
          </div>

          {/* ชื่อประเภท (leave_name) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              ชื่อประเภท (leave_name)
            </label>
            <input
              type="text"
              placeholder="เช่น ลาพักร้อน (Annual Leave)"
              value={leaveName}
              onChange={(e) => setLeaveName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              required
            />
          </div>

          {/* ประเภทการคำนวณ (quota_unit) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              ประเภทการคำนวณ
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setQuotaUnit('HOUR')}
                className={`py-2 text-sm font-medium rounded-xl border transition-all ${
                  quotaUnit === 'HOUR'
                    ? 'bg-blue-100 text-blue-700 border-blue-300 font-semibold'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                ชั่วโมง
              </button>
              <button
                type="button"
                onClick={() => setQuotaUnit('DAY')}
                className={`py-2 text-sm font-medium rounded-xl border transition-all ${
                  quotaUnit === 'DAY'
                    ? 'bg-blue-100 text-blue-700 border-blue-300 font-semibold'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                วัน
              </button>
              <button
                type="button"
                onClick={() => setQuotaUnit('MONTH')}
                className={`py-2 text-sm font-medium rounded-xl border transition-all ${
                  quotaUnit === 'MONTH'
                    ? 'bg-blue-100 text-blue-700 border-blue-300 font-semibold'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                เดือน
              </button>
            </div>
          </div>

          {/* เอกสารที่ต้องแนบ (ข้อความอ้างอิง) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              เอกสารที่ต้องแนบ (ข้อความอ้างอิง)
            </label>
            <input
              type="text"
              placeholder="เช่น ลา 3 วันขึ้นไปต้องมีใบรับรองแพทย์"
              value={documentDescription}
              onChange={(e) => setDocumentDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Toggles Card */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
            {/* รับค่าจ้างระหว่างลา (paid) */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-800 block">รับค่าจ้างระหว่างลา (paid)</span>
                <span className="text-xs text-gray-400">รวมยอดเป็นฐานคำนวณภาษีหัก ณ ที่จ่าย</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPaidLeave(!isPaidLeave)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                  isPaidLeave ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
              </button>
            </div>

            {/* เปิดใช้งาน */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200/60">
              <div>
                <span className="text-sm font-medium text-gray-800 block">เปิดใช้งาน</span>
                <span className="text-xs text-gray-400">ปิดไว้เพื่อระงับการใช้งานชั่วคราวโดยไม่ลบข้อมูล</span>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                  isActive ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
              </button>
            </div>
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

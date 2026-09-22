'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Calendar, UserCheck, FileText } from 'lucide-react';
import { Employee } from '@/types/employee';
import {
  ApprovalDelegation,
  CreateApprovalDelegationPayload,
  UpdateApprovalDelegationPayload,
  DOCUMENT_TYPE_LABELS,
} from '@/types/approval';

interface ApprovalDelegationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateApprovalDelegationPayload | UpdateApprovalDelegationPayload) => Promise<void>;
  editingDelegation: ApprovalDelegation | null;
  employees: Employee[];
}

const DOCUMENT_TYPE_KEYS = Object.keys(DOCUMENT_TYPE_LABELS);

export const ApprovalDelegationModal: React.FC<ApprovalDelegationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingDelegation,
  employees,
}) => {
  const [delegatorEmployeeId, setDelegatorEmployeeId] = useState<number | ''>('');
  const [delegateEmployeeId, setDelegateEmployeeId] = useState<number | ''>('');
  const [documentType, setDocumentType] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [status, setStatus] = useState<string>('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (editingDelegation) {
      setDelegatorEmployeeId(editingDelegation.delegatorEmployeeId);
      setDelegateEmployeeId(editingDelegation.delegateEmployeeId);
      setDocumentType(editingDelegation.documentType || '');
      setStartDate(editingDelegation.startDate.substring(0, 10));
      setEndDate(editingDelegation.endDate.substring(0, 10));
      setStatus(editingDelegation.status || 'ACTIVE');
    } else {
      setDelegatorEmployeeId('');
      setDelegateEmployeeId('');
      setDocumentType('');
      // Default dates: today until 7 days later
      const today = new Date().toISOString().substring(0, 10);
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
      setStartDate(today);
      setEndDate(nextWeek);
      setStatus('ACTIVE');
    }
    setValidationError(null);
  }, [editingDelegation, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!delegatorEmployeeId) {
      setValidationError('กรุณาเลือกผู้มอบอำนาจ');
      return;
    }
    if (!delegateEmployeeId) {
      setValidationError('กรุณาเลือกผู้รับมอบอำนาจแทน');
      return;
    }
    if (delegatorEmployeeId === delegateEmployeeId) {
      setValidationError('ผู้มอบอำนาจและผู้รับมอบอำนาจแทนต้องไม่ใช่บุคคลเดียวกัน');
      return;
    }
    if (!startDate || !endDate) {
      setValidationError('กรุณาระบุช่วงวันที่มีผลให้ครบถ้วน');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setValidationError('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingDelegation) {
        await onSave({
          delegateEmployeeId: Number(delegateEmployeeId),
          documentType: documentType.trim() ? documentType : null,
          startDate,
          endDate,
          status,
        });
      } else {
        await onSave({
          delegatorEmployeeId: Number(delegatorEmployeeId),
          delegateEmployeeId: Number(delegateEmployeeId),
          documentType: documentType.trim() ? documentType : null,
          startDate,
          endDate,
        });
      }
      onClose();
    } catch (err: any) {
      setValidationError(err?.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {editingDelegation ? 'แก้ไขการมอบอำนาจอนุมัติแทน' : 'เพิ่มการมอบอำนาจอนุมัติแทน'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              มอบสิทธิ์การพิจารณาอนุมัติเอกสารให้ผู้อื่นปฏิบัติหน้าที่แทนในกรณีไม่อยู่หรือลาปฏิบัติงาน
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {validationError}
            </div>
          )}

          {/* ผู้มอบอำนาจ */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              ผู้มอบอำนาจ (ผู้มีสิทธิ์เดิม) <span className="text-rose-500">*</span>
            </label>
            <select
              value={delegatorEmployeeId}
              disabled={!!editingDelegation}
              onChange={(e) => setDelegatorEmployeeId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2046]/20 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 cursor-pointer"
            >
              <option value="">-- กรุณาเลือกผู้มอบอำนาจ --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employeeCode} - {emp.firstName} {emp.lastName}{' '}
                  {emp.positionName ? `(${emp.positionName})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* ผู้รับมอบอำนาจแทน */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              ผู้รับมอบอำนาจแทน (ผู้ปฏิบัติการแทน) <span className="text-rose-500">*</span>
            </label>
            <select
              value={delegateEmployeeId}
              onChange={(e) => setDelegateEmployeeId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2046]/20 focus:outline-none cursor-pointer"
            >
              <option value="">-- กรุณาเลือกผู้รับมอบอำนาจแทน --</option>
              {employees
                .filter((emp) => emp.id !== Number(delegatorEmployeeId))
                .map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employeeCode} - {emp.firstName} {emp.lastName}{' '}
                    {emp.positionName ? `(${emp.positionName})` : ''}
                  </option>
                ))}
            </select>
          </div>

          {/* ขอบเขตประเภทเอกสาร */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              ประเภทเอกสารที่มอบอำนาจ
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2046]/20 focus:outline-none cursor-pointer"
            >
              <option value="">ทุกประเภทเอกสาร (ครอบคลุมทั้งหมด)</option>
              {DOCUMENT_TYPE_KEYS.map((dt) => (
                <option key={dt} value={dt}>
                  {DOCUMENT_TYPE_LABELS[dt]}
                </option>
              ))}
            </select>
          </div>

          {/* ช่วงวันที่มีผล */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                มีผลตั้งแต่วันที่ <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2046]/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ถึงวันที่ <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2046]/20 focus:outline-none"
              />
            </div>
          </div>

          {/* สถานะ (กรณีแก้ไข) */}
          {editingDelegation && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">สถานะ</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2046]/20 focus:outline-none cursor-pointer"
              >
                <option value="ACTIVE">เปิดใช้งาน</option>
                <option value="INACTIVE">ปิดใช้งาน</option>
              </select>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-medium text-white bg-[#0B2046] hover:bg-[#0B2046]/90 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingDelegation ? 'บันทึกการแก้ไข' : 'ยืนยันการมอบอำนาจ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

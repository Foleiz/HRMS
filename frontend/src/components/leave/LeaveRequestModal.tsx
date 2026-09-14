'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Loader2, Paperclip } from 'lucide-react';
import { LeaveType, LeavePolicy, CreateLeaveRequestPayload } from '@/types/leave';
import { Employee } from '@/types/employee';
import { EmployeeSelect } from '@/components/ui/EmployeeSelect';

interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  leaveTypes: LeaveType[];
  leavePolicies: LeavePolicy[];
  onSubmit: (payload: CreateLeaveRequestPayload) => Promise<void>;
}

// แปลงไฟล์ที่แนบให้เป็น Base64 String (ตัด header "data:...;base64," ออก)
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ที่แนบได้'));
    reader.readAsDataURL(file);
  });

export const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({
  isOpen,
  onClose,
  employees,
  leaveTypes,
  leavePolicies,
  onSubmit,
}) => {
  const [employeeId, setEmployeeId] = useState<number | ''>('');
  const [leaveTypeId, setLeaveTypeId] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // รีเซ็ตฟอร์มทุกครั้งที่เปิดโมดัลใหม่
  useEffect(() => {
    if (isOpen) {
      setEmployeeId('');
      setLeaveTypeId('');
      setStartDate('');
      setEndDate('');
      setReason('');
      setAttachment(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // คำนวณจำนวนวันลาแบบง่าย (นับรวมวันเริ่มต้นและวันสิ้นสุด)
  const leaveDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  }, [startDate, endDate]);

  // หานโยบายที่เกี่ยวข้องกับประเภทการลาที่เลือก เพื่อเช็คว่าต้องแนบเอกสารหรือไม่
  const applicablePolicy = useMemo(() => {
    if (!leaveTypeId) return null;
    return leavePolicies.find((p) => p.leaveTypeId === leaveTypeId) || null;
  }, [leaveTypeId, leavePolicies]);

  const isDocumentRecommended =
    !!applicablePolicy?.isDocumentRequired &&
    (applicablePolicy.documentRequiredAfterDays == null || leaveDays >= applicablePolicy.documentRequiredAfterDays);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!employeeId) {
      setError('กรุณาเลือกพนักงานผู้ยื่นคำขอ');
      return;
    }
    if (!leaveTypeId) {
      setError('กรุณาเลือกประเภทการลา');
      return;
    }
    if (!startDate || !endDate) {
      setError('กรุณาระบุช่วงวันที่ลา');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError('วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น');
      return;
    }

    setLoading(true);
    try {
      let attachmentData: string | undefined;
      let attachmentFileName: string | undefined;
      if (attachment) {
        attachmentData = await fileToBase64(attachment);
        attachmentFileName = attachment.name;
      }

      await onSubmit({
        employeeId: Number(employeeId),
        leaveTypeId: Number(leaveTypeId),
        startDatetime: new Date(`${startDate}T00:00:00`).toISOString(),
        endDatetime: new Date(`${endDate}T23:59:59`).toISOString(),
        leaveHours: leaveDays * 8,
        leaveDays,
        reason: reason.trim() || undefined,
        attachmentData,
        attachmentFileName,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการยื่นคำขอลา');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-semibold text-gray-800 text-center flex-1">ยื่นคำขอลา</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">พนักงานผู้ยื่นคำขอ</label>
            <EmployeeSelect employees={employees} value={employeeId} onChange={setEmployeeId} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ประเภทการลา</label>
            <select
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              required
            >
              <option value="">-- เลือกประเภทการลา --</option>
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.leaveName} ({t.leaveCode})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">วันที่เริ่มลา</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">วันที่สิ้นสุด</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                required
              />
            </div>
          </div>

          {leaveDays > 0 && (
            <p className="text-xs text-gray-500 -mt-3">
              รวมทั้งหมด <span className="font-semibold text-gray-700">{leaveDays} วัน</span>
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">เหตุผลการลา</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="ระบุเหตุผลการลา (ถ้ามี)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              ไฟล์แนบ (เช่น ใบรับรองแพทย์)
              {isDocumentRecommended && (
                <span className="ml-2 text-xs text-amber-600 font-normal">
                  * นโยบายประเภทนี้กำหนดให้ต้องแนบเอกสารประกอบ
                </span>
              )}
            </label>
            <label className="flex items-center gap-2 w-full px-3.5 py-2.5 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 cursor-pointer hover:bg-gray-50 transition-colors">
              <Paperclip className="w-4 h-4 shrink-0" />
              <span className="truncate">{attachment ? attachment.name : 'เลือกไฟล์แนบ...'}</span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setAttachment(e.target.files?.[0] || null)}
              />
            </label>
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
              ยื่นคำขอลา
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { LeaveType, LeaveFormCategory, CreateLeaveTypePayload, UpdateLeaveTypePayload } from '@/types/leave';

interface LeaveTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  leaveTypeToEdit?: LeaveType | null;
  onSubmitCreate: (data: CreateLeaveTypePayload) => Promise<void>;
  onSubmitUpdate: (id: number, data: UpdateLeaveTypePayload) => Promise<void>;
}

/** หมวดในแบบฟอร์มใบลา (ใช้ติ๊กในเอกสารใบลา และเป็นแม่แบบตอนตั้งสิทธิ์การลา) */
export const LEAVE_FORM_CATEGORIES: { value: LeaveFormCategory; label: string; hint: string }[] = [
  { value: 'SICK', label: 'ลาป่วย', hint: 'เจ็บป่วย พบแพทย์' },
  { value: 'PERSONAL', label: 'ลากิจส่วนตัว', hint: 'ธุระส่วนตัวที่จำเป็น' },
  { value: 'VACATION', label: 'ลาพักร้อน', hint: 'วันหยุดพักผ่อนประจำปี' },
  { value: 'SPECIAL', label: 'ลาพิเศษ', hint: 'ลาคลอด ลาบวช ลาทหาร ฯลฯ' },
];

/** เดาหมวดจากรหัส/ชื่อ (ข้อมูลเดิมที่ยังไม่ได้ตั้งหมวด) */
export const inferFormCategory = (code?: string | null, name?: string | null): LeaveFormCategory => {
  const c = (code || '').toUpperCase();
  const n = name || '';
  if (c.includes('SICK') || n.includes('ป่วย')) return 'SICK';
  if (c.includes('PERSONAL') || c.includes('BUSINESS') || n.includes('กิจ')) return 'PERSONAL';
  if (c.includes('ANNUAL') || c.includes('VACATION') || n.includes('พักร้อน') || n.includes('พักผ่อน')) return 'VACATION';
  return 'SPECIAL';
};

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`w-12 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
      checked ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'
    }`}
  >
    <div className="w-4 h-4 rounded-full bg-white dark:bg-slate-900 shadow-md" />
  </button>
);

/**
 * ฟอร์ม "ประเภทการลา" — ตอบคำถามว่า "ลาอะไร" เท่านั้น
 * จำนวนวันและเงื่อนไขทั้งหมดไปตั้งที่ "สิทธิ์การลา" (ที่เดียว ไม่ซ้ำซ้อน)
 */
export const LeaveTypeModal: React.FC<LeaveTypeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  leaveTypeToEdit,
  onSubmitCreate,
  onSubmitUpdate,
}) => {
  const isEditing = !!leaveTypeToEdit;

  const [leaveName, setLeaveName] = useState('');
  const [formCategory, setFormCategory] = useState<LeaveFormCategory>('SPECIAL');
  const [isPaidLeave, setIsPaidLeave] = useState(true);
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (leaveTypeToEdit) {
      setLeaveName(leaveTypeToEdit.leaveName);
      setFormCategory(
        (leaveTypeToEdit.formCategory as LeaveFormCategory) ||
          inferFormCategory(leaveTypeToEdit.leaveCode, leaveTypeToEdit.leaveName)
      );
      setIsPaidLeave(leaveTypeToEdit.isPaidLeave);
      setIsActive(leaveTypeToEdit.status === 'ACTIVE');
    } else {
      setLeaveName('');
      setFormCategory('SPECIAL');
      setIsPaidLeave(true);
      setIsActive(true);
    }
    setError(null);
  }, [leaveTypeToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          quotaUnit: 'DAY',
          isPaidLeave,
          // ไม่มีช่องนี้ในฟอร์มแล้ว — ส่งค่าเดิมกลับไปเพื่อไม่ให้ข้อมูลหาย
          documentDescription: leaveTypeToEdit.documentDescription || undefined,
          status: isActive ? 'ACTIVE' : 'INACTIVE',
          formCategory,
        });
      } else {
        await onSubmitCreate({
          leaveName: leaveName.trim(),
          quotaUnit: 'DAY',
          isPaidLeave,
          status: isActive ? 'ACTIVE' : 'INACTIVE',
          formCategory,
        });
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e2?.response?.data?.message || e2?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700/60 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 text-center flex-1">
            {isEditing ? 'แก้ไขประเภทการลา' : 'เพิ่มประเภทการลา'}
          </h3>
          <button onClick={onClose} className="text-gray-400 dark:text-slate-500 dark:text-slate-400 hover:text-gray-600 dark:text-slate-400 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl dark:bg-red-900/20 dark:text-red-400">{error}</div>}

          {/* ชื่อประเภทการลา (รหัสระบบสร้างให้อัตโนมัติ ไม่ต้องแสดงตอนเพิ่ม) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">ชื่อประเภทการลา *</label>
            <input
              type="text"
              placeholder="เช่น ลาพักร้อน"
              value={leaveName}
              onChange={(e) => setLeaveName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              required
            />
          </div>

          {/* หมวดแบบฟอร์ม */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">หมวดในแบบฟอร์มใบลา</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {LEAVE_FORM_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setFormCategory(c.value)}
                  className={`text-left px-3.5 py-2.5 rounded-xl border transition-all ${
                    formCategory === c.value
                      ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300'
                      : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <span className={`block text-sm font-medium ${formCategory === c.value ? 'text-blue-700' : 'text-gray-700 dark:text-slate-300'}`}>
                    {c.label}
                  </span>
                  <span className="block text-xs text-gray-400 dark:text-slate-500 dark:text-slate-400">{c.hint}</span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-gray-400 dark:text-slate-500 dark:text-slate-400">ใช้ติ๊กช่องในเอกสารใบลา และเป็นแม่แบบค่าเริ่มต้นตอนตั้งสิทธิ์การลา</p>
          </div>

          {/* สวิตช์ */}
          <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-100 dark:border-slate-700/60 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-sm font-medium text-gray-800 dark:text-slate-200 block">ได้รับค่าจ้างระหว่างลา</span>
                <span className="text-xs text-gray-400 dark:text-slate-500 dark:text-slate-400">ปิด = ลาไม่รับค่าจ้าง ระบบเงินเดือนจะหักตามจำนวนวันลา</span>
              </div>
              <Toggle checked={isPaidLeave} onChange={setIsPaidLeave} />
            </div>
            <div className="flex items-center justify-between gap-4 pt-3 border-t border-gray-200/60">
              <div>
                <span className="text-sm font-medium text-gray-800 dark:text-slate-200 block">เปิดใช้งาน</span>
                <span className="text-xs text-gray-400 dark:text-slate-500 dark:text-slate-400">ปิดไว้เพื่อระงับการยื่นลาประเภทนี้ชั่วคราวโดยไม่ลบข้อมูล</span>
              </div>
              <Toggle checked={isActive} onChange={setIsActive} />
            </div>
          </div>


          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 rounded-xl transition-colors">
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

'use client';

import React, { useState, useEffect } from 'react';
import { LEAVE_COLOR_PRESETS, resolveLeaveColor } from '@/lib/leaveColors';
import { LeaveType, LeaveFormCategory, CreateLeaveTypePayload, UpdateLeaveTypePayload } from '@/types/leave';
import { CodeInput } from '@/components/ui/CodeInput';
import { Modal, ModalFooter, ToggleSwitch, ActiveToggleRow, inputClass } from '@/components/ui';

interface LeaveTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  leaveTypeToEdit?: LeaveType | null;
  onSubmitCreate: (data: CreateLeaveTypePayload) => Promise<void>;
  onSubmitUpdate: (id: number, data: UpdateLeaveTypePayload) => Promise<void>;
  /** รหัสที่มีอยู่แล้ว — ใช้แสดงรหัสแนะนำทันที */
  existingCodes?: string[];
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
  existingCodes,
}) => {
  const isEditing = !!leaveTypeToEdit;

  const [leaveCode, setLeaveCode] = useState('');
  const [leaveName, setLeaveName] = useState('');
  const [formCategory, setFormCategory] = useState<LeaveFormCategory>('SPECIAL');
  const [isPaidLeave, setIsPaidLeave] = useState(true);
  const [isActive, setIsActive] = useState(true);
  /** '' = ใช้สีเริ่มต้นของระบบ */
  const [color, setColor] = useState<string>('');

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
      setColor(leaveTypeToEdit.color || '');
    } else {
      setLeaveCode('');
      setLeaveName('');
      setFormCategory('SPECIAL');
      setIsPaidLeave(true);
      setIsActive(true);
      setColor('');
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
          documentDescription: leaveTypeToEdit.documentDescription || undefined,
          status: isActive ? 'ACTIVE' : 'INACTIVE',
          formCategory,
          color: color || null,
        });
      } else {
        await onSubmitCreate({
          leaveCode: leaveCode.trim() ? leaveCode.trim().toUpperCase() : undefined,
          leaveName: leaveName.trim(),
          quotaUnit: 'DAY',
          isPaidLeave,
          status: isActive ? 'ACTIVE' : 'INACTIVE',
          formCategory,
          color: color || null,
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'แก้ไขประเภทการลา' : 'เพิ่มประเภทการลา'}
      onSubmit={handleSubmit}
      size="md"
      footer={
        <ModalFooter
          onCancel={onClose}
          submitText="บันทึก"
          cancelText="ยกเลิก"
          loading={loading}
        />
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* รหัสประเภทการลา — ระบบแนะนำ แก้ได้ */}
        <CodeInput
          type="leave-type"
          prefix="LV"
          existingCodes={existingCodes}
          label="รหัสประเภทการลา"
          mode={isEditing ? 'edit' : 'create'}
          value={isEditing ? leaveTypeToEdit?.leaveCode ?? '' : leaveCode}
          onChange={setLeaveCode}
          labelClassName="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          inputClassName={`${inputClass} font-mono uppercase disabled:opacity-60 disabled:cursor-not-allowed`}
        />

        {/* ชื่อประเภทการลา */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            ชื่อประเภทการลา <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="เช่น ลาพักร้อน"
            value={leaveName}
            onChange={(e) => setLeaveName(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        {/* หมวดแบบฟอร์ม */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            หมวดในแบบฟอร์มใบลา
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {LEAVE_FORM_CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setFormCategory(c.value)}
                className={`text-left px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer ${
                  formCategory === c.value
                    ? 'bg-primary-soft border-primary ring-1 ring-primary'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                }`}
              >
                <span
                  className={`block text-xs font-bold ${
                    formCategory === c.value ? 'text-primary dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {c.label}
                </span>
                <span className="block text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{c.hint}</span>
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            ใช้ติ๊กช่องในเอกสารใบลา และเป็นแม่แบบค่าเริ่มต้นตอนตั้งสิทธิ์การลา
          </p>
        </div>

        {/* สีการ์ด */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            สีการ์ดยอดวันลา
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {LEAVE_COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                title={c}
                className={`w-7 h-7 rounded-full border-2 cursor-pointer transition-transform ${
                  color.toUpperCase() === c ? 'border-primary dark:border-white scale-110' : 'border-white dark:border-slate-800'
                } shadow-xs`}
                style={{ backgroundColor: c }}
              />
            ))}
            <label
              className="relative w-7 h-7 rounded-full border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-[10px] text-slate-500 cursor-pointer overflow-hidden"
              title="เลือกสีเอง"
            >
              +
              <input
                type="color"
                value={resolveLeaveColor(color, leaveName || 'new')}
                onChange={(e) => setColor(e.target.value.toUpperCase())}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
            <button
              type="button"
              onClick={() => setColor('')}
              className={`ml-1 px-2.5 py-1 rounded-lg text-xs border cursor-pointer ${
                color === ''
                  ? 'bg-primary text-white border-primary dark:bg-white dark:text-slate-900'
                  : 'border-slate-200 text-slate-500 dark:border-slate-700'
              }`}
            >
              ค่าเริ่มต้น
            </button>
          </div>
          <div
            className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{
              color: resolveLeaveColor(color, leaveTypeToEdit?.leaveCode ?? (leaveName || 'new')),
              backgroundColor: `${resolveLeaveColor(color, leaveTypeToEdit?.leaveCode ?? (leaveName || 'new'))}1A`,
            }}
          >
            ตัวอย่าง: {leaveName || 'ชื่อประเภทการลา'}
          </div>
        </div>

        {/* สวิตช์ */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700/60 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block">
                ได้รับค่าจ้างระหว่างลา
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                ปิด = ลาไม่รับค่าจ้าง ระบบเงินเดือนจะหักตามจำนวนวันลา
              </span>
            </div>
            <ToggleSwitch checked={isPaidLeave} onChange={setIsPaidLeave} />
          </div>
          {isEditing && (
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700">
              <ActiveToggleRow
                checked={isActive}
                onChange={setIsActive}
                label="เปิดใช้งานประเภทการลานี้"
                hint="ปิดไว้เพื่อระงับการยื่นลาประเภทนี้ชั่วคราวโดยไม่ลบข้อมูล"
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

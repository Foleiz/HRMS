'use client';
import { ModalHeader } from '@/components/ui/ModalHeader';

import { ModalShell } from '@/components/ui/ModalShell';
import { Button } from '@/components/ui/Button';
import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Check,
} from 'lucide-react';
import { CodeInput } from '@/components/ui/CodeInput';
import { RoleSummary, CreateRoleRequest, UpdateRoleRequest } from '@/types/settings';

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitCreate: (data: CreateRoleRequest) => Promise<void>;
  onSubmitUpdate: (id: number, data: UpdateRoleRequest) => Promise<void>;
  roleToEdit?: RoleSummary | null;
  existingRoles?: RoleSummary[];
}


const COLOR_PRESETS = [
  { label: 'น้ำเงิน', value: '#2563EB' },
  { label: 'คราม', value: '#4F46E5' },
  { label: 'ม่วง', value: '#7C3AED' },
  { label: 'ม่วงสด', value: '#9333EA' },
  { label: 'ชมพู', value: '#DB2777' },
  { label: 'แดงกุหลาบ', value: '#E11D48' },
  { label: 'แดง', value: '#DC2626' },
  { label: 'ส้ม', value: '#EA580C' },
  { label: 'อำพัน', value: '#D97706' },
  { label: 'เขียว', value: '#059669' },
  { label: 'เขียวหัวเป็ด', value: '#0D9488' },
  { label: 'ฟ้าคราม', value: '#0891B2' },
  { label: 'เทา', value: '#475569' },
];

export const RoleModal: React.FC<RoleModalProps> = ({
  isOpen,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
  roleToEdit,
  existingRoles = [],
}) => {
  const isEditMode = !!roleToEdit;

  const [roleCode, setRoleCode] = useState('');
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [color, setColor] = useState('#2563EB');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // คำนวณรหัสบทบาทอัตโนมัติ เช่น ROLE_001, ROLE_002, ...
  const generateNextRoleCode = (rolesList: RoleSummary[] = existingRoles): string => {
    const existingCodes = new Set(rolesList.map((r) => r.roleCode.toUpperCase()));
    let maxNum = 0;

    rolesList.forEach((r) => {
      const match = r.roleCode.match(/^ROLE_?(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    let nextNum = maxNum > 0 ? maxNum + 1 : rolesList.length + 1;
    let candidate = `ROLE_${String(nextNum).padStart(3, '0')}`;
    while (existingCodes.has(candidate)) {
      nextNum++;
      candidate = `ROLE_${String(nextNum).padStart(3, '0')}`;
    }
    return candidate;
  };

  useEffect(() => {
    if (roleToEdit) {
      setRoleCode(roleToEdit.roleCode);
      setRoleName(roleToEdit.roleName);
      setDescription(roleToEdit.description || '');
      setStatus(roleToEdit.status);
      setColor(roleToEdit.color || '#2563EB');
    } else {
      setRoleCode(generateNextRoleCode(existingRoles));
      setRoleName('');
      setDescription('');
      setStatus('ACTIVE');
      setColor('#2563EB');
    }
    setErrorMsg(null);
  }, [roleToEdit, isOpen, existingRoles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isEditMode && !roleCode.trim()) {
      setErrorMsg('กรุณากรอกรหัสบทบาท');
      return;
    }

    if (!roleName.trim()) {
      setErrorMsg('กรุณากรอกชื่อบทบาท');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode && roleToEdit) {
        await onSubmitUpdate(roleToEdit.id, {
          roleName: roleName.trim(),
          description: description.trim() || undefined,
          status,
          color,
        });
      } else {
        await onSubmitCreate({
          roleCode: roleCode.trim().toUpperCase(),
          roleName: roleName.trim(),
          description: description.trim() || undefined,
          color,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalShell className="z-50" innerClassName="items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-700/60 overflow-hidden animate-in zoom-in-95 duration-200">
        <ModalHeader
          icon={Shield}
          title={isEditMode ? 'แก้ไขบทบาท' : 'เพิ่มบทบาทใหม่'}
          onClose={onClose}
        />

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {errorMsg}
            </div>
          )}

          <CodeInput
            type="role"
            remote={false}
            label="รหัสบทบาท"
            required
            mode={isEditMode ? 'edit' : 'create'}
            value={roleCode}
            onChange={setRoleCode}
            prefix="ROLE_"
            existingCodes={existingRoles.map((r) => r.roleCode)}
            labelClassName="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            inputClassName="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono uppercase text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:text-slate-400 disabled:cursor-not-allowed"
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              ชื่อบทบาท <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="เช่น ผู้เชี่ยวชาญฝ่ายสรรหาบุคลากร"
              className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>



          {/* สีประจำบทบาท */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              สีประจำบทบาท
            </label>
            <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/80 dark:border-slate-700">
              {COLOR_PRESETS.map((preset) => {
                const isSelected = color.toLowerCase() === preset.value.toLowerCase();
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setColor(preset.value)}
                    title={preset.label}
                    className={`w-6 h-6 rounded-full transition-transform flex items-center justify-center cursor-pointer ${
                      isSelected ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: preset.value }}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow-xs" />}
                  </button>
                );
              })}
              {/* Custom Color Input */}
              <div className="relative flex items-center ml-1">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-600 cursor-pointer p-0.5 bg-transparent"
                  title="เลือกสีแบบกำหนดเอง"
                />
              </div>
            </div>

            {/* Badge Preview */}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">ตัวอย่างป้ายชื่อ:</span>
              <span
                style={{
                  backgroundColor: `${color}18`,
                  color: color,
                  borderColor: `${color}40`,
                }}
                className="px-2.5 py-0.5 border rounded-md text-xs font-semibold tracking-wide inline-flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                {roleName || 'ชื่อบทบาท'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">คำอธิบาย</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ระบุหน้าที่และขอบข่ายความรับผิดชอบของบทบาทนี้..."
              className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
            >
              บันทึกบทบาท
            </Button>
          </div>
        </form>
      </div>
    </ModalShell>
  );
};

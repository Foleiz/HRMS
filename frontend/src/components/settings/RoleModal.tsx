'use client';

import React, { useState, useEffect } from 'react';
import { X, Shield } from 'lucide-react';
import { RoleSummary, CreateRoleRequest, UpdateRoleRequest } from '@/types/settings';

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitCreate: (data: CreateRoleRequest) => Promise<void>;
  onSubmitUpdate: (id: number, data: UpdateRoleRequest) => Promise<void>;
  roleToEdit?: RoleSummary | null;
}

export const RoleModal: React.FC<RoleModalProps> = ({
  isOpen,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
  roleToEdit,
}) => {
  const isEditMode = !!roleToEdit;

  const [roleCode, setRoleCode] = useState('');
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (roleToEdit) {
      setRoleCode(roleToEdit.roleCode);
      setRoleName(roleToEdit.roleName);
      setDescription(roleToEdit.description || '');
      setStatus(roleToEdit.status);
    } else {
      setRoleCode('');
      setRoleName('');
      setDescription('');
      setStatus('ACTIVE');
    }
    setErrorMsg(null);
  }, [roleToEdit, isOpen]);

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
        });
      } else {
        await onSubmitCreate({
          roleCode: roleCode.trim().toUpperCase(),
          roleName: roleName.trim(),
          description: description.trim() || undefined,
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
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0B2046]/10 text-[#0B2046] flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {isEditMode ? 'แก้ไขบทบาท' : 'เพิ่มบทบาทใหม่'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              รหัสบทบาท (Role Code) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isEditMode}
              value={roleCode}
              onChange={(e) => setRoleCode(e.target.value.toUpperCase())}
              placeholder="เช่น HR_SPECIALIST, AUDITOR"
              className={`w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] uppercase ${
                isEditMode ? 'bg-slate-50 cursor-not-allowed text-slate-400' : ''
              }`}
            />
            {isEditMode && (
              <p className="text-[11px] text-slate-400 mt-1">รหัสบทบาทไม่สามารถเปลี่ยนแปลงได้</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ชื่อบทบาท <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="เช่น ผู้เชี่ยวชาญฝ่ายสรรหาบุคลากร"
              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">คำอธิบาย</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ระบุหน้าที่และขอบข่ายความรับผิดชอบของบทบาทนี้..."
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-[#0B2046] hover:bg-[#112d5e] text-white text-xs font-semibold shadow-md shadow-[#0B2046]/10 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกบทบาท'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

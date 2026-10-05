'use client';

import React, { useState, useEffect } from 'react';
import { X, Shield, Sparkles, RotateCcw } from 'lucide-react';
import { RoleSummary, CreateRoleRequest, UpdateRoleRequest } from '@/types/settings';

const THAI_ROLE_KEYWORDS: [RegExp, string][] = [
  [/ผู้จัดการ|ผจก|manager/i, 'MGR'],
  [/ผู้อำนวยการ|ผอ|director/i, 'DIRECTOR'],
  [/หัวหน้า|ลีด|lead|supervisor/i, 'LEAD'],
  [/เจ้าหน้าที่|พนักงาน|staff|officer/i, 'OFFICER'],
  [/ผู้ช่วย|assistant/i, 'ASST'],
  [/บุคคล|ทรัพยากรบุคคล|hr/i, 'HR'],
  [/การเงิน|การคลัง|finance/i, 'FIN'],
  [/บัญชี|account/i, 'ACC'],
  [/จัดซื้อ|procurement|purchasing/i, 'PURCHASE'],
  [/การตลาด|marketing/i, 'MKT'],
  [/ขาย|เซลส์|sales/i, 'SALES'],
  [/ธุรการ|admin/i, 'ADMIN'],
  [/ไอที|เทคโนโลยี|developer|engineer|it/i, 'IT'],
  [/ประสานงาน|coordinator/i, 'COORD'],
  [/สรรหา|recruitment|recruiter/i, 'RECRUIT'],
  [/ฝึกอบรม|พัฒนาบุคลากร|training/i, 'TRAIN'],
  [/ความปลอดภัย|safety/i, 'SAFETY'],
  [/ตรวจสอบ|audit/i, 'AUDITOR'],
  [/กฎหมาย|legal/i, 'LEGAL'],
  [/บริการลูกค้า|customer service|support/i, 'CS'],
];

export function autoGenerateRoleCode(name: string): string {
  if (!name.trim()) return '';

  // 1. ถ้ามีคำหรือตัวอักษรภาษาอังกฤษ ให้ดึงคำภาษาอังกฤษมาเชื่อมด้วย _
  const englishWords = name.match(/[a-zA-Z0-9]+/g);
  if (englishWords && englishWords.join('').length >= 2) {
    return englishWords.join('_').toUpperCase().slice(0, 30);
  }

  // 2. ถ้าเป็นภาษาไทย ตรวจหาคำสำคัญทางตำแหน่ง/แผนกที่พบบ่อย
  const matchedCodes: string[] = [];
  for (const [regex, code] of THAI_ROLE_KEYWORDS) {
    if (regex.test(name)) {
      matchedCodes.push(code);
    }
  }

  if (matchedCodes.length > 0) {
    return `ROLE_${matchedCodes.join('_')}`.slice(0, 30);
  }

  // 3. ค่าตั้งต้นกรณีไม่มีคำเฉพาะ
  return 'ROLE_CUSTOM';
}

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

  const [roleName, setRoleName] = useState('');
  const [roleCode, setRoleCode] = useState('');
  const [isCustomCode, setIsCustomCode] = useState(false);
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
      setIsCustomCode(true);
    } else {
      setRoleName('');
      setRoleCode('');
      setDescription('');
      setStatus('ACTIVE');
      setIsCustomCode(false);
    }
    setErrorMsg(null);
  }, [roleToEdit, isOpen]);

  // จัดการเมื่อพิมพ์ชื่อบทบาท (Auto-generate Role Code)
  const handleRoleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setRoleName(newName);

    if (!isEditMode && !isCustomCode) {
      const generated = autoGenerateRoleCode(newName);
      setRoleCode(generated);
    }
  };

  // จัดการเมื่อพิมพ์รหัสบทบาทเอง (Manual Override)
  const handleRoleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    setRoleCode(raw);
    setIsCustomCode(true);
  };

  // รีเซ็ตกลับไปใช้รหัสบทบาทอัตโนมัติตามชื่อ
  const handleResetToAuto = () => {
    setIsCustomCode(false);
    const generated = autoGenerateRoleCode(roleName);
    setRoleCode(generated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = roleName.trim();
    if (!trimmedName) {
      setErrorMsg('กรุณากรอกชื่อบทบาท');
      return;
    }

    let finalCode = roleCode.trim().toUpperCase();
    if (!isEditMode && !finalCode) {
      finalCode = autoGenerateRoleCode(trimmedName) || 'ROLE_CUSTOM';
      setRoleCode(finalCode);
    }

    setIsSubmitting(true);
    try {
      if (isEditMode && roleToEdit) {
        await onSubmitUpdate(roleToEdit.id, {
          roleName: trimmedName,
          description: description.trim() || undefined,
          status,
        });
      } else {
        await onSubmitCreate({
          roleCode: finalCode,
          roleName: trimmedName,
          description: description.trim() || undefined,
        });
      }
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMsg(e?.response?.data?.message || e?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
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
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-700/60 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0B2046]/10 dark:bg-[#0B2046]/30 text-[#0B2046] dark:text-cyan-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {isEditMode ? 'แก้ไขบทบาท' : 'เพิ่มบทบาทใหม่'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium">
              {errorMsg}
            </div>
          )}

          {/* 1. ชื่อบทบาท (ฟิลด์หลักที่ผู้ใช้กรอกเป็นอันดับแรก) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              ชื่อบทบาท <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={roleName}
              onChange={handleRoleNameChange}
              placeholder="เช่น เจ้าหน้าที่ฝ่ายบุคคล, Recruitment Specialist"
              className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 dark:focus:ring-blue-500/20 focus:border-[#0B2046] dark:focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              ระบุชื่อตำแหน่งหรือบทบาทหน้าที่ที่เข้าใจง่าย
            </p>
          </div>

          {/* 2. รหัสบทบาท (Role Code) - Auto-generate พร้อมปรับแต่งได้ */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                รหัสบทบาท (Role Code) {!isEditMode && <span className="text-slate-400 font-normal">(อัตโนมัติ)</span>}
              </label>

              {!isEditMode && (
                <div>
                  {!isCustomCode ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      สร้างอัตโนมัติ
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResetToAuto}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      title="ซิงค์รหัสกับชื่อบทบาทใหม่อัตโนมัติ"
                    >
                      <RotateCcw className="w-3 h-3" />
                      ซิงค์อัตโนมัติ
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                disabled={isEditMode}
                value={roleCode}
                onChange={handleRoleCodeChange}
                placeholder={isEditMode ? '' : 'เช่น RECRUITMENT_SPECIALIST'}
                className={`w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 dark:focus:ring-blue-500/20 focus:border-[#0B2046] dark:focus:border-blue-500 uppercase ${
                  isEditMode ? 'bg-slate-50 dark:bg-slate-800/60 cursor-not-allowed text-slate-400' : ''
                }`}
              />
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              {isEditMode
                ? 'รหัสบทบาทไม่สามารถเปลี่ยนแปลงได้'
                : isCustomCode
                ? 'กำหนดรหัสเฉพาะตามต้องการ (ใช้ A-Z, 0-9 และ _)'
                : 'ระบบแปลงรหัสภาษาอังกฤษให้อัตโนมัติ หรือคลิกแก้ไขได้'}
            </p>
          </div>

          {/* 3. คำอธิบาย */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              คำอธิบาย
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ระบุหน้าที่และขอบข่ายความรับผิดชอบของบทบาทนี้..."
              className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 dark:focus:ring-blue-500/20 focus:border-[#0B2046] dark:focus:border-blue-500 resize-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-[#0B2046] hover:bg-[#112d5e] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-[#0B2046]/10 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'กำลังบันทึก...' : isEditMode ? 'บันทึกการแก้ไข' : 'สร้างบทบาท'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

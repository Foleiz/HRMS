'use client';

import React, { useState } from 'react';
import { X, KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { UserAccount } from '@/types/settings';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserAccount | null;
  onConfirmReset: (userId: number, newPassword: string) => Promise<void>;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  user,
  onConfirmReset,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setErrorMsg('กรุณากรอกรหัสผ่านใหม่');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onConfirmReset(user.id, newPassword);
      setNewPassword('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'ไม่สามารถรีเซ็ตรหัสผ่านได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">รีเซ็ตรหัสผ่าน</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                สำหรับผู้ใช้: <span className="font-semibold text-slate-800">{user.username}</span> ({user.fullName})
              </p>
            </div>
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
              รหัสผ่านใหม่ <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านใหม่..."
                className="w-full h-11 pl-3.5 pr-10 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
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
              {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันเปลี่ยนรหัสผ่าน'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

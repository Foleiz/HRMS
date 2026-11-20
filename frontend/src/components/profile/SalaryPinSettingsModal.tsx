'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { ModalShell } from '@/components/ui/ModalShell';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import { mySalaryService } from '@/services/mySalaryService';

interface SalaryPinSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasPin: boolean;
  onSuccess: () => void;
}

export const SalaryPinSettingsModal: React.FC<SalaryPinSettingsModalProps> = ({
  isOpen,
  onClose,
  hasPin,
  onSuccess,
}) => {
  const toast = useToast();

  // Fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Reset states on open
  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewPin('');
      setConfirmPin('');
      setErrorMsg('');
      setShowCurrentPassword(false);
      setShowNewPin(false);
      setShowConfirmPin(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter numeric digits only for PIN inputs
  const handlePinInput = (val: string, setter: (v: string) => void) => {
    const numeric = val.replace(/\D/g, '').slice(0, 6);
    setter(numeric);
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validation
    if (hasPin && !currentPassword.trim()) {
      setErrorMsg('กรุณากรอกรหัสผ่านผู้ใช้งานเพื่อยืนยันตัวตน');
      return;
    }
    if (newPin.length !== 6) {
      setErrorMsg('รหัส PIN ใหม่ต้องเป็นตัวเลข 6 หลัก');
      return;
    }
    if (newPin !== confirmPin) {
      setErrorMsg('รหัส PIN ใหม่ทั้งสองช่องไม่ตรงกัน');
      return;
    }

    setIsLoading(true);
    try {
      if (!hasPin) {
        await mySalaryService.setupPin(newPin, confirmPin);
        toast.success('ตั้งค่ารหัส PIN ดูเงินเดือนสำเร็จ');
      } else {
        await mySalaryService.resetPin({
          currentPassword: currentPassword.trim(),
          newPin,
          confirmPin,
        });
        toast.success('เปลี่ยนรหัส PIN ดูเงินเดือนสำเร็จ');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = error?.response?.data?.message || error?.message || 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalShell
      className="z-50 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      innerClassName="items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <ModalHeader
          icon={ShieldCheck}
          title={hasPin ? 'เปลี่ยนรหัส PIN ดูเงินเดือน' : 'ตั้งค่ารหัส PIN ดูเงินเดือน'}
          onClose={onClose}
        />

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Current Password if already has PIN */}
          {hasPin && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                รหัสผ่านผู้ใช้งาน (Password) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="กรอกรหัสผ่านเข้าสู่ระบบเพื่อยืนยันตัวตน"
                  className="w-full h-9.5 px-3 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>ยืนยันด้วยรหัสผ่านบัญชีผู้ใช้เข้าสู่ระบบของคุณ</span>
              </p>
            </div>
          )}

          {/* New PIN */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {hasPin ? 'รหัส PIN ใหม่ (6 หลัก)' : 'กำหนดรหัส PIN (6 หลัก)'} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNewPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={6}
                value={newPin}
                onChange={(e) => handlePinInput(e.target.value, setNewPin)}
                placeholder="ตัวเลข 6 หลัก (0-9)"
                className="w-full h-9.5 px-3 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 tracking-wider focus:outline-none focus:ring-1 focus:ring-primary"
                required
                autoFocus={!hasPin}
              />
              <button
                type="button"
                onClick={() => setShowNewPin(!showNewPin)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New PIN */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ยืนยันรหัส PIN {hasPin ? 'ใหม่' : ''}อีกครั้ง <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => handlePinInput(e.target.value, setConfirmPin)}
                placeholder="กรอกตัวเลข 6 หลักอีกครั้ง"
                className="w-full h-9.5 px-3 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 tracking-wider focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPin(!showConfirmPin)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-600 dark:text-rose-400 text-xs animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isLoading}
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              {hasPin ? 'บันทึกรหัส PIN ใหม่' : 'บันทึกรหัส PIN'}
            </Button>
          </div>
        </form>
      </div>
    </ModalShell>
  );
};

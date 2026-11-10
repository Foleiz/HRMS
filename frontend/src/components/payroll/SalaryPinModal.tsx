'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Lock,
  KeyRound,
  Delete,
  RotateCcw,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Home,
  Loader2,
} from 'lucide-react';
import { mySalaryService } from '@/services/mySalaryService';

interface SalaryPinModalProps {
  hasPin: boolean;
  onUnlocked: () => void;
  onPinConfigured?: () => void;
}

type Mode = 'VERIFY' | 'SETUP_STEP1' | 'SETUP_STEP2' | 'RESET';

export const SalaryPinModal: React.FC<SalaryPinModalProps> = ({
  hasPin,
  onUnlocked,
  onPinConfigured,
}) => {
  const router = useRouter();

  // Mode state
  const [mode, setMode] = useState<Mode>(hasPin ? 'VERIFY' : 'SETUP_STEP1');

  // PIN input states
  const [pin, setPin] = useState<string>('');
  const [tempFirstPin, setTempFirstPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Reset mode states (using account password)
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newResetPin, setNewResetPin] = useState<string>('');
  const [confirmResetPin, setConfirmResetPin] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Trigger shake animation on error
  const triggerShake = (msg: string) => {
    setErrorMsg(msg);
    setIsShaking(true);
    setPin('');
    setTimeout(() => setIsShaking(false), 500);
  };

  // Handle number click on Numpad
  const handleDigit = useCallback(
    (digit: string) => {
      if (isLoading) return;
      setErrorMsg('');
      setPin((prev) => {
        if (prev.length >= 6) return prev;
        return prev + digit;
      });
    },
    [isLoading]
  );

  // Handle Backspace
  const handleBackspace = useCallback(() => {
    if (isLoading) return;
    setErrorMsg('');
    setPin((prev) => prev.slice(0, -1));
  }, [isLoading]);

  // Handle Clear
  const handleClear = useCallback(() => {
    if (isLoading) return;
    setErrorMsg('');
    setPin('');
  }, [isLoading]);

  // Listen to physical keyboard typing
  useEffect(() => {
    if (mode === 'RESET') return; // Reset mode uses standard text inputs

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLoading) return;

      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleBackspace, handleClear, isLoading, mode]);

  // Auto-submit when 6 digits are reached
  useEffect(() => {
    if (pin.length !== 6 || isLoading) return;

    if (mode === 'VERIFY') {
      // Verify PIN with Backend
      const doVerify = async () => {
        setIsLoading(true);
        setErrorMsg('');
        try {
          const ok = await mySalaryService.verifyPin(pin);
          if (ok) {
            onUnlocked();
          } else {
            triggerShake('รหัส PIN ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
          }
        } catch (err: unknown) {
          const e = err as { response?: { data?: { message?: string } } };
          triggerShake(e?.response?.data?.message || 'รหัส PIN ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
        } finally {
          setIsLoading(false);
        }
      };
      doVerify();
    } else if (mode === 'SETUP_STEP1') {
      // Save step 1 PIN and move to confirmation step
      setTempFirstPin(pin);
      setPin('');
      setMode('SETUP_STEP2');
    } else if (mode === 'SETUP_STEP2') {
      // Check if step 2 matches step 1
      if (pin !== tempFirstPin) {
        triggerShake('รหัส PIN ไม่ตรงกัน กรุณาตั้งใหม่อีกครั้ง');
        setTimeout(() => {
          setTempFirstPin('');
          setMode('SETUP_STEP1');
        }, 1200);
        return;
      }

      // Save setup PIN to backend
      const doSetup = async () => {
        setIsLoading(true);
        setErrorMsg('');
        try {
          await mySalaryService.setupPin(tempFirstPin, pin);
          onPinConfigured?.();
          onUnlocked();
        } catch (err: unknown) {
          const e = err as { response?: { data?: { message?: string } } };
          triggerShake(e?.response?.data?.message || 'ไม่สามารถตั้งรหัส PIN ได้ กรุณาลองใหม่');
          setMode('SETUP_STEP1');
          setTempFirstPin('');
        } finally {
          setIsLoading(false);
        }
      };
      doSetup();
    }
  }, [pin, mode, tempFirstPin, onUnlocked, onPinConfigured, isLoading]);

  // Handle Reset PIN submit
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setErrorMsg('กรุณากรอกรหัสผ่านปัจจุบัน');
      return;
    }
    if (newResetPin.length !== 6 || !/^\d{6}$/.test(newResetPin)) {
      setErrorMsg('รหัส PIN ใหม่ต้องเป็นตัวเลข 6 หลัก');
      return;
    }
    if (newResetPin !== confirmResetPin) {
      setErrorMsg('รหัส PIN ใหม่ทั้งสองช่องไม่ตรงกัน');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      await mySalaryService.resetPin(currentPassword, newResetPin, confirmResetPin);
      onPinConfigured?.();
      onUnlocked();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setErrorMsg(e?.response?.data?.message || 'รหัสผ่านปัจจุบันไม่ถูกต้อง หรือไม่สามารถเปลี่ยน PIN ได้');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 dark:bg-black/75 backdrop-blur-xl animate-in fade-in duration-300">
      {/* Outer wrapper: 2 separate stacked panels */}
      <div className="w-full max-w-md flex flex-col gap-3.5 sm:gap-4">
        
        {/* PANEL 1: Standalone Security Notification Card */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-amber-200/80 dark:border-amber-900/50 shadow-lg p-4 sm:p-5 transition-all">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-300/40 dark:border-amber-700/50 shadow-2xs">
              <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="flex-1 text-sm sm:text-[15px] font-medium leading-relaxed text-slate-800 dark:text-slate-100">
              ข้อมูลค่าตอบแทนเป็นความลับเฉพาะบุคคลตามนโยบายบริษัท โปรดระมัดระวังการเปิดเผยต่อผู้อื่น
            </p>
          </div>
        </div>

        {/* PANEL 2: Standalone PIN Entry Card */}
        <div
          className={`w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-7 transition-all duration-200 ${
            isShaking ? 'animate-[shake_0.4s_ease-in-out]' : ''
          }`}
        >
          {mode === 'RESET' ? (
            /* ========================================================= */
            /* VIEW: RESET PIN FORM                                      */
            /* ========================================================= */
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setMode('VERIFY');
                  }}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    เปลี่ยนรหัส PIN 6 หลัก
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ยืนยันตัวตนด้วยรหัสผ่านบัญชีผู้ใช้ปัจจุบัน
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    รหัสผ่านบัญชีผู้ใช้ปัจจุบัน
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่านที่ใช้เข้าสู่ระบบ"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    รหัส PIN 6 หลักใหม่ (ตัวเลข)
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={newResetPin}
                    onChange={(e) => setNewResetPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="กรอกตัวเลข 6 หลัก"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm tracking-widest text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ยืนยันรหัส PIN 6 หลักใหม่อีกครั้ง
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={confirmResetPin}
                    onChange={(e) => setConfirmResetPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="กรอกตัวเลข 6 หลักเดิมซ้ำ"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm tracking-widest text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setMode('VERIFY');
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'บันทึกและปลดล็อก'}
                </button>
              </div>
            </form>
          ) : (
            /* ========================================================= */
            /* VIEW: PIN KEYPAD & DOTS (VERIFY / SETUP)                  */
            /* ========================================================= */
            <div className="space-y-5">
              {/* Header Title & Subtitle */}
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center border border-blue-200/80 dark:border-blue-900 shadow-xs mb-3">
                  {mode === 'VERIFY' ? (
                    <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <KeyRound className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {mode === 'VERIFY' && 'กรอกรหัส PIN 6 หลักเพื่อเข้าใช้งาน'}
                  {mode === 'SETUP_STEP1' && 'ตั้งรหัส PIN 6 หลักใหม่'}
                  {mode === 'SETUP_STEP2' && 'ยืนยันรหัส PIN 6 หลักอีกครั้ง'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {mode === 'VERIFY' && 'ยืนยันรหัสผ่านความปลอดภัยเพื่อเข้าถึงข้อมูลเงินเดือนของคุณ'}
                  {mode === 'SETUP_STEP1' && 'กำหนดรหัสผ่านความปลอดภัย 6 หลักสำหรับการเข้าดูเงินเดือนในอนาคต'}
                  {mode === 'SETUP_STEP2' && 'กรอกรหัส PIN 6 หลักเดิมอีกครั้งเพื่อยืนยัน'}
                </p>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1.5 font-medium animate-in fade-in">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 6 PIN Dots Indicator */}
              <div className="flex items-center justify-center gap-3.5 py-2">
                {Array.from({ length: 6 }).map((_, idx) => {
                  const isFilled = pin.length > idx;
                  const isCurrent = pin.length === idx;
                  return (
                    <div
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                        isFilled
                          ? 'bg-blue-600 dark:bg-blue-400 scale-110 shadow-sm ring-2 ring-blue-200 dark:ring-blue-900'
                          : isCurrent
                          ? 'border-2 border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-slate-800 scale-105 animate-pulse'
                          : 'border-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Numeric Keypad (3x4 Grid) */}
              <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto pt-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleDigit(digit)}
                    disabled={isLoading || pin.length >= 6}
                    className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-slate-700/80 active:scale-95 text-slate-800 dark:text-slate-100 font-bold text-lg border border-slate-200/80 dark:border-slate-700/80 transition-all flex items-center justify-center shadow-2xs hover:border-blue-300 dark:hover:border-slate-600 disabled:opacity-40"
                  >
                    {digit}
                  </button>
                ))}

                {/* Clear / Cancel Button */}
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isLoading || pin.length === 0}
                  className="h-12 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-all flex items-center justify-center disabled:opacity-30"
                  title="ล้างทั้งหมด"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* 0 Button */}
                <button
                  type="button"
                  onClick={() => handleDigit('0')}
                  disabled={isLoading || pin.length >= 6}
                  className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-slate-700/80 active:scale-95 text-slate-800 dark:text-slate-100 font-bold text-lg border border-slate-200/80 dark:border-slate-700/80 transition-all flex items-center justify-center shadow-2xs hover:border-blue-300 dark:hover:border-slate-600 disabled:opacity-40"
                >
                  0
                </button>

                {/* Backspace Button */}
                <button
                  type="button"
                  onClick={handleBackspace}
                  disabled={isLoading || pin.length === 0}
                  className="h-12 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 text-xs font-semibold transition-all flex items-center justify-center disabled:opacity-30"
                  title="ลบตัวเลข"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>

              {/* Bottom Actions */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-slate-200 transition-colors py-1"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>กลับหน้าหลัก</span>
                </button>

                {mode === 'VERIFY' && (
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg('');
                      setMode('RESET');
                    }}
                    className="text-blue-600 dark:text-blue-400 font-medium hover:underline py-1"
                  >
                    ลืมรหัส PIN?
                  </button>
                )}

                {mode === 'SETUP_STEP2' && (
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg('');
                      setTempFirstPin('');
                      setPin('');
                      setMode('SETUP_STEP1');
                    }}
                    className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 py-1"
                  >
                    ย้อนกลับ
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

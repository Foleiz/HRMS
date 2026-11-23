'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/services/authService';
import { useToast } from '@/context/ToastContext';
import { KeyRound, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Users, ArrowRight, ShieldCheck } from 'lucide-react';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const token = searchParams.get('token') || '';

  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [accountInfo, setAccountInfo] = useState<{ username?: string; maskedEmail?: string } | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsValidating(false);
      setValidationError('ไม่พบรหัสโทเค็นสำหรับรีเซ็ตรหัสผ่าน โปรดตรวจสอบลิงก์ที่ได้รับจากอีเมล');
      return;
    }

    const validate = async () => {
      try {
        const res = await authService.validateResetToken(token);
        if (res.isValid) {
          setAccountInfo({ username: res.username, maskedEmail: res.maskedEmail });
        } else {
          setValidationError(res.errorMessage || 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง หรือหมดอายุแล้ว');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง หรือหมดอายุแล้ว';
        setValidationError(msg);
      } finally {
        setIsValidating(false);
      }
    };

    validate();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || !confirmPassword.trim()) {
      const msg = 'กรุณากรอกรหัสผ่านใหม่ทั้งสองช่อง';
      setSubmitError(msg);
      toast.warning(msg);
      return;
    }

    if (newPassword.length < 8) {
      const msg = 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร';
      setSubmitError(msg);
      toast.warning(msg);
      return;
    }

    if (newPassword !== confirmPassword) {
      const msg = 'รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน';
      setSubmitError(msg);
      toast.warning(msg);
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await authService.resetPassword({ token, newPassword, confirmPassword });
      setIsSuccess(true);
      toast.success('ตั้งรหัสผ่านใหม่สำเร็จแล้ว สามารถเข้าสู่ระบบได้ทันที');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถตั้งรหัสผ่านใหม่ได้ โปรดลองอีกครั้ง';
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 mx-auto text-primary animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-600">กำลังตรวจสอบความถูกต้องของลิงก์...</p>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 shadow-md flex items-center justify-center text-rose-600">
          <AlertCircle className="w-7 h-7" />
        </div>

        <h1 className="mt-5 text-2xl font-bold text-[#0F172A] tracking-tight">ลิงก์ไม่ถูกต้องหรือหมดอายุ</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
          {validationError}
        </p>

        <div className="mt-6 space-y-3">
          <Link
            href="/forgot-password"
            className="w-full h-12 rounded-xl bg-gradient-to-b from-primary-hover to-primary text-[#FFFFFF] text-[15px] font-semibold shadow-md hover:from-[#22427A] hover:to-[#0E2852] active:scale-[0.99] transition-all flex items-center justify-center"
          >
            ขอส่งลิงก์รีเซ็ตรหัสผ่านใหม่
          </Link>

          <Link
            href="/login"
            className="w-full h-11 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 active:scale-[0.99] transition-all flex items-center justify-center"
          >
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-md flex items-center justify-center text-emerald-600">
          <CheckCircle2 className="w-7 h-7" />
        </div>

        <h1 className="mt-5 text-2xl font-bold text-[#0F172A] tracking-tight">ตั้งรหัสผ่านใหม่สำเร็จแล้ว!</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
          รหัสผ่านของคุณได้รับการอัปเดตเรียบร้อยแล้ว ตอนนี้คุณสามารถใช้รหัสผ่านใหม่นี้ในการเข้าสู่ระบบ HRMS ได้ทันที
        </p>

        <div className="mt-6">
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="w-full h-12 rounded-xl bg-gradient-to-b from-primary-hover to-primary text-[#FFFFFF] text-[15px] font-semibold shadow-md hover:from-[#22427A] hover:to-[#0E2852] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            เข้าสู่ระบบทันที
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto w-14 h-14 rounded-2xl bg-[#FFFFFF] border border-white shadow-[0_8px_20px_-6px_rgba(11,32,70,0.25)] flex items-center justify-center text-primary">
        <KeyRound className="w-6 h-6" />
      </div>

      <h1 className="mt-5 text-center text-2xl font-bold text-[#0F172A] tracking-tight">ตั้งรหัสผ่านใหม่</h1>
      <p className="mt-1.5 text-center text-sm leading-relaxed text-[#64748B]">
        {accountInfo?.username ? (
          <>
            สำหรับบัญชีผู้ใช้งาน <strong className="text-slate-800">{accountInfo.username}</strong>
            {accountInfo.maskedEmail && <span className="block text-xs text-slate-500 mt-0.5">({accountInfo.maskedEmail})</span>}
          </>
        ) : (
          'กรุณาระบุรหัสผ่านใหม่ที่ต้องการใช้งาน'
        )}
      </p>

      {submitError && (
        <div className="mt-5 p-3 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-[#BE123C] text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="reset-new-password">
            รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#94A3B8]">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="reset-new-password"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="ความยาวอย่างน้อย 8 ตัวอักษร"
              className="w-full h-12 pl-11 pr-12 rounded-xl bg-[#EEF2F7] border border-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:bg-[#FFFFFF] focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#94A3B8] hover:text-primary transition-colors"
            >
              {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          {newPassword.length > 0 && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
              <ShieldCheck className={`w-3.5 h-3.5 ${newPassword.length >= 8 ? 'text-emerald-500' : 'text-amber-500'}`} />
              <span className={newPassword.length >= 8 ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                {newPassword.length >= 8 ? 'ความยาวผ่านเกณฑ์' : `ต้องมีอย่างน้อย 8 ตัวอักษร (ตอนนี้ ${newPassword.length})`}
              </span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="reset-confirm-password">
            ยืนยันรหัสผ่านใหม่อีกครั้ง
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#94A3B8]">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="reset-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="กรอกรหัสผ่านใหม่อีกครั้งให้ตรงกัน"
              className="w-full h-12 pl-11 pr-12 rounded-xl bg-[#EEF2F7] border border-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:bg-[#FFFFFF] focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#94A3B8] hover:text-primary transition-colors"
            >
              {showConfirmPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 mt-2 rounded-xl bg-gradient-to-b from-primary-hover to-primary text-[#FFFFFF] text-[15px] font-semibold shadow-[0_10px_24px_-8px_rgba(11,32,70,0.6),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-[#22427A] hover:to-[#0E2852] active:scale-[0.99] transition-all flex items-center justify-center disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              กำลังบันทึกรหัสผ่านใหม่...
            </>
          ) : (
            'บันทึกรหัสผ่านใหม่'
          )}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="theme-light relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-[#C9DBF5] via-[#E3ECFA] to-[#F8FAFC] flex flex-col">
      {/* ===== พื้นหลัง: แสงนุ่ม ๆ + เส้นโค้งจาง ๆ ===== */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-[#AFC8EE]/50 blur-3xl" />
        <div className="absolute bottom-[-120px] -left-32 w-[560px] h-[360px] rounded-full bg-white/80 blur-3xl" />
        <div className="absolute bottom-[-140px] -right-24 w-[620px] h-[380px] rounded-full bg-white/80 blur-3xl" />
        <div className="absolute bottom-[-60px] left-1/2 -translate-x-1/2 w-[900px] h-[260px] rounded-full bg-white/70 blur-3xl" />
        <div className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[1100px] rounded-full border border-white/60" />
      </div>

      {/* ===== โลโก้มุมซ้ายบน ===== */}
      <header className="relative z-10 px-6 sm:px-10 pt-6">
        <div className="inline-flex items-center gap-3 select-none">
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/25">
            <Users className="w-5 h-5" />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-bold text-[#0F172A] tracking-tight">Human</div>
            <div className="text-[15px] font-bold text-primary tracking-tight">Resource</div>
          </div>
        </div>
      </header>

      {/* ===== การ์ดตั้งรหัสผ่านใหม่ ===== */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[440px] rounded-[28px] border border-white/80 bg-gradient-to-b from-[#DCE8FA] via-[#F4F8FE] to-[#FFFFFF] shadow-[0_24px_60px_-20px_rgba(11,32,70,0.35)] px-6 sm:px-10 pt-9 pb-8">
          <Suspense fallback={
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 mx-auto text-primary animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-600">กำลังโหลด...</p>
            </div>
          }>
            <ResetPasswordContent />
          </Suspense>
        </div>
      </main>

      <footer className="relative z-10 pb-6 text-center text-[11px] text-[#64748B]">
        © {new Date().getFullYear()} Human Resource Management System
      </footer>
    </div>
  );
}

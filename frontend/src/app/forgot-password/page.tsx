'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import { useToast } from '@/context/ToastContext';
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Users, RefreshCw, Lock, Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const toast = useToast();

  // ขั้นตอน: 1 = กรอกอีเมลขอ OTP, 2 = กรอก OTP + รหัสผ่านใหม่, 3 = สำเร็จ
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // ข้อมูลฟอร์ม
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // สถานะการทำงาน
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const startCooldown = () => {
    setCooldown(60);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ขั้นตอนที่ 1: ขอส่งรหัส OTP
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!emailOrUsername.trim()) {
      const msg = 'กรุณากรอกอีเมลองค์กรของคุณ';
      setError(msg);
      toast.warning(msg);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const res = await authService.forgotPassword(emailOrUsername.trim());
      setMaskedEmail(res.maskedEmail || emailOrUsername.trim());
      setStep(2);
      startCooldown();
      toast.success('ระบบได้ส่งรหัสยืนยัน OTP ไปยังอีเมลเรียบร้อยแล้ว');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถส่งรหัส OTP ได้ โปรดลองอีกครั้ง';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ขั้นตอนที่ 2: ยืนยันรหัส OTP และตั้งรหัสผ่านใหม่ในแท็บเดิม
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanOtp = otpCode.trim();
    if (!cleanOtp) {
      const msg = 'กรุณากรอกรหัส OTP 6 หลักที่ได้รับในอีเมล';
      setError(msg);
      toast.warning(msg);
      return;
    }

    if (cleanOtp.length < 6) {
      const msg = 'รหัส OTP ต้องมีความยาว 6 หลัก';
      setError(msg);
      toast.warning(msg);
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      const msg = 'กรุณากรอกรหัสผ่านใหม่ให้ครบทั้งสองช่อง';
      setError(msg);
      toast.warning(msg);
      return;
    }

    if (newPassword.length < 6) {
      const msg = 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
      setError(msg);
      toast.warning(msg);
      return;
    }

    if (newPassword !== confirmPassword) {
      const msg = 'รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน';
      setError(msg);
      toast.warning(msg);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await authService.resetPassword({
        token: cleanOtp,
        otpCode: cleanOtp,
        emailOrUsername: emailOrUsername.trim(),
        newPassword,
        confirmPassword,
      });

      setStep(3);
      toast.success('ตั้งรหัสผ่านใหม่สำเร็จแล้ว สามารถเข้าสู่ระบบได้ทันที');

      // หน่วงเวลา 3 วินาทีแล้วนำทางไปหน้าเข้าสู่ระบบอัตโนมัติ
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'รหัส OTP ไม่ถูกต้อง หรือหมดอายุแล้ว';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

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

      {/* ===== การ์ดหลัก ===== */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[460px] rounded-[28px] border border-white/80 bg-gradient-to-b from-[#DCE8FA] via-[#F4F8FE] to-[#FFFFFF] shadow-[0_24px_60px_-20px_rgba(11,32,70,0.35)] px-6 sm:px-9 pt-8 pb-7">

          {/* ==================== STEP 3: สำเร็จแล้ว ==================== */}
          {step === 3 && (
            <div className="text-center py-2 animate-fadeIn">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-md flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h1 className="mt-5 text-2xl font-bold text-[#0F172A] tracking-tight">ตั้งรหัสผ่านใหม่สำเร็จแล้ว!</h1>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                รหัสผ่านสำหรับบัญชีของคุณได้รับการอัปเดตเรียบร้อยแล้ว ระบบกำลังนำคุณไปยังหน้าเข้าสู่ระบบอัตโนมัติ...
              </p>

              <div className="mt-6">
                <Link
                  href="/login"
                  className="w-full h-12 rounded-xl bg-gradient-to-b from-primary-hover to-primary text-[#FFFFFF] text-[15px] font-semibold shadow-md hover:from-[#22427A] hover:to-[#0E2852] active:scale-[0.99] transition-all flex items-center justify-center"
                >
                  เข้าสู่ระบบทันที
                </Link>
              </div>
            </div>
          )}

          {/* ==================== STEP 2: กรอก OTP + รหัสผ่านใหม่ในแท็บเดิม ==================== */}
          {step === 2 && (
            <div className="animate-fadeIn">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-[#FFFFFF] border border-white shadow-[0_8px_20px_-6px_rgba(11,32,70,0.25)] flex items-center justify-center text-primary">
                <ShieldCheck className="w-7 h-7" />
              </div>

              <h1 className="mt-4 text-center text-2xl font-bold text-[#0F172A] tracking-tight">ยืนยันรหัส OTP</h1>
              <p className="mt-1 text-center text-xs sm:text-sm leading-relaxed text-[#64748B]">
                รหัส 6 หลักถูกส่งไปยัง <strong className="text-slate-800 font-semibold">{maskedEmail}</strong>
              </p>

              {error && (
                <div className="mt-4 p-3 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-[#BE123C] text-xs sm:text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleResetPassword} noValidate className="mt-5 space-y-3.5">
                {/* ช่องกรอกรหัส OTP 6 หลัก */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700" htmlFor="otp-input">
                      รหัสยืนยัน OTP (6 หลักจากอีเมล)
                    </label>
                    <span className="text-[11px] font-medium text-amber-600">อายุรหัส 15 นาที</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      id="otp-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • • • •"
                      className="w-full h-12 pl-10 pr-4 rounded-xl bg-[#EEF2F7] border border-transparent text-center text-lg font-mono font-bold tracking-[6px] text-primary placeholder:text-[#94A3B8] focus:outline-none focus:bg-[#FFFFFF] focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {/* ช่องกรอกรหัสผ่านใหม่ */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="new-password">
                    รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่านใหม่"
                      className="w-full h-11 pl-10 pr-10 rounded-xl bg-[#EEF2F7] border border-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:bg-[#FFFFFF] focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#94A3B8] hover:text-primary transition-colors"
                    >
                      {showNewPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* ช่องยืนยันรหัสผ่านใหม่ */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="confirm-password">
                    ยืนยันรหัสผ่านใหม่อีกครั้ง
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                      className="w-full h-11 pl-10 pr-10 rounded-xl bg-[#EEF2F7] border border-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:bg-[#FFFFFF] focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#94A3B8] hover:text-primary transition-colors"
                    >
                      {showConfirmPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* ปุ่มยืนยันและบันทึก */}
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
                    'ยืนยันและบันทึกรหัสผ่านใหม่'
                  )}
                </button>

                {/* ปุ่มขอส่งรหัส OTP อีกครั้ง หรือแก้ไขอีเมล */}
                <div className="pt-2 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    disabled={cooldown > 0 || isSubmitting}
                    onClick={() => handleRequestOtp()}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-primary transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                    {cooldown > 0 ? `ส่งรหัส OTP อีกครั้งใน (${cooldown} วิ)` : 'ไม่ได้รับรหัส OTP? ส่งอีกครั้ง'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setError(null);
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-700 underline"
                  >
                    แก้ไขอีเมลองค์กร
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ==================== STEP 1: กรอกอีเมลขอ OTP ==================== */}
          {step === 1 && (
            <div>
              <div className="mx-auto w-14 h-14 rounded-2xl bg-[#FFFFFF] border border-white shadow-[0_8px_20px_-6px_rgba(11,32,70,0.25)] flex items-center justify-center text-primary">
                <Mail className="w-6 h-6" />
              </div>

              <h1 className="mt-5 text-center text-2xl font-bold text-[#0F172A] tracking-tight">ลืมรหัสผ่าน</h1>
              <p className="mt-1.5 text-center text-sm leading-relaxed text-[#64748B]">
                กรอกอีเมลองค์กรของคุณที่ลงทะเบียนไว้ในระบบ เพื่อรับรหัสยืนยัน <strong>OTP 6 หลัก</strong> สำหรับตั้งรหัสผ่านใหม่
              </p>

              {error && (
                <div className="mt-5 p-3 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-[#BE123C] text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRequestOtp} noValidate className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="forgot-email">
                    อีเมลองค์กร
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#94A3B8]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="forgot-email"
                      type="text"
                      autoComplete="email"
                      value={emailOrUsername}
                      onChange={(e) => setEmailOrUsername(e.target.value)}
                      placeholder="กรอกอีเมลองค์กร เช่น your-id@mut.ac.th"
                      className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#EEF2F7] border border-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:bg-[#FFFFFF] focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-xl bg-gradient-to-b from-primary-hover to-primary text-[#FFFFFF] text-[15px] font-semibold shadow-[0_10px_24px_-8px_rgba(11,32,70,0.6),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-[#22427A] hover:to-[#0E2852] active:scale-[0.99] transition-all flex items-center justify-center disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      กำลังส่งรหัส OTP...
                    </>
                  ) : (
                    'รับรหัสยืนยัน OTP'
                  )}
                </button>

                <div className="pt-2 text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-primary transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    กลับไปหน้าเข้าสู่ระบบ
                  </Link>
                </div>
              </form>
            </div>
          )}

        </div>
      </main>

      <footer className="relative z-10 pb-6 text-center text-[11px] text-[#64748B]">
        © {new Date().getFullYear()} Human Resource Management System
      </footer>
    </div>
  );
}

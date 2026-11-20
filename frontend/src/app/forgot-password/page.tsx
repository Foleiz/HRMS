'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { authService } from '@/services/authService';
import { useToast } from '@/context/ToastContext';
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Users, RefreshCw } from 'lucide-react';

export default function ForgotPasswordPage() {
  const toast = useToast();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername.trim()) {
      const msg = 'กรุณากรอกอีเมลองค์กรของคุณ';
      setError(msg);
      toast.warning(msg);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await authService.forgotPassword(emailOrUsername.trim());
      setIsSent(true);
      startCooldown();
      toast.success('ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลเรียบร้อยแล้ว');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถส่งลิงก์รีเซ็ตรหัสผ่านได้ โปรดลองอีกครั้ง';
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

      {/* ===== การ์ดลืมรหัสผ่าน ===== */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[440px] rounded-[28px] border border-white/80 bg-gradient-to-b from-[#DCE8FA] via-[#F4F8FE] to-[#FFFFFF] shadow-[0_24px_60px_-20px_rgba(11,32,70,0.35)] px-6 sm:px-10 pt-9 pb-8">
          
          {isSent ? (
            /* ===== สถานะ: ส่งอีเมลสำเร็จ ===== */
            <div className="text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-md flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <h1 className="mt-5 text-2xl font-bold text-[#0F172A] tracking-tight">ส่งลิงก์สำเร็จแล้ว!</h1>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                ระบบได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปยังอีเมลองค์กรของคุณเรียบร้อยแล้ว โปรดตรวจสอบที่กล่องจดหมายเข้า (Inbox) หรือโฟลเดอร์จดหมายขยะ (Junk/Spam)
              </p>

              <div className="mt-5 p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-800 text-xs text-left leading-relaxed">
                <span className="font-semibold block mb-0.5">⚠️ ข้อควรทราบ:</span>
                ลิงก์สำหรับตั้งรหัสผ่านใหม่มีอายุการใช้งาน <strong>15 นาที</strong> และสามารถใช้งานได้เพียงครั้งเดียวเท่านั้น
              </div>

              <div className="mt-6 space-y-3">
                <Link
                  href="/login"
                  className="w-full h-12 rounded-xl bg-gradient-to-b from-primary-hover to-primary text-[#FFFFFF] text-[15px] font-semibold shadow-md hover:from-[#22427A] hover:to-[#0E2852] active:scale-[0.99] transition-all flex items-center justify-center"
                >
                  กลับไปหน้าเข้าสู่ระบบ
                </Link>

                <button
                  type="button"
                  disabled={cooldown > 0 || isSubmitting}
                  onClick={handleSubmit}
                  className="w-full h-11 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                  {cooldown > 0 ? `ส่งอีกครั้งใน (${cooldown} วินาที)` : 'ไม่ได้รับอีเมล? ส่งอีกครั้ง'}
                </button>
              </div>
            </div>
          ) : (
            /* ===== ฟอร์ม: กรอกอีเมล ===== */
            <div>
              <div className="mx-auto w-14 h-14 rounded-2xl bg-[#FFFFFF] border border-white shadow-[0_8px_20px_-6px_rgba(11,32,70,0.25)] flex items-center justify-center text-primary">
                <Mail className="w-6 h-6" />
              </div>

              <h1 className="mt-5 text-center text-2xl font-bold text-[#0F172A] tracking-tight">ลืมรหัสผ่าน</h1>
              <p className="mt-1.5 text-center text-sm leading-relaxed text-[#64748B]">
                กรอกอีเมลองค์กรของคุณที่ลงทะเบียนไว้ในระบบ เพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่
              </p>

              {error && (
                <div className="mt-5 p-3 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-[#BE123C] text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
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
                      กำลังส่งลิงก์...
                    </>
                  ) : (
                    'ส่งลิงก์ตั้งรหัสผ่านใหม่'
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

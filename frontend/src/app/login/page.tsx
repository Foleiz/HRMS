'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { LogIn, Lock, User, Eye, EyeOff, Loader2, Users, ChevronDown, AlertCircle } from 'lucide-react';

/** บัญชีทดสอบ (แสดงเฉพาะตอนพัฒนา ไม่แสดงบน production) */
const DEMO_ACCOUNTS: { label: string; username: string; password: string }[] = [
  { label: 'SuperAdmin', username: 'admin', password: 'Admin#2026!Sec' },
  { label: 'HR', username: 'hr', password: 'Hr@2026!Pass' },
  { label: 'Finance', username: 'finance', password: 'Finance@Money2026' },
  { label: 'CEO / Approver', username: 'approver', password: 'Approver@Flow2026' },
  { label: 'Dept Manager', username: 'somchai.w', password: 'Somchai@Dept2026' },
  { label: 'พนักงานทั่วไป', username: 'worameth.r', password: 'Worameth@Staff26' },
];

const SHOW_DEMO_ACCOUNTS = process.env.NODE_ENV !== 'production';

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      const msg = 'กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน';
      setError(msg);
      toast.warning(msg);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await login({ username, password });
      toast.success('เข้าสู่ระบบสำเร็จ ยินดีต้อนรับเข้าสู่ระบบ HRMS');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ โปรดลองอีกครั้ง';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    // ยังไม่มีระบบรีเซ็ตรหัสผ่านด้วยตนเอง — แจ้งให้ติดต่อ HR/ผู้ดูแลระบบ
    toast.info('กรุณาติดต่อฝ่ายบุคคล (HR) หรือผู้ดูแลระบบเพื่อรีเซ็ตรหัสผ่าน', 'ลืมรหัสผ่าน');
  };

  const handleQuickLogin = (quickUser: string, quickPass: string) => {
    setUsername(quickUser);
    setPassword(quickPass);
    setError(null);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-[#C9DBF5] via-[#E3ECFA] to-[#F8FAFC] flex flex-col">
      {/* ===== พื้นหลัง: แสงนุ่ม ๆ + เส้นโค้งจาง ๆ ===== */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-[#AFC8EE]/50 blur-3xl" />
        <div className="absolute bottom-[-120px] -left-32 w-[560px] h-[360px] rounded-full bg-white/80 blur-3xl" />
        <div className="absolute bottom-[-140px] -right-24 w-[620px] h-[380px] rounded-full bg-white/80 blur-3xl" />
        <div className="absolute bottom-[-60px] left-1/2 -translate-x-1/2 w-[900px] h-[260px] rounded-full bg-white/70 blur-3xl" />
        <div className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[1100px] rounded-full border border-white/60" />
        <div className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 w-[820px] h-[820px] rounded-full border border-white/50" />
      </div>

      {/* ===== โลโก้มุมซ้ายบน (เหมือน Sidebar) ===== */}
      <header className="relative z-10 px-6 sm:px-10 pt-6">
        <div className="inline-flex items-center gap-3 select-none">
          <div className="w-10 h-10 rounded-xl bg-[#0B2046] text-white flex items-center justify-center shadow-md shadow-[#0B2046]/25">
            <Users className="w-5 h-5" />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-bold text-[#0F172A] tracking-tight">Human</div>
            <div className="text-[15px] font-bold text-[#0B2046] tracking-tight">Resource</div>
          </div>
        </div>
      </header>

      {/* ===== การ์ดเข้าสู่ระบบ ===== */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[420px] rounded-[28px] border border-white/80 bg-gradient-to-b from-[#DCE8FA] via-[#F4F8FE] to-[#FFFFFF] shadow-[0_24px_60px_-20px_rgba(11,32,70,0.35)] px-6 sm:px-10 pt-10 pb-8">
          {/* ไอคอน */}
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[#FFFFFF] border border-white shadow-[0_8px_20px_-6px_rgba(11,32,70,0.25)] flex items-center justify-center text-[#0B2046]">
            <LogIn className="w-6 h-6" />
          </div>

          <h1 className="mt-5 text-center text-2xl font-bold text-[#0F172A] tracking-tight">เข้าสู่ระบบ</h1>
          <p className="mt-1.5 text-center text-sm leading-relaxed text-[#64748B]">
            ระบบบริหารงานบุคคล (HRMS)
            <br />
            จัดการข้อมูลพนักงาน การลา <span className="whitespace-nowrap">และเงินเดือนได้ในที่เดียว</span>
          </p>

          {error && (
            <div className="mt-5 p-3 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-[#BE123C] text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <label className="sr-only" htmlFor="login-username">ชื่อผู้ใช้งาน</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#94A3B8]">
                <User className="w-4 h-4" />
              </div>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ชื่อผู้ใช้งาน"
                className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#EEF2F7] border border-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:bg-[#FFFFFF] focus:border-[#0B2046]/30 focus:ring-4 focus:ring-[#0B2046]/10 transition-all"
                required
              />
            </div>

            <label className="sr-only" htmlFor="login-password">รหัสผ่าน</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#94A3B8]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="รหัสผ่าน"
                className="w-full h-12 pl-11 pr-12 rounded-xl bg-[#EEF2F7] border border-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:bg-[#FFFFFF] focus:border-[#0B2046]/30 focus:ring-4 focus:ring-[#0B2046]/10 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#94A3B8] hover:text-[#0B2046] transition-colors"
              >
                {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-[13px] font-medium text-[#0F172A] hover:text-[#0B2046] hover:underline underline-offset-2"
              >
                ลืมรหัสผ่าน?
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 mt-1 rounded-xl bg-gradient-to-b from-[#1B3766] to-[#0B2046] text-[#FFFFFF] text-[15px] font-semibold shadow-[0_10px_24px_-8px_rgba(11,32,70,0.6),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-[#22427A] hover:to-[#0E2852] active:scale-[0.99] transition-all flex items-center justify-center disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                'เข้าสู่ระบบ'
              )}
            </button>
          </form>

          {/* ===== บัญชีทดสอบ (เฉพาะตอนพัฒนา) ===== */}
          {SHOW_DEMO_ACCOUNTS && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowDemo((v) => !v)}
                className="w-full flex items-center gap-3 text-xs text-[#64748B] hover:text-[#0B2046]"
              >
                <span className="flex-1 border-t border-dotted border-[#CBD5E1]" />
                <span className="inline-flex items-center gap-1">
                  บัญชีสำหรับทดสอบ
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDemo ? 'rotate-180' : ''}`} />
                </span>
                <span className="flex-1 border-t border-dotted border-[#CBD5E1]" />
              </button>

              {showDemo && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.username}
                      type="button"
                      onClick={() => handleQuickLogin(acc.username, acc.password)}
                      title={`${acc.username} / ${acc.password}`}
                      className={`h-14 px-2 rounded-xl border bg-[#FFFFFF] text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                        username === acc.username ? 'border-[#0B2046]/40 ring-2 ring-[#0B2046]/10' : 'border-[#E2E8F0]'
                      }`}
                    >
                      <div className="text-[12px] font-semibold text-[#0F172A] truncate">{acc.label}</div>
                      <div className="text-[10px] font-mono text-[#94A3B8] truncate">{acc.username}</div>
                    </button>
                  ))}
                </div>
              )}
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

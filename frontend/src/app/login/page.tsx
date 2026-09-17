'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ShieldCheck, Lock, User, Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      const msg = 'กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน';
      setError(msg);
      toast.warning(msg);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await login({ username: cleanUsername, password: cleanPassword });
      toast.success('เข้าสู่ระบบสำเร็จ ยินดีต้อนรับเข้าสู่ระบบ HRMS');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ โปรดลองอีกครั้ง';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (quickUser: string, quickPass: string) => {
    setUsername(quickUser);
    setPassword(quickPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-500/25 mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">ระบบบริหารงานบุคคล (HRMS)</h1>
          <p className="text-sm text-slate-400 mt-1">Enterprise Human Resource Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/80 border border-slate-700/80 backdrop-blur-xl rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-6">เข้าสู่ระบบ</h2>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start space-x-2">
              <span className="font-semibold">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">ชื่อผู้ใช้งาน (Username)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="เช่น admin, pimjai.k"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">รหัสผ่าน (Password)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center disabled:opacity-50"
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

          {/* Quick Demo Logins */}
          <div className="mt-8 pt-6 border-t border-slate-700">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 mb-3">
              <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
              <span>บัญชีสำหรับทดสอบสิทธิ์ (คลิกเพื่อเลือก - แต่ละบัญชีใช้รหัสผ่านแยกกัน):</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'Admin#2026!Sec')}
                className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 hover:border-indigo-500 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-indigo-400">SuperAdmin</span>
                  <span className="text-[10px] text-slate-500 font-mono">admin</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono group-hover:text-slate-200 truncate">
                  Admin#2026!Sec
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('pimjai.k', 'Pimjai@Hr2026')}
                className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 hover:border-emerald-500 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-400">HR Manager</span>
                  <span className="text-[10px] text-slate-500 font-mono">pimjai.k</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono group-hover:text-slate-200 truncate">
                  Pimjai@Hr2026
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('somchai.w', 'Somchai@Dept2026')}
                className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 hover:border-blue-500 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-400">Dept Manager</span>
                  <span className="text-[10px] text-slate-500 font-mono">somchai.w</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono group-hover:text-slate-200 truncate">
                  Somchai@Dept2026
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('worameth.r', 'Worameth@Staff26')}
                className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 hover:border-amber-500 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-400">General Staff</span>
                  <span className="text-[10px] text-slate-500 font-mono">worameth.r</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono group-hover:text-slate-200 truncate">
                  Worameth@Staff26
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('ceo', 'Ceo@Executive2026!')}
                className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 hover:border-purple-500 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-purple-400">CEO</span>
                  <span className="text-[10px] text-slate-500 font-mono">ceo</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono group-hover:text-slate-200 truncate">
                  Ceo@Executive2026!
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('accounting', 'Account@Pay2026')}
                className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 hover:border-teal-500 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-teal-400">Payroll / Acct</span>
                  <span className="text-[10px] text-slate-500 font-mono">accounting</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono group-hover:text-slate-200 truncate">
                  Account@Pay2026
                </div>
              </button>
            </div>
            <div className="text-[11px] text-slate-400 text-center mt-3">
              🔒 แยกใช้รหัสผ่านเฉพาะของแต่ละบุคคลเพื่อความปลอดภัยตามมาตรฐานองค์กร
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, Lock, User, Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await login({ username, password });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('เข้าสู่ระบบไม่สำเร็จ โปรดลองอีกครั้ง');
      }
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
              <span>บัญชีสำหรับทดสอบสิทธิ์ (คลิกเพื่อเลือก):</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'Admin@123456')}
                className="p-2 rounded-lg bg-slate-900/80 border border-slate-700 hover:border-indigo-500 text-left transition-colors"
              >
                <div className="font-semibold text-indigo-400">SuperAdmin</div>
                <div className="text-[11px] text-slate-400">admin</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('pimjai.k', 'Admin@123456')}
                className="p-2 rounded-lg bg-slate-900/80 border border-slate-700 hover:border-emerald-500 text-left transition-colors"
              >
                <div className="font-semibold text-emerald-400">HR Manager</div>
                <div className="text-[11px] text-slate-400">pimjai.k</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('somchai.w', 'Admin@123456')}
                className="p-2 rounded-lg bg-slate-900/80 border border-slate-700 hover:border-blue-500 text-left transition-colors"
              >
                <div className="font-semibold text-blue-400">Dept Manager</div>
                <div className="text-[11px] text-slate-400">somchai.w</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('worameth.r', 'Admin@123456')}
                className="p-2 rounded-lg bg-slate-900/80 border border-slate-700 hover:border-amber-500 text-left transition-colors"
              >
                <div className="font-semibold text-amber-400">General Staff</div>
                <div className="text-[11px] text-slate-400">worameth.r</div>
              </button>
            </div>
            <div className="text-[11px] text-slate-500 text-center mt-2">
              รหัสผ่านเริ่มต้นของทุกบัญชี: <code className="text-slate-300">Admin@123456</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

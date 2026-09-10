import React from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import {
  Landmark,
  Building2,
  Users,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Database,
  Terminal,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-8 max-w-6xl w-full mx-auto space-y-8">
          {/* Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 p-8 text-white shadow-xl">
            <div className="relative z-10 space-y-3 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Phase 0 Completed • Foundation Ready
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                HRMS Enterprise Development
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                ระบบบริหารทรัพยากรบุคคลระดับองค์กร พัฒนาแบบ Full-Stack ด้วย{' '}
                <span className="text-white font-semibold">Next.js</span> +{' '}
                <span className="text-white font-semibold">.NET 10 Web API</span> +{' '}
                <span className="text-white font-semibold">Supabase PostgreSQL (77 ตาราง)</span>
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <Link
                  href="/master/banks"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                >
                  <Landmark className="w-4 h-4" />
                  เปิดดู Reference Feature (ธนาคาร)
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Architecture Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800">PostgreSQL (Supabase)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                เชื่อมต่อไปยังสคีมา <code className="font-mono text-indigo-600">hrms</code> จำนวน 77 ตาราง พร้อมทริกเกอร์และกฎเกณฑ์ระดับฐานข้อมูล
              </p>
              <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Connected & Tested
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Terminal className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800">.NET 10 Web API</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                สถาปัตยกรรม Clean Architecture / Vertical Slice แบ่ง 4 ชั้น (Domain, Application, Infrastructure, Api)
              </p>
              <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Build 0 Error 0 Warning
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800">10 Strict Rules & PDPA</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                ฝัง Skill และกฎเหล็ก 10 ข้อ, AES-256 Masking, และการแยกสายงานสำหรับ 2 Developers ไว้ในโปรเจกต์
              </p>
              <div className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Skill Configured
              </div>
            </div>
          </div>

          {/* 2-Developer Track Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">การแบ่งงานของทีม (2 Developers Full-Stack Tracks)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Track A: Dev 1 */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      D1
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">Track A: Time & Operations</h3>
                      <p className="text-xs text-slate-400">ผู้รับผิดชอบ: Developer 1</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                    Full-Stack
                  </span>
                </div>
                <ul className="text-xs text-slate-600 space-y-2 border-t border-slate-100 pt-3">
                  <li className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    โมดูลผังองค์กร ฝ่าย แผนก ตำแหน่ง (Org Chart)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    กำหนดกะการทำงาน (Shift) และปฏิทินวันหยุด
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    นำเข้าไฟล์ Excel เครื่องสแกนนิ้ว (Batch Import + SHA256)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    คำขอแก้ไขเวลาเข้างาน (Attendance Adjustment)
                  </li>
                </ul>
              </div>

              {/* Track B: Dev 2 */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      D2
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">Track B: Talent & Compensation</h3>
                      <p className="text-xs text-slate-400">ผู้รับผิดชอบ: Developer 2</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Full-Stack
                  </span>
                </div>
                <ul className="text-xs text-slate-600 space-y-2 border-t border-slate-100 pt-3">
                  <li className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-500" />
                    ทะเบียนประวัติพนักงาน + เข้ารหัส PDPA (AES-256)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    สัญญาจ้างงาน และบันทึกประวัติการเลื่อนตำแหน่ง
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ระบบสิทธิ์วันลาและยื่นใบลา (Leave Ledger & Policies)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ระบบคำนวณเงินเดือน ภาษีขั้นบันได และสลิปเงินเดือน (PDF)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

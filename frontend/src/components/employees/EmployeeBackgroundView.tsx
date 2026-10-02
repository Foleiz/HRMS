'use client';

import React from 'react';
import { GraduationCap, Briefcase, ShieldCheck, Landmark } from 'lucide-react';
import { Employee } from '@/types/employee';

const formatDate = (v?: string | null) => {
  if (!v) return '-';
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' });
};

const duration = (start?: string | null, end?: string | null) => {
  if (!start) return '';
  const s = new Date(start);
  const e = end ? new Date(end) : new Date();
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return '';
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  if (months <= 0) return '';
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y} ปี` : '', m ? `${m} เดือน` : ''].filter(Boolean).join(' ');
};

/** แท็บการศึกษา & ประวัติการทำงาน ในหน้ารายละเอียดพนักงาน */
export function EmployeeBackgroundView({ employee }: { employee: Employee }) {
  const educations = employee.educations ?? [];
  const works = employee.workExperiences ?? [];

  return (
    <div className="pt-6 flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 text-xs animate-in fade-in duration-150">
      <section>
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="w-4 h-4 text-[#0B2046]" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">ประวัติการศึกษา</h3>
        </div>
        {educations.length === 0 ? (
          <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400 py-6 text-center bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">ยังไม่มีข้อมูล</p>
        ) : (
          <ol className="relative border-l border-slate-200 dark:border-slate-700 ml-2 space-y-5">
            {educations.map((e, i) => (
              <li key={e.id ?? i} className="ml-4">
                <span className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full bg-[#0B2046] ring-4 ring-white" />
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {e.educationLevel}
                  {e.major ? ` · ${e.major}` : ''}
                </p>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5">{e.institution}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-0.5">
                  {e.graduationYear ? `สำเร็จปี ${e.graduationYear}` : 'ไม่ระบุปีที่สำเร็จ'}
                  {e.gpa ? ` · เกรดเฉลี่ย ${Number(e.gpa).toFixed(2)}` : ''}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="w-4 h-4 text-[#0B2046]" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">ประวัติการทำงาน</h3>
        </div>
        {works.length === 0 ? (
          <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400 py-6 text-center bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">ยังไม่มีข้อมูล</p>
        ) : (
          <ol className="relative border-l border-slate-200 dark:border-slate-700 ml-2 space-y-5">
            {works.map((w, i) => (
              <li key={w.id ?? i} className="ml-4">
                <span className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full bg-slate-400 ring-4 ring-white" />
                <p className="font-bold text-slate-800 dark:text-slate-200">{w.positionName || 'ไม่ระบุตำแหน่ง'}</p>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5">{w.companyName}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-0.5">
                  {formatDate(w.startDate)} – {w.endDate ? formatDate(w.endDate) : 'ปัจจุบัน'}
                  {duration(w.startDate, w.endDate) ? ` · ${duration(w.startDate, w.endDate)}` : ''}
                  {w.lastSalary ? ` · เงินเดือนล่าสุด ${Number(w.lastSalary).toLocaleString('th-TH')} บาท` : ''}
                </p>
                {w.jobDescription && <p className="text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-line break-words">{w.jobDescription}</p>}
                {w.leavingReason && <p className="text-[11px] text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-1">เหตุผลที่ออก: {w.leavingReason}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

/** แท็บภาษี & ประกันสังคม ในหน้ารายละเอียดพนักงาน */
export function EmployeeTaxSsoView({ employee }: { employee: Employee }) {
  const row = (label: string, value: React.ReactNode) => (
    <div>
      <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400 text-[11px]">{label}</p>
      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{value}</p>
    </div>
  );
  return (
    <div className="pt-6 flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs animate-in fade-in duration-150">
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#0B2046]" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">ประกันสังคม</h3>
        </div>
        {row('เลขประกันสังคม', <span className="font-mono">{employee.socialSecurity?.socialSecurityNoMasked || '-'}</span>)}
        {row('โรงพยาบาลตามสิทธิ์', employee.socialSecurity?.hospitalName || '-')}
      </section>
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-[#0B2046]" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">ข้อมูลลดหย่อนภาษี</h3>
        </div>
        {row('คู่สมรสมีเงินได้', employee.spouseHasIncome ? 'มี' : 'ไม่มี / ไม่ระบุ')}
        {row('จำนวนบุตรที่ใช้ลดหย่อน', `${employee.numberOfChildren ?? 0} คน`)}
        {row('จำนวนบิดามารดาที่ใช้ลดหย่อน', `${employee.parentDeductionCount ?? 0} คน`)}
        {row('จำนวนผู้พิการ/ทุพพลภาพที่ดูแล', `${employee.disabilityDeductionCount ?? 0} คน`)}
      </section>
    </div>
  );
}

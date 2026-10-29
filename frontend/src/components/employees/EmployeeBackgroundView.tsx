'use client';

import React from 'react';
import { GraduationCap, Briefcase, ShieldCheck, Landmark } from 'lucide-react';
import { Employee } from '@/types/employee';

const formatDate = (v?: string | null) => {
  if (!v) return '-';
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' });
};

/** แถวข้อมูลแบบ 2 คอลัมน์ (ซ้าย: ชื่อหัวข้อ, ขวา: ค่า) */
function KeyValueRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 text-xs">
      <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">{label}</span>
      <span
        className={`font-semibold text-slate-800 dark:text-slate-200 text-right ${
          mono ? 'font-mono' : ''
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/** กล่องการ์ดมีขอบมนและเส้นคั่นแต่ละแถว */
function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-800 shadow-2xs divide-y divide-slate-100 dark:divide-slate-700/60 overflow-hidden">
      {children}
    </div>
  );
}

/** แท็บการศึกษา & ประวัติการทำงาน ในหน้ารายละเอียดพนักงาน */
export function EmployeeBackgroundView({ employee }: { employee: Employee }) {
  const educations = employee.educations ?? [];
  const works = employee.workExperiences ?? [];

  return (
    <div className="pt-6 flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs animate-in fade-in duration-150">
      {/* ─── ประวัติการศึกษา ─── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-slate-700/60 text-primary dark:text-blue-300 flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4" />
          </span>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">ประวัติการศึกษา</h3>
        </div>

        {educations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
            ยังไม่มีข้อมูล
          </div>
        ) : (
          <div className="space-y-4">
            {educations.map((e, i) => (
              <SectionCard key={e.id ?? i}>
                <KeyValueRow label="ระดับการศึกษา" value={e.educationLevel || '-'} />
                <KeyValueRow label="สถาบัน" value={e.institution || '-'} />
                <KeyValueRow label="สาขาวิชา" value={e.major || '-'} />
                <KeyValueRow label="สำเร็จการศึกษาปี" value={e.graduationYear ? String(e.graduationYear) : '-'} />
                <KeyValueRow label="เกรดเฉลี่ย" value={e.gpa != null ? Number(e.gpa).toFixed(2) : '-'} />
              </SectionCard>
            ))}
          </div>
        )}
      </section>

      {/* ─── ประวัติการทำงาน ─── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-slate-700/60 text-primary dark:text-blue-300 flex items-center justify-center shrink-0">
            <Briefcase className="w-4 h-4" />
          </span>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">ประวัติการทำงาน</h3>
        </div>

        {works.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
            ยังไม่มีข้อมูล
          </div>
        ) : (
          <div className="space-y-4">
            {works.map((w, i) => (
              <SectionCard key={w.id ?? i}>
                <KeyValueRow label="ตำแหน่ง" value={w.positionName || '-'} />
                <KeyValueRow label="บริษัท" value={w.companyName || '-'} />
                <KeyValueRow
                  label="ช่วงเวลา"
                  value={
                    w.startDate
                      ? `${formatDate(w.startDate)} – ${w.endDate ? formatDate(w.endDate) : 'ปัจจุบัน'}`
                      : '-'
                  }
                />
                <KeyValueRow
                  label="เงินเดือนล่าสุด"
                  value={w.lastSalary ? `${Number(w.lastSalary).toLocaleString('th-TH')} บาท` : '-'}
                />
                <KeyValueRow label="เหตุผลที่ออก" value={w.leavingReason || 'ไม่มี'} />
              </SectionCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/** แท็บภาษี & ประกันสังคม ในหน้ารายละเอียดพนักงาน */
export function EmployeeTaxSsoView({ employee }: { employee: Employee }) {
  return (
    <div className="pt-6 flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs animate-in fade-in duration-150">
      {/* ─── ประกันสังคม ─── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-slate-700/60 text-primary dark:text-blue-300 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </span>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">ประกันสังคม</h3>
        </div>

        <SectionCard>
          <KeyValueRow
            label="เลขประกันสังคม"
            value={employee.socialSecurity?.socialSecurityNoMasked || '-'}
            mono
          />
          <KeyValueRow
            label="โรงพยาบาลตามสิทธิ์"
            value={employee.socialSecurity?.hospitalName || '-'}
          />
        </SectionCard>
      </section>

      {/* ─── ข้อมูลลดหย่อนภาษี ─── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-slate-700/60 text-primary dark:text-blue-300 flex items-center justify-center shrink-0">
            <Landmark className="w-4 h-4" />
          </span>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">ข้อมูลลดหย่อนภาษี</h3>
        </div>

        <SectionCard>
          <KeyValueRow
            label="คู่สมรสมีเงินได้"
            value={employee.spouseHasIncome ? 'มี' : 'ไม่มี / ไม่ระบุ'}
          />
          <KeyValueRow
            label="จำนวนบุตรที่ใช้ลดหย่อน"
            value={`${employee.numberOfChildren ?? 0} คน`}
          />
          <KeyValueRow
            label="จำนวนบิดามารดาที่ใช้ลดหย่อน"
            value={`${employee.parentDeductionCount ?? 0} คน`}
          />
          <KeyValueRow
            label="จำนวนผู้พิการ/ทุพพลภาพที่ดูแล"
            value={`${employee.disabilityDeductionCount ?? 0} คน`}
          />
        </SectionCard>
      </section>
    </div>
  );
}

'use client';

import React from 'react';
import { Plus, Trash2, GraduationCap, Briefcase } from 'lucide-react';
import { EmployeeEducation, EmployeeWorkExperience } from '@/types/employee';

export const EDUCATION_LEVELS = ['มัธยมศึกษาตอนต้น', 'มัธยมศึกษาตอนปลาย', 'ปวช.', 'ปวส.', 'ปริญญาตรี', 'ปริญญาโท', 'ปริญญาเอก', 'อื่น ๆ'];

const INPUT = 'w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]';
const currentBE = new Date().getFullYear() + 543;
const YEARS = Array.from({ length: 50 }, (_, i) => currentBE + 1 - i);

export const emptyEducation = (): EmployeeEducation => ({
  educationLevel: '',
  institution: '',
  major: '',
  graduationYear: undefined,
  gpa: undefined,
});

export const emptyWorkExperience = (): EmployeeWorkExperience => ({
  companyName: '',
  positionName: '',
  startDate: '',
  endDate: '',
  lastSalary: null,
  leavingReason: '',
  jobDescription: '',
});

interface Props {
  educations: EmployeeEducation[];
  onEducationsChange: (items: EmployeeEducation[]) => void;
  workExperiences: EmployeeWorkExperience[];
  onWorkExperiencesChange: (items: EmployeeWorkExperience[]) => void;
}

/** แก้ไขประวัติการศึกษา (หลายระดับ) และประวัติการทำงาน (หลายแห่ง) */
export default function EmployeeBackgroundEditor({
  educations,
  onEducationsChange,
  workExperiences,
  onWorkExperiencesChange,
}: Props) {
  const updateEdu = (idx: number, patch: Partial<EmployeeEducation>) =>
    onEducationsChange(educations.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  const updateWork = (idx: number, patch: Partial<EmployeeWorkExperience>) =>
    onWorkExperiencesChange(workExperiences.map((w, i) => (i === idx ? { ...w, ...patch } : w)));

  return (
    <div className="max-w-4xl mx-auto space-y-8 text-xs animate-in fade-in duration-150">
      {/* ประวัติการศึกษา */}
      <section className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-[#0B2046]" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">ประวัติการศึกษา</h3>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 dark:text-slate-400">({educations.length} รายการ)</span>
          </div>
          <button
            type="button"
            onClick={() => onEducationsChange([...educations, emptyEducation()])}
            className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#0B2046] dark:border-white text-[#0B2046] dark:text-white rounded-lg hover:bg-[#0B2046] hover:text-white transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> เพิ่มวุฒิการศึกษา
          </button>
        </div>

        {educations.length === 0 && (
          <p className="text-center text-slate-400 dark:text-slate-500 dark:text-slate-400 py-6 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            ยังไม่มีประวัติการศึกษา
          </p>
        )}

        {educations.map((edu, idx) => (
          <div key={idx} className="relative p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 grid grid-cols-1 md:grid-cols-6 gap-3">
            <button
              type="button"
              onClick={() => onEducationsChange(educations.filter((_, i) => i !== idx))}
              className="absolute top-2 right-2 p-1 rounded text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
              title="ลบรายการนี้"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <div className="md:col-span-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">ระดับการศึกษา <span className="text-rose-500">*</span></label>
              <select
                value={edu.educationLevel}
                onChange={(e) => updateEdu(idx, { educationLevel: e.target.value })}
                className={`${INPUT} cursor-pointer`}
              >
                <option value="">เลือกระดับการศึกษา</option>
                {EDUCATION_LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
                {edu.educationLevel && !EDUCATION_LEVELS.includes(edu.educationLevel) && (
                  <option value={edu.educationLevel}>{edu.educationLevel}</option>
                )}
              </select>
            </div>
            <div className="md:col-span-4 md:pr-6">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">สถาบันการศึกษา <span className="text-rose-500">*</span></label>
              <input
                type="text"
                value={edu.institution}
                onChange={(e) => updateEdu(idx, { institution: e.target.value })}
                placeholder="เช่น จุฬาลงกรณ์มหาวิทยาลัย"
                className={INPUT}
              />
            </div>
            <div className="md:col-span-3">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">สาขาวิชา</label>
              <input
                type="text"
                value={edu.major ?? ''}
                onChange={(e) => updateEdu(idx, { major: e.target.value })}
                placeholder="เช่น วิศวกรรมคอมพิวเตอร์"
                className={INPUT}
              />
            </div>
            <div className="md:col-span-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">ปีที่สำเร็จ (พ.ศ.)</label>
              <select
                value={edu.graduationYear ?? ''}
                onChange={(e) => updateEdu(idx, { graduationYear: e.target.value ? Number(e.target.value) : undefined })}
                className={`${INPUT} cursor-pointer`}
              >
                <option value="">ไม่ระบุ</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">เกรดเฉลี่ย</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="4"
                value={edu.gpa ?? ''}
                onChange={(e) => updateEdu(idx, { gpa: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="3.50"
                className={INPUT}
              />
            </div>
          </div>
        ))}
      </section>

      {/* ประวัติการทำงาน */}
      <section className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#0B2046]" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">ประวัติการทำงาน</h3>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 dark:text-slate-400">({workExperiences.length} แห่ง)</span>
          </div>
          <button
            type="button"
            onClick={() => onWorkExperiencesChange([...workExperiences, emptyWorkExperience()])}
            className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#0B2046] dark:border-white text-[#0B2046] dark:text-white rounded-lg hover:bg-[#0B2046] hover:text-white transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> เพิ่มประวัติการทำงาน
          </button>
        </div>

        {workExperiences.length === 0 && (
          <p className="text-center text-slate-400 dark:text-slate-500 dark:text-slate-400 py-6 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            ยังไม่มีประวัติการทำงาน
          </p>
        )}

        {workExperiences.map((work, idx) => (
          <div key={idx} className="relative p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 grid grid-cols-1 md:grid-cols-6 gap-3">
            <button
              type="button"
              onClick={() => onWorkExperiencesChange(workExperiences.filter((_, i) => i !== idx))}
              className="absolute top-2 right-2 p-1 rounded text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
              title="ลบรายการนี้"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <div className="md:col-span-3">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">ชื่อบริษัท / องค์กร <span className="text-rose-500">*</span></label>
              <input
                type="text"
                value={work.companyName}
                onChange={(e) => updateWork(idx, { companyName: e.target.value })}
                className={INPUT}
              />
            </div>
            <div className="md:col-span-3 md:pr-6">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">ตำแหน่ง</label>
              <input
                type="text"
                value={work.positionName ?? ''}
                onChange={(e) => updateWork(idx, { positionName: e.target.value })}
                className={INPUT}
              />
            </div>
            <div className="md:col-span-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">วันที่เริ่มงาน</label>
              <input
                type="date"
                value={work.startDate ?? ''}
                onChange={(e) => updateWork(idx, { startDate: e.target.value })}
                className={INPUT}
              />
            </div>
            <div className="md:col-span-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">วันที่ออก</label>
              <input
                type="date"
                value={work.endDate ?? ''}
                min={work.startDate || undefined}
                onChange={(e) => updateWork(idx, { endDate: e.target.value })}
                className={INPUT}
              />
            </div>
            <div className="md:col-span-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">เงินเดือนล่าสุด (บาท)</label>
              <input
                type="number"
                min="0"
                value={work.lastSalary ?? ''}
                onChange={(e) => updateWork(idx, { lastSalary: e.target.value ? Number(e.target.value) : null })}
                className={INPUT}
              />
            </div>
            <div className="md:col-span-6">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">หน้าที่รับผิดชอบ</label>
              <textarea
                rows={2}
                value={work.jobDescription ?? ''}
                onChange={(e) => updateWork(idx, { jobDescription: e.target.value })}
                className={`${INPUT} resize-none break-words`}
              />
            </div>
            <div className="md:col-span-6">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">เหตุผลที่ออก</label>
              <input
                type="text"
                value={work.leavingReason ?? ''}
                onChange={(e) => updateWork(idx, { leavingReason: e.target.value })}
                className={INPUT}
              />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}


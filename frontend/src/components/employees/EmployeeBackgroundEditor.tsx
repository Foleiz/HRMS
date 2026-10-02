'use client';

import React, { useState } from 'react';
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

/** แก้ไขประวัติการศึกษา (หลายระดับ) และประวัติการทำงาน (หลายแห่ง) พร้อมระบบแท็บแบบตัวเลขวงกลม (1) (2) (3) (+) */
export default function EmployeeBackgroundEditor({
  educations,
  onEducationsChange,
  workExperiences,
  onWorkExperiencesChange,
}: Props) {
  const [activeEduIndex, setActiveEduIndex] = useState<number>(0);
  const [activeWorkIndex, setActiveWorkIndex] = useState<number>(0);

  const safeEduIndex = Math.min(activeEduIndex, Math.max(0, educations.length - 1));
  const safeWorkIndex = Math.min(activeWorkIndex, Math.max(0, workExperiences.length - 1));

  const updateEdu = (idx: number, patch: Partial<EmployeeEducation>) =>
    onEducationsChange(educations.map((e, i) => (i === idx ? { ...e, ...patch } : e)));

  const updateWork = (idx: number, patch: Partial<EmployeeWorkExperience>) =>
    onWorkExperiencesChange(workExperiences.map((w, i) => (i === idx ? { ...w, ...patch } : w)));

  const handleAddEducation = () => {
    onEducationsChange([...educations, emptyEducation()]);
    setActiveEduIndex(educations.length);
  };

  const handleRemoveEducation = (indexToRemove: number) => {
    const updated = educations.filter((_, i) => i !== indexToRemove);
    onEducationsChange(updated);
    setActiveEduIndex(Math.max(0, Math.min(activeEduIndex, updated.length - 1)));
  };

  const handleAddWorkExperience = () => {
    onWorkExperiencesChange([...workExperiences, emptyWorkExperience()]);
    setActiveWorkIndex(workExperiences.length);
  };

  const handleRemoveWorkExperience = (indexToRemove: number) => {
    const updated = workExperiences.filter((_, i) => i !== indexToRemove);
    onWorkExperiencesChange(updated);
    setActiveWorkIndex(Math.max(0, Math.min(activeWorkIndex, updated.length - 1)));
  };

  const currentEdu = educations[safeEduIndex];
  const currentWork = workExperiences[safeWorkIndex];

  return (
    <div className="w-full space-y-8 text-xs animate-in fade-in duration-150">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* ส่วนที่ 1: ประวัติการศึกษา                                  */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-[#0B2046]" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">ประวัติการศึกษา</h3>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">({educations.length} รายการ)</span>
          </div>
          {educations.length === 0 && (
            <button
              type="button"
              onClick={handleAddEducation}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#0B2046] text-[#0B2046] rounded-lg hover:bg-[#0B2046] hover:text-white transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> เพิ่มวุฒิการศึกษา
            </button>
          )}
        </div>

        {educations.length === 0 ? (
          <p className="text-center text-slate-400 dark:text-slate-500 py-6 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            ยังไม่มีประวัติการศึกษา กดปุ่ม &quot;เพิ่มวุฒิการศึกษา&quot; เพื่อเริ่มต้นระบุข้อมูล
          </p>
        ) : (
          <div className="space-y-4">
            {/* ตัวสลับรายการแบบตัวเลขวงกลม (1) (2) (3) (+) */}
            <div className="flex items-center gap-2">
              {educations.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveEduIndex(idx)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all relative cursor-pointer ${
                    safeEduIndex === idx
                      ? 'bg-[#0B2046] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}

              {/* ปุ่ม + เพิ่มวุฒิการศึกษาใหม่ */}
              <button
                type="button"
                onClick={handleAddEducation}
                className="w-7 h-7 rounded-full border border-slate-300 dark:border-slate-600 hover:border-slate-800 dark:hover:border-slate-300 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center justify-center transition-all cursor-pointer"
                title="เพิ่มวุฒิการศึกษาลำดับถัดไป"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {/* ปุ่มลบรายการปัจจุบัน */}
              <button
                type="button"
                onClick={() => handleRemoveEducation(safeEduIndex)}
                className="text-[11px] text-rose-500 hover:underline ml-auto flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                ลบวุฒิการศึกษาลำดับที่ {safeEduIndex + 1}
              </button>
            </div>

            {/* การ์ดฟอร์มแก้ไขวุฒิการศึกษาที่เลือก */}
            {currentEdu && (
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="md:col-span-2">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    ระดับการศึกษา <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={currentEdu.educationLevel}
                    onChange={(e) => updateEdu(safeEduIndex, { educationLevel: e.target.value })}
                    className={`${INPUT} cursor-pointer`}
                  >
                    <option value="">เลือกระดับการศึกษา</option>
                    {EDUCATION_LEVELS.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                    {currentEdu.educationLevel && !EDUCATION_LEVELS.includes(currentEdu.educationLevel) && (
                      <option value={currentEdu.educationLevel}>{currentEdu.educationLevel}</option>
                    )}
                  </select>
                </div>
                <div className="md:col-span-4">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    สถาบันการศึกษา <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={currentEdu.institution}
                    onChange={(e) => updateEdu(safeEduIndex, { institution: e.target.value })}
                    placeholder="เช่น จุฬาลงกรณ์มหาวิทยาลัย"
                    className={INPUT}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    สาขาวิชา
                  </label>
                  <input
                    type="text"
                    value={currentEdu.major ?? ''}
                    onChange={(e) => updateEdu(safeEduIndex, { major: e.target.value })}
                    placeholder="เช่น วิศวกรรมคอมพิวเตอร์"
                    className={INPUT}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    ปีที่สำเร็จ (พ.ศ.)
                  </label>
                  <select
                    value={currentEdu.graduationYear ?? ''}
                    onChange={(e) => updateEdu(safeEduIndex, { graduationYear: e.target.value ? Number(e.target.value) : undefined })}
                    className={`${INPUT} cursor-pointer`}
                  >
                    <option value="">ไม่ระบุ</option>
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    เกรดเฉลี่ย
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="4"
                    value={currentEdu.gpa ?? ''}
                    onChange={(e) => updateEdu(safeEduIndex, { gpa: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="3.50"
                    className={INPUT}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ส่วนที่ 2: ประวัติการทำงาน                                   */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#0B2046]" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">ประวัติการทำงาน</h3>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">({workExperiences.length} แห่ง)</span>
          </div>
          {workExperiences.length === 0 && (
            <button
              type="button"
              onClick={handleAddWorkExperience}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#0B2046] text-[#0B2046] rounded-lg hover:bg-[#0B2046] hover:text-white transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> เพิ่มประวัติการทำงาน
            </button>
          )}
        </div>

        {workExperiences.length === 0 ? (
          <p className="text-center text-slate-400 dark:text-slate-500 py-6 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            ยังไม่มีประวัติการทำงาน กดปุ่ม &quot;เพิ่มประวัติการทำงาน&quot; เพื่อเริ่มต้นระบุข้อมูล
          </p>
        ) : (
          <div className="space-y-4">
            {/* ตัวสลับรายการแบบตัวเลขวงกลม (1) (2) (3) (+) */}
            <div className="flex items-center gap-2">
              {workExperiences.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveWorkIndex(idx)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all relative cursor-pointer ${
                    safeWorkIndex === idx
                      ? 'bg-[#0B2046] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}

              {/* ปุ่ม + เพิ่มประวัติการทำงานใหม่ */}
              <button
                type="button"
                onClick={handleAddWorkExperience}
                className="w-7 h-7 rounded-full border border-slate-300 dark:border-slate-600 hover:border-slate-800 dark:hover:border-slate-300 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center justify-center transition-all cursor-pointer"
                title="เพิ่มประวัติการทำงานลำดับถัดไป"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {/* ปุ่มลบรายการปัจจุบัน */}
              <button
                type="button"
                onClick={() => handleRemoveWorkExperience(safeWorkIndex)}
                className="text-[11px] text-rose-500 hover:underline ml-auto flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                ลบประวัติการทำงานลำดับที่ {safeWorkIndex + 1}
              </button>
            </div>

            {/* การ์ดฟอร์มแก้ไขประวัติการทำงานที่เลือก */}
            {currentWork && (
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="md:col-span-3">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    ชื่อบริษัท / องค์กร <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={currentWork.companyName}
                    onChange={(e) => updateWork(safeWorkIndex, { companyName: e.target.value })}
                    placeholder="เช่น บริษัท สยามเทคโนโลยี จำกัด"
                    className={INPUT}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    ตำแหน่ง
                  </label>
                  <input
                    type="text"
                    value={currentWork.positionName ?? ''}
                    onChange={(e) => updateWork(safeWorkIndex, { positionName: e.target.value })}
                    placeholder="เช่น Senior Frontend Developer"
                    className={INPUT}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    วันที่เริ่มงาน
                  </label>
                  <input
                    type="date"
                    value={currentWork.startDate ?? ''}
                    onChange={(e) => updateWork(safeWorkIndex, { startDate: e.target.value })}
                    className={INPUT}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    วันที่ออก
                  </label>
                  <input
                    type="date"
                    value={currentWork.endDate ?? ''}
                    min={currentWork.startDate || undefined}
                    onChange={(e) => updateWork(safeWorkIndex, { endDate: e.target.value })}
                    className={INPUT}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    เงินเดือนล่าสุด (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={currentWork.lastSalary ?? ''}
                    onChange={(e) => updateWork(safeWorkIndex, { lastSalary: e.target.value ? Number(e.target.value) : null })}
                    placeholder="เช่น 45000"
                    className={INPUT}
                  />
                </div>
                <div className="md:col-span-6">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    หน้าที่รับผิดชอบ
                  </label>
                  <textarea
                    rows={2}
                    value={currentWork.jobDescription ?? ''}
                    onChange={(e) => updateWork(safeWorkIndex, { jobDescription: e.target.value })}
                    placeholder="สรุปงานและความรับผิดชอบหลัก"
                    className={`${INPUT} resize-none break-words`}
                  />
                </div>
                <div className="md:col-span-6">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    เหตุผลที่ออก
                  </label>
                  <input
                    type="text"
                    value={currentWork.leavingReason ?? ''}
                    onChange={(e) => updateWork(safeWorkIndex, { leavingReason: e.target.value })}
                    placeholder="เช่น เพื่อหาความท้าทายใหม่"
                    className={INPUT}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

'use client';

import React from 'react';
import { Landmark, ShieldCheck } from 'lucide-react';

const INPUT = 'w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]';

export interface TaxSsoValues {
  socialSecurityNo: string;
  hospitalName: string;
  spouseHasIncome: boolean;
  numberOfChildren: number;
  parentDeductionCount: number;
  disabilityDeductionCount: number;
}

interface Props {
  values: TaxSsoValues;
  onChange: (values: TaxSsoValues) => void;
  /** เลขประกันสังคมเดิม (ปิดบางส่วน) */
  currentSocialSecurityMasked?: string | null;
}

/** ข้อมูลภาษีและประกันสังคมรายคน (ฝ่ายบุคคลแก้ไข) */
export default function EmployeeTaxSsoEditor({ values, onChange, currentSocialSecurityMasked }: Props) {
  const set = (patch: Partial<TaxSsoValues>) => onChange({ ...values, ...patch });
  const count = (v: string, max: number) => Math.max(0, Math.min(max, Number(v) || 0));

  return (
    <div className="max-w-3xl mx-auto space-y-8 text-xs animate-in fade-in duration-150">
      <section className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
          <ShieldCheck className="w-4 h-4 text-[#0B2046]" />
          <h3 className="font-bold text-slate-800 text-sm">ประกันสังคม</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">เลขประกันสังคม</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={13}
              value={values.socialSecurityNo}
              onChange={(e) => set({ socialSecurityNo: e.target.value.replace(/\D/g, '') })}
              placeholder={currentSocialSecurityMasked ? `เดิม: ${currentSocialSecurityMasked}` : 'ส่วนใหญ่เป็นเลขบัตรประชาชน 13 หลัก'}
              className={`${INPUT} font-mono`}
            />
            <p className="text-[11px] text-slate-400 mt-1">เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน (ระบบเก็บแบบเข้ารหัส)</p>
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">โรงพยาบาลตามสิทธิ์</label>
            <input
              type="text"
              value={values.hospitalName}
              onChange={(e) => set({ hospitalName: e.target.value })}
              placeholder="เช่น โรงพยาบาลราชวิถี"
              className={INPUT}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
          <Landmark className="w-4 h-4 text-[#0B2046]" />
          <h3 className="font-bold text-slate-800 text-sm">ข้อมูลลดหย่อนภาษี</h3>
          <span className="text-[11px] text-slate-400">ใช้คำนวณภาษีหัก ณ ที่จ่ายในรอบเงินเดือน</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50/60 cursor-pointer md:col-span-2">
            <input
              type="checkbox"
              checked={values.spouseHasIncome}
              onChange={(e) => set({ spouseHasIncome: e.target.checked })}
              className="w-4 h-4 rounded text-[#0B2046] focus:ring-[#0B2046]"
            />
            <span className="text-slate-700">คู่สมรสมีเงินได้ (ไม่ใช้สิทธิ์ลดหย่อนคู่สมรส)</span>
          </label>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">จำนวนบุตรที่ใช้ลดหย่อน</label>
            <input
              type="number"
              min={0}
              max={20}
              value={values.numberOfChildren}
              onChange={(e) => set({ numberOfChildren: count(e.target.value, 20) })}
              className={INPUT}
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">จำนวนบิดามารดาที่ใช้ลดหย่อน</label>
            <input
              type="number"
              min={0}
              max={4}
              value={values.parentDeductionCount}
              onChange={(e) => set({ parentDeductionCount: count(e.target.value, 4) })}
              className={INPUT}
            />
            <p className="text-[11px] text-slate-400 mt-1">บิดามารดาของตนเองและคู่สมรส สูงสุด 4 คน</p>
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">จำนวนผู้พิการ/ทุพพลภาพที่ดูแล</label>
            <input
              type="number"
              min={0}
              max={20}
              value={values.disabilityDeductionCount}
              onChange={(e) => set({ disabilityDeductionCount: count(e.target.value, 20) })}
              className={INPUT}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

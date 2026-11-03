'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { inputClass } from '@/components/ui';

const INPUT = inputClass;

export interface TaxSsoValues {
  socialSecurityNo?: string;
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

/** ข้อมูลประกันสังคมรายคน (ฝ่ายบุคคลแก้ไข)
 *  ฟิลด์ลดหย่อนภาษี (spouseHasIncome ฯลฯ) ยังเก็บใน state เพื่อส่งค่าเดิมกลับ แต่ไม่แสดงบนหน้าจอแล้ว */
export default function EmployeeTaxSsoEditor({ values, onChange, currentSocialSecurityMasked }: Props) {
  const set = (patch: Partial<TaxSsoValues>) => onChange({ ...values, ...patch });
  const count = (v: string, max: number) => Math.max(0, Math.min(max, Number(v) || 0));

  return (
    <div className="w-full space-y-8 text-xs animate-in fade-in duration-150">
      <section className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">ประกันสังคม</h3>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
            (ใช้เลขเดียวกับเลขประจำตัวประชาชน 13 หลัก)
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">โรงพยาบาลตามสิทธิ์</label>
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

    </div>
  );
}


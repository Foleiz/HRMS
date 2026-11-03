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

/** ช่องประกันสังคม (โรงพยาบาลตามสิทธิ์) — วางในแท็บข้อมูลส่วนตัวของฟอร์มพนักงาน
 *  ฟิลด์ลดหย่อนภาษีใน TaxSsoValues ยังเก็บใน state เพื่อส่งค่าเดิมกลับ แต่ไม่แสดงบนหน้าจอ */
export function SsoHospitalField({ values, onChange }: Pick<Props, 'values' | 'onChange'>) {
  return (
    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-3">
      <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
        <span>ประกันสังคม</span>
        <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">(เลขเดียวกับเลขบัตรประชาชน)</span>
      </label>
      <div>
        <span className="text-slate-500 dark:text-slate-400 text-[11px] block mb-1">โรงพยาบาลตามสิทธิ์</span>
        <input
          type="text"
          value={values.hospitalName}
          onChange={(e) => onChange({ ...values, hospitalName: e.target.value })}
          placeholder="เช่น โรงพยาบาลราชวิถี"
          className={`${INPUT} h-10`}
        />
      </div>
    </div>
  );
}

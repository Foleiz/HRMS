'use client';

import React, { useEffect, useState } from 'react';
import { salaryService } from '@/services/salaryService';
import { PayrollItem } from '@/types/payroll';
import { CustomSelect } from '@/components/ui/CustomSelect';

const SYSTEM_CODES = ['INC_BASE', 'INC_OT', 'DED_SSO', 'DED_TAX', 'DED_UNPAID_LEAVE', 'INC_BONUS'];

/** รายการรายได้ที่ใช้จ่ายสวัสดิการได้: ไม่ใช่รายการระบบ และไม่ได้คำนวณยอดเอง (ยอดคงที่/สูตร) */
const isLinkable = (p: PayrollItem) =>
  p.itemType === 'EARNING' &&
  p.status === 'ACTIVE' &&
  !SYSTEM_CODES.includes(p.itemCode) &&
  p.calculationType !== 'FIXED' &&
  !(p.calculationType === 'FORMULA' && p.formulaTemplate);

interface PayCodeSelectProps {
  value?: number | null;
  onChange: (payrollItemId: number | undefined) => void;
  /** แสดงใต้ช่องเมื่อยังไม่เลือก (สร้างใหม่ตอนบันทึก) */
  isNew?: boolean;
  className?: string;
}

/**
 * เลือกรายการได้-หัก (Pay Code) ที่ใช้จ่ายสวัสดิการ — ชื่อบนสลิป ภาษี และประกันสังคม ตั้งที่รายการนั้น
 */
export const PayCodeSelect: React.FC<PayCodeSelectProps> = ({ value, onChange, isNew, className }) => {
  const [items, setItems] = useState<PayrollItem[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    salaryService
      .getPayrollItems('EARNING')
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const options = items.filter((p) => isLinkable(p) || p.id === value);
  const selected = items.find((p) => p.id === value);

  return (
    <div>
      <CustomSelect
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        className={
          className ??
          'w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
        }
      >
        <option value="">{isNew ? 'สร้างรายการรายได้ใหม่ให้อัตโนมัติ' : '— คงรายการเดิม —'}</option>
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {p.itemName} ({p.itemCode})
          </option>
        ))}
      </CustomSelect>
      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1">
        {selected ? (
          <>
            บนสลิปแสดงเป็น "{selected.itemName}" · ภาษี: {selected.isTaxable ? 'คิด' : 'ไม่คิด'} · ประกันสังคม:{' '}
            {selected.isSocialSecurityCalculated ? 'คิด' : 'ไม่คิด'} (แก้ได้ที่เงินเดือน › รายการได้-หัก)
          </>
        ) : failed ? (
          'โหลดรายการได้-หักไม่ได้ (ต้องมีสิทธิ์ดูหน้าเงินเดือน) — ระบบจะใช้รายการเดิมหรือสร้างให้อัตโนมัติ'
        ) : (
          'ภาษี/ประกันสังคมของสวัสดิการนี้ใช้ตามรายการได้-หักที่เลือก'
        )}
      </p>
    </div>
  );
};

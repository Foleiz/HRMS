'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Check, Gift, Info, ReceiptText, Wallet } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { inputClass } from '@/components/ui';

export interface BenefitPolicyValue {
  category: string;
  isStatutory?: boolean;
  payoutType?: string;
  defaultCoverageAmount?: number;
  defaultFrequency?: string;
  isDocumentRequired?: boolean;
}

/** หมวดที่ backend ไม่รับคำขอเบิก (จ่ายอัตโนมัติ) */
const NO_CLAIM_CATEGORIES = ['STATUTORY', 'ALLOWANCE'];

const PAYOUTS = [
  { key: 'REIMBURSEMENT', title: 'เบิกตามจริง', desc: 'ยื่นเบิกพร้อมหลักฐาน อนุมัติแล้วจ่ายในงวดถัดไป', icon: ReceiptText },
  { key: 'PAYROLL', title: 'จ่ายในเงินเดือน', desc: 'จ่ายอัตโนมัติในสลิปทุกงวด ไม่ต้องยื่นเบิก', icon: Wallet },
  { key: 'IN_KIND', title: 'ไม่ใช่ตัวเงิน', desc: 'บริการหรือสิทธิ์ เช่น รถรับส่ง ประกันกลุ่ม', icon: Gift },
] as const;

const FREQUENCIES = [
  { key: 'YEARLY', label: 'ต่อปี', desc: 'วงเงินรวมตลอดทั้งปี (รีเซ็ตใหม่ทุกปี)' },
  { key: 'MONTHLY', label: 'ต่อเดือน', desc: 'วงเงินรวมต่อเดือน (รีเซ็ตใหม่ทุกเดือน)' },
  { key: 'DAILY', label: 'ต่อวัน', desc: 'จำกัดวงเงินสูงสุดต่อวัน' },
  { key: 'PER_OCCURRENCE', label: 'ต่อครั้ง', desc: 'จำกัดวงเงินสูงสุดต่อการยื่นเบิก 1 ครั้ง' },
];

/**
 * ส่วนตั้งค่านโยบายสวัสดิการ: หมวดหมู่ / สิทธิตามกฎหมาย / วิธีจ่าย / วงเงินเริ่มต้น / แนบหลักฐาน
 * - ช่องที่แสดงเปลี่ยนตามวิธีจ่าย
 * - สิทธิตามกฎหมาย / หมวดเบี้ยเลี้ยง ยื่นเบิกไม่ได้ → ปิดตัวเลือก "เบิกตามจริง"
 */
export function BenefitPolicyFields({
  value,
  onChange,
  categories,
}: {
  value: BenefitPolicyValue;
  onChange: (patch: Partial<BenefitPolicyValue>) => void;
  categories: { value: string; label: string }[];
}) {
  const [unlimited, setUnlimited] = useState(() => !value.defaultCoverageAmount);
  const [showFreqInfo, setShowFreqInfo] = useState(false);
  const freqInfoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showFreqInfo) return;
    const onDocClick = (e: MouseEvent) => {
      if (freqInfoRef.current && !freqInfoRef.current.contains(e.target as Node)) {
        setShowFreqInfo(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showFreqInfo]);
  const noClaim = !!value.isStatutory || NO_CLAIM_CATEGORIES.includes(value.category);
  const payout = value.payoutType || 'REIMBURSEMENT';
  const isClaim = payout === 'REIMBURSEMENT';
  const isKind = payout === 'IN_KIND';

  /** สิทธิ์ที่ยื่นเบิกไม่ได้ แต่ยังเลือกเบิกตามจริงอยู่ → ย้ายไปจ่ายในเงินเดือน */
  const fixPayout = (nextNoClaim: boolean): Partial<BenefitPolicyValue> =>
    nextNoClaim && payout === 'REIMBURSEMENT' ? { payoutType: 'PAYROLL', defaultFrequency: 'MONTHLY', isDocumentRequired: false } : {};

  const setCategory = (category: string) => {
    const isStatutory = category === 'STATUTORY' ? true : value.category === 'STATUTORY' ? false : value.isStatutory;
    onChange({ category, isStatutory, ...fixPayout(isStatutory || NO_CLAIM_CATEGORIES.includes(category)) });
  };
  const setStatutory = (isStatutory: boolean) => {
    const category = isStatutory ? 'STATUTORY' : value.category === 'STATUTORY' ? 'OTHER' : value.category;
    onChange({ isStatutory, category, ...fixPayout(isStatutory || NO_CLAIM_CATEGORIES.includes(category)) });
  };
  const setPayout = (key: string) => {
    if (key === 'REIMBURSEMENT' && noClaim) return;
    onChange({
      payoutType: key,
      isDocumentRequired: key === 'REIMBURSEMENT' ? value.isDocumentRequired : false,
      defaultFrequency: key === 'PAYROLL' ? 'MONTHLY' : value.defaultFrequency,
    });
  };

  const amount = Number(value.defaultCoverageAmount) || 0;
  const amountLocked = isClaim && unlimited;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            หมวดหมู่สวัสดิการ <span className="text-rose-500">*</span>
          </label>
          <CustomSelect value={value.category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </CustomSelect>
        </div>
        <button
          type="button"
          role="checkbox"
          aria-checked={!!value.isStatutory}
          onClick={() => setStatutory(!value.isStatutory)}
          className={`h-[42px] flex items-center gap-2.5 px-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
            value.isStatutory
              ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-600'
              : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600'
          }`}
        >
          <span
            className={`w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center shrink-0 ${
              value.isStatutory ? 'bg-primary border-primary' : 'bg-white border-slate-300 dark:bg-slate-800 dark:border-slate-600'
            }`}
          >
            {value.isStatutory && <Check className="w-3 h-3 text-white stroke-[3]" />}
          </span>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">สิทธิตามกฎหมายแรงงาน</span>
        </button>
      </div>

      <div>
        <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          วิธีจ่าย <span className="text-rose-500">*</span>
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" role="radiogroup" aria-label="วิธีจ่าย">
          {PAYOUTS.map((p) => {
            const on = p.key === payout;
            const disabled = p.key === 'REIMBURSEMENT' && noClaim;
            const Icon = p.icon;
            return (
              <button
                key={p.key}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={disabled}
                onClick={() => setPayout(p.key)}
                className={`flex flex-col items-start gap-1.5 p-3 rounded-2xl border-2 text-left transition-all ${
                  disabled
                    ? 'opacity-45 cursor-not-allowed border-dashed border-slate-300 bg-slate-50 dark:bg-slate-900/40 dark:border-slate-600'
                    : on
                    ? 'border-primary bg-indigo-50/60 shadow-md shadow-primary/10 cursor-pointer dark:bg-indigo-900/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 cursor-pointer dark:bg-slate-800 dark:border-slate-700'
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    on ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{p.title}</span>
                <span className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">{p.desc}</span>
              </button>
            );
          })}
        </div>
        {noClaim && (
          <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-400">
            {value.isStatutory ? 'สิทธิตามกฎหมาย' : 'หมวดเบี้ยเลี้ยง'}ยื่นเบิกไม่ได้ ระบบจ่ายให้อัตโนมัติ — จึงเลือก &quot;เบิกตามจริง&quot; ไม่ได้
          </p>
        )}
      </div>

      {isKind ? (
        <div className="px-4 py-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500 dark:bg-slate-900/40 dark:border-slate-600 dark:text-slate-400">
          ไม่จ่ายเป็นเงิน จึงไม่ต้องตั้งวงเงิน และไม่มีรายการในสลิปเงินเดือน
        </div>
      ) : (
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1 min-h-[20px]">
                <label htmlFor="benefit-amount" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  {isClaim ? 'วงเงิน (บาท)' : 'จำนวนเงินต่องวด (บาท)'}
                </label>
                {isClaim && (
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer">
                    ไม่จำกัดวงเงิน
                    <ToggleSwitch
                      checked={unlimited}
                      ariaLabel="ไม่จำกัดวงเงิน"
                      onChange={(v) => {
                        setUnlimited(v);
                        if (v) onChange({ defaultCoverageAmount: 0 });
                      }}
                    />
                  </label>
                )}
              </div>
              <input
                id="benefit-amount"
                type="number"
                min={0}
                step="any"
                disabled={amountLocked}
                value={amountLocked ? '' : amount || ''}
                onChange={(e) => onChange({ defaultCoverageAmount: Number(e.target.value) || 0 })}
                placeholder={amountLocked ? 'ไม่จำกัด' : isClaim ? 'เช่น 5000' : 'เช่น 1500'}
                className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800`}
              />
            </div>
            {isClaim && (
              <div>
                <div className="flex items-center gap-1.5 mb-1 min-h-[20px]">
                  <span className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">รอบวงเงิน</span>
                  <div ref={freqInfoRef} className="relative inline-flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowFreqInfo((v) => !v)}
                      aria-label="คำอธิบายรอบวงเงิน"
                      aria-expanded={showFreqInfo}
                      title="คลิกเพื่อดูคำอธิบายรอบวงเงิน"
                      className="text-slate-400 hover:text-primary dark:hover:text-blue-300 transition-colors cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                    {showFreqInfo && (
                      <div className="absolute right-0 bottom-full mb-2 w-72 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg z-30 text-[11px] space-y-2">
                        <div className="font-bold text-slate-800 dark:text-slate-100 pb-1 border-b border-slate-100 dark:border-slate-700">
                          คำอธิบายรอบวงเงิน
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                          ระยะเวลาหรือเงื่อนไขการรีเซ็ตวงเงินของสวัสดิการแบบเบิกตามจริง ว่าพนักงานสามารถเบิกได้ไม่เกินวงเงินที่ตั้งไว้ ต่อหน่วยที่กำหนด
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1 p-[3px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                  {FREQUENCIES.map((f) => {
                    const on = (value.defaultFrequency || 'YEARLY') === f.key;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        title={f.desc}
                        aria-pressed={on}
                        onClick={() => onChange({ defaultFrequency: f.key })}
                        className={`h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          on ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <p className="flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
            เป็นค่าเริ่มต้นตอนผูกกับประเภทพนักงาน — วงเงินจริงของแต่ละประเภทแก้ได้ที่หน้าประเภทพนักงาน
          </p>
        </div>
      )}

      {isClaim && (
        <button
          type="button"
          role="checkbox"
          aria-checked={!!value.isDocumentRequired}
          onClick={() => onChange({ isDocumentRequired: !value.isDocumentRequired })}
          className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-left cursor-pointer transition-colors ${
            value.isDocumentRequired
              ? 'bg-indigo-50/60 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-600'
              : 'border-slate-200 bg-white hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600'
          }`}
        >
          <span
            className={`w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center shrink-0 ${
              value.isDocumentRequired ? 'bg-primary border-primary' : 'bg-white border-slate-300 dark:bg-slate-800 dark:border-slate-600'
            }`}
          >
            {value.isDocumentRequired && <Check className="w-3 h-3 text-white stroke-[3]" />}
          </span>
          <span className="flex flex-col">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">บังคับแนบหลักฐานตอนยื่นเบิก</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">เช่น ใบเสร็จ ใบรับรองแพทย์</span>
          </span>
        </button>
      )}
    </>
  );
}

export default BenefitPolicyFields;

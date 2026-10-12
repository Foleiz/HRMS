'use client';

import React from 'react';

/**
 * ช่องกรอกค่าตัวแปรของสูตรมาตรฐาน (แทนการพิมพ์ข้อความสูตรเอง)
 * ค่าที่กรอกจะถูกแปลงเป็นข้อความ formulaValue รูปแบบเดิมที่ backend อ่านได้ เช่น
 *   เบี้ยขยัน:      "1,000 บาท (ขาด=0, สาย<=1 ครั้ง, ลา<=0 วัน)"
 *   หักสาย/ขาด:    "หักตามอัตราค่าจ้าง" หรือ "สายนาทีละ 2 บาท"
 *   % เงินเดือน:   "5% ของฐานเงินเดือน"
 *   ค่าคอมมิชชั่น: "3% ของยอดขาย"
 */

export type LateMode = 'RATE' | 'PER_MINUTE';

export interface FormulaParams {
  amount: string;
  lateLimit: string;
  leaveLimit: string;
  percent: string;
  lateMode: LateMode;
  perMinute: string;
}

/** สูตรที่มีช่องกรอกค่า */
export const PARAM_TEMPLATES = ['DILIGENT_ALLOWANCE', 'LATE_ABSENT', 'PERCENT_SALARY', 'PERCENT_SALES'];

const num = (text: string | null | undefined, re: RegExp): string => {
  const m = (text || '').match(re);
  return m ? m[1].replace(/,/g, '') : '';
};

const fmt = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : v;
};

export const parseFormulaParams = (template: string, value: string | null | undefined): FormulaParams => {
  const v = value || '';
  return {
    amount: template === 'DILIGENT_ALLOWANCE' ? num(v, /(\d[\d,]*(?:\.\d+)?)/) : '',
    lateLimit: num(v, /สาย\s*<=?\s*(\d+)/) || '1',
    leaveLimit: num(v, /ลา\s*<=?\s*(\d+(?:\.\d+)?)/) || '0',
    percent: num(v, /(\d+(?:\.\d+)?)\s*%/),
    lateMode: /นาทีละ/.test(v) ? 'PER_MINUTE' : 'RATE',
    perMinute: num(v, /นาทีละ\s*(\d[\d,]*(?:\.\d+)?)/),
  };
};

export const serializeFormulaParams = (template: string, p: FormulaParams): string => {
  switch (template) {
    case 'DILIGENT_ALLOWANCE':
      return `${fmt(p.amount || '0')} บาท (ขาด=0, สาย<=${p.lateLimit || '0'} ครั้ง, ลา<=${p.leaveLimit || '0'} วัน)`;
    case 'LATE_ABSENT':
      return p.lateMode === 'PER_MINUTE'
        ? `สายนาทีละ ${fmt(p.perMinute || '0')} บาท, ขาดงานหักวันละ เงินเดือน/30`
        : 'หักตามอัตราค่าจ้าง (สาย: เงินเดือน/30/8 ต่อชม., ขาดงาน: เงินเดือน/30 ต่อวัน)';
    case 'PERCENT_SALARY':
      return `${p.percent || '0'}% ของฐานเงินเดือน`;
    case 'PERCENT_SALES':
      return `${p.percent || '0'}% ของยอดขาย`;
    default:
      return '';
  }
};

/** ตรวจค่าก่อนบันทึก — คืนข้อความ error หรือ null */
export const validateFormulaParams = (template: string, p: FormulaParams): string | null => {
  const pos = (v: string) => v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0;
  switch (template) {
    case 'DILIGENT_ALLOWANCE':
      if (!pos(p.amount) || Number(p.amount) <= 0) return 'กรุณาระบุจำนวนเงินเบี้ยขยัน';
      if (!pos(p.lateLimit) || !pos(p.leaveLimit)) return 'กรุณาระบุเงื่อนไขมาสาย/วันลาเป็นตัวเลข';
      return null;
    case 'LATE_ABSENT':
      if (p.lateMode === 'PER_MINUTE' && (!pos(p.perMinute) || Number(p.perMinute) <= 0)) return 'กรุณาระบุจำนวนเงินที่หักต่อนาที';
      return null;
    case 'PERCENT_SALARY':
    case 'PERCENT_SALES':
      if (!pos(p.percent) || Number(p.percent) <= 0 || Number(p.percent) > 100) return 'กรุณาระบุเปอร์เซ็นต์ระหว่าง 0–100';
      return null;
    default:
      return null;
  }
};

const inputCls =
  'w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2046] text-slate-900 dark:text-slate-100 font-semibold';

const Field: React.FC<{ label: string; suffix?: string; children: React.ReactNode }> = ({ label, suffix, children }) => (
  <label className="block">
    <span className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</span>
    <div className="flex items-center gap-1.5">
      {children}
      {suffix && <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">{suffix}</span>}
    </div>
  </label>
);

interface Props {
  template: string;
  params: FormulaParams;
  onChange: (p: FormulaParams) => void;
}

export const FormulaParamsEditor: React.FC<Props> = ({ template, params, onChange }) => {
  const set = (patch: Partial<FormulaParams>) => onChange({ ...params, ...patch });
  const numberInput = (key: keyof FormulaParams, placeholder: string, step = '1') => (
    <input
      type="number"
      min="0"
      step={step}
      inputMode="decimal"
      placeholder={placeholder}
      value={params[key] as string}
      onChange={(e) => set({ [key]: e.target.value } as Partial<FormulaParams>)}
      className={inputCls}
    />
  );

  let fields: React.ReactNode = null;
  let preview = '';

  switch (template) {
    case 'DILIGENT_ALLOWANCE':
      fields = (
        <div className="grid grid-cols-3 gap-2">
          <Field label="จำนวนเงิน" suffix="บาท">{numberInput('amount', '1000', '0.01')}</Field>
          <Field label="มาสายได้ไม่เกิน" suffix="ครั้ง">{numberInput('lateLimit', '1')}</Field>
          <Field label="ลาได้ไม่เกิน" suffix="วัน">{numberInput('leaveLimit', '0', '0.5')}</Field>
        </div>
      );
      preview = `ได้ ${fmt(params.amount || '0')} บาท เมื่อไม่ขาดงาน, มาสายไม่เกิน ${params.lateLimit || 0} ครั้ง และลาไม่เกิน ${params.leaveLimit || 0} วันในเดือนนั้น`;
      break;
    case 'LATE_ABSENT':
      fields = (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {([
              ['RATE', 'ตามอัตราค่าจ้าง'],
              ['PER_MINUTE', 'กำหนดบาทต่อนาที'],
            ] as [LateMode, string][]).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => set({ lateMode: mode })}
                className={`py-2 text-xs rounded-lg border cursor-pointer ${
                  params.lateMode === mode
                    ? 'bg-[#0B2046] text-white border-[#0B2046]'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {params.lateMode === 'PER_MINUTE' && (
            <Field label="หักมาสาย นาทีละ" suffix="บาท">{numberInput('perMinute', '2', '0.01')}</Field>
          )}
        </div>
      );
      preview =
        params.lateMode === 'PER_MINUTE'
          ? `สาย 30 นาที หัก ${fmt(String(30 * Number(params.perMinute || 0)))} บาท • ขาดงานหักวันละ เงินเดือน ÷ 30`
          : 'สายหักชั่วโมงละ เงินเดือน ÷ 30 ÷ 8 • ขาดงานหักวันละ เงินเดือน ÷ 30 (เช่น เงินเดือน 30,000 สาย 1 ชม. หัก 125 บาท)';
      break;
    case 'PERCENT_SALARY':
      fields = <Field label="อัตรา" suffix="% ของฐานเงินเดือน">{numberInput('percent', '5', '0.01')}</Field>;
      preview = `เงินเดือน 30,000 บาท → ${fmt(String((30000 * Number(params.percent || 0)) / 100))} บาท ต่อเดือน`;
      break;
    case 'PERCENT_SALES':
      fields = <Field label="อัตราค่าคอมเริ่มต้น" suffix="% ของยอดขาย">{numberInput('percent', '3', '0.01')}</Field>;
      preview = `กรอกยอดขายรายคนในหน้ารายละเอียดเงินเดือน เช่น ยอดขาย 100,000 → ${fmt(String((100000 * Number(params.percent || 0)) / 100))} บาท (แก้ % รายคนได้)`;
      break;
    default:
      return null;
  }

  return (
    <div className="space-y-2">
      {fields}
      <p className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg px-2.5 py-1.5">
        {preview}
      </p>
    </div>
  );
};

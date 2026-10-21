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
  /** เบี้ยขยันขั้นบันได: ยอดเดือนที่ 1, 2, 3, ... (ขั้นสุดท้ายใช้ต่อไปเรื่อยๆ) */
  tiers: string[];
  lateLimit: string;
  leaveLimit: string;
  percent: string;
  lateMode: LateMode;
  perMinute: string;
  /** ค่าล่วงเวลา */
  otMultiplier: string;
  /** ตัวหารวันต่อเดือน (OT / หักลาไม่รับค่าจ้าง) */
  daysPerMonth: string;
  hoursPerDay: string;
  /** ประกันสังคม (บันทึกลงตั้งค่าในแท็บภาษี & ประกันสังคม) */
  ssoPercent: string;
  ssoMin: string;
  ssoMax: string;
  /** ภาษี */
  taxExpensePercent: string;
  taxExpenseCap: string;
  taxPersonal: string;
}

/** สูตรที่มีช่องกรอกค่า */
export const PARAM_TEMPLATES = [
  'DILIGENT_ALLOWANCE',
  'LATE_ABSENT',
  'PERCENT_SALARY',
  'PERCENT_SALES',
  'TAX_STANDARD',
  'OVERTIME',
  'UNPAID_LEAVE',
];

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
  const tierText = v.match(/ขั้นบันได\s*([\d,.\s>]+?)\s*บาท/);
  const firstAmount = template === 'DILIGENT_ALLOWANCE' ? num(v, /(\d[\d,]*(?:\.\d+)?)/) : '';
  return {
    amount: firstAmount,
    tiers: tierText
      ? tierText[1].split('>').map((t) => t.trim().replace(/,/g, '')).filter(Boolean)
      : [firstAmount || ''],
    otMultiplier: num(v, /(\d+(?:\.\d+)?)\s*เท่า/) || '1.5',
    daysPerMonth: num(v, /(\d+(?:\.\d+)?)\s*วัน(?!ละ)/) || '30',
    hoursPerDay: num(v, /(\d+(?:\.\d+)?)\s*ชม/) || '8',
    ssoPercent: num(v, /(\d+(?:\.\d+)?)\s*%/) || '5',
    ssoMin: num(v, /(\d[\d,]*)\s*[–-]/) || '1650',
    ssoMax: num(v, /[–-]\s*(\d[\d,]*)/) || '17500',
    taxExpensePercent: num(v, /ค่าใช้จ่าย\s*(\d+(?:\.\d+)?)\s*%/) || '50',
    taxExpenseCap: num(v, /ไม่เกิน\s*(\d[\d,]*)/) || '100000',
    taxPersonal: num(v, /ลดหย่อนส่วนตัว\s*(\d[\d,]*)/) || '60000',
    lateLimit: num(v, /สาย\s*<=?\s*(\d+)/) || '1',
    leaveLimit: num(v, /ลา\s*<=?\s*(\d+(?:\.\d+)?)/) || '0',
    percent: num(v, /(\d+(?:\.\d+)?)\s*%/),
    lateMode: /นาทีละ/.test(v) ? 'PER_MINUTE' : 'RATE',
    perMinute: num(v, /นาทีละ\s*(\d[\d,]*(?:\.\d+)?)/),
  };
};

export const serializeFormulaParams = (template: string, p: FormulaParams): string => {
  switch (template) {
    case 'DILIGENT_ALLOWANCE': {
      const tiers = p.tiers.filter((t) => t !== '');
      const cond = `(ขาด=0, สาย<=${p.lateLimit || '0'} ครั้ง, ลา<=${p.leaveLimit || '0'} วัน)`;
      return tiers.length > 1
        ? `ขั้นบันได ${tiers.map(fmt).join(' > ')} บาท ${cond}`
        : `${fmt(tiers[0] || p.amount || '0')} บาท ${cond}`;
    }
    case 'OVERTIME':
      return `${p.otMultiplier || '1.5'} เท่าของค่าจ้างต่อชั่วโมง (เงินเดือน ÷ ${p.daysPerMonth || '30'} วัน ÷ ${p.hoursPerDay || '8'} ชม.)`;
    case 'UNPAID_LEAVE':
      return `หักวันละ เงินเดือน ÷ ${p.daysPerMonth || '30'} วัน`;
    case 'SSO_STANDARD': {
      const max = (Number(p.ssoMax || 0) * Number(p.ssoPercent || 0)) / 100;
      return `${p.ssoPercent || '0'}% ฐานค่าจ้าง ${fmt(p.ssoMin || '0')} - ${fmt(p.ssoMax || '0')} บาท (หักสูงสุด ${fmt(String(max))} บาท/เดือน)`;
    }
    case 'TAX_STANDARD':
      return `ภ.ง.ด.1 ขั้นบันได (ค่าใช้จ่าย ${p.taxExpensePercent || '0'}% ไม่เกิน ${fmt(p.taxExpenseCap || '0')} บาท, ลดหย่อนส่วนตัว ${fmt(p.taxPersonal || '0')} บาท)`;
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
      if (p.tiers.length === 0 || p.tiers.some((t) => !pos(t) || Number(t) <= 0)) return 'กรุณาระบุจำนวนเงินเบี้ยขยันให้ครบทุกขั้น';
      if (!pos(p.lateLimit) || !pos(p.leaveLimit)) return 'กรุณาระบุเงื่อนไขมาสาย/วันลาเป็นตัวเลข';
      return null;
    case 'LATE_ABSENT':
      if (p.lateMode === 'PER_MINUTE' && (!pos(p.perMinute) || Number(p.perMinute) <= 0)) return 'กรุณาระบุจำนวนเงินที่หักต่อนาที';
      return null;
    case 'PERCENT_SALARY':
    case 'PERCENT_SALES':
      if (!pos(p.percent) || Number(p.percent) <= 0 || Number(p.percent) > 100) return 'กรุณาระบุเปอร์เซ็นต์ระหว่าง 0–100';
      return null;
    case 'OVERTIME':
      if (!pos(p.otMultiplier) || Number(p.otMultiplier) <= 0) return 'กรุณาระบุตัวคูณค่าล่วงเวลา';
      if (!pos(p.daysPerMonth) || Number(p.daysPerMonth) <= 0 || !pos(p.hoursPerDay) || Number(p.hoursPerDay) <= 0)
        return 'กรุณาระบุจำนวนวันและชั่วโมงทำงานมากกว่า 0';
      return null;
    case 'UNPAID_LEAVE':
      if (!pos(p.daysPerMonth) || Number(p.daysPerMonth) <= 0) return 'กรุณาระบุจำนวนวันที่ใช้หาร';
      return null;
    case 'SSO_STANDARD':
      if (!pos(p.ssoPercent) || Number(p.ssoPercent) <= 0 || Number(p.ssoPercent) > 100) return 'กรุณาระบุอัตราสมทบระหว่าง 0–100';
      if (!pos(p.ssoMin) || !pos(p.ssoMax) || Number(p.ssoMax) <= Number(p.ssoMin)) return 'ฐานค่าจ้างสูงสุดต้องมากกว่าฐานต่ำสุด';
      return null;
    case 'TAX_STANDARD':
      if (!pos(p.taxExpensePercent) || Number(p.taxExpensePercent) > 100) return 'กรุณาระบุ % ค่าใช้จ่ายระหว่าง 0–100';
      if (!pos(p.taxExpenseCap) || !pos(p.taxPersonal)) return 'กรุณาระบุเพดานค่าใช้จ่ายและค่าลดหย่อนเป็นตัวเลข';
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
    case 'DILIGENT_ALLOWANCE': {
      const tiers = params.tiers.length > 0 ? params.tiers : [''];
      const setTier = (i: number, v: string) => set({ tiers: tiers.map((t, idx) => (idx === i ? v : t)) });
      fields = (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <span className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
              จำนวนเงินตามเดือนที่ได้ต่อเนื่อง (ขั้นบันได)
            </span>
            {tiers.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-28 shrink-0 text-[11px] text-slate-600 dark:text-slate-400">
                  {tiers.length === 1 ? 'ทุกเดือน' : i === tiers.length - 1 ? `เดือนที่ ${i + 1} ขึ้นไป` : `เดือนที่ ${i + 1}`}
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="500"
                  value={t}
                  onChange={(e) => setTier(i, e.target.value)}
                  className={inputCls}
                />
                <span className="text-[11px] text-slate-500 shrink-0">บาท</span>
                {tiers.length > 1 && (
                  <button
                    type="button"
                    title="ลบขั้นนี้"
                    onClick={() => set({ tiers: tiers.filter((_, idx) => idx !== i) })}
                    className="px-2 py-1 text-[11px] text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                  >
                    ลบ
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => set({ tiers: [...tiers, ''] })}
              className="text-[11px] font-semibold text-[#0B2046] dark:text-blue-300 hover:underline cursor-pointer"
            >
              + เพิ่มขั้น
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="มาสายได้ไม่เกิน" suffix="ครั้ง">{numberInput('lateLimit', '1')}</Field>
            <Field label="ลาได้ไม่เกิน" suffix="วัน">{numberInput('leaveLimit', '0', '0.5')}</Field>
          </div>
        </div>
      );
      const filled = tiers.filter((t) => t !== '');
      preview =
        filled.length > 1
          ? `ได้ต่อเนื่องเดือนที่ 1 = ${fmt(filled[0])} บาท${filled
              .slice(1)
              .map((t, i) => `, เดือนที่ ${i + 2}${i + 2 === filled.length ? ' ขึ้นไป' : ''} = ${fmt(t)} บาท`)
              .join('')} — เดือนไหนไม่ผ่านเงื่อนไข (ขาดงาน / สายเกิน ${params.lateLimit || 0} ครั้ง / ลาเกิน ${params.leaveLimit || 0} วัน) เริ่มนับขั้นที่ 1 ใหม่`
          : `ได้ ${fmt(filled[0] || '0')} บาท เมื่อไม่ขาดงาน, มาสายไม่เกิน ${params.lateLimit || 0} ครั้ง และลาไม่เกิน ${params.leaveLimit || 0} วันในเดือนนั้น`;
      break;
    }
    case 'OVERTIME':
      fields = (
        <div className="grid grid-cols-3 gap-2">
          <Field label="ตัวคูณ" suffix="เท่า">{numberInput('otMultiplier', '1.5', '0.1')}</Field>
          <Field label="หารวันต่อเดือน" suffix="วัน">{numberInput('daysPerMonth', '30')}</Field>
          <Field label="ชั่วโมงต่อวัน" suffix="ชม.">{numberInput('hoursPerDay', '8', '0.5')}</Field>
        </div>
      );
      preview = `ชม. OT จากระบบลงเวลา × (เงินเดือน ÷ ${params.daysPerMonth || 30} ÷ ${params.hoursPerDay || 8}) × ${params.otMultiplier || 1.5} — เช่น เงินเดือน 30,000 ได้ ${fmt(
        String(Math.round((30000 / Number(params.daysPerMonth || 30) / Number(params.hoursPerDay || 8)) * Number(params.otMultiplier || 1.5) * 100) / 100),
      )} บาท/ชม.`;
      break;
    case 'UNPAID_LEAVE':
      fields = <Field label="หักวันละ เงินเดือน ÷" suffix="วัน">{numberInput('daysPerMonth', '30')}</Field>;
      preview = `ใช้วันลาไม่รับค่าจ้างที่อนุมัติแล้ว × (เงินเดือน ÷ ${params.daysPerMonth || 30}) — เช่น เงินเดือน 30,000 ลา 1 วัน หัก ${fmt(
        String(Math.round((30000 / Number(params.daysPerMonth || 30)) * 100) / 100),
      )} บาท`;
      break;
    case 'SSO_STANDARD': {
      const max = (Number(params.ssoMax || 0) * Number(params.ssoPercent || 0)) / 100;
      fields = (
        <div className="grid grid-cols-3 gap-2">
          <Field label="อัตราสมทบ" suffix="%">{numberInput('ssoPercent', '5', '0.01')}</Field>
          <Field label="ฐานค่าจ้างต่ำสุด" suffix="บาท">{numberInput('ssoMin', '1650')}</Field>
          <Field label="ฐานค่าจ้างสูงสุด" suffix="บาท">{numberInput('ssoMax', '17500')}</Field>
        </div>
      );
      preview = `หัก ${params.ssoPercent || 0}% ของค่าจ้าง (ค่าจ้างต่ำกว่า ${fmt(params.ssoMin || '0')} ใช้ ${fmt(params.ssoMin || '0')}, เกิน ${fmt(params.ssoMax || '0')} ใช้ ${fmt(params.ssoMax || '0')}) — หักสูงสุด ${fmt(String(max))} บาท/เดือน • ค่านี้ใช้ร่วมกับแท็บภาษี & ประกันสังคม`;
      break;
    }
    case 'TAX_STANDARD':
      fields = (
        <div className="grid grid-cols-3 gap-2">
          <Field label="หักค่าใช้จ่าย" suffix="%">{numberInput('taxExpensePercent', '50', '0.01')}</Field>
          <Field label="ค่าใช้จ่ายไม่เกิน" suffix="บาท">{numberInput('taxExpenseCap', '100000')}</Field>
          <Field label="ลดหย่อนส่วนตัว" suffix="บาท">{numberInput('taxPersonal', '60000')}</Field>
        </div>
      );
      preview = `เงินได้ทั้งปี − ค่าใช้จ่าย ${params.taxExpensePercent || 0}% (ไม่เกิน ${fmt(params.taxExpenseCap || '0')}) − ลดหย่อนส่วนตัว ${fmt(params.taxPersonal || '0')} − ประกันสังคม − กองทุนสำรองเลี้ยงชีพ แล้วคิดอัตราขั้นบันได (แก้อัตราขั้นบันไดได้ที่แท็บภาษี & ประกันสังคม) แล้วหารเฉลี่ยรายเดือน`;
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

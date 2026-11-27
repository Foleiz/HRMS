import { TH_MONTHS } from '@/lib/thaiDate';
export const THAI_MONTH_NAMES = TH_MONTHS;

export interface PayrollScheduleSettings {
  startDayType: 'FIRST_DAY' | 'CUSTOM_DAY';
  startDay: number; // e.g. 1
  endDayType: 'LAST_DAY' | 'CUSTOM_DAY';
  endDay: number; // e.g. 31 or custom
  paymentDay: number; // e.g. 29
  adjustWeekend: boolean; // เลื่อนวันจ่ายเป็นวันศุกร์ก่อนหน้าหากตรงกับเสาร์-อาทิตย์
  claimCutoffType: 'SAME_AS_PAYMENT' | 'CUSTOM_DAY';
  claimCutoffDay: number; // e.g. 25
  defaultPaymentMethod: 'BANK_BATCH' | 'DIRECT_TRANSFER';
  note?: string;
}

export const DEFAULT_PAYROLL_SCHEDULE_SETTINGS: PayrollScheduleSettings = {
  startDayType: 'FIRST_DAY',
  startDay: 1,
  endDayType: 'LAST_DAY',
  endDay: 31,
  paymentDay: 29,
  adjustWeekend: true,
  claimCutoffType: 'CUSTOM_DAY',
  claimCutoffDay: 25,
  defaultPaymentMethod: 'BANK_BATCH',
  note: 'กำหนดรอบการคำนวณตั้งแต่วันที่ 1 ถึงสิ้นเดือน และจ่ายเงินเดือนทุกวันที่ 29 ของเดือน',
};

const STORAGE_KEY = 'hrms_payroll_schedule_settings';

export const getPayrollScheduleSettings = (): PayrollScheduleSettings => {
  if (typeof window === 'undefined') return DEFAULT_PAYROLL_SCHEDULE_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PAYROLL_SCHEDULE_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PAYROLL_SCHEDULE_SETTINGS, ...parsed };
  } catch (err) {
    console.error('Failed to parse payroll schedule settings from localStorage:', err);
    return DEFAULT_PAYROLL_SCHEDULE_SETTINGS;
  }
};

export const savePayrollScheduleSettings = (settings: PayrollScheduleSettings): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event('payroll_schedule_settings_updated'));
  } catch (err) {
    console.error('Failed to save payroll schedule settings to localStorage:', err);
  }
};

/**
 * คำนวณวันเริ่มคำนวณ วันสิ้นสุด วันจ่ายเงิน และวันตัดรอบสวัสดิการ
 * สำหรับเดือนและปีที่กำหนด โดยอิงจากกฎการตั้งค่าขององค์กร
 */
export const calculatePeriodDatesFromSettings = (
  year: number,
  month: number,
  settings: PayrollScheduleSettings = getPayrollScheduleSettings()
) => {
  const safeMonth = Math.min(Math.max(1, month || 1), 12);
  const safeYear = year || new Date().getFullYear();
  const thaiYear = safeYear + 543;
  const thaiMonthName = THAI_MONTH_NAMES[safeMonth - 1] || `เดือน ${safeMonth}`;

  // จำนวนวันในเดือนนั้น (เช่น 28, 29, 30, 31)
  const daysInMonth = new Date(safeYear, safeMonth, 0).getDate();

  // 1. วันเริ่มคำนวณ
  const startDay = settings.startDayType === 'FIRST_DAY' ? 1 : Math.min(Math.max(1, settings.startDay), daysInMonth);
  const startDateStr = `${safeYear}-${String(safeMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;

  // 2. วันสิ้นสุดคำนวณ
  const endDay = settings.endDayType === 'LAST_DAY' ? daysInMonth : Math.min(Math.max(1, settings.endDay), daysInMonth);
  const endDateStr = `${safeYear}-${String(safeMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

  // 3. วันกำหนดจ่ายเงิน
  let payDay = Math.min(Math.max(1, settings.paymentDay), daysInMonth);
  let payDateObj = new Date(safeYear, safeMonth - 1, payDay);

  if (settings.adjustWeekend) {
    const dayOfWeek = payDateObj.getDay(); // 0 = Sun, 6 = Sat
    if (dayOfWeek === 6) {
      // เสาร์ -> เลื่อนไปศุกร์ (-1 วัน)
      payDay = Math.max(1, payDay - 1);
      payDateObj = new Date(safeYear, safeMonth - 1, payDay);
    } else if (dayOfWeek === 0) {
      // อาทิตย์ -> เลื่อนไปศุกร์ (-2 วัน)
      payDay = Math.max(1, payDay - 2);
      payDateObj = new Date(safeYear, safeMonth - 1, payDay);
    }
  }
  const paymentDateStr = `${safeYear}-${String(safeMonth).padStart(2, '0')}-${String(payDay).padStart(2, '0')}`;

  // 4. วันตัดรอบเงินเบิกสวัสดิการ (ต้องไม่เกินวันกำหนดจ่ายเงิน แม้เลื่อนเสาร์-อาทิตย์เข้ามา)
  let claimCutoffStr = paymentDateStr;
  if (settings.claimCutoffType === 'CUSTOM_DAY') {
    const rawCutoffDay = Math.min(Math.max(1, settings.claimCutoffDay), daysInMonth);
    const cutoffDay = Math.min(rawCutoffDay, payDay);
    claimCutoffStr = `${safeYear}-${String(safeMonth).padStart(2, '0')}-${String(cutoffDay).padStart(2, '0')}`;
  }

  return {
    year: safeYear,
    month: safeMonth,
    periodName: `${thaiMonthName} ${thaiYear}`,
    thaiMonthName,
    thaiYear,
    startDate: startDateStr,
    endDate: endDateStr,
    paymentDate: paymentDateStr,
    claimCutoffDate: claimCutoffStr,
    daysInMonth,
  };
};

export interface GeneratedPeriodSlot {
  sequence: number;
  label: string;
  periodName: string;
  startDate: string;
  endDate: string;
  paymentDate: string;
  claimCutoffDate: string;
  payCycle: 'MONTHLY' | 'SEMI_MONTHLY' | 'WEEKLY';
}

const toIsoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const adjustForWeekendIfNeeded = (dateObj: Date, adjustWeekend: boolean): Date => {
  const copy = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  if (!adjustWeekend) return copy;
  const dow = copy.getDay();
  if (dow === 6) copy.setDate(copy.getDate() - 1);
  else if (dow === 0) copy.setDate(copy.getDate() - 2);
  return copy;
};

export const PAY_CYCLE_LABELS: Record<string, string> = {
  MONTHLY: 'รายเดือน',
  SEMI_MONTHLY: 'ทุกครึ่งเดือน (15 วัน)',
  WEEKLY: 'รายสัปดาห์',
};

export const WAGE_TYPE_LABELS: Record<string, string> = {
  MONTHLY: 'รายเดือน',
  DAILY: 'รายวัน',
  HOURLY: 'รายชั่วโมง',
  STIPEND: 'เบี้ยเลี้ยง',
};

/**
 * สร้างรายการงวดเงินเดือนที่เป็นไปได้ของเดือน/ปีที่เลือก ตามการตั้งค่าของแต่ละประเภทสัญญา
 */
export const generatePeriodSlotsForConfig = (
  year: number,
  month: number,
  config: {
    employeeTypeName?: string;
    payCycle: 'MONTHLY' | 'SEMI_MONTHLY' | 'WEEKLY';
    startDayType: 'FIRST_DAY' | 'CUSTOM_DAY';
    startDay: number;
    endDayType: 'LAST_DAY' | 'CUSTOM_DAY';
    endDay: number;
    paymentDay: number;
    semiMonthlyFirstCutoffDay: number;
    semiMonthlyFirstPayDay: number;
    semiMonthlySecondPayDay: number;
    weeklyStartDayOfWeek: number;
    weeklyPayOffsetDays: number;
    adjustWeekend: boolean;
    claimCutoffType: 'SAME_AS_PAYMENT' | 'CUSTOM_DAY';
    claimCutoffDay: number;
  }
): GeneratedPeriodSlot[] => {
  const safeYear = year || new Date().getFullYear();
  const safeMonth = Math.min(Math.max(1, month || 1), 12);
  const thaiYear = safeYear + 543;
  const thaiMonthName = THAI_MONTH_NAMES[safeMonth - 1] || `เดือน ${safeMonth}`;
  const daysInMonth = new Date(safeYear, safeMonth, 0).getDate();
  const typeSuffix = config.employeeTypeName ? ` — ${config.employeeTypeName}` : '';

  if (config.payCycle === 'SEMI_MONTHLY') {
    const cutoff1 = Math.min(Math.max(10, config.semiMonthlyFirstCutoffDay || 15), Math.min(20, daysInMonth - 1));
    const pay1Raw = new Date(safeYear, safeMonth - 1, Math.min(Math.max(1, config.semiMonthlyFirstPayDay || cutoff1), daysInMonth));
    const pay1 = adjustForWeekendIfNeeded(pay1Raw, config.adjustWeekend);

    const pay2Raw = new Date(safeYear, safeMonth - 1, Math.min(Math.max(cutoff1 + 1, config.semiMonthlySecondPayDay || daysInMonth), daysInMonth));
    const pay2 = adjustForWeekendIfNeeded(pay2Raw, config.adjustWeekend);

    return [
      {
        sequence: 1,
        label: `งวดที่ 1 (วันที่ 1 – ${cutoff1})`,
        periodName: `${thaiMonthName} ${thaiYear}${typeSuffix} งวดที่ 1`,
        startDate: toIsoDate(new Date(safeYear, safeMonth - 1, 1)),
        endDate: toIsoDate(new Date(safeYear, safeMonth - 1, cutoff1)),
        paymentDate: toIsoDate(pay1),
        claimCutoffDate: toIsoDate(pay1),
        payCycle: 'SEMI_MONTHLY',
      },
      {
        sequence: 2,
        label: `งวดที่ 2 (วันที่ ${cutoff1 + 1} – ${daysInMonth})`,
        periodName: `${thaiMonthName} ${thaiYear}${typeSuffix} งวดที่ 2`,
        startDate: toIsoDate(new Date(safeYear, safeMonth - 1, cutoff1 + 1)),
        endDate: toIsoDate(new Date(safeYear, safeMonth - 1, daysInMonth)),
        paymentDate: toIsoDate(pay2),
        claimCutoffDate: toIsoDate(pay2),
        payCycle: 'SEMI_MONTHLY',
      },
    ];
  }

  if (config.payCycle === 'WEEKLY') {
    const slots: GeneratedPeriodSlot[] = [];
    const offset = Math.max(0, config.weeklyPayOffsetDays ?? 3);
    let seq = 1;
    let cursor = 1;
    while (cursor <= daysInMonth) {
      const startObj = new Date(safeYear, safeMonth - 1, cursor);
      const endDay = Math.min(cursor + 6, daysInMonth);
      const endObj = new Date(safeYear, safeMonth - 1, endDay);
      const payRaw = new Date(endObj.getFullYear(), endObj.getMonth(), endObj.getDate() + offset);
      const payObj = adjustForWeekendIfNeeded(payRaw, config.adjustWeekend);
      slots.push({
        sequence: seq,
        label: `สัปดาห์ที่ ${seq} (วันที่ ${cursor} – ${endDay})`,
        periodName: `${thaiMonthName} ${thaiYear}${typeSuffix} สัปดาห์ที่ ${seq}`,
        startDate: toIsoDate(startObj),
        endDate: toIsoDate(endObj),
        paymentDate: toIsoDate(payObj),
        claimCutoffDate: toIsoDate(payObj),
        payCycle: 'WEEKLY',
      });
      cursor = endDay + 1;
      seq += 1;
    }
    return slots;
  }

  // MONTHLY (ค่าเริ่มต้น)
  const startDay = config.startDayType === 'FIRST_DAY' ? 1 : Math.min(Math.max(1, config.startDay), daysInMonth);
  const endDay = config.endDayType === 'LAST_DAY' ? daysInMonth : Math.min(Math.max(1, config.endDay), daysInMonth);
  const payRaw = new Date(safeYear, safeMonth - 1, Math.min(Math.max(1, config.paymentDay), daysInMonth));
  const payObj = adjustForWeekendIfNeeded(payRaw, config.adjustWeekend);
  const payStr = toIsoDate(payObj);

  let cutoffStr = payStr;
  if (config.claimCutoffType === 'CUSTOM_DAY') {
    const rawCut = Math.min(Math.max(1, config.claimCutoffDay), daysInMonth);
    const cutDay = Math.min(rawCut, payObj.getDate());
    cutoffStr = toIsoDate(new Date(safeYear, safeMonth - 1, cutDay));
  }

  return [
    {
      sequence: 1,
      label: `รายเดือน (วันที่ ${startDay} – ${endDay})`,
      periodName: `${thaiMonthName} ${thaiYear}${typeSuffix}`,
      startDate: toIsoDate(new Date(safeYear, safeMonth - 1, startDay)),
      endDate: toIsoDate(new Date(safeYear, safeMonth - 1, endDay)),
      paymentDate: payStr,
      claimCutoffDate: cutoffStr,
      payCycle: 'MONTHLY',
    },
  ];
};

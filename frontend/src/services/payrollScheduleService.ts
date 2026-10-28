export const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export interface PayrollScheduleSettings {
  startDayType: 'FIRST_DAY' | 'CUSTOM_DAY';
  startDay: number; // e.g. 1
  endDayType: 'LAST_DAY' | 'CUSTOM_DAY';
  endDay: number; // e.g. 31 or custom
  paymentDay: number; // e.g. 29
  adjustWeekend: boolean; // เลื่อนวันจ่ายเป็นวันศุกร์ก่อนหน้าหากตรงกับเสาร์-อาทิตย์
  claimCutoffType: 'SAME_AS_PAYMENT' | 'CUSTOM_DAY';
  claimCutoffDay: number; // e.g. 25
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

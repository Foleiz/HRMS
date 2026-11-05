/**
 * วันที่ภาษาไทย / พ.ศ. ที่ใช้ร่วมกันทั้งระบบ
 *
 *   formatThaiDate('2026-12-01')             → "1 ธ.ค. 2569"
 *   formatThaiDate('2026-12-01', 'long')     → "1 ธันวาคม 2569"
 *   formatThaiDate('2026-12-01', 'numeric')  → "01/12/2569"
 */

export const TH_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export const TH_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

export type ThaiDateStyle = 'short' | 'long' | 'numeric';
export type DateInput = string | Date | null | undefined;

/** แปลงเป็น Date ตามเวลาท้องถิ่น — "YYYY-MM-DD" (และ datetime ที่ไม่มี timezone) ไม่ถูกเลื่อนวันจาก UTC */
export function parseDate(value: DateInput): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:$|T(?!.*(?:[Zz]|[+-]\d{2}:?\d{2})$))/.exec(value);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** ปี พ.ศ. */
export const toBuddhistYear = (year: number) => year + 543;

/** วันที่แบบไทย (พ.ศ.) — ค่าว่างได้ "-", ค่าที่อ่านไม่ได้คืนค่าเดิม */
export function formatThaiDate(value: DateInput, style: ThaiDateStyle = 'short'): string {
  if (!value) return '-';
  const d = parseDate(value);
  if (!d) return typeof value === 'string' ? value : '-';
  const day = d.getDate();
  const month = d.getMonth();
  const year = toBuddhistYear(d.getFullYear());
  if (style === 'numeric') return `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
  return `${day} ${(style === 'long' ? TH_MONTHS : TH_MONTHS_SHORT)[month]} ${year}`;
}

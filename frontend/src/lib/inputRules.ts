/**
 * กติกาการกรอกข้อมูลตามรูปแบบจริงของไทย — ใช้ร่วมกันทุกฟอร์ม
 * - เลขบัตรประชาชน 13 หลัก + ตรวจหลักสุดท้าย (check digit)
 * - เบอร์โทร: มือถือ 10 หลัก (06/08/09), บ้าน/สำนักงาน 9 หลัก (02–05, 07)
 * - รหัสไปรษณีย์ 5 หลัก ขึ้นต้นด้วย 1–9
 */

/** เหลือเฉพาะตัวเลข (ตัดตามจำนวนหลักสูงสุด) */
export const onlyDigits = (value: string, max?: number): string => {
  const d = (value || '').replace(/\D/g, '');
  return max ? d.slice(0, max) : d;
};

/** ตัดตัวเลขออกจากชื่อ/นามสกุล */
export const stripDigits = (value: string): string => (value || '').replace(/[0-9๐-๙]/g, '');

/** ตรวจเลขบัตรประชาชน 13 หลักตามสูตร check digit ของกรมการปกครอง */
export function isValidThaiCitizenId(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 13 || d[0] === '0') return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(d[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === Number(d[12]);
}

/** ข้อความผิดพลาดของเลขบัตรประชาชน (null = ถูกต้องหรือเว้นว่างได้) */
export function citizenIdError(value: string | undefined, required = false): string | null {
  const d = onlyDigits(value || '');
  if (!d) return required ? 'กรุณากรอกเลขบัตรประชาชน' : null;
  if (d.length !== 13) return 'เลขบัตรประชาชนต้องมี 13 หลัก';
  if (!isValidThaiCitizenId(d)) return 'เลขบัตรประชาชนไม่ถูกต้อง (ตรวจหลักสุดท้ายไม่ผ่าน)';
  return null;
}

const isBangkokLandline = (d: string) => d.startsWith('02');
const isMobile = (d: string) => /^0[689]/.test(d);

/** จัดรูปแบบเบอร์โทรขณะพิมพ์: มือถือ 0XX-XXX-XXXX, กรุงเทพฯ 02-XXX-XXXX, ต่างจังหวัด 0XX-XXX-XXX */
export function formatThaiPhone(value: string): string {
  let d = onlyDigits(value);
  if (d && d[0] !== '0') d = '0' + d;
  d = d.slice(0, isMobile(d) || d.length < 2 ? 10 : 9);
  if (isBangkokLandline(d)) {
    if (d.length > 5) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
    if (d.length > 2) return `${d.slice(0, 2)}-${d.slice(2)}`;
    return d;
  }
  if (d.length > 6) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return d;
}

/** ข้อความผิดพลาดของเบอร์โทร (null = ถูกต้องหรือเว้นว่างได้) */
export function phoneError(value: string | undefined, required = false, label = 'เบอร์โทรศัพท์'): string | null {
  const d = onlyDigits(value || '');
  if (!d) return required ? `กรุณากรอก${label}` : null;
  if (d[0] !== '0') return `${label}ต้องขึ้นต้นด้วย 0`;
  if (isMobile(d)) return d.length === 10 ? null : `${label}มือถือต้องมี 10 หลัก`;
  if (/^0[2-57]/.test(d)) return d.length === 9 ? null : `${label}บ้าน/สำนักงานต้องมี 9 หลัก`;
  return `${label}ไม่ถูกต้อง`;
}

/** ข้อความผิดพลาดของรหัสไปรษณีย์ */
export function postalCodeError(value: string | undefined, required = false): string | null {
  const d = onlyDigits(value || '');
  if (!d) return required ? 'กรุณากรอกรหัสไปรษณีย์' : null;
  if (d.length !== 5) return 'รหัสไปรษณีย์ต้องมี 5 หลัก';
  if (d[0] === '0') return 'รหัสไปรษณีย์ไม่ถูกต้อง';
  return null;
}

/** ข้อความผิดพลาดของอีเมล */
export function emailError(value: string | undefined, required = false): string | null {
  const v = (value || '').trim();
  if (!v) return required ? 'กรุณากรอกอีเมล' : null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? null : 'รูปแบบอีเมลไม่ถูกต้อง';
}

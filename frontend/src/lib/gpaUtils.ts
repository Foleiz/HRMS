/**
 * Utility functions สำหรับจำกัดและจัดรูปแบบการกรอกเกรดเฉลี่ยสะสม (GPA) ตามความเป็นจริง
 * - อยู่ระหว่าง 0.00 - 4.00
 * - ทศนิยมไม่เกิน 2 ตำแหน่ง
 * - ป้องกันการกรอกตัวเลขติดลบ สัญลักษณ์ และตัวเลขที่เกินค่าสูงสุด
 */

export const formatGpaInput = (raw: string): string => {
  if (!raw) return '';

  // 1. ตัดอักขระที่ไม่ใช่ตัวเลขและจุดทศนิยมออก
  let clean = raw.replace(/[^\d.]/g, '');

  // 2. ถ้าเริ่มต้นด้วยจุด ให้เติม 0 ข้างหน้าอัตโนมัติ (เช่น .5 -> 0.5)
  if (clean.startsWith('.')) {
    clean = '0' + clean;
  }

  // 3. ป้องกันการมีจุดมากกว่า 1 ตัว
  const parts = clean.split('.');
  if (parts.length > 2) {
    clean = parts[0] + '.' + parts.slice(1).join('');
  }

  // 4. กรณีไม่มีจุดทศนิยม
  if (!clean.includes('.')) {
    // ถ้ากรอกตัวเลขตัวเดียว 0, 1, 2, 3, 4
    if (clean.length === 1) {
      const num = parseInt(clean, 10);
      if (num > 4) return '4.00';
      return clean;
    }
    // ถ้ากรอกตัวเลข 2-3 หลักโดยไม่ได้ใส่จุด เช่น 35 (หมายถึง 3.5), 385 (หมายถึง 3.85) หรือ 400 (4.00)
    const first = clean[0];
    const rest = clean.slice(1, 3);
    if (['0', '1', '2', '3'].includes(first)) {
      return `${first}.${rest}`;
    }
    if (first === '4') {
      if (rest === '0') return '4.0';
      return '4.00';
    }
    return '4.00';
  }

  // 5. กรณีมีจุดทศนิยม
  const [intPart, ...decParts] = clean.split('.');
  const decPart = decParts.join('').slice(0, 2); // สูงสุด 2 ตำแหน่ง
  const intNum = parseInt(intPart || '0', 10);

  if (intNum > 4) {
    return '4.00';
  }

  if (intNum === 4) {
    // สำหรับ 4.xx ถ้ามีทศนิยมมากกว่า 0 ให้จำกัดที่ 4.00
    if (decPart && /[1-9]/.test(decPart)) {
      return '4.00';
    }
    return `4.${decPart}`;
  }

  return `${intPart}.${decPart}`;
};

/**
 * จัดรูปแบบ GPA เมื่อผู้ใช้ออกจากช่องกรอก (onBlur)
 * แปลงเป็นทศนิยม 2 ตำแหน่ง และจำกัดให้อยู่ระหว่าง 0.00 - 4.00
 */
export const clampGpa = (val?: number | string | null): string => {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num)) return '';
  const clamped = Math.min(Math.max(num, 0), 4);
  return clamped.toFixed(2);
};

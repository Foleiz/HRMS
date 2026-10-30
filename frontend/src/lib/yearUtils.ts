/**
 * yearUtils.ts — ศูนย์กลางการจัดการรายการปี พ.ศ. / ค.ศ. สำหรับตัวเลือก (Dropdowns) ทั้งระบบ HRMS
 * 
 * คุณสมบัติ:
 * 1. Future-proof: ไม่มีวันหมดอายุ เลื่อนตามปีปฏิทินจริงอัตโนมัติ 100%
 * 2. Forward-looking: รองรับปีล่วงหน้า (+1 ปี) สำหรับการวางแผนงบประมาณ/ปฏิทินวันหยุด
 * 3. History-safe: รองรับปีย้อนหลัง และรวมทุกปีที่มีประวัติจริงใน Database (ไม่ว่าเก่าแค่ไหนก็ไม่หาย)
 */

export interface SmartYearRangeOptions {
  /** จำนวนปีล่วงหน้าจากปีปัจจุบัน (ค่าเริ่มต้น: 1 ปี เช่น อยู่ 2569 จะมี 2570) */
  forwardYears?: number;
  /** จำนวนปีย้อนหลังจากปีปัจจุบัน (ค่าเริ่มต้น: 4 ปี) */
  backYears?: number;
  /** รายการปีที่มีข้อมูลจริงใน Database หรือประวัติ (number หรือ string เช่น จาก API) */
  historicalYears?: (number | string | null | undefined)[];
  /** ปีที่เลือกอยู่ปัจจุบัน (ป้องกันกรณีผู้ใช้เปิดดูข้อมูลเก่าแล้วปีไม่โผล่ใน Dropdown) */
  selectedYear?: number | string | null;
  /** ปีต่ำสุดที่เป็นไปได้ (เช่น ปีก่อตั้งบริษัท 2020) */
  minYear?: number;
}

export interface YearOption {
  value: number;
  label: string;
}

/**
 * คำนวณช่วงปี (ค.ศ.) แบบ Dynamic และรวมประวัติเก่าทั้งหมด เรียงจากใหม่ไปเก่า
 * @returns Array ของปี ค.ศ. เช่น [2027, 2026, 2025, 2024, 2023, 2022, ...]
 */
export function getSmartYearRange(options: SmartYearRangeOptions = {}): number[] {
  const {
    forwardYears = 1,
    backYears = 4,
    historicalYears = [],
    selectedYear,
    minYear = 2020,
  } = options;

  const currentYear = new Date().getFullYear();
  const yearSet = new Set<number>();

  // 1. เพิ่มปีล่วงหน้า (Forward) + ปีปัจจุบัน + ปีย้อนหลังพื้นฐาน (Back)
  for (let y = currentYear + forwardYears; y >= currentYear - backYears; y--) {
    if (y >= minYear) {
      yearSet.add(y);
    }
  }

  // 2. รวมปีที่มีข้อมูลจริงในประวัติ (Historical data from DB / API)
  if (Array.isArray(historicalYears)) {
    for (const h of historicalYears) {
      if (h == null) continue;
      const num = typeof h === 'number' ? h : parseInt(String(h), 10);
      if (!isNaN(num) && num > 0) {
        // หากส่งมาเป็น พ.ศ. (เช่น 2567 > 2400) ให้แปลงเป็น ค.ศ.
        const ceYear = num > 2400 ? num - 543 : num;
        if (ceYear >= 1990 && ceYear <= currentYear + 20) {
          yearSet.add(ceYear);
        }
      }
    }
  }

  // 3. รวมปีที่กำลังเลือกอยู่ปัจจุบัน (Selected Year) เพื่อความปลอดภัย
  if (selectedYear != null) {
    const num = typeof selectedYear === 'number' ? selectedYear : parseInt(String(selectedYear), 10);
    if (!isNaN(num) && num > 0) {
      const ceYear = num > 2400 ? num - 543 : num;
      if (ceYear >= 1990 && ceYear <= currentYear + 20) {
        yearSet.add(ceYear);
      }
    }
  }

  // เรียงจากปีล่าสุดลงไปหาปีเก่าสุด (Descending)
  return Array.from(yearSet).sort((a, b) => b - a);
}

/**
 * ดึงรายการตัวเลือกสำหรับ Dropdown แสดงผลเป็นปี พ.ศ. เช่น "พ.ศ. 2570", "พ.ศ. 2569"
 */
export function getSmartYearOptions(
  options: SmartYearRangeOptions = {},
  labelPrefix: string = 'พ.ศ. '
): YearOption[] {
  const years = getSmartYearRange(options);
  return years.map((y) => ({
    value: y,
    label: `${labelPrefix}${y + 543}`,
  }));
}

/**
 * แปลง ค.ศ. เป็น พ.ศ.
 */
export function toThaiYear(ceYear: number): number {
  return ceYear + 543;
}

/**
 * แปลง พ.ศ. เป็น ค.ศ.
 */
export function toCeYear(thaiYear: number): number {
  return thaiYear > 2400 ? thaiYear - 543 : thaiYear;
}

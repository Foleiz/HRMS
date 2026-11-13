import { parseDate } from '@/lib/thaiDate';
import type { DepartmentEmployeeRow, DepartmentEmployees } from '@/types/reports';

/** ดึงตัวอักษรย่อตัวแรกของชื่อจริง (ตัดคำนำหน้าไทยออก) */
export function extractNameInitial(name: string): string {
  const cleaned = name.trim().replace(/^(นางสาว|นาย|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.)\s*/, '');
  return (cleaned.charAt(0) || '?').toUpperCase();
}

/** ตรวจสอบว่าเริ่มงานในปี ค.ศ. ปัจจุบันหรือไม่ */
export function isHiredThisYear(startDate?: string | null, referenceYear = new Date().getFullYear()): boolean {
  const parsed = parseDate(startDate);
  return parsed !== null && parsed.getFullYear() === referenceYear;
}

/** สีป้ายประเภทพนักงาน (เรียงลำดับสม่ำเสมอระหว่างตารางและ Drawer) */
export function getEmployeeTypeBadgeClass(typeName: string): string {
  if (typeName.includes('ประจำ')) {
    return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
  }
  if (typeName.includes('สัญญาจ้าง')) {
    return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
  }
  if (typeName.includes('พาร์ทไทม์') || typeName.includes('ชั่วคราว')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
  }
  return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
}

/** สีป้ายเพศ */
export function getGenderBadgeClass(gender: string): string {
  if (gender === 'ชาย') {
    return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
  }
  if (gender === 'หญิง') {
    return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800';
  }
  return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
}

/** คำนวณสถานะเทียบกับอัตรากำลังตามแผน */
export function getHeadcountPlanBadge(employeeCount: number, headcountPlan?: number | null) {
  if (headcountPlan == null) return null;
  const under = employeeCount < headcountPlan;
  const over = employeeCount > headcountPlan;
  const badgeClass = under
    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
    : over
    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
  const suffix = under ? `ขาด ${headcountPlan - employeeCount}` : over ? `เกิน ${employeeCount - headcountPlan}` : 'ครบ';
  const title = under ? 'ยังรับคนไม่ครบตามแผน' : over ? 'คนเกินอัตรากำลังตามแผน' : 'ครบตามแผน';
  return { badgeClass, suffix, title };
}

/** ตรวจสอบว่าข้อมูลพนักงานตรงกับคำค้นหาหรือไม่ */
export function matchesEmployeeQuery(emp: DepartmentEmployeeRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    emp.employeeName.toLowerCase().includes(q) ||
    emp.employeeCode.toLowerCase().includes(q) ||
    emp.positionName.toLowerCase().includes(q) ||
    emp.employeeTypeName.toLowerCase().includes(q) ||
    emp.levelName.toLowerCase().includes(q)
  );
}

/** คำนวณข้อมูลแผนกใหม่หลังกรองด้วยคำค้นหา (ยังคงยอดตรงกับพนักงานที่ค้นพบ) */
export function filterDepartmentByQuery(dept: DepartmentEmployees, query: string, refYear = new Date().getFullYear()): DepartmentEmployees | null {
  const q = query.trim().toLowerCase();
  if (!q) return dept;

  const deptMatches =
    dept.departmentName.toLowerCase().includes(q) ||
    dept.departmentCode.toLowerCase().includes(q) ||
    dept.divisionName.toLowerCase().includes(q);

  if (deptMatches) return dept;

  const matchedEmployees = dept.employees.filter((e) => matchesEmployeeQuery(e, q));
  if (matchedEmployees.length === 0) return null;

  const typeMap = new Map<string, number>();
  let maleCount = 0;
  let femaleCount = 0;
  let otherGenderCount = 0;
  let newHiresThisYear = 0;

  matchedEmployees.forEach((e) => {
    if (e.gender === 'ชาย') maleCount += 1;
    else if (e.gender === 'หญิง') femaleCount += 1;
    else otherGenderCount += 1;

    if (isHiredThisYear(e.startDate, refYear)) newHiresThisYear += 1;
    const typeKey = e.employeeTypeName || 'ไม่ระบุ';
    typeMap.set(typeKey, (typeMap.get(typeKey) ?? 0) + 1);
  });

  return {
    ...dept,
    employees: matchedEmployees,
    employeeCount: matchedEmployees.length,
    maleCount,
    femaleCount,
    otherGenderCount,
    newHiresThisYear,
    byEmployeeType: Array.from(typeMap.entries()).map(([name, count]) => ({ name, count })),
  };
}

'use client';

import { useEffect, useState } from 'react';
import { employeeTypeService } from '@/services/employeeTypeService';

/** ค่าสำรองกรณีโหลดข้อมูลหลักประเภทพนักงานไม่ได้ (เช่น ไม่มีสิทธิ์เรียก API) */
const FALLBACK_TYPE_NAMES = [
  'พนักงานประจำ',
  'พนักงานทดลองงาน',
  'พนักงานสัญญาจ้าง',
  'พนักงานรายวัน',
  'พนักงานพาร์ทไทม์',
  'นักศึกษาฝึกงาน',
];

/**
 * รายชื่อประเภทพนักงานจากเมนู "ประเภทพนักงาน" (เฉพาะที่ใช้งานอยู่)
 * ส่ง extra เพื่อให้ค่าปัจจุบันของพนักงานยังแสดงอยู่แม้ประเภทนั้นถูกปิดใช้งานแล้ว
 */
export function useEmployeeTypeOptions(extra?: string): string[] {
  const [names, setNames] = useState<string[]>(FALLBACK_TYPE_NAMES);

  useEffect(() => {
    let cancelled = false;
    employeeTypeService
      .getAll({ status: 'ACTIVE' })
      .then((types) => {
        if (cancelled || !types?.length) return;
        setNames(types.map((t) => t.typeName));
      })
      .catch(() => {
        /* ใช้ค่าสำรอง */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (extra && extra.trim() && !names.includes(extra)) return [...names, extra];
  return names;
}

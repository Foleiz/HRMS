'use client';

import { useEffect, useState } from 'react';
import { masterDataService } from '@/services/masterDataService';
import { NATIONALITIES } from '@/constants/nationalities';

export interface LookupOption {
  id?: number;
  name: string;
}

export interface MasterLookups {
  nationalities: LookupOption[];
  religions: LookupOption[];
  maritalStatuses: LookupOption[];
}

/** ค่าสำรองกรณีโหลดข้อมูลหลักไม่ได้ */
const FALLBACK: MasterLookups = {
  nationalities: NATIONALITIES.map((n) => ({ name: n.name })),
  religions: ['พุทธ', 'คริสต์', 'อิสลาม', 'ฮินดู', 'ซิกข์', 'อื่นๆ'].map((name) => ({ name })),
  maritalStatuses: ['โสด', 'สมรส', 'หย่าร้าง', 'หม้าย'].map((name) => ({ name })),
};

let cache: Promise<MasterLookups> | null = null;

function loadLookups(): Promise<MasterLookups> {
  if (!cache) {
    cache = Promise.all([
      masterDataService.getNationalities().catch(() => []),
      masterDataService.getReligions().catch(() => []),
      masterDataService.getMaritalStatuses().catch(() => []),
    ]).then(([nat, rel, mar]) => ({
      nationalities: nat.length ? nat.map((x) => ({ id: x.id, name: x.nationalityName })) : FALLBACK.nationalities,
      religions: rel.length ? rel.map((x) => ({ id: x.id, name: x.religionName })) : FALLBACK.religions,
      maritalStatuses: mar.length ? mar.map((x) => ({ id: x.id, name: x.maritalStatusName })) : FALLBACK.maritalStatuses,
    }));
    // โหลดใหม่ได้หลังแก้ข้อมูลหลัก (ไม่ค้างทั้ง session)
    setTimeout(() => {
      cache = null;
    }, 60_000);
  }
  return cache;
}

/**
 * สัญชาติ / ศาสนา / สถานภาพสมรส จากเมนู "ข้อมูลหลัก" (ใช้ในฟอร์มพนักงานแทนรายการที่เขียนตายตัว)
 */
export function useMasterLookups(): MasterLookups {
  const [lookups, setLookups] = useState<MasterLookups>(FALLBACK);
  useEffect(() => {
    let cancelled = false;
    loadLookups().then((l) => {
      if (!cancelled) setLookups(l);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return lookups;
}

/** หา id ของรายการจากชื่อ (ใช้ส่งรหัสอ้างอิงไปกับชื่อ) */
export function lookupId(options: LookupOption[], name?: string | null): number | undefined {
  if (!name) return undefined;
  return options.find((o) => o.name === name)?.id;
}

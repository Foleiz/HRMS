'use client';

import { useEffect, useMemo, useState } from 'react';

/** [จังหวัด, [[อำเภอ/เขต, [[ตำบล/แขวง, รหัสไปรษณีย์], ...]], ...]] — ไฟล์ public/data/thai-address.json */
type RawData = Array<[string, Array<[string, Array<[string, string]>]>]>;

let cache: Promise<RawData> | null = null;
const loadData = () => {
  if (!cache) {
    cache = fetch('/data/thai-address.json')
      .then((r) => {
        if (!r.ok) throw new Error('load failed');
        return r.json() as Promise<RawData>;
      })
      .catch((err) => {
        cache = null;
        throw err;
      });
  }
  return cache;
};

/** ตัดคำนำหน้า (จังหวัด/อำเภอ/เขต/ตำบล/แขวง) และช่องว่าง เพื่อเทียบชื่อ */
export const normalizePlaceName = (value: string) =>
  (value || '')
    .trim()
    .replace(/^(จังหวัด|จ\.|อำเภอ|อ\.|เขต|ตำบล|ต\.|แขวง)\s*/, '')
    .replace(/\s+/g, '')
    .replace(/^กรุงเทพฯ?$|^กทม\.?$/, 'กรุงเทพมหานคร');

export const isBangkok = (province: string) => normalizePlaceName(province) === 'กรุงเทพมหานคร';

const byThai = (a: string, b: string) => a.localeCompare(b, 'th');

/** รายชื่อจังหวัด → อำเภอ/เขต → ตำบล/แขวง → รหัสไปรษณีย์ (โหลดครั้งเดียว ใช้ร่วมกันทุกฟอร์ม) */
export function useThaiAddress() {
  const [data, setData] = useState<RawData | null>(null);

  useEffect(() => {
    let alive = true;
    loadData()
      .then((d) => alive && setData(d))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  return useMemo(() => {
    const findProvince = (province: string) => {
      const key = normalizePlaceName(province);
      return key ? data?.find((p) => p[0] === key) : undefined;
    };
    const findDistrict = (province: string, district: string) => {
      const key = normalizePlaceName(district);
      return key ? findProvince(province)?.[1].find((d) => d[0] === key) : undefined;
    };

    return {
      ready: !!data,
      provinces: (): string[] => (data ? data.map((p) => p[0]).sort(byThai) : []),
      districts: (province: string): string[] =>
        (findProvince(province)?.[1].map((d) => d[0]) || []).sort(byThai),
      subDistricts: (province: string, district: string): Array<{ name: string; zip: string }> =>
        (findDistrict(province, district)?.[1] || [])
          .map(([name, zip]) => ({ name, zip }))
          .sort((a, b) => byThai(a.name, b.name)),
    };
  }, [data]);
}

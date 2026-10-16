/** สีให้เลือกสำหรับประเภทการลา (ใช้กับการ์ดหน้า "ยอดวันลาคงเหลือ") */
export const LEAVE_COLOR_PRESETS = [
  '#2563EB', // น้ำเงิน
  '#0891B2', // ฟ้าอมเขียว
  '#059669', // เขียว
  '#65A30D', // เขียวอ่อน
  '#D97706', // ส้มเหลือง
  '#EA580C', // ส้ม
  '#DC2626', // แดง
  '#DB2777', // ชมพู
  '#7C3AED', // ม่วง
  '#475569', // เทา
];

/** สีเริ่มต้นเมื่อประเภทการลายังไม่ได้ตั้งสี — เลือกจากรายการตามรหัสประเภท ให้แต่ละประเภทได้สีคงที่ */
export const defaultLeaveColor = (key: string | number): string => {
  const s = String(key);
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return LEAVE_COLOR_PRESETS[hash % LEAVE_COLOR_PRESETS.length];
};

export const resolveLeaveColor = (color: string | null | undefined, key: string | number): string =>
  color && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ? color : defaultLeaveColor(key);

/** สีโปร่ง (#RRGGBBAA) จากสี #RRGGBB — ใช้ทำพื้นหลังอ่อน */
export const withAlpha = (hex: string, alpha: number): string => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255).toString(16).padStart(2, '0');
  return `#${h}${a}`;
};

/** ผสมสีกับสีขาว (ratio = สัดส่วนสีจริง 0–1) — ใช้ทำพื้นการ์ดสีพาสเทลแบบทึบ */
export const tintColor = (hex: string, ratio: number): string => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = Math.min(1, Math.max(0, ratio));
  const mix = (i: number) => {
    const v = parseInt(h.slice(i, i + 2), 16);
    return Math.round(255 - (255 - v) * r).toString(16).padStart(2, '0');
  };
  return `#${mix(0)}${mix(2)}${mix(4)}`;
};

/** ผสมสีกับพื้นโหมดมืด (slate-800) — ใช้ทำพื้นการ์ด/ป้ายในโหมดมืดให้ตัวหนังสือสีอ่อนอ่านง่าย */
export const shadeColor = (hex: string, ratio: number, base = '#1E293B'): string => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const b = base.replace('#', '');
  const r = Math.min(1, Math.max(0, ratio));
  const mix = (i: number) => {
    const v = parseInt(h.slice(i, i + 2), 16);
    const bv = parseInt(b.slice(i, i + 2), 16);
    return Math.round(bv + (v - bv) * r).toString(16).padStart(2, '0');
  };
  return `#${mix(0)}${mix(2)}${mix(4)}`;
};

/** ตัวแปร CSS สีประเภทการลา สำหรับใช้กับคลาส bg-[var(--lc-bg)] dark:bg-[var(--lc-bg-dark)] */
export const leaveColorVars = (color: string, lightRatio = 0.3, darkRatio = 0.28): Record<string, string> => ({
  '--lc': color,
  '--lc-bg': tintColor(color, lightRatio),
  '--lc-bg-dark': shadeColor(color, darkRatio),
  '--lc-ring': tintColor(color, 0.55),
  '--lc-ring-dark': shadeColor(color, 0.6),
  '--lc-text-dark': tintColor(color, 0.45),
});

/** ตัดคำนำหน้า แล้วย่อชื่อ เช่น "นาย สมชาย ใจดี" → "สมชาย ใ." (ใช้ในพื้นที่แคบ เช่น ปฏิทิน) */
export const shortPersonName = (fullName: string): string => {
  const parts = (fullName || '')
    .trim()
    .replace(/^(นางสาว|นาย|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.|Mr\.?|Mrs\.?|Ms\.?|Miss)\s*/i, '')
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return fullName;
  return parts.length > 1 ? `${parts[0]} ${parts[1].charAt(0)}.` : parts[0];
};

/** สีของแต่ละกะ: ใช้สีที่ตั้งไว้ ถ้าไม่ได้ตั้งจะแจกสีที่ยังไม่ถูกใช้ไล่ตามลำดับรหัสกะ (กะต่างกันได้สีต่างกัน) */
export const buildColorMap = (items: { id: number; color?: string | null }[]): Map<number, string> => {
  const valid = (c?: string | null) => !!c && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c);
  const map = new Map<number, string>();
  const used = new Set<string>();
  items.forEach((it) => {
    if (valid(it.color)) {
      map.set(it.id, it.color!.toUpperCase());
      used.add(it.color!.toUpperCase());
    }
  });
  let i = 0;
  [...items]
    .sort((a, b) => a.id - b.id)
    .forEach((it) => {
      if (map.has(it.id)) return;
      const free = LEAVE_COLOR_PRESETS.filter((c) => !used.has(c));
      const pool = free.length ? free : LEAVE_COLOR_PRESETS;
      const c = pool[i % pool.length];
      i++;
      used.add(c);
      map.set(it.id, c);
    });
  return map;
};

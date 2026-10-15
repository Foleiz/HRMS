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

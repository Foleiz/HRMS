'use client';

import React, { useEffect, useState } from 'react';
import { getAvatarUrl } from '@/lib/api-client';
import { employeeService } from '@/services/employeeService';

/** สีวงกลมตัวอักษรแรก — ชุดเดียวกับหน้าจัดการพนักงาน (เลือกตาม id) */
export const AVATAR_COLORS = [
  'bg-primary text-white',
  'bg-teal-600 text-white',
  'bg-stone-400 text-white',
  'bg-amber-500 text-white',
  'bg-rose-500 text-white',
  'bg-blue-600 text-white',
  'bg-indigo-600 text-white',
];

export const avatarColorFor = (id?: number | null) =>
  AVATAR_COLORS[(((id ?? 1) - 1) % AVATAR_COLORS.length + AVATAR_COLORS.length) % AVATAR_COLORS.length];

let cachedAvatarById: Map<number, string | null> | null = null;
let pendingAvatarFetch: Promise<Map<number, string | null>> | null = null;

function fetchAvatarMap(): Promise<Map<number, string | null>> {
  if (cachedAvatarById) return Promise.resolve(cachedAvatarById);
  if (pendingAvatarFetch) return pendingAvatarFetch;
  pendingAvatarFetch = employeeService
    .getAll()
    .then((list) => {
      const m = new Map<number, string | null>();
      for (const e of list) {
        m.set(e.id, e.avatarUrl ?? null);
      }
      cachedAvatarById = m;
      return m;
    })
    .catch(() => {
      const empty = new Map<number, string | null>();
      cachedAvatarById = empty;
      return empty;
    });
  return pendingAvatarFetch;
}

interface AvatarNameProps {
  /** ใช้เลือกสีวงกลม และดึงรูปโปรไฟล์อัตโนมัติหากไม่ได้ส่ง avatarUrl มา */
  id?: number | null;
  /** ข้อความหลัก เช่น ชื่อ-นามสกุล หรือชื่อประเภท */
  name: string;
  /** คำนำหน้า (นาย/นาง/นางสาว) — แสดงหน้าชื่อ */
  prefix?: string | null;
  /** ตัวอักษรในวงกลม (ค่าเริ่มต้น = ตัวแรกของชื่อจริงหลังตัดคำนำหน้า) */
  initial?: string;
  avatarUrl?: string | null;
  className?: string;
}

/** วงกลมรูปโปรไฟล์จริง (หรือตัวอักษรแรกเมื่อไม่มีรูป) + ชื่อ — รูปแบบเดียวกับหน้าจัดการพนักงาน */
export function AvatarName({ id, name, prefix, initial, avatarUrl, className = '' }: AvatarNameProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [autoAvatarUrl, setAutoAvatarUrl] = useState<string | null>(() =>
    id != null && cachedAvatarById ? cachedAvatarById.get(id) ?? null : null
  );

  useEffect(() => {
    if (avatarUrl !== undefined || id == null) return;
    if (cachedAvatarById) {
      setAutoAvatarUrl(cachedAvatarById.get(id) ?? null);
      return;
    }
    let active = true;
    fetchAvatarMap().then((m) => {
      if (active) setAutoAvatarUrl(m.get(id) ?? null);
    });
    return () => {
      active = false;
    };
  }, [id, avatarUrl]);

  const resolvedUrl = avatarUrl ?? autoAvatarUrl;
  const src = resolvedUrl && !imgFailed ? getAvatarUrl(resolvedUrl) : null;
  const cleanName = (name ?? '')
    .replace(/^(นาย|นางสาว|นาง|น\.ส\.|เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.|Mr\.|Mrs\.|Ms\.|Miss)\s*/i, '')
    .trim();
  const letter = (initial ?? cleanName.charAt(0).toUpperCase()) || (name?.trim().charAt(0).toUpperCase() ?? '?');

  return (
    <div className={`flex items-center gap-2.5 min-w-0 ${className}`}>
      <span
        className={`relative w-7 h-7 rounded-full overflow-hidden shrink-0 flex items-center justify-center font-bold text-[10px] shadow-2xs ${avatarColorFor(id)}`}
        aria-hidden="true"
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="w-full h-full object-cover" onError={() => setImgFailed(true)} />
        ) : (
          letter
        )}
      </span>
      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
        {prefix ? `${prefix} ` : ''}
        {name}
      </span>
    </div>
  );
}

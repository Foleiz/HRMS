'use client';

import React, { useState } from 'react';
import { getAvatarUrl } from '@/lib/api-client';

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

interface AvatarNameProps {
  /** ใช้เลือกสีวงกลม */
  id?: number | null;
  /** ข้อความหลัก เช่น ชื่อ-นามสกุล หรือชื่อประเภท */
  name: string;
  /** คำนำหน้า (นาย/นาง/นางสาว) — แสดงหน้าชื่อ */
  prefix?: string | null;
  /** ตัวอักษรในวงกลม (ค่าเริ่มต้น = ตัวแรกของ name) */
  initial?: string;
  avatarUrl?: string | null;
  className?: string;
}

/** วงกลมรูป/ตัวอักษรแรก + ชื่อ — รูปแบบเดียวกับคอลัมน์ชื่อในหน้าจัดการพนักงาน */
export function AvatarName({ id, name, prefix, initial, avatarUrl, className = '' }: AvatarNameProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = avatarUrl && !imgFailed ? getAvatarUrl(avatarUrl) : null;
  const letter = (initial ?? name?.trim().charAt(0)) || '?';
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

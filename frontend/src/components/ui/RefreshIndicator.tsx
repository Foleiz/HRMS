'use client';

import React from 'react';

/**
 * แถบโหลดบาง ๆ ระหว่างดึงข้อมูลใหม่ (ไม่กินพื้นที่ — ความสูงหน้าไม่เปลี่ยน)
 * วางไว้ "ก่อน" เนื้อหาที่โหลดใหม่ในกล่องเดียวกัน — เนื้อหาที่ตามหลังจะจางลงระหว่างโหลด (ดู .refresh-indicator ใน globals.css)
 */
export function RefreshIndicator({ active }: { active: boolean }) {
  return (
    <div className="refresh-indicator" data-active={active ? 'true' : 'false'} role="status" aria-live="polite">
      {active && (
        <>
          <span className="refresh-indicator__bar" />
          <span className="sr-only">กำลังโหลดข้อมูล</span>
        </>
      )}
    </div>
  );
}

export default RefreshIndicator;

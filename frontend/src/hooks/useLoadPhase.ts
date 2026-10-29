'use client';

import { useState } from 'react';

/**
 * แยกสถานะโหลดเป็น 2 แบบ เพื่อไม่ให้หน้ากระพริบเวลากดตัวกรอง/เปลี่ยนหน้า
 *
 * - initialLoading: ยังไม่เคยโหลดเสร็จเลย → แสดงกล่อง "กำลังโหลด" ได้ตามปกติ
 * - refreshing: เคยมีข้อมูลแล้วและกำลังโหลดใหม่ → คงข้อมูลเดิมไว้ (จางลง) แทนการสลับเป็นกล่องโหลด
 *
 *   const phase = useLoadPhase(loading);
 *   <RefreshIndicator active={phase.refreshing} />
 *   {phase.initialLoading ? <Loader/> : <Table/>}
 */
export function useLoadPhase(loading: boolean) {
  const [prev, setPrev] = useState(loading);
  const [loadedOnce, setLoadedOnce] = useState(false);
  // ปรับ state ระหว่าง render (รูปแบบที่ React แนะนำ) — จำว่าเคยโหลดเสร็จแล้วเมื่อ true → false
  if (prev !== loading) {
    setPrev(loading);
    if (prev && !loading) setLoadedOnce(true);
  }
  return {
    initialLoading: loading && !loadedOnce,
    refreshing: loading && loadedOnce,
  };
}

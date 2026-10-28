'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * พื้นหลังมืด + ตำแหน่งกลางจอ ของ popup ทุกตัวในระบบ (ใช้ภายใน <Modal> และ popup ที่ออกแบบหน้าตาเอง)
 *   <ModalShell className="z-50 bg-slate-900/50 backdrop-blur-xs">
 *     <div className="w-full max-w-lg bg-white rounded-2xl ...">...</div>
 *   </ModalShell>
 *
 * - render ที่ document.body (portal) — ไม่โดน parent ที่มี transform/overflow ตัด
 * - ตัวพื้นหลังเลื่อนได้: popup สูงกว่าจอ หัว/ปุ่มไม่โดนขอบจอบัง (แค่เลื่อนดู)
 * - ล็อกการเลื่อนหน้าหลังขณะเปิด
 */
export const ModalShell: React.FC<{
  children: React.ReactNode;
  /** class ของพื้นหลัง เช่น z-index / สี / blur / animation */
  className?: string;
  /** class ของชั้นจัดกลาง (ระยะขอบ / การจัดแนว) */
  innerClassName?: string;
  /** ตำแหน่ง popup: 'center' (ค่าเริ่มต้น กลางจอ) หรือ 'right' (drawer ชิดขวา) */
  placement?: 'center' | 'right';
  /** กดพื้นที่ว่างรอบ popup */
  onBackdropClick?: () => void;
  /** false = ไม่ย้ายไป document.body (เช่น หน้าพิมพ์เอกสารที่ CSS ผูกกับตำแหน่งเดิม) */
  portal?: boolean;
}> = ({
  children,
  className = 'z-50 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200',
  innerClassName,
  placement = 'center',
  onBackdropClick,
  portal = true,
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    if (onBackdropClick && e.target === e.currentTarget) onBackdropClick();
  };

  const defaultInner = placement === 'right' ? 'justify-end p-0' : 'items-center justify-center p-4';
  const resolvedInnerClassName = innerClassName ?? defaultInner;

  const node = (
    <div className={`fixed inset-0 overflow-y-auto ${className}`} onClick={handleClick}>
      <div className={`flex min-h-full ${resolvedInnerClassName}`} onClick={handleClick}>
        {children}
      </div>
    </div>
  );

  if (!portal) return node;
  if (!mounted) return null;
  return createPortal(node, document.body);
};

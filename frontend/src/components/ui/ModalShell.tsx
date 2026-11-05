'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** จุดที่ผู้ใช้กดล่าสุด — ให้ popup ขยายออกมาจากปุ่มที่กดเปิด */
let lastPointer: { x: number; y: number; t: number } | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointerdown',
    (e) => {
      lastPointer = { x: e.clientX, y: e.clientY, t: Date.now() };
    },
    { capture: true, passive: true }
  );
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * เล่นแอนิเมชันตอนปิด: ทำสำเนาหน้าต่างที่กำลังถูกถอดออก แล้วให้สำเนาค่อย ๆ หายไป
 * (component ที่เรียกใช้ไม่ต้องรอแอนิเมชันจบก่อนถอด popup)
 */
function playCloseAnimation(node: HTMLElement) {
  if (prefersReducedMotion() || !node.isConnected) return;
  const clone = node.cloneNode(true) as HTMLElement;
  clone.classList.add('modal-closing');
  clone.setAttribute('aria-hidden', 'true');
  clone.removeAttribute('id');
  document.body.appendChild(clone);
  // ค่าในช่องกรอก / ตำแหน่งเลื่อน ไม่ติดไปกับ cloneNode — คัดลอกให้ ไม่ให้เนื้อหากระตุกตอนปิด
  const src = node.querySelectorAll<HTMLElement>('*');
  const dst = clone.querySelectorAll<HTMLElement>('*');
  clone.scrollTop = node.scrollTop;
  src.forEach((el, i) => {
    const target = dst[i];
    if (!target) return;
    if (el.scrollTop) target.scrollTop = el.scrollTop;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      (target as HTMLInputElement).value = el.value;
      if (el instanceof HTMLInputElement) (target as HTMLInputElement).checked = el.checked;
    }
  });
  window.setTimeout(() => clone.remove(), 220);
}

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
  const nodeRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(
    () => () => {
      if (portal && nodeRef.current) playCloseAnimation(nodeRef.current);
    },
    [portal]
  );
  // เปิดจากการกด (ภายใน 1 วินาที) → ขยายออกจากจุดนั้น, เปิดด้วยคีย์บอร์ด/โค้ด → ขยายจากกลางจอ
  const [origin] = useState(() =>
    lastPointer && Date.now() - lastPointer.t < 1000 ? { x: lastPointer.x, y: lastPointer.y } : null
  );

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
    <div
      ref={(el) => {
        if (el) nodeRef.current = el;
      }}
      className={`fixed inset-0 overflow-y-auto modal-backdrop ${className}`}
      onClick={handleClick}
    >
      <div
        className={`flex min-h-full ${resolvedInnerClassName} ${placement === 'center' ? 'modal-pop' : ''}`}
        style={
          placement === 'center' && origin
            ? ({ '--modal-origin-x': `${origin.x}px`, '--modal-origin-y': `${origin.y}px` } as React.CSSProperties)
            : undefined
        }
        onClick={handleClick}
      >
        {children}
      </div>
    </div>
  );

  if (!portal) return node;
  if (!mounted) return null;
  return createPortal(node, document.body);
};

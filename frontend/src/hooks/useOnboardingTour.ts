'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { driver, DriveStep } from 'driver.js';
import { useAuth } from '@/context/AuthContext';

export interface TourStep {
  /** CSS Selector ของ Element ที่ต้องการไฮไลต์ เช่น '#tour-step-leave-type' */
  element: string;
  popover: {
    title: string;
    description: string;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
  };
  /** ระบุรหัสสิทธิ์ (Permission) ที่จำเป็นสำหรับสเต็ปนี้ — หากผู้ใช้ไม่มีสิทธิ์ สเต็ปนี้จะถูกข้ามอัตโนมัติ */
  requiredPermission?: string;
}

export interface UseOnboardingTourOptions {
  /** เริ่มต้นทัวร์อัตโนมัติเมื่อผู้ใช้เข้าหน้านี้เป็นครั้งแรก (default: true) */
  autoStart?: boolean;
  /** ระยะเวลาหน่วงก่อนเริ่มอัตโนมัติ (ms) เพื่อรอให้ DOM โหลดครบสมบูรณ์ (default: 500) */
  delayMs?: number;
  /** ข้อความปุ่มเสร็จสิ้น / ขั้นตอนถัดไป เช่น 'ไปยังหน้าถัดไป →' */
  doneBtnText?: string;
  /** ข้อความปุ่มถัดไป */
  nextBtnText?: string;
  /** ข้อความปุ่มย้อนกลับ */
  prevBtnText?: string;
  /** แสดงปุ่มย้อนกลับแม้มีเพียง 1 สเต็ปใน Phase หรือไม่ (default: false) */
  showPrevBtn?: boolean;
  /** Callback เมื่อผู้ใช้คลิกปุ่มเสร็จสิ้น (Done) ของทัวร์โดยตรง */
  onDone?: () => void;
  /** Callback สำหรับความเข้ากันได้ย้อนหลัง (ทำงานเมื่อกด Done เช่นเดียวกับ onDone) */
  onComplete?: () => void;
  /** Callback เมื่อผู้ใช้กดปุ่มย้อนกลับ (Previous) */
  onPrev?: () => void;
  /** Callback เมื่อทัวร์ถูกปิดด้วยปุ่มปิด (X) */
  onClose?: () => void;
  /** Callback เมื่อทัวร์ถูกทำลายสมบูรณ์ (สำหรับ cleanup เท่านั้น - ห้ามมี navigation เด็ดขาด) */
  onDestroy?: () => void;
  /** เงื่อนไขบังคับเริ่มทัวร์ เช่น searchParams.get('tour') === 'onboarding-1' */
  triggerCondition?: boolean;
}

export function useOnboardingTour(
  tourId: string,
  steps: TourStep[],
  options: UseOnboardingTourOptions = {}
) {
  const { user, hasPermission } = useAuth();
  const optionsRef = useRef<UseOnboardingTourOptions>(options);
  optionsRef.current = options;

  const storageKey = `hrms_tour_completed_${user?.id || 'guest'}_${tourId}`;
  const [isCompleted, setIsCompleted] = useState<boolean>(true);
  const driverInstanceRef = useRef<any>(null);
  const isNavigatingRef = useRef<boolean>(false);

  // ตรวจสอบว่าผู้ใช้คนนี้เคยดูทัวร์ของหน้านี้ไปแล้วหรือยัง
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const completed = localStorage.getItem(storageKey) === 'true';
    setIsCompleted(completed);
  }, [storageKey]);

  // ฟังก์ชันหยุดทัวร์
  const endTour = useCallback(() => {
    if (driverInstanceRef.current) {
      try {
        driverInstanceRef.current.destroy();
      } catch {
        // ignore
      }
      driverInstanceRef.current = null;
    }
  }, []);

  // ฟังก์ชันเริ่มทัวร์
  const startTour = useCallback(() => {
    if (typeof window === 'undefined') return;

    // หากมี driver เดิมทำงานอยู่ ให้ทำลายตัวเก่าอย่างปลอดภัยก่อนเริ่มใหม่
    if (driverInstanceRef.current) {
      try {
        driverInstanceRef.current.destroy();
      } catch {
        // ignore
      }
      driverInstanceRef.current = null;
    }

    // 1. กรองสเต็ปตาม Permission ของผู้ใช้ก่อนเสมอ
    const authorizedSteps = steps.filter((step) => {
      if (step.requiredPermission && !hasPermission(step.requiredPermission)) {
        return false;
      }
      return true;
    });

    // 2. กรองสเต็ปเฉพาะที่มี Element อยู่บนหน้าจอจริง (Safe Element Detection)
    const validDriveSteps: DriveStep[] = authorizedSteps
      .filter((step) => {
        const el = document.querySelector(step.element);
        return el !== null;
      })
      .map((step) => ({
        element: step.element,
        popover: {
          title: step.popover.title,
          description: step.popover.description,
          side: step.popover.side || 'bottom',
          align: step.popover.align || 'start',
        },
      }));

    if (validDriveSteps.length === 0) {
      return;
    }

    isNavigatingRef.current = false;
    const currentOpts = optionsRef.current;
    const {
      doneBtnText = 'ถัดไป',
      nextBtnText = 'ถัดไป',
      prevBtnText = 'ย้อนกลับ',
      showPrevBtn = false,
    } = currentOpts;

    // 3. กำหนดค่า Driver.js พร้อมปุ่มภาษาไทยและ Theme ของระบบ
    const driverObj = driver({
      showProgress: false,
      nextBtnText,
      prevBtnText,
      doneBtnText,
      popoverClass: 'hrms-driver-popover',
      popoverOffset: 16,
      overlayColor: 'transparent',
      overlayOpacity: 0,
      stagePadding: 6,
      stageRadius: 14,
      allowClose: false,
      overlayClickBehavior: 'none',
      allowKeyboardControl: false,
      disableActiveInteraction: false,
      steps: validDriveSteps,
      // Callbacks หลักของ Driver.js เมื่อมีการคลิกปุ่มใน Popover
      onNextClick: () => {
        try {
          driverObj.destroy();
        } catch {}
        optionsRef.current.onDone?.();
        optionsRef.current.onComplete?.();
      },
      onDoneClick: () => {
        try {
          driverObj.destroy();
        } catch {}
        optionsRef.current.onDone?.();
        optionsRef.current.onComplete?.();
      },
      onPrevClick: () => {
        try {
          driverObj.destroy();
        } catch {}
        optionsRef.current.onPrev?.();
      },
      onCloseClick: () => {
        try {
          driverObj.destroy();
        } catch {}
        optionsRef.current.onClose?.();
      },
      onPopoverRender: (popover) => {
        // ควบคุมปุ่ม Previous / ย้อนกลับ
        if (popover.previousButton) {
          if (showPrevBtn || Boolean(currentOpts.onPrev)) {
            popover.previousButton.disabled = false;
            popover.previousButton.removeAttribute('disabled');
            popover.previousButton.classList.remove('driver-popover-btn-disabled');
            popover.previousButton.classList.add('hrms-btn-enabled');
            popover.previousButton.style.display = 'inline-flex';
            popover.previousButton.style.opacity = '1';
            popover.previousButton.style.pointerEvents = 'auto';
            popover.previousButton.innerText = prevBtnText;
          } else {
            popover.previousButton.style.display = 'none';
          }
        }

        // ควบคุมปุ่ม Next / ถัดไป
        if (popover.nextButton) {
          popover.nextButton.innerText = doneBtnText || nextBtnText || 'ถัดไป';
        }

        // ปุ่มกากบาท (✕) ที่มุมขวาบน — เมื่อกดจะปิดเมนูคำแนะนำทิ้งไป
        if (popover.closeButton) {
          popover.closeButton.style.display = 'flex';
          popover.closeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
          popover.closeButton.title = 'ปิดคำแนะนำ';
        }
      },
      onDestroyed: () => {
        driverInstanceRef.current = null;
        if (typeof window !== 'undefined') {
          localStorage.setItem(storageKey, 'true');
          setIsCompleted(true);
        }
        // ตรวจสอบว่ามี cleanup callback หรือไม่ (ห้ามนำทางไปหน้าอื่นในนี้)
        optionsRef.current.onDestroy?.();
      },
    });

    driverInstanceRef.current = driverObj;
    driverObj.drive();
  }, [steps, hasPermission, storageKey]);

  // ล้างสถานะเพื่อทดสอบเล่นใหม่
  const resetTour = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
      setIsCompleted(false);
    }
    startTour();
  }, [storageKey, startTour]);

  // การเริ่มทัวร์อัตโนมัติหรือตามเงื่อนไข triggerCondition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentTrigger = options.triggerCondition;
    if (currentTrigger !== undefined) {
      if (currentTrigger) {
        const timer = setTimeout(() => {
          startTour();
        }, options.delayMs ?? 500);
        return () => {
          clearTimeout(timer);
          endTour();
        };
      } else {
        // เมื่อเงื่อนไข triggerCondition กลายเป็น false (เช่น โมดอลถูกปิด)
        endTour();
      }
      return;
    }

    // Auto-start ปกติในครั้งแรก
    if (!options.autoStart) return;
    const completed = localStorage.getItem(storageKey) === 'true';
    if (!completed) {
      const timer = setTimeout(() => {
        startTour();
      }, options.delayMs ?? 500);
      return () => {
        clearTimeout(timer);
        endTour();
      };
    }
  }, [options.triggerCondition, options.autoStart, options.delayMs, storageKey, startTour, endTour]);

  return {
    startTour,
    endTour,
    resetTour,
    isCompleted,
  };
}

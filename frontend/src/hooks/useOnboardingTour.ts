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
  /** Callback เมื่อทัวร์เสร็จสิ้นหรือผู้ใช้กดยกเลิก */
  onComplete?: () => void;
}

export function useOnboardingTour(
  tourId: string,
  steps: TourStep[],
  options: UseOnboardingTourOptions = {}
) {
  const { user, hasPermission } = useAuth();
  const { autoStart = true, delayMs = 500, onComplete } = options;

  const storageKey = `hrms_tour_completed_${user?.id || 'guest'}_${tourId}`;
  const [isCompleted, setIsCompleted] = useState<boolean>(true);
  const driverInstanceRef = useRef<any>(null);

  // ตรวจสอบว่าผู้ใช้คนนี้เคยดูทัวร์ของหน้านี้ไปแล้วหรือยัง
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const completed = localStorage.getItem(storageKey) === 'true';
    setIsCompleted(completed);
  }, [storageKey]);

  // ฟังก์ชันเริ่มทัวร์
  const startTour = useCallback(() => {
    if (typeof window === 'undefined') return;

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

    // 3. กำหนดค่า Driver.js พร้อมปุ่มภาษาไทยและ Theme ของระบบ
    const driverObj = driver({
      showProgress: true,
      progressText: '{{current}} จาก {{total}}',
      nextBtnText: 'ถัดไป →',
      prevBtnText: '← ย้อนกลับ',
      doneBtnText: 'เสร็จสิ้น ✨',
      popoverClass: 'hrms-driver-popover',
      overlayColor: '#0f172a',
      overlayOpacity: 0.72,
      stagePadding: 8,
      stageRadius: 16,
      allowClose: true,
      steps: validDriveSteps,
      onDestroyed: () => {
        // เมื่อดูจบหรือกดปิด ให้บันทึกสถานะว่าเคยดูแล้ว
        if (typeof window !== 'undefined') {
          localStorage.setItem(storageKey, 'true');
          setIsCompleted(true);
        }
        if (onComplete) {
          onComplete();
        }
      },
    });

    driverInstanceRef.current = driverObj;
    driverObj.drive();
  }, [steps, hasPermission, storageKey, onComplete]);

  // ล้างสถานะเพื่อทดสอบเล่นใหม่
  const resetTour = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
      setIsCompleted(false);
    }
    startTour();
  }, [storageKey, startTour]);

  // Auto-start ในครั้งแรกที่เข้ามา
  useEffect(() => {
    if (!autoStart || typeof window === 'undefined') return;

    const completed = localStorage.getItem(storageKey) === 'true';
    if (!completed) {
      const timer = setTimeout(() => {
        startTour();
      }, delayMs);
      return () => clearTimeout(timer);
    }
  }, [autoStart, storageKey, delayMs, startTour]);

  return {
    startTour,
    resetTour,
    isCompleted,
  };
}

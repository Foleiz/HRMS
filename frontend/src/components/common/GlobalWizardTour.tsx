'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { driver, DriveStep } from 'driver.js';
import { WIZARD_STEP_LOOKUP } from '@/config/wizardTours';

export function GlobalWizardTour() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const tourParam = searchParams?.get('tour');
  const driverInstanceRef = useRef<any>(null);

  useEffect(() => {
    // หากไม่มี tour param หรือเป็น hr-onboarding (ซึ่งมี in-page handler รองรับ modal อยู่แล้ว) ให้ข้าม
    if (!tourParam || tourParam.startsWith('hr-onboarding')) {
      if (driverInstanceRef.current) {
        try {
          driverInstanceRef.current.destroy();
        } catch {}
        driverInstanceRef.current = null;
      }
      return;
    }

    const ctx = WIZARD_STEP_LOOKUP[tourParam];
    if (!ctx) return;

    const { step, prevRoute, nextRoute } = ctx;
    const isLastStep = step.stepNumber === step.totalSteps;

    // หน่วงเวลาเล็กน้อยเพื่อให้ DOM ของหน้านั้น render เสร็จสมบูรณ์
    const timer = setTimeout(() => {
      // ค้นหา Element แรกที่จับคู่ได้จาก selectors ที่ระบุไว้
      let matchedEl: Element | null = null;
      for (const sel of step.selectors) {
        try {
          const el = document.querySelector(sel);
          if (el && el.getBoundingClientRect().height > 0) {
            matchedEl = el;
            break;
          }
        } catch {
          // ignore invalid selector syntax
        }
      }

      // หากไม่พบ element ใดๆ เลย ให้ fallback ไปที่ main หรือ body
      if (!matchedEl) {
        matchedEl = document.querySelector('main') || document.body;
      }

      const validSteps: DriveStep[] = [
        {
          element: matchedEl as HTMLElement,
          popover: {
            title: step.title,
            description: step.description,
            side: step.side || 'bottom',
            align: step.align || 'start',
          },
        },
      ];

      // ทำลาย instance เดิมก่อนเริ่มใหม่
      if (driverInstanceRef.current) {
        try {
          driverInstanceRef.current.destroy();
        } catch {}
        driverInstanceRef.current = null;
      }

      const driverObj = driver({
        showProgress: false,
        nextBtnText: isLastStep ? 'เสร็จสิ้น ✨' : 'ถัดไป',
        prevBtnText: 'ย้อนกลับ',
        doneBtnText: isLastStep ? 'เสร็จสิ้น ✨' : 'ถัดไป',
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
        steps: validSteps,
        onNextClick: () => {
          try {
            driverObj.destroy();
          } catch {}
          router.push(nextRoute);
        },
        onDoneClick: () => {
          try {
            driverObj.destroy();
          } catch {}
          router.push(nextRoute);
        },
        onPrevClick: () => {
          try {
            driverObj.destroy();
          } catch {}
          router.push(prevRoute);
        },
        onCloseClick: () => {
          try {
            driverObj.destroy();
          } catch {}
          // ปิด tour และล้าง query param ออก
          router.replace(pathname);
        },
        onPopoverRender: (popover) => {
          // ปุ่ม ย้อนกลับ
          if (popover.previousButton) {
            popover.previousButton.classList.remove('driver-popover-btn-disabled');
            popover.previousButton.classList.add('hrms-btn-enabled');
            popover.previousButton.style.display = 'inline-flex';
            popover.previousButton.style.opacity = '1';
            popover.previousButton.style.pointerEvents = 'auto';
            popover.previousButton.innerText = 'ย้อนกลับ';
          }

          // ปุ่ม ถัดไป / เสร็จสิ้น
          if (popover.nextButton) {
            popover.nextButton.innerText = isLastStep ? 'เสร็จสิ้น ✨' : 'ถัดไป';
          }

          // ปุ่มกากบาท (✕) ขวาบน นูนออกนอกกรอบตามดีไซน์
          if (popover.closeButton) {
            popover.closeButton.style.display = 'flex';
            popover.closeButton.innerHTML =
              '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            popover.closeButton.title = 'ปิดคำแนะนำ';
          }
        },
      });

      driverInstanceRef.current = driverObj;
      driverObj.drive();
    }, 350);

    return () => {
      clearTimeout(timer);
      if (driverInstanceRef.current) {
        try {
          driverInstanceRef.current.destroy();
        } catch {}
        driverInstanceRef.current = null;
      }
    };
  }, [tourParam, router, pathname]);

  return null;
}

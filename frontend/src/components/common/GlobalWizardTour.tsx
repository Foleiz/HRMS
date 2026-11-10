'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { driver, DriveStep } from 'driver.js';
import { WIZARD_PAGE_LOOKUP } from '@/config/wizardTours';

export function GlobalWizardTour() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const tourParam = searchParams?.get('tour');
  const driverInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!tourParam) {
      if (driverInstanceRef.current) {
        try {
          driverInstanceRef.current.destroy();
        } catch {}
        driverInstanceRef.current = null;
      }
      return;
    }

    const ctx = WIZARD_PAGE_LOOKUP[tourParam];
    if (!ctx) return;

    const { pageStep, prevPageRoute, nextPageRoute } = ctx;
    const isLastPage = pageStep.stepNumber === pageStep.totalSteps;

    // หน่วงเวลาเล็กน้อยเพื่อให้ DOM ของหน้าและ Sidebar render เสร็จสมบูรณ์
    const timer = setTimeout(() => {
      // แปลง subSteps ให้เป็น DriveStep ของ Driver.js
      const driveSteps: DriveStep[] = [];

      for (const sub of pageStep.subSteps) {
        const isSidebarStep =
          sub.title.startsWith('ตำแหน่งเมนู') ||
          sub.selectors.some((s) => s.includes('data-sidebar-path') || s.includes('aside'));

        let matchedEl: Element | null = null;
        for (const sel of sub.selectors) {
          try {
            const el = document.querySelector(sel);
            if (el && (el.getBoundingClientRect().width > 0 || el.getBoundingClientRect().height > 0)) {
              // ถ้าไม่ใช่สเต็ปชี้ Sidebar ห้ามไฮไลท์ element ภายใน aside เด็ดขาด (ป้องกัน highlight ปุ่ม toggle ย่อ sidebar)
              if (!isSidebarStep && el.closest('aside')) {
                continue;
              }
              // ถ้าเป็นสเต็ปชี้ Sidebar ห้ามจับปุ่ม toggle ย่อขยาย sidebar ที่หัว aside
              if (isSidebarStep && el.closest('aside') && el.tagName.toLowerCase() === 'button' && !el.getAttribute('data-sidebar-path')) {
                continue;
              }
              matchedEl = el;
              break;
            }
          } catch {
            // ignore invalid selector syntax
          }
        }

        // Fallback ที่ปลอดภัย แยกตามประเภท step
        if (!matchedEl) {
          if (isSidebarStep) {
            matchedEl =
              document.querySelector('aside [data-sidebar-path]') ||
              document.querySelector('aside nav') ||
              document.querySelector('aside') ||
              document.body;
          } else {
            matchedEl =
              document.querySelector('main button.bg-primary') ||
              document.querySelector('main table') ||
              document.querySelector('main') ||
              document.body;
          }
        }

        driveSteps.push({
          element: matchedEl as HTMLElement,
          popover: {
            title: sub.title,
            description: sub.description,
            side: sub.side || 'bottom',
            align: sub.align || 'start',
          },
        });
      }

      if (driveSteps.length === 0) return;

      // ทำลาย instance เดิมก่อนเริ่มใหม่
      if (driverInstanceRef.current) {
        try {
          driverInstanceRef.current.destroy();
        } catch {}
        driverInstanceRef.current = null;
      }

      const totalSubSteps = driveSteps.length;

      const driverObj = driver({
        showProgress: false,
        nextBtnText: 'ถัดไป',
        prevBtnText: 'ย้อนกลับ',
        doneBtnText: isLastPage ? 'เสร็จสิ้น ✨' : 'ถัดไป',
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
        steps: driveSteps,
        onNextClick: () => {
          const activeIndex = driverObj.getActiveIndex() ?? 0;
          if (activeIndex < totalSubSteps - 1) {
            driverObj.moveNext();
          } else {
            // จบสเต็ปบนหน้านี้แล้ว -> นำทางไปหน้าถัดไป
            try {
              driverObj.destroy();
            } catch {}
            router.push(nextPageRoute);
          }
        },
        onDoneClick: () => {
          try {
            driverObj.destroy();
          } catch {}
          router.push(nextPageRoute);
        },
        onPrevClick: () => {
          const activeIndex = driverObj.getActiveIndex() ?? 0;
          if (activeIndex > 0) {
            driverObj.movePrevious();
          } else {
            // อยู่ที่สเต็ปแรกของหน้านี้แล้ว -> นำทางกลับหน้าก่อนหน้า
            try {
              driverObj.destroy();
            } catch {}
            router.push(prevPageRoute);
          }
        },
        onCloseClick: () => {
          try {
            driverObj.destroy();
          } catch {}
          // ปิด tour และล้าง query param ออก
          router.replace(pathname);
        },
        onPopoverRender: (popover) => {
          const activeIndex = driverObj.getActiveIndex() ?? 0;
          const isFirstSub = activeIndex === 0;
          const isLastSub = activeIndex === totalSubSteps - 1;

          // ควบคุมปุ่ม ย้อนกลับ
          if (popover.previousButton) {
            popover.previousButton.classList.remove('driver-popover-btn-disabled');
            popover.previousButton.classList.add('hrms-btn-enabled');
            popover.previousButton.style.display = 'inline-flex';
            popover.previousButton.style.opacity = '1';
            popover.previousButton.style.pointerEvents = 'auto';
            popover.previousButton.innerText = 'ย้อนกลับ';
          }

          // ควบคุมปุ่ม ถัดไป / เสร็จสิ้น
          if (popover.nextButton) {
            if (isLastSub && isLastPage) {
              popover.nextButton.innerText = 'เสร็จสิ้น ✨';
            } else {
              popover.nextButton.innerText = 'ถัดไป';
            }
          }

          // ปุ่มกากบาท (✕) ขวาบน นูนออกนอกกรอบตามสไตล์ระบบ
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
    }, 450);

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

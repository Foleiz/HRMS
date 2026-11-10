'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { driver, DriveStep } from 'driver.js';
import { ArrowRight, X } from 'lucide-react';
import { WIZARD_PAGE_LOOKUP } from '@/config/wizardTours';

export function GlobalWizardTour() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const tourParam = searchParams?.get('tour');
  const driverInstanceRef = useRef<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ตรวจจับว่ามี Modal หรือ Drawer ของระบบเปิดอยู่ในหน้าจอหรือไม่
  // หากมี ให้ซ่อน Tour Popover ใหญ่ และปลดไฮไลต์ เพื่อไม่ให้บังช่องกรอกข้อมูลในแบบฟอร์ม
  useEffect(() => {
    if (!tourParam) {
      setIsModalOpen(false);
      if (typeof document !== 'undefined') {
        document.body.classList.remove('driver-modal-active');
      }
      return;
    }

    const checkModal = () => {
      const modalEl = document.querySelector('.modal-backdrop, [role="dialog"]');
      const hasModal = Boolean(modalEl);
      setIsModalOpen(hasModal);
      if (hasModal) {
        document.body.classList.add('driver-modal-active');
      } else {
        document.body.classList.remove('driver-modal-active');
      }
    };

    checkModal();

    const observer = new MutationObserver(() => {
      checkModal();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (typeof document !== 'undefined') {
        document.body.classList.remove('driver-modal-active');
      }
    };
  }, [tourParam]);

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

    const ctx = tourParam ? WIZARD_PAGE_LOOKUP[tourParam] : null;

    const handleNextFromModal = () => {
      if (!ctx) return;
      try {
        driverInstanceRef.current?.destroy();
      } catch {}
      router.push(ctx.nextPageRoute);
    };

    const handlePrevFromModal = () => {
      if (!ctx) return;
      try {
        driverInstanceRef.current?.destroy();
      } catch {}
      router.push(ctx.prevPageRoute);
    };

    const handleCloseFromModal = () => {
      try {
        driverInstanceRef.current?.destroy();
      } catch {}
      router.replace(pathname);
    };

    if (!isModalOpen || !ctx) return null;

    const { pageStep } = ctx;
    const isLastPage = pageStep.stepNumber === pageStep.totalSteps;
    const currentActionStep =
      pageStep.subSteps[pageStep.subSteps.length - 1] || pageStep.subSteps[0];
    const stepTitle = currentActionStep?.title?.replace(/^ขั้นตอนที่ \d+:\s*/, '') || '';

    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-6 left-6 z-[100030] flex items-center gap-3 px-4 py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-700/80 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200 font-sans"
      >
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
          </span>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400">
                คู่มือขั้นตอนที่ {pageStep.stepNumber}/{pageStep.totalSteps}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">· แบบฟอร์มเปิดอยู่</span>
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 max-w-[200px] sm:max-w-[260px] truncate">
              {stepTitle}
            </span>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevFromModal}
            className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            ย้อนกลับ
          </button>

          <button
            type="button"
            onClick={handleNextFromModal}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <span>{isLastPage ? 'เสร็จสิ้น ✨' : 'ถัดไป'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleCloseFromModal}
            title="ปิดคู่มือ"
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { driver, DriveStep } from 'driver.js';
import { WIZARD_PAGE_LOOKUP } from '@/config/wizardTours';
import { useAuth } from '@/context/AuthContext';
import { isPathAccessible, getPayrollViewAccess } from '@/lib/routePermissions';

export function GlobalWizardTour() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const tourParam = searchParams?.get('tour');
  const driverInstanceRef = useRef<any>(null);

  // ตรวจจับว่ามี Modal หรือ Drawer ของระบบเปิดอยู่ในหน้าจอหรือไม่
  // หากมี ให้ซ่อน Tour Popover และปลดไฮไลต์ เพื่อไม่ให้บังช่องกรอกข้อมูลในแบบฟอร์ม
  // เมื่อออกจากหน้าต่างแบบฟอร์ม (ปิด Modal/Drawer) เมนู Wizard จะกลับมาแสดงผลอีกรอบ
  useEffect(() => {
    if (!tourParam) {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('driver-modal-active');
      }
      return;
    }

    const checkModal = () => {
      // ตรวจจับเฉพาะ modal-backdrop ของหน้าต่างแบบฟอร์มในระบบ (ไม่รวม .driver-popover ของ Driver.js เอง)
      const modalEl = document.querySelector('.modal-backdrop, [role="dialog"]:not(.driver-popover):not([class*="driver-"])');
      const hasModal = Boolean(modalEl);
      if (hasModal) {
        document.body.classList.add('driver-modal-active');
      } else {
        const wasActive = document.body.classList.contains('driver-modal-active');
        document.body.classList.remove('driver-modal-active');
        // เมื่อออกจากหน้าต่างฟอร์ม ให้สั่ง Driver รีเฟรชตำแหน่งการแสดงผลอีกรอบ
        if (wasActive && driverInstanceRef.current && typeof driverInstanceRef.current.refresh === 'function') {
          setTimeout(() => {
            try {
              driverInstanceRef.current?.refresh();
            } catch {}
          }, 60);
        }
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

    if (isLoading) return;

    const ctx = WIZARD_PAGE_LOOKUP[tourParam];
    if (!ctx) return;

    const { pageStep, flow } = ctx;

    // กรองเฉพาะหน้าที่ผู้ใช้งานปัจจุบันมีสิทธิ์เข้าถึงได้จริง
    const accessiblePages = flow.pages.filter((p) => {
      if (!user) return true;
      const cleanPath = p.route.split('?')[0];
      return isPathAccessible(cleanPath, user).allowed;
    });

    // หากผู้ใช้งานไม่มีสิทธิ์ดูมุมมองบทบาทของคู่มือนี้ หรือไม่มีสิทธิ์เข้าหน้านี้ ให้ส่งไปยังหน้าแรกที่มีสิทธิ์ หรือ /guide
    if (user && flow.requiredPayrollView) {
      const payrollAccess = getPayrollViewAccess(user);
      const hasFlowAccess =
        (flow.requiredPayrollView === 'HR' && payrollAccess.canAccessHrView) ||
        (flow.requiredPayrollView === 'FINANCE' && payrollAccess.canAccessFinanceView) ||
        (flow.requiredPayrollView === 'APPROVER' && payrollAccess.canAccessApproverView) ||
        (flow.requiredPayrollView === 'BANK' && payrollAccess.canAccessBankView);
      if (!hasFlowAccess) {
        router.replace('/guide');
        return;
      }
    }

    const currentCleanPath = pageStep.route.split('?')[0];
    if (user && !isPathAccessible(currentCleanPath, user).allowed) {
      if (accessiblePages.length > 0) {
        router.replace(accessiblePages[0].route);
      } else {
        router.replace('/guide');
      }
      return;
    }

    const pageIdxInAccessible = accessiblePages.findIndex((p) => p.pageTourKey === pageStep.pageTourKey);
    const prevPageRoute =
      pageIdxInAccessible > 0 ? accessiblePages[pageIdxInAccessible - 1].route : '/guide';
    const nextPageRoute =
      pageIdxInAccessible >= 0 && pageIdxInAccessible < accessiblePages.length - 1
        ? accessiblePages[pageIdxInAccessible + 1].route
        : '/guide?completed=1';
    const isLastPage =
      accessiblePages.length === 0 || pageIdxInAccessible === accessiblePages.length - 1;

    const activeSubSteps = pageStep.subSteps;

    // ฟังก์ชันค้นหา DOM element ที่ดีที่สุดสำหรับ subStep นั้นๆ แบบ Realtime
    const resolveSubStepElement = (sub: (typeof activeSubSteps)[0]): Element => {
      const isSidebarStep =
        sub.title.startsWith('ตำแหน่งเมนู') ||
        sub.selectors.some((s) => s.includes('data-sidebar-path') || s.includes('aside'));

      for (const sel of sub.selectors) {
        try {
          const el = document.querySelector(sel);
          if (el && (el.getBoundingClientRect().width > 0 || el.getBoundingClientRect().height > 0)) {
            // ถ้าไม่ใช่สเต็ปชี้ Sidebar ห้ามไฮไลท์ element ภายใน aside เด็ดขาด
            if (!isSidebarStep && el.closest('aside')) {
              continue;
            }
            // ถ้าเป็นสเต็ปชี้ Sidebar ห้ามจับปุ่ม toggle ย่อขยาย sidebar ที่หัว aside
            if (isSidebarStep && el.closest('aside') && el.tagName.toLowerCase() === 'button' && !el.getAttribute('data-sidebar-path')) {
              continue;
            }
            // ถ้าเป็นตาราง (table) ป้องกันไม่ให้เกิดการเลื่อนแกน X จนขอบซ้ายแหว่ง และชี้ที่แถวแรกแทนทั้งตารางยาวๆ เพื่อไม่ให้หน้าเว็บเลื่อนลงไปกลางตาราง
            if (el.tagName.toLowerCase() === 'table') {
              const scrollWrap = el.closest('.overflow-x-auto') as HTMLElement | null;
              if (scrollWrap) {
                scrollWrap.scrollLeft = 0;
              }
              const firstRow = el.querySelector('tbody tr:first-child');
              if (firstRow && firstRow.getBoundingClientRect().height > 0) {
                return firstRow;
              }
              const thead = el.querySelector('thead');
              if (thead && thead.getBoundingClientRect().height > 0) {
                return thead;
              }
            }
            return el;
          }
        } catch {}
      }

      // Fallback ที่ปลอดภัย — ห้าม fallback ไปที่ปุ่ม button.bg-primary โดยพลการ
      if (isSidebarStep) {
        return (
          document.querySelector('aside [data-sidebar-path]') ||
          document.querySelector('aside nav') ||
          document.querySelector('aside') ||
          document.body
        );
      } else {
        return (
          document.querySelector('main table') ||
          document.querySelector('main form') ||
          document.querySelector('main .bg-white') ||
          document.querySelector('main') ||
          document.body
        );
      }
    };

    // หน่วงเวลาเล็กน้อยเพื่อให้ DOM ของหน้าและ Sidebar render เสร็จสมบูรณ์
    const timer = setTimeout(() => {
      // แปลง subSteps ให้เป็น DriveStep ของ Driver.js
      const driveSteps: DriveStep[] = activeSubSteps.map((sub) => {
        return {
          element: () => resolveSubStepElement(sub),
          popover: {
            title: sub.title,
            description: sub.description,
            side: sub.side || 'bottom',
            align: sub.align || 'start',
          },
        };
      });

      if (driveSteps.length === 0) return;

      // ทำลาย instance เดิมก่อนเริ่มใหม่
      if (driverInstanceRef.current) {
        try {
          driverInstanceRef.current.destroy();
        } catch {}
        driverInstanceRef.current = null;
      }

      const totalSubSteps = driveSteps.length;

      const isSelectorVisible = (sel?: string): boolean => {
        if (!sel) return false;
        try {
          const el = document.querySelector(sel);
          return Boolean(el && (el.getBoundingClientRect().width > 0 || el.getBoundingClientRect().height > 0));
        } catch {
          return false;
        }
      };

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
          let nextIndex = activeIndex + 1;
          while (nextIndex < totalSubSteps) {
            const nextSub = activeSubSteps[nextIndex];
            if (nextSub?.skipIfMissing && !isSelectorVisible(nextSub.skipIfMissing)) {
              nextIndex++;
            } else {
              break;
            }
          }
          if (nextIndex < totalSubSteps) {
            driverObj.moveTo(nextIndex);
          } else {
            // จบสเต็ปบนหน้านี้แล้ว -> นำทางไปหน้าถัดไป
            try {
              sessionStorage.removeItem('hrms_wizard_goto_last');
              driverObj.destroy();
            } catch {}
            router.push(nextPageRoute);
          }
        },
        onDoneClick: () => {
          try {
            sessionStorage.removeItem('hrms_wizard_goto_last');
            driverObj.destroy();
          } catch {}
          router.push(nextPageRoute);
        },
        onPrevClick: () => {
          const activeIndex = driverObj.getActiveIndex() ?? 0;
          let prevIndex = activeIndex - 1;
          while (prevIndex >= 0) {
            const prevSub = activeSubSteps[prevIndex];
            if (prevSub?.skipIfMissing && !isSelectorVisible(prevSub.skipIfMissing)) {
              prevIndex--;
            } else {
              break;
            }
          }
          if (prevIndex >= 0) {
            driverObj.moveTo(prevIndex);
          } else {
            // อยู่ที่สเต็ปแรกของหน้านี้แล้ว -> นำทางกลับหน้าก่อนหน้า (เริ่มที่สเต็ปท้ายสุดของหน้านั้น)
            try {
              const prevUrl = new URL(prevPageRoute, window.location.origin);
              const prevTourKey = prevUrl.searchParams.get('tour');
              if (prevTourKey) {
                sessionStorage.setItem('hrms_wizard_goto_last', prevTourKey);
              }
            } catch {}
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
          const isLastSub = activeIndex === totalSubSteps - 1;
          const activeSub = activeSubSteps[activeIndex];

          // ปรับหัวข้อและคำอธิบายอัตโนมัติ หากปุ่มหลักไม่ได้แสดงสำหรับสิทธิ์ผู้ใช้งานนี้ (เช่น ฝ่ายการเงินไม่เห็นปุ่มคำนวณของ HR)
          if (activeSub?.fallbackWhenMissing) {
            try {
              const primaryEl = document.querySelector(activeSub.fallbackWhenMissing.primarySelector);
              const isPrimaryVisible =
                primaryEl && (primaryEl.getBoundingClientRect().width > 0 || primaryEl.getBoundingClientRect().height > 0);
              if (!isPrimaryVisible) {
                if (popover.title) popover.title.innerText = activeSub.fallbackWhenMissing.title;
                if (popover.description) popover.description.innerText = activeSub.fallbackWhenMissing.description;
              } else {
                if (popover.title) popover.title.innerText = activeSub.title;
                if (popover.description) popover.description.innerText = activeSub.description;
              }
            } catch {}
          }

          // ควบคุมปุ่ม ย้อนกลับ (ต้องปลด attribute disabled ที่ Driver.js ตั้งให้ step แรกเสมอ)
          if (popover.previousButton) {
            popover.previousButton.disabled = false;
            popover.previousButton.removeAttribute('disabled');
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

      let startIndex = 0;
      try {
        if (sessionStorage.getItem('hrms_wizard_goto_last') === tourParam) {
          sessionStorage.removeItem('hrms_wizard_goto_last');
          startIndex = Math.max(0, totalSubSteps - 1);
        }
      } catch {}

      driverInstanceRef.current = driverObj;
      driverObj.drive(startIndex);
    }, 450);

    // เฝ้าดูการเปลี่ยนแปลง DOM แบบเรียลไทม์ (เช่น กด "+ สร้างรอบเงินเดือน" แล้วปุ่ม "คำนวณเงินเดือน" ปรากฏขึ้นมา)
    let lastFallbackPrimaryVisible: boolean | null = null;
    const domStepObserver = new MutationObserver(() => {
      const driverObj = driverInstanceRef.current;
      if (!driverObj) return;
      const activeIndex = driverObj.getActiveIndex();
      if (activeIndex == null) return;
      const activeSub = activeSubSteps[activeIndex];
      if (!activeSub) return;

      // 1. หากอยู่สเต็ปที่รอให้ปุ่มถัดไปปรากฏ (เช่น กดสร้างรอบเสร็จแล้วปุ่มคำนวณเงินเดือนโผล่ขึ้นมา) ให้เลื่อนไปสเต็ปคำนวณเงินเดือนอัตโนมัติ
      if (activeSub.autoAdvanceWhenAppears) {
        try {
          const targetEl = document.querySelector(activeSub.autoAdvanceWhenAppears);
          if (targetEl && (targetEl.getBoundingClientRect().width > 0 || targetEl.getBoundingClientRect().height > 0)) {
            if (activeIndex + 1 < activeSubSteps.length) {
              driverObj.moveTo(activeIndex + 1);
              return;
            }
          }
        } catch {}
      }

      // 2. หากอยู่สเต็ปที่มี fallbackWhenMissing แล้วปุ่มหลักเพิ่งปรากฏขึ้นมาใน DOM ให้รีเฟรชการชี้เป้าไปยังปุ่มหลักทันที
      if (activeSub.fallbackWhenMissing) {
        try {
          const primaryEl = document.querySelector(activeSub.fallbackWhenMissing.primarySelector);
          const isVisible = Boolean(
            primaryEl && (primaryEl.getBoundingClientRect().width > 0 || primaryEl.getBoundingClientRect().height > 0)
          );
          if (lastFallbackPrimaryVisible === false && isVisible) {
            lastFallbackPrimaryVisible = true;
            driverObj.moveTo(activeIndex);
          } else {
            lastFallbackPrimaryVisible = isVisible;
          }
        } catch {}
      } else {
        lastFallbackPrimaryVisible = null;
      }
    });

    domStepObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      domStepObserver.disconnect();
      if (driverInstanceRef.current) {
        try {
          driverInstanceRef.current.destroy();
        } catch {}
        driverInstanceRef.current = null;
      }
    };
  }, [tourParam, router, pathname, user, isLoading]);

  return null;
}

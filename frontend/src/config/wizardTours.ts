import type { ElementType } from 'react';
import {
  Users,
  UserX,
  Wallet,
  Banknote,
  ShieldCheck,
  Clock,
  ArrowRightLeft,
  CalendarDays,
  ClipboardCheck,
  FileSpreadsheet,
  Building2,
} from 'lucide-react';

export interface WizardSubStep {
  title: string;
  description: string;
  selectors: string[];
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  skipIfMissing?: string;
  autoAdvanceWhenAppears?: string;
  fallbackWhenMissing?: {
    primarySelector: string;
    title: string;
    description: string;
  };
}

export interface WizardPageStep {
  pageTourKey: string;
  stepNumber: number;
  totalSteps: number;
  route: string;
  subSteps: WizardSubStep[];
}

export interface WizardFlowDef {
  id: string;
  title: string;
  icon: ElementType;
  requiredPayrollView?: 'HR' | 'FINANCE' | 'APPROVER' | 'BANK';
  pages: WizardPageStep[];
}

export const WIZARD_FLOWS: WizardFlowDef[] = [
  // ─── 1. เพิ่มพนักงานใหม่ ───────────────────────────────────────
  {
    id: 'hr-onboarding',
    title: 'เพิ่มพนักงานใหม่',
    icon: Users,
    pages: [
      {
        pageTourKey: 'hr-onboarding-1',
        stepNumber: 1,
        totalSteps: 3,
        route: '/employees?tour=hr-onboarding-1',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: จัดการพนักงาน',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "การจัดการบุคคล" ➔ "จัดการพนักงาน"',
            selectors: ['a[data-sidebar-path="/employees"]', '[data-sidebar-path="/employees"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 1: เพิ่มข้อมูลประวัติพนักงาน',
            description: 'คลิกปุ่ม "+ เพิ่มพนักงาน" เพื่อเปิดแบบฟอร์มบันทึกประวัติพนักงานใหม่ กรอกข้อมูลส่วนตัว สังกัดฝ่าย แผนก และตำแหน่งงาน หรือกด "ถัดไป" เพื่อทำสัญญาจ้าง',
            selectors: [
              '#tour-employee-add-btn',
              '#tour-emp-btn-add',
              '[data-tour="tour-employee-add-btn"]',
              'main button.bg-primary',
            ],
            side: 'bottom',
            align: 'end',
          },
        ],
      },
      {
        pageTourKey: 'hr-onboarding-2',
        stepNumber: 2,
        totalSteps: 3,
        route: '/employees/contracts?tour=hr-onboarding-2',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: สัญญาจ้าง',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "การจัดการบุคคล" ➔ "สัญญาจ้าง"',
            selectors: ['a[data-sidebar-path="/employees/contracts"]', '[data-sidebar-path="/employees/contracts"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 2: จัดทำสัญญาจ้างงาน',
            description: 'คลิกปุ่ม "+ สร้างสัญญาใหม่" เลือกพนักงานที่เพิ่งเพิ่ม กำหนดประเภทสัญญา วันเริ่มงาน ฐานเงินเดือน และแนบไฟล์สัญญา หรือกด "ถัดไป" เพื่อสร้างผู้ใช้',
            selectors: [
              '#tour-contract-add-btn',
              '#tour-contract-btn-add',
              '[data-tour="tour-contract-add-btn"]',
              'main button.bg-primary',
            ],
            side: 'bottom',
            align: 'end',
          },
        ],
      },
      {
        pageTourKey: 'hr-onboarding-3',
        stepNumber: 3,
        totalSteps: 3,
        route: '/settings?tab=users&tour=hr-onboarding-3',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: ผู้ใช้งาน',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "ระบบและการตั้งค่า" ➔ "ตั้งค่าระบบ" ➔ "ผู้ใช้งาน"',
            selectors: ['a[data-sidebar-path="/settings?tab=users"]', '[data-sidebar-path="/settings?tab=users"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 3: กำหนดบทบาทและสิทธิ์การใช้งาน',
            description: 'คลิกปุ่ม "+ เพิ่มผู้ใช้งาน" สร้างบัญชี กำหนดบทบาทสิทธิ์ (Role) และสร้างรหัสผ่านเริ่มต้นเพื่อให้พนักงานเข้าสู่ระบบ',
            selectors: [
              '#tour-user-add-btn',
              '#tour-user-btn-add',
              '[data-tour="tour-user-add-btn"]',
              'main button.bg-primary',
            ],
            side: 'bottom',
            align: 'end',
          },
        ],
      },
    ],
  },

  // ─── 2. การประมวลผลรอบเงินเดือนประจำเดือน (แยกตามบทบาท HR / การเงิน / ผู้บริหาร) ────
  {
    id: 'payroll-cycle-hr',
    title: 'การประมวลผลรอบเงินเดือนประจำเดือน (ฝ่ายบุคคล / HR)',
    icon: Wallet,
    requiredPayrollView: 'HR',
    pages: [
      {
        pageTourKey: 'payroll-cycle-hr-1',
        stepNumber: 1,
        totalSteps: 2,
        route: '/attendance/daily?tab=daily&tour=payroll-cycle-hr-1',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: ตรวจบันทึกเวลาประจำวัน',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "เวลาและการลา" ➔ "ตรวจบันทึกเวลา" ➔ "ตรวจบันทึกเวลาประจำวัน"',
            selectors: ['a[data-sidebar-path="/attendance/daily?tab=daily"]', '[data-sidebar-path="/attendance/daily?tab=daily"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 1: ตรวจสอบเวลาทำงาน ขาด ลา มาสาย และโอที',
            description: 'ตรวจสอบสรุปเวลาทำงานของพนักงานทุกคนในงวดนี้ และเช็คว่ามีรายการโอทีหรือขาดงานที่ต้องอนุมัติให้ครบถ้วนก่อนคำนวณเงินเดือน',
            selectors: ['main table', 'main .bg-white', 'main'],
            side: 'bottom',
            align: 'start',
          },
        ],
      },
      {
        pageTourKey: 'payroll-cycle-hr-2',
        stepNumber: 2,
        totalSteps: 2,
        route: '/payroll?tab=process&tour=payroll-cycle-hr-2&tourRole=HR',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: ประมวลเงินเดือน',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "การเงินและค่าตอบแทน" ➔ "เงินเดือน" ➔ "ประมวลเงินเดือน"',
            selectors: ['a[data-sidebar-path="/payroll?tab=process"]', '[data-sidebar-path="/payroll?tab=process"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 2: เลือกเดือนและปีของรอบเงินเดือน',
            description: 'เลือกเดือน (ที่มีข้อความ "ยังไม่มีรอบ") และปี พ.ศ. ที่ต้องการเปิดรอบเงินเดือนใหม่จากช่อง "รอบเงินเดือน" ด้านบนซ้าย',
            selectors: [
              '#tour-payroll-period-selector',
              '[data-tour="tour-payroll-period-selector"]',
              'main .bg-white',
              'main',
            ],
            side: 'bottom',
            align: 'start',
          },
          {
            title: 'ขั้นตอนที่ 3: สร้างรอบเงินเดือนประจำงวด',
            description: 'คลิกปุ่ม "+ สร้างรอบเงินเดือน" ด้านขวาบนเพื่อสร้างงวดเงินเดือนใหม่ เมื่อสร้างรอบสำเร็จระบบจะพาไปขั้นตอนกดคำนวณเงินเดือนทันที',
            selectors: [
              '#tour-payroll-create-btn',
              '[data-tour="tour-payroll-create-btn"]',
              '#tour-payroll-workflow-actions',
              '[data-tour="tour-payroll-workflow-actions"]',
              'main .bg-white',
              'main',
            ],
            side: 'bottom',
            align: 'end',
            autoAdvanceWhenAppears: '#tour-payroll-calc-btn',
          },
          {
            title: 'ขั้นตอนที่ 4: สั่งคำนวณเงินเดือนสุทธิ',
            description: 'หลังจากสร้างรอบเงินเดือนแล้ว ปุ่มสีเขียว "คำนวณเงินเดือน" จะแสดงขึ้นมา ให้คลิกเพื่อให้ระบบดึงเวลาทำงาน โอที สวัสดิการ ภาษี และประกันสังคมมาคำนวณยอดสุทธิ',
            selectors: [
              '#tour-payroll-calc-btn',
              '[data-tour="tour-payroll-calc-btn"]',
              '#tour-payroll-workflow-actions',
              '[data-tour="tour-payroll-workflow-actions"]',
              'main .bg-white',
              'main',
            ],
            side: 'bottom',
            align: 'end',
          },
          {
            title: 'ขั้นตอนที่ 5: ตรวจสลิปและส่งให้ฝ่ายการเงินตรวจสอบ',
            description: 'คลิกไอคอนรูปตา (ดูรายละเอียด) เพื่อตรวจดูตัวอย่างสลิปเงินเดือนของพนักงานแต่ละคน จากนั้นกดปุ่ม "ส่งให้ฝ่ายการเงินตรวจสอบ" ด้านบนเพื่อส่งต่อให้ฝ่ายการเงินดำเนินการต่อ',
            selectors: ['main table', 'main .bg-white', 'main'],
            side: 'bottom',
            align: 'center',
          },
        ],
      },
    ],
  },

  {
    id: 'payroll-cycle-finance',
    title: 'การตรวจสอบและจ่ายเงินเดือนประจำเดือน (ฝ่ายการเงิน)',
    icon: Banknote,
    requiredPayrollView: 'FINANCE',
    pages: [
      {
        pageTourKey: 'payroll-cycle-finance-1',
        stepNumber: 1,
        totalSteps: 1,
        route: '/payroll?tab=process&tour=payroll-cycle-finance-1&tourRole=FINANCE',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: ประมวลเงินเดือน',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "การเงินและค่าตอบแทน" ➔ "เงินเดือน" ➔ "ประมวลเงินเดือน"',
            selectors: ['a[data-sidebar-path="/payroll?tab=process"]', '[data-sidebar-path="/payroll?tab=process"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 1: เลือกเดือนและปีของรอบเงินเดือน',
            description: 'เลือกเดือนและปี พ.ศ. ของรอบเงินเดือนที่ฝ่ายบุคคล (HR) คำนวณและส่งมาให้ตรวจสอบจากช่อง "รอบเงินเดือน" ด้านบนซ้าย',
            selectors: [
              '#tour-payroll-period-selector',
              '[data-tour="tour-payroll-period-selector"]',
              'main .bg-white',
              'main',
            ],
            side: 'bottom',
            align: 'start',
          },
          {
            title: 'ขั้นตอนที่ 2: ตรวจสอบรายการเงินเดือนและสลิปพนักงาน',
            description: 'ตรวจสอบยอดรายได้รวม รายการหัก เงินเดือนสุทธิ ภาษี/ประกันสังคม และคลิกไอคอนรูปตา (ดูรายละเอียด) เพื่อตรวจทานสลิปของพนักงานแต่ละคน',
            selectors: ['main table', 'main .bg-white', 'main'],
            side: 'bottom',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 3: ยืนยันความถูกต้อง / โอนเงินและปิดรอบ',
            description: 'เมื่อ HR ส่งเรื่องมาแล้ว ปุ่มมุมขวาบนจะเปิดให้กด "การเงินยืนยันความถูกต้อง" (ส่งขออนุมัติจาก CEO) และเมื่อ CEO อนุมัติแล้ว ให้กดดาวน์โหลดไฟล์โอนเงินธนาคาร บันทึกว่าจ่ายแล้ว และปิดรอบเงินเดือน (หากขึ้น "รอ HR ส่งเรื่องให้การเงิน" แสดงว่า HR กำลังตรวจสอบและยังไม่ส่งต่อ)',
            selectors: [
              '#tour-payroll-workflow-actions',
              '[data-tour="tour-payroll-workflow-actions"]',
              'main .bg-white',
              'main',
            ],
            side: 'bottom',
            align: 'end',
          },
        ],
      },
    ],
  },

  {
    id: 'payroll-cycle-ceo',
    title: 'การอนุมัติรอบเงินเดือนประจำเดือน (ผู้บริหาร / CEO)',
    icon: ShieldCheck,
    requiredPayrollView: 'APPROVER',
    pages: [
      {
        pageTourKey: 'payroll-cycle-ceo-1',
        stepNumber: 1,
        totalSteps: 1,
        route: '/payroll?tab=process&tour=payroll-cycle-ceo-1&tourRole=APPROVER',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: ประมวลเงินเดือน',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "การเงินและค่าตอบแทน" ➔ "เงินเดือน" ➔ "ประมวลเงินเดือน"',
            selectors: ['a[data-sidebar-path="/payroll?tab=process"]', '[data-sidebar-path="/payroll?tab=process"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 1: เลือกเดือนและปีของรอบเงินเดือน',
            description: 'เลือกเดือนและปี พ.ศ. ของรอบเงินเดือนที่ฝ่ายการเงินตรวจสอบและส่งขออนุมัติมาจากช่อง "รอบเงินเดือน" ด้านบนซ้าย',
            selectors: [
              '#tour-payroll-period-selector',
              '[data-tour="tour-payroll-period-selector"]',
              'main .bg-white',
              'main',
            ],
            side: 'bottom',
            align: 'start',
          },
          {
            title: 'ขั้นตอนที่ 2: ตรวจสอบยอดรวมและรายการเงินเดือน',
            description: 'ตรวจสอบสรุปยอดจ่ายรวม ภาษี และเงินเดือนสุทธิของพนักงานแต่ละคน หากต้องการดูรายละเอียดสามารถคลิกไอคอนรูปตาด้านขวาได้',
            selectors: ['main table', 'main .bg-white', 'main'],
            side: 'bottom',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 3: อนุมัติรอบเงินเดือน (หรือส่งคืน HR แก้ไข)',
            description: 'เมื่อฝ่ายการเงินยืนยันความถูกต้องแล้ว ปุ่มมุมขวาบนจะเปิดให้กด "อนุมัติรอบเงินเดือน" เพื่อให้ฝ่ายการเงินนำไปจ่ายเงินและปิดรอบ หรือกด "ไม่อนุมัติ (ส่งคืน HR)" หากพบข้อผิดพลาด',
            selectors: [
              '#tour-payroll-workflow-actions',
              '[data-tour="tour-payroll-workflow-actions"]',
              'main .bg-white',
              'main',
            ],
            side: 'bottom',
            align: 'end',
          },
        ],
      },
    ],
  },

  {
    id: 'payroll-cycle-bank',
    title: 'การชำระเงิน โอนเงินธนาคาร และปิดรอบเงินเดือน (ขั้นตอนที่ 4)',
    icon: Banknote,
    requiredPayrollView: 'BANK',
    pages: [
      {
        pageTourKey: 'payroll-cycle-bank-1',
        stepNumber: 1,
        totalSteps: 1,
        route: '/payroll?tab=process&tour=payroll-cycle-bank-1&tourRole=BANK',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: ประมวลเงินเดือน (ขั้นที่ 4: ชำระเงิน)',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "การเงินและค่าตอบแทน" ➔ "เงินเดือน" ➔ "ประมวลเงินเดือน" แล้วเลือกขั้นตอนหมายเลข 4 (ชำระเงิน โอนเงินธนาคาร)',
            selectors: ['a[data-sidebar-path="/payroll?tab=process"]', '[data-sidebar-path="/payroll?tab=process"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 1: เลือกเดือน/ปี และขั้นตอน "4. ชำระเงิน"',
            description: 'เลือกรอบเดือนที่ CEO อนุมัติแล้วจากช่อง "รอบเงินเดือน" ด้านบนซ้าย และดูภาพรวมยอดโอน/จำนวนพนักงานที่มีบัญชีรับเงินในแท็บขั้นตอนที่ 4',
            selectors: [
              '#tour-payroll-step-BANK',
              '#tour-payroll-period-selector',
              'main .bg-white',
              'main',
            ],
            side: 'bottom',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 2: ดาวน์โหลดไฟล์โอนเงินธนาคาร',
            description: 'เมื่อ CEO อนุมัติรอบแล้ว ปุ่ม "↓ ไฟล์โอนเงินธนาคาร" มุมขวาบนจะเปิดให้กดดาวน์โหลดไฟล์สำหรับส่งเข้าธนาคาร (หากยังไม่สามารถกดได้ แสดงว่ารอบยังไม่ผ่านการอนุมัติจาก CEO)',
            selectors: [
              '#tour-payroll-workflow-actions',
              '[data-tour="tour-payroll-workflow-actions"]',
              'main .bg-white',
              'main',
            ],
            side: 'bottom',
            align: 'end',
          },
          {
            title: 'ขั้นตอนที่ 3: อัปโหลดสลิปการโอนเงิน / บันทึกโอนรายบุคคล',
            description: 'หลังธนาคารโอนเงินเสร็จ ให้แนบไฟล์สลิป/ใบเสร็จการโอนเงินรวมของธนาคาร หรือตรวจดูรายการโอนเงินรายบุคคลและบันทึกสลิปในตารางด้านล่าง',
            selectors: [
              '#tour-payroll-bank-receipt',
              'main table',
              '#tour-payroll-bank-summary',
              'main .bg-white',
              'main',
            ],
            side: 'bottom',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 4: บันทึกว่าจ่ายแล้วและปิดรอบเงินเดือน',
            description: 'เมื่อโอนเงินสำเร็จครบถ้วน ให้คลิกปุ่ม "บันทึกว่าจ่ายแล้ว" จากนั้นกด "ปิดรอบเงินเดือน" ที่มุมขวาบน เพื่อสิ้นสุดงวดและส่งสลิปเงินเดือนให้พนักงานดูในระบบ ESS',
            selectors: [
              '#tour-payroll-workflow-actions',
              '[data-tour="tour-payroll-workflow-actions"]',
              'main .bg-white',
              'main',
            ],
            side: 'bottom',
            align: 'end',
          },
        ],
      },
    ],
  },

  // ─── 3. การพ้นสภาพพนักงาน (ลาออก) ──────────────────────────────
  {
    id: 'offboarding',
    title: 'การพ้นสภาพพนักงาน (ลาออก)',
    icon: UserX,
    pages: [
      {
        pageTourKey: 'offboarding-1',
        stepNumber: 1,
        totalSteps: 3,
        route: '/documents/history?tour=offboarding-1',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: ประวัติเอกสาร (คำขอลาออก)',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "บริการตนเอง (ESS)" ➔ "ยื่นเอกสาร" ➔ "ประวัติเอกสาร"',
            selectors: ['a[data-sidebar-path="/documents/history"]', '[data-sidebar-path="/documents/history"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 1: ตรวจสอบและอนุมัติใบลาออก',
            description: 'คลิกปุ่มจุดสามจุด (⋮) ในแถวรายการคำขอลาออก เพื่อเปิดดูตัวอย่างหนังสือลาออก วันทำงานสุดท้าย และทำการตรวจสอบหรืออนุมัติเอกสาร',
            selectors: [
              '#tour-doc-action-resignation',
              '#tour-doc-action-btn',
              '[data-tour="tour-doc-action-resignation"]',
              '[data-tour="tour-doc-action-btn"]',
              'table tbody tr td:last-child button',
              'main table',
            ],
            side: 'left',
            align: 'center',
          },
        ],
      },
      {
        pageTourKey: 'offboarding-2',
        stepNumber: 2,
        totalSteps: 3,
        route: '/employees/contracts?tour=offboarding-2',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: สัญญาจ้าง',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "การจัดการบุคคล" ➔ "สัญญาจ้าง"',
            selectors: ['a[data-sidebar-path="/employees/contracts"]', '[data-sidebar-path="/employees/contracts"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 2: สิ้นสุดสัญญาจ้างงาน',
            description: 'ค้นหาพนักงานที่ลาออก และคลิกปุ่มจุดสามจุด (⋮) เพื่อปรับสถานะสัญญาเป็น "สิ้นสุดสัญญา" (Terminated) พร้อมบันทึกวันที่พ้นสภาพการเป็นพนักงาน',
            selectors: [
              '#tour-contract-action-btn',
              '[data-tour="tour-contract-action-btn"]',
              'table tbody tr td:last-child button',
              'main table',
            ],
            side: 'left',
            align: 'center',
          },
        ],
      },
      {
        pageTourKey: 'offboarding-3',
        stepNumber: 3,
        totalSteps: 3,
        route: '/settings?tab=users&tour=offboarding-3',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: ผู้ใช้งานและสิทธิ์',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "ระบบและการตั้งค่า" ➔ "ตั้งค่าระบบ" ➔ "ผู้ใช้งาน"',
            selectors: ['a[data-sidebar-path="/settings?tab=users"]', '[data-sidebar-path="/settings?tab=users"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 3: ระงับสิทธิ์เข้าใช้งานระบบ',
            description: 'ค้นหาบัญชีผู้ใช้ของพนักงานที่ลาออก แล้วคลิกปุ่มจุดสามจุด (⋮) ในคอลัมน์จัดการ เพื่อกด "ระงับการใช้งาน" (Deactivate) ระงับสิทธิ์เข้าถึงระบบขององค์กร',
            selectors: [
              '#tour-user-action-resignation',
              '#tour-user-action-btn',
              '[data-tour="tour-user-action-btn"]',
              'table tbody tr td:last-child button',
              'main table',
            ],
            side: 'left',
            align: 'center',
          },
        ],
      },
    ],
  },

  // ─── 4. การจัดตารางกะงานพนักงาน ─────────────────────────────────
  {
    id: 'shift-schedule',
    title: 'การจัดตารางกะงานพนักงาน',
    icon: Clock,
    pages: [
      {
        pageTourKey: 'shift-schedule-1',
        stepNumber: 1,
        totalSteps: 3,
        route: '/attendance/schedules?tab=shifts&tour=shift-schedule-1',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: กะการทำงาน',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "เวลาและการลา" ➔ "การจัดตารางงาน" ➔ "กะการทำงาน"',
            selectors: ['a[data-sidebar-path="/attendance/schedules?tab=shifts"]', '[data-sidebar-path="/attendance/schedules?tab=shifts"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 1: กำหนดรอบเวลาและรูปแบบกะการทำงาน',
            description: 'คลิกปุ่ม "+ เพิ่มกะการทำงานใหม่" กำหนดเวลาเริ่มงาน เวลาเลิกงาน ช่วงพักเบรก และเงื่อนไขการนับเวลาสาย',
            selectors: [
              '#tour-shift-add-btn',
              '[data-tour="tour-shift-add-btn"]',
              'main button.bg-primary',
              'main button',
              'main table',
              'main .bg-white',
              'main',
            ],
            side: 'bottom',
            align: 'end',
          },
        ],
      },
      {
        pageTourKey: 'shift-schedule-2',
        stepNumber: 2,
        totalSteps: 3,
        route: '/attendance/schedules?tab=roster&tour=shift-schedule-2',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: มอบหมายกะให้พนักงาน',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "เวลาและการลา" ➔ "การจัดตารางงาน" ➔ "มอบหมายกะให้พนักงาน"',
            selectors: ['a[data-sidebar-path="/attendance/schedules?tab=roster"]', '[data-sidebar-path="/attendance/schedules?tab=roster"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 2: จัดตารางกะงานให้กับพนักงานหรือรายแผนก',
            description: 'เลือกพนักงานหรือแผนกที่ต้องการ แล้วจัดตารางกะงานลงปฏิทินรายวันของเดือนนั้นๆ',
            selectors: ['main table', 'main .bg-white', 'main'],
            side: 'bottom',
            align: 'start',
          },
        ],
      },
      {
        pageTourKey: 'shift-schedule-3',
        stepNumber: 3,
        totalSteps: 3,
        route: '/attendance/daily?tab=daily&tour=shift-schedule-3',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: ตรวจบันทึกเวลาประจำวัน',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "เวลาและการลา" ➔ "ตรวจบันทึกเวลา" ➔ "ตรวจบันทึกเวลาประจำวัน"',
            selectors: ['a[data-sidebar-path="/attendance/daily?tab=daily"]', '[data-sidebar-path="/attendance/daily?tab=daily"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 3: ตรวจสอบการลงเวลาจริงเทียบกับกะงาน',
            description: 'ตรวจสอบว่าระบบดึงกะงานที่ตั้งไว้มาจับคู่กับเวลาสแกนนิ้วจริงของพนักงานถูกต้องเรียบร้อย',
            selectors: ['main table', 'main .bg-white', 'main'],
            side: 'bottom',
            align: 'start',
          },
        ],
      },
    ],
  },

  // ─── 5. การนำเข้าเวลาสแกนนิ้วและตรวจเช็คประจำวัน ───────────────
  {
    id: 'attendance-import',
    title: 'การนำเข้าเวลาสแกนนิ้วและตรวจเช็คประจำวัน',
    icon: FileSpreadsheet,
    pages: [
      {
        pageTourKey: 'attendance-import-1',
        stepNumber: 1,
        totalSteps: 2,
        route: '/attendance/daily?tab=import&tour=attendance-import-1',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: นำเข้าไฟล์บันทึกเวลา',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "เวลาและการลา" ➔ "ตรวจบันทึกเวลา" ➔ "นำเข้าไฟล์บันทึกเวลา"',
            selectors: ['a[data-sidebar-path="/attendance/daily?tab=import"]', '[data-sidebar-path="/attendance/daily?tab=import"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 1: อัปโหลดไฟล์เวลาสแกนนิ้วเข้าสู่ระบบ',
            description: 'เลือกไฟล์ Excel หรือ Text จากเครื่องสแกนลายนิ้วมือ ลากวางลงในกล่อง แล้วกด "ประมวลผลนำเข้าไฟล์"',
            selectors: ['main form', 'main .bg-white', 'main'],
            side: 'bottom',
            align: 'start',
          },
        ],
      },
      {
        pageTourKey: 'attendance-import-2',
        stepNumber: 2,
        totalSteps: 2,
        route: '/attendance/daily?tab=daily&tour=attendance-import-2',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: ตรวจบันทึกเวลาประจำวัน',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "เวลาและการลา" ➔ "ตรวจบันทึกเวลา" ➔ "ตรวจบันทึกเวลาประจำวัน"',
            selectors: ['a[data-sidebar-path="/attendance/daily?tab=daily"]', '[data-sidebar-path="/attendance/daily?tab=daily"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 2: ตรวจสอบผลการบันทึกเวลาประจำวัน',
            description: 'ตรวจสอบสถานะการมาทำงาน ยอดมาสาย และข้อผิดพลาดของการลงเวลา หรือกดดูรายละเอียดของแต่ละคน',
            selectors: ['main table', 'main .bg-white', 'main'],
            side: 'bottom',
            align: 'start',
          },
        ],
      },
    ],
  },

  // ─── 6. การโอนย้ายแผนกและปรับตำแหน่ง ───────────────────────────
  {
    id: 'transfer-flow',
    title: 'การโอนย้ายแผนกและปรับตำแหน่ง',
    icon: ArrowRightLeft,
    pages: [
      {
        pageTourKey: 'transfer-flow-1',
        stepNumber: 1,
        totalSteps: 3,
        route: '/employees/transfers?tour=transfer-flow-1',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: การย้ายแผนก/เลื่อนตำแหน่ง',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "การจัดการบุคคล" ➔ "พนักงาน" ➔ "การย้ายแผนก/เลื่อนตำแหน่ง"',
            selectors: ['a[data-sidebar-path="/employees/transfers"]', '[data-sidebar-path="/employees/transfers"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 1: บันทึกคำสั่งโอนย้ายและเลื่อนตำแหน่ง',
            description: 'คลิกปุ่ม "+ บันทึกคำสั่งโยกย้ายพนักงาน" ระบุพนักงาน แผนกใหม่ ตำแหน่งใหม่ และวันที่มีผลบังคับใช้',
            selectors: [
              '#tour-transfer-add-btn',
              '[data-tour="tour-transfer-add-btn"]',
              'main button.bg-primary',
              'main button',
              'main table',
              'main .bg-white',
              'main',
            ],
            side: 'bottom',
            align: 'end',
          },
        ],
      },
      {
        pageTourKey: 'transfer-flow-2',
        stepNumber: 2,
        totalSteps: 3,
        route: '/employees/contracts?tour=transfer-flow-2',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: สัญญาจ้าง',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "การจัดการบุคคล" ➔ "สัญญาจ้าง"',
            selectors: ['a[data-sidebar-path="/employees/contracts"]', '[data-sidebar-path="/employees/contracts"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 2: ปรับปรุงสัญญาจ้างงานและฐานเงินเดือนใหม่',
            description: 'ปรับปรุงสัญญาจ้างงาน อัปเดตตำแหน่งงาน และบันทึกฐานเงินเดือนใหม่ให้สอดคล้องกับตำแหน่งที่ได้รับแต่งตั้ง',
            selectors: [
              '#tour-contract-add-btn',
              '#tour-contract-btn-add',
              '[data-tour="tour-contract-add-btn"]',
              'main table',
              'main .bg-white',
              'main',
            ],
            side: 'bottom',
            align: 'end',
          },
        ],
      },
      {
        pageTourKey: 'transfer-flow-3',
        stepNumber: 3,
        totalSteps: 3,
        route: '/org-chart?tour=transfer-flow-3',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: แผนผังองค์กร',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "ภาพรวม" ➔ "แผนผังองค์กร"',
            selectors: ['a[data-sidebar-path="/org-chart"]', '[data-sidebar-path="/org-chart"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 3: ตรวจสอบและอัปเดตผังองค์กร',
            description: 'ตรวจสอบผังสายการบังคับบัญชา และยืนยันตำแหน่งหัวหน้าทีมคนใหม่ในโครงสร้างองค์กร',
            selectors: ['main svg', 'main .bg-white', 'main'],
            side: 'bottom',
            align: 'start',
          },
        ],
      },
    ],
  },

  // ─── 7. การตั้งค่าเริ่มต้นระบบการลาประจำปี ────────────────────
  {
    id: 'leave-setup',
    title: 'การตั้งค่าเริ่มต้นระบบการลาประจำปี',
    icon: CalendarDays,
    pages: [
      {
        pageTourKey: 'leave-setup-1',
        stepNumber: 1,
        totalSteps: 3,
        route: '/leave?tab=types&tour=leave-setup-1',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: ประเภทการลา',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "เวลาและการลา" ➔ "สิทธิ์การลา" ➔ "ประเภทการลา"',
            selectors: ['a[data-sidebar-path="/leave?tab=types"]', '[data-sidebar-path="/leave?tab=types"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 1: กำหนดประเภทการลาและสีประจำประเภท',
            description: 'ตรวจสอบหรือสร้างประเภทการลา เช่น ลาพักร้อน ลาป่วย ลากิจ พร้อมกำหนดเงื่อนไขและสีประจำประเภทวันลา',
            selectors: ['main button.bg-primary', 'main button', 'main table', 'main .bg-white', 'main'],
            side: 'bottom',
            align: 'start',
          },
        ],
      },
      {
        pageTourKey: 'leave-setup-2',
        stepNumber: 2,
        totalSteps: 3,
        route: '/work-calendar?tab=holidays&tour=leave-setup-2',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: วันหยุดประจำปี',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "เวลาและการลา" ➔ "วันทำงานและวันหยุด" ➔ "วันหยุดประจำปี"',
            selectors: ['a[data-sidebar-path="/work-calendar?tab=holidays"]', '[data-sidebar-path="/work-calendar?tab=holidays"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 2: กำหนดวันหยุดประจำปีของบริษัท',
            description: 'เพิ่มวันหยุดตามประเพณีและวันหยุดบริษัทประจำปี เพื่อป้องกันไม่ให้ระบบนับหักเป็นวันลาพนักงาน',
            selectors: ['main table', 'main .bg-white', 'main'],
            side: 'bottom',
            align: 'start',
          },
        ],
      },
      {
        pageTourKey: 'leave-setup-3',
        stepNumber: 3,
        totalSteps: 3,
        route: '/leave-balances?tour=leave-setup-3',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: ยอดวันลาคงเหลือ',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "บริการตนเอง (ESS)" ➔ "ยอดวันลาคงเหลือ"',
            selectors: ['a[data-sidebar-path="/leave-balances"]', '[data-sidebar-path="/leave-balances"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 3: ตรวจสอบและจัดสรรโควตาวันลาพนักงาน',
            description: 'ตรวจสอบยอดวันลาคงเหลือ โควตาประจำปี และปรับปรุงยอดวันลายกมาของพนักงานทุกคน',
            selectors: ['main .grid', 'main .bg-white', 'main'],
            side: 'bottom',
            align: 'start',
          },
        ],
      },
    ],
  },

  // ─── 8. การอนุมัติคำขอลาและตรวจผลกระทบต่อทีม ─────────────────
  {
    id: 'leave-approval',
    title: 'การอนุมัติคำขอลาและตรวจผลกระทบต่อทีม',
    icon: ClipboardCheck,
    pages: [
      {
        pageTourKey: 'leave-approval-1',
        stepNumber: 1,
        totalSteps: 2,
        route: '/approvals/leave-requests?tour=leave-approval-1',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: เอกสารรอดำเนินการ',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "การอนุมัติและรายงาน" ➔ "การอนุมัติ" ➔ "เอกสารรอดำเนินการ"',
            selectors: ['a[data-sidebar-path="/approvals/leave-requests"]', '[data-sidebar-path="/approvals/leave-requests"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 1: ตรวจสอบรายละเอียดและอนุมัติคำขอลา',
            description: 'ตรวจสอบรายละเอียดคำขอลา เหตุผล ยอดวันลาคงเหลือของพนักงาน และคลิกอนุมัติหรือปฏิเสธคำขอ',
            selectors: ['main table', 'main .bg-white', 'main'],
            side: 'bottom',
            align: 'start',
          },
        ],
      },
      {
        pageTourKey: 'leave-approval-2',
        stepNumber: 2,
        totalSteps: 2,
        route: '/team-leave-calendar?tour=leave-approval-2',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: ปฏิทินการลาของทีม',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "บริการตนเอง (ESS)" ➔ "ปฏิทินการลาของทีม"',
            selectors: ['a[data-sidebar-path="/team-leave-calendar"]', '[data-sidebar-path="/team-leave-calendar"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 2: ตรวจสอบปฏิทินกำลังคนของทีม',
            description: 'ดูปฏิทินภาพรวมของทีม เพื่อเช็คกำลังคนว่ามีคนลาหยุดชนกันจนส่งผลกระทบต่องานในวันนั้นหรือไม่',
            selectors: ['main table', 'main .bg-white', 'main'],
            side: 'bottom',
            align: 'start',
          },
        ],
      },
    ],
  },

  // ─── 9. การตั้งค่าระบบองค์กรสำหรับบริษัทใหม่ ─────────────────
  {
    id: 'company-setup',
    title: 'การตั้งค่าระบบองค์กรสำหรับบริษัทใหม่',
    icon: Building2,
    pages: [
      {
        pageTourKey: 'company-setup-1',
        stepNumber: 1,
        totalSteps: 4,
        route: '/organization?tab=divisions&tour=company-setup-1',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: โครงสร้างองค์กร (ฝ่าย)',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "การจัดการบุคคล" ➔ "โครงสร้างองค์กร" ➔ "จัดการฝ่าย"',
            selectors: ['a[data-sidebar-path="/organization?tab=divisions"]', '[data-sidebar-path="/organization?tab=divisions"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 1: ตั้งค่าโครงสร้างบริษัท แผนก ฝ่าย และตำแหน่ง',
            description: 'กำหนดรายชื่อฝ่าย แผนกงาน ทีม และตำแหน่งงานทั้งหมดตามโครงสร้างของบริษัท',
            selectors: ['main button.bg-primary', 'main button', 'main table', 'main .bg-white', 'main'],
            side: 'bottom',
            align: 'start',
          },
        ],
      },
      {
        pageTourKey: 'company-setup-2',
        stepNumber: 2,
        totalSteps: 4,
        route: '/work-calendar?tab=work-week&tour=company-setup-2',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: วันทำงานประจำสัปดาห์',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "เวลาและการลา" ➔ "วันทำงานและวันหยุด" ➔ "วันทำงานประจำสัปดาห์"',
            selectors: ['a[data-sidebar-path="/work-calendar?tab=work-week"]', '[data-sidebar-path="/work-calendar?tab=work-week"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 2: กำหนดวันทำงานปกติและวันหยุดประจำสัปดาห์',
            description: 'ตั้งค่าวันทำการปกติ เช่น จันทร์-ศุกร์ และวันหยุดประจำสัปดาห์ของบริษัท',
            selectors: ['main table', 'main .bg-white', 'main'],
            side: 'bottom',
            align: 'start',
          },
        ],
      },
      {
        pageTourKey: 'company-setup-3',
        stepNumber: 3,
        totalSteps: 4,
        route: '/leave?tab=policies&tour=company-setup-3',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: กำหนดสิทธิ์การลา',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "เวลาและการลา" ➔ "สิทธิ์การลา" ➔ "กำหนดสิทธิ์การลา"',
            selectors: ['a[data-sidebar-path="/leave?tab=policies"]', '[data-sidebar-path="/leave?tab=policies"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 3: กำหนดนโยบายและสิทธิ์การลา',
            description: 'กำหนดสิทธิ์วันลาตามอายุงาน เงื่อนไขการผ่านโปร และกฎการยกยอดวันลาไปปีถัดไป',
            selectors: ['main button.bg-primary', 'main button', 'main table', 'main .bg-white', 'main'],
            side: 'bottom',
            align: 'start',
          },
        ],
      },
      {
        pageTourKey: 'company-setup-4',
        stepNumber: 4,
        totalSteps: 4,
        route: '/settings?tab=approval-flows&tour=company-setup-4',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: สายการอนุมัติ',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "ระบบและการตั้งค่า" ➔ "ตั้งค่าระบบ" ➔ "สายการอนุมัติ"',
            selectors: ['a[data-sidebar-path="/settings?tab=approval-flows"]', '[data-sidebar-path="/settings?tab=approval-flows"]'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 4: ตั้งค่าสายการอนุมัติของแต่ละฝ่าย',
            description: 'คลิกปุ่ม "+ เพิ่มสายการอนุมัติ" เพื่อสร้างสายการอนุมัติใหม่สำหรับแต่ละแผนก หรือกำหนดลำดับขั้นผู้อนุมัติในการ์ดด้านล่าง และกดปุ่ม "เสร็จสิ้น"',
            selectors: [
              '#tour-add-approval-flow-btn',
              '[data-tour="add-approval-flow-btn"]',
              'main button.bg-primary',
              '#tour-approval-flow-card',
              '[data-tour="approval-flow-card"]',
              'main',
            ],
            side: 'bottom',
            align: 'end',
          },
        ],
      },
    ],
  },
];

// Helper: map pageTourKey to page context, prevRoute, and nextRoute
export interface PageTourContext {
  pageStep: WizardPageStep;
  flow: WizardFlowDef;
  prevPageRoute: string;
  nextPageRoute: string;
}

export const WIZARD_PAGE_LOOKUP: Record<string, PageTourContext> = {};

WIZARD_FLOWS.forEach((flow) => {
  flow.pages.forEach((page, idx) => {
    const prevPageRoute = idx > 0 ? flow.pages[idx - 1].route : '/guide';
    const nextPageRoute = idx < flow.pages.length - 1 ? flow.pages[idx + 1].route : '/guide?completed=1';
    WIZARD_PAGE_LOOKUP[page.pageTourKey] = {
      pageStep: page,
      flow,
      prevPageRoute,
      nextPageRoute,
    };
  });
});

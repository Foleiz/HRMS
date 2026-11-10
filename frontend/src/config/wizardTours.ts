import type { ElementType } from 'react';
import {
  Users,
  UserX,
  Wallet,
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
            selectors: ['[data-sidebar-path="/employees"]', 'aside'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 1: เพิ่มข้อมูลประวัติพนักงาน',
            description: 'คลิกปุ่ม "+ เพิ่มพนักงาน" เพื่อเปิดแบบฟอร์มบันทึกประวัติพนักงานใหม่ กรอกข้อมูลส่วนตัว สังกัดฝ่าย แผนก และตำแหน่งงาน หรือกด "ถัดไป" เพื่อทำสัญญาจ้าง',
            selectors: ['#tour-emp-btn-add', 'button', 'main'],
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
            selectors: ['[data-sidebar-path="/employees/contracts"]', 'aside'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 2: จัดทำสัญญาจ้างงาน',
            description: 'คลิกปุ่ม "+ สร้างสัญญาใหม่" เลือกพนักงานที่เพิ่งเพิ่ม กำหนดประเภทสัญญา วันเริ่มงาน ฐานเงินเดือน และแนบไฟล์สัญญา หรือกด "ถัดไป" เพื่อสร้างผู้ใช้',
            selectors: ['#tour-contract-btn-add', 'button', 'main table', 'main'],
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
            selectors: ['[data-sidebar-path="/settings?tab=users"]', 'aside'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 3: กำหนดบทบาทและสิทธิ์การใช้งาน',
            description: 'คลิกปุ่ม "+ เพิ่มผู้ใช้งาน" สร้างบัญชี กำหนดบทบาทสิทธิ์ (Role) และสร้างรหัสผ่านเริ่มต้นเพื่อให้พนักงานเข้าสู่ระบบ',
            selectors: ['#tour-user-btn-add', 'button', 'main table', 'main'],
            side: 'bottom',
            align: 'end',
          },
        ],
      },
    ],
  },

  // ─── 2. การประมวลผลรอบเงินเดือนประจำเดือน (ละเอียดเจาะลึก) ────
  {
    id: 'payroll-cycle',
    title: 'การประมวลผลรอบเงินเดือนประจำเดือน',
    icon: Wallet,
    pages: [
      {
        pageTourKey: 'payroll-cycle-1',
        stepNumber: 1,
        totalSteps: 4,
        route: '/attendance/daily?tab=daily&tour=payroll-cycle-1',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: ตรวจบันทึกเวลาประจำวัน',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "เวลาและการลา" ➔ "ตรวจบันทึกเวลา" ➔ "ตรวจบันทึกเวลาประจำวัน"',
            selectors: ['[data-sidebar-path="/attendance/daily?tab=daily"]', 'aside'],
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
        pageTourKey: 'payroll-cycle-2',
        stepNumber: 2,
        totalSteps: 4,
        route: '/benefits/balances?tour=payroll-cycle-2',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: สวัสดิการ',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "การจัดการบุคคล" ➔ "สวัสดิการ"',
            selectors: ['[data-sidebar-path="/benefits/balances"]', 'aside'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 2: ตรวจสอบยอดเบิกจ่ายสวัสดิการพนักงาน',
            description: 'ตรวจสอบรายการเบิกค่ารักษาพยาบาลและสวัสดิการพนักงานที่ได้รับการอนุมัติในรอบเดือน เพื่อนำไปจ่ายสมทบพร้อมเงินเดือน',
            selectors: ['main table', 'main .bg-white', 'main'],
            side: 'bottom',
            align: 'start',
          },
        ],
      },
      {
        pageTourKey: 'payroll-cycle-3',
        stepNumber: 3,
        totalSteps: 4,
        route: '/payroll?tab=periods&tour=payroll-cycle-3',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: รอบเงินเดือน',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "การเงินและค่าตอบแทน" ➔ "เงินเดือน" ➔ "รอบเงินเดือน"',
            selectors: ['[data-sidebar-path="/payroll?tab=periods"]', 'aside'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 3: ตรวจสอบและสร้างรอบเงินเดือนใหม่',
            description: 'ตรวจสอบรอบการจ่ายเงินเดือน (Payroll Period) เช่น งวดสิ้นเดือน กำหนดวันที่ตัดรอบเวลาทำงาน และวันที่จ่ายเงินเดือนจริง',
            selectors: ['button', 'main table', 'main .bg-white', 'main'],
            side: 'bottom',
            align: 'start',
          },
        ],
      },
      {
        pageTourKey: 'payroll-cycle-4',
        stepNumber: 4,
        totalSteps: 4,
        route: '/payroll?tab=process&tour=payroll-cycle-4',
        subSteps: [
          {
            title: 'ตำแหน่งเมนู: ประมวลเงินเดือน',
            description: 'เมนูนี้อยู่ที่แถบเมนูด้านซ้าย: หมวด "การเงินและค่าตอบแทน" ➔ "เงินเดือน" ➔ "ประมวลเงินเดือน"',
            selectors: ['[data-sidebar-path="/payroll?tab=process"]', 'aside'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 4: สั่งคำนวณเงินเดือนสุทธิ',
            description: 'คลิกปุ่ม "คำนวณเงินเดือน" ระบบจะดึงฐานเงินเดือน โอที เบี้ยเลี้ยง ภาษี ประกันสังคม และยอดหักมาคำนวณยอดสุทธิให้อัตโนมัติ',
            selectors: ['button', 'main .bg-white', 'main'],
            side: 'bottom',
            align: 'start',
          },
          {
            title: 'ขั้นตอนที่ 5: ตรวจสลิปเงินเดือนและยืนยันปิดงวด',
            description: 'คลิกตรวจดูตัวอย่างสลิปเงินเดือนของพนักงานแต่ละคน และกดยืนยันปิดงวดเพื่อส่งสลิปเงินเดือนให้พนักงานดูผ่านระบบ ESS',
            selectors: ['main table', 'main .bg-white', 'main'],
            side: 'top',
            align: 'start',
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
            selectors: ['[data-sidebar-path="/documents/history"]', 'aside'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 1: ตรวจสอบและอนุมัติใบลาออก',
            description: 'ตรวจสอบหนังสือขอลาออก วันทำงานสุดท้าย และเหตุผลการลาออกของพนักงาน หรือคลิกดูตัวอย่างเอกสารเพื่อตรวจสอบ',
            selectors: ['main table', 'main .bg-white', 'main'],
            side: 'bottom',
            align: 'start',
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
            selectors: ['[data-sidebar-path="/employees/contracts"]', 'aside'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 2: สิ้นสุดสัญญาจ้างงาน',
            description: 'ค้นหาพนักงานที่ลาออก และปรับสถานะสัญญาเป็น "สิ้นสุดสัญญา" (Terminated) พร้อมบันทึกวันที่พ้นสภาพการเป็นพนักงาน',
            selectors: ['#tour-contract-btn-add', 'main table', 'main .bg-white', 'main'],
            side: 'bottom',
            align: 'end',
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
            selectors: ['[data-sidebar-path="/settings?tab=users"]', 'aside'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 3: ระงับสิทธิ์เข้าใช้งานระบบ',
            description: 'ค้นหาบัญชีผู้ใช้ของพนักงานที่ลาออก แล้วกด "ปิดการใช้งาน" (Deactivate) เพื่อระงับสิทธิ์เข้าถึงระบบขององค์กร',
            selectors: ['#tour-user-btn-add', 'main table', 'main .bg-white', 'main'],
            side: 'bottom',
            align: 'end',
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
            selectors: ['[data-sidebar-path="/attendance/schedules?tab=shifts"]', 'aside'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 1: กำหนดรอบเวลาและรูปแบบกะการทำงาน',
            description: 'คลิก "+ สร้างกะใหม่" กำหนดเวลาเริ่มงาน เวลาเลิกงาน ช่วงพักเบรก และเงื่อนไขการนับเวลาสาย',
            selectors: ['button', 'main table', 'main .bg-white', 'main'],
            side: 'bottom',
            align: 'start',
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
            selectors: ['[data-sidebar-path="/attendance/schedules?tab=roster"]', 'aside'],
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
            selectors: ['[data-sidebar-path="/attendance/daily?tab=daily"]', 'aside'],
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
            selectors: ['[data-sidebar-path="/attendance/daily?tab=import"]', 'aside'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 1: อัปโหลดไฟล์เวลาสแกนนิ้วเข้าสู่ระบบ',
            description: 'เลือกไฟล์ Excel หรือ Text จากเครื่องสแกนลายนิ้วมือ ลากวางลงในกล่อง แล้วกด "ประมวลผลนำเข้าไฟล์"',
            selectors: ['form', 'main .bg-white', 'main'],
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
            selectors: ['[data-sidebar-path="/attendance/daily?tab=daily"]', 'aside'],
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
            selectors: ['[data-sidebar-path="/employees/transfers"]', 'aside'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 1: บันทึกคำสั่งโอนย้ายและเลื่อนตำแหน่ง',
            description: 'คลิก "+ บันทึกการโอนย้าย" ระบุพนักงาน แผนกใหม่ ตำแหน่งใหม่ และวันที่มีผลบังคับใช้',
            selectors: ['button', 'main table', 'main .bg-white', 'main'],
            side: 'bottom',
            align: 'start',
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
            selectors: ['[data-sidebar-path="/employees/contracts"]', 'aside'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 2: ปรับปรุงสัญญาจ้างงานและฐานเงินเดือนใหม่',
            description: 'ปรับปรุงสัญญาจ้างงาน อัปเดตตำแหน่งงาน และบันทึกฐานเงินเดือนใหม่ให้สอดคล้องกับตำแหน่งที่ได้รับแต่งตั้ง',
            selectors: ['#tour-contract-btn-add', 'main table', 'main .bg-white', 'main'],
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
            selectors: ['[data-sidebar-path="/org-chart"]', 'aside'],
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
            selectors: ['[data-sidebar-path="/leave?tab=types"]', 'aside'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 1: กำหนดประเภทการลาและสีประจำประเภท',
            description: 'ตรวจสอบหรือสร้างประเภทการลา เช่น ลาพักร้อน ลาป่วย ลากิจ พร้อมกำหนดเงื่อนไขและสีประจำประเภทวันลา',
            selectors: ['button', 'main table', 'main .bg-white', 'main'],
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
            selectors: ['[data-sidebar-path="/work-calendar?tab=holidays"]', 'aside'],
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
            selectors: ['[data-sidebar-path="/leave-balances"]', 'aside'],
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
            selectors: ['[data-sidebar-path="/approvals/leave-requests"]', 'aside'],
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
            selectors: ['[data-sidebar-path="/team-leave-calendar"]', 'aside'],
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
            selectors: ['[data-sidebar-path="/organization?tab=divisions"]', 'aside'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 1: ตั้งค่าโครงสร้างบริษัท แผนก ฝ่าย และตำแหน่ง',
            description: 'กำหนดรายชื่อฝ่าย แผนกงาน ทีม และตำแหน่งงานทั้งหมดตามโครงสร้างของบริษัท',
            selectors: ['button', 'main table', 'main .bg-white', 'main'],
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
            selectors: ['[data-sidebar-path="/work-calendar?tab=work-week"]', 'aside'],
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
            selectors: ['[data-sidebar-path="/leave?tab=policies"]', 'aside'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 3: กำหนดนโยบายและสิทธิ์การลา',
            description: 'กำหนดสิทธิ์วันลาตามอายุงาน เงื่อนไขการผ่านโปร และกฎการยกยอดวันลาไปปีถัดไป',
            selectors: ['button', 'main table', 'main .bg-white', 'main'],
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
            selectors: ['[data-sidebar-path="/settings?tab=approval-flows"]', 'aside'],
            side: 'right',
            align: 'center',
          },
          {
            title: 'ขั้นตอนที่ 4: ตั้งค่าสายการอนุมัติของแต่ละฝ่าย',
            description: 'กำหนดลำดับขั้นผู้อนุมัติเอกสารและคำขอลาของพนักงานในแต่ละแผนก หรือกดปุ่ม "เสร็จสิ้น"',
            selectors: ['main table', 'main .bg-white', 'main'],
            side: 'bottom',
            align: 'start',
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

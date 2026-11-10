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

export interface WizardStepDef {
  stepNumber: number;
  totalSteps: number;
  tourKey: string;
  title: string;
  description: string;
  route: string;
  selectors: string[];
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}

export interface WizardFlowDef {
  id: string;
  title: string;
  icon: ElementType;
  steps: WizardStepDef[];
}

export const WIZARD_FLOWS: WizardFlowDef[] = [
  {
    id: 'hr-onboarding',
    title: 'เพิ่มพนักงานใหม่',
    icon: Users,
    steps: [
      {
        stepNumber: 1,
        totalSteps: 3,
        tourKey: 'hr-onboarding-1',
        title: 'ขั้นตอนที่ 1: เพิ่มข้อมูลประวัติพนักงานใหม่',
        description: 'คลิกปุ่ม "+ เพิ่มพนักงาน" เพื่อเริ่มต้นบันทึกข้อมูลประวัติพนักงานใหม่เข้าสู่ระบบ หรือกดปุ่ม "ถัดไป" เพื่อไปยังเมนูสัญญาจ้าง',
        route: '/employees?tour=hr-onboarding-1',
        selectors: ['#tour-emp-btn-add', 'button', 'main table', 'main'],
        side: 'bottom',
        align: 'end',
      },
      {
        stepNumber: 2,
        totalSteps: 3,
        tourKey: 'hr-onboarding-2',
        title: 'ขั้นตอนที่ 2: เพิ่มสัญญาจ้างงาน',
        description: 'คลิกปุ่ม "+ สร้างสัญญาใหม่" เพื่อจัดทำสัญญาจ้างงานให้กับพนักงานใหม่ หรือกดปุ่ม "ถัดไป" เพื่อไปยังเมนูผู้ใช้งาน',
        route: '/employees/contracts?tour=hr-onboarding-2',
        selectors: ['#tour-contract-btn-add', 'button', 'main table', 'main'],
        side: 'bottom',
        align: 'end',
      },
      {
        stepNumber: 3,
        totalSteps: 3,
        tourKey: 'hr-onboarding-3',
        title: 'ขั้นตอนที่ 3: กำหนดบทบาทและสิทธิ์การใช้งาน',
        description: 'คลิกปุ่ม "+ เพิ่มผู้ใช้งาน" เพื่อสร้างบัญชีและกำหนดสิทธิ์เข้าถึงระบบให้กับพนักงานใหม่ หรือกดปุ่ม "เสร็จสิ้น"',
        route: '/settings?tab=users&tour=hr-onboarding-3',
        selectors: ['#tour-user-btn-add', 'button', 'main table', 'main'],
        side: 'bottom',
        align: 'end',
      },
    ],
  },
  {
    id: 'offboarding',
    title: 'การพ้นสภาพพนักงาน (ลาออก)',
    icon: UserX,
    steps: [
      {
        stepNumber: 1,
        totalSteps: 3,
        tourKey: 'offboarding-1',
        title: 'ขั้นตอนที่ 1: ตรวจสอบและยื่นใบลาออก',
        description: 'ตรวจสอบรายละเอียดการขอลาออก วันทำงานสุดท้าย และเหตุผลการลาออกของพนักงาน หรือกดปุ่ม "ถัดไป"',
        route: '/documents/resignation?tour=offboarding-1',
        selectors: ['form', 'main .bg-white', 'main'],
        side: 'bottom',
        align: 'start',
      },
      {
        stepNumber: 2,
        totalSteps: 3,
        tourKey: 'offboarding-2',
        title: 'ขั้นตอนที่ 2: สิ้นสุดสัญญาจ้างงาน',
        description: 'ตรวจสอบสัญญาจ้างของพนักงาน และปรับสถานะสัญญาเป็นสิ้นสุดการจ้างงาน (Terminated) หรือกดปุ่ม "ถัดไป"',
        route: '/employees/contracts?tour=offboarding-2',
        selectors: ['#tour-contract-btn-add', 'main table', 'main .bg-white', 'main'],
        side: 'bottom',
        align: 'end',
      },
      {
        stepNumber: 3,
        totalSteps: 3,
        tourKey: 'offboarding-3',
        title: 'ขั้นตอนที่ 3: ระงับสิทธิ์เข้าใช้งานระบบ',
        description: 'ปิดการใช้งานบัญชี (Deactivate) ของพนักงานที่ลาออก เพื่อความปลอดภัยของข้อมูลในองค์กร หรือกดปุ่ม "เสร็จสิ้น"',
        route: '/settings?tab=users&tour=offboarding-3',
        selectors: ['#tour-user-btn-add', 'main table', 'main .bg-white', 'main'],
        side: 'bottom',
        align: 'end',
      },
    ],
  },
  {
    id: 'payroll-cycle',
    title: 'การประมวลผลรอบเงินเดือนประจำเดือน',
    icon: Wallet,
    steps: [
      {
        stepNumber: 1,
        totalSteps: 3,
        tourKey: 'payroll-cycle-1',
        title: 'ขั้นตอนที่ 1: ตรวจสอบเวลาทำงาน ขาด ลา มาสาย และโอที',
        description: 'ตรวจสอบข้อมูลการลงเวลาทำงาน ขาด ลา มาสาย และชั่วโมงล่วงเวลาประจำงวด เพื่อเตรียมคำนวณเงินเดือน หรือกดปุ่ม "ถัดไป"',
        route: '/attendance/daily?tour=payroll-cycle-1',
        selectors: ['main table', 'main .bg-white', 'main'],
        side: 'bottom',
        align: 'start',
      },
      {
        stepNumber: 2,
        totalSteps: 3,
        tourKey: 'payroll-cycle-2',
        title: 'ขั้นตอนที่ 2: ตรวจสอบยอดเบิกจ่ายสวัสดิการพนักงาน',
        description: 'ตรวจสอบรายการเบิกค่ารักษาพยาบาลและสวัสดิการอื่นๆ ที่ได้รับการอนุมัติในรอบเดือน หรือกดปุ่ม "ถัดไป"',
        route: '/benefits/balances?tour=payroll-cycle-2',
        selectors: ['main table', 'main .bg-white', 'main'],
        side: 'bottom',
        align: 'start',
      },
      {
        stepNumber: 3,
        totalSteps: 3,
        tourKey: 'payroll-cycle-3',
        title: 'ขั้นตอนที่ 3: สั่งคำนวณและประมวลผลเงินเดือน',
        description: 'สร้างรอบการจ่ายเงินเดือน ตรวจสอบสลิป และสั่งอนุมัติประมวลผลเงินเดือนประจำงวด หรือกดปุ่ม "เสร็จสิ้น"',
        route: '/payroll?tour=payroll-cycle-3',
        selectors: ['button', 'main table', 'main .bg-white', 'main'],
        side: 'bottom',
        align: 'start',
      },
    ],
  },
  {
    id: 'shift-schedule',
    title: 'การจัดตารางกะงานพนักงาน',
    icon: Clock,
    steps: [
      {
        stepNumber: 1,
        totalSteps: 3,
        tourKey: 'shift-schedule-1',
        title: 'ขั้นตอนที่ 1: กำหนดรอบเวลาและรูปแบบกะการทำงาน',
        description: 'สร้างและตั้งค่ารอบเวลากะทำงาน เช่น กะเช้า กะบ่าย หรือเวลาเข้างานยืดหยุ่น หรือกดปุ่ม "ถัดไป"',
        route: '/attendance/shifts?tour=shift-schedule-1',
        selectors: ['button', 'main table', 'main .bg-white', 'main'],
        side: 'bottom',
        align: 'start',
      },
      {
        stepNumber: 2,
        totalSteps: 3,
        tourKey: 'shift-schedule-2',
        title: 'ขั้นตอนที่ 2: จัดตารางกะงานให้กับพนักงานหรือรายแผนก',
        description: 'มอบหมายกะงานให้กับพนักงานในแต่ละช่วงวันของเดือน หรือกดปุ่ม "ถัดไป"',
        route: '/attendance/schedules?tour=shift-schedule-2',
        selectors: ['main table', 'main .bg-white', 'main'],
        side: 'bottom',
        align: 'start',
      },
      {
        stepNumber: 3,
        totalSteps: 3,
        tourKey: 'shift-schedule-3',
        title: 'ขั้นตอนที่ 3: ตรวจสอบการลงเวลาจริงเทียบกับกะงาน',
        description: 'ตรวจสอบว่าระบบจับคู่เวลาสแกนเข้า-ออกงานตรงตามกะที่จัดไว้เรียบร้อย หรือกดปุ่ม "เสร็จสิ้น"',
        route: '/attendance/daily?tour=shift-schedule-3',
        selectors: ['main table', 'main .bg-white', 'main'],
        side: 'bottom',
        align: 'start',
      },
    ],
  },
  {
    id: 'transfer-flow',
    title: 'การโอนย้ายแผนกและปรับตำแหน่ง',
    icon: ArrowRightLeft,
    steps: [
      {
        stepNumber: 1,
        totalSteps: 3,
        tourKey: 'transfer-flow-1',
        title: 'ขั้นตอนที่ 1: บันทึกคำสั่งโอนย้ายและเลื่อนตำแหน่ง',
        description: 'สร้างรายการแต่งตั้ง โอนย้ายสังกัดแผนก หรือปรับตำแหน่งใหม่ของพนักงาน หรือกดปุ่ม "ถัดไป"',
        route: '/employees/transfers?tour=transfer-flow-1',
        selectors: ['button', 'main table', 'main .bg-white', 'main'],
        side: 'bottom',
        align: 'start',
      },
      {
        stepNumber: 2,
        totalSteps: 3,
        tourKey: 'transfer-flow-2',
        title: 'ขั้นตอนที่ 2: ปรับปรุงสัญญาจ้างงานและฐานเงินเดือนใหม่',
        description: 'อัปเดตสัญญาจ้างงานฉบับใหม่ให้ตรงกับตำแหน่งและผลตอบแทนที่ปรับปรุง หรือกดปุ่ม "ถัดไป"',
        route: '/employees/contracts?tour=transfer-flow-2',
        selectors: ['#tour-contract-btn-add', 'main table', 'main .bg-white', 'main'],
        side: 'bottom',
        align: 'end',
      },
      {
        stepNumber: 3,
        totalSteps: 3,
        tourKey: 'transfer-flow-3',
        title: 'ขั้นตอนที่ 3: ตรวจสอบและอัปเดตผังองค์กร',
        description: 'ตรวจสอบผังสายการบังคับบัญชา และยืนยันหัวหน้าทีมคนใหม่ในโครงสร้างองค์กร หรือกดปุ่ม "เสร็จสิ้น"',
        route: '/org-chart?tour=transfer-flow-3',
        selectors: ['main svg', 'main .bg-white', 'main'],
        side: 'bottom',
        align: 'start',
      },
    ],
  },
  {
    id: 'leave-setup',
    title: 'การตั้งค่าเริ่มต้นระบบการลาประจำปี',
    icon: CalendarDays,
    steps: [
      {
        stepNumber: 1,
        totalSteps: 3,
        tourKey: 'leave-setup-1',
        title: 'ขั้นตอนที่ 1: กำหนดประเภทการลาและนโยบายวันลา',
        description: 'ตั้งค่าสิทธิ์วันลาพักร้อน ลาป่วย และกฎเกณฑ์การสะสมวันลายกมา หรือกดปุ่ม "ถัดไป"',
        route: '/leave?tour=leave-setup-1',
        selectors: ['button', 'main table', 'main .bg-white', 'main'],
        side: 'bottom',
        align: 'start',
      },
      {
        stepNumber: 2,
        totalSteps: 3,
        tourKey: 'leave-setup-2',
        title: 'ขั้นตอนที่ 2: กำหนดวันหยุดประจำปีของบริษัท',
        description: 'ระบุวันหยุดนักขัตฤกษ์และวันหยุดพิเศษ เพื่อไม่ให้นับหักเป็นวันลาพนักงาน หรือกดปุ่ม "ถัดไป"',
        route: '/work-calendar?tour=leave-setup-2',
        selectors: ['main table', 'main .bg-white', 'main'],
        side: 'bottom',
        align: 'start',
      },
      {
        stepNumber: 3,
        totalSteps: 3,
        tourKey: 'leave-setup-3',
        title: 'ขั้นตอนที่ 3: ตรวจสอบและจัดสรรโควตาวันลาพนักงาน',
        description: 'ตรวจสอบยอดวันลาคงเหลือและโควตาประจำปีของพนักงานทุกคน หรือกดปุ่ม "เสร็จสิ้น"',
        route: '/leave-balances?tour=leave-setup-3',
        selectors: ['main .grid', 'main .bg-white', 'main'],
        side: 'bottom',
        align: 'start',
      },
    ],
  },
  {
    id: 'leave-approval',
    title: 'การอนุมัติคำขอลาและตรวจผลกระทบต่อทีม',
    icon: ClipboardCheck,
    steps: [
      {
        stepNumber: 1,
        totalSteps: 2,
        tourKey: 'leave-approval-1',
        title: 'ขั้นตอนที่ 1: ตรวจสอบและอนุมัติคำขอลา',
        description: 'ตรวจสอบรายละเอียดใบลา เหตุผล และยอดวันลาคงเหลือก่อนกดอนุมัติ หรือกดปุ่ม "ถัดไป"',
        route: '/approvals/leave-requests?tour=leave-approval-1',
        selectors: ['main table', 'main .bg-white', 'main'],
        side: 'bottom',
        align: 'start',
      },
      {
        stepNumber: 2,
        totalSteps: 2,
        tourKey: 'leave-approval-2',
        title: 'ขั้นตอนที่ 2: ตรวจสอบปฏิทินกำลังคนของทีม',
        description: 'เช็คภาพรวมทั้งทีมว่าในวันที่ลา มีสมาชิกคนอื่นลาหยุดชนกันหรือไม่ หรือกดปุ่ม "เสร็จสิ้น"',
        route: '/team-leave-calendar?tour=leave-approval-2',
        selectors: ['main table', 'main .bg-white', 'main'],
        side: 'bottom',
        align: 'start',
      },
    ],
  },
  {
    id: 'attendance-import',
    title: 'การนำเข้าเวลาสแกนนิ้วและตรวจเช็คประจำวัน',
    icon: FileSpreadsheet,
    steps: [
      {
        stepNumber: 1,
        totalSteps: 2,
        tourKey: 'attendance-import-1',
        title: 'ขั้นตอนที่ 1: อัปโหลดไฟล์เวลาสแกนนิ้วเข้าสู่ระบบ',
        description: 'นำเข้าไฟล์เวลาทำงานจากเครื่องสแกนลายนิ้วมือหรือ Excel เข้าระบบ หรือกดปุ่ม "ถัดไป"',
        route: '/attendance/import?tour=attendance-import-1',
        selectors: ['form', 'main .bg-white', 'main'],
        side: 'bottom',
        align: 'start',
      },
      {
        stepNumber: 2,
        totalSteps: 2,
        tourKey: 'attendance-import-2',
        title: 'ขั้นตอนที่ 2: ตรวจสอบผลการบันทึกเวลาประจำวัน',
        description: 'ตรวจสอบสถานะการมาทำงาน ยอดมาสาย และข้อผิดพลาดของการลงเวลา หรือกดปุ่ม "เสร็จสิ้น"',
        route: '/attendance/daily?tour=attendance-import-2',
        selectors: ['main table', 'main .bg-white', 'main'],
        side: 'bottom',
        align: 'start',
      },
    ],
  },
  {
    id: 'company-setup',
    title: 'การตั้งค่าระบบองค์กรสำหรับบริษัทใหม่',
    icon: Building2,
    steps: [
      {
        stepNumber: 1,
        totalSteps: 4,
        tourKey: 'company-setup-1',
        title: 'ขั้นตอนที่ 1: ตั้งค่าโครงสร้างบริษัท แผนก ฝ่าย และตำแหน่ง',
        description: 'กำหนดรายชื่อฝ่าย แผนกงาน และตำแหน่งงานทั้งหมดขององค์กร หรือกดปุ่ม "ถัดไป"',
        route: '/organization?tour=company-setup-1',
        selectors: ['button', 'main table', 'main .bg-white', 'main'],
        side: 'bottom',
        align: 'start',
      },
      {
        stepNumber: 2,
        totalSteps: 4,
        tourKey: 'company-setup-2',
        title: 'ขั้นตอนที่ 2: กำหนดปฏิทินวันทำงานและวันหยุดประจำปี',
        description: 'ตั้งค่าวันทำการปกติ วันหยุดสุดสัปดาห์ และวันหยุดนักขัตฤกษ์ หรือกดปุ่ม "ถัดไป"',
        route: '/work-calendar?tour=company-setup-2',
        selectors: ['main table', 'main .bg-white', 'main'],
        side: 'bottom',
        align: 'start',
      },
      {
        stepNumber: 3,
        totalSteps: 4,
        tourKey: 'company-setup-3',
        title: 'ขั้นตอนที่ 3: กำหนดนโยบายและประเภทวันลา',
        description: 'กำหนดสิทธิ์การลาประเภทต่างๆ เช่น พักร้อน ลาป่วย และลากิจ หรือกดปุ่ม "ถัดไป"',
        route: '/leave?tour=company-setup-3',
        selectors: ['button', 'main table', 'main .bg-white', 'main'],
        side: 'bottom',
        align: 'start',
      },
      {
        stepNumber: 4,
        totalSteps: 4,
        tourKey: 'company-setup-4',
        title: 'ขั้นตอนที่ 4: ตั้งค่าสายการอนุมัติของแต่ละฝ่าย',
        description: 'กำหนดลำดับขั้นผู้อนุมัติเอกสารและคำขอลาของพนักงานในแต่ละแผนก หรือกดปุ่ม "เสร็จสิ้น"',
        route: '/settings?tab=approval-flows&tour=company-setup-4',
        selectors: ['main table', 'main .bg-white', 'main'],
        side: 'bottom',
        align: 'start',
      },
    ],
  },
];

// Helper: map tourKey to step and its next/previous step
export interface StepContext {
  step: WizardStepDef;
  flow: WizardFlowDef;
  prevRoute: string;
  nextRoute: string;
}

export const WIZARD_STEP_LOOKUP: Record<string, StepContext> = {};

WIZARD_FLOWS.forEach((flow) => {
  flow.steps.forEach((step, idx) => {
    const prevRoute = idx > 0 ? flow.steps[idx - 1].route : '/guide';
    const nextRoute = idx < flow.steps.length - 1 ? flow.steps[idx + 1].route : '/guide?completed=1';
    WIZARD_STEP_LOOKUP[step.tourKey] = {
      step,
      flow,
      prevRoute,
      nextRoute,
    };
  });
});

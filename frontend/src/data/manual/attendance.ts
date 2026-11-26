import type { ManualArticle } from '@/types/manual';

export const ATTENDANCE_ARTICLES: ManualArticle[] = [
  {
    slug: 'ess-attendance',
    categoryId: 'attendance',
    title: 'บันทึกเวลาของฉัน (ตรวจบันทึกเวลา / คำขอปรับปรุงเวลา)',
    sidebarTitle: 'บันทึกเวลาของฉัน',
    summary:
      'ตรวจสอบประวัติการเข้า-ออกงานรายวันของตนเอง และยื่นคำขอปรับปรุงเวลาเมื่อลืมสแกนนิ้วหรือออกไปปฏิบัติงานนอกสถานที่',
    menuPath: 'เวลาการทำงาน ➔ บันทึกเวลาของฉัน',
    roles: ['EMPLOYEE', 'MANAGER', 'HR', 'FINANCE', 'EXECUTIVE', 'ADMIN'],
    keywords: ['บันทึกเวลาของฉัน', 'ตรวจบันทึกเวลา', 'คำขอปรับปรุงเวลา', 'ลืมสแกน', 'attendance'],
    actionHref: '/ess/attendance?tab=history',
    heroScreenshot: {
      src: '/images/manual/ess-attendance.png',
      alt: 'หน้าจอบันทึกเวลาของฉัน',
      caption: 'หน้าจอ “บันทึกเวลาของฉัน” แสดงประวัติเวลาเข้า-ออกงานและแท็บยื่นคำขอปรับปรุงเวลา',
    },
    sections: [
      {
        id: 'check-my-attendance',
        title: 'แท็บ 1: ตรวจบันทึกเวลาของฉัน',
        bullets: [
          'เลือกเดือน/ปีเพื่อดูเวลา Check-in / Check-out กะทำงาน และสถานะ (ปกติ / มาสาย / ขาดงาน / ลางาน)',
        ],
      },
      {
        id: 'attendance-adjustment',
        title: 'แท็บ 2: คำขอปรับปรุงเวลา',
        steps: [
          {
            title: 'สร้างคำขอปรับปรุงเวลา',
            description: 'สลับไปที่แท็บ “คำขอปรับปรุงเวลา” กดสร้างคำขอ เลือกวันที่ ระบุเวลาจริงและเหตุผล แล้วกดส่งเพื่อรอการอนุมัติ',
          },
        ],
      },
    ],
  },
  {
    slug: 'attendance-daily-import',
    categoryId: 'attendance',
    title: 'ตรวจบันทึกเวลา (ตรวจประจำวัน / นำเข้าไฟล์บันทึกเวลา)',
    sidebarTitle: 'ตรวจบันทึกเวลา',
    summary:
      'นำเข้าไฟล์สแกนนิ้วจากเครื่องบันทึกเวลา (Excel/CSV) และตรวจสอบเวลาเข้า-ออกงานประจำวันของพนักงานทั้งองค์กร',
    menuPath: 'เวลาการทำงาน ➔ ตรวจบันทึกเวลา',
    roles: ['HR', 'ADMIN'],
    keywords: ['ตรวจบันทึกเวลา', 'นำเข้าไฟล์บันทึกเวลา', 'สแกนนิ้ว', 'import', 'มาสาย', 'ขาดงาน'],
    actionHref: '/attendance/daily?tab=daily',
    relatedTourId: 'attendance-import',
    heroScreenshot: {
      src: '/images/manual/attendance-daily.png',
      alt: 'หน้าจอตรวจบันทึกเวลาประจำวัน',
      caption: 'หน้าจอ “ตรวจบันทึกเวลาประจำวัน” สำหรับตรวจสอบและนำเข้าข้อมูลเวลาทำงานพนักงาน',
    },
    sections: [
      {
        id: 'import-attendance',
        title: 'แท็บ นำเข้าไฟล์บันทึกเวลา',
        steps: [
          {
            title: 'อัปโหลดไฟล์จากเครื่องสแกน',
            description: 'เลือกไฟล์ .xlsx / .csv ระบบจะจับคู่รหัสเครื่องสแกน (Biometric ID) กับพนักงานให้อัตโนมัติ ตรวจสอบตัวอย่างแล้วกดยืนยันนำเข้า',
          },
        ],
      },
      {
        id: 'daily-review',
        title: 'แท็บ ตรวจบันทึกเวลาประจำวัน',
        bullets: [
          'กรองดูตามวันที่ แผนก หรือสถานะ (ปกติ / สาย / ขาด / ลา) โดยข้อมูลที่ยืนยันแล้วจะเชื่อมเข้าสู่การคำนวณเงินเดือนอัตโนมัติ',
        ],
      },
    ],
  },
  {
    slug: 'attendance-schedules-shifts',
    categoryId: 'attendance',
    title: 'การจัดตารางงาน (มอบหมายกะ / กะการทำงาน)',
    sidebarTitle: 'การจัดตารางงาน',
    summary:
      'สร้างและตั้งค่ากะการทำงาน (เวลาเข้า-ออก พักกลางวัน ช่วงผ่อนผันสาย) และมอบหมายกะให้พนักงานหรือแผนก',
    menuPath: 'เวลาการทำงาน ➔ การจัดตารางงาน',
    roles: ['HR', 'ADMIN'],
    keywords: ['การจัดตารางงาน', 'มอบหมายกะให้พนักงาน', 'กะการทำงาน', 'shift', 'roster'],
    actionHref: '/attendance/schedules?tab=roster',
    relatedTourId: 'shift-schedule',
    heroScreenshot: {
      src: '/images/manual/attendance-schedules.png',
      alt: 'หน้าจอการจัดตารางงานและมอบหมายกะ',
      caption: 'หน้าจอ “การจัดตารางงาน” สำหรับมอบหมายกะและตั้งค่ากะการทำงาน',
    },
    sections: [
      {
        id: 'shifts-and-roster',
        title: 'การตั้งค่ากะและการมอบหมายกะ',
        steps: [
          {
            title: 'ตั้งค่ากะการทำงาน (แท็บ กะการทำงาน)',
            description: 'กำหนดชื่อกะ เวลาเริ่มงาน-เลิกงาน เวลาพัก และระยะเวลาผ่อนผันการมาสาย',
          },
          {
            title: 'มอบหมายกะให้พนักงาน (แท็บ มอบหมายกะให้พนักงาน)',
            description: 'เลือกพนักงานหรือแผนก กำหนดกะการทำงานและวันที่มีผลบังคับใช้',
          },
        ],
      },
    ],
  },
  {
    slug: 'work-calendar',
    categoryId: 'attendance',
    title: 'วันทำงานและวันหยุด (วันทำงานประจำสัปดาห์ / วันหยุดประจำปี)',
    sidebarTitle: 'วันทำงานและวันหยุด',
    summary:
      'กำหนดวันทำงานมาตรฐานประจำสัปดาห์ของบริษัท และตั้งค่ารายการวันหยุดนักขัตฤกษ์ประจำปี',
    menuPath: 'เวลาการทำงาน ➔ วันทำงานและวันหยุด',
    roles: ['HR', 'ADMIN'],
    keywords: ['วันทำงานและวันหยุด', 'วันทำงานประจำสัปดาห์', 'วันหยุดประจำปี', 'work-calendar', 'holiday'],
    actionHref: '/work-calendar?tab=work-week',
    heroScreenshot: {
      src: '/images/manual/work-calendar.png',
      alt: 'หน้าจอวันทำงานและวันหยุดประจำปี',
      caption: 'หน้าจอ “วันทำงานและวันหยุด” สำหรับตั้งค่าวันทำงานประจำสัปดาห์และวันหยุดประจำปี',
    },
    sections: [
      {
        id: 'work-calendar-tabs',
        title: 'การตั้งค่าวันทำงานและวันหยุดประจำปี',
        bullets: [
          'วันทำงานประจำสัปดาห์: กำหนดวันทำงานมาตรฐาน (เช่น จันทร์–ศุกร์) และวันหยุดสุดสัปดาห์',
          'วันหยุดประจำปี: เพิ่ม/แก้ไขรายการวันหยุดนักขัตฤกษ์ในแต่ละปี เพื่อให้ระบบลาและระบบตรวจเวลาหักวันหยุดได้ถูกต้อง',
        ],
        callout: {
          type: 'warning',
          title: 'ข้อแนะนำ',
          content: 'ควรตั้งค่าวันหยุดประจำปีให้ครบตั้งแต่ต้นปี เพื่อให้พนักงานยื่นลาล่วงหน้าและระบบคำนวณวันลาได้อย่างแม่นยำ',
        },
      },
    ],
  },
];

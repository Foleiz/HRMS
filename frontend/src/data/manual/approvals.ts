import type { ManualArticle } from '@/types/manual';

export const APPROVALS_ARTICLES: ManualArticle[] = [
  {
    slug: 'approvals-pending',
    categoryId: 'approvals',
    title: 'เอกสารรอดำเนินการ',
    summary:
      'ศูนย์รวมคำขอทุกประเภทที่รอการพิจารณา (ใบลา, คำขอปรับปรุงเวลา, เอกสารรับรอง/ทั่วไป/ลาออก, เบิกสวัสดิการ) สำหรับหัวหน้างาน ฝ่ายบุคคล และผู้บริหาร',
    menuPath: 'การอนุมัติ ➔ เอกสารรอดำเนินการ',
    roles: ['MANAGER', 'HR', 'EXECUTIVE', 'ADMIN'],
    keywords: ['เอกสารรอดำเนินการ', 'อนุมัติ', 'ไม่อนุมัติ', 'ใบลา', 'ปรับเวลา', 'approvals'],
    actionHref: '/approvals/leave-requests',
    relatedTourId: 'leave-approval',
    heroScreenshot: {
      src: '/images/manual/approvals.png',
      alt: 'หน้าจอเอกสารรอดำเนินการอนุมัติ',
      caption: 'หน้าจอ “เอกสารรอดำเนินการ” แสดงรายการคำขอที่รอพิจารณาพร้อมปุ่มอนุมัติ/ไม่อนุมัติ',
    },
    sections: [
      {
        id: 'approve-steps',
        title: 'ขั้นตอนการพิจารณาอนุมัติคำขอ',
        steps: [
          {
            title: 'เลือกแท็บประเภทคำขอที่รอพิจารณา',
            description: 'เปิดเมนู การอนุมัติ ➔ เอกสารรอดำเนินการ เลือกแท็บคำขอลา, ปรับปรุงเวลา, เอกสาร หรือเบิกสวัสดิการ',
          },
          {
            title: 'ตรวจสอบรายละเอียดและกด “อนุมัติ” หรือ “ไม่อนุมัติ”',
            description: 'ตรวจวันที่ เหตุผล เอกสารแนบ แล้วกดอนุมัติ (หรือระบุเหตุผลหากไม่อนุมัติ) ระบบจะส่งต่อไปยังผู้อนุมัติขั้นถัดไปหรือมีผลทันที',
          },
        ],
      },
    ],
  },
  {
    slug: 'approvals-history',
    categoryId: 'approvals',
    title: 'ประวัติเอกสาร (การอนุมัติ)',
    sidebarTitle: 'ประวัติเอกสาร',
    summary:
      'ตรวจสอบย้อนหลังรายการเอกสารทั้งหมดที่เคยพิจารณาอนุมัติหรือไม่อนุมัติ พร้อมสถานะปัจจุบันและบันทึกความเห็น',
    menuPath: 'การอนุมัติ ➔ ประวัติเอกสาร',
    roles: ['MANAGER', 'HR', 'EXECUTIVE', 'ADMIN'],
    keywords: ['ประวัติเอกสาร', 'ประวัติการอนุมัติ', 'approvals/history'],
    actionHref: '/approvals/history',
    heroScreenshot: {
      src: '/images/manual/approvals.png',
      alt: 'ประวัติการอนุมัติเอกสาร',
      caption: 'ตรวจสอบประวัติคำขอที่เคยพิจารณาไปแล้วในเมนู การอนุมัติ ➔ ประวัติเอกสาร',
    },
    sections: [
      {
        id: 'approval-history',
        title: 'การค้นหาประวัติการอนุมัติ',
        bullets: [
          'ค้นหาตามชื่อพนักงาน ประเภทเอกสาร สถานะ หรือช่วงวันที่ เพื่อตรวจสอบหลักฐานการอนุมัติย้อนหลังได้ตลอดเวลา',
        ],
      },
    ],
  },
];

'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Thermometer, Briefcase, Sun, LogOut, FileText, ArrowRight, Clock } from 'lucide-react';
import { DocumentsSubNav } from '@/components/documents/DocumentsSubNav';
import { useBreadcrumb } from '@/context/BreadcrumbContext';

interface DocumentOption {
  title: string;
  description: string;
  href: string;
  /** ไอคอนที่แสดงกลางการ์ด (เอกสารการลาแสดง 3 ไอคอน: ป่วย / กิจ / พักร้อน) */
  icons: React.ComponentType<{ className?: string }>[];
  available: boolean;
}

const DOCUMENT_OPTIONS: DocumentOption[] = [
  {
    title: 'ยื่นคำขอลา',
    description: 'ลาป่วย ลากิจ ลาพักร้อน และการลาประเภทอื่น ๆ พร้อมแนบเอกสารประกอบ',
    href: '/documents/leave',
    icons: [Thermometer, Briefcase, Sun],
    available: true,
  },
  {
    title: 'ยื่นคำขอลาออก',
    description: 'แจ้งความประสงค์ลาออก ระบุวันทำงานสุดท้ายและรายการส่งมอบงาน',
    href: '/documents/resignation',
    icons: [LogOut],
    available: true,
  },
  {
    title: 'คำร้องเอกสารทั่วไป',
    description: 'ยื่นคำร้องขอเอกสารหรือเรื่องอื่น ๆ ที่ไม่เข้าประเภทข้างต้น',
    href: '/documents/general',
    icons: [FileText],
    available: true,
  },
  {
    title: 'ขอหนังสือรับรอง',
    description: 'ขอหนังสือรับรองเงินเดือนหรือหนังสือรับรองการทำงาน พร้อมลายเซ็นดิจิทัล',
    href: '/documents/certificate',
    icons: [FileText],
    available: true,
  },
];

export default function DocumentsHubPage() {
  const { setBreadcrumb } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumb({ section: 'ยื่นเอกสาร', page: 'รายการเอกสาร' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  return (
    <div className="space-y-6 pb-12">
      {/* เมนูย่อยในตัว — สลับไปมาระหว่าง "รายการเอกสาร" กับ "ประวัติเอกสาร" เหมือนเมนู "พนักงาน" */}
      <DocumentsSubNav />

      {/* Page Header */}
      <div>
        <p className="text-sm text-gray-500">เลือกประเภทคำขอที่ต้องการยื่นให้ฝ่ายบุคคลพิจารณา</p>
      </div>

      {/* Option Cards — ตาราง 2 x 2 กึ่งกลางหน้า: ชื่อเอกสาร / ไอคอน / ปุ่มถัดไป */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {DOCUMENT_OPTIONS.map((opt) => {
          const card = (
            <div
              title={opt.description}
              className={`relative h-full bg-white rounded-2xl border-2 border-[#0B2046] px-6 py-8 flex flex-col items-center justify-between gap-6 text-center transition-all ${
                opt.available ? 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer' : 'opacity-70 cursor-not-allowed'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <h3 className="text-2xl font-bold text-gray-900">{opt.title}</h3>
                {!opt.available && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-gray-100 text-gray-500">
                    <Clock className="w-3 h-3" /> เร็ว ๆ นี้
                  </span>
                )}
              </div>
              <div className="flex items-center justify-center gap-6 text-gray-900">
                {opt.icons.map((Icon, i) => (
                  <Icon key={i} className="w-9 h-9" />
                ))}
              </div>
              <span className="inline-flex items-center gap-4 px-7 py-2.5 rounded-xl bg-[#0B2046] text-white text-lg font-semibold">
                ถัดไป
                <ArrowRight className="w-6 h-6" />
              </span>
            </div>
          );

          return opt.available ? (
            <Link key={opt.href} href={opt.href} className="block h-full">
              {card}
            </Link>
          ) : (
            <div key={opt.href}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}

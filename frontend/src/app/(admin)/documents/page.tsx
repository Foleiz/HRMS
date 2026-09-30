'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Thermometer, Briefcase, Sun, LogOut, FileText, BadgeCheck, ArrowRight, Clock } from 'lucide-react';
import { DocumentsSubNav } from '@/components/documents/DocumentsSubNav';
import { useBreadcrumb } from '@/context/BreadcrumbContext';

interface DocumentOption {
  title: string;
  description: string;
  href: string;
  /** ไอคอนที่แสดงกลางการ์ด (เอกสารการลาแสดง 3 ไอคอน: ป่วย / กิจ / พักร้อน) */
  icons: React.ComponentType<{ className?: string }>[];
  /** สีไอคอน/พื้นหลังไอคอน ตามโทนสีของระบบ */
  color: string;
  bg: string;
  available: boolean;
}

const DOCUMENT_OPTIONS: DocumentOption[] = [
  {
    title: 'ยื่นคำขอลา',
    description: 'ลาป่วย ลากิจ ลาพักร้อน และการลาประเภทอื่น ๆ พร้อมแนบเอกสารประกอบ',
    href: '/documents/leave',
    icons: [Thermometer, Briefcase, Sun],
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    available: true,
  },
  {
    title: 'ยื่นคำขอลาออก',
    description: 'แจ้งความประสงค์ลาออก ระบุวันทำงานสุดท้ายและรายการส่งมอบงาน',
    href: '/documents/resignation',
    icons: [LogOut],
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    available: true,
  },
  {
    title: 'ยื่นคำขอเอกสารทั่วไป',
    description: 'ยื่นคำร้องขอเอกสารหรือเรื่องอื่น ๆ ที่ไม่เข้าประเภทข้างต้น',
    href: '/documents/general',
    icons: [FileText],
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    available: true,
  },
  {
    title: 'ขอหนังสือรับรอง',
    description: 'ขอหนังสือรับรองเงินเดือนหรือหนังสือรับรองการทำงาน พร้อมลายเซ็นดิจิทัล',
    href: '/documents/certificate',
    icons: [BadgeCheck],
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
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

      {/* Option Cards — ตาราง 2 x 2 เต็มความกว้างของเนื้อหา (ชิดแนวเดียวกับแถบเมนูด้านบน): ชื่อเอกสาร / ไอคอน / ปุ่มถัดไป (สไตล์การ์ดเดียวกับทั้งระบบ) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {DOCUMENT_OPTIONS.map((opt) => {
          const card = (
            <div
              className={`group relative h-full bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col items-center justify-between gap-5 text-center transition-all ${
                opt.available ? 'hover:shadow-md hover:border-slate-300 cursor-pointer' : 'opacity-70 cursor-not-allowed'
              }`}
            >
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-800">{opt.title}</h3>
                  {!opt.available && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-gray-100 text-gray-500">
                      <Clock className="w-3 h-3" /> เร็ว ๆ นี้
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm min-h-[2.5rem] line-clamp-2">{opt.description}</p>
              </div>
              <div className="flex items-center justify-center gap-3">
                {opt.icons.map((Icon, i) => (
                  <div key={i} className={`w-12 h-12 rounded-xl ${opt.bg} ${opt.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6" />
                  </div>
                ))}
              </div>
              <span className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#0B2046] group-hover:bg-[#081836] text-white text-xs font-semibold shadow-md shadow-[#0B2046]/20 transition-colors">
                ถัดไป
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
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

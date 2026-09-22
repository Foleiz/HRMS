'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { CalendarCheck, LogOut, FileStack, BadgeCheck, ArrowRight, Clock } from 'lucide-react';
import { DocumentsSubNav } from '@/components/documents/DocumentsSubNav';
import { useBreadcrumb } from '@/context/BreadcrumbContext';

interface DocumentOption {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  available: boolean;
}

const DOCUMENT_OPTIONS: DocumentOption[] = [
  {
    title: 'ยื่นคำขอลา',
    description: 'ลาป่วย ลากิจ ลาพักร้อน และการลาประเภทอื่น ๆ พร้อมแนบเอกสารประกอบ',
    href: '/documents/leave',
    icon: CalendarCheck,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    available: true,
  },
  {
    title: 'ยื่นคำขอลาออก',
    description: 'แจ้งความประสงค์ลาออก ระบุวันทำงานสุดท้ายและรายการส่งมอบงาน',
    href: '/documents/resignation',
    icon: LogOut,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    available: true,
  },
  {
    title: 'คำร้องเอกสารทั่วไป',
    description: 'ยื่นคำร้องขอเอกสารหรือเรื่องอื่น ๆ ที่ไม่เข้าประเภทข้างต้น',
    href: '/documents/general',
    icon: FileStack,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    available: true,
  },
  {
    title: 'ขอหนังสือรับรอง',
    description: 'ขอหนังสือรับรองเงินเดือนหรือหนังสือรับรองการทำงาน พร้อมลายเซ็นดิจิทัล',
    href: '/documents/certificate',
    icon: BadgeCheck,
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

      {/* Option Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {DOCUMENT_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const card = (
            <div
              className={`relative h-full bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4 transition-all ${
                opt.available ? 'hover:shadow-md hover:border-gray-200 cursor-pointer' : 'opacity-70 cursor-not-allowed'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl ${opt.bg} ${opt.color} flex items-center justify-center shrink-0`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{opt.title}</h3>
                  {!opt.available && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-gray-100 text-gray-500">
                      <Clock className="w-3 h-3" /> เร็ว ๆ นี้
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{opt.description}</p>
              </div>
              {opt.available && <ArrowRight className="w-5 h-5 text-gray-300 shrink-0 mt-1" />}
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

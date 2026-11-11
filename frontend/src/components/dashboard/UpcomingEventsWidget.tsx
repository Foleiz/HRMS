'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, ChevronRight } from 'lucide-react';
import { announcementService } from '@/services/announcementService';
import { Announcement } from '@/types/announcement';

interface EventItem {
  id: number | string;
  date: string;
  title: string;
}

export const UpcomingEventsWidget: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadUpcomingEvents = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const todayStr = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        // ดึงเฉพาะประกาศกิจกรรม (category: 'ACTIVITY') เท่านั้น ไม่นำวันหยุดมาแสดง
        const res = await announcementService.getAnnouncements({
          category: 'ACTIVITY',
          pageSize: 100,
        });

        const list: Announcement[] = res?.items || [];

        // กรองเฉพาะกิจกรรมที่เผยแพร่แล้ว (ไม่รวม DRAFT) และยังไม่สิ้นสุด (วันสิ้นสุด >= วันนี้)
        const upcoming = list.filter((act) => {
          if (act.status === 'DRAFT') return false;
          const startStr = act.publishedAt || act.createdAt;
          if (!startStr) return false;
          const startDateOnly = startStr.substring(0, 10);
          const endDateOnly = act.expireAt ? act.expireAt.substring(0, 10) : startDateOnly;
          return endDateOnly >= todayStr;
        });

        // เรียงลำดับจากวันที่จัดใกล้ที่สุดไปไกลที่สุด
        upcoming.sort((a, b) => {
          const dateA = a.publishedAt || a.createdAt || '';
          const dateB = b.publishedAt || b.createdAt || '';
          return dateA.localeCompare(dateB);
        });

        const formatted: EventItem[] = upcoming.slice(0, 4).map((act) => {
          const startStr = act.publishedAt || act.createdAt || '';
          const d = new Date(startStr);

          const dateStr = d.toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'long',
          });

          return {
            id: act.id,
            date: dateStr,
            title: act.title,
          };
        });

        if (isMounted) {
          setEvents(formatted);
        }
      } catch (err) {
        console.error('Failed to load upcoming activity announcements:', err);
        if (isMounted) {
          setEvents([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUpcomingEvents();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs flex flex-col justify-between h-full min-h-[170px]">
      <div>
        {/* หัวข้อ: กำหนด whitespace-nowrap และ gap เพื่อป้องกันข้อความตกบรรทัดผิดตำแหน่ง */}
        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-3.5 flex items-center justify-between gap-2">
          <span className="whitespace-nowrap">กิจกรรมที่กำลังจะมาถึง</span>
          <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0">
            ประกาศกิจกรรม
          </span>
        </h3>

        {loading ? (
          <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
            กำลังโหลดกิจกรรม...
          </div>
        ) : events.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
            ยังไม่มีประกาศกิจกรรมที่กำลังจะมาถึง
          </div>
        ) : (
          <div className="space-y-2.5">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2 py-0.5"
              >
                <span className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap min-w-[92px] shrink-0">
                  {ev.date}
                </span>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span
                  className="text-slate-600 dark:text-slate-400 truncate flex-1"
                  title={ev.title}
                >
                  {ev.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link
        href="/announcements"
        className="pt-2 text-[11px] text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-300 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between mt-auto transition-colors cursor-pointer group"
      >
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-primary dark:hover:text-blue-300 transition-colors" />
          <span>ปฏิทินกิจกรรมองค์กร</span>
        </div>
        <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-500 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  );
};

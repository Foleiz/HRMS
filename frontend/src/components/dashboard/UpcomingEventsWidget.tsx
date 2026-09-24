'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, ChevronRight } from 'lucide-react';
import { workCalendarService } from '@/services/workCalendarService';
import { Holiday } from '@/types/workCalendar';

interface EventItem {
  id: number | string;
  date: string;
  title: string;
  type?: string;
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

        // ดึงวันหยุดและกิจกรรมประจำปีปัจจุบัน และปีถัดไปเพื่อความต่อเนื่อง
        const [thisYearHolidays, nextYearHolidays] = await Promise.allSettled([
          workCalendarService.getHolidays(currentYear),
          workCalendarService.getHolidays(currentYear + 1),
        ]);

        const allHolidays: Holiday[] = [];
        if (thisYearHolidays.status === 'fulfilled' && Array.isArray(thisYearHolidays.value)) {
          allHolidays.push(...thisYearHolidays.value);
        }
        if (nextYearHolidays.status === 'fulfilled' && Array.isArray(nextYearHolidays.value)) {
          allHolidays.push(...nextYearHolidays.value);
        }

        // กรองเฉพาะรายการที่วันที่ >= วันนี้ (Upcoming จริง ไม่นำอดีตมาแสดง)
        const upcoming = allHolidays
          .filter((h) => h.holidayDate >= todayStr)
          .sort((a, b) => a.holidayDate.localeCompare(b.holidayDate));

        const formatted: EventItem[] = upcoming.slice(0, 4).map((h) => {
          const parts = h.holidayDate.split('-');
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const d = new Date(year, month, day);

          const dateStr = d.toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'long',
          });

          return {
            id: h.id,
            date: dateStr,
            title: h.holidayName,
            type: h.holidayType,
          };
        });

        if (isMounted) {
          setEvents(formatted);
        }
      } catch (err) {
        console.error('Failed to load upcoming events from work calendar:', err);
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
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between h-full min-h-[170px]">
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-3.5 flex items-center justify-between">
          <span>กิจกรรมที่กำลังจะมาถึง</span>
          <span className="text-[11px] font-normal text-slate-400">ปฏิทินบริษัท</span>
        </h3>

        {loading ? (
          <div className="py-4 text-center text-xs text-slate-400">
            กำลังโหลดกิจกรรม...
          </div>
        ) : events.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400">
            ยังไม่มีกิจกรรมหรือวันหยุดที่กำลังจะมาถึงในเร็วๆ นี้
          </div>
        ) : (
          <div className="space-y-2.5">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="text-xs text-slate-700 flex items-center gap-2 py-0.5"
              >
                <span className="font-semibold text-slate-800 whitespace-nowrap min-w-[70px]">
                  {ev.date}
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-600 truncate flex-1">{ev.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link
        href="/work-calendar"
        className="pt-2 text-[11px] text-slate-500 hover:text-[#0B2046] border-t border-slate-100 flex items-center justify-between mt-auto transition-colors cursor-pointer group"
      >
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0B2046] transition-colors" />
          <span>ปฏิทินกิจกรรมองค์กร</span>
        </div>
        <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  );
};

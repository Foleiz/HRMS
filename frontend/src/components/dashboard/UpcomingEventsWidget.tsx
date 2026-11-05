'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, ChevronRight } from 'lucide-react';
import { workCalendarService } from '@/services/workCalendarService';
import { Holiday } from '@/types/workCalendar';

interface EventItem {
  id: number | string;
  day: number;
  monthShort: string;
  fullDate: string;
  title: string;
  type?: string;
  typeThai?: string;
  daysAwayText?: string;
  isToday?: boolean;
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

        const todayObj = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const formatted: EventItem[] = upcoming.slice(0, 4).map((h) => {
          const parts = h.holidayDate.split('-');
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const d = new Date(year, month, day);

          const monthShort = d.toLocaleDateString('th-TH', { month: 'short' });
          const fullDate = d.toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'long',
          });

          const targetObj = new Date(year, month, day);
          const diffDays = Math.round((targetObj.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24));

          let daysAwayText = '';
          if (diffDays === 0) {
            daysAwayText = 'วันนี้';
          } else if (diffDays === 1) {
            daysAwayText = 'พรุ่งนี้';
          } else if (diffDays > 1 && diffDays <= 60) {
            daysAwayText = `อีก ${diffDays} วัน`;
          }

          return {
            id: h.id,
            day,
            monthShort,
            fullDate,
            title: h.holidayName,
            type: h.holidayType,
            typeThai: h.holidayTypeThai || (h.holidayType === 'COMPANY_SPECIAL' ? 'กิจกรรมบริษัท' : 'วันหยุด'),
            daysAwayText,
            isToday: diffDays === 0,
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
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4.5 sm:p-5 shadow-xs flex flex-col justify-between h-full min-h-[170px]">
      <div>
        {/* Header: ป้องกันการตัดบรรทัดผิดตำแหน่งและจัดช่องไฟสวยงาม */}
        <div className="flex items-center justify-between gap-2 mb-3.5 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-primary dark:text-blue-400 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
              กิจกรรมที่กำลังจะมาถึง
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
            ปฏิทินบริษัท
          </span>
        </div>

        {/* List of upcoming events */}
        {loading ? (
          <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
            กำลังโหลดกิจกรรม...
          </div>
        ) : events.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
            ยังไม่มีกิจกรรมหรือวันหยุดที่กำลังจะมาถึงในเร็วๆ นี้
          </div>
        ) : (
          <div className="space-y-1.5">
            {events.map((ev) => (
              <Link
                key={ev.id}
                href="/work-calendar"
                className="flex items-center gap-3 p-1.5 -mx-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer"
              >
                {/* Date Tile Badge */}
                <div
                  className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-colors ${
                    ev.isToday
                      ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-300'
                      : 'bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-slate-700 dark:text-slate-300 group-hover:border-primary/40 group-hover:bg-blue-50/60 dark:group-hover:bg-blue-950/40'
                  }`}
                >
                  <span className="text-sm font-extrabold leading-none">{ev.day}</span>
                  <span className="text-[10px] font-semibold leading-none mt-0.5 text-slate-500 dark:text-slate-400 group-hover:text-primary dark:group-hover:text-blue-300">
                    {ev.monthShort}
                  </span>
                </div>

                {/* Event Details (ชื่อกิจกรรมบรรทัดแรก วันที่และจำนวนวันบรรทัดสอง) */}
                <div className="min-w-0 flex-1">
                  <div
                    className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-primary dark:group-hover:text-blue-300 transition-colors"
                    title={ev.title}
                  >
                    {ev.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                    <span>{ev.fullDate}</span>
                    {ev.daysAwayText && (
                      <>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="text-primary dark:text-blue-400 font-medium">
                          {ev.daysAwayText}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer Link */}
      <Link
        href="/work-calendar"
        className="pt-2.5 text-[11px] text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-300 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between mt-auto transition-colors cursor-pointer group"
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

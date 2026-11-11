'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { workCalendarService } from '@/services/workCalendarService';
import { announcementService } from '@/services/announcementService';
import { Holiday } from '@/types/workCalendar';
import { Announcement } from '@/types/announcement';
import { TH_MONTHS } from '@/lib/thaiDate';

export interface CalendarEvent {
  id: string | number;
  dateStr: string; // YYYY-MM-DD
  day: number;
  title: string;
  type: 'PUBLIC' | 'COMPANY_SPECIAL' | 'SUBSTITUTE' | 'ACTIVITY' | string;
  typeLabel: string;
  isHoliday: boolean;
  isPinned?: boolean;
  timeRange?: string;
  dotColor: string; // Tailwind class
  badgeColor: string; // Tailwind class
}

// แยกเวลาสำหรับกิจกรรม (เช่น "09:00 - 16:30" หรือ "09:00")
const parseActivityTime = (content: string): string => {
  if (!content) return '09:00';
  const match = content.match(/⏰\s*เวลา:\s*([^\n\r]+)/);
  if (match) {
    const raw = match[1].trim();
    if (raw.includes('-')) {
      const parts = raw.split('-').map((p) => p.trim());
      return parts[0] || raw;
    }
    return raw;
  }
  return '09:00';
};

export const CalendarWidget: React.FC = () => {
  // ใช้วันที่ปัจจุบันจริงของเครื่องผู้ใช้
  const [today, setToday] = useState<Date>(() => new Date());
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(() => new Date().getDate());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [activities, setActivities] = useState<Announcement[]>([]);
  const [, setIsLoading] = useState<boolean>(false);

  // ซิงค์กับวันเวลาปัจจุบันจริงของ Browser เมื่อโหลดหน้า
  useEffect(() => {
    const now = new Date();
    setToday(now);
    setCurrentDate(now);
    setSelectedDay(now.getDate());
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // ดึงข้อมูลวันหยุดและประกาศกิจกรรมบริษัทประจำปี
  const fetchCalendarEvents = useCallback(async (targetYear: number) => {
    setIsLoading(true);
    try {
      const [holidaysRes, activitiesRes] = await Promise.allSettled([
        workCalendarService.getHolidays(targetYear),
        announcementService.getAnnouncements({ category: 'ACTIVITY', pageSize: 200 }),
      ]);

      if (holidaysRes.status === 'fulfilled') {
        setHolidays(holidaysRes.value || []);
      }
      if (activitiesRes.status === 'fulfilled') {
        setActivities(activitiesRes.value?.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch holidays and activities:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendarEvents(year);
  }, [year, fetchCalendarEvents]);

  const prevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const monthNames = TH_MONTHS;
  const yearThai = year + 543;
  const monthName = monthNames[month];

  // รวมวันหยุดและกิจกรรมในเดือนที่กำลังแสดงผล (แมปเป็น Map ของวันที่ -> CalendarEvent[])
  const eventsByDayMap = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`;

    // 1. เพิ่มวันหยุดประจำปี (สีแดง diamond)
    for (const h of holidays) {
      if (!h.holidayDate) continue;
      const isCompanyEvent = h.holidayType === 'COMPANY_SPECIAL' || h.holidayType === 'ACTIVITY';
      const isHoliday = !isCompanyEvent;

      if (h.holidayDate.startsWith(monthPrefix)) {
        const dayNum = parseInt(h.holidayDate.split('-')[2], 10);
        const ev: CalendarEvent = {
          id: `h-${h.id}`,
          dateStr: h.holidayDate,
          day: dayNum,
          title: h.holidayName,
          type: h.holidayType,
          typeLabel: isHoliday ? 'วันหยุด' : 'กิจกรรม',
          isHoliday,
          isPinned: false,
          timeRange: isHoliday ? 'ทั้งวัน' : '09:00',
          dotColor: isHoliday ? 'bg-rose-600' : 'bg-blue-600',
          badgeColor: isHoliday
            ? 'bg-rose-50/70 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
            : 'bg-sky-50/70 text-sky-600 border-sky-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
        };
        const list = map.get(ev.day) || [];
        list.push(ev);
        map.set(ev.day, list);
      }
    }

    // 2. เพิ่มประกาศกิจกรรมจาก Announcement Hub (สีน้ำเงิน dot)
    for (const act of activities) {
      if (act.status === 'DRAFT') continue;
      const startStr = act.publishedAt || act.createdAt;
      if (!startStr) continue;

      const startDate = new Date(startStr);
      const endDate = act.expireAt ? new Date(act.expireAt) : startDate;
      const time = parseActivityTime(act.content);

      const cur = new Date(startDate);
      let count = 0;
      while (cur <= endDate && count < 31) {
        if (cur.getFullYear() === year && cur.getMonth() === month) {
          const dayNum = cur.getDate();
          const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

          const list = map.get(dayNum) || [];
          const exists = list.some((e) => e.title.trim().toLowerCase() === act.title.trim().toLowerCase());
          if (!exists) {
            list.push({
              id: `act-${act.id}-${dayNum}`,
              dateStr: dayStr,
              day: dayNum,
              title: act.title,
              type: 'ACTIVITY',
              typeLabel: 'กิจกรรม',
              isHoliday: false,
              isPinned: act.isPinned ?? false,
              timeRange: time,
              dotColor: 'bg-blue-600',
              badgeColor: 'bg-sky-50/70 text-sky-600 border-sky-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
            });
            map.set(dayNum, list);
          }
        }
        cur.setDate(cur.getDate() + 1);
        count++;
      }
    }

    return map;
  }, [holidays, activities, year, month]);

  // รายการกิจกรรมทั้งหมดในเดือนนี้
  const eventsThisMonth = useMemo(() => {
    const list: CalendarEvent[] = [];
    eventsByDayMap.forEach((evList) => list.push(...evList));
    return list.sort((a, b) => a.day - b.day);
  }, [eventsByDayMap]);

  // กิจกรรมของวันที่ถูกเลือก เรียงลำดับ: วันหยุด -> กิจกรรมปักหมุด -> กิจกรรมทั่วไป
  const selectedEvents = useMemo(() => {
    if (selectedDay === null) return [];
    const list = eventsByDayMap.get(selectedDay) || [];
    return [...list].sort((a, b) => {
      // 1. วันหยุดขึ้นก่อน
      if (a.isHoliday && !b.isHoliday) return -1;
      if (!a.isHoliday && b.isHoliday) return 1;
      // 2. กิจกรรมที่ปักหมุดขึ้นก่อน
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  }, [eventsByDayMap, selectedDay]);

  // คำนวณวันในเดือนและวันเริ่มต้นของสัปดาห์
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // จันทร์ = 0, อาทิตย์ = 6
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  const weekHeaders = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden transition-all h-full flex flex-col">
      {/* Calendar Header: Deep Red (#94292B) */}
      <div className="bg-[#94292B] text-white px-4 py-3 flex items-center justify-between shrink-0">
        <h3 className="text-base font-bold tracking-wide">ปฏิทิน</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1 hover:bg-white/20 rounded-md transition-colors cursor-pointer"
            title="เดือนก่อนหน้า"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <span className="text-sm font-semibold px-0.5 text-white/95">
            {monthName} {yearThai}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1 hover:bg-white/20 rounded-md transition-colors cursor-pointer"
            title="เดือนถัดไป"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Calendar Grid & Details Container */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Day Headers */}
          <div className="grid grid-cols-7 text-center mb-1.5">
            {weekHeaders.map((w, idx) => (
              <span
                key={idx}
                className={`text-[11px] font-bold ${
                  idx >= 5 ? 'text-rose-500' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {w}
              </span>
            ))}
          </div>

          {/* Date Numbers with Dots / Indicators */}
          <div className="grid grid-cols-7 text-center gap-y-0.5">
            {days.map((d, idx) => {
              if (d === null) {
                return <div key={`empty-${idx}`} className="h-9 w-9 mx-auto" />;
              }
              const isToday = isCurrentMonth && d === today.getDate();
              const isSelected = selectedDay !== null ? d === selectedDay : isToday;
              const isWeekend = (idx % 7) >= 5;
              const rawDayEvents = eventsByDayMap.get(d) || [];
              const hasEvents = rawDayEvents.length > 0;

              // เรียงวันหยุดขึ้นก่อน แล้วตามด้วยกิจกรรม
              const dayEvents = [...rawDayEvents].sort((a, b) => {
                if (a.isHoliday && !b.isHoliday) return -1;
                if (!a.isHoliday && b.isHoliday) return 1;
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return 0;
              });

              const tooltipText = hasEvents
                ? `${d} ${monthName}: ` + dayEvents.map((e) => `${e.title} (${e.typeLabel})`).join(', ')
                : undefined;

              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  title={tooltipText}
                  className={`h-9 w-9 mx-auto rounded-full text-xs flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-[#FCE8E9] text-slate-900 font-bold border border-[#F3B6B9] shadow-2xs'
                      : isToday
                      ? 'text-[#94292B] font-bold ring-1.5 ring-[#94292B]/50'
                      : isWeekend
                      ? 'text-rose-500 font-medium hover:bg-slate-100 dark:hover:bg-slate-700/50'
                      : 'text-slate-800 dark:text-slate-200 font-medium hover:bg-slate-100 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <span className="leading-tight text-[12px]">{d}</span>
                  {/* Indicators below day number */}
                  <div className="flex items-center justify-center gap-0.5 h-2 mt-0.5">
                    {hasEvents ? (
                      <>
                        {dayEvents.slice(0, 2).map((ev, evIdx) =>
                          ev.isHoliday ? (
                            <span
                              key={evIdx}
                              className="w-1.5 h-1.5 bg-rose-600 rotate-45 shrink-0"
                            />
                          ) : (
                            <span
                              key={evIdx}
                              className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"
                            />
                          )
                        )}
                        {dayEvents.length > 2 && (
                          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 leading-none -ml-0.5">
                            +
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="w-1.5 h-1.5 opacity-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend: คำอธิบายสัญลักษณ์และจำนวนวันสำคัญ */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs px-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                <span className="w-1.5 h-1.5 bg-rose-600 rotate-45 inline-block shrink-0" />
                <span>วันหยุด</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block shrink-0" />
                <span>กิจกรรม</span>
              </div>
            </div>
            <Link
              href="/work-calendar"
              className="text-slate-700 dark:text-slate-300 hover:text-[#94292B] text-[11px] font-medium flex items-center gap-0.5 transition-colors cursor-pointer"
            >
              <span>{eventsThisMonth.length} วันสำคัญ</span>
              <span className="text-xs leading-none">›</span>
            </Link>
          </div>
        </div>

        {/* Selected Date Details Box (Bottom Section) */}
        <div className="mt-3 p-3 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700 shadow-2xs space-y-2.5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs sm:text-[13px] text-slate-900 dark:text-slate-100">
              {selectedDay ? `${selectedDay} ${monthName} ${yearThai}` : `${monthName} ${yearThai}`}
            </h4>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FCE8E9] text-[#94292B] dark:bg-rose-950/60 dark:text-rose-300">
              {selectedEvents.length} รายการ
            </span>
          </div>

          {/* Events List (Top 2 items) */}
          {selectedEvents.length > 0 ? (
            <div className="space-y-2">
              {selectedEvents.slice(0, 2).map((ev) => (
                <div key={ev.id} className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10.5px] font-medium border shrink-0 ${
                        ev.isHoliday
                          ? 'bg-rose-50/70 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                          : 'bg-sky-50/70 text-sky-600 border-sky-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                      }`}
                    >
                      {ev.typeLabel}
                    </span>
                    {ev.isPinned && (
                      <span className="px-2 py-0.5 rounded-md text-[10.5px] font-medium border shrink-0 bg-amber-50/70 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                        ปักหมุด
                      </span>
                    )}
                    <span
                      className="text-slate-800 dark:text-slate-200 font-medium text-xs truncate"
                      title={ev.title}
                    >
                      {ev.title}
                    </span>
                  </div>
                  <span className="text-slate-400 dark:text-slate-500 text-xs shrink-0 font-normal">
                    {ev.timeRange || (ev.isHoliday ? 'ทั้งวัน' : '09:00')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-1 text-center text-xs text-slate-400 dark:text-slate-500 font-normal">
              ไม่มีวันหยุดหรือกิจกรรมในวันนี้
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-700/60 text-xs">
            {selectedEvents.length > 2 ? (
              <Link
                href="/work-calendar"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-[11.5px] font-medium transition-colors"
              >
                + อีก {selectedEvents.length - 2} รายการ
              </Link>
            ) : (
              <span />
            )}
            <Link
              href="/work-calendar"
              className="text-slate-800 dark:text-slate-200 hover:text-[#94292B] text-[11.5px] font-bold flex items-center gap-0.5 transition-colors"
            >
              <span>ดูทั้งหมด</span>
              <span className="text-sm leading-none font-bold">›</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

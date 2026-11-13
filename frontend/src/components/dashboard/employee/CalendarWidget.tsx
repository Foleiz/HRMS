'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Sparkles, CalendarDays, X } from 'lucide-react';
import { workCalendarService } from '@/services/workCalendarService';
import { announcementService } from '@/services/announcementService';
import { Holiday } from '@/types/workCalendar';
import { Announcement } from '@/types/announcement';
import { TH_MONTHS } from '@/lib/thaiDate';
import { EventDetailModal, EventDetailData } from '../EventDetailModal';

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
  rawActivity?: Announcement;
  rawHoliday?: Holiday;
}

// แยกเวลาสำหรับกิจกรรมแบบเต็มช่วง (เช่น "09:00 - 12:00" หรือ "09:00 - 16:30" หรือ "09:00")
const parseActivityTime = (content: string): string => {
  if (!content) return '09:00';
  // 1. ตรวจสอบรูปแบบ "เวลา: XX:XX - YY:YY" หรือ "⏰ เวลา: XX:XX - YY:YY"
  const match = content.match(/(?:⏰\s*)?เวลา:\s*([^\n\r]+)/);
  if (match) {
    return match[1].trim();
  }
  // 2. ตรวจสอบรูปแบบช่วงเวลา เช่น "09:00 - 16:30" หรือ "09:00-16:30"
  const rangeMatch = content.match(/(\d{1,2}:\d{2}\s*(?:-|–|ถึง)\s*\d{1,2}:\d{2})/);
  if (rangeMatch) {
    return rangeMatch[1].trim();
  }
  // 3. ตรวจสอบเวลาเดี่ยว เช่น "09:00"
  const singleMatch = content.match(/(\d{1,2}:\d{2})/);
  if (singleMatch) {
    return singleMatch[1].trim();
  }
  return '09:00';
};

// แปลงประเภทวันหยุดเป็นภาษาไทย (วันหยุดชดเชย, วันหยุดพิเศษ, วันหยุด)
const getHolidayTypeLabel = (type: string, typeThai?: string): string => {
  if (type === 'SUBSTITUTE') return 'วันหยุดชดเชย';
  if (type === 'COMPANY_SPECIAL') return 'วันหยุดพิเศษ';
  if (type === 'PUBLIC') return 'วันหยุด';
  return typeThai || 'วันหยุด';
};

export const CalendarWidget: React.FC = () => {
  // ใช้วันที่ปัจจุบันจริงของเครื่องผู้ใช้
  const [today, setToday] = useState<Date>(() => new Date());
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(() => new Date().getDate());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [activities, setActivities] = useState<Announcement[]>([]);
  const [, setIsLoading] = useState<boolean>(false);
  const [isAllEventsModalOpen, setIsAllEventsModalOpen] = useState<boolean>(false);
  const [selectedDetail, setSelectedDetail] = useState<EventDetailData | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [pickerTab, setPickerTab] = useState<'MONTH' | 'YEAR'>('MONTH');
  const [yearGridStart, setYearGridStart] = useState<number>(() => new Date().getFullYear() + 543 - 4);
  const pickerRef = useRef<HTMLDivElement>(null);
  const headerControlsRef = useRef<HTMLDivElement>(null);

  const handleOpenEventDetail = useCallback((ev: CalendarEvent) => {
    const fullDateStr = `${ev.day} ${TH_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear() + 543}`;

    if (ev.isHoliday) {
      setSelectedDetail({
        title: ev.title,
        typeLabel: ev.typeLabel,
        isHoliday: true,
        dateStr: fullDateStr,
        timeRange: 'ตลอดทั้งวัน',
        description: ev.rawHoliday?.holidayName || 'วันหยุดตามประกาศของบริษัท',
      });
      return;
    }

    const desc = ev.rawActivity?.content
      ? ev.rawActivity.content
          .replace(/(?:📍\s*)?สถานที่:\s*[^\n\r]+[\r\n]*/g, '')
          .replace(/(?:⏰\s*)?เวลา:\s*[^\n\r]+[\r\n]*/g, '')
          .trim()
      : '';

    let targetAudience = 'ทุกคนในองค์กร';
    if (ev.rawActivity?.targets && ev.rawActivity.targets.length > 0) {
      if (ev.rawActivity.targets.some((t) => t.targetType === 'ALL')) {
        targetAudience = 'ทุกคนในองค์กร';
      } else {
        targetAudience = ev.rawActivity.targets
          .map((t) => t.targetEntityName || t.targetType)
          .join(', ');
      }
    }

    setSelectedDetail({
      title: ev.title,
      typeLabel: 'ประกาศกิจกรรม',
      isHoliday: false,
      dateStr: fullDateStr,
      timeRange: ev.timeRange || '09:00',
      description: desc,
      targetAudience,
      isPinned: ev.isPinned,
    });
  }, [currentDate]);

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

  const handleTogglePicker = (tab: 'MONTH' | 'YEAR') => {
    if (isPickerOpen && pickerTab === tab) {
      setIsPickerOpen(false);
    } else {
      setPickerTab(tab);
      if (tab === 'YEAR') {
        setYearGridStart(year + 543 - 4);
      }
      setIsPickerOpen(true);
    }
  };

  const handleSelectMonth = (newMonth: number) => {
    const isTodayMonth = year === today.getFullYear() && newMonth === today.getMonth();
    setCurrentDate(new Date(year, newMonth, 1));
    setSelectedDay(isTodayMonth ? today.getDate() : null);
    setIsPickerOpen(false);
  };

  const handleSelectYear = (newYear: number) => {
    const isTodayYearMonth = newYear === today.getFullYear() && month === today.getMonth();
    setCurrentDate(new Date(newYear, month, 1));
    setSelectedDay(isTodayYearMonth ? today.getDate() : null);
    setIsPickerOpen(false);
  };

  const handleGoToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDay(now.getDate());
    setIsPickerOpen(false);
  };

  const prevMonth = () => {
    setIsPickerOpen(false);
    setCurrentDate((prev) => {
      const nextDate = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      const isTodayMonth = nextDate.getFullYear() === today.getFullYear() && nextDate.getMonth() === today.getMonth();
      setSelectedDay(isTodayMonth ? today.getDate() : null);
      return nextDate;
    });
  };

  const nextMonth = () => {
    setIsPickerOpen(false);
    setCurrentDate((prev) => {
      const nextDate = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      const isTodayMonth = nextDate.getFullYear() === today.getFullYear() && nextDate.getMonth() === today.getMonth();
      setSelectedDay(isTodayMonth ? today.getDate() : null);
      return nextDate;
    });
  };

  // ปิดตัวเลือกเดือน/ปีเมื่อคลิกนอกพื้นที่หรือกด Escape
  useEffect(() => {
    if (!isPickerOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        pickerRef.current?.contains(target) ||
        headerControlsRef.current?.contains(target)
      ) {
        return;
      }
      setIsPickerOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPickerOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPickerOpen]);

  const monthNames = TH_MONTHS;
  const yearThai = year + 543;
  const monthName = monthNames[month];
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`;

  // รวมวันหยุดและกิจกรรมในเดือนที่กำลังแสดงผล (แมปเป็น Map ของวันที่ -> CalendarEvent[])
  const eventsByDayMap = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();

    // 1. เพิ่มวันหยุดประจำปี (สีแดง diamond)
    // แสดงประเภทตามจริง: วันหยุดชดเชย, วันหยุดพิเศษ, วันหยุด (ใช้สีแดงเหมือนกันทั้งหมด)
    for (const h of holidays) {
      if (!h.holidayDate) continue;
      const isHoliday = h.holidayType !== 'ACTIVITY';

      if (h.holidayDate.startsWith(monthPrefix)) {
        const dayNum = parseInt(h.holidayDate.split('-')[2], 10);
        const ev: CalendarEvent = {
          id: `h-${h.id}`,
          dateStr: h.holidayDate,
          day: dayNum,
          title: h.holidayName,
          type: h.holidayType,
          typeLabel: isHoliday ? getHolidayTypeLabel(h.holidayType, h.holidayTypeThai) : 'กิจกรรม',
          isHoliday,
          isPinned: false,
          timeRange: isHoliday ? 'ทั้งวัน' : '09:00',
          dotColor: isHoliday ? 'bg-rose-600' : 'bg-blue-600',
          badgeColor: isHoliday
            ? 'bg-rose-50/70 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
            : 'bg-sky-50/70 text-sky-600 border-sky-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
          rawHoliday: h,
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
              rawActivity: act,
            });
            map.set(dayNum, list);
          }
        }
        cur.setDate(cur.getDate() + 1);
        count++;
      }
    }

    return map;
  }, [holidays, activities, year, month, monthPrefix]);

  // คำนวณจำนวนวันหยุดและกิจกรรมในเดือนนี้สำหรับแสดงใน Legend
  const holidaysThisMonthCount = useMemo(() => {
    return holidays.filter(
      (h) => h.holidayDate && h.holidayDate.startsWith(monthPrefix) && h.holidayType !== 'ACTIVITY'
    ).length;
  }, [holidays, monthPrefix]);

  const activitiesThisMonthCount = useMemo(() => {
    return activities.filter((act) => {
      if (act.status === 'DRAFT') return false;
      const startStr = act.publishedAt || act.createdAt;
      if (!startStr) return false;
      const startDate = new Date(startStr);
      const endDate = act.expireAt ? new Date(act.expireAt) : startDate;

      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
      return startDate <= monthEnd && endDate >= monthStart;
    }).length;
  }, [activities, year, month]);

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

  // กิจกรรมถัดไปในเดือนนี้ (ถ้ามี) สำหรับแสดงกรณีไม่มีกิจกรรมในวันที่เลือก
  const nextUpcomingEventThisMonth = useMemo(() => {
    const baseDay = selectedDay ?? (year === today.getFullYear() && month === today.getMonth() ? today.getDate() : 1);
    return eventsThisMonth.find((e) => e.day >= baseDay) || eventsThisMonth[0];
  }, [eventsThisMonth, selectedDay, year, month, today]);

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
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden transition-all h-full flex flex-col relative">
      {/* Calendar Header: Deep Red (#94292B) */}
      <div className="bg-[#94292B] text-white px-3 sm:px-4 py-3 flex items-center justify-between shrink-0">
        <h3 className="text-sm font-bold tracking-wide">ปฏิทิน</h3>
        <div ref={headerControlsRef} className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1 hover:bg-white/20 rounded-md transition-colors cursor-pointer"
            title="เดือนก่อนหน้า"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-white" />
          </button>

          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* ปุ่มเลือกเดือน */}
            <button
              type="button"
              onClick={() => handleTogglePicker('MONTH')}
              className={`px-1.5 sm:px-2 py-0.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                isPickerOpen && pickerTab === 'MONTH'
                  ? 'bg-white/30 text-white shadow-2xs ring-1 ring-white/50'
                  : 'text-white/95 hover:bg-white/20 hover:text-white'
              }`}
              title="คลิกเพื่อเลือกเดือน"
            >
              <span className="truncate">{monthName}</span>
              <ChevronDown
                className={`w-3 h-3 text-white/80 transition-transform duration-200 shrink-0 ${
                  isPickerOpen && pickerTab === 'MONTH' ? 'rotate-180 text-white' : ''
                }`}
              />
            </button>

            {/* ปุ่มเลือกปี พ.ศ. */}
            <button
              type="button"
              onClick={() => handleTogglePicker('YEAR')}
              className={`px-1.5 sm:px-2 py-0.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                isPickerOpen && pickerTab === 'YEAR'
                  ? 'bg-white/30 text-white shadow-2xs ring-1 ring-white/50'
                  : 'text-white/95 hover:bg-white/20 hover:text-white'
              }`}
              title="คลิกเพื่อเลือกปี พ.ศ."
            >
              <span className="shrink-0">{yearThai}</span>
              <ChevronDown
                className={`w-3 h-3 text-white/80 transition-transform duration-200 shrink-0 ${
                  isPickerOpen && pickerTab === 'YEAR' ? 'rotate-180 text-white' : ''
                }`}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={nextMonth}
            className="p-1 hover:bg-white/20 rounded-md transition-colors cursor-pointer"
            title="เดือนถัดไป"
          >
            <ChevronRight className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>

      {/* Calendar Grid & Details Container (Fixed height layout matching previous form) */}
      <div className="p-3 flex-1 flex flex-col justify-between relative">
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

          {/* Date Numbers with Dots / Indicators (แสดงแค่จุดเดียวตามประเภท แม้มีมากกว่า 1 รายการ) */}
          <div className="grid grid-cols-7 text-center gap-y-0.5">
            {days.map((d, idx) => {
              if (d === null) {
                return <div key={`empty-${idx}`} className="h-7.5 w-7.5 mx-auto" />;
              }
              const isToday = isCurrentMonth && d === today.getDate();
              const isSelected = selectedDay !== null ? d === selectedDay : isToday;
              const isWeekend = (idx % 7) >= 5;
              const rawDayEvents = eventsByDayMap.get(d) || [];
              const hasEvents = rawDayEvents.length > 0;
              const hasHoliday = rawDayEvents.some((e) => e.isHoliday);
              const hasActivity = rawDayEvents.some((e) => !e.isHoliday);

              const tooltipText = hasEvents
                ? `${d} ${monthName}: ` + rawDayEvents.map((e) => `${e.title} (${e.typeLabel})`).join(', ')
                : undefined;

              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  title={tooltipText}
                  className={`h-7.5 w-7.5 mx-auto rounded-full text-xs flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                    isSelected
                      ? `bg-[#FCE8E9] dark:bg-[#94292B] text-slate-900 dark:text-white font-bold border border-[#F3B6B9] dark:border-rose-400/80 shadow-2xs ${
                          isToday ? 'ring-2 ring-[#94292B]/40 dark:ring-rose-300/80' : ''
                        }`
                      : isToday
                      ? 'text-[#94292B] dark:text-rose-400 font-bold ring-1.5 ring-[#94292B]/50 dark:ring-rose-400/70 hover:bg-rose-50/50 dark:hover:bg-rose-950/30'
                      : isWeekend
                      ? 'text-rose-500 dark:text-rose-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-700/50'
                      : 'text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <span className="leading-none text-[11.5px]">{d}</span>
                  {/* Indicators below day number: แสดงเฉพาะสัญลักษณ์ประเภท (ไม่แสดงเครื่องหมาย + และไม่แสดงจุดซ้ำ) */}
                  <div className="flex items-center justify-center gap-0.5 h-1.5 mt-0.5">
                    {hasEvents ? (
                      <>
                        {hasHoliday && (
                          <span
                            className={`w-1.5 h-1.5 rotate-45 shrink-0 ${
                              isSelected
                                ? 'bg-rose-600 dark:bg-rose-200'
                                : 'bg-rose-600 dark:bg-rose-400'
                            }`}
                          />
                        )}
                        {hasActivity && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isSelected
                                ? 'bg-blue-600 dark:bg-sky-200'
                                : 'bg-blue-600 dark:bg-sky-400'
                            }`}
                          />
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

          {/* Legend: คำอธิบายสัญลักษณ์พร้อมจำนวนนับประเภทในเดือนนี้ และ ปุ่มดูทั้งหมด */}
          <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10.5px] px-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                <span className="w-1.5 h-1.5 bg-rose-600 rotate-45 inline-block shrink-0" />
                <span>วันหยุด ({holidaysThisMonthCount})</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block shrink-0" />
                <span>กิจกรรม ({activitiesThisMonthCount})</span>
              </div>
            </div>
            {selectedEvents.length > 2 && (
              <button
                type="button"
                onClick={() => setIsAllEventsModalOpen(true)}
                className="text-slate-800 dark:text-slate-200 hover:text-[#94292B] text-[11px] font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
              >
                <span>ดูทั้งหมด</span>
                <span className="text-xs leading-none font-bold">›</span>
              </button>
            )}
          </div>
        </div>

        {/* Selected Date Details Box (ขยายขอบ panel ขึ้นใกล้แถบสัญลักษณ์ ลดช่องว่าง) */}
        {selectedEvents.length > 0 ? (
          <div
            onClick={() => {
              if (selectedEvents.length > 2) {
                setIsAllEventsModalOpen(true);
              }
            }}
            className={`mt-1 flex-1 min-h-[52px] rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700 shadow-2xs flex flex-col justify-center gap-1.5 px-2.5 py-1.5 overflow-hidden text-[10.5px] transition-colors ${
              selectedEvents.length > 2
                ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-600'
                : ''
            }`}
            title={selectedEvents.length > 2 ? 'คลิกเพื่อดูรายการทั้งหมด' : undefined}
          >
            {selectedEvents.slice(0, 2).map((ev, idx) => (
              <div
                key={ev.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEventDetail(ev);
                }}
                className={`flex items-center justify-between gap-1.5 min-w-0 p-0.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors ${
                  idx > 0 ? 'pt-1 border-t border-slate-100 dark:border-slate-700/60' : ''
                }`}
                title="คลิกเพื่อดูรายละเอียดแบบเต็ม"
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-medium border shrink-0 ${
                      ev.isHoliday
                        ? 'bg-rose-50/70 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                        : 'bg-sky-50/70 text-sky-600 border-sky-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                    }`}
                  >
                    {ev.typeLabel}
                  </span>
                  <span
                    className="text-slate-800 dark:text-slate-200 font-medium text-xs truncate"
                    title={ev.title}
                  >
                    {ev.title}
                  </span>
                </div>
                <span className="text-slate-400 dark:text-slate-500 text-[11px] shrink-0 font-normal">
                  {ev.timeRange || (ev.isHoliday ? 'ทั้งวัน' : '09:00')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-1 flex-1 min-h-[52px] p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-[10.5px] flex flex-col justify-center gap-1 overflow-hidden">
            {/* Top row: Status message */}
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {selectedDay
                  ? isCurrentMonth && selectedDay === today.getDate()
                    ? 'ไม่มีวันหยุดหรือกิจกรรมในวันนี้'
                    : `ไม่มีวันหยุดหรือกิจกรรมในวันที่ ${selectedDay} ${monthName}`
                  : 'ไม่มีวันหยุดหรือกิจกรรมในวันนี้'}
              </span>
            </div>

            {/* Bottom row: Next upcoming event */}
            {nextUpcomingEventThisMonth ? (
              <div className="pt-1 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center gap-1 text-[10px]">
                <Sparkles className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                <span className="text-slate-500 dark:text-slate-400 shrink-0">
                  ถัดไป ({nextUpcomingEventThisMonth.day} {monthName}):
                </span>
                <span
                  className="font-semibold text-slate-700 dark:text-slate-300 truncate flex-1 min-w-0"
                  title={nextUpcomingEventThisMonth.title}
                >
                  {nextUpcomingEventThisMonth.title}
                </span>
              </div>
            ) : (
              <div className="pt-1 border-t border-slate-200/50 dark:border-slate-700/50 text-[10px] text-slate-400 dark:text-slate-500">
                ไม่มีกิจกรรมที่เหลือในเดือนนี้
              </div>
            )}
          </div>
        )}

        {/* Month & Year Picker Overlay */}
        {isPickerOpen && (
          <div
            ref={pickerRef}
            className="absolute inset-0 z-20 bg-white dark:bg-slate-800 flex flex-col p-3 shadow-lg animate-in fade-in duration-150 rounded-b-2xl"
          >
            {/* Header: Tabs + Close Button */}
            <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-slate-100 dark:border-slate-700/70 shrink-0">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/50 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPickerTab('MONTH')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    pickerTab === 'MONTH'
                      ? 'bg-white dark:bg-slate-800 text-[#94292B] dark:text-rose-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  เลือกเดือน
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPickerTab('YEAR');
                    setYearGridStart(year + 543 - 4);
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    pickerTab === 'YEAR'
                      ? 'bg-white dark:bg-slate-800 text-[#94292B] dark:text-rose-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  เลือกปี พ.ศ.
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="ปิด"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content: Month Grid or Year Grid */}
            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col justify-center">
              {pickerTab === 'MONTH' ? (
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 py-1">
                  {monthNames.map((m, idx) => {
                    const isSelectedMonth = idx === month;
                    const isRealCurrentMonth = idx === today.getMonth() && year === today.getFullYear();
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleSelectMonth(idx)}
                        className={`h-9 sm:h-10 rounded-xl text-xs font-semibold transition-all cursor-pointer flex flex-col items-center justify-center relative ${
                          isSelectedMonth
                            ? 'bg-[#94292B] text-white shadow-xs'
                            : isRealCurrentMonth
                            ? 'text-[#94292B] dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/30 border border-[#94292B]/30 hover:bg-rose-100/70'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                        }`}
                      >
                        <span className="leading-tight">{m}</span>
                        {isRealCurrentMonth && !isSelectedMonth && (
                          <span className="text-[9px] text-rose-500 font-normal leading-none mt-0.5">เดือนนี้</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col h-full justify-between">
                  {/* Year Range Pagination */}
                  <div className="flex items-center justify-between mb-1 px-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setYearGridStart((prev) => prev - 12)}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
                      title="12 ปีก่อนหน้า"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      พ.ศ. {yearGridStart} – {yearGridStart + 11}
                    </span>
                    <button
                      type="button"
                      onClick={() => setYearGridStart((prev) => prev + 12)}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
                      title="12 ปีถัดไป"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 12 Years Grid */}
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2 py-1 flex-1 items-center">
                    {Array.from({ length: 12 }, (_, i) => yearGridStart + i).map((yThai) => {
                      const yAd = yThai - 543;
                      const isSelectedYear = yAd === year;
                      const isRealCurrentYear = yAd === today.getFullYear();
                      return (
                        <button
                          key={yThai}
                          type="button"
                          onClick={() => handleSelectYear(yAd)}
                          className={`h-9 sm:h-10 rounded-xl text-xs font-semibold transition-all cursor-pointer flex flex-col items-center justify-center relative ${
                            isSelectedYear
                              ? 'bg-[#94292B] text-white shadow-xs'
                              : isRealCurrentYear
                              ? 'text-[#94292B] dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/30 border border-[#94292B]/30 hover:bg-rose-100/70'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                          }`}
                        >
                          <span className="leading-tight">{yThai}</span>
                          {isRealCurrentYear && !isSelectedYear && (
                            <span className="text-[9px] text-rose-500 font-normal leading-none mt-0.5">ปีนี้</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Overlay Footer: Quick Today & Close */}
            <div className="pt-2 mt-1.5 border-t border-slate-100 dark:border-slate-700/70 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={handleGoToToday}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-[#94292B] dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                title="กลับไปที่เดือนและปีปัจจุบัน"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>วันนี้ ({today.getDate()} {monthNames[today.getMonth()]} {today.getFullYear() + 543})</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Full Events Bottom Sheet Modal (เปิดเมื่อกด "ดูทั้งหมด") */}
      {isAllEventsModalOpen && (
        <div className="absolute inset-0 z-30 bg-slate-900/40 backdrop-blur-[0.5px] flex flex-col justify-end transition-all animate-in fade-in duration-150">
          {/* Backdrop click to close */}
          <div
            className="flex-1 cursor-pointer"
            onClick={() => setIsAllEventsModalOpen(false)}
          />

          {/* Bottom Sheet Card */}
          <div className="bg-white dark:bg-slate-800 rounded-t-2xl border-t border-x border-slate-200/90 dark:border-slate-700 shadow-2xl p-3 flex flex-col max-h-[85%] animate-in slide-in-from-bottom duration-200">
            {/* Handle bar */}
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mb-2 shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between mb-2 shrink-0">
              <h4 className="font-bold text-xs sm:text-[13px] text-slate-900 dark:text-slate-100">
                {selectedDay ? `${selectedDay} ${monthName} ${yearThai}` : `${monthName} ${yearThai}`}
              </h4>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FCE8E9] text-[#94292B] dark:bg-rose-950/60 dark:text-rose-300">
                {selectedEvents.length} รายการ
              </span>
            </div>

            {/* Events List Box */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-700 p-2 overflow-y-auto max-h-[220px] divide-y divide-slate-100 dark:divide-slate-700/60">
              {selectedEvents.length > 0 ? (
                selectedEvents.map((ev, idx) => (
                  <div
                    key={ev.id}
                    onClick={() => handleOpenEventDetail(ev)}
                    className={`flex items-center justify-between gap-1.5 min-w-0 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors ${
                      idx > 0 ? 'pt-1.5' : ''
                    } ${idx < selectedEvents.length - 1 ? 'pb-1.5' : ''}`}
                    title="คลิกเพื่อดูรายละเอียดแบบเต็ม"
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-medium border shrink-0 ${
                          ev.isHoliday
                            ? 'bg-rose-50/70 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                            : 'bg-sky-50/70 text-sky-600 border-sky-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                        }`}
                      >
                        {ev.typeLabel}
                      </span>
                      <span
                        className="text-slate-800 dark:text-slate-200 font-medium text-xs truncate"
                        title={ev.title}
                      >
                        {ev.title}
                      </span>
                    </div>
                    <span className="text-slate-400 dark:text-slate-500 text-[11px] shrink-0 font-normal">
                      {ev.timeRange || (ev.isHoliday ? 'ทั้งวัน' : '09:00')}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                  ไม่มีวันหยุดหรือกิจกรรมในวันนี้
                </div>
              )}
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsAllEventsModalOpen(false)}
              className="mt-2.5 w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 font-medium text-xs transition-colors cursor-pointer shrink-0"
            >
              ปิด
            </button>
          </div>
        </div>
      )}

      {/* Event Detail Modal แบบเต็ม */}
      <EventDetailModal
        event={selectedDetail}
        onClose={() => setSelectedDetail(null)}
      />
    </div>
  );
};

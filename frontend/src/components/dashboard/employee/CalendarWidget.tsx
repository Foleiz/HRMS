'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Sparkles } from 'lucide-react';
import { workCalendarService } from '@/services/workCalendarService';
import { Holiday } from '@/types/workCalendar';

export interface CalendarEvent {
  id: string | number;
  dateStr: string; // YYYY-MM-DD
  day: number;
  title: string;
  type: 'PUBLIC' | 'COMPANY_SPECIAL' | 'SUBSTITUTE' | 'ACTIVITY' | string;
  typeLabel: string;
  dotColor: string; // Tailwind class
  badgeColor: string; // Tailwind class
}

export const CalendarWidget: React.FC = () => {
  // ใช้วันที่ปัจจุบันจริงของเครื่องผู้ใช้
  const [today, setToday] = useState<Date>(() => new Date());
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(() => new Date().getDate());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // ซิงค์กับวันเวลาปัจจุบันจริงของ Browser เมื่อโหลดหน้า
  useEffect(() => {
    const now = new Date();
    setToday(now);
    setCurrentDate(now);
    setSelectedDay(now.getDate());
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // ดึงข้อมูลวันหยุดและกิจกรรมบริษัทประจำปี
  const fetchCalendarEvents = useCallback(async (targetYear: number) => {
    setIsLoading(true);
    try {
      const data = await workCalendarService.getHolidays(targetYear);
      setHolidays(data || []);
    } catch (err) {
      console.error('Failed to fetch holidays:', err);
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

  const goToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDay(now.getDate());
  };

  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];

  const yearThai = year + 543;
  const monthName = monthNames[month];

  // แมปประเภทของกิจกรรมและวันหยุดเข้ากับสีและชื่อป้าย
  const formatEvent = useCallback((h: Holiday): CalendarEvent => {
    const isCompanyEvent = h.holidayType === 'COMPANY_SPECIAL' || h.holidayType === 'ACTIVITY';
    const isSubstitute = h.holidayType === 'SUBSTITUTE';

    let typeLabel = 'วันหยุดตามประเพณี';
    let dotColor = 'bg-rose-500';
    let badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';

    if (isCompanyEvent) {
      typeLabel = h.holidayTypeThai || 'วันหยุดพิเศษ / กิจกรรมบริษัท';
      dotColor = 'bg-sky-500';
      badgeColor = 'bg-sky-50 text-sky-700 border-sky-200';
    } else if (isSubstitute) {
      typeLabel = 'วันหยุดชดเชย';
      dotColor = 'bg-amber-500';
      badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
    } else if (h.holidayTypeThai) {
      typeLabel = h.holidayTypeThai;
    }

    const dayNum = parseInt(h.holidayDate.split('-')[2], 10);

    return {
      id: h.id,
      dateStr: h.holidayDate,
      day: dayNum,
      title: h.holidayName,
      type: h.holidayType,
      typeLabel,
      dotColor,
      badgeColor,
    };
  }, []);

  // รวมกิจกรรมในเดือนที่กำลังแสดงผล (แมปเป็น Map ของวันที่ -> CalendarEvent[])
  const eventsByDayMap = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`;

    for (const h of holidays) {
      if (h.holidayDate && h.holidayDate.startsWith(monthPrefix)) {
        const ev = formatEvent(h);
        const list = map.get(ev.day) || [];
        list.push(ev);
        map.set(ev.day, list);
      }
    }

    return map;
  }, [holidays, year, month, formatEvent]);

  // รายการกิจกรรมทั้งหมดในเดือนนี้
  const eventsThisMonth = useMemo(() => {
    const list: CalendarEvent[] = [];
    eventsByDayMap.forEach((evList) => list.push(...evList));
    return list.sort((a, b) => a.day - b.day);
  }, [eventsByDayMap]);

  // กิจกรรมของวันที่ถูกเลือก
  const selectedEvents = useMemo(() => {
    if (selectedDay === null) return [];
    return eventsByDayMap.get(selectedDay) || [];
  }, [eventsByDayMap, selectedDay]);

  // กิจกรรมถัดไปในเดือนนี้ (ถ้ามี)
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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all">
      {/* Calendar Header: Deep Red */}
      <div className="bg-[#94292B] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-bold tracking-wide">ปฏิทิน</h3>
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={goToToday}
              className="text-[10px] bg-white/20 hover:bg-white/30 text-white px-1.5 py-0.5 rounded transition-colors cursor-pointer"
              title="กลับไปที่วันนี้"
            >
              วันนี้
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1 hover:bg-white/20 rounded-md transition-colors cursor-pointer"
            title="เดือนก่อนหน้า"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-white" />
          </button>
          <span className="text-xs font-semibold px-1 text-white/90">
            {monthName} {yearThai}
          </span>
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

      {/* Calendar Grid */}
      <div className="p-3">
        {/* Day Headers */}
        <div className="grid grid-cols-7 text-center mb-1.5">
          {weekHeaders.map((w, idx) => (
            <span
              key={idx}
              className={`text-[11px] font-bold ${
                idx >= 5 ? 'text-rose-500' : 'text-slate-600'
              }`}
            >
              {w}
            </span>
          ))}
        </div>

        {/* Date Numbers with Dots */}
        <div className="grid grid-cols-7 text-center gap-y-0.5">
          {days.map((d, idx) => {
            if (d === null) {
              return <div key={`empty-${idx}`} className="h-7.5 w-7.5 mx-auto" />;
            }
            const isToday = isCurrentMonth && d === today.getDate();
            const isSelected = selectedDay !== null ? d === selectedDay : isToday;
            const isWeekend = (idx % 7) >= 5;
            const dayEvents = eventsByDayMap.get(d) || [];
            const hasEvents = dayEvents.length > 0;

            const tooltipText = hasEvents
              ? `${d} ${monthName}: ` + dayEvents.map((e) => `${e.title} (${e.typeLabel})`).join(', ')
              : undefined;

            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDay(d)}
                title={tooltipText}
                className={`h-7.5 w-7.5 mx-auto rounded-full text-xs font-semibold flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-[#F9C5C8] text-[#94292B] font-bold ring-2 ring-[#94292B]/40'
                    : isToday
                    ? 'text-[#94292B] font-bold ring-1.5 ring-[#94292B]/60'
                    : isWeekend
                    ? 'text-rose-400 hover:bg-slate-100'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="leading-none text-[11.5px]">{d}</span>
                {/* Dots indicator for holidays/events */}
                <div className="flex items-center justify-center gap-0.5 mt-0.5 h-1">
                  {hasEvents &&
                    dayEvents.slice(0, 2).map((ev, evIdx) => (
                      <span
                        key={evIdx}
                        className={`w-1.5 h-1.5 rounded-full ${ev.dotColor} shrink-0 ring-1 ring-white`}
                      />
                    ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend: คำอธิบายจุดสี */}
        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10.5px] px-1">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1 text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>วันหยุด</span>
            </span>
            <span className="flex items-center gap-1 text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
              <span>กิจกรรมบริษัท</span>
            </span>
          </div>
          {eventsThisMonth.length > 0 && (
            <span className="text-[10px] text-slate-400 font-medium">
              {eventsThisMonth.length} วันสำคัญ
            </span>
          )}
        </div>

        {/* Event Details Section */}
        {selectedEvents.length > 0 ? (
          <div className="mt-1.5 bg-slate-50/90 border border-slate-200/80 rounded-xl p-2 space-y-1 max-h-28 overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold text-slate-800 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#94292B]" />
                {selectedDay} {monthName} {yearThai}
              </span>
              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-[#94292B]/10 text-[#94292B]">
                {selectedEvents.length} รายการ
              </span>
            </div>
            {selectedEvents.map((evt) => (
              <div
                key={evt.id}
                className="flex items-start gap-1.5 bg-white p-1.5 rounded-lg border border-slate-200/60 shadow-xs"
              >
                <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${evt.dotColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[8.5px] font-medium px-1 py-0.2 rounded border ${evt.badgeColor}`}
                    >
                      {evt.typeLabel}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-800 mt-0.5 leading-snug truncate" title={evt.title}>
                    {evt.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-1.5 p-1.5 rounded-xl bg-slate-50/70 border border-slate-200/60 text-[10.5px]">
            <div className="flex items-center justify-between text-slate-500">
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <Calendar className="w-2.5 h-2.5 text-slate-400" />
                {selectedDay ? `${selectedDay} ${monthName}` : 'ไม่มีวันที่เลือก'}
              </span>
              <span className="text-[9.5px] text-slate-400">ไม่มีวันหยุด/กิจกรรม</span>
            </div>
            {nextUpcomingEventThisMonth && (
              <div className="mt-1 pt-1 border-t border-slate-200/50 flex items-center gap-1 text-[10px]">
                <Sparkles className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                <span className="text-slate-500 shrink-0">
                  ถัดไป ({nextUpcomingEventThisMonth.day} {monthName}):
                </span>
                <span className="font-semibold text-slate-700 truncate" title={nextUpcomingEventThisMonth.title}>
                  {nextUpcomingEventThisMonth.title}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


'use client';

import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { workCalendarService } from '@/services/workCalendarService';
import { Holiday } from '@/types/workCalendar';

export const UpcomingEventsWidget: React.FC = () => {
  const [events, setEvents] = useState<{ date: string; title: string }[]>([
    { date: '12 สิงหาคม', title: 'วันหยุด วันแม่แห่งชาติ' },
    { date: '30 สิงหาคม', title: 'ตรวจสุขภาพประจำปีของบริษัท' },
  ]);

  useEffect(() => {
    // โหลดวันหยุดจริงจากฐานข้อมูลเสริม
    const loadHolidays = async () => {
      try {
        const currentYear = new Date().getFullYear();
        const holidays = await workCalendarService.getHolidays(currentYear);
        if (holidays && holidays.length > 0) {
          const formatted = holidays.slice(0, 3).map((h: Holiday) => {
            const d = new Date(h.holidayDate);
            const dateStr = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long' });
            return {
              date: dateStr,
              title: h.holidayName,
            };
          });
          // รวมกับกิจกรรมบริษัท
          setEvents([
            ...formatted,
            { date: '30 สิงหาคม', title: 'ตรวจสุขภาพประจำปีของบริษัท' },
          ]);
        }
      } catch (err) {
        // ใช้ข้อมูลเริ่มต้น
      }
    };
    loadHolidays();
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between h-full min-h-[170px]">
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-3.5 flex items-center gap-2">
          <span>กิจกรรมที่กำลังจะมาถึง</span>
        </h3>
        <div className="space-y-2.5">
          {events.map((ev, idx) => (
            <div
              key={idx}
              className="text-xs text-slate-700 flex items-center gap-2 py-0.5"
            >
              <span className="font-semibold text-slate-800 whitespace-nowrap">
                {ev.date}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600 truncate">{ev.title}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100 flex items-center gap-1 mt-auto">
        <Calendar className="w-3.5 h-3.5 text-slate-400" />
        <span>ปฏิทินกิจกรรมองค์กร</span>
      </div>
    </div>
  );
};

'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const CalendarWidget: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 2)); // สิงหาคม 2569
  const [selectedDay, setSelectedDay] = useState<number>(2);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];

  const yearThai = currentDate.getFullYear() + 543;
  const monthName = monthNames[currentDate.getMonth()];

  // Calculate days in month and starting day of week
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // จันทร์ = 0, อาทิตย์ = 6
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  const weekHeaders = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Calendar Header: Deep Red */}
      <div className="bg-[#94292B] text-white px-4 py-3 flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-wide">ปฏิทิน</h3>
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

        {/* Date Numbers */}
        <div className="grid grid-cols-7 text-center gap-y-1">
          {days.map((d, idx) => {
            if (d === null) {
              return <div key={`empty-${idx}`} className="h-7 w-7 mx-auto" />;
            }
            const isSelected = d === selectedDay;
            const isWeekend = (idx % 7) >= 5;

            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDay(d)}
                className={`h-7 w-7 mx-auto rounded-full text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#F9C5C8] text-[#94292B] font-bold ring-2 ring-[#94292B]/40'
                    : isWeekend
                    ? 'text-rose-400 hover:bg-slate-100'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

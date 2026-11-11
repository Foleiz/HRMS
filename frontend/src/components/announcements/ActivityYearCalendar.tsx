'use client';

import React from 'react';
import { Calendar, MapPin, Clock, Users, Sparkles, Pin } from 'lucide-react';
import { Announcement } from '@/types/announcement';
import { TH_MONTHS } from '@/lib/thaiDate';

const thaiDayNamesShort = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

export interface ActivityYearCalendarProps {
  year: number;
  activities: Announcement[];
  onSelectActivity?: (activity: Announcement) => void;
  onSelectDate?: (dateStr: string) => void;
}

const parseActivityMeta = (content: string) => {
  let location = '';
  let timeRange = '';

  const locMatch = content.match(/📍\s*สถานที่:\s*([^\n\r]+)/);
  if (locMatch) location = locMatch[1].trim();

  const timeMatch = content.match(/⏰\s*เวลา:\s*([^\n\r]+)/);
  if (timeMatch) timeRange = timeMatch[1].trim();

  return { location, timeRange };
};

const formatThaiDate = (dateStr: string) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export const ActivityYearCalendar: React.FC<ActivityYearCalendarProps> = ({
  year,
  activities,
  onSelectActivity,
  onSelectDate,
}) => {
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Map activities by date string (YYYY-MM-DD)
  const byDate = new Map<string, Announcement[]>();

  activities.forEach((act) => {
    const startStr = act.publishedAt || act.createdAt;
    if (!startStr) return;
    const startKey = startStr.substring(0, 10);
    const endKey = act.expireAt ? act.expireAt.substring(0, 10) : startKey;

    // หากกิจกรรมกินเวลาหลายวัน ทำการ map ลงทุกวันในช่วงนั้น (สูงสุด 31 วัน)
    if (startKey <= endKey) {
      try {
        const cur = new Date(startKey);
        const end = new Date(endKey);
        let count = 0;
        while (cur <= end && count < 31) {
          const k = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
          byDate.set(k, [...(byDate.get(k) ?? []), act]);
          cur.setDate(cur.getDate() + 1);
          count++;
        }
      } catch {
        byDate.set(startKey, [...(byDate.get(startKey) ?? []), act]);
      }
    } else {
      byDate.set(startKey, [...(byDate.get(startKey) ?? []), act]);
    }
  });

  const getActivityStyle = (act: Announcement) => {
    const isPast = act.expireAt ? new Date(act.expireAt) < now : (act.publishedAt ? new Date(act.publishedAt) < now : false);
    const isDraft = act.status === 'DRAFT';

    if (isDraft) {
      return {
        cell: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border border-dashed border-slate-300 dark:border-slate-600',
        dot: 'bg-slate-400',
        label: 'แบบร่าง',
      };
    }
    if (act.isPinned || act.priority === 'HIGH' || act.priority === 'URGENT') {
      return {
        cell: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shadow-2xs',
        dot: 'bg-amber-500',
        label: 'กิจกรรมสำคัญ',
      };
    }
    if (isPast) {
      return {
        cell: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
        dot: 'bg-slate-400',
        label: 'สิ้นสุดแล้ว',
      };
    }
    return {
      cell: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs font-semibold',
      dot: 'bg-emerald-500',
      label: 'กำลังจะมาถึง',
    };
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Legend คำอธิบายสี */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
        <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          สัญลักษณ์กิจกรรม:
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          กิจกรรมทั่วไป / กำลังจะมาถึง
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          กิจกรรมสำคัญ / ปักหมุด
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
          กิจกรรมที่สิ้นสุดแล้ว / แบบร่าง
        </span>
        <span className="inline-flex items-center gap-1.5 text-slate-400">
          <span className="w-2.5 h-2.5 rounded-md ring-2 ring-primary ring-offset-1" />
          วันนี้
        </span>
      </div>

      {/* 12-Month Calendar Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {TH_MONTHS.map((monthName, m) => {
          const first = new Date(year, m, 1);
          const daysInMonth = new Date(year, m + 1, 0).getDate();
          const lead = first.getDay();
          const cells: (number | null)[] = [
            ...Array(lead).fill(null),
            ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
          ];
          while (cells.length % 7 !== 0) cells.push(null);

          // หา activities ที่อยู่ในเดือนนี้
          const monthActivities = activities.filter((act) => {
            const startStr = act.publishedAt || act.createdAt;
            if (!startStr) return false;
            const startD = new Date(startStr);
            const endD = act.expireAt ? new Date(act.expireAt) : startD;
            const monthStart = new Date(year, m, 1);
            const monthEnd = new Date(year, m, daysInMonth, 23, 59, 59);
            return startD <= monthEnd && endD >= monthStart;
          });

          return (
            <div
              key={m}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 shadow-2xs flex flex-col overflow-hidden"
            >
              {/* Month Header */}
              <div className="px-3.5 py-2.5 bg-slate-800 text-white text-xs font-semibold flex items-center justify-between">
                <span>
                  {monthName} {year + 543}
                </span>
                {monthActivities.length > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 text-white font-medium">
                    {monthActivities.length} กิจกรรม
                  </span>
                )}
              </div>

              {/* Day of Week Header */}
              <div className="p-2.5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-slate-400 mb-1">
                    {thaiDayNamesShort.map((d, i) => (
                      <div key={d} className={i === 0 || i === 6 ? 'text-rose-400 font-bold' : ''}>
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days Grid */}
                  <div className="grid grid-cols-7 gap-0.5">
                    {cells.map((day, idx) => {
                      if (day === null) return <div key={idx} className="h-7" />;
                      const key = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const acts = byDate.get(key);
                      const isToday = key === todayKey;
                      const baseClass = 'h-7 rounded-md text-[11px] flex items-center justify-center transition-colors relative';

                      if (acts && acts.length > 0) {
                        const firstAct = acts[0];
                        const style = getActivityStyle(firstAct);
                        const hasMultiple = acts.length > 1;

                        return (
                          <div key={idx} className="relative group/act">
                            <button
                              type="button"
                              aria-label={acts.map((a) => a.title).join(', ')}
                              onClick={() => onSelectActivity?.(firstAct)}
                              className={`${baseClass} w-full font-bold ${style.cell} transition-transform duration-150 group-hover/act:scale-110 group-hover/act:shadow-md group-hover/act:ring-2 group-hover/act:ring-white dark:group-hover/act:ring-slate-900 group-hover/act:z-10 ${
                                onSelectActivity ? 'cursor-pointer' : 'cursor-default'
                              } ${isToday ? 'ring-2 ring-primary dark:ring-blue-400' : ''}`}
                            >
                              <span>{day}</span>
                              {hasMultiple && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-primary text-white text-[9px] flex items-center justify-center font-bold">
                                  {acts.length}
                                </span>
                              )}
                              {firstAct.isPinned && !hasMultiple && (
                                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
                              )}
                            </button>

                            {/* Tooltip รายละเอียดเมื่อชี้เมาส์ */}
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-40 w-max max-w-[240px] opacity-0 translate-y-1 group-hover/act:opacity-100 group-hover/act:translate-y-0 transition-all duration-150">
                              <div className="rounded-xl bg-slate-900 text-white px-3 py-2 shadow-xl space-y-1.5 text-left border border-slate-700">
                                {acts.map((a) => {
                                  const { location, timeRange } = parseActivityMeta(a.content);
                                  return (
                                    <div key={a.id} className="text-[11px] leading-snug border-b border-slate-800 last:border-b-0 pb-1.5 last:pb-0">
                                      <div className="flex items-center gap-1.5 font-bold text-slate-100">
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getActivityStyle(a).dot}`} />
                                        <span className="truncate">{a.title}</span>
                                        {a.isPinned && <Pin className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                                      </div>
                                      {timeRange && (
                                        <div className="text-[10px] text-slate-300 flex items-center gap-1 mt-0.5 pl-3">
                                          <Clock className="w-2.5 h-2.5 text-slate-400" />
                                          <span>{timeRange}</span>
                                        </div>
                                      )}
                                      {location && (
                                        <div className="text-[10px] text-slate-300 flex items-center gap-1 pl-3">
                                          <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                          <span className="truncate">{location}</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                {onSelectActivity && (
                                  <div className="text-[10px] text-primary-light pt-0.5 font-medium text-center">
                                    คลิกเพื่อดูรายละเอียด
                                  </div>
                                )}
                              </div>
                              <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1 border-r border-b border-slate-700" />
                            </div>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          title={onSelectDate ? 'คลิกเพื่อสร้างกิจกรรมในวันนี้' : undefined}
                          onClick={() => onSelectDate?.(key)}
                          className={`${baseClass} text-slate-700 dark:text-slate-300 ${
                            onSelectDate
                              ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-primary'
                              : 'cursor-default'
                          } ${isToday ? 'ring-2 ring-primary dark:ring-blue-400 font-bold' : ''}`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* รายการกิจกรรมประจำเดือนย่อ */}
                {monthActivities.length > 0 && (
                  <ul className="border-t border-slate-100 dark:border-slate-700/60 pt-2 mt-2 space-y-1 text-[11px]">
                    {monthActivities.slice(0, 3).map((a) => {
                      const startD = a.publishedAt || a.createdAt;
                      const dateNum = startD ? Number(startD.substring(8, 10)) : 1;
                      const style = getActivityStyle(a);

                      return (
                        <li
                          key={a.id}
                          onClick={() => onSelectActivity?.(a)}
                          className={`flex items-center gap-2 min-w-0 px-1.5 py-0.5 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/60 ${
                            onSelectActivity ? 'cursor-pointer' : ''
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
                          <span className="font-mono text-slate-400 dark:text-slate-500 font-bold shrink-0">
                            {dateNum}
                          </span>
                          <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                            {a.title}
                          </span>
                          {a.isPinned && <Pin className="w-2.5 h-2.5 text-amber-500 shrink-0 ml-auto" />}
                        </li>
                      );
                    })}
                    {monthActivities.length > 3 && (
                      <li className="text-[10px] text-slate-400 text-center pt-0.5">
                        +{monthActivities.length - 3} กิจกรรมเพิ่มเติม
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

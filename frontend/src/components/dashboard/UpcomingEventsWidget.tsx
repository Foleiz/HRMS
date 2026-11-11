'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { announcementService } from '@/services/announcementService';
import { Announcement } from '@/types/announcement';

interface EventItem {
  id: number;
  title: string;
  isPinned: boolean;
  timeRange: string;
  startTimeSort: string;
  dateStr: string; // YYYY-MM-DD
}

interface GroupedEvents {
  dateStr: string;
  dateLabel: string;
  events: EventItem[];
}

const THAI_SHORT_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

// ดึงเวลาสำหรับกิจกรรม (เช่น "10:00", "09:00 - 12:00", "09:00 - 16:30")
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

const getStartTimeSort = (timeStr: string): string => {
  if (timeStr.includes('-')) {
    return timeStr.split('-')[0].trim();
  }
  return timeStr.trim();
};

const getDateLabel = (targetDate: Date, today: Date): string => {
  const d = new Date(targetDate);
  d.setHours(0, 0, 0, 0);
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);

  const diffDays = Math.round((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
  const dayNum = d.getDate();
  const monthShort = THAI_SHORT_MONTHS[d.getMonth()];

  if (diffDays === 0) {
    return `วันนี้ · ${dayNum} ${monthShort}`;
  }
  if (diffDays === 1) {
    return `พรุ่งนี้ · ${dayNum} ${monthShort}`;
  }
  return `${dayNum} ${monthShort}`;
};

export const UpcomingEventsWidget: React.FC = () => {
  const [activities, setActivities] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadUpcomingEvents = async () => {
      setLoading(true);
      try {
        // ดึงเฉพาะประกาศกิจกรรม (category: 'ACTIVITY')
        const res = await announcementService.getAnnouncements({
          category: 'ACTIVITY',
          pageSize: 100,
        });

        if (isMounted) {
          setActivities(res?.items || []);
        }
      } catch (err) {
        console.error('Failed to load upcoming activities:', err);
        if (isMounted) {
          setActivities([]);
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

  // กรองเฉพาะกิจกรรมที่จัดขึ้นใน 7 วันข้างหน้า (นับจากวันนี้)
  const groupedEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const next7Days = new Date(today);
    next7Days.setDate(next7Days.getDate() + 7);
    next7Days.setHours(23, 59, 59, 999);

    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const next7DaysStr = `${next7Days.getFullYear()}-${String(next7Days.getMonth() + 1).padStart(2, '0')}-${String(next7Days.getDate()).padStart(2, '0')}`;

    // กรองเฉพาะกิจกรรมที่เผยแพร่แล้ว (ไม่รวม DRAFT) และอยู่ในช่วง 7 วันข้างหน้า
    const validActivities = activities.filter((act) => {
      if (act.status === 'DRAFT') return false;
      const startStr = act.publishedAt || act.createdAt;
      if (!startStr) return false;
      const startDateOnly = startStr.substring(0, 10);
      const endDateOnly = act.expireAt ? act.expireAt.substring(0, 10) : startDateOnly;

      return startDateOnly <= next7DaysStr && endDateOnly >= todayStr;
    });

    // แมปกิจกรรมลงในแต่ละวันของช่วง 7 วันข้างหน้า
    const dayMap = new Map<string, EventItem[]>();

    for (const act of validActivities) {
      const startStr = act.publishedAt || act.createdAt || '';
      const startDate = new Date(startStr);
      const endDate = act.expireAt ? new Date(act.expireAt) : startDate;
      const time = parseActivityTime(act.content);
      const startTimeSort = getStartTimeSort(time);

      const cur = new Date(startDate);
      let count = 0;
      while (cur <= endDate && count < 31) {
        cur.setHours(0, 0, 0, 0);
        if (cur >= today && cur <= next7Days) {
          const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
          const list = dayMap.get(dateStr) || [];

          const exists = list.some((e) => e.title.trim().toLowerCase() === act.title.trim().toLowerCase());
          if (!exists) {
            list.push({
              id: act.id,
              title: act.title,
              isPinned: act.isPinned ?? false,
              timeRange: time,
              startTimeSort,
              dateStr,
            });
            dayMap.set(dateStr, list);
          }
        }
        cur.setDate(cur.getDate() + 1);
        count++;
      }
    }

    // แปลง Map เป็น Array เรียงตามวันที่
    const sortedDateKeys = Array.from(dayMap.keys()).sort();
    const result: GroupedEvents[] = [];

    for (const dateKey of sortedDateKeys) {
      const [y, m, d] = dateKey.split('-').map(Number);
      const targetDate = new Date(y, m - 1, d);
      const items = dayMap.get(dateKey) || [];

      // เรียงลำดับ: กิจกรรมปักหมุดก่อน -> เวลาเริ่มก่อน
      items.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return a.startTimeSort.localeCompare(b.startTimeSort);
      });

      result.push({
        dateStr: dateKey,
        dateLabel: getDateLabel(targetDate, today),
        events: items,
      });
    }

    return result;
  }, [activities]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full min-h-[170px]">
      <div className="flex-1 flex flex-col">
        {/* Header: กิจกรรมที่กำลังจะมาถึง */}
        <div className="flex items-center justify-between mb-3.5 shrink-0">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
            กิจกรรมที่กำลังจะมาถึง
          </h3>
        </div>

        {/* Content: โหลดข้อมูล / ไม่มีกิจกรรม / แสดงรายการตามกลุ่มวันที่ */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-6 text-xs text-slate-400 dark:text-slate-500">
            กำลังโหลดกิจกรรม...
          </div>
        ) : groupedEvents.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
            <Calendar className="w-9 h-9 text-slate-400 dark:text-slate-500 mb-2 stroke-[1.5]" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              ไม่มีกิจกรรมใน 7 วันข้างหน้า
            </p>
          </div>
        ) : (
          <div className="space-y-3.5 overflow-y-auto max-h-[220px] pr-0.5">
            {groupedEvents.map((group) => {
              const isToday = group.dateLabel.startsWith('วันนี้');
              const isTomorrow = group.dateLabel.startsWith('พรุ่งนี้');

              return (
                <div key={group.dateStr} className="space-y-1.5">
                  {/* แถบหัวข้อวันที่พร้อมเส้นแบ่งแยกส่วนชัดเจน */}
                  <div className="flex items-center gap-2 pt-1">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                        isToday
                          ? 'bg-rose-50 text-[#94292B] border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50'
                          : isTomorrow
                          ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50'
                          : 'bg-slate-100 text-slate-600 border-slate-200/60 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {group.dateLabel}
                    </span>
                    <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                  </div>

                  {/* รายการกิจกรรมในวันนั้น: กล่องข้อความพร้อม dot สีน้ำเงินและเวลา */}
                  <div className="space-y-1 pl-0.5">
                    {group.events.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-center justify-between gap-2 text-xs py-1.5 px-2.5 rounded-lg bg-slate-50/70 hover:bg-slate-100/70 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 border border-slate-100 dark:border-slate-700/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                          <span
                            className="text-slate-800 dark:text-slate-200 font-medium text-xs sm:text-[13px] truncate"
                            title={ev.title}
                          >
                            {ev.title}
                          </span>
                        </div>
                        <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] sm:text-xs shrink-0 font-medium">
                          {ev.timeRange}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

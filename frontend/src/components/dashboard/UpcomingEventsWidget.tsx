'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { announcementService } from '@/services/announcementService';
import { Announcement } from '@/types/announcement';
import { EventDetailModal, EventDetailData } from './EventDetailModal';

interface EventItem {
  id: number;
  title: string;
  isPinned: boolean;
  timeRange: string;
  startTimeSort: string;
  dateStr: string; // YYYY-MM-DD
  rawActivity?: Announcement;
}

interface GroupedEvents {
  dateStr: string;
  relativeLabel: string;
  shortDateLabel: string;
  isToday: boolean;
  events: EventItem[];
}

const THAI_SHORT_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

const THAI_SHORT_WEEKDAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

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

const getDateLabels = (
  targetDate: Date,
  today: Date
): { relativeLabel: string; shortDateLabel: string; isToday: boolean } => {
  const d = new Date(targetDate);
  d.setHours(0, 0, 0, 0);
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);

  const diffDays = Math.round((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
  const weekday = THAI_SHORT_WEEKDAYS[d.getDay()];
  const dayNum = d.getDate();
  const monthShort = THAI_SHORT_MONTHS[d.getMonth()];
  const shortDateLabel = `${weekday} ${dayNum} ${monthShort}`;

  if (diffDays === 0) {
    return { relativeLabel: 'วันนี้', shortDateLabel, isToday: true };
  }
  if (diffDays === 1) {
    return { relativeLabel: 'พรุ่งนี้', shortDateLabel, isToday: false };
  }
  return { relativeLabel: `อีก ${diffDays} วัน`, shortDateLabel, isToday: false };
};

const formatDurationBadge = (timeRange: string): string | null => {
  const match = timeRange.match(/(\d{1,2}):(\d{2})\s*(?:-|–|ถึง)\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const startMins = Number(match[1]) * 60 + Number(match[2]);
  const endMins = Number(match[3]) * 60 + Number(match[4]);
  const diff = endMins - startMins;
  if (diff <= 0) return null;
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hrs > 0 && mins > 0) return `${hrs} ชม. ${mins} น.`;
  if (hrs > 0) return `${hrs} ชม.`;
  return `${mins} น.`;
};

const THAI_FULL_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export const UpcomingEventsWidget: React.FC = () => {
  const [activities, setActivities] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState<EventDetailData | null>(null);

  const handleEventClick = (ev: EventItem) => {
    const [y, m, d] = ev.dateStr.split('-').map(Number);
    const thaiYear = y + 543;
    const fullDateStr = `${d} ${THAI_FULL_MONTHS[m - 1]} ${thaiYear}`;

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
      timeRange: ev.timeRange,
      description: desc,
      targetAudience,
      isPinned: ev.isPinned,
    });
  };

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
              rawActivity: act,
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

      const labels = getDateLabels(targetDate, today);
      result.push({
        dateStr: dateKey,
        relativeLabel: labels.relativeLabel,
        shortDateLabel: labels.shortDateLabel,
        isToday: labels.isToday,
        events: items,
      });
    }

    return result;
  }, [activities]);

  const totalEventsCount = useMemo(
    () => groupedEvents.reduce((sum, g) => sum + g.events.length, 0),
    [groupedEvents]
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs flex flex-col justify-between h-full min-h-[170px]">
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header: กิจกรรมที่กำลังจะมาถึง + สรุปจำนวนกิจกรรม */}
        <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
          <h3 className="text-[13px] sm:text-sm font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
            กิจกรรมที่กำลังจะมาถึง
          </h3>
          {!loading && totalEventsCount > 0 && (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
              {totalEventsCount} กิจกรรม
            </span>
          )}
        </div>

        {/* Content: โหลดข้อมูล / ไม่มีกิจกรรม / Timeline กิจกรรมตามกลุ่มวันที่ */}
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
          <div className="overflow-y-auto max-h-[172px] pl-1.5 pr-1 pt-1">
            {groupedEvents.map((group, groupIdx) => {
              const isLastGroup = groupIdx === groupedEvents.length - 1;
              const isHighlight = group.isToday || groupIdx === 0;
              return (
                <div key={group.dateStr} className="flex gap-2">
                  {/* เส้น Timeline ด้านซ้าย */}
                  <div className="flex flex-col items-center pt-1 shrink-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isHighlight
                          ? 'bg-blue-500 ring-3 ring-blue-500/20'
                          : 'border-[1.5px] border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                      }`}
                    />
                    {!isLastGroup && (
                      <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700/80 my-1" />
                    )}
                  </div>

                  {/* เนื้อหากิจกรรมด้านขวา */}
                  <div className={`flex-1 min-w-0 ${isLastGroup ? 'pb-0.5' : 'pb-2'}`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100">
                        {group.relativeLabel}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
                        {group.shortDateLabel}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {group.events.map((ev) => {
                        const durationBadge = formatDurationBadge(ev.timeRange);
                        const formattedTime = ev.timeRange.replace(/\s*-\s*/g, ' – ');
                        return (
                          <div
                            key={`${group.dateStr}-${ev.id}`}
                            onClick={() => handleEventClick(ev)}
                            className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 bg-slate-50/90 hover:bg-slate-100 dark:bg-slate-700/40 dark:hover:bg-slate-700/70 border border-slate-200/70 dark:border-slate-700/80 transition-colors cursor-pointer"
                            title="คลิกเพื่อดูรายละเอียดแบบเต็ม"
                          >
                            <div className="min-w-0 flex-1">
                              <div
                                className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-100 truncate"
                                title={ev.title}
                              >
                                {ev.title}
                              </div>
                              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 whitespace-nowrap">
                                {formattedTime}
                              </div>
                            </div>
                            {durationBadge && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-400/20 whitespace-nowrap shrink-0">
                                {durationBadge}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ปุ่มดูกิจกรรมทั้งหมด */}
      <Link
        href="/my-news"
        className="mt-2 w-full py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-center block shrink-0"
      >
        ดูกิจกรรมทั้งหมด
      </Link>

      {/* Modal รายละเอียดกิจกรรมแบบเต็ม */}
      <EventDetailModal
        event={selectedDetail}
        onClose={() => setSelectedDetail(null)}
      />
    </div>
  );
};

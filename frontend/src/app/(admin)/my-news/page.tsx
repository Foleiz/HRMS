'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Pin,
  Calendar as CalendarIcon,
  Users,
  X,
  Sparkles,
  CheckCheck,
  Megaphone,
  Clock,
  Eye,
  Info
} from 'lucide-react';
import { announcementService } from '@/services/announcementService';
import { Announcement, AnnouncementCategory, AnnouncementPriority } from '@/types/announcement';
import { useBreadcrumb } from '@/context/BreadcrumbContext';

// ─── Color Themes matching Mockup ────────────────────────────
// อบรมพนักงานใหม่ = Orange/Amber
// ประชุมทีม = Light Sky Blue
// ส่งรายงาน = Light Green
// นำเสนอผลงาน = Light Rose/Pink
// ตรวจสอบงาน = Light Purple
const CATEGORY_STYLES: Record<string, {
  label: string;
  pillBg: string;
  pillText: string;
  dotColor: string;
  badgeBg: string;
}> = {
  ACTIVITY: {
    label: 'กิจกรรมและการอบรม',
    pillBg: 'bg-[#FED7AA]/80 hover:bg-[#FDBA74]',
    pillText: 'text-[#7C2D12]',
    dotColor: 'bg-amber-500',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  POLICY: {
    label: 'นโยบายและข้อบังคับ',
    pillBg: 'bg-[#BAE6FD]/80 hover:bg-[#7DD3FC]',
    pillText: 'text-[#0369A1]',
    dotColor: 'bg-sky-500',
    badgeBg: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  GENERAL: {
    label: 'ข่าวสารและส่งงาน',
    pillBg: 'bg-[#BBF7D0]/80 hover:bg-[#86EFAC]',
    pillText: 'text-[#166534]',
    dotColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  URGENT: {
    label: 'ประกาศด่วน / นำเสนอผลงาน',
    pillBg: 'bg-[#FECDD3]/80 hover:bg-[#FDA4AF]',
    pillText: 'text-[#9F1239]',
    dotColor: 'bg-rose-500',
    badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  WELFARE: {
    label: 'สวัสดิการและตรวจสอบงาน',
    pillBg: 'bg-[#E9D5FF]/80 hover:bg-[#D8B4FE]',
    pillText: 'text-[#6B21A8]',
    dotColor: 'bg-purple-500',
    badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
  },
};

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const WEEKDAYS = [
  { key: 0, label: 'อาทิตย์', color: 'text-rose-500' },
  { key: 1, label: 'จันทร์', color: 'text-slate-700' },
  { key: 2, label: 'อังคาร', color: 'text-slate-700' },
  { key: 3, label: 'พุธ', color: 'text-slate-700' },
  { key: 4, label: 'พฤหัสบดี', color: 'text-slate-700' },
  { key: 5, label: 'ศุกร์', color: 'text-slate-700' },
  { key: 6, label: 'เสาร์', color: 'text-blue-600' },
];

export default function MyNewsCalendarPage() {
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();

  // Active Date for Calendar Navigation
  const [currentDate, setCurrentDate] = useState(() => new Date());
  // View mode: 'MONTH' | 'WEEK'
  const [viewMode, setViewMode] = useState<'MONTH' | 'WEEK'>('MONTH');

  // Announcements Data
  const [feedItems, setFeedItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Reading State
  const [readingItem, setReadingItem] = useState<Announcement | null>(null);

  // Set Breadcrumb
  useEffect(() => {
    setBreadcrumb({
      section: 'บริการตนเอง (ESS)',
      page: 'ข่าวสารสำหรับฉัน',
    });
  }, [setBreadcrumb]);

  // Fetch Feed
  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const data = await announcementService.getMyFeed();
      setFeedItems(data || []);
    } catch (err) {
      console.error('Failed to fetch news feed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Navigate Months
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleGoToday = () => {
    setCurrentDate(new Date());
  };

  // Open Reading Modal and Mark Read
  const handleOpenReading = async (a: Announcement) => {
    setReadingItem(a);
    if (!a.isReadByCurrentUser) {
      try {
        await announcementService.markAsRead(a.id);
        setFeedItems((prev) =>
          prev.map((item) =>
            item.id === a.id
              ? { ...item, isReadByCurrentUser: true, readCount: item.readCount + 1 }
              : item
          )
        );
      } catch (err) {
        console.error('Failed to mark as read', err);
      }
    }
  };

  // Thai Date formatting
  const thaiYear = currentDate.getFullYear() + 543;
  const monthName = THAI_MONTHS[currentDate.getMonth()];
  const displayMonthYear = `${monthName} ${thaiYear}`;

  // Build Calendar Matrix (Month View)
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);
    // Last day of month
    const lastDay = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDay.getDay(); // 0 (Sun) to 6 (Sat)
    const daysInMonth = lastDay.getDate();

    // Days from previous month to fill leading slots
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const leadingDays = [];
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      leadingDays.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
        dayNumber: prevMonthLastDay - i,
      });
    }

    // Days of current month
    const currentMonthDays = [];
    for (let i = 1; i <= daysInMonth; i++) {
      currentMonthDays.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
        dayNumber: i,
      });
    }

    // Days from next month to complete the 35 or 42 grid slots
    const totalSlots = leadingDays.length + currentMonthDays.length;
    const trailingCount = totalSlots <= 35 ? 35 - totalSlots : 42 - totalSlots;
    const trailingDays = [];
    for (let i = 1; i <= trailingCount; i++) {
      trailingDays.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
        dayNumber: i,
      });
    }

    return [...leadingDays, ...currentMonthDays, ...trailingDays];
  }, [currentDate]);

  // Week View Days
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const day = curr.getDay();
    const diff = curr.getDate() - day; // start on Sunday
    const startOfWeek = new Date(curr.setDate(diff));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push({
        date: d,
        isCurrentMonth: d.getMonth() === currentDate.getMonth(),
        dayNumber: d.getDate(),
      });
    }
    return days;
  }, [currentDate]);

  // Helper to check if announcement falls on date
  const getAnnouncementsForDate = (date: Date) => {
    const targetY = date.getFullYear();
    const targetM = date.getMonth();
    const targetD = date.getDate();

    return feedItems.filter((item) => {
      const pubDate = new Date(item.publishedAt || item.createdAt);
      const isSameDay =
        pubDate.getFullYear() === targetY &&
        pubDate.getMonth() === targetM &&
        pubDate.getDate() === targetD;

      if (isSameDay) return true;

      // If item has expireAt, check if date falls in interval
      if (item.expireAt) {
        const expDate = new Date(item.expireAt);
        const targetTime = date.getTime();
        if (targetTime >= pubDate.getTime() && targetTime <= expDate.getTime()) {
          return true;
        }
      }

      return false;
    });
  };

  const today = new Date();
  const isToday = (d: Date) =>
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  return (
    <div className="space-y-5 pb-16">
      {/* Top Header Row */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-[#0B2046] text-white flex items-center justify-center hover:bg-[#0B2046]/90 transition-all shadow-sm cursor-pointer shrink-0"
          title="ย้อนกลับ"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            ตารางการทำงานและข่าวสารสำหรับฉัน
          </h1>
          <p className="text-xs text-slate-500">
            ปฏิทินแสดงกำหนดการ ข่าวสารประกาศ กิจกรรม และนโยบายที่เกี่ยวข้องกับคุณในแต่ละวัน
          </p>
        </div>
      </div>

      {/* Main Navigation Controls Card (Identical to mockup) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Month Navigator with Arrows */}
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 rounded-xl px-2 py-1 shadow-2xs">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-slate-200/80 text-slate-600 rounded-lg transition-colors cursor-pointer"
            title="เดือนก่อนหน้า"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-sm text-slate-800 min-w-[130px] text-center select-none">
            {displayMonthYear}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-slate-200/80 text-slate-600 rounded-lg transition-colors cursor-pointer"
            title="เดือนถัดไป"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* View Mode Switcher: วันนี้ | สัปดาห์ | เดือน */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 text-xs font-semibold">
          <button
            type="button"
            onClick={handleGoToday}
            className="px-4 py-1.5 rounded-lg text-slate-700 hover:bg-white/80 transition-all cursor-pointer"
          >
            วันนี้
          </button>
          <button
            type="button"
            onClick={() => setViewMode('WEEK')}
            className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'WEEK'
                ? 'bg-[#2563EB] text-white shadow-xs font-bold'
                : 'text-slate-700 hover:bg-white/80'
            }`}
          >
            สัปดาห์
          </button>
          <button
            type="button"
            onClick={() => setViewMode('MONTH')}
            className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'MONTH'
                ? 'bg-[#2563EB] text-white shadow-xs font-bold'
                : 'text-slate-700 hover:bg-white/80'
            }`}
          >
            เดือน
          </button>
        </div>
      </div>

      {/* Calendar View Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-slate-200 text-center bg-slate-50/50">
          {WEEKDAYS.map((wd) => (
            <div key={wd.key} className="py-3 px-1 text-xs font-bold uppercase tracking-wider">
              <span className={wd.color}>{wd.label}</span>
            </div>
          ))}
        </div>

        {/* Month View Grid */}
        {viewMode === 'MONTH' ? (
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 border-b border-slate-200">
            {calendarDays.map((dayItem, idx) => {
              const dayOfWeek = dayItem.date.getDay();
              const isSun = dayOfWeek === 0;
              const isSat = dayOfWeek === 6;
              const isCurrentDay = isToday(dayItem.date);
              const itemsOnDay = getAnnouncementsForDate(dayItem.date);

              return (
                <div
                  key={idx}
                  className={`min-h-[115px] sm:min-h-[125px] p-2 flex flex-col justify-between transition-colors ${
                    !dayItem.isCurrentMonth ? 'bg-slate-50/40 text-slate-300' : 'bg-white text-slate-800'
                  } ${isCurrentDay ? 'ring-2 ring-blue-500/40 inset-ring inset-0 bg-blue-50/20' : ''}`}
                >
                  {/* Date Number */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        !dayItem.isCurrentMonth
                          ? 'text-slate-300'
                          : isSun
                          ? 'text-rose-500'
                          : isSat
                          ? 'text-blue-600'
                          : 'text-slate-700'
                      } ${
                        isCurrentDay
                          ? 'w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs'
                          : ''
                      }`}
                    >
                      {dayItem.dayNumber}
                    </span>

                    {itemsOnDay.length > 0 && dayItem.isCurrentMonth && (
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {itemsOnDay.length}
                      </span>
                    )}
                  </div>

                  {/* Pills List for this day */}
                  <div className="space-y-1.5 mt-1.5 flex-1">
                    {itemsOnDay.slice(0, 3).map((item) => {
                      const style = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.GENERAL;

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleOpenReading(item)}
                          className={`w-full text-left px-2 py-1 rounded-md text-[11px] font-medium leading-tight truncate transition-all cursor-pointer shadow-2xs flex items-center gap-1 ${style.pillBg} ${style.pillText}`}
                          title={`${item.title} (${style.label})`}
                        >
                          {item.isPinned && (
                            <Pin className="w-2.5 h-2.5 shrink-0 fill-current opacity-80" />
                          )}
                          {!item.isReadByCurrentUser && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                          )}
                          <span className="truncate">{item.title}</span>
                        </div>
                      );
                    })}

                    {itemsOnDay.length > 3 && (
                      <div
                        onClick={() => handleOpenReading(itemsOnDay[3])}
                        className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer pl-1"
                      >
                        +{itemsOnDay.length - 3} รายการเพิ่มเติม
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Week View Grid */
          <div className="grid grid-cols-7 divide-x divide-slate-200 border-b border-slate-200 min-h-[360px]">
            {weekDays.map((dayItem, idx) => {
              const dayOfWeek = dayItem.date.getDay();
              const isSun = dayOfWeek === 0;
              const isSat = dayOfWeek === 6;
              const isCurrentDay = isToday(dayItem.date);
              const itemsOnDay = getAnnouncementsForDate(dayItem.date);

              return (
                <div
                  key={idx}
                  className={`p-3 flex flex-col justify-start gap-2 ${
                    isCurrentDay ? 'bg-blue-50/20 ring-1 ring-blue-500/30' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span
                      className={`text-sm font-bold ${
                        isSun ? 'text-rose-500' : isSat ? 'text-blue-600' : 'text-slate-800'
                      } ${
                        isCurrentDay
                          ? 'w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center'
                          : ''
                      }`}
                    >
                      {dayItem.dayNumber}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {dayItem.date.toLocaleDateString('th-TH', { month: 'short' })}
                    </span>
                  </div>

                  <div className="space-y-2 mt-1">
                    {itemsOnDay.length === 0 ? (
                      <span className="text-[11px] text-slate-300 block italic">ไม่มีประกาศ</span>
                    ) : (
                      itemsOnDay.map((item) => {
                        const style = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.GENERAL;
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleOpenReading(item)}
                            className={`p-2 rounded-lg text-xs font-medium cursor-pointer shadow-2xs transition-all ${style.pillBg} ${style.pillText}`}
                          >
                            <div className="flex items-center gap-1 font-bold text-[11px]">
                              {item.isPinned && <Pin className="w-3 h-3 fill-current" />}
                              {!item.isReadByCurrentUser && (
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              )}
                              <span className="truncate">{item.title}</span>
                            </div>
                            <p className="text-[10px] opacity-80 line-clamp-2 mt-1 leading-relaxed">
                              {item.content}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Color Legend Bar at Bottom */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-200/80 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs">
          <span className="font-bold text-slate-600 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>คำอธิบายสีหัวข้อประกาศ:</span>
          </span>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-700">
              <span className="w-3.5 h-3.5 rounded-sm bg-[#FED7AA] border border-[#FDBA74]" />
              <span>กิจกรรม / อบรมพนักงาน</span>
            </span>

            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-700">
              <span className="w-3.5 h-3.5 rounded-sm bg-[#BAE6FD] border border-[#7DD3FC]" />
              <span>นโยบาย / ประชุมทีม</span>
            </span>

            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-700">
              <span className="w-3.5 h-3.5 rounded-sm bg-[#BBF7D0] border border-[#86EFAC]" />
              <span>ข่าวสารทั่วไป / ส่งรายงาน</span>
            </span>

            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-700">
              <span className="w-3.5 h-3.5 rounded-sm bg-[#FECDD3] border border-[#FDA4AF]" />
              <span>ประกาศด่วน / นำเสนอผลงาน</span>
            </span>

            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-700">
              <span className="w-3.5 h-3.5 rounded-sm bg-[#E9D5FF] border border-[#D8B4FE]" />
              <span>สวัสดิการ / ตรวจสอบงาน</span>
            </span>
          </div>
        </div>
      </div>

      {/* Reading Modal (Identical full details) */}
      {readingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header Banner Image */}
            {readingItem.bannerImageUrl ? (
              <div className="w-full h-48 bg-slate-100 relative overflow-hidden">
                <img
                  src={readingItem.bannerImageUrl}
                  alt={readingItem.title}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setReadingItem(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0B2046] flex items-center justify-center">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-500">ข่าวสารและประกาศ</span>
                </div>
                <button
                  type="button"
                  onClick={() => setReadingItem(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Modal Body Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                {readingItem.isPinned && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <Pin className="w-3.5 h-3.5 fill-amber-500" />
                    <span>ปักหมุด</span>
                  </span>
                )}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${CATEGORY_STYLES[readingItem.category]?.badgeBg || 'bg-slate-100 text-slate-700'}`}>
                  {CATEGORY_STYLES[readingItem.category]?.label || readingItem.category}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-600">
                  {readingItem.priority === 'URGENT' ? 'ด่วนที่สุด' : readingItem.priority === 'HIGH' ? 'สำคัญ' : 'ปกติ'}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-slate-900 leading-snug">
                {readingItem.title}
              </h2>

              {/* Metadata */}
              <div className="flex items-center gap-4 text-xs text-slate-400 pb-3 border-b border-slate-100">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {new Date(readingItem.publishedAt || readingItem.createdAt).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </span>
                {readingItem.createdByEmployeeName && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>ผู้ประกาศ: {readingItem.createdByEmployeeName}</span>
                  </span>
                )}
              </div>

              {/* Content Body */}
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap pt-2">
                {readingItem.content}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCheck className="w-4 h-4" />
                <span>บันทึกการเปิดอ่านเรียบร้อยแล้ว</span>
              </span>
              <button
                type="button"
                onClick={() => setReadingItem(null)}
                className="px-5 py-2 rounded-xl bg-[#0B2046] text-white font-semibold text-xs hover:bg-[#0B2046]/90 transition-all cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

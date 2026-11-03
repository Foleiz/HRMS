'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  Settings,
  AlertTriangle,
  CalendarCheck,
  PlusSquare,
  Clock,
  CreditCard,
  FileText,
  AlertCircle,
  Inbox,
  Loader2,
} from 'lucide-react';
import { notificationService } from '@/services/notificationService';
import { NotificationItem } from '@/types/notification';
import { useAuth } from '@/context/AuthContext';
import { useAnimatedMount } from '@/hooks/useAnimatedMount';

type TabKey = 'ALL' | 'UNREAD' | 'READ' | 'OTHER';

function formatNotificationDate(dateStr: string, fallbackTimeAgo?: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return fallbackTimeAgo || dateStr;
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} ${hours}:${mins}`;
  } catch {
    return fallbackTimeAgo || dateStr;
  }
}

export const NotificationBell: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const { shouldRender: shouldRenderNotifications, isActive: isNotificationsActive } =
    useAnimatedMount(isOpen, 150);

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');
  const [showAll, setShowAll] = useState(false);

  // Reset showAll when closing dropdown
  useEffect(() => {
    if (!isOpen) {
      setShowAll(false);
    }
  }, [isOpen]);

  // Settings popover
  const [showSettings, setShowSettings] = useState(false);
  const [muteWeb, setMuteWeb] = useState(false);
  const [muteSound, setMuteSound] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Load preferences from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMuteWeb(localStorage.getItem('hrms_mute_web_notif') === 'true');
      setMuteSound(localStorage.getItem('hrms_mute_sound_notif') === 'true');
    }
  }, []);

  const toggleMuteWeb = () => {
    const val = !muteWeb;
    setMuteWeb(val);
    localStorage.setItem('hrms_mute_web_notif', String(val));
  };

  const toggleMuteSound = () => {
    const val = !muteSound;
    setMuteSound(val);
    localStorage.setItem('hrms_mute_sound_notif', String(val));
  };

  const handleRequestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification('เปิดการแจ้งเตือนสำเร็จ', {
            body: 'ระบบ HRMS จะส่งการแจ้งเตือนผ่านบราวเซอร์ให้คุณเมื่อมีกิจกรรมใหม่',
            icon: '/syaco-logo.png',
          });
        }
      } catch (e) {
        console.warn('Browser notification permission error:', e);
      }
    }
  };

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    if (!user) return;
    try {
      const summary = await notificationService.getSummary();
      setUnreadCount(summary.unreadCount);
      setNotifications(summary.recentNotifications);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  }, [user]);

  // Initial load and periodic polling every 45s
  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 45000);
    return () => clearInterval(interval);
  }, [fetchSummary]);

  // Close dropdown or settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (settingsRef.current && !settingsRef.current.contains(target)) {
        setShowSettings(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Mark All as Read
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await notificationService.markAllAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    } finally {
      setMarkingAll(false);
    }
  };

  // Handle item click
  const handleItemClick = async (item: NotificationItem) => {
    setIsOpen(false);
    setShowSettings(false);

    if (!item.isRead) {
      try {
        await notificationService.markAsRead(item.id);
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
      } catch (err) {
        console.error('Failed to mark notification read', err);
      }
    }

    if (item.targetUrl) {
      router.push(item.targetUrl);
    }
  };

  // Filtered notifications by active tab (ทั้งหมด, ยังไม่ได้อ่าน, อื่นๆ)
  const filteredNotifications = useMemo(() => {
    if (activeTab === 'ALL') return notifications;
    if (activeTab === 'UNREAD') return notifications.filter((n) => !n.isRead);
    if (activeTab === 'READ') return notifications.filter((n) => n.isRead);

    // OTHER: ข่าวสาร ประกาศ สัญญา หรือการแจ้งเตือนทั่วไป
    return notifications.filter((n) => {
      const t = (n.notificationType || '').toUpperCase();
      return (
        t.includes('ANNOUNCEMENT') ||
        t.includes('PAYROLL') ||
        t.includes('GENERAL') ||
        t.includes('DOCUMENT') ||
        t.includes('PROBATION') ||
        t.includes('CONTRACT')
      );
    });
  }, [notifications, activeTab]);

  // Slice to 3 items initially unless showAll is true
  const displayedNotifications = useMemo(() => {
    if (showAll || filteredNotifications.length <= 3) {
      return filteredNotifications;
    }
    return filteredNotifications.slice(0, 3);
  }, [filteredNotifications, showAll]);

  // Group notifications by date (วันนี้ / เมื่อวาน / ก่อนหน้านี้)
  const groupedNotifications = useMemo(() => {
    if (displayedNotifications.length === 0) return [];

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const isSameDay = (d1: Date, d2: Date) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();

    const todayItems: NotificationItem[] = [];
    const yesterdayItems: NotificationItem[] = [];
    const earlierItems: NotificationItem[] = [];

    for (const item of displayedNotifications) {
      const d = new Date(item.createdAt);
      if (isNaN(d.getTime())) {
        earlierItems.push(item);
      } else if (isSameDay(d, today)) {
        todayItems.push(item);
      } else if (isSameDay(d, yesterday)) {
        yesterdayItems.push(item);
      } else {
        earlierItems.push(item);
      }
    }

    const groups: { title: string; items: NotificationItem[] }[] = [];
    if (todayItems.length > 0) groups.push({ title: 'วันนี้', items: todayItems });
    if (yesterdayItems.length > 0) groups.push({ title: 'เมื่อวาน', items: yesterdayItems });
    if (earlierItems.length > 0) {
      groups.push({
        title: groups.length === 0 ? 'วันนี้' : 'ก่อนหน้านี้',
        items: earlierItems,
      });
    }

    return groups;
  }, [displayedNotifications]);

  // Item styling helper (Uses System Theme Palette)
  const getItemTheme = (item: NotificationItem) => {
    // พื้นหลัง: ถ้ายังไม่ได้อ่านเป็นสีเหลืองนวล ถ้าอ่านแล้วเป็นสีขาว
    const bg = !item.isRead
      ? 'bg-[#FFFDF5] dark:bg-amber-950/30 hover:bg-[#FFF9E6] dark:hover:bg-amber-950/40'
      : 'bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-750';
    const t = (item.notificationType || '').toUpperCase();
    const text = (item.title + ' ' + (item.message || '')).toLowerCase();

    // 1. Warning / Alert Theme (e.g. Stock low, Expiry, Urgent Alert)
    if (
      t.includes('ANNOUNCEMENT') ||
      t.includes('DOCUMENT') ||
      t.includes('PROBATION') ||
      text.includes('หมด') ||
      text.includes('ด่วน') ||
      text.includes('เตือน') ||
      text.includes('สำคัญ')
    ) {
      return {
        bg,
        icon: <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />,
        titleColor: 'text-amber-700 dark:text-amber-400',
      };
    }

    // 2. Check-in / Attendance / Activity Blue Theme
    if (
      t.includes('ATTENDANCE') ||
      t.includes('TIME') ||
      text.includes('เช็คอิน') ||
      text.includes('ลงเวลา') ||
      text.includes('มาทำงาน')
    ) {
      return {
        bg,
        icon: <CalendarCheck className="w-4 h-4 text-accent dark:text-sky-400 shrink-0" />,
        titleColor: 'text-accent dark:text-sky-400',
      };
    }

    // 3. New Booking / Request / Approval / Financial Primary Theme
    return {
      bg,
      icon: <PlusSquare className="w-4 h-4 text-primary dark:text-blue-400 shrink-0" />,
      titleColor: 'text-primary dark:text-blue-300',
    };
  };

  const handleViewAll = () => {
    setIsOpen(false);
    setShowSettings(false);
    router.push('/announcements');
  };

  const badgeText = unreadCount > 50 ? '50+' : unreadCount > 0 ? String(unreadCount) : '0';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        title="การแจ้งเตือน"
        onClick={() => {
          setIsOpen(!isOpen);
          setShowSettings(false);
          if (!isOpen) fetchSummary();
        }}
        className="w-9 h-9 rounded-full bg-[#F1F5F9] hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center justify-center transition-colors relative cursor-pointer outline-none focus:outline-none focus-visible:outline-none select-none"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary dark:bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-800">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Popover Dropdown */}
      {shouldRenderNotifications && (
        <div
          className={`absolute right-0 mt-2.5 w-[360px] sm:w-[440px] max-w-[calc(100vw-1rem)] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl z-50 origin-top-right transition-all duration-150 ease-out overflow-visible font-sans ${
            isNotificationsActive
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
          }`}
        >
          {/* Top Pointer Arrow */}
          <div className="absolute -top-1.5 right-3 w-3 h-3 bg-white dark:bg-slate-900 border-t border-l border-slate-200/90 dark:border-slate-800 rotate-45 z-10" />

          {/* 1. Header Bar */}
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 relative z-20">
            {/* Title & Badge */}
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                แจ้งเตือน
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/70 text-primary dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
                {badgeText}
              </span>
            </div>

            {/* Actions: Mark all as read & Settings Cog */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={unreadCount === 0 || markingAll}
                onClick={handleMarkAllAsRead}
                className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 underline underline-offset-2 transition-colors cursor-pointer disabled:opacity-40 disabled:no-underline outline-none focus:outline-none focus-visible:outline-none select-none"
              >
                {markingAll ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5" />
                )}
                <span>อ่านแล้วทั้งหมด</span>
              </button>

              <button
                type="button"
                title="ตั้งค่าการแจ้งเตือน"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSettings((prev) => !prev);
                }}
                className={`p-1 rounded-lg transition-all cursor-pointer outline-none focus:outline-none focus-visible:outline-none select-none ${
                  showSettings
                    ? 'text-primary dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50'
                    : 'text-slate-400 hover:text-primary dark:hover:text-blue-400'
                }`}
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Settings Floating Sub-menu */}
          {showSettings && (
            <div
              ref={settingsRef}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-14 right-4 z-40 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-3.5 space-y-2.5 animate-in fade-in zoom-in-95 duration-150"
            >
              {/* Header Action Banner */}
              <button
                type="button"
                onClick={handleRequestBrowserPermission}
                className="w-full py-2 px-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs text-center transition-colors shadow-xs cursor-pointer"
              >
                เปิดการแจ้งเตือน
              </button>

              {/* Option 1: Mute Website Notifications */}
              <div className="p-2.5 rounded-xl border border-blue-200 dark:border-blue-800/80 bg-blue-50/40 dark:bg-blue-950/30 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  ปิดการแจ้งเตือนเว็บไซต์
                </span>
                <button
                  type="button"
                  onClick={toggleMuteWeb}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer outline-none focus:outline-none focus:ring-0 select-none ${
                    muteWeb ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      muteWeb ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Option 2: Mute Sound */}
              <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  ปิดเสียงการแจ้งเตือน
                </span>
                <button
                  type="button"
                  onClick={toggleMuteSound}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                    muteSound ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      muteSound ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* 2. Filter Pill Tabs (ตัดหัวข้อ "คิว" ออกตามที่ขอ) */}
          <div className="px-5 py-2.5 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
            {(
              [
                { key: 'ALL', label: 'ทั้งหมด' },
                { key: 'UNREAD', label: 'ยังไม่ได้อ่าน' },
                { key: 'READ', label: 'อ่านแล้ว' },
                { key: 'OTHER', label: 'อื่นๆ' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => { setActiveTab(tab.key); setShowAll(false); }}
                className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                  activeTab === tab.key
                    ? 'bg-blue-50 dark:bg-blue-950/70 text-primary dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 3. Notification List Items */}
          <div className={`${showAll ? 'max-h-[360px] overflow-y-auto' : 'overflow-hidden'} divide-y divide-slate-100 dark:divide-slate-800 transition-all duration-200`}>
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500 text-xs">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span>กำลังโหลดการแจ้งเตือน...</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-2">
                  <Inbox className="w-5 h-5 stroke-[1.5]" />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  ไม่มีการแจ้งเตือนในขณะนี้
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  เมื่อมีคำขอหรือข่าวสารใหม่ ระบบจะแสดงที่นี่
                </p>
              </div>
            ) : (
              groupedNotifications.map((group) => (
                <div key={group.title}>
                  {/* Group Date Header */}
                  <div className="px-5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50/70 dark:bg-slate-900/60 border-y border-slate-100 dark:border-slate-800">
                    {group.title}
                  </div>

                  {/* Items in this group */}
                  {group.items.map((item) => {
                    const theme = getItemTheme(item);
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className={`p-4 transition-all cursor-pointer flex items-start gap-3 relative ${theme.bg}`}
                      >
                        {/* Icon */}
                        <div className="mt-0.5 shrink-0">{theme.icon}</div>

                        {/* Text Details */}
                        <div className="flex-1 min-w-0 pr-2">
                          <h4 className={`text-xs font-bold ${theme.titleColor} leading-snug line-clamp-1`}>
                            {item.title}
                          </h4>
                          {item.message && (
                            <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 mt-1 leading-relaxed">
                              {item.message}
                            </p>
                          )}
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 block">
                            {formatNotificationDate(item.createdAt, item.timeAgo)}
                          </span>
                        </div>

                        {/* Unread Dot on the right (System Primary Color) */}
                        {!item.isRead && (
                          <div className="mt-1.5 shrink-0">
                            <span className="w-2 h-2 rounded-full bg-primary dark:bg-blue-400 block" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* 4. Footer Link */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-center bg-white dark:bg-slate-900 rounded-b-3xl">
            {filteredNotifications.length > 3 && !showAll ? (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="text-xs font-bold text-accent dark:text-blue-400 hover:text-primary-hover dark:hover:text-blue-300 transition-colors cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none"
              >
                ดูการแจ้งเตือนทั้งหมด
              </button>
            ) : showAll && filteredNotifications.length > 3 ? (
              <button
                type="button"
                onClick={() => setShowAll(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none"
              >
                ย่อการแจ้งเตือน
              </button>
            ) : (
              <button
                type="button"
                onClick={handleViewAll}
                className="text-xs font-bold text-accent dark:text-blue-400 hover:text-primary-hover dark:hover:text-blue-300 transition-colors cursor-pointer"
              >
                ดูการแจ้งเตือนทั้งหมด
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

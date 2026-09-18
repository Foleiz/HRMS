'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  CalendarCheck,
  CheckCircle2,
  Megaphone,
  CreditCard,
  Clock,
  ChevronRight,
  Loader2,
  Inbox,
  AlertCircle
} from 'lucide-react';
import { notificationService } from '@/services/notificationService';
import { NotificationItem } from '@/types/notification';
import { useAuth } from '@/context/AuthContext';

export const NotificationBell: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
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

  // Icon based on type
  const getIcon = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes('LEAVE')) {
      return <CalendarCheck className="w-4 h-4 text-blue-600" />;
    }
    if (t.includes('APPROVAL')) {
      return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    }
    if (t.includes('ANNOUNCEMENT')) {
      return <Megaphone className="w-4 h-4 text-amber-600" />;
    }
    if (t.includes('PAYROLL')) {
      return <CreditCard className="w-4 h-4 text-indigo-600" />;
    }
    if (t.includes('TIME') || t.includes('ATTENDANCE')) {
      return <Clock className="w-4 h-4 text-purple-600" />;
    }
    return <AlertCircle className="w-4 h-4 text-slate-600" />;
  };

  const getBgColor = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes('LEAVE')) return 'bg-blue-50';
    if (t.includes('APPROVAL')) return 'bg-emerald-50';
    if (t.includes('ANNOUNCEMENT')) return 'bg-amber-50';
    if (t.includes('PAYROLL')) return 'bg-indigo-50';
    if (t.includes('TIME') || t.includes('ATTENDANCE')) return 'bg-purple-50';
    return 'bg-slate-100';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        title="การแจ้งเตือน"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchSummary();
        }}
        className="w-9 h-9 rounded-full bg-[#F1F5F9] hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors relative cursor-pointer"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">การแจ้งเตือน</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                  {unreadCount} รายการใหม่
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                disabled={markingAll}
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-semibold text-[#0B2046] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {markingAll ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5" />
                )}
                <span>อ่านทั้งหมด</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                <Loader2 className="w-5 h-5 animate-spin text-[#0B2046]" />
                <span>กำลังโหลดการแจ้งเตือน...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <Inbox className="w-5 h-5 stroke-[1.5]" />
                </div>
                <p className="text-xs font-semibold text-slate-700">ไม่มีการแจ้งเตือนในขณะนี้</p>
                <p className="text-[11px] text-slate-400 mt-0.5">คุณจะได้รับการแจ้งเตือนเมื่อมีคำขอหรือข่าวสารใหม่</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`p-3.5 hover:bg-slate-50/90 transition-colors cursor-pointer flex gap-3 items-start relative group ${
                    !item.isRead ? 'bg-blue-50/30' : ''
                  }`}
                >
                  {/* Unread indicator dot */}
                  {!item.isRead && (
                    <span className="absolute top-4 left-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
                  )}

                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-xl ${getBgColor(item.notificationType)} flex items-center justify-center shrink-0 mt-0.5`}>
                    {getIcon(item.notificationType)}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-xs ${!item.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'} leading-tight line-clamp-1`}>
                      {item.title}
                    </h4>
                    {item.message && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                        {item.message}
                      </p>
                    )}
                    <span className="text-[10px] text-slate-400 mt-1.5 block">
                      {item.timeAgo}
                    </span>
                  </div>

                  {/* Arrow on hover */}
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors shrink-0 mt-1" />
                </div>
              ))
            )}
          </div>

          {/* Footer Link */}
          {notifications.length > 0 && (
            <div className="p-2 border-t border-slate-100 bg-slate-50/50 text-center">
              <span className="text-[10px] text-slate-400">
                คลิกที่รายการแจ้งเตือนเพื่อเปิดดูข้อมูลและนำทางไปยังหน้าที่เกี่ยวข้อง
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

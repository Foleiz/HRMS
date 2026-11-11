'use client';

import React from 'react';
import { Calendar, Clock, Users, Sparkles, Pin } from 'lucide-react';
import { ModalShell } from '@/components/ui/ModalShell';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Button } from '@/components/ui/Button';

export interface EventDetailData {
  title: string;
  typeLabel: string;
  isHoliday: boolean;
  dateStr: string;
  timeRange: string;
  description?: string;
  targetAudience?: string;
  isPinned?: boolean;
}

interface EventDetailModalProps {
  event: EventDetailData | null;
  onClose: () => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({ event, onClose }) => {
  if (!event) return null;

  return (
    <ModalShell
      className="z-50 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      innerClassName="items-center justify-center p-4"
      onBackdropClick={onClose}
    >
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
        <ModalHeader
          icon={event.isHoliday ? Calendar : Sparkles}
          title={event.isHoliday ? 'รายละเอียดวันหยุด' : 'รายละเอียดประกาศกิจกรรม'}
          onClose={onClose}
        />

        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Header Badges & Title */}
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`font-semibold px-2.5 py-0.5 rounded-full border text-2xs ${
                  event.isHoliday
                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                    : 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                }`}
              >
                {event.typeLabel}
              </span>
              {event.isPinned && (
                <span className="font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-2xs flex items-center gap-1 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                  <Pin className="w-2.5 h-2.5 fill-amber-500" /> ปักหมุด
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-2 leading-snug">
              {event.title}
            </h3>
          </div>

          {/* Schedule Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  event.isHoliday
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300'
                    : 'bg-blue-50 text-[#0B2046] dark:bg-blue-950/60 dark:text-blue-300'
                }`}
              >
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-2xs text-slate-400 block font-medium">วันที่</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate block">
                  {event.dateStr}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  event.isHoliday
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300'
                    : 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300'
                }`}
              >
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-2xs text-slate-400 block font-medium">เวลา</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate block">
                  {event.timeRange || (event.isHoliday ? 'ตลอดทั้งวัน' : '09:00')}
                </span>
              </div>
            </div>
          </div>

          {/* Target Audience (กิจกรรมเท่านั้น) */}
          {!event.isHoliday && (
            <div>
              <span className="text-2xs text-slate-400 block mb-1 font-medium">กลุ่มเป้าหมายผู้เข้าร่วม:</span>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/40 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
                <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{event.targetAudience || 'ทุกคนในองค์กร'}</span>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <span className="text-2xs text-slate-400 block mb-1 font-medium">
              {event.isHoliday ? 'รายละเอียดเพิ่มเติม:' : 'รายละเอียดกิจกรรม:'}
            </span>
            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60">
              {event.description && event.description.trim() ? (
                event.description.trim()
              ) : (
                <span className="text-slate-400 italic">
                  {event.isHoliday ? 'วันหยุดตามประกาศของบริษัท' : 'ไม่มีรายละเอียดเพิ่มเติม'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            ปิดหน้าต่าง
          </Button>
        </div>
      </div>
    </ModalShell>
  );
};

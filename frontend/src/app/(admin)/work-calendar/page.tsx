'use client';

import { useLoadPhase } from '@/hooks/useLoadPhase';
import { RefreshIndicator } from '@/components/ui/RefreshIndicator';
import { ModalShell, Button, TabBar, type TabBarItem } from '@/components/ui';
import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CalendarDays,
  Clock,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Sun,
  Moon,
  Check,
  Sparkles,
  List,
} from 'lucide-react';
import { workCalendarService } from '@/services/workCalendarService';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useToast } from '@/context/ToastContext';
import ThaiTimePicker from '@/components/common/ThaiTimePicker';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useAuth } from '@/context/AuthContext';
import {
  WorkWeekDay,
  Holiday,
  CreateHolidayRequest,
  UpdateHolidayRequest,
} from '@/types/workCalendar';

type TabType = 'work-week' | 'holidays';

const dayColorMap: Record<number, { bg: string; text: string; border: string; badge: string }> = {
  0: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', badge: 'bg-rose-100 text-rose-800' }, // อาทิตย์
  1: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800' }, // จันทร์
  2: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', badge: 'bg-pink-100 text-pink-800' }, // อังคาร
  3: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-800' }, // พุธ
  4: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-800' }, // พฤหัสบดี
  5: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', badge: 'bg-sky-100 text-sky-800' }, // ศุกร์
  6: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-800' }, // เสาร์
};

const thaiMonths = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const thaiDayNamesShort = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

function formatThaiDate(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const d = new Date(year, month, day);
  const dayName = thaiDayNamesShort[d.getDay()];
  const thaiYear = year + 543;

  return `${dayName} ${day} ${thaiMonths[month]} ${thaiYear}`;
}

function formatThaiShortDate(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parts[1].padStart(2, '0');
  const day = parts[2].padStart(2, '0');
  return `${day}/${month}/${year + 543}`;
}

/** สีตามประเภทวันหยุด (ใช้ทั้งป้ายในตารางและปฏิทิน) */
const HOLIDAY_TYPE_STYLE: Record<string, { cell: string; dot: string; label: string }> = {
  PUBLIC: { cell: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200', dot: 'bg-indigo-500', label: 'วันหยุดตามประเพณี' },
  COMPANY_SPECIAL: { cell: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200', dot: 'bg-amber-500', label: 'วันหยุดพิเศษบริษัท' },
  SUBSTITUTE: { cell: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200', dot: 'bg-emerald-500', label: 'วันหยุดชดเชย' },
};
const holidayStyle = (type: string) => HOLIDAY_TYPE_STYLE[type] ?? HOLIDAY_TYPE_STYLE.SUBSTITUTE;

/** ปฏิทินวันหยุดทั้งปี (12 เดือน) — กดวันหยุดเพื่อแก้ไข กดวันว่างเพื่อเพิ่มวันหยุด */
function HolidayYearCalendar({
  year,
  holidays,
  workingDays,
  onSelectHoliday,
  onSelectDate,
}: {
  year: number;
  holidays: Holiday[];
  workingDays: Set<number>;
  onSelectHoliday?: (h: Holiday) => void;
  onSelectDate?: (date: string) => void;
}) {
  const byDate = new Map<string, Holiday[]>();
  holidays.forEach((h) => {
    const key = h.holidayDate.substring(0, 10);
    byDate.set(key, [...(byDate.get(key) ?? []), h]);
  });
  const todayKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  return (
    <div className="space-y-4">
      {/* คำอธิบายสี */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
        {Object.entries(HOLIDAY_TYPE_STYLE).map(([k, v]) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${v.dot}`} />
            {v.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-600" />
          วันหยุดประจำสัปดาห์
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {thaiMonths.map((monthName, m) => {
          const first = new Date(year, m, 1);
          const daysInMonth = new Date(year, m + 1, 0).getDate();
          const lead = first.getDay();
          const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
          while (cells.length % 7 !== 0) cells.push(null);
          const monthHolidays = holidays
            .filter((h) => Number(h.holidayDate.substring(5, 7)) === m + 1)
            .sort((a, b) => a.holidayDate.localeCompare(b.holidayDate));

          return (
            <div key={m} className="rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col">
              <div className="px-3 py-2 rounded-t-xl bg-primary text-white text-xs font-semibold flex items-center justify-between">
                <span>
                  {monthName} {year + 543}
                </span>
                {monthHolidays.length > 0 && <span className="text-[11px] opacity-80">{monthHolidays.length} วัน</span>}
              </div>
              <div className="p-2">
                <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-slate-400 mb-1">
                  {thaiDayNamesShort.map((d, i) => (
                    <div key={d} className={i === 0 || i === 6 ? 'text-rose-400' : ''}>
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {cells.map((day, idx) => {
                    if (day === null) return <div key={idx} className="h-7" />;
                    const key = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const hs = byDate.get(key);
                    const dow = new Date(year, m, day).getDay();
                    const weeklyOff = !workingDays.has(dow);
                    const isToday = key === todayKey;
                    const base = 'h-7 rounded-md text-[11px] flex items-center justify-center transition-colors';
                    if (hs) {
                      const st = holidayStyle(hs[0].holidayType);
                      return (
                        <div key={idx} className="relative group/hol">
                          <button
                            type="button"
                            aria-label={hs.map((h) => h.holidayName).join(', ')}
                            onClick={() => onSelectHoliday?.(hs[0])}
                            className={`${base} w-full font-bold ${st.cell} transition-transform duration-150 group-hover/hol:scale-110 group-hover/hol:shadow-md group-hover/hol:ring-2 group-hover/hol:ring-white dark:group-hover/hol:ring-slate-900 group-hover/hol:z-10 relative ${
                              onSelectHoliday ? 'cursor-pointer' : 'cursor-default'
                            } ${isToday ? 'ring-2 ring-primary dark:ring-blue-400' : ''}`}
                          >
                            {day}
                          </button>
                          {/* ป้ายรายละเอียดเมื่อชี้เมาส์ */}
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 w-max max-w-[220px] opacity-0 translate-y-1 group-hover/hol:opacity-100 group-hover/hol:translate-y-0 transition-all duration-150">
                            <div className="rounded-lg bg-slate-900 text-white px-2.5 py-1.5 shadow-lg space-y-1 text-left">
                              {hs.map((h) => (
                                <div key={h.id} className="text-[11px] leading-snug">
                                  <div className="flex items-center gap-1.5 font-semibold">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${holidayStyle(h.holidayType).dot}`} />
                                    <span className="whitespace-normal">{h.holidayName}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-300 pl-3">
                                    {h.holidayTypeThai} · {formatThaiDate(h.holidayDate.substring(0, 10))}
                                  </div>
                                </div>
                              ))}
                              {onSelectHoliday && <div className="text-[10px] text-slate-400 pl-3">คลิกเพื่อแก้ไข</div>}
                            </div>
                            <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1" />
                          </div>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={idx}
                        type="button"
                        title={onSelectDate ? 'เพิ่มวันหยุดในวันนี้' : undefined}
                        onClick={() => onSelectDate?.(key)}
                        className={`${base} ${
                          weeklyOff ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'
                        } ${onSelectDate ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700' : 'cursor-default'} ${
                          isToday ? 'ring-2 ring-primary dark:ring-blue-400 font-bold' : ''
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
              {monthHolidays.length > 0 && (
                <ul className="border-t border-slate-100 dark:border-slate-700/60 px-3 py-2 space-y-1 text-[11px] mt-auto">
                  {monthHolidays.map((h) => (
                    <li
                      key={h.id}
                      onClick={() => onSelectHoliday?.(h)}
                      className={`flex items-center gap-2 min-w-0 -mx-1.5 px-1.5 py-0.5 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/60 ${onSelectHoliday ? 'cursor-pointer' : ''}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${holidayStyle(h.holidayType).dot}`} />
                      <span className="font-mono text-slate-500 dark:text-slate-400 shrink-0">{Number(h.holidayDate.substring(8, 10))}</span>
                      <span className="truncate text-slate-700 dark:text-slate-300">{h.holidayName}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function WorkCalendarPage() {
  const { setBreadcrumb } = useBreadcrumb();
  const toast = useToast();
  const { hasPermission, hasRole } = useAuth();
  const isSuper = hasRole('ADMIN') || hasRole('SYSTEM_SUPER');
  const canViewCalendar = hasPermission('WORK_CALENDAR_VIEW') || isSuper;
  const canCreateCalendar = hasPermission('WORK_CALENDAR_CREATE') || isSuper;
  const canEditCalendar = hasPermission('WORK_CALENDAR_EDIT') || isSuper;

  const [activeTab, setActiveTab] = useState<TabType>('work-week');
  const [loading, setLoading] = useState(true);
  const calendarPhase = useLoadPhase(loading);
  const [saving, setSaving] = useState(false);

  // Filter states
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [holidayView, setHolidayView] = useState<'list' | 'calendar'>('list');

  // Data states
  const [workWeek, setWorkWeek] = useState<WorkWeekDay[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // Bulk working hours states
  const [bulkStartTime, setBulkStartTime] = useState('08:30');
  const [bulkEndTime, setBulkEndTime] = useState('17:30');

  // Modal states (Holiday)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [holidayForm, setHolidayForm] = useState<{ id?: number; holidayDate: string; holidayName: string; holidayType: string }>({
    holidayDate: '',
    holidayName: '',
    holidayType: 'PUBLIC',
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: number; name: string; date: string } | null>(null);

  // Sync breadcrumb
  useEffect(() => {
    setBreadcrumb({
      section: 'วันทำงานและวันหยุด',
      page: activeTab === 'work-week' ? 'วันทำงานประจำสัปดาห์' : 'วันหยุดประจำปี',
    });
    return () => setBreadcrumb(null);
  }, [activeTab, setBreadcrumb]);

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);
      const [weekData, holidayData] = await Promise.all([
        workCalendarService.getWorkWeek(),
        workCalendarService.getHolidays(selectedYear),
      ]);
      setWorkWeek(weekData);
      setHolidays(holidayData);
      const firstWorking = weekData.find((d) => d.isWorkingDay && d.startTime && d.endTime);
      if (firstWorking?.startTime) setBulkStartTime(firstWorking.startTime.substring(0, 5));
      if (firstWorking?.endTime) setBulkEndTime(firstWorking.endTime.substring(0, 5));
    } catch (err: any) {
      toast.error(err?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลปฏิทินการทำงาน');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  // Handle Work Week toggle
  const handleToggleDay = (dayOfWeek: number) => {
    setWorkWeek((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek === dayOfWeek) {
          const nextWorking = !d.isWorkingDay;
          return {
            ...d,
            isWorkingDay: nextWorking,
            startTime: nextWorking ? bulkStartTime : null,
            endTime: nextWorking ? bulkEndTime : null,
          };
        }
        return d;
      })
    );
  };

  const handleSaveWorkWeek = async () => {
    try {
      setSaving(true);
      const updated = await workCalendarService.updateWorkWeek({
        days: workWeek.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          isWorkingDay: d.isWorkingDay,
          startTime: d.isWorkingDay ? bulkStartTime : null,
          endTime: d.isWorkingDay ? bulkEndTime : null,
        })),
      });
      setWorkWeek(updated);
      toast.success('บันทึกการตั้งค่าวันทำงานและเวลาเข้า-ออกงานสำเร็จ');
    } catch (err: any) {
      toast.error(err?.message || 'ไม่สามารถบันทึกการตั้งค่าวันทำงานได้');
    } finally {
      setSaving(false);
    }
  };

  // Holiday Modal Handlers
  const handleOpenCreateModal = (date?: string) => {
    const today = new Date().toISOString().split('T')[0];
    setHolidayForm({
      holidayDate: date || today,
      holidayName: '',
      holidayType: 'PUBLIC',
    });
    setModalMode('create');
    setModalOpen(true);
  };

  const handleOpenEditModal = (h: Holiday) => {
    setHolidayForm({
      id: h.id,
      holidayDate: h.holidayDate,
      holidayName: h.holidayName,
      holidayType: h.holidayType,
    });
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalMode === 'create') {
        const created = await workCalendarService.createHoliday({
          holidayDate: holidayForm.holidayDate,
          holidayName: holidayForm.holidayName,
          holidayType: holidayForm.holidayType,
        });
        setHolidays((prev) => [...prev, created].sort((a, b) => a.holidayDate.localeCompare(b.holidayDate)));
        toast.success('เพิ่มวันหยุดประจำปีสำเร็จ');
      } else if (holidayForm.id) {
        const updated = await workCalendarService.updateHoliday(holidayForm.id, {
          holidayDate: holidayForm.holidayDate,
          holidayName: holidayForm.holidayName,
          holidayType: holidayForm.holidayType,
        });
        setHolidays((prev) =>
          prev.map((h) => (h.id === updated.id ? updated : h)).sort((a, b) => a.holidayDate.localeCompare(b.holidayDate))
        );
        toast.success('แก้ไขข้อมูลวันหยุดสำเร็จ');
      }
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'ไม่สามารถบันทึกข้อมูลวันหยุดได้');
    }
  };

  const handleConfirmDelete = (h: Holiday) => {
    setItemToDelete({ id: h.id, name: h.holidayName, date: h.holidayDate });
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    try {
      await workCalendarService.deleteHoliday(itemToDelete.id);
      setHolidays((prev) => prev.filter((h) => h.id !== itemToDelete.id));
      toast.success(`ลบวันหยุด "${itemToDelete.name}" สำเร็จ`);
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (err: any) {
      toast.error(err?.message || 'ไม่สามารถลบข้อมูลวันหยุดได้');
    }
  };

  // Filtered holidays
  const filteredHolidays = holidays.filter((h) => {
    const matchesSearch =
      h.holidayName.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      h.holidayDate.includes(searchQuery.trim());
    const matchesType = filterType === 'ALL' || h.holidayType === filterType;
    return matchesSearch && matchesType;
  });

  const workingDaysCount = workWeek.filter((d) => d.isWorkingDay).length;
  const offDaysCount = 7 - workingDaysCount;

  return (
    <div className="space-y-6">
      {/* 1. Sub-navigation Tabs (รูปแบบเดียวกับเมนูพนักงาน) */}
      <div className="border-b border-slate-200 bg-white dark:bg-slate-900 px-4 -mt-2 rounded-t-2xl dark:border-slate-700 dark:bg-slate-900">
        <TabBar
          aria-label="เมนูปฏิทินการทำงาน"
          items={([
            { key: 'work-week', label: 'วันทำงานประจำสัปดาห์', onClick: () => { setActiveTab('work-week'); setSearchQuery(''); } },
            { key: 'holidays', label: 'วันหยุดประจำปี', onClick: () => { setActiveTab('holidays'); setSearchQuery(''); } },
          ] as (TabBarItem | null)[]).filter((t): t is TabBarItem => t !== null)}
          activeKey={(activeTab === 'work-week') ? 'work-week' : (activeTab === 'holidays') ? 'holidays' : null}
        />
      </div>

      {/* 3. Tab Content Panels */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-t-0 rounded-b-2xl p-6 shadow-sm dark:bg-slate-800 dark:border-slate-700">
        {/* ========================================================= */}
        {/* TAB 1: WORK WEEK */}
        {/* ========================================================= */}
        {activeTab === 'work-week' && (
          <div className="space-y-6">
            {/* Header / Sub-title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700/60">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">กำหนดวันและเวลาทำงานปกติของบริษัท</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 dark:text-slate-400">
                  ระบุวันทำงานปกติและเวลาเข้า-ออกงานมาตรฐานขององค์กร เพื่อใช้คำนวณการเข้างาน สาย และการทำงานล่วงเวลา (OT)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold whitespace-nowrap dark:bg-emerald-900/20 dark:text-emerald-400">
                  <Sun className="w-3.5 h-3.5" />
                  ทำงาน {workingDaysCount} วัน
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 dark:text-slate-400 text-xs font-semibold whitespace-nowrap dark:bg-slate-700 dark:text-slate-300 dark:border-slate-700">
                  <Moon className="w-3.5 h-3.5" />
                  วันหยุด {offDaysCount} วัน
                </div>
              </div>
            </div>

            {/* Time Setting Bar */}
            <div className="p-4 bg-slate-50/90 border border-slate-200/90 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary dark:text-blue-300 flex items-center justify-center shrink-0 dark:bg-primary/30">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">กำหนดเวลาทำงานปกติของบริษัท</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 dark:text-slate-400">
                    ระบุเวลาเข้าและเลิกงานมาตรฐาน สำหรับวันทำงานปกติทั้งหมด
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-end gap-3 shrink-0">
                <div className="w-44">
                  <ThaiTimePicker
                    label="เวลาเข้างาน"
                    value={bulkStartTime}
                    onChange={(val) => setBulkStartTime(val)}
                    align="right"
                  />
                </div>
                <div className="w-44">
                  <ThaiTimePicker
                    label="เวลาเลิกงาน"
                    value={bulkEndTime}
                    onChange={(val) => setBulkEndTime(val)}
                    align="right"
                  />
                </div>
              </div>
            </div>

            {/* 7-Day Grid Cards */}
            <RefreshIndicator active={calendarPhase.refreshing} />
            {calendarPhase.initialLoading ? (
              <div className="py-16 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary dark:text-blue-300" />
                กำลังโหลดการตั้งค่าวันทำงาน...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
                {workWeek.map((day) => {
                  const colors = dayColorMap[day.dayOfWeek] || dayColorMap[0];
                  return (
                    <div
                      key={day.id}
                      onClick={() => handleToggleDay(day.dayOfWeek)}
                      className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between min-h-[140px] ${
                        day.isWorkingDay
                          ? 'border-primary bg-white dark:bg-slate-700 shadow-md shadow-primary/5 hover:border-primary-hover'
                          : 'border-slate-200 bg-slate-50/60 opacity-80 hover:opacity-100 hover:border-slate-300'
                      }`}
                    >
                      {/* Top: Day Name & Badge */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${colors.badge}`}>
                            {day.dayNameThai.replace('วัน', '')}
                          </span>
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                              day.isWorkingDay ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400'
                            }`}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        </div>
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200 pt-1 dark:text-slate-200">{day.dayNameThai}</div>
                        <div className="text-[11px] text-slate-400 font-medium dark:text-slate-500 dark:text-slate-400">{day.dayNameEnglish}</div>
                      </div>

                      {/* Bottom Status Pill */}
                      <div className="pt-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap w-full justify-center ${
                            day.isWorkingDay
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 dark:text-slate-400 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              day.isWorkingDay ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {day.isWorkingDay ? 'วันทำงานปกติ' : 'วันหยุดประจำสัปดาห์'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Save Button */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700/60">
              <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">
                คลิกที่การ์ดประจำวันเพื่อสลับระหว่างวันทำงานปกติกับวันหยุดประจำสัปดาห์
                <br />
                ใช้กับพนักงานที่ไม่ได้ผูกกะ — บันทึกแล้วระบบคำนวณสาย / ออกก่อน / ขาดงานใหม่ให้อัตโนมัติ (ยกเว้นเดือนที่งวดเงินเดือนอนุมัติหรือจ่ายแล้ว)
              </span>

              {canEditCalendar && (
                <Button
                  variant="primary"
                  onClick={handleSaveWorkWeek}
                  loading={saving}
                  disabled={loading}
                >
                  บันทึกการตั้งค่าวันทำงาน
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: HOLIDAYS */}
        {/* ========================================================= */}
        {activeTab === 'holidays' && (
          <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-xl w-full">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อวันหยุด หรือวันที่..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:placeholder:text-slate-500 dark:text-slate-400 dark:focus:ring-blue-500/20 dark:focus:border-blue-500"
                  />
                </div>

                {/* Year Filter */}
                <CustomSelect
                  value={selectedYear}
                  onChange={(val) => setSelectedYear(parseInt(val, 10))}
                  placeholder="เลือกปี"
                  className="min-w-[170px]"
                  options={[
                    { value: 2025, label: 'ปี พ.ศ. 2568' },
                    { value: 2026, label: 'ปี พ.ศ. 2569' },
                    { value: 2027, label: 'ปี พ.ศ. 2570' },
                  ]}
                />

                {/* Type Filter */}
                <CustomSelect
                  value={filterType}
                  onChange={(val) => setFilterType(String(val))}
                  placeholder="ทุกประเภทวันหยุด"
                  className="min-w-[170px]"
                  options={[
                    { value: 'ALL', label: 'ทุกประเภทวันหยุด' },
                    { value: 'PUBLIC', label: 'วันหยุดตามประเพณี' },
                    { value: 'COMPANY_SPECIAL', label: 'วันหยุดพิเศษบริษัท' },
                    { value: 'SUBSTITUTE', label: 'วันหยุดชดเชย' },
                  ]}
                />
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
              {/* สลับมุมมอง รายการ / ปฏิทิน */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg dark:bg-slate-800">
                {([
                  { key: 'list', label: 'รายการ', icon: List },
                  { key: 'calendar', label: 'ปฏิทิน', icon: Calendar },
                ] as const).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setHolidayView(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition whitespace-nowrap cursor-pointer ${
                      holidayView === key
                        ? 'bg-white dark:bg-slate-700 text-primary dark:text-blue-300 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Add Holiday Button */}
              {canCreateCalendar && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenCreateModal()}
                  icon={<Plus className="w-4 h-4" />}
                >
                  เพิ่มวันหยุดประจำปี
                </Button>
              )}
              </div>
            </div>

            {/* มุมมองปฏิทิน */}
            {holidayView === 'calendar' && (
              loading ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary dark:text-blue-300" />
                  กำลังโหลดข้อมูลวันหยุดประจำปี...
                </div>
              ) : (
                <HolidayYearCalendar
                  year={selectedYear}
                  holidays={filteredHolidays}
                  workingDays={new Set(workWeek.filter((d) => d.isWorkingDay).map((d) => d.dayOfWeek))}
                  onSelectHoliday={canEditCalendar ? handleOpenEditModal : undefined}
                  onSelectDate={canCreateCalendar ? (d) => handleOpenCreateModal(d) : undefined}
                />
              )
            )}

            {/* Holidays Table */}
            {holidayView === 'list' && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <RefreshIndicator active={calendarPhase.refreshing} />
              <table className="table-standard w-full min-w-[600px] text-left text-xs border-collapse whitespace-nowrap">
                <thead className="bg-primary text-white font-semibold">
                  <tr className="whitespace-nowrap">
                    <th className="py-3.5 px-4 whitespace-nowrap text-center w-12">ลำดับ</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">วันที่</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">ชื่อวันหยุด</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">ประเภทวันหยุด</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700/60 dark:bg-slate-900">
                  {calendarPhase.initialLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 whitespace-nowrap dark:text-slate-500 dark:text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary dark:text-blue-300" />
                        กำลังโหลดข้อมูลวันหยุดประจำปี...
                      </td>
                    </tr>
                  ) : filteredHolidays.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 whitespace-nowrap dark:text-slate-500 dark:text-slate-400">
                        ไม่พบข้อมูลวันหยุดสำหรับปี {selectedYear + 543} ({selectedYear})
                      </td>
                    </tr>
                  ) : (
                    filteredHolidays.map((h, idx) => (
                      <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center font-mono text-slate-400 whitespace-nowrap dark:text-slate-500 dark:text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 px-2 py-0.5 rounded-md dark:text-slate-100 dark:bg-slate-800">
                              {formatThaiShortDate(h.holidayDate)}
                            </span>
                            <span className="text-slate-600 dark:text-slate-400 font-medium dark:text-slate-400">
                              ({formatThaiDate(h.holidayDate)})
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap dark:text-slate-200">
                          {h.holidayName}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                              h.holidayType === 'PUBLIC'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : h.holidayType === 'COMPANY_SPECIAL'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {h.holidayTypeThai}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {canEditCalendar ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEditModal(h)}
                                title="แก้ไข"
                                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleConfirmDelete(h)}
                                title="ลบ"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors dark:text-slate-500 dark:text-slate-400 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 4. Create / Edit Holiday Modal */}
      {/* ========================================================= */}
      {modalOpen && (
        <ModalShell className="bg-slate-900/40 backdrop-blur-sm z-50 animate-in fade-in duration-150" innerClassName="items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/60">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm dark:text-slate-100">
                {modalMode === 'create' ? 'เพิ่มวันหยุดประจำปี' : 'แก้ไขข้อมูลวันหยุด'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHoliday} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">วันที่วันหยุด <span className="text-rose-500">*</span></label>
                <ThaiDatePicker
                  value={holidayForm.holidayDate}
                  onChange={(val) => setHolidayForm({ ...holidayForm, holidayDate: val })}
                  placeholder="เลือกวันที่วันหยุด"
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20 dark:focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">ชื่อวันหยุด <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="เช่น วันขึ้นปีใหม่, วันสงกรานต์..."
                  value={holidayForm.holidayName}
                  onChange={(e) => setHolidayForm({ ...holidayForm, holidayName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20 dark:focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 dark:text-slate-300">ประเภทวันหยุด <span className="text-rose-500">*</span></label>
                <CustomSelect
                  value={holidayForm.holidayType}
                  onChange={(e) => setHolidayForm({ ...holidayForm, holidayType: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:text-slate-200 dark:focus:ring-blue-500/20"
                >
                  <option value="PUBLIC">วันหยุดตามประเพณี</option>
                  <option value="COMPANY_SPECIAL">วันหยุดพิเศษบริษัท</option>
                  <option value="SUBSTITUTE">วันหยุดชดเชย</option>
                </CustomSelect>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700/60">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                >
                  บันทึกข้อมูล
                </Button>
              </div>
            </form>
          </div>
        </ModalShell>
      )}

      {/* ========================================================= */}
      {/* 5. Delete Confirmation Modal */}
      {/* ========================================================= */}
      {deleteModalOpen && itemToDelete && (
        <ModalShell className="bg-slate-900/40 backdrop-blur-sm z-50 animate-in fade-in duration-150" innerClassName="items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center dark:bg-slate-800 dark:border-slate-700">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1 dark:text-slate-100">ยืนยันการลบวันหยุด?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 dark:text-slate-400">
              คุณต้องการลบวันหยุด <span className="font-semibold text-slate-800 dark:text-slate-200">"{itemToDelete.name}"</span> ({itemToDelete.date}) ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setDeleteModalOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={executeDelete}
              >
                ยืนยันการลบ
              </Button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}


'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles,
  Calendar,
  List,
  Plus,
  Clock,
  MapPin,
  Users,
  Search,
  Eye,
  Edit2,
  Trash2,
  Pin,
  PinOff,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  CalendarCheck,
  Flame,
  Globe,
  Building,
  ExternalLink,
  ChevronRight,
  X,
  FileText,
  BarChart2,
} from 'lucide-react';
import { TableToolbar } from '@/components/ui/TableToolbar';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Button } from '@/components/ui/Button';
import { StatCard, type StatTone } from '@/components/ui/StatCard';
import { TablePagination } from '@/components/ui/TablePagination';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';
import ThaiTimePicker from '@/components/common/ThaiTimePicker';
import { ActionDropdown, type ActionDropdownItem } from '@/components/ui/ActionDropdown';
import { ModalShell } from '@/components/ui/ModalShell';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { TableLoading } from '@/components/ui/TableState';
import { getSmartYearOptions } from '@/lib/yearUtils';
import { announcementService } from '@/services/announcementService';
import { Announcement, AnnouncementReadStats } from '@/types/announcement';
import { Department } from '@/types/organization';
import { ActivityYearCalendar } from './ActivityYearCalendar';

export interface ActivitiesTabProps {
  departments: Department[];
  canCreate: boolean;
  canEdit: boolean;
  onRefreshNewsFeed?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────
export const parseActivityMeta = (content: string) => {
  let location = '';
  let timeRange = '';

  const locMatch = content.match(/📍\s*สถานที่:\s*([^\n\r]+)/);
  if (locMatch) location = locMatch[1].trim();

  const timeMatch = content.match(/⏰\s*เวลา:\s*([^\n\r]+)/);
  if (timeMatch) timeRange = timeMatch[1].trim();

  const description = content
    .replace(/📍\s*สถานที่:\s*[^\n\r]+[\r\n]*/, '')
    .replace(/⏰\s*เวลา:\s*[^\n\r]+[\r\n]*/, '')
    .trim();

  return { location, timeRange, description };
};

export const buildActivityContent = (location: string, timeRange: string, description: string) => {
  const parts: string[] = [];
  if (location.trim()) parts.push(`📍 สถานที่: ${location.trim()}`);
  if (timeRange.trim()) parts.push(`⏰ เวลา: ${timeRange.trim()}`);
  if (parts.length > 0) parts.push('');
  parts.push(description.trim());
  return parts.join('\n');
};

const formatThaiDate = (dateStr?: string | null) => {
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

const formatThaiDayOfWeek = (dateStr?: string | null) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { weekday: 'long' });
  } catch {
    return '';
  }
};

const formatDateForInput = (isoDateStr?: string | null) => {
  if (!isoDateStr) return '';
  const d = new Date(isoDateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const ActivitiesTab: React.FC<ActivitiesTabProps> = ({
  departments,
  canCreate,
  canEdit,
  onRefreshNewsFeed,
}) => {
  const [activities, setActivities] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters & View State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'DRAFT'>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [readingActivity, setReadingActivity] = useState<Announcement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirm Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<Announcement | null>(null);

  // Read Stats Modal
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [statsData, setStatsData] = useState<AnnouncementReadStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formBannerUrl, setFormBannerUrl] = useState('');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formPriority, setFormPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [formStatus, setFormStatus] = useState<'PUBLISHED' | 'DRAFT'>('PUBLISHED');
  const [formTargetType, setFormTargetType] = useState<'ALL' | 'DEPARTMENT'>('ALL');
  const [formTargetDeptIds, setFormTargetDeptIds] = useState<number[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch Activities
  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await announcementService.getAnnouncements({
        category: 'ACTIVITY',
        pageSize: 200,
      });
      setActivities(res.items || []);
    } catch (err: any) {
      showToast(err?.message || 'ไม่สามารถโหลดข้อมูลประกาศกิจกรรมได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Determine Activity Status
  const getActivityStatusInfo = useCallback((act: Announcement) => {
    if (act.status === 'DRAFT') {
      return {
        key: 'DRAFT',
        label: 'แบบร่าง',
        color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        dot: 'bg-slate-400',
      };
    }

    const now = new Date();
    const startStr = act.publishedAt || act.createdAt;
    const start = startStr ? new Date(startStr) : now;
    const end = act.expireAt ? new Date(act.expireAt) : new Date(start.getTime() + 24 * 3600 * 1000);

    const isToday =
      start.toDateString() === now.toDateString() ||
      (now >= start && now <= end);

    if (now > end && !isToday) {
      return {
        key: 'COMPLETED',
        label: 'สิ้นสุดแล้ว',
        color: 'bg-slate-100 text-slate-500 dark:bg-slate-800/80 dark:text-slate-400 border-slate-200 dark:border-slate-700',
        dot: 'bg-slate-400',
      };
    }

    if (isToday) {
      return {
        key: 'ONGOING',
        label: 'จัดขึ้นวันนี้',
        color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        dot: 'bg-amber-500',
      };
    }

    return {
      key: 'UPCOMING',
      label: 'กำลังจะมาถึง',
      color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      dot: 'bg-emerald-500',
    };
  }, []);

  // Stats Calculations
  const stats = useMemo(() => {
    let upcoming = 0;
    let ongoing = 0;
    let completed = 0;
    let draft = 0;

    activities.forEach((act) => {
      const st = getActivityStatusInfo(act);
      if (st.key === 'UPCOMING') upcoming++;
      else if (st.key === 'ONGOING') ongoing++;
      else if (st.key === 'COMPLETED') completed++;
      else if (st.key === 'DRAFT') draft++;
    });

    return {
      total: activities.length,
      upcoming,
      ongoing,
      completed,
      draft,
    };
  }, [activities, getActivityStatusInfo]);

  // Filtered & Paginated Activities
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      // 1. Filter by Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const { location, description } = parseActivityMeta(act.content);
        const matchTitle = act.title.toLowerCase().includes(q);
        const matchLoc = location.toLowerCase().includes(q);
        const matchDesc = description.toLowerCase().includes(q);
        if (!matchTitle && !matchLoc && !matchDesc) return false;
      }

      // 2. Filter by Year
      const startStr = act.publishedAt || act.createdAt;
      if (startStr) {
        const actYear = new Date(startStr).getFullYear();
        if (actYear !== selectedYear) return false;
      }

      // 3. Filter by Status
      if (statusFilter !== 'ALL') {
        const st = getActivityStatusInfo(act);
        if (st.key !== statusFilter) return false;
      }

      return true;
    });
  }, [activities, searchQuery, selectedYear, statusFilter, getActivityStatusInfo]);

  const pagedActivities = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredActivities.slice(start, start + pageSize);
  }, [filteredActivities, page, pageSize]);

  // Open Create Modal
  const handleOpenCreate = (prefillDate?: string) => {
    const todayStr = formatDateForInput(new Date().toISOString());
    const targetDate = prefillDate || todayStr;

    setModalMode('create');
    setEditingId(null);
    setFormTitle('');
    setFormStartDate(targetDate);
    setFormEndDate(targetDate);
    setFormStartTime('09:00');
    setFormEndTime('16:30');
    setFormLocation('');
    setFormDescription('');
    setFormBannerUrl('');
    setFormIsPinned(false);
    setFormPriority('NORMAL');
    setFormStatus('PUBLISHED');
    setFormTargetType('ALL');
    setFormTargetDeptIds([]);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (act: Announcement) => {
    const { location, timeRange, description } = parseActivityMeta(act.content);
    let stTime = '09:00';
    let endTime = '16:30';

    if (timeRange) {
      const parts = timeRange.split('-').map((s) => s.replace(/น\./g, '').trim());
      if (parts[0]) stTime = parts[0];
      if (parts[1]) endTime = parts[1];
    }

    setModalMode('edit');
    setEditingId(act.id);
    setFormTitle(act.title);
    setFormStartDate(formatDateForInput(act.publishedAt || act.createdAt));
    setFormEndDate(formatDateForInput(act.expireAt));
    setFormStartTime(stTime);
    setFormEndTime(endTime);
    setFormLocation(location);
    setFormDescription(description);
    setFormBannerUrl(act.bannerImageUrl || '');
    setFormIsPinned(act.isPinned);
    setFormPriority((act.priority as any) || 'NORMAL');
    setFormStatus((act.status as any) || 'PUBLISHED');

    const deptTargets = act.targets?.filter((t) => t.targetType === 'DEPARTMENT' && t.targetEntityId).map((t) => Number(t.targetEntityId!)) || [];
    if (deptTargets.length > 0) {
      setFormTargetType('DEPARTMENT');
      setFormTargetDeptIds(deptTargets);
    } else {
      setFormTargetType('ALL');
      setFormTargetDeptIds([]);
    }

    setIsModalOpen(true);
  };

  // Save Activity Form (Create / Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('กรุณาระบุชื่อกิจกรรม');
      return;
    }
    if (!formStartDate) {
      showToast('กรุณาระบุวันที่จัดกิจกรรม');
      return;
    }

    setSubmitting(true);
    try {
      const timeStr = formStartTime && formEndTime ? `${formStartTime} - ${formEndTime} น.` : '';
      const finalContent = buildActivityContent(formLocation, timeStr, formDescription);

      const [sy, sm, sd] = formStartDate.split('-').map(Number);
      const startIso = new Date(Date.UTC(sy, sm - 1, sd, 1, 0, 0)).toISOString();

      let endIso = startIso;
      if (formEndDate) {
        const [ey, em, ed] = formEndDate.split('-').map(Number);
        endIso = new Date(Date.UTC(ey, em - 1, ed, 16, 59, 59)).toISOString();
      }

      const targets =
        formTargetType === 'ALL'
          ? [{ targetType: 'ALL' as const }]
          : formTargetDeptIds.map((deptId) => ({
              targetType: 'DEPARTMENT' as const,
              departmentId: deptId,
            }));

      const payload = {
        title: formTitle.trim(),
        content: finalContent,
        category: 'ACTIVITY' as const,
        priority: formPriority,
        isPinned: formIsPinned,
        status: formStatus,
        publishedAt: startIso,
        expireAt: endIso,
        bannerImageUrl: formBannerUrl.trim() || undefined,
        targets,
      };

      if (modalMode === 'create') {
        const created = await announcementService.createAnnouncement(payload);
        setActivities((prev) => [created, ...prev]);
        showToast(`เพิ่มกิจกรรม "${created.title}" สำเร็จ`);
      } else if (editingId) {
        const updated = await announcementService.updateAnnouncement(editingId, payload);
        setActivities((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        showToast(`บันทึกการแก้ไขกิจกรรม "${updated.title}" สำเร็จ`);
      }

      setIsModalOpen(false);
      onRefreshNewsFeed?.();
    } catch (err: any) {
      showToast(err?.message || 'ไม่สามารถบันทึกกิจกรรมได้');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Pin
  const handleTogglePin = async (act: Announcement) => {
    try {
      await announcementService.togglePin(act.id);
      setActivities((prev) =>
        prev.map((a) => (a.id === act.id ? { ...a, isPinned: !a.isPinned } : a))
      );
      showToast(act.isPinned ? 'ถอดหมุดกิจกรรมแล้ว' : 'ปักหมุดกิจกรรมแล้ว');
    } catch (err: any) {
      showToast(err?.message || 'ไม่สามารถเปลี่ยนสถานะปักหมุดได้');
    }
  };

  // Delete Activity
  const handleDelete = (act: Announcement) => {
    setActivityToDelete(act);
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!activityToDelete) return;
    try {
      await announcementService.deleteAnnouncement(activityToDelete.id);
      setActivities((prev) => prev.filter((a) => a.id !== activityToDelete.id));
      showToast(`ลบกิจกรรม "${activityToDelete.title}" เรียบร้อยแล้ว`);
      setDeleteModalOpen(false);
      setActivityToDelete(null);
      onRefreshNewsFeed?.();
    } catch (err: any) {
      showToast(err?.message || 'ไม่สามารถลบกิจกรรมได้');
    }
  };

  // View Read Stats
  const handleViewStats = async (act: Announcement) => {
    setStatsModalOpen(true);
    setLoadingStats(true);
    try {
      const data = await announcementService.getReadStats(act.id);
      setStatsData(data);
    } catch (err: any) {
      showToast(err?.message || 'ไม่สามารถดึงข้อมูลสถิติผู้เปิดอ่านได้');
    } finally {
      setLoadingStats(false);
    }
  };

  // Action Dropdown Items for Activity Row
  const getActivityActionItems = (act: Announcement): ActionDropdownItem[] => {
    const items: ActionDropdownItem[] = [
      {
        label: 'ดูรายละเอียด',
        icon: <Eye className="w-4 h-4 text-slate-500" />,
        onClick: () => setReadingActivity(act),
      },
      {
        label: 'สถิติการเปิดอ่าน',
        icon: <BarChart2 className="w-4 h-4 text-primary" />,
        onClick: () => handleViewStats(act),
      },
    ];

    if (canEdit) {
      items.push({ divider: true, label: '' });
      items.push({
        label: act.isPinned ? 'ถอดหมุด' : 'ปักหมุดกิจกรรม',
        icon: act.isPinned ? <PinOff className="w-4 h-4 text-amber-600" /> : <Pin className="w-4 h-4 text-amber-600" />,
        onClick: () => handleTogglePin(act),
      });
      items.push({
        label: 'แก้ไขข้อมูล',
        icon: <Edit2 className="w-4 h-4 text-slate-600" />,
        onClick: () => handleOpenEdit(act),
      });
      items.push({ divider: true, label: '' });
      items.push({
        label: 'ลบกิจกรรม',
        icon: <Trash2 className="w-4 h-4 text-rose-600" />,
        danger: true,
        onClick: () => handleDelete(act),
      });
    }

    return items;
  };

  const statCards: { label: string; value: number; icon: React.ElementType; tone: StatTone }[] = [
    { label: 'กิจกรรมทั้งหมด', value: stats.total, icon: Sparkles, tone: 'slate' },
    { label: 'กำลังจะมาถึง', value: stats.upcoming, icon: CalendarDays, tone: 'emerald' },
    { label: 'จัดขึ้นวันนี้ / กำลังจัด', value: stats.ongoing, icon: Flame, tone: 'amber' },
    { label: 'สิ้นสุดแล้ว', value: stats.completed, icon: CheckCircle2, tone: 'purple' },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 text-white rounded-xl text-sm shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Stat Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon}
            tone={s.tone}
            layout="inline"
          />
        ))}
      </div>

      {/* 2. Main Container (Card) */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xs space-y-4">
        {/* Toolbar: Search + Filters + Mode Switcher + Action Button */}
        <TableToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="ค้นหาชื่อกิจกรรม หรือสถานที่..."
          filters={
            <>
              {/* Year Select (เหมือนหน้าระบบวันหยุด) */}
              <CustomSelect
                value={selectedYear}
                onChange={(val) => setSelectedYear(parseInt(val, 10))}
                className="min-w-[170px]"
                options={getSmartYearOptions(
                  {
                    forwardYears: 1,
                    backYears: 4,
                    historicalYears: activities
                      .map((a) => (a.publishedAt || a.createdAt)?.substring(0, 4))
                      .filter(Boolean),
                    selectedYear,
                  },
                  'ปี พ.ศ. '
                )}
              />

              {/* Status Select */}
              <CustomSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(val as any)}
                className="min-w-[170px]"
                options={[
                  { value: 'ALL', label: 'ทุกสถานะกิจกรรม' },
                  { value: 'UPCOMING', label: 'กำลังจะมาถึง' },
                  { value: 'ONGOING', label: 'จัดขึ้นวันนี้' },
                  { value: 'COMPLETED', label: 'สิ้นสุดแล้ว' },
                  { value: 'DRAFT', label: 'แบบร่าง' },
                ]}
              />
            </>
          }
          actions={
            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
              {/* สลับมุมมอง รายการ / ปฏิทิน (เหมือนหน้าวันหยุด) */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl">
                {([
                  { key: 'list', label: 'รายการ', icon: List },
                  { key: 'calendar', label: 'ปฏิทิน', icon: Calendar },
                ] as const).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setViewMode(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
                      viewMode === key
                        ? 'bg-white dark:bg-slate-800 text-primary dark:text-blue-300 shadow-2xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Add Activity Button */}
              {canCreate && (
                <Button
                  id="tour-activity-add-btn"
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenCreate()}
                  icon={<Plus className="w-4 h-4" />}
                >
                  เพิ่มประกาศกิจกรรม
                </Button>
              )}
            </div>
          }
        />

        {/* ─── Mode 1: Calendar View ─── */}
        {viewMode === 'calendar' && (
          loading ? (
            <div className="py-20 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs">กำลังโหลดปฏิทินกิจกรรม...</span>
            </div>
          ) : (
            <ActivityYearCalendar
              year={selectedYear}
              activities={filteredActivities}
              onSelectActivity={(act) => setReadingActivity(act)}
              onSelectDate={canCreate ? (dateStr) => handleOpenCreate(dateStr) : undefined}
            />
          )
        )}

        {/* ─── Mode 2: List View (Table) ─── */}
        {viewMode === 'list' && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="table-standard w-full min-w-[800px] text-xs whitespace-nowrap">
              <thead className="bg-primary text-white font-semibold">
                <tr>
                  <th className="py-3.5 px-4 text-center w-12">ลำดับ</th>
                  <th className="py-3.5 px-4">วันที่จัดกิจกรรม</th>
                  <th className="py-3.5 px-4">ชื่อกิจกรรม</th>
                  <th className="py-3.5 px-4">เวลาและสถานที่</th>
                  <th className="py-3.5 px-4">กลุ่มเป้าหมาย</th>
                  <th className="py-3.5 px-4 text-center">สถานะ</th>
                  <th className="py-3.5 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 bg-white dark:bg-slate-900">
                {loading ? (
                  <TableLoading colSpan={7} text="กำลังโหลดรายการกิจกรรม..." />
                ) : filteredActivities.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <CalendarDays className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      <p className="font-medium text-slate-500 dark:text-slate-400">
                        ไม่พบกิจกรรมสำหรับปี {selectedYear + 543} ({selectedYear})
                      </p>
                      <p className="text-2xs text-slate-400 mt-0.5">
                        ลองเปลี่ยนตัวกรอง หรือคลิกปุ่ม "+ เพิ่มประกาศกิจกรรม"
                      </p>
                    </td>
                  </tr>
                ) : (
                  pagedActivities.map((act, idx) => {
                    const st = getActivityStatusInfo(act);
                    const { location, timeRange, description } = parseActivityMeta(act.content);
                    const startStr = act.publishedAt || act.createdAt;
                    const dateNum = (page - 1) * pageSize + idx + 1;

                    return (
                      <tr key={act.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        {/* ลำดับ */}
                        <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                          {dateNum}
                        </td>

                        {/* วันที่จัดกิจกรรม */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              {formatThaiDate(startStr)}
                            </span>
                            <span className="text-slate-400 dark:text-slate-500 text-2xs">
                              ({formatThaiDayOfWeek(startStr)})
                            </span>
                          </div>
                        </td>

                        {/* ชื่อกิจกรรม */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {act.bannerImageUrl ? (
                              <img
                                src={act.bannerImageUrl}
                                alt={act.title}
                                className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/60">
                                <Sparkles className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0 max-w-[280px]">
                              <button
                                type="button"
                                onClick={() => setReadingActivity(act)}
                                className="font-bold text-slate-900 dark:text-slate-100 hover:text-primary transition-colors truncate block text-left cursor-pointer"
                                title={act.title}
                              >
                                {act.title}
                              </button>
                              <p className="text-2xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {description || '-'}
                              </p>
                            </div>
                            {act.isPinned && (
                              <span title="ปักหมุดกิจกรรมสำคัญ" className="shrink-0 text-amber-500">
                                <Pin className="w-3.5 h-3.5 fill-amber-500" />
                              </span>
                            )}
                          </div>
                        </td>

                        {/* เวลาและสถานที่ */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5 text-2xs">
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[180px]">{location || 'ไม่ระบุสถานที่'}</span>
                            </div>
                            {timeRange && (
                              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{timeRange}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* กลุ่มเป้าหมาย */}
                        <td className="py-3.5 px-4">
                          {act.targets && act.targets.some((t) => t.targetType === 'ALL') ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              <Globe className="w-3 h-3" />
                              ทุกคนในองค์กร
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              <Building className="w-3 h-3" />
                              {act.targets?.length || 1} แผนกเฉพาะ
                            </span>
                          )}
                        </td>

                        {/* สถานะ */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-semibold border ${st.color}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                        </td>

                        {/* จัดการ */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end">
                            <ActionDropdown
                              align="right"
                              menuClassName="w-48"
                              items={getActivityActionItems(act)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {viewMode === 'list' && filteredActivities.length > 0 && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                <TablePagination
                  total={filteredActivities.length}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setPage(1);
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── 3. Create / Edit Activity Modal ─── */}
      {isModalOpen && (
        <ModalShell
          className="bg-slate-900/40 backdrop-blur-xs z-50 animate-in fade-in duration-150"
          innerClassName="items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-y-auto max-h-[90vh]">
            <ModalHeader
              icon={Sparkles}
              title={modalMode === 'create' ? 'เพิ่มประกาศกิจกรรมองค์กร' : 'แก้ไขข้อมูลประกาศกิจกรรม'}
              onClose={() => setIsModalOpen(false)}
            />

            <form onSubmit={handleSubmitForm} className="space-y-4 pt-4 text-xs font-sans">
              {/* ชื่อกิจกรรม */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อกิจกรรม / หัวข้ออีเวนต์ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น กิจกรรม Town Hall ประจำไตรมาส, อบรมความปลอดภัยในการทำงาน"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs"
                />
              </div>

              {/* วันที่จัดกิจกรรม (Start & End) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    วันที่จัดกิจกรรม <span className="text-rose-500">*</span>
                  </label>
                  <ThaiDatePicker
                    value={formStartDate}
                    onChange={(val) => {
                      setFormStartDate(val);
                      if (!formEndDate || formEndDate < val) setFormEndDate(val);
                    }}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    วันที่สิ้นสุดกิจกรรม (กรณีจัดหลายวัน)
                  </label>
                  <ThaiDatePicker
                    value={formEndDate}
                    onChange={(val) => setFormEndDate(val)}
                  />
                </div>
              </div>

              {/* เวลาจัดกิจกรรม */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ThaiTimePicker
                  label="เวลาเริ่มกิจกรรม"
                  value={formStartTime}
                  onChange={(val) => setFormStartTime(val)}
                />
                <ThaiTimePicker
                  label="เวลาสิ้นสุดกิจกรรม"
                  value={formEndTime}
                  onChange={(val) => setFormEndTime(val)}
                />
              </div>

              {/* สถานที่จัดกิจกรรม */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  สถานที่จัดกิจกรรม หรือ ลิงก์ห้องประชุมออนไลน์
                </label>
                <input
                  type="text"
                  placeholder="เช่น ห้องประชุมใหญ่ ชั้น 4 หรือ Zoom Meeting / Google Meet"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs"
                />
              </div>

              {/* รายละเอียดและกำหนดการ */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  รายละเอียดกิจกรรมและกำหนดการ
                </label>
                <textarea
                  rows={4}
                  placeholder="ระบุวัตถุประสงค์ กำหนดการ หรือสิ่งที่ต้องเตรียมมาร่วมกิจกรรม..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs leading-relaxed"
                />
              </div>

              {/* รูปภาพแบนเนอร์กิจกรรม */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  URL รูปภาพแบนเนอร์กิจกรรม (ไม่บังคับ)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/activity-banner.jpg"
                  value={formBannerUrl}
                  onChange={(e) => setFormBannerUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs"
                />
              </div>

              {/* กลุ่มเป้าหมายผู้เข้าร่วม */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <label className="block font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  กลุ่มเป้าหมายผู้เข้าร่วมกิจกรรม
                </label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="targetType"
                      checked={formTargetType === 'ALL'}
                      onChange={() => setFormTargetType('ALL')}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300">ทุกคนในองค์กร (ทุกแผนก)</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="targetType"
                      checked={formTargetType === 'DEPARTMENT'}
                      onChange={() => setFormTargetType('DEPARTMENT')}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300">เฉพาะบางแผนก</span>
                  </label>
                </div>

                {formTargetType === 'DEPARTMENT' && (
                  <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 border-t border-slate-200 dark:border-slate-700 mt-2">
                    {departments.map((dept) => {
                      const checked = formTargetDeptIds.includes(dept.id);
                      return (
                        <label
                          key={dept.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                            checked
                              ? 'bg-primary/10 border-primary text-primary font-semibold'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormTargetDeptIds([...formTargetDeptIds, dept.id]);
                              } else {
                                setFormTargetDeptIds(formTargetDeptIds.filter((id) => id !== dept.id));
                              }
                            }}
                            className="rounded text-primary focus:ring-primary"
                          />
                          <span className="truncate">{dept.departmentName}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ตัวเลือกเสริม: ปักหมุด และ สถานะ */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-700">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formIsPinned}
                    onChange={(e) => setFormIsPinned(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Pin className="w-3.5 h-3.5 text-amber-500" />
                    ปักหมุดกิจกรรมสำคัญไว้บนสุด
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">สถานะ:</span>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    <option value="PUBLISHED">เผยแพร่ทันที</option>
                    <option value="DRAFT">บันทึกเป็นแบบร่าง</option>
                  </select>
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-700">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  ยกเลิก
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  loading={submitting}
                >
                  {modalMode === 'create' ? 'บันทึกและประกาศกิจกรรม' : 'บันทึกการแก้ไข'}
                </Button>
              </div>
            </form>
          </div>
        </ModalShell>
      )}

      {/* ─── 4. Reading / Detail Modal ─── */}
      {readingActivity && (
        <ModalShell
          className="bg-slate-900/40 backdrop-blur-xs z-50 animate-in fade-in duration-150"
          innerClassName="items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-y-auto max-h-[90vh] space-y-4 font-sans">
            <ModalHeader
              icon={Sparkles}
              title={readingActivity.title}
              onClose={() => setReadingActivity(null)}
            />

            {readingActivity.bannerImageUrl && (
              <img
                src={readingActivity.bannerImageUrl}
                alt={readingActivity.title}
                className="w-full h-48 sm:h-64 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
              />
            )}

            {/* Event Info Bar */}
            {(() => {
              const { location, timeRange, description } = parseActivityMeta(readingActivity.content);
              const startStr = readingActivity.publishedAt || readingActivity.createdAt;
              const endStr = readingActivity.expireAt;
              const statusInfo = getActivityStatusInfo(readingActivity);

              return (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold border ${statusInfo.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                        {statusInfo.label}
                      </span>
                      {readingActivity.isPinned && (
                        <span className="text-2xs text-amber-600 font-semibold flex items-center gap-1">
                          <Pin className="w-3 h-3 fill-amber-500" /> ปักหมุด
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <CalendarCheck className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <p className="text-2xs text-slate-400">วันที่จัดกิจกรรม</p>
                          <p className="font-bold">
                            {formatThaiDate(startStr)}
                            {endStr && endStr.substring(0, 10) !== startStr?.substring(0, 10) && ` - ${formatThaiDate(endStr)}`}
                          </p>
                        </div>
                      </div>

                      {timeRange && (
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <Clock className="w-4 h-4 text-primary shrink-0" />
                          <div>
                            <p className="text-2xs text-slate-400">เวลาจัดกิจกรรม</p>
                            <p className="font-bold">{timeRange}</p>
                          </div>
                        </div>
                      )}

                      {location && (
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 sm:col-span-2">
                          <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                          <div>
                            <p className="text-2xs text-slate-400">สถานที่ / ลิงก์</p>
                            <p className="font-bold">{location}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content / Agenda */}
                  <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2 text-sm">
                      รายละเอียดและกำหนดการ
                    </h4>
                    {description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                  </div>

                  <div className="flex items-center justify-end pt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setReadingActivity(null)}
                    >
                      ปิดหน้าต่าง
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        </ModalShell>
      )}

      {/* ─── 5. Read Stats Modal ─── */}
      {statsModalOpen && (
        <ModalShell
          className="bg-slate-900/40 backdrop-blur-xs z-50 animate-in fade-in duration-150"
          innerClassName="items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 font-sans space-y-4">
            <ModalHeader
              icon={BarChart2}
              title="สถิติการเปิดอ่านกิจกรรม"
              onClose={() => setStatsModalOpen(false)}
            />

            {loadingStats ? (
              <div className="py-8 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-xs">กำลังโหลดสถิติผู้เปิดอ่าน...</span>
              </div>
            ) : !statsData ? (
              <p className="text-center text-xs text-slate-400 py-8">ไม่พบข้อมูลสถิติ</p>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Stats Summary Bar */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
                    <p className="text-2xs text-slate-400">เป้าหมายทั้งหมด</p>
                    <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {statsData.totalTargetEmployees} คน
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60">
                    <p className="text-2xs text-emerald-600 dark:text-emerald-400">เปิดอ่านแล้ว</p>
                    <p className="text-base font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                      {statsData.readCount} คน
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60">
                    <p className="text-2xs text-blue-600 dark:text-blue-400">อัตราการอ่าน</p>
                    <p className="text-base font-bold text-blue-700 dark:text-blue-300 mt-0.5">
                      {statsData.readPercentage.toFixed(0)}%
                    </p>
                  </div>
                </div>

                {/* Reader List */}
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 text-xs">
                    รายชื่อผู้ที่เปิดอ่านแล้ว ({statsData.receipts?.length || 0})
                  </h4>
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/60">
                    {statsData.receipts && statsData.receipts.length > 0 ? (
                      statsData.receipts.map((r) => (
                        <div key={r.employeeId} className="px-3 py-2 flex items-center justify-between text-2xs">
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{r.employeeName}</span>
                            <span className="text-slate-400 ml-1.5 font-mono">({r.employeeCode})</span>
                            {r.departmentName && (
                              <span className="text-slate-400 block">{r.departmentName}</span>
                            )}
                          </div>
                          <span className="text-slate-400 font-mono">
                            {new Date(r.readAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="p-4 text-center text-slate-400">ยังไม่มีผู้เปิดอ่าน</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button variant="secondary" size="sm" onClick={() => setStatsModalOpen(false)}>
                    ปิดหน้าต่าง
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ModalShell>
      )}

      {/* ─── 6. Delete Confirm Modal ─── */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        type="danger"
        title="ยืนยันการลบประกาศกิจกรรม"
        message={`คุณต้องการลบกิจกรรม "${activityToDelete?.title || ''}" ใช่หรือไม่? เมื่อลบแล้วพนักงานจะไม่สามารถมองเห็นกิจกรรมนี้ได้อีก`}
        confirmText="ลบกิจกรรม"
        cancelText="ยกเลิก"
        onConfirm={executeDelete}
        onClose={() => {
          setDeleteModalOpen(false);
          setActivityToDelete(null);
        }}
      />
    </div>
  );
};

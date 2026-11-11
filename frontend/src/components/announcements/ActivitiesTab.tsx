'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Sparkles,
  Calendar,
  List,
  Plus,
  Clock,
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
  Building2,
  Building,
  UserCheck,
  User,
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
import { HoverList } from '@/components/ui/HoverList';
import { getSmartYearOptions } from '@/lib/yearUtils';
import { announcementService } from '@/services/announcementService';
import {
  Announcement,
  AnnouncementReadStats,
  CreateAnnouncementPayload,
  UpdateAnnouncementPayload,
  AnnouncementTargetInput,
  TargetType,
} from '@/types/announcement';
import { Division, Department, Team } from '@/types/organization';
import { Employee } from '@/types/employee';
import { ActivityYearCalendar } from './ActivityYearCalendar';

export interface ActivitiesTabProps {
  divisions: Division[];
  departments: Department[];
  teams: Team[];
  employees: Employee[];
  canCreate: boolean;
  canEdit: boolean;
  onRefreshNewsFeed?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────
export const parseActivityMeta = (content: string) => {
  let timeRange = '';
  const timeMatch = content.match(/⏰\s*เวลา:\s*([^\n\r]+)/);
  if (timeMatch) timeRange = timeMatch[1].trim();

  const description = content
    .replace(/📍\s*สถานที่:\s*[^\n\r]+[\r\n]*/, '')
    .replace(/⏰\s*เวลา:\s*[^\n\r]+[\r\n]*/, '')
    .trim();

  return { timeRange, description };
};

export const buildActivityContent = (timeRange: string, description: string) => {
  const parts: string[] = [];
  if (timeRange.trim()) parts.push(`⏰ เวลา: ${timeRange.trim()}`);
  if (parts.length > 0 && description.trim()) parts.push('');
  if (description.trim()) parts.push(description.trim());
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

const toIsoStringFromDateInput = (dateStr: string) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d, 9, 0, 0);
  return date.toISOString();
};

const toIsoStringFromExpireInput = (dateStr: string) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d, 23, 59, 59);
  return date.toISOString();
};

export const ActivitiesTab: React.FC<ActivitiesTabProps> = ({
  divisions,
  departments,
  teams,
  employees,
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
  const [formDescription, setFormDescription] = useState('');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formPriority, setFormPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [formStatus, setFormStatus] = useState<'PUBLISHED' | 'DRAFT'>('PUBLISHED');

  // Rich Audience Target State: ALL, DIVISION, DEPARTMENT, TEAM, EMPLOYEE
  const [formTargetType, setFormTargetType] = useState<TargetType>('ALL');
  const [formTargetDivisionIds, setFormTargetDivisionIds] = useState<number[]>([]);
  const [formTargetDeptIds, setFormTargetDeptIds] = useState<number[]>([]);
  const [formTargetTeamIds, setFormTargetTeamIds] = useState<number[]>([]);
  const [formTargetEmployeeIds, setFormTargetEmployeeIds] = useState<number[]>([]);
  const [empSearchFilter, setEmpSearchFilter] = useState('');
  const [isTargetDropdownOpen, setIsTargetDropdownOpen] = useState(false);
  const targetDropdownRef = useRef<HTMLDivElement>(null);

  // Close target dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (targetDropdownRef.current && !targetDropdownRef.current.contains(e.target as Node)) {
        setIsTargetDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsTargetDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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

  // Compute status for an activity item
  const getActivityStatusInfo = useCallback((act: Announcement) => {
    if (act.status === 'DRAFT') {
      return {
        key: 'DRAFT',
        label: 'ฉบับร่าง',
        color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
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
        label: 'จัดขึ้นวันนี้ / กำลังจัด',
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

    activities.forEach((act) => {
      const st = getActivityStatusInfo(act);
      if (st.key === 'UPCOMING') upcoming++;
      else if (st.key === 'ONGOING') ongoing++;
      else if (st.key === 'COMPLETED') completed++;
    });

    return {
      total: activities.length,
      upcoming,
      ongoing,
      completed,
    };
  }, [activities, getActivityStatusInfo]);

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = act.title.toLowerCase().includes(q);
        const { description } = parseActivityMeta(act.content);
        const matchDesc = description.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
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
    setFormDescription('');
    setFormIsPinned(false);
    setFormPriority('NORMAL');
    setFormStatus('PUBLISHED');
    setFormTargetType('ALL');
    setFormTargetDivisionIds([]);
    setFormTargetDeptIds([]);
    setFormTargetTeamIds([]);
    setFormTargetEmployeeIds([]);
    setEmpSearchFilter('');
    setIsTargetDropdownOpen(false);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (act: Announcement) => {
    const { timeRange, description } = parseActivityMeta(act.content);

    let stTime = '09:00';
    let endTime = '16:30';
    if (timeRange.includes('-')) {
      const parts = timeRange.split('-').map((p) => p.trim());
      stTime = parts[0] || '09:00';
      endTime = parts[1] || '16:30';
    }

    setModalMode('edit');
    setEditingId(act.id);
    setFormTitle(act.title);
    setFormStartDate(formatDateForInput(act.publishedAt || act.createdAt));
    setFormEndDate(formatDateForInput(act.expireAt));
    setFormStartTime(stTime);
    setFormEndTime(endTime);
    setFormDescription(description);
    setFormIsPinned(act.isPinned);
    setFormPriority((act.priority as any) || 'NORMAL');
    setFormStatus((act.status as any) || 'PUBLISHED');

    // Parse target types from act.targets
    const targets = act.targets || [];
    if (targets.length === 0 || targets.some((t) => t.targetType === 'ALL')) {
      setFormTargetType('ALL');
      setFormTargetDivisionIds([]);
      setFormTargetDeptIds([]);
      setFormTargetTeamIds([]);
      setFormTargetEmployeeIds([]);
    } else {
      const firstType = targets[0]?.targetType as TargetType;
      setFormTargetType(firstType);

      if (firstType === 'DIVISION') {
        setFormTargetDivisionIds(targets.filter((t) => t.targetType === 'DIVISION' && t.targetEntityId).map((t) => Number(t.targetEntityId)));
        setFormTargetDeptIds([]);
        setFormTargetTeamIds([]);
        setFormTargetEmployeeIds([]);
      } else if (firstType === 'DEPARTMENT') {
        setFormTargetDeptIds(targets.filter((t) => t.targetType === 'DEPARTMENT' && t.targetEntityId).map((t) => Number(t.targetEntityId)));
        setFormTargetDivisionIds([]);
        setFormTargetTeamIds([]);
        setFormTargetEmployeeIds([]);
      } else if (firstType === 'TEAM') {
        setFormTargetTeamIds(targets.filter((t) => t.targetType === 'TEAM' && t.targetEntityId).map((t) => Number(t.targetEntityId)));
        setFormTargetDivisionIds([]);
        setFormTargetDeptIds([]);
        setFormTargetEmployeeIds([]);
      } else if (firstType === 'EMPLOYEE' || (firstType as string) === 'INDIVIDUAL') {
        setFormTargetEmployeeIds(targets.filter((t) => (t.targetType === 'EMPLOYEE' || (t.targetType as string) === 'INDIVIDUAL') && t.targetEntityId).map((t) => Number(t.targetEntityId)));
        setFormTargetDivisionIds([]);
        setFormTargetDeptIds([]);
        setFormTargetTeamIds([]);
      }
    }

    setEmpSearchFilter('');
    setIsTargetDropdownOpen(false);
    setIsModalOpen(true);
  };

  // Switch Target Tab handler
  const handleSelectTargetTab = (tabId: TargetType) => {
    if (tabId === 'ALL') {
      setFormTargetType('ALL');
      setIsTargetDropdownOpen(false);
      return;
    }
    if (formTargetType === tabId) {
      setIsTargetDropdownOpen((prev) => !prev);
    } else {
      setFormTargetType(tabId);
      setIsTargetDropdownOpen(true);
    }
  };

  // Target audience summary for dropdown button
  const targetSummary = useMemo(() => {
    if (formTargetType === 'ALL') {
      return {
        label: 'พนักงานทุกคนในองค์กร',
        count: 0,
        unit: '',
        icon: Globe,
      };
    }
    if (formTargetType === 'DIVISION') {
      const count = formTargetDivisionIds.length;
      const names = divisions
        .filter((d) => formTargetDivisionIds.includes(d.id))
        .map((d) => d.divisionName);
      return {
        label: count === 0 ? 'คลิกเพื่อเลือกฝ่ายที่ต้องการให้เข้าร่วม...' : `เลือกแล้ว ${count} ฝ่าย: ${names.join(', ')}`,
        count,
        unit: 'ฝ่าย',
        icon: Building2,
      };
    }
    if (formTargetType === 'DEPARTMENT') {
      const count = formTargetDeptIds.length;
      const names = departments
        .filter((d) => formTargetDeptIds.includes(d.id))
        .map((d) => d.departmentName);
      return {
        label: count === 0 ? 'คลิกเพื่อเลือกแผนกที่ต้องการให้เข้าร่วม...' : `เลือกแล้ว ${count} แผนก: ${names.join(', ')}`,
        count,
        unit: 'แผนก',
        icon: Building,
      };
    }
    if (formTargetType === 'TEAM') {
      const count = formTargetTeamIds.length;
      const names = teams
        .filter((t) => formTargetTeamIds.includes(t.id))
        .map((t) => t.teamName);
      return {
        label: count === 0 ? 'คลิกเพื่อเลือกทีมที่ต้องการให้เข้าร่วม...' : `เลือกแล้ว ${count} ทีม: ${names.join(', ')}`,
        count,
        unit: 'ทีม',
        icon: Users,
      };
    }
    if (formTargetType === 'EMPLOYEE') {
      const count = formTargetEmployeeIds.length;
      const names = employees
        .filter((e) => formTargetEmployeeIds.includes(e.id))
        .map((e) => e.fullName);
      return {
        label: count === 0 ? 'คลิกเพื่อเลือกพนักงานที่ต้องการให้เข้าร่วม...' : `เลือกแล้ว ${count} ท่าน: ${names.join(', ')}`,
        count,
        unit: 'ท่าน',
        icon: UserCheck,
      };
    }
    return { label: '', count: 0, unit: '', icon: Globe };
  }, [
    formTargetType,
    formTargetDivisionIds,
    formTargetDeptIds,
    formTargetTeamIds,
    formTargetEmployeeIds,
    divisions,
    departments,
    teams,
    employees,
  ]);

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

    // Build targets array
    let targets: AnnouncementTargetInput[] = [{ targetType: 'ALL', targetEntityId: null }];
    if (formTargetType === 'DIVISION') {
      if (formTargetDivisionIds.length === 0) {
        showToast('กรุณาเลือกฝ่ายอย่างน้อย 1 ฝ่าย');
        setIsTargetDropdownOpen(true);
        return;
      }
      targets = formTargetDivisionIds.map((id) => ({ targetType: 'DIVISION', targetEntityId: id }));
    } else if (formTargetType === 'DEPARTMENT') {
      if (formTargetDeptIds.length === 0) {
        showToast('กรุณาเลือกแผนกอย่างน้อย 1 แผนก');
        setIsTargetDropdownOpen(true);
        return;
      }
      targets = formTargetDeptIds.map((id) => ({ targetType: 'DEPARTMENT', targetEntityId: id }));
    } else if (formTargetType === 'TEAM') {
      if (formTargetTeamIds.length === 0) {
        showToast('กรุณาเลือกทีมอย่างน้อย 1 ทีม');
        setIsTargetDropdownOpen(true);
        return;
      }
      targets = formTargetTeamIds.map((id) => ({ targetType: 'TEAM', targetEntityId: id }));
    } else if (formTargetType === 'EMPLOYEE') {
      if (formTargetEmployeeIds.length === 0) {
        showToast('กรุณาเลือกพนักงานอย่างน้อย 1 ท่าน');
        setIsTargetDropdownOpen(true);
        return;
      }
      targets = formTargetEmployeeIds.map((id) => ({ targetType: 'EMPLOYEE', targetEntityId: id }));
    }

    const timeRange = formStartTime && formEndTime ? `${formStartTime} - ${formEndTime}` : '';
    const content = buildActivityContent(timeRange, formDescription);

    const payload: CreateAnnouncementPayload = {
      title: formTitle.trim(),
      content,
      publishedAt: toIsoStringFromDateInput(formStartDate),
      expireAt: toIsoStringFromExpireInput(formEndDate || formStartDate),
      isPinned: formIsPinned,
      category: 'ACTIVITY',
      priority: formPriority,
      status: formStatus,
      targets,
    };

    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        const created = await announcementService.createAnnouncement(payload);
        setActivities((prev) => [created, ...prev]);
        showToast('เพิ่มประกาศกิจกรรมใหม่เรียบร้อยแล้ว');
      } else if (editingId) {
        const updated = await announcementService.updateAnnouncement(editingId, payload as UpdateAnnouncementPayload);
        setActivities((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        showToast('แก้ไขประกาศกิจกรรมเรียบร้อยแล้ว');
      }

      setIsModalOpen(false);
      onRefreshNewsFeed?.();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการบันทึกกิจกรรม');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Pin
  const handleTogglePin = async (act: Announcement) => {
    try {
      const newPin = await announcementService.togglePin(act.id);
      setActivities((prev) =>
        prev.map((a) => (a.id === act.id ? { ...a, isPinned: newPin } : a))
      );
      showToast(newPin ? 'ปักหมุดกิจกรรมขึ้นบนสุดแล้ว' : 'ยกเลิกการปักหมุดแล้ว');
      onRefreshNewsFeed?.();
    } catch (err: any) {
      showToast(err?.message || 'ไม่สามารถเปลี่ยนสถานะการปักหมุดได้');
    }
  };

  // Toggle Publish Status
  const handleTogglePublish = async (act: Announcement) => {
    const nextPublished = act.status !== 'PUBLISHED';
    try {
      await announcementService.setPublishStatus(act.id, nextPublished);
      setActivities((prev) =>
        prev.map((a) => (a.id === act.id ? { ...a, status: nextPublished ? 'PUBLISHED' : 'DRAFT' } : a))
      );
      showToast(nextPublished ? 'เผยแพร่กิจกรรมแล้ว' : 'เปลี่ยนเป็นฉบับร่างแล้ว');
      onRefreshNewsFeed?.();
    } catch (err: any) {
      showToast(err?.message || 'ไม่สามารถสลับสถานะเผยแพร่ได้');
    }
  };

  // Delete Activity
  const handleOpenDelete = (act: Announcement) => {
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
        icon: <Eye className="w-4 h-4" />,
        onClick: () => setReadingActivity(act),
      },
      {
        label: 'สถิติการเปิดอ่าน',
        icon: <BarChart2 className="w-4 h-4" />,
        onClick: () => handleViewStats(act),
      },
    ];

    if (canEdit) {
      items.push({
        label: act.isPinned ? 'ยกเลิกปักหมุด' : 'ปักหมุดบนสุด',
        icon: act.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />,
        onClick: () => handleTogglePin(act),
      });

      items.push({
        label: act.status === 'PUBLISHED' ? 'เก็บเป็นฉบับร่าง' : 'เผยแพร่กิจกรรม',
        icon: <Sparkles className="w-4 h-4" />,
        onClick: () => handleTogglePublish(act),
      });

      items.push({
        label: 'แก้ไขข้อมูลกิจกรรม',
        icon: <Edit2 className="w-4 h-4" />,
        onClick: () => handleOpenEdit(act),
      });

      items.push({
        label: 'ลบกิจกรรม',
        icon: <Trash2 className="w-4 h-4" />,
        danger: true,
        onClick: () => handleOpenDelete(act),
      });
    }

    return items;
  };

  // Helper to render target audience badge
  const renderTargetBadge = (act: Announcement) => {
    const targets = act.targets || [];
    if (targets.length === 0 || targets.some((t) => t.targetType === 'ALL')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <Globe className="w-3.5 h-3.5" />
          <span>ทุกคนในองค์กร</span>
        </span>
      );
    }

    const tType = targets[0]?.targetType;
    if (tType === 'DIVISION') {
      const names = targets.map((t) => {
        if (t.targetEntityName) return t.targetEntityName;
        const d = divisions.find((div) => div.id === t.targetEntityId);
        return d ? d.divisionName : `ฝ่ายรหัส ${t.targetEntityId}`;
      });
      return (
        <HoverList title="รายชื่อฝ่ายที่กำหนด" items={names.map((n) => ({ label: n }))}>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 cursor-pointer">
            <Building2 className="w-3.5 h-3.5" />
            <span>{targets.length} ฝ่ายที่กำหนด</span>
          </span>
        </HoverList>
      );
    }

    if (tType === 'DEPARTMENT') {
      const names = targets.map((t) => {
        if (t.targetEntityName) return t.targetEntityName;
        const d = departments.find((dept) => dept.id === t.targetEntityId);
        return d ? d.departmentName : `แผนกรหัส ${t.targetEntityId}`;
      });
      return (
        <HoverList title="รายชื่อแผนกที่กำหนด" items={names.map((n) => ({ label: n }))}>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-pointer">
            <Building className="w-3.5 h-3.5" />
            <span>{targets.length} แผนกที่กำหนด</span>
          </span>
        </HoverList>
      );
    }

    if (tType === 'TEAM') {
      const names = targets.map((t) => {
        if (t.targetEntityName) return t.targetEntityName;
        const tm = teams.find((item) => item.id === t.targetEntityId);
        return tm ? tm.teamName : `ทีมรหัส ${t.targetEntityId}`;
      });
      return (
        <HoverList title="รายชื่อทีมที่กำหนด" items={names.map((n) => ({ label: n }))}>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 cursor-pointer">
            <Users className="w-3.5 h-3.5" />
            <span>{targets.length} ทีมที่กำหนด</span>
          </span>
        </HoverList>
      );
    }

    if (tType === 'EMPLOYEE' || (tType as string) === 'INDIVIDUAL') {
      const names = targets.map((t) => {
        if (t.targetEntityName) return t.targetEntityName;
        const emp = employees.find((item) => item.id === t.targetEntityId);
        return emp ? `${emp.employeeCode} - ${emp.fullName}` : `พนักงานรหัส ${t.targetEntityId}`;
      });
      return (
        <HoverList title="รายชื่อพนักงานที่กำหนด" items={names.map((n) => ({ label: n }))}>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 cursor-pointer">
            <UserCheck className="w-3.5 h-3.5" />
            <span>{targets.length} พนักงานที่กำหนด</span>
          </span>
        </HoverList>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        <Users className="w-3.5 h-3.5" />
        <span>กลุ่มเฉพาะ ({targets.length})</span>
      </span>
    );
  };

  // Filtered employees for target checkbox selector
  const filteredEmployeesForSelection = useMemo(() => {
    if (!empSearchFilter.trim()) return employees;
    const q = empSearchFilter.toLowerCase().trim();
    return employees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q)
    );
  }, [employees, empSearchFilter]);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs font-medium animate-in fade-in slide-in-from-top-3">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─── 1. Stat Cards KPI ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="กิจกรรมทั้งหมด"
          value={stats.total}
          icon={Sparkles}
          tone="sky"
        />
        <StatCard
          label="กำลังจะมาถึง"
          value={stats.upcoming}
          icon={Calendar}
          tone="emerald"
        />
        <StatCard
          label="จัดขึ้นวันนี้ / กำลังจัด"
          value={stats.ongoing}
          icon={Flame}
          tone="amber"
        />
        <StatCard
          label="สิ้นสุดแล้ว"
          value={stats.completed}
          icon={CheckCircle2}
          tone="purple"
        />
      </div>

      {/* ─── 2. Main Card Container ─── */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-4">
        {/* Table Toolbar */}
        <TableToolbar
          searchPlaceholder="ค้นหาชื่อกิจกรรม หรือรายละเอียด..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          filters={
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              {/* Year Selector */}
              <div className="w-full sm:w-36">
                <CustomSelect
                  value={selectedYear}
                  onChange={(val) => setSelectedYear(Number(val))}
                  options={getSmartYearOptions({ historicalYears: activities.map((a) => a.publishedAt || a.createdAt) })}
                  className="w-full"
                />
              </div>

              {/* Status Filter */}
              <div className="w-full sm:w-44">
                <CustomSelect
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val as any)}
                  options={[
                    { value: 'ALL', label: 'ทุกสถานะกิจกรรม' },
                    { value: 'UPCOMING', label: 'กำลังจะมาถึง' },
                    { value: 'ONGOING', label: 'จัดขึ้นวันนี้ / กำลังจัด' },
                    { value: 'COMPLETED', label: 'สิ้นสุดแล้ว' },
                    { value: 'DRAFT', label: 'ฉบับร่าง' },
                  ]}
                  className="w-full"
                />
              </div>
            </div>
          }
          actions={
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {/* View Switcher: List vs Calendar */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>รายการ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'calendar'
                      ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>ปฏิทิน</span>
                </button>
              </div>

              {/* Create Activity Button */}
              {canCreate && (
                <Button
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

        {/* ─── Mode 2: Table List View ─── */}
        {viewMode === 'list' && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="table-standard text-xs w-full min-w-[850px] text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-750/70 border-b border-slate-100 dark:border-slate-700/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">ลำดับ</th>
                    <th className="py-3 px-4">วันที่จัดกิจกรรม</th>
                    <th className="py-3 px-4">ชื่อกิจกรรม</th>
                    <th className="py-3 px-4">เวลาจัดกิจกรรม</th>
                    <th className="py-3 px-4">กลุ่มเป้าหมาย</th>
                    <th className="py-3 px-4">สถานะ</th>
                    <th className="py-3 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                  {loading ? (
                    <TableLoading colSpan={7} text="กำลังโหลดประกาศกิจกรรม..." />
                  ) : pagedActivities.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-14 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                          <span className="font-semibold text-slate-600 dark:text-slate-400">
                            ไม่พบประกาศกิจกรรมสำหรับปี {selectedYear + 543}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            สามารถคลิก "+ เพิ่มประกาศกิจกรรม" เพื่อเริ่มต้นประชาสัมพันธ์กิจกรรมขององค์กร
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pagedActivities.map((act, idx) => {
                      const { timeRange, description } = parseActivityMeta(act.content);
                      const statusInfo = getActivityStatusInfo(act);
                      const startDateStr = act.publishedAt || act.createdAt;
                      const hasMultiDays = act.expireAt && act.expireAt.substring(0, 10) !== startDateStr?.substring(0, 10);

                      return (
                        <tr
                          key={act.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-750/50 transition-colors"
                        >
                          {/* Row Number */}
                          <td className="py-3 px-4 text-center font-mono text-slate-400">
                            {(page - 1) * pageSize + idx + 1}
                          </td>

                          {/* Activity Date */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-750 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                {formatThaiDate(startDateStr)}
                              </span>
                              {hasMultiDays && (
                                <span className="text-slate-400 text-2xs">
                                  ถึง {formatThaiDate(act.expireAt)}
                                </span>
                              )}
                              {!hasMultiDays && (
                                <span className="text-slate-400 text-2xs">
                                  ({formatThaiDayOfWeek(startDateStr)})
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Title & Description */}
                          <td className="py-3 px-4 max-w-xs">
                            <div className="flex items-center gap-2">
                              {act.isPinned && (
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              )}
                              <button
                                type="button"
                                onClick={() => setReadingActivity(act)}
                                className="font-semibold text-slate-800 dark:text-slate-200 hover:text-primary dark:hover:text-blue-300 transition-colors text-left cursor-pointer truncate max-w-xs block"
                                title="คลิกเพื่อดูรายละเอียดกิจกรรม"
                              >
                                {act.title}
                              </button>
                            </div>
                            {description && (
                              <span className="text-[11px] text-slate-400 block truncate mt-0.5 max-w-xs">
                                {description}
                              </span>
                            )}
                          </td>

                          {/* Activity Time */}
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-1.5 font-mono text-xs">
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{timeRange || 'ตลอดทั้งวัน'}</span>
                            </div>
                          </td>

                          {/* Target Audience */}
                          <td className="py-3 px-4">
                            {renderTargetBadge(act)}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusInfo.color}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                              <span>{statusInfo.label}</span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center">
                            <ActionDropdown items={getActivityActionItems(act)} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="pt-2">
              <TablePagination
                total={filteredActivities.length}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setPage(1);
                }}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── 3. Detail Reading Modal ─── */}
      {readingActivity && (
        <ModalShell className="z-50 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200" innerClassName="items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
            <ModalHeader
              icon={Sparkles}
              title="รายละเอียดประกาศกิจกรรม"
              onClose={() => setReadingActivity(null)}
            />

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Activity Header */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-2xs">
                    ประกาศกิจกรรม
                  </span>
                  {readingActivity.isPinned && (
                    <span className="font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-2xs flex items-center gap-1">
                      <Pin className="w-2.5 h-2.5 fill-amber-500" /> ปักหมุด
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {readingActivity.title}
                </h3>
              </div>

              {/* Schedule Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-primary dark:text-blue-300 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-2xs text-slate-400 block">วันที่จัดกิจกรรม</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {formatThaiDate(readingActivity.publishedAt || readingActivity.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-2xs text-slate-400 block">เวลาจัดกิจกรรม</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {parseActivityMeta(readingActivity.content).timeRange || 'ตลอดทั้งวัน'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Target Audience */}
              <div>
                <span className="text-2xs text-slate-400 block mb-1">กลุ่มเป้าหมายผู้เข้าร่วม:</span>
                <div>{renderTargetBadge(readingActivity)}</div>
              </div>

              {/* Description */}
              <div>
                <span className="text-2xs text-slate-400 block mb-1">รายละเอียดกิจกรรม:</span>
                <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60">
                  {parseActivityMeta(readingActivity.content).description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <Button variant="secondary" onClick={() => setReadingActivity(null)}>
                ปิดหน้าต่าง
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ─── 4. Create / Edit Activity Modal ─── */}
      {isModalOpen && (
        <ModalShell className="z-50 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200" innerClassName="items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-xl w-full p-6 max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
            <ModalHeader
              icon={Sparkles}
              title={modalMode === 'create' ? 'เพิ่มประกาศกิจกรรมใหม่' : 'แก้ไขข้อมูลประกาศกิจกรรม'}
              onClose={() => setIsModalOpen(false)}
            />

            <form onSubmit={handleSubmitForm} className="space-y-4 pt-4 text-xs font-sans">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อกิจกรรม / หัวข้อประกาศ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="เช่น กิจกรรม Town Hall ประจำไตรมาส, สัมมนา AI for HR..."
                  className="w-full px-3.5 py-2.5 bg-[#F1F5F9] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Dates: Start & End */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    วันที่เริ่มจัดกิจกรรม <span className="text-rose-500">*</span>
                  </label>
                  <ThaiDatePicker
                    value={formStartDate}
                    onChange={setFormStartDate}
                    placeholder="เลือกวันที่เริ่ม"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    วันที่สิ้นสุดกิจกรรม (กรณีหลายวัน)
                  </label>
                  <ThaiDatePicker
                    value={formEndDate}
                    onChange={setFormEndDate}
                    placeholder="เลือกวันที่สิ้นสุด"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Time Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ThaiTimePicker
                  label="เวลาเริ่มกิจกรรม"
                  value={formStartTime}
                  onChange={setFormStartTime}
                />
                <ThaiTimePicker
                  label="เวลาสิ้นสุดกิจกรรม"
                  value={formEndTime}
                  onChange={setFormEndTime}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  รายละเอียดกิจกรรมและกำหนดการ
                </label>
                <textarea
                  rows={4}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="ระบุวัตถุประสงค์ กำหนดการ หรือสิ่งที่ต้องเตรียมมาร่วมกิจกรรม..."
                  className="w-full px-3.5 py-2.5 bg-[#F1F5F9] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
                />
              </div>

              {/* Rich Target Audience: ALL, DIVISION, DEPARTMENT, TEAM, EMPLOYEE */}
              <div ref={targetDropdownRef} className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-700/60 relative">
                {/* Dark Backdrop Overlay when Target Dropdown is open */}
                {formTargetType !== 'ALL' && isTargetDropdownOpen && (
                  <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] z-40 transition-opacity animate-in fade-in duration-150 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTargetDropdownOpen(false);
                    }}
                    aria-hidden="true"
                  />
                )}

                <div className="relative z-50 flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    กลุ่มเป้าหมายผู้เข้าร่วมกิจกรรม
                  </label>
                  <span className="text-2xs text-slate-400 font-medium">
                    {formTargetType === 'ALL' && 'พนักงานทุกคนในองค์กร'}
                    {formTargetType === 'DIVISION' && `เลือกไว้ ${formTargetDivisionIds.length} ฝ่าย`}
                    {formTargetType === 'DEPARTMENT' && `เลือกไว้ ${formTargetDeptIds.length} แผนก`}
                    {formTargetType === 'TEAM' && `เลือกไว้ ${formTargetTeamIds.length} ทีม`}
                    {formTargetType === 'EMPLOYEE' && `เลือกไว้ ${formTargetEmployeeIds.length} ท่าน`}
                  </span>
                </div>

                {/* Target Type Selector Segmented Controls */}
                <div className="relative z-50 grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                  {[
                    { id: 'ALL', label: 'ทุกคนในองค์กร', icon: Globe },
                    { id: 'DIVISION', label: 'ฝ่าย', icon: Building2 },
                    { id: 'DEPARTMENT', label: 'แผนก', icon: Building },
                    { id: 'TEAM', label: 'ทีม', icon: Users },
                    { id: 'EMPLOYEE', label: 'รายบุคคล', icon: UserCheck },
                  ].map((tab) => {
                    const isSelected = formTargetType === tab.id;
                    const Icon = tab.icon;
                    let badgeCount = 0;
                    if (tab.id === 'DIVISION') badgeCount = formTargetDivisionIds.length;
                    if (tab.id === 'DEPARTMENT') badgeCount = formTargetDeptIds.length;
                    if (tab.id === 'TEAM') badgeCount = formTargetTeamIds.length;
                    if (tab.id === 'EMPLOYEE') badgeCount = formTargetEmployeeIds.length;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleSelectTargetTab(tab.id as TargetType)}
                        className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-lg text-2xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white dark:bg-slate-800 text-primary dark:text-blue-300 shadow-2xs font-bold border-2 border-primary/40 dark:border-blue-400/40'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {badgeCount > 0 && !isSelected && (
                          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
                        )}
                        <div className="flex items-center gap-1">
                          <Icon className="w-3.5 h-3.5 mb-0.5" />
                          {badgeCount > 0 && (
                            <span className="text-[10px] bg-primary/10 dark:bg-blue-900/40 text-primary dark:text-blue-300 px-1 rounded-full font-bold">
                              {badgeCount}
                            </span>
                          )}
                        </div>
                        <span className="truncate">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Dropdown Popover opening upwards above the tabs */}
                {formTargetType !== 'ALL' && isTargetDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 bottom-full mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-3.5 space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    {/* DIVISION Dropdown Content */}
                    {formTargetType === 'DIVISION' && (
                      <>
                        <div className="flex items-center justify-between text-2xs text-slate-500 pb-1.5 border-b border-slate-100 dark:border-slate-700/60">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            เลือกฝ่ายที่ต้องการให้เข้าร่วม:
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setFormTargetDivisionIds(divisions.map((d) => d.id))}
                              className="text-primary hover:underline cursor-pointer font-medium"
                            >
                              เลือกทั้งหมด
                            </button>
                            <span className="text-slate-300 dark:text-slate-600">|</span>
                            <button
                              type="button"
                              onClick={() => setFormTargetDivisionIds([])}
                              className="text-slate-400 hover:text-rose-500 hover:underline cursor-pointer font-medium"
                            >
                              ยกเลิกทั้งหมด
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                          {divisions.length === 0 ? (
                            <p className="text-center text-2xs text-slate-400 py-3 col-span-2">
                              ยังไม่มีข้อมูลฝ่ายในระบบ
                            </p>
                          ) : (
                            divisions.map((div) => {
                              const checked = formTargetDivisionIds.includes(div.id);
                              return (
                                <label
                                  key={div.id}
                                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                    checked
                                      ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 font-semibold'
                                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      if (e.target.checked) setFormTargetDivisionIds([...formTargetDivisionIds, div.id]);
                                      else setFormTargetDivisionIds(formTargetDivisionIds.filter((id) => id !== div.id));
                                    }}
                                    className="accent-primary"
                                  />
                                  <span className="truncate">{div.divisionName}</span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </>
                    )}

                    {/* DEPARTMENT Dropdown Content */}
                    {formTargetType === 'DEPARTMENT' && (
                      <>
                        <div className="flex items-center justify-between text-2xs text-slate-500 pb-1.5 border-b border-slate-100 dark:border-slate-700/60">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            เลือกแผนกที่ต้องการให้เข้าร่วม:
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setFormTargetDeptIds(departments.map((d) => d.id))}
                              className="text-primary hover:underline cursor-pointer font-medium"
                            >
                              เลือกทั้งหมด
                            </button>
                            <span className="text-slate-300 dark:text-slate-600">|</span>
                            <button
                              type="button"
                              onClick={() => setFormTargetDeptIds([])}
                              className="text-slate-400 hover:text-rose-500 hover:underline cursor-pointer font-medium"
                            >
                              ยกเลิกทั้งหมด
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                          {departments.length === 0 ? (
                            <p className="text-center text-2xs text-slate-400 py-3 col-span-2">
                              ยังไม่มีข้อมูลแผนกในระบบ
                            </p>
                          ) : (
                            departments.map((dept) => {
                              const checked = formTargetDeptIds.includes(dept.id);
                              return (
                                <label
                                  key={dept.id}
                                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                    checked
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-semibold'
                                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      if (e.target.checked) setFormTargetDeptIds([...formTargetDeptIds, dept.id]);
                                      else setFormTargetDeptIds(formTargetDeptIds.filter((id) => id !== dept.id));
                                    }}
                                    className="accent-primary"
                                  />
                                  <span className="truncate">{dept.departmentName}</span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </>
                    )}

                    {/* TEAM Dropdown Content */}
                    {formTargetType === 'TEAM' && (
                      <>
                        <div className="flex items-center justify-between text-2xs text-slate-500 pb-1.5 border-b border-slate-100 dark:border-slate-700/60">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            เลือกทีมที่ต้องการให้เข้าร่วม:
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setFormTargetTeamIds(teams.map((t) => t.id))}
                              className="text-primary hover:underline cursor-pointer font-medium"
                            >
                              เลือกทั้งหมด
                            </button>
                            <span className="text-slate-300 dark:text-slate-600">|</span>
                            <button
                              type="button"
                              onClick={() => setFormTargetTeamIds([])}
                              className="text-slate-400 hover:text-rose-500 hover:underline cursor-pointer font-medium"
                            >
                              ยกเลิกทั้งหมด
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                          {teams.length === 0 ? (
                            <p className="text-center text-2xs text-slate-400 py-3 col-span-2">
                              ยังไม่มีข้อมูลทีมในระบบ
                            </p>
                          ) : (
                            teams.map((tm) => {
                              const checked = formTargetTeamIds.includes(tm.id);
                              return (
                                <label
                                  key={tm.id}
                                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                    checked
                                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-semibold'
                                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      if (e.target.checked) setFormTargetTeamIds([...formTargetTeamIds, tm.id]);
                                      else setFormTargetTeamIds(formTargetTeamIds.filter((id) => id !== tm.id));
                                    }}
                                    className="accent-primary"
                                  />
                                  <span className="truncate">{tm.teamName}</span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </>
                    )}

                    {/* EMPLOYEE Dropdown Content */}
                    {formTargetType === 'EMPLOYEE' && (
                      <>
                        <div className="flex items-center justify-between text-2xs text-slate-500 pb-1.5 border-b border-slate-100 dark:border-slate-700/60">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            ระบุพนักงานที่ต้องการให้เข้าร่วม:
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setFormTargetEmployeeIds(employees.map((e) => e.id))}
                              className="text-primary hover:underline cursor-pointer font-medium"
                            >
                              เลือกทั้งหมด
                            </button>
                            <span className="text-slate-300 dark:text-slate-600">|</span>
                            <button
                              type="button"
                              onClick={() => setFormTargetEmployeeIds([])}
                              className="text-slate-400 hover:text-rose-500 hover:underline cursor-pointer font-medium"
                            >
                              ยกเลิกทั้งหมด
                            </button>
                          </div>
                        </div>

                        {/* Employee Search Bar */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="พิมพ์ค้นหาชื่อ หรือรหัสพนักงาน..."
                            value={empSearchFilter}
                            onChange={(e) => setEmpSearchFilter(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-2xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                          {filteredEmployeesForSelection.length === 0 ? (
                            <p className="text-center text-2xs text-slate-400 py-3 col-span-2">
                              {employees.length === 0
                                ? 'ยังไม่มีข้อมูลพนักงานในระบบ'
                                : 'ไม่พบรายชื่อพนักงานที่ตรงกับคำค้นหา'}
                            </p>
                          ) : (
                            filteredEmployeesForSelection.map((emp) => {
                              const checked = formTargetEmployeeIds.includes(emp.id);
                              return (
                                <label
                                  key={emp.id}
                                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                    checked
                                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-semibold'
                                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      if (e.target.checked) setFormTargetEmployeeIds([...formTargetEmployeeIds, emp.id]);
                                      else setFormTargetEmployeeIds(formTargetEmployeeIds.filter((id) => id !== emp.id));
                                    }}
                                    className="accent-primary"
                                  />
                                  <div className="truncate text-2xs min-w-0">
                                    <span className="font-bold">{emp.fullName}</span>
                                    <span className="text-slate-400 ml-1 font-mono">({emp.employeeCode})</span>
                                  </div>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </>
                    )}

                    {/* Dropdown Footer: Selected count & Save button */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-2xs">
                      <span className="text-slate-500 dark:text-slate-400">
                        เลือกแล้ว <strong className="text-primary font-bold">{targetSummary.count}</strong> {targetSummary.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsTargetDropdownOpen(false)}
                        className="px-4 py-1.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark transition-colors cursor-pointer shadow-2xs text-xs"
                      >
                        บันทึก
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Pin & Status Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <label className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsPinned}
                    onChange={(e) => setFormIsPinned(e.target.checked)}
                    className="accent-primary w-4 h-4"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">ปักหมุดกิจกรรมนี้</span>
                    <span className="text-2xs text-slate-400 block">แสดงไว้บนสุดของปฏิทินและตาราง</span>
                  </div>
                </label>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    สถานะเมื่อบันทึก
                  </label>
                  <CustomSelect
                    value={formStatus}
                    onChange={(val) => setFormStatus(val as any)}
                    className="w-full"
                    options={[
                      { value: 'PUBLISHED', label: 'เผยแพร่กิจกรรม' },
                      { value: 'DRAFT', label: 'บันทึกเป็นฉบับร่าง' },
                    ]}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700/60">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={submitting}
                  onClick={() => setIsModalOpen(false)}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  loading={submitting}
                >
                  {modalMode === 'create' ? 'สร้างประกาศกิจกรรม' : 'บันทึกการแก้ไข'}
                </Button>
              </div>
            </form>
          </div>
        </ModalShell>
      )}

      {/* ─── 5. Read Stats Modal ─── */}
      {statsModalOpen && (
        <ModalShell className="z-50 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200" innerClassName="items-center justify-center p-4">
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

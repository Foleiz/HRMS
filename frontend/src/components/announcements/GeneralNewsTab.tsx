'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Megaphone,
  Plus,
  Search,
  Pin,
  Eye,
  EyeOff,
  Users,
  Clock,
  Sparkles,
  Globe,
  Building2,
  Building,
  UserCheck,
} from 'lucide-react';
import { CountBadge } from '@/components/ui/CountBadge';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { ModalShell } from '@/components/ui/ModalShell';
import { RefreshIndicator } from '@/components/ui/RefreshIndicator';
import { useLoadPhase } from '@/hooks/useLoadPhase';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { TablePagination } from '@/components/ui/TablePagination';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';
import { Button } from '@/components/ui/Button';
import { RowActions, RowActionButton } from '@/components/ui/RowActions';
import { announcementService } from '@/services/announcementService';
import {
  Announcement,
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementStatus,
  AnnouncementReadStats,
  CreateAnnouncementPayload,
  UpdateAnnouncementPayload,
  AnnouncementTargetInput,
  TargetType,
} from '@/types/announcement';
import { Division, Department, Team } from '@/types/organization';
import { Employee } from '@/types/employee';
import { ConfirmModal, ConfirmType } from '@/components/ui/ConfirmModal';
import { TableLoading } from '@/components/ui/TableState';
import { StatCard } from '@/components/ui/StatCard';

// ─── Helpers ─────────────────────────────────────────────────

const formatDate = (d?: string | null) => {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return d;
  }
};

const formatDateTime = (d?: string | null) => {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return d;
  }
};

const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

const CATEGORY_MAP: Record<string, { label: string; color: string }> = {
  GENERAL: { label: 'ข่าวทั่วไป', color: 'bg-slate-100 text-slate-700 dark:text-slate-300 border-slate-200' },
  POLICY: { label: 'นโยบายองค์กร', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  ACTIVITY: { label: 'กิจกรรมและสัมมนา', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  WELFARE: { label: 'สวัสดิการและสิทธิประโยชน์', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  URGENT: { label: 'ประกาศด่วนสำคัญ', color: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export interface GeneralNewsTabProps {
  divisions?: Division[];
  departments: Department[];
  teams?: Team[];
  employees?: Employee[];
  canCreate: boolean;
  canEdit: boolean;
  onRefreshNewsFeed?: () => void;
}

export const GeneralNewsTab: React.FC<GeneralNewsTabProps> = ({
  divisions = [],
  departments,
  teams = [],
  employees = [],
  canCreate,
  canEdit,
  onRefreshNewsFeed,
}) => {
  // Reading Modal
  const [readingItem, setReadingItem] = useState<Announcement | null>(null);

  // Announcements State
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const listPhase = useLoadPhase(loading);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [pinnedFilter, setPinnedFilter] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<AnnouncementCategory>('GENERAL');
  const [formPriority, setFormPriority] = useState<AnnouncementPriority>('NORMAL');
  const [formStatus, setFormStatus] = useState<AnnouncementStatus>('PUBLISHED');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formPublishedAt, setFormPublishedAt] = useState('');
  const [formExpireAt, setFormExpireAt] = useState('');

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

  // Filtered employees for target selection
  const filteredEmployeesForSelection = useMemo(() => {
    if (!empSearchFilter.trim()) return employees;
    const q = empSearchFilter.toLowerCase().trim();
    return employees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        (e.employeeCode && e.employeeCode.toLowerCase().includes(q))
    );
  }, [employees, empSearchFilter]);

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

  // Target audience summary
  const targetSummaryInfo = useMemo(() => {
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
        label: count === 0 ? 'คลิกเพื่อเลือกฝ่ายที่ต้องการให้มองเห็น...' : `เลือกแล้ว ${count} ฝ่าย: ${names.join(', ')}`,
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
        label: count === 0 ? 'คลิกเพื่อเลือกแผนกที่ต้องการให้มองเห็น...' : `เลือกแล้ว ${count} แผนก: ${names.join(', ')}`,
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
        label: count === 0 ? 'คลิกเพื่อเลือกทีมที่ต้องการให้มองเห็น...' : `เลือกแล้ว ${count} ทีม: ${names.join(', ')}`,
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
        label: count === 0 ? 'คลิกเพื่อเลือกพนักงานที่ต้องการให้มองเห็น...' : `เลือกแล้ว ${count} ท่าน: ${names.join(', ')}`,
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

  // Read Stats Modal
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [readStats, setReadStats] = useState<AnnouncementReadStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsPage, setStatsPage] = useState(1);
  const STATS_PAGE_SIZE = 10;

  // Confirm Modal
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: ConfirmType;
    singleButton?: boolean;
    isLoading?: boolean;
    onConfirm?: () => void | Promise<void>;
  }>({ isOpen: false, title: '', message: '' });

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Helper to render target audience badge
  const renderTargetBadge = (a: Announcement) => {
    const targets = a.targets || [];
    if (targets.length === 0 || targets.some((t) => t.targetType === 'ALL')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <Globe className="w-3.5 h-3.5" />
          <span>ทุกคนในองค์กร</span>
        </span>
      );
    }

    const firstType = targets[0]?.targetType;
    let label = '';
    let icon = Users;
    let colorClass = 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';

    if (firstType === 'DIVISION') {
      icon = Building2;
      colorClass = 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      label = `ฝ่าย (${targets.length})`;
    } else if (firstType === 'DEPARTMENT') {
      icon = Building;
      colorClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      label = `แผนก (${targets.length})`;
    } else if (firstType === 'TEAM') {
      icon = Users;
      colorClass = 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      label = `ทีม (${targets.length})`;
    } else if (firstType === 'EMPLOYEE' || (firstType as string) === 'INDIVIDUAL') {
      icon = UserCheck;
      colorClass = 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      label = `รายบุคคล (${targets.length})`;
    }

    const Icon = icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </span>
    );
  };

  // Load Announcements
  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await announcementService.getAnnouncements({
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        priority: priorityFilter || undefined,
        isPinned: pinnedFilter,
        page,
        pageSize,
      });
      setAnnouncements(res.items);
      setTotalCount(res.totalCount);
    } catch (err) {
      console.error('Failed to fetch announcements', err);
      showToast('ไม่สามารถโหลดรายการประกาศได้');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, categoryFilter, priorityFilter, pinnedFilter, page, pageSize]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Open Reading Modal for Preview
  const handleOpenReading = (a: Announcement) => {
    setReadingItem(a);
  };

  // Handle open create form
  const handleOpenCreate = () => {
    setEditingAnnouncement(null);
    setFormTitle('');
    setFormContent('');
    setFormCategory('GENERAL');
    setFormPriority('NORMAL');
    setFormStatus('PUBLISHED');
    setFormIsPinned(false);
    setFormPublishedAt(getTodayDateString());
    setFormExpireAt('');
    setFormTargetType('ALL');
    setFormTargetDivisionIds([]);
    setFormTargetDeptIds([]);
    setFormTargetTeamIds([]);
    setFormTargetEmployeeIds([]);
    setEmpSearchFilter('');
    setIsTargetDropdownOpen(false);
    setIsFormOpen(true);
  };

  // Handle open edit form
  const handleOpenEdit = (a: Announcement) => {
    setEditingAnnouncement(a);
    setFormTitle(a.title);
    setFormContent(a.content);
    setFormCategory(a.category);
    setFormPriority(a.priority);
    setFormStatus(a.status);
    setFormIsPinned(a.isPinned);
    setFormPublishedAt(formatDateForInput(a.publishedAt || a.createdAt));
    setFormExpireAt(formatDateForInput(a.expireAt));

    const targets = a.targets || [];
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
    setIsFormOpen(true);
  };

  // Submit save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('กรุณากรอกหัวข้อประกาศ');
      return;
    }
    if (!formPublishedAt) {
      showToast('กรุณาระบุวันที่เผยแพร่ประกาศ');
      return;
    }
    if (!formContent.trim()) {
      showToast('กรุณากรอกเนื้อหาประกาศ');
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

    setIsSaving(true);
    try {
      const payload = {
        title: formTitle.trim(),
        content: formContent.trim(),
        category: formCategory,
        priority: formPriority,
        status: formStatus,
        isPinned: formIsPinned,
        bannerImageUrl: null,
        publishedAt: toIsoStringFromDateInput(formPublishedAt),
        expireAt: toIsoStringFromExpireInput(formExpireAt),
        targets,
      };

      if (editingAnnouncement) {
        await announcementService.updateAnnouncement(editingAnnouncement.id, payload as UpdateAnnouncementPayload);
        showToast('ปรับปรุงข่าวประกาศเรียบร้อยแล้ว');
      } else {
        await announcementService.createAnnouncement(payload as CreateAnnouncementPayload);
        showToast('สร้างข่าวประกาศใหม่เรียบร้อยแล้ว');
      }

      setIsFormOpen(false);
      fetchAnnouncements();
      onRefreshNewsFeed?.();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกประกาศ');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Pin
  const handleTogglePin = async (a: Announcement) => {
    try {
      const newPinned = await announcementService.togglePin(a.id);
      showToast(newPinned ? 'ปักหมุดประกาศขึ้นบนสุดเรียบร้อย' : 'ยกเลิกการปักหมุดเรียบร้อย');
      fetchAnnouncements();
      onRefreshNewsFeed?.();
    } catch (err) {
      showToast('ไม่สามารถเปลี่ยนสถานะการปักหมุดได้');
    }
  };

  // Toggle Publish
  const handleTogglePublish = async (a: Announcement) => {
    const isPub = a.status === 'PUBLISHED';
    try {
      await announcementService.setPublishStatus(a.id, !isPub);
      showToast(!isPub ? 'เผยแพร่ประกาศเรียบร้อยแล้ว' : 'เปลี่ยนสถานะเป็นฉบับร่างเรียบร้อย');
      fetchAnnouncements();
      onRefreshNewsFeed?.();
    } catch (err) {
      showToast('ไม่สามารถเปลี่ยนสถานะการเผยแพร่ได้');
    }
  };

  // Delete
  const handleDelete = (a: Announcement) => {
    setConfirmConfig({
      isOpen: true,
      title: 'ยืนยันการจัดเก็บ/ลบข่าวประกาศ',
      message: `คุณต้องการลบหรือจัดเก็บประกาศ "${a.title}" ใช่หรือไม่? ข่าวนี้จะไม่แสดงให้พนักงานเห็นอีก`,
      confirmText: 'ยืนยันการลบ',
      cancelText: 'ยกเลิก',
      type: 'danger',
      onConfirm: async () => {
        try {
          await announcementService.deleteAnnouncement(a.id);
          showToast('ลบ/จัดเก็บข่าวประกาศเรียบร้อยแล้ว');
          fetchAnnouncements();
          onRefreshNewsFeed?.();
        } catch (err) {
          showToast('เกิดข้อผิดพลาด ไม่สามารถลบประกาศได้');
        }
      },
    });
  };

  // Open Stats Modal
  const handleOpenStats = async (a: Announcement) => {
    setStatsModalOpen(true);
    setLoadingStats(true);
    setReadStats(null);
    setStatsPage(1);
    try {
      const data = await announcementService.getReadStats(a.id);
      setReadStats(data);
    } catch (err) {
      console.error('Failed to load read stats', err);
    } finally {
      setLoadingStats(false);
    }
  };

  // KPIs
  const publishedCount = announcements.filter((a) => a.status === 'PUBLISHED').length;
  const pinnedCount = announcements.filter((a) => a.isPinned).length;
  const draftCount = announcements.filter((a) => a.status === 'DRAFT').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-xl text-sm font-medium animate-in fade-in slide-in-from-top-3">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="ประกาศทั้งหมด" value={totalCount} icon={Megaphone} tone="sky" />
        <StatCard label="กำลังเผยแพร่" value={publishedCount} icon={Eye} tone="emerald" />
        <StatCard label="ปักหมุดสำคัญ" value={pinnedCount} icon={Pin} tone="amber" />
        <StatCard label="ฉบับร่าง" value={draftCount} icon={Clock} tone="slate" />
      </div>

      {/* Main Card Container */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
        <div className="space-y-4">
          {/* Toolbar: ค้นหา + ตัวกรอง (ซ้าย) | สร้างประกาศ (ขวา) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 w-full sm:w-auto flex-1">
              {/* Search */}
              <div className="relative max-w-sm w-full shrink-0">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="ค้นหาหัวข้อประกาศ หรือเนื้อหา..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#F1F5F9] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Status */}
              <div className="w-full sm:w-44">
                <CustomSelect
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(String(val))}
                  placeholder="สถานะทั้งหมด"
                  className="w-full"
                  options={[
                    { value: '', label: 'สถานะทั้งหมด' },
                    { value: 'PUBLISHED', label: 'เผยแพร่แล้ว' },
                    { value: 'DRAFT', label: 'ฉบับร่าง' },
                    { value: 'ARCHIVED', label: 'จัดเก็บ/ลบ' },
                  ]}
                />
              </div>

              {/* Category */}
              <div className="w-full sm:w-48">
                <CustomSelect
                  value={categoryFilter}
                  onChange={(val) => setCategoryFilter(String(val))}
                  placeholder="หมวดหมู่ทั้งหมด"
                  className="w-full"
                  options={[
                    { value: '', label: 'หมวดหมู่ทั้งหมด' },
                    { value: 'GENERAL', label: 'ข่าวทั่วไป' },
                    { value: 'POLICY', label: 'นโยบายองค์กร' },
                    { value: 'ACTIVITY', label: 'กิจกรรมและสัมมนา' },
                    { value: 'WELFARE', label: 'สวัสดิการและสิทธิประโยชน์' },
                    { value: 'URGENT', label: 'ประกาศด่วนสำคัญ' },
                  ]}
                />
              </div>

              {/* Priority */}
              <div className="w-full sm:w-44">
                <CustomSelect
                  value={priorityFilter}
                  onChange={(val) => setPriorityFilter(String(val))}
                  placeholder="ความสำคัญทั้งหมด"
                  className="w-full"
                  options={[
                    { value: '', label: 'ความสำคัญทั้งหมด' },
                    { value: 'LOW', label: 'ทั่วไป' },
                    { value: 'NORMAL', label: 'ปกติ' },
                    { value: 'HIGH', label: 'สำคัญ' },
                    { value: 'URGENT', label: 'ด่วนที่สุด' },
                  ]}
                />
              </div>
            </div>

            {canCreate && (
              <div className="w-full sm:w-auto flex items-center justify-end gap-2.5 shrink-0">
                <Button
                  onClick={handleOpenCreate}
                  icon={<Plus className="w-4 h-4" />}
                  className="w-full sm:w-auto"
                >
                  สร้างประกาศใหม่
                </Button>
              </div>
            )}
          </div>

          {/* Announcements Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <RefreshIndicator active={listPhase.refreshing} />
            <table className="table-standard text-xs w-full min-w-[850px] text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 dark:border-slate-700/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">ปักหมุด</th>
                  <th className="py-3 px-4">หัวข้อประกาศ</th>
                  <th className="py-3 px-4">หมวดหมู่</th>
                  <th className="py-3 px-4">กลุ่มเป้าหมาย</th>
                  <th className="py-3 px-4">ยอดเปิดอ่าน</th>
                  <th className="py-3 px-4">สถานะ</th>
                  <th className="py-3 px-4">วันที่เผยแพร่</th>
                  <th className="py-3 px-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                {listPhase.initialLoading ? (
                  <TableLoading colSpan={8} text="กำลังโหลดข้อมูลประกาศ..." />
                ) : announcements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Megaphone className="w-8 h-8 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                        <span className="font-semibold text-slate-600 dark:text-slate-400">ไม่พบข้อมูลข่าวประกาศ</span>
                        <span className="text-[11px] text-slate-400">สามารถกดปุ่ม "สร้างประกาศใหม่" เพื่อเริ่มประชาสัมพันธ์</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  announcements.map((a) => {
                    const cat = CATEGORY_MAP[a.category] || CATEGORY_MAP.GENERAL;
                    const readPct =
                      a.totalTargetCount > 0 ? Math.round((a.readCount / a.totalTargetCount) * 100) : 0;

                    return (
                      <tr key={a.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-750/50 transition-colors">
                        {/* Pin Toggle */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => canEdit && handleTogglePin(a)}
                            disabled={!canEdit}
                            title={canEdit ? (a.isPinned ? 'ยกเลิกปักหมุด' : 'ปักหมุดบนสุด') : 'ไม่มีสิทธิ์แก้ไขประกาศ'}
                            className={`p-1.5 rounded-lg transition-colors ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} ${
                              a.isPinned
                                ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 hover:bg-amber-100'
                                : 'text-slate-300 hover:text-slate-500 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            <Pin className={`w-4 h-4 ${a.isPinned ? 'fill-amber-500' : ''}`} />
                          </button>
                        </td>

                        {/* Title */}
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200 max-w-xs">
                          <div className="flex items-center gap-2">
                            {a.isPinned && (
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenReading(a)}
                              className="font-semibold text-slate-800 dark:text-slate-200 hover:text-primary dark:hover:text-blue-300 transition-colors text-left cursor-pointer truncate max-w-xs block"
                              title="คลิกเพื่อดูตัวอย่างประกาศฉบับเต็ม"
                            >
                              {a.title}
                            </button>
                          </div>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 block truncate mt-0.5">
                            {a.content}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${cat.color}`}>
                            {cat.label}
                          </span>
                        </td>

                        {/* Target */}
                        <td className="py-3 px-4">
                          {renderTargetBadge(a)}
                        </td>

                        {/* Read Receipts */}
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleOpenStats(a)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors font-semibold text-[11px] cursor-pointer"
                            title="คลิกเพื่อดูรายชื่อพนักงานที่เปิดอ่าน"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{a.readCount} / {a.totalTargetCount} ({readPct}%)</span>
                          </button>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => canEdit && handleTogglePublish(a)}
                            disabled={!canEdit}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${canEdit ? 'cursor-pointer' : 'cursor-default'} ${
                              a.status === 'PUBLISHED'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                                : a.status === 'DRAFT'
                                ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            }`}
                            title={canEdit ? 'คลิกเพื่อสลับสถานะ เผยแพร่ / ฉบับร่าง' : undefined}
                          >
                            {a.status === 'PUBLISHED' ? (
                              <>
                                <Eye className="w-3 h-3" />
                                <span>เผยแพร่แล้ว</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3 h-3" />
                                <span>ฉบับร่าง</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Published At */}
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                          {formatDateTime(a.publishedAt || a.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          {canEdit ? (
                            <RowActions>
                              <RowActionButton
                                action="edit"
                                title="แก้ไขประกาศ"
                                onClick={() => handleOpenEdit(a)}
                              />
                              <RowActionButton
                                action="delete"
                                title="ลบ/จัดเก็บประกาศ"
                                onClick={() => handleDelete(a)}
                              />
                            </RowActions>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">-</span>
                          )}
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
              total={totalCount}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              pageSizeOptions={[10, 20, 50, 100, 200]}
            />
          </div>
        </div>
      </div>

      {/* READING MODAL */}
      {readingItem && (
        <ModalShell className="z-50 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200" innerClassName="items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary dark:text-blue-300 flex items-center justify-center shrink-0">
                  <Megaphone className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  ข่าวสารและประกาศ
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReadingItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${CATEGORY_MAP[readingItem.category]?.color}`}>
                  {CATEGORY_MAP[readingItem.category]?.label}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {readingItem.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  เผยแพร่เมื่อ {formatDateTime(readingItem.publishedAt || readingItem.createdAt)}
                </p>
              </div>

              <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60">
                {readingItem.content}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <Button variant="secondary" onClick={() => setReadingItem(null)}>
                ปิดหน้าต่าง
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* READ STATS MODAL */}
      {statsModalOpen && (
        <ModalShell className="z-50 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200" innerClassName="items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <ModalHeader
              icon={Eye}
              title="สถิติการเปิดอ่านข่าวประกาศ"
              onClose={() => setStatsModalOpen(false)}
            />

            {loadingStats ? (
              <div className="py-8 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-xs">กำลังโหลดสถิติผู้เปิดอ่าน...</span>
              </div>
            ) : !readStats ? (
              <p className="text-center text-xs text-slate-400 py-8">ไม่พบข้อมูลสถิติ</p>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
                    <p className="text-2xs text-slate-400">เป้าหมายทั้งหมด</p>
                    <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {readStats.totalTargetEmployees} คน
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60">
                    <p className="text-2xs text-emerald-600 dark:text-emerald-400">เปิดอ่านแล้ว</p>
                    <p className="text-base font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                      {readStats.readCount} คน
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60">
                    <p className="text-2xs text-blue-600 dark:text-blue-400">อัตราการอ่าน</p>
                    <p className="text-base font-bold text-blue-700 dark:text-blue-300 mt-0.5">
                      {readStats.readPercentage.toFixed(0)}%
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 text-xs">
                    รายชื่อผู้ที่เปิดอ่านแล้ว ({readStats.receipts?.length || 0})
                  </h4>
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/60">
                    {readStats.receipts && readStats.receipts.length > 0 ? (
                      readStats.receipts.map((r) => (
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

      {/* CREATE / EDIT ANNOUNCEMENT MODAL */}
      {isFormOpen && (
        <ModalShell className="z-50 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200" innerClassName="items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-xl w-full p-6 max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
            <ModalHeader
              icon={Megaphone}
              title={editingAnnouncement ? 'แก้ไขข่าวสารและประกาศ' : 'สร้างประกาศประชาสัมพันธ์ใหม่'}
              onClose={() => setIsFormOpen(false)}
            />

            <form onSubmit={handleSave} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  หัวข้อประกาศ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="เช่น สิทธิประโยชน์ใหม่ประจำปี, กำหนดการตรวจสุขภาพ..."
                  className="w-full px-3.5 py-2.5 bg-[#F1F5F9] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    หมวดหมู่ประกาศ
                  </label>
                  <CustomSelect
                    value={formCategory}
                    onChange={(val) => setFormCategory(val as AnnouncementCategory)}
                    className="w-full"
                    options={[
                      { value: 'GENERAL', label: 'ข่าวทั่วไป' },
                      { value: 'POLICY', label: 'นโยบายองค์กร' },
                      { value: 'WELFARE', label: 'สวัสดิการและสิทธิประโยชน์' },
                      { value: 'URGENT', label: 'ประกาศด่วนสำคัญ' },
                      { value: 'ACTIVITY', label: 'กิจกรรมและสัมมนา' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ระดับความสำคัญ
                  </label>
                  <CustomSelect
                    value={formPriority}
                    onChange={(val) => setFormPriority(val as AnnouncementPriority)}
                    className="w-full"
                    options={[
                      { value: 'LOW', label: 'ทั่วไป' },
                      { value: 'NORMAL', label: 'ปกติ' },
                      { value: 'HIGH', label: 'สำคัญ' },
                      { value: 'URGENT', label: 'ด่วนที่สุด' },
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    วันที่เผยแพร่ <span className="text-rose-500">*</span>
                  </label>
                  <ThaiDatePicker
                    value={formPublishedAt}
                    onChange={setFormPublishedAt}
                    placeholder="เลือกวันที่เริ่มเผยแพร่"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    วันที่สิ้นสุดการแสดงผล (ไม่ระบุ = ตลอดไป)
                  </label>
                  <ThaiDatePicker
                    value={formExpireAt}
                    onChange={setFormExpireAt}
                    placeholder="เลือกวันที่สิ้นสุด"
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  เนื้อหาประกาศ <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={5}
                  required
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="พิมพ์รายละเอียดประกาศที่ต้องการสื่อสารแก่พนักงาน..."
                  className="w-full px-3.5 py-2.5 bg-[#F1F5F9] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
                />
              </div>

              {/* Rich Target Audience: ALL, DIVISION, DEPARTMENT, TEAM, EMPLOYEE */}
              <div ref={targetDropdownRef} className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-700/60 relative">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    กลุ่มเป้าหมายผู้มองเห็นประกาศ
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
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
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

                {/* Dropdown Popover directly below the tabs */}
                {formTargetType !== 'ALL' && isTargetDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-3.5 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* DIVISION Dropdown Content */}
                    {formTargetType === 'DIVISION' && (
                      <>
                        <div className="flex items-center justify-between text-2xs text-slate-500 pb-1.5 border-b border-slate-100 dark:border-slate-700/60">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            เลือกฝ่ายที่ต้องการให้มองเห็น:
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
                            เลือกแผนกที่ต้องการให้มองเห็น:
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
                            เลือกทีมที่ต้องการให้มองเห็น:
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
                            ระบุพนักงานที่ต้องการให้มองเห็น:
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
                        เลือกแล้ว <strong className="text-primary font-bold">{targetSummaryInfo.count}</strong> {targetSummaryInfo.unit}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsPinned}
                    onChange={(e) => setFormIsPinned(e.target.checked)}
                    className="accent-primary w-4 h-4"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">ปักหมุดประกาศนี้</span>
                  </div>
                </label>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">สถานะเมื่อบันทึก</label>
                  <CustomSelect
                    value={formStatus}
                    onChange={(val) => setFormStatus(val as AnnouncementStatus)}
                    className="w-full"
                    options={[
                      { value: 'PUBLISHED', label: 'เผยแพร่' },
                      { value: 'DRAFT', label: 'บันทึกเป็นฉบับร่าง' },
                    ]}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSaving}
                  onClick={() => setIsFormOpen(false)}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  loading={isSaving}
                >
                  {editingAnnouncement ? 'บันทึกการแก้ไข' : 'สร้างและบันทึกประกาศ'}
                </Button>
              </div>
            </form>
          </div>
        </ModalShell>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        type={confirmConfig.type}
        singleButton={confirmConfig.singleButton}
        isLoading={confirmConfig.isLoading}
        onConfirm={confirmConfig.onConfirm}
        onClose={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

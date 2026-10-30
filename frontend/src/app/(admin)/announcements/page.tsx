'use client';

import { useLoadPhase } from '@/hooks/useLoadPhase';
import { RefreshIndicator } from '@/components/ui/RefreshIndicator';
import { ModalShell } from '@/components/ui/ModalShell';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Megaphone,
  Plus,
  Search,
  Loader2,
  Pin,
  PinOff,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Calendar,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  BarChart2,
  X,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Building,
  Tag
} from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { TablePagination } from '@/components/ui/TablePagination';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';
import { Button } from '@/components/ui/Button';
import { RowActions, RowActionButton } from '@/components/ui/RowActions';
import { announcementService } from '@/services/announcementService';
import { organizationService } from '@/services/organizationService';
import { useAuth } from '@/context/AuthContext';
import {
  Announcement,
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementStatus,
  AnnouncementReadStats,
  CreateAnnouncementPayload,
  UpdateAnnouncementPayload
} from '@/types/announcement';
import { Department } from '@/types/organization';
import { ConfirmModal, ConfirmType } from '@/components/ui/ConfirmModal';
import { useBreadcrumb } from '@/context/BreadcrumbContext';

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

const PRIORITY_MAP: Record<string, { label: string; color: string; badge: string }> = {
  LOW: { label: 'ทั่วไป', color: 'text-slate-500 dark:text-slate-400', badge: 'bg-slate-50 text-slate-600 dark:text-slate-400 border-slate-200' },
  NORMAL: { label: 'ปกติ', color: 'text-blue-600', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  HIGH: { label: 'สำคัญ', color: 'text-amber-600', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  URGENT: { label: 'ด่วนที่สุด', color: 'text-red-600', badge: 'bg-red-50 text-red-700 border-red-200' },
};

export default function AnnouncementsPage() {
  const { setBreadcrumb } = useBreadcrumb();
  const { user, hasRole, hasPermission } = useAuth();

  // ใช้รหัสสิทธิ์เดียวกับ backend (ANNOUNCEMENTS_CREATE / ANNOUNCEMENTS_EDIT)
  const isSuper = hasRole('ADMIN') || hasRole('SYSTEM_SUPER');
  const canCreate = Boolean(isSuper || hasPermission('ANNOUNCEMENTS_CREATE'));
  const canEdit = Boolean(isSuper || hasPermission('ANNOUNCEMENTS_EDIT'));
  const canManage = canCreate || canEdit;

  // Reading Modal (Preview สำหรับผู้ดูแล)
  const [readingItem, setReadingItem] = useState<Announcement | null>(null);

  // ─── Admin Management State (สำหรับ HR/ผู้ดูแล) ───
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const listPhase = useLoadPhase(loading);
  const [totalCount, setTotalCount] = useState(0);

  // Filter state for Admin
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
  const [formTargetType, setFormTargetType] = useState<'ALL' | 'DEPARTMENT'>('ALL');
  const [formSelectedDeptIds, setFormSelectedDeptIds] = useState<number[]>([]);

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

  // Breadcrumb
  useEffect(() => {
    setBreadcrumb({
      section: 'องค์กร',
      page: 'จัดการประกาศ',
    });
  }, [setBreadcrumb]);

  // Load Announcements for Admin
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

  // Initial loads
  useEffect(() => {
    if (canManage) {
      fetchAnnouncements();
      organizationService.getDepartments().then(setDepartments).catch(console.error);
    }
  }, [fetchAnnouncements, canManage]);

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
    setFormSelectedDeptIds([]);
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

    const hasDeptTarget = a.targets.some((t) => t.targetType === 'DEPARTMENT');
    if (hasDeptTarget) {
      setFormTargetType('DEPARTMENT');
      const deptIds = a.targets
        .filter((t) => t.targetType === 'DEPARTMENT' && t.targetEntityId)
        .map((t) => Number(t.targetEntityId));
      setFormSelectedDeptIds(deptIds);
    } else {
      setFormTargetType('ALL');
      setFormSelectedDeptIds([]);
    }

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

    setIsSaving(true);
    try {
      const targets =
        formTargetType === 'ALL'
          ? [{ targetType: 'ALL' as const, targetEntityId: null }]
          : formSelectedDeptIds.map((id) => ({ targetType: 'DEPARTMENT' as const, targetEntityId: id }));

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

  // KPIs for Admin
  const publishedCount = announcements.filter((a) => a.status === 'PUBLISHED').length;
  const pinnedCount = announcements.filter((a) => a.isPinned).length;
  const draftCount = announcements.filter((a) => a.status === 'DRAFT').length;

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-xl text-sm font-medium animate-in fade-in slide-in-from-top-3">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">จัดการประกาศองค์กร</h1>
          </div>
        </div>

        {canCreate && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleOpenCreate}
              icon={<Plus className="w-4 h-4" />}
            >
              สร้างประกาศใหม่
            </Button>
          </div>
        )}
      </div>

      {/* Admin Management View */}
      <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-sky-100 dark:bg-sky-950/60 p-4 rounded-2xl border border-sky-300 dark:border-sky-800 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-800 dark:text-sky-300">ประกาศทั้งหมด</span>
                <div className="w-8 h-8 rounded-full bg-white dark:bg-sky-900/60 text-sky-600 dark:text-sky-300 shadow-xs flex items-center justify-center shrink-0">
                  <Megaphone className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-sky-950 dark:text-sky-100">{totalCount}</div>
            </div>

            <div className="bg-emerald-100 dark:bg-emerald-950/60 p-4 rounded-2xl border border-emerald-300 dark:border-emerald-800 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">กำลังเผยแพร่</span>
                <div className="w-8 h-8 rounded-full bg-white dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 shadow-xs flex items-center justify-center shrink-0">
                  <Eye className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-300">{publishedCount}</div>
            </div>

            <div className="bg-amber-100 dark:bg-amber-950/60 p-4 rounded-2xl border border-amber-300 dark:border-amber-800 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300">ปักหมุดสำคัญ</span>
                <div className="w-8 h-8 rounded-full bg-white dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 shadow-xs flex items-center justify-center shrink-0">
                  <Pin className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-300">{pinnedCount}</div>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">ฉบับร่าง</span>
                <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-xs flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">{draftCount}</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาหัวข้อประกาศ หรือเนื้อหา..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Status */}
              <CustomSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(String(val))}
                placeholder="สถานะทั้งหมด"
                className="min-w-[140px]"
                options={[
                  { value: '', label: 'สถานะทั้งหมด' },
                  { value: 'PUBLISHED', label: 'เผยแพร่แล้ว' },
                  { value: 'DRAFT', label: 'ฉบับร่าง' },
                  { value: 'ARCHIVED', label: 'จัดเก็บ/ลบ' },
                ]}
              />

              {/* Category */}
              <CustomSelect
                value={categoryFilter}
                onChange={(val) => setCategoryFilter(String(val))}
                placeholder="หมวดหมู่ทั้งหมด"
                className="min-w-[160px]"
                options={[
                  { value: '', label: 'หมวดหมู่ทั้งหมด' },
                  { value: 'GENERAL', label: 'ข่าวทั่วไป' },
                  { value: 'POLICY', label: 'นโยบายองค์กร' },
                  { value: 'ACTIVITY', label: 'กิจกรรมและสัมมนา' },
                  { value: 'WELFARE', label: 'สวัสดิการและสิทธิประโยชน์' },
                  { value: 'URGENT', label: 'ประกาศด่วนสำคัญ' },
                ]}
              />

              {/* Priority */}
              <CustomSelect
                value={priorityFilter}
                onChange={(val) => setPriorityFilter(String(val))}
                placeholder="ความสำคัญทั้งหมด"
                className="min-w-[150px]"
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

          {/* Announcements Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="m-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
              <RefreshIndicator active={listPhase.refreshing} />
              <table className="table-standard text-xs w-full min-w-[850px] text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">ปักหมุด</th>
                    <th className="py-3 px-4">หัวข้อประกาศ</th>
                    <th className="py-3 px-4">หมวดหมู่</th>
                    <th className="py-3 px-4">ความสำคัญ</th>
                    <th className="py-3 px-4">กลุ่มเป้าหมาย</th>
                    <th className="py-3 px-4">ยอดเปิดอ่าน</th>
                    <th className="py-3 px-4">สถานะ</th>
                    <th className="py-3 px-4">วันที่เผยแพร่</th>
                    <th className="py-3 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {listPhase.initialLoading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 text-primary animate-spin" />
                          <span>กำลังโหลดข้อมูลประกาศ...</span>
                        </div>
                      </td>
                    </tr>
                  ) : announcements.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <Megaphone className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                          <span className="font-semibold text-slate-600 dark:text-slate-400">ไม่พบข้อมูลข่าวประกาศ</span>
                          <span className="text-[11px] text-slate-400">สามารถกดปุ่ม "สร้างประกาศใหม่" เพื่อเริ่มประชาสัมพันธ์</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    announcements.map((a) => {
                      const cat = CATEGORY_MAP[a.category] || CATEGORY_MAP.GENERAL;
                      const pri = PRIORITY_MAP[a.priority] || PRIORITY_MAP.NORMAL;
                      const targetSummary =
                        a.targets.length === 0 || a.targets.some((t) => t.targetType === 'ALL')
                          ? 'พนักงานทุกคน (ทั้งบริษัท)'
                          : `${a.targets.length} แผนกที่กำหนด`;

                      const readPct =
                        a.totalTargetCount > 0 ? Math.round((a.readCount / a.totalTargetCount) * 100) : 0;

                      return (
                        <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Pin Toggle */}
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => canEdit && handleTogglePin(a)}
                              disabled={!canEdit}
                              title={canEdit ? (a.isPinned ? 'ยกเลิกปักหมุด' : 'ปักหมุดบนสุด') : 'ไม่มีสิทธิ์แก้ไขประกาศ'}
                              className={`p-1.5 rounded-lg transition-colors ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} ${
                                a.isPinned
                                  ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                  : 'text-slate-300 hover:text-slate-500 dark:text-slate-400 hover:bg-slate-100'
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
                            <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                              {a.content}
                            </span>
                          </td>

                          {/* Category */}
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${cat.color}`}>
                              {cat.label}
                            </span>
                          </td>

                          {/* Priority */}
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${pri.badge}`}>
                              {pri.label}
                            </span>
                          </td>

                          {/* Target */}
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              <span>{targetSummary}</span>
                            </div>
                          </td>

                          {/* Read Receipts */}
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => handleOpenStats(a)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-semibold text-[11px] cursor-pointer"
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
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : a.status === 'DRAFT'
                                  ? 'bg-slate-100 text-slate-600 dark:text-slate-400 border-slate-200 hover:bg-slate-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
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
            <div className="p-4 border-t border-slate-100 dark:border-slate-700/60">
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

      {/* ========================================================================= */}
      {/* READING MODAL (หน้าต่างอ่านประกาศฉบับเต็ม สำหรับพนักงาน)                    */}
      {/* ========================================================================= */}
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
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="p-6 overflow-y-auto overflow-x-hidden space-y-3.5 flex-1 min-w-0">
              {/* Badges: Priority + Category */}
              {(readingItem.priority === 'URGENT' || readingItem.category) && (
                <div className="flex flex-wrap items-center gap-2">
                  {readingItem.priority === 'URGENT' && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 border border-rose-100 dark:border-rose-900/50">
                      ด่วน
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-900/50">
                    {CATEGORY_MAP[readingItem.category]?.label || 'ข่าวทั่วไป'}
                  </span>
                </div>
              )}

              {/* Title */}
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug break-words [overflow-wrap:anywhere] [word-break:break-word] flex items-center gap-2">
                {readingItem.isPinned && (
                  <span className="text-lg shrink-0 select-none" title="ปักหมุด">📌</span>
                )}
                <span>{readingItem.title}</span>
              </h2>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 dark:text-slate-500 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {new Date(readingItem.publishedAt || readingItem.createdAt).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </span>
                {readingItem.createdByEmployeeName && (
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>ผู้ประกาศ: {readingItem.createdByEmployeeName}</span>
                  </span>
                )}
                {readingItem.expireAt && (
                  <span className="flex items-center gap-1 text-amber-600 font-medium">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>สิ้นสุดการเผยแพร่: {formatDate(readingItem.expireAt)}</span>
                  </span>
                )}
              </div>

              {/* Content Body (scrollable section) */}
              <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word] max-h-[350px] overflow-y-auto pr-2">
                {readingItem.content}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end">
              <Button
                variant="secondary"
                onClick={() => setReadingItem(null)}
              >
                ปิดหน้าต่าง
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ========================================================================= */}
      {/* AUDIENCE AUDIT STATS MODAL (หน้าต่างตรวจสอบสถิติคนอ่าน สำหรับ Admin)        */}
      {/* ========================================================================= */}
      {statsModalOpen && (
        <ModalShell className="z-50 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200" innerClassName="items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">สถิติและรายชื่อผู้เปิดอ่าน</h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-sm">{readStats?.title || 'กำลังโหลด...'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {loadingStats ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs">กำลังคำนวณสถิติการเปิดอ่าน...</span>
                </div>
              ) : !readStats ? (
                <div className="py-10 text-center text-xs text-slate-400">ไม่พบข้อมูลสถิติ</div>
              ) : (
                <>
                  {/* Stats Progress Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">เป้าหมายทั้งหมด</span>
                      <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{readStats.totalTargetEmployees} คน</span>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center">
                      <span className="text-[11px] text-emerald-700 font-medium block">เปิดอ่านแล้ว</span>
                      <span className="text-lg font-bold text-emerald-700">{readStats.readCount} คน</span>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                      <span className="text-[11px] text-blue-700 font-medium block">อัตราการเข้าถึง</span>
                      <span className="text-lg font-bold text-blue-700">{readStats.readPercentage}%</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(readStats.readPercentage, 100)}%` }}
                    />
                  </div>

                  {/* Readers Table with 10 items pagination */}
                  {(() => {
                    const totalReceipts = readStats.receipts.length;
                    const totalStatsPages = Math.max(1, Math.ceil(totalReceipts / STATS_PAGE_SIZE));
                    const paginatedReceipts = readStats.receipts.slice(
                      (statsPage - 1) * STATS_PAGE_SIZE,
                      statsPage * STATS_PAGE_SIZE
                    );

                    const getStatsPageNumbers = () => {
                      if (totalStatsPages <= 7) {
                        return Array.from({ length: totalStatsPages }, (_, i) => i + 1);
                      }
                      if (statsPage <= 4) {
                        return [1, 2, 3, 4, 5, '...', totalStatsPages];
                      }
                      if (statsPage >= totalStatsPages - 3) {
                        return [1, '...', totalStatsPages - 4, totalStatsPages - 3, totalStatsPages - 2, totalStatsPages - 1, totalStatsPages];
                      }
                      return [1, '...', statsPage - 1, statsPage, statsPage + 1, '...', totalStatsPages];
                    };

                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            รายชื่อพนักงานที่เปิดอ่านแล้ว ({totalReceipts} คน)
                          </h4>
                          {totalStatsPages > 1 && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              หน้า {statsPage} จาก {totalStatsPages}
                            </span>
                          )}
                        </div>

                        {totalReceipts === 0 ? (
                          <div className="p-6 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                            ยังไม่มีพนักงานเปิดอ่านประกาศนี้
                          </div>
                        ) : (
                          <>
                            <div className="border border-slate-100 rounded-xl overflow-x-auto shadow-2xs">
                              <table className="table-standard w-full min-w-[500px] text-left text-xs whitespace-nowrap">
                                <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase sticky top-0 border-b border-slate-100">
                                  <tr>
                                    <th className="py-2.5 px-3.5">รหัสพนักงาน</th>
                                    <th className="py-2.5 px-3.5">ชื่อ-นามสกุล</th>
                                    <th className="py-2.5 px-3.5">แผนก</th>
                                    <th className="py-2.5 px-3.5">เวลาที่เปิดอ่าน</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {paginatedReceipts.map((r) => (
                                    <tr key={r.employeeId} className="hover:bg-slate-50 transition-colors">
                                      <td className="py-2.5 px-3.5 font-mono text-slate-600 dark:text-slate-400">{r.employeeCode}</td>
                                      <td className="py-2.5 px-3.5 font-medium text-slate-800 dark:text-slate-200">{r.employeeName}</td>
                                      <td className="py-2.5 px-3.5 text-slate-500 dark:text-slate-400">{r.departmentName || '-'}</td>
                                      <td className="py-2.5 px-3.5 text-slate-400 text-[11px]">{formatDateTime(r.readAt)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Pagination Controls */}
                            {totalStatsPages > 1 && (
                              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 text-xs text-slate-500 dark:text-slate-400">
                                <span className="text-[11px]">
                                  แสดง {(statsPage - 1) * STATS_PAGE_SIZE + 1} - {Math.min(statsPage * STATS_PAGE_SIZE, totalReceipts)} จากทั้งหมด {totalReceipts} คน
                                </span>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setStatsPage((p) => Math.max(1, p - 1))}
                                    disabled={statsPage === 1}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 dark:text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                                    title="หน้าก่อนหน้า"
                                  >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                  </button>

                                  {getStatsPageNumbers().map((p, idx) =>
                                    typeof p === 'number' ? (
                                      <button
                                        key={p}
                                        type="button"
                                        onClick={() => setStatsPage(p)}
                                        className={`min-w-7 h-7 px-1.5 flex items-center justify-center rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                          statsPage === p
                                            ? 'bg-primary text-white shadow-xs'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                                        }`}
                                      >
                                        {p}
                                      </button>
                                    ) : (
                                      <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-400">
                                        {p}
                                      </span>
                                    )
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => setStatsPage((p) => Math.min(totalStatsPages, p + 1))}
                                    disabled={statsPage === totalStatsPages}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 dark:text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                                    title="หน้าถัดไป"
                                  >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <Button
                variant="secondary"
                onClick={() => setStatsModalOpen(false)}
              >
                ปิดหน้าต่าง
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ========================================================================= */}
      {/* CREATE / EDIT FORM MODAL (สำหรับ Admin)                                   */}
      {/* ========================================================================= */}
      {isFormOpen && (
        <ModalShell className="z-50 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200" innerClassName="items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {editingAnnouncement ? 'แก้ไขข่าวสารและประกาศ' : 'สร้างข่าวสารและประกาศใหม่'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="overflow-y-auto p-5 space-y-4 flex-1">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  หัวข้อข่าวประกาศ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ประกาศวันหยุดตามประเพณีประจำปี 2026..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                />
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">หมวดหมู่ข่าว</label>
                  <CustomSelect
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as AnnouncementCategory)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
                  >
                    <option value="GENERAL">ข่าวทั่วไป</option>
                    <option value="POLICY">นโยบายองค์กร</option>
                    <option value="ACTIVITY">กิจกรรมและสัมมนา</option>
                    <option value="WELFARE">สวัสดิการและสิทธิประโยชน์</option>
                    <option value="URGENT">ประกาศด่วนสำคัญ</option>
                  </CustomSelect>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ระดับความสำคัญ</label>
                  <CustomSelect
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as AnnouncementPriority)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
                  >
                    <option value="LOW">ต่ำ</option>
                    <option value="NORMAL">ปกติ</option>
                    <option value="HIGH">สำคัญ</option>
                    <option value="URGENT">ด่วนที่สุด</option>
                  </CustomSelect>
                </div>
              </div>

              {/* Publication Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    วันที่เผยแพร่ประกาศ <span className="text-rose-500">*</span>
                  </label>
                  <ThaiDatePicker
                    value={formPublishedAt}
                    onChange={setFormPublishedAt}
                    placeholder="เลือกวันที่เผยแพร่"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    กำหนดวันที่ประกาศจะแสดงผลบนปฏิทินข่าวสาร
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    วันที่สิ้นสุดการเผยแพร่ (ไม่ระบุก็ได้)
                  </label>
                  <ThaiDatePicker
                    min={formPublishedAt || undefined}
                    value={formExpireAt}
                    onChange={setFormExpireAt}
                    placeholder="เลือกวันที่สิ้นสุด"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    จัดเก็บประกาศอัตโนมัติเมื่อพ้นกำหนด
                  </span>
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  เนื้อหาประกาศอย่างละเอียด <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="ระบุข้อความรายละเอียด คำชี้แจง หรือแนวทางปฏิบัติต่างๆ..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-sans"
                />
              </div>

              {/* Target Selection */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">กลุ่มเป้าหมายผู้รับข่าวสาร</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="targetType"
                      checked={formTargetType === 'ALL'}
                      onChange={() => setFormTargetType('ALL')}
                      className="accent-primary"
                    />
                    <span>พนักงานทุกคนในองค์กร</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="targetType"
                      checked={formTargetType === 'DEPARTMENT'}
                      onChange={() => setFormTargetType('DEPARTMENT')}
                      className="accent-primary"
                    />
                    <span>เฉพาะบางแผนกที่กำหนด</span>
                  </label>
                </div>

                {formTargetType === 'DEPARTMENT' && (
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">เลือกแผนกที่ต้องการส่งประกาศถึง:</span>
                    <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200">
                      {departments.map((dept) => {
                        const isChecked = formSelectedDeptIds.includes(dept.id);
                        return (
                          <label key={dept.id} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormSelectedDeptIds([...formSelectedDeptIds, dept.id]);
                                } else {
                                  setFormSelectedDeptIds(formSelectedDeptIds.filter((id) => id !== dept.id));
                                }
                              }}
                              className="accent-primary"
                            />
                            <span className="truncate">{dept.departmentName}</span>
                          </label>
                        );
                      })}
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
                    <span className="text-[11px] text-slate-400 block">แสดงข่าวนี้อยู่บนสุดของฟีดพนักงานเสมอ</span>
                  </div>
                </label>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">สถานะเมื่อบันทึก</label>
                  <CustomSelect
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as AnnouncementStatus)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
                  >
                    <option value="PUBLISHED">เผยแพร่</option>
                    <option value="DRAFT">บันทึกเป็นฉบับร่าง</option>
                  </CustomSelect>
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
}


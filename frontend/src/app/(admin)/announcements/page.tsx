'use client';

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
  CheckCheck,
  Building,
  Tag
} from 'lucide-react';
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

const CATEGORY_MAP: Record<string, { label: string; color: string }> = {
  GENERAL: { label: 'ข่าวทั่วไป', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  POLICY: { label: 'นโยบายองค์กร', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  ACTIVITY: { label: 'กิจกรรมและสัมมนา', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  WELFARE: { label: 'สวัสดิการและสิทธิประโยชน์', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  URGENT: { label: 'ประกาศด่วนสำคัญ', color: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const PRIORITY_MAP: Record<string, { label: string; color: string; badge: string }> = {
  LOW: { label: 'ทั่วไป', color: 'text-slate-500', badge: 'bg-slate-50 text-slate-600 border-slate-200' },
  NORMAL: { label: 'ปกติ', color: 'text-blue-600', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  HIGH: { label: 'สำคัญ', color: 'text-amber-600', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  URGENT: { label: 'ด่วนที่สุด', color: 'text-red-600', badge: 'bg-red-50 text-red-700 border-red-200' },
};

export default function AnnouncementsPage() {
  const { setBreadcrumb } = useBreadcrumb();
  const { user, hasRole, hasPermission } = useAuth();

  const canManage = Boolean(
    hasRole('ADMIN') ||
    hasRole('HR_MGR') ||
    hasRole('HR_ADMIN') ||
    hasRole('SYS_ADMIN') ||
    hasPermission('ORG_VIEW') ||
    hasPermission('SYS_ADMIN')
  );

  // Reading Modal (Preview สำหรับผู้ดูแล)
  const [readingItem, setReadingItem] = useState<Announcement | null>(null);

  // ─── Admin Management State (สำหรับ HR/ผู้ดูแล) ───
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filter state for Admin
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [pinnedFilter, setPinnedFilter] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);
  const pageSize = 15;

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
    setFormPublishedAt(new Date().toISOString().slice(0, 16));
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
    setFormPublishedAt(a.publishedAt ? new Date(a.publishedAt).toISOString().slice(0, 16) : '');
    setFormExpireAt(a.expireAt ? new Date(a.expireAt).toISOString().slice(0, 16) : '');

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
        publishedAt: formPublishedAt ? new Date(formPublishedAt).toISOString() : null,
        expireAt: formExpireAt ? new Date(formExpireAt).toISOString() : null,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0B2046]/10 text-[#0B2046] flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-[#0B2046]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">จัดการประกาศองค์กร</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              ศูนย์รวมการประชาสัมพันธ์ จัดการข่าวสาร นโยบายบริษัท และติดตามสถิติการเปิดอ่าน
            </p>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0B2046] text-white rounded-xl text-sm font-semibold hover:bg-[#0B2046]/90 transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างประกาศใหม่</span>
            </button>
          </div>
        )}
      </div>

      {/* Admin Management View */}
      <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">ประกาศทั้งหมด</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{totalCount}</div>
              <span className="text-xs text-slate-400 mt-1 block">รายการทั้งหมดในระบบ</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">กำลังเผยแพร่</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-600">{publishedCount}</div>
              <span className="text-xs text-slate-400 mt-1 block">แสดงบนพอร์ทัลพนักงาน</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">ปักหมุดสำคัญ</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Pin className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold text-amber-600">{pinnedCount}</div>
              <span className="text-xs text-slate-400 mt-1 block">อยู่บนสุดของฟีด</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">ฉบับร่าง</span>
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-700">{draftCount}</div>
              <span className="text-xs text-slate-400 mt-1 block">ยังไม่เปิดเผยแพร่</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาหัวข้อประกาศ หรือเนื้อหา..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                />
              </div>

              {/* Status */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none"
                >
                  <option value="">สถานะทั้งหมด</option>
                  <option value="PUBLISHED">เผยแพร่แล้ว</option>
                  <option value="DRAFT">ฉบับร่าง</option>
                  <option value="ARCHIVED">จัดเก็บ/ลบ</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none"
                >
                  <option value="">หมวดหมู่ทั้งหมด</option>
                  <option value="GENERAL">ข่าวทั่วไป</option>
                  <option value="POLICY">นโยบายองค์กร</option>
                  <option value="ACTIVITY">กิจกรรมและสัมมนา</option>
                  <option value="WELFARE">สวัสดิการและสิทธิประโยชน์</option>
                  <option value="URGENT">ประกาศด่วนสำคัญ</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none"
                >
                  <option value="">ความสำคัญทั้งหมด</option>
                  <option value="LOW">ทั่วไป</option>
                  <option value="NORMAL">ปกติ</option>
                  <option value="HIGH">สำคัญ</option>
                  <option value="URGENT">ด่วนที่สุด</option>
                </select>
              </div>
            </div>
          </div>

          {/* Announcements Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
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
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 text-[#0B2046] animate-spin" />
                          <span>กำลังโหลดข้อมูลประกาศ...</span>
                        </div>
                      </td>
                    </tr>
                  ) : announcements.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <Megaphone className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                          <span className="font-semibold text-slate-600">ไม่พบข้อมูลข่าวประกาศ</span>
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
                              onClick={() => handleTogglePin(a)}
                              title={a.isPinned ? 'ยกเลิกปักหมุด' : 'ปักหมุดบนสุด'}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                a.isPinned
                                  ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                  : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              <Pin className={`w-4 h-4 ${a.isPinned ? 'fill-amber-500' : ''}`} />
                            </button>
                          </td>

                          {/* Title */}
                          <td className="py-3 px-4 font-medium text-slate-800 max-w-xs">
                            <div className="flex items-center gap-2">
                              {a.isPinned && (
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenReading(a)}
                                className="font-semibold text-slate-800 hover:text-blue-600 transition-colors text-left cursor-pointer truncate max-w-xs block"
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
                          <td className="py-3 px-4 text-slate-600">
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
                              onClick={() => handleTogglePublish(a)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                                a.status === 'PUBLISHED'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : a.status === 'DRAFT'
                                  ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                              title="คลิกเพื่อสลับสถานะ เผยแพร่ / ฉบับร่าง"
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
                          <td className="py-3 px-4 text-slate-500">
                            {formatDateTime(a.publishedAt || a.createdAt)}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(a)}
                                title="แก้ไขประกาศ"
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(a)}
                                title="ลบ/จัดเก็บประกาศ"
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalCount > pageSize && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>ทั้งหมด {totalCount} รายการ (หน้า {page} จาก {Math.ceil(totalCount / pageSize)})</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={page >= Math.ceil(totalCount / pageSize)}
                    onClick={() => setPage(page + 1)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* ========================================================================= */}
      {/* READING MODAL (หน้าต่างอ่านประกาศฉบับเต็ม สำหรับพนักงาน)                    */}
      {/* ========================================================================= */}
      {readingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0B2046] flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500 block leading-tight">ข่าวสารองค์กร</span>
                  <span className="text-[11px] text-slate-400">รายละเอียดประกาศ</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReadingItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Title */}
              <h2 className="text-xl font-bold text-slate-900 leading-snug">
                {readingItem.title}
              </h2>

              {/* Metadata */}
              <div className="flex items-center gap-4 text-xs text-slate-400 pb-3 border-b border-slate-100">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>เผยแพร่เมื่อ: {formatDateTime(readingItem.publishedAt || readingItem.createdAt)}</span>
                </span>
                {readingItem.createdByEmployeeName && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>โดย: {readingItem.createdByEmployeeName}</span>
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

      {/* ========================================================================= */}
      {/* AUDIENCE AUDIT STATS MODAL (หน้าต่างตรวจสอบสถิติคนอ่าน สำหรับ Admin)        */}
      {/* ========================================================================= */}
      {statsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">สถิติและรายชื่อผู้เปิดอ่าน</h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-sm">{readStats?.title || 'กำลังโหลด...'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {loadingStats ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0B2046]" />
                  <span className="text-xs">กำลังคำนวณสถิติการเปิดอ่าน...</span>
                </div>
              ) : !readStats ? (
                <div className="py-10 text-center text-xs text-slate-400">ไม่พบข้อมูลสถิติ</div>
              ) : (
                <>
                  {/* Stats Progress Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                      <span className="text-[11px] text-slate-500 font-medium block">เป้าหมายทั้งหมด</span>
                      <span className="text-lg font-bold text-slate-800">{readStats.totalTargetEmployees} คน</span>
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
                      className="bg-[#0B2046] h-2 rounded-full transition-all duration-500"
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
                          <h4 className="text-xs font-bold text-slate-700">
                            รายชื่อพนักงานที่เปิดอ่านแล้ว ({totalReceipts} คน)
                          </h4>
                          {totalStatsPages > 1 && (
                            <span className="text-[11px] text-slate-500 font-medium">
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
                            <div className="border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
                              <table className="w-full text-left text-xs whitespace-nowrap">
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
                                      <td className="py-2.5 px-3.5 font-mono text-slate-600">{r.employeeCode}</td>
                                      <td className="py-2.5 px-3.5 font-medium text-slate-800">{r.employeeName}</td>
                                      <td className="py-2.5 px-3.5 text-slate-500">{r.departmentName || '-'}</td>
                                      <td className="py-2.5 px-3.5 text-slate-400 text-[11px]">{formatDateTime(r.readAt)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Pagination Controls */}
                            {totalStatsPages > 1 && (
                              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 text-xs text-slate-500">
                                <span className="text-[11px]">
                                  แสดง {(statsPage - 1) * STATS_PAGE_SIZE + 1} - {Math.min(statsPage * STATS_PAGE_SIZE, totalReceipts)} จากทั้งหมด {totalReceipts} คน
                                </span>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setStatsPage((p) => Math.max(1, p - 1))}
                                    disabled={statsPage === 1}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
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
                                            ? 'bg-[#0B2046] text-white shadow-xs'
                                            : 'text-slate-600 hover:bg-slate-100'
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
                                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
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

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setStatsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CREATE / EDIT FORM MODAL (สำหรับ Admin)                                   */}
      {/* ========================================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0B2046] flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingAnnouncement ? 'แก้ไขข่าวสารและประกาศ' : 'สร้างข่าวสารและประกาศใหม่'}
                  </h3>
                  <p className="text-[11px] text-slate-400">กรอกข้อมูลรายละเอียดและเลือกกลุ่มเป้าหมายผู้รับข่าวสาร</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="overflow-y-auto p-5 space-y-4 flex-1">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หัวข้อข่าวประกาศ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ประกาศวันหยุดตามประเพณีประจำปี 2026..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 font-medium"
                />
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">หมวดหมู่ข่าว</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as AnnouncementCategory)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none"
                  >
                    <option value="GENERAL">ข่าวทั่วไป</option>
                    <option value="POLICY">นโยบายองค์กร</option>
                    <option value="ACTIVITY">กิจกรรมและสัมมนา</option>
                    <option value="WELFARE">สวัสดิการและสิทธิประโยชน์</option>
                    <option value="URGENT">ประกาศด่วนสำคัญ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ระดับความสำคัญ</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as AnnouncementPriority)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none"
                  >
                    <option value="LOW">ต่ำ</option>
                    <option value="NORMAL">ปกติ</option>
                    <option value="HIGH">สำคัญ</option>
                    <option value="URGENT">ด่วนที่สุด</option>
                  </select>
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เนื้อหาประกาศอย่างละเอียด <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="ระบุข้อความรายละเอียด คำชี้แจง หรือแนวทางปฏิบัติต่างๆ..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 font-sans"
                />
              </div>

              {/* Target Selection */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <label className="block text-xs font-bold text-slate-800">กลุ่มเป้าหมายผู้รับข่าวสาร</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="targetType"
                      checked={formTargetType === 'ALL'}
                      onChange={() => setFormTargetType('ALL')}
                      className="accent-[#0B2046]"
                    />
                    <span>พนักงานทุกคนในองค์กร</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="targetType"
                      checked={formTargetType === 'DEPARTMENT'}
                      onChange={() => setFormTargetType('DEPARTMENT')}
                      className="accent-[#0B2046]"
                    />
                    <span>เฉพาะบางแผนกที่กำหนด</span>
                  </label>
                </div>

                {formTargetType === 'DEPARTMENT' && (
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <span className="text-[11px] text-slate-500 font-medium">เลือกแผนกที่ต้องการส่งประกาศถึง:</span>
                    <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-white rounded-lg border border-slate-200">
                      {departments.map((dept) => {
                        const isChecked = formSelectedDeptIds.includes(dept.id);
                        return (
                          <label key={dept.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
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
                              className="accent-[#0B2046]"
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
                <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsPinned}
                    onChange={(e) => setFormIsPinned(e.target.checked)}
                    className="accent-[#0B2046] w-4 h-4"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">ปักหมุดประกาศนี้</span>
                    <span className="text-[11px] text-slate-400 block">แสดงข่าวนี้อยู่บนสุดของฟีดพนักงานเสมอ</span>
                  </div>
                </label>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">สถานะเมื่อบันทึก</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as AnnouncementStatus)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none"
                  >
                    <option value="PUBLISHED">เผยแพร่ทันที (Published)</option>
                    <option value="DRAFT">บันทึกเป็นฉบับร่าง (Draft)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-[#0B2046] hover:bg-[#0B2046]/90 text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingAnnouncement ? 'บันทึกการแก้ไข' : 'สร้างและบันทึกประกาศ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
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

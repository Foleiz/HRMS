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
  ChevronRight
} from 'lucide-react';
import { announcementService } from '@/services/announcementService';
import { organizationService } from '@/services/organizationService';
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

export default function AnnouncementsAdminPage() {
  const { setBreadcrumb } = useBreadcrumb();

  // Data state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filter state
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
  const [formBannerUrl, setFormBannerUrl] = useState('');
  const [formPublishedAt, setFormPublishedAt] = useState('');
  const [formExpireAt, setFormExpireAt] = useState('');
  const [formTargetType, setFormTargetType] = useState<'ALL' | 'DEPARTMENT'>('ALL');
  const [formSelectedDeptIds, setFormSelectedDeptIds] = useState<number[]>([]);

  // Read Stats Modal
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [readStats, setReadStats] = useState<AnnouncementReadStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

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
    setTimeout(() => setToast(null), 3000);
  };

  // Sync breadcrumb
  useEffect(() => {
    setBreadcrumb({ section: 'การจัดการองค์กร', page: 'ข่าวสารและประกาศ' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  // Load departments for targets
  useEffect(() => {
    organizationService.getDepartments().then(setDepartments).catch(console.error);
  }, []);

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const data = await announcementService.getAnnouncements({
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        priority: priorityFilter || undefined,
        isPinned: pinnedFilter,
        page,
        pageSize,
      });
      setAnnouncements(data.items || []);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      console.error('Failed to load announcements', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, categoryFilter, priorityFilter, pinnedFilter, page]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Handle open create form
  const handleOpenCreate = () => {
    setEditingAnnouncement(null);
    setFormTitle('');
    setFormContent('');
    setFormCategory('GENERAL');
    setFormPriority('NORMAL');
    setFormStatus('PUBLISHED');
    setFormIsPinned(false);
    setFormBannerUrl('');
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
    setFormBannerUrl(a.bannerImageUrl || '');
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
        bannerImageUrl: formBannerUrl.trim() || null,
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
      title: 'ยืนยันการลบประกาศ',
      message: `คุณต้องการลบประกาศ "${a.title}" ใช่หรือไม่? ข้อมูลประวัติการเปิดอ่านทั้งหมดจะถูกลบออกด้วย`,
      confirmText: 'ลบประกาศ',
      cancelText: 'ยกเลิก',
      type: 'danger',
      onConfirm: async () => {
        try {
          await announcementService.deleteAnnouncement(a.id);
          showToast('ลบข่าวประกาศเรียบร้อยแล้ว');
          setConfirmConfig({ isOpen: false, title: '', message: '' });
          fetchAnnouncements();
        } catch (err) {
          showToast('ไม่สามารถลบประกาศได้');
        }
      },
    });
  };

  // View Read Stats
  const handleViewStats = async (a: Announcement) => {
    setStatsModalOpen(true);
    setLoadingStats(true);
    setReadStats(null);
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
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B2046]/10 text-[#0B2046] flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-[#0B2046]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">ข่าวสารและประกาศองค์กร</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                ศูนย์กลางจัดการประกาศประชาสัมพันธ์ สื่อสารนโยบาย และติดตามสถิติการเปิดอ่านของพนักงาน
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0B2046] text-white rounded-xl text-sm font-semibold hover:bg-[#0B2046]/90 transition-all shadow-sm hover:shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>สร้างประกาศใหม่</span>
        </button>
      </div>

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
          <span className="text-xs text-slate-400 mt-1 block">ตรึงไว้บนสุดของฟีด</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ฉบับร่าง</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-700">{draftCount}</div>
          <span className="text-xs text-slate-400 mt-1 block">ยังไม่เผยแพร่</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาหัวข้อหรือเนื้อหาประกาศ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0B2046]/20 transition-all outline-hidden"
            />
          </div>

          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-[#0B2046]/20 outline-hidden"
            >
              <option value="">ทุกหมวดหมู่</option>
              <option value="GENERAL">ข่าวทั่วไป</option>
              <option value="POLICY">นโยบายองค์กร</option>
              <option value="ACTIVITY">กิจกรรมและสัมมนา</option>
              <option value="WELFARE">สวัสดิการและสิทธิประโยชน์</option>
              <option value="URGENT">ประกาศด่วนสำคัญ</option>
            </select>
          </div>

          <div className="relative">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-[#0B2046]/20 outline-hidden"
            >
              <option value="">ทุกระดับความสำคัญ</option>
              <option value="NORMAL">ปกติ</option>
              <option value="HIGH">สำคัญ</option>
              <option value="URGENT">ด่วนที่สุด</option>
              <option value="LOW">ทั่วไป</option>
            </select>
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-[#0B2046]/20 outline-hidden"
            >
              <option value="">ทุกสถานะ</option>
              <option value="PUBLISHED">เผยแพร่แล้ว</option>
              <option value="DRAFT">ฉบับร่าง</option>
              <option value="ARCHIVED">จัดเก็บแล้ว</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setPinnedFilter(pinnedFilter === true ? undefined : true)}
            className={`px-3 py-2 rounded-xl text-sm font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
              pinnedFilter === true
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Pin className="w-3.5 h-3.5" />
            <span>เฉพาะปักหมุด</span>
          </button>
        </div>
      </div>

      {/* Announcements Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 text-center text-slate-400">
            <div className="inline-flex items-center gap-2 text-sm font-medium">
              <Loader2 className="w-5 h-5 animate-spin text-[#0B2046]" />
              <span>กำลังโหลดรายการข่าวประกาศ...</span>
            </div>
          </div>
        ) : announcements.length === 0 ? (
          <div className="py-24 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">ไม่พบรายการข่าวประกาศ</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              ยังไม่มีข่าวสารที่ตรงกับเงื่อนไขการค้นหา สามารถกดปุ่ม &quot;สร้างประกาศใหม่&quot; เพื่อเริ่มต้นสื่อสารกับพนักงาน
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    หัวข้อประกาศและหมวดหมู่
                  </th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    กลุ่มเป้าหมาย
                  </th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    ผู้สร้าง / วันที่เผยแพร่
                  </th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    ระดับความสำคัญ
                  </th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    ยอดเปิดอ่าน
                  </th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    สถานะ
                  </th>
                  <th className="text-center px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    การจัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {announcements.map((a) => {
                  const catConf = CATEGORY_MAP[a.category] || CATEGORY_MAP.GENERAL;
                  const priConf = PRIORITY_MAP[a.priority] || PRIORITY_MAP.NORMAL;
                  const isPublished = a.status === 'PUBLISHED';

                  return (
                    <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Title & Category */}
                      <td className="px-5 py-4 min-w-72">
                        <div className="flex items-start gap-3">
                          {a.isPinned && (
                            <div className="mt-0.5 text-amber-500 flex-shrink-0" title="ปักหมุดสำคัญ">
                              <Pin className="w-4 h-4 fill-amber-500" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900 line-clamp-1 hover:text-blue-600 transition-colors">
                              {a.title}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium border ${catConf.color}`}>
                                {catConf.label}
                              </span>
                              {a.bannerImageUrl && (
                                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                  มีภาพแนบ
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Targets */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {a.targets.length === 0 || a.targets.some((t) => t.targetType === 'ALL') ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Users className="w-3 h-3" />
                            <span>ทั้งบริษัท (ทุกคน)</span>
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-48">
                            {a.targets.map((t, idx) => (
                              <span
                                key={idx}
                                className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 font-medium"
                              >
                                {t.targetEntityName || t.targetType}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Creator & Published At */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-xs font-medium text-slate-800">{a.createdByEmployeeName || 'ผู้ดูแลระบบ'}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(a.publishedAt || a.createdAt)}</span>
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium border ${priConf.badge}`}>
                          {priConf.label}
                        </span>
                      </td>

                      {/* Read Stats */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleViewStats(a)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                          title="คลิกเพื่อดูรายชื่อพนักงานที่เปิดอ่านแล้ว"
                        >
                          <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>{a.readCount} คน</span>
                        </button>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        {isPublished ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>เผยแพร่แล้ว</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            <Clock className="w-3 h-3" />
                            <span>ฉบับร่าง</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {/* Toggle Pin */}
                          <button
                            type="button"
                            onClick={() => handleTogglePin(a)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              a.isPinned
                                ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 border-transparent'
                            }`}
                            title={a.isPinned ? 'ยกเลิกการปักหมุด' : 'ปักหมุดขึ้นบนสุด'}
                          >
                            {a.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                          </button>

                          {/* Toggle Publish */}
                          <button
                            type="button"
                            onClick={() => handleTogglePublish(a)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isPublished
                                ? 'text-emerald-600 hover:bg-emerald-50 border-transparent'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 border-transparent'
                            }`}
                            title={isPublished ? 'ยกเลิกการเผยแพร่ (เปลี่ยนเป็นฉบับร่าง)' : 'เผยแพร่ทันที'}
                          >
                            {isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(a)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="แก้ไขประกาศ"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(a)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="ลบประกาศ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Modal 1: Create / Edit Announcement ────────────────── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 transition-all flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0B2046]/10 flex items-center justify-center text-[#0B2046]">
                  <Megaphone className="w-5 h-5 text-[#0B2046]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {editingAnnouncement ? 'แก้ไขข่าวสารและประกาศ' : 'สร้างข่าวสารและประกาศใหม่'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">กรอกข้อมูลและระบุกลุ่มเป้าหมายผู้รับสาร</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-4 flex-1">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  หัวข้อประกาศ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ประกาศวันหยุดประเพณีสงกรานต์ ประจำปี 2569"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0B2046]/20 transition-all outline-hidden font-medium"
                />
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">หมวดหมู่ข่าวสาร</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as AnnouncementCategory)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0B2046]/20 outline-hidden font-medium"
                  >
                    <option value="GENERAL">ข่าวทั่วไป</option>
                    <option value="POLICY">นโยบายองค์กร</option>
                    <option value="ACTIVITY">กิจกรรมและสัมมนา</option>
                    <option value="WELFARE">สวัสดิการและสิทธิประโยชน์</option>
                    <option value="URGENT">ประกาศด่วนสำคัญ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">ระดับความสำคัญ</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as AnnouncementPriority)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0B2046]/20 outline-hidden font-medium"
                  >
                    <option value="NORMAL">ปกติ</option>
                    <option value="HIGH">สำคัญ</option>
                    <option value="URGENT">ด่วนที่สุด</option>
                    <option value="LOW">ทั่วไป</option>
                  </select>
                </div>
              </div>

              {/* Targets */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">กลุ่มเป้าหมายผู้รับสาร</label>
                <div className="flex gap-4 mb-2">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="targetType"
                      checked={formTargetType === 'ALL'}
                      onChange={() => setFormTargetType('ALL')}
                      className="text-[#0B2046] focus:ring-[#0B2046]"
                    />
                    <span>พนักงานทุกคน (ทั้งบริษัท)</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="targetType"
                      checked={formTargetType === 'DEPARTMENT'}
                      onChange={() => setFormTargetType('DEPARTMENT')}
                      className="text-[#0B2046] focus:ring-[#0B2046]"
                    />
                    <span>เฉพาะแผนกที่เลือก</span>
                  </label>
                </div>

                {formTargetType === 'DEPARTMENT' && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-36 overflow-y-auto space-y-1.5 mt-2">
                    <div className="text-[11px] font-semibold text-slate-500 mb-1">เลือกแผนกเป้าหมาย:</div>
                    {departments.map((d) => (
                      <label key={d.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formSelectedDeptIds.includes(d.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormSelectedDeptIds([...formSelectedDeptIds, d.id]);
                            } else {
                              setFormSelectedDeptIds(formSelectedDeptIds.filter((id) => id !== d.id));
                            }
                          }}
                          className="rounded text-[#0B2046] focus:ring-[#0B2046]"
                        />
                        <span>{d.departmentName}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Schedule Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">วันเวลาที่เริ่มเผยแพร่</label>
                  <input
                    type="datetime-local"
                    value={formPublishedAt}
                    onChange={(e) => setFormPublishedAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0B2046]/20 outline-hidden font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    วันเวลาที่สิ้นสุด (ไม่ระบุ = ตลอดไป)
                  </label>
                  <input
                    type="datetime-local"
                    value={formExpireAt}
                    onChange={(e) => setFormExpireAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0B2046]/20 outline-hidden font-medium"
                  />
                </div>
              </div>

              {/* Banner Image URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ลิงก์รูปภาพแบนเนอร์ (ถ้ามี)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/banner.jpg"
                  value={formBannerUrl}
                  onChange={(e) => setFormBannerUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0B2046]/20 outline-hidden"
                />
              </div>

              {/* Pin & Publish Checkbox */}
              <div className="flex flex-wrap gap-6 pt-1">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsPinned}
                    onChange={(e) => setFormIsPinned(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>ปักหมุดข่าวนี้ขึ้นบนสุด (Pinned News)</span>
                </label>

                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formStatus === 'PUBLISHED'}
                    onChange={(e) => setFormStatus(e.target.checked ? 'PUBLISHED' : 'DRAFT')}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>เผยแพร่ทันที (Published)</span>
                </label>
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  เนื้อหาประกาศ <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="พิมพ์รายละเอียดเนื้อหาประกาศ ข้อกำหนด หรือลิงก์ที่เกี่ยวข้องที่นี่..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0B2046]/20 transition-all outline-hidden leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B2046] text-white rounded-xl text-sm font-semibold hover:bg-[#0B2046]/90 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingAnnouncement ? 'บันทึกการแก้ไข' : 'สร้างและเผยแพร่'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal 2: Read Receipts Audit ────────────────────────── */}
      {statsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 transition-all flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">สถิติการเปิดอ่านประกาศ</h3>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                    {readStats?.title || 'กำลังโหลดข้อมูล...'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {loadingStats ? (
                <div className="py-12 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                  <span className="text-xs font-medium">กำลังโหลดรายชื่อผู้เปิดอ่าน...</span>
                </div>
              ) : readStats ? (
                <div className="space-y-5">
                  {/* Progress & Stats Card */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
                      <span>อัตราการเปิดอ่านของผู้รับสาร</span>
                      <span className="text-blue-700 font-bold">{readStats.readPercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, readStats.readPercentage)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2">
                      <span>เปิดอ่านแล้ว: {readStats.readCount} คน</span>
                      <span>กลุ่มเป้าหมายทั้งหมด: {readStats.totalTargetEmployees} คน</span>
                    </div>
                  </div>

                  {/* Receipts List */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2.5">
                      รายชื่อพนักงานที่เปิดอ่านแล้ว ({readStats.receipts.length} คน)
                    </h4>
                    {readStats.receipts.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                        ยังไม่มีพนักงานเปิดอ่านประกาศนี้
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                        {readStats.receipts.map((r, i) => (
                          <div key={i} className="px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-50">
                            <div>
                              <div className="text-xs font-semibold text-slate-800">{r.employeeName}</div>
                              <div className="text-[11px] text-slate-400">
                                {r.employeeCode} • {r.departmentName || 'ไม่ระบุแผนก'}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[11px] text-slate-500 font-medium">{formatDateTime(r.readAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ isOpen: false, title: '', message: '' })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        type={confirmConfig.type}
      />
    </div>
  );
}

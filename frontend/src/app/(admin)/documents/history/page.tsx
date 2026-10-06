'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Download,
  FileText,
  RefreshCw,
  ChevronLeft,
  Pencil,
  MoreVertical,
  Trash2,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { leaveService } from '@/services/leaveService';
import { LeaveRequest } from '@/types/leave';
import { resignationService } from '@/services/resignationService';
import { ResignationRequest } from '@/types/resignation';
import { certificateService } from '@/services/certificateService';
import { CertificateRequest } from '@/types/certificates';
import { generalDocumentService } from '@/services/generalDocumentService';
import { GeneralDocumentRequest } from '@/types/generalDocument';
import { employeeService } from '@/services/employeeService';
import { ConfirmModal, ConfirmType } from '@/components/ui/ConfirmModal';
import { ActionDropdown } from '@/components/ui/ActionDropdown';
import { DocumentsSubNav } from '@/components/documents/DocumentsSubNav';
import { LeavePreviewModal, type LeavePreviewData } from '@/components/documents/LeavePreviewModal';
import { ResignationPreviewModal } from '@/components/documents/ResignationPreviewModal';
import { CertificatePreviewModal } from '@/components/documents/CertificatePreviewModal';
import { GeneralDocumentPreviewModal } from '@/components/documents/GeneralDocumentPreviewModal';
import { CustomSelect } from '@/components/ui/CustomSelect';

// ─── Helpers ─────────────────────────────────────────────────

const formatShortDate = (d?: string | null) => {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return d;
  }
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { label: 'แบบร่าง', color: 'bg-gray-100 text-gray-600 dark:text-slate-400 border-gray-200', icon: <FileText className="w-3.5 h-3.5" /> },
  PENDING: { label: 'รออนุมัติ', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock className="w-3.5 h-3.5" /> },
  APPROVED: { label: 'อนุมัติแล้ว', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  REJECTED: { label: 'ไม่อนุมัติ', color: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="w-3.5 h-3.5" /> },
  CANCELLED: { label: 'ยกเลิกแล้ว', color: 'bg-gray-100 text-gray-500 dark:text-slate-400 border-gray-200', icon: <Ban className="w-3.5 h-3.5" /> },
};

// เอกสารทุกประเภทที่พนักงานยื่นได้จากเมนู "ยื่นเอกสาร" (การลา, ลาออก, หนังสือรับรอง, เอกสารทั่วไป)
interface MyDocumentRow {
  id: string;
  code: string;
  submittedDate?: string | null;
  detailDate: string;
  documentType: string;
  status: string;
  rejectReason?: string | null;
  documents?: { id: number; fileName?: string | null }[];
  /** ลิงก์ไปหน้าฟอร์มต้นทางเพื่อแก้ไขต่อ — มีเฉพาะเอกสารที่ยังเป็นแบบร่าง (DRAFT) */
  editUrl?: string;
  source: 'LEAVE' | 'RESIGNATION' | 'CERTIFICATE' | 'GENERAL';
  rawLeave?: LeaveRequest;
  rawResignation?: ResignationRequest;
  rawCertificate?: CertificateRequest;
  rawGeneral?: GeneralDocumentRequest;
  canCancel?: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200];

export default function DocumentHistoryPage() {
  const { user } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();

  // Navbar จะเดา breadcrumb จาก path prefix "/documents" เป็น "รายการเอกสาร" โดยอัตโนมัติ
  // ต้อง override ให้ถูกต้องเป็น "ประวัติเอกสาร" เฉพาะหน้านี้
  useEffect(() => {
    setBreadcrumb({ section: 'ยื่นเอกสาร', page: 'ประวัติเอกสาร' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [resignationRequests, setResignationRequests] = useState<ResignationRequest[]>([]);
  const [certificateRequests, setCertificateRequests] = useState<CertificateRequest[]>([]);
  const [generalRequests, setGeneralRequests] = useState<GeneralDocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Document Preview Modals State
  const [isLeavePreviewOpen, setIsLeavePreviewOpen] = useState(false);
  const [selectedLeaveForPreview, setSelectedLeaveForPreview] = useState<LeavePreviewData | null>(null);

  const [isResignPreviewOpen, setIsResignPreviewOpen] = useState(false);
  const [selectedResignForPreview, setSelectedResignForPreview] = useState<ResignationRequest | null>(null);

  const [isCertPreviewOpen, setIsCertPreviewOpen] = useState(false);
  const [selectedCertForPreview, setSelectedCertForPreview] = useState<CertificateRequest | null>(null);

  const [isGeneralPreviewOpen, setIsGeneralPreviewOpen] = useState(false);
  const [selectedGeneralForPreview, setSelectedGeneralForPreview] = useState<GeneralDocumentRequest | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

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
  const closeConfirm = () => setConfirmConfig((p) => ({ ...p, isOpen: false }));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [leaveRes, resignRes, certRes, genRes] = await Promise.allSettled([
        leaveService.getMyLeaveRequests({ pageSize: 200 }),
        resignationService.getMyRequests(),
        certificateService.getMyRequests(),
        generalDocumentService.getMyRequests(),
      ]);

      if (leaveRes.status === 'fulfilled') setLeaveRequests(leaveRes.value);
      if (resignRes.status === 'fulfilled') setResignationRequests(resignRes.value);
      if (certRes.status === 'fulfilled') setCertificateRequests(certRes.value);
      if (genRes.status === 'fulfilled') setGeneralRequests(genRes.value);
    } catch (err) {
      console.error('Failed to load document history', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── รวมเอกสารทุกประเภทเป็นรายการเดียว (การลา, ลาออก, หนังสือรับรอง, เอกสารทั่วไป) ───
  const documents: MyDocumentRow[] = useMemo(() => {
    const leaveRows: MyDocumentRow[] = leaveRequests.map((r) => ({
      id: `LEAVE-${r.id}`,
      code: r.requestNo,
      submittedDate: r.submittedAt ?? r.createdAt,
      detailDate:
        r.startDatetime === r.endDatetime
          ? formatShortDate(r.startDatetime)
          : `${formatShortDate(r.startDatetime)} - ${formatShortDate(r.endDatetime)}`,
      documentType: `เอกสารการลา (${r.leaveTypeName || '-'})`,
      status: r.status,
      rejectReason: r.rejectReason,
      documents: r.documents,
      editUrl: r.status === 'DRAFT' ? `/documents/leave?draftId=${r.id}` : undefined,
      source: 'LEAVE',
      rawLeave: r,
      canCancel: r.status === 'PENDING',
    }));

    const resignRows: MyDocumentRow[] = resignationRequests.map((r) => ({
      id: `RESIGN-${r.id}`,
      code: r.requestNo,
      submittedDate: r.submittedAt,
      detailDate: `วันทำงานสุดท้าย: ${formatShortDate(r.requestedLastWorkingDate)}`,
      documentType: 'คำขอลาออก',
      status: r.status,
      rejectReason: r.cancelReason,
      source: 'RESIGNATION',
      rawResignation: r,
      canCancel: r.canCancel,
    }));

    const certRows: MyDocumentRow[] = certificateRequests.map((r) => ({
      id: `CERT-${r.id}`,
      code: `CERT-${r.id}`,
      submittedDate: r.requestedAt,
      detailDate: `วัตถุประสงค์: ${r.purpose || '-'}`,
      documentType: `หนังสือรับรอง (${r.certificateName || '-'})`,
      status: r.status,
      source: 'CERTIFICATE',
      rawCertificate: r,
      canCancel: r.canCancel,
    }));

    const genRows: MyDocumentRow[] = generalRequests.map((r) => ({
      id: r.id,
      code: r.requestNo,
      submittedDate: r.submittedAt,
      detailDate: `วัตถุประสงค์: ${r.purpose}`,
      documentType: `คำร้องเอกสารทั่วไป (${r.documentType})`,
      status: r.status,
      documents: r.fileName ? [{ id: 1, fileName: r.fileName }] : undefined,
      source: 'GENERAL',
      rawGeneral: r,
      canCancel: r.canCancel,
    }));

    const all = [...leaveRows, ...resignRows, ...certRows, ...genRows];
    return all.sort((a, b) => (b.submittedDate || '').localeCompare(a.submittedDate || ''));
  }, [leaveRequests, resignationRequests, certificateRequests, generalRequests]);

  const stats = useMemo(() => {
    const approved = documents.filter((d) => d.status === 'APPROVED').length;
    const pending = documents.filter((d) => d.status === 'PENDING').length;
    const rejected = documents.filter((d) => d.status === 'REJECTED').length;
    return { approved, pending, rejected, total: documents.length };
  }, [documents]);

  const totalPages = Math.max(1, Math.ceil(documents.length / pageSize));
  const pagedDocuments = documents.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  // ─── Actions ────────────────────────────────────────────────

  const handleOpenLeavePreview = (req: LeaveRequest) => {
    const lastApproved = leaveRequests
      .filter((r) => r.employeeId === req.employeeId && r.status === 'APPROVED' && r.id !== req.id)
      .sort((a, b) => (b.startDatetime || b.startDate || '').localeCompare(a.startDatetime || a.startDate || ''))[0];

    const initialData: LeavePreviewData = {
      requestId: req.id,
      employeeId: req.employeeId,
      employeePrefix: req.employeePrefix,
      employeeName: req.employeeName || user?.fullName || 'พนักงาน',
      departmentName: req.departmentName || '',
      positionTitle: req.positionName && req.positionName !== '-' ? req.positionName : '',
      leaveTypeCode: req.leaveTypeCode,
      leaveTypeName: req.leaveTypeName,
      leaveFormCategory: req.formCategory || null,
      reason: req.reason,
      startDate: req.startDate ?? (req.startDatetime ? req.startDatetime.split('T')[0] : null),
      endDate: req.endDate ?? (req.endDatetime ? req.endDatetime.split('T')[0] : null),
      leaveDays: req.leaveDays ?? req.totalDays,
      isHalfDay: req.leaveDays === 0.5 || (req.leaveHours > 0 && req.leaveHours <= 4),
      contactDuringLeave: req.contactDuringLeave,
      submissionDate: req.submittedAt ? req.submittedAt.split('T')[0] : (req.createdAt ? req.createdAt.split('T')[0] : null),
      lastLeave: lastApproved
        ? {
            leaveTypeCode: lastApproved.leaveTypeCode,
            leaveTypeName: lastApproved.leaveTypeName,
            startDate: lastApproved.startDate ?? (lastApproved.startDatetime ? lastApproved.startDatetime.split('T')[0] : null),
            endDate: lastApproved.endDate ?? (lastApproved.endDatetime ? lastApproved.endDatetime.split('T')[0] : null),
            leaveDays: lastApproved.leaveDays ?? lastApproved.totalDays,
          }
        : null,
      timeline: null,
      canApproveCurrentStep: false,
      documents: req.documents,
    };

    setSelectedLeaveForPreview(initialData);
    setIsLeavePreviewOpen(true);

    // ดึง timeline และตำแหน่งงานเพิ่มเติมในเบื้องหลัง เพื่อแสดงลายเซ็นและสายอนุมัติอย่างสมบูรณ์
    Promise.all([
      leaveService.getApprovalTimeline(req.id).catch(() => null),
      req.employeeId ? employeeService.getById(req.employeeId).catch(() => null) : Promise.resolve(null),
    ]).then(([tl, emp]) => {
      setSelectedLeaveForPreview((prev) => {
        if (!prev || prev.requestId !== req.id) return prev;
        return {
          ...prev,
          timeline: tl || prev.timeline,
          positionTitle: emp?.positionName || prev.positionTitle,
          departmentName: emp?.departmentName || prev.departmentName,
          employeePrefix: emp?.prefix || prev.employeePrefix,
        };
      });
    });
  };

  const handleOpenDocumentPreview = (doc: MyDocumentRow) => {
    if (doc.source === 'LEAVE' && doc.rawLeave) {
      handleOpenLeavePreview(doc.rawLeave);
    } else if (doc.source === 'RESIGNATION' && doc.rawResignation) {
      setSelectedResignForPreview(doc.rawResignation);
      setIsResignPreviewOpen(true);
    } else if (doc.source === 'CERTIFICATE' && doc.rawCertificate) {
      setSelectedCertForPreview(doc.rawCertificate);
      setIsCertPreviewOpen(true);
    } else if (doc.source === 'GENERAL' && doc.rawGeneral) {
      setSelectedGeneralForPreview(doc.rawGeneral);
      setIsGeneralPreviewOpen(true);
    }
  };

  const handleCancel = (doc: MyDocumentRow) => {
    setConfirmConfig({
      isOpen: true,
      singleButton: false,
      isLoading: false,
      title: doc.source === 'LEAVE' ? 'ถอนคำขอกลับไปเป็นแบบร่าง' : 'ยกเลิกคำขอ',
      message: `คุณต้องการยกเลิกคำขอ "${doc.documentType}" รหัส ${doc.code} ใช่หรือไม่?`,
      confirmText: 'ยืนยันยกเลิก',
      cancelText: 'ปิด',
      type: 'warning',
      onConfirm: async () => {
        try {
          if (doc.source === 'LEAVE' && doc.rawLeave) {
            const updated = await leaveService.cancelMyLeaveRequest(doc.rawLeave.id);
            closeConfirm();
            showToast(
              updated?.status === 'DRAFT'
                ? 'ถอนคำขอกลับไปเป็นแบบร่างสำเร็จ สามารถแก้ไขและยื่นใหม่ได้'
                : 'ยกเลิกคำขอสำเร็จ'
            );
          } else if (doc.source === 'RESIGNATION' && doc.rawResignation) {
            await resignationService.cancelRequest(doc.rawResignation.id);
            closeConfirm();
            showToast('ยกเลิกคำขอลาออกสำเร็จ');
          } else if (doc.source === 'CERTIFICATE' && doc.rawCertificate) {
            await certificateService.cancelRequest(doc.rawCertificate.id);
            closeConfirm();
            showToast('ยกเลิกคำขอหนังสือรับรองสำเร็จ');
          } else if (doc.source === 'GENERAL' && doc.rawGeneral) {
            await generalDocumentService.cancelRequest(doc.rawGeneral.id);
            closeConfirm();
            showToast('ยกเลิกคำร้องเอกสารทั่วไปสำเร็จ');
          }
          fetchData();
        } catch (err: any) {
          closeConfirm();
          showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาด');
        }
      },
    });
  };

  const handleDelete = (doc: MyDocumentRow) => {
    // ลบได้เฉพาะแบบร่าง (DRAFT) เท่านั้น — เป็นการลบถาวร ไม่สามารถย้อนกลับได้
    setConfirmConfig({
      isOpen: true,
      singleButton: false,
      isLoading: false,
      title: 'ลบแบบร่างเอกสาร',
      message: `ลบ "${doc.documentType}" รหัส ${doc.code} ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`,
      confirmText: 'ลบ',
      cancelText: 'ยกเลิก',
      type: 'danger',
      onConfirm: async () => {
        try {
          if (doc.source === 'LEAVE' && doc.rawLeave) {
            await leaveService.deleteMyLeaveRequest(doc.rawLeave.id);
          }
          closeConfirm();
          showToast('ลบแบบร่างสำเร็จ');
          fetchData();
        } catch (err: any) {
          closeConfirm();
          showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาด');
        }
      },
    });
  };

  const handleDownloadDoc = async (doc: MyDocumentRow, docId: number, fileName: string) => {
    try {
      const blob =
        doc.source === 'LEAVE' && doc.rawLeave
          ? await leaveService.downloadLeaveDocument(doc.rawLeave.id, docId)
          : doc.source === 'GENERAL' && doc.rawGeneral
            ? await generalDocumentService.downloadAttachment(doc.rawGeneral.id)
            : null;
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      showToast('ไม่สามารถดาวน์โหลดเอกสารได้');
    }
  };

  const handleExport = () => {
    const header = ['รหัสเอกสาร', 'วันที่ยื่นเอกสาร', 'วันที่ลา', 'ประเภทเอกสาร', 'สถานะเอกสาร'];
    const rows = documents.map((d) => [
      d.code,
      formatShortDate(d.submittedDate),
      d.detailDate,
      d.documentType,
      STATUS_CONFIG[d.status]?.label ?? d.status,
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ประวัติเอกสาร-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Render ──────────────────────────────────────────────────

  const statCards = [
    { label: 'เอกสารที่อนุมัติแล้ว', value: stats.approved, icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'เอกสารรอการอนุมัติ', value: stats.pending, icon: <Clock className="w-5 h-5" />, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'เอกสารที่ไม่อนุมัติ', value: stats.rejected, icon: <XCircle className="w-5 h-5" />, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'เอกสารทั้งหมด', value: stats.total, icon: <FileText className="w-5 h-5" />, color: 'text-gray-600 dark:text-slate-400', bg: 'bg-gray-100' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* เมนูย่อยในตัว — สลับไปมาระหว่าง "รายการเอกสาร" กับ "ประวัติเอกสาร" เหมือนเมนู "พนักงาน" */}
      <DocumentsSubNav />

      {/* Page Header */}
      <div>
        <p className="text-sm text-gray-500 dark:text-slate-400">รวมเอกสารทุกประเภทที่คุณเคยยื่นและสถานะล่าสุด</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl ${s.bg} ${s.color} flex items-center justify-center shrink-0`}>{s.icon}</div>
            <div className="min-w-0">
              <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">{s.value}</div>
              <div className="text-xs text-gray-400 truncate">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-400 rounded-xl text-xs font-medium transition-all"
        >
          <Download className="w-3.5 h-3.5" /> ส่งออก
        </button>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-400 rounded-xl text-xs font-medium transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> รีเฟรช
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 text-white rounded-xl text-sm shadow-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toast}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400">
            <div className="inline-flex items-center gap-2 text-sm">
              <Loader2 className="w-5 h-5 animate-spin" />
              กำลังโหลดประวัติเอกสาร...
            </div>
          </div>
        ) : documents.length === 0 ? (
          <div className="py-20 text-center">
            <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">คุณยังไม่เคยยื่นเอกสาร</p>
          </div>
        ) : (
          <>
            {/* Desktop View: Full Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[750px] text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60 whitespace-nowrap">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">รหัสเอกสาร</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">วันที่ยื่นเอกสาร</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">วันที่ลา</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">ประเภทเอกสาร</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">สถานะเอกสาร</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pagedDocuments.map((doc) => {
                    const statusConf = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG['PENDING'];
                    return (
                      <tr key={doc.id} className="hover:bg-gray-50 dark:bg-slate-800/50 transition-colors">
                        <td className="px-5 py-4 font-medium whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenDocumentPreview(doc)}
                            className="text-[#0B2046] hover:text-blue-600 hover:underline font-semibold transition-colors cursor-pointer text-left"
                            title="คลิกเพื่อดูตัวอย่างเอกสาร"
                          >
                            {doc.code}
                          </button>
                        </td>
                        <td className="px-4 py-4 text-gray-600 dark:text-slate-400 whitespace-nowrap">{formatShortDate(doc.submittedDate)}</td>
                        <td className="px-4 py-4 text-gray-600 dark:text-slate-400 whitespace-nowrap">{doc.detailDate}</td>
                        <td className="px-4 py-4 text-gray-600 dark:text-slate-400">{doc.documentType}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConf.color}`}>
                            {statusConf.icon}
                            {statusConf.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {(() => {
                            const hasAttachments = !!doc.documents && doc.documents.length > 0;
                            const hasEdit = doc.status === 'DRAFT' && !!doc.editUrl;
                            const hasCancel = doc.status === 'PENDING';
                            const hasDelete = doc.status === 'DRAFT';
                            return (
                              <ActionDropdown
                                menuClassName="w-56"
                                triggerClassName="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 dark:text-slate-300 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                                items={[
                                  {
                                    label: 'ดูตัวอย่างเอกสาร',
                                    icon: <Eye className="w-3.5 h-3.5 text-blue-600 shrink-0" />,
                                    onClick: () => handleOpenDocumentPreview(doc),
                                  },
                                  ...(hasAttachments || hasEdit || hasCancel || hasDelete
                                    ? [{ divider: true, label: '' }]
                                    : []),
                                  ...(hasAttachments
                                    ? doc.documents!.map((d) => ({
                                        label: d.fileName ?? 'เอกสารแนบ',
                                        icon: <Download className="w-3.5 h-3.5 text-blue-500 shrink-0" />,
                                        onClick: () => handleDownloadDoc(doc, d.id, d.fileName ?? 'attachment'),
                                      }))
                                    : []),
                                  ...(hasAttachments && (hasEdit || hasCancel || hasDelete) ? [{ divider: true, label: '' }] : []),
                                  ...(hasEdit
                                    ? [
                                        {
                                          label: 'แก้ไขต่อ',
                                          icon: <Pencil className="w-3.5 h-3.5 text-blue-600 shrink-0" />,
                                          href: doc.editUrl!,
                                          className: 'text-blue-600 hover:bg-blue-50',
                                        },
                                      ]
                                    : []),
                                  ...(hasCancel
                                    ? [
                                        {
                                          label: 'ถอนคำขอ',
                                          icon: <Ban className="w-3.5 h-3.5 text-red-600 shrink-0" />,
                                          danger: true,
                                          onClick: () => handleCancel(doc),
                                        },
                                      ]
                                    : []),
                                  ...(hasDelete
                                    ? [
                                        {
                                          label: 'ลบ',
                                          icon: <Trash2 className="w-3.5 h-3.5 text-red-600 shrink-0" />,
                                          danger: true,
                                          onClick: () => handleDelete(doc),
                                        },
                                      ]
                                    : []),
                                ]}
                              />
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Stacked Cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {pagedDocuments.map((doc) => {
                const statusConf = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG['PENDING'];
                const hasAttachments = !!doc.documents && doc.documents.length > 0;
                const hasEdit = doc.status === 'DRAFT' && !!doc.editUrl;
                const hasCancel = doc.status === 'PENDING';
                const hasDelete = doc.status === 'DRAFT';

                return (
                  <div key={doc.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <button
                          type="button"
                          onClick={() => handleOpenDocumentPreview(doc)}
                          className="text-[#0B2046] hover:text-blue-600 font-bold text-sm text-left flex items-center gap-1.5"
                        >
                          <span>{doc.code}</span>
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                        <span className="text-2xs text-slate-400 block mt-0.5">
                          ยื่นเมื่อ: {formatShortDate(doc.submittedDate)}
                        </span>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConf.color}`}>
                        {statusConf.icon}
                        {statusConf.label}
                      </span>
                    </div>

                    <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">ประเภท:</span>
                        <span className="font-semibold text-slate-800">{doc.documentType}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">ช่วงวันที่:</span>
                        <span className="font-medium text-slate-700">{doc.detailDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenDocumentPreview(doc)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium active:scale-95 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        ดูตัวอย่างเอกสาร
                      </button>

                      <ActionDropdown
                        menuClassName="w-56"
                        triggerClassName="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all cursor-pointer"
                        items={[
                          ...(hasAttachments || hasEdit || hasCancel || hasDelete
                            ? []
                            : []),
                          ...(hasAttachments
                            ? doc.documents!.map((d) => ({
                                label: d.fileName ?? 'เอกสารแนบ',
                                icon: <Download className="w-3.5 h-3.5 text-blue-500 shrink-0" />,
                                onClick: () => handleDownloadDoc(doc, d.id, d.fileName ?? 'attachment'),
                              }))
                            : []),
                          ...(hasAttachments && (hasEdit || hasCancel || hasDelete) ? [{ divider: true, label: '' }] : []),
                          ...(hasEdit
                            ? [
                                {
                                  label: 'แก้ไขต่อ',
                                  icon: <Pencil className="w-3.5 h-3.5 text-blue-600 shrink-0" />,
                                  href: doc.editUrl!,
                                  className: 'text-blue-600 hover:bg-blue-50',
                                },
                              ]
                            : []),
                          ...(hasCancel
                            ? [
                                {
                                  label: 'ถอนคำขอ',
                                  icon: <Ban className="w-3.5 h-3.5 text-red-600 shrink-0" />,
                                  danger: true,
                                  onClick: () => handleCancel(doc),
                                },
                              ]
                            : []),
                          ...(hasDelete
                            ? [
                                {
                                  label: 'ลบ',
                                  icon: <Trash2 className="w-3.5 h-3.5 text-red-600 shrink-0" />,
                                  danger: true,
                                  onClick: () => handleDelete(doc),
                                },
                              ]
                            : []),
                        ]}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                แสดง
                <CustomSelect
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </CustomSelect>
                เอกสาร (ทั้งหมด {documents.length} รายการ)
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> ก่อนหน้า
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                      p === page ? 'bg-[#0B2046] text-white' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  ถัดไป <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ─── Modal ดูตัวอย่างเอกสารใบลาทางการ (Leave Document Preview) ─── */}
      <LeavePreviewModal
        isOpen={isLeavePreviewOpen}
        onClose={() => {
          setIsLeavePreviewOpen(false);
          setSelectedLeaveForPreview(null);
        }}
        data={selectedLeaveForPreview}
      />

      {/* ─── Modal ดูตัวอย่างเอกสารหนังสือรับรองทางการ (Certificate Document Preview) ─── */}
      <CertificatePreviewModal
        isOpen={isCertPreviewOpen}
        onClose={() => {
          setIsCertPreviewOpen(false);
          setSelectedCertForPreview(null);
        }}
        requestId={selectedCertForPreview?.id}
      />

      {/* ─── Modal ดูตัวอย่างหนังสือขอลาออก (Resignation Preview) ─── */}
      <ResignationPreviewModal
        isOpen={isResignPreviewOpen}
        onClose={() => {
          setIsResignPreviewOpen(false);
          setSelectedResignForPreview(null);
        }}
        data={selectedResignForPreview ? {
          employeeName: selectedResignForPreview.employeeName || user?.fullName || '',
          employeeId: selectedResignForPreview.employeeId,
          timeline: selectedResignForPreview.timeline,
          canApproveCurrentStep: false,
          employeeCode: selectedResignForPreview.employeeCode,
          positionTitle: selectedResignForPreview.positionName,
          departmentName: selectedResignForPreview.departmentName,
          submissionDate: selectedResignForPreview.submittedAt ? selectedResignForPreview.submittedAt.split('T')[0] : '',
          requestedLastWorkingDate: selectedResignForPreview.requestedLastWorkingDate,
          reasonCategoryLabel: selectedResignForPreview.reasonCategory || 'ลาออกจากงาน',
          reasonDetail: selectedResignForPreview.reasonDetail || selectedResignForPreview.reason || '-',
          handoverNotes: selectedResignForPreview.handoverNotes,
          contactAfterResignation: selectedResignForPreview.contactAfterResignation,
          noticeDays: selectedResignForPreview.noticePeriodDays,
        } : null}
      />

      {/* ─── Modal ดูตัวอย่างคำร้องเอกสารทั่วไป (General Document Preview) ─── */}
      <GeneralDocumentPreviewModal
        isOpen={isGeneralPreviewOpen}
        onClose={() => {
          setIsGeneralPreviewOpen(false);
          setSelectedGeneralForPreview(null);
        }}
        data={selectedGeneralForPreview ? {
          employeeName: selectedGeneralForPreview.employeeName || user?.fullName || '',
          employeeCode: selectedGeneralForPreview.employeeCode || '',
          positionTitle: selectedGeneralForPreview.positionName || '',
          departmentName: selectedGeneralForPreview.departmentName || '',
          issueDate: selectedGeneralForPreview.issueDate,
          expiryDate: selectedGeneralForPreview.expiryDate,
          documentType: selectedGeneralForPreview.documentType,
          purpose: selectedGeneralForPreview.purpose,
          notes: selectedGeneralForPreview.notes,
          fileName: selectedGeneralForPreview.fileName,
        } : null}
      />

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText ?? 'ยืนยัน'}
        cancelText={confirmConfig.cancelText ?? 'ยกเลิก'}
        type={confirmConfig.type}
        singleButton={confirmConfig.singleButton ?? false}
        isLoading={confirmConfig.isLoading ?? false}
        onConfirm={confirmConfig.onConfirm ?? (() => {})}
        onClose={closeConfirm}
      />
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Search,
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
  Trash2,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import { leaveService } from '@/services/leaveService';
import { LeaveRequest, ApprovalTimeline } from '@/types/leave';
import { resignationService } from '@/services/resignationService';
import { ResignationRequest } from '@/types/resignation';
import { certificateService } from '@/services/certificateService';
import { CertificateRequest } from '@/types/certificates';
import { generalDocumentService } from '@/services/generalDocumentService';
import { GeneralDocumentRequest } from '@/types/generalDocument';
import { employeeService } from '@/services/employeeService';
import { ConfirmModal, ConfirmType } from '@/components/ui/ConfirmModal';
import { ActionDropdown, ActionDropdownItem } from '@/components/ui/ActionDropdown';
import { DocumentsSubNav } from '@/components/documents/DocumentsSubNav';
import { LeavePreviewModal, type LeavePreviewData } from '@/components/documents/LeavePreviewModal';
import { ResignationPreviewModal } from '@/components/documents/ResignationPreviewModal';
import { CertificatePreviewModal } from '@/components/documents/CertificatePreviewModal';
import { GeneralDocumentPreviewModal } from '@/components/documents/GeneralDocumentPreviewModal';
import { ApprovalTimelineModal, GenericApprovalRequestInfo } from '@/components/approvals/ApprovalTimelineModal';
import { Button, TablePagination } from '@/components/ui';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { SortableTh, useTableSort, compareSortValues } from '@/components/ui/SortableTh';

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
  /** เวลาที่มีความเคลื่อนไหวล่าสุด (ยื่น/อนุมัติ/ไม่อนุมัติ/ยกเลิก/แก้ไข) — ใช้เรียงรายการล่าสุดไว้บนสุด */
  lastActivityAt?: string | null;
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

type DocSortField = 'code' | 'submittedDate' | 'documentType' | 'status';

const SOURCE_FILTER_OPTIONS = [
  { value: 'ALL', label: 'ทุกประเภทเอกสาร' },
  { value: 'LEAVE', label: 'เอกสารการลา' },
  { value: 'RESIGNATION', label: 'คำขอลาออก' },
  { value: 'CERTIFICATE', label: 'หนังสือรับรอง' },
  { value: 'GENERAL', label: 'คำร้องเอกสารทั่วไป' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'ทุกสถานะ' },
  { value: 'DRAFT', label: 'แบบร่าง' },
  { value: 'PENDING', label: 'รออนุมัติ' },
  { value: 'APPROVED', label: 'อนุมัติแล้ว' },
  { value: 'REJECTED', label: 'ไม่อนุมัติ' },
  { value: 'CANCELLED', label: 'ยกเลิกแล้ว' },
];

const STATUS_SORT_ORDER: Record<string, number> = { DRAFT: 0, PENDING: 1, APPROVED: 2, ISSUED: 2, REJECTED: 3, CANCELLED: 4 };

/** เวลาล่าสุดจากหลายฟิลด์ (ค่าที่ไม่ใช่วันที่จะถูกข้าม) */
const latestOf = (...values: (string | null | undefined)[]): string | null => {
  let best: string | null = null;
  let bestTs = -Infinity;
  for (const v of values) {
    if (!v) continue;
    const ts = new Date(v).getTime();
    if (!Number.isNaN(ts) && ts > bestTs) {
      bestTs = ts;
      best = v;
    }
  }
  return best;
};

const toTs = (v?: string | null) => {
  if (!v) return 0;
  const ts = new Date(v).getTime();
  return Number.isNaN(ts) ? 0 : ts;
};

/** สถานะที่ใช้กรอง (หนังสือรับรองที่ออกแล้ว = อนุมัติแล้ว) */
const normalizeStatus = (s: string) => (s === 'ISSUED' ? 'APPROVED' : s);

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

  // Approval Timeline State
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [timelineRequestInfo, setTimelineRequestInfo] = useState<GenericApprovalRequestInfo | null>(null);
  const [selectedLeaveForTimeline, setSelectedLeaveForTimeline] = useState<LeaveRequest | null>(null);

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
      lastActivityAt: latestOf(r.updatedAt, r.approvedAt, r.cancelledAt, r.submittedAt, r.createdAt),
    }));

    const resignRows: MyDocumentRow[] = resignationRequests.map((r) => ({
      id: `RESIGN-${r.id}`,
      code: r.requestNo,
      submittedDate: r.submittedAt,
      detailDate: `วันทำงานสุดท้าย: ${formatShortDate(r.requestedLastWorkingDate)}`,
      documentType: 'คำขอลาออก',
      status: r.status,
      rejectReason: r.status === 'REJECTED' ? (r.rejectReason || r.rejectionReason || r.cancelReason) : r.cancelReason,
      source: 'RESIGNATION',
      rawResignation: r,
      canCancel: r.canCancel,
      lastActivityAt: latestOf(r.approvedAt, r.rejectedAt, r.cancelledAt, r.submittedAt),
    }));

    const certNameMap: Record<string, string> = {
      CERT_SALARY: 'หนังสือรับรองเงินเดือน',
      CERT_WORK: 'หนังสือรับรองการทำงาน',
      CERT_EMPLOYMENT: 'หนังสือรับรองการทำงาน',
    };
    const certRows: MyDocumentRow[] = certificateRequests.map((r) => {
      const docName =
        certNameMap[r.certificateCode] ||
        certNameMap[r.certificateName] ||
        r.certificateName ||
        '-';
      return {
        id: `CERT-${r.id}`,
        code: `CERT-${String(r.id).padStart(4, '0')}`,
        submittedDate: r.requestedAt,
        detailDate: r.purpose ? `วัตถุประสงค์: ${r.purpose}` : docName,
        documentType: `หนังสือรับรอง (${docName})`,
        status: r.status,
        source: 'CERTIFICATE',
        rawCertificate: r,
        canCancel: r.canCancel,
        lastActivityAt: latestOf(r.issuedAt, r.approvedAt, r.requestedAt),
      };
    });

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
      lastActivityAt: latestOf(r.approvedAt, r.submittedAt),
    }));

    const all = [...leaveRows, ...resignRows, ...certRows, ...genRows];
    // ค่าเริ่มต้น: รายการที่มีความเคลื่อนไหวล่าสุดอยู่บนสุดเสมอ (เทียบเป็นเวลาจริง ไม่ใช่ข้อความ)
    return all.sort((a, b) => toTs(b.lastActivityAt ?? b.submittedDate) - toTs(a.lastActivityAt ?? a.submittedDate));
  }, [leaveRequests, resignationRequests, certificateRequests, generalRequests]);

  const stats = useMemo(() => {
    const approved = documents.filter((d) => d.status === 'APPROVED').length;
    const pending = documents.filter((d) => d.status === 'PENDING').length;
    const rejected = documents.filter((d) => d.status === 'REJECTED').length;
    return { approved, pending, rejected, total: documents.length };
  }, [documents]);

  // ─── ตัวกรอง (dropdown) + เรียงตามหัวคอลัมน์ ───
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const { sortField, sortDirection, handleSort } = useTableSort<DocSortField>();

  // ปี พ.ศ. ที่มีเอกสาร (จากวันที่ยื่น) — ใหม่สุดก่อน
  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    documents.forEach((d) => {
      const ts = toTs(d.submittedDate ?? d.lastActivityAt);
      if (ts) years.add(new Date(ts).getFullYear() + 543);
    });
    return [
      { value: 'ALL', label: 'ทุกปี' },
      ...Array.from(years)
        .sort((a, b) => b - a)
        .map((y) => ({ value: String(y), label: `ปี ${y}` })),
    ];
  }, [documents]);

  const visibleDocuments = useMemo(() => {
    const list = documents.filter((d) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = d.code?.toLowerCase().includes(q);
        const matchType = d.documentType?.toLowerCase().includes(q);
        const matchDetail = d.detailDate?.toLowerCase().includes(q);
        if (!matchCode && !matchType && !matchDetail) return false;
      }
      if (sourceFilter !== 'ALL' && d.source !== sourceFilter) return false;
      if (statusFilter !== 'ALL' && normalizeStatus(d.status) !== statusFilter) return false;
      if (yearFilter !== 'ALL') {
        const ts = toTs(d.submittedDate ?? d.lastActivityAt);
        if (!ts || String(new Date(ts).getFullYear() + 543) !== yearFilter) return false;
      }
      return true;
    });
    if (!sortField) return list;
    return [...list].sort((a, b) => {
      switch (sortField) {
        case 'code':
          return compareSortValues(a.code, b.code, sortDirection);
        case 'submittedDate':
          return compareSortValues(toTs(a.submittedDate) || null, toTs(b.submittedDate) || null, sortDirection);
        case 'documentType':
          return compareSortValues(a.documentType, b.documentType, sortDirection);
        case 'status':
          return compareSortValues(STATUS_SORT_ORDER[a.status] ?? 9, STATUS_SORT_ORDER[b.status] ?? 9, sortDirection);
        default:
          return 0;
      }
    });
  }, [documents, searchQuery, sourceFilter, statusFilter, yearFilter, sortField, sortDirection]);

  const hasActiveFilter = !!searchQuery.trim() || sourceFilter !== 'ALL' || statusFilter !== 'ALL' || yearFilter !== 'ALL';

  useEffect(() => {
    setPage(1);
  }, [searchQuery, sourceFilter, statusFilter, yearFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleDocuments.length / pageSize));
  const pagedDocuments = visibleDocuments.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  // ─── Actions ────────────────────────────────────────────────

  const handleOpenLeavePreview = (req: LeaveRequest) => {
    const reqStart = req.startDate ?? req.startDatetime ?? '';
    const lastApproved = leaveRequests
      .filter((r) => r.employeeId === req.employeeId && r.status === 'APPROVED' && r.id !== req.id && (r.startDate ?? r.startDatetime ?? '') < reqStart)
      .sort((a, b) => (b.startDate ?? b.startDatetime ?? '').localeCompare(a.startDate ?? a.startDatetime ?? ''))[0];

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
      startDate: req.startDate ?? req.startDatetime ?? null,
      endDate: req.endDate ?? req.endDatetime ?? null,
      leaveDays: req.leaveDays ?? req.totalDays,
      isHalfDay: req.leaveDays === 0.5 || (req.leaveHours > 0 && req.leaveHours <= 4),
      contactDuringLeave: req.contactDuringLeave,
      submissionDate: req.submittedAt ?? req.createdAt ?? null,
      lastLeave: lastApproved
        ? {
            leaveTypeCode: lastApproved.leaveTypeCode,
            leaveTypeName: lastApproved.leaveTypeName,
            startDate: lastApproved.startDate ?? lastApproved.startDatetime ?? null,
            endDate: lastApproved.endDate ?? lastApproved.endDatetime ?? null,
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
          // ตำแหน่ง/แผนกใช้ค่าจากคำขอ (ณ วันที่ยื่น) — ไม่แทนด้วยตำแหน่งปัจจุบัน
          positionTitle: prev.positionTitle || emp?.positionName || '',
          departmentName: prev.departmentName || emp?.departmentName || '',
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

  // เปิดเอกสารอัตโนมัติจากลิงก์ ?open=<เลขที่เอกสาร> (เช่น กดเลขที่เอกสารจากแดชบอร์ด)
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (loading || autoOpenedRef.current || typeof window === 'undefined') return;
    const code = new URLSearchParams(window.location.search).get('open');
    if (!code) return;
    autoOpenedRef.current = true;
    const target = documents.find((d) => d.code === code);
    if (target) handleOpenDocumentPreview(target);
    window.history.replaceState(null, '', window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, documents]);

  const handleOpenTimeline = (doc: MyDocumentRow) => {
    if (doc.source === 'LEAVE' && doc.rawLeave) {
      setSelectedLeaveForTimeline(doc.rawLeave);
      setTimelineRequestInfo(null);
      setIsTimelineOpen(true);
    } else if (doc.source === 'CERTIFICATE' && doc.rawCertificate) {
      setSelectedLeaveForTimeline(null);
      setTimelineRequestInfo({
        id: doc.rawCertificate.id,
        requestNo: doc.code,
        employeeName: user?.fullName || 'พนักงาน',
        subtitle: `ประเภท: ${doc.documentType}`,
        fetchTimeline: async () => {
          if (doc.rawCertificate?.approvalInstanceId) {
            const res = await apiClient.get<ApiResponse<ApprovalTimeline>>(
              `/approval-flows/instances/${doc.rawCertificate.approvalInstanceId}/timeline`
            );
            return res.data.data;
          }
          throw new Error('ไม่พบผังการอนุมัติสำหรับเอกสารนี้');
        },
      });
      setIsTimelineOpen(true);
    } else if (doc.source === 'RESIGNATION' && doc.rawResignation) {
      setSelectedLeaveForTimeline(null);
      setTimelineRequestInfo({
        id: doc.rawResignation.id,
        requestNo: doc.code,
        employeeName: user?.fullName || 'พนักงาน',
        subtitle: 'คำขอลาออกจากงาน',
        fetchTimeline: async (id: number) => {
          const detail = await resignationService.getRequestById(id);
          if (detail.timeline) return detail.timeline as any;
          throw new Error('ไม่พบผังการอนุมัติ');
        },
      });
      setIsTimelineOpen(true);
    } else if (doc.source === 'GENERAL' && doc.rawGeneral) {
      setSelectedLeaveForTimeline(null);
      setTimelineRequestInfo({
        id: Number(doc.id) || 0,
        requestNo: doc.code,
        employeeName: user?.fullName || 'พนักงาน',
        subtitle: `คำร้องเอกสารทั่วไป (${doc.rawGeneral.documentType})`,
        fetchTimeline: async () => {
          if (doc.rawGeneral?.approvalInstanceId) {
            const res = await apiClient.get<ApiResponse<ApprovalTimeline>>(
              `/approval-flows/instances/${doc.rawGeneral.approvalInstanceId}/timeline`
            );
            return res.data.data;
          }
          throw new Error('ไม่พบผังการอนุมัติสำหรับเอกสารนี้');
        },
      });
      setIsTimelineOpen(true);
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
    const header = ['รหัสเอกสาร', 'วันที่ยื่นเอกสาร', 'วันที่ลา / รายละเอียด', 'ประเภทเอกสาร', 'สถานะเอกสาร'];
    const rows = visibleDocuments.map((d) => [
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

  const getDocumentActionItems = (doc: MyDocumentRow): ActionDropdownItem[] => {
    const hasAttachments = !!doc.documents && doc.documents.length > 0;
    const hasEdit = doc.status === 'DRAFT' && !!doc.editUrl;
    const hasCancel = doc.status === 'PENDING';
    const hasDelete = doc.status === 'DRAFT';

    const items: ActionDropdownItem[] = [
      {
        label: 'ดูเอกสาร',
        icon: <Eye className="w-3.5 h-3.5 text-blue-600 shrink-0" />,
        onClick: () => handleOpenDocumentPreview(doc),
      },
    ];

    if (hasEdit && doc.editUrl) {
      items.push({
        label: 'แก้ไขต่อ',
        icon: <Pencil className="w-3.5 h-3.5 text-blue-600 shrink-0" />,
        href: doc.editUrl,
      });
    }

    if (hasAttachments) {
      items.push({ divider: true, label: '' });
      doc.documents!.forEach((d) => {
        items.push({
          label: d.fileName ? `ดาวน์โหลด ${d.fileName}` : 'ดาวน์โหลดเอกสารแนบ',
          icon: <Download className="w-3.5 h-3.5 text-blue-500 shrink-0" />,
          onClick: () => handleDownloadDoc(doc, d.id, d.fileName ?? 'attachment'),
        });
      });
    }

    if (hasCancel || hasDelete) {
      items.push({ divider: true, label: '' });
      if (hasCancel) {
        items.push({
          label: 'ถอนคำขอ',
          icon: <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
          danger: true,
          onClick: () => handleCancel(doc),
        });
      }
      if (hasDelete) {
        items.push({
          label: 'ลบ',
          icon: <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
          danger: true,
          onClick: () => handleDelete(doc),
        });
      }
    }

    return items;
  };

  // ─── Render ──────────────────────────────────────────────────

  const statCards = [
    {
      label: 'เอกสารทั้งหมด',
      value: stats.total,
      icon: <FileText className="w-5 h-5 text-slate-600 dark:text-slate-300" />,
      cardBg: 'bg-slate-100 dark:bg-slate-800/90',
      border: 'border-slate-300 dark:border-slate-700',
      labelColor: 'text-slate-700 dark:text-slate-300',
      valColor: 'text-slate-900 dark:text-slate-100',
    },
    {
      label: 'เอกสารรอการอนุมัติ',
      value: stats.pending,
      icon: <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      cardBg: 'bg-amber-100 dark:bg-amber-950/60',
      border: 'border-amber-300 dark:border-amber-800',
      labelColor: 'text-amber-800 dark:text-amber-300',
      valColor: 'text-amber-700 dark:text-amber-300',
    },
    {
      label: 'เอกสารที่อนุมัติแล้ว',
      value: stats.approved,
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      cardBg: 'bg-emerald-100 dark:bg-emerald-950/60',
      border: 'border-emerald-300 dark:border-emerald-800',
      labelColor: 'text-emerald-800 dark:text-emerald-300',
      valColor: 'text-emerald-700 dark:text-emerald-300',
    },
    {
      label: 'เอกสารที่ไม่อนุมัติ',
      value: stats.rejected,
      icon: <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
      cardBg: 'bg-rose-100 dark:bg-rose-950/60',
      border: 'border-rose-300 dark:border-rose-800',
      labelColor: 'text-rose-800 dark:text-rose-300',
      valColor: 'text-rose-700 dark:text-rose-300',
    },
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
          <div key={s.label} className={`${s.cardBg} ${s.border} rounded-2xl border shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all p-4 flex items-center gap-3.5`}>
            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700/80 shadow-xs flex items-center justify-center shrink-0">
              {s.icon}
            </div>
            <div className="min-w-0">
              <div className={`text-xs font-bold ${s.labelColor} truncate`}>{s.label}</div>
              <div className={`text-2xl font-black ${s.valColor} mt-0.5`}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 text-white rounded-xl text-sm shadow-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toast}
        </div>
      )}

      {/* 2. Main Card Container (ตามต้นแบบหน้าจัดการฝ่าย) */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
        <div className="space-y-4">
          {/* Toolbar: ค้นหา + ตัวกรอง (ซ้าย) | ส่งออก/รีเฟรช (ขวา) */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Search */}
              <div className="relative max-w-xs w-full shrink-0">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="ค้นหารหัส หรือประเภทเอกสาร..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>

              <CustomSelect
                value={sourceFilter}
                onChange={(val) => setSourceFilter(String(val))}
                className="min-w-[170px]"
                options={SOURCE_FILTER_OPTIONS}
              />
              <CustomSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(String(val))}
                className="min-w-[140px]"
                options={STATUS_FILTER_OPTIONS}
              />
              <CustomSelect
                value={yearFilter}
                onChange={(val) => setYearFilter(String(val))}
                className="min-w-[120px]"
                numbered={false}
                options={yearOptions}
              />
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSourceFilter('ALL');
                    setStatusFilter('ALL');
                    setYearFilter('ALL');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline-offset-2 hover:underline cursor-pointer"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExport}
                icon={<Download className="w-3.5 h-3.5" />}
              >
                ส่งออก
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={fetchData}
                icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              >
                รีเฟรช
              </Button>
            </div>
          </div>

          {/* Table Content */}
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
          ) : visibleDocuments.length === 0 ? (
            <div className="py-20 text-center">
              <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">ไม่พบเอกสารตามตัวกรองที่เลือก</p>
            </div>
          ) : (
            <>
              {/* Desktop View: Full Table (no m-4) */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 hidden md:block">
                <table className="table-standard w-full min-w-[750px] text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60 whitespace-nowrap">
                      <SortableTh label="รหัสเอกสาร" field="code" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap" />
                      <SortableTh label="วันที่ยื่นเอกสาร" field="submittedDate" firstDirection="desc" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap" />
                      <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">วันที่ลา / รายละเอียด</th>
                      <SortableTh label="ประเภทเอกสาร" field="documentType" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap" />
                      <SortableTh label="สถานะเอกสาร" field="status" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap" />
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
                              className="text-primary dark:text-blue-300 hover:text-primary-hover hover:underline font-semibold transition-colors cursor-pointer text-left"
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
                            {doc.status === 'REJECTED' && doc.rejectReason && (
                              <span className="block mt-1 text-[11px] text-rose-500 max-w-[14rem] truncate" title={doc.rejectReason}>
                                เหตุผล: {doc.rejectReason}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end">
                              <ActionDropdown
                                align="right"
                                menuClassName="w-52"
                                triggerClassName="w-8 h-8 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center transition-colors cursor-pointer"
                                items={getDocumentActionItems(doc)}
                              />
                            </div>
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
                  return (
                    <div key={doc.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <button
                            type="button"
                            onClick={() => handleOpenDocumentPreview(doc)}
                            className="text-primary dark:text-blue-300 hover:text-primary-hover font-bold text-sm text-left flex items-center gap-1.5"
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
                        {doc.detailDate && doc.detailDate.trim() !== '' && doc.detailDate !== '-' && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">รายละเอียด:</span>
                            <span className="text-slate-700">{doc.detailDate}</span>
                          </div>
                        )}
                        {doc.status === 'REJECTED' && doc.rejectReason && (
                          <div className="text-rose-500 pt-1 border-t border-rose-100">
                            เหตุผล: {doc.rejectReason}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end pt-1">
                        <ActionDropdown
                          align="right"
                          menuClassName="w-52"
                          triggerClassName="w-8 h-8 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center transition-colors cursor-pointer"
                          items={getDocumentActionItems(doc)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Standard TablePagination */}
              <div className="pt-2">
                <TablePagination
                  total={visibleDocuments.length}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setPage(1);
                  }}
                />
              </div>
            </>
          )}
        </div>
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
          signedAt: selectedResignForPreview.submittedAt || null,
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
          id: selectedGeneralForPreview.id,
          requestNo: selectedGeneralForPreview.requestNo,
          employeeId: selectedGeneralForPreview.employeeId,
          canApproveCurrentStep: !!(selectedGeneralForPreview.canApprove || selectedGeneralForPreview.isMyTurnToApprove),
          employeeName: selectedGeneralForPreview.employeeName || user?.fullName || '',
          employeeCode: selectedGeneralForPreview.employeeCode || '',
          positionTitle: selectedGeneralForPreview.positionName || '',
          departmentName: selectedGeneralForPreview.departmentName || '',
          issueDate: selectedGeneralForPreview.issueDate,
          signedAt: selectedGeneralForPreview.submittedAt || null,
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

      {/* ─── Modal ผังขั้นตอนการอนุมัติ (Approval Timeline Modal) ─── */}
      <ApprovalTimelineModal
        isOpen={isTimelineOpen}
        onClose={() => {
          setIsTimelineOpen(false);
          setSelectedLeaveForTimeline(null);
          setTimelineRequestInfo(null);
        }}
        leaveRequest={selectedLeaveForTimeline}
        requestInfo={timelineRequestInfo}
      />
    </div>
  );
}

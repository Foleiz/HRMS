'use client';

import { useLoadPhase } from '@/hooks/useLoadPhase';
import { RefreshIndicator } from '@/components/ui/RefreshIndicator';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ClipboardList,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Ban,
  Clock,
  AlertCircle,
  ChevronDown,
  Filter,
  Eye,
  FileText,
} from 'lucide-react';
import { leaveService } from '@/services/leaveService';
import { LeaveRequest } from '@/types/leave';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { SortableTh, useTableSort, compareSortValues } from '@/components/ui/SortableTh';
import { certificateService } from '@/services/certificateService';
import { CertificateRequest } from '@/types/certificates';
import { CertificatePreviewModal } from '@/components/documents/CertificatePreviewModal';
import { resignationService } from '@/services/resignationService';
import { ResignationRequest } from '@/types/resignation';
import { ResignationPreviewModal } from '@/components/documents/ResignationPreviewModal';
import { generalDocumentService } from '@/services/generalDocumentService';
import { GeneralDocumentRequest } from '@/types/generalDocument';
import { GeneralDocumentPreviewModal } from '@/components/documents/GeneralDocumentPreviewModal';
import { benefitService } from '@/services/benefitService';
import { BenefitClaimRequest } from '@/types/benefit';
import { BenefitClaimReviewModal } from '@/components/benefits/BenefitClaimReviewModal';
import { LeavePreviewModal, type LeavePreviewData } from '@/components/documents/LeavePreviewModal';
import { employeeService } from '@/services/employeeService';
import { ApprovalNavTabs } from '@/components/approvals/ApprovalNavTabs';
import { ApprovalTimelineModal } from '@/components/approvals/ApprovalTimelineModal';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useAuth } from '@/context/AuthContext';
import { TablePagination } from '@/components/ui';
import { attendanceAdjustmentService } from '@/services/attendanceAdjustmentService';
import { AttendanceAdjustment } from '@/types/attendanceAdjustment';
import { ApprovalActionModal } from '@/components/approvals/ApprovalActionModal';

// ─── Helpers ─────────────────────────────────────────────────

type HistorySortField = 'requestNo' | 'docTypeName' | 'employeeName' | 'status' | 'approvedByName' | 'actionAt';

const HISTORY_STATUS_ORDER: Record<string, number> = { APPROVED: 0, ISSUED: 0, REJECTED: 1, CANCELLED: 2 };

const toTs = (v?: string | null) => {
  if (!v) return 0;
  const ts = new Date(v).getTime();
  return Number.isNaN(ts) ? 0 : ts;
};

const formatTime = (d?: string | null) => {
  if (!d) return '-';
  const t = new Date(d);
  if (isNaN(t.getTime())) return d;
  return t.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
};

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

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'รอการอนุมัติ', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock className="w-3.5 h-3.5" /> },
  APPROVED: { label: 'อนุมัติแล้ว', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  REJECTED: { label: 'ปฏิเสธแล้ว', color: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="w-3.5 h-3.5" /> },
  CANCELLED: { label: 'ยกเลิกแล้ว', color: 'bg-gray-100 text-gray-500 dark:text-slate-400 border-gray-200', icon: <Ban className="w-3.5 h-3.5" /> },
};

export interface UnifiedHistoryItem {
  id: string;
  rawId: number | string;
  docType: 'LEAVE' | 'CERTIFICATE' | 'RESIGNATION' | 'GENERAL' | 'BENEFIT' | 'TIME_ADJUST';
  docTypeName: string;
  requestNo: string;
  employeeName: string;
  employeeCode?: string;
  departmentName: string;
  subType: string;
  details: string;
  status: string;
  hasAlreadyApproved?: boolean;
  approvedByName?: string | null;
  actionAt?: string | null;
  leaveRaw?: LeaveRequest;
  certRaw?: CertificateRequest;
  resignationRaw?: ResignationRequest;
  generalRaw?: GeneralDocumentRequest;
  benefitRaw?: BenefitClaimRequest;
  timeAdjustRaw?: AttendanceAdjustment;
}

// ─── Component ────────────────────────────────────────────────

export default function ApprovalHistoryPage() {
  const { setBreadcrumb } = useBreadcrumb();

  const { user } = useAuth();

  const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
  const [certHistory, setCertHistory] = useState<CertificateRequest[]>([]);
  const [resignHistory, setResignHistory] = useState<ResignationRequest[]>([]);
  const [generalHistory, setGeneralHistory] = useState<GeneralDocumentRequest[]>([]);
  const [benefitHistory, setBenefitHistory] = useState<BenefitClaimRequest[]>([]);
  const [timeAdjustHistory, setTimeAdjustHistory] = useState<AttendanceAdjustment[]>([]);
  const [benefitPreview, setBenefitPreview] = useState<BenefitClaimRequest | null>(null);
  const [timeAdjustReview, setTimeAdjustReview] = useState<AttendanceAdjustment | null>(null);
  const [loading, setLoading] = useState(true);
  const historyPhase = useLoadPhase(loading);

  // Sync breadcrumb
  useEffect(() => {
    setBreadcrumb({ section: 'การอนุมัติ', page: 'ประวัติเอกสาร' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [docTypeFilter, setDocTypeFilter] = useState<'ALL' | 'LEAVE' | 'CERTIFICATE' | 'RESIGNATION' | 'GENERAL' | 'BENEFIT' | 'TIME_ADJUST'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const { sortField, sortDirection, handleSort } = useTableSort<HistorySortField>();

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, docTypeFilter, searchTerm, departmentFilter, yearFilter]);

  // Timeline Modal State (Leave)
  const [selectedForTimeline, setSelectedForTimeline] = useState<LeaveRequest | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  // Preview Modal State (Leave)
  const [selectedLeaveForPreview, setSelectedLeaveForPreview] = useState<LeavePreviewData | null>(null);
  const [isLeavePreviewOpen, setIsLeavePreviewOpen] = useState(false);

  // Preview Modal State (Certificate)
  const [selectedCertForPreview, setSelectedCertForPreview] = useState<CertificateRequest | null>(null);
  const [isCertPreviewOpen, setIsCertPreviewOpen] = useState(false);

  // Preview Modal State (Resignation)
  const [selectedResignForPreview, setSelectedResignForPreview] = useState<ResignationRequest | null>(null);
  const [isResignPreviewOpen, setIsResignPreviewOpen] = useState(false);

  // Preview Modal State (General Document)
  const [selectedGeneralForPreview, setSelectedGeneralForPreview] = useState<GeneralDocumentRequest | null>(null);
  const [isGeneralPreviewOpen, setIsGeneralPreviewOpen] = useState(false);

  // ─── Fetch ────────────────────────────────────────────────

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const [leaveResults, certResults, resignResults, genResults, benefitResults, timeAdjResults] = await Promise.all([
        leaveService.getLeaveRequests({ pageSize: 500 }).catch((err) => {
          console.error('Failed to fetch leave history', err);
          return [] as LeaveRequest[];
        }),
        certificateService.getAllRequests().catch((err) => {
          console.error('Failed to fetch certificate history', err);
          return [] as CertificateRequest[];
        }),
        resignationService.getAllRequests().catch((err) => {
          console.error('Failed to fetch resignation history', err);
          return [] as ResignationRequest[];
        }),
        generalDocumentService.getAllRequests().catch((err) => {
          console.error('Failed to fetch general document history', err);
          return [] as GeneralDocumentRequest[];
        }),
        benefitService.getClaimRequests().catch((err) => {
          console.error('Failed to fetch benefit claim history', err);
          return [] as BenefitClaimRequest[];
        }),
        attendanceAdjustmentService
          .getAdjustments({ status: 'ALL', pageSize: 500 })
          .then((r) => r.items ?? [])
          .catch((err) => {
            console.error('Failed to fetch time adjustment history', err);
            return [] as AttendanceAdjustment[];
          }),
      ]);

      // เอกสารที่อยู่ในประวัติ:
      // 1) เอกสารที่เสร็จสิ้นแล้ว (APPROVED, ISSUED, REJECTED, CANCELLED)
      // 2) หรือเอกสารที่ยัง PENDING แต่เราได้อนุมัติไปแล้ว (hasAlreadyApproved === true)
      setLeaveHistory(leaveResults.filter((r) => r.status !== 'PENDING' || r.hasAlreadyApproved));
      setCertHistory(certResults.filter((c) => c.status !== 'PENDING' || c.hasAlreadyApproved));
      setResignHistory(resignResults.filter((r) => r.status !== 'PENDING' || r.hasAlreadyApproved));
      setGeneralHistory(genResults.filter((g) => g.status !== 'PENDING' || g.hasAlreadyApproved));
      setBenefitHistory(benefitResults.filter((b) => b.status !== 'PENDING' || b.hasAlreadyApproved));
      setTimeAdjustHistory(timeAdjResults.filter((t) => t.status !== 'PENDING'));
    } catch (err) {
      console.error('Failed to fetch approval history', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // ─── Unified History Transformation ──────────────────────────

  const unifiedHistory = useMemo(() => {
    const list: UnifiedHistoryItem[] = [];

    // 1. คำขอลา
    leaveHistory.forEach((r) => {
      const dateA = r.startDate ?? r.startDatetime;
      const dateB = r.endDate ?? r.endDatetime;
      const rangeStr = dateB && dateB !== dateA ? `${formatDate(dateA)} - ${formatDate(dateB)}` : formatDate(dateA);
      const daysStr = r.leaveDays ? ` (${r.leaveDays} วัน)` : '';

      list.push({
        id: `LEAVE-${r.id}`,
        rawId: r.id,
        docType: 'LEAVE',
        docTypeName: 'คำขอลา',
        requestNo: r.requestNo || `LR-${r.id}`,
        employeeName: r.employeeName,
        employeeCode: r.employeeCode,
        departmentName: r.departmentName || '-',
        subType: r.leaveTypeName || 'การลา',
        details: `${rangeStr}${daysStr}${r.reason ? ` • ${r.reason}` : ''}`,
        status: r.status,
        hasAlreadyApproved: !!r.hasAlreadyApproved,
        approvedByName: r.approvedByName ?? (r.status === 'CANCELLED' ? 'ระบบ / ผู้ยื่น' : '-'),
        actionAt: r.approvedAt ?? r.cancelledAt ?? r.submittedAt ?? r.updatedAt ?? r.createdAt ?? null,
        leaveRaw: r,
      });
    });

    // 2. หนังสือรับรอง
    certHistory.forEach((c) => {
      list.push({
        id: `CERT-${c.id}`,
        rawId: c.id,
        docType: 'CERTIFICATE',
        docTypeName: 'หนังสือรับรอง',
        requestNo: `CERT-${String(c.id).padStart(4, '0')}`,
        employeeName: c.employeeName,
        employeeCode: c.employeeCode,
        departmentName: c.departmentName || '-',
        subType:
          c.certificateCode === 'CERT_SALARY' || c.certificateName === 'CERT_SALARY'
            ? 'หนังสือรับรองเงินเดือน'
            : c.certificateCode === 'CERT_WORK' || c.certificateName === 'CERT_WORK' || c.certificateCode === 'CERT_EMPLOYMENT' || c.certificateName === 'CERT_EMPLOYMENT'
            ? 'หนังสือรับรองการทำงาน'
            : c.certificateName || 'หนังสือรับรอง',
        details: c.purpose ? `วัตถุประสงค์: ${c.purpose}` : 'ขอหนังสือรับรอง',
        status: c.status,
        hasAlreadyApproved: !!c.hasAlreadyApproved,
        approvedByName: c.approvedByName ?? (c.status === 'CANCELLED' ? 'ระบบ / ผู้ยื่น' : '-'),
        actionAt: c.approvedAt ?? c.issuedAt ?? c.requestedAt ?? null,
        certRaw: c,
      });
    });

    // 3. คำขอลาออก
    resignHistory.forEach((r) => {
      const effectiveDateStr = formatDate(r.requestedLastWorkingDate);
      list.push({
        id: `RESIGN-${r.id}`,
        rawId: r.id,
        docType: 'RESIGNATION',
        docTypeName: 'คำขอลาออก',
        requestNo: r.requestNo || `RESIGN-${String(r.id).padStart(4, '0')}`,
        employeeName: r.employeeName,
        employeeCode: r.employeeCode,
        departmentName: r.departmentName || '-',
        subType: r.reasonCategory || r.reason || 'ลาออก',
        details: `วันทำงานวันสุดท้าย: ${effectiveDateStr}${r.handoverNotes ? ` • มอบหมายงาน: ${r.handoverNotes}` : ''}`,
        status: r.status,
        hasAlreadyApproved: !!r.hasAlreadyApproved,
        approvedByName: r.status === 'REJECTED'
          ? (r.rejectedByName ?? '-')
          : (r.approvedByName ?? (r.status === 'CANCELLED' ? 'ระบบ / ผู้ยื่น' : '-')),
        actionAt: (r.status === 'REJECTED' ? r.rejectedAt : r.approvedAt) ?? r.cancelledAt ?? r.submittedAt ?? null,
        resignationRaw: r,
      });
    });

    // 4. คำร้องเอกสารทั่วไป
    generalHistory.forEach((g) => {
      list.push({
        id: `GEN-${g.id}`,
        rawId: g.id,
        docType: 'GENERAL',
        docTypeName: 'คำร้องเอกสารทั่วไป',
        requestNo: g.requestNo || `GEN-${String(g.id).padStart(4, '0')}`,
        employeeName: g.employeeName,
        employeeCode: g.employeeCode,
        departmentName: g.departmentName || '-',
        subType: g.documentType || 'เอกสารทั่วไป',
        details: g.purpose ? `วัตถุประสงค์: ${g.purpose}` : 'คำร้องเอกสารทั่วไป',
        status: g.status,
        hasAlreadyApproved: !!g.hasAlreadyApproved,
        approvedByName: g.approvedByName ?? (g.status === 'CANCELLED' ? 'ระบบ / ผู้ยื่น' : '-'),
        actionAt: g.approvedAt ?? g.submittedAt ?? null,
        generalRaw: g,
      });
    });

    // 5. คำขอเบิกสวัสดิการ
    benefitHistory.forEach((b) => {
      list.push({
        id: `BEN-${b.id}`,
        rawId: b.id,
        docType: 'BENEFIT',
        docTypeName: 'คำขอเบิกสวัสดิการ',
        requestNo: b.requestNo,
        employeeName: b.employeeName,
        employeeCode: b.employeeCode,
        departmentName: b.departmentName || '-',
        subType: b.benefitName,
        details: `${b.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท`,
        status: b.status,
        hasAlreadyApproved: !!b.hasAlreadyApproved,
        approvedByName: b.approvedByName ?? (b.status === 'CANCELLED' ? 'ระบบ / ผู้ยื่น' : '-'),
        actionAt: b.approvedAt ?? b.submittedAt ?? null,
        benefitRaw: b,
      });
    });

    // 6. คำขอปรับเวลาเข้า-ออก
    timeAdjustHistory.forEach((t) => {
      list.push({
        id: `TA-${t.id}`,
        rawId: t.id,
        docType: 'TIME_ADJUST',
        docTypeName: 'คำขอปรับเวลาเข้า-ออก',
        requestNo: `TA-${t.id}`,
        employeeName: t.employeeName,
        employeeCode: t.employeeCode,
        departmentName: t.departmentName || '-',
        subType: 'ปรับเวลา',
        details: `${formatDate(t.workDate)} • เข้า ${formatTime(t.adjustedClockIn)} ออก ${formatTime(t.adjustedClockOut)}${t.reason ? ` • ${t.reason}` : ''}`,
        status: t.status,
        hasAlreadyApproved: false,
        approvedByName: t.reviewedByEmployeeName ?? '-',
        actionAt: t.reviewedAt ?? t.createdAt ?? null,
        timeAdjustRaw: t,
      });
    });

    // เรียงลำดับ: รายการล่าสุดอยู่บนสุดเสมอ
    return list.sort((a, b) => {
      const timeA = a.actionAt ? new Date(a.actionAt).getTime() : 0;
      const timeB = b.actionAt ? new Date(b.actionAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      return String(b.rawId).localeCompare(String(a.rawId));
    });
  }, [leaveHistory, certHistory, resignHistory, generalHistory, benefitHistory, timeAdjustHistory]);

  // ตัวเลือก แผนก / ปี พ.ศ. จากข้อมูลจริงในประวัติ
  const departmentOptions = useMemo(() => {
    const names = Array.from(new Set(unifiedHistory.map((i) => i.departmentName).filter((d) => d && d !== '-'))) as string[];
    names.sort((a, b) => a.localeCompare(b, 'th'));
    return [{ value: 'ALL', label: 'ทุกแผนก' }, ...names.map((n) => ({ value: n, label: n }))];
  }, [unifiedHistory]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    unifiedHistory.forEach((i) => {
      const ts = toTs(i.actionAt);
      if (ts) years.add(new Date(ts).getFullYear() + 543);
    });
    return [
      { value: 'ALL', label: 'ทุกปี' },
      ...Array.from(years)
        .sort((a, b) => b - a)
        .map((y) => ({ value: String(y), label: `ปี ${y}` })),
    ];
  }, [unifiedHistory]);

  const filteredHistory = useMemo(() => {
    const list = unifiedHistory.filter((item) => {
      if (docTypeFilter !== 'ALL' && item.docType !== docTypeFilter) {
        return false;
      }
      if (statusFilter) {
        if (statusFilter === 'APPROVED') {
          if (item.status !== 'APPROVED' && item.status !== 'ISSUED' && !item.hasAlreadyApproved) {
            return false;
          }
        } else if (item.status !== statusFilter) {
          return false;
        }
      }
      if (departmentFilter !== 'ALL' && item.departmentName !== departmentFilter) return false;
      if (yearFilter !== 'ALL') {
        const ts = toTs(item.actionAt);
        if (!ts || String(new Date(ts).getFullYear() + 543) !== yearFilter) return false;
      }
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        item.employeeName?.toLowerCase().includes(q) ||
        item.employeeCode?.toLowerCase().includes(q) ||
        item.requestNo?.toLowerCase().includes(q) ||
        item.docTypeName?.toLowerCase().includes(q) ||
        item.subType?.toLowerCase().includes(q) ||
        item.details?.toLowerCase().includes(q) ||
        item.approvedByName?.toLowerCase().includes(q) ||
        item.departmentName?.toLowerCase().includes(q)
      );
    });
    if (!sortField) return list; // ค่าเริ่มต้น: ดำเนินการล่าสุดอยู่บนสุด (เรียงไว้แล้วใน unifiedHistory)
    return [...list].sort((a, b) => {
      switch (sortField) {
        case 'actionAt':
          return compareSortValues(toTs(a.actionAt) || null, toTs(b.actionAt) || null, sortDirection);
        case 'status':
          return compareSortValues(HISTORY_STATUS_ORDER[a.status] ?? 9, HISTORY_STATUS_ORDER[b.status] ?? 9, sortDirection);
        default:
          return compareSortValues(a[sortField] as string | null | undefined, b[sortField] as string | null | undefined, sortDirection);
      }
    });
  }, [unifiedHistory, docTypeFilter, statusFilter, departmentFilter, yearFilter, searchTerm, sortField, sortDirection]);

  const totalCount = filteredHistory.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedHistory = useMemo(() => {
    const startIdx = (safePage - 1) * pageSize;
    return filteredHistory.slice(startIdx, startIdx + pageSize);
  }, [filteredHistory, safePage, pageSize]);

  const handleOpenLeavePreview = (req: LeaveRequest) => {
    const reqStart = req.startDate ?? req.startDatetime ?? '';
    const lastApproved = leaveHistory
      .filter((r) => r.employeeId === req.employeeId && r.status === 'APPROVED' && r.id !== req.id && (r.startDate ?? r.startDatetime ?? '') < reqStart)
      .sort((a, b) => (b.startDate ?? b.startDatetime ?? '').localeCompare(a.startDate ?? a.startDatetime ?? ''))[0];

    const initialData: LeavePreviewData = {
      requestId: req.id,
      employeeId: req.employeeId,
      employeeName: req.employeeName,
      employeePrefix: req.employeePrefix,
      departmentName: req.departmentName,
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

  // ─── Render ───────────────────────────────────────────────

  /** เปิดเอกสารของรายการ (ใช้ทั้งปุ่ม "ดูเอกสาร" และเลขที่เอกสาร) */
  const openDocument = (item: UnifiedHistoryItem) => {
    if (item.docType === 'LEAVE') {
      handleOpenLeavePreview(item.leaveRaw!);
    } else if (item.docType === 'CERTIFICATE') {
      setSelectedCertForPreview(item.certRaw!);
      setIsCertPreviewOpen(true);
    } else if (item.docType === 'RESIGNATION') {
      setSelectedResignForPreview(item.resignationRaw!);
      setIsResignPreviewOpen(true);
    } else if (item.docType === 'GENERAL') {
      setSelectedGeneralForPreview(item.generalRaw!);
      setIsGeneralPreviewOpen(true);
    } else if (item.docType === 'BENEFIT') {
      setBenefitPreview(item.benefitRaw!);
    } else if (item.docType === 'TIME_ADJUST') {
      setTimeAdjustReview(item.timeAdjustRaw!);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Sub-menu Tabs: เอกสารรอดำเนินการ | ประวัติเอกสาร */}
      <ApprovalNavTabs currentSubTitle="ประวัติเอกสาร" />

      {/* Main Card Container (ตามต้นแบบหน้าจัดการฝ่าย) */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
        <div className="space-y-4">
          {/* Toolbar: ค้นหา + ตัวกรอง (ซ้าย) */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Search */}
              <div className="relative max-w-sm w-full shrink-0">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อพนักงาน, เลขที่เอกสาร, ประเภทคำขอ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />
              </div>

              {/* Document Type filter */}
              <CustomSelect
                value={docTypeFilter}
                onChange={(val) => setDocTypeFilter(String(val) as any)}
                className="min-w-[170px]"
                options={[
                  { value: 'ALL', label: 'ทุกประเภทเอกสาร' },
                  { value: 'LEAVE', label: 'คำขอลา' },
                  { value: 'CERTIFICATE', label: 'คำขอหนังสือรับรอง' },
                  { value: 'RESIGNATION', label: 'คำขอลาออก' },
                  { value: 'GENERAL', label: 'คำร้องเอกสารทั่วไป' },
                  { value: 'BENEFIT', label: 'คำขอเบิกสวัสดิการ' },
                  { value: 'TIME_ADJUST', label: 'คำขอปรับเวลาเข้า-ออก' },
                ]}
              />

              {/* Status filter */}
              <CustomSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(String(val))}
                className="min-w-[190px]"
                options={[
                  { value: '', label: 'ทุกสถานะ (ที่ดำเนินการแล้ว)' },
                  { value: 'APPROVED', label: 'อนุมัติแล้ว' },
                  { value: 'REJECTED', label: 'ปฏิเสธแล้ว' },
                  { value: 'CANCELLED', label: 'ยกเลิกแล้ว' },
                ]}
              />

              {/* Department filter */}
              <CustomSelect
                value={departmentFilter}
                onChange={(val) => setDepartmentFilter(String(val))}
                className="min-w-[160px]"
                options={departmentOptions}
              />

              {/* Year filter (ปีที่ดำเนินการ) */}
              <CustomSelect
                value={yearFilter}
                onChange={(val) => setYearFilter(String(val))}
                className="min-w-[120px]"
                numbered={false}
                options={yearOptions}
              />
            </div>

            <span className="text-xs text-gray-400 font-medium whitespace-nowrap shrink-0">
              พบ {filteredHistory.length} รายการ
            </span>
          </div>

          <RefreshIndicator active={historyPhase.refreshing} />
        {historyPhase.initialLoading ? (
          <div className="py-20 text-center text-gray-400">
            <div className="inline-flex items-center gap-2 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-primary dark:text-blue-400" />
              กำลังโหลดประวัติเอกสาร...
            </div>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="py-20 text-center">
            <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">ไม่พบประวัติเอกสารสำหรับเงื่อนไขที่เลือก</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="table-standard w-full min-w-[850px] text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 dark:bg-slate-800/60 whitespace-nowrap">
                  <SortableTh label="เลขที่เอกสาร" field="requestNo" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide" />
                  <SortableTh label="ประเภทเอกสาร" field="docTypeName" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide" />
                  <SortableTh label="พนักงาน" field="employeeName" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide" />
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">รายละเอียดคำขอ</th>
                  <SortableTh label="สถานะ" field="status" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide" />
                  <SortableTh label="วันที่ดำเนินการ" field="actionAt" firstDirection="desc" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide" />
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedHistory.map((item) => {
                  const isPendingApprovedByMe = item.status === 'PENDING' && item.hasAlreadyApproved;
                  const statusConf = isPendingApprovedByMe
                    ? { label: 'อนุมัติแล้ว (รอขั้นถัดไป)', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Clock className="w-3.5 h-3.5" /> }
                    : STATUS_CONFIG[item.status] ?? STATUS_CONFIG['PENDING'];

                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:bg-slate-800/50 transition-colors">
                      {/* 1. เลขที่เอกสาร */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openDocument(item)}
                          title="ดูเอกสาร"
                          className="font-mono font-semibold text-xs text-primary dark:text-blue-300 hover:underline underline-offset-2 cursor-pointer"
                        >
                          {item.requestNo}
                        </button>
                      </td>

                      {/* 2. ประเภทเอกสาร */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {item.docType === 'LEAVE' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            <ClipboardList className="w-3.5 h-3.5 text-indigo-500" />
                            คำขอลา
                          </span>
                        )}
                        {item.docType === 'CERTIFICATE' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <FileText className="w-3.5 h-3.5 text-emerald-500" />
                            หนังสือรับรอง
                          </span>
                        )}
                        {item.docType === 'RESIGNATION' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                            <FileText className="w-3.5 h-3.5 text-rose-500" />
                            คำขอลาออก
                          </span>
                        )}
                        {item.docType === 'GENERAL' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                            <FileText className="w-3.5 h-3.5 text-amber-500" />
                            เอกสารทั่วไป
                          </span>
                        )}
                        {item.docType === 'BENEFIT' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-100">
                            <FileText className="w-3.5 h-3.5 text-teal-500" />
                            เบิกสวัสดิการ
                          </span>
                        )}
                        {item.docType === 'TIME_ADJUST' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-100">
                            <Clock className="w-3.5 h-3.5 text-cyan-500" />
                            ปรับเวลาเข้า-ออก
                          </span>
                        )}
                      </td>

                      {/* 3. พนักงาน (ชื่อ-นามสกุล และ แผนก ไม่มีรูปโปรไฟล์) */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{item.employeeName}</span>
                          {item.departmentName && item.departmentName !== '-' && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">• {item.departmentName}</span>
                          )}
                        </div>
                      </td>

                      {/* 4. รายละเอียดคำขอ */}
                      <td className="px-4 py-3.5 text-xs">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          {item.subType}
                        </span>
                      </td>

                      {/* 5. สถานะ */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConf.color}`}>
                          {statusConf.icon}
                          {statusConf.label}
                        </span>
                      </td>

                      {/* 7. วันที่ดำเนินการ */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                        {formatDateTime(item.actionAt)}
                      </td>

                      {/* 8. ดำเนินการ (ดูเอกสาร) */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={() => openDocument(item)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-all cursor-pointer"
                          title="ดูเอกสาร"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                          ดูเอกสาร
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

          {/* Pagination */}
          {filteredHistory.length > 0 && (
            <div className="pt-2">
              <TablePagination
                total={filteredHistory.length}
                page={safePage}
                pageSize={pageSize}
                pageSizeOptions={[10, 20, 50, 100]}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Timeline Modal (คำขอลา) */}
      <ApprovalTimelineModal
        isOpen={isTimelineOpen}
        onClose={() => {
          setIsTimelineOpen(false);
          setSelectedForTimeline(null);
        }}
        leaveRequest={selectedForTimeline}
      />

      {/* Preview Modal (คำขอลา - ตัวอย่างเอกสาร A4 PDF) */}
      <LeavePreviewModal
        isOpen={isLeavePreviewOpen}
        onClose={() => {
          setIsLeavePreviewOpen(false);
          setSelectedLeaveForPreview(null);
        }}
        data={selectedLeaveForPreview}
      />

      {/* Preview Modal (คำขอหนังสือรับรอง) */}
      <CertificatePreviewModal
        isOpen={isCertPreviewOpen}
        onClose={() => {
          setIsCertPreviewOpen(false);
          setSelectedCertForPreview(null);
        }}
        requestId={selectedCertForPreview?.id}
      />

      {/* Preview Modal (คำขอลาออก) */}
      <ResignationPreviewModal
        isOpen={isResignPreviewOpen}
        onClose={() => {
          setIsResignPreviewOpen(false);
          setSelectedResignForPreview(null);
        }}
        data={selectedResignForPreview ? {
          employeeName: selectedResignForPreview.employeeName,
          employeeId: selectedResignForPreview.employeeId,
          timeline: selectedResignForPreview.timeline,
          canApproveCurrentStep: !!(selectedResignForPreview.canApprove || selectedResignForPreview.isMyTurnToApprove),
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

      {/* Preview Modal (คำร้องเอกสารทั่วไป) */}
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
          employeeName: selectedGeneralForPreview.employeeName,
          employeeCode: selectedGeneralForPreview.employeeCode,
          positionTitle: selectedGeneralForPreview.positionName,
          departmentName: selectedGeneralForPreview.departmentName,
          issueDate: selectedGeneralForPreview.issueDate,
          signedAt: selectedGeneralForPreview.submittedAt || null,
          expiryDate: selectedGeneralForPreview.expiryDate,
          documentType: selectedGeneralForPreview.documentType,
          purpose: selectedGeneralForPreview.purpose,
          notes: selectedGeneralForPreview.notes,
          fileName: selectedGeneralForPreview.fileName,
        } : null}
      />

      {/* รายละเอียดคำขอเบิกสวัสดิการ */}
      <BenefitClaimReviewModal
        claim={benefitPreview}
        mode="view"
        onClose={() => setBenefitPreview(null)}
        onDone={() => setBenefitPreview(null)}
      />

      {/* Modal คำขอปรับเวลาเข้า-ออก (ดูอย่างเดียว) */}
      {timeAdjustReview && (
        <ApprovalActionModal
          isOpen={!!timeAdjustReview}
          onClose={() => setTimeAdjustReview(null)}
          iconType="time_adjust"
          title="คำขอปรับเวลาเข้า-ออก"
          code={`TA-${timeAdjustReview.id}`}
          requesterName={`${timeAdjustReview.employeeName}${timeAdjustReview.departmentName ? ` (${timeAdjustReview.departmentName})` : ''}`}
          categoryLabel="การปรับเวลาเข้า-ออก"
          heroTitle={`วันที่ ${formatDate(timeAdjustReview.workDate)}${timeAdjustReview.shiftName ? ` · ${timeAdjustReview.shiftName}` : ''}`}
          heroSubtitle={`ขอปรับเป็น: เข้า ${formatTime(timeAdjustReview.adjustedClockIn)} – ออก ${formatTime(timeAdjustReview.adjustedClockOut)}`}
          detailRows={[
            {
              label: 'เวลาเดิม',
              value: `เข้า ${formatTime(timeAdjustReview.originalClockIn)} – ออก ${formatTime(timeAdjustReview.originalClockOut)}`,
            },
            ...(timeAdjustReview.reason
              ? [
                  {
                    label: 'เหตุผล',
                    value: timeAdjustReview.reason,
                  },
                ]
              : []),
            {
              label: 'สถานะ',
              value:
                timeAdjustReview.status === 'APPROVED'
                  ? 'อนุมัติแล้ว'
                  : timeAdjustReview.status === 'REJECTED'
                    ? 'ปฏิเสธแล้ว'
                    : timeAdjustReview.status,
            },
            ...(timeAdjustReview.reviewedByEmployeeName
              ? [
                  {
                    label: 'ผู้พิจารณา',
                    value: timeAdjustReview.reviewedByEmployeeName,
                  },
                ]
              : []),
            ...(timeAdjustReview.reviewedAt
              ? [
                  {
                    label: 'วันที่พิจารณา',
                    value: formatDateTime(timeAdjustReview.reviewedAt),
                  },
                ]
              : []),
          ]}
          variant="view"
        />
      )}
    </div>
  );
}

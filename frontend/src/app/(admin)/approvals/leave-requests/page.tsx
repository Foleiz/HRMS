'use client';

import { useLoadPhase } from '@/hooks/useLoadPhase';
import { RefreshIndicator } from '@/components/ui/RefreshIndicator';
import { ModalShell } from '@/components/ui/ModalShell';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ClipboardList,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Ban,
  Download,
  Clock,
  AlertCircle,
  ChevronDown,
  Filter,
  Check,
  MessageSquare,
  ArrowRight,
  Eye,
  FileText,
} from 'lucide-react';
import { leaveService } from '@/services/leaveService';
import { LeaveRequest } from '@/types/leave';
import { CustomSelect } from '@/components/ui/CustomSelect';
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
import { attendanceAdjustmentService } from '@/services/attendanceAdjustmentService';
import { AttendanceAdjustment } from '@/types/attendanceAdjustment';
import { BenefitClaimRequest } from '@/types/benefit';
import { BenefitClaimReviewModal, BenefitClaimReviewMode } from '@/components/benefits/BenefitClaimReviewModal';
import { LeavePreviewModal, type LeavePreviewData } from '@/components/documents/LeavePreviewModal';
import { employeeService } from '@/services/employeeService';
import { Button, TablePagination, ActionDropdown } from '@/components/ui';
import { ConfirmModal, ConfirmType } from '@/components/ui/ConfirmModal';
import { ApprovalNavTabs } from '@/components/approvals/ApprovalNavTabs';
import { ApprovalTimelineModal } from '@/components/approvals/ApprovalTimelineModal';
import {
  ApprovalActionModal,
  ApprovalDetailRow,
  formatThaiDate,
  formatThaiDateRange,
  getNoticeDaysText,
} from '@/components/approvals/ApprovalActionModal';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useAuth } from '@/context/AuthContext';
import {
  useLeaveDecisionData,
  LeaveDecisionInsightsPanel,
  LeaveRejectReasonChips,
  CertDecisionInsightsPanel,
  CertRejectReasonChips,
  ResignDecisionInsightsPanel,
  ResignRejectReasonChips,
  GeneralDecisionInsightsPanel,
  GeneralRejectReasonChips,
} from '@/components/approvals/LeaveDecisionInsights';

// ─── ฟังก์ชันช่วย & โครงสร้างข้อมูล ──────────────────────────────

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

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'รอการอนุมัติ', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock className="w-3.5 h-3.5" /> },
  APPROVED: { label: 'อนุมัติแล้ว', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  REJECTED: { label: 'ปฏิเสธแล้ว', color: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="w-3.5 h-3.5" /> },
  CANCELLED: { label: 'ยกเลิกแล้ว', color: 'bg-gray-100 text-gray-500 dark:text-slate-400 border-gray-200', icon: <Ban className="w-3.5 h-3.5" /> },
};

/** สถานะที่แสดงในตาราง — รายการที่ผู้ใช้อนุมัติขั้นของตนแล้ว (รอขั้นถัดไป) แสดงว่า "คุณอนุมัติแล้ว" */
const MY_APPROVED_STATUS = {
  label: 'คุณอนุมัติแล้ว',
  color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  icon: <CheckCircle2 className="w-3.5 h-3.5" />,
};
const getRowStatus = (item: { status: string; isMyTurnToApprove: boolean; hasAlreadyApproved: boolean }) =>
  item.status === 'PENDING' && !item.isMyTurnToApprove && item.hasAlreadyApproved
    ? MY_APPROVED_STATUS
    : STATUS_CONFIG[item.status] ?? STATUS_CONFIG['PENDING'];

export interface UnifiedApprovalItem {
  id: string;
  rawId: number | string;
  docType: 'LEAVE' | 'CERTIFICATE' | 'RESIGNATION' | 'GENERAL' | 'BENEFIT' | 'TIME_ADJUST';
  docTypeName: string;
  requestNo: string;
  employeeId: number;
  employeeCode?: string;
  employeeName: string;
  departmentName: string;
  positionName?: string;
  subType: string;
  details: string;
  submittedAt: string | null;
  status: string;
  currentStepNo?: number | null;
  totalSteps?: number;
  currentApproverDisplay?: string | null;
  isMyTurnToApprove: boolean;
  hasAlreadyApproved: boolean;
  approvedByName?: string | null;
  approvedAt?: string | null;
  canCancel: boolean;
  documents?: { id: number; fileName?: string | null; fileUrl?: string }[];
  leaveRaw?: LeaveRequest;
  certRaw?: CertificateRequest;
  resignationRaw?: ResignationRequest;
  generalRaw?: GeneralDocumentRequest;
  benefitRaw?: BenefitClaimRequest;
  timeAdjustRaw?: AttendanceAdjustment;
}

/**
 * ตัดวงเล็บภาษาอังกฤษต่อท้ายออกจากชื่อผู้อนุมัติ เช่น
 * "หัวหน้าทีมของผู้ยื่น (Team Lead)" -> "หัวหน้าทีมของผู้ยื่น"
 * "ผู้จัดการแผนก (Department Head)" -> "ผู้จัดการแผนก"
 * "ฝ่ายทรัพยากรบุคคล (HR)" -> "ฝ่ายทรัพยากรบุคคล"
 */
export function cleanApproverDisplay(text?: string | null): string {
  if (!text) return '';
  return text.replace(/\s*\([A-Za-z0-9_.\s/-]+\)$/, '').trim();
}

// ─── Component ────────────────────────────────────────────────

export default function LeaveRequestsApprovalPage() {
  const { setBreadcrumb } = useBreadcrumb();
  const { user, hasPermission, hasRole } = useAuth();
  // ยกเลิกใบลาของคนอื่นได้เฉพาะฝ่ายบุคคล/ผู้ดูแล (ผู้อนุมัติสายงานยกเลิกไม่ได้) — ตรงกับ backend
  const canHrCancelLeave =
    hasRole('ADMIN') || hasRole('SYSTEM_SUPER') || hasPermission('APPROVAL_LEAVE_APPROVE') || hasPermission('LEAVE_BALANCE_EDIT');
  // คำขอปรับเวลา: สิทธิ์ตรงกับ AttendanceAdjustmentController
  const isSuperUser = hasRole('ADMIN') || hasRole('SYSTEM_SUPER');
  const canViewTimeAdjust = isSuperUser || hasPermission('TIME_DAILY_VIEW') || hasPermission('APPROVAL_TIME_VIEW');
  const canReviewTimeAdjust = isSuperUser || hasPermission('TIME_DAILY_EDIT') || hasPermission('APPROVAL_TIME_APPROVE');

  // Leave Requests State
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);

  // Certificate Requests State
  const [certificateRequests, setCertificateRequests] = useState<CertificateRequest[]>([]);

  // Resignation Requests State
  const [resignationRequests, setResignationRequests] = useState<ResignationRequest[]>([]);

  // General Document Requests State
  const [generalRequests, setGeneralRequests] = useState<GeneralDocumentRequest[]>([]);

  // คำขอเบิกสวัสดิการ
  const [benefitRequests, setBenefitRequests] = useState<BenefitClaimRequest[]>([]);
  const [timeAdjustRequests, setTimeAdjustRequests] = useState<AttendanceAdjustment[]>([]);
  const [timeAdjustReview, setTimeAdjustReview] = useState<{ adj: AttendanceAdjustment; mode: 'view' | 'approve' | 'reject' } | null>(null);
  const [isSubmittingTimeAdjust, setIsSubmittingTimeAdjust] = useState(false);
  const [benefitReview, setBenefitReview] = useState<{ claim: BenefitClaimRequest; mode: BenefitClaimReviewMode } | null>(null);

  const [loading, setLoading] = useState(true);
  const listPhase = useLoadPhase(loading);

  // Sync breadcrumb
  useEffect(() => {
    setBreadcrumb({ section: 'การอนุมัติ', page: 'เอกสารรอดำเนินการ' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  // Filters
  const [docTypeFilter, setDocTypeFilter] = useState<'ALL' | UnifiedApprovalItem['docType']>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [docTypeFilter, searchTerm]);

  // Leave Approval Modals State
  const [selectedForApprove, setSelectedForApprove] = useState<LeaveRequest | null>(null);
  const [approveComment, setApproveComment] = useState('');
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);

  const [selectedForReject, setSelectedForReject] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Leave Decision Data Hooks
  const approveLeaveDecisionData = useLeaveDecisionData(selectedForApprove, leaveRequests);
  const rejectLeaveDecisionData = useLeaveDecisionData(selectedForReject, leaveRequests);

  // Leave Timeline Modal State
  const [selectedForTimeline, setSelectedForTimeline] = useState<LeaveRequest | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  // Leave Document Preview Modal State
  const [selectedLeaveForPreview, setSelectedLeaveForPreview] = useState<LeavePreviewData | null>(null);
  const [isLeavePreviewOpen, setIsLeavePreviewOpen] = useState(false);

  // Certificate Approval Modals State
  const [selectedCertForApprove, setSelectedCertForApprove] = useState<CertificateRequest | null>(null);
  const [approveCertComment, setApproveCertComment] = useState('');
  const [isSubmittingCertApprove, setIsSubmittingCertApprove] = useState(false);

  const [selectedCertForReject, setSelectedCertForReject] = useState<CertificateRequest | null>(null);
  const [rejectCertReason, setRejectCertReason] = useState('');
  const [isSubmittingCertReject, setIsSubmittingCertReject] = useState(false);

  // Certificate Preview Modal State
  const [selectedCertForPreview, setSelectedCertForPreview] = useState<CertificateRequest | null>(null);
  const [isCertPreviewOpen, setIsCertPreviewOpen] = useState(false);

  // Resignation Approval Modals State
  const [selectedResignForApprove, setSelectedResignForApprove] = useState<ResignationRequest | null>(null);
  const [approveResignComment, setApproveResignComment] = useState('');
  const [isSubmittingResignApprove, setIsSubmittingResignApprove] = useState(false);

  const [selectedResignForReject, setSelectedResignForReject] = useState<ResignationRequest | null>(null);
  const [rejectResignReason, setRejectResignReason] = useState('');
  const [isSubmittingResignReject, setIsSubmittingResignReject] = useState(false);

  // Resignation Preview Modal State
  const [selectedResignForPreview, setSelectedResignForPreview] = useState<ResignationRequest | null>(null);
  const [isResignPreviewOpen, setIsResignPreviewOpen] = useState(false);

  // General Document Approval Modals State
  const [selectedGeneralForApprove, setSelectedGeneralForApprove] = useState<GeneralDocumentRequest | null>(null);
  const [approveGeneralComment, setApproveGeneralComment] = useState('');
  const [isSubmittingGeneralApprove, setIsSubmittingGeneralApprove] = useState(false);

  const [selectedGeneralForReject, setSelectedGeneralForReject] = useState<GeneralDocumentRequest | null>(null);
  const [rejectGeneralReason, setRejectGeneralReason] = useState('');
  const [isSubmittingGeneralReject, setIsSubmittingGeneralReject] = useState(false);

  // General Document Preview Modal State
  const [selectedGeneralForPreview, setSelectedGeneralForPreview] = useState<GeneralDocumentRequest | null>(null);
  const [isGeneralPreviewOpen, setIsGeneralPreviewOpen] = useState(false);

  // Confirm/Alert dialog for Cancel
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
  // error แสดงนานกว่า และอยู่เหนือ modal (z-[100]) — เดิม z-50 เท่ากับ modal ทำให้ผู้ใช้มองไม่เห็นข้อความผิดพลาด
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), type === 'error' ? 7000 : 3000);
  };

  const closeConfirm = () => setConfirmConfig((p) => ({ ...p, isOpen: false }));

  // ─── Fetch ──────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // ดึงทุกสถานะ แล้วกรองสถานะฝั่งหน้าเว็บ — การ์ดสรุปจะนับครบทุกประเภทและอัปเดตทันทีหลังอนุมัติ/ปฏิเสธ
      const [reqData, certData, resignData, genData, benefitData, timeAdjData] = await Promise.all([
        leaveService.getLeaveRequests({ pageSize: 500 }),
        certificateService.getAllRequests().catch((err) => {
          console.error('Failed to fetch certificate requests', err);
          return [] as CertificateRequest[];
        }),
        resignationService.getAllRequests().catch((err) => {
          console.error('Failed to fetch resignation requests', err);
          return [] as ResignationRequest[];
        }),
        generalDocumentService.getAllRequests().catch((err) => {
          console.error('Failed to fetch general requests', err);
          return [] as GeneralDocumentRequest[];
        }),
        benefitService.getClaimRequests().catch((err) => {
          console.error('Failed to fetch benefit claim requests', err);
          return [] as BenefitClaimRequest[];
        }),
        canViewTimeAdjust
          ? attendanceAdjustmentService
              .getAdjustments({ status: 'ALL', pageSize: 500 })
              .then((r) => r.items ?? [])
              .catch((err) => {
                console.error('Failed to fetch time adjustment requests', err);
                return [] as AttendanceAdjustment[];
              })
          : Promise.resolve([] as AttendanceAdjustment[]),
      ]);
      setLeaveRequests(reqData);
      setCertificateRequests(certData);
      setResignationRequests(resignData);
      setGeneralRequests(genData);
      setBenefitRequests(benefitData);
      setTimeAdjustRequests(timeAdjData);
    } catch (err) {
      console.error('Failed to fetch leave/cert/resign/gen requests', err);
    } finally {
      setLoading(false);
    }
  }, [canViewTimeAdjust]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── รวมข้อมูลเอกสารทุกประเภท (Unified Items) ─────────────────

  const unifiedRequests = useMemo(() => {
    const list: UnifiedApprovalItem[] = [];

    // 1. คำขอลา
    leaveRequests.forEach((req) => {
      const startStr = formatDate(req.startDate ?? req.startDatetime);
      const endStr = formatDate(req.endDate ?? req.endDatetime);
      const rangeStr = endStr && endStr !== startStr ? `${startStr} - ${endStr}` : startStr;
      const daysStr = req.leaveDays ? ` (${req.leaveDays} วัน)` : '';

      list.push({
        id: `LEAVE-${req.id}`,
        rawId: req.id,
        docType: 'LEAVE',
        docTypeName: 'คำขอลา',
        requestNo: req.requestNo || `LR-${req.id}`,
        employeeId: req.employeeId,
        employeeCode: req.employeeCode,
        employeeName: req.employeeName,
        departmentName: req.departmentName || '-',
        positionName: (req as any).positionName || '-',
        subType: req.leaveTypeName || 'การลา',
        details: `${rangeStr}${daysStr}${req.reason ? ` • ${req.reason}` : ''}`,
        submittedAt: req.submittedAt || req.createdAt || null,
        status: req.status,
        currentStepNo: req.currentStepNo,
        totalSteps: req.totalSteps,
        currentApproverDisplay: cleanApproverDisplay(req.currentApproverDisplay),
        isMyTurnToApprove: !!req.isMyTurnToApprove,
        hasAlreadyApproved: !!req.hasAlreadyApproved,
        approvedByName: req.approvedByName,
        approvedAt: req.approvedAt,
        canCancel: canHrCancelLeave && (req.status === 'APPROVED' || !!req.hasAlreadyApproved),
        documents: req.documents,
        leaveRaw: req,
      });
    });

    // 2. คำขอหนังสือรับรอง
    certificateRequests.forEach((cert) => {
      list.push({
        id: `CERT-${cert.id}`,
        rawId: cert.id,
        docType: 'CERTIFICATE',
        docTypeName: 'หนังสือรับรอง',
        requestNo: `CERT-${String(cert.id).padStart(4, '0')}`,
        employeeId: cert.employeeId,
        employeeCode: cert.employeeCode,
        employeeName: cert.employeeName,
        departmentName: cert.departmentName || '-',
        subType:
          cert.certificateCode === 'CERT_SALARY' || cert.certificateName === 'CERT_SALARY'
            ? 'หนังสือรับรองเงินเดือน'
            : cert.certificateCode === 'CERT_WORK' || cert.certificateName === 'CERT_WORK' || cert.certificateCode === 'CERT_EMPLOYMENT' || cert.certificateName === 'CERT_EMPLOYMENT'
            ? 'หนังสือรับรองการทำงาน'
            : cert.certificateName || 'หนังสือรับรอง',
        details: cert.purpose ? `วัตถุประสงค์: ${cert.purpose}` : 'ขอหนังสือรับรอง',
        submittedAt: cert.requestedAt || null,
        status: cert.status,
        currentStepNo: cert.currentStepNo,
        totalSteps: cert.totalSteps,
        currentApproverDisplay: cleanApproverDisplay(cert.currentApproverDisplay),
        isMyTurnToApprove: !!cert.isMyTurnToApprove,
        hasAlreadyApproved: !!cert.hasAlreadyApproved,
        approvedByName: cert.approvedByName,
        approvedAt: cert.approvedAt,
        canCancel: !!cert.canCancel,
        certRaw: cert,
      });
    });

    // 3. คำขอลาออก
    resignationRequests.forEach((res) => {
      const lastWorkingStr = formatDate(res.requestedLastWorkingDate);
      const noticeStr = res.noticePeriodDays ? ` (บอกล่วงหน้า ${res.noticePeriodDays} วัน)` : '';
      list.push({
        id: `RESIGN-${res.id}`,
        rawId: res.id,
        docType: 'RESIGNATION',
        docTypeName: 'คำขอลาออก',
        requestNo: res.requestNo,
        employeeId: res.employeeId,
        employeeCode: res.employeeCode,
        employeeName: res.employeeName,
        departmentName: res.departmentName || '-',
        positionName: res.positionName || '-',
        subType: res.reasonCategory || 'ลาออกจากงาน',
        details: `วันทำงานสุดท้าย: ${lastWorkingStr}${noticeStr}${res.reasonDetail ? ` • ${res.reasonDetail}` : ''}`,
        submittedAt: res.submittedAt || null,
        status: res.status,
        currentStepNo: res.currentStepNo,
        totalSteps: res.totalSteps,
        currentApproverDisplay: cleanApproverDisplay(res.currentApproverDisplay),
        isMyTurnToApprove: !!res.isMyTurnToApprove,
        hasAlreadyApproved: !!res.hasAlreadyApproved,
        approvedByName: res.approvedByName,
        approvedAt: res.approvedAt,
        canCancel: res.status === 'APPROVED' || !!res.hasAlreadyApproved,
        resignationRaw: res,
      });
    });

    // 4. คำร้องเอกสารทั่วไป
    generalRequests.forEach((gen) => {
      const issueStr = formatDate(gen.issueDate);
      const expiryStr = gen.expiryDate ? ` - ${formatDate(gen.expiryDate)}` : '';
      list.push({
        id: `GEN-${gen.id}`,
        rawId: gen.id,
        docType: 'GENERAL',
        docTypeName: 'เอกสารทั่วไป',
        requestNo: gen.requestNo,
        employeeId: gen.employeeId,
        employeeCode: gen.employeeCode,
        employeeName: gen.employeeName,
        departmentName: gen.departmentName || '-',
        positionName: gen.positionName || '-',
        subType: gen.documentType,
        details: `${gen.purpose}${gen.notes ? ` • ${gen.notes}` : ''} (${issueStr}${expiryStr})`,
        submittedAt: gen.submittedAt || null,
        status: gen.status,
        isMyTurnToApprove: !!gen.isMyTurnToApprove,
        hasAlreadyApproved: gen.hasAlreadyApproved ?? gen.status === 'APPROVED',
        approvedByName: gen.approvedByName,
        approvedAt: gen.approvedAt,
        canCancel: gen.canCancel,
        generalRaw: gen,
      });
    });

    // 5. คำขอเบิกสวัสดิการ
    benefitRequests.forEach((bc) => {
      list.push({
        id: `BEN-${bc.id}`,
        rawId: bc.id,
        docType: 'BENEFIT',
        docTypeName: 'เบิกสวัสดิการ',
        requestNo: bc.requestNo,
        employeeId: bc.employeeId,
        employeeCode: bc.employeeCode,
        employeeName: bc.employeeName,
        departmentName: bc.departmentName || '-',
        positionName: bc.positionName || '-',
        subType: bc.benefitName,
        details: `${bc.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท (${formatDate(bc.claimDate)})${bc.serviceProvider ? ` • ${bc.serviceProvider}` : ''}${bc.remarks ? ` • ${bc.remarks}` : ''}`,
        submittedAt: bc.submittedAt || null,
        status: bc.status,
        currentStepNo: bc.currentStepNo,
        totalSteps: bc.totalSteps,
        currentApproverDisplay: cleanApproverDisplay(bc.currentApproverDisplay),
        isMyTurnToApprove: !!bc.isMyTurnToApprove,
        hasAlreadyApproved: bc.hasAlreadyApproved ?? bc.status === 'APPROVED',
        approvedByName: bc.approvedByName,
        approvedAt: bc.approvedAt,
        canCancel: bc.canCancel,
        benefitRaw: bc,
      });
    });

    // 6. คำขอปรับเวลาเข้า-ออก (อนุมัติขั้นเดียวโดยผู้มีสิทธิ์ดูแลเวลาทำงาน)
    timeAdjustRequests.forEach((adj) => {
      const isPending = adj.status === 'PENDING';
      const isOwn = !!user?.employeeId && adj.employeeId === user.employeeId;
      list.push({
        id: `TA-${adj.id}`,
        rawId: adj.id,
        docType: 'TIME_ADJUST',
        docTypeName: 'ปรับเวลาเข้า-ออก',
        requestNo: `TA-${adj.id}`,
        employeeId: adj.employeeId,
        employeeCode: adj.employeeCode,
        employeeName: adj.employeeName,
        departmentName: adj.departmentName || '-',
        positionName: adj.positionName || '-',
        subType: 'ปรับเวลา',
        details: `${formatDate(adj.workDate)} • เข้า ${formatTime(adj.adjustedClockIn)} ออก ${formatTime(adj.adjustedClockOut)}${adj.reason ? ` • ${adj.reason}` : ''}`,
        submittedAt: adj.createdAt || null,
        status: adj.status,
        currentApproverDisplay: isPending ? 'ผู้ดูแลเวลาทำงาน' : null,
        isMyTurnToApprove: isPending && canReviewTimeAdjust && !isOwn,
        hasAlreadyApproved: false,
        approvedByName: adj.reviewedByEmployeeName,
        approvedAt: adj.reviewedAt,
        canCancel: false,
        timeAdjustRaw: adj,
      });
    });

    // เรียงลำดับ: รายการที่ถึงคิวเราอนุมัติขึ้นก่อน จากนั้นเรียงตามวันที่ยื่นล่าสุด
    return list.sort((a, b) => {
      if (a.isMyTurnToApprove && !b.isMyTurnToApprove) return -1;
      if (!a.isMyTurnToApprove && b.isMyTurnToApprove) return 1;
      const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      const rawA = typeof a.rawId === 'number' ? a.rawId : 0;
      const rawB = typeof b.rawId === 'number' ? b.rawId : 0;
      return rawB - rawA;
    });
  }, [leaveRequests, certificateRequests, resignationRequests, generalRequests, benefitRequests, timeAdjustRequests, canHrCancelLeave, canReviewTimeAdjust, user?.employeeId]);

  const filteredRequests = useMemo(() => {
    return unifiedRequests.filter((item) => {
      // แสดงเฉพาะเอกสารที่รอการอนุมัติ และถึงคิวเราอนุมัติ และเรายังไม่ได้อนุมัติ
      if (item.status !== 'PENDING' || !item.isMyTurnToApprove || item.hasAlreadyApproved) {
        return false;
      }
      if (docTypeFilter !== 'ALL' && item.docType !== docTypeFilter) {
        return false;
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
        item.departmentName?.toLowerCase().includes(q)
      );
    });
  }, [unifiedRequests, docTypeFilter, searchTerm]);

  const totalCount = filteredRequests.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedRequests = useMemo(() => {
    const startIdx = (safePage - 1) * pageSize;
    return filteredRequests.slice(startIdx, startIdx + pageSize);
  }, [filteredRequests, safePage, pageSize]);

  // ─── Actions: Leave ─────────────────────────────────────────

  const openApproveDialog = (req: LeaveRequest) => {
    setSelectedForApprove(req);
    setApproveComment('');
  };

  const submitApprove = async () => {
    if (!selectedForApprove) return;
    setIsSubmittingApprove(true);
    try {
      await leaveService.approveLeaveRequest(selectedForApprove.id, approveComment.trim() || undefined);
      setSelectedForApprove(null);
      showToast('อนุมัติคำขอลาสำเร็จ');
      fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการอนุมัติ', 'error');
    } finally {
      setIsSubmittingApprove(false);
    }
  };

  const openRejectDialog = (req: LeaveRequest) => {
    setSelectedForReject(req);
    setRejectReason('');
  };

  const submitReject = async () => {
    if (!selectedForReject) return;
    if (!rejectReason.trim()) {
      showToast('กรุณาระบุเหตุผลในการปฏิเสธ', 'error');
      return;
    }
    setIsSubmittingReject(true);
    try {
      await leaveService.rejectLeaveRequest(selectedForReject.id, rejectReason.trim());
      setSelectedForReject(null);
      showToast('ปฏิเสธคำขอลาสำเร็จ');
      fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการปฏิเสธ', 'error');
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const handleCancelLeave = (req: LeaveRequest) => {
    setConfirmConfig({
      isOpen: true,
      singleButton: false,
      isLoading: false,
      cancelText: 'ยกเลิก',
      title: 'ยกเลิกคำขอลา',
      message: `ยกเลิกคำขอลาของ "${req.employeeName}" (${req.leaveTypeName}) ใช่หรือไม่?`,
      confirmText: 'ยกเลิกคำขอ',
      type: 'danger',
      onConfirm: async () => {
        try {
          await leaveService.cancelLeaveRequest(req.id);
          closeConfirm();
          showToast('ยกเลิกคำขอลาสำเร็จ');
          fetchData();
        } catch (err: any) {
          closeConfirm();
          showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาด', 'error');
        }
      },
    });
  };

  const handleOpenLeavePreview = (req: LeaveRequest) => {
    const reqStart = req.startDate ?? req.startDatetime ?? '';
    const lastApproved = leaveRequests
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
      canApproveCurrentStep: !!req.isMyTurnToApprove,
      documents: req.documents,
    };

    setSelectedLeaveForPreview(initialData);
    setIsLeavePreviewOpen(true);

    // ดึง timeline และข้อมูลพนักงานเพิ่มเติมในเบื้องหลัง เพื่อแสดงลายเซ็นและสายอนุมัติอย่างสมบูรณ์
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

  const handleDownloadDoc = async (reqId: number, docId: number, fileName: string) => {
    try {
      const blob = await leaveService.downloadLeaveDocument(reqId, docId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('ไม่สามารถดาวน์โหลดเอกสารได้', 'error');
    }
  };

  // ─── Actions: Certificate ───────────────────────────────────

  const openApproveCertDialog = (req: CertificateRequest) => {
    setSelectedCertForApprove(req);
    setApproveCertComment('');
  };

  const submitCertApprove = async () => {
    if (!selectedCertForApprove) return;
    setIsSubmittingCertApprove(true);
    try {
      await certificateService.approveRequest(selectedCertForApprove.id, approveCertComment.trim() || undefined);
      setSelectedCertForApprove(null);
      showToast('อนุมัติคำขอหนังสือรับรองสำเร็จ');
      fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการอนุมัติคำขอ', 'error');
    } finally {
      setIsSubmittingCertApprove(false);
    }
  };

  const openRejectCertDialog = (req: CertificateRequest) => {
    setSelectedCertForReject(req);
    setRejectCertReason('');
  };

  const submitCertReject = async () => {
    if (!selectedCertForReject) return;
    if (!rejectCertReason.trim()) {
      showToast('กรุณาระบุเหตุผลในการปฏิเสธ', 'error');
      return;
    }
    setIsSubmittingCertReject(true);
    try {
      await certificateService.rejectRequest(selectedCertForReject.id, rejectCertReason.trim());
      setSelectedCertForReject(null);
      showToast('ปฏิเสธคำขอหนังสือรับรองสำเร็จ');
      fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการปฏิเสธคำขอ', 'error');
    } finally {
      setIsSubmittingCertReject(false);
    }
  };

  const handleCancelCert = (req: CertificateRequest) => {
    setConfirmConfig({
      isOpen: true,
      singleButton: false,
      isLoading: false,
      cancelText: 'ยกเลิก',
      title: 'ยกเลิกคำขอหนังสือรับรอง',
      message: `ยกเลิกคำขอหนังสือรับรองของ "${req.employeeName}" (${req.certificateName}) ใช่หรือไม่?`,
      confirmText: 'ยกเลิกคำขอ',
      type: 'danger',
      onConfirm: async () => {
        try {
          await certificateService.cancelRequest(req.id);
          closeConfirm();
          showToast('ยกเลิกคำขอหนังสือรับรองสำเร็จ');
          fetchData();
        } catch (err: any) {
          closeConfirm();
          showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการยกเลิกคำขอ', 'error');
        }
      },
    });
  };

  // ─── Actions: Resignation ───────────────────────────────────

  const openApproveResignDialog = (req: ResignationRequest) => {
    setSelectedResignForApprove(req);
    setApproveResignComment('');
  };

  const submitResignApprove = async () => {
    if (!selectedResignForApprove) return;
    setIsSubmittingResignApprove(true);
    try {
      await resignationService.approveRequest(selectedResignForApprove.id, approveResignComment.trim() || undefined);
      setSelectedResignForApprove(null);
      showToast('อนุมัติคำขอลาออกสำเร็จ');
      fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการอนุมัติคำขอ', 'error');
    } finally {
      setIsSubmittingResignApprove(false);
    }
  };

  const openRejectResignDialog = (req: ResignationRequest) => {
    setSelectedResignForReject(req);
    setRejectResignReason('');
  };

  const submitResignReject = async () => {
    if (!selectedResignForReject) return;
    if (!rejectResignReason.trim()) {
      showToast('กรุณาระบุเหตุผลในการปฏิเสธ', 'error');
      return;
    }
    setIsSubmittingResignReject(true);
    try {
      await resignationService.rejectRequest(selectedResignForReject.id, rejectResignReason.trim());
      setSelectedResignForReject(null);
      showToast('ปฏิเสธคำขอลาออกสำเร็จ');
      fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการปฏิเสธคำขอ', 'error');
    } finally {
      setIsSubmittingResignReject(false);
    }
  };

  const handleCancelResign = (req: ResignationRequest) => {
    setConfirmConfig({
      isOpen: true,
      singleButton: false,
      isLoading: false,
      cancelText: 'ยกเลิก',
      title: 'ยกเลิกคำขอลาออก',
      message: `ยกเลิกคำขอลาออกของ "${req.employeeName}" ใช่หรือไม่?`,
      confirmText: 'ยกเลิกคำขอ',
      type: 'danger',
      onConfirm: async () => {
        try {
          await resignationService.cancelRequest(req.id);
          closeConfirm();
          showToast('ยกเลิกคำขอลาออกสำเร็จ');
          fetchData();
        } catch (err: any) {
          closeConfirm();
          showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการยกเลิกคำขอ', 'error');
        }
      },
    });
  };

  // ─── Actions: General Document ──────────────────────────────

  const openApproveGeneralDialog = (req: GeneralDocumentRequest) => {
    setSelectedGeneralForApprove(req);
    setApproveGeneralComment('');
  };

  const submitGeneralApprove = async () => {
    if (!selectedGeneralForApprove) return;
    setIsSubmittingGeneralApprove(true);
    try {
      await generalDocumentService.approveRequest(selectedGeneralForApprove.id);
      setSelectedGeneralForApprove(null);
      showToast('อนุมัติคำร้องเอกสารทั่วไปสำเร็จ');
      fetchData();
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการอนุมัติคำร้อง', 'error');
    } finally {
      setIsSubmittingGeneralApprove(false);
    }
  };

  const openRejectGeneralDialog = (req: GeneralDocumentRequest) => {
    setSelectedGeneralForReject(req);
    setRejectGeneralReason('');
  };

  const submitGeneralReject = async () => {
    if (!selectedGeneralForReject) return;
    if (!rejectGeneralReason.trim()) {
      showToast('กรุณาระบุเหตุผลในการปฏิเสธ', 'error');
      return;
    }
    setIsSubmittingGeneralReject(true);
    try {
      await generalDocumentService.rejectRequest(selectedGeneralForReject.id, rejectGeneralReason.trim());
      setSelectedGeneralForReject(null);
      showToast('ปฏิเสธคำร้องเอกสารทั่วไปสำเร็จ');
      fetchData();
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการปฏิเสธคำร้อง', 'error');
    } finally {
      setIsSubmittingGeneralReject(false);
    }
  };

  const handleCancelGeneral = (req: GeneralDocumentRequest) => {
    setConfirmConfig({
      isOpen: true,
      singleButton: false,
      isLoading: false,
      cancelText: 'ยกเลิก',
      title: 'ยกเลิกคำร้องเอกสารทั่วไป',
      message: `ยกเลิกคำร้องเอกสารของ "${req.employeeName}" (${req.documentType}) ใช่หรือไม่?`,
      confirmText: 'ยกเลิกคำร้อง',
      type: 'danger',
      onConfirm: async () => {
        try {
          await generalDocumentService.cancelRequest(req.id);
          closeConfirm();
          showToast('ยกเลิกคำร้องเอกสารทั่วไปสำเร็จ');
          fetchData();
        } catch (err: any) {
          closeConfirm();
          showToast('เกิดข้อผิดพลาดในการยกเลิกคำร้อง', 'error');
        }
      },
    });
  };

  // ─── Actions: คำขอปรับเวลา ─────────────────────────────────

  const submitTimeAdjustReview = async (status: 'APPROVED' | 'REJECTED') => {
    if (!timeAdjustReview) return;
    setIsSubmittingTimeAdjust(true);
    try {
      await attendanceAdjustmentService.reviewAdjustment(timeAdjustReview.adj.id, { status });
      setTimeAdjustReview(null);
      showToast(status === 'APPROVED' ? 'อนุมัติคำขอปรับเวลาสำเร็จ — ระบบคำนวณเวลาวันนั้นใหม่แล้ว' : 'ปฏิเสธคำขอปรับเวลาแล้ว');
      fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการพิจารณาคำขอปรับเวลา', 'error');
    } finally {
      setIsSubmittingTimeAdjust(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────

  // นับจากเอกสารที่รอการอนุมัติจากเรา (แยกตามหมวดหมู่)
  const pendingForMe = useMemo(
    () => unifiedRequests.filter((r) => r.status === 'PENDING' && r.isMyTurnToApprove && !r.hasAlreadyApproved),
    [unifiedRequests]
  );
  const totalPendingForMe = pendingForMe.length;
  const leavePendingCount = pendingForMe.filter((r) => r.docType === 'LEAVE').length;
  const certPendingCount = pendingForMe.filter((r) => r.docType === 'CERTIFICATE').length;
  const otherPendingCount = pendingForMe.filter((r) => !['LEAVE', 'CERTIFICATE'].includes(r.docType)).length;

  /** เปิดเอกสารของรายการ (ใช้ทั้งปุ่ม "ดูเอกสาร" และเลขที่เอกสาร) */
  const openDocument = (item: UnifiedApprovalItem) => {
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
    } else if (item.docType === 'TIME_ADJUST') {
      setTimeAdjustReview({ adj: item.timeAdjustRaw!, mode: 'view' });
    } else if (item.docType === 'BENEFIT') {
      setBenefitReview({ claim: item.benefitRaw!, mode: 'view' });
      setIsGeneralPreviewOpen(true);
    }
  };

  /** ดำเนินการอนุมัติคำขอตามประเภทเอกสาร */
  const handleApproveItem = (item: UnifiedApprovalItem) => {
    if (item.docType === 'LEAVE') {
      openApproveDialog(item.leaveRaw!);
    } else if (item.docType === 'CERTIFICATE') {
      openApproveCertDialog(item.certRaw!);
    } else if (item.docType === 'RESIGNATION') {
      openApproveResignDialog(item.resignationRaw!);
    } else if (item.docType === 'GENERAL') {
      openApproveGeneralDialog(item.generalRaw!);
    } else if (item.docType === 'TIME_ADJUST') {
      setTimeAdjustReview({ adj: item.timeAdjustRaw!, mode: 'approve' });
    } else if (item.docType === 'BENEFIT') {
      setBenefitReview({ claim: item.benefitRaw!, mode: 'approve' });
    }
  };

  /** ดำเนินการปฏิเสธคำขอตามประเภทเอกสาร */
  const handleRejectItem = (item: UnifiedApprovalItem) => {
    if (item.docType === 'LEAVE') {
      openRejectDialog(item.leaveRaw!);
    } else if (item.docType === 'CERTIFICATE') {
      openRejectCertDialog(item.certRaw!);
    } else if (item.docType === 'RESIGNATION') {
      openRejectResignDialog(item.resignationRaw!);
    } else if (item.docType === 'GENERAL') {
      openRejectGeneralDialog(item.generalRaw!);
    } else if (item.docType === 'TIME_ADJUST') {
      setTimeAdjustReview({ adj: item.timeAdjustRaw!, mode: 'reject' });
    } else if (item.docType === 'BENEFIT') {
      setBenefitReview({ claim: item.benefitRaw!, mode: 'reject' });
    }
  };

  /** ยกเลิกคำขอที่เคยอนุมัติแล้ว */
  const handleCancelItem = (item: UnifiedApprovalItem) => {
    if (item.docType === 'LEAVE') {
      handleCancelLeave(item.leaveRaw!);
    } else if (item.docType === 'CERTIFICATE') {
      handleCancelCert(item.certRaw!);
    } else if (item.docType === 'RESIGNATION') {
      handleCancelResign(item.resignationRaw!);
    } else if (item.docType === 'GENERAL') {
      handleCancelGeneral(item.generalRaw!);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Sub-menu Tabs: เอกสารรอดำเนินการ | ประวัติเอกสาร */}
      <ApprovalNavTabs currentSubTitle="เอกสารรอดำเนินการ" />

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'รอคุณอนุมัติทั้งหมด', value: totalPendingForMe, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20' },
          { label: 'คำขอลา', value: leavePendingCount, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/20' },
          { label: 'หนังสือรับรอง', value: certPendingCount, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
          { label: 'คำขออื่นๆ', value: otherPendingCount, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/20' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl border border-white dark:border-slate-800 p-4 shadow-2xs`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters & Control Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search (อยู่ซ้ายสุด กำหนดความกว้างพอดีๆ) */}
            <div className="relative w-full sm:w-72 md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="ค้นหาชื่อพนักงาน, เลขที่เอกสาร, ประเภทคำขอ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary transition-all"
              />
            </div>

            {/* Document Type filter (ตัวกรองประเภทเอกสาร) */}
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
          </div>

          <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
            พบ {filteredRequests.length} รายการที่รอคุณอนุมัติ
          </span>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          role={toast.type === 'error' ? 'alert' : 'status'}
          className={`fixed bottom-6 right-6 z-[100] max-w-md px-4 py-3 text-white rounded-xl text-sm shadow-lg flex items-start gap-2 animate-in slide-in-from-bottom-2 duration-200 ${toast.type === 'error' ? 'bg-rose-700' : 'bg-slate-900'}`}
        >
          {toast.type === 'error'
            ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-white" />
            : <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <RefreshIndicator active={listPhase.refreshing} />
        {listPhase.initialLoading ? (
          <div className="py-20 text-center text-gray-400">
            <div className="inline-flex items-center gap-2 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-primary dark:text-blue-400" />
              กำลังโหลดรายการ...
            </div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-20 text-center">
            <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">ไม่พบเอกสารสำหรับเงื่อนไขที่เลือก</p>
          </div>
        ) : (
          <>
            {/* Desktop View: Full Approvals Table */}
            <div className="m-4 rounded-xl border border-slate-200 dark:border-slate-700 hidden lg:block overflow-x-auto">
              <table className="table-standard w-full min-w-[850px] text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 dark:bg-slate-800/60 whitespace-nowrap">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                    เลขที่เอกสาร
                  </th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                    ประเภทเอกสาร
                  </th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                    พนักงาน
                  </th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                    รายละเอียดคำขอ
                  </th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                    วันที่ยื่น
                  </th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                    สถานะ
                  </th>
                  <th className="sticky right-0 z-10 bg-gray-50 dark:bg-slate-800 shadow-[-8px_0_8px_-8px_rgba(15,23,42,0.15)] text-right px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                    ดำเนินการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedRequests.map((item) => {
                  const statusConf = getRowStatus(item);
                  const isPending = item.status === 'PENDING';

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        item.isMyTurnToApprove
                          ? 'bg-amber-50/30 hover:bg-amber-50/50'
                          : 'hover:bg-gray-50 dark:bg-slate-800/50'
                      }`}
                    >
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
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-100">
                            <Clock className="w-3.5 h-3.5 text-sky-500" />
                            ปรับเวลา
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

                      {/* 4. รายละเอียดคำขอ — แสดงเฉพาะชื่อประเภท (รายละเอียดดูได้ที่ "ดูเอกสาร") */}
                      <td className="px-4 py-3.5 text-xs">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          {item.subType}
                        </span>
                      </td>

                      {/* 5. วันที่ยื่น */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(item.submittedAt)}
                      </td>

                      {/* 6. สถานะ */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConf.color}`}
                        >
                          {statusConf.icon}
                          {statusConf.label}
                        </span>
                      </td>

                      {/* 7. ดำเนินการ — รวมปุ่มพิจารณา */}
                      <td className="sticky right-0 z-[1] bg-white dark:bg-slate-800 shadow-[-8px_0_8px_-8px_rgba(15,23,42,0.15)] px-5 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isPending && item.isMyTurnToApprove ? (
                            <ActionDropdown
                              align="right"
                              menuClassName="w-44 p-1.5 shadow-xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                              trigger={
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all shadow-xs cursor-pointer">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>พิจารณา</span>
                                  <ChevronDown className="w-3 h-3 opacity-80" />
                                </span>
                              }
                              items={[
                                {
                                  id: 'view',
                                  label: 'ดูเอกสาร',
                                  icon: <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400" />,
                                  onClick: () => openDocument(item),
                                },
                                { divider: true, label: '' },
                                {
                                  id: 'approve',
                                  label: 'อนุมัติ',
                                  icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
                                  className: '!text-emerald-700 dark:!text-emerald-300 hover:!bg-emerald-50 dark:hover:!bg-emerald-950/40 font-semibold',
                                  onClick: () => handleApproveItem(item),
                                },
                                {
                                  id: 'reject',
                                  label: 'ปฏิเสธ',
                                  icon: <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
                                  className: '!text-rose-700 dark:!text-rose-300 hover:!bg-rose-50 dark:hover:!bg-rose-950/40 font-semibold',
                                  onClick: () => handleRejectItem(item),
                                },
                              ]}
                            />
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => openDocument(item)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-all cursor-pointer"
                                title="ดูเอกสาร"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                                ดูเอกสาร
                              </button>

                              {(item.status === 'APPROVED' || item.hasAlreadyApproved) &&
                                item.docType !== 'BENEFIT' &&
                                item.docType !== 'TIME_ADJUST' &&
                                (item.docType !== 'LEAVE' || item.canCancel) && (
                                  <button
                                    onClick={() => handleCancelItem(item)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium transition-all cursor-pointer"
                                    title="ยกเลิกคำขอ"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                    ยกเลิกคำขอ
                                  </button>
                                )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile View: Stacked Approval Cards */}
          <div className="lg:hidden divide-y divide-gray-100">
            {paginatedRequests.map((item) => {
              const statusConf = getRowStatus(item);
              const isPending = item.status === 'PENDING';

              return (
                <div
                  key={item.id}
                  className={`p-4 space-y-3 transition-colors ${
                    item.isMyTurnToApprove ? 'bg-amber-50/20' : ''
                  }`}
                >
                  {/* Card Header: Type Badge, Request No, Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.docType === 'LEAVE' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-2xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            <ClipboardList className="w-3 h-3 text-indigo-500" />
                            คำขอลา
                          </span>
                        )}
                        {item.docType === 'CERTIFICATE' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <FileText className="w-3 h-3 text-emerald-500" />
                            หนังสือรับรอง
                          </span>
                        )}
                        {item.docType === 'RESIGNATION' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-2xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                            <FileText className="w-3 h-3 text-rose-500" />
                            คำขอลาออก
                          </span>
                        )}
                        {item.docType === 'GENERAL' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-2xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                            <FileText className="w-3 h-3 text-amber-500" />
                            เอกสารทั่วไป
                          </span>
                        )}
                        {item.docType === 'BENEFIT' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-2xs font-semibold bg-teal-50 text-teal-700 border border-teal-100">
                            <FileText className="w-3 h-3 text-teal-500" />
                            เบิกสวัสดิการ
                          </span>
                        )}
                        {item.docType === 'TIME_ADJUST' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-2xs font-semibold bg-sky-50 text-sky-700 border border-sky-100">
                            <Clock className="w-3 h-3 text-sky-500" />
                            ปรับเวลา
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => openDocument(item)}
                          title="ดูเอกสาร"
                          className="font-mono font-bold text-xs text-primary dark:text-blue-300 hover:underline underline-offset-2 cursor-pointer"
                        >
                          {item.requestNo}
                        </button>
                      </div>
                      <span className="text-2xs text-slate-400 block font-mono">
                        ยื่นเมื่อ: {formatDate(item.submittedAt)}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border shrink-0 ${statusConf.color}`}
                    >
                      {statusConf.icon}
                      {statusConf.label}
                    </span>
                  </div>

                  {/* Card Body: Employee & Request Details */}
                  <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                      <span>{item.employeeName}</span>
                      {item.departmentName && item.departmentName !== '-' && (
                        <span className="text-[11px] text-slate-500 font-normal">• {item.departmentName}</span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold bg-slate-200/70 text-slate-700">
                        {item.subType}
                      </div>
                    </div>

                    {item.documents && item.documents.length > 0 && (
                      <div className="flex items-center gap-1 pt-1 border-t border-slate-200/60 flex-wrap">
                        {item.documents.map((doc) => (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() =>
                              handleDownloadDoc(
                                typeof item.rawId === 'number' ? item.rawId : 0,
                                doc.id,
                                doc.fileName || 'document'
                              )
                            }
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span className="max-w-28 truncate">{doc.fileName}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="space-y-2 pt-1">
                    {/* Approve / Reject primary buttons when it's user's turn */}
                    {isPending && item.isMyTurnToApprove && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            if (item.docType === 'LEAVE') {
                              openApproveDialog(item.leaveRaw!);
                            } else if (item.docType === 'CERTIFICATE') {
                              openApproveCertDialog(item.certRaw!);
                            } else if (item.docType === 'RESIGNATION') {
                              openApproveResignDialog(item.resignationRaw!);
                            } else if (item.docType === 'GENERAL') {
                              openApproveGeneralDialog(item.generalRaw!);
                            } else if (item.docType === 'TIME_ADJUST') {
                              setTimeAdjustReview({ adj: item.timeAdjustRaw!, mode: 'approve' });
                            } else if (item.docType === 'BENEFIT') {
                              setBenefitReview({ claim: item.benefitRaw!, mode: 'approve' });
                            }
                          }}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-xs transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          อนุมัติ
                        </button>
                        <button
                          onClick={() => {
                            if (item.docType === 'LEAVE') {
                              openRejectDialog(item.leaveRaw!);
                            } else if (item.docType === 'CERTIFICATE') {
                              openRejectCertDialog(item.certRaw!);
                            } else if (item.docType === 'RESIGNATION') {
                              openRejectResignDialog(item.resignationRaw!);
                            } else if (item.docType === 'GENERAL') {
                              openRejectGeneralDialog(item.generalRaw!);
                            } else if (item.docType === 'TIME_ADJUST') {
                              setTimeAdjustReview({ adj: item.timeAdjustRaw!, mode: 'reject' });
                            } else if (item.docType === 'BENEFIT') {
                              setBenefitReview({ claim: item.benefitRaw!, mode: 'reject' });
                            }
                          }}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-xs transition-all"
                        >
                          <XCircle className="w-4 h-4" />
                          ปฏิเสธ
                        </button>
                      </div>
                    )}

                    {/* Secondary action: View document */}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => openDocument(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        ดูตัวอย่างเอกสาร
                      </button>

                      {(item.status === 'APPROVED' || item.hasAlreadyApproved) && !(isPending && item.isMyTurnToApprove) && item.docType !== 'BENEFIT' && item.docType !== 'TIME_ADJUST' && (item.docType !== 'LEAVE' || item.canCancel) && (
                        <button
                          onClick={() => {
                            if (item.docType === 'LEAVE') {
                              handleCancelLeave(item.leaveRaw!);
                            } else if (item.docType === 'CERTIFICATE') {
                              handleCancelCert(item.certRaw!);
                            } else if (item.docType === 'RESIGNATION') {
                              handleCancelResign(item.resignationRaw!);
                            } else if (item.docType === 'GENERAL') {
                              handleCancelGeneral(item.generalRaw!);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium transition-all"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          ยกเลิก
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {filteredRequests.length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-700/80 px-4 py-3 bg-white dark:bg-slate-800">
              <TablePagination
                total={filteredRequests.length}
                page={safePage}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize: number) => {
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            </div>
          )}
        </>
      )
    }
      </div>

      {/* ─── Modal ยืนยันการอนุมัติคำขอลา ─── */}
      {selectedForApprove && (
        <ApprovalActionModal
          isOpen={!!selectedForApprove}
          onClose={() => setSelectedForApprove(null)}
          iconType="leave"
          title="อนุมัติคำขอลา"
          code={selectedForApprove.requestNo}
          requesterName={`${selectedForApprove.employeeName}${selectedForApprove.employeeCode ? ` (${selectedForApprove.employeeCode})` : ''}`}
          categoryLabel="การลา"
          heroTitle={`${selectedForApprove.leaveTypeName} · ${Number(selectedForApprove.leaveDays ?? selectedForApprove.totalDays ?? 1)} วัน`}
          heroSubtitle={formatThaiDateRange(
            selectedForApprove.startDate ?? selectedForApprove.startDatetime,
            selectedForApprove.endDate ?? selectedForApprove.endDatetime
          )}
          detailRows={[
            {
              label: 'ยื่นคำขอเมื่อ',
              value: `${formatThaiDate(selectedForApprove.submittedAt)}${getNoticeDaysText(
                selectedForApprove.startDate ?? selectedForApprove.startDatetime,
                selectedForApprove.submittedAt
              )}`,
            },
            ...(selectedForApprove.reason
              ? [
                  {
                    label: 'เหตุผล',
                    value: selectedForApprove.reason,
                  },
                ]
              : []),
            ...(selectedForApprove.contactDuringLeave
              ? [
                  {
                    label: 'ติดต่อระหว่างลา',
                    value: selectedForApprove.contactDuringLeave,
                  },
                ]
              : []),
            {
              label: 'สังกัด / ตำแหน่ง',
              value: `${selectedForApprove.departmentName || '-'}${selectedForApprove.positionName ? ` · ${selectedForApprove.positionName}` : ''}`,
            },
          ]}
          comment={approveComment}
          onCommentChange={setApproveComment}
          onSubmit={submitApprove}
          isSubmitting={isSubmittingApprove}
          variant="approve"
        />
      )}

      {/* ─── Modal ปฏิเสธคำขอลา ─── */}
      {selectedForReject && (
        <ApprovalActionModal
          isOpen={!!selectedForReject}
          onClose={() => setSelectedForReject(null)}
          iconType="leave"
          title="ปฏิเสธคำขอลา"
          code={selectedForReject.requestNo}
          requesterName={`${selectedForReject.employeeName}${selectedForReject.employeeCode ? ` (${selectedForReject.employeeCode})` : ''}`}
          categoryLabel="การลา"
          heroTitle={`${selectedForReject.leaveTypeName} · ${Number(selectedForReject.leaveDays ?? selectedForReject.totalDays ?? 1)} วัน`}
          heroSubtitle={formatThaiDateRange(
            selectedForReject.startDate ?? selectedForReject.startDatetime,
            selectedForReject.endDate ?? selectedForReject.endDatetime
          )}
          detailRows={[
            {
              label: 'ยื่นคำขอเมื่อ',
              value: `${formatThaiDate(selectedForReject.submittedAt)}${getNoticeDaysText(
                selectedForReject.startDate ?? selectedForReject.startDatetime,
                selectedForReject.submittedAt
              )}`,
            },
            ...(selectedForReject.reason
              ? [
                  {
                    label: 'เหตุผล',
                    value: selectedForReject.reason,
                  },
                ]
              : []),
            {
              label: 'สังกัด / ตำแหน่ง',
              value: `${selectedForReject.departmentName || '-'}${selectedForReject.positionName ? ` · ${selectedForReject.positionName}` : ''}`,
            },
          ]}
          quickRejectSlot={
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  เลือกเหตุผลแบบรวดเร็ว
                </label>
                {rejectReason && (
                  <button
                    type="button"
                    onClick={() => setRejectReason('')}
                    className="text-[11px] text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    ล้างข้อความ
                  </button>
                )}
              </div>
              <LeaveRejectReasonChips
                warnings={rejectLeaveDecisionData.warnings}
                value={rejectReason}
                onChange={setRejectReason}
              />
            </div>
          }
          comment={rejectReason}
          onCommentChange={setRejectReason}
          commentLabel="เหตุผลในการปฏิเสธ"
          commentPlaceholder="ระบุเหตุผลในการปฏิเสธคำขอ เพื่อแจ้งให้พนักงานทราบ..."
          commentRequired
          onSubmit={submitReject}
          isSubmitting={isSubmittingReject}
          variant="reject"
          submitText="ยืนยันการปฏิเสธ"
        />
      )}

      {/* ─── Modal ยืนยันการอนุมัติคำขอหนังสือรับรอง ─── */}
      {selectedCertForApprove && (
        <ApprovalActionModal
          isOpen={!!selectedCertForApprove}
          onClose={() => setSelectedCertForApprove(null)}
          iconType="certificate"
          title="อนุมัติคำขอหนังสือรับรอง"
          code={`CERT-${String(selectedCertForApprove.id).padStart(4, '0')}`}
          requesterName={`${selectedCertForApprove.employeeName}${selectedCertForApprove.employeeCode ? ` (${selectedCertForApprove.employeeCode})` : ''}`}
          categoryLabel="เอกสารที่ขอ"
          heroTitle={selectedCertForApprove.certificateName || 'หนังสือรับรอง'}
          detailRows={[
            {
              label: 'วัตถุประสงค์',
              value: selectedCertForApprove.purpose || '[วัตถุประสงค์ที่ผู้ขอระบุ]',
            },
            {
              label: 'สังกัด / ตำแหน่ง',
              value: `${selectedCertForApprove.departmentName || '-'}${selectedCertForApprove.positionName ? ` · ${selectedCertForApprove.positionName}` : ''}`,
            },
            {
              label: 'ยื่นคำขอเมื่อ',
              value: formatThaiDate(selectedCertForApprove.requestedAt),
            },
          ]}
          comment={approveCertComment}
          onCommentChange={setApproveCertComment}
          onSubmit={submitCertApprove}
          isSubmitting={isSubmittingCertApprove}
          variant="approve"
        />
      )}

      {/* ─── Modal ปฏิเสธคำขอหนังสือรับรอง ─── */}
      {selectedCertForReject && (
        <ApprovalActionModal
          isOpen={!!selectedCertForReject}
          onClose={() => setSelectedCertForReject(null)}
          iconType="certificate"
          title="ปฏิเสธคำขอหนังสือรับรอง"
          code={`CERT-${String(selectedCertForReject.id).padStart(4, '0')}`}
          requesterName={`${selectedCertForReject.employeeName}${selectedCertForReject.employeeCode ? ` (${selectedCertForReject.employeeCode})` : ''}`}
          categoryLabel="เอกสารที่ขอ"
          heroTitle={selectedCertForReject.certificateName || 'หนังสือรับรอง'}
          detailRows={[
            {
              label: 'วัตถุประสงค์',
              value: selectedCertForReject.purpose || '[วัตถุประสงค์ที่ผู้ขอระบุ]',
            },
            {
              label: 'สังกัด / ตำแหน่ง',
              value: `${selectedCertForReject.departmentName || '-'}${selectedCertForReject.positionName ? ` · ${selectedCertForReject.positionName}` : ''}`,
            },
            {
              label: 'ยื่นคำขอเมื่อ',
              value: formatThaiDate(selectedCertForReject.requestedAt),
            },
          ]}
          quickRejectSlot={
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  เลือกเหตุผลแบบรวดเร็ว
                </label>
                {rejectCertReason && (
                  <button
                    type="button"
                    onClick={() => setRejectCertReason('')}
                    className="text-[11px] text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    ล้างข้อความ
                  </button>
                )}
              </div>
              <CertRejectReasonChips value={rejectCertReason} onChange={setRejectCertReason} />
            </div>
          }
          comment={rejectCertReason}
          onCommentChange={setRejectCertReason}
          commentLabel="เหตุผลในการปฏิเสธ"
          commentPlaceholder="ระบุเหตุผลในการปฏิเสธคำขอ เพื่อแจ้งให้พนักงานทราบ..."
          commentRequired
          onSubmit={submitCertReject}
          isSubmitting={isSubmittingCertReject}
          variant="reject"
          submitText="ยืนยันการปฏิเสธ"
        />
      )}

      {/* ─── Modal ผังขั้นตอนการอนุมัติคำขอลา (Leave Approval Timeline) ─── */}
      <ApprovalTimelineModal
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        leaveRequest={selectedForTimeline}
      />

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
        canApproveCurrentStep={!!selectedCertForPreview?.isMyTurnToApprove}
      />

      {/* ─── Modal ยืนยันการอนุมัติคำขอลาออก ─── */}
      {selectedResignForApprove && (
        <ApprovalActionModal
          isOpen={!!selectedResignForApprove}
          onClose={() => setSelectedResignForApprove(null)}
          iconType="resignation"
          title="อนุมัติคำขอลาออก"
          code={selectedResignForApprove.requestNo || `RESIGN-${String(selectedResignForApprove.id).padStart(4, '0')}`}
          requesterName={`${selectedResignForApprove.employeeName}${selectedResignForApprove.employeeCode ? ` (${selectedResignForApprove.employeeCode})` : ''}`}
          categoryLabel="การลาออก"
          heroTitle={`วันทำงานสุดท้าย: ${formatThaiDate(selectedResignForApprove.requestedLastWorkingDate)}`}
          detailRows={[
            {
              label: 'เหตุผลการลาออก',
              value: selectedResignForApprove.reason || '-',
            },
            ...(selectedResignForApprove.noticePeriodDays !== undefined && selectedResignForApprove.noticePeriodDays !== null
              ? [
                  {
                    label: 'แจ้งล่วงหน้า',
                    value: `${selectedResignForApprove.noticePeriodDays} วัน`,
                  },
                ]
              : []),
            {
              label: 'สังกัด / ตำแหน่ง',
              value: `${selectedResignForApprove.departmentName || '-'}${selectedResignForApprove.positionName ? ` · ${selectedResignForApprove.positionName}` : ''}`,
            },
            {
              label: 'ยื่นคำขอเมื่อ',
              value: formatThaiDate(selectedResignForApprove.submittedAt),
            },
          ]}
          comment={approveResignComment}
          onCommentChange={setApproveResignComment}
          onSubmit={submitResignApprove}
          isSubmitting={isSubmittingResignApprove}
          variant="approve"
        />
      )}

      {/* ─── Modal ปฏิเสธคำขอลาออก ─── */}
      {selectedResignForReject && (
        <ApprovalActionModal
          isOpen={!!selectedResignForReject}
          onClose={() => setSelectedResignForReject(null)}
          iconType="resignation"
          title="ปฏิเสธคำขอลาออก"
          code={selectedResignForReject.requestNo || `RESIGN-${String(selectedResignForReject.id).padStart(4, '0')}`}
          requesterName={`${selectedResignForReject.employeeName}${selectedResignForReject.employeeCode ? ` (${selectedResignForReject.employeeCode})` : ''}`}
          categoryLabel="การลาออก"
          heroTitle={`วันทำงานสุดท้าย: ${formatThaiDate(selectedResignForReject.requestedLastWorkingDate)}`}
          detailRows={[
            {
              label: 'เหตุผลการลาออก',
              value: selectedResignForReject.reason || '-',
            },
            {
              label: 'สังกัด / ตำแหน่ง',
              value: `${selectedResignForReject.departmentName || '-'}${selectedResignForReject.positionName ? ` · ${selectedResignForReject.positionName}` : ''}`,
            },
            {
              label: 'ยื่นคำขอเมื่อ',
              value: formatThaiDate(selectedResignForReject.submittedAt),
            },
          ]}
          quickRejectSlot={
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  เลือกเหตุผลแบบรวดเร็ว
                </label>
                {rejectResignReason && (
                  <button
                    type="button"
                    onClick={() => setRejectResignReason('')}
                    className="text-[11px] text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    ล้างข้อความ
                  </button>
                )}
              </div>
              <ResignRejectReasonChips
                isShortNotice={(selectedResignForReject.noticePeriodDays ?? 30) < 30}
                value={rejectResignReason}
                onChange={setRejectResignReason}
              />
            </div>
          }
          comment={rejectResignReason}
          onCommentChange={setRejectResignReason}
          commentLabel="เหตุผลในการปฏิเสธ"
          commentPlaceholder="ระบุเหตุผลในการปฏิเสธคำขอลาออก..."
          commentRequired
          onSubmit={submitResignReject}
          isSubmitting={isSubmittingResignReject}
          variant="reject"
          submitText="ยืนยันการปฏิเสธ"
        />
      )}

      {/* ─── Modal ดูตัวอย่างหนังสือขอลาออก (Resignation Preview) ─── */}
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

      {/* ─── Modal ยืนยันการอนุมัติคำร้องเอกสารทั่วไป ─── */}
      {selectedGeneralForApprove && (
        <ApprovalActionModal
          isOpen={!!selectedGeneralForApprove}
          onClose={() => setSelectedGeneralForApprove(null)}
          iconType="general"
          title="อนุมัติคำร้องเอกสารทั่วไป"
          code={selectedGeneralForApprove.requestNo || `DOC-${String(selectedGeneralForApprove.id).padStart(4, '0')}`}
          requesterName={`${selectedGeneralForApprove.employeeName}${selectedGeneralForApprove.employeeCode ? ` (${selectedGeneralForApprove.employeeCode})` : ''}`}
          categoryLabel="ประเภทคำร้อง"
          heroTitle={selectedGeneralForApprove.documentType || 'คำร้องทั่วไป'}
          heroSubtitle={undefined}
          detailRows={[
            {
              label: 'วัตถุประสงค์ / รายละเอียด',
              value: selectedGeneralForApprove.purpose || selectedGeneralForApprove.notes || '-',
            },
            {
              label: 'สังกัด / ตำแหน่ง',
              value: `${selectedGeneralForApprove.departmentName || '-'}${selectedGeneralForApprove.positionName ? ` · ${selectedGeneralForApprove.positionName}` : ''}`,
            },
            {
              label: 'ยื่นคำขอเมื่อ',
              value: formatThaiDate(selectedGeneralForApprove.submittedAt),
            },
          ]}
          attachments={
            selectedGeneralForApprove.fileName
              ? [
                  {
                    name: selectedGeneralForApprove.fileName,
                    onOpen: async () => {
                      try {
                        const blob = await generalDocumentService.downloadAttachment(selectedGeneralForApprove.id);
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = selectedGeneralForApprove.fileName || 'attachment';
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch {
                        showToast('ไม่สามารถดาวน์โหลดไฟล์แนบได้', 'error');
                      }
                    },
                  },
                ]
              : undefined
          }
          comment={approveGeneralComment}
          onCommentChange={setApproveGeneralComment}
          onSubmit={submitGeneralApprove}
          isSubmitting={isSubmittingGeneralApprove}
          variant="approve"
        />
      )}

      {/* ─── Modal ปฏิเสธคำร้องเอกสารทั่วไป ─── */}
      {selectedGeneralForReject && (
        <ApprovalActionModal
          isOpen={!!selectedGeneralForReject}
          onClose={() => setSelectedGeneralForReject(null)}
          iconType="general"
          title="ปฏิเสธคำร้องเอกสารทั่วไป"
          code={selectedGeneralForReject.requestNo || `DOC-${String(selectedGeneralForReject.id).padStart(4, '0')}`}
          requesterName={`${selectedGeneralForReject.employeeName}${selectedGeneralForReject.employeeCode ? ` (${selectedGeneralForReject.employeeCode})` : ''}`}
          categoryLabel="ประเภทคำร้อง"
          heroTitle={selectedGeneralForReject.documentType || 'คำร้องทั่วไป'}
          heroSubtitle={undefined}
          detailRows={[
            {
              label: 'วัตถุประสงค์ / รายละเอียด',
              value: selectedGeneralForReject.purpose || selectedGeneralForReject.notes || '-',
            },
            {
              label: 'สังกัด / ตำแหน่ง',
              value: `${selectedGeneralForReject.departmentName || '-'}${selectedGeneralForReject.positionName ? ` · ${selectedGeneralForReject.positionName}` : ''}`,
            },
            {
              label: 'ยื่นคำขอเมื่อ',
              value: formatThaiDate(selectedGeneralForReject.submittedAt),
            },
          ]}
          quickRejectSlot={
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  เลือกเหตุผลแบบรวดเร็ว
                </label>
                {rejectGeneralReason && (
                  <button
                    type="button"
                    onClick={() => setRejectGeneralReason('')}
                    className="text-[11px] text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    ล้างข้อความ
                  </button>
                )}
              </div>
              <GeneralRejectReasonChips value={rejectGeneralReason} onChange={setRejectGeneralReason} />
            </div>
          }
          comment={rejectGeneralReason}
          onCommentChange={setRejectGeneralReason}
          commentLabel="เหตุผลในการปฏิเสธ"
          commentPlaceholder="ระบุเหตุผลในการปฏิเสธคำร้อง..."
          commentRequired
          onSubmit={submitGeneralReject}
          isSubmitting={isSubmittingGeneralReject}
          variant="reject"
          submitText="ยืนยันการปฏิเสธ"
        />
      )}

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

      {/* ─── Modal คำขอเบิกสวัสดิการ (ดู / อนุมัติ / ไม่อนุมัติ) ─── */}
      <BenefitClaimReviewModal
        claim={benefitReview?.claim ?? null}
        mode={benefitReview?.mode ?? 'view'}
        onClose={() => setBenefitReview(null)}
        onDone={(msg) => {
          setBenefitReview(null);
          showToast(msg);
          fetchData();
        }}
      />

      {/* ─── Modal คำขอปรับเวลาเข้า-ออก (ดู / อนุมัติ / ปฏิเสธ) ─── */}
      {timeAdjustReview && (() => {
        const adj = timeAdjustReview.adj;
        const mode = timeAdjustReview.mode;
        const canAct = mode !== 'view' && adj.status === 'PENDING';
        const isApprove = mode === 'approve';
        const isReject = mode === 'reject';
        const title = isApprove
          ? 'อนุมัติคำขอปรับเวลาเข้า-ออก'
          : isReject
            ? 'ปฏิเสธคำขอปรับเวลาเข้า-ออก'
            : 'คำขอปรับเวลาเข้า-ออก';

        return (
          <ApprovalActionModal
            isOpen={!!timeAdjustReview}
            onClose={() => setTimeAdjustReview(null)}
            iconType="time_adjust"
            title={title}
            code={`TA-${adj.id}`}
            requesterName={`${adj.employeeName}${adj.departmentName ? ` (${adj.departmentName})` : ''}`}
            categoryLabel="การปรับเวลาเข้า-ออก"
            heroTitle={`วันที่ ${formatDate(adj.workDate)}${adj.shiftName ? ` · ${adj.shiftName}` : ''}`}
            heroSubtitle={`ขอปรับเป็น: เข้า ${formatTime(adj.adjustedClockIn)} – ออก ${formatTime(adj.adjustedClockOut)}`}
            detailRows={[
              {
                label: 'เวลาเดิม',
                value: `เข้า ${formatTime(adj.originalClockIn)} – ออก ${formatTime(adj.originalClockOut)}`,
              },
              ...(adj.reason
                ? [
                    {
                      label: 'เหตุผล',
                      value: adj.reason,
                    },
                  ]
                : []),
              {
                label: 'สังกัด / ตำแหน่ง',
                value: `${adj.departmentName || '-'}${adj.positionName ? ` · ${adj.positionName}` : ''}`,
              },
              {
                label: 'ยื่นคำขอเมื่อ',
                value: `${formatDate(adj.createdAt)} ${formatTime(adj.createdAt)} น.`,
              },
              ...(adj.reviewedAt
                ? [
                    {
                      label: 'พิจารณาโดย',
                      value: `${adj.reviewedByEmployeeName || '-'} • ${formatDate(adj.reviewedAt)}`,
                    },
                  ]
                : []),
            ]}
            onSubmit={canAct ? () => submitTimeAdjustReview(isReject ? 'REJECTED' : 'APPROVED') : undefined}
            isSubmitting={isSubmittingTimeAdjust}
            submitText={isReject ? 'ยืนยันการปฏิเสธ' : 'อนุมัติ'}
            cancelText={canAct ? 'ยกเลิก' : 'ปิด'}
            variant={isReject ? 'reject' : isApprove ? 'approve' : 'view'}
          />
        );
      })()}

      {/* Confirm Modal ทั่วไป */}
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

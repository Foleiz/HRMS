'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { LeaveRequest, LeaveStats } from '@/types/leave';
import { certificateService } from '@/services/certificateService';
import { CertificateRequest } from '@/types/certificates';
import { CertificatePreviewModal } from '@/components/documents/CertificatePreviewModal';
import { ConfirmModal, ConfirmType } from '@/components/ui/ConfirmModal';
import { ApprovalNavTabs } from '@/components/approvals/ApprovalNavTabs';
import { ApprovalTimelineModal } from '@/components/approvals/ApprovalTimelineModal';
import { useBreadcrumb } from '@/context/BreadcrumbContext';

// ─── ฟังก์ชันช่วย & โครงสร้างข้อมูล ──────────────────────────────

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
  CANCELLED: { label: 'ยกเลิกแล้ว', color: 'bg-gray-100 text-gray-500 border-gray-200', icon: <Ban className="w-3.5 h-3.5" /> },
};

export interface UnifiedApprovalItem {
  id: string;
  rawId: number;
  docType: 'LEAVE' | 'CERTIFICATE';
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
}

// ─── Component ────────────────────────────────────────────────

export default function LeaveRequestsApprovalPage() {
  const { setBreadcrumb } = useBreadcrumb();

  // Leave Requests State
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveStats, setLeaveStats] = useState<LeaveStats | null>(null);

  // Certificate Requests State
  const [certificateRequests, setCertificateRequests] = useState<CertificateRequest[]>([]);

  const [loading, setLoading] = useState(true);

  // Sync breadcrumb
  useEffect(() => {
    setBreadcrumb({ section: 'การอนุมัติ', page: 'เอกสารรอดำเนินการ' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [docTypeFilter, setDocTypeFilter] = useState<'ALL' | 'LEAVE' | 'CERTIFICATE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Leave Approval Modals State
  const [selectedForApprove, setSelectedForApprove] = useState<LeaveRequest | null>(null);
  const [approveComment, setApproveComment] = useState('');
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);

  const [selectedForReject, setSelectedForReject] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Leave Timeline Modal State
  const [selectedForTimeline, setSelectedForTimeline] = useState<LeaveRequest | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

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
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const closeConfirm = () => setConfirmConfig((p) => ({ ...p, isOpen: false }));

  // ─── Fetch ──────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqData, statsData, certData] = await Promise.all([
        leaveService.getLeaveRequests({ status: statusFilter || undefined, pageSize: 200 }),
        leaveService.getLeaveStats(),
        certificateService.getAllRequests(statusFilter || undefined).catch((err) => {
          console.error('Failed to fetch certificate requests', err);
          return [] as CertificateRequest[];
        }),
      ]);
      setLeaveRequests(reqData);
      setLeaveStats(statsData);
      setCertificateRequests(certData);
    } catch (err) {
      console.error('Failed to fetch leave/cert requests', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

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
        currentApproverDisplay: req.currentApproverDisplay,
        isMyTurnToApprove: !!req.isMyTurnToApprove,
        hasAlreadyApproved: !!req.hasAlreadyApproved,
        approvedByName: req.approvedByName,
        approvedAt: req.approvedAt,
        canCancel: req.status === 'APPROVED' || !!req.hasAlreadyApproved,
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
        positionName: cert.positionName || '-',
        subType: cert.certificateName || 'หนังสือรับรอง',
        details: cert.purpose ? `วัตถุประสงค์: ${cert.purpose}` : 'ขอหนังสือรับรอง',
        submittedAt: cert.requestedAt || null,
        status: cert.status,
        currentStepNo: cert.currentStepNo,
        totalSteps: cert.totalSteps,
        currentApproverDisplay: cert.currentApproverDisplay,
        isMyTurnToApprove: !!cert.isMyTurnToApprove,
        hasAlreadyApproved: !!cert.hasAlreadyApproved,
        approvedByName: cert.approvedByName,
        approvedAt: cert.approvedAt,
        canCancel: !!cert.canCancel,
        certRaw: cert,
      });
    });

    // เรียงลำดับ: รายการที่ถึงคิวเราอนุมัติขึ้นก่อน จากนั้นเรียงตามวันที่ยื่นล่าสุด
    return list.sort((a, b) => {
      if (a.isMyTurnToApprove && !b.isMyTurnToApprove) return -1;
      if (!a.isMyTurnToApprove && b.isMyTurnToApprove) return 1;
      const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      return b.rawId - a.rawId;
    });
  }, [leaveRequests, certificateRequests]);

  const filteredRequests = useMemo(() => {
    return unifiedRequests.filter((item) => {
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
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการอนุมัติ');
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
    setIsSubmittingReject(true);
    try {
      await leaveService.rejectLeaveRequest(selectedForReject.id, rejectReason.trim() || undefined);
      setSelectedForReject(null);
      showToast('ปฏิเสธคำขอลาสำเร็จ');
      fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการปฏิเสธ');
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
          showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาด');
        }
      },
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
      showToast('ไม่สามารถดาวน์โหลดเอกสารได้');
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
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการอนุมัติคำขอ');
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
      showToast('กรุณาระบุเหตุผลในการปฏิเสธ');
      return;
    }
    setIsSubmittingCertReject(true);
    try {
      await certificateService.rejectRequest(selectedCertForReject.id, rejectCertReason.trim());
      setSelectedCertForReject(null);
      showToast('ปฏิเสธคำขอหนังสือรับรองสำเร็จ');
      fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการปฏิเสธคำขอ');
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
          showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการยกเลิกคำขอ');
        }
      },
    });
  };

  // ─── Render ──────────────────────────────────────────────────

  const totalPending =
    (leaveStats?.pendingCount ?? leaveStats?.pendingRequestsCount ?? leaveRequests.filter((r) => r.status === 'PENDING').length) +
    certificateRequests.filter((r) => r.status === 'PENDING').length;

  const totalApproved =
    (leaveStats?.approvedCount ?? leaveStats?.approvedThisMonthCount ?? leaveRequests.filter((r) => r.status === 'APPROVED').length) +
    certificateRequests.filter((r) => r.status === 'APPROVED' || r.status === 'ISSUED').length;

  const totalRejected =
    (leaveStats?.rejectedCount ?? leaveStats?.rejectedThisMonthCount ?? leaveRequests.filter((r) => r.status === 'REJECTED').length) +
    certificateRequests.filter((r) => r.status === 'REJECTED').length;

  const totalCancelled =
    (leaveStats?.cancelledCount ?? leaveRequests.filter((r) => r.status === 'CANCELLED').length) +
    certificateRequests.filter((r) => r.status === 'CANCELLED').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Sub-menu Tabs: เอกสารรอดำเนินการ | ประวัติเอกสาร */}
      <ApprovalNavTabs currentSubTitle="เอกสารรอดำเนินการ" />

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'รอการอนุมัติ', value: totalPending, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'อนุมัติแล้ว', value: totalApproved, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'ปฏิเสธแล้ว', value: totalRejected, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'ยกเลิกแล้ว', value: totalCancelled, color: 'text-gray-500', bg: 'bg-gray-50' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl border border-white p-4 shadow-2xs`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters & Control Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search (อยู่ซ้ายสุด กำหนดความกว้างพอดีๆ) */}
            <div className="relative w-72 sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="ค้นหาชื่อพนักงาน, เลขที่เอกสาร, ประเภทคำขอ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0B2046] transition-all"
              />
            </div>

            {/* Document Type filter (ตัวกรองประเภทเอกสาร) */}
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={docTypeFilter}
                onChange={(e) => setDocTypeFilter(e.target.value as any)}
                className="pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:ring-2 focus:ring-[#0B2046] appearance-none cursor-pointer"
              >
                <option value="ALL">ทุกประเภทเอกสาร</option>
                <option value="LEAVE">คำขอลา</option>
                <option value="CERTIFICATE">คำขอหนังสือรับรอง</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Status filter (ปุ่มกรองสถานะ) */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:ring-2 focus:ring-[#0B2046] appearance-none cursor-pointer"
              >
                <option value="">ทุกสถานะ</option>
                <option value="PENDING">รอการอนุมัติ</option>
                <option value="APPROVED">อนุมัติแล้ว</option>
                <option value="REJECTED">ปฏิเสธแล้ว</option>
                <option value="CANCELLED">ยกเลิกแล้ว</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
            พบ {filteredRequests.length} รายการ
          </span>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 text-white rounded-xl text-sm shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toast}
        </div>
      )}

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400">
            <div className="inline-flex items-center gap-2 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-[#0B2046]" />
              กำลังโหลดรายการ...
            </div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-20 text-center">
            <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">ไม่พบเอกสารสำหรับเงื่อนไขที่เลือก</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 whitespace-nowrap">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    เลขที่เอกสาร
                  </th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    ประเภทเอกสาร
                  </th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    พนักงาน
                  </th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    รายละเอียดคำขอ
                  </th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    วันที่ยื่น
                  </th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    สถานะ
                  </th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    ดำเนินการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRequests.map((item) => {
                  const statusConf = STATUS_CONFIG[item.status] ?? STATUS_CONFIG['PENDING'];
                  const isPending = item.status === 'PENDING';

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        item.isMyTurnToApprove
                          ? 'bg-amber-50/30 hover:bg-amber-50/50'
                          : 'hover:bg-gray-50/50'
                      }`}
                    >
                      {/* 1. เลขที่เอกสาร */}
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono font-semibold text-xs text-[#0B2046]">
                        {item.requestNo}
                      </td>

                      {/* 2. ประเภทเอกสาร */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {item.docType === 'LEAVE' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            <ClipboardList className="w-3.5 h-3.5 text-indigo-500" />
                            คำขอลา
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <FileText className="w-3.5 h-3.5 text-emerald-500" />
                            หนังสือรับรอง
                          </span>
                        )}
                      </td>

                      {/* 3. พนักงาน (ชื่อ-นามสกุล และ แผนก ไม่มีรูปโปรไฟล์) */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900">{item.employeeName}</span>
                          {item.departmentName && item.departmentName !== '-' && (
                            <span className="text-[11px] text-slate-500">• {item.departmentName}</span>
                          )}
                        </div>
                      </td>

                      {/* 4. รายละเอียดคำขอ */}
                      <td className="px-4 py-3.5 text-xs">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                              {item.subType}
                            </span>
                            <span className="text-slate-600 truncate max-w-xs">{item.details}</span>
                          </div>
                          {item.documents && item.documents.length > 0 && (
                            <div className="flex items-center gap-1 mt-0.5">
                              {item.documents.map((doc) => (
                                <button
                                  key={doc.id}
                                  type="button"
                                  onClick={() => handleDownloadDoc(item.rawId, doc.id, doc.fileName || 'document')}
                                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                >
                                  <Download className="w-3 h-3" />
                                  <span className="max-w-28 truncate">{doc.fileName}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 5. วันที่ยื่น */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500">
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

                      {/* 7. ดำเนินการ */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* 1. กรณีเป็นคิวของผู้ใช้นี้ในการพิจารณา */}
                          {isPending && item.isMyTurnToApprove && (
                            <>
                              <button
                                onClick={() => {
                                  if (item.docType === 'LEAVE') {
                                    openApproveDialog(item.leaveRaw!);
                                  } else {
                                    openApproveCertDialog(item.certRaw!);
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300 ring-offset-1 transition-all shadow-sm cursor-pointer"
                                title={`อนุมัติเอกสาร${item.docTypeName}`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                อนุมัติ
                              </button>
                              <button
                                onClick={() => {
                                  if (item.docType === 'LEAVE') {
                                    openRejectDialog(item.leaveRaw!);
                                  } else {
                                    openRejectCertDialog(item.certRaw!);
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer"
                                title={`ปฏิเสธคำขอ${item.docTypeName}`}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                ปฏิเสธ
                              </button>
                            </>
                          )}

                          {/* 2. กรณีผู้ใช้นี้ได้อนุมัติขั้นตอนนี้ไปแล้ว */}
                          {isPending && !item.isMyTurnToApprove && item.hasAlreadyApproved && (
                            <span
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                              title="คุณได้ทำการอนุมัติในขั้นตอนนี้เรียบร้อยแล้ว กำลังรอขั้นตอนถัดไป"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              คุณอนุมัติแล้ว
                            </span>
                          )}

                          {/* 3. กรณีเอกสารรออนุมัติ แต่ยังไม่ถึงคิวของผู้ใช้นี้ */}
                          {isPending && !item.isMyTurnToApprove && !item.hasAlreadyApproved && (
                            <span
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200"
                              title={`กำลังรอการพิจารณาจาก ${item.currentApproverDisplay || 'ขั้นตอนก่อนหน้า'}`}
                            >
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              รอคิวก่อนหน้า
                            </span>
                          )}

                          {/* 4. ดูเอกสาร */}
                          <button
                            type="button"
                            onClick={() => {
                              if (item.docType === 'LEAVE') {
                                setSelectedForTimeline(item.leaveRaw!);
                                setIsTimelineOpen(true);
                              } else {
                                setSelectedCertForPreview(item.certRaw!);
                                setIsCertPreviewOpen(true);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-all cursor-pointer"
                            title="ดูเอกสาร"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            ดูเอกสาร
                          </button>

                          {/* 5. ยกเลิกคำขอ — จะขึ้นก็ต่อเมื่อกดอนุมัติไปแล้ว */}
                          {(item.status === 'APPROVED' || item.hasAlreadyApproved) && (
                            <button
                              onClick={() => {
                                if (item.docType === 'LEAVE') {
                                  handleCancelLeave(item.leaveRaw!);
                                } else {
                                  handleCancelCert(item.certRaw!);
                                }
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium transition-all cursor-pointer"
                              title="ยกเลิกคำขอ"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              ยกเลิกคำขอ
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      }
      </div>

      {/* ─── Modal ยืนยันการอนุมัติคำขอลา ─── */}
      {selectedForApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">ยืนยันการอนุมัติคำขอลา</h3>
                <p className="text-xs text-slate-500">
                  {selectedForApprove.requestNo} • {selectedForApprove.employeeName}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">ประเภทการลา:</span>
                <span className="font-semibold text-slate-800">{selectedForApprove.leaveTypeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ช่วงเวลาลา:</span>
                <span className="font-medium text-slate-800">
                  {formatDate(selectedForApprove.startDate ?? selectedForApprove.startDatetime)} -{' '}
                  {formatDate(selectedForApprove.endDate ?? selectedForApprove.endDatetime)} ({selectedForApprove.leaveDays} วัน)
                </span>
              </div>
              {selectedForApprove.totalSteps && selectedForApprove.totalSteps > 0 && (
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">ขั้นตอนการอนุมัติ:</span>
                  <span className="font-bold text-[#0B2046]">
                    ขั้นที่ {selectedForApprove.currentStepNo ?? 1} จาก {selectedForApprove.totalSteps} ({selectedForApprove.currentApproverDisplay ?? ''})
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ความเห็นผู้อนุมัติ (ไม่บังคับ)
              </label>
              <textarea
                value={approveComment}
                onChange={(e) => setApproveComment(e.target.value)}
                placeholder="ระบุความเห็น ข้อความ หรือบันทึกเพิ่มเติม (ถ้ามี)..."
                rows={3}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2046] focus:bg-white transition-all outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedForApprove(null)}
                disabled={isSubmittingApprove}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={submitApprove}
                disabled={isSubmittingApprove}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
              >
                {isSubmittingApprove ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                ยืนยันการอนุมัติ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal ปฏิเสธคำขอลา ─── */}
      {selectedForReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">ปฏิเสธคำขอลา</h3>
                <p className="text-xs text-slate-500">
                  {selectedForReject.requestNo} • {selectedForReject.employeeName}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เหตุผลในการปฏิเสธ <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="ระบุเหตุผลในการปฏิเสธคำขอ เพื่อแจ้งให้พนักงานทราบ..."
                rows={3}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedForReject(null)}
                disabled={isSubmittingReject}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={submitReject}
                disabled={isSubmittingReject}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
              >
                {isSubmittingReject ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                ยืนยันการปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal ยืนยันการอนุมัติคำขอหนังสือรับรอง ─── */}
      {selectedCertForApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">ยืนยันการอนุมัติคำขอหนังสือรับรอง</h3>
                <p className="text-xs text-slate-500">
                  CERT-{String(selectedCertForApprove.id).padStart(4, '0')} • {selectedCertForApprove.employeeName}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">ประเภทหนังสือรับรอง:</span>
                <span className="font-semibold text-slate-800">{selectedCertForApprove.certificateName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">วัตถุประสงค์:</span>
                <span className="font-medium text-slate-800">{selectedCertForApprove.purpose || '-'}</span>
              </div>
              {selectedCertForApprove.totalSteps && selectedCertForApprove.totalSteps > 0 && (
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">ขั้นตอนการอนุมัติ:</span>
                  <span className="font-bold text-[#0B2046]">
                    ขั้นที่ {selectedCertForApprove.currentStepNo ?? 1} จาก {selectedCertForApprove.totalSteps} ({selectedCertForApprove.currentApproverDisplay ?? 'ฝ่ายบุคคล'})
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ความเห็นผู้อนุมัติ (ไม่บังคับ)
              </label>
              <textarea
                value={approveCertComment}
                onChange={(e) => setApproveCertComment(e.target.value)}
                placeholder="ระบุความเห็น ข้อความ หรือบันทึกเพิ่มเติม (ถ้ามี)..."
                rows={3}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2046] focus:bg-white transition-all outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedCertForApprove(null)}
                disabled={isSubmittingCertApprove}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={submitCertApprove}
                disabled={isSubmittingCertApprove}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
              >
                {isSubmittingCertApprove ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                ยืนยันการอนุมัติ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal ปฏิเสธคำขอหนังสือรับรอง ─── */}
      {selectedCertForReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">ปฏิเสธคำขอหนังสือรับรอง</h3>
                <p className="text-xs text-slate-500">
                  CERT-{String(selectedCertForReject.id).padStart(4, '0')} • {selectedCertForReject.employeeName}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เหตุผลในการปฏิเสธ <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={rejectCertReason}
                onChange={(e) => setRejectCertReason(e.target.value)}
                placeholder="ระบุเหตุผลในการปฏิเสธคำขอ เพื่อแจ้งให้พนักงานทราบ..."
                rows={3}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedCertForReject(null)}
                disabled={isSubmittingCertReject}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={submitCertReject}
                disabled={isSubmittingCertReject}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
              >
                {isSubmittingCertReject ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                ยืนยันการปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal ผังขั้นตอนการอนุมัติคำขอลา (Leave Approval Timeline) ─── */}
      <ApprovalTimelineModal
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        leaveRequest={selectedForTimeline}
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

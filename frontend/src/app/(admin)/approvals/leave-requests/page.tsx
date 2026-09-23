'use client';

import React, { useState, useEffect, useCallback } from 'react';
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

// ─── ฟังก์ชันช่วย ─────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────

export default function LeaveRequestsApprovalPage() {
  const { setBreadcrumb } = useBreadcrumb();
  
  // Document Type Tabs: 'LEAVE' | 'CERTIFICATE'
  const [activeDocType, setActiveDocType] = useState<'LEAVE' | 'CERTIFICATE'>('LEAVE');

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

      // ถ้าไม่มีคำขอลาที่รอการอนุมัติ แต่มีคำขอหนังสือรับรองที่ถึงคิวอนุมัติของผู้ใช้ ให้สลับแท็บไปที่หนังสือรับรองอัตโนมัติ
      if (
        reqData.filter((r) => r.status === 'PENDING').length === 0 &&
        certData.filter((c) => c.status === 'PENDING' && c.isMyTurnToApprove).length > 0
      ) {
        setActiveDocType('CERTIFICATE');
      }
    } catch (err) {
      console.error('Failed to fetch leave/cert requests', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Filter ─────────────────────────────────────────────────

  const filteredLeave = leaveRequests.filter((r) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.employeeName?.toLowerCase().includes(q) ||
      r.employeeCode?.toLowerCase().includes(q) ||
      r.leaveTypeName?.toLowerCase().includes(q) ||
      r.requestNo?.toLowerCase().includes(q)
    );
  });

  const filteredCert = certificateRequests.filter((r) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const docNo = `CERT-${String(r.id).padStart(4, '0')}`.toLowerCase();
    return (
      r.employeeName?.toLowerCase().includes(q) ||
      r.employeeCode?.toLowerCase().includes(q) ||
      r.certificateName?.toLowerCase().includes(q) ||
      r.purpose?.toLowerCase().includes(q) ||
      docNo.includes(q)
    );
  });

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

  const pendingLeaveCount = leaveRequests.filter((r) => r.status === 'PENDING').length;
  const pendingCertCount = certificateRequests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Sub-menu Tabs: เอกสารรอดำเนินการ | ประวัติเอกสาร | สายการอนุมัติ */}
      <ApprovalNavTabs currentSubTitle="เอกสารรอดำเนินการ" />

      {/* Document Type Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveDocType('LEAVE')}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeDocType === 'LEAVE'
              ? 'border-[#0B2046] text-[#0B2046]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>คำขอลา</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeDocType === 'LEAVE' ? 'bg-[#0B2046] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {pendingLeaveCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveDocType('CERTIFICATE')}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeDocType === 'CERTIFICATE'
              ? 'border-[#0B2046] text-[#0B2046]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>คำขอหนังสือรับรอง</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeDocType === 'CERTIFICATE' ? 'bg-[#0B2046] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {pendingCertCount}
          </span>
        </button>
      </div>

      {/* Stats Bar */}
      {activeDocType === 'LEAVE' && leaveStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'รอการอนุมัติ', value: (leaveStats.pendingCount ?? leaveStats.pendingRequestsCount) ?? 0, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'อนุมัติแล้ว', value: (leaveStats.approvedCount ?? leaveStats.approvedThisMonthCount) ?? 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'ปฏิเสธแล้ว', value: (leaveStats.rejectedCount ?? leaveStats.rejectedThisMonthCount) ?? 0, color: 'text-red-500', bg: 'bg-red-50' },
            { label: 'ยกเลิกแล้ว', value: (leaveStats.cancelledCount ?? 0) ?? 0, color: 'text-gray-500', bg: 'bg-gray-50' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-2xl border border-white p-4 shadow-2xs`}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {activeDocType === 'CERTIFICATE' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'รอการอนุมัติ', value: certificateRequests.filter((r) => r.status === 'PENDING').length, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'อนุมัติแล้ว', value: certificateRequests.filter((r) => r.status === 'APPROVED' || r.status === 'ISSUED').length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'ปฏิเสธแล้ว', value: certificateRequests.filter((r) => r.status === 'REJECTED').length, color: 'text-red-500', bg: 'bg-red-50' },
            { label: 'ยกเลิกแล้ว', value: certificateRequests.filter((r) => r.status === 'CANCELLED').length, color: 'text-gray-500', bg: 'bg-gray-50' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-2xl border border-white p-4 shadow-2xs`}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters & Control Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search (อยู่ซ้ายสุด กำหนดความกว้างพอดีๆ) */}
            <div className="relative w-72 sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder={
                  activeDocType === 'LEAVE'
                    ? 'ค้นหาชื่อพนักงาน, รหัสคำขอ, ประเภทลา...'
                    : 'ค้นหาชื่อพนักงาน, เลขที่คำขอ, หนังสือรับรอง, วัตถุประสงค์...'
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0B2046] transition-all"
              />
            </div>

            {/* Status filter (ปุ่มกรองสถานะ) */}
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:ring-2 focus:ring-[#0B2046] appearance-none cursor-pointer"
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
            พบ {activeDocType === 'LEAVE' ? filteredLeave.length : filteredCert.length} รายการ
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
        ) : activeDocType === 'LEAVE' ? (
          /* ─── ตารางคำขอลา ─── */
          filteredLeave.length === 0 ? (
            <div className="py-20 text-center">
              <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">ไม่พบคำขอลาสำหรับเงื่อนไขที่เลือก</p>
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
                      พนักงาน
                    </th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      ประเภทการลา
                    </th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      ช่วงวันที่ลา
                    </th>
                    <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      จำนวนวัน
                    </th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      สถานะ
                    </th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      เอกสารแนบ
                    </th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      ดำเนินการ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredLeave.map((req) => {
                    const statusConf = STATUS_CONFIG[req.status] ?? STATUS_CONFIG['PENDING'];
                    const isPending = req.status === 'PENDING';

                    return (
                      <tr
                        key={req.id}
                        className={`transition-colors ${
                          req.isMyTurnToApprove
                            ? 'bg-amber-50/30 hover:bg-amber-50/50'
                            : 'hover:bg-gray-50/50'
                        }`}
                      >
                        {/* 1. เลขที่เอกสาร */}
                        <td className="px-5 py-3.5 whitespace-nowrap font-mono font-semibold text-xs text-[#0B2046]">
                          {req.requestNo}
                        </td>

                        {/* 2. พนักงาน (ชื่อ-นามสกุล และ แผนก) */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900">{req.employeeName}</span>
                            {req.departmentName && req.departmentName !== '-' && (
                              <span className="text-[11px] text-slate-500">• {req.departmentName}</span>
                            )}
                          </div>
                        </td>

                        {/* 3. ประเภทการลา */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                            {req.leaveTypeName}
                          </span>
                        </td>

                        {/* 4. ช่วงวันที่ลา */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-600">
                          {formatDate(req.startDate ?? req.startDatetime)}
                          {(req.endDate ?? req.endDatetime) &&
                            (req.endDate ?? req.endDatetime) !== (req.startDate ?? req.startDatetime) && (
                              <span> - {formatDate(req.endDate ?? req.endDatetime)}</span>
                            )}
                        </td>

                        {/* 5. จำนวนวัน */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center">
                          <span className="font-bold text-slate-900 text-xs">{req.leaveDays}</span>
                          <span className="text-[11px] text-slate-400 ml-1">วัน</span>
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

                        {/* 7. เอกสารแนบ */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                          {req.documents && req.documents.length > 0 ? (
                            <div className="flex items-center gap-1.5">
                              {req.documents.map((doc) => (
                                <button
                                  key={doc.id}
                                  onClick={() => handleDownloadDoc(req.id, doc.id, doc.fileName || 'document')}
                                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span className="max-w-28 truncate">{doc.fileName}</span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300">ไม่มีเอกสาร</span>
                          )}
                        </td>

                        {/* 8. ดำเนินการ */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* 1. กรณีเป็นคิวของผู้ใช้นี้ในการพิจารณา */}
                            {isPending && req.isMyTurnToApprove && (
                              <>
                                <button
                                  onClick={() => openApproveDialog(req)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300 ring-offset-1 transition-all shadow-sm cursor-pointer"
                                  title="อนุมัติเอกสารคำขอลา"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  อนุมัติ
                                </button>
                                <button
                                  onClick={() => openRejectDialog(req)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer"
                                  title="ปฏิเสธคำขอลา"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  ปฏิเสธ
                                </button>
                              </>
                            )}

                            {/* 2. กรณีผู้ใช้นี้ได้อนุมัติขั้นตอนนี้ไปแล้ว */}
                            {isPending && !req.isMyTurnToApprove && req.hasAlreadyApproved && (
                              <span
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                title="คุณได้ทำการอนุมัติในขั้นตอนนี้เรียบร้อยแล้ว กำลังรอขั้นตอนถัดไป"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                คุณอนุมัติแล้ว
                              </span>
                            )}

                            {/* 3. กรณีเอกสารรออนุมัติ แต่ยังไม่ถึงคิวของผู้ใช้นี้ */}
                            {isPending && !req.isMyTurnToApprove && !req.hasAlreadyApproved && (
                              <span
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200"
                                title={`กำลังรอการพิจารณาจาก ${req.currentApproverDisplay || 'ขั้นตอนก่อนหน้า'}`}
                              >
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                รอคิวก่อนหน้า
                              </span>
                            )}

                            {/* 4. ดูเอกสาร */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedForTimeline(req);
                                setIsTimelineOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-all cursor-pointer"
                              title="ดูเอกสาร"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-600" />
                              ดูเอกสาร
                            </button>

                            {/* 5. ยกเลิกคำขอ — จะขึ้นก็ต่อเมื่อกดอนุมัติไปแล้ว */}
                            {(req.status === 'APPROVED' || req.hasAlreadyApproved) && (
                              <button
                                onClick={() => handleCancelLeave(req)}
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
        ) : (
          /* ─── ตารางคำขอหนังสือรับรอง ─── */
          filteredCert.length === 0 ? (
            <div className="py-20 text-center">
              <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">ไม่พบคำขอหนังสือรับรองสำหรับเงื่อนไขที่เลือก</p>
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
                      พนักงาน
                    </th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      ประเภทหนังสือรับรอง
                    </th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      วัตถุประสงค์
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
                  {filteredCert.map((req) => {
                    const statusConf = STATUS_CONFIG[req.status] ?? STATUS_CONFIG['PENDING'];
                    const isPending = req.status === 'PENDING';
                    const docNumber = `CERT-${String(req.id).padStart(4, '0')}`;

                    return (
                      <tr
                        key={req.id}
                        className={`transition-colors ${
                          req.isMyTurnToApprove
                            ? 'bg-amber-50/30 hover:bg-amber-50/50'
                            : 'hover:bg-gray-50/50'
                        }`}
                      >
                        {/* 1. เลขที่เอกสาร */}
                        <td className="px-5 py-3.5 whitespace-nowrap font-mono font-semibold text-xs text-[#0B2046]">
                          {docNumber}
                        </td>

                        {/* 2. พนักงาน (ชื่อ-นามสกุล และ แผนก) */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900">{req.employeeName}</span>
                            {req.departmentName && req.departmentName !== '-' && (
                              <span className="text-[11px] text-slate-500">• {req.departmentName}</span>
                            )}
                          </div>
                        </td>

                        {/* 3. ประเภทหนังสือรับรอง */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                            {req.certificateName}
                          </span>
                        </td>

                        {/* 4. วัตถุประสงค์ */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-600">
                          <span className="max-w-xs truncate block" title={req.purpose || '-'}>
                            {req.purpose || '-'}
                          </span>
                        </td>

                        {/* 5. วันที่ยื่น */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-600">
                          {formatDate(req.requestedAt)}
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
                            {isPending && req.isMyTurnToApprove && (
                              <>
                                <button
                                  onClick={() => openApproveCertDialog(req)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300 ring-offset-1 transition-all shadow-sm cursor-pointer"
                                  title="อนุมัติเอกสารคำขอหนังสือรับรอง"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  อนุมัติ
                                </button>
                                <button
                                  onClick={() => openRejectCertDialog(req)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer"
                                  title="ปฏิเสธคำขอหนังสือรับรอง"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  ปฏิเสธ
                                </button>
                              </>
                            )}

                            {/* 2. กรณีผู้ใช้นี้ได้อนุมัติขั้นตอนนี้ไปแล้ว */}
                            {isPending && !req.isMyTurnToApprove && req.hasAlreadyApproved && (
                              <span
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                title="คุณได้ทำการอนุมัติในขั้นตอนนี้เรียบร้อยแล้ว กำลังรอขั้นตอนถัดไป"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                คุณอนุมัติแล้ว
                              </span>
                            )}

                            {/* 3. กรณีเอกสารรออนุมัติ แต่ยังไม่ถึงคิวของผู้ใช้นี้ */}
                            {isPending && !req.isMyTurnToApprove && !req.hasAlreadyApproved && (
                              <span
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200"
                                title={`กำลังรอการพิจารณาจาก ${req.currentApproverDisplay || 'ขั้นตอนก่อนหน้า'}`}
                              >
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                รอคิวก่อนหน้า
                              </span>
                            )}

                            {/* 4. ดูเอกสาร (เปิด Certificate Preview) */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCertForPreview(req);
                                setIsCertPreviewOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-all cursor-pointer"
                              title="ดูตัวอย่างเอกสารหนังสือรับรอง"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-600" />
                              ดูเอกสาร
                            </button>

                            {/* 5. ยกเลิกคำขอ — จะขึ้นก็ต่อเมื่อกดอนุมัติไปแล้ว หรือเป็นสิทธิ์ HR/Admin */}
                            {(req.status === 'APPROVED' || req.hasAlreadyApproved) && (
                              <button
                                onClick={() => handleCancelCert(req)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium transition-all cursor-pointer"
                                title="ยกเลิกคำขอหนังสือรับรอง"
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
        )}
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

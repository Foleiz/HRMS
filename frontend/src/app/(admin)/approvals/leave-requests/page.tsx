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
  GitPullRequest,
  Check,
  MessageSquare,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { leaveService } from '@/services/leaveService';
import { LeaveRequest, LeaveStats } from '@/types/leave';
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
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveStats, setLeaveStats] = useState<LeaveStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync breadcrumb
  useEffect(() => {
    setBreadcrumb({ section: 'การอนุมัติ', page: 'เอกสารรอดำเนินการ' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [quickFilter, setQuickFilter] = useState<'ALL' | 'MY_TURN'>('ALL');

  // Approval Modals State
  const [selectedForApprove, setSelectedForApprove] = useState<LeaveRequest | null>(null);
  const [approveComment, setApproveComment] = useState('');
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);

  const [selectedForReject, setSelectedForReject] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Timeline Modal State
  const [selectedForTimeline, setSelectedForTimeline] = useState<LeaveRequest | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

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
      const [reqData, statsData] = await Promise.all([
        leaveService.getLeaveRequests({ status: statusFilter || undefined, pageSize: 200 }),
        leaveService.getLeaveStats(),
      ]);
      setLeaveRequests(reqData);
      setLeaveStats(statsData);
    } catch (err) {
      console.error('Failed to fetch leave requests', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Filter ─────────────────────────────────────────────────

  const filtered = leaveRequests.filter((r) => {
    if (quickFilter === 'MY_TURN' && !r.isMyTurnToApprove) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.employeeName?.toLowerCase().includes(q) ||
      r.employeeCode?.toLowerCase().includes(q) ||
      r.leaveTypeName?.toLowerCase().includes(q) ||
      r.requestNo?.toLowerCase().includes(q)
    );
  });

  const myTurnCount = leaveRequests.filter((r) => r.status === 'PENDING' && r.isMyTurnToApprove).length;

  // ─── Actions ────────────────────────────────────────────────

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

  const handleCancel = (req: LeaveRequest) => {
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

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-12">
      {/* Sub-menu Tabs: เอกสารรอดำเนินการ | ประวัติเอกสาร | สายการอนุมัติ */}
      <ApprovalNavTabs currentSubTitle="เอกสารรอดำเนินการ" />

      {/* Stats Bar */}
      {leaveStats && (
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

      {/* Filters & Control Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center flex-1">
            {/* Quick Filter Toggle (All vs My Turn) */}
            <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setQuickFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  quickFilter === 'ALL'
                    ? 'bg-white text-slate-800 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                คำขอทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setQuickFilter('MY_TURN')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  quickFilter === 'MY_TURN'
                    ? 'bg-[#0B2046] text-white shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                ถึงคิวอนุมัติของฉัน
                {myTurnCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                    {myTurnCount}
                  </span>
                )}
              </button>
            </div>

            {/* Status filter */}
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

            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อพนักงาน, รหัสคำขอ, ประเภทลา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0B2046] transition-all"
              />
            </div>
          </div>

          <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
            พบ {filtered.length} รายการ
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400">
            <div className="inline-flex items-center gap-2 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-[#0B2046]" />
              กำลังโหลดคำขอลา...
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">
              {quickFilter === 'MY_TURN'
                ? 'ไม่มีคำขอที่รอการอนุมัติจากคุณในขณะนี้'
                : 'ไม่พบคำขอลาสำหรับเงื่อนไขที่เลือก'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    เอกสาร / พนักงาน
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
                    สถานะ & ขั้นตอนสายอนุมัติ
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
                {filtered.map((req) => {
                  const statusConf = STATUS_CONFIG[req.status] ?? STATUS_CONFIG['PENDING'];
                  const isPending = req.status === 'PENDING';
                  const hasSteps = (req.totalSteps ?? 0) > 0;

                  return (
                    <tr
                      key={req.id}
                      className={`transition-colors ${
                        req.isMyTurnToApprove
                          ? 'bg-amber-50/30 hover:bg-amber-50/50'
                          : 'hover:bg-gray-50/50'
                      }`}
                    >
                      {/* เอกสาร / พนักงาน */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#0B2046]/10 text-[#0B2046] font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {req.employeeName ? req.employeeName.charAt(0) : 'E'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 text-xs">{req.employeeName}</span>
                              <span className="text-[11px] font-mono text-slate-400">{req.employeeCode}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                              <span className="font-medium text-[#0B2046]">{req.requestNo}</span>
                              <span>•</span>
                              <span>{req.departmentName}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* ประเภทลา */}
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                          {req.leaveTypeName}
                        </span>
                        {req.reason && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-1 max-w-48" title={req.reason}>
                            {req.reason}
                          </p>
                        )}
                      </td>

                      {/* วันที่ลา */}
                      <td className="px-4 py-4 text-xs text-slate-600">
                        <div>
                          {formatDate(req.startDate ?? req.startDatetime)}
                          {(req.endDate ?? req.endDatetime) &&
                            (req.endDate ?? req.endDatetime) !== (req.startDate ?? req.startDatetime) && (
                              <span> - {formatDate(req.endDate ?? req.endDatetime)}</span>
                            )}
                        </div>
                        {req.contactDuringLeave && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            ติดต่อ: {req.contactDuringLeave}
                          </div>
                        )}
                      </td>

                      {/* จำนวนวัน */}
                      <td className="px-4 py-4 text-center">
                        <span className="font-bold text-slate-900 text-xs">{req.leaveDays}</span>
                        <span className="text-[11px] text-slate-400 ml-1">วัน</span>
                      </td>

                      {/* สถานะ & ขั้นตอนสายอนุมัติ */}
                      <td className="px-4 py-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConf.color}`}
                            >
                              {statusConf.icon}
                              {statusConf.label}
                            </span>

                            {req.isMyTurnToApprove && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                                <Sparkles className="w-2.5 h-2.5 text-amber-200" />
                                ถึงคิวคุณพิจารณา
                              </span>
                            )}
                          </div>

                          {/* Stepper Pill & Timeline Button */}
                          {isPending && hasSteps ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-medium border border-slate-200">
                                ขั้นที่ {req.currentStepNo ?? 1}/{req.totalSteps}: {req.currentApproverDisplay ?? ''}
                              </span>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedForTimeline(req);
                                  setIsTimelineOpen(true);
                                }}
                                className="inline-flex items-center gap-1 text-[11px] text-[#0B2046] hover:underline font-semibold cursor-pointer"
                              >
                                <GitPullRequest className="w-3 h-3 text-[#0B2046]" /> ดูผัง
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedForTimeline(req);
                                setIsTimelineOpen(true);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-[#0B2046] hover:underline font-medium cursor-pointer"
                            >
                              <GitPullRequest className="w-3 h-3 text-slate-400" /> ดูประวัติขั้นตอน
                            </button>
                          )}
                        </div>
                      </td>

                      {/* เอกสารแนบ */}
                      <td className="px-4 py-4">
                        {req.documents && req.documents.length > 0 ? (
                          <div className="space-y-1">
                            {req.documents.map((doc) => (
                              <button
                                key={doc.id}
                                onClick={() => handleDownloadDoc(req.id, doc.id, doc.fileName || 'document')}
                                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span className="max-w-32 truncate">{doc.fileName}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">ไม่มีเอกสาร</span>
                        )}
                      </td>

                      {/* ดำเนินการ */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {isPending && (
                            <>
                              <button
                                onClick={() => openApproveDialog(req)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                                  req.isMyTurnToApprove
                                    ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300 ring-offset-1'
                                    : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                                title={req.isMyTurnToApprove ? 'ถึงคิวพิจารณาของคุณ' : 'อนุมัติ'}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                อนุมัติ
                              </button>
                              <button
                                onClick={() => openRejectDialog(req)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                ปฏิเสธ
                              </button>
                            </>
                          )}
                          {(req.status === 'PENDING' || req.status === 'APPROVED') && (
                            <button
                              onClick={() => handleCancel(req)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-medium transition-all cursor-pointer"
                              title="ยกเลิกคำขอ"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {req.status !== 'PENDING' && req.status !== 'APPROVED' && (
                            <span className="text-xs text-gray-300">-</span>
                          )}
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

      {/* ─── Modal ยืนยันการอนุมัติพร้อมระบุความเห็น ─── */}
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

      {/* ─── Modal ปฏิเสธคำขอพร้อมระบุเหตุผล ─── */}
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

      {/* ─── Modal ผังขั้นตอนการอนุมัติ (Approval Timeline) ─── */}
      <ApprovalTimelineModal
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        leaveRequest={selectedForTimeline}
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

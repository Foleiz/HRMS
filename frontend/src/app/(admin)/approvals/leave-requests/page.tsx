'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardList,
  History,
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
} from 'lucide-react';
import { leaveService } from '@/services/leaveService';
import { LeaveRequest, LeaveStats } from '@/types/leave';
import { ConfirmModal, ConfirmType } from '@/components/ui/ConfirmModal';

// ─── เมนูย่อยภายใน "การอนุมัติ" (คำขอลา | ประวัติการอนุมัติ) ──────
// รูปแบบเดียวกับเมนู บันทึกเวลาของฉัน
const APPROVAL_TABS = [
  { title: 'คำขอลา', href: '/approvals/leave-requests', icon: ClipboardList },
  { title: 'ประวัติการอนุมัติ', href: '/approvals/history', icon: History },
];

function ApprovalTabs() {
  const pathname = usePathname();
  return (
    <div className="border-b border-slate-200 bg-white rounded-t-2xl px-4 pt-2 shadow-sm overflow-x-auto">
      <div className="flex gap-2 text-sm font-medium whitespace-nowrap min-w-max">
        {APPROVAL_TABS.map((tab) => {
          const isTabActive = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`pb-3 px-3.5 border-b-2 font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                isTabActive
                  ? 'border-[#0B2046] text-[#0B2046]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

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
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveStats, setLeaveStats] = useState<LeaveStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');

  // Reject reason input
  const [rejectReason, setRejectReason] = useState('');

  // Confirm/Alert dialog
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

  const showConfirm = (opts: {
    title: string;
    message: string;
    confirmText?: string;
    type?: ConfirmType;
    onConfirm: () => void | Promise<void>;
  }) => {
    setConfirmConfig({ isOpen: true, singleButton: false, isLoading: false, cancelText: 'ยกเลิก', ...opts });
  };

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
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.employeeName?.toLowerCase().includes(q) ||
      r.employeeCode?.toLowerCase().includes(q) ||
      r.leaveTypeName?.toLowerCase().includes(q)
    );
  });

  // ─── Actions ────────────────────────────────────────────────

  const handleApprove = (req: LeaveRequest) => {
    showConfirm({
      title: 'อนุมัติคำขอลา',
      message: `อนุมัติคำขอลาของ "${req.employeeName}" (${req.leaveTypeName}) วันที่ ${formatDate(req.startDate ?? req.startDatetime)} - ${formatDate(req.endDate ?? req.endDatetime)} ใช่หรือไม่?`,
      confirmText: 'อนุมัติ',
      type: 'success',
      onConfirm: async () => {
        try {
          await leaveService.approveLeaveRequest(req.id);
          closeConfirm();
          showToast('อนุมัติคำขอลาสำเร็จ');
          fetchData();
        } catch (err: any) {
          closeConfirm();
          showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาด');
        }
      },
    });
  };

  const handleReject = (req: LeaveRequest) => {
    setRejectReason('');
    setConfirmConfig({
      isOpen: true,
      singleButton: false,
      isLoading: false,
      title: 'ปฏิเสธคำขอลา',
      message: `ปฏิเสธคำขอลาของ "${req.employeeName}" (${req.leaveTypeName})`,
      confirmText: 'ปฏิเสธ',
      cancelText: 'ยกเลิก',
      type: 'danger',
      onConfirm: async () => {
        try {
          await leaveService.rejectLeaveRequest(req.id, rejectReason || undefined);
          closeConfirm();
          showToast('ปฏิเสธคำขอลาสำเร็จ');
          fetchData();
        } catch (err: any) {
          closeConfirm();
          showToast(err?.response?.data?.message || 'เกิดข้อผิดพลาด');
        }
      },
    });
  };

  const handleCancel = (req: LeaveRequest) => {
    showConfirm({
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
      {/* Sub-menu Tabs: คำขอลา | ประวัติการอนุมัติ */}
      <ApprovalTabs />

      {/* Stats Bar */}
      {leaveStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'รอการอนุมัติ', value: (leaveStats.pendingCount ?? leaveStats.pendingRequestsCount) ?? 0, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'อนุมัติแล้ว', value: (leaveStats.approvedCount ?? leaveStats.approvedThisMonthCount) ?? 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'ปฏิเสธแล้ว', value: (leaveStats.rejectedCount ?? leaveStats.rejectedThisMonthCount) ?? 0, color: 'text-red-500', bg: 'bg-red-50' },
            { label: 'ยกเลิกแล้ว', value: (leaveStats.cancelledCount ?? 0) ?? 0, color: 'text-gray-500', bg: 'bg-gray-50' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-2xl border border-white p-4`}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Status filter */}
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 appearance-none"
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
              placeholder="ค้นหาชื่อพนักงาน, รหัส, ประเภทลา..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <span className="text-sm text-gray-400 ml-auto">พบ {filtered.length} รายการ</span>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 text-white rounded-xl text-sm shadow-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toast}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400">
            <div className="inline-flex items-center gap-2 text-sm">
              <Loader2 className="w-5 h-5 animate-spin" />
              กำลังโหลดคำขอลา...
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">ไม่พบคำขอลาสำหรับเงื่อนไขที่เลือก</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">พนักงาน</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">ประเภทลา</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">วันที่ลา</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">จำนวน</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">สถานะ</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">เอกสารแนบ</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((req) => {
                  const statusConf = STATUS_CONFIG[req.status] ?? STATUS_CONFIG['PENDING'];
                  return (
                    <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* พนักงาน */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                            {req.employeeName?.slice(0, 2) ?? 'EM'}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{req.employeeName ?? '-'}</div>
                            <div className="text-xs text-gray-400">{req.employeeCode ?? '-'}</div>
                          </div>
                        </div>
                      </td>

                      {/* ประเภทลา */}
                      <td className="px-4 py-4">
                        <span className="font-medium text-gray-700">{req.leaveTypeName ?? '-'}</span>
                      </td>

                      {/* วันที่ */}
                      <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                        {formatDate(req.startDatetime)}
                        {req.startDatetime !== req.endDatetime && (
                          <span className="text-gray-400"> – {formatDate(req.endDatetime)}</span>
                        )}
                      </td>

                      {/* จำนวนวัน */}
                      <td className="px-4 py-4 text-center">
                        <span className="font-semibold text-gray-900">{(req.totalDays ?? req.leaveDays) ?? '-'}</span>
                        <span className="text-gray-400 text-xs ml-1">วัน</span>
                      </td>

                      {/* สถานะ */}
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConf.color}`}>
                          {statusConf.icon}
                          {statusConf.label}
                        </span>
                        {req.rejectReason && (
                          <div className="text-xs text-red-400 mt-1 max-w-32 truncate" title={req.rejectReason}>
                            เหตุผล: {req.rejectReason}
                          </div>
                        )}
                      </td>

                      {/* เอกสารแนบ */}
                      <td className="px-4 py-4">
                        {req.documents && req.documents.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {req.documents.map((doc) => (
                              <button
                                key={doc.id}
                                onClick={() => handleDownloadDoc(req.id, doc.id, doc.fileName ?? 'attachment')}
                                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                <Download className="w-3.5 h-3.5" />
                                {doc.fileName}
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
                          {req.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApprove(req)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-all"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                อนุมัติ
                              </button>
                              <button
                                onClick={() => handleReject(req)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-all"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                ปฏิเสธ
                              </button>
                            </>
                          )}
                          {(req.status === 'PENDING' || req.status === 'APPROVED') && (
                            <button
                              onClick={() => handleCancel(req)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-medium transition-all"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              ยกเลิก
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

      {/* Confirm Modal */}
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


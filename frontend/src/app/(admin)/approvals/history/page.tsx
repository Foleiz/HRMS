'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  History,
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
  Calendar,
  GitPullRequest,
} from 'lucide-react';
import { leaveService } from '@/services/leaveService';
import { LeaveRequest } from '@/types/leave';
import { ApprovalNavTabs } from '@/components/approvals/ApprovalNavTabs';
import { ApprovalTimelineModal } from '@/components/approvals/ApprovalTimelineModal';
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

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'รอการอนุมัติ', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock className="w-3.5 h-3.5" /> },
  APPROVED: { label: 'อนุมัติแล้ว', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  REJECTED: { label: 'ปฏิเสธแล้ว', color: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="w-3.5 h-3.5" /> },
  CANCELLED: { label: 'ยกเลิกแล้ว', color: 'bg-gray-100 text-gray-500 border-gray-200', icon: <Ban className="w-3.5 h-3.5" /> },
};

// ─── Component ────────────────────────────────────────────────

export default function ApprovalHistoryPage() {
  const { setBreadcrumb } = useBreadcrumb();
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync breadcrumb
  useEffect(() => {
    setBreadcrumb({ section: 'การอนุมัติ', page: 'ประวัติเอกสาร' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Timeline Modal State
  const [selectedForTimeline, setSelectedForTimeline] = useState<LeaveRequest | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  // ─── Fetch ────────────────────────────────────────────────

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      // ดึงเฉพาะรายการที่ผ่านการดำเนินการแล้ว (ไม่รวม PENDING)
      const statuses = statusFilter
        ? [statusFilter]
        : ['APPROVED', 'REJECTED', 'CANCELLED'];

      const results = await Promise.all(
        statuses.map((s) => leaveService.getLeaveRequests({ status: s, pageSize: 200 }))
      );

      // Flatten และ sort ตาม updatedAt (ล่าสุดก่อน)
      const all = results.flat().sort((a, b) => {
        const da = new Date(a.updatedAt ?? a.createdAt ?? '').getTime();
        const db = new Date(b.updatedAt ?? b.createdAt ?? '').getTime();
        return db - da;
      });

      setHistory(all);
    } catch (err) {
      console.error('Failed to fetch approval history', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // ─── Filter ───────────────────────────────────────────────

  const filtered = history.filter((r) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.employeeName?.toLowerCase().includes(q) ||
      r.employeeCode?.toLowerCase().includes(q) ||
      r.leaveTypeName?.toLowerCase().includes(q) ||
      r.approvedByName?.toLowerCase().includes(q)
    );
  });

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-12">
      {/* Sub-menu Tabs: เอกสารรอดำเนินการ | ประวัติเอกสาร | สายการอนุมัติ */}
      <ApprovalNavTabs currentSubTitle="ประวัติเอกสาร" />

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">ทุกสถานะ (ยกเว้น รอการอนุมัติ)</option>
              <option value="APPROVED">อนุมัติแล้ว</option>
              <option value="REJECTED">ปฏิเสธแล้ว</option>
              <option value="CANCELLED">ยกเลิกแล้ว</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative flex-1 min-w-48">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อพนักงาน, รหัส, ประเภทลา, ผู้อนุมัติ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <span className="text-sm text-gray-400 ml-auto">พบ {filtered.length} รายการ</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400">
            <div className="inline-flex items-center gap-2 text-sm">
              <Loader2 className="w-5 h-5 animate-spin" />
              กำลังโหลดประวัติการอนุมัติ...
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">ไม่พบประวัติการอนุมัติ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">พนักงาน</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">ประเภทลา</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">วันที่ลา</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">จำนวนวัน</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">สถานะ</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">ผู้ดำเนินการ</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">วันที่ดำเนินการ</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">สายอนุมัติ</th>
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
                      <td className="px-4 py-4 font-medium text-gray-700">{req.leaveTypeName ?? '-'}</td>

                      {/* วันที่ลา */}
                      <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-300" />
                          <span>{formatDate(req.startDatetime)}</span>
                          {req.startDatetime !== req.endDatetime && (
                            <span className="text-gray-400">– {formatDate(req.endDatetime)}</span>
                          )}
                        </div>
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
                          <div className="text-xs text-red-400 mt-1 max-w-36 truncate" title={req.rejectReason}>
                            เหตุผล: {req.rejectReason}
                          </div>
                        )}
                      </td>

                      {/* ผู้ดำเนินการ */}
                      <td className="px-4 py-4 text-gray-600 text-sm">
                        {req.approvedByName ?? (req.status === 'CANCELLED' ? 'ระบบ / ผู้ยื่น' : '-')}
                      </td>

                      {/* วันที่ดำเนินการ */}
                      <td className="px-4 py-4 text-gray-500 text-xs whitespace-nowrap">
                        {formatDateTime(req.updatedAt ?? req.createdAt)}
                      </td>

                      {/* สายอนุมัติ */}
                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedForTimeline(req);
                            setIsTimelineOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-blue-700 bg-blue-50/80 hover:bg-blue-100 hover:text-blue-800 transition-colors border border-blue-200/60 shadow-2xs"
                          title="ดูผังขั้นตอนและประวัติการพิจารณา"
                        >
                          <GitPullRequest className="w-3.5 h-3.5" />
                          <span>ผังอนุมัติ</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Timeline Modal */}
      <ApprovalTimelineModal
        isOpen={isTimelineOpen}
        onClose={() => {
          setIsTimelineOpen(false);
          setSelectedForTimeline(null);
        }}
        leaveRequest={selectedForTimeline}
      />
    </div>
  );
}


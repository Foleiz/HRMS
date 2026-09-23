'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Calendar,
  GitPullRequest,
  Eye,
  FileText,
} from 'lucide-react';
import { leaveService } from '@/services/leaveService';
import { LeaveRequest } from '@/types/leave';
import { certificateService } from '@/services/certificateService';
import { CertificateRequest } from '@/types/certificates';
import { CertificatePreviewModal } from '@/components/documents/CertificatePreviewModal';
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
  
  // Document Type Tabs: 'LEAVE' | 'CERTIFICATE'
  const [activeDocType, setActiveDocType] = useState<'LEAVE' | 'CERTIFICATE'>('LEAVE');

  const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
  const [certHistory, setCertHistory] = useState<CertificateRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync breadcrumb
  useEffect(() => {
    setBreadcrumb({ section: 'การอนุมัติ', page: 'ประวัติเอกสาร' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Timeline Modal State (Leave)
  const [selectedForTimeline, setSelectedForTimeline] = useState<LeaveRequest | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  // Preview Modal State (Certificate)
  const [selectedCertForPreview, setSelectedCertForPreview] = useState<CertificateRequest | null>(null);
  const [isCertPreviewOpen, setIsCertPreviewOpen] = useState(false);

  // ─── Fetch ────────────────────────────────────────────────

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const statuses = statusFilter
        ? [statusFilter]
        : ['APPROVED', 'REJECTED', 'CANCELLED'];

      const [leaveResults, certResults] = await Promise.all([
        Promise.all(statuses.map((s) => leaveService.getLeaveRequests({ status: s, pageSize: 200 }))),
        certificateService.getAllRequests().catch((err) => {
          console.error('Failed to fetch certificate history', err);
          return [] as CertificateRequest[];
        }),
      ]);

      // Flatten และ sort คำขอลาให้รายการล่าสุดอยู่บนสุดเสมอ
      const allLeave = leaveResults.flat().sort((a, b) => {
        const dateA = a.approvedAt || a.cancelledAt || a.submittedAt || a.updatedAt || a.createdAt || '';
        const dateB = b.approvedAt || b.cancelledAt || b.submittedAt || b.updatedAt || b.createdAt || '';
        const timeA = dateA ? new Date(dateA).getTime() : 0;
        const timeB = dateB ? new Date(dateB).getTime() : 0;
        if (timeA !== timeB) return timeB - timeA;
        return (b.id ?? 0) - (a.id ?? 0);
      });

      // กรองเฉพาะหนังสือรับรองที่ผ่านการดำเนินการแล้ว และ sort ล่าสุดอยู่บนสุด
      const nonPendingCerts = certResults
        .filter((c) => {
          if (statusFilter) {
            return c.status === statusFilter || (statusFilter === 'APPROVED' && c.status === 'ISSUED');
          }
          return c.status !== 'PENDING';
        })
        .sort((a, b) => {
          const dateA = a.approvedAt || a.issuedAt || a.requestedAt || '';
          const dateB = b.approvedAt || b.issuedAt || b.requestedAt || '';
          const timeA = dateA ? new Date(dateA).getTime() : 0;
          const timeB = dateB ? new Date(dateB).getTime() : 0;
          if (timeA !== timeB) return timeB - timeA;
          return (b.id ?? 0) - (a.id ?? 0);
        });

      setLeaveHistory(allLeave);
      setCertHistory(nonPendingCerts);
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

  const filteredLeave = leaveHistory.filter((r) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.employeeName?.toLowerCase().includes(q) ||
      r.employeeCode?.toLowerCase().includes(q) ||
      r.leaveTypeName?.toLowerCase().includes(q) ||
      r.approvedByName?.toLowerCase().includes(q)
    );
  });

  const filteredCert = certHistory.filter((r) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const docNo = `CERT-${String(r.id).padStart(4, '0')}`.toLowerCase();
    return (
      r.employeeName?.toLowerCase().includes(q) ||
      r.employeeCode?.toLowerCase().includes(q) ||
      r.certificateName?.toLowerCase().includes(q) ||
      r.purpose?.toLowerCase().includes(q) ||
      r.approvedByName?.toLowerCase().includes(q) ||
      docNo.includes(q)
    );
  });

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-12">
      {/* Sub-menu Tabs: เอกสารรอดำเนินการ | ประวัติเอกสาร | สายการอนุมัติ */}
      <ApprovalNavTabs currentSubTitle="ประวัติเอกสาร" />

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
            {leaveHistory.length}
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
            {certHistory.length}
          </span>
        </button>
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
                placeholder={
                  activeDocType === 'LEAVE'
                    ? 'ค้นหาชื่อพนักงาน, รหัส, ประเภทลา, ผู้อนุมัติ...'
                    : 'ค้นหาชื่อพนักงาน, เลขที่คำขอ, หนังสือรับรอง, ผู้อนุมัติ...'
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0B2046] transition-all"
              />
            </div>

            {/* Status filter */}
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:ring-2 focus:ring-[#0B2046] appearance-none cursor-pointer"
              >
                <option value="">ทุกสถานะ (ที่ดำเนินการแล้ว)</option>
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400">
            <div className="inline-flex items-center gap-2 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-[#0B2046]" />
              กำลังโหลดประวัติเอกสาร...
            </div>
          </div>
        ) : activeDocType === 'LEAVE' ? (
          /* ─── ตารางประวัติคำขอลา ─── */
          filteredLeave.length === 0 ? (
            <div className="py-20 text-center">
              <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">ไม่พบประวัติการอนุมัติคำขอลา</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60 whitespace-nowrap">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">เลขที่เอกสาร</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">พนักงาน</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">ประเภทการลา</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">ช่วงวันที่ลา</th>
                    <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">จำนวนวัน</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">สถานะ</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">ผู้ดำเนินการ</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">วันที่ดำเนินการ</th>
                    <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">สายอนุมัติ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredLeave.map((req) => {
                    const statusConf = STATUS_CONFIG[req.status] ?? STATUS_CONFIG['PENDING'];
                    return (
                      <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
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
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConf.color}`}>
                            {statusConf.icon}
                            {statusConf.label}
                          </span>
                        </td>

                        {/* 7. ผู้ดำเนินการ */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-600">
                          {req.approvedByName ?? (req.status === 'CANCELLED' ? 'ระบบ / ผู้ยื่น' : '-')}
                        </td>

                        {/* 8. วันที่ดำเนินการ */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500">
                          {formatDateTime(req.approvedAt ?? req.cancelledAt ?? req.submittedAt ?? req.updatedAt ?? req.createdAt)}
                        </td>

                        {/* 9. สายอนุมัติ */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedForTimeline(req);
                              setIsTimelineOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-all cursor-pointer"
                            title="ดูผังขั้นตอนและประวัติการพิจารณา"
                          >
                            <GitPullRequest className="w-3.5 h-3.5 text-slate-600" />
                            ผังอนุมัติ
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* ─── ตารางประวัติคำขอหนังสือรับรอง ─── */
          filteredCert.length === 0 ? (
            <div className="py-20 text-center">
              <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">ไม่พบประวัติการอนุมัติคำขอหนังสือรับรอง</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60 whitespace-nowrap">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">เลขที่เอกสาร</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">พนักงาน</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">ประเภทหนังสือรับรอง</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">วัตถุประสงค์</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">สถานะ</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">ผู้ดำเนินการ</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">วันที่ดำเนินการ</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredCert.map((req) => {
                    const statusConf = STATUS_CONFIG[req.status] ?? STATUS_CONFIG['PENDING'];
                    const docNumber = `CERT-${String(req.id).padStart(4, '0')}`;

                    return (
                      <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
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

                        {/* 5. สถานะ */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConf.color}`}>
                            {statusConf.icon}
                            {statusConf.label}
                          </span>
                        </td>

                        {/* 6. ผู้ดำเนินการ */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-600">
                          {req.approvedByName ?? (req.status === 'CANCELLED' ? 'ระบบ / ผู้ยื่น' : '-')}
                        </td>

                        {/* 7. วันที่ดำเนินการ */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500">
                          {formatDateTime(req.approvedAt ?? req.issuedAt ?? req.requestedAt)}
                        </td>

                        {/* 8. ดำเนินการ (ดูเอกสาร) */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCertForPreview(req);
                              setIsCertPreviewOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-all cursor-pointer"
                            title="ดูตัวอย่างเอกสารหนังสือรับรองทางการ"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            ดูเอกสาร
                          </button>
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

      {/* Timeline Modal (คำขอลา) */}
      <ApprovalTimelineModal
        isOpen={isTimelineOpen}
        onClose={() => {
          setIsTimelineOpen(false);
          setSelectedForTimeline(null);
        }}
        leaveRequest={selectedForTimeline}
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
    </div>
  );
}

'use client';

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

export interface UnifiedHistoryItem {
  id: string;
  rawId: number;
  docType: 'LEAVE' | 'CERTIFICATE';
  docTypeName: string;
  requestNo: string;
  employeeName: string;
  employeeCode?: string;
  departmentName: string;
  subType: string;
  details: string;
  status: string;
  approvedByName?: string | null;
  actionAt?: string | null;
  leaveRaw?: LeaveRequest;
  certRaw?: CertificateRequest;
}

// ─── Component ────────────────────────────────────────────────

export default function ApprovalHistoryPage() {
  const { setBreadcrumb } = useBreadcrumb();

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
  const [docTypeFilter, setDocTypeFilter] = useState<'ALL' | 'LEAVE' | 'CERTIFICATE'>('ALL');
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

      const allLeave = leaveResults.flat();

      const nonPendingCerts = certResults.filter((c) => {
        if (statusFilter) {
          return c.status === statusFilter || (statusFilter === 'APPROVED' && c.status === 'ISSUED');
        }
        return c.status !== 'PENDING';
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
        subType: c.certificateName || 'หนังสือรับรอง',
        details: c.purpose ? `วัตถุประสงค์: ${c.purpose}` : 'ขอหนังสือรับรอง',
        status: c.status,
        approvedByName: c.approvedByName ?? (c.status === 'CANCELLED' ? 'ระบบ / ผู้ยื่น' : '-'),
        actionAt: c.approvedAt ?? c.issuedAt ?? c.requestedAt ?? null,
        certRaw: c,
      });
    });

    // เรียงลำดับ: รายการล่าสุดอยู่บนสุดเสมอ
    return list.sort((a, b) => {
      const timeA = a.actionAt ? new Date(a.actionAt).getTime() : 0;
      const timeB = b.actionAt ? new Date(b.actionAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      return b.rawId - a.rawId;
    });
  }, [leaveHistory, certHistory]);

  const filteredHistory = useMemo(() => {
    return unifiedHistory.filter((item) => {
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
        item.approvedByName?.toLowerCase().includes(q) ||
        item.departmentName?.toLowerCase().includes(q)
      );
    });
  }, [unifiedHistory, docTypeFilter, searchTerm]);

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-12">
      {/* Sub-menu Tabs: เอกสารรอดำเนินการ | ประวัติเอกสาร */}
      <ApprovalNavTabs currentSubTitle="ประวัติเอกสาร" />

      {/* Filters & Control Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search (อยู่ซ้ายสุด กำหนดความกว้างพอดีๆ) */}
            <div className="relative w-72 sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="ค้นหาชื่อพนักงาน, เลขที่เอกสาร, ประเภทคำขอ, ผู้อนุมัติ..."
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

            {/* Status filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:ring-2 focus:ring-[#0B2046] appearance-none cursor-pointer"
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
            พบ {filteredHistory.length} รายการ
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
        ) : filteredHistory.length === 0 ? (
          <div className="py-20 text-center">
            <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">ไม่พบประวัติเอกสารสำหรับเงื่อนไขที่เลือก</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 whitespace-nowrap">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">เลขที่เอกสาร</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">ประเภทเอกสาร</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">พนักงาน</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">รายละเอียดคำขอ</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">สถานะ</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">ผู้ดำเนินการ</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">วันที่ดำเนินการ</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredHistory.map((item) => {
                  const statusConf = STATUS_CONFIG[item.status] ?? STATUS_CONFIG['PENDING'];

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                            {item.subType}
                          </span>
                          <span className="text-slate-600 truncate max-w-xs">{item.details}</span>
                        </div>
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
                        {item.approvedByName}
                      </td>

                      {/* 7. วันที่ดำเนินการ */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500">
                        {formatDateTime(item.actionAt)}
                      </td>

                      {/* 8. ดำเนินการ (ดูเอกสาร) */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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

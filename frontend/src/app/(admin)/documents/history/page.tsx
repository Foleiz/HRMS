'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
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
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { leaveService } from '@/services/leaveService';
import { LeaveRequest } from '@/types/leave';
import { resignationService } from '@/services/resignationService';
import { ResignationRequest } from '@/types/resignation';
import { certificateService } from '@/services/certificateService';
import { CertificateRequest } from '@/types/certificates';
import { ConfirmModal, ConfirmType } from '@/components/ui/ConfirmModal';
import { DocumentsSubNav } from '@/components/documents/DocumentsSubNav';

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
  DRAFT: { label: 'แบบร่าง', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: <FileText className="w-3.5 h-3.5" /> },
  PENDING: { label: 'รออนุมัติ', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock className="w-3.5 h-3.5" /> },
  APPROVED: { label: 'อนุมัติแล้ว', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  REJECTED: { label: 'ไม่อนุมัติ', color: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="w-3.5 h-3.5" /> },
  CANCELLED: { label: 'ยกเลิกแล้ว', color: 'bg-gray-100 text-gray-500 border-gray-200', icon: <Ban className="w-3.5 h-3.5" /> },
};

// เอกสารทุกประเภทที่พนักงานยื่นได้จากเมนู "ยื่นเอกสาร" (การลา, ลาออก, หนังสือรับรอง)
interface MyDocumentRow {
  id: string;
  code: string;
  submittedDate?: string | null;
  detailDate: string;
  documentType: string;
  status: string;
  rejectReason?: string | null;
  documents?: { id: number; fileName?: string | null }[];
  /** ลิงก์ไปหน้าฟอร์มต้นทางเพื่อแก้ไขต่อ — มีเฉพาะเอกสารที่ยังเป็นแบบร่าง (DRAFT) */
  editUrl?: string;
  source: 'LEAVE' | 'RESIGNATION' | 'CERTIFICATE';
  rawLeave?: LeaveRequest;
  rawResignation?: ResignationRequest;
  rawCertificate?: CertificateRequest;
  canCancel?: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

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
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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

  // ─── เมนู "การจัดการ" แบบจุดสามจุด (dropdown ต่อแถว) ───
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  // เปิดขึ้นด้านบนแทนด้านล่าง เมื่อพื้นที่ใต้ปุ่มเหลือไม่พอ (เช่น แถวใกล้ขอบล่างของจอ)
  const [menuOpenUpward, setMenuOpenUpward] = useState(false);

  useEffect(() => {
    if (!openMenuId) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-actions-menu]')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  // ประมาณความสูงของเมนูจากปุ่มที่ถูกกด แล้วตัดสินใจว่าควรเปิดขึ้นบนหรือลงล่าง
  // ก่อนเปิดเมนูจริง เพื่อไม่ให้เมนูโผล่พ้นขอบล่างของหน้าจอจนต้องเลื่อนดู
  const handleToggleMenu = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (openMenuId === id) {
      setOpenMenuId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const estimatedMenuHeight = 260; // ความสูงโดยประมาณสูงสุดของเมนู (รวม padding และรายการเอกสารแนบ)
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    setMenuOpenUpward(spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow);
    setOpenMenuId(id);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [leaveRes, resignRes, certRes] = await Promise.allSettled([
        leaveService.getMyLeaveRequests({ pageSize: 200 }),
        resignationService.getMyRequests(),
        certificateService.getMyRequests(),
      ]);

      if (leaveRes.status === 'fulfilled') setLeaveRequests(leaveRes.value);
      if (resignRes.status === 'fulfilled') setResignationRequests(resignRes.value);
      if (certRes.status === 'fulfilled') setCertificateRequests(certRes.value);
    } catch (err) {
      console.error('Failed to load document history', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── รวมเอกสารทุกประเภทเป็นรายการเดียว (การลา, ลาออก, หนังสือรับรอง) ───
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
    }));

    const resignRows: MyDocumentRow[] = resignationRequests.map((r) => ({
      id: `RESIGN-${r.id}`,
      code: r.requestNo,
      submittedDate: r.submittedAt,
      detailDate: `วันทำงานสุดท้าย: ${formatShortDate(r.requestedLastWorkingDate)}`,
      documentType: `คำขอลาออก (${r.reasonCategory || 'ทั่วไป'})`,
      status: r.status,
      rejectReason: r.cancelReason,
      source: 'RESIGNATION',
      rawResignation: r,
      canCancel: r.canCancel,
    }));

    const certRows: MyDocumentRow[] = certificateRequests.map((r) => ({
      id: `CERT-${r.id}`,
      code: `CERT-${r.id}`,
      submittedDate: r.requestedAt,
      detailDate: `วัตถุประสงค์: ${r.purpose || '-'}`,
      documentType: `หนังสือรับรอง (${r.certificateName || '-'})`,
      status: r.status,
      source: 'CERTIFICATE',
      rawCertificate: r,
      canCancel: r.canCancel,
    }));

    const all = [...leaveRows, ...resignRows, ...certRows];
    return all.sort((a, b) => (b.submittedDate || '').localeCompare(a.submittedDate || ''));
  }, [leaveRequests, resignationRequests, certificateRequests]);

  const stats = useMemo(() => {
    const approved = documents.filter((d) => d.status === 'APPROVED').length;
    const pending = documents.filter((d) => d.status === 'PENDING').length;
    const rejected = documents.filter((d) => d.status === 'REJECTED').length;
    return { approved, pending, rejected, total: documents.length };
  }, [documents]);

  const totalPages = Math.max(1, Math.ceil(documents.length / pageSize));
  const pagedDocuments = documents.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  // ─── Actions ────────────────────────────────────────────────

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
      if (doc.source === 'LEAVE' && doc.rawLeave) {
        const blob = await leaveService.downloadLeaveDocument(doc.rawLeave.id, docId);
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
    const header = ['รหัสเอกสาร', 'วันที่ยื่นเอกสาร', 'วันที่ลา', 'ประเภทเอกสาร', 'สถานะเอกสาร'];
    const rows = documents.map((d) => [
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

  // ─── Render ──────────────────────────────────────────────────

  const statCards = [
    { label: 'เอกสารที่อนุมัติแล้ว', value: stats.approved, icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'เอกสารรอการอนุมัติ', value: stats.pending, icon: <Clock className="w-5 h-5" />, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'เอกสารที่ไม่อนุมัติ', value: stats.rejected, icon: <XCircle className="w-5 h-5" />, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'เอกสารทั้งหมด', value: stats.total, icon: <FileText className="w-5 h-5" />, color: 'text-gray-600', bg: 'bg-gray-100' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* เมนูย่อยในตัว — สลับไปมาระหว่าง "รายการเอกสาร" กับ "ประวัติเอกสาร" เหมือนเมนู "พนักงาน" */}
      <DocumentsSubNav />

      {/* Page Header */}
      <div>
        <p className="text-sm text-gray-500">รวมเอกสารทุกประเภทที่คุณเคยยื่นและสถานะล่าสุด</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl ${s.bg} ${s.color} flex items-center justify-center shrink-0`}>{s.icon}</div>
            <div className="min-w-0">
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-400 truncate">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl text-xs font-medium transition-all"
        >
          <Download className="w-3.5 h-3.5" /> ส่งออก
        </button>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl text-xs font-medium transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> รีเฟรช
        </button>
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
              กำลังโหลดประวัติเอกสาร...
            </div>
          </div>
        ) : documents.length === 0 ? (
          <div className="py-20 text-center">
            <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">คุณยังไม่เคยยื่นเอกสาร</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">รหัสเอกสาร</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">วันที่ยื่นเอกสาร</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">วันที่ลา</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">ประเภทเอกสาร</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">สถานะเอกสาร</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pagedDocuments.map((doc) => {
                    const statusConf = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG['PENDING'];
                    return (
                      <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4 font-medium text-gray-700 whitespace-nowrap">{doc.code}</td>
                        <td className="px-4 py-4 text-gray-600 whitespace-nowrap">{formatShortDate(doc.submittedDate)}</td>
                        <td className="px-4 py-4 text-gray-600 whitespace-nowrap">{doc.detailDate}</td>
                        <td className="px-4 py-4 text-gray-600">{doc.documentType}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConf.color}`}>
                            {statusConf.icon}
                            {statusConf.label}
                          </span>
                          {doc.rejectReason && (
                            <div className="text-xs text-red-400 mt-1 max-w-36 truncate" title={doc.rejectReason}>
                              เหตุผล: {doc.rejectReason}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {(() => {
                            const hasAttachments = !!doc.documents && doc.documents.length > 0;
                            const hasEdit = doc.status === 'DRAFT' && !!doc.editUrl;
                            const hasCancel = doc.status === 'PENDING';
                            const hasDelete = doc.status === 'DRAFT';
                            const hasAnyAction = hasAttachments || hasEdit || hasCancel || hasDelete;
                            const isOpen = openMenuId === doc.id;
                            return (
                              <div className="relative inline-block text-left" data-actions-menu>
                                <button
                                  onClick={(e) => handleToggleMenu(doc.id, e)}
                                  disabled={!hasAnyAction}
                                  aria-label="การจัดการ"
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                {isOpen && hasAnyAction && (
                                  <div
                                    className={`absolute right-0 z-20 w-56 bg-white rounded-xl border border-gray-100 shadow-lg py-1.5 text-left ${
                                      menuOpenUpward ? 'bottom-full mb-1' : 'mt-1'
                                    }`}
                                  >
                                    {hasAttachments &&
                                      doc.documents!.map((d) => (
                                        <button
                                          key={d.id}
                                          onClick={() => {
                                            setOpenMenuId(null);
                                            handleDownloadDoc(doc, d.id, d.fileName ?? 'attachment');
                                          }}
                                          className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-gray-600 hover:bg-gray-50"
                                        >
                                          <Download className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                          <span className="truncate">{d.fileName ?? 'เอกสารแนบ'}</span>
                                        </button>
                                      ))}
                                    {hasAttachments && (hasEdit || hasCancel || hasDelete) && (
                                      <div className="my-1 border-t border-gray-100" />
                                    )}
                                    {hasEdit && (
                                      <Link
                                        href={doc.editUrl!}
                                        onClick={() => setOpenMenuId(null)}
                                        className="flex items-center gap-2 px-3.5 py-2 text-xs text-blue-600 hover:bg-blue-50"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                        แก้ไขต่อ
                                      </Link>
                                    )}
                                    {hasCancel && (
                                      <button
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          handleCancel(doc);
                                        }}
                                        className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-red-600 hover:bg-red-50"
                                      >
                                        <Ban className="w-3.5 h-3.5" />
                                        ถอนคำขอ
                                      </button>
                                    )}
                                    {hasDelete && (
                                      <button
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          handleDelete(doc);
                                        }}
                                        className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        ลบ
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                แสดง
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                เอกสาร (ทั้งหมด {documents.length} รายการ)
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> ก่อนหน้า
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                      p === page ? 'bg-[#0B2046] text-white' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  ถัดไป <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

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

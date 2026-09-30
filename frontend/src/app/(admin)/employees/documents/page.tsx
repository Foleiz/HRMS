'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Download, Loader2, AlertTriangle, BellRing, FileClock, FileX2, ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { AccessDenied } from '@/components/common/AccessDenied';
import { employeeDocumentService } from '@/services/employeeDocumentService';
import { EmployeeDocument } from '@/types/employeeDocument';

type StatusFilter = 'ALL' | 'EXPIRING_SOON' | 'EXPIRED';

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
};

const apiMessage = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/** เอกสารพนักงานใกล้หมดอายุ / หมดอายุแล้ว (ฝ่ายบุคคล) */
export default function ExpiringDocumentsPage() {
  const { hasPermission, hasRole } = useAuth();
  const toast = useToast();
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [checking, setChecking] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const canViewProfile = hasPermission('EMP_PROFILE_VIEW') || hasPermission('EMP_VIEW');
  const canViewTypes = hasPermission('EMP_TYPE_VIEW') || hasPermission('EMP_VIEW');
  const canViewTransfers = hasPermission('EMP_TRANSFER_VIEW') || hasPermission('EMP_VIEW');
  const canViewContracts = hasPermission('EMP_CONTRACT_VIEW') || hasPermission('EMP_VIEW');
  const isHr = ['HR', 'HR_ADMIN', 'HR_MGR', 'SUPER_ADMIN', 'SYS_ADMIN'].some((r) => hasRole(r));

  const subNavTabs = [
    { title: 'จัดการพนักงาน', href: '/employees', show: canViewProfile },
    { title: 'ประเภทพนักงาน', href: '/employees/types', show: canViewTypes },
    { title: 'การย้ายแผนก/การเลื่อนตำแหน่ง', href: '/employees/transfers', show: canViewTransfers },
    { title: 'สัญญาจ้าง', href: '/employees/contracts', show: canViewContracts },
    { title: 'เอกสารใกล้หมดอายุ', href: '/employees/documents', active: true, show: canViewProfile },
  ].filter((t) => t.show);

  useEffect(() => {
    if (!isHr) return;
    let active = true;
    employeeDocumentService
      .getExpiring()
      .then((items) => {
        if (!active) return;
        setDocuments(items);
        setError(null);
      })
      .catch((err: unknown) => {
        if (active) setError(apiMessage(err, 'ไม่สามารถโหลดรายการเอกสารได้'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isHr, reloadKey]);

  const counts = useMemo(
    () => ({
      expiring: documents.filter((d) => d.expiryStatus === 'EXPIRING_SOON').length,
      expired: documents.filter((d) => d.expiryStatus === 'EXPIRED').length,
    }),
    [documents],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((d) => {
      if (statusFilter !== 'ALL' && d.expiryStatus !== statusFilter) return false;
      if (!q) return true;
      return [d.employeeName, d.employeeCode, d.departmentName, d.documentTypeName]
        .some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [documents, statusFilter, search]);

  const handleRunCheck = async () => {
    setChecking(true);
    try {
      const r = await employeeDocumentService.runExpiryCheck();
      const total = r.expiringSoonNotified + r.expiredNotified;
      if (total === 0) toast.info('ไม่มีเอกสารใหม่ที่ต้องแจ้งเตือน (เอกสารที่แจ้งไปแล้วจะไม่แจ้งซ้ำ)');
      else toast.success(`ส่งแจ้งเตือนแล้ว: ใกล้หมดอายุ ${r.expiringSoonNotified} รายการ / หมดอายุ ${r.expiredNotified} รายการ`);
      setLoading(true);
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      toast.error(apiMessage(err, 'ไม่สามารถตรวจเอกสารได้'));
    } finally {
      setChecking(false);
    }
  };

  const handleDownload = async (doc: EmployeeDocument) => {
    setDownloadingId(doc.id);
    try {
      const blob = await employeeDocumentService.download(doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName || doc.documentTypeName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('ไม่สามารถดาวน์โหลดเอกสารได้');
    } finally {
      setDownloadingId(null);
    }
  };

  if (!canViewProfile || !isHr) {
    return (
      <AccessDenied
        title="ไม่มีสิทธิ์ดูเอกสารใกล้หมดอายุ"
        message="หน้านี้สำหรับฝ่ายบุคคลเท่านั้น กรุณาติดต่อผู้ดูแลระบบ"
      />
    );
  }

  const filterButtons: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'ALL', label: 'ทั้งหมด', count: documents.length },
    { key: 'EXPIRING_SOON', label: 'ใกล้หมดอายุ', count: counts.expiring },
    { key: 'EXPIRED', label: 'หมดอายุแล้ว', count: counts.expired },
  ];

  return (
    <div className="space-y-5 font-sans pb-12">
      <div className="border-b border-slate-200 bg-white px-4 -mt-2 rounded-t-2xl shadow-2xs">
        <nav className="flex space-x-6 overflow-x-auto no-scrollbar py-2 text-[13px] font-medium">
          {subNavTabs.map((tab) => (
            <Link
              key={tab.title}
              href={tab.href}
              className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium ${
                tab.active
                  ? 'border-[#0B2046] text-[#0B2046] font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              {tab.title}
            </Link>
          ))}
        </nav>
      </div>

      {/* สรุป */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <FileClock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-700">ใกล้หมดอายุ</h4>
              <p className="text-xs text-slate-400">อยู่ในช่วงแจ้งเตือนของแต่ละประเภทเอกสาร</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600">{counts.expiring}</div>
        </div>
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
              <FileX2 className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-700">หมดอายุแล้ว</h4>
              <p className="text-xs text-slate-400">ควรขอเอกสารฉบับใหม่จากพนักงาน</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600">{counts.expired}</div>
        </div>
      </div>

      {/* ตัวกรอง */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ รหัสพนักงาน แผนก หรือประเภทเอกสาร"
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {filterButtons.map((b) => (
              <button
                key={b.key}
                type="button"
                onClick={() => setStatusFilter(b.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                  statusFilter === b.key
                    ? 'bg-[#0B2046] text-white border-[#0B2046]'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {b.label} ({b.count})
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={handleRunCheck}
          disabled={checking}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-[#0B2046] text-[#0B2046] text-xs font-medium rounded-xl hover:bg-[#0B2046] hover:text-white transition-colors cursor-pointer disabled:opacity-60"
          title="ปกติระบบตรวจและแจ้งเตือนเองทุก 6 ชั่วโมง"
        >
          {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
          ตรวจและแจ้งเตือนตอนนี้
        </button>
      </div>

      {/* ตาราง */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden text-xs">
        {loading ? (
          <div className="py-16 flex items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลด...
          </div>
        ) : error ? (
          <div className="m-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">ไม่มีเอกสารใกล้หมดอายุหรือหมดอายุแล้ว</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="bg-slate-50 text-slate-500 text-[11px]">
                <tr>
                  <th className="text-left font-semibold px-4 py-2.5">พนักงาน</th>
                  <th className="text-left font-semibold px-4 py-2.5">แผนก</th>
                  <th className="text-left font-semibold px-4 py-2.5">ประเภทเอกสาร</th>
                  <th className="text-left font-semibold px-4 py-2.5">วันหมดอายุ</th>
                  <th className="text-left font-semibold px-4 py-2.5">สถานะ</th>
                  <th className="text-right font-semibold px-4 py-2.5">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((doc) => {
                  const expired = doc.expiryStatus === 'EXPIRED';
                  const days = doc.daysToExpiry ?? 0;
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{doc.employeeName || '-'}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{doc.employeeCode}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{doc.departmentName || '-'}</td>
                      <td className="px-4 py-3">
                        <p className="text-slate-800">{doc.documentTypeName}</p>
                        <p className="text-[11px] text-slate-400 break-all max-w-[220px]">{doc.fileName}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(doc.expiryDate)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-medium ${
                            expired
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {expired ? `หมดอายุแล้ว ${Math.abs(days)} วัน` : `อีก ${days} วัน`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {doc.hasFile && (
                            <button
                              type="button"
                              title="ดาวน์โหลด"
                              onClick={() => handleDownload(doc)}
                              disabled={downloadingId === doc.id}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[#0B2046] cursor-pointer disabled:opacity-50"
                            >
                              {downloadingId === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            </button>
                          )}
                          <Link
                            href={`/employees/${doc.employeeId}?tab=documents`}
                            title="เปิดแฟ้มเอกสารพนักงาน"
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[#0B2046]"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
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
    </div>
  );
}

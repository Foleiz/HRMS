'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useToast } from '@/context/ToastContext';
import AccessDenied from '@/components/common/AccessDenied';
import { Button, TablePagination } from '@/components/ui';
import { BenefitsSubNav } from '@/components/benefits/BenefitsSubNav';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { benefitService } from '@/services/benefitService';
import { BenefitClaim } from '@/types/benefit';
import { getSmartYearRange } from '@/lib/yearUtils';
import { confirmAction } from '@/lib/sweetalert';
import BenefitAttachmentPreviewModal from '@/components/benefits/BenefitAttachmentPreviewModal';
import {
  Gift,
  Calendar,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Ban,
  Paperclip,
  Trash2,
  Loader2,
  Receipt,
  Building2,
  FileText,
  User,
  History,
  Coins,
} from 'lucide-react';

function paymentStatusLabel(c: BenefitClaim): string {
  switch (c.paymentStatus) {
    case 'UNPAID':
      return 'รอสรุปรอบเงินเดือน';
    case 'IN_PAYROLL':
      return c.payrollPeriodYear && c.payrollPeriodMonth
        ? `อยู่ในรอบ ${c.payrollPeriodMonth}/${c.payrollPeriodYear + 543}`
        : 'อยู่ในรอบเงินเดือน';
    case 'PAID':
      return c.payrollPeriodYear && c.payrollPeriodMonth
        ? `จ่ายแล้ว (รอบ ${c.payrollPeriodMonth}/${c.payrollPeriodYear + 543})`
        : 'จ่ายแล้ว';
    case 'NOT_APPLICABLE':
      return 'ไม่มีการจ่ายเงิน';
    default:
      return '';
  }
}

function formatThaiShortDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear() + 543;
  return `${day}/${month}/${year}`;
}

const CLAIM_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  APPROVED: {
    label: 'อนุมัติแล้ว',
    className: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  PENDING: {
    label: 'รออนุมัติ',
    className: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  REJECTED: {
    label: 'ไม่อนุมัติ',
    className: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
  CANCELLED: {
    label: 'ยกเลิกแล้ว',
    className: 'bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  },
};

export default function BenefitClaimsHistoryPage() {
  const { hasPermission, hasRole } = useAuth();
  const isSuper = hasRole('ADMIN') || hasRole('SYSTEM_SUPER');
  const canViewBalances = hasPermission('BENEFIT_BALANCE_VIEW') || hasPermission('BENEFIT_VIEW') || isSuper;
  const canView = hasPermission('BENEFIT_CLAIM_VIEW') || hasPermission('BENEFIT_VIEW') || isSuper;
  const canDeleteClaim = hasPermission('BENEFIT_CLAIM_EDIT') || hasPermission('BENEFIT_BALANCE_EDIT') || isSuper;

  const { setBreadcrumb } = useBreadcrumb();
  const toast = useToast();

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [claims, setClaims] = useState<BenefitClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingClaimId, setDeletingClaimId] = useState<number | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Attachment Preview modal
  const [previewClaim, setPreviewClaim] = useState<BenefitClaim | null>(null);


  useEffect(() => {
    setBreadcrumb({
      section: 'สวัสดิการ',
      page: 'ประวัติการเบิกจ่ายและใช้สิทธิ์สวัสดิการ',
    });
  }, [setBreadcrumb]);

  const fetchClaims = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await benefitService.getAllClaims({
        year: selectedYear,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: search.trim() || undefined,
      });
      setClaims(data);
    } catch (err: unknown) {
      console.error('Failed to load benefit claims:', err);
      toast.error('ไม่สามารถดึงข้อมูลประวัติการเบิกจ่ายสวัสดิการได้');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, statusFilter, search, canView, toast]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  const handleDeleteClaim = async (claim: BenefitClaim) => {
    const isApproved = claim.status === 'APPROVED';
    const isPending = claim.status === 'PENDING';
    const confirmText = isPending
      ? `ยกเลิกคำขอเบิกสวัสดิการ "${claim.benefitName}" ของ ${claim.employeeName || 'พนักงาน'}?`
      : `ลบรายการเบิกสวัสดิการ "${claim.benefitName}" (${claim.amount.toLocaleString()} บ.) ของ ${claim.employeeName || 'พนักงาน'}? ยอดเงินจะถูกคืนเข้าโควตาของพนักงานทันที`;

    const ok = await confirmAction({
      title: isPending ? 'ยืนยันการยกเลิกคำขอ' : 'ยืนยันการลบรายการเบิก',
      text: confirmText,
      confirmButtonText: isPending ? 'ยกเลิกคำขอ' : 'ลบรายการ',
      isDestructive: true,
    });

    if (!ok) return;

    try {
      setDeletingClaimId(claim.id);
      if (isPending) {
        await benefitService.cancelClaimRequest(claim.id);
        toast.success('ยกเลิกคำขอเบิกสวัสดิการสำเร็จ');
      } else {
        await benefitService.deleteClaim(claim.id);
        toast.success('ลบรายการเบิกสวัสดิการและคืนยอดโควตาสำเร็จ');
      }
      await fetchClaims();
    } catch (err: unknown) {
      console.error('Failed to delete claim:', err);
      const msg = err instanceof Error ? err.message : 'ไม่สามารถลบรายการเบิกได้';
      toast.error(msg);
    } finally {
      setDeletingClaimId(null);
    }
  };

  // KPI calculations
  const totalApprovedAmount = useMemo(() => {
    return claims
      .filter((c) => c.status === 'APPROVED')
      .reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
  }, [claims]);

  const pendingCount = useMemo(() => {
    return claims.filter((c) => c.status === 'PENDING').length;
  }, [claims]);

  const approvedCount = useMemo(() => {
    return claims.filter((c) => c.status === 'APPROVED').length;
  }, [claims]);

  // Pagination
  const paginatedClaims = useMemo(() => {
    const start = (page - 1) * pageSize;
    return claims.slice(start, start + pageSize);
  }, [claims, page, pageSize]);

  if (!canView) {
    return (
      <AccessDenied
        title="ไม่มีสิทธิ์เข้าถึงประวัติการเบิกจ่ายสวัสดิการ"
        message="คุณไม่มีสิทธิ์ในการดูข้อมูลประวัติการเบิกจ่ายและใช้สิทธิ์สวัสดิการ (ต้องการสิทธิ์: BENEFIT_CLAIM_VIEW)"
      />
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Sub-Navigation Tabs matching Design System */}
      <BenefitsSubNav />

      {/* 2. KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: รายการทั้งหมด */}
        <div className="bg-sky-100 dark:bg-sky-950/60 p-4 rounded-2xl border border-sky-300 dark:border-sky-800 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-800 dark:text-sky-300">รายการเบิกทั้งหมด</span>
            <div className="w-8 h-8 rounded-full bg-white dark:bg-sky-900/60 text-sky-600 dark:text-sky-300 shadow-xs flex items-center justify-center shrink-0">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-sky-950 dark:text-sky-100">{claims.length}</div>
        </div>

        {/* Card 2: อนุมัติแล้ว */}
        <div className="bg-emerald-100 dark:bg-emerald-950/60 p-4 rounded-2xl border border-emerald-300 dark:border-emerald-800 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">อนุมัติแล้ว</span>
            <div className="w-8 h-8 rounded-full bg-white dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 shadow-xs flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-300">{approvedCount}</div>
        </div>

        {/* Card 3: รออนุมัติ */}
        <div className="bg-amber-100 dark:bg-amber-950/60 p-4 rounded-2xl border border-amber-300 dark:border-amber-800 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300">รอการอนุมัติ</span>
            <div className="w-8 h-8 rounded-full bg-white dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 shadow-xs flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-300">{pendingCount}</div>
        </div>

        {/* Card 4: ยอดเงินเบิกรวม */}
        <div className="bg-purple-100 dark:bg-purple-950/60 p-4 rounded-2xl border border-purple-300 dark:border-purple-800 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-800 dark:text-purple-300">ยอดเงินเบิกรวม</span>
            <div className="w-8 h-8 rounded-full bg-white dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 shadow-xs flex items-center justify-center shrink-0">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-purple-950 dark:text-purple-100">
            {totalApprovedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-semibold">บ.</span>
          </div>
        </div>
      </div>

      {/* 3. Main Card: Toolbar + Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs p-6 space-y-5">
        {/* Toolbar: Search, Year, Status */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Box */}
            <div className="relative w-64 sm:w-80 shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="ค้นหาเลขที่คำขอ, ชื่อพนักงาน, สวัสดิการ, ใบเสร็จ..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-500/20 dark:focus:border-blue-500 transition-all"
              />
            </div>

            {/* Year Select */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/90 pl-2.5 pr-1 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">ประจำปี:</span>
              <CustomSelect
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(Number(e.target.value));
                  setPage(1);
                }}
                size="sm"
                buttonClassName="!h-7 !py-0 !px-2 !text-xs !font-bold !rounded-lg !shadow-2xs"
                className="min-w-[95px]"
              >
                {getSmartYearRange({ forwardYears: 1, backYears: 5, selectedYear }).map((y) => (
                  <option key={y} value={y}>
                    พ.ศ. {y + 543}
                  </option>
                ))}
              </CustomSelect>
            </div>

            {/* Status Select */}
            <CustomSelect
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(String(val));
                setPage(1);
              }}
              size="sm"
              placeholder="สถานะทั้งหมด"
              className="min-w-[130px]"
              options={[
                { value: 'ALL', label: 'สถานะทั้งหมด' },
                { value: 'APPROVED', label: 'อนุมัติแล้ว' },
                { value: 'PENDING', label: 'รออนุมัติ' },
                { value: 'REJECTED', label: 'ไม่อนุมัติ' },
                { value: 'CANCELLED', label: 'ยกเลิกแล้ว' },
              ]}
            />
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
            ทั้งหมด <span className="font-bold text-slate-800 dark:text-slate-200">{claims.length}</span> รายการ
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500 text-xs">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
              <span>กำลังโหลดข้อมูลประวัติการเบิกจ่ายสวัสดิการ...</span>
            </div>
          ) : claims.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500 text-xs">
              <History className="w-8 h-8 mb-2 stroke-[1.5] text-slate-300 dark:text-slate-600" />
              <span>ไม่พบข้อมูลประวัติการเบิกจ่ายสวัสดิการ</span>
            </div>
          ) : (
            <table className="table-standard w-full min-w-[950px] text-left text-xs border-collapse whitespace-nowrap">
              <thead className="bg-primary text-white font-semibold">
                <tr className="whitespace-nowrap">
                  <th className="py-3 px-4 whitespace-nowrap">เลขที่คำขอ</th>
                  <th className="py-3 px-4 whitespace-nowrap">วันที่ใช้สิทธิ์</th>
                  <th className="py-3 px-4 whitespace-nowrap">พนักงาน</th>
                  <th className="py-3 px-4 whitespace-nowrap">รายการสวัสดิการ</th>
                  <th className="py-3 px-4 whitespace-nowrap">สถานพยาบาล / ผู้ให้บริการ</th>
                  <th className="py-3 px-4 whitespace-nowrap">เลขที่ใบเสร็จ</th>
                  <th className="py-3 px-4 whitespace-nowrap">รายละเอียด / หมายเหตุ</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">จำนวนเงิน</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">สถานะ</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedClaims.map((c) => {
                  const badge = CLAIM_STATUS_BADGE[c.status] ?? CLAIM_STATUS_BADGE.APPROVED;
                  const Icon =
                    c.status === 'PENDING'
                      ? Clock
                      : c.status === 'REJECTED'
                      ? XCircle
                      : c.status === 'CANCELLED'
                      ? Ban
                      : CheckCircle2;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* เลขที่คำขอ */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {c.requestNo || `BC-${String(c.id).padStart(4, '0')}`}
                      </td>

                      {/* วันที่ใช้สิทธิ์ */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {formatThaiShortDate(c.claimDate)}
                      </td>

                      {/* พนักงาน */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {c.employeeName || '-'}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                          {c.employeeCode || ''}
                        </div>
                      </td>

                      {/* รายการสวัสดิการ */}
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {c.benefitName}
                      </td>

                      {/* สถานพยาบาล / ผู้ให้บริการ */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 max-w-[180px] truncate" title={c.serviceProvider || '-'}>
                        {c.serviceProvider || '-'}
                      </td>

                      {/* เลขที่ใบเสร็จ + แนบไฟล์ */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {c.receiptNumber || '-'}
                          </span>
                          {(c.attachmentFileName || c.fileName) && (
                            <button
                              type="button"
                              onClick={() => setPreviewClaim(c)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[10px] text-blue-700 dark:text-blue-300 font-sans border border-blue-200/60 dark:border-blue-800/60 transition-colors cursor-pointer group"
                              title={`คลิกเพื่อเปิดดูไฟล์แนบ: ${c.attachmentFileName || c.fileName}`}
                            >
                              <Paperclip className="w-3 h-3 shrink-0 text-blue-500 group-hover:scale-110 transition-transform" />
                              <span className="truncate max-w-[130px] font-medium group-hover:underline">
                                {c.attachmentFileName || c.fileName}
                              </span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* รายละเอียด / หมายเหตุ */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 max-w-[200px] truncate" title={c.remarks || '-'}>
                        {c.remarks || '-'}
                      </td>

                      {/* จำนวนเงิน */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {c.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บ.
                        {c.status === 'APPROVED' && c.paymentStatus && (
                          <span className="block text-[10px] font-normal text-slate-400 dark:text-slate-500">
                            {paymentStatusLabel(c)}
                          </span>
                        )}
                      </td>

                      {/* สถานะ */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badge.className}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* จัดการ */}
                      <td className="py-3.5 px-4 text-center">
                        {canDeleteClaim ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteClaim(c)}
                            disabled={deletingClaimId === c.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
                            title={c.status === 'PENDING' ? 'ยกเลิกคำขอ' : 'ลบรายการเบิก'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Table Footer with TablePagination มาตรฐานระบบ */}
        {claims.length > 0 && (
          <TablePagination
            total={claims.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
          />
        )}
      </div>

      {/* Modal Preview ไฟล์แนบใบเสร็จ */}
      <BenefitAttachmentPreviewModal
        isOpen={Boolean(previewClaim)}
        onClose={() => setPreviewClaim(null)}
        claimId={previewClaim?.id ?? null}
        fileName={previewClaim?.attachmentFileName || previewClaim?.fileName}
        title={previewClaim?.benefitName}
        requestNo={previewClaim?.requestNo}
      />
    </div>
  );
}

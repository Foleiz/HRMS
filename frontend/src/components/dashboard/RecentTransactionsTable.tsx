'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, FileText, Loader2 } from 'lucide-react';
import { leaveService } from '@/services/leaveService';
import { certificateService } from '@/services/certificateService';
import { LeaveRequest } from '@/types/leave';

interface RecentTransactionItem {
  id: string | number;
  documentCode: string;
  createdDate: string;
  duration: string;
  documentType: string;
  status: string;
  rawDate?: string | null;
}

/**
 * แปลงวันที่ ISO string เป็นรูปแบบภาษาไทย พ.ศ. (เช่น 23 ก.ย. 2569)
 */
function formatThaiDate(dateStr?: string | null, includeYear = true): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: includeYear ? 'numeric' : undefined,
    });
  } catch {
    return '-';
  }
}

/**
 * จัดรูปแบบระยะเวลาในการลา (เช่น "1 วัน (26 ก.ย. 2569)" หรือ "2 วัน (28-30 ก.ย. 2569)")
 */
function formatDuration(
  leaveDays?: number | null,
  startDatetime?: string | null,
  endDatetime?: string | null
): string {
  const days = leaveDays ?? 1;
  const daysText = `${days} วัน`;
  if (!startDatetime) return daysText;

  const start = new Date(startDatetime);
  if (isNaN(start.getTime())) return daysText;

  if (!endDatetime) {
    const startStr = formatThaiDate(startDatetime, true);
    return `${daysText} (${startStr})`;
  }

  const end = new Date(endDatetime);
  if (isNaN(end.getTime())) {
    const startStr = formatThaiDate(startDatetime, true);
    return `${daysText} (${startStr})`;
  }

  // วันเดียวกัน หรือลา 1 วัน
  const isSameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (isSameDay || days <= 1) {
    const startStr = formatThaiDate(startDatetime, true);
    return `${daysText} (${startStr})`;
  }

  // เดือนและปีเดียวกัน
  const isSameMonthAndYear =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth();

  if (isSameMonthAndYear) {
    const startDay = start.getDate();
    const endStr = formatThaiDate(endDatetime, true);
    return `${daysText} (${startDay}-${endStr})`;
  }

  // ข้ามเดือนหรือข้ามปี
  const startStr = formatThaiDate(startDatetime, false);
  const endStr = formatThaiDate(endDatetime, true);
  return `${daysText} (${startStr} - ${endStr})`;
}

export const RecentTransactionsTable: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [transactions, setTransactions] = useState<RecentTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ดึงประวัติคำขอเฉพาะบุคคลของผู้ล็อกอิน (Self Only) จาก backend
  useEffect(() => {
    let isMounted = true;

    const fetchPersonalRequests = async () => {
      setLoading(true);
      try {
        const [leaveRes, certRes] = await Promise.allSettled([
          leaveService.getMyLeaveRequests({ pageSize: 100 }),
          certificateService.getMyRequests(),
        ]);

        const items: RecentTransactionItem[] = [];

        // 1. คำขอลาหยุดงานของตนเอง
        if (leaveRes.status === 'fulfilled' && Array.isArray(leaveRes.value)) {
          leaveRes.value.forEach((r: LeaveRequest) => {
            const rawDate = r.submittedAt || (r as any).createdAt || r.startDatetime || null;
            const createdDate = formatThaiDate(rawDate);
            const duration = formatDuration(
              r.leaveDays ?? (r as any).totalDays ?? 1,
              r.startDatetime || (r as any).startDate,
              r.endDatetime || (r as any).endDate
            );

            items.push({
              id: `leave-${r.id}`,
              documentCode: r.requestNo || `LR-${r.id}`,
              createdDate,
              duration,
              documentType: r.leaveTypeName || 'ลางาน',
              status: (r.status || 'PENDING').toUpperCase(),
              rawDate,
            });
          });
        }

        // 2. คำขอหนังสือรับรองของตนเอง
        if (certRes.status === 'fulfilled' && Array.isArray(certRes.value)) {
          certRes.value.forEach((c) => {
            const rawDate = c.requestedAt || null;
            items.push({
              id: `cert-${c.id}`,
              documentCode: c.certificateCode || `CR-${c.id}`,
              createdDate: formatThaiDate(rawDate),
              duration: '-',
              documentType: c.certificateName || 'ขอหนังสือรับรอง',
              status: (c.status || 'PENDING').toUpperCase(),
              rawDate,
            });
          });
        }

        // เรียงลำดับจากวันที่ล่าสุดไปเก่าสุด
        items.sort((a, b) => {
          const timeA = a.rawDate ? new Date(a.rawDate).getTime() : 0;
          const timeB = b.rawDate ? new Date(b.rawDate).getTime() : 0;
          return timeB - timeA;
        });

        if (isMounted) {
          setTransactions(items);
        }
      } catch (err) {
        console.error('Failed to fetch personal transactions:', err);
        if (isMounted) {
          setTransactions([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPersonalRequests();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter transactions
  const filtered = useMemo(() => {
    return transactions.filter((item) => {
      // 1. Search Code or Type
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const codeMatch = item.documentCode.toLowerCase().includes(query);
        const typeMatch = item.documentType.toLowerCase().includes(query);
        if (!codeMatch && !typeMatch) return false;
      }

      // 2. Date Range Filter
      if (dateRange && item.rawDate) {
        const itemDate = new Date(item.rawDate);
        const now = new Date();
        if (!isNaN(itemDate.getTime())) {
          if (dateRange === 'THIS_MONTH') {
            if (
              itemDate.getMonth() !== now.getMonth() ||
              itemDate.getFullYear() !== now.getFullYear()
            ) {
              return false;
            }
          } else if (dateRange === 'LAST_MONTH') {
            const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
            const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
            if (
              itemDate.getMonth() !== prevMonth ||
              itemDate.getFullYear() !== prevYear
            ) {
              return false;
            }
          } else if (dateRange === 'THIS_YEAR') {
            if (itemDate.getFullYear() !== now.getFullYear()) {
              return false;
            }
          }
        }
      }

      // 3. Document Type Filter
      if (selectedType !== 'ALL') {
        if (!item.documentType.toLowerCase().includes(selectedType.toLowerCase())) {
          return false;
        }
      }

      // 4. Status Filter
      if (selectedStatus !== 'ALL') {
        if (item.status.toUpperCase() !== selectedStatus.toUpperCase()) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, searchTerm, dateRange, selectedType, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'ISSUED':
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            อนุมัติแล้ว
          </span>
        );
      case 'PENDING':
      case 'WAITING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            รออนุมัติ
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            ไม่อนุมัติ
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            ยกเลิกแล้ว
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            แบบร่าง
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between flex-1 h-full">
      {/* Table Header & Filters */}
      <div className="p-5 border-b border-slate-100 space-y-3.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">
            ประวัติการทำรายการล่าสุด
          </h2>
          <span className="text-[11px] text-slate-400">
            * แสดงเฉพาะรายการส่วนบุคคลของคุณ
          </span>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="ค้นหา รหัสเอกสาร หรือประเภท"
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-hidden focus:border-[#0B2046] focus:bg-white transition-all"
            />
          </div>

          {/* Date Range Selector */}
          <select
            value={dateRange}
            onChange={(e) => {
              setDateRange(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-hidden focus:border-[#0B2046] cursor-pointer"
          >
            <option value="">เลือกช่วงวันที่ท่านต้องการ</option>
            <option value="THIS_MONTH">เดือนนี้</option>
            <option value="LAST_MONTH">เดือนที่แล้ว</option>
            <option value="THIS_YEAR">ปีนี้</option>
          </select>

          {/* Type Selector */}
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-hidden focus:border-[#0B2046] cursor-pointer"
          >
            <option value="ALL">ประเภท ทั้งหมด</option>
            <option value="ลาพักร้อน">ลาพักร้อน</option>
            <option value="ลาป่วย">ลาป่วย</option>
            <option value="ลากิจ">ลากิจ</option>
            <option value="ลาพิเศษ">ลาพิเศษ</option>
            <option value="หนังสือรับรอง">ขอหนังสือรับรอง</option>
          </select>

          {/* Status Selector */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-hidden focus:border-[#0B2046] cursor-pointer"
          >
            <option value="ALL">สถานะ ทั้งหมด</option>
            <option value="PENDING">รออนุมัติ</option>
            <option value="APPROVED">อนุมัติแล้ว</option>
            <option value="REJECTED">ไม่อนุมัติ</option>
            <option value="CANCELLED">ยกเลิกแล้ว</option>
            <option value="DRAFT">แบบร่าง</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto flex-1 flex flex-col justify-between min-h-0">
        <table className="w-full text-left text-xs text-slate-600 flex-1">
          <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100 shrink-0">
            <tr>
              <th className="py-3 px-5">รหัสเอกสาร</th>
              <th className="py-3 px-5">วันที่กรอกเอกสาร</th>
              <th className="py-3 px-5">ระยะเวลาในการลา</th>
              <th className="py-3 px-5">ประเภทเอกสาร</th>
              <th className="py-3 px-5">สถานะเอกสาร</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 flex-1">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 text-[#0B2046] animate-spin" />
                    <span className="text-xs">กำลังโหลดประวัติการทำรายการของคุณ...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                    <FileText className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                    <p className="text-sm font-medium text-slate-600">ไม่พบข้อมูลประวัติการทำรายการของคุณ</p>
                    <p className="text-xs text-slate-400">เมื่อคุณยื่นคำขอลาหยุดงานหรือส่งเอกสาร ข้อมูลจะแสดงที่นี่โดยอัตโนมัติ</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-5 font-semibold text-[#0B2046]">
                    {item.documentCode}
                  </td>
                  <td className="py-3.5 px-5 text-slate-600">
                    {item.createdDate}
                  </td>
                  <td className="py-3.5 px-5 text-slate-700">
                    {item.duration}
                  </td>
                  <td className="py-3.5 px-5 text-slate-700">
                    {item.documentType}
                  </td>
                  <td className="py-3.5 px-5">
                    {renderStatusBadge(item.status)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="p-3.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-auto shrink-0">
        <div className="flex-1 text-[11px] text-slate-400">
          {!loading && filtered.length > 0 && (
            <span>ทั้งหมด {filtered.length} รายการ</span>
          )}
        </div>

        {/* Center: Pagination controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1 || loading}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-semibold text-slate-700 min-w-[60px] text-center">
            {currentPage} / {totalPages} หน้า
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages || loading}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Page Size display */}
        <div className="flex-1 flex items-center justify-end gap-1.5 text-xs text-slate-500">
          <span>แสดง</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-0.5 rounded border border-slate-200 bg-white font-medium cursor-pointer"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
          <span>เอกสาร</span>
        </div>
      </div>
    </div>
  );
};

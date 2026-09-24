'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { leaveService } from '@/services/leaveService';
import { LeaveRequest } from '@/types/leave';

interface RecentTransactionItem {
  id: string | number;
  documentCode: string;
  createdDate: string;
  duration: string;
  documentType: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
}

const DEFAULT_SAMPLE_TRANSACTIONS: RecentTransactionItem[] = [
  {
    id: 1,
    documentCode: 'DOC-2569-0012',
    createdDate: '10 ส.ค. 2569',
    duration: '1 วัน (10 ส.ค. 2569)',
    documentType: 'ลาป่วย',
    status: 'APPROVED',
  },
  {
    id: 2,
    documentCode: 'DOC-2569-0018',
    createdDate: '15 ส.ค. 2569',
    duration: '2 วัน (15-16 ส.ค. 2569)',
    documentType: 'ลาพักร้อน',
    status: 'APPROVED',
  },
  {
    id: 3,
    documentCode: 'DOC-2569-0025',
    createdDate: '20 ส.ค. 2569',
    duration: '1 วัน (20 ส.ค. 2569)',
    documentType: 'ลากิจ',
    status: 'PENDING',
  },
  {
    id: 4,
    documentCode: 'DOC-2569-0031',
    createdDate: '24 ส.ค. 2569',
    duration: '0.5 วัน (ครึ่งวันเช้า)',
    documentType: 'ลาป่วย',
    status: 'APPROVED',
  },
  {
    id: 5,
    documentCode: 'DOC-2569-0040',
    createdDate: '28 ส.ค. 2569',
    duration: '1 วัน (28 ส.ค. 2569)',
    documentType: 'ลาพักร้อน',
    status: 'PENDING',
  },
  {
    id: 6,
    documentCode: 'DOC-2569-0045',
    createdDate: '01 ก.ย. 2569',
    duration: '1 วัน (01 ก.ย. 2569)',
    documentType: 'ลาพิเศษ',
    status: 'REJECTED',
  },
];

export const RecentTransactionsTable: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [transactions, setTransactions] = useState<RecentTransactionItem[]>(DEFAULT_SAMPLE_TRANSACTIONS);
  const [loading, setLoading] = useState(false);

  // ดึงประวัติคำขอเฉพาะบุคคลของตนเอง (Self Only) ผ่าน leaveService.getMyLeaveRequests
  useEffect(() => {
    const fetchPersonalRequests = async () => {
      setLoading(true);
      try {
        const myRequests = await leaveService.getMyLeaveRequests();
        if (myRequests && myRequests.length > 0) {
          const mapped: RecentTransactionItem[] = myRequests.map((r: LeaveRequest) => {
            const created = r.createdAt
              ? new Date(r.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
              : '-';
            const duration = `${r.totalDays || 1} วัน (${r.startDate ? new Date(r.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : ''})`;
            return {
              id: r.id,
              documentCode: r.requestNo || `DOC-${r.id}`,
              createdDate: created,
              duration: duration,
              documentType: r.leaveTypeName || 'ลางาน',
              status: (r.status as any) || 'PENDING',
            };
          });
          setTransactions(mapped);
        }
      } catch (err) {
        // หากไม่มีข้อมูลหรือต่อ API ไม่สำเร็จ ใช้ sample data ของตนเอง
      } finally {
        setLoading(false);
      }
    };
    fetchPersonalRequests();
  }, []);

  // Filter transactions
  const filtered = useMemo(() => {
    return transactions.filter((item) => {
      if (searchTerm && !item.documentCode.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (selectedType !== 'ALL' && item.documentType !== selectedType) {
        return false;
      }
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [transactions, searchTerm, selectedType, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const renderStatusBadge = (status: RecentTransactionItem['status']) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            อนุมัติแล้ว
          </span>
        );
      case 'PENDING':
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
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Table Header & Filters */}
      <div className="p-5 border-b border-slate-100 space-y-3.5">
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
              placeholder="ค้นหา รหัสเอกสาร"
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-hidden focus:border-[#0B2046] focus:bg-white transition-all"
            />
          </div>

          {/* Date Range Selector */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
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
            <option value="ลาป่วย">ลาป่วย</option>
            <option value="ลากิจ">ลากิจ</option>
            <option value="ลาพักร้อน">ลาพักร้อน</option>
            <option value="ลาพิเศษ">ลาพิเศษ</option>
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
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
            <tr>
              <th className="py-3 px-5">รหัสเอกสาร</th>
              <th className="py-3 px-5">วันที่กรอกเอกสาร</th>
              <th className="py-3 px-5">ระยะเวลาในการลา</th>
              <th className="py-3 px-5">ประเภทเอกสาร</th>
              <th className="py-3 px-5">สถานะเอกสาร</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-400">
                  ไม่พบข้อมูลประวัติการทำรายการ
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

      {/* Pagination Bar (ตรงตามภาพ) */}
      <div className="p-3.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex-1" />

        {/* Center: Pagination controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
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
            disabled={currentPage >= totalPages}
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

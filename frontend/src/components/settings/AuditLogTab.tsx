'use client';

import React, { useState } from 'react';
import {
  Search,
  Download,
  RotateCcw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { AuditLogItem, UserAccount } from '@/types/settings';

interface AuditLogTabProps {
  logs: AuditLogItem[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  users: UserAccount[];
  onPageChange: (page: number) => void;
  onFilterChange: (filters: {
    startDate?: string;
    endDate?: string;
    userId?: number;
    action?: string;
    entityType?: string;
    search?: string;
  }) => void;
  onExport: () => void;
  onViewDetail: (log: AuditLogItem) => void;
  isLoading: boolean;
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  LOGOUT: 'bg-slate-100 text-slate-600 border-slate-200',
  INSERT: 'bg-teal-50 text-teal-700 border-teal-200',
  UPDATE: 'bg-blue-50 text-blue-700 border-blue-200',
  DELETE: 'bg-rose-50 text-rose-700 border-rose-200',
  APPROVE: 'bg-purple-50 text-purple-700 border-purple-200',
  REJECT: 'bg-amber-50 text-amber-700 border-amber-200',
  EXPORT: 'bg-amber-50 text-amber-800 border-amber-300',
};

export const AuditLogTab: React.FC<AuditLogTabProps> = ({
  logs,
  totalCount,
  currentPage,
  pageSize,
  users,
  onPageChange,
  onFilterChange,
  onExport,
  onViewDetail,
  isLoading,
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('ทั้งหมด');
  const [selectedAction, setSelectedAction] = useState<string>('ทั้งหมด');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('ทั้งหมด');
  const [searchQuery, setSearchQuery] = useState('');

  const handleApplyFilter = () => {
    onFilterChange({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      userId: selectedUserId !== 'ทั้งหมด' ? Number(selectedUserId) : undefined,
      action: selectedAction !== 'ทั้งหมด' ? selectedAction : undefined,
      entityType: selectedEntityType !== 'ทั้งหมด' ? selectedEntityType : undefined,
      search: searchQuery.trim() || undefined,
    });
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setSelectedUserId('ทั้งหมด');
    setSelectedAction('ทั้งหมด');
    setSelectedEntityType('ทั้งหมด');
    setSearchQuery('');
    onFilterChange({});
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const formatLogDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      const thaiYear = d.getFullYear() + 543;
      const day = d.getDate();
      const month = months[d.getMonth()];
      const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      return `${day} ${month} ${thaiYear} - ${time}`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. วันที่ทำรายการ */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              วันที่ทำรายการ (เริ่มต้น - สิ้นสุด)
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
              />
            </div>
          </div>

          {/* 2. ผู้ใช้งาน */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              ผู้ใช้งาน
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
            >
              <option value="ทั้งหมด">ผู้ใช้งานทั้งหมด</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username} ({u.fullName})
                </option>
              ))}
            </select>
          </div>

          {/* 3. ประเภทการกระทำ (Action) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              ประเภทการกระทำ (Action)
            </label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
            >
              <option value="ทั้งหมด">การกระทำทั้งหมด</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="APPROVE">APPROVE</option>
              <option value="REJECT">REJECT</option>
              <option value="EXPORT">EXPORT</option>
            </select>
          </div>

          {/* 4. ประเภทข้อมูล */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              ประเภทข้อมูล
            </label>
            <select
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value)}
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
            >
              <option value="ทั้งหมด">ทุกประเภทข้อมูล</option>
              <option value="USER_ACCOUNT">ข้อมูลผู้ใช้ (USER_ACCOUNT)</option>
              <option value="ROLE">บทบาท (ROLE)</option>
              <option value="ROLE_PERMISSIONS">สิทธิ์การเข้าถึง (ROLE_PERMISSIONS)</option>
              <option value="EMPLOYEE">ข้อมูลพนักงาน (EMPLOYEE)</option>
              <option value="LEAVE_REQUEST">การขอลา (LEAVE_REQUEST)</option>
              <option value="ATTENDANCE">การลงเวลา (ATTENDANCE)</option>
            </select>
          </div>
        </div>

        {/* Second Row: Search + Action buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
              placeholder="ค้นหา (Keyword, IP, ID...)"
              className="w-full h-9.5 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleApplyFilter}
              className="h-9.5 px-4 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              ค้นหา
            </button>

            <button
              onClick={handleClearFilter}
              className="h-9.5 px-3.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>ล้างค่าตัวกรอง</span>
            </button>

            <button
              onClick={onExport}
              className="h-9.5 px-4 bg-[#0B2046] hover:bg-[#112d5e] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออกข้อมูลบันทึก</span>
            </button>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                <th className="py-3.5 px-4 min-w-[150px]">วันเวลา</th>
                <th className="py-3.5 px-4 min-w-[150px]">ผู้ใช้งาน</th>
                <th className="py-3.5 px-3 min-w-[90px] text-center">การกระทำ</th>
                <th className="py-3.5 px-4 min-w-[120px]">ประเภทข้อมูล</th>
                <th className="py-3.5 px-3 min-w-[90px]">รหัสข้อมูล</th>
                <th className="py-3.5 px-4 min-w-[110px]">ฟิลด์ที่แก้ไข</th>
                <th className="py-3.5 px-4 min-w-[100px]">ค่าเดิม</th>
                <th className="py-3.5 px-4 min-w-[180px]">ค่าใหม่ / ข้อมูลเพิ่มเติม</th>
                <th className="py-3.5 px-4 min-w-[110px]">IP Address</th>
                <th className="py-3.5 px-3 w-10 text-center"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                    กำลังโหลดบันทึกการใช้งานระบบ...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                    ไม่พบบันทึกการใช้งานระบบที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                logs.map((item) => {
                  const actionBadgeColor = ACTION_COLORS[item.action] || 'bg-slate-100 text-slate-600 border-slate-200';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => onViewDetail(item)}
                      className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                    >
                      {/* 1. วันเวลา */}
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        {formatLogDate(item.createdAt)}
                      </td>

                      {/* 2. ผู้ใช้งาน */}
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {item.username}{' '}
                        <span className="text-slate-400 font-normal">({item.fullName})</span>
                      </td>

                      {/* 3. การกระทำ */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${actionBadgeColor}`}>
                          {item.action}
                        </span>
                      </td>

                      {/* 4. ประเภทข้อมูล */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {item.entityType}
                      </td>

                      {/* 5. รหัสข้อมูล */}
                      <td className="py-3.5 px-3 font-mono text-[11px] text-slate-500">
                        {item.entityId ? `#${item.entityId}` : '-'}
                      </td>

                      {/* 6. ฟิลด์ที่แก้ไข */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                        {item.fieldName || '-'}
                      </td>

                      {/* 7. ค่าเดิม (สีแดง) */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-rose-600 font-medium truncate max-w-[120px]">
                        {item.oldValue || '-'}
                      </td>

                      {/* 8. ค่าใหม่ / ข้อมูลเพิ่มเติม (สีเขียว) */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-emerald-600 font-medium truncate max-w-[200px]">
                        {item.newValue || item.description || '-'}
                      </td>

                      {/* 9. IP Address */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                        {item.ipAddress || '-'}
                      </td>

                      {/* 10. Eye button */}
                      <td className="py-3.5 px-3 text-center text-slate-400 hover:text-slate-700">
                        <Eye className="w-3.5 h-3.5 mx-auto" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-white">
          <div>
            แสดง <span className="font-semibold text-slate-800">{logs.length}</span> รายการ
            (ทั้งหมด <span className="font-semibold text-slate-800">{totalCount}</span> รายการบันทึก)
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 rounded-lg font-semibold transition-all cursor-pointer ${
                  p === currentPage
                    ? 'bg-[#0B2046] text-white shadow-xs'
                    : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  MoreVertical,
  KeyRound,
  Edit2,
  Lock,
  Unlock,
  Trash2,
  FileSearch,
  ChevronLeft,
  ChevronRight,
  User,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { UserAccount, RoleSummary } from '@/types/settings';
import { ActionDropdown } from '@/components/ui/ActionDropdown';

interface UsersTabProps {
  users: UserAccount[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onPageSizeChange?: (size: number) => void;
  roles: RoleSummary[];
  onPageChange: (page: number) => void;
  onSearchChange: (search: string) => void;
  onRoleFilterChange: (roleId: number | undefined) => void;
  onStatusFilterChange: (status: string) => void;
  onAddUserClick: () => void;
  onEditUserClick: (user: UserAccount) => void;
  onResetPasswordClick: (user: UserAccount) => void;
  onToggleStatusClick: (user: UserAccount, newStatus: string) => void;
  onDeleteUserClick: (user: UserAccount) => void;
  onViewAuditLogForUser: (user: UserAccount) => void;
  isLoading: boolean;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  users,
  totalCount,
  currentPage,
  pageSize,
  onPageSizeChange,
  roles,
  onPageChange,
  onSearchChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onAddUserClick,
  onEditUserClick,
  onResetPasswordClick,
  onToggleStatusClick,
  onDeleteUserClick,
  onViewAuditLogForUser,
  isLoading,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ทั้งหมด');
  const [selectedStatus, setSelectedStatus] = useState<string>('ทั้งหมด');


  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(searchInput.trim());
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedRole(val);
    if (val === 'ทั้งหมด') {
      onRoleFilterChange(undefined);
    } else {
      const found = roles.find((r) => r.roleCode === val);
      onRoleFilterChange(found ? found.id : undefined);
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedStatus(val);
    onStatusFilterChange(val);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const formatLastLogin = (isoString?: string | null) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      const thaiYear = d.getFullYear() + 543;
      const day = d.getDate();
      const month = months[d.getMonth()];
      const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
      return `${day} ${month} ${thaiYear} - ${time}`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Filter Bar & Action Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ค้นหาผู้ใช้งาน, อีเมล..."
              className="w-full h-10 pl-9 pr-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] transition-all"
            />
          </form>

          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={handleStatusChange}
            className="h-10 px-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
          >
            <option value="ทั้งหมด">สถานะทั้งหมด</option>
            <option value="ACTIVE">ใช้งานอยู่</option>
            <option value="INACTIVE">ไม่ได้ใช้งาน</option>
            <option value="LOCKED">ถูกระงับ/ล็อก</option>
          </select>

          {/* Role Dropdown */}
          <select
            value={selectedRole}
            onChange={handleRoleChange}
            className="h-10 px-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
          >
            <option value="ทั้งหมด">บทบาททั้งหมด</option>
            {roles.map((r) => (
              <option key={r.id} value={r.roleCode}>
                {r.roleCode}
              </option>
            ))}
          </select>
        </div>

        {/* Add User Button */}
        <button
          onClick={onAddUserClick}
          className="h-10 px-4 bg-[#0B2046] hover:bg-[#112d5e] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ เพิ่มผู้ใช้งาน</span>
        </button>
      </div>

      {/* 2. User Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                <th className="py-3.5 px-4 w-12 text-center">ลำดับ</th>
                <th className="py-3.5 px-4 min-w-[120px]">ชื่อผู้ใช้งาน</th>
                <th className="py-3.5 px-4 min-w-[180px]">ชื่อ-นามสกุล</th>
                <th className="py-3.5 px-4 min-w-[200px]">อีเมลองค์กร</th>
                <th className="py-3.5 px-4 min-w-[180px]">บทบาท</th>
                <th className="py-3.5 px-4 min-w-[110px] text-center">สถานะ</th>
                <th className="py-3.5 px-4 min-w-[160px]">เข้าสู่ระบบล่าสุด</th>
                <th className="py-3.5 px-4 w-12 text-center">จัดการ</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    กำลังโหลดข้อมูลผู้ใช้งาน...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    ไม่พบข้อมูลบัญชีผู้ใช้งาน
                  </td>
                </tr>
              ) : (
                users.map((user, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* 1. ลำดับ */}
                      <td className="py-3.5 px-4 text-center text-slate-400 font-medium">
                        {rowNumber}
                      </td>

                      {/* 2. ชื่อผู้ใช้งาน */}
                      <td className="py-3.5 px-4 font-bold text-slate-800 tracking-tight">
                        {user.username}
                      </td>

                      {/* 3. ชื่อ-นามสกุล + Avatar + แผนก/ตำแหน่ง */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                            {user.fullName.charAt(0) || <User className="w-4 h-4" />}
                          </div>
                          <div className="leading-tight">
                            <div className="font-semibold text-slate-800">{user.fullName}</div>
                            {(user.departmentName || user.positionName) && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {user.positionName ? user.positionName : ''}
                                {user.departmentName ? ` • ${user.departmentName}` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. อีเมลองค์กร */}
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {user.corporateEmail || '-'}
                      </td>

                      {/* 5. บทบาท (Badges) */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {user.roles.map((r, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-blue-50/80 text-blue-700 border border-blue-200/60 rounded text-[10px] font-semibold tracking-wide"
                            >
                              {r.roleCode}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* 6. สถานะ */}
                      <td className="py-3.5 px-4 text-center">
                        {user.status === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            ใช้งานอยู่
                          </span>
                        )}
                        {user.status === 'INACTIVE' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-slate-500 bg-slate-100 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            ไม่ได้ใช้งาน
                          </span>
                        )}
                        {user.status === 'LOCKED' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            ถูกระงับ
                          </span>
                        )}
                      </td>

                      {/* 7. เข้าสู่ระบบล่าสุด */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {formatLastLogin(user.lastLoginAt)}
                      </td>

                      {/* 8. จัดการ (3 dots actions menu) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <ActionDropdown
                          menuClassName="w-44"
                          triggerClassName="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors mx-auto cursor-pointer"
                          items={[
                            {
                              label: 'แก้ไขข้อมูล / บทบาท',
                              icon: <Edit2 className="w-3.5 h-3.5 text-slate-400" />,
                              onClick: () => onEditUserClick(user),
                            },
                            {
                              label: 'รีเซ็ตรหัสผ่าน',
                              icon: <KeyRound className="w-3.5 h-3.5 text-amber-500" />,
                              onClick: () => onResetPasswordClick(user),
                            },
                            {
                              divider: true,
                              label: user.status === 'ACTIVE' ? 'ระงับการใช้งาน' : 'เปิดใช้งานบัญชี',
                              icon: user.status === 'ACTIVE' ? <Lock className="w-3.5 h-3.5 text-slate-400" /> : <Unlock className="w-3.5 h-3.5 text-emerald-500" />,
                              className: user.status === 'ACTIVE' ? 'text-slate-600' : 'text-emerald-600',
                              onClick: () => onToggleStatusClick(user, user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'),
                            },
                            {
                              label: 'ดูประวัติการใช้งาน',
                              icon: <FileSearch className="w-3.5 h-3.5 text-blue-500" />,
                              className: 'text-blue-600',
                              onClick: () => onViewAuditLogForUser(user),
                            },
                            ...(user.username.toLowerCase() !== 'admin'
                              ? [
                                  {
                                    divider: true,
                                    label: 'ลบบัญชีผู้ใช้',
                                    icon: <Trash2 className="w-3.5 h-3.5 text-rose-500" />,
                                    danger: true,
                                    onClick: () => onDeleteUserClick(user),
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 3. Footer: Rows per page (ซ้ายล่าง) & Pagination (ขวาล่าง) */}
        <div className="py-3 px-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-white">
          {/* ซ้ายล่าง: Rows per page selector */}
          <div className="flex items-center gap-2 text-slate-600">
            <span>แสดง</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                if (onPageSizeChange) {
                  onPageSizeChange(newSize);
                }
                onPageChange(1);
              }}
              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B2046] shadow-2xs cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={8}>8</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>แถวต่อหน้า</span>
            <span className="text-slate-400 text-[11px] ml-1">
              (ทั้งหมด {totalCount.toLocaleString()} บัญชีผู้ใช้งาน)
            </span>
          </div>

          {/* ขวาล่าง: Pagination Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              title="หน้าก่อนหน้า"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {getPageNumbers().map((p, idx) =>
              typeof p === 'number' ? (
                <button
                  key={idx}
                  onClick={() => onPageChange(p)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    p === currentPage
                      ? 'bg-[#0B2046] text-white shadow-xs'
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ) : (
                <span key={idx} className="w-6 text-center text-slate-400 select-none">
                  ...
                </span>
              )
            )}

            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              title="หน้าถัดไป"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

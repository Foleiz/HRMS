'use client';

import { TableToolbar } from '@/components/ui';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOnboardingTour, TourStep } from '@/hooks/useOnboardingTour';
import {
  Search,
  Plus,
  MoreVertical,
  KeyRound,
  Edit2,
  Lock,
  Unlock,
  FileSearch,
  ChevronLeft,
  ChevronRight,
  User,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { UserAccount, RoleSummary } from '@/types/settings';
import { ActionDropdown } from '@/components/ui/ActionDropdown';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { TablePagination } from '@/components/ui/TablePagination';
import { Button } from '@/components/ui/Button';
import { formatRoleName } from '@/lib/roleUtils';
import { TH_MONTHS_SHORT } from '@/lib/thaiDate';
import { TableEmpty, TableLoading } from '@/components/ui/TableState';

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
  onViewAuditLogForUser: (user: UserAccount) => void;
  isLoading: boolean;
  canCreateUser?: boolean;
  canEditUser?: boolean;
  isDrawerOpen?: boolean;
  onCloseDrawer?: () => void;
}

const USER_BUTTON_STEPS: TourStep[] = [
  {
    element: '#tour-user-add-btn',
    popover: {
      title: 'ขั้นตอนที่ 3: เพิ่มผู้ใช้งาน',
      description: 'คลิกปุ่ม "+ เพิ่มผู้ใช้งาน" เพื่อสร้างบัญชีและกำหนดบทบาท (Role) สำหรับเข้าสู่ระบบ (สามารถคลิกเปิดและบันทึกจริงได้ หรือกด "ถัดไป" เพื่อเสร็จสิ้นขั้นตอน)',
      side: 'bottom',
      align: 'end',
    },
    requiredPermission: 'SETTINGS_USERS_VIEW',
  },
];

const USER_DRAWER_STEPS: TourStep[] = [
  {
    element: '#tour-user-drawer-dialog',
    popover: {
      title: 'ขั้นตอนที่ 3: ผูกบัญชีผู้ใช้และกำหนดสิทธิ์',
      description: 'เลือกพนักงานที่ต้องการผูกบัญชี กำหนดชื่อผู้ใช้ (Username), รหัสผ่าน และเลือกบทบาท (Role) ในการเข้าถึงระบบ จากนั้นกด "ถัดไป" เพื่อเสร็จสิ้นขั้นตอนทั้งหมด',
      side: 'left',
      align: 'start',
    },
    requiredPermission: 'SETTINGS_USERS_VIEW',
  },
];

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
  onViewAuditLogForUser,
  isLoading,
  canCreateUser = true,
  canEditUser = true,
  isDrawerOpen = false,
  onCloseDrawer,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ทั้งหมด');
  const [selectedStatus, setSelectedStatus] = useState<string>('ทั้งหมด');

  const router = useRouter();
  const searchParams = useSearchParams();
  const tourParam = searchParams?.get('tour');
  const mockParam = searchParams?.get('mock');

  // Phase 1: Tour ชี้ปุ่มเพิ่มผู้ใช้งาน
  useOnboardingTour('hr-onboarding-user-btn', USER_BUTTON_STEPS, {
    triggerCondition: tourParam === 'hr-onboarding-3' && !isDrawerOpen,
    prevBtnText: 'ย้อนกลับ',
    doneBtnText: 'ถัดไป',
    onPrev: () => {
      const mockQuery = mockParam ? `&mock=${encodeURIComponent(mockParam)}` : '';
      router.push(`/employees/contracts?tour=hr-onboarding-2${mockQuery}`);
    },
    onDone: () => {
      const mockQuery = mockParam ? `?completed=hr-onboarding&mock=${encodeURIComponent(mockParam)}` : '?completed=hr-onboarding';
      router.push(`/guide${mockQuery}`);
    },
    onClose: () => {
      router.replace('/settings?tab=users');
    },
  });

  // Phase 2: Tour ชี้ที่แบบฟอร์ม Drawer ภาพรวมเมื่อเปิด
  useOnboardingTour('hr-onboarding-user-drawer', USER_DRAWER_STEPS, {
    triggerCondition: tourParam === 'hr-onboarding-3' && Boolean(isDrawerOpen),
    delayMs: 250,
    showPrevBtn: true,
    prevBtnText: 'ย้อนกลับ',
    doneBtnText: 'ถัดไป',
    onPrev: () => {
      if (onCloseDrawer) onCloseDrawer();
    },
    onDone: () => {
      if (onCloseDrawer) onCloseDrawer();
      const mockQuery = mockParam ? `?completed=hr-onboarding&mock=${encodeURIComponent(mockParam)}` : '?completed=hr-onboarding';
      router.push(`/guide${mockQuery}`);
    },
    onClose: () => {
      if (onCloseDrawer) onCloseDrawer();
      router.replace('/settings?tab=users');
    },
  });


  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(searchInput.trim());
  };

  const handleRoleSelect = (val: string) => {
    setSelectedRole(val);
    if (val === 'ทั้งหมด') {
      onRoleFilterChange(undefined);
    } else {
      const found = roles.find((r) => r.roleCode === val);
      onRoleFilterChange(found ? found.id : undefined);
    }
  };

  const handleStatusSelect = (val: string) => {
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
      const months = TH_MONTHS_SHORT;
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
    <div id="tour-users-table-container" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
      <div className="space-y-4">
        {/* Toolbar: ค้นหา + ตัวกรอง (ซ้าย) | เพิ่มผู้ใช้งาน (ขวา) */}
        <TableToolbar
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder="ค้นหาผู้ใช้งาน, อีเมล..."
          filters={
            <>
              <CustomSelect
                value={selectedStatus}
                onChange={handleStatusSelect}
                className="min-w-[140px]"
                options={[
                  { value: 'ทั้งหมด', label: 'สถานะทั้งหมด' },
                  { value: 'ACTIVE', label: 'ใช้งานอยู่' },
                  { value: 'INACTIVE', label: 'ไม่ได้ใช้งาน' },
                  { value: 'LOCKED', label: 'ถูกระงับ/ล็อก' },
                ]}
              />
              <CustomSelect
                value={selectedRole}
                onChange={handleRoleSelect}
                className="min-w-[150px]"
                options={[
                  { value: 'ทั้งหมด', label: 'บทบาททั้งหมด' },
                  ...roles.map((r) => ({
                    value: r.roleCode,
                    label: r.roleName || formatRoleName(r.roleCode),
                  })),
                ]}
              />
            </>
          }
          actions={
            canCreateUser ? (
              <Button
                id="tour-user-add-btn"
                onClick={onAddUserClick}
                icon={<Plus className="w-4 h-4" />}
              >
                เพิ่มผู้ใช้งาน
              </Button>
            ) : null
          }
        />

        {/* User Accounts Table (no m-4) */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="table-standard text-xs w-full min-w-[850px] text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 tracking-wider uppercase whitespace-nowrap">
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

            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <TableLoading colSpan={8} text="กำลังโหลดข้อมูลผู้ใช้งาน..." />
              ) : users.length === 0 ? (
                <TableEmpty colSpan={8} text="ไม่พบข้อมูลบัญชีผู้ใช้งาน" />
              ) : (
                users.map((user, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40/50 transition-colors">
                      {/* 1. ลำดับ */}
                      <td className="py-3.5 px-4 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400 font-medium">
                        {rowNumber}
                      </td>

                      {/* 2. ชื่อผู้ใช้งาน */}
                      <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                        {user.username}
                      </td>

                      {/* 3. ชื่อ-นามสกุล + Avatar + แผนก/ตำแหน่ง */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200 dark:border-slate-700">
                            {user.fullName.charAt(0) || <User className="w-4 h-4" />}
                          </div>
                          <div className="leading-tight">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{user.fullName}</div>
                            {(user.departmentName || user.positionName) && (
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-0.5">
                                {user.positionName ? user.positionName : ''}
                                {user.departmentName ? ` • ${user.departmentName}` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. อีเมลองค์กร */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {user.corporateEmail || '-'}
                      </td>

                      {/* 5. บทบาท (Badges) */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {user.roles.map((r, i) => {
                            const roleColor =
                              r.color ||
                              roles.find((x) => x.id === r.roleId || x.roleCode === r.roleCode)?.color ||
                              '#2563EB';
                            return (
                              <span
                                key={i}
                                style={{
                                  backgroundColor: `${roleColor}14`,
                                  color: roleColor,
                                  borderColor: `${roleColor}33`,
                                }}
                                className="px-2 py-0.5 border rounded text-[10px] font-semibold tracking-wide inline-flex items-center gap-1"
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: roleColor }}
                                />
                                {r.roleName || formatRoleName(r.roleCode)}
                              </span>
                            );
                          })}
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
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
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
                        {user.resignationLastWorkingDate && (
                          <div
                            className="mt-1 text-[11px] font-medium text-amber-700 dark:text-amber-400"
                            title={user.status === 'ACTIVE' ? 'ระบบจะระงับบัญชีให้อัตโนมัติหลังวันทำงานวันสุดท้าย' : undefined}
                          >
                            ลาออก · วันสุดท้าย{' '}
                            {new Date(`${user.resignationLastWorkingDate}T00:00:00`).toLocaleDateString('th-TH', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                        )}
                      </td>

                      {/* 7. เข้าสู่ระบบล่าสุด */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                        {formatLastLogin(user.lastLoginAt)}
                      </td>

                      {/* 8. จัดการ (3 dots actions menu) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <ActionDropdown
                          menuClassName="w-44"
                          triggerClassName="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center justify-center transition-colors mx-auto cursor-pointer"
                          items={[
                            ...(canEditUser
                              ? [
                                  {
                                    label: 'แก้ไขข้อมูล',
                                    icon: <Edit2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 dark:text-slate-400" />,
                                    onClick: () => onEditUserClick(user),
                                  },
                                  {
                                    label: 'รีเซ็ตรหัสผ่าน',
                                    icon: <KeyRound className="w-3.5 h-3.5 text-amber-500" />,
                                    onClick: () => onResetPasswordClick(user),
                                  },
                                  { divider: true, label: '' },
                                  {
                                    label: user.status === 'ACTIVE' ? 'ระงับการใช้งาน' : 'เปิดใช้งานบัญชี',
                                    icon: user.status === 'ACTIVE' ? <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 dark:text-slate-400" /> : <Unlock className="w-3.5 h-3.5 text-emerald-500" />,
                                    className: user.status === 'ACTIVE' ? 'text-slate-600 dark:text-slate-400' : 'text-emerald-600',
                                    onClick: () => onToggleStatusClick(user, user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'),
                                  },
                                ]
                              : []),
                            {
                              label: 'ดูประวัติการใช้งาน',
                              icon: <FileSearch className="w-3.5 h-3.5 text-blue-500" />,
                              className: 'text-blue-600',
                              onClick: () => onViewAuditLogForUser(user),
                            },
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

        {/* Standard Table Pagination */}
        <div className="pt-2">
          <TablePagination
            total={totalCount}
            page={currentPage}
            pageSize={pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={(newSize) => {
              if (onPageSizeChange) {
                onPageSizeChange(newSize);
              }
              onPageChange(1);
            }}
            pageSizeOptions={[10, 20, 50, 100, 200]}
          />
        </div>
      </div>
    </div>
  );
};

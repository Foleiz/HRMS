'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users, Shield, History, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/context/ToastContext';
import { settingsService } from '@/services/settingsService';
import { employeeService } from '@/services/employeeService';
import { Employee } from '@/types/employee';
import {
  UserAccount,
  RoleSummary,
  RoleDetail,
  AuditLogItem,
  CreateUserRequest,
  UpdateUserRequest,
  CreateRoleRequest,
  UpdateRoleRequest,
  UpdateRoleMatrixRequest,
} from '@/types/settings';
import { UsersTab } from '@/components/settings/UsersTab';
import { UserDrawer } from '@/components/settings/UserDrawer';
import { RolesTab } from '@/components/settings/RolesTab';
import { RoleModal } from '@/components/settings/RoleModal';
import { AuditLogTab } from '@/components/settings/AuditLogTab';
import { AuditLogDetailModal } from '@/components/settings/AuditLogDetailModal';
import { ResetPasswordModal } from '@/components/settings/ResetPasswordModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

type TabType = 'users' | 'roles' | 'audit-log';

export default function SettingsPage() {
  const { success, error, info } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('users');

  // === 1. Data States ===
  // Users
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [userTotalCount, setUserTotalCount] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userPageSize] = useState(10);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<number | undefined>(undefined);
  const [userStatusFilter, setUserStatusFilter] = useState('ทั้งหมด');
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  // Roles
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [selectedRoleMatrix, setSelectedRoleMatrix] = useState<RoleDetail | null>(null);
  const [isRolesLoading, setIsRolesLoading] = useState(false);
  const [isSavingMatrix, setIsSavingMatrix] = useState(false);

  // Employees (for dropdown in drawer)
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditLogTotalCount, setAuditLogTotalCount] = useState(0);
  const [auditLogPage, setAuditLogPage] = useState(1);
  const [auditLogPageSize] = useState(15);
  const [auditLogFilters, setAuditLogFilters] = useState<{
    startDate?: string;
    endDate?: string;
    userId?: number;
    action?: string;
    entityType?: string;
    search?: string;
  }>({});
  const [isAuditLogsLoading, setIsAuditLogsLoading] = useState(false);

  // === 2. Modals & Drawers States ===
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserAccount | null>(null);

  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<UserAccount | null>(null);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<RoleSummary | null>(null);

  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogItem | null>(null);

  // Confirm delete modal
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
  });

  // === 3. Fetching Data Functions ===
  const loadUsers = useCallback(async () => {
    setIsUsersLoading(true);
    try {
      const data = await settingsService.getUsers({
        page: userPage,
        pageSize: userPageSize,
        search: userSearch || undefined,
        roleId: userRoleFilter,
        status: userStatusFilter !== 'ทั้งหมด' ? userStatusFilter : undefined,
      });
      setUsers(data.items);
      setUserTotalCount(data.totalCount);
    } catch (err: any) {
      error(err.message || 'ไม่สามารถโหลดข้อมูลผู้ใช้งานได้');
    } finally {
      setIsUsersLoading(false);
    }
  }, [userPage, userPageSize, userSearch, userRoleFilter, userStatusFilter, error]);

  const loadRoles = useCallback(async () => {
    setIsRolesLoading(true);
    try {
      const rolesData = await settingsService.getAllRoles();
      setRoles(rolesData);

      // If matrix not loaded yet or current selection invalid, pick first role
      if (rolesData.length > 0) {
        const targetId = selectedRoleMatrix ? selectedRoleMatrix.id : rolesData[0].id;
        try {
          const matrixData = await settingsService.getRoleMatrix(targetId);
          setSelectedRoleMatrix(matrixData);
        } catch {
          const firstMatrix = await settingsService.getRoleMatrix(rolesData[0].id);
          setSelectedRoleMatrix(firstMatrix);
        }
      }
    } catch (err: any) {
      error(err.message || 'ไม่สามารถโหลดข้อมูลบทบาทได้');
    } finally {
      setIsRolesLoading(false);
    }
  }, [selectedRoleMatrix, error]);

  const loadRoleMatrix = async (roleId: number) => {
    try {
      const matrix = await settingsService.getRoleMatrix(roleId);
      setSelectedRoleMatrix(matrix);
    } catch (err: any) {
      error(err.message || 'ไม่สามารถโหลดสิทธิ์ของบทบาทนี้ได้');
    }
  };

  const loadAuditLogs = useCallback(async () => {
    setIsAuditLogsLoading(true);
    try {
      const data = await settingsService.getAuditLogs({
        page: auditLogPage,
        pageSize: auditLogPageSize,
        ...auditLogFilters,
      });
      setAuditLogs(data.items);
      setAuditLogTotalCount(data.totalCount);
    } catch (err: any) {
      error(err.message || 'ไม่สามารถโหลดบันทึกการใช้งานได้');
    } finally {
      setIsAuditLogsLoading(false);
    }
  }, [auditLogPage, auditLogPageSize, auditLogFilters, error]);

  const loadEmployees = async () => {
    try {
      const res = await employeeService.getAll();
      setEmployees(res);
    } catch {
      // Non-blocking fallback
    }
  };

  // Initial Load
  useEffect(() => {
    loadUsers();
    loadRoles();
    loadEmployees();
  }, []);

  // Fetch when tab changes or specific page filters change
  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'roles') {
      loadRoles();
    } else if (activeTab === 'audit-log') {
      loadAuditLogs();
    }
  }, [activeTab, loadUsers, loadRoles, loadAuditLogs]);

  // === 4. User Actions ===
  const handleCreateUser = async (data: CreateUserRequest) => {
    await settingsService.createUser(data);
    success('สร้างบัญชีผู้ใช้งานสำเร็จ');
    loadUsers();
  };

  const handleUpdateUser = async (id: number, data: UpdateUserRequest) => {
    await settingsService.updateUser(id, data);
    success('อัปเดตข้อมูลผู้ใช้งานสำเร็จ');
    loadUsers();
  };

  const handleResetPassword = async (userId: number, newPass: string) => {
    await settingsService.resetPassword(userId, { newPassword: newPass });
    success('รีเซ็ตรหัสผ่านสำเร็จ');
  };

  const handleToggleUserStatus = async (user: UserAccount, newStatus: string) => {
    try {
      await settingsService.toggleUserStatus(user.id, newStatus);
      success(`เปลี่ยนสถานะเป็น ${newStatus} สำเร็จ`);
      loadUsers();
    } catch (err: any) {
      error(err.message || 'ไม่สามารถเปลี่ยนสถานะได้');
    }
  };

  const handleDeleteUser = (user: UserAccount) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'ยืนยันการลบบัญชีผู้ใช้งาน',
      message: `คุณต้องการลบบัญชีผู้ใช้ "${user.username}" (${user.fullName}) ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      onConfirm: async () => {
        try {
          await settingsService.deleteUser(user.id);
          success('ลบบัญชีผู้ใช้งานสำเร็จ');
          setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
          loadUsers();
        } catch (err: any) {
          error(err.message || 'ไม่สามารถลบบัญชีผู้ใช้งานได้');
        }
      },
    });
  };

  const handleViewAuditLogForUser = (user: UserAccount) => {
    setAuditLogFilters({ userId: user.id });
    setActiveTab('audit-log');
  };

  // === 5. Role Actions ===
  const handleSaveRoleMatrix = async (roleId: number, data: UpdateRoleMatrixRequest) => {
    setIsSavingMatrix(true);
    try {
      const updated = await settingsService.updateRoleMatrix(roleId, data);
      setSelectedRoleMatrix(updated);
      success('บันทึกสิทธิ์การใช้งานของบทบาทสำเร็จ');
    } catch (err: any) {
      error(err.message || 'ไม่สามารถบันทึกสิทธิ์ได้');
      throw err;
    } finally {
      setIsSavingMatrix(false);
    }
  };

  const handleCreateRole = async (data: CreateRoleRequest) => {
    const newRole = await settingsService.createRole(data);
    success(`สร้างบทบาท ${newRole.roleCode} สำเร็จ`);
    await loadRoles();
    loadRoleMatrix(newRole.id);
  };

  const handleUpdateRole = async (id: number, data: UpdateRoleRequest) => {
    await settingsService.updateRole(id, data);
    success('อัปเดตบทบาทสำเร็จ');
    loadRoles();
  };

  const handleDeleteRole = (role: RoleSummary) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'ยืนยันการลบบทบาท',
      message: `คุณต้องการลบบทบาท "${role.roleCode}" (${role.roleName}) ใช่หรือไม่?`,
      onConfirm: async () => {
        try {
          await settingsService.deleteRole(role.id);
          success('ลบบทบาทสำเร็จ');
          setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
          loadRoles();
        } catch (err: any) {
          error(err.message || 'ไม่สามารถลบบทบาทได้');
        }
      },
    });
  };

  // === 6. Audit Log Actions ===
  const handleExportAuditLogs = async () => {
    try {
      info('กำลังส่งออกข้อมูลบันทึก...');
      const blob = await settingsService.exportAuditLogs(auditLogFilters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AuditLogs_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      success('ส่งออกข้อมูลบันทึกสำเร็จ');
    } catch (err: any) {
      error(err.message || 'ไม่สามารถส่งออกข้อมูลได้');
    }
  };

  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case 'users':
        return 'ผู้ใช้งาน';
      case 'roles':
        return 'บทบาทและสิทธิ์';
      case 'audit-log':
        return 'บันทึกการใช้งานระบบ';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Top Header with Breadcrumb & Back Icon */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 flex items-center justify-center transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <span className="text-slate-500 font-semibold">ตั้งค่า</span>
          <span>/</span>
          <span className="text-slate-800 font-semibold">{getBreadcrumbTitle()}</span>
        </div>
      </div>

      {/* 2. Main Tab Buttons Bar (Matching Mockup Design) */}
      <div className="border-b border-slate-200/80 flex items-center gap-8">
        {/* Tab 1: ผู้ใช้งาน */}
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3.5 text-sm font-bold tracking-tight transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'text-slate-900 border-b-2 border-[#0B2046]'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <span>ผู้ใช้งาน</span>
        </button>

        {/* Tab 2: บทบาทและสิทธิ์ */}
        <button
          onClick={() => setActiveTab('roles')}
          className={`pb-3.5 text-sm font-bold tracking-tight transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'roles'
              ? 'text-slate-900 border-b-2 border-[#0B2046]'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <span>บทบาทและสิทธิ์</span>
        </button>

        {/* Tab 3: บันทึกการใช้งานระบบ (Audit Log) */}
        <button
          onClick={() => setActiveTab('audit-log')}
          className={`pb-3.5 text-sm font-bold tracking-tight transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'audit-log'
              ? 'text-slate-900 border-b-2 border-[#0B2046]'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <span>บันทึกการใช้งานระบบ (Audit Log)</span>
        </button>
      </div>

      {/* 3. Tab Content */}
      {activeTab === 'users' && (
        <UsersTab
          users={users}
          totalCount={userTotalCount}
          currentPage={userPage}
          pageSize={userPageSize}
          roles={roles}
          onPageChange={setUserPage}
          onSearchChange={(s) => {
            setUserSearch(s);
            setUserPage(1);
          }}
          onRoleFilterChange={(rId) => {
            setUserRoleFilter(rId);
            setUserPage(1);
          }}
          onStatusFilterChange={(st) => {
            setUserStatusFilter(st);
            setUserPage(1);
          }}
          onAddUserClick={() => {
            setUserToEdit(null);
            setIsUserDrawerOpen(true);
          }}
          onEditUserClick={(user) => {
            setUserToEdit(user);
            setIsUserDrawerOpen(true);
          }}
          onResetPasswordClick={(user) => {
            setUserToResetPassword(user);
            setIsResetPasswordModalOpen(true);
          }}
          onToggleStatusClick={handleToggleUserStatus}
          onDeleteUserClick={handleDeleteUser}
          onViewAuditLogForUser={handleViewAuditLogForUser}
          isLoading={isUsersLoading}
        />
      )}

      {activeTab === 'roles' && (
        <RolesTab
          roles={roles}
          selectedRoleMatrix={selectedRoleMatrix}
          onSelectRole={loadRoleMatrix}
          onSaveMatrix={handleSaveRoleMatrix}
          onAddRoleClick={() => {
            setRoleToEdit(null);
            setIsRoleModalOpen(true);
          }}
          onEditRoleClick={(role) => {
            setRoleToEdit(role);
            setIsRoleModalOpen(true);
          }}
          onDeleteRoleClick={handleDeleteRole}
          isLoading={isRolesLoading}
          isSavingMatrix={isSavingMatrix}
        />
      )}

      {activeTab === 'audit-log' && (
        <AuditLogTab
          logs={auditLogs}
          totalCount={auditLogTotalCount}
          currentPage={auditLogPage}
          pageSize={auditLogPageSize}
          users={users}
          onPageChange={setAuditLogPage}
          onFilterChange={(f) => {
            setAuditLogFilters(f);
            setAuditLogPage(1);
          }}
          onExport={handleExportAuditLogs}
          onViewDetail={(log) => setSelectedAuditLog(log)}
          isLoading={isAuditLogsLoading}
        />
      )}

      {/* 4. Modals and Slide-over Drawer */}
      {/* User Drawer */}
      <UserDrawer
        isOpen={isUserDrawerOpen}
        onClose={() => {
          setIsUserDrawerOpen(false);
          setUserToEdit(null);
        }}
        onSubmitCreate={handleCreateUser}
        onSubmitUpdate={handleUpdateUser}
        userToEdit={userToEdit}
        employees={employees}
        roles={roles}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        isOpen={isResetPasswordModalOpen}
        onClose={() => {
          setIsResetPasswordModalOpen(false);
          setUserToResetPassword(null);
        }}
        user={userToResetPassword}
        onConfirmReset={handleResetPassword}
      />

      {/* Role Modal */}
      <RoleModal
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          setRoleToEdit(null);
        }}
        onSubmitCreate={handleCreateRole}
        onSubmitUpdate={handleUpdateRole}
        roleToEdit={roleToEdit}
      />

      {/* Audit Log Detail Modal */}
      <AuditLogDetailModal
        isOpen={!!selectedAuditLog}
        onClose={() => setSelectedAuditLog(null)}
        log={selectedAuditLog}
      />

      {/* Confirm Action Modal */}
      <ConfirmModal
        isOpen={confirmModalConfig.isOpen}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        onClose={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalConfig.onConfirm}
        type="danger"
        confirmText="ยืนยันการลบ"
        cancelText="ยกเลิก"
      />
    </div>
  );
}

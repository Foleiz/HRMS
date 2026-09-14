import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';
import {
  UserAccount,
  CreateUserRequest,
  UpdateUserRequest,
  ResetPasswordRequest,
  UserQueryFilter,
  RoleSummary,
  RoleDetail,
  CreateRoleRequest,
  UpdateRoleRequest,
  UpdateRoleMatrixRequest,
  AuditLogItem,
  AuditLogQueryFilter,
  PagedResponse,
} from '@/types/settings';

export const settingsService = {
  // === 1. User Accounts ===
  async getUsers(filter?: UserQueryFilter): Promise<PagedResponse<UserAccount>> {
    const params = new URLSearchParams();
    if (filter?.search) params.append('search', filter.search);
    if (filter?.roleId) params.append('roleId', filter.roleId.toString());
    if (filter?.status && filter.status !== 'ทั้งหมด') params.append('status', filter.status);
    if (filter?.page) params.append('page', filter.page.toString());
    if (filter?.pageSize) params.append('pageSize', filter.pageSize.toString());

    const res = await apiClient.get<ApiResponse<PagedResponse<UserAccount>>>(`/users?${params.toString()}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้');
    }
    return res.data.data;
  },

  async getUserById(id: number): Promise<UserAccount> {
    const res = await apiClient.get<ApiResponse<UserAccount>>(`/users/${id}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้');
    }
    return res.data.data;
  },

  async createUser(data: CreateUserRequest): Promise<UserAccount> {
    const res = await apiClient.post<ApiResponse<UserAccount>>('/users', data);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'ไม่สามารถสร้างผู้ใช้งานได้');
    }
    return res.data.data;
  },

  async updateUser(id: number, data: UpdateUserRequest): Promise<UserAccount> {
    const res = await apiClient.put<ApiResponse<UserAccount>>(`/users/${id}`, data);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'ไม่สามารถอัปเดตผู้ใช้งานได้');
    }
    return res.data.data;
  },

  async resetPassword(id: number, data: ResetPasswordRequest): Promise<boolean> {
    const res = await apiClient.post<ApiResponse<boolean>>(`/users/${id}/reset-password`, data);
    if (!res.data.success) {
      throw new Error(res.data.message || 'ไม่สามารถรีเซ็ตรหัสผ่านได้');
    }
    return res.data.data ?? true;
  },

  async toggleUserStatus(id: number, status: string): Promise<boolean> {
    const res = await apiClient.patch<ApiResponse<boolean>>(`/users/${id}/status`, { status });
    if (!res.data.success) {
      throw new Error(res.data.message || 'ไม่สามารถเปลี่ยนสถานะผู้ใช้งานได้');
    }
    return res.data.data ?? true;
  },

  async deleteUser(id: number): Promise<boolean> {
    const res = await apiClient.delete<ApiResponse<boolean>>(`/users/${id}`);
    if (!res.data.success) {
      throw new Error(res.data.message || 'ไม่สามารถลบผู้ใช้งานได้');
    }
    return res.data.data ?? true;
  },

  // === 2. Roles & Permissions ===
  async getAllRoles(): Promise<RoleSummary[]> {
    const res = await apiClient.get<ApiResponse<RoleSummary[]>>('/roles');
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'ไม่สามารถดึงรายการบทบาทได้');
    }
    return res.data.data;
  },

  async getRoleMatrix(roleId: number): Promise<RoleDetail> {
    const res = await apiClient.get<ApiResponse<RoleDetail>>(`/roles/${roleId}/matrix`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'ไม่สามารถดึงเมทริกซ์สิทธิ์ของบทบาทได้');
    }
    return res.data.data;
  },

  async createRole(data: CreateRoleRequest): Promise<RoleSummary> {
    const res = await apiClient.post<ApiResponse<RoleSummary>>('/roles', data);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'ไม่สามารถสร้างบทบาทใหม่ได้');
    }
    return res.data.data;
  },

  async updateRole(id: number, data: UpdateRoleRequest): Promise<RoleSummary> {
    const res = await apiClient.put<ApiResponse<RoleSummary>>(`/roles/${id}`, data);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'ไม่สามารถอัปเดตบทบาทได้');
    }
    return res.data.data;
  },

  async updateRoleMatrix(id: number, data: UpdateRoleMatrixRequest): Promise<RoleDetail> {
    const res = await apiClient.put<ApiResponse<RoleDetail>>(`/roles/${id}/matrix`, data);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'ไม่สามารถบันทึกสิทธิ์การใช้งานได้');
    }
    return res.data.data;
  },

  async deleteRole(id: number): Promise<boolean> {
    const res = await apiClient.delete<ApiResponse<boolean>>(`/roles/${id}`);
    if (!res.data.success) {
      throw new Error(res.data.message || 'ไม่สามารถลบบทบาทได้');
    }
    return res.data.data ?? true;
  },

  // === 3. Audit Logs ===
  async getAuditLogs(filter?: AuditLogQueryFilter): Promise<PagedResponse<AuditLogItem>> {
    const params = new URLSearchParams();
    if (filter?.startDate) params.append('startDate', filter.startDate);
    if (filter?.endDate) params.append('endDate', filter.endDate);
    if (filter?.userId) params.append('userId', filter.userId.toString());
    if (filter?.action && filter.action !== 'ทั้งหมด') params.append('action', filter.action);
    if (filter?.entityType && filter.entityType !== 'ทั้งหมด') params.append('entityType', filter.entityType);
    if (filter?.search) params.append('search', filter.search);
    if (filter?.page) params.append('page', filter.page.toString());
    if (filter?.pageSize) params.append('pageSize', filter.pageSize.toString());

    const res = await apiClient.get<ApiResponse<PagedResponse<AuditLogItem>>>(`/audit-logs?${params.toString()}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'ไม่สามารถดึงบันทึกการใช้งานระบบได้');
    }
    return res.data.data;
  },

  async exportAuditLogs(filter?: AuditLogQueryFilter): Promise<Blob> {
    const params = new URLSearchParams();
    if (filter?.startDate) params.append('startDate', filter.startDate);
    if (filter?.endDate) params.append('endDate', filter.endDate);
    if (filter?.action && filter.action !== 'ทั้งหมด') params.append('action', filter.action);
    if (filter?.entityType && filter.entityType !== 'ทั้งหมด') params.append('entityType', filter.entityType);
    if (filter?.search) params.append('search', filter.search);

    const res = await apiClient.get(`/audit-logs/export?${params.toString()}`, {
      responseType: 'blob',
    });
    return res.data;
  },
};

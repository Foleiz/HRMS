// TypeScript interfaces for Settings module (Users, Roles & Permissions Matrix, and Audit Log)

export interface UserRoleItem {
  roleId: number;
  roleCode: string;
  roleName: string;
  isActive: boolean;
  isPrimary?: boolean;
}

export interface UserAccount {
  id: number;
  employeeId: number;
  employeeCode: string;
  fullName: string;
  username: string;
  corporateEmail?: string;
  departmentName?: string;
  positionName?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED' | string;
  lastLoginAt?: string | null;
  roles: UserRoleItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  employeeId: number;
  username: string;
  password: string;
  corporateEmail?: string;
  roleIds: number[];
}

export interface UpdateUserRequest {
  corporateEmail?: string;
  status?: string;
  roleIds: number[];
}

export interface ResetPasswordRequest {
  newPassword: string;
}

export interface UserQueryFilter {
  search?: string;
  roleId?: number;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface RoleSummary {
  id: number;
  roleCode: string;
  roleName: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE' | string;
  userCount: number;
  isSystemDefault: boolean;
  lastModifiedAt?: string;
}

export interface ModulePermissionScope {
  moduleCode: string; // EMPLOYEE, ATTENDANCE, LEAVE, PAYROLL, ORGANIZATION, SETTINGS, REPORT
  moduleName: string;
  dataScope: 'SELF' | 'TEAM' | 'DEPARTMENT' | 'DIVISION' | 'ORGANIZATION' | string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canApprove: boolean;
}

export interface RoleDetail {
  id: number;
  roleCode: string;
  roleName: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE' | string;
  isSystemDefault: boolean;
  lastModifiedAt?: string;
  modules: ModulePermissionScope[];
}

export interface CreateRoleRequest {
  roleCode: string;
  roleName: string;
  description?: string;
}

export interface UpdateRoleRequest {
  roleName: string;
  description?: string;
  status: string;
}

export interface UpdateRoleMatrixRequest {
  modules: ModulePermissionScope[];
}

export interface AuditLogItem {
  id: number;
  userId?: number;
  username: string;
  fullName: string;
  action: 'LOGIN' | 'LOGOUT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'EXPORT' | string;
  entityType: string;
  entityId?: number;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  description?: string;
  createdAt: string;
}

export interface AuditLogQueryFilter {
  startDate?: string;
  endDate?: string;
  userId?: number;
  action?: string;
  entityType?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

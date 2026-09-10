export interface RoleScope {
  roleCode: string;
  permissionCode: string;
  dataVisibilityScope: 'ORGANIZATION' | 'DIVISION' | 'DEPARTMENT' | 'TEAM' | 'SELF' | string;
}

export interface UserProfile {
  id: number;
  username: string;
  employeeId: number;
  employeeCode: string;
  fullName: string;
  status: string;
  roles: string[];
  permissions: string[];
  dataScopes: RoleScope[];
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: UserProfile;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface Company {
  id: number;
  companyCode: string;
  companyName: string;
  address?: string;
  phone?: string;
  email?: string;
  status: 'ACTIVE' | 'INACTIVE' | string;
  updatedAt: string;
}

export interface UpdateCompanyRequest {
  companyName: string;
  address?: string;
  phone?: string;
  email?: string;
  status: string;
}

export interface Division {
  id: number;
  companyId: number;
  divisionCode: string;
  divisionName: string;
  headEmployeeId?: number;
  headEmployeeName?: string;
  departmentCount: number;
  status: 'ACTIVE' | 'INACTIVE' | string;
  updatedAt: string;
}

export interface CreateDivisionRequest {
  divisionCode: string;
  divisionName: string;
  headEmployeeId?: number;
  status: string;
}

export interface UpdateDivisionRequest {
  divisionName: string;
  headEmployeeId?: number;
  status: string;
}

export interface Department {
  id: number;
  divisionId: number;
  divisionName: string;
  parentDepartmentId?: number;
  parentDepartmentName?: string;
  departmentCode: string;
  departmentName: string;
  headEmployeeId?: number;
  headEmployeeName?: string;
  positionCount: number;
  status: 'ACTIVE' | 'INACTIVE' | string;
  updatedAt: string;
}

export interface CreateDepartmentRequest {
  divisionId: number;
  parentDepartmentId?: number;
  departmentCode: string;
  departmentName: string;
  headEmployeeId?: number;
  status: string;
}

export interface UpdateDepartmentRequest {
  divisionId: number;
  parentDepartmentId?: number;
  departmentName: string;
  headEmployeeId?: number;
  status: string;
}

export interface Position {
  id: number;
  departmentId: number;
  departmentName: string;
  divisionName: string;
  employeeLevelId?: number;
  levelCode?: string;
  levelName?: string;
  positionCode: string;
  positionName: string;
  status: 'ACTIVE' | 'INACTIVE' | string;
  updatedAt: string;
}

export interface CreatePositionRequest {
  departmentId: number;
  employeeLevelId?: number;
  positionCode: string;
  positionName: string;
  status: string;
}

export interface UpdatePositionRequest {
  departmentId: number;
  employeeLevelId?: number;
  positionName: string;
  status: string;
}

export interface EmployeeLevel {
  id: number;
  levelCode: string;
  levelName: string;
  levelRank?: number;
  minSalary?: number;
  maxSalary?: number;
  approvalLimit?: number;
  status: 'ACTIVE' | 'INACTIVE' | string;
}

export interface OrganizationSummary {
  companyCount: number;
  divisionCount: number;
  departmentCount: number;
  positionCount: number;
  levelCount: number;
}

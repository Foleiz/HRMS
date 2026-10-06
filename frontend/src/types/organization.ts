export interface Company {
  id: number;
  companyCode: string;
  companyName: string;
  address?: string;
  phone?: string;
  email?: string;
  status: 'ACTIVE' | 'INACTIVE' | string;
  logoData?: string | null;
  ceoEmployeeId?: number | null;
  ceoEmployeeCode?: string | null;
  ceoEmployeeName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCompanyRequest {
  companyName: string;
  address?: string;
  phone?: string;
  email?: string;
  status: string;
  logoData?: string | null;
  ceoEmployeeId?: number | null;
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
  createdAt: string;
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
  createdAt: string;
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
  /** อัตรากำลังที่อนุมัติ (null = ไม่กำหนด) */
  headcountPlan?: number | null;
  /** พนักงานที่อยู่ในตำแหน่งตอนนี้ */
  filledCount?: number;
  /** อัตราว่าง (null = ไม่กำหนดอัตรากำลัง) */
  vacantCount?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePositionRequest {
  departmentId: number;
  employeeLevelId?: number;
  positionCode: string;
  positionName: string;
  status: string;
  /** อัตรากำลัง (คน) — เว้นว่าง = ไม่กำหนด */
  headcountPlan?: number | null;
}

export interface UpdatePositionRequest {
  departmentId: number;
  employeeLevelId?: number;
  positionName: string;
  status: string;
  headcountPlan?: number | null;
}

export interface EmployeeLevel {
  id: number;
  levelCode: string;
  levelName: string;
  levelRank?: number;
  status: 'ACTIVE' | 'INACTIVE' | string;
}

export interface CreateEmployeeLevelRequest {
  levelCode: string;
  levelName: string;
  levelRank?: number;
  status: string;
}

export interface UpdateEmployeeLevelRequest {
  levelName: string;
  levelRank?: number;
  status: string;
}

export interface OrganizationSummary {
  companyCount: number;
  divisionCount: number;
  departmentCount: number;
  positionCount: number;
  levelCount: number;
}

export interface CompanyBankAccount {
  id: number;
  companyId: number;
  companyName?: string;
  bankId: number;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName?: string;
  isPrimaryPayrollAccount: boolean;
  status: 'ACTIVE' | 'INACTIVE' | string;
}

export interface CreateCompanyBankAccountRequest {
  companyId?: number;
  bankId: number;
  accountNumber: string;
  accountName?: string;
  isPrimaryPayrollAccount?: boolean;
  status?: string;
}

export interface UpdateCompanyBankAccountRequest {
  companyId?: number;
  bankId: number;
  accountNumber: string;
  accountName?: string;
  isPrimaryPayrollAccount?: boolean;
  status?: string;
}


// ===== Org Chart (GET /organization/chart) =====
export interface OrgChartPerson {
  id: number;
  employeeCode: string;
  fullName: string;
  positionName?: string | null;
  avatarUrl?: string | null;
  workEmail?: string | null;
}

export interface OrgChartDepartment {
  id: number;
  departmentCode: string;
  departmentName: string;
  head?: OrgChartPerson | null;
  members: OrgChartPerson[];
  activeCount: number;
  headcountPlan?: number | null;
  subDepartments: OrgChartDepartment[];
}

export interface OrgChartDivision {
  id: number;
  divisionCode: string;
  divisionName: string;
  head?: OrgChartPerson | null;
  activeCount: number;
  departments: OrgChartDepartment[];
}

export interface OrgChart {
  companyName: string;
  ceo?: OrgChartPerson | null;
  divisions: OrgChartDivision[];
  unassigned: OrgChartPerson[];
  totalEmployees: number;
  totalDepartments: number;
}

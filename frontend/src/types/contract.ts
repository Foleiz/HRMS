export interface EmploymentContract {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName?: string;
  positionTitle?: string;
  employeeTypeId?: number;
  employeeTypeName?: string;
  contractType: 'PROBATION' | 'PERMANENT' | 'FIXED_TERM' | 'OTHER' | string;
  contractTypeDisplay: string;
  wageType?: string;
  startDate: string;
  startDateDisplay: string;
  probationEndDate?: string;
  probationEndDateDisplay?: string;
  probationPassedDate?: string;
  contractEndDate?: string;
  contractEndDateDisplay?: string;
  effectiveEndDateDisplay?: string;
  terminationDate?: string;
  terminationReason?: string;
  status: 'ACTIVE' | 'PENDING_APPROVAL' | 'COMPLETED' | 'TERMINATED' | 'CANCELLED' | string;
  statusDisplay: string;
  approvalInstanceId?: number;
}

export interface ContractSummaryStats {
  probationCount: number;
  permanentCount: number;
  probationExpiring7DaysCount: number;
  totalActiveCount: number;
}

export interface CreateContractRequest {
  employeeId: number;
  contractType: string;
  wageType?: string;
  startDate: string;
  endDate?: string;
  status?: string;
}

export interface UpdateContractRequest {
  contractType?: string;
  wageType?: string;
  startDate?: string;
  probationEndDate?: string;
  contractEndDate?: string;
  terminationDate?: string;
  terminationReason?: string;
  status?: string;
}

export interface EmployeeCareerTimeline {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  positionName: string;
  divisionName: string;
  departmentName: string;
  managerName?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isCurrent: boolean;
  dateRangeDisplay: string;
  hierarchyDisplay: string;
}

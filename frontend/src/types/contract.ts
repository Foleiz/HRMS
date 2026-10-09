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
  hasDocument?: boolean;
  documentFileName?: string;
  documentFileSize?: number;
  documentMimeType?: string;
  documentUploadedAt?: string;
  documentUrl?: string;
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
  employeeTypeId?: number;
  wageType?: string;
  startDate: string;
  endDate?: string;
  status?: string;
  documentFileName?: string;
  documentFileData?: string;
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
  documentFileName?: string;
  documentFileData?: string;
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

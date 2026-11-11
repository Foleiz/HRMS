/** ไฟล์แนบหนึ่งไฟล์ของสัญญาจ้าง */
export interface ContractDocument {
  id: number;
  fileName: string;
  mimeType?: string;
  fileSize?: number;
  uploadedAt: string;
}

export interface EmploymentContract {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  employeePrefix?: string;
  avatarUrl?: string;
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
  documentCount?: number;
  documents?: ContractDocument[];
  documentUrl?: string;
}

export interface ContractSummaryStats {
  probationCount: number;
  permanentCount: number;
  fixedTermCount?: number;
  probationExpiring7DaysCount: number;
  probationExpiring30DaysCount?: number;
  contractExpiring30DaysCount?: number;
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

export interface RenewContractRequest {
  contractType: string;
  employeeTypeId?: number;
  wageType?: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  documentFileName?: string;
  documentFileData?: string;
}

/** การตั้งค่าเกณฑ์สัญญาจ้างงาน (ระยะเวลาเริ่มต้น & แจ้งเตือนล่วงหน้า) */
export interface ContractSettings {
  /** ระยะเวลาทดลองงานมาตรฐาน (วัน) เช่น 119 วัน (รวมวันเริ่มงาน = 120 วัน) */
  probationDays: number;
  /** ระยะเวลาสัญญาจ้างเริ่มต้น (Fixed-term) (วัน) เช่น 365 วัน */
  fixedTermDays: number;
  /** แจ้งเตือนประเมินผลทดลองงานล่วงหน้า (วัน) เช่น 30 วัน */
  probationAlertDays: number;
  /** แจ้งเตือนสัญญาจ้างใกล้หมดอายุล่วงหน้า (วัน) เช่น 30 วัน */
  contractAlertDays: number;
}

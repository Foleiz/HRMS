export interface LeaveType {
  id: number;
  leaveCode: string;
  leaveName: string;
  quotaUnit: 'DAY' | 'HOUR' | 'MONTH' | string;
  isPaidLeave: boolean;
  documentDescription?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | string;
}

export interface CreateLeaveTypePayload {
  leaveCode: string;
  leaveName: string;
  quotaUnit: string;
  isPaidLeave: boolean;
  documentDescription?: string;
  status: string;
  defaultAnnualQuotaDays?: number;
}

export interface UpdateLeaveTypePayload {
  leaveName: string;
  quotaUnit: string;
  isPaidLeave: boolean;
  documentDescription?: string;
  status: string;
}

export interface LeavePolicy {
  id: number;
  leaveTypeId: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  employeeTypeId?: number | null;
  employeeTypeName?: string | null;
  employeeLevelId?: number | null;
  employeeLevelName?: string | null;
  entitlementDays: number;
  minimumServiceDays: number;
  advanceRequestDays: number;
  isCarryForwardAllowed: boolean;
  carryForwardMaxMonths?: number | null;
  carryForwardExpiryMonths?: number | null;
  isDocumentRequired: boolean;
  documentRequiredAfterDays?: number | null;
  isAllowedDuringProbation: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
  maxLifetimeOccurrences?: number | null;
  maxDaysPerOccurrence?: number | null;
  maxOccurrencesPerYear?: number | null;
}

export interface CreateLeavePolicyPayload {
  leaveTypeId: number;
  employeeTypeId?: number | null;
  employeeLevelId?: number | null;
  entitlementDays: number;
  minimumServiceDays: number;
  advanceRequestDays: number;
  isCarryForwardAllowed: boolean;
  carryForwardMaxMonths?: number | null;
  carryForwardExpiryMonths?: number | null;
  isDocumentRequired: boolean;
  documentRequiredAfterDays?: number | null;
  isAllowedDuringProbation: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
  maxLifetimeOccurrences?: number | null;
  maxDaysPerOccurrence?: number | null;
  maxOccurrencesPerYear?: number | null;
}

export interface UpdateLeavePolicyPayload {
  employeeTypeId?: number | null;
  employeeLevelId?: number | null;
  entitlementDays: number;
  minimumServiceDays: number;
  advanceRequestDays: number;
  isCarryForwardAllowed: boolean;
  carryForwardMaxMonths?: number | null;
  carryForwardExpiryMonths?: number | null;
  isDocumentRequired: boolean;
  documentRequiredAfterDays?: number | null;
  isAllowedDuringProbation: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
  maxLifetimeOccurrences?: number | null;
  maxDaysPerOccurrence?: number | null;
  maxOccurrencesPerYear?: number | null;
}

export interface LeaveBalance {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  positionTitle: string;
  leaveTypeId: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  year: number;
  broughtForwardDays: number;
  annualQuotaDays: number;
  activeCarriedForwardDays: number;
  usedDays: number;
  adjustedDays: number;
  netRemainingLeaveDays: number;
  carryForwardExpiry?: string | null;
}

export interface LeaveBalanceAdjustmentPayload {
  leaveBalanceId: number;
  amount: number;
  reason: string;
}

export interface LeaveBalanceTransaction {
  id: number;
  leaveBalanceId: number;
  transactionType: string;
  amount: number;
  referenceType?: string | null;
  referenceId?: number | null;
  note?: string | null;
  createdAt: string;
  createdByEmployeeName?: string | null;
}

export interface InitializeYearBalancePayload {
  targetYear: number;
}

export interface InitializeYearBalanceResult {
  targetYear: number;
  processedEmployeesCount: number;
  createdBalancesCount: number;
  message: string;
}

export interface LeaveRequest {
  id: number;
  requestNo: string;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  leaveTypeId: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  startDatetime: string;
  endDatetime: string;
  /** alias ที่ backend บางเวอร์ชันส่งมา */
  startDate?: string | null;
  endDate?: string | null;
  leaveHours: number;
  leaveDays: number;
  /** alias ที่ backend บางเวอร์ชันส่งมา */
  totalDays?: number | null;
  reason?: string | null;
  contactDuringLeave?: string | null;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | string;
  submittedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  rejectReason?: string | null;
  approvedById?: number | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  documents?: {
    id: number;
    leaveRequestId: number;
    fileName?: string | null;
    uploadedAt: string;
  }[];
}

export interface CreateLeaveRequestPayload {
  employeeId: number;
  leaveTypeId: number;
  startDatetime: string;
  endDatetime: string;
  leaveHours: number;
  leaveDays: number;
  reason?: string;
  contactDuringLeave?: string;
  attachmentFileName?: string;
  attachmentData?: string; // เนื้อหาไฟล์แนบแบบ Base64
}

/** Payload สำหรับพนักงานยื่นคำขอลาด้วยตนเอง (ESS) — ไม่ต้องระบุ employeeId เพราะ backend อ่านจาก JWT Token */
export type CreateMyLeaveRequestPayload = Omit<CreateLeaveRequestPayload, 'employeeId'>;

export interface LeaveStats {
  pendingRequestsCount: number;
  approvedThisMonthCount: number;
  rejectedThisMonthCount: number;
  totalLeaveDaysThisMonth: number;
  /** aliases สำหรับ approvals pages */
  pendingCount?: number;
  approvedCount?: number;
  rejectedCount?: number;
  cancelledCount?: number;
}

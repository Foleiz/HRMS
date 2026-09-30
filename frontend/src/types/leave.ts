export interface LeaveType {
  id: number;
  leaveCode: string;
  leaveName: string;
  quotaUnit: 'DAY' | 'HOUR' | 'MONTH' | string;
  isPaidLeave: boolean;
  documentDescription?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | string;
  /** หมวดในแบบฟอร์มใบลา */
  formCategory?: LeaveFormCategory | null;
  /** จำนวนใบลาที่ใช้ประเภทนี้ (ทุกสถานะ) */
  requestCount?: number;
  /** ลบถาวรได้หรือไม่ (ยังไม่เคยถูกใช้งาน) */
  canDelete?: boolean;
  /** เหตุผลที่ลบไม่ได้ */
  deleteBlockedReason?: string | null;
}

/** หมวดในแบบฟอร์มใบลา: ป่วย / กิจส่วนตัว / พักร้อน / ลาพิเศษ */
export type LeaveFormCategory = 'SICK' | 'PERSONAL' | 'VACATION' | 'SPECIAL';

/** วิธีคิดสิทธิ์ปีแรกของพนักงานใหม่ */
export type LeaveProrationMethod = 'FULL' | 'PRORATA_MONTHLY';

export interface CreateLeaveTypePayload {
  leaveCode: string;
  leaveName: string;
  quotaUnit: string;
  isPaidLeave: boolean;
  documentDescription?: string;
  status: string;
  defaultAnnualQuotaDays?: number;
  formCategory?: LeaveFormCategory | null;
}

export interface UpdateLeaveTypePayload {
  leaveName: string;
  quotaUnit: string;
  isPaidLeave: boolean;
  documentDescription?: string;
  status: string;
  formCategory?: LeaveFormCategory | null;
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
  /** ยกยอดข้ามปีได้สูงสุด (วัน) — ว่าง = เท่าสิทธิ์ต่อปี */
  carryForwardMaxDays?: number | null;
  /** ยื่นย้อนหลังได้ไม่เกินกี่วัน — ว่าง = ไม่จำกัด, 0 = ห้ามยื่นย้อนหลัง */
  maxBackdateDays?: number | null;
  prorationMethod?: LeaveProrationMethod | string;
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
  /** ยกยอดข้ามปีได้สูงสุด (วัน) — ว่าง = เท่าสิทธิ์ต่อปี */
  carryForwardMaxDays?: number | null;
  /** ยื่นย้อนหลังได้ไม่เกินกี่วัน — ว่าง = ไม่จำกัด, 0 = ห้ามยื่นย้อนหลัง */
  maxBackdateDays?: number | null;
  prorationMethod?: LeaveProrationMethod | string;
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
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  maxLifetimeOccurrences?: number | null;
  maxDaysPerOccurrence?: number | null;
  maxOccurrencesPerYear?: number | null;
  /** ยกยอดข้ามปีได้สูงสุด (วัน) — ว่าง = เท่าสิทธิ์ต่อปี */
  carryForwardMaxDays?: number | null;
  /** ยื่นย้อนหลังได้ไม่เกินกี่วัน — ว่าง = ไม่จำกัด, 0 = ห้ามยื่นย้อนหลัง */
  maxBackdateDays?: number | null;
  prorationMethod?: LeaveProrationMethod | string;
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

export interface ApprovalTimelineStep {
  stepNo: number;
  approverTitle: string;
  approverType: string;
  designatedApproverName?: string | null;
  status: 'COMPLETED' | 'WAITING' | 'PENDING_FUTURE' | 'REJECTED' | 'CANCELLED' | string;
  actionByEmployeeId?: number | null;
  actionByEmployeeName?: string | null;
  /** ตำแหน่งของผู้ดำเนินการ */
  actionByPositionName?: string | null;
  actionDecision?: 'APPROVE' | 'REJECT' | 'CANCEL' | string | null;
  actionAt?: string | null;
  comment?: string | null;
}

export interface ApprovalTimeline {
  instanceId: number;
  flowId: number;
  flowName: string;
  flowCode: string;
  documentType: string;
  sourceDocumentId: number;
  currentStepNo?: number | null;
  totalSteps: number;
  status: string;
  createdAt: string;
  completedAt?: string | null;
  steps: ApprovalTimelineStep[];
}

export interface LeaveRequest {
  id: number;
  requestNo: string;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  positionName?: string;
  formCategory?: string | null;
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
  // Approval Workflow Engine Integration
  approvalInstanceId?: number | null;
  currentStepNo?: number | null;
  totalSteps?: number;
  currentApproverDisplay?: string | null;
  isMyTurnToApprove?: boolean;
  hasAlreadyApproved?: boolean;
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
  /** true = บันทึกเป็นแบบร่าง (ยังไม่ยื่นจริง ไม่ตรวจสอบโควตา), false/ไม่ระบุ = ยื่นจริง */
  saveAsDraft?: boolean;
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

export interface LeaveCardItem {
  code: string;
  title: string;
  usedDays: number;
  quotaDays: number;
  remainingDays: number;
  usedTimes?: number | null;
  maxTimes?: number | null;
  unit: string;
}

export interface MyLeaveSummary {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  positionTitle: string;
  year: number;
  yearThai: number;
  sickLeave: LeaveCardItem;
  personalLeave: LeaveCardItem;
  annualLeave: LeaveCardItem;
  specialLeave: LeaveCardItem;
  ordinationLeave: LeaveCardItem;
  militaryLeave: LeaveCardItem;
  maternityLeave: LeaveCardItem;
  totalOvertimeHours: number;
  allBalances: LeaveBalance[];
}

/** ผลคำนวณจำนวนวันลาจาก server (นับเฉพาะวันทำงานตาม "วันทำงานประจำสัปดาห์" และไม่นับวันหยุดบริษัท) */
export interface LeaveDaysCalculation {
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  calendarDays: number;
  nonWorkingDays: number;
  holidays: { date: string; name: string }[];
  workingDates: string[];
  leaveDays: number;
  leaveHours: number;
}

/** ผลตรวจกฎการลาล่วงหน้า (dry-run) — ผลเดียวกับที่ server ใช้ตอนยื่นจริง */
export interface LeaveValidationResult {
  leaveDays: number;
  isValid: boolean;
  errors: string[];
  requiresDocument: boolean;
  policySummary?: string | null;
}

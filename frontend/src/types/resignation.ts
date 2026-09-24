import { ApprovalTimeline } from './leave';

export interface CreateResignationRequestPayload {
  requestedLastWorkingDate: string; // 'YYYY-MM-DD'
  reasonCategory: string;
  reason: string;
  handoverNotes?: string;
  contactAfterResignation?: string;
}

export interface ResignationRequest {
  id: number;
  requestNo: string;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  positionName: string;
  requestedLastWorkingDate: string; // 'YYYY-MM-DD'
  reason?: string;
  reasonCategory?: string;
  reasonDetail?: string;
  handoverNotes?: string;
  contactAfterResignation?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  submittedAt: string;
  cancelledAt?: string;
  cancelReason?: string;
  approvedByEmployeeId?: number;
  approvedByName?: string;
  approvedAt?: string;
  approvalInstanceId?: number;
  noticePeriodDays: number;
  canCancel: boolean;
  currentStepNo?: number;
  totalSteps?: number;
  currentApproverDisplay?: string;
  isMyTurnToApprove?: boolean;
  canApprove?: boolean;
  canReject?: boolean;
  hasAlreadyApproved?: boolean;
  timeline?: ApprovalTimeline;
}

export interface CancelResignationRequestPayload {
  cancelReason?: string;
}

export const RESIGNATION_REASON_CATEGORIES = [
  { value: 'NEW_JOB', label: 'ได้งานใหม่ที่ตรงสายอาชีพ / ก้าวหน้าทางวิชาชีพ' },
  { value: 'EDUCATION', label: 'ศึกษาต่อระดับสูง / ศึกษาต่อต่างประเทศ' },
  { value: 'HEALTH', label: 'ปัญหาสุขภาพ / ต้องการพักฟื้นร่างกาย' },
  { value: 'FAMILY_RELOCATION', label: 'ย้ายถิ่นฐาน / ย้ายที่อยู่ / ดูแลคนในครอบครัว' },
  { value: 'BUSINESS', label: 'ประกอบธุรกิจส่วนตัว / อาชีพอิสระ' },
  { value: 'RETIREMENT', label: 'เกษียณอายุการทำงาน' },
  { value: 'OTHER', label: 'เหตุผลส่วนตัวอื่น ๆ' },
] as const;

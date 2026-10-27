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
  /** กรณีไม่อนุมัติ */
  rejectReason?: string | null;
  rejectionReason?: string | null;
  rejectedByEmployeeId?: number;
  rejectedByName?: string | null;
  rejectedAt?: string | null;
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
  { value: 'NEW_JOB', label: 'ได้งานใหม่ที่ตรงสายอาชีพ / ก้าวหน้าทางวิชาชีพ', description: 'ย้ายไปทำงานที่ใหม่ หรือได้ตำแหน่งที่สูงขึ้น' },
  { value: 'EDUCATION', label: 'ศึกษาต่อระดับสูง / ศึกษาต่อต่างประเทศ', description: 'เรียนต่อปริญญาโท / เอก หรือหลักสูตรระยะยาว' },
  { value: 'HEALTH', label: 'ปัญหาสุขภาพ / ต้องการพักฟื้นร่างกาย', description: 'ต้องรักษาตัวหรือพักฟื้นเป็นเวลานาน' },
  { value: 'FAMILY_RELOCATION', label: 'ย้ายถิ่นฐาน / ย้ายที่อยู่ / ดูแลคนในครอบครัว', description: 'ย้ายภูมิลำเนา หรือต้องดูแลพ่อแม่ / บุตร' },
  { value: 'BUSINESS', label: 'ประกอบธุรกิจส่วนตัว / อาชีพอิสระ', description: 'เปิดกิจการของตัวเอง หรือรับงานอิสระ' },
  { value: 'RETIREMENT', label: 'เกษียณอายุการทำงาน', description: 'ครบอายุเกษียณ หรือเกษียณก่อนกำหนด' },
  { value: 'OTHER', label: 'เหตุผลส่วนตัวอื่น ๆ', description: 'พิมพ์เหตุผลเองในช่องเหตุผลการลาออก' },
] as const;

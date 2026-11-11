export type AdjustmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface AttendanceAdjustment {
  id: number;
  attendanceId: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName: string | null;
  positionName: string | null;
  workDate: string;
  shiftName: string | null;
  shiftCode: string | null;
  originalClockIn: string | null;
  originalClockOut: string | null;
  adjustedClockIn: string | null;
  adjustedClockOut: string | null;
  originalStatus?: string | null;
  requestedStatus?: string | null;
  reason: string;
  status: AdjustmentStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewedByEmployeeId: number | null;
  reviewedByEmployeeName: string | null;
}

export interface CreateAttendanceAdjustmentRequest {
  attendanceId: number;
  workDate?: string;
  adjustedClockIn?: string | null;
  adjustedClockOut?: string | null;
  requestedStatus?: string | null;
  reason: string;
}

export interface ReviewAttendanceAdjustmentRequest {
  status: 'APPROVED' | 'REJECTED';
  reviewNote?: string;
}

export interface AdjustmentFilter {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  departmentId?: number;
  employeeId?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PagedAdjustmentResult {
  items: AttendanceAdjustment[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  PRESENT: 'ตรงเวลา',
  LATE: 'มาสาย',
  EARLY_LEAVE: 'ออกก่อนเวลา',
  LATE_AND_EARLY: 'มาสายและออกก่อนเวลา',
  ABSENT: 'ขาดงาน',
  LEAVE: 'ลา',
  HOLIDAY_WORK: 'ทำงานวันหยุด',
  HOLIDAY: 'วันหยุดประเพณี / บริษัท',
  OFF: 'วันหยุดประจำสัปดาห์',
};

export function getAttendanceStatusLabel(status?: string | null): string {
  if (!status) return 'ไม่ระบุ';
  return ATTENDANCE_STATUS_LABELS[status.toUpperCase()] || status;
}

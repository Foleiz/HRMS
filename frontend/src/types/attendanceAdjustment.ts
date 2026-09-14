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
  reason: string;
  status: AdjustmentStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewedByEmployeeId: number | null;
  reviewedByEmployeeName: string | null;
}

export interface CreateAttendanceAdjustmentRequest {
  attendanceId: number;
  adjustedClockIn: string | null;
  adjustedClockOut: string | null;
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

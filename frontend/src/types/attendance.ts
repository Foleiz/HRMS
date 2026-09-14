export interface AttendanceDaily {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentId?: number;
  departmentName?: string;
  positionName?: string;
  workDate: string;
  shiftId?: number;
  shiftName?: string;
  shiftCode?: string;
  shiftTimeWindow?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  actualIn?: string;
  actualOut?: string;
  workedMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  isAbsent: boolean;
  status: 'PRESENT' | 'LATE' | 'EARLY_LEAVE' | 'LATE_AND_EARLY' | 'ABSENT' | 'HOLIDAY' | 'OFF' | 'PENDING' | string;
  statusText: string;
}

export interface DailyAttendanceSummary {
  date: string;
  totalEmployees: number;
  presentCount: number;
  lateCount: number;
  earlyLeaveCount: number;
  absentCount: number;
  holidayOrOffCount: number;
  attendanceRate: number;
}

export interface ClockInRequest {
  employeeId: number;
  clockInTime?: string;
  workDate?: string;
}

export interface ClockOutRequest {
  employeeId: number;
  clockOutTime?: string;
  workDate?: string;
}

export interface UpdateAttendanceRequest {
  shiftId?: number;
  actualIn?: string;
  actualOut?: string;
  status?: string;
  isAbsent?: boolean;
}

export interface DailyAttendanceFilterQuery {
  date?: string;
  departmentId?: number;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PagedAttendanceResult {
  items: AttendanceDaily[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DailyDepartmentHeadcount {
  departmentId: number;
  departmentCode: string;
  departmentName: string;
  divisionName: string;
  totalHeadcount: number;
  presentCount: number;
  lateCount: number;
  earlyLeaveCount: number;
  absentCount: number;
  attendanceRate: number;
}

export interface DailyHeadcountSummary {
  date: string;
  totalEmployees: number;
  totalPresent: number;
  totalLate: number;
  totalEarlyLeave: number;
  totalAbsent: number;
  overallAttendanceRate: number;
  departments: DailyDepartmentHeadcount[];
}

export interface MonthlyAttendanceLateness {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  positionName: string;
  totalWorkDays: number;
  presentDays: number;
  lateDays: number;
  totalLateMinutes: number;
  earlyLeaveDays: number;
  totalEarlyLeaveMinutes: number;
  absentDays: number;
  attendanceRate: number;
}

export interface MonthlyLatenessReport {
  year: number;
  month: number;
  totalAuditedEmployees: number;
  totalLateOccurrences: number;
  totalLateMinutes: number;
  overallAttendanceRate: number;
  items: MonthlyAttendanceLateness[];
}

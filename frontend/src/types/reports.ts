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

export interface PayrollTaxItem {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  positionName: string;
  citizenIdMasked: string;
  grossIncome: number;
  withholdingTax: number;
  ssoEmployee: number;
  ssoEmployer: number;
  totalDeductions: number;
  netSalary: number;
}

export interface PayrollTaxSummary {
  year: number;
  month: number;
  periodId: number | null;
  periodStatus: string;
  totalEmployees: number;
  taxableEmployeesCount: number;
  totalGrossIncome: number;
  totalWithholdingTax: number;
  totalSsoEmployee: number;
  totalSsoEmployer: number;
  totalSsoRemittance: number;
  totalNetSalary: number;
  items: PayrollTaxItem[];
}

export interface DepartmentTurnover {
  departmentId: number;
  departmentCode: string;
  departmentName: string;
  divisionName: string;
  beginningHeadcount: number;
  joinedCount: number;
  resignedCount: number;
  endingHeadcount: number;
  turnoverRate: number;
  retentionRate: number;
}

export interface TurnoverEventLog {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  positionName: string;
  eventType: 'JOINED' | 'RESIGNED' | 'TERMINATED' | string;
  eventDate: string;
  reason?: string;
}

export interface MonthlyTurnoverSummary {
  year: number;
  month: number;
  totalBeginningHeadcount: number;
  totalJoinedCount: number;
  totalResignedCount: number;
  totalEndingHeadcount: number;
  overallTurnoverRate: number;
  overallRetentionRate: number;
  departmentTurnovers: DepartmentTurnover[];
  eventLogs: TurnoverEventLog[];
}

